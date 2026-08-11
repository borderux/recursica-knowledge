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
 * copy left behind tomorrow is caught the same way. A worktree's `.git` is a *file* rather
 * than a directory, which `fs.existsSync` accepts, so worktrees are not flagged.
 *
 * Prose could not fix this. `AGENTS.md` is read when a session starts and Buzz sessions
 * are pooled and long-lived, so a rule added today does not reach a session begun
 * yesterday. Settings are consulted per tool call, so this does.
 *
 * WHAT IT DENIES, AND WHY NOT EVERYTHING:
 *
 *   deny   Read, Grep, Glob under such a directory
 *   deny   a shell segment whose verb reads file content there (cat, grep, sed, …)
 *   allow  ls, stat, du, find, diff, mv, rm — how you investigate or clean one up
 *   allow  a buzz/gh/curl segment naming the path — that is a report, not a read
 *
 * Reading the content is how the tree gets mistaken for the live one; listing and
 * diffing it is how someone works out that it is stale and removes it, and publishing is
 * how they tell anyone. Denying those would make the guard the obstacle to fixing the
 * thing it guards against, and a guard that gets switched off protects nothing.
 *
 * A COMMAND LINE IS JUDGED PER SEGMENT, NEVER AS ONE STRING.
 *
 * The first version tested the whole command with one regex each way, and both leaked:
 *
 *   - `\bbuzz\b` matched the `.buzz` in every absolute path in this nest, so any
 *     content-read written with an absolute path exempted itself.
 *   - `git log` anywhere exempted the rest of the line — which is precisely the incident
 *     shape: run git to orient, ignore `fatal: not a git repository`, read source in the
 *     same command line.
 *
 * The verbatim incident command hit both. So each segment is decided on its own leading
 * verb: a `buzz messages send` segment publishes, a `grep` segment reads, and neither
 * speaks for the other. This is the mistake the name guard beside this one already
 * documents — reading the arguments rather than the raw string — arrived at twice.
 *
 * Fails OPEN on anything it cannot parse.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const BUZZ_HOME = process.env.BUZZ_HOME || path.join(os.homedir(), ".buzz");
const REPOS = path.join(BUZZ_HOME, "REPOS");

/** Verbs that read the content of a file, whether named or piped in. */
const CONTENT = new Set([
  "cat", "bat", "grep", "egrep", "fgrep", "rg", "ag", "ack",
  "sed", "awk", "perl", "node", "npm", "pnpm", "python", "python3", "ruby",
]);

/**
 * Read content only when a path is their own argument. They take stdin far more often,
 * so treating them as reads denies `ls <dir> | head -3` — an inspection command, and one
 * the deny message itself suggests.
 */
const PAGERS = new Set(["head", "tail", "wc", "nl", "less", "more", "open", "sort", "uniq"]);

/** Publishing text that names a path is not reading it. */
const PUBLISHERS = new Set(["buzz", "gh", "curl", "wget", "echo", "printf"]);

/** git is a publisher only for the subcommands that emit or record prose. */
const GIT_PUBLISHES = new Set(["commit", "log", "show", "diff", "tag", "push", "remote"]);

/** Wrappers that delegate: the verb that matters is the next word. */
const WRAPPERS = new Set(["sudo", "env", "time", "nohup", "command", "xargs", "nice", "stdbuf"]);

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

/** Directly under REPOS/, exists, and has no `.git` of any kind. */
function isStaleName(name) {
  const dir = path.join(REPOS, name);
  try {
    if (!fs.statSync(dir).isDirectory()) return false;
  } catch {
    return false;
  }
  return !fs.existsSync(path.join(dir, ".git"));
}

/** Names appearing after `REPOS/` in a string, whichever way the path was written. */
function staleNamesIn(text) {
  const found = new Set();
  for (const m of text.matchAll(/REPOS\/([A-Za-z0-9._-]+)/g)) {
    if (isStaleName(m[1])) found.add(m[1]);
  }
  return [...found];
}

let input;
try {
  input = JSON.parse(fs.readFileSync(0, "utf8"));
} catch {
  process.exit(0);
}

const tool = input?.tool_name ?? "";
const ti = input?.tool_input ?? {};

function reasonFor(name) {
  const hint =
    name === "stu-explorer"
      ? `The explorer that runs is named on the \`APP=\` line of \`${path.join(BUZZ_HOME, "bin", "stu")}\` — read that line and use the path it gives.`
      : `Find the tree that is a repository — a launcher script under \`${path.join(BUZZ_HOME, "bin")}\` usually names the live path — and read that one.`;
  return (
    `\`REPOS/${name}\` has no \`.git\`: it is a leftover copy, not a checkout, and nothing runs it. ` +
    `Source read from there is stale, and line numbers cited from it point at code that is not deployed. ` +
    `${hint} Cite paths repo-qualified so a reader can tell which tree you read. ` +
    `Listing, diffing, moving and removing \`REPOS/${name}\` are all still allowed — that is how it gets cleaned up.`
  );
}

// ---------------------------------------------------------------- file tools

if (tool !== "Bash") {
  const text = [ti.file_path, ti.path, ti.notebook_path, ti.pattern, ti.glob]
    .filter((v) => typeof v === "string" && v)
    .join("\n");
  const [name] = staleNamesIn(text);
  if (name) deny(reasonFor(name));
  process.exit(0);
}

// ---------------------------------------------------------------------- bash

const command = typeof ti.command === "string" ? ti.command : "";
if (!command.includes("REPOS/")) process.exit(0);

/**
 * Statements run in sequence; a `cd` in one is still in effect for the next. Command
 * substitution is opened up too, so `echo "$(cat <stale>/x)"` is not a way through.
 */
const statements = command
  .replace(/\$\(|`/g, "\n")
  .split(/&&|\|\||;|\n/)
  .map((s) => s.trim())
  .filter(Boolean);

/** Leading verb, past environment assignments and delegating wrappers. */
function verbOf(segment) {
  const words = segment.split(/\s+/).filter(Boolean);
  let i = 0;
  while (i < words.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(words[i])) i++;
  while (i < words.length && WRAPPERS.has(path.basename(words[i] ?? ""))) i++;
  const verb = path.basename((words[i] ?? "").replace(/^["'(]+/, ""));
  if (verb === "git") {
    const sub = words.slice(i + 1).find((w) => !w.startsWith("-"));
    return GIT_PUBLISHES.has(sub ?? "") ? "\0publish" : "git";
  }
  return verb;
}

let cwdStale = null;

for (const statement of statements) {
  // Paths named anywhere in a pipeline are reachable by every stage of it:
  // `find <stale> -type f | xargs grep x` reads the stale tree from the grep.
  const inStatement = staleNamesIn(statement);
  const pipeline = statement.split("|").map((s) => s.trim()).filter(Boolean);

  for (const segment of pipeline) {
    const verb = verbOf(segment);

    if (verb === "cd") {
      const target = segment.split(/\s+/)[1] ?? "";
      const [name] = staleNamesIn(target);
      // Any other cd moves out of it; a bare `cd` goes home.
      cwdStale = name ?? null;
      continue;
    }

    if (verb === "\0publish" || PUBLISHERS.has(verb)) continue;

    if (PAGERS.has(verb)) {
      // Only when the path is this segment's own argument: `… | head -3` is not a read.
      const [name] = staleNamesIn(segment);
      if (name) deny(reasonFor(name));
      continue;
    }

    if (CONTENT.has(verb)) {
      const name = inStatement[0] ?? cwdStale;
      if (name) deny(reasonFor(name));
    }
  }
}

process.exit(0);
