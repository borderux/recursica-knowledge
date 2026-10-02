---
name: recursica-skill-date-picker
description: Rules for the Recursica date picker — when a calendar helps and when typing is better, states and label placement, the readable date format, time zones, and calendar popover accessibility. Use for date fields and calendars. Not for a time of day — see recursica-skill-time-picker; formatting rules live in recursica-skill-dates-and-currency.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Date picker

A date picker records a single calendar date, either by typing it or by picking it.

> **Built in the Mantine adapter only.** The MUI adapter's `DatePicker.module.css` is a
> declared placeholder file with no CSS in it. It applies none of the 34 `date-picker` variables
> the UI kit (the token file, `recursica_ui-kit.json`, that says which variants and states each component has) exports, while the Mantine adapter applies 31. On MUI, this component shows up unstyled,
> with no error. Everything below is correct about the UI kit — but confirm which adapter the application
> uses before relying on how it looks.

## When to use a date picker

- **The value is one calendar date** — a due date, a start date, an effective date.
- **Picking from a calendar helps** — the user is thinking about weekdays, how close dates are, or where a date falls in its month, rather than recalling a date they already know.
- **The date is close to today**, so the calendar reaches it in a step or two.

## When not to use a date picker

Each of these has a different component. Switch to it, instead of adapting a date picker:

| Instead of a date picker                                | Use                                                                                  |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| The value is a time of day                              | `recursica-skill-time-picker`                                                        |
| The user already knows the date by heart                | A text field, with the format stated in help text — see `recursica-skill-text-field` |
| The date is far in the past — a birth date              | A text field. Never make the user page a calendar back through decades               |
| A relative or rough time — "in 30 days"                 | Not a date at all. Record the offset as a number plus a unit                         |
| The value can never be edited here                      | `recursica-skill-read-only-field` — shows the label and text, with no input          |
| A date is only being shown, in a table or a detail view | Formatted text — see `recursica-skill-dates-and-currency`                            |

**A complex or partial date is not this control.** A month and year, a quarter, a fiscal period, or a date the user builds from parts needs separate inputs with the format stated — not a calendar.

**Never use a disabled date picker to show a date.** If nobody can ever edit it here, it is not a form control.

## Date picker label placements and states

Taken from `recursica_ui-kit.json` → `ui-kit.components.date-picker`. **Do not pass a variant or state that is not listed here** — other design systems have sizes, range variants, warning states, and inline calendars that this component does not.

**These are design-system names, not code names.** An axis (a property a component varies on, such as size or style; Figma calls it a variant property) and its options are named in the UI kit. Each adapter names them its own way, and an adapter may ignore a name it does not know, with no error. Before setting one in code, look up the adapter's name for it with the Recursica MCP server's `recursica_get_component_doc` tool.

| Axis      | Options                   |
| --------- | ------------------------- |
| `layouts` | `stacked`, `side-by-side` |
| `states`  | `error`, `disabled`       |

**`layouts` is the label-placement axis.** `side-by-side` — the label beside the field — is the house default. `stacked` is the fallback when the container is too narrow to fit both. What decides this is the container's width, not the viewport's. See `recursica-skill-forms`.

**Set label placement explicitly on every field.** An adapter's default may be `stacked`, which puts the label above the input at any container width and breaks the house rule. Set `layouts` to `side-by-side` to put the label beside the input, using the adapter's name for that axis and option.

**Focus and placeholder are not variants.** The component handles them: `placeholder-opacity` here, and the focused border through `globals.form.field.colors.border-selected`. Do not build them as states.

**There is no size axis.** `min-height` and `width` are fixed properties, and `globals.form.field.size` supplies the field sizing.

**There is no range axis.** No control for a start date and an end date exists. Do not build one without asking.

**There is no read-only state.** Read-only is a separate component — `read-only-field`, with the same `layouts` axis and no input.

## Rules for date pickers

**Always pass a visible label.** Name the object clearly — "Start date", not "Date". A screen reader user hears the label on its own, without the context around it. Use sentence capitalization, with no colon at the end.

**A date plus a time is one control with one label.** A date picker, a time entry, and an AM/PM choice on a single row is the only case where inputs share a row, and it is one value. Owned by `recursica-skill-forms`.

**Label placement is one decision per form, not per field.** This field's `layouts` value is not a separate choice — it matches every other field in the same form. The container-width test is applied once, to the whole form, and its answer governs every field in it, including short ones like this one that would have fitted side by side. A whole form may switch placement between breakpoints, but it never mixes the two at one breakpoint, and a section never gets its own placement. Owned by `recursica-skill-forms`.

**At rest, the field shows the readable format: `Jan 7, 2026`.** A three-letter month, a day of one or two digits, and a four-digit year. This is the only display format.

**The numeric form with slashes or hyphens exists only inside an input that has focus.** `01/07/2026` is a typing aid, so the user can type against the mask (the pattern in the field that guides what they type). It goes back to the readable form on blur — that is, when the field loses focus. The format follows focus, never whether the field can be edited. See `recursica-skill-dates-and-currency`.

**Never show a numeric date outside an input that has focus** — not at rest, not read-only, and not in a table. A spelled-out month adds only a few characters, and removes any doubt about whether the day or the month comes first.

**Typing is never optional.** Typing is faster for anyone who knows the date, and it is the only way in for some users. The calendar speeds up entry; it never replaces typing.

**State the expected format in help text** — the mask is visual only, and does not name the format.

**Use the user's locale and the user's time zone, never the tenant's** (the organization whose account the application runs under). State the time zone whenever the value is outside the user's time zone, the user's time zone cannot be found, or the user has switched time zones.

**Pre-fill only today's date, and only when today's date is what is being recorded.** Any date the user would have to think about or check must start empty — a default nobody checked gets submitted without being checked.

**On error, replace the help text; do not add to it.** Swapping keeps the field's height the same, so the form below does not shift. The message must restate the rule: "Invalid date" is not an error message; "Enter a date on or after Jan 7, 2026" is.

**Pair the error state with a signal that is not color** — an icon, or the message itself. Required by `recursica-skill-system-conventions`.

**Disabled and read-only are different components, not two styles of one.**

- **Disabled date picker** — still a field, still clearly an input, but not usable right now. Use it when the user could make it usable by doing something else first.
- **Read-only field** — a different component. A label and text, with no input. Use it when this user never edits this value here.

## Accessibility

This component also follows the accessibility baseline in `recursica-skill-system-conventions`. Only what is specific to it is listed here.

The component connects the label to the input, and provides the focus ring. Date pickers most often fail at the calendar trigger and the popover. The application builds both, so follow the rules below for each.

### Screen readers

- **Pass a real label.** Never let placeholder text be the accessible name (the name a screen reader reads out for a control) — it is not announced as a label, and it disappears when the user types. A field with no label has no accessible name.
- **Name the calendar icon if it is a control** — "Choose date" — and keep it silent if it is decorative. A screen reader announces an unlabeled clickable icon without saying what it does.
- **State the expected format in the help text.** The mask that appears on focus is a visual aid; a screen reader user gets nothing from it. Say `MM/DD/YYYY` in words the user can act on.
- **State the time zone in text** whenever it matters. A time zone that is only implied is not communicated.
- **The error message is the text that gets announced.** Because it replaces the help text, it is the only thing that will be read — so it has to state the rule, including the format.

### Keyboard and non-mouse navigation

- **Never remove the field from the tab order**, and never make reaching it depend on a pointer.
- **The calendar trigger is its own tab stop** (a place the Tab key lands), and works with Enter or Space — not with a handler that only responds to clicks.
- **Typing must always work.** The popover is never the only way to enter a value. A keyboard user must be able to type the date and move on, without ever opening the calendar.
- **The popover must be fully usable by keyboard.** It opens from the keyboard, the arrow keys move between dates, Enter selects, and Escape closes it and returns focus to the field it opened from. Focus must not be left in a closed popover, or dropped to the top of the page.
- **Never move focus ahead automatically between the parts of a date.** Jumping from month to day to year as the user types leaves keyboard and screen reader users in a part of the date they did not choose, and it moves focus away from anyone fixing a typo.
- **Do not move focus for the user** when a value looks complete, and do not close the popover into a different field.

## Styling the date picker sets itself

Do not set or override any of these. The component sets them:

- `border-radius`, `min-height`, `horizontal-padding`, `vertical-padding`, `border-size`.
- `width`, plus the field sizing from `globals.form.field.size`.
- `icon-size` and `icon-text-gap`.
- `text` styling and `placeholder-opacity`.
- `colors` per layer, including the focused border from `globals.form.field.colors.border-selected` and the global disabled treatment from `globals.states.disabled`.
- The label-field gaps and `vertical-item-gap` from `globals.form.properties`.
- The label-to-input association and key handling inside the field.

Never style an unfocused date picker so it looks disabled. An editable field must look editable at rest.

## Skills to read with this one

- `recursica-skill-dates-and-currency` — the date format, time zones, relative vs. absolute time, ranges, and the format-follows-focus rule.
- `recursica-skill-forms` — label placement and one placement per form, the compound-control exception, validation timing, pre-fill, save mode, and the rule that no form control goes inside a card.
- `recursica-skill-label` — the label component, its placement axis, and required vs. optional marking.
- `recursica-skill-assistive-element` — the help and error text below the field, and why the error replaces the help.
- `recursica-skill-system-conventions` — never carry meaning in a single channel.

### Only if the screen also uses those components

- `recursica-skill-text-field` — the control to use when a calendar is the wrong affordance.

## Open questions: ask, do not decide

- **Date ranges.** No range axis exists. Whether a range is two date pickers or one control, and how the two ends are checked against each other, is not stated.
- **A `read-only` state on this component is shown only on the design-system website, with no token behind it.** The UI kit defines none, and treats read-only as a separate component. Ask before deciding this, and before relying on it.
- **What the popover contains.** A month-and-year dropdown, navigation arrows, and Cancel/Confirm actions are shown only on the design-system website; the UI kit defines no popover tokens at all. Whether a selection is saved on click, or needs a Confirm, is not stated. Do not rely on any of it without asking.
- **Whether the calendar opens on focus**, or only when its trigger is activated.
- **The earliest and latest dates that can be picked, and dates that are unavailable inside the calendar.** No state covers an unavailable date.
- **Conventions for weeks, quarters, and fiscal periods** — see the same entry in `recursica-skill-dates-and-currency`.

## Pre-flight checklist

- [ ] The value is a single calendar date, close enough that a calendar helps.
- [ ] Dates the user knows by heart, or that are far in the past, use a text field instead.
- [ ] A visible label is passed and makes sense on its own, and a date-plus-time row is one control with one label.
- [ ] Label placement is side by side, unless the container is too narrow.
- [ ] `layouts` matches every other field in the same form — one placement per form at any given breakpoint, with no mixing between fields or sections.
- [ ] The field shows `Jan 7, 2026` at rest. The numeric form appears only while the field has focus, and goes back when focus leaves.
- [ ] The expected format is stated in help text, and the time zone is stated wherever it matters.
- [ ] Typing works without ever opening the calendar.
- [ ] Only today's date is pre-filled, and only when today is what is being recorded.
- [ ] Help and error text are passed through the component. The error replaces the help text and restates the rule.
- [ ] The error state has a signal that is not color.
- [ ] The calendar trigger has an accessible name, is its own tab stop, and works with Enter or Space. Decorative icons are silent.
- [ ] The popover opens from the keyboard, the arrow keys move, and Escape closes it and returns focus to the field.
- [ ] Focus never jumps ahead automatically between the parts of a date, and is never moved for the user.
- [ ] Every variant and state passed is in the inventory above. No size, range, or inline calendar is added.
- [ ] Styling comes from the component, and every field without focus looks editable, not disabled.
- [ ] Dates that are not editable here use the read-only component, not a disabled picker.
- [ ] Open questions were asked about, not decided: date ranges, a read-only state, what the popover contains, whether the calendar opens on focus, the earliest and latest dates and unavailable dates, and conventions for weeks, quarters, and fiscal periods.
