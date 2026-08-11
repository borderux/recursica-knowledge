// What counts as an identity an edit can be recorded against.
//
// **This is attribution, not authentication** — see identity.mjs. Nothing here proves anyone is
// who they say they are; it decides only what shape of name the audit trail will accept.
//
// Two shapes, because Stu runs in two places:
//
//   pubkey  64 lowercase hex characters. A Buzz identity. Preferred wherever one exists, since
//           it is stable across a display-name or email change.
//   email   Anywhere else. Nothing outside Buzz has a pubkey, and requiring one meant a person
//           running the app from a checkout could not record an edit at all — which is the only
//           thing the app exists to let them do.
//
// The two cannot be confused: an email always contains "@" and a hex pubkey never does. That is
// what makes it safe for both to live in the `users.pubkey` column without a discriminator
// alongside. `users.email` was already NOT NULL, so an email-shaped identity stores the same
// value in both columns — redundant, but never ambiguous.
//
// One consequence, stated because it is not obvious: the same human reaching one dataset both
// through Buzz and from a checkout appears as two identities, and nothing merges them. In
// practice a dataset is used one way or the other. If that stops being true, the fix is a
// deliberate alias table, not a looser match here.

const PUBKEY = /^[0-9a-f]{64}$/
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

/** 'pubkey' | 'email' | null. null means it is not usable as an identity. */
export function actorIdKind(value) {
  if (typeof value !== 'string') return null
  if (PUBKEY.test(value)) return 'pubkey'
  if (EMAIL.test(value)) return 'email'
  return null
}

export function isActorId(value) {
  return actorIdKind(value) !== null
}

export function isEmail(value) {
  return typeof value === 'string' && EMAIL.test(value)
}

/**
 * The wording used by every rejection, so a person gets the same explanation from the launcher,
 * the API and the browser rather than three different guesses at what they did wrong.
 */
export const ACTOR_ID_EXPECTED =
  'an identity must be an email address, or a 64-character lowercase hex Buzz pubkey (not an npub)'
