#!/usr/bin/env node
/**
 * Refuse text that names a client, a participant, or an operator.
 *
 * The export path has been guarded for a long time: export-agents.mjs runs every stored
 * prompt through the redactions before writing it. Commit messages never touched that
 * path, and a commit message is published exactly as typed, forever, to the same public
 * repository — `git log` is as readable as any file in the tree and survives every later
 * cleanup of the tree itself.
 *
 * So this runs the same rules over arbitrary text. `.husky/commit-msg` calls it on every
 * commit; it is also the right thing to pipe an issue body, a PR description or a release
 * note through before posting one.
 *
 * Reports LABELS ONLY. Printing the matched string would put the name into the terminal,
 * the CI log and the shell history — the same disclosure the rule exists to prevent, with
 * extra steps.
 *
 * Usage:
 *   node buzz-agents/scripts/check-text-for-names.mjs <file>
 *   … | node buzz-agents/scripts/check-text-for-names.mjs
 *   node buzz-agents/scripts/check-text-for-names.mjs --commit-msg <file>
 *
 * `--commit-msg` says the text is a commit message, which is the ONLY case where a `#` line
 * is not published. Without it every line is read. See the comment on COMMENT below — that
 * distinction was missing, and it made the documented `<file>` form skip every comment in a
 * shell script, a Dockerfile, or a YAML file.
 *
 * Exit: 0 clean, 1 usage, 2 a rule matched.
 */

import fs from "node:fs";
import {
  loadPlaceholders,
  loadLocalRedactions,
  localRedactionsPath,
  loadValues,
  localValuesPath,
  findLeaks,
  deriveValues,
} from "../lib/placeholders.mjs";

const argv = process.argv.slice(2);
const commitMsgMode = argv.includes("--commit-msg");
const file = argv.find((a) => !a.startsWith("--"));

function read() {
  if (file) {
    if (!fs.existsSync(file)) {
      console.error(`check-text-for-names: no file at ${file}`);
      process.exit(1);
    }
    return fs.readFileSync(file, "utf8");
  }
  try {
    return fs.readFileSync(0, "utf8");
  } catch {
    console.error("check-text-for-names: pass a file, or pipe text on stdin");
    process.exit(1);
  }
}

/**
 * A `#` line is only unpublished in a COMMIT MESSAGE.
 *
 * Git strips those before storing the message — including the diff `git commit -v` appends —
 * so checking them would reject a commit over text nobody will ever see. That is why the
 * exemption exists.
 *
 * It used to apply to every input, and that was a hole. Pointed at a file — the form
 * `AGENT.md` documents, and the form the build uses on generated artifacts — it silently
 * skipped every comment in a shell script, a Python file, a Dockerfile or a YAML file.
 * Demonstrated minimally: `# operator note: <name>` in a `.sh` passed, while the same text
 * on stdin was caught. Comments are prose, and prose is where this leaks; the diff gets read
 * closely and the paragraph explaining it does not.
 *
 * So the exemption is now opt-in via `--commit-msg`, which only `.husky/commit-msg` passes.
 * A markdown `# Heading` in a PR body or a generated prompt is published text and is now
 * read as such.
 */
const COMMENT = /^#/;

/**
 * Git trailers are dropped too.
 *
 * `AGENTS.md` requires `Signed-off-by` and `Co-authored-by` on every commit, and both
 * carry a real person's name and email by definition — that is what a sign-off is. So
 * the operator-name rules matched every compliant commit message, which made the hook
 * unusable: enabling it would have rejected 100% of correct commits, and that is why it
 * sat unwired while client names went out in the prose above it.
 *
 * Only the trailer block is exempt, and only for lines that are actually trailers. A name
 * in the body is still a finding — the exemption is for the metadata git itself asks for,
 * not for naming people in prose.
 */
const TRAILER = /^(?:Signed-off-by|Co-authored-by|Reported-by|Reviewed-by|Tested-by|Acked-by|Helped-by|Suggested-by|Co-developed-by):/i;

const allLines = read().split("\n");
const kept = [];
let skippedComments = 0;
let skippedTrailers = 0;
for (const line of allLines) {
  if (commitMsgMode && COMMENT.test(line)) { skippedComments += 1; continue; }
  if (TRAILER.test(line)) { skippedTrailers += 1; continue; }
  kept.push(line);
}
const body = kept.join("\n");

/**
 * Say what was not read, always, even on a clean run.
 *
 * `exit 0` after skipping forty lines looks identical to `exit 0` after reading them, and
 * that is the failure mode this repository keeps meeting: a guard that goes quiet is
 * indistinguishable from a guard with nothing to say. The `commit-msg` name check sat
 * switched off for months, the review rig watched nobody for 45 minutes, and this exemption
 * skipped every comment in every file — each one silent, each one reading as safety.
 */
if (skippedComments || skippedTrailers) {
  const parts = [];
  if (skippedComments) parts.push(`${skippedComments} comment line(s) — commit-msg mode`);
  if (skippedTrailers) parts.push(`${skippedTrailers} trailer line(s)`);
  console.error(`  · not checked: ${parts.join(", ")}`);
}

const { redactions } = loadPlaceholders();
const local = loadLocalRedactions();
const values = loadValues(localValuesPath);

/**
 * A missing local-redactions.json is a warning here, not a failure.
 *
 * export-agents.mjs fails closed on it, and should: it writes to the repository, so an
 * unguarded run is how a name gets committed. This hook only reads a message somebody is
 * already writing, and a fresh clone has no local file yet — failing closed would block
 * every commit on a new checkout, which is how a hook gets deleted rather than fixed.
 */
if (local.length === 0) {
  console.error(
    `  ! no ${localRedactionsPath} — only the structural rules ran.\n` +
      "    Client and participant names are NOT being checked in this message.",
  );
}
if (values === null) {
  console.error(
    `  ! no ${localValuesPath} — configured identifiers are NOT being checked.`,
  );
}

/**
 * Configured token values count too.
 *
 * Redactions cover names. They do not cover the identifiers this repository keeps out of
 * the tree by tokenizing them — a cloud project id, a Drive folder, a channel uuid. Those
 * are exactly as absent from every versioned file, and for the same reason, but nothing
 * was checking them here: a message naming the real project id sailed through while the
 * client slug two words later was caught.
 *
 * Reported by TOKEN NAME, which is safe — `BQ_PROJECT` is public, its value is the part
 * that is not. Same convention export-agents.mjs already uses.
 */
/**
 * Two tokens are exempt, because their values are this repository's own public names.
 *
 * KNOWLEDGE_REPO_NAME is the name of the repo the text is being committed to, and
 * BUILDER_REPO_NAME is a sibling repo named in the guides. Treating those as leaks made
 * the checker report 50 of ~60 tracked files, including package.json and every component
 * DOCS.md — noise on that scale is indistinguishable from a broken tool, and it trains
 * whoever meets it to stop reading the output.
 *
 * They are exempt as TOKENS, not as strings: nothing else about the values is special, and
 * a client identifier that happened to contain one would still be caught by the rules
 * above.
 */
const PUBLIC_REPO_TOKENS = new Set(["KNOWLEDGE_REPO_NAME", "BUILDER_REPO_NAME"]);

const tokenLeaks = values
  ? findLeaks(body, deriveValues(values))
      .filter((token) => !PUBLIC_REPO_TOKENS.has(token))
      .map((token) => `the value of {{${token}}}`)
  : [];

const matched = [
  ...redactions
    .filter((r) => !r.$disabled)
    .filter((r) => new RegExp(r.pattern, r.flags ?? "g").test(body))
    .map((r) => r.reason ?? "a declared redaction"),
  ...local
    .filter((r) => new RegExp(r.pattern, r.flags ?? "g").test(body))
    .map((r) => r.label),
  ...tokenLeaks,
];

if (matched.length === 0) process.exit(0);

console.error(
  [
    "",
    "\x1b[31m✗ This text names something that must not be published.\x1b[0m",
    "",
    ...matched.map((m) => `      ${m}`),
    "",
    `      Matched ${matched.length} redaction rule${matched.length === 1 ? "" : "s"}. The offending strings are deliberately`,
    "      not printed — look the labels up in buzz-agents/local-redactions.json, which is",
    "      gitignored and safe to read.",
    "",
    '      Rewrite it structurally: "the client", "a participant", "the operator", or the',
    "      {{TOKEN}} where one exists. A commit message cannot be edited after a push.",
    "",
  ].join("\n"),
);
process.exit(2);
