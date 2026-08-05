#!/usr/bin/env node
/**
 * Report whether the agents running on this Mac are on the committed version of their
 * prompts, and hand back a `draft-update` for the ones that are behind.
 *
 * `export-agents.mjs` moves Buzz Desktop into git; `restore-agents.mjs` builds an agent
 * that does not exist yet. This answers the question an operator has after `git pull`:
 * *is the agent I am running the one this branch says it should be?*
 *
 * Usage:
 *   node buzz-agents/scripts/sync-prompts.mjs [--channel <uuid>] [--agent <name>]
 *                                             [--values <file>] [--input <path>]
 *                                             [--config <path>]
 *                                             [--diff] [--check] [--run]
 *                                             [--no-stamp] [--force-apply]
 *
 *   --channel <uuid>   channel to open the drafts in. Without it the report still
 *                      runs; only the commands need it.
 *   --agent <name>     limit to one agent (repeatable)
 *   --values <file>    token values (default: buzz-agents/local-values.json)
 *   --input <path>     Buzz Desktop agent state (default: the usual macOS location)
 *   --config <path>    Buzz global agent config holding the stamps
 *   --diff             print the drift as a unified diff
 *   --check            exit 1 if anything is out of sync; write and send nothing
 *   --run              execute the draft-update commands instead of printing them
 *   --no-stamp         never write a version stamp, only read them
 *   --force-apply      also offer a command for an agent whose live prompt is not the
 *                      committed one. Read --diff first: this overwrites local edits.
 *
 * ## The check is a version comparison, not a prompt comparison
 *
 * Each agent carries a **version stamp**: an env var in Buzz's global agent config whose
 * value is the commit that last changed that agent's `SYSTEM_PROMPT.md`, plus a short
 * fingerprint of the prompt that was installed at the time. The everyday question is then
 * two string comparisons. Nothing tokenizes, nothing diffs, nothing walks history, and an
 * agent that is up to date costs almost nothing to prove.
 *
 * That removes a whole class of false positive. Prompts are stored with `{{TOKEN}}`
 * markers and some carry one-way **redactions**, so comparing a stored prompt against a
 * live one has to reason about which space each side is in — and got it wrong in the
 * obvious implementation, reporting the redacted agent as drifted forever. Neither half
 * of a stamp has that problem. The sha is the same string on both sides or it is not, and
 * the fingerprint compares a live prompt against itself at an earlier moment, never
 * across the token boundary.
 *
 * The two halves answer different questions and both are needed. The sha answers "has the
 * branch moved past what I installed?" — the question that decides whether to offer an
 * update. The fingerprint answers "is the agent still running what I installed?", which a
 * sha cannot: it records a past act, and an edit made in Buzz Desktop afterwards leaves it
 * untouched. Without the fingerprint an edited agent reads as up to date and the only copy
 * of that prompt stays hidden.
 *
 * See ../lib/version-stamp.mjs for where the stamp lives, why it is not a field on the
 * agent record, and why the fingerprint is not the agent's `updated_at`.
 *
 * ## A stamp is only ever written for something observed
 *
 * `draft-update` does not change an agent. It opens a form in the owner's Buzz Desktop,
 * and nothing takes effect until they press save — which they may never do. So a script
 * that stamped at send time would be recording an intention as a fact, and an agent whose
 * draft was discarded would then report itself up to date forever, which is worse than
 * having no stamp at all.
 *
 * A stamp is therefore written for exactly one state: the live prompt already matches the
 * committed one. The ordinary consequence is that applying an update takes two runs — one
 * to send the draft, and the next one, after the owner saves, to record what landed.
 *
 * ## An unrecognised prompt is never overwritten without being asked twice
 *
 * If the shas disagree and the live prompt is neither the current commit nor the one it
 * was stamped at, then it holds edits this repository has never seen. Applying the branch
 * over that would delete them, so no apply command is offered without `--force-apply`.
 * The fix in that case is `export-agents.mjs`, which captures them.
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
  loadLocalRedactions,
  tokenize,
  applyRedactions,
  detokenize,
  deriveValues,
} from "../lib/placeholders.mjs";
import { matchAgents } from "../lib/agent-names.mjs";
import {
  globalConfigPath,
  readEnvVars,
  writeStamps,
  stampKey,
  formatStamp,
  parseStamp,
  promptFingerprint,
  promptCommit,
  describeCommit,
  fileAtCommit,
  promptCommitsBetween,
} from "../lib/version-stamp.mjs";

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
 * It matters here because Claire's resolved prompt sits a few characters below the
 * ceiling. Checking before printing a command means the operator is told which agent
 * will not fit and by how much, instead of running a command that fails, or worse
 * landing a prompt that was quietly cut off mid-rule.
 */
const PROMPT_LIMIT = 20000;

/**
 * Settings worth comparing. Deliberately only the ones `draft-update` can actually
 * carry — reporting drift in a field with no flag would be telling the operator about
 * a problem and then walking away from it. The fields with no CLI surface are already
 * printed as a MANUAL block by restore-agents.mjs.
 *
 * These are compared on every run, including for an agent whose stamp is current. The
 * stamp versions the prompt and says nothing about the settings, so skipping them on
 * the fast path would quietly narrow what "in sync" means.
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
    header.indexOf(" * ## The check"),
  );
  console.log(usage.replace(/^ \* ?/gm, "").trimEnd());
  process.exit(0);
}

const channel = opt("--channel");
const only = optAll("--agent").map((s) => s.toLowerCase());
const valuesFile = opt("--values") ?? localValuesPath;
const configPath = opt("--config") ?? globalConfigPath();
const showDiff = flag("--diff");
const checkOnly = flag("--check");
const run = flag("--run");
const forceApply = flag("--force-apply");
// --check must not have side effects: an operator running it in CI, or before deciding
// anything, has not agreed to a write.
const mayStamp = !flag("--no-stamp") && !checkOnly;

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
// Read once, not once per agent: the exception path used to reload the file for every
// agent it examined, and the emptiness of this list now decides a reported state, so it
// must be the same answer for all of them.
const localRedactions = loadLocalRedactions();
const values = loadValues(valuesFile);

// Same reasoning as the export: without the values, tokenization is a no-op, so a live
// prompt read on the exception path could never match the stored one and the suggested
// fix would be to commit real identifiers. Refusing is the only safe answer.
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

// Derived values count as values here. A live prompt holds the resolved transcript path,
// and tokenization is what turns it back into {{TRANSCRIPT_DIR}} for comparison — so
// without the derivation Janice compares unequal to her own stored prompt on every run,
// reporting drift no edit could ever clear. Invisible to anyone whose values file sets
// TRANSCRIPT_DIR by hand, which is why it survived the original verification.
const vals = deriveValues(values ?? {});

// Personas are the definitions; instances are a persona bound to this community.
// Same split the export relies on.
const personas = entries.filter(
  (e) => e.slug && !e.persona_id && !e.is_builtin,
);
const instances = entries.filter((e) => e.persona_id);

const envVars = readEnvVars(configPath);

/* ------------------------------------------------------------------ diffing */

/**
 * Unified diff of the two stored-form texts.
 *
 * Stored form matters for more than correctness: both sides are tokenized and redacted,
 * so the output carries no project ids, folder ids or home directories and is safe to
 * paste into a channel. A resolved diff would not be.
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

  const key = stampKey(dir);
  const { sha: stamp, witness } = parseStamp(envVars[key]);
  const report = {
    dir,
    config,
    stored,
    relPromptPath,
    key,
    stamp,
    witness,
    repoCommit: promptCommit(repoRoot, relPromptPath),
    notes: [],
    settings: [],
  };
  reports.push(report);

  // Match on `name`, the field the export derives the directory from. display_name is
  // what a human sees and what draft-update wants, but it is also what a human renames.
  //
  // Compared canonically, because the owner suffix in `Claire (Alex)` is exactly such a
  // rename and Buzz stores it verbatim in `name` too. An exact comparison found nothing,
  // called an installed agent `absent`, and advised creating her — a second Claire.
  // All matches, not the first. `.find()` resolved a Mac holding both `Claire` and
  // `Claire (Alex)` to whichever came first in the file — and the draft-update that
  // followed would have quietly updated an agent the operator never named.
  const matches = matchAgents(personas, config);
  const live = matches.length === 1 ? matches[0] : null;

  if (!live) {
    if (matches.length > 1) {
      report.state = "ambiguous";
      report.notes.push(
        `matches ${matches.length} installed agents (${matches
          .map((m) => m.display_name ?? m.name)
          .join(", ")}) — rename or remove one in Buzz Desktop so there is a single answer`,
      );
      continue;
    }
    report.state = "absent";
    continue;
  }

  // `--agent-name` is taken from the live entry rather than from agent.json on purpose.
  // draft-update does not verify that the agent exists: an unmatched name returns
  // `accepted: true` and opens a draft that updates nothing. Verified 2026-08-04. The
  // only name guaranteed to hit something is the one Buzz Desktop is holding.
  report.liveName = live.display_name ?? live.name;

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

  if (!report.repoCommit) {
    // No commit means no version to compare against, and inventing one from the file
    // on disk would stamp an agent with a sha that no clone of this repo can resolve.
    report.state = "unversioned";
    report.notes.push(
      "no commit touches this prompt yet — commit it before it can be versioned",
    );
    continue;
  }

  let livePrompt = live.system_prompt ?? "";
  if (!livePrompt.endsWith("\n")) livePrompt += "\n";
  report.fingerprint = promptFingerprint(livePrompt);

  // A persona's prompt is copied to its instance at creation. If they have diverged,
  // "what is running" has two answers and neither should be reported as if it were the
  // only one. Same warning the export raises. Checked before the fast path: a current
  // stamp says the persona is the committed version and says nothing about the instance,
  // so this is exactly the case a stamp cannot see.
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

  /* ---- the fast path: two string comparisons, both within one space ---- */
  if (
    report.stamp === report.repoCommit &&
    report.witness === report.fingerprint
  ) {
    report.state = report.settings.length ? "settings-only" : "in-sync";
    continue;
  }

  /* ---- the exception path: the shas disagree, or the prompt has moved ---- */

  // The sha says the branch has not moved, so a witness that no longer matches means the
  // prompt was edited in Buzz Desktop after being stamped. Or there is no witness, from a
  // stamp written before this script recorded one. Either way the stamp cannot be taken
  // on trust and the prompt has to be looked at properly.
  if (report.stamp === report.repoCommit) {
    report.recheck = true;
  }

  // What export-agents.mjs would write if it ran right now. Comparing in stored form
  // rather than resolving the stored prompt is what keeps a one-way redaction from
  // reading as a difference; see the export for the transformation itself. That means
  // the redaction set has to match the export's exactly, local ones included — a
  // shorter list here would report permanent, unfixable drift on any prompt the export
  // redacts.
  const image = applyRedactions(tokenize(livePrompt, vals), [
    ...redactions,
    ...localRedactions,
  ]);
  report.image = image;

  if (image === stored) {
    // The agent already runs the committed prompt; only the stamp was missing, stale, or
    // no longer trusted. This is the one state in which a stamp may be written, because
    // it is the only one that has been observed rather than merely requested.
    report.state = "stampable";
    if (report.recheck) {
      report.notes.push(
        report.witness === null
          ? "stamp carried no fingerprint, so it was re-derived from the prompt — re-stamping"
          : // The fingerprint covers the live prompt, the comparison above covers its
            // tokenized form. Both moving apart means a value behind a `{{TOKEN}}` changed
            // while the prompt around it did not — a real change, but not one the repo
            // holds or should.
            "the live prompt changed but its stored form did not — a token value moved; re-stamping",
      );
    }
    continue;
  }

  /**
   * A mismatch means nothing when the redaction set is incomplete.
   *
   * The image above has to be built with exactly the redactions the export applies,
   * local ones included. Those literals used to sit in placeholders.json, so every clone
   * had them and this comparison always held. They are gitignored now — a client's name
   * does not belong in a versioned file — which means a checkout that has not built
   * local-redactions.json reproduces a DIFFERENT stored form for any prompt the export
   * redacts, and the difference is indistinguishable from real drift.
   *
   * Guessing here is not cheap: the wrong guess is `update-available`, which offers an
   * apply command that would overwrite the live prompt with the committed one. So when
   * there are no local redactions loaded and the image does not match, say that the
   * comparison could not be made, and offer nothing.
   *
   * Agents whose prompts carry nothing redactable are unaffected — their image matches
   * and they never reach this path.
   */
  if (localRedactions.length === 0) {
    report.state = "unverifiable";
    report.notes.push(
      "no local-redactions.json, so the stored form cannot be reproduced — this may be " +
        "drift or may be a missing redaction rule, and the two look identical",
    );
    continue;
  }

  if (report.stamp) {
    const atStamp = fileAtCommit(repoRoot, report.stamp, relPromptPath);
    if (atStamp === null) {
      // The stamp cannot be resolved, so there is no way to confirm the live prompt is a
      // version this repository once held. Treated as unrecognised rather than as behind:
      // offering an apply command here would risk overwriting work on the strength of a
      // sha that means nothing in this checkout.
      report.state = "live-edited";
      report.notes.push(
        `stamped ${report.stamp.slice(0, 7)} is not a commit in this checkout — ` +
          "fetch, or the stamp came from a branch you do not have",
      );
    } else if (atStamp === image) {
      // Running exactly what it was stamped at, and the branch has moved on since.
      report.state = "update-available";
      report.behind = promptCommitsBetween(
        repoRoot,
        report.stamp,
        report.repoCommit,
        relPromptPath,
      );
    } else {
      // Neither the current commit nor the stamped one. Someone edited it in Buzz
      // Desktop after it was installed, and that work exists nowhere else.
      report.state = "live-edited";
      if (report.recheck) {
        report.notes.push(
          `the prompt was edited after it was stamped: fingerprint ` +
            `${report.witness ?? "unrecorded"} → ${report.fingerprint}`,
        );
      }
    }
  } else {
    // No stamp and a prompt that is not the committed one. Which side is newer is
    // genuinely unknown, and the dangerous guess is the one that overwrites.
    report.state = "live-edited";
    report.notes.push(
      "no stamp, so there is no record of which version was installed",
    );
  }

  if (
    report.state === "live-edited" &&
    sameIgnoringWhitespace(image, stored)
  ) {
    report.notes.push("differs only in whitespace and line wrapping");
  }
}

/* ------------------------------------------------------------------ stamp */

const stampable = reports.filter((r) => r.state === "stampable");
let stamped = [];

if (stampable.length && mayStamp) {
  try {
    stamped = writeStamps(
      Object.fromEntries(
        stampable.map((r) => [
          r.key,
          formatStamp(r.repoCommit, r.fingerprint),
        ]),
      ),
      configPath,
    );
    for (const r of stampable) {
      r.state = r.settings.length ? "settings-only" : "in-sync";
      r.justStamped = true;
    }
  } catch (err) {
    console.error(`  ! could not write version stamps: ${err.message}`);
    console.error(`      ${configPath}`);
  }
}

/* ------------------------------------------------------------------ report */

const label = {
  "in-sync": "in sync",
  "settings-only": "prompt in sync, settings differ",
  stampable: "runs the committed prompt, unstamped",
  "update-available": "BEHIND the branch",
  "live-edited": "has local edits not in git",
  unversioned: "prompt not committed yet",
  absent: "not installed on this Mac",
  ambiguous: "more than one match on this Mac",
  unverifiable: "cannot compare — no local-redactions.json",
};

console.log(
  `Comparing ${path.relative(process.cwd(), agentsDir)} against ${inputPath}`,
);
console.log(`Version stamps in ${configPath}\n`);

for (const r of reports) {
  const version = r.repoCommit ? r.repoCommit.slice(0, 7) : "—";
  console.log(
    `  ${r.dir.padEnd(8)} ${label[r.state].padEnd(37)} ${version}` +
      (r.justStamped ? "  (stamped now)" : ""),
  );
  if (r.state === "update-available") {
    const subject = describeCommit(repoRoot, r.repoCommit);
    console.log(
      `           stamped ${r.stamp.slice(0, 7)} → branch ${version}` +
        (r.behind ? `, ${r.behind} prompt commit(s) behind` : "") +
        (subject ? `: "${subject}"` : ""),
    );
  }
  if (r.state === "stampable" && !mayStamp) {
    console.log(`           would stamp ${r.key}=${r.repoCommit.slice(0, 7)}`);
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

if (stamped.length) {
  console.log(`\n  Wrote ${stamped.length} version stamp(s): ${stamped.join(", ")}`);
  console.log(
    "  Buzz injects these into the agents it launches; they record what is installed\n" +
      "  and change no behaviour.",
  );
}

if (showDiff) {
  for (const r of reports) {
    if (!r.image || r.image === r.stored) continue;
    console.log(
      `\n${"=".repeat(72)}\n${r.dir}: committed (a) vs live (b), both in stored form\n`,
    );
    console.log(
      unifiedDiff(r.stored, r.image, `${r.dir}-committed`, `${r.dir}-live`),
    );
  }
}

const behind = reports.filter((r) => r.state === "update-available");
const ahead = reports.filter((r) => r.state === "live-edited");
// A settings-only agent whose every difference is unsettable has nothing to send; it
// would otherwise produce a draft-update carrying no changes at all.
const settingsOnly = reports.filter(
  (r) => r.state === "settings-only" && r.settings.some((s) => s.settable),
);
const unversioned = reports.filter((r) => r.state === "unversioned");
const absent = reports.filter((r) => r.state === "absent");
const unverifiable = reports.filter((r) => r.state === "unverifiable");

if (unverifiable.length) {
  console.log(
    `\n! ${unverifiable.length} agent(s) could not be compared at all:`,
  );
  for (const r of unverifiable) console.log(`    ${r.dir}`);
  console.log(
    "  Their stored form is built with the literal redactions, and there are none loaded,\n" +
      "  so a difference here is as likely to be a missing rule as real drift. No command is\n" +
      "  offered for a state that cannot be read. Build the file and re-run:\n\n" +
      "    node buzz-agents/scripts/refresh-local-redactions.mjs --key <key> --dataset <dataset>\n\n" +
      "  With no dataset to hand, copy buzz-agents/local-redactions.example.json and fill in\n" +
      "  `manual`. Either is enough.\n",
  );
}

if (behind.length) {
  console.log(
    `\n${behind.length} agent(s) have a newer prompt on this branch than the one they were ` +
      "installed from:",
  );
  for (const r of behind) console.log(`    ${r.dir}`);
  console.log(
    "  Update from the repo? The commands below open a draft for each; nothing changes\n" +
      "  until you save it in Buzz Desktop.",
  );
}

if (ahead.length) {
  console.log(
    `\n! ${ahead.length} agent(s) are running a prompt this repository does not hold:`,
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

if (unversioned.length) {
  console.log(
    "\n  Commit the prompts above, then re-run: a stamp is a commit sha, so an " +
      "uncommitted\n  prompt has no version to compare against.",
  );
}

/* ------------------------------------------------------------------ apply */

const applicable = [...behind, ...settingsOnly, ...(forceApply ? ahead : [])];

/**
 * "In sync" is stricter than "nothing to apply". An agent missing from this Mac, one
 * whose only difference is a setting no flag can change, and one running an unstamped
 * prompt are all still not what the branch says — and `--check` exists to catch exactly
 * that, so it cannot be allowed to pass just because this script has no command to offer.
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
console.log(
  "No stamp is written for a draft that was sent. Save it in Buzz Desktop, then re-run\n" +
    "this script: it records the version once it can see the prompt that actually landed.",
);
