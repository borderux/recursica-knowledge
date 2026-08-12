/**
 * Reading a Bash command line the way a guard has to read it.
 *
 * Extracted from `guard-stale-checkout.mjs`, which arrived at all of this the expensive way,
 * because a second guard now needs the identical treatment and a hand-copied second version
 * of it would drift silently. Every rule below is a bug that shipped:
 *
 *   Heredoc bodies are data, never commands. A report *about* a guard quotes the commands the
 *   guard denies, so segmenting the body as a command list denies the message saying the guard
 *   is broken. An unterminated heredoc is not a bypass — the stripper runs to end of input, and
 *   bash swallows the rest as body for the same reason, so it never executes either.
 *
 *   A command line is judged per segment, never as one string. One regex over the whole line
 *   leaks both ways: a pattern meant for one command matches a substring of an unrelated path,
 *   and a permitted verb anywhere exempts the rest of the line — which is the incident shape
 *   exactly.
 *
 *   Command substitution is opened up, so `echo "$(cat <thing>)"` is not a way through.
 *
 *   The verb that matters is past the environment assignments and the delegating wrappers.
 *   `FOO=1 sudo security …` has three words before the one that decides anything.
 *
 * If you touch this file, keep the per-segment property and keep the tests that catch losing it.
 */

import path from "node:path";

/** Wrappers that delegate: the verb that matters is the next word. */
export const WRAPPERS = new Set(["sudo", "env", "time", "nohup", "command", "xargs", "nice", "stdbuf"]);

/** Remove heredoc bodies and herestrings — both are text the command carries, not work it does. */
export function stripHeredocs(command) {
  const kept = [];
  const pending = [];
  for (const line of command.split("\n")) {
    if (pending.length) {
      const end = pending[0].stripTabs ? line.replace(/^\t+/, "") : line;
      if (end.trim() === pending[0].delim) pending.shift();
      continue; // body and terminator alike are data
    }
    for (const m of line.matchAll(/<<(-?)\s*(["']?)([A-Za-z_][A-Za-z0-9_]*)\2/g)) {
      // `<<<` is a herestring, not a heredoc; it is stripped in place below.
      if (line[m.index - 1] === "<" || line[m.index + 2] === "<") continue;
      pending.push({ delim: m[3], stripTabs: m[1] === "-" });
    }
    kept.push(line.replace(/<<<\s*("[^"]*"|'[^']*'|\S+)/g, " "));
  }
  return kept.join("\n");
}

/**
 * Split into statements that run in sequence. A `cd` in one is still in effect for the next,
 * so callers that care about the working directory walk these in order.
 */
export function statementsOf(command) {
  return command
    .replace(/\$\(|`/g, "\n")
    .split(/&&|\|\||;|\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** The words of a segment from its real verb onward, past env assignments and wrappers. */
export function leadingWords(segment) {
  const words = segment.split(/\s+/).filter(Boolean);
  let i = 0;
  while (i < words.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(words[i])) i++;
  while (i < words.length && WRAPPERS.has(path.basename(words[i] ?? ""))) i++;
  return words.slice(i);
}

/**
 * The verb of a segment: basename, so `/usr/bin/security` and `security` are one thing, and
 * quote-stripped, so `"security"` is too.
 */
export function verbOf(segment) {
  const [first] = leadingWords(segment);
  return path.basename((first ?? "").replace(/^["'(]+/, ""));
}
