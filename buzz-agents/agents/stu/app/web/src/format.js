// Date and time formatting for the whole app, in one place.
//
// `recursica-skill-dates-and-currency` fixes both halves of this and the app was getting both
// wrong from the same line of code:
//
//   1. **The format.** A three-letter month, a one-to-two-digit day, a four-digit year —
//      `Aug 10, 2026`. The numeric slash-or-hyphen form is forbidden outside a focused input,
//      because a reader cannot tell the month from the day. The skill calls it out as the single
//      biggest pet peeve in the topic.
//   2. **The zone.** Times are shown in the *user's* zone. `toISOString()` is UTC, so an edit
//      made at 6pm on the 10th in California was displaying as the 11th — not a formatting
//      nicety but a wrong date, and worse in a tool whose whole job is provenance.
//
// Both come free from `Intl.DateTimeFormat` with no locale argument: it resolves the browser's
// own locale and zone, which is what "whose locale wins: always the user's" means. Passing
// 'en-US' here would be the tenant's locale winning, which the skill forbids.
//
// The formatters are built once — constructing an `Intl.DateTimeFormat` per cell is the slow
// way to do this, and a table renders hundreds.

const DATE = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
})

// Hour and minute only. No seconds: the skill admits them only for sub-minute values across a
// set of objects, and an edit log is not that. 12- or 24-hour is left to the locale, because the
// skill makes it the user's preference rather than a design decision.
const DATE_TIME = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

/** BigQuery hands timestamps back as `{ value }`; everything else arrives as a bare string. */
function toDate(value) {
  const raw = value?.value ?? value
  if (!raw) return null
  const date = new Date(raw)
  return Number.isNaN(date.getTime()) ? null : date
}

// Relative time, for the recent end. `recursica-skill-dates-and-currency` prefers it wherever
// greater specificity does not help the reader — being told an edit happened at 2:23pm when it is
// now 2:45pm makes the reader do the subtraction to learn the thing they wanted, which is
// "just now".
//
// **The threshold is one week**, decided by the owner on 2026-08-11 and recorded in that skill.
// It is not a value to re-derive here.
//
// The wording comes from `Intl.RelativeTimeFormat`, not from us: `numeric: 'auto'` is what turns
// -1 day into "yesterday" rather than "1 day ago", and it does it per locale. Writing those
// strings by hand would be inventing copy in one language.
const RELATIVE = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })

const SECOND = 1000
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const RELATIVE_THRESHOLD = 7 * DAY

function relative(deltaMs) {
  const magnitude = Math.abs(deltaMs)
  // Under a minute reads "now". Seconds are deliberately not shown: the skill admits them only
  // for a set of sub-minute values being compared, and one timestamp is not that.
  if (magnitude < MINUTE) return RELATIVE.format(0, 'second')
  if (magnitude < HOUR) return RELATIVE.format(Math.round(deltaMs / MINUTE), 'minute')
  if (magnitude < DAY) return RELATIVE.format(Math.round(deltaMs / HOUR), 'hour')
  // Rounding at the top of the range would report "7 days ago" for something 6.9 days old, sitting
  // next to a value one hour older showing an absolute date. Clamp so the relative form never names
  // the threshold it is bounded by.
  const days = Math.min(6, Math.round(magnitude / DAY))
  return RELATIVE.format(deltaMs < 0 ? -days : days, 'day')
}

/**
 * When something happened: relative within the last week, the absolute date beyond it.
 *
 * @param withTime  Include the clock time in the absolute form. A log of changes wants it; a
 *                  column headed with a date does not.
 *
 * One known limit: the relative string is computed at render and does not tick. Every screen here
 * refetches on a write, so it is never more stale than the data beside it.
 */
export function formatWhen(value, { withTime = false } = {}) {
  const date = toDate(value)
  if (!date) return null
  const delta = date.getTime() - Date.now()
  if (Math.abs(delta) < RELATIVE_THRESHOLD) return relative(delta)
  return (withTime ? DATE_TIME : DATE).format(date)
}

// Digit grouping for counts — `recursica-skill-dates-and-currency`, "Numeric values": a quantity
// of four figures or more is grouped, in the reader's locale, by the platform. `2,046`, not `2046`.
// Built once for the same reason the date formatters are: a table renders hundreds of cells.
//
// No locale argument, so the separator is the reader's — a comma here, a period or a thin space
// elsewhere. A hand-rolled comma regex would be right in one locale and wrong in the rest.
const COUNT = new Intl.NumberFormat()

/**
 * A quantity. Not for identifiers: the skill forbids grouping a year, a version, a port or a
 * record number, because grouping claims the value is comparable and on an identifier that is
 * false.
 */
export function formatCount(value) {
  const n = Number(value ?? 0)
  return Number.isFinite(n) ? COUNT.format(n) : String(value ?? '')
}

/**
 * Part of a whole, as one value — `11 / 34`. Two columns the reader would otherwise subtract
 * become one with the arithmetic done, per `recursica-skill-naming-terminology`. Both halves are
 * grouped; the divisor is a quantity too.
 */
export function formatRatio(part, whole) {
  return `${formatCount(part)} / ${formatCount(whole)}`
}
