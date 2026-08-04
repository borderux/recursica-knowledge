/**
 * Owner-suffixed agent names.
 *
 * A community can hold several installations of the same agent — one per operator, each
 * with its own keypair, budget and Mac. `Claire` alone does not say whose, so a channel
 * with two of them shows two identical names. The convention is `Claire (Alex)`.
 *
 * The suffix is display only. It must never reach the repository: the stored definition is
 * the portable one, shared by every operator, and an owner name in it would make each
 * install look like a different agent. So the rule is one-directional — added when a draft
 * is created, stripped whenever a live agent is matched back to its stored definition.
 *
 * Getting that wrong is not a cosmetic bug. Both directions were already broken by hand-
 * renaming before this module existed, and both failed silently in the same direction:
 * towards duplication.
 *
 *   - `sync-prompts.mjs` matched on `name` and found nothing for `Claire (Alex)`, so it
 *     reported an installed agent as `not installed on this Mac` and offered to create
 *     her. Following that advice gives you a second Claire.
 *   - `export-agents.mjs` derived its directory from the same field, so exporting would
 *     have written `agents/claire-alex/` beside `agents/claire/` rather than updating it.
 */

import { execFileSync } from "node:child_process";

/**
 * A trailing parenthesised owner. Anchored at the end and refusing nested parens, so a
 * name that legitimately contains brackets earlier is untouched.
 */
const OWNER_SUFFIX = /\s*\(([^()]+)\)\s*$/;

/**
 * The portable name: whatever the repository stores, with any owner suffix removed.
 *
 * A name that is *nothing but* a suffix — an agent renamed to `(Alex)` — is returned
 * unchanged rather than reduced to the empty string. The export derives its directory from
 * this, and an empty directory name resolves to `buzz-agents/agents/` itself, so an
 * agent.json would be written over the directory holding all four of them.
 */
export function canonicalAgentName(name) {
  const stripped = String(name ?? "")
    .replace(OWNER_SUFFIX, "")
    .trim();
  return stripped === "" ? String(name ?? "").trim() : stripped;
}

/** The owner in `Claire (Alex)`, or null if the name carries none. */
export function agentOwner(name) {
  return String(name ?? "").match(OWNER_SUFFIX)?.[1].trim() ?? null;
}

/**
 * The display name to create an agent under. Idempotent: re-applying the same owner does
 * not nest, and an empty owner leaves the canonical name alone.
 */
export function ownedDisplayName(base, owner) {
  const canonical = canonicalAgentName(base);
  const trimmed = String(owner ?? "").trim();
  return trimmed ? `${canonical} (${trimmed})` : canonical;
}

/**
 * Does this live persona correspond to that stored definition?
 *
 * Compared canonically and case-insensitively, so `Claire (Alex)`, `claire` and `Claire`
 * all match the stored `Claire`.
 */
export function sameAgent(liveName, storedName) {
  const a = canonicalAgentName(liveName).toLowerCase();
  const b = canonicalAgentName(storedName).toLowerCase();
  return a !== "" && a === b;
}

/**
 * Every live persona matching a stored definition, rather than the first one.
 *
 * `sameAgent` answers a yes/no question, and a caller using it with `.find()` silently
 * resolves a `Claire` and a `Claire (Alex)` on one Mac to whichever came first in the file.
 * Both are legitimate answers to "which Claire does the repo mean" and the caller cannot
 * tell them apart, so it needs to know there were two — a `draft-update` aimed at the wrong
 * one reports `accepted: true` and quietly updates an agent nobody named.
 *
 * Exact matches win outright when they exist: an operator holding `Claire` and
 * `Claire (Alex)` while the repo stores `Claire` has said unambiguously which is which.
 */
export function matchAgents(personas, config) {
  const exact = personas.filter(
    (p) => p.name === config.name || p.display_name === config.display_name,
  );
  if (exact.length) return exact;

  return personas.filter(
    (p) =>
      sameAgent(p.name, config.name) ||
      sameAgent(p.display_name, config.display_name),
  );
}

/**
 * Who is installing, for the owner suffix. Explicit always beats derived — the derivation is
 * a convenience and is allowed to be wrong, which is why the caller is expected to print
 * what it resolved before acting on it.
 *
 * `git config user.name` first, because this repository already treats it as the human
 * operator's identity: every commit here carries it as a `Signed-off-by` trailer, so it is a
 * name they set deliberately, unlike the account's full name.
 *
 * The first word only. A full name in a channel header is noise, and the suffix exists to
 * tell two Claires apart, which a first name does.
 */
export function resolveOwner({ explicit = null, cwd = process.cwd() } = {}) {
  if (explicit) return { owner: firstWord(explicit), source: "--owner" };

  const configured = quiet("git", ["config", "user.name"], cwd);
  if (configured)
    return { owner: firstWord(configured), source: "git config user.name" };

  const account = quiet("id", ["-F"], cwd);
  if (account) return { owner: firstWord(account), source: "id -F" };

  return { owner: null, source: null };
}

function firstWord(value) {
  return String(value).trim().split(/\s+/)[0] ?? "";
}

function quiet(command, args, cwd) {
  try {
    return execFileSync(command, args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}
