#!/usr/bin/env node
/**
 * Fail a pull request when a commit in it names a personal email address.
 *
 * A commit carries email addresses in four places: its author, its committer, and each
 * Signed-off-by and Co-authored-by line in its message. All four are published with the commit
 * and stay fetchable by the commit's id after any rewrite. So each one must be an address that
 * reaches nobody:
 *
 *   - a GitHub no-reply address, <id>+<login>@users.noreply.github.com or the older
 *     <login>@users.noreply.github.com. GitHub's bots use this form too, such as
 *     github-actions[bot] and dependabot[bot].
 *   - noreply@github.com, the committer GitHub writes for a commit made on github.com.
 *   - support@github.com, the address in dependabot[bot]'s Signed-off-by line. It is GitHub's own
 *     role address, never a person's. Only these two exact github.com addresses pass: a person at
 *     GitHub has a real address at github.com too.
 *   - noreply@anthropic.com, the model's Co-authored-by address.
 *
 *   node scripts/check-commit-emails.mjs <base> <head>   every commit in <base>..<head>
 *
 * A failure names the commit and the line, never the address: the log of a public repository's
 * check is public too.
 *
 * Exit: 0 clean, 2 an address that is not allowed, 1 usage or git failure.
 */

import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ALLOWED = [
  /^[^@\s]+@users\.noreply\.github\.com$/i,
  /^noreply@github\.com$/i,
  /^support@github\.com$/i,
  /^noreply@anthropic\.com$/i,
];

/** True when `email` is an address the check allows. */
export function allowed(email) {
  return ALLOWED.some((re) => re.test(email.trim()));
}

const TRAILER = /^\s*(signed-off-by|co-authored-by)\s*:(.*)$/i;
const EMAIL = /[^\s<>"'(),;:]+@[^\s<>"'(),;:]+/g;

/**
 * What is wrong with one commit, as lines that name the place and never the address.
 * `commit` is { sha, author, committer, message }.
 */
export function problems(commit) {
  const out = [];
  const short = commit.sha.slice(0, 7);
  if (!allowed(commit.author)) out.push(`${short}: author`);
  if (!allowed(commit.committer)) out.push(`${short}: committer`);
  commit.message.split("\n").forEach((line, i) => {
    const m = line.match(TRAILER);
    if (!m) return;
    const key = m[1].toLowerCase() === "signed-off-by" ? "Signed-off-by" : "Co-authored-by";
    if ((m[2].match(EMAIL) ?? []).some((e) => !allowed(e))) {
      out.push(`${short}: message line ${i + 1}, ${key}`);
    }
  });
  return out;
}

/** Every commit in <base>..<head>, merges included, oldest first. */
export function commits(base, head, cwd = process.cwd()) {
  const raw = execFileSync(
    "git",
    ["log", "--reverse", "--format=%H%x00%ae%x00%ce%x00%B%x1e", `${base}..${head}`],
    { cwd, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
  );
  return raw
    .split("\x1e")
    .map((r) => r.replace(/^\n/, ""))
    .filter(Boolean)
    .map((r) => {
      const [sha, author, committer, message] = r.split("\x00");
      return { sha, author, committer, message: message.replace(/\n+$/, "") };
    });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [base, head] = process.argv.slice(2);
  if (!base || !head) {
    console.error("usage: check-commit-emails.mjs <base> <head>");
    process.exit(1);
  }
  let list;
  try {
    list = commits(base, head);
  } catch (e) {
    console.error(`git could not list the commits in ${base}..${head}: ${e.message}`);
    process.exit(1);
  }
  const found = list.flatMap(problems);
  if (found.length) {
    console.log(
      `✗ ${found.length} place(s) name an email address other than a GitHub no-reply address, GitHub's own noreply@github.com or support@github.com, or noreply@anthropic.com:`,
    );
    for (const p of found) console.log(`  ${p}`);
    console.log(
      "Set the address in git config user.email to the GitHub no-reply address, rewrite each commit named above, and push again.",
    );
    process.exit(2);
  }
  console.log(`✓ ${list.length} commit(s): every author, committer and trailer address is a no-reply address.`);
}
