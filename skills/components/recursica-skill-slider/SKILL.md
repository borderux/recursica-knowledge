---
name: recursica-skill-slider
description: Rules for the Recursica slider — when a bounded range beats typing, states and label placement, the paired number input, min and max labels, steps, and setting the value without dragging. Use for sliders and range controls. Not for exact numbers — see recursica-skill-number-input; not for progress — see recursica-skill-loader.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Slider

A slider picks a value from a range with fixed ends, by moving a thumb (the handle the user drags) along a track (the bar it moves along).

## When to use a slider

- **The range has fixed, known ends** — there is a real minimum and a real maximum, and both can be shown.
- **Precision does not matter.** The user wants "about here", not a specific number.
- **The result is instant and visible** — volume, brightness, opacity, zoom. The user judges the value by its effect, not by reading it.
- **The surface is touch or pen.** A long track with a large thumb is a comfortable target, where a small number field is not.

## When not to use a slider

| Instead of a slider                            | Use                                                                                             |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| The user has an exact number in mind           | `recursica-skill-number-input`                                                                  |
| The range has no end, or an open end           | `recursica-skill-number-input` — a track needs two ends to exist                                |
| There are only a few separate values           | `recursica-skill-segmented-control` or a radio group — see `recursica-skill-selection-controls` |
| The value must match an outside source exactly | A typed field, so the user can enter what they were given                                       |
| Showing how far a task has progressed          | `recursica-skill-loader` — a slider is an input, not an indicator                               |
| This user can never edit the value             | `recursica-skill-read-only-field`                                                               |

**A slider never replaces a typed value when the exact figure matters.** In that case, add the slider alongside the typed value or leave it out.

## Variants

Taken from the UI kit (the token file, `recursica_ui-kit.json`, that says which variants and states each component has) → `ui-kit.components.slider`. **Do not pass a variant, size, or state that is not listed here.**

**Look up each variant's name in code before using the variant.** The names in this skill are the names in Figma and the UI kit. The code can use a different name for the same variant. A wrong name in code has no effect and shows no error. The Recursica MCP server's `recursica_get_component_doc` tool gives the name to use in code.

| Variants  | Options                       |
| --------- | ----------------------------- |
| `layouts` | `stacked`, `side-by-side`     |
| `states`  | `error`, `disabled`, `active` |

**Label placement is a variant.** The label sits beside the control or above the control. In the standard UI kit, the variant is `layouts`, with the options `side-by-side` and `stacked`. The label beside the control is the house default. The label above the control is the fallback when the form's container is too narrow for both side by side. The container's width decides, not the viewport's width. See `recursica-skill-forms`.

**Set label placement explicitly on every field.** An adapter's default may put the label above the input at every container width, which breaks the house rule. Set the label beside the input on every field, using the names the code uses for the variant and the option.

**Label placement is one decision per form, not per field.** This field uses the same label placement as every other field in the form. Apply the container-width test once, to the whole form. The result sets the placement of every field in the form, including short fields that would fit side by side. A form may change placement at a breakpoint, but a form never mixes placements at one breakpoint, and a form section never gets a separate placement. `recursica-skill-forms` sets this rule.

**`active` is found only on this component.** No other component in the UI kit has an `active` state. It marks the thumb while the user moves it. Do not build it, and do not repurpose it to mean selected, enabled, or current.

**The number input is part of this component.** `input-width`, `input-height`, `input-text`, `input-gap`, `input-border-size`, `input-border-radius`, `input-padding-vertical`, `input-padding-left`, and `input-padding-right` all exist here. Do not build a separate text field beside the track.

**The minimum and maximum labels are part of this component** — `min-max-label`. Do not place loose text at the ends of the track.

**Step indicators exist** — `step-indicator-width` and `step-indicator-border-radius` — for a slider that moves in fixed steps.

**There is a `read-only-value` treatment** for the number readout. Its exact meaning is not stated; see the open questions.

**There is no hover state, no size variant, no vertical orientation, no variant for smooth versus stepped, and no variant for a range with two thumbs.** Other design systems have all of these. This one does not.

## Rules

**Always pair the slider with the number readout.** A slider on its own gives the user no way to know the exact value, and no way to tell it to anyone else. The component provides the input for exactly this reason. Leave it out only when the value is approximate and its effect is visible the instant it changes.

**Show the minimum and maximum labels.** The ends of the range cannot be worked out from the track. Use `min-max-label`, instead of putting the range only in the help text.

**A slider with steps must show its steps.** If the value moves in fixed amounts, pass step indicators. A slider that snaps to values without showing why is worse than one that moves freely, because the user cannot tell why their value jumped.

**State the unit.** The number alone is unclear — 40 what? Put the unit in the label or the assistive text, and keep it with the value in the readout.

**The slider's purpose decides when a change is saved, and this is not a second save mode.** Apply convention 1 of `recursica-skill-system-conventions`, whose test is whether the user can see which mode they are in. A slider whose effect is visible right away — volume, zoom, brightness — is a live control. It saves when it changes, because the user sees the change. A slider that stores a value in a form is a form field, and follows that form's single save mode, whatever it is. These are two different situations, not two modes of one control. Neither one conflicts with the one-save-mode rule in `recursica-skill-forms`.

**Pass a real label from the shared component**, and put the rule — the unit, the range, the step size — in the assistive element as help text. See `recursica-skill-label` and `recursica-skill-assistive-element`.

**Pair the error state with a signal that is not color** — the assistive element's icon, or the message itself. Required by `recursica-skill-system-conventions`.

**Never disable a slider as a way to show a value.** Disabled means the user could make it usable by doing something else first. If the user can never set the value here, it is not a form control. Show it with `recursica-skill-read-only-field`.

**Do not use a slider to add variety to a long form.** The type and structure of the data dictate which control is best suited.

## Accessibility

This component also follows the accessibility baseline in `recursica-skill-system-conventions`. Only the rules specific to this component are listed here.

The component provides the focus ring, the thumb, and the keyboard handling inside the track. The application must provide everything below. Sliders most often fail on these points, because most builds support dragging and nothing else.

### Screen readers

- **It must be announced as a slider, with its current value, its minimum, and its maximum.** A thumb on a track with no role and no limits cannot be used — the user cannot tell how far through the range they are.
- **The unit must be announced with the value.** Announce "forty percent", not "forty". If the unit is not part of the announced value, put it in the label.
- **The value must be announced as it changes, once for each value the user settles on** — never once for every pixel of movement. Do not add a live region (an area a screen reader announces automatically when its content changes) on top of the value the control already announces.
- **The minimum and maximum labels must be connected to the control in code**, not left as floating text near the ends of the track. Labels that are not connected are invisible to a screen reader user who tabs straight to the thumb.
- **The paired number input needs its own accessible name** (the name a screen reader reads out for a control), and it must be clear that it and the track are two views of one value — not two separate fields.
- **Never rely on the track's fill to show the value.** Position on a track is a single visual channel (color, shape, position or text, each a separate signal). The announced value and the readout are the other channels.

### Keyboard and non-mouse navigation

- **Dragging must never be the only way to set the value.** The arrow keys, and the paired number input where there is one, are the ways to do it without a pointer — and both must be fully built.
- **The arrow keys move by one step. Page Up and Page Down move by a larger step. Home goes to the minimum, and End to the maximum.** Do not remap or swallow any of them.
- **The thumb is the tab stop (a place the Tab key lands), and the focus ring goes on the thumb.** Never hide it, and never let the track's fill stand in for it.
- **The paired number input is its own tab stop**, in visual order relative to the track.
- **Do not move focus for the user** — not when the value reaches an end, and not when the number input is saved.
- **Nothing needed to use the slider may appear only on hover.** The current value, the ends of the range, and the step size stay on screen at all times. Anything shown only on hover is missing for keyboard and touch users.

## Styling set by tokens

Do not set or override any of these. The component sets them:

- `track-height`, `track-border-radius`, `thumb-size`, `thumb-border-radius`, `thumb-elevation`.
- `step-indicator-width`, `step-indicator-border-radius`.
- `input-width`, `input-height`, `input-gap`, `input-border-size`, `input-border-radius`, `input-text`, `input-padding-vertical`, `input-padding-left`, `input-padding-right`.
- `min-max-label` and `read-only-value` styling.
- `icon-size`, and all `colors` including the `active` treatment.
- Field colors and sizes from `globals.form.field`, label-field gaps and `vertical-item-gap` from `globals.form.properties`, and the disabled treatment from `globals.states.disabled`.

## Related skills

- `recursica-skill-label` — the field's name, placement, and the required or optional marker.
- `recursica-skill-assistive-element` — the help text carrying unit, range, and step, and the error message.
- `recursica-skill-forms` — single-column layout, one label placement per form and the container-width trigger for it, validation timing, save mode, and the no-form-control-in-a-card rule.
- `recursica-skill-selection-controls` — when a discrete-option control replaces a range, and disabled versus read-only.
- `recursica-skill-system-conventions` — never carry meaning in a single channel.

### Only if used on the same screen

- `recursica-skill-number-input` — the control that owns exact numeric entry.

## Open questions

- **Choosing a range with two thumbs.** Single and range selection are shown only on the design-system website, but the UI kit defines no second thumb and no range variant. Do not build one, and do not rely on this without asking.
- **Smooth versus stepped, as documented types.** Both are shown only on the design-system website. The UI kit has step-indicator properties but no types variant, so what switches a slider between them is not stated. Do not rely on this without asking.
- **A hover state.** One is shown only on the design-system website, but the UI kit's states are only `error`, `disabled`, and `active`. Do not rely on this without asking.
- **What `read-only-value` means** — a readout that cannot be edited beside a track that can be used, or a read-only slider as a whole.
- **Whether the number input is required or optional**, and on which surfaces. The house says "highly recommended", which is not a rule.
- **Value labels other than the minimum and maximum**, including a label that moves with the thumb.
- **Vertical orientation.** No variant supports it.

## Pre-flight checklist

- [ ] The range has fixed ends, and both ends are shown with `min-max-label`.
- [ ] A number readout is paired with the track, unless the value is approximate, with an effect that is visible right away.
- [ ] A slider with steps shows step indicators, and the unit is stated in the label or the assistive text.
- [ ] A real label is passed, and its `layouts` placement matches every other field in the same form — one placement per form, as `recursica-skill-forms` requires.
- [ ] The save timing is decided: a live control with an effect visible right away saves when it changes, and a slider in a form follows that form's single save mode.
- [ ] Help text states the unit, range, and step, and the error message restates the rule broken.
- [ ] The error state has a signal that is not color.
- [ ] The control is announced as a slider, with its current, minimum, and maximum values, and its unit.
- [ ] The value is announced as it changes, once for each value settled on, with no duplicate live region.
- [ ] The minimum and maximum labels and the assistive text are connected in code, not floating.
- [ ] The arrow keys move one step, Page Up and Page Down move a larger step, and Home and End reach the ends.
- [ ] The value can be set with no pointer at all, and dragging is never the only way.
- [ ] The thumb is the tab stop, the focus ring is on the thumb and not hidden, and the number input is its own tab stop.
- [ ] The tab order follows the visual order, focus is never moved for the user, and nothing needed appears only on hover.
- [ ] Every variant, size, and state comes from the inventory above — no hover, no second thumb, and no vertical orientation.
- [ ] Styling comes from the component, and `active` marks only the thumb being moved.
- [ ] No slider is disabled to show a value.
- [ ] Open questions were asked about, not decided: a range with two thumbs, smooth versus stepped types, a hover state, what `read-only-value` means, whether the number input is required, value labels other than the minimum and maximum, and vertical orientation.
