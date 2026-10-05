---
name: recursica-skill-label
description: Rules for the Recursica label that every form field uses — side-by-side or stacked placement by container width, the label's required indicator and optional text, label copy, and label-to-field association. Use for any field or group label. Not for help or error text — see recursica-skill-assistive-element; which fields a form marks, and how, is decided in recursica-skill-forms.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Label

The label names a form field. The label is a real component, not plain text beside an input.

## When to use a label

- Every form control needs a name, with no exception.
- A group of form controls needs a name: a checkbox group, a radio group, or a switch group.

## When not to use a label

| Situation                                        | Use instead                                                                              |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| A section or a page needs a title                | A heading. A label belongs to a form control.                                            |
| Text explains the rule for a field               | `recursica-skill-assistive-element`, with the help type (`help` in the standard UI kit). |
| Text shows what a field's value should look like | The field's placeholder. A placeholder never replaces the label.                         |
| The screen shows a value the user cannot edit    | `recursica-skill-read-only-field`. A read-only field includes a label.                   |

**A placeholder is never a label.** A screen reader does not announce a placeholder as a label. The placeholder disappears when the user types the first character.

## Variants

**Use only the label variants and options that the Recursica MCP server lists for the project.** A designer can add variants and options in Theme Forge, so each project can differ. Get the list with the server's `recursica_get_component_doc` tool, and use the names the code uses. Never invent a variant or an option.

The rules below describe each option by role, such as "the smaller size". The names in the standard UI kit (the unchanged UI kit in the official Recursica release) are examples only. The code can use a different name from the name in Figma and the standard UI kit. A wrong name in code has no effect and shows no error.

- **Two placements, the same two placements every field has.** The label sits beside the field or above the field. In the standard UI kit, the variant is `layouts`, with the options `side-by-side` and `stacked`. Set the label's placement to match the field's placement. The label's placement and the field's placement are one decision, not two. The form makes that decision, not the label. See the placement rules below.
- **Two sizes.** A label comes in a default size and a smaller size. In the standard UI kit, the variant is `sizes`, with the options `default` and `small`. When to use the smaller size is an open question.
- **A required indicator and an optional text.** The standard UI kit has both, with gap settings for each one. The optional text also has a transparency setting. The form decides which of the two to use, not the field.
- **A gap for an edit icon.** The standard UI kit sets a gap for an edit icon, so a label can hold an edit control. The purpose of the edit control is an open question.
- **Disabled state.** If the project has a disabled state for the label, use the label's disabled state. Otherwise, the field's tokens set the label's color in each of the field's states.

**Set label placement explicitly on every field.** The house rule puts the label beside the input. The code library under an adapter may put the label above the input by default, at every container width. Set the label beside the input on every field, using the names the code uses for the variant and the option.

## Rules

**Put the label beside the field by default.** The label sits to the left of the field, on the same line. Right-align the label text, so the label sits close to the field. Put the label above the field only when the form's container is too narrow for the label and the field side by side. The width of the form's container decides, not the width of the viewport. `recursica-skill-forms` sets this rule.

**Label placement is one decision per form.** A single form uses labels side by side, or stacked labels — never both at the same breakpoint.

- **Apply the container-width test once, to the whole form.** The result sets the placement of every field in the form. If the form's container is too narrow for a label and a field side by side, every label in the form stacks above the field. Short labels that would fit side by side stack too.
- **Never choose label placement field by field.** Every label in a form uses the same placement as every other label in the form. A field's width, height, or content never changes the placement of the field's label. The rule covers a tall textarea, a number input for two characters, and a radio group with eight options.
- **A whole form may change placement at a breakpoint**, such as side by side in a wide container and stacked in a narrow drawer. The form still has one placement at each breakpoint, decided once for each breakpoint. Never mix placements in one form at one breakpoint.
- **A form section never gets a separate placement.** The sections of a form are parts of one form. A form section with stacked labels below a form section with side-by-side labels is the same mistake as mixing placements between fields.

Mixing the two placements in one form causes three problems. Side-by-side labels create one column of values that the user scans straight down, and a mix of placements breaks the column. A mix also creates two left edges, so the user cannot tell whether the next text is a label or a value. The field with the different placement also looks as if the field has a different meaning from the other fields. `recursica-skill-forms` sets this rule.

**Name the object clearly.** The label must make sense without the content around the label, because a screen reader user hears the label alone. If the label has a verb, use a clear, active verb. Never use a passive verb or a linking verb (a verb such as "is" or "seems" that connects words instead of showing an action).

**Write the label in sentence case, with no colon at the end.** Keep the label short enough to fit on one line.

**Mark only the exception: the required fields or the optional fields, never both.** If most fields in a form are required, mark the few optional fields. If most fields are optional, mark the few required fields. Never mark both required fields and optional fields in one form.

**Avoid cluttering the form with asterisks.** When nearly every field in a form is required, use one signal for the whole form, such as a bold label for a required field and a regular-weight label for an optional field. State the signal once.

**Mark a whole group of fields as optional when an entire form section may not apply.** Mark the group once, instead of marking every field in the group.

**Give each control one label.** A compound control that makes up one value, such as a date plus a time plus AM/PM, gets one label for the whole compound control.

**A group label is not an item label.** A checkbox group has a group label, and each checkbox in the group has an item label. Do not use a group label as an item label, or an item label as a group label.

## Accessibility

The rules below add to the accessibility baseline in `recursica-skill-system-conventions`, which every Recursica component follows.

A screen reader user can use a field only when the field has a label. The label component exists to connect a label to a form control.

### Screen readers

- **The label must be connected in code to the form control the label names.** Each Recursica field component makes the connection. Give each field component a real label to connect. A field with no label has no accessible name (the name a screen reader reads out for a control).
- **Never replace a label with text that is only visual.** Text placed next to an input is not a label. If the field component takes a label, use the field component's label.
- **The label must make sense when read alone**, out of order and out of context. A label read alone is the whole reason for the rule to name the object clearly.
- **The required state must be available in code, not only shown by an indicator.** The asterisk or the bold weight is the visual channel (color, shape, position or text, each a separate signal). The field must also mark in code that the field is required. `recursica-skill-system-conventions` forbids relying on a single channel.
- **An optional marker must also be available in code.** When a word marks a field as optional, the word must be part of the label the screen reader announces, not a separate fragment of text.
- **Do not hide the label visually.** Sighted keyboard users and voice-control users need the visible label too. A visible label is a house requirement.
- **A group label must be announced when focus enters the group.** Placing the group label before the group in the reading order is not enough. Without the announcement, the user hears the options with no question.
- **Do not cram instructions into the label.** Put the rules for a field in an assistive element (`recursica-skill-assistive-element`). A screen reader announces a long label in full every time the user reaches the field.

### Keyboard and non-mouse navigation

- **The label is not a tab stop** (a place the Tab key lands). The label cannot receive focus by itself.
- **Clicking or tapping the label must move focus to the label's control.** A real connected label moves focus automatically and gives the user a bigger target. Do not show the label as unconnected text. Unconnected text does not move focus and gives no bigger target.
- **An edit icon on a label is a control.** The edit icon must be a separate tab stop with a separate accessible name.
- **A stacked label must not change the tab order.** Label placement changes only the look. The order is the label, then the field, for both placements.

## Styling set by tokens

**Do not set or override the label properties below.** The label component sets each property.

- `label-text` and `optional-text` type styling, and `optional-text-opacity`.
- `required-indicator-gap`, `label-optional-text-gap`, `edit-icon-gap`.
- `colors`, including the colors for the error and disabled states.
- The gap between the label and the field: `globals.form.properties.label-field-gap-horizontal` and `label-field-gap-vertical`.

## Related skills

- `recursica-skill-forms` — label placement and alignment, the container-width test, one placement per form at each breakpoint, the policy for marking required fields and optional fields, label wording, and marking a whole group as optional.
- `recursica-skill-assistive-element` — the help text and error text below the field.
- `recursica-skill-system-conventions` — showing every meaning in more than one channel.

## Open questions

- **The edit control on a label.** The standard UI kit sets a gap for an edit icon. No rule says what the edit control does, or which fields show the edit control.
- **The form-wide signal for required fields.** No rule says which signal marks required fields when a form avoids asterisks. A bold label is an example, not a rule.
- **The required indicator and the optional text in one application.** No rule says whether one application may show the required indicator on one form and the optional text on a different form.
- **Truncating a label.** No rule says what to do when a side-by-side label is longer than the space for the label.
- **When to use the smaller size.** The standard UI kit has a default size and a smaller size. No rule says when to use the smaller size. Nobody has confirmed that the adapter (the Recursica component library for one framework, such as Mantine or Angular Material) exposes the smaller size as a setting. Check the label component's settings, or ask, before relying on the smaller size.

## Pre-flight checklist

- [ ] Every form control, and every group of form controls, has a real label given to the field component or the group component.
- [ ] Each label's placement matches the field's placement, and labels sit beside fields unless the form's container is too narrow.
- [ ] Every label in a form uses the same placement, with one placement per form at each breakpoint and no mixing between fields or form sections. No field's width or height changes the placement of the field's label.
- [ ] Each label names the object, makes sense when read alone, uses active verbs, and has no colon at the end.
- [ ] Each form marks only the exception, the required fields or the optional fields, never both.
- [ ] The form has no clutter of asterisks. Where one signal applies across the form, the form states the signal once.
- [ ] The required state and the optional state are available in code, not shown only by the visual marker.
- [ ] No label is visually hidden, and no label has rules or instructions crammed into the label.
- [ ] A compound control has one label, and no group label is used as an item label.
- [ ] Clicking a label moves focus to the label's control.
- [ ] Any edit icon on a label is a separate tab stop with a separate accessible name.
- [ ] Layout, gaps, and type styling come from the label component.
- [ ] Open questions were asked about, not decided: the edit control on a label, the form-wide signal for required fields, showing the required indicator with the optional text in one application, truncating a label, and when to use the smaller size.
