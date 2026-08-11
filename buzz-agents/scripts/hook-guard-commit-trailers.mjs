#!/usr/bin/env node
/**
 * Refuse to run a `git commit` that would land without the operator's sign-off.
 *
 * AGENTS.md has required a `Signed-off-by` and a `Co-authored-by` naming the human operator
 * for months. It was missed on two consecutive pieces of work, and 7 of the 12 commits on
 * `main` before those carried no sign-off — the 6 most recent consecutively. The rule is not
 * unclear; it is a rule that has to be remembered at the one moment nobody is thinking about
 * it. So it moves out of prose and into a `PreToolUse` hook on Bash, beside the name guard
 * that solved the same class of problem here.
 *
 * Denying at this point is better than reporting afterwards. The reason goes back to the
 * agent that proposed the command, which adds the flags and retries. Nothing is committed,
 * and no history has to be amended or force-pushed.
 *
 * Why this and not `.husky/commit-msg`: that hook fires for the operator's own commits too,
 * and asking someone to sign off on their own work is friction with nothing behind it. A
 * PreToolUse hook fires only for commands an agent proposes, which is exactly the population
 * the rule is about.
 *
 * Input: the PreToolUse JSON on stdin. Output: nothing when the commit is fine, or a deny
 * decision naming the missing trailers. Exit is always 0 — a hook that crashes must not take
 * every git command on the machine down with it.
 *
 * Wired from `.claude/settings.json` here and from `nest/.claude/settings.json` for the
 * agents, whose working directory is the nest rather than this checkout.
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { commandsToInspect, inspectCommand } from "../lib/commit-trailers.mjs";

/* ── talking to the repository ─────────────────────────────────────────────── */

function git(cwd, args) {
  try {
    return execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
}

function readIfSmall(p) {
  try {
    const st = fs.statSync(p);
    if (!st.isFile() || st.size > 1_000_000) return null;
    return fs.readFileSync(p, "utf8");
  } catch {
    return null;
  }
}

/* ── main ──────────────────────────────────────────────────────────────────── */

function emit(obj) {
  process.stdout.write(JSON.stringify(obj));
}

let payload;
try {
  payload = JSON.parse(fs.readFileSync(0, "utf8"));
} catch {
  process.exit(0); // not our business
}

const cmd = payload?.tool_input?.command;
if (payload?.tool_name !== "Bash" || typeof cmd !== "string") process.exit(0);
if (!/\bgit\b/.test(cmd) || !/\b(commit|revert)\b/.test(cmd)) process.exit(0);

const shellCwd = typeof payload?.cwd === "string" && payload.cwd ? payload.cwd : process.cwd();

for (const tokens of commandsToInspect(cmd)) {
  /**
   * `git -C <dir>` moves the repository the commit lands in, and with it the `user.email`
   * that counts. Resolved per command rather than once, because a chained command can hop
   * between checkouts — and this machine has two dozen linked worktrees.
   */
  const peek = inspectCommand(tokens, { email: "x", readFile: () => null, headMessage: () => null });
  if (!peek) continue;
  const repoCwd = peek.gitDir ? path.resolve(shellCwd, peek.gitDir) : shellCwd;

  const email = git(repoCwd, ["config", "user.email"]) ?? "";
  const name = git(repoCwd, ["config", "user.name"]) ?? "";

  const verdict = inspectCommand(tokens, {
    email,
    name,
    readFile: (p) => readIfSmall(path.resolve(repoCwd, p)),
    headMessage: () => git(repoCwd, ["log", "-1", "--format=%B"]),
  });
  if (!verdict || verdict.verdict === "ok") continue;

  const trailerFlags =
    `  --trailer "Co-authored-by: ${name || "<name>"} <${email || "<email>"}>" \\\n` +
    `  --trailer "Signed-off-by: ${name || "<name>"} <${email || "<email>"}>"`;

  if (verdict.reason === "no-identity") {
    emit({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason:
          `This repository has no \`user.email\` configured, so there is no operator to ` +
          `sign off. Nothing has run.\n\n` +
          `AGENTS.md is explicit about this case: stop and ask the human operator for their ` +
          `name and email rather than guessing one or committing without it.`,
      },
    });
    process.exit(0);
  }

  if (verdict.reason === "revert") {
    emit({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason:
          `This revert would write a commit without the operator's sign-off. Nothing has ` +
          `run.\n\n` +
          `\`git revert\` generates its own \`Revert "…"\` message, so it starts with no ` +
          `trailers, and it takes no \`--trailer\` flag — git parses that as a revision. ` +
          `Stage the revert and commit it yourself:\n\n` +
          `  git revert --no-commit <commit>\n` +
          `  git commit \\\n${trailerFlags}\n\n` +
          `\`--no-commit\` and \`--continue\`/\`--abort\`/\`--quit\` are not blocked.`,
      },
    });
    process.exit(0);
  }

  const why =
    verdict.reason === "not-visible"
      ? {
          stdin: `The message is piped in on stdin, which this cannot read.`,
          unreadable: `The message is behind a shell substitution or a file this could not read.`,
          editor: `There is no message on the command line at all — this would open an editor.`,
        }[verdict.source]
      : `The message is missing: ${verdict.missing.join(" and ")}.`;

  emit({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason:
        `This commit would land without the operator's sign-off. Nothing has run.\n\n` +
        `${why}\n\n` +
        `AGENTS.md requires both trailers on every agent-authored commit, naming the human ` +
        `operator from this repository's git config. Put them in the command itself, where ` +
        `they cannot be forgotten between committing and pushing:\n\n` +
        `${trailerFlags}\n\n` +
        `\`--trailer\` is an argument, so it works alongside any message source — a piped ` +
        `\`-F -\` with both flags passes. The model's own \`Co-authored-by\` may stay; all ` +
        `three trailers coexist, and the operator's is the one GitHub reads for credit.\n\n` +
        `Verify with \`git log -1 --format='%(trailers)'\`. Not \`git log --oneline -1\` — ` +
        `that prints hash and subject only, so it passes on a commit with no trailers at all.`,
    },
  });
  process.exit(0);
}

process.exit(0);
