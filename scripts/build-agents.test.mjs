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
    m[1]
      .split("\n")
      .map((l) => /^([a-z_]+):\s*(.*)$/.exec(l))
      .filter(Boolean)
      .map((kv) => [kv[1], kv[2]]),
  );
};

const toolsOf = (file) =>
  (frontmatter(file).tools ?? "").split(/,\s*/).filter(Boolean);

const agentNames = fs
  .readdirSync(agentsDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

/**
 * A file in .claude/agents/ with no `tools:` line inherits the session's tools. That is a
 * documentation gap for most agents and a broken safety property for Barb, so the allowlist
 * has to reach the artifact rather than living only in runtime/claude-code.json where a human
 * is trusted to read it.
 */
test("every claude-code artifact carries its runtime tool allowlist", () => {
  for (const name of agentNames) {
    const runtimeFile = path.join(
      agentsDir,
      name,
      "runtime",
      "claude-code.json",
    );
    const artifact = path.join(artifactDir, `${name}.md`);
    if (!fs.existsSync(runtimeFile) || !fs.existsSync(artifact)) continue;
    const runtime = JSON.parse(fs.readFileSync(runtimeFile, "utf8"));
    assert.deepEqual(
      toolsOf(artifact),
      runtime.tools ?? [],
      `${name}.md tools differ from runtime/claude-code.json`,
    );
    assert.equal(
      frontmatter(artifact).model,
      runtime.model,
      `${name}.md model differs from runtime/claude-code.json`,
    );
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
    assert.ok(
      tools.length > 0,
      `${name}.md declares no tools — it would inherit the session's`,
    );
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
    return fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
  });
  assert.ok(
    subagentDirs.length > 0,
    "found no subagents — this test is checking nothing",
  );
  for (const sub of subagentDirs) {
    const artifact = path.join(artifactDir, `${sub}.md`);
    if (!fs.existsSync(artifact)) continue; // narrowed by `targets:` — the drift test covers that
    assert.ok(
      toolsOf(artifact).length > 0,
      `${sub}.md declares no tools — it would inherit the session's`,
    );
  }
});

/**
 * Betty dispatches Barb, so she needs Task; Barb dispatches checker and feisty, so she needs it
 * too. Without it Barb can only read the corpus one context at a time, which is a skim.
 */
test("the Betty-to-Barb dispatch chain has Task at every hop", () => {
  assert.ok(
    toolsOf(path.join(artifactDir, "betty.md")).includes("Task"),
    "betty.md cannot dispatch Barb",
  );
  assert.ok(
    toolsOf(path.join(artifactDir, "barb.md")).includes("Task"),
    "barb.md cannot fan out to its checkers",
  );
});

/**
 * The nest installs all three or Barb runs without her fan-out, which fails silently and
 * looks like a clean review.
 */
/**
 * Edie's comparer checks a rewrite for lost rules. A comparer with a write tool could edit the file
 * it checks and make a lost rule disappear instead of reporting it.
 */
test("Edie's comparer holds no write tool, and Edie can dispatch it", () => {
  const tools = toolsOf(path.join(artifactDir, "comparer.md"));
  assert.ok(
    tools.length > 0,
    "comparer.md declares no tools — it would inherit the session's",
  );
  for (const forbidden of [
    "Write",
    "Edit",
    "MultiEdit",
    "NotebookEdit",
    "Bash",
  ]) {
    assert.ok(!tools.includes(forbidden), `comparer.md holds ${forbidden}`);
  }
  assert.ok(
    toolsOf(path.join(artifactDir, "edie.md")).includes("Task"),
    "edie.md cannot dispatch the comparer",
  );
});

test("the nest manifest installs Barb with both of her checkers", () => {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(repoRoot, "nest", "nest-manifest.json"), "utf8"),
  );
  for (const name of ["barb", "checker", "feisty"]) {
    const entry = manifest.files.find(
      (f) => f.to === `.claude/agents/${name}.md`,
    );
    assert.ok(entry, `${name} is not installed into .claude/agents/`);
    assert.equal(
      entry.fromRoot,
      true,
      `${name} is read from nest/, where its artifact does not live`,
    );
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
  const out = execFileSync(
    process.execPath,
    [path.join(repoRoot, "scripts", "build-agents.mjs"), "--check"],
    {
      cwd: repoRoot,
      encoding: "utf8",
    },
  );
  // --check writes nothing, so a failure here is a report, never a repair.
  assert.match(
    out.replace(/\x1b\[[0-9;]*m/g, ""),
    /--check complete\. 0 changes pending\./,
    "artifacts differ from what their sources compose to — run `npm run agents:build`",
  );
});

/** A manifest entry naming a file that is not there installs nothing and says so only at run time. */
test("every manifest source exists where the manifest says it does", () => {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(repoRoot, "nest", "nest-manifest.json"), "utf8"),
  );
  for (const f of manifest.files) {
    const src = path.join(
      f.fromRoot ? repoRoot : path.join(repoRoot, "nest"),
      f.from,
    );
    assert.ok(
      fs.existsSync(src),
      `${f.from} is missing from ${f.fromRoot ? "the repository root" : "nest/"}`,
    );
  }
});

// ---------------------------------------------------------------- the Grok plugin

const grokDir = path.join(repoRoot, "portable", "grok", "agents");
const grokFiles = () =>
  fs.readdirSync(grokDir).filter((f) => f.endsWith(".md"));

/**
 * The names Grok Build resolves in a `tools:` allowlist, copied from Grok's own table in
 * xai-org/grok-build, crates/codegen/xai-grok-tools/src/types/claude_alias.rs (checked against
 * Grok 1.0.52). `Agent` and `Task` are spawn directives, and any `mcp__` name is always allowed.
 *
 * The list matters because Grok fails open: one name Grok does not recognize makes Grok keep
 * the agent's whole toolset, Write and Edit included. A typo in Barb's tool list would hand the
 * reviewer write access with no warning anywhere, so an unknown name fails this test instead.
 * When Grok adds a name, add it here from that file.
 */
const GROK_TOOL_NAMES = new Set([
  "Read",
  "Write",
  "Edit",
  "MultiEdit",
  "NotebookEdit",
  "Bash",
  "PowerShell",
  "Grep",
  "Glob",
  "LS",
  "LSP",
  "WebSearch",
  "WebFetch",
  "DeployApp",
  "TodoWrite",
  "AskUserQuestion",
  "TaskOutput",
  "BashOutput",
  "BashOutputTool",
  "AgentOutputTool",
  "TaskStop",
  "KillShell",
  "KillBash",
  "Skill",
  "ToolSearch",
  "Agent",
  "Task",
]);
const WRITE_TOOLS = ["Write", "Edit", "MultiEdit", "NotebookEdit"];

test("the Grok plugin holds exactly Betty, Barb and Barb's two checkers", () => {
  // The grok target is opt-in, so an agent with no targets line, such as Alan, or one of
  // Claire's client subagents, never reaches the public plugin by default.
  assert.deepEqual(grokFiles().sort(), [
    "barb.md",
    "betty.md",
    "checker.md",
    "feisty.md",
  ]);
});

test("every name in a Grok agent's tool list is one Grok resolves", () => {
  for (const file of grokFiles()) {
    const tools = toolsOf(path.join(grokDir, file));
    assert.ok(
      tools.length,
      `${file} has no tools line, so Grok would give it every tool`,
    );
    const unknown = tools.filter(
      (t) => !t.startsWith("mcp__") && !GROK_TOOL_NAMES.has(t),
    );
    assert.deepEqual(
      unknown,
      [],
      `${file}: Grok does not resolve ${unknown.join(", ")}, so Grok would give the agent every tool`,
    );
  }
});

test("Barb and her checkers hold no write tool on Grok", () => {
  for (const name of ["barb", "checker", "feisty"]) {
    const tools = toolsOf(path.join(grokDir, `${name}.md`));
    assert.deepEqual(
      tools.filter((t) => WRITE_TOOLS.includes(t)),
      [],
      `${name} holds a write tool on Grok`,
    );
  }
});

test("the Grok plugin manifest points at every skill folder, the agents and the knowledge MCP server", () => {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(repoRoot, ".grok-plugin", "plugin.json"), "utf8"),
  );
  const categories = fs
    .readdirSync(path.join(repoRoot, "skills"), { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => `./skills/${d.name}`)
    .sort();
  assert.deepEqual(
    [...manifest.skills].sort(),
    categories,
    "a skills category folder is missing from .grok-plugin/plugin.json",
  );
  assert.ok(
    fs.existsSync(path.join(repoRoot, manifest.agents)),
    `${manifest.agents} does not exist`,
  );
  const knowledge = manifest.mcpServers["recursica-knowledge"];
  const server = knowledge.args[0].replace("${GROK_PLUGIN_ROOT}", repoRoot);
  assert.ok(
    fs.existsSync(server),
    `the knowledge server ${knowledge.args[0]} does not exist`,
  );
  assert.deepEqual(
    Object.keys(manifest.mcpServers),
    ["recursica-knowledge"],
    "the plugin starts the knowledge server and nothing else; Barb's and Betty's tool lists name only it",
  );
});

test("the Grok marketplace lists the plugin by this repository's git URL", () => {
  // Grok refuses an index entry that points at the marketplace's own root ("./"), so the entry
  // points back at this repository by URL and Grok clones the repository as the plugin.
  const index = JSON.parse(
    fs.readFileSync(
      path.join(repoRoot, ".grok-plugin", "marketplace.json"),
      "utf8",
    ),
  );
  const manifest = JSON.parse(
    fs.readFileSync(path.join(repoRoot, ".grok-plugin", "plugin.json"), "utf8"),
  );
  const entry = index.plugins.find((p) => p.name === manifest.name);
  assert.ok(entry, `the marketplace has no entry named ${manifest.name}`);
  assert.equal(entry.source.source, "url");
  assert.equal(
    entry.source.url,
    "https://github.com/borderux/recursica-knowledge.git",
  );
  assert.equal(entry.source.ref, "main");
});

/**
 * On CircleChat, Loki once said four files were "created and attached to the task" without
 * calling a tool, and once printed a raw tool call as his reply. His CircleChat persona names
 * each step of a file's turn in order: write with the tool, check the file, attach the file,
 * summarize in the chat, and create a task first when there is none. Checked in the persona that
 * ships, not only in the source fragment.
 */
test("Loki's CircleChat persona writes, checks and attaches each file before claiming it", () => {
  const soul = fs.readFileSync(
    path.join(repoRoot, "portable", "circlechat", "agents", "loki", "SOUL.md"),
    "utf8",
  );
  const at = (re) => {
    const m = re.exec(soul);
    assert.ok(m, `Loki's SOUL.md has no ${re}`);
    return m.index;
  };
  const task = at(/emit one `create_task` action for the study/);
  const write = at(/Write the file with the `write_file` tool\.\*\* Call the tool, with the full path: `\/workspace\/loki\/Loki_<project_name>\/<file>`/);
  at(/Never print the call, a JSON object such as `\{"code": \.\.\.\}`, or code in the reply/);
  const check = at(/Check that the file exists\.\*\* Run `ls -l` on the exact path, or read the file back with `read_file`/);
  const attach = at(/"type":"share_to_task".*"files":\[\{"path":"\/workspace\/loki\/Loki_<project_name>\/<file>"\}\]/);
  const reply = at(/Write one or two sentences.*Never paste the plan, a transcript or the answer key into the chat/);
  assert.ok(task < write && write < check && check < attach && attach < reply, "the steps run in order");
  at(/Never say a file is created, written or attached unless step 6 found the file in this turn/);
  assert.doesNotMatch(soul, /Do not attach files/);
  for (const f of [
    path.join(repoRoot, "buzz-agents", "agents", "loki", "SYSTEM_PROMPT.md"),
    path.join(artifactDir, "loki.md"),
    path.join(repoRoot, "portable", "circlechat", "agents", "loki", "SOUL.md"),
  ]) {
    const text = fs.readFileSync(f, "utf8").replace(/\s+/g, " ");
    assert.match(text, /Write every document with a real tool call\. A tool call printed in the reply as text, such as a block of JSON or code, writes nothing\./, path.relative(repoRoot, f));
    assert.match(text, /Never report a document Loki did not check\./, path.relative(repoRoot, f));
  }
});
