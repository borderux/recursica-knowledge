---
name: recursica-skill-slider
description: How to use the Recursica slider correctly — when a bounded range beats typed numeric entry, which layouts and states exist including the kit's only `active` state, the paired numeric input, min and max labels, step indicators, and the read-only value treatment, plus the screen-reader and keyboard requirements that make the value settable without dragging. Use whenever adding, reviewing, or refactoring a slider, a range control, a volume or brightness control, or deciding between a slider and a typed number. Trigger on "slider", "range", "track", "thumb", "handle", "step", "min", "max", "drag to set", "screen reader", or "tab order". Do NOT use for exact numeric entry with steppers — that is recursica-skill-number-input. Do NOT use for form layout, validation timing, or save mode — that is recursica-skill-forms. Do NOT use to show how far a task has progressed — that is recursica-skill-loader.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Slider

A slider selects a value from a bounded range by moving a thumb along a track.

## Use it when

- **The range is bounded and known** — there is a real minimum and a real maximum, and both can be shown.
- **Precision does not matter.** The user wants "about here", not a specific number.
- **The result is instant and visible** — volume, brightness, opacity, zoom. The user judges the value by its effect, not by reading it.
- **The surface is touch or pen.** A long track with a large thumb is a comfortable target where a small numeric field is not.

## Do not use it when

| Instead of a slider                              | Use                                                                                             |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| The user already has an exact number in mind     | `recursica-skill-number-input`                                                                  |
| The range is unbounded or open-ended             | `recursica-skill-number-input` — a track needs two ends to exist                                |
| There are only a few discrete values             | `recursica-skill-segmented-control` or a radio group — see `recursica-skill-selection-controls` |
| The value must match an external source exactly  | A typed field, so the user can enter what they were given                                       |
| You are showing how far something has progressed | `recursica-skill-loader` — a slider is an input, not an indicator                               |
| The value is never editable by this user         | `recursica-skill-read-only-field`                                                               |

**A slider is not a cheaper number input.** If the exact figure matters, the slider is at best a supplement to a typed value, never a replacement for it.

## What exists

Taken from `recursica_ui-kit.json` → `ui-kit.components.slider`. **Do not pass a variant, size, or state that is not listed here.**

| Axis      | Options                       |
| --------- | ----------------------------- |
| `layouts` | `stacked`, `side-by-side`     |
| `states`  | `error`, `disabled`, `active` |

**`layouts` is the label placement axis.** `side-by-side` — label beside the control — is the house default; `stacked` is the fallback when the container is too narrow to fit both. The trigger is container width, not viewport.

**This field's `layouts` value is not an independent choice.** `recursica-skill-forms` requires **one label placement per form — side-by-side or stacked, never both at the same breakpoint.** The container-width test is applied once, to the form, and its answer governs every field in it, including short fields that would have fit. Match every other field in the same form. A whole form may switch placement across breakpoints; a section never gets its own. See `recursica-skill-forms`.

**`active` is unique to this component.** No other component in the kit has an `active` state. It belongs to the component's own interaction — the thumb being moved — so do not build it, and do not repurpose it to mean selected, enabled, or current.

**The numeric input is part of this component.** `input-width`, `input-height`, `input-text`, `input-gap`, `input-border-size`, `input-border-radius`, `input-padding-vertical`, `input-padding-left`, and `input-padding-right` all exist here. Do not compose a separate text field beside the track.

**Min and max labels are part of this component** — `min-max-label`. Do not render loose text at the ends of the track.

**Step indicators exist** — `step-indicator-width` and `step-indicator-border-radius` — for a slider that moves in discrete steps.

**There is a `read-only-value` treatment** for the numeric readout. Its exact semantics are not stated; see the uncovered list.

**There is no hover state, no size axis, no vertical orientation, no continuous-versus-discrete axis, and no two-thumb range axis.** Other design systems have all of these. This one does not.

## Rules for using it

**Always pair the slider with the numeric readout.** A slider on its own gives the user no way to know the exact value, and no way to state it to anyone else. The component provides the input for exactly this reason. Omit it only when the value is genuinely approximate and its effect is visible the instant it changes.

**Show the min and max labels.** The ends of the range are not inferable from the track. Use `min-max-label` rather than putting the range in the help text alone.

**A stepped slider must show its steps.** If the value moves in increments, pass step indicators. A slider that silently snaps is worse than one that moves freely, because the user cannot tell why their value jumped.

**State the unit.** The number alone is ambiguous — 40 what. Put the unit in the label or the assistive text, and keep it with the value in the readout.

**Commit timing follows what the slider is for, and it is not a second mode.** Apply convention 1 of `recursica-skill-system-conventions`, whose test is whether the user can see which mode they are in. A slider whose effect is **immediately visible** — volume, zoom, brightness — is a live control: the change is self-evident, so it **writes on change**. A slider that is **storing a value in a form** is a form field and follows that form's single save mode, whatever it is. Two different situations, not two modes of one control — so nothing here competes with the one-save-mode rule in `recursica-skill-forms`.

**Pass a real label from the shared component**, and put the rule — the unit, the range, the step size — in the assistive element as help text. See `recursica-skill-label` and `recursica-skill-assistive-element`.

**Pair the error state with a non-color indicator** — the assistive element's icon or the message itself. Required by `recursica-skill-system-conventions`.

**Never disable a slider as a way to display a value.** Disabled means the user could make it operable by doing something else first. If they can never set it here, this is not a form control.

**Do not use a slider to make a long form feel lighter.** The control is chosen by the shape of the data, not by variety.

## Accessibility

The component provides the focus ring, the thumb, and the keys inside the track. Everything below is yours, and this is where sliders fail most often — because dragging is the only interaction most implementations actually finish.

### Screen readers

- **It must announce as a slider, with its current value, its minimum, and its maximum.** A thumb on a track with no role and no bounds is unusable — the user cannot tell how far they are through the range.
- **The unit must be announced with the value.** "Forty" is not an answer; "forty percent" is. If the unit is not part of the announced value, put it in the label.
- **The value must be announced as it changes**, but must not flood — one announcement per settled value, not one per pixel of movement. Do not stack a live region on top of the value the control already announces.
- **The min and max labels must be programmatically associated with the control**, not floating text near the ends of the track. Unassociated labels are invisible to a screen reader user who tabs straight to the thumb.
- **The paired numeric input needs its own accessible name**, and it must be clear that it and the track are two views of one value — not two separate fields.
- **Pass assistive text and error text through the component.** Text rendered beside the slider is not associated with it.
- **Never rely on the track's fill to convey the value.** Position on a track is a single visual channel; the announced value and the readout are the other channels.

### Keyboard and non-mouse navigation

- **Dragging must never be the only way to set the value.** The arrow keys, and the paired numeric input where present, are the non-pointer path — and they must both be finished, not stubbed.
- **Arrow keys move by one step. Page Up and Page Down move by a larger step. Home goes to the minimum, End to the maximum.** Do not remap or swallow any of them.
- **The thumb is the tab stop, and the focus ring goes on the thumb.** Never suppress it, and never let the track's fill stand in for it.
- **The paired numeric input is its own tab stop**, in visual order relative to the track.
- **Tab order follows visual order**, and the slider sits in sequence with the fields around it. Single-column form layout is what makes this hold; see `recursica-skill-forms`.
- **Do not move focus for the user** — not when the value reaches an end, not when the numeric input is committed.
- **Nothing needed to use the slider may be hover-only.** The current value, the range ends, and the step size are all persistent or they do not exist.
- **A disabled slider is skipped by tab**, so any reason carried only by its disabled appearance is unreachable. Put the reason in text.

## Not your decision

Do not implement, override, or tune any of these — the component owns them:

- `track-height`, `track-border-radius`, `thumb-size`, `thumb-border-radius`, `thumb-elevation`.
- `step-indicator-width`, `step-indicator-border-radius`.
- `input-width`, `input-height`, `input-gap`, `input-border-size`, `input-border-radius`, `input-text`, `input-padding-vertical`, `input-padding-left`, `input-padding-right`.
- `min-max-label` and `read-only-value` styling.
- `icon-size`, and all `colors` including the `active` treatment.
- Field colors and sizes from `globals.form.field`, label-field gaps and `vertical-item-gap` from `globals.form.properties`, and the disabled treatment from `globals.states.disabled`.

## Load these too

- [`recursica-skill-label`](../recursica-skill-label/SKILL.md) — the field's name, placement, and the required or optional marker.
- [`recursica-skill-assistive-element`](../recursica-skill-assistive-element/SKILL.md) — the help text carrying unit, range, and step, and the error message.
- [`recursica-skill-forms`](../../design-rules/recursica-skill-forms/SKILL.md) — single-column layout, one label placement per form and the container-width trigger for it, validation timing, save mode, and the no-form-control-in-a-card rule.
- [`recursica-skill-selection-controls`](../../design-rules/recursica-skill-selection-controls/SKILL.md) — when a discrete-option control replaces a range, and disabled versus read-only.
- [`recursica-skill-number-input`](../recursica-skill-number-input/SKILL.md) — the control that owns exact numeric entry.
- [`recursica-skill-system-conventions`](../../design-rules/recursica-skill-system-conventions/SKILL.md) — never carry meaning in a single channel.

## Uncovered — ask, do not invent

- **Range selection with two thumbs.** Single and range selection are documented outside the token inventory; the kit defines no second thumb and no range axis. Do not assemble one, and do not rely on this without asking.
- **Continuous versus discrete as documented types.** Both are documented outside the token inventory; the kit has step-indicator properties but no types axis, so what switches a slider between them is unstated. Do not rely on this without asking.
- **A hover state.** One is documented outside the token inventory; the kit's states are `error`, `disabled`, and `active` only. Do not rely on this without asking.
- **What `read-only-value` actually means** — a non-editable readout beside an operable track, or a read-only slider as a whole.
- **Whether the numeric input is required or optional**, and on which surfaces. The house says "highly recommended", which is not a rule.
- **Value labels other than min and max**, including a label that tracks the thumb.
- **Vertical orientation.** No axis supports it.

## Pre-flight checklist

- [ ] The range is bounded, and both ends are shown with `min-max-label`.
- [ ] A numeric readout is paired with the track, unless the value is genuinely approximate with an instantly visible effect.
- [ ] A stepped slider shows step indicators; the unit is stated in the label or assistive text.
- [ ] A real label is passed, and its `layouts` placement matches every other field in the same form — one placement per form, per `recursica-skill-forms`.
- [ ] Commit timing is settled and stated: a live control with an immediately visible effect writes on change; an in-form slider follows that form's single save mode.
- [ ] Help text carries the unit, range, and step; the error message restates the rule broken.
- [ ] The error state carries a non-color indicator.
- [ ] The control announces as a slider with current, minimum, and maximum values, and its unit.
- [ ] The value is announced as it changes, once per settled value, with no duplicate live region.
- [ ] Min and max labels and assistive text are programmatically associated, not floating.
- [ ] Arrow keys move one step, Page Up and Page Down move a larger step, Home and End reach the ends.
- [ ] The value can be set with no pointer at all; dragging is never the only path.
- [ ] The thumb is the tab stop, the focus ring is on the thumb and not suppressed, and the numeric input is its own tab stop.
- [ ] Tab order follows visual order, focus is never moved for the user, and nothing needed is hover-only.
- [ ] No variant, size, or state outside the inventory above was passed — no hover, no second thumb, no vertical.
- [ ] No component-owned property was overridden, and `active` was not repurposed.
- [ ] No slider was disabled as a way to display a value.
- [ ] Nothing in the uncovered list was invented.
