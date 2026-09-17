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
 *                                             [--diff] [--json] [--check] [--run]
 *                                             [--bind <slug>=<agent>] [--unbind <slug>]
 *                                             [--no-stamp] [--force-apply]
 *
 *   --channel <uuid>   channel to open the drafts in. Without it the report still
 *                      runs; only the commands need it.
 *   --agent <name>     limit to one agent (repeatable)
 *   --values <file>    token values (default: buzz-agents/local-values.json)
 *   --input <path>     Buzz Desktop agent state (default: the usual macOS location)
 *   --config <path>    Buzz global agent config holding the stamps
 *   --diff             print the drift as a unified diff
 *   --json             machine-readable verdicts instead of the prose report
 *   --bind <slug>=<agent>  record which definition an install came from, by hand.
 *                      Repeatable. Use when a rename has left an install unplaceable.
 *   --unbind <slug>    forget a binding, so it is guessed again on the next run
 *   --check            exit 1 if anything is out of sync; write and send nothing
 *   --run              execute the draft-update commands instead of printing them
 *   --no-stamp         never write a version stamp, only read them
 *   --force-apply      also offer a command for an agent whose live prompt is not the
 *                      committed one. Read --diff first: this overwrites local edits.
 *
 * ## An install is tied to its definition, not to its name
 *
 * Matching by name failed twice here in opposite directions, silently and both times
 * towards "not installed" — so the agents were never compared and drifted while every
 * report said they were fine. Names are now used to guess once and the guess is recorded
 * against the persona's slug, which no rename touches. See ../lib/agent-bindings.mjs.
 *
 * The consequence worth knowing: rename an agent to anything at all and the next run still
 * finds it. An install nothing can place is reported with its slug and `--bind`, rather
 * than being quietly left out, which is the failure this replaced.
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
import { matchAgents, installQualifier } from "../lib/agent-names.mjs";
import {
  bindingKey,
  bindingFor,
  readBindings,
  definitionsRunning,
  definitionsEverRunning,
  buildHistoryIndex,
} from "../lib/agent-bindings.mjs";
import {
  globalConfigPath,
  readEnvVars,
  writeStamps,
  stampKey,
  formatStamp,
  parseStamp,
  promptFingerprint,
  promptCommit,
  promptCommitHistory,
  filesAtCommits,
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
const asJson = flag("--json");
const bindArgs = optAll("--bind");
const unbindArgs = optAll("--unbind");
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

/**
 * A filename for one install's resolved prompt.
 *
 * Per install, not per agent. Four Claires all writing `.resolved/claire.md` would leave
 * one file on disk and four commands reading it, so the last one written would be sent to
 * all four — and the fenced installs are exactly the ones whose token values differ.
 */
const slugify = (r) =>
  [r.dir, r.install]
    .filter(Boolean)
    .join("-")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/* ------------------------------------------------------------------ classify */

const allDirs = fs
  .readdirSync(agentsDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();

let dirs = allDirs;

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

/* ------------------------------------------------------- the definitions */

/**
 * Every definition in the repository, read once. All of them, never only the `--agent`
 * selection: an install is placed against the whole repository, and narrowing the
 * candidates would make where an agent lands depend on which agent was asked about.
 */
const definitions = new Map();
for (const dir of allDirs) {
  const base = path.join(agentsDir, dir);
  const config = JSON.parse(
    fs.readFileSync(path.join(base, "agent.json"), "utf8"),
  );
  const promptPath = path.join(base, config.system_prompt_file);
  const relPromptPath = path.relative(repoRoot, promptPath);
  definitions.set(dir, {
    dir,
    config,
    relPromptPath,
    stored: fs.readFileSync(promptPath, "utf8"),
    repoCommit: promptCommit(repoRoot, relPromptPath),
  });
}

/**
 * Names are used to guess, once. See ../lib/agent-bindings.mjs for why they cannot be
 * the answer, and `portableAgentName` for how a bracketed one is read.
 */
const storedNames = [...definitions.values()].flatMap((d) =>
  [d.dir, d.config.name, d.config.display_name].filter(Boolean),
);

const storedByDir = new Map(
  [...definitions.entries()].map(([dir, d]) => [dir, d.stored]),
);

/* ------------------------------------------------------- place the installs */

/**
 * Explicit bindings first, so everything below sees them.
 *
 * Honoured even under `--check`, which otherwise writes nothing: `--bind` is not a
 * side effect of checking, it is the operator stating a fact, and refusing to record it
 * because of another flag on the same line would be obtuse. `--check` still writes no
 * stamp and sends no draft.
 */
if (bindArgs.length || unbindArgs.length) {
  const updates = {};
  for (const arg of bindArgs) {
    const eq = arg.indexOf("=");
    if (eq === -1) {
      console.error(`--bind wants <slug>=<agent>, got: ${arg}`);
      process.exit(1);
    }
    const slug = arg.slice(0, eq).trim();
    const target = arg.slice(eq + 1).trim();
    if (!allDirs.includes(target)) {
      console.error(`No such agent in buzz-agents/agents/: ${target}`);
      console.error(`Available: ${allDirs.join(", ")}`);
      process.exit(1);
    }
    updates[bindingKey(slug)] = target;
  }
  for (const slug of unbindArgs) updates[bindingKey(slug)] = null;
  try {
    const wrote = writeStamps(updates, configPath);
    console.log(
      wrote.length
        ? `  Recorded ${wrote.length} binding change(s): ${wrote.join(", ")}\n`
        : "  Bindings already as asked; nothing written.\n",
    );
  } catch (err) {
    console.error(`  ! could not write bindings: ${err.message}`);
    process.exit(1);
  }
}

const bindings = readBindings(configPath);
const newBindings = {};
const unplaced = [];
const installsOf = new Map(allDirs.map((d) => [d, []]));

/**
 * Every recent revision of every prompt, indexed by content — built at most once, and only
 * if an install gets far enough down to need it.
 */
let historyIndexCache = null;
const historyIndex = () =>
  (historyIndexCache ??= buildHistoryIndex(
    [...definitions.keys()],
    (dir) =>
      promptCommitHistory(repoRoot, definitions.get(dir).relPromptPath).map(
        (sha) => `${sha}:${definitions.get(dir).relPromptPath}`,
      ),
    (refs) => filesAtCommits(repoRoot, refs),
  ));

/** A live prompt reduced to the space a committed one lives in. */
function imageOf(live) {
  let t = live.system_prompt ?? "";
  if (!t.endsWith("\n")) t += "\n";
  return applyRedactions(tokenize(t, vals), [...redactions, ...localRedactions]);
}

for (const live of personas) {
  const liveName = live.display_name ?? live.name;

  const bound = bindingFor(bindings, live.slug);
  if (bound && definitions.has(bound)) {
    installsOf.get(bound).push({ live, how: "bound" });
    continue;
  }

  // A binding naming a definition this branch does not have is not authoritative and not
  // an error either — the operator may be on a branch that predates the agent. Fall
  // through to guessing rather than reporting the install as unplaceable.
  const staleBinding = bound && !definitions.has(bound) ? bound : null;

  const named = [...definitions.values()]
    .filter((d) => matchAgents([live], d.config, storedNames).length)
    .map((d) => d.dir);

  if (named.length === 1) {
    installsOf.get(named[0]).push({ live, how: "name", staleBinding });
    newBindings[bindingKey(live.slug)] = named[0];
    continue;
  }

  /**
   * What the agent is running identifies it when its name no longer does.
   *
   * Skipped with no local redactions loaded, for the same reason the `unverifiable` state
   * exists: the stored form cannot be reproduced without them, so every comparison here
   * would fail and the silence would be indistinguishable from a genuine non-match. A
   * binding written on that basis would be wrong and sticky.
   */
  let running = [];
  if (localRedactions.length !== 0) {
    const image = imageOf(live);
    running = definitionsRunning(image, storedByDir);
    // Only walk history when the current revision placed nothing. An install that is up to
    // date is the cheap case and stays cheap; on a settled machine the index is never built.
    if (running.length === 0) running = definitionsEverRunning(image, historyIndex());
  }

  if (running.length === 1) {
    installsOf.get(running[0]).push({ live, how: "prompt", staleBinding });
    newBindings[bindingKey(live.slug)] = running[0];
    continue;
  }

  unplaced.push({ liveName, slug: live.slug, named, running, staleBinding });
}

/**
 * A guess, once written down, stops being a guess.
 *
 * This is the point of the whole mechanism: the name resolved an install this run, and
 * recording it means the name is never consulted for that install again. Rename it
 * tomorrow and the binding still holds.
 *
 * Gated on the same flag as the stamps, so `--check` stays read-only. The cost is that a
 * machine only ever running `--check` never accumulates bindings and keeps guessing from
 * names — which is the old behaviour, not a regression, and the watcher is pointed at a
 * checkout whose whole job is to write nothing.
 */
let boundNow = [];
if (Object.keys(newBindings).length && mayStamp) {
  try {
    boundNow = writeStamps(newBindings, configPath);
  } catch (err) {
    console.error(`  ! could not write bindings: ${err.message}`);
  }
}

/* ------------------------------------------------------- classify */

for (const dir of dirs) {
  const { config, stored, relPromptPath, repoCommit } = definitions.get(dir);
  const matches = installsOf.get(dir);

  if (!matches.length) {
    reports.push({
      dir,
      label: dir,
      config,
      stored,
      relPromptPath,
      key: stampKey(dir),
      stamp: null,
      witness: null,
      repoCommit,
      notes: [],
      settings: [],
      state: "absent",
    });
    continue;
  }

  /**
   * One report per install, not per definition.
   *
   * Several installs of one agent used to be reported as `ambiguous` and told to rename
   * or remove one, on the reasoning that the repo could not tell which was meant. On a
   * Mac running one agent per client that advice is wrong in both directions: the installs
   * are all meant, and following it would delete a client's fenced agent. Each is compared
   * and updated on its own.
   */
  for (const { live, how, staleBinding } of matches) {
    const liveName = live.display_name ?? live.name;
    // Keyed by slug only once there is more than one install; see stampKey.
    const key = stampKey(dir, matches.length > 1 ? live.slug : null);

    /**
     * A qualified key with nothing under it falls back to the unqualified one.
     *
     * The day a second install appears, every stamp for that agent is under the old key,
     * and reading only the new one turns an agent that was tracked and merely behind into
     * one carrying "no stamp, so there is no record of which version was installed" — a
     * warning that is false, and that withholds the update command the operator came for.
     * Observed on the first run of this change against four Claires.
     *
     * Inheriting one install's stamp for all of them is a starting hypothesis, not a
     * conclusion. The sha sends the comparison down the slow path and the fingerprint
     * fails there for every install but the one it was written for, so each is still
     * decided by its own prompt. The next stamp written is under the qualified key.
     */
    const raw = envVars[key] ?? envVars[stampKey(dir)];
    const { sha: stamp, witness } = parseStamp(raw);
    /**
     * What distinguishes this install in the report. The bracketed half of its name when
     * it has one, and otherwise the slug prefix already in its stamp key — a renamed
     * install still has to be tellable from its siblings, and after a rename the name is
     * exactly what cannot do that.
     */
    const install =
      matches.length > 1
        ? (installQualifier(liveName, config.name ?? dir) ??
          String(live.slug).slice(0, 8))
        : null;
    const report = {
      dir,
      label: install ? `${dir}[${install}]` : dir,
      config,
      stored,
      relPromptPath,
      key,
      stamp,
      witness,
      repoCommit,
      install,
      notes: [],
      settings: [],
      // `--agent-name` is taken from the live entry rather than from agent.json on
      // purpose. draft-update does not verify that the agent exists: an unmatched name
      // returns `accepted: true` and opens a draft that updates nothing. Verified
      // 2026-08-04. The only name guaranteed to hit something is the one Buzz Desktop
      // is holding.
      liveName,
      how,
      slug: live.slug,
    };
    if (staleBinding)
      report.notes.push(
        `was bound to \`${staleBinding}\`, which this branch does not have — placed by ` +
          `${how} and rebound`,
      );
    if (how === "prompt")
      report.notes.push(
        "placed by what it is running, not by its name — bound now, so a further rename is safe",
      );
    reports.push(report);

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
}

/* ------------------------------------------------------------------ stamp */

const stampable = reports.filter((r) => r.state === "stampable");
let stamped = [];

if (stampable.length && mayStamp) {
  try {
    const updates = Object.fromEntries(
      stampable.map((r) => [r.key, formatStamp(r.repoCommit, r.fingerprint)]),
    );

    /**
     * The unqualified key is retired only once nothing reads it any more.
     *
     * It has to be retired eventually: left in place it holds a sha from before the
     * installs split, and it becomes live again the moment they drop back to one —
     * decommission a client, and the survivor is measured against a stamp months out of
     * date and reported as behind something it is already running.
     *
     * But retiring it the first time *any* install is stamped strands the siblings. They
     * are still inheriting it, and this script stamps only what it has observed, so on a
     * run where one install matches the branch and three do not, clearing the key turns
     * three tracked agents into three carrying "no stamp, so there is no record of which
     * version was installed" — false, and it withholds the update command. Seen on the
     * run that introduced it.
     *
     * So it goes when every install of that agent has a key of its own, counting the ones
     * being written in this same call.
     */
    const stampedDirs = new Set(
      stampable.filter((r) => r.install).map((r) => r.dir),
    );
    for (const dir of stampedDirs) {
      const legacy = stampKey(dir);
      if (envVars[legacy] === undefined) continue;
      const siblings = reports.filter((r) => r.dir === dir && r.liveName);
      const allCovered = siblings.every(
        (r) => r.key !== legacy && (envVars[r.key] !== undefined || r.key in updates),
      );
      if (allCovered) updates[legacy] = null;
    }

    stamped = writeStamps(updates, configPath);
    for (const r of stampable) {
      r.state = r.settings.length ? "settings-only" : "in-sync";
      r.justStamped = true;
    }
  } catch (err) {
    console.error(`  ! could not write version stamps: ${err.message}`);
    console.error(`      ${configPath}`);
  }
}

/* ------------------------------------------------------------------ json */

/**
 * The same verdicts, for something that is not a person.
 *
 * A watcher that polls this script has to decide whether to interrupt somebody, and
 * parsing the prose report to do it makes every later wording change a silent breakage.
 * The exit code stays the contract for "is anything out of sync"; this is the contract
 * for "what, exactly".
 *
 * `install` is the one field here that is not safe to forward anywhere: the qualifier
 * distinguishing one install from another is, on a per-client Mac, the client's name. It
 * is included because a caller running on that Mac needs to tell the installs apart, and
 * it must be dropped from anything the caller then publishes.
 */
if (asJson) {
  const clean = reports.every(
    (r) => r.state === "in-sync" && !r.settings.length,
  );
  console.log(
    JSON.stringify(
      {
        clean,
        agents: reports.map((r) => ({
          agent: r.dir,
          install: r.install ?? null,
          placedBy: r.how ?? null,
          state: r.state,
          repoCommit: r.repoCommit ?? null,
          stamp: r.stamp ?? null,
          behind: r.behind ?? null,
          settings: r.settings.map((s) => s.field),
          notes: r.notes,
        })),
        unplaced: unplaced.length,
      },
      null,
      2,
    ),
  );
  process.exit(checkOnly && !clean ? 1 : 0);
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
  unverifiable: "cannot compare — no local-redactions.json",
};

console.log(
  `Comparing ${path.relative(process.cwd(), agentsDir)} against ${inputPath}`,
);
console.log(`Version stamps in ${configPath}\n`);

for (const r of reports) {
  const version = r.repoCommit ? r.repoCommit.slice(0, 7) : "—";
  console.log(
    `  ${r.label.padEnd(18)} ${label[r.state].padEnd(37)} ${version}` +
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
      `\n${"=".repeat(72)}\n${r.label}: committed (a) vs live (b), both in stored form\n`,
    );
    console.log(
      unifiedDiff(r.stored, r.image, `${slugify(r)}-committed`, `${slugify(r)}-live`),
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
  for (const r of unverifiable) console.log(`    ${r.label}`);
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
  for (const r of behind) console.log(`    ${r.label}`);
  console.log(
    "  Update from the repo? The commands below open a draft for each; nothing changes\n" +
      "  until you save it in Buzz Desktop.",
  );
}

if (ahead.length) {
  console.log(
    `\n! ${ahead.length} agent(s) are running a prompt this repository does not hold:`,
  );
  for (const r of ahead) console.log(`    ${r.label}`);
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
      `${absent.map((r) => r.label).join(", ")}`,
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

if (boundNow.length) {
  console.log(
    `\n  Recorded ${boundNow.length} binding(s) so a later rename cannot lose them: ` +
      `${boundNow.join(", ")}`,
  );
}

/**
 * An install nothing could place.
 *
 * Reported rather than ignored, because being ignored is the failure this whole mechanism
 * exists to stop: an agent nobody is comparing looks exactly like an agent that is fine.
 * The slug is printed because it is what `--bind` takes, and because after a rename it is
 * the only handle left.
 */
if (unplaced.length) {
  console.log(
    `\n! ${unplaced.length} installed agent(s) could not be matched to a definition:`,
  );
  for (const u of unplaced) {
    const why =
      u.named.length > 1
        ? `its name matches ${u.named.length} definitions (${u.named.join(", ")})`
        : u.running.length > 1
          ? `it runs a prompt ${u.running.length} definitions share (${u.running.join(", ")})`
          : "neither its name nor the prompt it runs matches anything here";
    console.log(`    ${u.liveName}  ${u.slug}`);
    console.log(`      ${why}`);
    if (u.staleBinding)
      console.log(
        `      bound to \`${u.staleBinding}\`, which this branch does not have`,
      );
  }
  console.log(
    "\n  Say which, and it stays said — a binding survives any later rename:\n\n" +
      "    node buzz-agents/scripts/sync-prompts.mjs --bind <slug>=<agent>\n\n" +
      "  Or leave it: an agent this repository does not define is not a problem, it is\n" +
      "  just not ours to version.\n",
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
      label: r.label,
      reason: `unresolved tokens: ${missing.join(", ")}`,
    });
    continue;
  }

  if (resolved.length > PROMPT_LIMIT) {
    blocked.push({
      label: r.label,
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
    stdinFile = path.join(resolvedDir, `${slugify(r)}.md`);
    fs.writeFileSync(stdinFile, resolved);
    args.push("--system-prompt", "-");
  }
  for (const s of r.settings) {
    if (!s.settable) continue;
    args.push(`--${s.field.replace(/_/g, "-")}`, s.repo);
  }

  commands.push({
    label: `${r.label} → ${r.liveName}`,
    argv: args,
    stdin: stdinFile,
    headroom: PROMPT_LIMIT - resolved.length,
  });
}

if (blocked.length) {
  console.log("\nCannot apply:");
  for (const b of blocked) console.log(`    ${b.label}: ${b.reason}`);
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
