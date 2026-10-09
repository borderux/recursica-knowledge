---
name: recursica-skill-dates-and-currency
description: House rules for showing and entering dates, times, currency, and numbers — whose locale and time zone win, the unambiguous date format, relative versus absolute time, currency alignment and precision, rounding, ranges, 12- or 24-hour time, durations, and formatting on focus. Use whenever a date, time, amount, or number appears. Not for table structure — see recursica-skill-tables.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Dates, currency, and numbers

Follow each house rule below for dates, times, and numbers. The house rules are opinions, not neutral best practices.

The house rules assume **complex enterprise web applications, designed for desktop first**, built on the Recursica design system. The design system sets the type styles. This skill decides the format, the precision, the alignment, and which values need a label.

## Governing principles

1. **Never make the persona decode or calculate.** Show each value in a form the persona can read at a glance. For example:
   - The date `01/07/2026` makes the persona work out which number is the month.
   - The time `2:23 p.m.` makes the persona subtract from the current time to learn how long ago the event was.
2. **Consistency matters more than the specific choice.** Use the same alignment, the same precision, and the same format across rows, columns, states, and screens. For example, a rule below says "right-aligned", but an existing screen is left-aligned throughout. Keep that screen uniform, because uniformity matters more than the rule. Currency is the exception. Right-align currency unless the user explicitly says otherwise.
3. **Say when a value is not in the persona's own terms.** Say so when a value is:

   - in a different time zone
   - in a converted currency
   - rounded

   The persona must never assume that the value shown is the original value.

## Whose locale wins

**Always use the persona's locale, never the tenant's** (the organization whose account the application runs under). For example, a persona with a German locale, using a US company's account, sees German number formats.

- Show time in the persona's own time zone.
- Use a format the persona will understand.

The section "Time where an event happened" below gives the one exception.

## Date format

**MUST use a three-letter month abbreviation, a day of one or two digits, and a four-digit year**, as in `Jan 7, 2026` or `Jun 24, 2026`.

Use this one format for every date shown on a screen. A persona in any region reads this format correctly.

**NEVER display a date as numbers separated by slashes or hyphens, except inside an input that has focus.** `01/07/2026` is January 7 in the US and July 1 in the UK. When both numbers could be either the month or the day, the persona cannot tell which is which. A spelled-out month removes the doubt completely, so a numeric date serves no purpose.

**The house dislikes a numeric date more than any other mistake in this skill.** A screen with slashed or hyphenated dates looks careless, because the clear format takes no extra effort.

### Date formatters

**MUST build the displayed value with a date formatter, in the persona's locale and time zone.** A date formatter is code that turns a date or a time into text for a screen. In a browser, use the browser's built-in date formatter, and never pass the formatter a locale.

A locale passed to the formatter is a locale the persona did not choose. The tenant's locale then wins, which the section "Whose locale wins" forbids.

**NEVER make a displayed date by cutting characters out of a machine serialization.** A machine serialization is text that computers store and exchange, such as `2026-08-10T01:00:00Z`. A machine serialization is not meant for people to read. The `Z` marks UTC, the time zone that all other time zones are measured from.

Look for code that keeps the first ten characters of a UTC timestamp, and any other cut of that kind. A date cut out of a timestamp breaks two separate rules at once:

- **The cut date is the numeric form with hyphens**, as in `2026-08-10`. The section "Date format" forbids the numeric form.
- **The cut date is the date in UTC, not in the persona's time zone.** The cut date has the wrong format and also the wrong day. An entry made at 6 p.m. west of Greenwich displays as the next day. For example, 6 p.m. on Aug 9 in Los Angeles is Aug 10 in UTC. Nobody reviewing the screen sees a bug, because the screen shows a believable date.

**Fix where the value comes from and how the value is formatted, together.** The wrong day is the dangerous problem, because the wrong day remains after the numeric form is fixed. Reformatting the same UTC text into `Aug 10, 2026` still shows the wrong day.

**Format once, in one place.** Create each formatter once and export the formatter for every place that formats a value.

- A separate formatter in every place that formats a value gives a screen three date formats.
- A new formatter for every table row also makes the screen measurably slow.

**A date with no time is not a timestamp.** A birth date, a due date, and an accounting period are dates with no time. Convert the time zone only for a timestamp, which is an exact moment in time. Converting a date with no time to the persona's time zone moves the date one day earlier or later.

If the kind of value a field holds is not clear, confirm with the user. Do not pick a default.

## Time zones

**State the time zone clearly whenever the time shown is not in the persona's own time zone.** The browser reports the persona's own time zone.

**If the persona's time zone cannot be found, always show the time zone.**

**If the persona has switched to a different time zone, label the time zone.** The label shows the persona that the times are not in the persona's current time zone.

## Time where an event happened

**If an event happened in another place and the place matters, show the event's time in the event's time zone.** Label the time zone, and do not convert the time.

For example, a log records a break-in at 11:00 p.m. local time. Converted to the persona's time zone, the log shows 8:00 p.m. The persona then draws the wrong conclusion about what time of night the break-in happened. The local time of the break-in is the information the persona needs.

**Always give the persona a way to switch the time to the persona's own time zone.** Do not convert by default. Let the persona choose to convert the time.

## Relative and absolute time

**Use relative time for recent events**, such as `15 minutes ago`, `today`, `yesterday`, or `this week`, wherever more detail does not help the persona.

Relative time follows principle 1: never make the persona decode or calculate. An event shown as `2:23 p.m.` and read at 2:45 p.m. makes the persona subtract. The answer to the subtraction is what the persona wanted to know: "recently."

**Past a cutoff of one week, switch to the absolute date.**

- Within the last week, show relative time: `now`, `5 minutes ago`, `16 hours ago`, `yesterday`, `3 days ago`.
- At a week and beyond, show the absolute date, as in `Jun 24, 2026`.

A product may change the cutoff with a stated reason. Without a stated reason, a week is the house rule, not a decision to reopen on each screen.

**Use the platform's relative-time formatter, not hand-written strings.** In a browser, use the browser's built-in relative-time formatter. Set the formatter to write `yesterday` instead of `1 day ago`. The formatter writes `yesterday` in every locale. A hand-written string covers only the one language the string was written in.

**Keep every relative value below the cutoff.** Rounding can push a value to the cutoff. For example, a value 6.9 days old shows `7 days ago`. A value one hour older, in the same column, shows an absolute date. Cap the largest relative value below the cutoff.

**Relative time never shows seconds.** A value under a minute old shows `now`. The section "Duration" allows seconds only for a set of values under a minute that the persona compares. A single timestamp is not a set of values.

**Either refresh a relative value, or use the absolute form.** For example, do not leave a page saying `now` an hour later.

- A relative value is calculated once, when the screen shows the value. The relative value does not update by itself.
- A screen may stay open a long time without reloading the screen's data. The relative value then goes out of date.
- The persona cannot see that the relative value is out of date.

## Currency

**MUST right-align currency.** The only allowed exception is an explicit instruction from the user to align currency differently.

**MUST show two decimal places, always**: `0.00`, `0.01`, `0.99`. With a fixed number of decimal places, the decimal point lands in the same place on every row. Right alignment then lines up the amounts.

**The decimal separator and the thousands separator follow the locale.** For example, the US writes `1,250.00`, and Germany writes `1.250,00`. The locale changes the separators, never the alignment.

**Put the currency symbol in the column header, not in the cells.** For example, the column header says `Debits (USD $)`, and the cells in the column show plain amounts. This layout is the accounting style. The persona does not have to read past a symbol at the front of every value.

**If the persona views a currency other than the currency of the transaction, label the currency in the cell.** For example, a transaction made in US dollars and shown in Mexican pesos is not the original data. The cell must say that the amount is not the original data.

**Negative values may use accounting parentheses**, as in `(45.00)`. If negative values use accounting parentheses, pad the values so the decimal points stay lined up. A closing parenthesis must not push the number inside the parentheses out of line.

**Zero is `0` or `0.00`, depending on the locale. Zero is not null.** Null means the value is missing. For values that are truly missing, see the null-cell rule in `recursica-skill-tables`.

## Numeric values

**Right-align all numbers**, currency or not, so the alignment is uniform.

**MUST keep the same precision on every row in a column.** If some values in a column have a decimal, give every whole number in the column a decimal too. Write `4.5` and `7.0`, never `4.5` and `7`. Mixed precision down a column breaks the alignment that fixed precision creates.

**The only exception is an explicit instruction from the user.**

**MUST group digits once a value reaches four figures.** Write `2,046`, never `2046`. Group the digits of every quantity a persona might compare or read out loud, not only money. Examples are:

- counts
- totals
- row tallies

A persona reads an ungrouped four-figure number one digit at a time. Two ungrouped numbers in a column cannot be compared at a glance. Comparing at a glance is the whole reason the column is right-aligned.

**Let the platform choose the digit separator, because the digit separator depends on the locale.** Use the platform's built-in number formatter. The separator is a comma in one locale, and a period or a thin space in another. Never insert commas with a hand-written regex (a search pattern written in code). A hand-written regex puts the wrong separator in every locale except the one locale the regex was written for. A hand-written regex is the same kind of mistake as cutting a date out of a machine serialization.

**NEVER group an identifier.** Write `2026`, not `2,026`. Identifiers include:

- a year
- a version
- a port
- an account number
- a record number
- a postal code

Grouping marks a value as a quantity the persona can compare. On an identifier, grouping makes a false claim, and the persona believes the false claim for a moment. If doing math on a value makes no sense, the value is not a number for the grouping rule.

**Rounding and abbreviating are acceptable when the goal is to shorten a number**: `952` below a thousand, `1.2K` above a thousand. Round or abbreviate on purpose, not by default. Grouping is the default.

## Ranges

**Show the least information that keeps a range clear.** Drop the parts the two ends of the range have in common:

| The range                | Format                      |
| ------------------------ | --------------------------- |
| Within one month         | `Jan 1–7, 2026`             |
| Across months, same year | `Jan 1 – Feb 2, 2026`       |
| Across years             | `Jan 1, 2026 – Feb 1, 2027` |

**In a currency range or a number range, put the symbol on the first value only**, as in `$5–6`. Keep the same precision at both ends: `$5.25–6.00`.

**NEVER mix levels of rounding within a range.** `1.2K–1 million` hides how big the gap is. If the two ends are wildly different in size, show the full values so the persona sees the difference easily.

## Time of day

**Let the persona's preference decide 12-hour or 24-hour time.** The persona's locale or an explicit setting sets the preference. The 12- or 24-hour choice is not a design decision. The 12- or 24-hour choice does not change from screen to screen.

## Duration

**A duration is a length of time, not a clock time.** For example, the time a job took to run is a duration. Format a duration with unit labels, as in `3h 20m`. Use this format for every duration until the duration passes one day. Past one day, the format extends to include days.

**Never format a duration as a clock time.** `3:20` looks like a time of day. The persona has to work out whether `3:20` means a time or a length of time.

**Show seconds only when the values shown are under a minute, across several objects.** For example, a list of test runs that took `42s`, `48s`, and `55s` shows seconds.

- A single duration does not need seconds.
- A set of durations measured in hours does not need seconds either.
- Seconds belong in a list of items whose differences are smaller than a minute. In that list, dropping the seconds would make different values look the same.

**Once seconds are shown, show seconds on every duration in that set.** The same precision rule applies to durations as to every other value. The same precision lets the persona compare the durations.

## Field format and focus

**Focus decides the format of a field, not whether the field can be edited.** A field has focus when the field is ready for typing. For example, the persona clicks or tabs into the field. A field has three states:

| State                             | Format                                                                                                                                                                                   |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Read-only field**               | The clear format, as in `Jan 7, 2026`. Never numeric                                                                                                                                     |
| **Editable field, without focus** | The same clear format. The most readable format is correct while the persona is reading                                                                                                  |
| **Editable field, with focus**    | Switch to the local masked format, as in `01/07/2026`. The persona can then type quickly into the input mask. An input mask is a pattern in the field that guides what the persona types |

**The numeric form with slashes or hyphens exists only inside an input that has focus.** The numeric form is an aid for typing, never a display format. The ban on read-only numeric dates is absolute for that reason. When the field loses focus, switch the field back to the readable form.

**Read-only values and editable values on the same screen must use the same alignment.** A common mistake is to left-align read-only values next to the values' labels, while editable values are right-aligned. On one screen, the two alignments look like two different design systems. Right-aligned is the goal for numbers. A uniform alignment matters more than which alignment is chosen.

## Open questions

**Confirm with the user instead of choosing a format for the topics below.** The topics come up rarely enough that no house rule exists, and rarely enough that asking costs almost nothing. See the never-guess rule in `recursica-skill-design-router`.

- **Conventions for weeks, quarters, and fiscal periods.** Confirm with the user how weeks are numbered and how quarters are labeled. Also confirm whether periods follow the calendar year or a fiscal year.
- **The duration format past one day.** A duration past one day changes format, but the exact form has not been set.
- **Seconds outside a set of compared values.** Confirm with the user whether seconds ever appear outside a set of values under a minute that are being compared.

Do not extend a rule above to cover one of these open questions. A persona will not catch a wrong convention in a fiscal period or a week number.

## Out of scope

- **Type styles, number fonts, and tabular figures.** The design system sets type styles, number fonts, and tabular figures.
- **Table structure**, such as columns, widths, and sorting. `recursica-skill-tables` covers table structure. This skill sets the cell formatting for `recursica-skill-tables`.
- **Null and missing values.** The null-cell rule in `recursica-skill-tables` covers null and missing values.
- **Abbreviating variant labels in charts.** `recursica-skill-data-visualization` covers abbreviating variant labels in charts.

## Pre-flight checklist

- [ ] Dates use a three-letter month, a day of one or two digits, and a four-digit year.
- [ ] No read-only date appears as numbers separated by slashes or hyphens.
- [ ] Every displayed date and time is built by a formatter, in the persona's locale and time zone. No value is cut out of a machine serialization, and no date cut from a UTC timestamp reaches a screen.
- [ ] Each formatter is created once and shared. No formatter is defined separately in each place that uses a formatter, or created for each row.
- [ ] Every date field is identified as a date with no time or as an exact moment. No time-zone conversion shifts a date with no time.
- [ ] Times are in the persona's own time zone, not the tenant's.
- [ ] A time zone is stated for every value outside the persona's time zone. A time zone is also stated when the persona's time zone is unknown. A time zone is also stated when the persona has switched time zones.
- [ ] Times for events that happened in another place are shown in the time zone where each event happened. The times are labeled, with a way to convert the times.
- [ ] Recent events use relative time within one week, and the absolute date after one week. The relative text comes from the platform's relative-time formatter, no relative value reaches the cutoff, and no seconds are shown.
- [ ] Every quantity of four figures or more has grouped digits, from a formatter in the persona's locale. No plain `2046` appears, and no hand-written comma regex is used. No identifier, year, version, or port is grouped.
- [ ] Currency is right-aligned, with two decimal places on every value.
- [ ] The currency symbol is in the column header, not in each cell.
- [ ] Any converted currency is labeled in the cell that shows the converted currency.
- [ ] Accounting parentheses are padded so the decimal points stay lined up.
- [ ] All numbers are right-aligned, with the same precision all the way down each column.
- [ ] Ranges drop the parts both ends share and carry one currency symbol at the start. Both ends of a range keep the same precision.
- [ ] No range mixes levels of rounding, and a range with a large gap shows the full values.
- [ ] Read-only fields and editable fields without focus both use the clear format. Only an input with focus shows the masked numeric form, and the input switches back when focus leaves.
- [ ] 12-hour or 24-hour time follows the persona's preference, and the choice does not change from screen to screen.
- [ ] Durations use unit labels (`3h 20m`), never a clock format. A duration extends to days only after the duration passes one day.
- [ ] Seconds appear only for values under a minute across a set of objects. Once seconds appear, every value in that set shows seconds.
- [ ] Alignment is uniform across read-only values and editable values on the same screen.
- [ ] Open questions were asked about, not decided: week, quarter, or fiscal conventions, or a duration that passes one day.
