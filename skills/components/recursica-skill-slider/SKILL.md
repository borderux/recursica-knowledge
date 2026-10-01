---
name: recursica-skill-slider
description: How to use the Recursica slider — when a bounded range beats typing, states and label placement, the paired number input, min and max labels, steps, and setting the value without dragging. Use for sliders and range controls. Not for exact numbers — see recursica-skill-number-input; not for progress — see recursica-skill-loader.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Slider

A slider picks a value from a range with fixed ends, by moving a thumb (the handle you drag) along a track (the bar it moves along).

## Use it when

- **The range has fixed, known ends** — there is a real minimum and a real maximum, and both can be shown.
- **Precision does not matter.** The user wants "about here", not a specific number.
- **The result is instant and visible** — volume, brightness, opacity, zoom. The user judges the value by its effect, not by reading it.
- **The surface is touch or pen.** A long track with a large thumb is a comfortable target, where a small number field is not.

## Do not use it when

| Instead of a slider                            | Use                                                                                             |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| The user already has an exact number in mind   | `recursica-skill-number-input`                                                                  |
| The range has no end, or an open end           | `recursica-skill-number-input` — a track needs two ends to exist                                |
| There are only a few separate values           | `recursica-skill-segmented-control` or a radio group — see `recursica-skill-selection-controls` |
| The value must match an outside source exactly | A typed field, so the user can enter what they were given                                       |
| You are showing how far something has got      | `recursica-skill-loader` — a slider is an input, not an indicator                               |
| This user can never edit the value             | `recursica-skill-read-only-field`                                                               |

**A slider is not a cheaper number input.** If the exact figure matters, the slider is at best an extra alongside a typed value — never a replacement for it.

## What exists

Taken from the UI kit (the token file, `recursica_ui-kit.json`, that says which variants and states each component has) → `ui-kit.components.slider`. **Do not pass a variant, size, or state that is not listed here.**

**The third column is the React prop that sets each axis.** An axis (a variant property, as Figma calls it — one way a component varies, such as its size) is named in the UI kit. Its name is not a prop, and if you pass it as one, React quietly ignores it. A blank cell means no single prop sets that axis — it is set by CSS state or by separate props, and the rules below say which.

| Axis      | Options                       | React prop   |
| --------- | ----------------------------- | ------------ |
| `layouts` | `stacked`, `side-by-side`     | `formLayout` |
| `states`  | `error`, `disabled`, `active` |              |

**`layouts` is the label-placement axis, set by the `formLayout` prop.** `side-by-side` — the label beside the control — is the house default. `stacked` is the fallback when the container is too narrow to fit both. What decides this is the container's width, not the viewport's (the visible area of the browser window). See `recursica-skill-forms`.

**`formLayout` defaults to `stacked`, so the house rule is the one thing you must pass.** Leave it out, and you get the fallback in a container of any width — the rule turned upside down. `layouts` is the name of the token axis, not a prop: `layouts="side-by-side"` is quietly ignored by React and leaves the control stacked, with no error. Pass `formLayout="side-by-side"` explicitly.

**Label placement is one decision per form, not per field.** This field's `layouts` value is not a separate choice — it matches every other field in the same form. The container-width test is applied once, to the whole form, and its answer governs every field in it, including short ones that would have fitted side by side. A whole form may switch placement between breakpoints (the screen widths at which the layout changes), but it never mixes the two at one breakpoint, and a section never gets its own placement. Owned by `recursica-skill-forms`.

**`active` is found only on this component.** No other component in the UI kit has an `active` state. It belongs to the component's own interaction — the thumb being moved — so do not build it, and do not repurpose it to mean selected, enabled, or current.

**The number input is part of this component.** `input-width`, `input-height`, `input-text`, `input-gap`, `input-border-size`, `input-border-radius`, `input-padding-vertical`, `input-padding-left`, and `input-padding-right` all exist here. Do not build a separate text field beside the track.

**The minimum and maximum labels are part of this component** — `min-max-label`. Do not place loose text at the ends of the track.

**Step indicators exist** — `step-indicator-width` and `step-indicator-border-radius` — for a slider that moves in fixed steps.

**There is a `read-only-value` treatment** for the number readout. Its exact meaning is not stated; see the uncovered list.

**There is no hover state, no size axis, no vertical orientation, no axis for smooth versus stepped, and no axis for a range with two thumbs.** Other design systems have all of these. This one does not.

## Rules for using it

**Always pair the slider with the number readout.** A slider on its own gives the user no way to know the exact value, and no way to tell it to anyone else. The component provides the input for exactly this reason. Leave it out only when the value really is approximate, and its effect is visible the instant it changes.

**Show the minimum and maximum labels.** The ends of the range cannot be worked out from the track. Use `min-max-label`, instead of putting the range only in the help text.

**A slider with steps must show its steps.** If the value moves in fixed amounts, pass step indicators. A slider that snaps to values without showing why is worse than one that moves freely, because the user cannot tell why their value jumped.

**State the unit.** The number alone is unclear — 40 what? Put the unit in the label or the assistive text, and keep it with the value in the readout.

**When a change is saved depends on what the slider is for, and it is not a second mode.** Apply convention 1 of `recursica-skill-system-conventions`, whose test is whether the user can see which mode they are in. A slider whose effect is visible right away — volume, zoom, brightness — is a live control: the change is obvious, so it saves when it changes. A slider that stores a value in a form is a form field, and follows that form's single save mode, whatever it is. These are two different situations, not two modes of one control — so nothing here conflicts with the one-save-mode rule in `recursica-skill-forms`.

**Pass a real label from the shared component**, and put the rule — the unit, the range, the step size — in the assistive element as help text. See `recursica-skill-label` and `recursica-skill-assistive-element`.

**Pair the error state with a signal that is not color** — the assistive element's icon, or the message itself. Required by `recursica-skill-system-conventions`.

**Never disable a slider as a way to show a value.** Disabled means the user could make it usable by doing something else first. If they can never set it here, this is not a form control.

**Do not use a slider to make a long form feel lighter.** The shape of the data chooses the control, not a wish for variety.

## Accessibility

This component also follows the accessibility baseline in `recursica-skill-system-conventions`. Only what is specific to it is listed here.

The component provides the focus ring (the outline that shows which element has keyboard focus), the thumb, and the keys inside the track. Everything below is up to you — and this is where sliders fail most often, because dragging is the only interaction most builds actually finish.

### Screen readers

- **It must be announced as a slider, with its current value, its minimum, and its maximum.** A thumb on a track with no role and no limits cannot be used — the user cannot tell how far through the range they are.
- **The unit must be announced with the value.** "Forty" is not an answer; "forty percent" is. If the unit is not part of the announced value, put it in the label.
- **The value must be announced as it changes, but it must not flood the user** — one announcement for each value the user settles on, not one for every pixel of movement. Do not add a live region (an area a screen reader announces automatically when its content changes) on top of the value the control already announces.
- **The minimum and maximum labels must be connected to the control in code**, not left as floating text near the ends of the track. Labels that are not connected are invisible to a screen reader (software that reads the screen aloud) user who tabs straight to the thumb.
- **The paired number input needs its own accessible name** (the name a screen reader reads out for a control), and it must be clear that it and the track are two views of one value — not two separate fields.
- **Never rely on the track's fill to show the value.** Position on a track is a single visual channel (a way of carrying meaning, such as color, shape, position, or text). The announced value and the readout are the other channels.

### Keyboard and non-mouse navigation

- **Dragging must never be the only way to set the value.** The arrow keys, and the paired number input where there is one, are the ways to do it without a pointer — and both must be finished, not left half built.
- **The arrow keys move by one step. Page Up and Page Down move by a larger step. Home goes to the minimum, and End to the maximum.** Do not remap or swallow any of them.
- **The thumb is the tab stop (a place the Tab key lands), and the focus ring goes on the thumb.** Never hide it, and never let the track's fill stand in for it.
- **The paired number input is its own tab stop**, in visual order relative to the track.
- **Do not move focus for the user** — not when the value reaches an end, and not when the number input is saved.
- **Nothing needed to use the slider may appear only on hover.** The current value, the ends of the range, and the step size all stay on screen, or they do not exist.

## Decided elsewhere

Do not implement, override, or tune any of these — the component owns them:

- `track-height`, `track-border-radius`, `thumb-size`, `thumb-border-radius`, `thumb-elevation`.
- `step-indicator-width`, `step-indicator-border-radius`.
- `input-width`, `input-height`, `input-gap`, `input-border-size`, `input-border-radius`, `input-text`, `input-padding-vertical`, `input-padding-left`, `input-padding-right`.
- `min-max-label` and `read-only-value` styling.
- `icon-size`, and all `colors` including the `active` treatment.
- Field colors and sizes from `globals.form.field`, label-field gaps and `vertical-item-gap` from `globals.form.properties`, and the disabled treatment from `globals.states.disabled`.

## Load these too

- `recursica-skill-label` — the field's name, placement, and the required or optional marker.
- `recursica-skill-assistive-element` — the help text carrying unit, range, and step, and the error message.
- `recursica-skill-forms` — single-column layout, one label placement per form and the container-width trigger for it, validation timing, save mode, and the no-form-control-in-a-card rule.
- `recursica-skill-selection-controls` — when a discrete-option control replaces a range, and disabled versus read-only.
- `recursica-skill-system-conventions` — never carry meaning in a single channel.

### Only if the screen also uses it

- `recursica-skill-number-input` — the control that owns exact numeric entry.

## Uncovered — ask, do not invent

- **Choosing a range with two thumbs.** Single and range selection are shown only on the design-system website, but the UI kit defines no second thumb and no range axis. Do not build one, and do not rely on this without asking.
- **Smooth versus stepped, as documented types.** Both are shown only on the design-system website. The UI kit has step-indicator properties but no types axis, so what switches a slider between them is not stated. Do not rely on this without asking.
- **A hover state.** One is shown only on the design-system website, but the UI kit's states are only `error`, `disabled`, and `active`. Do not rely on this without asking.
- **What `read-only-value` really means** — a readout that cannot be edited beside a track that can be used, or a read-only slider as a whole.
- **Whether the number input is required or optional**, and on which surfaces. The house says "highly recommended", which is not a rule.
- **Value labels other than the minimum and maximum**, including a label that moves with the thumb.
- **Vertical orientation.** No axis supports it.

## Pre-flight checklist

- [ ] The range has fixed ends, and both ends are shown with `min-max-label`.
- [ ] A number readout is paired with the track, unless the value really is approximate, with an effect that is visible right away.
- [ ] A slider with steps shows step indicators, and the unit is stated in the label or the assistive text.
- [ ] A real label is passed, and its `layouts` placement matches every other field in the same form — one placement per form, as `recursica-skill-forms` requires.
- [ ] When changes are saved is settled and stated: a live control with an effect visible right away saves when it changes; a slider in a form follows that form's single save mode.
- [ ] Help text states the unit, range, and step, and the error message restates the rule broken.
- [ ] The error state has a signal that is not color.
- [ ] The control is announced as a slider, with its current, minimum, and maximum values, and its unit.
- [ ] The value is announced as it changes, once for each value settled on, with no duplicate live region.
- [ ] The minimum and maximum labels and the assistive text are connected in code, not floating.
- [ ] The arrow keys move one step, Page Up and Page Down move a larger step, and Home and End reach the ends.
- [ ] The value can be set with no pointer at all, and dragging is never the only way.
- [ ] The thumb is the tab stop, the focus ring is on the thumb and not hidden, and the number input is its own tab stop.
- [ ] The tab order follows the visual order, focus is never moved for the user, and nothing needed appears only on hover.
- [ ] You passed no variant, size, or state outside the inventory above — no hover, no second thumb, and no vertical orientation.
- [ ] You overrode no property the component owns, and did not repurpose `active`.
- [ ] You did not disable a slider as a way to show a value.
- [ ] You invented nothing from the uncovered list.
