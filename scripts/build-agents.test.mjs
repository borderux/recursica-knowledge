/**
 * What the built agent artifacts have to be true of, checked against the files on disk.
 *
 * These assert properties of the committed output rather than of the composer, because the
 * output is what gets installed. `npm run agents:build:check` already reports drift between
 * source and artifact; this covers the things that are still wrong when there is no drift.
 */

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const agentsDir = path.join(repoRoot, "agents");
const artifactDir = path.join(repoRoot, "portable", "claude-code", "agents");

const frontmatter = (file) => {
  const m = /^---\n([\s\S]*?)\n---\n/.exec(fs.readFileSync(file, "utf8"));
  assert.ok(m, `${path.relative(repoRoot, file)} has no front matter`);
  return Object.fromEntries(
    m[1].split("\n").map((l) => /^([a-z_]+):\s*(.*)$/.exec(l)).filter(Boolean).map((kv) => [kv[1], kv[2]]),
  );
};

const toolsOf = (file) => (frontmatter(file).tools ?? "").split(/,\s*/).filter(Boolean);

const agentNames = fs.readdirSync(agentsDir, { withFileTypes: true })
  .filter((d) => d.isDirectory()).map((d) => d.name);

/**
 * A file in .claude/agents/ with no `tools:` line inherits the session's tools. That is a
 * documentation gap for most agents and a broken safety property for Barb, so the allowlist
 * has to reach the artifact rather than living only in runtime/claude-code.json where a human
 * is trusted to read it.
 */
test("every claude-code artifact carries its runtime tool allowlist", () => {
  for (const name of agentNames) {
    const runtimeFile = path.join(agentsDir, name, "runtime", "claude-code.json");
    const artifact = path.join(artifactDir, `${name}.md`);
    if (!fs.existsSync(runtimeFile) || !fs.existsSync(artifact)) continue;
    const runtime = JSON.parse(fs.readFileSync(runtimeFile, "utf8"));
    assert.deepEqual(toolsOf(artifact), runtime.tools ?? [], `${name}.md tools differ from runtime/claude-code.json`);
    assert.equal(frontmatter(artifact).model, runtime.model, `${name}.md model differs from runtime/claude-code.json`);
  }
});

/**
 * Barb's one guarantee. A reviewer that can edit the code under review can make a finding
 * disappear instead of reporting it, and one that can edit skills/ can resolve a violation by
 * softening the rule. Both are silent, which is why this is a test and not a comment.
 *
 * Her two checkers are here for the same reason: they read one skill and one screen, and a
 * write tool on either is a fix applied by the thing that found it.
 */
test("Barb and her checkers hold no write tool", () => {
  for (const name of ["barb", "checker", "feisty"]) {
    const artifact = path.join(artifactDir, `${name}.md`);
    const tools = toolsOf(artifact);
    assert.ok(tools.length > 0, `${name}.md declares no tools — it would inherit the session's`);
    for (const forbidden of ["Write", "Edit", "MultiEdit", "NotebookEdit"]) {
      assert.ok(!tools.includes(forbidden), `${name}.md holds ${forbidden}`);
    }
  }
});

/**
 * The same assertion, generalised, because the missing-allowlist bug was found by reading one
 * file rather than by anything checking. A subagent's front matter is written by hand rather
 * than rendered, so nothing has ever guaranteed the `tools:` line is in it — and a subagent
 * without one holds whatever the session holds, which for the ones here means a client's data.
 */
test("every subagent artifact declares a tool allowlist", () => {
  const subagentDirs = agentNames.flatMap((name) => {
    const dir = path.join(agentsDir, name, "subagents");
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
  });
  assert.ok(subagentDirs.length > 0, "found no subagents — this test is checking nothing");
  for (const sub of subagentDirs) {
    const artifact = path.join(artifactDir, `${sub}.md`);
    if (!fs.existsSync(artifact)) continue; // narrowed by `targets:` — the drift test covers that
    assert.ok(toolsOf(artifact).length > 0, `${sub}.md declares no tools — it would inherit the session's`);
  }
});

/**
 * ALAN dispatches Barb, so he needs Task; Barb dispatches checker and feisty, so she needs it
 * too. Without it she can only read the corpus one context at a time, which is a skim.
 */
test("the ALAN-to-Barb dispatch chain has Task at every hop", () => {
  assert.ok(toolsOf(path.join(artifactDir, "alan.md")).includes("Task"), "alan.md cannot dispatch Barb");
  assert.ok(toolsOf(path.join(artifactDir, "barb.md")).includes("Task"), "barb.md cannot fan out to its checkers");
});

/**
 * The nest installs all three or Barb runs without her fan-out, which fails silently and
 * looks like a clean review.
 */
test("the nest manifest installs Barb with both of her checkers", () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(repoRoot, "nest", "nest-manifest.json"), "utf8"));
  for (const name of ["barb", "checker", "feisty"]) {
    const entry = manifest.files.find((f) => f.to === `.claude/agents/${name}.md`);
    assert.ok(entry, `${name} is not installed into .claude/agents/`);
    assert.equal(entry.fromRoot, true, `${name} is read from nest/, where its artifact does not live`);
  }
});

/**
 * The committed artifacts must match what their sources compose to.
 *
 * `npm run agents:build:check` has always reported this, and it runs nowhere automatically —
 * not in CI, not in a hook, not in `npm test`. Which makes it a step somebody has to remember
 * at the moment nobody is thinking about it, and the failure is silent in the direction that
 * matters: an artifact is a build output, so the obvious way to resolve a merge conflict in
 * one is to pick a side. Pick the wrong side and the other side's change is gone, with a green
 * test run over the top of it. Verified before writing this: mangling a description in a built
 * artifact passes all other tests here.
 *
 * The other tests in this file assert properties of an artifact. This one asserts it is the
 * artifact its source produces, which is the only thing that catches a change reverted rather
 * than a rule broken.
 */
test("no committed artifact has drifted from its source", () => {
  const out = execFileSync(process.execPath, [path.join(repoRoot, "scripts", "build-agents.mjs"), "--check"], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  // --check writes nothing, so a failure here is a report, never a repair.
  assert.match(
    out.replace(/\x1b\[[0-9;]*m/g, ""),
    /--check complete\. 0 changes pending\./,
    "artifacts differ from what their sources compose to — run `npm run agents:build`",
  );
});

/** A manifest entry naming a file that is not there installs nothing and says so only at run time. */
test("every manifest source exists where the manifest says it does", () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(repoRoot, "nest", "nest-manifest.json"), "utf8"));
  for (const f of manifest.files) {
    const src = path.join(f.fromRoot ? repoRoot : path.join(repoRoot, "nest"), f.from);
    assert.ok(fs.existsSync(src), `${f.from} is missing from ${f.fromRoot ? "the repository root" : "nest/"}`);
  }
});
