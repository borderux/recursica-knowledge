---
name: recursica-skill-dates-and-currency
description: House rules for showing and entering dates, times, currency, and numbers — whose locale and time zone win, the unambiguous date format, relative versus absolute time, currency alignment and precision, rounding, ranges, 12- or 24-hour time, durations, and formatting on focus. Use whenever a date, time, amount, or number appears. Not for table structure — see recursica-skill-tables.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Dates, currency, and numbers

These are the house rules for formatting dates, times, and numbers. They are opinions, not neutral best practices. Treat them as constraints.

These rules assume **complex enterprise web applications, designed for desktop first**, built on the Recursica design system. Type styles are already handled. Your decisions are the format, the precision, the alignment, and what has to be labeled.

## Governing principles

1. **Never make the reader decode or calculate.** A date the reader has to figure out, or a timestamp they have to subtract from the current time, pushes work onto them that the format should have done.
2. **Consistency matters more than the specific choice.** Use the same alignment, the same precision, and the same format across rows, columns, states, and screens. Where a rule below says "right-aligned" and an existing screen is left-aligned throughout, keeping it uniform is the more important thing to protect — except for currency, which is right-aligned unless a person explicitly says otherwise.
3. **Say when the data is not in the reader's own terms.** A different time zone, a converted currency, a rounded value — the reader must never assume they are seeing the original.

## Whose locale wins

A locale is the language and regional settings a person uses, such as date and number formats.

**Always the user's, never the tenant's** (the organization whose account the application runs under). Show time in the user's own time zone, and use a format the user will understand. There is one exception, below.

## Date format

**MUST use a three-letter month abbreviation, a day of one or two digits, and a four-digit year.** `Jan 7, 2026`. `Jun 24, 2026`.

This is the single date format, and its purpose is to remove confusion: it reads correctly no matter which regional conventions the reader follows.

**NEVER display a date as numbers separated by slashes or hyphens, except inside an input that has focus.** `01/07/2026` is ambiguous — a reader cannot tell the month from the day whenever both numbers could reasonably be either one. Spelling out the month removes the confusion completely, so there is no reason to use the numeric form.

**This is the single biggest pet peeve in this topic.** A screen showing numeric dates with slashes or hyphens looks lazy, because the clear alternative costs nothing.

### Derive the value, never slice a serialization

A serialization is a machine-readable text form of a value, meant for computers to store and exchange rather than for people to read.

**MUST build the displayed value with a date-formatting API, in the reader's locale and time zone.** In a browser, that is `Intl.DateTimeFormat` with no locale argument. Passing a locale names one the reader did not choose — which means the tenant's locale wins, and that is forbidden above.

**NEVER make a displayed date by cutting characters out of a machine serialization.** `toISOString().slice(0, 10)` and its variations are the pattern to look for. That one line breaks two separate rules at once:

- **It is the numeric form with hyphens** — `2026-08-10` — which is the format this section forbids.
- **It is in UTC, not the reader's time zone.** (UTC is the reference time zone that all other time zones are measured from.) So it is not just formatted wrong — it is the wrong day. An entry made at 6pm on the 10th, west of Greenwich, displays as the 11th. Nobody reviewing the screen sees a bug, because a believable date is showing.

**The second problem is the dangerous one**, and it survives a fix to the first. Reformatting the same UTC string into `Aug 10, 2026` still shows the wrong day. Fix where the value comes from and how it is formatted, together.

**Format once, in one place.** Defining a formatter separately wherever it is used is how a screen ends up with three date formats. Building one for every row of a table is also measurably slow. Create the formatters once and export them.

**A date with no time is not a timestamp.** When the stored value has no time in it — a birth date, a due date, an accounting period — converting it to the reader's time zone moves it by a day in one direction or the other. Time-zone conversion applies only to exact moments in time. If it is not clear which kind a field holds, ask; do not pick a default.

## Time zones

**State the time zone clearly whenever the time shown is not in the user's own time zone**, as the browser reports it.

**If the user's time zone cannot be found, always show the time zone.**

**If the user has switched to a different time zone, label it**, so they can see they are not looking at their current zone.

## When not to localize a time at all

**If the reader is looking at something that happened somewhere else, and where it happened matters, show the time in the time zone where it happened — labeled — and do not convert it.**

Here is the example that makes this concrete: a log of a break-in that happened at 11:00 p.m. local time. Converting that to the reader's time zone shows 8:00 p.m., and the reader draws the wrong conclusion about what time of night it happened. The local time when it happened is the information.

**Always give the reader a way to switch it to their own time.** State the time zone, do not convert by default, and let them convert it.

## Relative vs. absolute time

**Use relative time for recent events** — `15 minutes ago`, `today`, `yesterday`, `this week` — wherever more detail does not help the reader.

The reason is principle 1. Telling someone an event happened at 2:23 p.m. when it is now 2:45 p.m. makes them do math to learn what they actually wanted to know: "recently."

**Past a certain point, switch to the absolute date.**

**That point is one week.** Within the last week, a value is shown in relative terms — `now`, `5 minutes ago`, `16 hours ago`, `yesterday`, `3 days ago`. At a week and beyond, it is shown as the absolute date, `Jun 24, 2026`. A product may change this with a stated reason. Without one, a week is the house rule, not a decision to reopen on each screen.

**Use the platform's relative formatter, not strings you write by hand.** In a browser, that is `Intl.RelativeTimeFormat`, and its `numeric: "auto"` setting is what produces `yesterday` instead of `1 day ago` — in each locale, which hand-written text cannot do. Writing those strings yourself translates the screen into only one language.

**Do not let the relative form reach the cutoff itself.** Rounding at the top of the range shows `7 days ago` for a value that is 6.9 days old, in the same column as a value an hour older that shows an absolute date. Cap the largest relative value below the cutoff.

**Seconds do not appear here.** Anything under a minute reads `now`. The precision-consistency rule below allows seconds only for a set of values under a minute that are being compared, and a single timestamp is not that.

**A relative value is calculated when it is drawn on screen, and it does not update itself.** On a screen that stays open a long time and never reloads its data, this becomes stale in a way the reader cannot see. Either refresh it, or use the absolute form. Do not leave a page saying `now` an hour later.

## Currency

**MUST right-align currency.** The only allowed exception is an explicit instruction from a person to align it differently.

**MUST show two decimal places, always** — `0.00`, `0.01`, `0.99`. Fixed precision is what makes right alignment work: the decimal point lands in the same place on every row.

**The decimal and thousands separators follow the locale** — a comma where another locale uses a period. That changes the separator, never the alignment.

**Put the currency symbol in the column header, not in the cells.** `Debits (USD $)` goes in the header, with plain amounts in the column. This is the accounting style, and it spares the reader from reading a symbol off the front of every value.

**Label the currency in the cell when the reader is viewing a currency other than the one used in the transaction.** A transaction made in dollars and shown in Mexican pesos is not the original data, and the cell must say so.

**Negative values may use accounting parentheses.** Where they do, pad the values so the decimal points stay lined up — a closing parenthesis must not push the number it wraps out of line.

**Zero is `0` or `0.00`, depending on the locale. Zero is not null.** For values that are truly missing, see the null-cell rule in `recursica-skill-tables`.

## Numeric values

**Right-align all numbers**, currency or not, so the alignment is uniform.

**MUST keep the same precision on every row in a column.** If some values have a decimal, whole numbers get one too: `4.5` and `7.0`, never `4.5` and `7`. Mixing precision down a column breaks the alignment that the precision exists to create.

**The only exception is an explicit instruction from a person.**

**MUST group digits once a value reaches four figures.** `2,046`, never `2046`. This applies to every quantity a reader might compare or read out loud — counts, totals, row tallies — not only to money. An ungrouped four-figure number is read one digit at a time, and two of them in a column cannot be compared at a glance — which is the whole reason the column is right-aligned.

**The separator belongs to the locale, so let the platform choose it.** Use `Intl.NumberFormat` or `toLocaleString`: a comma in one locale, a period or a thin space in another. Never write your own regex to insert commas. It produces the wrong separator everywhere the locale is not yours, and it is the same kind of mistake as slicing a date serialization.

**NEVER group an identifier.** A year, a version, a port, an account or record number, a postcode: `2026`, not `2,026`. Grouping says "this is a quantity you may compare." On an identifier that claim is false, and the reader believes it for a moment. If doing math on the value makes no sense, it is not a number for this purpose.

**Rounding and abbreviating are acceptable when the goal is to shorten** — `952` below a thousand, `1.2K` above it. Do it deliberately, not by default. Grouping is the default; abbreviating is a deliberate choice.

## Ranges

**Show the least information that still keeps the range clear**, and drop whatever the two ends have in common:

| The range                | Format                      |
| ------------------------ | --------------------------- |
| Within one month         | `Jan 1–7, 2026`             |
| Across months, same year | `Jan 1 – Feb 2, 2026`       |
| Across years             | `Jan 1, 2026 – Feb 1, 2027` |

**Currency and number ranges put the symbol on the first value only** — `$5–6` — and keep the same precision at both ends: `$5.25–6.00`.

**NEVER mix levels of rounding within a range.** `1.2K–1 million` hides how big the gap is. Where the two ends are wildly different in size, show the full values so the difference is easy to see.

## Time of day

**Whether time is 12-hour or 24-hour is the user's preference**, set by their locale or by an explicit setting. It is not a design decision, and it does not change from screen to screen.

## Duration

**A duration is a length of time, not a clock time.** Format it with unit labels: `3h 20m`. This holds in every case until the duration passes one day. At that point, the format extends to include days.

**Never format a duration as a clock time.** `3:20` is a time of day, and the reader has to work out which meaning was intended.

**Seconds appear only when the values shown are under a minute, across a plurality of objects** (several of them). A single duration does not need seconds, and a set of durations measured in hours does not need them either. The case for seconds is a list of items whose differences are smaller than a minute. There, dropping the seconds would make different values look the same.

This is the same precision-consistency rule as everywhere else: **once seconds are shown, every duration in that set shows them**, so the values can still be compared.

## Format follows focus, not editability

There are three states. The format depends on **focus** — not on whether the field can be edited:

| State                             | Format                                                                                              |
| --------------------------------- | --------------------------------------------------------------------------------------------------- |
| **Read-only field**               | The clear format — `Jan 7, 2026`. Never numeric                                                     |
| **Editable field, without focus** | The same clear format. The most readable format is correct while the user is reading                |
| **Editable field, with focus**    | Switch to the local masked format — `01/07/2026` — so the user can type quickly into the input mask |

An input mask is a pattern in the field that guides what the user types.

**The numeric form with slashes or hyphens exists only inside an input that has focus.** That is what makes the ban on read-only numeric dates absolute: the ambiguous form is an aid for typing, never a display format. When the field loses focus, it goes back to the readable form.

**Alignment must not vary between read-only and editable values on the same screen.** A common mistake is left-aligning read-only values so they sit near their labels, while editable values are right-aligned. On one screen, that looks like two different systems. Right-aligned is the goal for numbers, and being uniform matters more than which alignment wins.

## Uncovered — ask, do not invent

These come up rarely enough that no house rule exists — and rarely enough that asking costs almost nothing. **Ask the person instead of choosing a format.** See the never-guess rule in `recursica-skill-design-router`.

- **Conventions for weeks, quarters, and fiscal periods.** How weeks are numbered, how quarters are labeled, and whether periods follow the calendar year or a fiscal year.
- **How the duration format extends past one day.** Passing one day changes the format, but the exact form has not been set.
- **Whether seconds ever appear outside a set of values under a minute that are being compared.**

Do not stretch a rule above to fit one of these. A wrong convention in a fiscal period or a week number is the kind of mistake a reader will not catch.

## Out of scope

- **Type styles, number fonts, and tabular figures.** Owned by the design system.
- **Table structure** — columns, widths, sorting. Covered by `recursica-skill-tables`, which this skill provides cell formatting for.
- **Null and missing values.** Covered by the null-cell rule in `recursica-skill-tables`.
- **Abbreviating axis (a property a component varies on, such as size or style; Figma calls it a variant property) labels in charts.** Covered by `recursica-skill-data-visualization`.

## Pre-flight checklist

- [ ] Dates use a three-letter month, a day of one or two digits, and a four-digit year.
- [ ] No read-only date appears as numbers separated by slashes or hyphens.
- [ ] Every displayed date and time is built by a formatting API, in the reader's locale and time zone. No value is cut out of a machine serialization, and no `toISOString()` slice reaches a screen.
- [ ] Formatters are created once and shared, not separately wherever they are used or for each row.
- [ ] You identified every field that holds a date with no time, and a time-zone conversion does not shift it.
- [ ] Times are in the user's own time zone, not the tenant's.
- [ ] A time zone is stated whenever the value is outside the user's time zone, the user's time zone is unknown, or the user has switched time zones.
- [ ] Times for events that happened elsewhere are shown in the time zone where they happened, labeled, with a way to convert them.
- [ ] Recent events use relative time within one week and the absolute date after that. The relative text comes from the platform's relative formatter, no relative value reaches the cutoff, and no seconds are shown.
- [ ] Every quantity of four figures or more has its digits grouped by a formatting API in the reader's locale — no plain `2046`, and no home-made comma regex. No identifier, year, version, or port is grouped.
- [ ] Currency is right-aligned, with two decimal places on every value.
- [ ] The currency symbol is in the column header, not in each cell.
- [ ] Any converted currency is labeled in its cell.
- [ ] Accounting parentheses are padded so the decimal points stay lined up.
- [ ] All numbers are right-aligned, with the same precision all the way down each column.
- [ ] Ranges drop the parts both ends share, carry one currency symbol at the start, and keep the same precision at both ends.
- [ ] No range mixes levels of rounding, and ranges with a large gap show the full values.
- [ ] Read-only fields and editable fields without focus both use the clear format. Only an input with focus shows the masked numeric form, and it switches back when focus leaves.
- [ ] 12-hour or 24-hour time follows the user's preference, and it does not change from screen to screen.
- [ ] Durations use unit labels (`3h 20m`), never a clock format, and extend to days only when they pass one day.
- [ ] Seconds appear only for values under a minute across a set of objects — and then on every value in that set.
- [ ] Alignment is uniform across read-only and editable values on the same screen.
- [ ] You asked before formatting anything on the uncovered list: week, quarter, or fiscal conventions, or a duration that passes one day.
