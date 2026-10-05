---
name: recursica-skill-date-picker
description: Rules for the Recursica date picker — when a calendar helps and when typing is better, states and label placement, the readable date format, time zones, and calendar popover accessibility. Use for date fields and calendars. Not for a time of day — see recursica-skill-time-picker; formatting rules live in recursica-skill-dates-and-currency.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Date picker

A date picker records one calendar date. The user types the date or picks the date from a calendar.

> **The date picker is built in the Mantine adapter only.** The UI kit (the token file, `recursica_ui-kit.json`, that says which variants and states each component has) exports 34 date picker tokens (named design values, such as colors or sizes, set by the design system). The Mantine adapter applies 31 of the 34 tokens. The MUI adapter has an empty style file for the date picker and applies none of the 34 tokens. On MUI, the date picker shows up unstyled, with no error. The rules in this skill are correct for the UI kit. Confirm which adapter the application uses before relying on how the date picker looks.

## When to use a date picker

- **The value is one calendar date**, such as a due date, a start date, or an effective date.
- **Picking from a calendar helps the user.** The user is thinking about weekdays, how close two dates are, or where a date falls in the month. The user is not recalling a date the user already knows.
- **The date is close to today.** The calendar reaches the date in a step or two.

## When not to use a date picker

In each situation below, use the alternative in the right column. Never adapt a date picker to fit the situation.

| Situation                                                   | Use instead                                                                                                 |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| The value is a time of day                                  | A time picker. See `recursica-skill-time-picker`.                                                           |
| The user already knows the date by heart                    | A text field, with the format stated in help text. See `recursica-skill-text-field`.                        |
| The date is far in the past, such as a birth date           | A text field. Never make the user page a calendar back through decades.                                     |
| The value is a relative or rough time, such as "in 30 days" | No date at all. Record the offset as a number plus a unit.                                                  |
| The value can never be edited in this place                 | A read-only field, which shows the label and the text with no input. See `recursica-skill-read-only-field`. |
| A date is only shown, in a table or a detail view           | Formatted text. See `recursica-skill-dates-and-currency`.                                                   |

**Use separate inputs, not a date picker, for a complex or partial date.** A month and year, a quarter, a fiscal period, or a date the user builds from parts needs separate inputs with the format stated. Never use a calendar for these dates.

**Never use a disabled date picker to show a date.** A date that nobody can ever edit in this place needs no form control.

## Variants

**Use only the date picker variants and options that the Recursica MCP server lists for the project.** A designer can add variants and options in Theme Forge, so each project can differ. Get the list with the server's `recursica_get_component_doc` tool, and use the names the code uses. A wrong name in code has no effect and shows no error. Never invent a variant or an option.

The rules below describe each option by role, such as "the error state". The names in Figma and in the standard UI kit (the unchanged UI kit in the official Recursica release) are examples only.

**Label placement is a variant.** A field's label sits beside the field or above the field. In the standard UI kit, the variant is `layouts`, with the options `side-by-side` and `stacked`. The label beside the field is the house default. The label above the field is the fallback when the form's container is too narrow for both side by side. The container's width decides, not the viewport's width. See `recursica-skill-forms`.

**Set label placement explicitly on every field.** The house rule puts the label beside the input. The code library under an adapter may put the label above the input by default, at every container width. Set the label beside the input on every field, using the names the code uses for the variant and the option.

**Never build a focus state or a placeholder state.** Every Recursica field already shows the focus border and the placeholder text.

- **An error state and a disabled state.** In the standard UI kit, the variant is `states`, with the options `error` and `disabled`.
- **Date range.** A range variant takes a start date and an end date. If the project has a range variant, use the range variant. Otherwise, do not build a range control without asking.
- **Read-only date.** Show a read-only date with the read-only field component, never with a read-only state of the date picker. A value nobody can edit does not belong in a form control. The read-only field has the same label-placement variant and no input.

## Rules

**Always give the date picker a visible label, set in the date picker component.** Name the object clearly, as in "Start date", not "Date". A screen reader user hears the label alone, without the headings, text, or layout around the field. Use sentence case, with no colon at the end of the label.

**A date and a time together are one control with one label.** A date picker, a time entry, and an AM/PM choice on one line of a form are the only case where inputs share one line. The three inputs hold one value. `recursica-skill-forms` sets this rule.

**Label placement is one decision per form, not per field.** This field uses the same label placement as every other field in the form. Apply the container-width test once, to the whole form. The result sets the placement of every field in the form, including short fields like this one that would fit side by side. A form may change placement at a breakpoint, but a form never mixes placements at one breakpoint, and a form section never gets a separate placement. `recursica-skill-forms` sets this rule.

**At rest, the field shows the readable format: `Jan 7, 2026`.** The readable format is a three-letter month, a day of one or two digits, and a four-digit year. The readable format is the only display format.

**The numeric format, with slashes or hyphens, appears only inside an input that has focus.** `01/07/2026` helps the user type against the mask (the pattern in the field that guides what the user types). When the field loses focus, the field goes back to the readable format. Focus decides the format. Whether the field can be edited never decides the format. See `recursica-skill-dates-and-currency`.

**Never show a numeric date outside an input that has focus.** This rule covers a field at rest, a read-only field, and a table. A spelled-out month adds only a few characters, and shows clearly whether the day or the month comes first.

**Typing is never optional.** Typing is faster for a user who knows the date, and typing is the only way some users can enter a date. The calendar speeds up entry. The calendar never replaces typing.

**State the expected format in help text.** The mask is visual only, and the mask does not name the format.

**Use the user's locale and the user's time zone, never the locale or time zone of the tenant** (the organization whose account the application runs under). State the time zone whenever the value is outside the user's time zone, the user's time zone cannot be found, or the user has switched time zones.

**Pre-fill only today's date, and only when today's date is the date being recorded.** Leave the field empty for any date the user would have to think about or check. A default date that nobody checked gets submitted without a check.

**On error, replace the help text with the error message. Do not add the error message to the help text.** Replacing the help text keeps the field the same height, so the form below the field does not shift. The error message must restate the rule. "Invalid date" is not an error message. "Enter a date on or after Jan 7, 2026" is an error message.

**Pair the error state with a signal that is not color**, either an icon or the error message. `recursica-skill-system-conventions` requires the second signal.

**A disabled date picker and a read-only field are different components, not two styles of one component.**

- **Disabled date picker.** A disabled date picker is still a field, and still looks like an input, but the user cannot use the field yet. Use a disabled date picker when the user can make the field usable by taking a different action first.
- **Read-only field.** A read-only field is a different component. A read-only field shows a label and text, with no input. Use a read-only field when the current user never edits the value in this place.

## Accessibility

The rules below add to the accessibility baseline in `recursica-skill-system-conventions`, which every Recursica component follows.

The date picker component connects the label to the input and provides the focus ring. Date pickers most often fail at the calendar trigger (the control that opens the calendar) and at the calendar popover. The application builds the calendar trigger and the popover. Follow the rules below for both.

### Screen readers

- **Set a real label in the date picker component.** Never let placeholder text be the accessible name (the name a screen reader reads out for a control). A screen reader does not announce placeholder text as a label, and placeholder text disappears when the user types. A field with no label has no accessible name.
- **Name the calendar icon when the icon is a control**, as in "Choose date". Hide a decorative calendar icon from screen readers. A screen reader announces an unlabeled clickable icon without saying what the icon does.
- **State the expected format in the help text.** The mask that appears on focus is visual only, and a screen reader user gets nothing from the mask. State `MM/DD/YYYY` in words the user can act on.
- **State the time zone in text** whenever the time zone matters. A user cannot learn a time zone that the screen only implies.
- **The error message is the text a screen reader announces.** The error message replaces the help text, and becomes the only text the screen reader reads. The error message must state the rule, including the format.

### Keyboard and non-mouse navigation

- **Never remove the field from the tab order**, and never make reaching the field depend on a pointer.
- **The calendar trigger is a separate tab stop** (a place the Tab key lands), and works with Enter or Space. Never build a calendar trigger that responds only to clicks.
- **Typing must always work.** The popover is never the only way to enter a value. A keyboard user must be able to type the date and move on, without ever opening the calendar.
- **The popover must be fully usable by keyboard.** The popover opens from the keyboard. The arrow keys move between dates, and Enter selects a date. Escape closes the popover and returns focus to the field the popover opened from. Never leave focus in a closed popover, and never drop focus to the top of the page.
- **Never move focus ahead automatically between the parts of a date**, such as from month to day to year as the user types. An automatic jump leaves keyboard users and screen reader users in a part of the date the user did not choose. An automatic jump also moves focus away from a user fixing a typo.
- **Do not move focus for the user** when a value looks complete. When the popover closes, do not move focus into a different field.

## Styling set by tokens

**Do not set or override the date picker properties below.** The date picker component sets each property.

- `border-radius`, `min-height`, `horizontal-padding`, `vertical-padding`, `border-size`.
- `width`, plus the field sizing from `globals.form.field.size`.
- `icon-size` and `icon-text-gap`.
- `text` styling and `placeholder-opacity`.
- `colors` per layer (a numbered background level, 0 to 3, that sets the colors of the components on that level), including the focused border from `globals.form.field.colors.border-selected` and the global disabled look from `globals.states.disabled`.
- The gaps between the label and the field, and `vertical-item-gap`, from `globals.form.properties`.
- The link between the label and the input, and what each key does inside the field.

**Never style a date picker without focus to look disabled.** An editable field must look editable at rest.

## Related skills

- `recursica-skill-dates-and-currency` — the date format, time zones, relative versus absolute time, date ranges, and the rule that focus decides the date format.
- `recursica-skill-forms` — label placement and one placement per form, the exception for a date and time on one line, validation timing, pre-fill, save mode, and the rule that no form control goes inside a card.
- `recursica-skill-label` — the label component, the label-placement variant, and marking a field as required or optional.
- `recursica-skill-assistive-element` — the help text and error text below the field, and why the error text replaces the help text.
- `recursica-skill-system-conventions` — showing meaning in more than one way.

### Only if used on the same screen

- `recursica-skill-text-field` — the control to use when a calendar does not help the user enter the date.

## Open questions

- **Date ranges.** Whether a date range is two date pickers or one control is not stated. How the start date and the end date are checked against each other is not stated.
- **What the popover contains.** The design-system website shows a month-and-year dropdown, navigation arrows, and Cancel and Confirm buttons in the popover. Whether a click saves the selected date, or the user must press Confirm, is not stated. Do not rely on any popover content without asking.
- **Whether the calendar opens on focus**, or only when the user activates the calendar trigger.
- **The earliest and latest dates the user can pick, and dates that are unavailable inside the calendar.**
- **Conventions for weeks, quarters, and fiscal periods.** See the same entry in `recursica-skill-dates-and-currency`.

## Pre-flight checklist

- [ ] The value is one calendar date, close enough to today that a calendar helps.
- [ ] Dates the user knows by heart, or dates far in the past, use a text field instead.
- [ ] Every date picker has a visible label, set in the date picker component, that makes sense without the headings, text, or layout around the field. A date and a time on one line are one control with one label.
- [ ] Label placement is side by side, unless the container is too narrow.
- [ ] Label placement matches every other field in the same form, with one placement per form at each breakpoint and no mixing between fields or form sections.
- [ ] The field shows `Jan 7, 2026` at rest. The numeric format appears only while the field has focus, and goes back to the readable format when focus leaves.
- [ ] The expected format is stated in help text, and the time zone is stated wherever the time zone matters.
- [ ] Typing works without ever opening the calendar.
- [ ] Only today's date is pre-filled, and only when today's date is the date being recorded.
- [ ] Help text and error text are set through the date picker component. The error message replaces the help text and restates the rule.
- [ ] The error state has a signal that is not color.
- [ ] The calendar trigger has an accessible name, is a separate tab stop, and works with Enter or Space. Decorative icons are hidden from screen readers.
- [ ] The popover opens from the keyboard, the arrow keys move between dates, and Escape closes the popover and returns focus to the field.
- [ ] Focus never jumps ahead automatically between the parts of a date, and is never moved for the user.
- [ ] Every variant and state is one the Recursica MCP server lists for the project. No size variant, range variant, or inline calendar is added unless the Recursica MCP server lists one for the project.
- [ ] Styling comes from the date picker component, and every field without focus looks editable, not disabled.
- [ ] Dates that are not editable in this place use the read-only field, not a disabled date picker.
- [ ] Open questions were asked about, not decided: date ranges, what the popover contains, whether the calendar opens on focus, the earliest and latest dates and unavailable dates, and conventions for weeks, quarters, and fiscal periods.
