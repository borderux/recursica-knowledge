---
name: recursica-skill-dates-and-currency
description: House rules for formatting dates, times, currency, and numeric values in enterprise web applications — whose locale wins, the disambiguated date format, deriving the value from a formatting API rather than slicing a UTC serialisation, when to state a time zone, when not to localize a time at all, relative vs. absolute time and the switchover threshold, right-aligned currency, two-decimal precision, the currency symbol in the column header, accounting parentheses, precision consistency across rows, rounding and abbreviation, date and value ranges, 12- vs 24-hour time, duration formatting, and the format-follows-focus rule. Use whenever a date, time, timestamp, money amount, or number is displayed or entered. Trigger on "date format", "timestamp", "time zone", "relative time", "ago", "duration", "toISOString", "UTC", "currency", "money", "decimal", "precision", "rounding", "date range", or "align the numbers". Do NOT use for table structure — that is recursica-skill-tables.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Dates, currency, and numbers

House rules for formatting temporal and numeric values. These are opinions, not neutral best practices. Apply them as constraints.

Context these rules assume: **complex enterprise web applications, desktop-first**, built on the Recursica design system. Type styles are inherited. Your decisions are format, precision, alignment, and what has to be labeled.

## Governing principles

1. **Never make the reader disambiguate or calculate.** A date the reader has to decode, or a timestamp they have to subtract from now, has pushed work onto them that the format should have absorbed.
2. **Consistency outranks the specific choice.** Same alignment, same precision, same format — across rows, columns, states, and screens. Where a rule below says "right-aligned" and an existing screen is uniformly left-aligned, uniformity is the more important property to preserve.
3. **Say when the data is not in the reader's frame.** A different time zone, a converted currency, a rounded value — the reader must never assume they are seeing the original.

## Whose locale wins

**Always the user's, never the tenant's.** Time is shown in the user's own time zone, and the format follows what the user will understand. There is one exception, below.

## Date format

**MUST use a three-letter month abbreviation, a one-to-two-digit day, and a four-digit year.** `Jan 7, 2026`. `Jun 24, 2026`.

This is the single date format, and its purpose is disambiguation: it reads correctly regardless of the reader's locale conventions.

**NEVER display a date as numbers separated by slashes or hyphens outside a focused input.** `01/07/2026` is ambiguous — a reader cannot tell the month from the day whenever both values could plausibly be either. A spelled month removes the ambiguity entirely, which is why there is no reason to use the numeric form.

**This is the single biggest pet peeve in this topic.** A screen showing numeric slash-or-hyphen dates reads as lazy, because the disambiguated alternative costs nothing.

### Derive the value, never slice a serialisation

**MUST build the displayed value from a date-formatting API in the reader's locale and zone.** In a browser that is `Intl.DateTimeFormat` with **no locale argument** — passing one names a locale the reader did not choose, which is the tenant's locale winning, forbidden above.

**NEVER produce a displayed date by cutting characters out of a machine serialisation.** `toISOString().slice(0, 10)` and its variants are the shape to look for. One line of it breaks two separate rules at once:

- **It is the numeric hyphen form** — `2026-08-10` — which is the format this section prohibits.
- **It is UTC, not the reader's zone.** So it is not merely formatted wrong, it is **the wrong day**: an entry made at 6pm on the 10th west of Greenwich displays as the 11th. Nobody reviewing the screen sees a bug, because a plausible date is showing.

**The second failure is the dangerous one**, and it survives a fix to the first. Reformatting the same UTC string into `Aug 10, 2026` still shows the wrong day. **Correct the source of the value and the format together.**

**Format once, in one place.** A formatter defined per call site is how a screen ends up with three date formats, and building one per row of a table is measurably slow. Construct the formatters once and export them.

**A date-only value is not a timestamp.** Where the stored value carries no time — a birth date, a due date, an accounting period — converting it to the reader's zone shifts it by a day in one direction or the other. Zone conversion applies to instants. If it is not clear which one a field holds, that is a question to ask rather than a default to pick.

## Time zones

**State the time zone explicitly whenever the time shown is not in the user's own zone**, as determined by the browser.

**If the user's time zone cannot be determined, always show the time zone.**

**If the user has switched to a different time zone, label it** so they can see they are not looking at their current zone.

## When not to localize a time at all

**If the reader is looking at something that happened somewhere else, and where it happened matters, show the time in the zone where it occurred — labeled — and do not convert it.**

The example that makes this concrete: a log of a break-in that occurred at 11:00 p.m. local time. Converting that to the reader's zone shows 8:00 p.m., and the reader draws a false conclusion about what time of night it happened. The local time of occurrence is the information.

**Always offer the reader a way to switch it to their own time.** State the zone, do not convert by default, let them convert.

## Relative vs. absolute time

**Use relative time for recent occurrences** — `15 minutes ago`, `today`, `yesterday`, `this week` — wherever greater specificity does not help the reader.

The reason is principle 1: telling someone an event happened at 2:23 p.m. when it is now 2:45 p.m. makes them do arithmetic to learn what they actually wanted to know, which is "recently."

**Above a threshold, switch to the absolute date.** The threshold is a product decision — a few days, a week, a month. With a one-month threshold, `25 days ago` holds until a month has passed, after which the value reads `Jun 24, 2026`.

## Currency

**MUST right-align currency.** The only permitted override is an explicit human instruction to align it differently.

**MUST show two decimal places, always** — `0.00`, `0.01`, `0.99`. Fixed precision is what makes right alignment work: the decimal point lands in the same place on every row.

**The decimal and thousands separators are a localization** — a comma where another locale uses a period. That changes the separator, never the alignment.

**Put the currency symbol in the column header, not in the cells.** `Debits (USD $)` in the header, bare amounts in the column. This is the accounting style, and it removes the reader's need to parse a symbol off the front of every value.

**Label the currency in the cell when the reader is viewing a currency other than the one transacted.** A transaction made in dollars and displayed in Mexican pesos is not the original data, and the cell must say so.

**Negative values may use accounting parentheses.** Where they do, **pad the values so the decimal stays aligned** — a closing parenthesis must not shift the number it wraps.

**Zero is `0` or `0.00`, per localization. Zero is not null.** For genuinely missing values see the null-cell rule in `recursica-skill-tables`.

## Numeric values

**Right-align all numeric values**, currency or not, so that alignment is uniform.

**MUST hold the same precision across every row in a column.** If some values carry a decimal, whole numbers carry it too: `4.5` and `7.0`, never `4.5` and `7`. Mixed precision down a column breaks the alignment the precision exists to produce.

**The only override is an explicit human instruction.**

**Rounding and abbreviation are acceptable when shortening is the intent** — `952` below a thousand, `1.2K` above it. Apply it deliberately, not as a default.

## Ranges

**Show the minimum information that keeps the range unambiguous**, collapsing whatever the two ends share:

| The range                | Format                      |
| ------------------------ | --------------------------- |
| Within one month         | `Jan 1–7, 2026`             |
| Across months, same year | `Jan 1 – Feb 2, 2026`       |
| Across years             | `Jan 1, 2026 – Feb 1, 2027` |

**Currency and numeric ranges take the symbol at the leading value only** — `$5–6` — and **hold the same precision at both ends**: `$5.25–6.00`.

**NEVER mix rounding levels within a range.** `1.2K–1 million` obscures the size of the gap. Where the two ends are orders of magnitude apart, show the full values so the discrepancy is legible.

## Time of day

**12-hour or 24-hour is the user's preference**, carried by their locale or an explicit setting. It is not a design decision, and it is not varied per screen.

## Duration

**A duration is a duration, not a clock time.** Format it with unit labels: `3h 20m`. This holds in every case until the duration crosses one day, at which point the format extends to carry days.

**Never format a duration as a clock time** — `3:20` is a time of day, and the reader has to work out which reading was meant.

**Seconds appear only when the values being shown are sub-minute, across a plurality of objects.** A single duration does not need them, and a set of durations measured in hours does not either. The case for seconds is a list of items whose differences live below the minute — there, dropping seconds would collapse distinct values into the same display.

This is the same precision-consistency rule as elsewhere: **once seconds are shown, every duration in that set shows them**, so the values stay comparable.

## Format follows focus, not editability

There are three states, and the format is decided by **focus**, not by whether a field can be edited:

| State                           | Format                                                                                                     |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Read-only field**             | The disambiguated format — `Jan 7, 2026`. Never numeric                                                    |
| **Editable field, not focused** | The same disambiguated format. Most readable is correct while the user is reading                          |
| **Editable field, focused**     | Switch to the localized masked format — `01/07/2026` — so the user can type quickly against the input mask |

**The numeric slash-or-hyphen form exists only inside a focused input.** That is what makes the read-only prohibition absolute: the ambiguous form is a typing affordance, never a display format. On blur, the field returns to the readable form.

**Alignment must not vary between read-only and editable values on the same screen.** The common failure is left-aligning read-only values so they sit near their label while editable values are right-aligned — on one screen, that reads as two different systems. Right-aligned is the target for numerics, and **uniformity matters more than which alignment wins.**

## Uncovered — ask, do not invent

These come up rarely enough that no house rule exists, and rarely enough that asking costs almost nothing. **Ask the human rather than choosing a format.** See the never-guess rule in `recursica-skill-design-router`.

- **Week, quarter, and fiscal-period conventions.** Week numbering, quarter labels, and whether periods follow the calendar or a fiscal year.
- **How the duration format extends past a day.** Crossing one day changes the format; the exact shape has not been set.
- **Whether seconds ever appear outside a sub-minute comparison set.**

Do not pattern-match one of these to a rule above. A wrong convention in a fiscal period or a week number is the kind of error a reader will not catch.

## Out of scope

- **Type styles, number fonts, and tabular figures.** Owned by the design system.
- **Table structure** — columns, widths, sorting. Covered by `recursica-skill-tables`, which this skill supplies cell formatting for.
- **Null and missing values.** Covered by the null-cell rule in `recursica-skill-tables`.
- **Abbreviating axis labels in charts.** Covered by `recursica-skill-data-visualization`.

## Pre-flight checklist

- [ ] Dates use a three-letter month, one-to-two-digit day, and four-digit year.
- [ ] No read-only date appears as numbers separated by slashes or hyphens.
- [ ] Every displayed date and time is built by a formatting API in the reader's locale and zone — no value is cut
      out of a machine serialisation, and no `toISOString()` slice reaches a screen.
- [ ] Formatters are constructed once and shared, not per call site or per row.
- [ ] Any field holding a date with no time was identified as such and not shifted by a zone conversion.
- [ ] Times are in the user's own zone, not the tenant's.
- [ ] A time zone is stated whenever the value is outside the user's zone, or the user's zone is unknown, or the user has switched zones.
- [ ] Times for events that happened elsewhere are shown in the zone of occurrence, labeled, with a way to convert.
- [ ] Recent events use relative time; a stated threshold switches to the absolute date.
- [ ] Currency is right-aligned, with two decimal places on every value.
- [ ] The currency symbol sits in the column header, not in each cell.
- [ ] Any converted currency is labeled in the cell.
- [ ] Accounting parentheses are padded so decimals stay aligned.
- [ ] All numerics are right-aligned, with identical precision down each column.
- [ ] Ranges collapse shared components, carry one leading currency symbol, and hold consistent precision.
- [ ] No range mixes rounding levels; large gaps show full values.
- [ ] Read-only and unfocused editable fields both use the disambiguated format; only a focused input shows the masked numeric form, reverting on blur.
- [ ] 12- or 24-hour time follows the user's preference and does not vary per screen.
- [ ] Durations use unit labels (`3h 20m`), never a clock format, and extend to days only when they cross a day.
- [ ] Seconds appear only for sub-minute values across a set of objects, and then on every value in that set.
- [ ] Alignment is uniform across read-only and editable values on the same screen.
- [ ] Nothing in the uncovered list — week, quarter, or fiscal conventions, or a duration crossing a day — was formatted without asking.
