---
name: recursica-skill-radio-button
description: How to use the Recursica radio button and group — one exclusive choice, option counts, caution with pre-selection, disabled versus read-only, and single-tab-stop arrow-key accessibility. Use for choosing exactly one option. Not for many — see recursica-skill-checkbox; not for a horizontal row — see recursica-skill-segmented-control.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Radio button

A radio group is one label with several values, of which exactly one may be selected.

## Use it when

- **The options rule each other out, and exactly one must be chosen.** Radio buttons are the only correct control for this.
- **The user should see every option at once**, stacked and easy to scan, instead of opening something to find out what is available.
- **The set is small enough to compare in place** — within the limit below.
- **The change is saved with the form**, on submit.

## Do not use it when

| Instead of a radio group                                      | Use                                                                                        |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Zero through N options may be selected                        | `recursica-skill-checkbox`                                                                 |
| The value is binary, and its opposite is known and unique     | `recursica-skill-switch` — see the binary-inverse test in the design rules                 |
| There are more options than the limit                         | `recursica-skill-dropdown` (single select)                                                 |
| The user must type to find the value in a large, familiar set | `recursica-skill-autocomplete`                                                             |
| The options must sit in a row                                 | `recursica-skill-segmented-control`. Never turn a radio group sideways, and never use tabs |
| Nothing has to be chosen at all                               | Question whether it really is a choice of one — see the design rules                       |
| The user is choosing an action rather than setting a value    | `recursica-skill-button`                                                                   |
| This user can never edit the value                            | `recursica-skill-read-only-field` — shows the label and text, with no input                |

**Using checkboxes for a choice where the options rule each other out gets the data wrong.** A checkbox means "select as many as apply", by definition. There is no exception.

## What exists

Taken from the UI kit (the token file, `recursica_ui-kit.json`, that says which variants and states each component has) → `ui-kit.components.radio-button`, `radio-button-group`, and `radio-button-item`. **Do not pass a variant, size, or state that is not listed here.**

| Component            | Axis               | Options                   |
| -------------------- | ------------------ | ------------------------- |
| `radio-button`       | `selection-states` | `selected`, `unselected`  |
| `radio-button-group` | `layouts`          | `stacked`, `side-by-side` |
| `radio-button-item`  | `states`           | `disabled`                |

**Three components, one form field.** The group owns the layout and the spacing between items. The item owns one option's label, and pairs it with a control. The radio button owns the circle itself and whether it is selected. Use all three together; never place bare `radio-button` instances in a form and call it a group.

**The axes (variant properties, as Figma calls them — the ways a component varies, such as its size) sit on different parts, and that is on purpose.** `layouts` belongs to the group — one decision for the whole field. `disabled` belongs to the item — so a single option can be unavailable while the rest of the choice can still be used. There is no disabled state for the group; `globals.states.disabled` supplies the look.

**`layouts` is the label-placement axis, the same axis every field has.** `side-by-side` puts the group's label beside the stack of options; `stacked` puts it above. **It is not an axis for which way the items run.** Options are always stacked vertically — `recursica-skill-selection-controls` forbids a horizontal radio group outright — so `side-by-side` must never be read as "put the radio buttons in a row."

**There is no indeterminate state**, because a radio group has no partly selected condition. None of the three has an error state, and there is no required axis.

**There is no size axis.** `size` and `icon-size` are fixed properties of the radio button.

**Read-only is a separate component** — `read-only-field`, which shows text instead of inputs.

## Rules for using it

**A radio group holds at least two items.** A single radio button is not a choice, and it cannot be deselected once it is selected.

**Keep the group to 7 ± 2 options.** That is the limit — one rule, one number, the same one `recursica-skill-working-memory` and `recursica-skill-selection-controls` state. Lean lower where the options are different from each other, hard to grasp, or need specialist knowledge. Above the limit, switch to a dropdown.

**Be very careful about selecting a value in advance.** Most users do not know how to deselect a radio button, and a radio button cannot be deselected once it is set, so a default quietly becomes their answer. Pre-select only when the default really is correct for nearly everyone. This is the rule in `recursica-skill-selection-controls`, and it governs here: there is no house guidance that the top option should be selected.

**Traditionally, a radio group requires an answer**, and the user cannot move on until one option is selected. A group with nothing selected, and no requirement to select anything, is unusual and confusing. Treat it as a warning sign, and ask whether it really is a choice of one.

**A radio group used for progressive disclosure may properly start with nothing selected**, so that the content it reveals appears only once the user has actually chosen. (Progressive disclosure means showing only what is needed now, with the rest available on request.) That fits with the caution above; it is not an exception to it — nothing is selected in advance, and nothing is revealed until the user decides.

**Stack the options vertically. Never horizontally.** A row of radio buttons makes it hard to tell which control belongs to which label, and the pairing between each control and its value stops being clear. If the layout calls for a row, change the control to a segmented control — which is limited to 2–5 options. Never fall back to tabs.

**Label placement is one decision per form, not per field.** This group's `layouts` value is not a separate choice — it matches every other field in the same form. The container-width test is applied once, to the whole form, and its answer governs every field in it, including short ones that would have fitted side by side. A whole form may switch placement between breakpoints (the screen widths at which the layout changes), but it never mixes the two at one breakpoint, and a section never gets its own placement. Owned by `recursica-skill-forms`.

**Put the selection rule in assistive text**, instead of in a validation message the user only sees after they fail. Pass it through `recursica-skill-assistive-element`.

**A radio option may reveal more fields, and that does not change how saving works.** Keep the revealed content right below the group that triggered it, appearing immediately, so the user can see the cause and effect. The whole form still submits together.

**Never mix instant saving with saving everything together.** A radio group in a form that submits on a button must not save when it changes.

**Disabled and read-only are different components, not two styles of one.**

- **Disabled item** — still a radio button, still clearly a control, just not selectable right now. Use it when the user could make it selectable by doing something else first.
- **Read-only field** — a different component entirely, with no input. Use it when this user never changes this value here.

**Never disable an option as the only explanation.** The keyboard skips a disabled control, so the reason must be in text nearby.

## Accessibility

This component also follows the accessibility baseline in `recursica-skill-system-conventions`. Only what is specific to it is listed here.

The component pairs each control with its item label, manages focus within the group, and provides the focus ring (the outline that shows which element has keyboard focus). The group's name, making the state available, and everything below are up to you.

### Screen readers

- **Every option needs a real label passed to `radio-button-item`.** That label is the accessible name (the name a screen reader reads out for a control). Text just drawn beside a control is not a label.
- **The group needs its own label passed to `radio-button-group`**, and it must be announced when focus enters the group — not just sit above it in the reading order. Without it, the user hears values with no question attached, which is the single worst way this control fails.
- **The group must be announced as a group**, with a position within it — "option 2 of 5". That is what tells the user the options are alternatives, rather than separate fields.
- **The selected state must be available in code**, never shown only by a fill colour or a dot. A user who cannot see the control must still hear "selected" or "not selected". Required by `recursica-skill-system-conventions`.
- **A value selected in advance is announced as the current answer.** This is exactly why the caution about pre-selection exists: the default is heard as a decision already made.
- **A disabled option is announced as disabled, but the arrow keys skip it**, so any explanation carried only by how it looks cannot be reached. Put the reason in text.
- **When an option reveals more fields, say so before it is chosen** — in the item label, or in the group's assistive text.

### Keyboard and non-mouse navigation

- **The whole group is one tab stop** (a place the Tab key lands). Tab moves to the group and then out of it; it does not step through the options. Do not make each option its own tab stop — that is how checkboxes behave, not radio buttons.
- **The arrow keys move between options within the group, and moving selects.** Up and Left move to the previous option, and Down and Right to the next, wrapping around at the ends. Home and End move to the first and last option.
- **Space selects the focused option**, where it is not already selected. Do not remap it, and do not require Enter.
- **The library owns how keys work and the roving focus inside the group** — roving focus is where the arrow keys move between options that share one tab stop. Do not attach your own key listeners, do not manage tabindex yourself, and do not rebuild the wrapping — you will break behaviour that already works.
- **Clicking or tapping the item label selects its option.** That comes free with a real connected label, and it gives the user a bigger target. Do not break it by showing the label as loose text.
- **Do not move focus for the user.** When an option reveals fields below, focus stays in the group, and the user reaches the new fields with the next Tab. Never jump ahead because a choice seems made.

## Not your decision

Do not implement, override, or tune any of these — the components own them:

- On `radio-button`: `border-radius`, `border-size`, `size`, `icon-size`.
- On `radio-button-group`: `item-gap`, `padding`.
- On `radio-button-item`: `label-gap`, `max-width`, `text`, `colors`.
- Field colours and sizes from `globals.form.field`, and the disabled treatment from `globals.states.disabled`.
- The label-to-field gaps and the spacing between items in a form — `globals.form.properties.label-field-gap-horizontal`, `label-field-gap-vertical`, `vertical-item-gap`.
- The selected dot, hover and active styling, the focus ring, and roving focus within the group.

Do not add margins or spacer elements between options or around the group; the components carry the spacing.

## Load these too

- `recursica-skill-selection-controls` — radio vs. checkbox vs. switch vs. dropdown, option counts, the pre-selection caution, vertical-only layout, the horizontal alternatives, and commit timing.
- `recursica-skill-forms` — single-column layout, label placement, its container-width trigger, and one placement per form, required vs. optional marking, validation timing, progressive disclosure, and save mode.
- `recursica-skill-label` — the group label and the item labels, copy that stands alone, and the required and optional markers.
- `recursica-skill-assistive-element` — the help and error text below the group, and the copy rules for both.
- `recursica-skill-working-memory` — the 7 ± 2 basis and the recognition-versus-comparison boundary.
- `recursica-skill-system-conventions` — never carry meaning in a single channel.

### Only if the screen also uses it

- `recursica-skill-segmented-control` — the horizontal single-select control that replaces a rotated radio group.

## Uncovered — ask, do not invent

- **How a radio group shows an error.** The UI kit gives `dropdown` and `autocomplete` an `error` state, and gives the radio button none — yet a required group can fail validation. The error treatment is not stated.
- **Whether any control ever clears a radio group.** The design rules treat a set radio button as one that cannot be deselected, which is why the caution about pre-selection exists. Whether a group may offer an explicit clear, or a "None" option, is not stated.
- **Radio buttons inside a table row.** Mentioned in passing in the design rules as an alternative to a switch, but not established as a pattern.

## Pre-flight checklist

- [ ] The options really do rule each other out, and nothing that is a choice of one is built as checkboxes.
- [ ] The group holds at least two options, within 7 ± 2, and fewer for options that are hard to tell apart.
- [ ] Options are stacked vertically. There is no horizontal group, and `side-by-side` is used only for label placement.
- [ ] `layouts` matches every other field in the same form — one placement per form at any given breakpoint, with no mixing between fields or sections.
- [ ] `radio-button`, `radio-button-item`, and `radio-button-group` are used together.
- [ ] No value is selected in advance unless the default is right for nearly everyone.
- [ ] The group has a real label, every option has a real label, and neither does the other's job.
- [ ] The group is announced as a group, its label is announced when focus enters it, and the position within the set is available.
- [ ] The selected state is available in code, never shown only by a fill or a dot.
- [ ] Selection rules are in assistive text passed through the component, and the required state is available in code.
- [ ] The group is a single tab stop. The arrow keys move and select, Home and End reach the ends, and Space selects.
- [ ] You overrode no key handling, tabindex, or wrapping behaviour inside the group.
- [ ] Clicking the item label selects the option.
- [ ] Focus is never moved for the user, including when an option reveals fields below.
- [ ] Disabled is used only for options that are unavailable for now, with the reason in text. Values that can never be edited use the read-only field.
- [ ] You passed no variant, size, or state outside the inventory above, and overrode no property the component owns.
- [ ] The group saves with the form, in the same save mode as everything else in the system.
- [ ] You invented nothing from the uncovered list: the group error state, clearing a group, and radio buttons in table rows.
