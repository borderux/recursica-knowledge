---
name: recursica-skill-slider
description: Rules for the Recursica slider — when to choose a range with fixed ends over typing, states and label placement, the paired number input, min and max labels, steps, and setting the value without dragging. Use for sliders and range controls. Not for exact numbers — see recursica-skill-number-input; not for progress — see recursica-skill-loader.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Slider

A slider lets the persona pick a value from a range with fixed ends. The persona moves a thumb (the handle the persona drags) along a track (the bar the thumb moves along).

## When to use a slider

- **The range has fixed, known ends.** The range has a real minimum and a real maximum, and the slider can show both ends.
- **The exact value does not matter.** The persona wants a rough value, not a specific number.
- **The persona sees the result of a change at once**, as with volume, brightness, opacity, or zoom. The persona judges the value by the effect of the change, not by reading the number.
- **The persona works with touch or a pen.** A long track with a large thumb is easy to hit with a finger or a pen. A small number field is hard to hit with a finger or a pen.

## When not to use a slider

| Situation                                               | Use instead                                                                                      |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| The persona has an exact number in mind                 | `recursica-skill-number-input`                                                                   |
| The range has no end, or an open end                    | `recursica-skill-number-input`. A slider's track needs two ends.                                 |
| The value is one of only a few separate values          | `recursica-skill-segmented-control`, or a radio group. See `recursica-skill-selection-controls`. |
| The value must match an outside source exactly          | A typed field, where the persona types the exact value from the outside source                   |
| The screen shows how far a task has progressed          | `recursica-skill-loader`. A slider is an input, not an indicator.                                |
| The persona viewing the screen can never edit the value | `recursica-skill-read-only-field`                                                                |

**A slider never replaces a typed value when the exact number matters.** When the exact number matters, add the slider beside the typed value, or leave out the slider.

## Variants

**Use only the slider variants and options that the Recursica MCP server lists for the project.** A designer can add variants and options in Theme Forge, so each project can differ. Get the list with the server's `recursica_get_component_doc` tool, and use the names the code uses. The code can use a different name from the name in Figma and the UI kit. A wrong name in code has no effect and shows no error. Never invent a variant or an option.

The rules below describe each option by role, such as "the error state". The names in the standard UI kit (the unchanged UI kit in the official Recursica release) are examples only.

- **The slider has an error state, a disabled state, and an active state.** In the standard UI kit, the state variant is `states`, with the options `error`, `disabled`, and `active`.
- **The active state marks the thumb while the persona moves the thumb.** Do not build the active state. Do not use the active state to mean selected, enabled, or current.
- **The slider component includes a number input for the exact value.** Do not build a separate text field beside the track.
- **The slider component includes a label for the minimum and a label for the maximum.** The standard UI kit calls the two labels `min-max-label`. Do not place separate text at the ends of the track.
- **Step indicators mark the steps of a slider that moves in fixed steps.**
- **The slider has a read-only value style for the number the slider shows.** No rule says what the read-only value style means. See the open questions.

**Label placement is a variant.** A control's label sits beside the control or above the control. In the standard UI kit, the variant is `layouts`, with the options `side-by-side` and `stacked`. The label beside the control is the house default. The label above the control is the fallback when the form's container is too narrow for both side by side. The container's width decides, not the viewport's width. See `recursica-skill-forms`.

**Set label placement explicitly on every field.** The house rule puts the label beside the input. The code library under an adapter may put the label above the input by default, at every container width. Set the label beside the input on every field, using the names the code uses for the variant and the option.

**Label placement is one decision per form, not per field.** This field uses the same label placement as every other field in the form. Apply the container-width test once, to the whole form. The result sets the placement of every field in the form, including short fields that would fit side by side. A form may change placement at a breakpoint, but a form never mixes placements at one breakpoint, and a form section never gets a separate placement. `recursica-skill-forms` sets this rule.

## Rules

**Always show the number input with the slider.** Without the number input, the persona cannot know the exact value or tell the exact value to another person. The slider component includes the number input for that reason. Leave out the number input only when the value is approximate and the persona sees the effect of a change the instant the value changes.

**Show the minimum and maximum labels.** The track alone does not show the values at the ends of the range. Use the slider component's minimum and maximum labels, `min-max-label` in the standard UI kit. Do not put the range only in the help text.

**A slider that moves in fixed steps must show the steps.** When the value moves in fixed amounts, turn on the step indicators. A slider that jumps between values without showing the steps is worse than a slider that moves freely. The persona cannot tell why the value jumped.

**State the unit.** A number with no unit, such as "40", does not say what the number measures. Put the unit in the label or the assistive text. Show the unit with the value in the number input.

**The slider's purpose decides when a change is saved.** The two purposes below are two different situations, and neither purpose adds a second save mode. Apply convention 1 of `recursica-skill-system-conventions`, which tests whether the persona can see which save mode applies.

- A slider whose effect is visible right away, such as volume, zoom, or brightness, is a live control. A live control saves each change, because the persona sees the change.
- A slider that stores a value in a form is a form field. The form field follows the form's one save mode, whichever save mode the form uses.

Neither situation conflicts with the one-save-mode rule in `recursica-skill-forms`.

**Use the label component for the slider's label**, and put the unit, the range, and the step size in the help text from the assistive element. See `recursica-skill-label` and `recursica-skill-assistive-element`.

**Pair the error state with a signal that is not color**, either the assistive element's icon or the error message. `recursica-skill-system-conventions` requires a signal that is not color.

**Never disable a slider to show a value.** A disabled slider means the persona could make the slider usable by taking a different action first. When the persona can never set the value where the value is shown, show the value with `recursica-skill-read-only-field`, not with a form control.

**Do not use a slider to add variety to a long form.** The type and structure of the data decide which control fits best.

## Accessibility

The rules below add to the accessibility baseline in `recursica-skill-system-conventions`, which every Recursica component follows.

The slider component includes the focus ring and the thumb, and responds to the keyboard inside the track. The application must add every behavior in the two lists below. Sliders most often fail the rules in the two lists, because most built sliders support dragging and no other input.

### Screen readers

- **The slider must be announced as a slider, with the slider's current value, minimum, and maximum.** A persona using a screen reader cannot use a slider that has no role and no announced limits. Without the minimum and maximum, the persona cannot tell how far through the range the value is.
- **The unit must be announced with the value.** Announce "forty percent", not "forty". If the announced value does not include the unit, put the unit in the label.
- **The value must be announced as the value changes, once for each value the persona settles on.** Never announce the value for every pixel of movement. Do not add a live region (an area of the page that a screen reader announces automatically when the area's content changes) that repeats the value the slider announces.
- **The minimum and maximum labels must be connected to the slider in code**, not left as floating text near the ends of the track. A persona who uses a screen reader and tabs straight to the thumb does not hear labels that are not connected.
- **The number input needs an accessible name** (the name a screen reader reads out for a control) **separate from the track's accessible name.** The number input and the track must clearly show that both set one value, not two separate values.
- **Never rely on the track's fill to show the value.** The thumb's position on the track is a single visual channel (color, shape, position or text, each a separate signal). The announced value and the number input show the value in other channels.

### Keyboard and non-mouse navigation

- **Dragging must never be the only way to set the value.** The arrow keys set the value without a pointer. The number input also sets the value without a pointer, where the slider has a number input. The arrow keys and the number input must both work fully.
- **The arrow keys move by one step. Page Up and Page Down move by a larger step. Home goes to the minimum, and End to the maximum.** Do not remap or block the arrow keys, Page Up, Page Down, Home, or End.
- **The thumb is the tab stop (a place the Tab key lands), and the focus ring goes on the thumb.** Never hide the focus ring, and never use the track's fill in place of the focus ring.
- **The number input is a separate tab stop.** The tab order follows the visual order of the track and the number input.
- **Do not move focus for the persona.** Focus stays in place when the value reaches an end, and when the number input is saved.
- **Show every part needed to use the slider without hover.** The current value, the ends of the range, and the step size stay on screen at all times. Content shown only on hover is missing for personas using a keyboard and personas using touch.

## Styling set by tokens

**Never set or override the slider's styling.** The theme sets every visual property of the slider, such as size, spacing, borders, colors and animation. Do not add extra containers or spacers to change the slider's look. If the design needs a look the theme does not give, report the missing look as a gap in the design system. See `recursica-skill-design-router`.

## Related skills

- `recursica-skill-label` — the field's name, label placement, and the required or optional marker.
- `recursica-skill-assistive-element` — the help text that states the unit, range, and step, and the error message.
- `recursica-skill-forms` — single-column layout, one label placement per form and the container width that decides the placement, validation timing, save mode, and the rule against form controls in a card.
- `recursica-skill-selection-controls` — when a control with separate options replaces a range, and disabled versus read-only.
- `recursica-skill-system-conventions` — showing meaning in more than one channel.

### Only if used on the same screen

- `recursica-skill-number-input` — the control for typing an exact number.

## Open questions

- **Choosing a range with two thumbs.** Only the design-system website shows single selection and range selection. If the project has no range variant, never build a range with two thumbs from other parts, and ask before relying on a range with two thumbs.
- **Smooth versus stepped, as documented types.** Only the design-system website shows a smooth type and a stepped type. The standard UI kit has step indicator properties, but no rule says what switches a slider between smooth and stepped. Do not rely on smooth and stepped types without asking. Ask only when the project has no type variant for smooth and stepped.
- **A hover state.** Only the design-system website shows a hover state. Do not rely on a hover state without asking. Ask only when the project has no hover state.
- **What `read-only-value` means.** The read-only value style could mark a number readout the persona cannot edit beside a track the persona can use. The style could also mark a read-only slider as a whole.
- **Whether the number input is required or optional**, and whether the answer differs by device or by screen. The house guidance calls the number input "highly recommended", and "highly recommended" is not a rule.
- **Value labels other than the minimum and maximum**, including a label that moves with the thumb.
- **Vertical orientation.** Ask about a vertical slider only when the project has no vertical orientation.

## Pre-flight checklist

- [ ] The range has fixed ends, and the slider's minimum and maximum labels (`min-max-label` in the standard UI kit) show both ends.
- [ ] The number input is shown with the track, unless the value is approximate and the effect of a change is visible right away.
- [ ] A slider with steps shows step indicators, and the unit is stated in the label or the assistive text.
- [ ] The slider's label comes from the label component, and the label placement (`layouts` in the standard UI kit) matches every other field in the same form, with one placement per form, as `recursica-skill-forms` requires.
- [ ] The save timing follows the slider's purpose. A live control with an effect visible right away saves each change, and a slider in a form follows the form's one save mode.
- [ ] The help text states the unit, range, and step, and the error message restates the rule the value broke.
- [ ] The error state has a signal that is not color.
- [ ] The slider is announced as a slider, with the current value, the minimum, the maximum, and the unit.
- [ ] The value is announced as the value changes, once for each value the persona settles on, with no duplicate live region.
- [ ] The minimum and maximum labels and the assistive text are connected to the slider in code, not left as floating text.
- [ ] The arrow keys move one step, Page Up and Page Down move a larger step, and Home and End reach the ends.
- [ ] The value can be set with no pointer at all, and dragging is never the only way.
- [ ] The thumb is the tab stop, the focus ring is on the thumb and not hidden, and the number input is a separate tab stop.
- [ ] The tab order follows the visual order, focus is never moved for the persona, and every part needed to use the slider shows without hover.
- [ ] Every variant, size, and state is one the Recursica MCP server lists for the project, and no variant or option is invented. No hover state, second thumb, or vertical orientation is used unless the Recursica MCP server lists one for the project.
- [ ] No styling is set or overridden on the slider, and no container or spacer is added to change the slider's look.
- [ ] The active state marks only the thumb the persona is moving.
- [ ] No slider is disabled to show a value.
- [ ] Open questions were asked about, not decided: a range with two thumbs, smooth versus stepped types, a hover state, what `read-only-value` means, whether the number input is required, value labels other than the minimum and maximum, and vertical orientation.
