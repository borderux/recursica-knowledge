---
name: recursica-skill-time-picker
description: How to use the Recursica time picker correctly — when a point in time needs this control and when a preset list or a duration replaces it, which states and layouts exist, 12- vs 24-hour as a user preference, when seconds appear, stating the time zone, the date-plus-time compound control, and the screen-reader and keyboard requirements for the clock trigger and its popover. Use whenever adding, reviewing, or refactoring a time field. Trigger on "time picker", "time field", "time input", "clock", "AM/PM", "24-hour", "time zone", "screen reader", "tab order", or a request to let a user set a time. Do NOT use for a calendar date — that is recursica-skill-date-picker. Do NOT use for the formatting rules themselves — that is recursica-skill-dates-and-currency. Do NOT use for form layout, validation timing, or save behavior — that is recursica-skill-forms.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Time picker

A time picker records a point in the day, either by typing it or by picking it.

## Use it when

- **A specific time of day must be set** — a start time, an end time, a reminder, an appointment.
- **Hours and minutes have to be stated exactly**, rather than chosen from a short list.
- **The precision matters to the task.** If any nearby time would do, the user is not really setting a time.

## Do not use it when

Each of these has a different component. Switch to it, instead of adapting a time picker:

| Instead of a time picker                                     | Use                                                                                             |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| The user picks a rough or relative time                      | Not a time at all — "in 30 minutes" is an offset, so record the number and its unit             |
| The choices are a few set times                              | A segmented control or a dropdown — see `recursica-skill-selection-controls`                    |
| The value is a length of time, not a point in time           | A number input for each unit. `3h 20m`, never `3:20` — see `recursica-skill-dates-and-currency` |
| The value is a calendar date                                 | `recursica-skill-date-picker`                                                                   |
| The task is scheduling that repeats or depends on conditions | A surface built for scheduling. "Every Monday at 3 PM" is not one field                         |
| The value can never be edited here                           | `recursica-skill-read-only-field` — shows the label and text, with no input                     |

**A date and a time together are still one control.** Do not build a separate combined date-and-time component. Put a date picker, this, and an AM/PM select on one row, and give the row one label. See `recursica-skill-forms`.

**A disabled time picker is not a way to show a time.** If nobody can ever edit it here, it is not a form control.

## What exists

Taken from `recursica_ui-kit.json` → `ui-kit.components.time-picker`. **Do not pass a variant or state that is not listed here** — other design systems have sizes, seconds variants, warning states, and inline clocks that this component does not.

**The third column is the React prop that sets each axis.** The axis name comes from the token inventory. It is not a prop, and if you pass it as one, React quietly ignores it. A blank cell means no single prop sets that axis — it is set by CSS state or by separate props, and the rules below say which.

| Axis      | Options                   | React prop   |
| --------- | ------------------------- | ------------ |
| `layouts` | `stacked`, `side-by-side` | `formLayout` |
| `states`  | `error`, `disabled`       |              |

**`layouts` is the label-placement axis, set by the `formLayout` prop.** `side-by-side` — the label beside the field — is the house default. `stacked` is the fallback when the container is too narrow to fit both. What decides this is the container's width, not the viewport's (the visible area of the browser window). See `recursica-skill-forms`.

**`formLayout` defaults to `stacked`, so the house rule is the one thing you must pass.** Leave it out, and you get the fallback in a container of any width — the rule turned upside down. `layouts` is the name of the token axis, not a prop: `layouts="side-by-side"` is quietly ignored by React and leaves the control stacked, with no error. Pass `formLayout="side-by-side"` explicitly.

**Focus and placeholder are not variants.** The component handles them: `placeholder-opacity` here, and the focused border through `globals.form.field.colors.border-selected`. Do not build them as states.

**There is no 12-hour or 24-hour axis.** That is the user's preference, not a variant — see the rules below.

**There is no size axis.** `width` is a fixed property, the component defines no `min-height` of its own, and the height of a single-line field comes from `globals.form.field.size.single-line-input-height`.

**There is no seconds axis, and no range axis.** No control for a start time and an end time exists. Do not build one without asking.

**There is no read-only state.** Read-only is a separate component — `read-only-field`, with the same `layouts` axis and no input.

## Rules for using it

**Always pass a visible label.** Name the object clearly — "Start time", not "Time". A screen reader user hears the label on its own, without the context around it. Use sentence capitalization, with no colon at the end.

**Label placement is one decision per form, not per field.** This field's `layouts` value is not a separate choice — it matches every other field in the same form. The container-width test is applied once, to the whole form, and its answer governs every field in it, including short ones like this one that would have fitted side by side. A whole form may switch placement between breakpoints (the screen widths at which the layout changes), but it never mixes the two at one breakpoint, and a section never gets its own placement. Owned by `recursica-skill-forms`.

**Whether time is 12-hour or 24-hour is the user's preference**, set by their locale (the language and regional settings a person uses) or by an explicit setting. It is not a design decision, and it does not change from screen to screen.

**Use the user's locale and the user's time zone, never the tenant's** (the organization whose account the application runs under).

**State the time zone clearly** whenever the value is outside the user's time zone, the user's time zone cannot be found, or the user has switched time zones.

**Do not convert a time that happened somewhere else, if where it happened matters.** Show it in the time zone where it happened, labeled, and give the user a way to switch it to their own. Converting an 11:00 p.m. local event to the reader's 8:00 p.m. leads them to the wrong conclusion. See `recursica-skill-dates-and-currency`.

**Seconds appear only when the values being compared are under a minute, across a set of objects** — and once they appear, every value in that set shows them.

**Both ways of entering a time must exist, and neither may be the only one.** Never force the user to type when a picker would be faster, and never make the picker the only way in — a user who knows the time types it and moves on.

**State the expected format in help text.** Otherwise, a mask that appears on focus, or a field that quietly expects `HH:MM`, leaves the user guessing.

**On error, replace the help text; do not add to it.** Swapping keeps the field's height the same, so the form below does not shift. The message must restate the rule: "Invalid time" is not an error message; "Enter a time after 9:00 AM" is.

**Pair the error state with a signal that is not color** — an icon, or the message itself. Required by `recursica-skill-system-conventions`.

**Disabled and read-only are different components, not two styles of one.**

- **Disabled time picker** — still a field, still clearly an input, but not usable right now. Use it when the user could make it usable by doing something else first.
- **Read-only field** — a different component. A label and text, with no input. Use it when this user never edits this value here.

## Accessibility

The accessibility baseline in `recursica-skill-system-conventions` applies here too — the focus ring, hover, tab order, disabled reasons, form text, and icons. This section adds only what is specific to this component.

The component connects the label to the input, and provides the focus ring (the outline that shows which element has keyboard focus). The clock trigger, the AM/PM control, and the popover (the small panel that opens next to its trigger) are where time pickers fail, and they are up to you.

### Screen readers

- **Pass a real label.** Never let placeholder text be the accessible name (the name a screen reader reads out for a control) — it is not announced as a label, and it disappears when the user types. A field with no label has no accessible name.
- **Name the clock icon if it is a control** — "Choose time" — and keep it silent if it is decorative. An unlabeled graphic that can be used announces nothing useful.
- **State the expected format in the help text.** Whether the field wants `9:00 AM` or `09:00`, and whether seconds are accepted, must be put in words. A visual mask tells a screen reader (software that reads the screen aloud) nothing.
- **State the time zone in text**, not by position or color. A time zone that is only implied is not communicated — and a converted, or not local, time that is not labeled is a wrong answer delivered with confidence.
- **Name the unit when it is not obvious.** If the field takes a value like a duration, or a 24-hour clock in a 12-hour locale, say so in the help text.
- **The error message is the text that gets announced.** Because it replaces the help text, it is the only thing that will be read — so it has to state the rule, including the format.

### Keyboard and non-mouse navigation

- **Never remove the field from the tab order**, and never make reaching it depend on a pointer.
- **Every control inside the field is its own tab stop** (a place the Tab key lands) — the clock trigger, an AM/PM control — and each works with Enter or Space, not with a handler that only responds to clicks.
- **Typing must always work.** The popover is never the only way to enter a value. A keyboard user must be able to type the time and move on, without opening it.
- **The popover must be fully usable by keyboard.** It opens from the keyboard, the arrow keys move between values, Enter selects, and Escape closes it and returns focus to the field it opened from. Focus must never be left in a closed popover, or dropped to the top of the page.
- **Never move focus ahead automatically between the parts of a time.** Jumping from hour to minute to AM/PM as the user types strands keyboard and screen reader users partway through, and fights anyone fixing a typo.
- **Do not move focus for the user** when a value looks complete, and do not close the popover into a different field.
- **Nothing needed to complete the field may appear only on hover** — not the format, not the time zone, and not the trigger.

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

- `recursica-skill-dates-and-currency` — 12- vs 24-hour, time zones, when not to localize, seconds, duration formatting, and format follows focus.
- `recursica-skill-forms` — label placement and one placement per form, the compound-control exception that puts date and time on one row, validation timing, and save mode.
- `recursica-skill-label` — the label component, its placement axis, and the one-label rule for a compound control.
- `recursica-skill-assistive-element` — the help and error text below the field, and why the error replaces the help.
- `recursica-skill-selection-controls` — when a preset list replaces free entry, and disabled vs. read-only.
- `recursica-skill-system-conventions` — never carry meaning in a single channel.

### Only if the screen also uses it

- `recursica-skill-date-picker` — the date half of a date-and-time row.

## Uncovered — ask, do not invent

- **The AM/PM control.** A selector for AM or PM inside the field, hidden in 24-hour mode, is documented outside the token inventory, with no token behind it — the kit defines no tokens for it. Whether it is part of this component, or a separate select on the row, is not stated. Do not rely on it without asking.
- **What the popover contains.** A "dial or input picker" opened by a dropdown indicator is documented outside the token inventory, but the kit defines no popover tokens. Its step size — every minute, every five, every fifteen — is not stated. Do not rely on any of it without asking.
- **Whether a time has a masked format while it has focus**, the way a date does. The format-follows-focus rule in `recursica-skill-dates-and-currency` is stated with a date example only.
- **Seconds.** No axis or property covers them, so whether the field can accept them at all is not known.
- **Time ranges.** No range axis exists, and how a start and an end are checked against each other is not stated.
- **The disabled state is defined in the kit, but missing from what is documented outside the token inventory.** Treat the kit as the authority — it is the source for which states exist — and flag the gap.

## Pre-flight checklist

- [ ] The value is a point in the day — not an offset, a duration, or one of a few set times.
- [ ] A visible label is passed and makes sense on its own, and a date-plus-time row is one control with one label.
- [ ] Label placement is side by side, unless the container is too narrow.
- [ ] `layouts` matches every other field in the same form — one placement per form at any given breakpoint, with no mixing between fields or sections.
- [ ] 12-hour or 24-hour time follows the user's preference, and does not change from screen to screen.
- [ ] The time is in the user's time zone, or the time zone is stated. A time that happened elsewhere is shown in its own time zone, labeled, with a way to convert it.
- [ ] Seconds appear only across a set of values under a minute that are being compared — and then on every value in it.
- [ ] Both typing and picking work, and neither one is the only way.
- [ ] The expected format is stated in help text.
- [ ] Help and error text are passed through the component. The error replaces the help text, and restates the rule.
- [ ] The error state has a signal that is not color.
- [ ] Every control inside the field — the clock trigger, AM/PM — has an accessible name and its own tab stop, and works with Enter or Space. Decorative icons are silent.
- [ ] The popover opens from the keyboard, the arrow keys move, and Escape closes it and returns focus to the field.
- [ ] Focus never jumps ahead automatically between hour, minute, and AM/PM, and is never moved for the user.
- [ ] You passed no variant, size, or state outside the inventory above, and invented no seconds, range, or inline clock.
- [ ] You overrode no styling that the component owns, and no field without focus looks disabled.
- [ ] Times that cannot be edited use the read-only component, not a disabled picker.
- [ ] You invented nothing from the uncovered list.
