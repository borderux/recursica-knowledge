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

/** `Aug 10, 2026`, in the reader's locale and zone. Null when there is nothing to show. */
export function formatDate(value) {
  const date = toDate(value)
  return date && DATE.format(date)
}

/** `Aug 10, 2026, 4:31 PM`, in the reader's locale and zone. */
export function formatDateTime(value) {
  const date = toDate(value)
  return date && DATE_TIME.format(date)
}
