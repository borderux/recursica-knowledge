#!/usr/bin/env node
/**
 * Deny reads of application source from a checkout that is not a repository.
 *
 * `REPOS/` accumulates worktrees, superseded checkouts and abandoned clones of the same
 * app side by side. They grep and read exactly like the live tree, so an agent orienting
 * itself lands in one and cites line numbers from code nothing runs. Two agents did that
 * against the same directory in one week; the second read past a literal
 * `fatal: not a git repository` in its own tool output and kept going.
 *
 * The signal is the one git already gives: **a directory directly under `REPOS/` with no
 * `.git` is not a checkout of anything.** No list of stale directories to maintain — a
 * copy left behind tomorrow is caught the same way.
 *
 * Prose could not fix this. `AGENTS.md` is read when a session starts and Buzz sessions
 * are pooled and long-lived, so a rule added today does not reach a session begun
 * yesterday. Settings are consulted per tool call, so this does.
 *
 * WHAT IT DENIES, AND WHY NOT EVERYTHING:
 *
 *   deny   Read, Grep, Glob under such a directory
 *   deny   a Bash command that reads file content there (cat, grep, head, sed, …)
 *   allow  ls, stat, du, find, diff, mv, rm — how you investigate or clean one up
 *
 * Reading the content is how the tree gets mistaken for the live one; listing and
 * diffing it is how someone works out that it is stale and removes it. Denying the
 * second would make the guard the obstacle to fixing the thing it is guarding against,
 * and a guard that gets switched off protects nothing.
 *
 * Fails OPEN on anything it cannot parse.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const BUZZ_HOME = process.env.BUZZ_HOME || path.join(os.homedir(), ".buzz");
const REPOS = path.join(BUZZ_HOME, "REPOS");

/**
 * Verbs that read the content of a file they are given by name.
 *
 * `head`, `tail`, `wc`, `less` and friends are deliberately NOT here: they read stdin far
 * more often than a path, so listing them denies `ls REPOS/x | head -3` — an inspection
 * command, and one the deny message itself tells you to run. They are caught below only
 * when a path is their argument.
 */
const READS_CONTENT = /\b(cat|bat|grep|rg|ag|sed|awk|node|npm|pnpm|python3?)\b/;

/** `head -3 REPOS/x/file` reads content; `… | head -3` does not. */
const PAGER_ON_A_PATH = /\b(head|tail|wc|nl|less|more|open)\b[^|;&]*REPOS\//;

/**
 * Commands whose job is to publish text. Their arguments are prose, and prose about this
 * guard quotes both a stale path and a verb like `grep` — so matching the raw command line
 * would deny the message reporting the problem. That is the mistake the name guard beside
 * this one documents: check what the command reads, not every string it carries.
 */
const PUBLISHES_PROSE = /\b(buzz|gh|curl)\b|\bgit\s+(commit|log|show|diff)\b/;

function deny(reason) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: reason,
      },
    }),
  );
  process.exit(0);
}

let input;
try {
  input = JSON.parse(fs.readFileSync(0, "utf8"));
} catch {
  process.exit(0);
}

const tool = input?.tool_name ?? "";
const ti = input?.tool_input ?? {};
const command = typeof ti.command === "string" ? ti.command : "";

// Every string the call could be pointing at a path with.
const haystack = [ti.file_path, ti.path, ti.notebook_path, ti.pattern, ti.glob, command]
  .filter((v) => typeof v === "string" && v)
  .join("\n");

if (!haystack.includes("REPOS/")) process.exit(0);

if (tool === "Bash") {
  // Publishing the path is not reading it.
  if (PUBLISHES_PROSE.test(command)) process.exit(0);
  // Listing, moving and removing is how a stale copy gets diagnosed and cleaned up.
  if (!READS_CONTENT.test(command) && !PAGER_ON_A_PATH.test(command)) process.exit(0);
}

/**
 * Names appearing after `REPOS/`, whether the path was absolute, nest-relative, or
 * reached by a `cd` earlier in the same command line.
 */
const names = new Set(
  [...haystack.matchAll(/REPOS\/([A-Za-z0-9._-]+)/g)].map((m) => m[1]),
);

for (const name of names) {
  const dir = path.join(REPOS, name);
  let stale = false;
  try {
    // Only an existing directory counts: a clone that has not happened yet is not stale.
    stale = fs.statSync(dir).isDirectory() && !fs.existsSync(path.join(dir, ".git"));
  } catch {
    continue;
  }
  if (!stale) continue;

  const hint =
    name === "stu-explorer"
      ? `The explorer that runs is named on the \`APP=\` line of \`${path.join(BUZZ_HOME, "bin", "stu")}\` — read that line and use the path it gives.`
      : `Find the tree that is a repository — a launcher script under \`${path.join(BUZZ_HOME, "bin")}\` usually names the live path — and read that one.`;

  deny(
    `\`REPOS/${name}\` has no \`.git\`: it is a leftover copy, not a checkout, and nothing runs it. ` +
      `Source read from there is stale, and line numbers cited from it point at code that is not deployed. ` +
      `${hint} Cite paths repo-qualified so a reader can tell which tree you read. ` +
      `Listing, diffing, moving or removing \`REPOS/${name}\` is still allowed — that is how it gets cleaned up.`,
  );
}

process.exit(0);
