#!/usr/bin/env node
/**
 * Deny enumerating the operator's credential stores. Retrieving one credential is fine.
 *
 * `AGENTS.md` has said this for months, in a `## Credentials` section that names all three
 * `security` subcommands individually and closes with "omitting `-d` is not a mitigation: the
 * inventory is the disclosure". On 2026-08-12 two agents ran them anyway, four minutes apart,
 * and one of those agents was the reviewer whose own checklist makes it a guardrail breach.
 *
 * Neither had ignored the rule. Neither had read it. `AGENTS.md` binds when a session starts,
 * Buzz sessions are pooled and long-lived, and a system prompt that says *go check AGENTS.md*
 * is only sensible advice because the file is not loaded for you. That argument is already
 * made and already won in this repository — it is the stated reason `guard-stale-checkout.mjs`
 * is a hook — and it applies here unchanged. Settings are consulted per tool call.
 *
 * REGISTERED WITH NO `if` KEY, AND THAT IS LOAD-BEARING.
 *
 * The sibling guards are registered behind `if: "Bash(<verb> *)"` conditions. On the day this
 * was written, `Bash(git *)` denied a command with `git` *not* leading, and `Bash(curl *)`
 * failed to deny one with `curl` leading — verified four ways by two agents independently, and
 * unexplained by either. A guardrail behind a mechanism nobody can explain is not a guardrail.
 * The one hook that fires reliably is the one with no `if`, which does its own command test in
 * code that has tests.
 *
 * It is also the only shape that can work here. `security` is not the only spelling:
 * `/usr/bin/security`, `FOO=1 security`, `sudo security` and `cd /tmp && security` all reach
 * the same syscall, and a leading-command glob sees none of them.
 *
 * WHAT IT DENIES, AND WHY NOT EVERYTHING:
 *
 *   deny   security dump-keychain, security find-*-password — any spelling, any position
 *   deny   reading the content of ~/.netrc or anything under ~/.ssh/
 *   allow  git credential-<helper> get / git credential fill — the sanctioned interface
 *   allow  ls, stat, find on those paths — how you learn what is there without reading it
 *   allow  a buzz/gh/curl/echo segment that NAMES one of these commands
 *
 * That last one is not politeness. Every incident report about this guard quotes the commands
 * it denies, so a guard that judged text rather than verbs would deny the message saying the
 * guard was needed. The sibling guard has already been caught by exactly that, twice, and this
 * one is written knowing it.
 *
 * Fails OPEN on anything it cannot parse.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { leadingWords, statementsOf, stripHeredocs, verbOf } from "./lib/shell-command.mjs";

const HOME = os.homedir();

/** `security` subcommands that inventory the store rather than answering for one item. */
const ENUMERATING = /^(dump-keychain|find-(generic|internet)-password|list-keychains)$/;

/** Verbs that read the content of a file, whether named or piped in. */
const CONTENT = new Set([
  "cat", "bat", "grep", "egrep", "fgrep", "rg", "ag", "ack", "head", "tail", "less", "more",
  "sed", "awk", "perl", "node", "npm", "python", "python3", "ruby", "strings", "xxd", "od",
]);

/** Naming a path or a command in published text is not running or reading it. */
const PUBLISHERS = new Set(["buzz", "gh", "curl", "wget", "echo", "printf"]);

const HELPER_LINE = "printf 'protocol=https\\nhost=github.com\\n' | git credential-osxkeychain get";

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

const ENUMERATE_REASON =
  `That enumerates the operator's login keychain — every app token, every browser and IDE ` +
  `installed — into a transcript on disk. The inventory is the disclosure, and omitting \`-d\` ` +
  `is not a mitigation: the attribute list names what is there, and unlike a failed command it ` +
  `cannot be undone afterwards.\n\n` +
  `Ask for the one credential you need instead:\n\n    ${HELPER_LINE}\n\n` +
  `Read the \`password=\` line. If it returns nothing, stop and ask the operator — do not go ` +
  `looking. \`ls\`, \`stat\` and \`find\` on these paths are still allowed.`;

const SECRET_FILE_REASON =
  `That reads a credential file directly. Private keys and \`~/.netrc\` logins are not ` +
  `something an agent needs the contents of, and a transcript keeps whatever it prints.\n\n` +
  `For GitHub, ask the credential helper for the one credential:\n\n    ${HELPER_LINE}\n\n` +
  `Listing these paths is still allowed — it is reading them that discloses.`;

/** Secret-bearing paths, matched however the path was written. */
function secretPathIn(text) {
  const expanded = text.replace(/(^|[\s="'])~(?=\/)/g, `$1${HOME}`);
  if (/(^|[\s="'])[^\s"']*\.netrc\b/.test(expanded)) return "~/.netrc";
  // `(?:/|\b)` so the directory itself matches as well as a file in it — `grep -r . ~/.ssh/`
  // names nothing after the slash and reads every key in there.
  const ssh = expanded.match(new RegExp(`${HOME.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/\\.ssh(?:/|\\b)`));
  return ssh ? "~/.ssh/" : null;
}

let input;
try {
  input = JSON.parse(fs.readFileSync(0, "utf8"));
} catch {
  process.exit(0);
}

const tool = input?.tool_name ?? "";
const ti = input?.tool_input ?? {};

// ---------------------------------------------------------------- file tools

if (tool !== "Bash") {
  const text = [ti.file_path, ti.path, ti.notebook_path, ti.pattern, ti.glob]
    .filter((v) => typeof v === "string" && v)
    .join("\n");
  if (secretPathIn(text)) deny(SECRET_FILE_REASON);
  process.exit(0);
}

// ---------------------------------------------------------------------- bash

const rawCommand = typeof ti.command === "string" ? ti.command : "";
const command = stripHeredocs(rawCommand);

for (const statement of statementsOf(command)) {
  for (const segment of statement.split("|").map((s) => s.trim()).filter(Boolean)) {
    const verb = verbOf(segment);

    // A segment that publishes text may name any of this. It is a report, not a run.
    if (PUBLISHERS.has(verb)) continue;

    if (verb === "security") {
      const [, sub] = leadingWords(segment);
      if (ENUMERATING.test(path.basename(sub ?? ""))) deny(ENUMERATE_REASON);
      continue;
    }

    // `git credential-osxkeychain get` and `git credential fill` are the sanctioned interface.
    if (verb === "git") continue;

    if (CONTENT.has(verb) && secretPathIn(segment)) deny(SECRET_FILE_REASON);
  }
}

process.exit(0);
