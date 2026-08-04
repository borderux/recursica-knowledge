#!/usr/bin/env node
/**
 * Report whether the agents running on this Mac still match the versioned prompts,
 * and hand back a `draft-update` for the ones that are behind.
 *
 * This is the missing third direction. `export-agents.mjs` moves Buzz Desktop into
 * git; `restore-agents.mjs` builds an agent that does not exist yet. Neither answers
 * the question an operator actually has after `git pull`: *am I running the prompt on
 * this branch, and if not, which side is stale?*
 *
 * Usage:
 *   node buzz-agents/scripts/sync-prompts.mjs [--channel <uuid>] [--agent <name>]
 *                                             [--values <file>] [--input <path>]
 *                                             [--diff] [--check] [--run]
 *
 *   --channel <uuid>   channel to open the drafts in. Without it the report still
 *                      runs; only the commands need it.
 *   --agent <name>     limit to one agent (repeatable)
 *   --values <file>    token values (default: buzz-agents/local-values.json)
 *   --input <path>     Buzz Desktop state (default: the usual macOS location)
 *   --diff             print the drift as a unified diff
 *   --check            exit 1 if anything is out of sync; write and send nothing
 *   --run              execute the draft-update commands instead of printing them
 *   --force-apply      also offer a command for an agent whose live prompt is not in
 *                      git. Read --diff first: this overwrites unversioned work.
 *
 * ## The comparison happens in repo space, not resolved space
 *
 * The obvious implementation — fill the tokens in the stored prompt and compare it to
 * the live one — is wrong, and wrong in a way that looks like it works. `placeholders.json`
 * carries **redactions** as well as tokens, and redactions are deliberately one-way:
 * text scrubbed on export is never reinstated. A resolved-space comparison therefore
 * reports drift on every redacted agent, on every run, forever, and there is no edit
 * that would ever clear it.
 *
 * So the live prompt is pushed through the *export* transformation instead — tokenize,
 * then redact — and the result is compared against the stored file. That asks "would
 * `export-agents.mjs` write anything?", which is the same question with the same answer
 * for real edits, and the right answer (none) for a redaction. It also reuses the
 * transformation the export has been running all along rather than inventing a second
 * one that has to agree with it.
 *
 * ## Which side is stale is decided by git, not by guessing
 *
 * Content alone cannot tell "the branch moved ahead of me" from "I edited my agent in
 * Buzz Desktop and never exported it" — and the two want opposite fixes. Applying the
 * repo over local edits destroys them silently.
 *
 * Git already holds the answer. If the repo-space image of the live prompt matches an
 * *earlier commit* of the stored file, then the live agent is a known past state of the
 * repo and the branch has simply moved on: safe to apply. If it matches no commit ever
 * made, the live prompt contains work this repository has never seen, and the fix is to
 * export and commit it — not to overwrite it. Those two cases get different advice, and
 * the second one will not produce an apply command without `--force-apply`.
 *
 * Requires the `buzz` CLI on PATH with credentials for this community only when `--run`
 * is used. The report itself reads local files and needs nothing.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  loadPlaceholders,
  loadValues,
  localValuesPath,
  tokenize,
  applyRedactions,
  detokenize,
} from "../lib/placeholders.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const buzzAgentsDir = path.join(__dirname, "..");
const agentsDir = path.join(buzzAgentsDir, "agents");
const repoRoot = path.join(buzzAgentsDir, "..");
const resolvedDir = path.join(buzzAgentsDir, ".resolved");

/**
 * Enforced by the relay, not by us: `buzz agents draft-update` rejects a longer prompt
 * with `system prompt is too long (max 20000 characters)`. Verified against the live
 * CLI on 2026-08-04 — 20,001 characters is refused, 19,999 accepted.
 *
 * It matters here because Claire's resolved prompt currently sits within a few hundred
 * characters of the ceiling. Checking before printing a command means the operator is
 * told which agent will not fit and by how much, instead of running a command that
 * fails, or worse landing a prompt that was quietly cut off mid-rule.
 */
const PROMPT_LIMIT = 20000;

/**
 * Settings worth comparing. Deliberately only the ones `draft-update` can actually
 * carry — reporting drift in a field with no flag would be telling the operator about
 * a problem and then walking away from it. The fields with no CLI surface are already
 * printed as a MANUAL block by restore-agents.mjs.
 */
const SYNCABLE_SETTINGS = ["runtime", "provider", "model", "respond_to"];

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const opt = (name) => {
  const i = argv.indexOf(name);
  return i === -1 ? null : argv[i + 1];
};
const optAll = (name) => {
  const out = [];
  argv.forEach((a, i) => {
    if (a === name && argv[i + 1]) out.push(argv[i + 1]);
  });
  return out;
};

if (flag("--help") || flag("-h")) {
  const header = fs.readFileSync(fileURLToPath(import.meta.url), "utf8");
  const usage = header.slice(
    header.indexOf(" * Usage:"),
    header.indexOf(" * ## The comparison"),
  );
  console.log(usage.replace(/^ \* ?/gm, "").trimEnd());
  process.exit(0);
}

const channel = opt("--channel");
const only = optAll("--agent").map((s) => s.toLowerCase());
const valuesFile = opt("--values") ?? localValuesPath;
const showDiff = flag("--diff");
const checkOnly = flag("--check");
const run = flag("--run");
const forceApply = flag("--force-apply");

function defaultInputPath() {
  const appSupport = path.join(
    os.homedir(),
    "Library",
    "Application Support",
    "xyz.block.buzz.app",
    "agents",
    "managed-agents.json",
  );
  if (fs.existsSync(appSupport)) return appSupport;
  return path.join(
    os.homedir(),
    ".config",
    "xyz.block.buzz.app",
    "agents",
    "managed-agents.json",
  );
}

const inputPath = opt("--input") ?? defaultInputPath();

if (!fs.existsSync(inputPath)) {
  console.error(`No managed-agents.json at ${inputPath}`);
  console.error(
    "Pass --input <path> if Buzz Desktop stores its state elsewhere.",
  );
  process.exit(1);
}

const entries = JSON.parse(fs.readFileSync(inputPath, "utf8"));
if (!Array.isArray(entries)) {
  console.error("Expected managed-agents.json to be an array.");
  process.exit(1);
}

const { tokens, redactions } = loadPlaceholders();
const values = loadValues(valuesFile);

// Same reasoning as the export: without the values, tokenization is a no-op, every
// agent looks drifted, and the suggested fix would be to commit real identifiers.
// Refusing is the only safe answer.
if (Object.keys(tokens).length > 0 && values === null) {
  console.error(`No values file at ${valuesFile}`);
  console.error(
    "placeholders.json declares tokens, so their values are needed to compare like with like.",
  );
  console.error(
    "Copy buzz-agents/local-values.example.json to local-values.json and fill it in.",
  );
  process.exit(1);
}

const vals = values ?? {};

// Personas are the definitions; instances are a persona bound to this community.
// Same split the export relies on.
const personas = entries.filter(
  (e) => e.slug && !e.persona_id && !e.is_builtin,
);
const instances = entries.filter((e) => e.persona_id);

/* ------------------------------------------------------------------ git history */

/**
 * Every past version of a stored prompt, newest first, as {commit, subject, text}.
 *
 * Returns null — not an empty list — when git cannot answer, so that "no history" and
 * "history says this content is new" stay distinguishable. Only the second one justifies
 * telling an operator their live prompt contains unversioned work.
 */
function fileHistory(relPath) {
  let commits;
  try {
    commits = execFileSync(
      "git",
      ["-C", repoRoot, "log", "--format=%H%x00%s", "--", relPath],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    )
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const [commit, subject] = line.split("\0");
        return { commit, subject };
      });
  } catch {
    return null;
  }
  if (!commits.length) return null;

  const out = [];
  for (const c of commits) {
    try {
      out.push({
        ...c,
        text: execFileSync(
          "git",
          ["-C", repoRoot, "show", `${c.commit}:${relPath}`],
          {
            encoding: "utf8",
            stdio: ["ignore", "pipe", "ignore"],
          },
        ),
      });
    } catch {
      // The path did not exist at that commit — a rename or the commit that added it.
    }
  }
  return out;
}

/* ------------------------------------------------------------------ diffing */

/**
 * Unified diff of the two repo-space texts.
 *
 * Repo space matters for more than correctness: both sides are tokenized and redacted,
 * so the output carries no project ids, folder ids or home directories and is safe to
 * paste into a channel. A resolved-space diff would not be.
 */
function unifiedDiff(a, b, labelA, labelB) {
  fs.mkdirSync(resolvedDir, { recursive: true });
  const fa = path.join(resolvedDir, `.sync-${labelA}`);
  const fb = path.join(resolvedDir, `.sync-${labelB}`);
  fs.writeFileSync(fa, a);
  fs.writeFileSync(fb, b);
  try {
    execFileSync("diff", ["-u", "--label", labelA, "--label", labelB, fa, fb], {
      encoding: "utf8",
    });
    return "";
  } catch (err) {
    // diff exits 1 when the files differ, which is the expected path here.
    if (err.status === 1) return err.stdout ?? "";
    throw err;
  } finally {
    fs.rmSync(fa, { force: true });
    fs.rmSync(fb, { force: true });
  }
}

const sameIgnoringWhitespace = (a, b) =>
  a.replace(/\s+/g, " ").trim() === b.replace(/\s+/g, " ").trim();

/* ------------------------------------------------------------------ classify */

let dirs = fs
  .readdirSync(agentsDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();

if (only.length) {
  const unknown = only.filter((o) => !dirs.includes(o));
  if (unknown.length) {
    console.error(
      `No such agent in buzz-agents/agents/: ${unknown.join(", ")}`,
    );
    console.error(`Available: ${dirs.join(", ")}`);
    process.exit(1);
  }
  dirs = dirs.filter((d) => only.includes(d));
}

const reports = [];

for (const dir of dirs) {
  const base = path.join(agentsDir, dir);
  const config = JSON.parse(
    fs.readFileSync(path.join(base, "agent.json"), "utf8"),
  );
  const promptPath = path.join(base, config.system_prompt_file);
  const relPromptPath = path.relative(repoRoot, promptPath);
  const stored = fs.readFileSync(promptPath, "utf8");

  const report = {
    dir,
    config,
    stored,
    relPromptPath,
    notes: [],
    settings: [],
  };
  reports.push(report);

  // Match on `name`, the field the export derives the directory from. display_name is
  // what a human sees and what draft-update wants, but it is also what a human renames.
  const live =
    personas.find((p) => p.name === config.name) ??
    personas.find((p) => p.display_name === config.display_name);

  if (!live) {
    report.state = "absent";
    continue;
  }

  // `--agent-name` is taken from the live entry rather than from agent.json on purpose.
  // draft-update does not verify that the agent exists: an unmatched name returns
  // `accepted: true` and opens a draft that updates nothing. Verified 2026-08-04. The
  // only name guaranteed to hit something is the one Buzz Desktop is holding.
  report.liveName = live.display_name ?? live.name;

  let livePrompt = live.system_prompt ?? "";
  if (!livePrompt.endsWith("\n")) livePrompt += "\n";

  // What export-agents.mjs would write if it ran right now.
  const image = applyRedactions(tokenize(livePrompt, vals), redactions);
  report.image = image;

  /**
   * Settings drift splits in two, and conflating them would print a broken command.
   * The flags only ever *set* a value — there is no way to clear one. So a repo value
   * of null against a live value of something is real drift that no `draft-update` can
   * express, and `--model null` would set the model to the literal string "null".
   * Those are reported and kept out of the command.
   */
  for (const field of SYNCABLE_SETTINGS) {
    if (config[field] === undefined) continue;
    if (live[field] === config[field]) continue;
    const repo = config[field];
    const settable = typeof repo === "string" && repo !== "";
    report.settings.push({ field, repo, live: live[field], settable });
  }

  // A persona's prompt is copied to its instance at creation. If they have diverged,
  // "what is running" has two answers and neither should be reported as if it were the
  // only one. Same warning the export raises.
  const instance = instances.find((i) => i.persona_id === live.slug);
  if (
    instance &&
    (instance.system_prompt ?? "") !== (live.system_prompt ?? "")
  ) {
    report.notes.push(
      `persona and running instance disagree (${(live.system_prompt ?? "").length} vs ` +
        `${(instance.system_prompt ?? "").length} chars) — comparing the persona`,
    );
  }

  if (image === stored) {
    report.state = report.settings.length ? "settings-only" : "in-sync";
    continue;
  }

  const history = fileHistory(relPromptPath);
  if (history === null) {
    // Without history there is no way to tell which side is stale, and guessing here
    // would be guessing about whether to overwrite someone's work.
    report.state = "unknown-direction";
    report.notes.push(
      "no git history for this file — cannot tell whether the branch or the live agent is ahead",
    );
    continue;
  }

  const match = history.find((h) => h.text === image);
  if (match) {
    report.state = "repo-ahead";
    report.behind = history.indexOf(match);
    report.at = match;
  } else {
    report.state = "live-ahead";
    if (sameIgnoringWhitespace(image, stored)) {
      report.notes.push("differs only in whitespace and line wrapping");
    }
  }
}

/* ------------------------------------------------------------------ report */

const label = {
  "in-sync": "in sync",
  "settings-only": "prompt in sync, settings differ",
  "repo-ahead": "BEHIND the branch",
  "live-ahead": "has local edits not in git",
  "unknown-direction": "differs, direction unknown",
  absent: "not installed on this Mac",
};

console.log(
  `Comparing ${path.relative(process.cwd(), agentsDir)} against ${inputPath}\n`,
);

for (const r of reports) {
  const size = r.image ? `${r.stored.length} → ${r.image.length} chars` : "";
  console.log(`  ${r.dir.padEnd(8)} ${label[r.state].padEnd(31)} ${size}`);
  if (r.state === "repo-ahead") {
    console.log(
      `           live matches ${r.at.commit.slice(0, 7)} "${r.at.subject}"` +
        (r.behind ? ` — ${r.behind} commit(s) behind` : ""),
    );
  }
  for (const s of r.settings) {
    console.log(
      `           ${s.field}: repo ${JSON.stringify(s.repo)} / live ${JSON.stringify(s.live)}` +
        (s.settable
          ? ""
          : "  — no flag can clear this; set it in Buzz Desktop"),
    );
  }
  for (const n of r.notes) console.log(`           ! ${n}`);
}

if (showDiff) {
  for (const r of reports) {
    if (!r.image || r.image === r.stored) continue;
    console.log(
      `\n${"=".repeat(72)}\n${r.dir}: stored (a) vs live (b), both tokenized\n`,
    );
    console.log(
      unifiedDiff(r.stored, r.image, `${r.dir}-stored`, `${r.dir}-live`),
    );
  }
}

const behind = reports.filter((r) => r.state === "repo-ahead");
const ahead = reports.filter((r) => r.state === "live-ahead");
// A settings-only agent whose every difference is unsettable has nothing to send; it
// would otherwise produce a draft-update carrying no changes at all.
const settingsOnly = reports.filter(
  (r) => r.state === "settings-only" && r.settings.some((s) => s.settable),
);
const unknown = reports.filter((r) => r.state === "unknown-direction");
const absent = reports.filter((r) => r.state === "absent");

if (ahead.length) {
  console.log(
    `\n! ${ahead.length} agent(s) are running a prompt this repository has never held:`,
  );
  for (const r of ahead) console.log(`    ${r.dir}`);
  console.log(
    "  That is unversioned work, so applying the branch over it would delete it.\n" +
      "  Capture it first, review the diff, and commit:\n\n" +
      "    node buzz-agents/scripts/export-agents.mjs\n",
  );
  if (forceApply) {
    console.log(
      "  --force-apply given: an apply command is printed below anyway. Read the\n" +
        "  --diff output before you run it.\n",
    );
  }
}

if (absent.length) {
  console.log(
    `\n  ${absent.length} agent(s) in the repo are not installed here: ` +
      `${absent.map((r) => r.dir).join(", ")}`,
  );
  console.log(
    "  Create them with: node buzz-agents/scripts/restore-agents.mjs --channel <uuid>",
  );
}

if (unknown.length) {
  console.log(
    "\n  Run from a git checkout to have the direction of the drift worked out for you.",
  );
}

/* ------------------------------------------------------------------ apply */

const applicable = [...behind, ...settingsOnly, ...(forceApply ? ahead : [])];

/**
 * "In sync" is stricter than "nothing to apply". An agent missing from this Mac, or one
 * whose only difference is a setting no flag can change, is still not what the branch
 * says — and `--check` exists to catch exactly that, so it cannot be allowed to pass
 * just because this script has no command to offer.
 */
const clean = reports.every((r) => r.state === "in-sync" && !r.settings.length);

if (!applicable.length) {
  console.log(
    clean ? "\nEverything in sync." : "\nNothing this script can apply.",
  );
  process.exit(checkOnly && !clean ? 1 : 0);
}

if (checkOnly) {
  console.log(
    `\nOut of sync — ${applicable.length} agent(s) would be updated.`,
  );
  console.log("Run without --check to see the commands.");
  process.exit(1);
}

// Resolving happens only for agents that are actually being applied. An agent that is
// in sync has no reason to have its identifiers written to disk, even gitignored.
const commands = [];
const blocked = [];

for (const r of applicable) {
  const { text: resolved, missing } = detokenize(r.stored, vals);

  // An agent whose instructions literally read `{{BQ_PROJECT}}` would go looking for a
  // project by that name. Same fail-closed rule as restore-agents.mjs.
  if (missing.length) {
    blocked.push({
      dir: r.dir,
      reason: `unresolved tokens: ${missing.join(", ")}`,
    });
    continue;
  }

  if (resolved.length > PROMPT_LIMIT) {
    blocked.push({
      dir: r.dir,
      reason:
        `resolved prompt is ${resolved.length} characters, ` +
        `${resolved.length - PROMPT_LIMIT} over the ${PROMPT_LIMIT} limit draft-update enforces`,
    });
    continue;
  }

  const args = [
    "agents",
    "draft-update",
    "--channel",
    channel,
    "--agent-name",
    r.liveName,
  ];
  let stdinFile = null;

  if (r.state !== "settings-only") {
    fs.mkdirSync(resolvedDir, { recursive: true });
    stdinFile = path.join(resolvedDir, `${r.dir}.md`);
    fs.writeFileSync(stdinFile, resolved);
    args.push("--system-prompt", "-");
  }
  for (const s of r.settings) {
    if (!s.settable) continue;
    args.push(`--${s.field.replace(/_/g, "-")}`, s.repo);
  }

  commands.push({
    label: `${r.dir} → ${r.liveName}`,
    argv: args,
    stdin: stdinFile,
    headroom: PROMPT_LIMIT - resolved.length,
  });
}

if (blocked.length) {
  console.log("\nCannot apply:");
  for (const b of blocked) console.log(`    ${b.dir}: ${b.reason}`);
  console.log(
    "  For an over-length prompt, move a section out to a GUIDES/*.md the agent is told\n" +
      "  to read rather than shaving prose — see nest/GUIDES/JANICE_REVIEW_CHECKLIST.md.",
  );
}

if (!commands.length) process.exit(1);

if (!channel) {
  console.log(
    `\n${commands.length} agent(s) can be updated, but --channel <uuid> is needed to open the drafts.`,
  );
  console.log("Find it with: buzz channels list");
  process.exit(1);
}

for (const cmd of commands) {
  if (!run) {
    const shown = cmd.argv
      .map((a) =>
        /[^\w@%+=:,./-]/.test(a) ? `'${a.replace(/'/g, `'\\''`)}'` : a,
      )
      .join(" ");
    console.log(
      `\n# ${cmd.label}` +
        (cmd.stdin
          ? `  (prompt is ${cmd.headroom} chars under the limit)`
          : "  (settings only)"),
    );
    console.log(
      cmd.stdin
        ? `buzz ${shown} < ${path.relative(process.cwd(), cmd.stdin)}`
        : `buzz ${shown}`,
    );
    continue;
  }

  console.log(`\n→ ${cmd.label}`);
  try {
    const out = execFileSync("buzz", cmd.argv, {
      input: cmd.stdin ? fs.readFileSync(cmd.stdin) : undefined,
      encoding: "utf8",
    });
    console.log(out.trim());
  } catch (err) {
    console.error(`  failed: ${err.stderr?.toString().trim() || err.message}`);
    console.error(
      "  Stopping — fix this before continuing so the rest is not half-applied.",
    );
    process.exit(1);
  }
}

if (!run) {
  console.log("\n# Review the above, then re-run with --run to send them.");
}
console.log(
  "\nEach draft opens a form in the owner's Buzz Desktop. Nothing changes until they save it —\n" +
    "an agent cannot rewrite its own instructions, and that review gate is deliberate.",
);
