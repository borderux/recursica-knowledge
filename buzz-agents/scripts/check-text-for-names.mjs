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

const file = process.argv[2];

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

// A commit message's comment lines are stripped by git before the message is stored, so a
// name inside one is never published. Checking them anyway would reject the commit for
// text that git is about to discard — including the diff `git commit -v` appends.
const body = read()
  .split("\n")
  .filter((line) => !line.startsWith("#"))
  .join("\n");

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
const tokenLeaks = values
  ? findLeaks(body, deriveValues(values)).map(
      (token) => `the value of {{${token}}}`,
    )
  : [];

const matched = [
  ...redactions
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
