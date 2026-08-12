#!/usr/bin/env node
/**
 * Compose each agent's portable core into the artifact a given platform wants.
 *
 * Git is the source of truth. `agents/<name>/SKILL.md` holds everything portable, with
 * `<!-- platform:NAME -->` markers where the surface differs; `agents/<name>/platform/*.md`
 * supplies the text for each marker; `agents/<name>/runtime/*.json` holds the settings that
 * are pure platform config and never belong in a prompt.
 *
 * Targets:
 *
 *   buzz          → buzz-agents/agents/<name>/SYSTEM_PROMPT.md
 *                   The file Buzz Desktop already consumes, via `system_prompt_file` in
 *                   agent.json. Because that indirection already existed, this build slots
 *                   in underneath the installer without touching restore-agents.mjs, the
 *                   deploy, or the onboarding path.
 *
 *   claude-code   → portable/claude-code/agents/<name>.md
 *   opencode      → portable/opencode/agents/<name>.md
 *                   Committed rather than generated into a gitignored dist/, because the
 *                   whole point is that somebody browsing the public repo can copy the file
 *                   straight into their own project without installing anything of ours.
 *
 * Subagents live at agents/<name>/subagents/<sub>/ and build to two places:
 *
 *   nest          → nest/mcp/templates/agents/<sub>.md.tmpl
 *                   The template deploy-claire-channel.sh renders per client. Same seam as the
 *                   Buzz prompt: the deploy already read that path, so the template becoming a
 *                   build output is invisible to it.
 *
 *   claude-code   → portable/claude-code/agents/<sub>.md
 *
 * A `pinned` target — the Buzz prompt, the nest template — is asserted byte-identical to what
 * is already committed unless --accept is passed. A refactor that changes what is already
 * shipping is not a refactor.
 *
 *   node scripts/build-agents.mjs --check     report drift, write nothing
 *   node scripts/build-agents.mjs             write
 *
 * Every artifact is run through check-text-for-names.mjs before it is written. The repo is
 * public and these files are generated, which is exactly the category that gets reviewed
 * least closely.
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "..");
const agentsDir = path.join(repoRoot, "agents");
const CHECKER = path.join(repoRoot, "buzz-agents", "scripts", "check-text-for-names.mjs");

const argv = process.argv.slice(2);
const CHECK = argv.includes("--check") || argv.includes("--dry-run");
const ACCEPT = argv.includes("--accept");

if (argv.includes("--help") || argv.includes("-h")) {
  console.log(`Compose agent artifacts from agents/<name>/.

  --check     report what would change; write nothing
  --accept    allow the Buzz prompt to change (it is asserted identical by default)
  --help

Targets: buzz, claude-code, opencode. See the header of this file for where each lands.`);
  process.exit(0);
}

/**
 * Which platform fragment file each target reads.
 *
 * claude-code and opencode share one file on purpose. Their fragments came out identical —
 * both are a plain session with a person in it, no channel and nobody to @mention — and two
 * identical files is how drift starts. Split them the day they genuinely differ.
 */
const TARGETS = {
  buzz: { fragments: "buzz.md", out: (n) => `buzz-agents/agents/${n}/SYSTEM_PROMPT.md`, frontmatter: false, pinned: true },
  "claude-code": { fragments: "session.md", out: (n) => `portable/claude-code/agents/${n}.md`, frontmatter: "claude-code" },
  opencode: { fragments: "session.md", out: (n) => `portable/opencode/agents/${n}.md`, frontmatter: "opencode" },
};

/**
 * Where a subagent's two artifacts land.
 *
 * `nest` writes the template `deploy-claire-channel.sh` renders per client. It is pinned for
 * the same reason the Buzz prompt is, and for the same seam: the deploy already reads that
 * path, so the template becoming a build output is invisible to it. Nothing in the deploy,
 * the nest manifest or the installer changes.
 *
 * No `frontmatter` key on either — a subagent's front matter is part of the artifact rather
 * than something rendered around it, so it stays in SKILL.md where the markers can reach it.
 */
const SUBAGENT_TARGETS = {
  nest: { fragments: "nest.md", out: (n) => `nest/mcp/templates/agents/${n}.md.tmpl`, pinned: true },
  "claude-code": { fragments: "session.md", out: (n) => `portable/claude-code/agents/${n}.md` },
};

let changed = 0;
let failed = 0;
const ok = (m) => console.log(`  \x1b[32m✓\x1b[0m ${m}`);
const wrote = (m) => { changed++; console.log(`  \x1b[36m${CHECK ? "would write" : "wrote"}\x1b[0m ${m}`); };
const bad = (m) => { failed++; console.log(`  \x1b[31m✗\x1b[0m ${m}`); };

/**
 * Split `## fragment-name` blocks out of a platform fragment file, ignoring the leading comment.
 *
 * A block header must be a bare kebab-case slug — the same shape the `<!-- platform:NAME -->`
 * marker accepts. Splitting on every `## ` instead would mean no fragment could ever contain a
 * markdown H2, which is not a limitation anybody would guess at: Claire's scope fragment opens
 * with a real section heading, and under the looser rule it silently became two fragments, one
 * of them empty. The build then produced a prompt 478 bytes short with no error at all.
 */
function loadFragments(file) {
  const raw = fs.readFileSync(file, "utf8").replace(/^<!--[\s\S]*?-->\s*/, "");
  const out = {};
  let current = null;
  const buf = [];
  const flush = () => { if (current) out[current] = buf.join("\n").trim(); buf.length = 0; };
  for (const line of raw.split("\n")) {
    const header = /^## ([a-z0-9-]+)$/.exec(line);
    if (header) { flush(); current = header[1]; continue; }
    if (current) buf.push(line);
  }
  flush();
  return out;
}

/**
 * Front matter, per target. Kept out of SKILL.md so each platform gets only its own keys.
 *
 * The claude-code artifact carries `model:` and `tools:` from `runtime/claude-code.json`
 * rather than leaving them for whoever reads PORTING.md. A file in `.claude/agents/` is a
 * dispatchable agent, and its front matter is the only place a tool allowlist can live: drop
 * one in without a `tools:` line and it inherits the session's tools instead.
 *
 * That is a documentation gap for most of these agents and a broken safety property for one.
 * Barb's whole guarantee is that she cannot write — an agent that can edit the code it reviews
 * can make a finding disappear instead of reporting it, and one that can edit `skills/` can
 * resolve a violation by softening the rule. Both are silent. Her runtime file said `Read,
 * Grep, Glob, Bash, Task`; her artifact said nothing, so ALAN dispatching that artifact would
 * have got a reviewer holding `Write` and `Edit` with no warning anywhere. Her own PORTING.md
 * names per-subagent tools as a thing to check rather than assume, and this build was the
 * thing not honouring it.
 *
 * Derived from the runtime file rather than declared a second time in the front matter: a
 * hand-kept copy of a tool list is a second source of truth, and it goes stale silently.
 */
function renderFrontmatter(kind, meta, runtime) {
  if (kind === "claude-code") {
    const lines = [`name: ${meta.name}`, `description: ${meta.description}`];
    if (runtime?.model) lines.push(`model: ${runtime.model}`);
    if (runtime?.tools?.length) lines.push(`tools: ${runtime.tools.join(", ")}`);
    return `---\n${lines.join("\n")}\n---\n\n`;
  }
  // opencode: `mode` is required to say this is a primary agent rather than a subagent,
  // and it has no `name` key at all — the filename is the identifier.
  return `---\ndescription: ${meta.description}\nmode: primary\n---\n\n`;
}

function parseSkill(file) {
  const raw = fs.readFileSync(file, "utf8");
  const m = /^---\n([\s\S]*?)\n---\n\n?/.exec(raw);
  if (!m) throw new Error(`no frontmatter in ${file}`);
  const meta = {};
  for (const line of m[1].split("\n")) {
    const kv = /^([a-z_]+):\s*(.*)$/.exec(line);
    if (kv) meta[kv[1]] = kv[2];
  }
  return { meta, body: raw.slice(m[0].length) };
}

function nameCheck(text, label) {
  try {
    execFileSync(process.execPath, [CHECKER], { input: text, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
    return true;
  } catch (err) {
    if (err.status !== 2) return true;
    bad(`${label} names something that must not be published — not written. Run the checker on it.`);
    return false;
  }
}

const placeholders = JSON.parse(fs.readFileSync(path.join(repoRoot, "buzz-agents", "placeholders.json"), "utf8"));
const declaredTokens = placeholders.tokens;
const declaredDeployTokens = placeholders.deployTokens ?? {};

/**
 * Compose one artifact and run every guard over it before it is written.
 *
 * Shared by agents and subagents because the guards must not differ between them. A subagent
 * is where the tool allowlist lives, so it is the last place that should get a cheaper check
 * than the orchestrator above it.
 */
function buildArtifact({ source, base, target, spec, outName, label }) {
  const fragFile = path.join(base, "platform", spec.fragments);
  if (!fs.existsSync(fragFile)) { bad(`${target}: no platform/${spec.fragments}`); return; }
  const frags = loadFragments(fragFile);

  let out = source.body;
  const markers = [...source.body.matchAll(/<!-- platform:([a-z0-9-]+) -->/g)].map((m) => m[1]);
  for (const marker of markers) {
    if (!(marker in frags)) { bad(`${target}: platform/${spec.fragments} has no "## ${marker}" block`); return; }
    out = out.split(`<!-- platform:${marker} -->`).join(frags[marker]);
  }
  if (spec.frontmatter) {
    // Only claude-code reads a runtime file here, and only for the two keys its front matter
    // has. `$`-prefixed keys in those files are commentary for a human and are ignored.
    const runtimeFile = path.join(base, "runtime", `${target}.json`);
    const runtime = fs.existsSync(runtimeFile) ? JSON.parse(fs.readFileSync(runtimeFile, "utf8")) : null;
    out = renderFrontmatter(spec.frontmatter, source.meta, runtime) + out;
  }

  const rel = spec.out(outName);
  const outPath = path.join(repoRoot, rel);
  const prev = fs.existsSync(outPath) ? fs.readFileSync(outPath, "utf8") : null;

  /**
   * A `pinned` target is one whose artifact something else already consumes — the prompt Buzz
   * loads, the template the deploy renders. Changing it is a different act from refactoring
   * how it is stored, so it is asserted byte-identical and `--accept` is the way to say you
   * meant it.
   */
  if (spec.pinned && prev !== null && prev !== out && !ACCEPT) {
    bad(`${target}: composed output differs from the committed ${rel} (${prev.length} → ${out.length} bytes).\n      A refactor must not change what is already shipping. Diff it, and pass --accept only if\n      the change is deliberate.`);
    return;
  }
  /**
   * Every {{TOKEN}} that survives into an artifact must be declared.
   *
   * A portable artifact SHOULD still carry tokens — the repo checkout, the workspace root
   * and so on are per-installation and PORTING.md is where they get explained. What must
   * not happen is a token nobody declared: it reads as configuration, appears in no table,
   * and the person porting the agent has no way to learn what to put there. Writing this
   * check is how I caught myself inventing {{WORKSPACE_ROOT}} in the first draft.
   */
  const undeclared = [...new Set([...out.matchAll(/\{\{([A-Z0-9_]+)\}\}/g)].map((m) => m[1]))]
    .filter((t) => !(t in declaredTokens));
  if (undeclared.length) {
    bad(`${target}: undeclared token${undeclared.length > 1 ? "s" : ""} ${undeclared.map((t) => "{{" + t + "}}").join(", ")} — declare in buzz-agents/placeholders.json or remove`);
    return;
  }
  /**
   * The same rule for the OTHER templating syntax.
   *
   * `@SLUG@` is expanded once by the deploy script and never swapped back, where `{{TOKEN}}`
   * is swapped bidirectionally on export — two lifecycles, which is why the repo has two
   * syntaxes rather than one plus an oversight. But only `{{TOKEN}}` had a declaration check,
   * so an `@ANYTHING@` could reach a public artifact undocumented and nothing would say so.
   */
  const undeclaredDeploy = [...new Set([...out.matchAll(/@([A-Z0-9_]+)@/g)].map((m) => m[1]))]
    .filter((t) => !(t in declaredDeployTokens));
  if (undeclaredDeploy.length) {
    bad(`${target}: undeclared deploy token${undeclaredDeploy.length > 1 ? "s" : ""} ${undeclaredDeploy.map((t) => "@" + t + "@").join(", ")} — declare in buzz-agents/placeholders.json under deployTokens, or remove`);
    return;
  }
  /**
   * A `portableOnly` token must not reach an artifact something already consumes.
   *
   * export-agents.mjs skips those tokens when it reports which values are unset, because no
   * operator will ever hold one and a warning that always fires is read as decoration. That
   * exemption is only safe while the claim behind it holds, and nothing was checking it — a
   * portable-only token moved into a shipped passage would leave `{{TOKEN}}` in a live
   * prompt with the one warning that would have caught it switched off by hand.
   */
  if (spec.pinned) {
    const leaked = [...new Set([...out.matchAll(/\{\{([A-Z0-9_]+)\}\}/g)].map((m) => m[1]))]
      .filter((t) => declaredTokens[t]?.portableOnly);
    if (leaked.length) {
      bad(`${target}: ${leaked.map((t) => "{{" + t + "}}").join(", ")} is declared portableOnly and must not reach ${rel} — move it into the portable platform fragment, or drop the flag in buzz-agents/placeholders.json`);
      return;
    }
  }
  if (!nameCheck(out, `${label}/${target}`)) return;
  if (prev === out) { ok(`${target}: ${rel} up to date`); return; }
  if (!CHECK) {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, out);
  }
  wrote(`${target}: ${rel} (${out.length} bytes)`);
}

const names = fs.readdirSync(agentsDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
if (!names.length) { console.log("No agents/ sources yet."); process.exit(0); }

console.log(`\n\x1b[1mBuilding agents\x1b[0m${CHECK ? "   (--check: nothing will be written)" : ""}`);

for (const name of names) {
  const base = path.join(agentsDir, name);
  const { meta, body } = parseSkill(path.join(base, "SKILL.md"));
  console.log(`\n\x1b[1m${name}\x1b[0m`);

  /**
   * `targets:` in the front matter narrows which platforms an agent is built for.
   *
   * Absent means all of them, which is the ALAN case. It exists because not every agent can
   * honestly be built for every target: Claire's subagents each hold a different set of tools
   * on purpose, and opencode's documented agent model has no per-tool allowlist to express
   * that with. Shipping an artifact that quietly drops a boundary is worse than shipping no
   * artifact, so the omission is declared here rather than left to whoever reads the diff.
   */
  const wanted = meta.targets ? meta.targets.split(/[\s,]+/).filter(Boolean) : Object.keys(TARGETS);
  const unknown = wanted.filter((t) => !(t in TARGETS));
  if (unknown.length) { bad(`unknown target${unknown.length > 1 ? "s" : ""} in front matter: ${unknown.join(", ")}`); continue; }
  for (const skipped of Object.keys(TARGETS).filter((t) => !wanted.includes(t))) {
    console.log(`  \x1b[90m—\x1b[0m ${skipped}: not a target for this agent (front matter \`targets:\`)`);
  }

  for (const [target, spec] of Object.entries(TARGETS).filter(([t]) => wanted.includes(t))) {
    buildArtifact({ source: { meta, body }, base, target, spec, outName: name, label: name });
  }

  /**
   * Subagents are built after the agent that dispatches them.
   *
   * They are a second level rather than four more top-level agents because they are not
   * separately useful: Scribe without Claire has nobody to hand it a transcript. Nesting them
   * under the orchestrator keeps that relationship in the layout instead of a comment.
   *
   * `targets:` narrows which artifacts a subagent produces, the same way it does for an agent.
   * It exists because a case finally differed: Claire's subagents are per-client and belong in
   * the nest template the deploy renders, and Barb's are not client-scoped at all — a reviewer
   * reads a design system and an app, with no dataset and no channel — so writing them into the
   * per-client deploy would ship a client four agents that have nothing to do with their data.
   *
   * Unlike an agent, a subagent's front matter IS the artifact, so `targets:` is stripped from
   * what gets written: it is an instruction to this script, not something a subagent runtime
   * should ever see.
   */
  const subDir = path.join(base, "subagents");
  if (!fs.existsSync(subDir)) continue;
  for (const sub of fs.readdirSync(subDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)) {
    const subBase = path.join(subDir, sub);
    // Read whole. Unlike an agent, a subagent's front matter IS the artifact — `name`,
    // `description` and `tools` are what make the file a subagent — and both targets want the
    // same shape, so there is nothing to strip and re-render. Markers work inside it.
    const raw = fs.readFileSync(path.join(subBase, "SKILL.md"), "utf8");
    // `targets:` is build metadata, so it is read off the front matter and then removed from the
    // text that gets written. Matched only inside the leading front-matter block, so a `targets:`
    // appearing in the prose below it is left alone.
    const fm = raw.match(/^---\n([\s\S]*?)\n---\n/);
    const declared = fm?.[1].match(/^targets:[ \t]*(.*)$/m)?.[1] ?? null;
    // Trailing newlines are trimmed after the removal: when `targets:` is the last line of the
    // block, dropping it otherwise leaves the newline that preceded it and the artifact ships with
    // a blank line before its closing `---`.
    const body = declared === null ? raw
      : raw.slice(0, fm.index + 4)
        + fm[1].replace(/^targets:[ \t]*.*\n?/m, "").replace(/\n+$/, "")
        + raw.slice(fm.index + 4 + fm[1].length);

    const wantedSubs = declared ? declared.split(/[\s,]+/).filter(Boolean) : Object.keys(SUBAGENT_TARGETS);
    const unknownSubs = wantedSubs.filter((t) => !(t in SUBAGENT_TARGETS));
    console.log(`  \x1b[1m${sub}\x1b[0m`);
    if (unknownSubs.length) {
      console.log(`    \x1b[31m✗\x1b[0m unknown target${unknownSubs.length > 1 ? "s" : ""}: ${unknownSubs.join(", ")}`);
      failed++;
      continue;
    }
    for (const skipped of Object.keys(SUBAGENT_TARGETS).filter((t) => !wantedSubs.includes(t))) {
      console.log(`    \x1b[90m—\x1b[0m ${skipped}: not a target for this subagent (front matter \`targets:\`)`);
    }
    for (const [target, spec] of Object.entries(SUBAGENT_TARGETS).filter(([t]) => wantedSubs.includes(t))) {
      buildArtifact({ source: { meta: {}, body }, base: subBase, target, spec, outName: sub, label: `${name}/${sub}` });
    }
  }
}

console.log("");
if (failed) { console.log(`\x1b[31m✗ ${failed} problem${failed > 1 ? "s" : ""}.\x1b[0m\n`); process.exit(1); }
console.log(CHECK ? `\x1b[1m--check complete.\x1b[0m ${changed} change${changed === 1 ? "" : "s"} pending.\n`
                  : `\x1b[32m✓ Built.\x1b[0m ${changed} change${changed === 1 ? "" : "s"}.\n`);

/**
 * `--check` exits non-zero when an artifact has drifted from its source.
 *
 * It used to exit 0 in every case a human would call a failure: the drift was printed and the
 * status code said fine. That is invisible while a person is reading the output and fatal the
 * moment anything automated consumes it — a CI step running this would have gone green on
 * exactly the drift it was added to catch.
 *
 * Only under --check. A build that writes the changes has resolved them, so a non-zero exit
 * there would mean "I did my job".
 */
if (CHECK && changed) process.exit(1);
