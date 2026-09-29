#!/usr/bin/env node
/**
 * Run the name and personal-data check over a whole change, not one message.
 *
 * `commit-msg` checks the message. The PreToolUse guard checks a PR body before an agent posts
 * it. Nothing checked what a commit actually adds to a file — and the file is where a pasted
 * designer report, a quoted participant or a mock-data table lands. An agent that edits the
 * knowledge from feedback (Alan) writes exactly that kind of text for a living.
 *
 *   --staged        the lines staged for commit. `.husky/pre-commit` runs this, so the commit
 *                   is refused before anything exists to push.
 *   --base <ref>    the lines added since <ref>, and every commit message in <ref>..HEAD.
 *                   CI runs this on a pull request, with PR_TITLE and PR_BODY in the
 *                   environment, so the pull request's own text is checked too.
 *
 * Only ADDED lines are read. A line that is already on main is already published, and
 * failing every change that touches a file with an old problem would teach people to
 * bypass the check rather than fix the problem.
 *
 * Labels and file names only, never the matched text — the same rule as the checker itself.
 * A file name is already public by the time CI sees it, and locally it is what you need.
 *
 * Exit: 0 clean, 2 something matched, 1 usage or git failure.
 */

import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const CHECKER = path.join(
  repoRoot,
  "buzz-agents",
  "scripts",
  "check-text-for-names.mjs",
);

/**
 * Files never read. Lockfiles are machine output with no prose. The fixture file carries a
 * string matching a structural rule because that rule is what it tests (see AGENT.md).
 */
const SKIP = [
  /(^|\/)package-lock\.json$/,
  /^buzz-agents\/lib\/placeholders\.test\.mjs$/,
  /\.(png|jpe?g|gif|webp|ico|pdf|woff2?|ttf|otf|zip)$/i,
];

const argv = process.argv.slice(2);
const staged = argv.includes("--staged");
const baseIdx = argv.indexOf("--base");
const base = baseIdx >= 0 ? argv[baseIdx + 1] : null;
if (!staged && !base) {
  console.error("usage: check-changes-for-names.mjs --staged | --base <ref>");
  process.exit(1);
}

function git(args) {
  return execFileSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
}

function check(text, extra = []) {
  try {
    const out = execFileSync("node", [CHECKER, "--json", ...extra], {
      input: text,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "ignore"],
    });
    return JSON.parse(out).matched;
  } catch (err) {
    if (err.status === 2) return JSON.parse(err.stdout).matched;
    throw err;
  }
}

/** Added lines per file, from a unified diff with no context. */
function addedLinesByFile(diffArgs) {
  const byFile = new Map();
  let current = null;
  for (const line of git([
    "diff",
    "--no-color",
    "--no-ext-diff",
    "-U0",
    "--diff-filter=AMR",
    ...diffArgs,
  ]).split("\n")) {
    if (line.startsWith("+++ ")) {
      current =
        line === "+++ /dev/null" ? null : line.slice(4).replace(/^b\//, "");
      if (current && SKIP.some((r) => r.test(current))) current = null;
      if (current && !byFile.has(current)) byFile.set(current, []);
    } else if (current && line.startsWith("+")) {
      byFile.get(current).push(line.slice(1));
    }
  }
  return byFile;
}

const findings = [];

const diffArgs = staged ? ["--cached"] : [`${base}...HEAD`];
for (const [file, lines] of addedLinesByFile(diffArgs)) {
  const matched = check(lines.join("\n"));
  if (matched.length) findings.push([file, matched]);
}

if (base) {
  const messages = git(["log", "--format=%H%x00%B%x01", `${base}..HEAD`]).split(
    "\x01",
  );
  for (const entry of messages) {
    const [sha, message] = entry.replace(/^\n/, "").split("\x00");
    if (!sha || message === undefined) continue;
    const matched = check(message, ["--commit-msg"]);
    if (matched.length)
      findings.push([`commit ${sha.slice(0, 7)} message`, matched]);
  }
  for (const [name, value] of [
    ["pull request title", process.env.PR_TITLE],
    ["pull request description", process.env.PR_BODY],
  ]) {
    if (!value) continue;
    const matched = check(value);
    if (matched.length) findings.push([name, matched]);
  }
}

// Once, not per file: which rules could not run here.
try {
  execFileSync("node", [CHECKER], {
    input: "",
    stdio: ["pipe", "ignore", "inherit"],
  });
} catch {
  /* the warnings are the point; an empty text cannot match */
}

if (findings.length === 0) {
  console.error("✓ No names or personal contact details in the added text.");
  process.exit(0);
}

console.error(
  "\n\x1b[31m✗ This change adds text that must not be published.\x1b[0m\n",
);
for (const [where, labels] of findings)
  console.error(`  ${where}: ${[...new Set(labels)].join(", ")}`);
console.error(
  '\n  The matched text is deliberately not printed. Rewrite it structurally — "the client",\n' +
    '  "a participant", "Person A", an address at acme.com — and check again. A push to this\n' +
    "  repository is public and cannot be fully undone.\n",
);
process.exit(2);
