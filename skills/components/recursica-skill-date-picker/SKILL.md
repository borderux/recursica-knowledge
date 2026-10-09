---
name: recursica-skill-date-picker
description: Rules for the Recursica date picker — when a calendar helps and when typing is better, states and label placement, the readable date format, time zones, and calendar popover accessibility. Use for date fields and calendars. Not for a time of day — see recursica-skill-time-picker; formatting rules live in recursica-skill-dates-and-currency.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Date picker

A date picker records one calendar date. The persona types the date or picks the date from a calendar.

> **The date picker is built in the Mantine adapter only.** The UI kit (the token file, `recursica_ui-kit.json`, that says which variants and states each component has) has 34 date picker tokens (named design values, such as colors or sizes, set by the design system). The Mantine adapter applies 31 of the 34 tokens. The MUI adapter has an empty style file for the date picker, and applies none of the 34 tokens. On MUI, the date picker appears unstyled, and no error appears. The rules below are correct for the UI kit. Confirm which adapter the application uses before relying on how the date picker looks.

## When to use a date picker

- **The value is one calendar date**, such as a due date, a start date, or an effective date.
- **Picking from a calendar helps the persona.** The persona is thinking about one of the following:

  - weekdays, such as the next Friday
  - how close two dates are
  - where a date falls in the month

  The persona is not recalling a date the persona already knows.

- **The date is close to today.** The persona reaches the date in the calendar in one or two steps. For example, a date next month is one step away.

## When not to use a date picker

In each situation below, use the alternative in the right column. Never adapt a date picker to fit the situation.

| Situation                                                   | Use instead                                                                                                 |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| The value is a time of day                                  | A time picker. See `recursica-skill-time-picker`.                                                           |
| The persona already knows the date by heart                 | A text field, with the format stated in help text. See `recursica-skill-text-field`.                        |
| The date is far in the past, such as a birth date           | A text field. Never make the persona page a calendar back through decades.                                  |
| The value is a relative or rough time, such as "in 30 days" | No date at all. Record the relative time as a number plus a unit, such as 30 and "days".                    |
| The value can never be edited where the value is shown      | A read-only field, which shows the label and the text with no input. See `recursica-skill-read-only-field`. |
| A date is only shown, in a table or a detail view           | Formatted text. See `recursica-skill-dates-and-currency`.                                                   |

**Use separate inputs, not a date picker, for a complex or partial date.** Use separate inputs, with the format stated, for each of the following dates:

- a month and year, such as a card's expiry date
- a quarter, such as Q3 2026
- a fiscal period
- a date the persona builds from parts

Never use a calendar for a complex or partial date.

**Never use a disabled date picker to show a date.** A date that nobody can ever edit where the date is shown needs no form control.

## Variants

**Use only the date picker variants and options that the Recursica MCP server lists for the theme (the design a designer sets in Theme Forge: the token values, and each component's variants, states and sizes).** A designer can add variants and options in Theme Forge, so each theme can differ. Never invent a variant or an option.

**Get the list with the server's `recursica_get_component_doc` tool.** Use the names the code uses. A wrong name in code has no effect and shows no error.

Each option below is described by role, such as "the error state". The names in Figma and in the standard UI kit (the unchanged UI kit in the official Recursica release) are examples only.

**Label placement is a variant.** A field's label sits beside the field or above the field. In the standard UI kit, the variant is `layouts`, with the options `side-by-side` and `stacked`. The label beside the field is the house default. The label above the field is the fallback when the form's container is too narrow for both side by side. The container's width decides, not the viewport's width. See `recursica-skill-forms`.

**Set label placement explicitly on every field.** The house rule puts the label beside the input. The code library under an adapter may put the label above the input by default, at every container width. Set the label beside the input on every field. Use the names the code uses for the variant and the option.

**Never build a focus state or a placeholder state.** Every Recursica field already shows the focus border and the placeholder text.

- **The date picker has an error state and a disabled state.** In the standard UI kit, the variant is `states`, with the options `error` and `disabled`.
- **If the theme has a range variant, use the range variant for a date range.** A range variant takes a start date and an end date, such as a trip's first and last days. If the theme has no range variant, confirm with the user before building a control for a date range.
- **Show a read-only date with the read-only field component, never with a read-only state of the date picker.** A value nobody can edit does not belong in a form control. The read-only field has the same label-placement variant as the date picker, and no input.

## Rules

**Always give the date picker a visible label, set in the date picker component.** Name exactly what the field holds, as in "Start date", not "Date". A persona using a screen reader hears the label alone, without the headings, text, or layout around the field. Write the label in sentence case, with no colon at the end.

**A date and a time together are one control with one label.** A date picker, a time entry, and an AM/PM choice may share one line of a form. The three inputs share one label, such as "Meeting start". The three inputs hold one value. No other inputs share one line of a form. `recursica-skill-forms` sets this rule.

**Label placement is one decision per form, not per field.** This field uses the same label placement as every other field in the form. Apply the container-width test once, to the whole form. The result sets the placement of every field in the form. Short fields like this one that would fit side by side follow the result too. A form may change placement at a breakpoint. A form never mixes placements at one breakpoint. A form section never gets a separate placement. `recursica-skill-forms` sets this rule.

**A date picker without focus shows the readable format: `Jan 7, 2026`.** The readable format is a three-letter month, a day of one or two digits, and a four-digit year. The readable format is the only display format.

**The numeric format appears only inside an input that has focus.** The numeric format uses slashes or hyphens, as in `01/07/2026`. The numeric format helps the persona match the mask (the pattern in the field that guides what the persona types). When the date picker loses focus, the date picker shows the readable format again. See `recursica-skill-dates-and-currency`.

**Focus decides the format, never whether the field can be edited.** For example, an editable date picker without focus shows `Jan 7, 2026`, not `01/07/2026`.

**Never show a numeric date outside an input that has focus.** The rule covers a field without focus, a read-only field, and a table. For example, `01/07/2026` can mean January 7 or July 1. A spelled-out month adds only a few characters, and shows clearly whether the day or the month comes first.

**The date picker must always accept a typed date. Typing is never optional.**

- Typing is faster for a persona who knows the date.
- Typing is the only way some personas can enter a date.

The calendar speeds up entering a date. The calendar never replaces typing.

**State the expected format in help text.** The mask is visual only, and the mask does not name the format.

**Use the persona's locale and the persona's time zone, never the locale or time zone of the tenant** (the organization whose account the application runs under). For example, a persona in Denver sees Mountain Time, even when the tenant uses Eastern Time. State the time zone in each of the following cases:

- The date is in a time zone other than the persona's.
- The persona's time zone cannot be found.
- The persona has switched time zones.

**Pre-fill only today's date, and only when today's date is the date being recorded.** For example, pre-fill "Date received" with today's date when the persona logs a delivery as the delivery arrives. Leave the date picker empty for any date the persona would have to think about or check. A pre-filled date that nobody checked gets submitted without a check.

**On error, replace the help text with the error message. Do not add the error message to the help text.** Replacing the help text keeps the field the same height, so the form below the field does not shift. The error message must restate the rule, as in "Enter a date on or after Jan 7, 2026", not "Invalid date".

**Pair the error state with a signal that is not color**, either an icon or the error message. `recursica-skill-system-conventions` requires the second signal.

**A disabled date picker and a read-only field are different components, not two styles of one component.**

- **A disabled date picker is still a field and still looks like an input.** The persona cannot use a disabled date picker yet. Use a disabled date picker when the persona can make the field usable by taking a different action first. For example, "Ship date" stays disabled until the persona picks a shipping method.
- **A read-only field is a different component, with a label and text and no input.** Use a read-only field when the persona viewing the field never edits the value where the value is shown. For example, a record's "Created on" date is a read-only field.

## Accessibility

The rules below add to the accessibility baseline in `recursica-skill-system-conventions`, which every Recursica component follows.

The application builds the calendar trigger (the control that opens the calendar) and the calendar popover. Date pickers most often fail at the calendar trigger and the calendar popover. Follow the rules below for the calendar trigger and the calendar popover. The date picker component connects the label to the input and shows the focus ring.

### Screen readers

- **Set a real label in the date picker component.** Never let placeholder text be the accessible name (the name a screen reader reads out for a control). A screen reader does not announce placeholder text as a label, and placeholder text disappears when the persona types. A field with no label has no accessible name.
- **Name the calendar icon when the icon is a control**, as in "Choose date". Hide a decorative calendar icon from screen readers. A screen reader announces an unlabeled clickable icon without saying what the icon does.
- **State the expected format in the help text.** The mask that appears on focus is visual only. A persona using a screen reader gets nothing from the mask. State `MM/DD/YYYY` in words the persona can act on.
- **State the time zone in text** whenever the time zone matters. A persona cannot learn a time zone that the screen only implies.
- **The error message is the text a screen reader announces.** The error message replaces the help text, and becomes the only text the screen reader reads. The error message must state the rule, including the format.

### Keyboard and non-mouse navigation

- **Never remove the field from the tab order.** Never make reaching the field depend on a mouse or another pointer.
- **The calendar trigger is a separate tab stop** (a place the Tab key lands), and works with Enter or Space. Never build a calendar trigger that responds only to clicks.
- **Typing must always work.** The calendar popover is never the only way to enter a date. A persona using a keyboard must be able to type the date and move on, without ever opening the calendar.
- **The calendar popover must be fully usable by keyboard.**

  - The calendar popover opens from the keyboard.
  - The arrow keys move between dates, and Enter selects a date.
  - Escape closes the calendar popover and returns focus to the field the calendar popover opened from.

  Never leave focus in a closed calendar popover, and never drop focus to the top of the page.

- **Never move focus ahead automatically between the parts of a date.** For example, never move focus from month to day to year as the persona types. An automatic jump moves focus to a part of the date the persona did not choose. A persona using a keyboard or a screen reader is then left in that part of the date. An automatic jump also moves focus away from a persona fixing a typo.
- **Do not move focus for the persona** when a value looks complete. For example, focus does not jump to the next field after the persona types a full date. When the calendar popover closes, do not move focus into a different field.

## Styling set by tokens

**Never set or override the date picker's styling.** The theme sets every visual property of the date picker, such as size, spacing, borders, colors and animation. Do not add extra containers or spacers to change the date picker's look. If the theme does not give a look the design needs, report a gap in the design system. See `recursica-skill-design-router`.

**Do not set or override the date picker's built-in behavior.** The built-in behavior is the link between the label and the input, and what each key does inside the field. The date picker component sets both behaviors.

**Never style a date picker without focus to look disabled.** An editable date picker must look editable when the date picker does not have focus.

## Related skills

- `recursica-skill-dates-and-currency` — the date format, time zones, relative versus absolute time, date ranges, and the rule that focus decides the date format.
- `recursica-skill-forms` — the form rules for fields:
  - label placement and one placement per form
  - the exception for a date and time on one line
  - validation timing
  - pre-fill
  - save mode
  - the rule that no form control goes inside a card
- `recursica-skill-label` — the label component, the label-placement variant, and marking a field as required or optional.
- `recursica-skill-assistive-element` — the help text and error text below the field, and why the error text replaces the help text.
- `recursica-skill-system-conventions` — showing meaning in more than one way.

### Only if used on the same screen

- `recursica-skill-text-field` — the control to use when a calendar does not help the persona enter the date.

## Open questions

- **Date ranges.** No rule says whether a date range is two date pickers or one control. No rule says how the start date and the end date are checked against each other.
- **What the calendar popover contains.** The design-system website shows a month-and-year dropdown, navigation arrows, and Cancel and Confirm buttons in the calendar popover. No rule says whether clicking a date saves the date, or whether the persona must press Confirm. Do not rely on any content in the calendar popover without confirming with the user.
- **Whether the calendar opens on focus**, or only when the persona activates the calendar trigger.
- **The earliest and latest dates the persona can pick, and dates that are unavailable inside the calendar.**
- **Conventions for weeks, quarters, and fiscal periods.** See the same entry in `recursica-skill-dates-and-currency`.

## Pre-flight checklist

- [ ] The value is one calendar date, close enough to today that a calendar helps.
- [ ] Dates the persona knows by heart, or dates far in the past, use a text field instead.
- [ ] Every date picker has a visible label, set in the date picker component. The label makes sense without the headings, text, or layout around the field. A date and a time on one line are one control with one label.
- [ ] Label placement is side by side, unless the container is too narrow.
- [ ] Label placement matches every other field in the same form. Each form has one placement at each breakpoint, with no mixing between fields or form sections.
- [ ] Each date picker without focus shows the readable format, as in `Jan 7, 2026`. The numeric format appears only while the date picker has focus, and the readable format returns when focus leaves.
- [ ] The expected format is stated in help text, and the time zone is stated wherever the time zone matters.
- [ ] Typing works without ever opening the calendar.
- [ ] Only today's date is pre-filled, and only when today's date is the date being recorded.
- [ ] Help text and error text are set through the date picker component. The error message replaces the help text and restates the rule.
- [ ] The error state has a signal that is not color.
- [ ] The calendar trigger has an accessible name, is a separate tab stop, and works with Enter or Space. Decorative icons are hidden from screen readers.
- [ ] The calendar popover opens from the keyboard, and the arrow keys move between dates. Escape closes the calendar popover and returns focus to the field.
- [ ] Focus never jumps ahead automatically between the parts of a date, and is never moved for the persona.
- [ ] Every variant and state is one the Recursica MCP server lists for the theme. No size variant, range variant, or inline calendar is added unless the Recursica MCP server lists one for the theme.
- [ ] No styling is set or overridden on the date picker. No container or spacer is added to change the date picker's look.
- [ ] Every field without focus looks editable, not disabled.
- [ ] Dates that are not editable where the dates are shown use the read-only field, not a disabled date picker.
- [ ] Open questions were asked about, not decided: date ranges, what the calendar popover contains, whether the calendar opens on focus, the earliest and latest dates and unavailable dates, and conventions for weeks, quarters, and fiscal periods.
