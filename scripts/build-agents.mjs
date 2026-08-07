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
 * The Buzz output is asserted byte-identical to what is already committed unless --accept
 * is passed. A refactor that changes the shipped prompt is not a refactor.
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
  buzz: { fragments: "buzz.md", out: (n) => `buzz-agents/agents/${n}/SYSTEM_PROMPT.md`, frontmatter: false },
  "claude-code": { fragments: "session.md", out: (n) => `portable/claude-code/agents/${n}.md`, frontmatter: "claude-code" },
  opencode: { fragments: "session.md", out: (n) => `portable/opencode/agents/${n}.md`, frontmatter: "opencode" },
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

/** Front matter, per target. Kept out of SKILL.md so each platform gets only its own keys. */
function renderFrontmatter(kind, meta) {
  if (kind === "claude-code") {
    return `---\nname: ${meta.name}\ndescription: ${meta.description}\n---\n\n`;
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

const declaredTokens = JSON.parse(fs.readFileSync(path.join(repoRoot, "buzz-agents", "placeholders.json"), "utf8")).tokens;

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
    const fragFile = path.join(base, "platform", spec.fragments);
    if (!fs.existsSync(fragFile)) { bad(`${target}: no platform/${spec.fragments}`); continue; }
    const frags = loadFragments(fragFile);

    let out = body;
    const markers = [...body.matchAll(/<!-- platform:([a-z0-9-]+) -->/g)].map((m) => m[1]);
    let unresolved = false;
    for (const marker of markers) {
      if (!(marker in frags)) { bad(`${target}: platform/${spec.fragments} has no "## ${marker}" block`); unresolved = true; continue; }
      out = out.split(`<!-- platform:${marker} -->`).join(frags[marker]);
    }
    if (unresolved) continue;
    if (spec.frontmatter) out = renderFrontmatter(spec.frontmatter, meta) + out;

    const outPath = path.join(repoRoot, spec.out(name));
    const prev = fs.existsSync(outPath) ? fs.readFileSync(outPath, "utf8") : null;

    if (target === "buzz" && prev !== null && prev !== out && !ACCEPT) {
      bad(`buzz: composed prompt differs from the committed SYSTEM_PROMPT.md (${prev.length} → ${out.length} bytes).\n      A refactor must not change the shipped prompt. Diff it, and pass --accept only if the\n      change is deliberate.`);
      continue;
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
      continue;
    }
    if (!nameCheck(out, `${name}/${target}`)) continue;
    if (prev === out) { ok(`${target}: ${spec.out(name)} up to date`); continue; }
    if (!CHECK) {
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, out);
    }
    wrote(`${target}: ${spec.out(name)} (${out.length} bytes)`);
  }
}

console.log("");
if (failed) { console.log(`\x1b[31m✗ ${failed} problem${failed > 1 ? "s" : ""}.\x1b[0m\n`); process.exit(1); }
console.log(CHECK ? `\x1b[1m--check complete.\x1b[0m ${changed} change${changed === 1 ? "" : "s"} pending.\n`
                  : `\x1b[32m✓ Built.\x1b[0m ${changed} change${changed === 1 ? "" : "s"}.\n`);
