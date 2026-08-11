---
name: recursica-skill-date-picker
description: How to use the Recursica date picker correctly — when a calendar control is right and when a plain text field beats it, which states and layouts exist, the readable `Jan 7, 2026` format at rest and the masked numeric form that exists only inside a focused input, time zones, and the screen-reader and keyboard requirements for the calendar trigger and its popover. Use whenever adding, reviewing, or refactoring a date field or a calendar popover. Trigger on "date picker", "calendar", "date field", "date input", "date format", "date mask", "screen reader", "tab order", or a request to let a user choose a date. Do NOT use for a time of day — that is recursica-skill-time-picker. Do NOT use for the formatting rules themselves — that is recursica-skill-dates-and-currency. Do NOT use for form layout, validation timing, or save behavior — that is recursica-skill-forms.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Date picker

A date picker captures a single calendar date, by typing or by picking.

## Use it when

- **The value is one calendar date** — a due date, a start date, an effective date.
- **Picking from a calendar helps** — the user is reasoning about weekdays, proximity, or a month's shape rather than recalling a date they already know.
- **The date is near the current date**, so the calendar reaches it in a step or two.

## Do not use it when

Each of these has a different component. Switch to it rather than adapting a date picker:

| Instead of a date picker                               | Use                                                                                 |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------- | ---------- |
| The value is a time of day                             | `recursica-skill-time-picker`                                                       |
| The user already knows the date by heart               | A text field with the format stated in help text — see `recursica-skill-text-field` |
| The date is far in the past — a birth date             | A text field. Never make the user page a calendar back through decades              |
| A relative or approximate time — "in 30 days"          | Not a date at all. Capture the offset as a number plus a unit                       |
| The value is never editable here                       | `recursica-skill-read-only-field` — renders label and text, no input                |
| A date is only being displayed, in a table or a detail | Formatted text — see `recursica-skill-dates-and-currency`                           |

**A complex or partial date is not this control.** A month-and-year, a quarter, a fiscal period, or a date the user assembles from parts needs separate inputs with the format stated — not a calendar.

**A disabled date picker is not a way to display a date.** If nobody can ever edit it here, it is not a form control.

## What exists

Taken from `recursica_ui-kit.json` → `ui-kit.components.date-picker`. **Do not pass a variant or state that is not listed here** — other design systems have sizes, range variants, warning states, and inline calendars that this component does not.

**The third column is the React prop that sets the axis.** The axis name is the token inventory's; it is not a prop, and passing it as one is dropped silently by React. A blank cell means no single prop carries that axis — it is set by CSS state or by separate props, and the rules below say which.

| Axis      | Options                   | React prop |
| --------- | ------------------------- | ---------- |
| `layouts` | `stacked`, `side-by-side` | `formLayout` |
| `states`  | `error`, `disabled`       |            |

**`layouts` is the label placement axis, set by the `formLayout` prop.** `side-by-side` — label beside the field — is the house default; `stacked` is the fallback when the container is too narrow to fit both. The trigger is container width, not viewport. See `recursica-skill-forms`.

**`formLayout` defaults to `stacked`, so the house rule is the one thing you must pass.** Omit it and you get the fallback on a container of any width, which is the rule inverted. `layouts` is the token axis name and is not a prop — `layouts="side-by-side"` is dropped silently by React and leaves the control stacked with no error. Pass `formLayout="side-by-side"` explicitly.

**Focus and placeholder are not variants.** The component handles them: `placeholder-opacity` here, and the focused border via `globals.form.field.colors.border-selected`. Do not build them as states.

**There is no size axis.** `min-height` and `width` are fixed properties, and `globals.form.field.size` supplies the field sizing.

**There is no range axis.** No start-and-end date control exists. Do not assemble one without asking.

**There is no read-only state.** Read-only is a separate component — `read-only-field`, with the same `layouts` axis and no input.

## Rules for using it

**Always pass a visible label.** Name the object explicitly — "Start date", not "Date". A screen reader user hears the label alone, without the surrounding context. Sentence capitalization, no trailing colon.

**A date plus a time is one control with one label.** Date picker, time entry, and AM/PM on a single row is the only case where inputs share a row, and it is one logical value. Owned by `recursica-skill-forms`.

**Label placement is one decision per form, not per field.** This field's `layouts` value is not an independent choice — it matches every other field in the same form. The container-width test is applied once, to the form as a whole, and its answer governs every field in it, including short ones like this that would have fitted side by side. A whole form may switch placement between breakpoints, but never mixes the two at one breakpoint, and a section never gets its own placement. Owned by `recursica-skill-forms`.

**At rest, the field shows the readable format: `Jan 7, 2026`.** Three-letter month, one-to-two-digit day, four-digit year. This is the only display format.

**The numeric slash-or-hyphen form exists only inside a focused input.** `01/07/2026` is a typing affordance so the user can key against the mask, and it reverts to the readable form on blur. Format follows focus, never editability. See `recursica-skill-dates-and-currency`.

**Never render a numeric date outside a focused input** — not at rest, not read-only, not in a table. A spelled month costs nothing and removes the ambiguity entirely.

**The typed path is never optional.** Manual entry is faster for anyone who knows the date, and it is the only path some users have. The calendar accelerates entry; it never replaces it.

**State the expected format in help text** — the mask is visual and communicates nothing on its own.

**Use the user's locale and the user's time zone, never the tenant's.** State the time zone whenever the value is outside the user's zone, or the user's zone cannot be determined, or the user has switched zones.

**Pre-fill only today's date, and only when today's date is what is being recorded.** Any date the user would have to reason about or verify must start empty — an unverified default gets submitted unchecked.

**On error, replace the help text; do not add to it.** Swapping keeps the field height stable so the form below does not shift. The message must restate the rule: "Invalid date" is not an error message; "Enter a date on or after Jan 7, 2026" is.

**Pair the error state with a non-color indicator** — an icon or the message itself. Required by `recursica-skill-system-conventions`.

**Disabled and read-only are different components, not two styles of one.**

- **Disabled date picker** — still a field, still visibly an input, not currently operable. Use it when the user could make it operable by doing something else first.
- **Read-only field** — a different component. Label and text, no input. Use it when this user never edits this value here.

## Accessibility

The component wires the label to the input and provides the focus ring. The calendar trigger and the popover are where date pickers fail, and both are yours to get right.

### Screen readers

- **Pass a real label.** Never let placeholder text be the accessible name — it is not announced as a label, and it disappears on input. A field with no label has no accessible name.
- **Pass help text and error text through the component**, never as a loose element rendered beside the field. Only the component can associate them with the input, and unassociated text is invisible to a user who tabs straight into the field.
- **Convey required state programmatically, not with an asterisk alone.** The asterisk is a visual convention, not an accessible name for "required".
- **Name the calendar icon if it is a control** — "Choose date" — and keep it silent if it is decorative. An unlabeled interactive graphic is announced as nothing useful.
- **State the expected format in the help text.** The mask that appears on focus is a visual affordance; a screen reader user gets nothing from it. Say `MM/DD/YYYY` in words the user can act on.
- **State the time zone in text** whenever it matters. A zone that is only implied is not conveyed.
- **The error message is the announced text.** Because it replaces the help text, it is the only thing that will be read — so it has to carry the rule, including the format.

### Keyboard and non-mouse navigation

- **Never remove the field from the tab order**, and never make reaching it depend on a pointer.
- **Tab order follows visual order.** The single-column form rule in `recursica-skill-forms` is what keeps this true.
- **The calendar trigger is its own tab stop**, operable with Enter or Space — not a click-only handler.
- **Typed entry must always work.** The popover is never the only way to enter a value; a keyboard user must be able to type the date and move on without ever opening the calendar.
- **The popover must be fully keyboard operable**: it opens from the keyboard, arrow keys move between dates, Enter selects, Escape closes it and returns focus to the field it opened from. Focus must not be left in a closed popover or dropped to the top of the page.
- **Never auto-advance focus between the segments of a date.** Jumping from month to day to year on keystroke strands keyboard and screen reader users mid-entry, and it fights anyone correcting a typo.
- **Do not move focus for the user** when a value looks complete, and do not close the popover into a different field.
- **A disabled field is skipped by tab**, so anything conveyed only by the disabled state is unreachable. Put the reason in text.
- **Nothing needed to complete the field may appear only on hover.** Help text is persistent; a hover-only hint is unavailable to keyboard and touch users alike.
- **Never suppress the focus ring**, and never rely on the caret alone to show where focus is.

## Not your decision

Do not implement, override, or tune any of these — the component owns them:

- `border-radius`, `min-height`, `horizontal-padding`, `vertical-padding`, `border-size`.
- `width`, plus the field sizing from `globals.form.field.size`.
- `icon-size` and `icon-text-gap`.
- `text` styling and `placeholder-opacity`.
- `colors` per layer, including the focused border from `globals.form.field.colors.border-selected` and the global disabled treatment from `globals.states.disabled`.
- The label-field gaps and `vertical-item-gap` from `globals.form.properties`.
- The label-to-input association and key handling inside the field.

Never style an unfocused date picker so it reads as disabled. An editable field must look editable at rest.

## Load these too

- [`recursica-skill-dates-and-currency`](../../design-rules/recursica-skill-dates-and-currency/SKILL.md) — the date format, time zones, relative vs. absolute time, ranges, and the format-follows-focus rule.
- [`recursica-skill-forms`](../../design-rules/recursica-skill-forms/SKILL.md) — label placement and one placement per form, the compound-control exception, validation timing, pre-fill, save mode, and the rule that no form control goes inside a card.
- [`recursica-skill-label`](../recursica-skill-label/SKILL.md) — the label component, its placement axis, and required vs. optional marking.
- [`recursica-skill-assistive-element`](../recursica-skill-assistive-element/SKILL.md) — the help and error text below the field, and why the error replaces the help.
- [`recursica-skill-text-field`](../recursica-skill-text-field/SKILL.md) — the control to use when a calendar is the wrong affordance.
- [`recursica-skill-system-conventions`](../../design-rules/recursica-skill-system-conventions/SKILL.md) — never carry meaning in a single channel.

## Uncovered — ask, do not invent

- **Date ranges.** No range axis exists. Whether a range is two date pickers or one control, and how the two ends validate against each other, is unstated.
- **A `read-only` state on this component is documented outside the token inventory, with no token behind it.** The kit defines none and treats read-only as a separate component. Do not resolve this yourself, and do not rely on it without asking.
- **What the popover contains.** A month-and-year dropdown, navigation arrows, and Cancel/Confirm actions are documented outside the token inventory; the kit defines no popover tokens at all. Whether selection commits on click or needs a Confirm is unstated. Do not rely on any of it without asking.
- **Whether the calendar opens on focus** or only when its trigger is activated.
- **Minimum and maximum selectable dates, and disabled dates inside the calendar.** No state covers an unavailable date.
- **Week, quarter, and fiscal-period conventions** — see the same entry in `recursica-skill-dates-and-currency`.

## Pre-flight checklist

- [ ] The value is a single calendar date, near enough that a calendar helps.
- [ ] Dates the user knows by heart, or far in the past, use a text field instead.
- [ ] A visible label is passed and reads correctly on its own; a date-plus-time row is one control with one label.
- [ ] Label placement is side-by-side unless the container is too narrow.
- [ ] `layouts` matches every other field in the same form — one placement per form at any given breakpoint, with no mixing between fields or sections.
- [ ] The field shows `Jan 7, 2026` at rest; the numeric form appears only while focused and reverts on blur.
- [ ] The expected format is stated in help text, and the time zone is stated wherever it matters.
- [ ] Typed entry works without ever opening the calendar.
- [ ] Only today's date is pre-filled, and only when today is what is being recorded.
- [ ] Help and error text are passed through the component; the error replaces the help and restates the rule.
- [ ] The error state carries a non-color indicator.
- [ ] Required state is conveyed programmatically, not by an asterisk alone.
- [ ] The calendar trigger has an accessible name and is its own tab stop, operable with Enter or Space; decorative icons are silent.
- [ ] The popover opens from the keyboard, arrow keys move, Escape closes it and returns focus to the field.
- [ ] Focus never auto-advances between date segments and is never moved for the user.
- [ ] The field is in the tab order, tab order matches visual order, and a disabled field's reason is in text.
- [ ] Nothing needed to complete the field requires hover, and the focus ring is not suppressed.
- [ ] No variant, size, or state outside the inventory above was passed; no range or inline calendar was invented.
- [ ] No component-owned styling was overridden, and no unfocused field reads as disabled.
- [ ] Non-editable dates use the read-only component, not a disabled picker.
- [ ] Nothing in the uncovered list was invented.
