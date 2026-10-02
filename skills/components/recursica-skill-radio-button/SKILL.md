---
name: recursica-skill-radio-button
description: Rules for the Recursica radio button and group — one exclusive choice, option counts, caution with pre-selection, disabled versus read-only, and single-tab-stop arrow-key accessibility. Use for choosing exactly one option. Not for many — see recursica-skill-checkbox; not for a horizontal row — see recursica-skill-segmented-control.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Radio button

A radio group is one label with several values, of which exactly one may be selected.

## When to use a radio button

- **The options rule each other out, and exactly one must be chosen.** Radio buttons are the only correct control for this.
- **The user should see every option at once**, stacked and easy to scan, instead of opening something to find out what is available.
- **The set is small enough to compare in place** — within the limit below.
- **The change is saved with the form**, on submit.

## When not to use a radio button

| Instead of a radio group                                      | Use                                                                                           |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Zero through N options may be selected                        | `recursica-skill-checkbox`                                                                    |
| The value is binary, and its opposite is known and unique     | `recursica-skill-switch` — see the binary-inverse test in the design rules                    |
| There are more options than the limit                         | `recursica-skill-dropdown` (single select)                                                    |
| The user must type to find the value in a large, familiar set | `recursica-skill-autocomplete`                                                                |
| The options must sit in a row                                 | `recursica-skill-segmented-control`. Never lay a radio group out in a row, and never use tabs |
| Nothing has to be chosen at all                               | Check whether it is a choice of one — see the design rules                                    |
| The user is choosing an action rather than setting a value    | `recursica-skill-button`                                                                      |
| This user can never edit the value                            | `recursica-skill-read-only-field` — shows the label and text, with no input                   |

**Never use checkboxes for options that rule each other out.** A checkbox means "select as many as apply", by definition. Checkboxes let the user submit two answers to a question that has one. There is no exception.

## Radio button parts and states

Taken from the UI kit (the token file, `recursica_ui-kit.json`, that says which variants and states each component has) → `ui-kit.components.radio-button`, `radio-button-group`, and `radio-button-item`. **Do not pass a variant, size, or state that is not listed here.**

| Component            | Axis               | Options                   |
| -------------------- | ------------------ | ------------------------- |
| `radio-button`       | `selection-states` | `selected`, `unselected`  |
| `radio-button-group` | `layouts`          | `stacked`, `side-by-side` |
| `radio-button-item`  | `states`           | `disabled`                |

**Three components, one form field.** The group owns the layout and the spacing between items. The item owns one option's label, and pairs it with a control. The radio button owns the circle itself and whether it is selected. Use all three together. Never build a group in a form from bare `radio-button` instances.

**The axes (the properties a component varies on, such as size and style; Figma calls them variant properties) sit on different parts, and that is on purpose.** `layouts` belongs to the group — one decision for the whole field. `disabled` belongs to the item — so a single option can be unavailable while the rest of the choice can still be used. There is no disabled state for the group. `globals.states.disabled` supplies the disabled styling.

**`layouts` is the label-placement axis, the same axis every field has.** `side-by-side` puts the group's label beside the stack of options; `stacked` puts it above. **It does not set the direction the options run.** Options are always stacked vertically, and `recursica-skill-selection-controls` forbids a horizontal radio group outright. Never use `side-by-side` to put the radio buttons in a row.

**There is no indeterminate state**, because a radio group has no partly selected condition. None of the three has an error state, and there is no required axis.

**There is no size axis.** `size` and `icon-size` are fixed properties of the radio button.

**Read-only is a separate component** — `read-only-field`, which shows text instead of inputs.

## Rules for radio buttons

**A radio group holds at least two items.** A single radio button is not a choice, and it cannot be deselected once it is selected.

**Keep the group to 7 ± 2 options.** `recursica-skill-working-memory` and `recursica-skill-selection-controls` state the same limit. Use fewer options where they are different from each other, hard to grasp, or need specialist knowledge. Above the limit, switch to a dropdown.

**Be very careful about selecting a value in advance.** Most users do not know how to deselect a radio button, and a radio button cannot be deselected once it is set. A default therefore becomes the user's answer without the user choosing it. Pre-select only when the default is correct for nearly everyone. `recursica-skill-selection-controls` sets this rule, and it governs here. No house rule says to select the top option.

**Traditionally, a radio group requires an answer**, and the user cannot move on until one option is selected. A group with nothing selected, and no requirement to select anything, is unusual and confusing. When a design has one, check whether the field is a choice of one at all.

**A radio group used for progressive disclosure may start with nothing selected**, so that the content it reveals appears only once the user has chosen. This follows the pre-selection caution above and is not an exception to it. Nothing is selected in advance, and nothing is revealed until the user decides.

**Stack the options vertically, never horizontally.** In a row of radio buttons, it is hard to tell which circle belongs to which label. If the layout needs a row, use a segmented control instead, which is limited to 2–5 options. Never use tabs instead.

**Label placement is one decision per form, not per field.** This group's `layouts` value is not a separate choice — it matches every other field in the same form. The container-width test is applied once, to the whole form, and its answer governs every field in it, including short ones that would have fitted side by side. A whole form may switch placement between breakpoints, but it never mixes the two at one breakpoint, and a section never gets its own placement. Owned by `recursica-skill-forms`.

**Put the selection rule in assistive text**, instead of in a validation message the user sees only after a failed submit. Show it with the assistive element — see `recursica-skill-assistive-element`.

**A radio option may reveal more fields, and the form still saves the same way.** Show the revealed fields directly below the group, as soon as the option is selected, so the user sees which choice added them. The whole form still submits together.

**Never mix instant saving with saving on submit.** A radio group in a form that submits on a button must not save when it changes.

**Disabled and read-only are different components, not two styles of one.**

- **Disabled item.** It is still a radio button and still visibly a control, but it cannot be selected right now. Use it when the user could make it selectable by doing something else first.
- **Read-only field.** It is a different component, with no input. Use it when this user never changes this value here.

**Never disable an option without stating the reason in text nearby.** The keyboard skips a disabled control. A keyboard user never lands on it to learn why it is unavailable.

## Accessibility

This component also follows the accessibility baseline in `recursica-skill-system-conventions`. Only what is specific to it is listed here.

The component pairs each control with its item label, manages focus within the group, and provides the focus ring. The application provides the group's name, makes the selected state available in code, and covers everything below.

### Screen readers

- **Every option needs a real label passed to `radio-button-item`.** That label is the accessible name (the name a screen reader reads out for a control). Text placed beside a control is not a label.
- **The group needs its own label passed to `radio-button-group`**, and a screen reader must announce it when focus enters the group. Placing it above the group in the reading order is not enough. Without it, the user hears the values with no question. This is the worst failure a radio group can have.
- **The group must be announced as a group**, with a position within it — "option 2 of 5". That is what tells the user the options are alternatives, rather than separate fields.
- **The selected state must be available in code**, never shown only by a fill color or a dot. A user who cannot see the control must still hear "selected" or "not selected". Required by `recursica-skill-system-conventions`.
- **A value selected in advance is announced as the current answer.** The pre-selection caution exists for this reason: a screen reader user hears the default as a decision they made.
- **A disabled option is announced as disabled, but the arrow keys skip it.** A screen reader user cannot reach an explanation shown only by its styling. Put the reason in text.
- **When an option reveals more fields, say so before it is chosen** — in the item label, or in the group's assistive text.

### Keyboard and non-mouse navigation

- **The whole group is one tab stop** (a place the Tab key lands). Tab moves to the group and then out of it; it does not step through the options. Do not make each option its own tab stop. Checkboxes behave that way, and radio buttons do not.
- **The arrow keys move between options within the group, and moving selects.** Up and Left move to the previous option, and Down and Right to the next, wrapping around at the ends. Home and End move to the first and last option.
- **Space selects the focused option** when it is not selected. Do not remap it, and do not require Enter.
- **The library handles the keys and the roving focus (where the arrow keys move between items that share one tab stop) inside the group.** Do not attach custom key listeners, set tabindex by hand, or rebuild the wrapping. Each of these breaks keyboard behavior the library provides.
- **Clicking or tapping the item label selects its option.** A label connected to the control provides this, and it gives the user a bigger target. Text placed beside the control without that connection does not select the option.
- **Do not move focus for the user.** When an option reveals fields below, focus stays in the group, and the user reaches the new fields with the next Tab. Never move focus to the next field when an option is selected.

## Styling the radio button sets itself

Do not set or override any of these. The components set them:

- On `radio-button`: `border-radius`, `border-size`, `size`, `icon-size`.
- On `radio-button-group`: `item-gap`, `padding`.
- On `radio-button-item`: `label-gap`, `max-width`, `text`, `colors`.
- Field colors and sizes from `globals.form.field`, and the disabled treatment from `globals.states.disabled`.
- The label-to-field gaps and the spacing between items in a form — `globals.form.properties.label-field-gap-horizontal`, `label-field-gap-vertical`, `vertical-item-gap`.
- The selected dot, hover and active styling, the focus ring, and roving focus within the group.

Do not add margins or spacer elements between options or around the group; the components carry the spacing.

## Skills to read with this one

- `recursica-skill-selection-controls` — radio vs. checkbox vs. switch vs. dropdown, option counts, the pre-selection caution, vertical-only layout, the horizontal alternatives, and commit timing.
- `recursica-skill-forms` — single-column layout, label placement, its container-width trigger, and one placement per form, required vs. optional marking, validation timing, progressive disclosure, and save mode.
- `recursica-skill-label` — the group label and the item labels, copy that stands alone, and the required and optional markers.
- `recursica-skill-assistive-element` — the help and error text below the group, and the copy rules for both.
- `recursica-skill-working-memory` — the 7 ± 2 basis and the recognition-versus-comparison boundary.
- `recursica-skill-system-conventions` — never carry meaning in a single channel.

### Only if the screen also uses those components

- `recursica-skill-segmented-control` — the horizontal single-select control that replaces a rotated radio group.

## Open questions: ask, do not decide

- **The error state of a radio group.** The UI kit gives `dropdown` and `autocomplete` an `error` state, and gives the radio button none — yet a required group can fail validation. The error treatment is not stated.
- **Clearing a radio group.** The design rules treat a set radio button as one that cannot be deselected, which is why the caution about pre-selection exists. Whether a group may offer an explicit clear, or a "None" option, is not stated.
- **Radio buttons inside a table row.** Mentioned in passing in the design rules as an alternative to a switch, but not established as a pattern.

## Pre-flight checklist

- [ ] The options rule each other out, and no choice of one is built as checkboxes.
- [ ] The group holds at least two options, within 7 ± 2, and fewer for options that are hard to tell apart.
- [ ] Options are stacked vertically. There is no horizontal group, and `side-by-side` is used only for label placement.
- [ ] `layouts` matches every other field in the same form — one placement per form at any given breakpoint, with no mixing between fields or sections.
- [ ] `radio-button`, `radio-button-item`, and `radio-button-group` are used together.
- [ ] No value is selected in advance unless the default is right for nearly everyone.
- [ ] The group has a real label that states the question, and every option has a real label that states its value.
- [ ] The group is announced as a group, its label is announced when focus enters it, and the position within the set is available.
- [ ] The selected state is available in code, never shown only by a fill or a dot.
- [ ] Selection rules are in assistive text passed through the component, and the required state is available in code.
- [ ] The group is a single tab stop. The arrow keys move and select, Home and End reach the ends, and Space selects.
- [ ] Key handling, tabindex, and wrapping inside the group come from the component.
- [ ] Clicking the item label selects the option.
- [ ] Focus is never moved for the user, including when an option reveals fields below.
- [ ] Disabled is used only for options that are unavailable for now, with the reason in text. Values that can never be edited use the read-only field.
- [ ] Every variant, size, and state is one listed in the inventory above, and every property the component owns comes from the component.
- [ ] The group saves with the form, in the same save mode as everything else in the system.
- [ ] Open questions were asked about, not decided: the group error state, clearing a group, and radio buttons in table rows.
