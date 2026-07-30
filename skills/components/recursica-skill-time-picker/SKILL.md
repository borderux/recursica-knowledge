---
name: recursica-skill-time-picker
description: How to use the Recursica time picker correctly — when a point in time needs this control and when a preset list or a duration replaces it, which states and layouts exist, 12- vs 24-hour as a user preference, when seconds appear, stating the time zone, the date-plus-time compound control, and the screen-reader and keyboard requirements for the clock trigger and its popover. Use whenever adding, reviewing, or refactoring a time field. Trigger on "time picker", "time field", "time input", "clock", "AM/PM", "24-hour", "time zone", "screen reader", "tab order", or a request to let a user set a time. Do NOT use for a calendar date — that is recursica-skill-date-picker. Do NOT use for the formatting rules themselves — that is recursica-skill-dates-and-currency. Do NOT use for form layout, validation timing, or save behavior — that is recursica-skill-forms.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Time picker

A time picker captures a point in the day, by typing or by picking.

## Use it when

- **A specific time of day must be set** — a start time, an end time, a reminder, an appointment.
- **Hours and minutes have to be stated explicitly**, rather than chosen from a short list.
- **The precision matters to the task.** If any nearby time would do, the user is not setting a time.

## Do not use it when

Each of these has a different component. Switch to it rather than adapting a time picker:

| Instead of a time picker                           | Use                                                                                        |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| The user picks an approximate or relative time     | Not a time at all — "in 30 minutes" is an offset, so capture the number and its unit       |
| The choices are a few preset times                 | A segmented control or a dropdown — see `recursica-skill-selection-controls`               |
| The value is a length of time, not a point in time | A number input per unit. `3h 20m`, never `3:20` — see `recursica-skill-dates-and-currency` |
| The value is a calendar date                       | `recursica-skill-date-picker`                                                              |
| The task is recurring or conditional scheduling    | A purpose-built scheduling surface. "Every Monday at 3 PM" is not one field                |
| The value is never editable here                   | `recursica-skill-read-only-field` — renders label and text, no input                       |

**A date and a time together are still one control.** Do not build a separate combined date-time component; compose a date picker, this, and an AM/PM select on one row and give the row one label. See `recursica-skill-forms`.

**A disabled time picker is not a way to display a time.** If nobody can ever edit it here, it is not a form control.

## What exists

Taken from `recursica_ui-kit.json` → `ui-kit.components.time-picker`. **Do not pass a variant or state that is not listed here** — other design systems have sizes, seconds variants, warning states, and inline clocks that this component does not.

| Axis      | Options                   |
| --------- | ------------------------- |
| `layouts` | `stacked`, `side-by-side` |
| `states`  | `error`, `disabled`       |

**`layouts` is the label placement axis.** `side-by-side` — label beside the field — is the house default; `stacked` is the fallback when the container is too narrow to fit both. The trigger is container width, not viewport. See `recursica-skill-forms`.

**Focus and placeholder are not variants.** The component handles them: `placeholder-opacity` here, and the focused border via `globals.form.field.colors.border-selected`. Do not build them as states.

**There is no 12-hour or 24-hour axis.** That is a user preference, not a variant — see the rules below.

**There is no size axis.** `width` is a fixed property, the component defines no `min-height` of its own, and single-line field height comes from `globals.form.field.size.single-line-input-height`.

**There is no seconds axis and no range axis.** No start-and-end time control exists. Do not assemble one without asking.

**There is no read-only state.** Read-only is a separate component — `read-only-field`, with the same `layouts` axis and no input.

## Rules for using it

**Always pass a visible label.** Name the object explicitly — "Start time", not "Time". A screen reader user hears the label alone, without the surrounding context. Sentence capitalization, no trailing colon.

**Label placement is one decision per form, not per field.** This field's `layouts` value is not an independent choice — it matches every other field in the same form. The container-width test is applied once, to the form as a whole, and its answer governs every field in it, including short ones like this that would have fitted side by side. A whole form may switch placement between breakpoints, but never mixes the two at one breakpoint, and a section never gets its own placement. Owned by `recursica-skill-forms`.

**12-hour or 24-hour is the user's preference**, carried by their locale or an explicit setting. It is not a design decision, and it does not vary from screen to screen.

**Use the user's locale and the user's time zone, never the tenant's.**

**State the time zone explicitly** whenever the value is outside the user's zone, or the user's zone cannot be determined, or the user has switched zones.

**Do not convert a time that happened somewhere else, if where it happened matters.** Show it in the zone of occurrence, labeled, and offer the user a way to switch it to their own. Converting an 11:00 p.m. local event to the reader's 8:00 p.m. makes them draw a false conclusion. See `recursica-skill-dates-and-currency`.

**Seconds appear only when the values being compared are sub-minute, across a set of objects** — and once they appear, every value in that set shows them.

**Both entry paths must exist, and neither may be the only one.** Never force manual typing when a picker would be faster, and never make the picker the only way in — a user who knows the time types it and moves on.

**State the expected format in help text.** A mask that appears on focus, or a field that silently expects `HH:MM`, is guesswork otherwise.

**On error, replace the help text; do not add to it.** Swapping keeps the field height stable so the form below does not shift. The message must restate the rule: "Invalid time" is not an error message; "Enter a time after 9:00 AM" is.

**Pair the error state with a non-color indicator** — an icon or the message itself. Required by `recursica-skill-system-conventions`.

**Disabled and read-only are different components, not two styles of one.**

- **Disabled time picker** — still a field, still visibly an input, not currently operable. Use it when the user could make it operable by doing something else first.
- **Read-only field** — a different component. Label and text, no input. Use it when this user never edits this value here.

## Accessibility

The component wires the label to the input and provides the focus ring. The clock trigger, the AM/PM control, and the popover are where time pickers fail, and they are yours.

### Screen readers

- **Pass a real label.** Never let placeholder text be the accessible name — it is not announced as a label, and it disappears on input. A field with no label has no accessible name.
- **Pass help text and error text through the component**, never as a loose element rendered beside the field. Only the component can associate them with the input, and unassociated text is invisible to a user who tabs straight into the field.
- **Convey required state programmatically, not with an asterisk alone.** The asterisk is a visual convention, not an accessible name for "required".
- **Name the clock icon if it is a control** — "Choose time" — and keep it silent if it is decorative. An unlabeled interactive graphic announces nothing useful.
- **State the expected format in the help text.** Whether the field wants `9:00 AM` or `09:00`, and whether seconds are accepted, must be in words. A visual mask communicates nothing to a screen reader.
- **State the time zone in text**, not by position or color. A zone that is only implied is not conveyed — and a converted or non-local time that is not labeled is a wrong answer delivered confidently.
- **Name the unit when it is not obvious.** If the field takes a duration-like value or a 24-hour clock in a 12-hour locale, say so in the help text.
- **The error message is the announced text.** Because it replaces the help text, it is the only thing that will be read — so it has to carry the rule, including the format.

### Keyboard and non-mouse navigation

- **Never remove the field from the tab order**, and never make reaching it depend on a pointer.
- **Tab order follows visual order.** The single-column form rule in `recursica-skill-forms` is what keeps this true.
- **Every in-field control is its own tab stop** — the clock trigger, an AM/PM control — and each is operable with Enter or Space, not a click-only handler.
- **Typed entry must always work.** The popover is never the only way to enter a value; a keyboard user must be able to type the time and move on without opening it.
- **The popover must be fully keyboard operable**: it opens from the keyboard, arrow keys move between values, Enter selects, Escape closes it and returns focus to the field it opened from. Focus must never be left in a closed popover or dropped to the top of the page.
- **Never auto-advance focus between the segments of a time.** Jumping from hour to minute to AM/PM on keystroke strands keyboard and screen reader users mid-entry and fights anyone correcting a typo.
- **Do not move focus for the user** when a value looks complete, and do not close the popover into a different field.
- **A disabled field is skipped by tab**, so anything conveyed only by the disabled state is unreachable. Put the reason in text.
- **Nothing needed to complete the field may appear only on hover** — not the format, not the zone, not the trigger.
- **Never suppress the focus ring**, and never rely on the caret alone to show where focus is.

## Not your decision

Do not implement, override, or tune any of these — the component owns them:

- `border-radius`, `horizontal-padding`, `vertical-padding`, `border-size`.
- `width`, plus the field sizing from `globals.form.field.size`.
- `icon-size` and `icon-text-gap`.
- `text` styling and `placeholder-opacity`.
- `colors` per layer, including the focused border from `globals.form.field.colors.border-selected` and the global disabled treatment from `globals.states.disabled`.
- The label-field gaps and `vertical-item-gap` from `globals.form.properties`.
- The label-to-input association and key handling inside the field.

Never style an unfocused time picker so it reads as disabled. An editable field must look editable at rest.

## Load these too

- [`recursica-skill-dates-and-currency`](../../design-rules/recursica-skill-dates-and-currency/SKILL.md) — 12- vs 24-hour, time zones, when not to localize, seconds, duration formatting, and format follows focus.
- [`recursica-skill-forms`](../../design-rules/recursica-skill-forms/SKILL.md) — label placement and one placement per form, the compound-control exception that puts date and time on one row, validation timing, and save mode.
- [`recursica-skill-label`](../recursica-skill-label/SKILL.md) — the label component, its placement axis, and the one-label rule for a compound control.
- [`recursica-skill-assistive-element`](../recursica-skill-assistive-element/SKILL.md) — the help and error text below the field, and why the error replaces the help.
- [`recursica-skill-date-picker`](../recursica-skill-date-picker/SKILL.md) — the date half of a date-and-time row.
- [`recursica-skill-selection-controls`](../../design-rules/recursica-skill-selection-controls/SKILL.md) — when a preset list replaces free entry, and disabled vs. read-only.
- [`recursica-skill-system-conventions`](../../design-rules/recursica-skill-system-conventions/SKILL.md) — never carry meaning in a single channel.

## Uncovered — ask, do not invent

- **The AM/PM control.** A period selector inside the field, hidden in 24-hour mode, is documented outside the token inventory, with no token behind it; the kit defines no tokens for it. Whether it is part of this component or a separate select on the row is unstated. Do not rely on it without asking.
- **What the popover contains.** A "dial or input picker" opened by a dropdown indicator is documented outside the token inventory; the kit defines no popover tokens. Its increment — every minute, every five, every fifteen — is unstated. Do not rely on any of it without asking.
- **Whether a time has a masked focused format** the way a date does. The format-follows-focus rule in `recursica-skill-dates-and-currency` is stated with a date example only.
- **Seconds.** No axis or property covers them, so whether the field can accept them at all is unknown.
- **Time ranges.** No range axis exists, and how a start and an end validate against each other is unstated.
- **The disabled state is defined in the kit but missing from what is documented outside the token inventory.** Treat the kit as authoritative — it is the source for which states exist — and flag the gap.

## Pre-flight checklist

- [ ] The value is a point in the day, not an offset, a duration, or one of a few presets.
- [ ] A visible label is passed and reads correctly on its own; a date-plus-time row is one control with one label.
- [ ] Label placement is side-by-side unless the container is too narrow.
- [ ] `layouts` matches every other field in the same form — one placement per form at any given breakpoint, with no mixing between fields or sections.
- [ ] 12- or 24-hour follows the user's preference and does not vary per screen.
- [ ] The time is in the user's zone, or the zone is stated; a time that happened elsewhere is shown in its own zone, labeled, with a way to convert.
- [ ] Seconds appear only across a sub-minute comparison set, and then on every value in it.
- [ ] Both typing and picking work, and neither is the only path.
- [ ] The expected format is stated in help text.
- [ ] Help and error text are passed through the component; the error replaces the help and restates the rule.
- [ ] The error state carries a non-color indicator.
- [ ] Required state is conveyed programmatically, not by an asterisk alone.
- [ ] Every in-field control — clock trigger, AM/PM — has an accessible name and its own tab stop, operable with Enter or Space; decorative icons are silent.
- [ ] The popover opens from the keyboard, arrow keys move, Escape closes it and returns focus to the field.
- [ ] Focus never auto-advances between hour, minute, and period, and is never moved for the user.
- [ ] The field is in the tab order, tab order matches visual order, and a disabled field's reason is in text.
- [ ] Nothing needed to complete the field requires hover, and the focus ring is not suppressed.
- [ ] No variant, size, or state outside the inventory above was passed; no seconds, range, or inline clock was invented.
- [ ] No component-owned styling was overridden, and no unfocused field reads as disabled.
- [ ] Non-editable times use the read-only component, not a disabled picker.
- [ ] Nothing in the uncovered list was invented.
