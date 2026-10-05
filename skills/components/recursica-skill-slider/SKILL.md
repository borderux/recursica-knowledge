---
name: recursica-skill-slider
description: Rules for the Recursica slider — when a bounded range beats typing, states and label placement, the paired number input, min and max labels, steps, and setting the value without dragging. Use for sliders and range controls. Not for exact numbers — see recursica-skill-number-input; not for progress — see recursica-skill-loader.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Slider

A slider lets the user pick a value from a range with fixed ends. The user moves a thumb (the handle the user drags) along a track (the bar the thumb moves along).

## When to use a slider

- **The range has fixed, known ends.** The range has a real minimum and a real maximum, and the slider can show both ends.
- **Precision does not matter.** The user wants "about here", not a specific number.
- **The user sees the result of a change at once**, as with volume, brightness, opacity, or zoom. The user judges the value by the effect of the change, not by reading the number.
- **The user works with touch or a pen.** A long track with a large thumb is easy to hit with a finger or a pen. A small number field is not.

## When not to use a slider

| Situation                                      | Use instead                                                                                      |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| The user has an exact number in mind           | `recursica-skill-number-input`                                                                   |
| The range has no end, or an open end           | `recursica-skill-number-input`. A track needs two ends.                                          |
| The value is one of only a few separate values | `recursica-skill-segmented-control`, or a radio group. See `recursica-skill-selection-controls`. |
| The value must match an outside source exactly | A typed field, where the user types the exact value from the outside source                      |
| The screen shows how far a task has progressed | `recursica-skill-loader`. A slider is an input, not an indicator.                                |
| The current user can never edit the value      | `recursica-skill-read-only-field`                                                                |

**A slider never replaces a typed value when the exact number matters.** When the exact number matters, add the slider beside the typed value, or leave out the slider.

## Variants

**Use only the slider variants and options that the Recursica MCP server lists for the project.** A designer can add variants and options in Theme Forge, so each project can differ. Get the list with the server's `recursica_get_component_doc` tool, and use the names the code uses. The code can use a different name from the name in Figma and the UI kit. A wrong name in code has no effect and shows no error. Never invent a variant or an option.

The rules below describe each option by role, such as "the error state". The names in the standard UI kit (the unchanged UI kit in the official Recursica release) are examples only.

- **An error state, a disabled state, and an active state.** In the standard UI kit, the state variant is `states`, with the options `error`, `disabled`, and `active`.
- **The active state marks the thumb while the user moves the thumb.** Do not build the active state. Do not use the active state to mean selected, enabled, or current.
- **A number input for the exact value.** The slider component includes the number input, with the number input's size, text, border, and padding. The `input-` tokens under "Styling set by tokens" set the number input. Do not build a separate text field beside the track.
- **Minimum and maximum labels.** The slider component includes a label for the minimum and a label for the maximum, `min-max-label` in the standard UI kit. Do not place separate text at the ends of the track.
- **Step indicators** for a slider that moves in fixed steps. The `step-indicator-width` and `step-indicator-border-radius` tokens set the step indicators.
- **A read-only value style for the number readout.** No rule says what the read-only value style means. See the open questions.

**Label placement is a variant.** A control's label sits beside the control or above the control. In the standard UI kit, the variant is `layouts`, with the options `side-by-side` and `stacked`. The label beside the control is the house default. The label above the control is the fallback when the form's container is too narrow for both side by side. The container's width decides, not the viewport's width. See `recursica-skill-forms`.

**Set label placement explicitly on every field.** The house rule puts the label beside the input. The code library under an adapter may put the label above the input by default, at every container width. Set the label beside the input on every field, using the names the code uses for the variant and the option.

**Label placement is one decision per form, not per field.** This field uses the same label placement as every other field in the form. Apply the container-width test once, to the whole form. The result sets the placement of every field in the form, including short fields that would fit side by side. A form may change placement at a breakpoint, but a form never mixes placements at one breakpoint, and a form section never gets a separate placement. `recursica-skill-forms` sets this rule.

## Rules

**Always show the number input with the slider.** Without the number input, the user cannot know the exact value or tell the exact value to another person. The slider component includes the number input for this reason. Leave out the number input only when the value is approximate and the user sees the effect of a change the instant the value changes.

**Show the minimum and maximum labels.** The user cannot tell the ends of the range from the track. Use the slider component's minimum and maximum labels, `min-max-label` in the standard UI kit. Do not put the range only in the help text.

**A slider that moves in fixed steps must show the steps.** When the value moves in fixed amounts, turn on the step indicators. A slider that jumps between values without showing the steps is worse than a slider that moves freely. The user cannot tell why the value jumped.

**State the unit.** A number alone is unclear, as in "40" with no unit. Put the unit in the label or the assistive text. Show the unit with the value in the number input.

**The slider's purpose decides when a change is saved.** The two purposes below are two different situations, not a second save mode. Apply convention 1 of `recursica-skill-system-conventions`. Convention 1 tests whether the user can see which save mode applies.

- A slider whose effect is visible right away, such as volume, zoom, or brightness, is a live control. A live control saves each change, because the user sees the change.
- A slider that stores a value in a form is a form field. The form field follows the form's one save mode, whichever save mode the form uses.

Neither situation conflicts with the one-save-mode rule in `recursica-skill-forms`.

**Use a real label from the label component**, and put the unit, the range, and the step size in the help text from the assistive element. See `recursica-skill-label` and `recursica-skill-assistive-element`.

**Pair the error state with a signal that is not color**, either the assistive element's icon or the error message. `recursica-skill-system-conventions` requires a signal that is not color.

**Never disable a slider to show a value.** A disabled slider means the user could make the slider usable by taking a different action first. When the user can never set the value here, the value is not a form control. Show the value with `recursica-skill-read-only-field`.

**Do not use a slider to add variety to a long form.** The type and structure of the data decide which control fits best.

## Accessibility

The rules below add to the accessibility baseline in `recursica-skill-system-conventions`, which every Recursica component follows.

The slider component already includes the focus ring and the thumb, and already responds to the keyboard inside the track. The app must add the behavior in the two lists below. Sliders most often fail on the points in the two lists, because most builds support dragging and no other input.

### Screen readers

- **The slider must be announced as a slider, with the slider's current value, minimum, and maximum.** A screen reader user cannot use a thumb on a track with no role and no limits. The user cannot tell how far through the range the value is.
- **The unit must be announced with the value.** Announce "forty percent", not "forty". If the announced value does not include the unit, put the unit in the label.
- **The value must be announced as the value changes, once for each value the user settles on.** Never announce the value for every pixel of movement. Do not add a live region (an area of the page that a screen reader announces automatically when the area's content changes) on top of the value the slider already announces.
- **The minimum and maximum labels must be connected to the slider in code**, not left as floating text near the ends of the track. A screen reader user who tabs straight to the thumb does not hear labels that are not connected.
- **The number input needs an accessible name** (the name a screen reader reads out for a control) **separate from the track's accessible name.** The number input and the track must clearly show one value, not two separate fields.
- **Never rely on the track's fill to show the value.** Position on a track is a single visual channel (color, shape, position or text, each a separate signal). The announced value and the number input are the other channels.

### Keyboard and non-mouse navigation

- **Dragging must never be the only way to set the value.** The arrow keys set the value without a pointer, and so does the number input where the slider has one. Both the arrow keys and the number input must be fully built.
- **The arrow keys move by one step. Page Up and Page Down move by a larger step. Home goes to the minimum, and End to the maximum.** Do not remap or block any of these keys.
- **The thumb is the tab stop (a place the Tab key lands), and the focus ring goes on the thumb.** Never hide the focus ring, and never use the track's fill in place of the focus ring.
- **The number input is a separate tab stop**, in visual order with the track.
- **Do not move focus for the user.** Focus stays in place when the value reaches an end, and when the number input is saved.
- **Nothing needed to use the slider may appear only on hover.** The current value, the ends of the range, and the step size stay on screen at all times. Content shown only on hover is missing for keyboard users and touch users.

## Styling set by tokens

**Do not set or override the slider properties below.** The slider component sets each property.

- `track-height`, `track-border-radius`, `thumb-size`, `thumb-border-radius`, `thumb-elevation`.
- `step-indicator-width`, `step-indicator-border-radius`.
- `input-width`, `input-height`, `input-gap`, `input-border-size`, `input-border-radius`, `input-text`, `input-padding-vertical`, `input-padding-left`, `input-padding-right`.
- `min-max-label` and `read-only-value` styling.
- `icon-size`, and all `colors`, including the colors of the `active` state.
- Field colors and sizes from `globals.form.field`, label-field gaps and `vertical-item-gap` from `globals.form.properties`, and the disabled look from `globals.states.disabled`.

## Related skills

- `recursica-skill-label` — the field's name, label placement, and the required or optional marker.
- `recursica-skill-assistive-element` — the help text that states the unit, range, and step, and the error message.
- `recursica-skill-forms` — single-column layout, one label placement per form and the container width that decides the placement, validation timing, save mode, and the rule against form controls in a card.
- `recursica-skill-selection-controls` — when a control with separate options replaces a range, and disabled versus read-only.
- `recursica-skill-system-conventions` — showing meaning in more than one channel.

### Only if used on the same screen

- `recursica-skill-number-input` — the control for typing an exact number.

## Open questions

- **Choosing a range with two thumbs.** Only the design-system website shows single selection and range selection. When the project has no range variant, never build a range with two thumbs from other parts, and ask before relying on a range with two thumbs.
- **Smooth versus stepped, as documented types.** Only the design-system website shows a smooth type and a stepped type. The standard UI kit has step indicator properties, but no rule says what switches a slider between smooth and stepped. Do not rely on smooth and stepped types without asking. Ask only when the project has no type variant for smooth and stepped.
- **A hover state.** Only the design-system website shows a hover state. Do not rely on a hover state without asking. Ask only when the project has no hover state.
- **What `read-only-value` means.** The read-only value style could mark a number readout the user cannot edit beside a track the user can use. The style could also mark a read-only slider as a whole.
- **Whether the number input is required or optional**, and whether the answer differs by device or by screen. The house guidance says "highly recommended", which is not a rule.
- **Value labels other than the minimum and maximum**, including a label that moves with the thumb.
- **Vertical orientation.** Ask about a vertical slider only when the project has no vertical orientation.

## Pre-flight checklist

- [ ] The range has fixed ends, and the slider's minimum and maximum labels (`min-max-label` in the standard UI kit) show both ends.
- [ ] The number input is shown with the track, unless the value is approximate and the effect of a change is visible right away.
- [ ] A slider with steps shows step indicators, and the unit is stated in the label or the assistive text.
- [ ] A real label is used, and the label placement (`layouts` in the standard UI kit) matches every other field in the same form, with one placement per form, as `recursica-skill-forms` requires.
- [ ] The save timing follows the slider's purpose. A live control with an effect visible right away saves each change, and a slider in a form follows the form's one save mode.
- [ ] The help text states the unit, range, and step, and the error message restates the rule the value broke.
- [ ] The error state has a signal that is not color.
- [ ] The slider is announced as a slider, with the current value, the minimum, the maximum, and the unit.
- [ ] The value is announced as the value changes, once for each value the user settles on, with no duplicate live region.
- [ ] The minimum and maximum labels and the assistive text are connected to the slider in code, not floating.
- [ ] The arrow keys move one step, Page Up and Page Down move a larger step, and Home and End reach the ends.
- [ ] The value can be set with no pointer at all, and dragging is never the only way.
- [ ] The thumb is the tab stop, the focus ring is on the thumb and not hidden, and the number input is a separate tab stop.
- [ ] The tab order follows the visual order, focus is never moved for the user, and nothing needed to use the slider appears only on hover.
- [ ] Every variant, size, and state is one the Recursica MCP server lists for the project, and no variant or option is invented. No hover state, second thumb, or vertical orientation is used unless the Recursica MCP server lists one for the project.
- [ ] Styling comes from the slider component, and the active state marks only the thumb the user is moving.
- [ ] No slider is disabled to show a value.
- [ ] Open questions were asked about, not decided: a range with two thumbs, smooth versus stepped types, a hover state, what `read-only-value` means, whether the number input is required, value labels other than the minimum and maximum, and vertical orientation.
