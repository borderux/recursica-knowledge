/**
 * Owner-suffixed agent names.
 *
 * A community can hold several installations of the same agent — one per operator, each
 * with its own keypair, budget and Mac. `Claire` alone does not say whose, so a channel
 * with two of them shows two identical names. The convention is `Claire (Aaron)`.
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
 *   - `sync-prompts.mjs` matched on `name` and found nothing for `Claire (Aaron)`, so it
 *     reported an installed agent as `not installed on this Mac` and offered to create
 *     her. Following that advice gives you a second Claire.
 *   - `export-agents.mjs` derived its directory from the same field, so exporting would
 *     have written `agents/claire-aaron/` beside `agents/claire/` rather than updating it.
 */

/**
 * A trailing parenthesised owner. Anchored at the end and refusing nested parens, so a
 * name that legitimately contains brackets earlier is untouched.
 */
const OWNER_SUFFIX = /\s*\(([^()]+)\)\s*$/;

/** The portable name: whatever the repository stores, with any owner suffix removed. */
export function canonicalAgentName(name) {
  return String(name ?? "").replace(OWNER_SUFFIX, "").trim();
}

/** The owner in `Claire (Aaron)`, or null if the name carries none. */
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
 * Compared canonically and case-insensitively, so `Claire (Aaron)`, `claire` and `Claire`
 * all match the stored `Claire`.
 */
export function sameAgent(liveName, storedName) {
  const a = canonicalAgentName(liveName).toLowerCase();
  const b = canonicalAgentName(storedName).toLowerCase();
  return a !== "" && a === b;
}
