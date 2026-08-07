#!/usr/bin/env node
/**
 * Refuse to run a command that would publish a client or participant name.
 *
 * `.husky/commit-msg` catches a commit message after it is written. This runs BEFORE the
 * command executes, as a Claude Code `PreToolUse` hook on Bash, and it covers the things
 * git has no hook for at all: a PR title and body, an issue, a release note, a branch
 * name, a tag. The original incident in this repository put the client name in the PR
 * body as well as the commit — the commit half was catchable and the rest was not.
 *
 * Denying at this point is better than rejecting afterwards. The reason goes back to the
 * agent that proposed the command, which rewrites and retries. Nothing is published, and
 * no history has to be rewritten.
 *
 * Input: the PreToolUse JSON on stdin. Output: nothing when the command is fine, or a
 * deny decision naming the rule labels. Exit is always 0 — a hook that crashes must not
 * take every git command down with it.
 *
 * Wired from `.claude/settings.json` here and from `nest/.claude/settings.json` for the
 * agents, whose working directory is the nest rather than this checkout.
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHECKER = path.join(__dirname, "check-text-for-names.mjs");

/* ── what counts as publishing ─────────────────────────────────────────────── */

/**
 * Commands that write text somewhere permanent and public.
 *
 * `buzz pr` and `buzz issues` are here too: a Buzz-hosted repository is as public to the
 * community as GitHub is to the internet, and the same names have no business in either.
 */
const PUBLISHES = [
  /\bgit\s+(commit|tag|notes|merge|revert|cherry-pick)\b/,
  /\bgit\s+(branch|switch|checkout)\b/,
  /\bgh\s+(pr|issue|release|repo)\b/,
  /\bapi\.github\.com\b/,
  /\bbuzz\s+(pr|issues|repos)\b/,
];

/**
 * Flags whose VALUE is prose destined for publication.
 *
 * Deliberately not the whole command line. A command routinely contains a path under the
 * operator's home directory, and the operator-name rules match that — checking the raw
 * string would deny every correct commit, which is the same mistake that left the
 * commit-msg hook switched off for months. Verified: the checker exits 2 on a bare
 * `git commit -F /Users/<operator>/...` path.
 */
const TEXT_FLAGS = new Set([
  "-m", "--message",
  "-t", "--title",
  "-b", "--body",
  "--content",
  "--notes",
  "--subject",
  "--description",
]);

/** Flags whose value names a file whose CONTENTS get published. */
const FILE_FLAGS = new Set([
  "-F", "--file", "--body-file", "--notes-file", "--template",
]);

/** Subcommands where the next bare word is a ref name, and a ref name is published too. */
const REF_AFTER = [
  /\bgit\s+tag\b/,
  /\bgit\s+branch\b/,
  /\bgit\s+checkout\s+-b\b/,
  /\bgit\s+switch\s+-c\b/,
];

/* ── shell-ish tokenizer ───────────────────────────────────────────────────── */

/**
 * Split a command into tokens, honouring the three quoting forms that actually appear.
 *
 * Not a shell parser and not trying to be. It needs to know which word follows `-m` and
 * whether that word was quoted; it does not need to expand anything. Anything it gets
 * wrong fails toward checking more text, never less.
 */
function tokenize(cmd) {
  const out = [];
  let cur = "";
  let quoted = false;
  let i = 0;
  let started = false;

  const push = () => {
    if (started) out.push({ value: cur, quoted });
    cur = "";
    quoted = false;
    started = false;
  };

  while (i < cmd.length) {
    const c = cmd[i];
    if (c === "'") {
      const end = cmd.indexOf("'", i + 1);
      if (end < 0) { cur += cmd.slice(i + 1); started = true; break; }
      cur += cmd.slice(i + 1, end);
      quoted = true;
      started = true;
      i = end + 1;
    } else if (c === '"') {
      let j = i + 1;
      let buf = "";
      while (j < cmd.length && cmd[j] !== '"') {
        if (cmd[j] === "\\" && j + 1 < cmd.length) { buf += cmd[j + 1]; j += 2; continue; }
        buf += cmd[j];
        j += 1;
      }
      cur += buf;
      quoted = true;
      started = true;
      i = j + 1;
    } else if (c === "\\" && i + 1 < cmd.length) {
      cur += cmd[i + 1];
      started = true;
      i += 2;
    } else if (/\s/.test(c)) {
      push();
      i += 1;
    } else {
      cur += c;
      started = true;
      i += 1;
    }
  }
  push();
  return out;
}

/* ── collect the text this command would publish ───────────────────────────── */

function readIfSmall(p) {
  try {
    const st = fs.statSync(p);
    if (!st.isFile() || st.size > 1_000_000) return null;
    return fs.readFileSync(p, "utf8");
  } catch {
    return null;
  }
}

function collect(cmd) {
  const tokens = tokenize(cmd);
  const found = [];
  let pipedIn = false;

  for (let i = 0; i < tokens.length; i += 1) {
    const raw = tokens[i].value;

    // --flag=value
    const eq = raw.indexOf("=");
    if (raw.startsWith("--") && eq > 2) {
      const name = raw.slice(0, eq);
      const value = raw.slice(eq + 1);
      if (TEXT_FLAGS.has(name)) found.push({ what: name, text: value });
      if (FILE_FLAGS.has(name)) {
        if (value === "-") pipedIn = true;
        else {
          const body = readIfSmall(value);
          if (body !== null) found.push({ what: `${name} ${path.basename(value)}`, text: body });
        }
      }
      continue;
    }

    const next = tokens[i + 1]?.value;
    if (TEXT_FLAGS.has(raw) && next !== undefined) {
      found.push({ what: raw, text: next });
      i += 1;
      continue;
    }
    if (FILE_FLAGS.has(raw) && next !== undefined) {
      if (next === "-") pipedIn = true;
      else {
        const body = readIfSmall(next);
        if (body !== null) found.push({ what: `${raw} ${path.basename(next)}`, text: body });
      }
      i += 1;
      continue;
    }

    // curl -d @file  /  curl -d '{"title":...}'
    if ((raw === "-d" || raw === "--data" || raw === "--data-binary") && next !== undefined) {
      if (next.startsWith("@")) {
        const body = readIfSmall(next.slice(1));
        if (body !== null) found.push({ what: "request body", text: body });
      } else {
        found.push({ what: "request body", text: next });
      }
      i += 1;
      continue;
    }
  }

  // A ref name is published as surely as a message is.
  for (const re of REF_AFTER) {
    const m = re.exec(cmd);
    if (!m) continue;
    const after = tokenize(cmd.slice(m.index + m[0].length));
    const name = after.find((t) => !t.value.startsWith("-"));
    if (name) found.push({ what: "ref name", text: name.value });
  }

  return { found, pipedIn };
}

/* ── run the checker ───────────────────────────────────────────────────────── */

function check(text) {
  try {
    execFileSync(process.execPath, [CHECKER], {
      input: text,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return null;
  } catch (err) {
    if (err.status !== 2) return null; // usage error or a missing checker: not a finding
    const out = `${err.stdout ?? ""}${err.stderr ?? ""}`;
    /**
     * Take the label block by position, not by filtering out everything that is not a
     * label. The checker prints its labels between the "must not be published" line and
     * the "Matched N redaction rules" line, and nothing else lands in that region.
     *
     * Filtering was the first attempt, and it was wrong in the case that matters most: on
     * a machine with no local rule file the checker warns across two lines, and the second
     * line does not begin with the "!" the filter keyed on — so "Client and participant
     * names are NOT being checked" was reported as if it were a finding. That is every new
     * operator machine, and a deny reason that lists a warning as a rule label is exactly
     * the confusing output that gets a guard switched off.
     *
     * Labels only either way: printing the matched string into a transcript is the
     * disclosure the rule exists to prevent.
     */
    const lines = out
      // eslint-disable-next-line no-control-regex
      .replace(/\x1b\[[0-9;]*m/g, "")
      .split("\n");
    const start = lines.findIndex((l) => l.includes("must not be published"));
    const end = lines.findIndex((l, k) => k > start && /^\s*Matched \d+ redaction rule/.test(l));
    const labels =
      start >= 0 && end > start
        ? lines.slice(start + 1, end).map((l) => l.trim()).filter(Boolean)
        : [];
    return labels.length ? labels : ["a declared redaction"];
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
if (!PUBLISHES.some((re) => re.test(cmd))) process.exit(0);
if (!fs.existsSync(CHECKER)) process.exit(0);

const { found, pipedIn } = collect(cmd);
const hits = [];
for (const item of found) {
  const labels = check(item.text);
  if (labels) hits.push(`${item.what}: ${labels.join("; ")}`);
}

if (hits.length) {
  emit({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason:
        `This command would publish something that must not be published, and this ` +
        `repository is public. Nothing has run.\n\n` +
        hits.map((h) => `  ${h}`).join("\n") +
        `\n\nThe matched strings are deliberately not shown — printing them here would ` +
        `be the same disclosure. Rewrite structurally: "the client", "a client dataset", ` +
        `"a participant", "the operator", or the {{TOKEN}} where one exists. The point ` +
        `of the sentence almost always survives the substitution.\n\n` +
        `A commit message cannot be edited after a push, and force-pushing does not ` +
        `delete the objects.`,
    },
  });
  process.exit(0);
}

if (pipedIn) {
  // The text is arriving on stdin, so it is not in the command and cannot be inspected.
  // Warn rather than deny: refusing a legitimate `-F -` would push people toward
  // --no-verify, and a guard that gets switched off protects nothing.
  emit({
    systemMessage:
      "Name guard: this command feeds its text in on stdin, which the guard cannot read. " +
      "Pipe that text through buzz-agents/scripts/check-text-for-names.mjs yourself before " +
      "publishing it.",
  });
}

process.exit(0);
