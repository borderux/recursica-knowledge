/**
 * Which repository definition an installed agent came from.
 *
 * ## Why a name cannot be the answer
 *
 * Matching an install to its definition by name works until somebody renames one, and
 * renaming is an ordinary thing to do in a Desktop form. It already failed twice here in
 * different directions: `Claire (Alex)` matched nothing until the owner suffix was
 * stripped, and `acme (Claire)` matched nothing until the brackets were read the other
 * way round. Both failed silently and both failed towards "not installed", so the agents
 * were never compared and drifted with every report saying they were fine.
 *
 * The next rename will not fit either rule. So a name is demoted to what it is good for —
 * guessing, once — and the guess is written down against something that does not change.
 *
 * ## What it is written against
 *
 * The persona's `slug`: a UUID Buzz assigns at creation, carried by the install's
 * `persona_id`, and untouched by any rename. `pubkey` would do as well but personas in
 * `managed-agents.json` do not carry one; `display_name` and `name` are exactly the
 * fields under discussion.
 *
 * The binding lives in Buzz's global agent config beside the version stamps, for the
 * reasons ../lib/version-stamp.mjs sets out: per-agent `env_vars` are not reachable by
 * any `buzz` subcommand, and that file is.
 *
 * ## How a binding gets made
 *
 * Three ways, in descending order of confidence, and only the first is consulted once it
 * exists:
 *
 *   1. **Recorded.** Authoritative. A rename cannot touch it.
 *   2. **By name.** The old matching, now used only to propose a binding the first time an
 *      install is seen. It is written immediately, so the name is never consulted for that
 *      install again — which is the whole point: rename it afterwards and nothing breaks.
 *   3. **By prompt.** When the name matches nothing, what the agent is *running* still
 *      identifies it. A live prompt whose stored form appears anywhere in exactly one
 *      definition's recent history came from that definition, whatever it has been renamed
 *      to — and history rather than just the current revision, because an install nobody
 *      has been checking is usually behind as well as renamed.
 *
 * An install none of the three can place is reported as unknown with its slug, so the
 * operator can bind it by hand. That is a worse outcome than a correct guess and a much
 * better one than silence, which is what the name-only version did.
 *
 * ## The cost of getting one wrong
 *
 * A binding is sticky by design, so a wrong one persists. Two things keep that
 * survivable: every binding is printed in the report rather than being invisible state,
 * and `--unbind` removes one. A binding is also never made from an ambiguous signal —
 * two definitions matching one prompt bind nothing.
 */

import { DEFINITION_PREFIX, readEnvVars } from "./version-stamp.mjs";

/** Buzz's own rule for env var keys, copied from the Desktop's validation. */
const KEY_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

/**
 * The env var name holding one install's binding.
 *
 * Keyed by the first 8 characters of the slug, matching what `stampKey` uses for the same
 * install, so the two keys for one agent are recognisably a pair when read in a settings
 * pane. A UUID prefix that short is not unique in general. Across the handful of agents one
 * operator runs it is, and the consequence of the birthday case is bounded: two installs
 * would share a binding, which the report makes visible by printing how each was placed,
 * and `--bind` overrides.
 */
export function bindingKey(slug) {
  const key =
    DEFINITION_PREFIX +
    String(slug).slice(0, 8).toUpperCase().replace(/[^A-Z0-9]+/g, "_");
  if (!KEY_PATTERN.test(key)) {
    throw new Error(`derived env var key is not valid for Buzz: ${key}`);
  }
  return key;
}

/**
 * Every recorded binding, as slug-prefix → agent directory.
 *
 * Returns the prefixes rather than full slugs because that is all the key holds. Callers
 * look up with `bindingFor`, which does the same truncation.
 */
export function readBindings(configPath) {
  const out = new Map();
  for (const [key, value] of Object.entries(readEnvVars(configPath))) {
    if (!key.startsWith(DEFINITION_PREFIX)) continue;
    if (typeof value !== "string" || !value) continue;
    out.set(key.slice(DEFINITION_PREFIX.length), value);
  }
  return out;
}

/** The definition this persona is bound to, or null. */
export function bindingFor(bindings, slug) {
  if (!slug) return null;
  return (
    bindings.get(String(slug).slice(0, 8).toUpperCase().replace(/[^A-Z0-9]+/g, "_")) ??
    null
  );
}

/**
 * Which definitions run exactly this prompt.
 *
 * `stored` is the live prompt already reduced to stored form — tokenized and redacted —
 * because that is the only space in which a live prompt and a committed one are
 * comparable. Comparing them raw is the mistake that made the original drift check report
 * every redacted agent as permanently drifted.
 *
 * Returns every match, never a first match. Two definitions sharing a prompt is a real
 * state (a fork that has not diverged yet), and the caller must bind nothing rather than
 * pick.
 */
export function definitionsRunning(stored, definitions) {
  return [...definitions.entries()]
    .filter(([, committed]) => committed === stored)
    .map(([dir]) => dir);
}

/**
 * Which definitions have *ever* run exactly this prompt.
 *
 * The current-version check above places an install that is up to date. It does not place
 * the one that actually needs placing: an install that was renamed is usually also behind,
 * because both happen to an agent nobody has been checking. Measured on the machine this
 * was built for, that was three installs of four — so a fallback that only recognises the
 * current prompt would have placed none of them.
 *
 * So each definition's recent history is walked and the live prompt compared against every
 * revision. A hit is proof of descent: this text was in this file, and nothing else on this
 * machine is running it.
 *
 * `index` maps a past revision's content to the definitions it belonged to, built once by
 * the caller — this module does no git of its own. Built once rather than per install
 * because the first version walked it per install with one `git show` per revision and took
 * over two minutes on a check meant to run unattended.
 */
export function definitionsEverRunning(stored, index) {
  return index.get(stored) ?? [];
}

/**
 * Content → the definitions that have held it, over each one's recent history.
 *
 * `revisionsOf(dir)` gives that definition's `<sha>:<path>` refs newest first, and
 * `read(refs)` returns their contents in one go. A definition appears once however many
 * revisions matched: the question is which definition, not which commit.
 */
export function buildHistoryIndex(dirs, revisionsOf, read) {
  const refs = [];
  const owner = new Map();
  for (const dir of dirs) {
    for (const ref of revisionsOf(dir)) {
      refs.push(ref);
      owner.set(ref, dir);
    }
  }

  const index = new Map();
  for (const [ref, content] of read(refs)) {
    const dir = owner.get(ref);
    if (!dir) continue;
    const seen = index.get(content);
    if (!seen) index.set(content, [dir]);
    else if (!seen.includes(dir)) seen.push(dir);
  }
  return index;
}
