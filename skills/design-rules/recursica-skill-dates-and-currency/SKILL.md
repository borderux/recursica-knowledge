---
name: recursica-skill-dates-and-currency
description: House rules for showing and entering dates, times, currency, and numbers — whose locale and time zone win, the unambiguous date format, relative versus absolute time, currency alignment and precision, rounding, ranges, 12- or 24-hour time, durations, and formatting on focus. Use whenever a date, time, amount, or number appears. Not for table structure — see recursica-skill-tables.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Dates, currency, and numbers

This skill sets the house rules for formatting dates, times, and numbers. The house rules are opinions, not neutral best practices. Treat each house rule as a constraint.

The house rules assume **complex enterprise web applications, designed for desktop first**, built on the Recursica design system. The design system sets the type styles. This skill decides the format, the precision, the alignment, and which values need a label.

## Governing principles

1. **Never make the reader decode or calculate.** The format does the work for the reader. A date the reader has to work out, or a timestamp the reader has to subtract from the current time, leaves that work to the reader.
2. **Consistency matters more than the specific choice.** Use the same alignment, the same precision, and the same format across rows, columns, states, and screens. A rule below may say "right-aligned" where an existing screen is left-aligned throughout. Keep that screen uniform, because uniformity takes priority. Currency is the exception: currency is right-aligned unless the user explicitly says otherwise.
3. **Say when a value is not in the reader's own terms.** A value may be in a different time zone, in a converted currency, or rounded. The reader must never assume the value shown is the original.

## Whose locale wins

**Always use the persona's locale, never the tenant's** (the organization whose account the application runs under). Show time in the persona's own time zone. Use a format the persona will understand. The section "Time where an event happened" below gives the one exception.

## Date format

**MUST use a three-letter month abbreviation, a day of one or two digits, and a four-digit year**, as in `Jan 7, 2026` or `Jun 24, 2026`.

Use this one date format for every displayed date. This date format removes confusion. A reader in any region reads the date correctly.

**NEVER display a date as numbers separated by slashes or hyphens, except inside an input that has focus.** `01/07/2026` is ambiguous. A reader cannot tell the month from the day whenever both numbers could reasonably be either one. A spelled-out month removes the confusion completely. A numeric date then serves no purpose.

**The house dislikes a numeric date more than any other mistake in this skill.** A screen that shows numeric dates with slashes or hyphens looks careless, because the clear date format takes no extra effort.

### Date formatters

**MUST build the displayed value with a date formatter, in the reader's locale and time zone.** In a browser, use the browser's built-in date formatter, and never pass the formatter a locale. A locale passed to the formatter is a locale the reader did not choose. The tenant's locale then wins over the reader's locale, and the section "Whose locale wins" above forbids the tenant's locale.

**NEVER make a displayed date by cutting characters out of a machine serialization** (a machine-readable text form of a value, meant for computers to store and exchange, not for people to read). Look for code that takes the first ten characters of a timestamp in UTC (the reference time zone that all other time zones are measured from), or any other cut of that kind. A date cut out of a timestamp breaks two separate rules at once:

- **The cut date is the numeric form with hyphens**, as in `2026-08-10`. The section "Date format" forbids the numeric form.
- **The cut date is in UTC, not the reader's time zone.** The cut date has the wrong format and also the wrong day. An entry made at 6 p.m. on the 10th, west of Greenwich, displays as the 11th. Nobody reviewing the screen sees a bug, because the screen shows a believable date.

**The wrong day is the dangerous problem, because the wrong day remains after the numeric form is fixed.** Reformatting the same UTC string into `Aug 10, 2026` still shows the wrong day. Fix where the value comes from and how the value is formatted, together.

**Format once, in one place.** A separate formatter in every place that formats a value is how a screen ends up with three date formats. A new formatter for every table row also makes the screen measurably slow. Create each formatter once and export the formatter.

**A date with no time is not a timestamp.** Some stored values are a date with no time, such as a birth date, a due date, or an accounting period. Converting a date with no time to the reader's time zone moves the date one day earlier or later. Convert the time zone only for an exact moment in time. When the kind of value a field holds is not clear, ask. Do not pick a default.

## Time zones

**State the time zone clearly whenever the time shown is not in the persona's own time zone.** The browser reports the persona's own time zone.

**When the persona's time zone cannot be found, always show the time zone.**

**When the persona has switched to a different time zone, label the time zone.** The label shows the persona that the times are not in the persona's current time zone.

## Time where an event happened

**When the reader looks at an event in another place, and the place matters, show the event's time in the time zone where the event happened.** Label the time zone, and do not convert the time.

For example, a log records a break-in at 11:00 p.m. local time. Converted to the reader's time zone, the log shows 8:00 p.m. The reader then draws the wrong conclusion about what time of night the break-in happened. The local time of the break-in is the information the reader needs.

**Always give the reader a way to switch the time to the reader's own time zone.** State the time zone, do not convert by default, and let the reader convert the time.

## Relative and absolute time

**Use relative time for recent events**, such as `15 minutes ago`, `today`, `yesterday`, or `this week`, wherever more detail does not help the reader.

Relative time follows principle 1, "Never make the reader decode or calculate." An event shown at 2:23 p.m., read at 2:45 p.m., makes the reader do math to learn what the reader wanted to know: "recently."

**Past a cutoff of one week, switch to the absolute date.** Within the last week, show the value in relative terms: `now`, `5 minutes ago`, `16 hours ago`, `yesterday`, `3 days ago`. At a week and beyond, show the absolute date, as in `Jun 24, 2026`. A product may change the cutoff with a stated reason. Without a stated reason, a week is the house rule, not a decision to reopen on each screen.

**Use the platform's relative-time formatter, not hand-written strings.** In a browser, use the browser's built-in relative-time formatter, set to write `yesterday` instead of `1 day ago`. The formatter writes `yesterday` in every locale. A hand-written string covers only the one language the string was written in.

**Keep every relative value below the cutoff.** Rounding can push a value to the cutoff: a value 6.9 days old shows `7 days ago`. A value one hour older, in the same column, shows an absolute date. Cap the largest relative value below the cutoff.

**Relative time never shows seconds.** A value under a minute old shows `now`. The rule on seconds under "Duration" allows seconds only for a set of values under a minute that the reader compares. A single timestamp is not a set of values.

**A relative value is calculated when the screen shows the value, and the relative value does not update by itself.** A screen may stay open a long time and never reload the screen's data. The relative value then goes out of date, and the reader cannot see that the relative value is out of date. Either refresh the relative value, or use the absolute form. Do not leave a page saying `now` an hour later.

## Currency

**MUST right-align currency.** The only allowed exception is an explicit instruction from the user to align currency differently.

**MUST show two decimal places, always**: `0.00`, `0.01`, `0.99`. Fixed precision makes right alignment work, because the decimal point lands in the same place on every row.

**The decimal separator and the thousands separator follow the locale.** One locale uses a comma where another locale uses a period. The locale changes the separator, never the alignment.

**Put the currency symbol in the column header, not in the cells.** For example, the column header says `Debits (USD $)`, and the cells in the column show plain amounts. This layout is the accounting style. The reader does not have to read past a symbol at the front of every value.

**Label the currency in the cell when the reader views a currency other than the currency of the transaction.** A transaction made in dollars and shown in Mexican pesos is not the original data, and the cell must say so.

**Negative values may use accounting parentheses.** When negative values use accounting parentheses, pad the values so the decimal points stay lined up. A closing parenthesis must not push the number inside the parentheses out of line.

**Zero is `0` or `0.00`, depending on the locale. Zero is not null.** For values that are truly missing, see the null-cell rule in `recursica-skill-tables`.

## Numeric values

**Right-align all numbers**, currency or not, so the alignment is uniform.

**MUST keep the same precision on every row in a column.** When some values in a column have a decimal, every whole number in the column gets a decimal too: `4.5` and `7.0`, never `4.5` and `7`. Mixed precision down a column breaks the alignment that the fixed precision exists to create.

**The only exception is an explicit instruction from the user.**

**MUST group digits once a value reaches four figures.** Write `2,046`, never `2046`. Group the digits of every quantity a reader might compare or read out loud, such as counts, totals, and row tallies, not only money. A reader reads an ungrouped four-figure number one digit at a time. Two ungrouped numbers in a column cannot be compared at a glance, and comparing at a glance is the whole reason the column is right-aligned.

**Let the platform choose the digit separator, because the digit separator depends on the locale.** Use the platform's built-in number formatter. The separator is a comma in one locale, and a period or a thin space in another. Never insert commas with a hand-written regex (a search pattern written in code). A hand-written regex puts the wrong separator in every locale except the one locale the regex was written for. A hand-written regex is the same kind of mistake as cutting a date out of a machine serialization.

**NEVER group an identifier.** A year, a version, a port, an account number, a record number, and a postal code are identifiers: write `2026`, not `2,026`. Grouping marks a value as a quantity the reader can compare. On an identifier, grouping makes a false claim, and the reader believes the false claim for a moment. When doing math on a value makes no sense, the value is not a number for the grouping rule.

**Rounding and abbreviating are acceptable when the goal is to shorten a number**: `952` below a thousand, `1.2K` above a thousand. Round or abbreviate on purpose, not by default. Grouping is the default.

## Ranges

**Show the least information that keeps a range clear.** Drop the parts the two ends of the range have in common:

| The range                | Format                      |
| ------------------------ | --------------------------- |
| Within one month         | `Jan 1–7, 2026`             |
| Across months, same year | `Jan 1 – Feb 2, 2026`       |
| Across years             | `Jan 1, 2026 – Feb 1, 2027` |

**A currency range or a number range puts the symbol on the first value only**, as in `$5–6`. Both ends keep the same precision: `$5.25–6.00`.

**NEVER mix levels of rounding within a range.** `1.2K–1 million` hides how big the gap is. When the two ends are wildly different in size, show the full values so the reader sees the difference easily.

## Time of day

**The choice of 12-hour or 24-hour time is the persona's preference**, set by the persona's locale or by an explicit setting. The 12- or 24-hour choice is not a design decision, and the choice does not change from screen to screen.

## Duration

**A duration is a length of time, not a clock time.** Format a duration with unit labels, as in `3h 20m`. Use this format for every duration until the duration passes one day. Past one day, the format extends to include days.

**Never format a duration as a clock time.** `3:20` is a time of day, and the reader has to work out which meaning was intended.

**Seconds appear only when the values shown are under a minute, across several objects.** A single duration does not need seconds. A set of durations measured in hours does not need seconds either. Seconds belong in a list of items whose differences are smaller than a minute. In that list, dropping the seconds would make different values look the same.

**Once seconds are shown, every duration in that set shows seconds.** The same precision rule applies to durations as to every other value, so the reader can still compare the durations.

## Field format and focus

**Focus decides the format of a field, not whether the field can be edited.** A field has three states:

| State                             | Format                                                                                                                                                                 |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Read-only field**               | The clear format, as in `Jan 7, 2026`. Never numeric                                                                                                                   |
| **Editable field, without focus** | The same clear format. The most readable format is correct while the persona is reading                                                                                |
| **Editable field, with focus**    | Switch to the local masked format, as in `01/07/2026`, so the persona can type quickly into the input mask (a pattern in the field that guides what the persona types) |

**The numeric form with slashes or hyphens exists only inside an input that has focus.** The numeric form is an aid for typing, never a display format. The ban on read-only numeric dates is absolute for that reason. When the field loses focus, the field goes back to the readable form.

**Read-only values and editable values on the same screen must use the same alignment.** A common mistake is to left-align read-only values near the read-only values' labels, while editable values are right-aligned. On one screen, the two alignments look like two different design systems. Right-aligned is the goal for numbers. A uniform alignment matters more than which alignment is chosen.

## Open questions

**Confirm with the user instead of choosing a format for the topics below.** The topics come up rarely enough that no house rule exists, and rarely enough that asking costs almost nothing. See the never-guess rule in `recursica-skill-design-router`.

- **Conventions for weeks, quarters, and fiscal periods.** Ask how weeks are numbered, how quarters are labeled, and whether periods follow the calendar year or a fiscal year.
- **The duration format past one day.** A duration past one day changes format, but the exact form has not been set.
- **Seconds outside a set of compared values.** Ask whether seconds ever appear outside a set of values under a minute that are being compared.

Do not extend a rule above to cover one of these open questions. A reader will not catch a wrong convention in a fiscal period or a week number.

## Out of scope

- **Type styles, number fonts, and tabular figures.** The design system sets type styles, number fonts, and tabular figures.
- **Table structure**, such as columns, widths, and sorting. `recursica-skill-tables` covers table structure. This skill sets the cell formatting for `recursica-skill-tables`.
- **Null and missing values.** The null-cell rule in `recursica-skill-tables` covers null and missing values.
- **Abbreviating variant labels in charts.** `recursica-skill-data-visualization` covers abbreviating variant labels in charts.

## Pre-flight checklist

- [ ] Dates use a three-letter month, a day of one or two digits, and a four-digit year.
- [ ] No read-only date appears as numbers separated by slashes or hyphens.
- [ ] Every displayed date and time is built by a formatter, in the reader's locale and time zone. No value is cut out of a machine serialization, and no date cut from a UTC timestamp reaches a screen.
- [ ] Each formatter is created once and shared, not defined separately in each place that uses a formatter or created for each row.
- [ ] Every date field is identified as a date with no time or an exact moment, and no time-zone conversion shifts a date with no time.
- [ ] Times are in the persona's own time zone, not the tenant's.
- [ ] A time zone is stated whenever the value is outside the persona's time zone, the persona's time zone is unknown, or the persona has switched time zones.
- [ ] Times for events that happened in another place are shown in the time zone where each event happened, labeled, with a way to convert the times.
- [ ] Recent events use relative time within one week, and the absolute date after one week. The relative text comes from the platform's relative-time formatter, no relative value reaches the cutoff, and no seconds are shown.
- [ ] Every quantity of four figures or more has grouped digits, from a formatter in the reader's locale. No plain `2046` appears, and no hand-written comma regex is used. No identifier, year, version, or port is grouped.
- [ ] Currency is right-aligned, with two decimal places on every value.
- [ ] The currency symbol is in the column header, not in each cell.
- [ ] Any converted currency is labeled in the cell that shows the converted currency.
- [ ] Accounting parentheses are padded so the decimal points stay lined up.
- [ ] All numbers are right-aligned, with the same precision all the way down each column.
- [ ] Ranges drop the parts both ends share, carry one currency symbol at the start, and keep the same precision at both ends.
- [ ] No range mixes levels of rounding, and a range with a large gap shows the full values.
- [ ] Read-only fields and editable fields without focus both use the clear format. Only an input with focus shows the masked numeric form, and the input switches back when focus leaves.
- [ ] 12-hour or 24-hour time follows the persona's preference, and the choice does not change from screen to screen.
- [ ] Durations use unit labels (`3h 20m`), never a clock format, and a duration extends to days only after the duration passes one day.
- [ ] Seconds appear only for values under a minute across a set of objects, and then on every value in that set.
- [ ] Alignment is uniform across read-only values and editable values on the same screen.
- [ ] Open questions were asked about, not decided: week, quarter, or fiscal conventions, or a duration that passes one day.
