#!/usr/bin/env node
/**
 * Tell the operator, in Buzz, when the agents on this Mac stop matching the branch.
 *
 * THE INSTALLED COPY IS GENERATED. scripts/bootstrap-nest.mjs installs this into
 * ~/.buzz/bin/. Edit it here, in nest/bin/ — an edit to the installed copy is destroyed by
 * the next bootstrap with no diff and no log line to notice it by.
 *
 * `sync-prompts.mjs` already answers "is the agent I am running the one this branch says
 * it should be?". It answers it when somebody runs it, which on the machine this was
 * written for was never: three of four Claires had drifted, one by three rewrites, and
 * nothing had reported it because nothing had asked. This asks on a schedule.
 *
 * Usage:
 *   watch-agent-drift.mjs --repo <path> --channel <uuid> [--mention <hex>]
 *                         [--state <path>] [--worktree <path>] [--ref <ref>]
 *                         [--dry-run] [--always]
 *
 *   --repo <path>      the knowledge repo checkout (its main worktree)
 *   --channel <uuid>   where to post when something is behind
 *   --mention <hex>    pubkey to notify; repeatable. Without one the message is posted
 *                      without notifying anybody, which for a drift report is usually wrong
 *   --state <path>     where the last-reported digest is kept
 *                      (default: ~/.buzz/.scratch/agent-drift-state.json)
 *   --worktree <path>  the checkout to compare against
 *                      (default: ~/.buzz/.scratch/agent-drift-worktree)
 *   --ref <ref>        what the agents are measured against (default: origin/main)
 *   --dry-run          print the message instead of sending it
 *   --always           post even when the verdict has not changed since last time
 *
 * ## It compares against a worktree of its own, and never touches yours
 *
 * The question is whether the agents match `origin/main`, so something has to be sitting
 * on `origin/main` to compare with. Doing that by pulling the operator's checkout would
 * mean a background job moving a branch under whatever they had open — and this repo's
 * checkouts routinely hold uncommitted work that is the only copy of itself.
 *
 * So it keeps a detached linked worktree and hard-resets that. A *linked* worktree, not a
 * fresh clone, for a reason that is easy to miss: the values and redaction files this
 * comparison needs are gitignored, so a clone has neither, and `placeholders.mjs` resolves
 * both from the main worktree when a linked one has no copy of its own. A clone would
 * compare with no redactions loaded and report permanent, unfixable drift.
 *
 * ## Silence is the normal outcome
 *
 * It posts when the verdict *changes*. A watcher that reports the same three agents every
 * thirty minutes teaches the operator to ignore it, and the one time it says something new
 * is the time they will not read it. The digest covers the states, not the timestamps, so a
 * re-run with nothing new sends nothing and a newly drifted agent sends immediately.
 *
 * ## What it will not put in a message
 *
 * The per-install qualifier — the thing that tells four Claires apart — is the client's
 * name on a per-client Mac. A channel is published, so the message carries counts and agent
 * names only: "claire: 3 of 4 installs behind". The detail stays on the machine, where the
 * operator reads it by running the report themselves. That is also why this sends a message
 * rather than a diff.
 *
 * ## Running it on a schedule
 *
 * Under launchd, because cron on macOS does not survive a login cycle cleanly and this has
 * to keep working across reboots to be worth anything. Twice a day is plenty: prompts move
 * at the speed of pull requests, and the dedup above means a shorter interval buys nothing
 * but wake-ups.
 *
 * Write `~/Library/LaunchAgents/xyz.buzz.agent-drift.plist` with `ProgramArguments` running
 * this script — `--repo` the knowledge checkout, `--channel` where to post, `--mention` the
 * operator's pubkey — and a `StartCalendarInterval` array of the hours wanted. Then:
 *
 *   launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/xyz.buzz.agent-drift.plist
 *   launchctl kickstart -p gui/$(id -u)/xyz.buzz.agent-drift    # prove it before trusting it
 *
 * No plist ships in this repository, and that is not an omission: the invocation needs a
 * channel UUID, which is one of the values that must never be committed here. Check the
 * arguments with `--dry-run` first — it prints the message and writes no state, so a wrong
 * channel costs nothing.
 *
 * Give the plist a `StandardErrorPath`. A launchd job that has been failing since March
 * looks exactly like one with nothing to report, which is the failure this whole script
 * exists to stop happening to prompts.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";

const argv = process.argv.slice(2);
const flag = (n) => argv.includes(n);
const opt = (n) => {
  const i = argv.indexOf(n);
  return i === -1 ? null : argv[i + 1];
};
const optAll = (n) => {
  const out = [];
  argv.forEach((a, i) => {
    if (a === n && argv[i + 1]) out.push(argv[i + 1]);
  });
  return out;
};

if (flag("--help") || flag("-h")) {
  const header = fs.readFileSync(new URL(import.meta.url), "utf8");
  const usage = header.slice(
    header.indexOf(" * Usage:"),
    header.indexOf(" * ## It compares"),
  );
  console.log(usage.replace(/^ \* ?/gm, "").trimEnd());
  process.exit(0);
}

const repo = opt("--repo");
const channel = opt("--channel");
const mentions = optAll("--mention");
const dryRun = flag("--dry-run");
const always = flag("--always");
const statePath =
  opt("--state") ??
  path.join(os.homedir(), ".buzz", ".scratch", "agent-drift-state.json");
const worktree =
  opt("--worktree") ??
  path.join(os.homedir(), ".buzz", ".scratch", "agent-drift-worktree");
const ref = opt("--ref") ?? "origin/main";

if (!repo || !channel) {
  console.error("Both --repo and --channel are required. See --help.");
  process.exit(1);
}

const git = (args, cwd = repo) =>
  execFileSync("git", args, { cwd, encoding: "utf8" }).trim();

/**
 * Refuse a linked worktree as `--repo`.
 *
 * Its `origin/main` is the same ref, so the comparison would look right — but the
 * gitignored values and redactions resolve from the *main* worktree, and pointing this at
 * a linked one makes which files get read depend on which branch somebody happened to
 * leave checked out. Same failure the Betty deploy refuses for the same reason.
 */
try {
  const common = git(["rev-parse", "--path-format=absolute", "--git-common-dir"]);
  const own = git(["rev-parse", "--path-format=absolute", "--git-dir"]);
  if (common !== own) {
    console.error(`--repo is a linked worktree: ${repo}`);
    console.error(`Point it at the main checkout: ${path.dirname(common)}`);
    process.exit(1);
  }
} catch (err) {
  console.error(`Not a git checkout: ${repo}`);
  console.error(err.stderr?.toString().trim() || err.message);
  process.exit(1);
}

/* --------------------------------------------------------------- the worktree */

git(["fetch", "--quiet", "origin"]);

if (!fs.existsSync(path.join(worktree, ".git"))) {
  fs.rmSync(worktree, { recursive: true, force: true });
  git(["worktree", "add", "--detach", worktree, ref]);
} else {
  // Detached and never edited, so a hard reset here destroys nothing. Both of those are
  // properties of a directory this script owns; that is why it does not offer to use one
  // the operator already has.
  git(["reset", "--hard", "--quiet", ref], worktree);
  git(["clean", "-qfd"], worktree);
}

const head = git(["rev-parse", "--short", "HEAD"], worktree);

/* --------------------------------------------------------------- the verdict */

const script = path.join(
  worktree,
  "buzz-agents",
  "scripts",
  "sync-prompts.mjs",
);

let verdict;
try {
  const out = execFileSync(
    process.execPath,
    [script, "--json", "--check", "--no-stamp"],
    { encoding: "utf8" },
  );
  verdict = parseVerdict(out);
} catch (err) {
  // Exit 1 is the documented "out of sync" code and still prints the JSON. Anything else
  // is the check itself failing, which is worth saying out loud exactly once — a watcher
  // that has been broken for a week looks identical to one with nothing to report.
  if (err.status === 1 && err.stdout) {
    verdict = parseVerdict(err.stdout);
  } else {
    report(
      `Agent drift check could not run.\n\n\`\`\`\n${(err.stderr?.toString() || err.message).trim().slice(0, 800)}\n\`\`\``,
      "error",
    );
    process.exit(1);
  }
}

/* --------------------------------------------------------------- the message */

const BEHIND = "update-available";
const EDITED = "live-edited";

const byAgent = new Map();
for (const a of verdict.agents) {
  if (!byAgent.has(a.agent)) byAgent.set(a.agent, []);
  byAgent.get(a.agent).push(a);
}

const lines = [];
for (const [agent, installs] of byAgent) {
  const n = installs.length;
  const of = (state) => installs.filter((i) => i.state === state).length;
  const parts = [];
  if (of(BEHIND)) parts.push(`${of(BEHIND)} behind the branch`);
  if (of(EDITED)) parts.push(`${of(EDITED)} holding edits not in git`);
  const settings = installs.filter(
    (i) => i.settings.length && i.state !== BEHIND && i.state !== EDITED,
  ).length;
  if (settings) parts.push(`${settings} with settings that differ`);
  if (!parts.length) continue;
  lines.push(
    n === 1
      ? `- **${agent}** — ${parts.join(", ")}`
      : `- **${agent}** — ${parts.join(", ")} (of ${n} installs)`,
  );
}

if (verdict.clean || !lines.length) {
  // Nothing to say. Clearing the digest means the next drift reports as new rather than
  // being compared against a stale one.
  writeState(null);
  console.log(`In sync at ${head}. Nothing sent.`);
  process.exit(0);
}

const digest = createHash("sha256")
  .update(JSON.stringify(verdict.agents.map((a) => [a.agent, a.state])))
  .digest("hex")
  .slice(0, 16);

if (!always && readState() === digest) {
  console.log(`Unchanged since the last report (${digest}). Nothing sent.`);
  process.exit(0);
}

const anyEdited = verdict.agents.some((a) => a.state === EDITED);

const body =
  `**Agent drift** — the branch is at \`${head}\` and some agents are not.\n\n` +
  lines.join("\n") +
  "\n\nInstalls are not named here; a channel is published and the name that tells them " +
  "apart is a client's. Read the detail and open the drafts on the Mac:\n\n" +
  "```sh\n" +
  "node buzz-agents/scripts/sync-prompts.mjs --diff\n" +
  "node buzz-agents/scripts/sync-prompts.mjs --channel <uuid> --run\n" +
  "```\n\n" +
  (anyEdited
    ? "One or more installs hold a prompt this repository has never seen, so applying the " +
      "branch over them would delete it. Capture it first with `export-agents.mjs`.\n\n"
    : "") +
  "Each draft opens a form in Buzz Desktop. Nothing changes until it is saved.";

report(body, "drift");
writeState(digest);

/* --------------------------------------------------------------- plumbing */

/**
 * `--json` is ignored rather than rejected by a version of the script that predates it,
 * so the prose report arrives instead and `JSON.parse` fails on its first word. That
 * reads as a corrupt install; it is an old ref. Say which.
 */
function parseVerdict(out) {
  try {
    return JSON.parse(out);
  } catch {
    console.error(
      `${ref} has a sync-prompts.mjs with no --json support, so there is nothing to ` +
        `read. Update ${ref}, or pass --ref to a branch that has it.`,
    );
    process.exit(1);
  }
}

function readState() {
  try {
    return JSON.parse(fs.readFileSync(statePath, "utf8")).digest ?? null;
  } catch {
    return null;
  }
}

function writeState(digest) {
  if (dryRun) return;
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  const tmp = `${statePath}.tmp`;
  fs.writeFileSync(
    tmp,
    JSON.stringify({ digest, at: new Date().toISOString() }, null, 2),
  );
  fs.renameSync(tmp, statePath);
}

function report(text, kind) {
  if (dryRun) {
    console.log(`--- would send (${kind}) ---\n${text}`);
    return;
  }
  const args = ["messages", "send", "--channel", channel, "--content", "-"];
  for (const m of mentions) args.push("--mention", m);
  try {
    const out = execFileSync("buzz", args, { input: text, encoding: "utf8" });
    console.log(out.trim());
  } catch (err) {
    console.error(
      `could not send: ${err.stderr?.toString().trim() || err.message}`,
    );
    process.exitCode = 2;
  }
}
