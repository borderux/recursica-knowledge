---
name: recursica-skill-radio-button
description: Rules for the Recursica radio button and group — one exclusive choice, option counts, caution with pre-selection, disabled versus read-only, and single-tab-stop arrow-key accessibility. Use for choosing exactly one option. Not for choosing several options — see recursica-skill-checkbox; not for options in a horizontal row — see recursica-skill-segmented-control.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Radio button

A radio group has one group label and several options. Exactly one option may be selected.

## When to use a radio button

- **The options rule each other out, and the user must choose exactly one option.** Radio buttons are the only correct control for a choice of exactly one option.
- **The user should see every option at once**, stacked and easy to scan. The user should not have to open a control to find out which options exist.
- **The options are few enough to compare on the screen**, within the limit in the rules below.
- **A form saves the chosen option on submit**, together with the form's other fields.

## When not to use a radio button

| Instead of a radio group                                                | Use                                                                                                          |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| The user may select any number of options, from zero to all             | `recursica-skill-checkbox`                                                                                   |
| The value is binary, and the opposite of the value is known and unique  | `recursica-skill-switch`. See the binary-inverse test in `recursica-skill-selection-controls`.               |
| The choice has more options than the limit                              | `recursica-skill-dropdown`, with a single selection                                                          |
| The user must type to find the value in a long list of familiar options | `recursica-skill-autocomplete`                                                                               |
| The options must sit in a row                                           | `recursica-skill-segmented-control`. Never lay out a radio group's options in a row, and never use tabs.     |
| The user does not have to choose any option                             | First check whether the field is a choice of one option at all. See `recursica-skill-selection-controls`.    |
| The user chooses an action, not a value                                 | `recursica-skill-button`                                                                                     |
| The current user can never edit the value                               | `recursica-skill-read-only-field`. The read-only field shows the label and the value as text, with no input. |

**Never use checkboxes for options that rule each other out.** By definition, a checkbox means "select as many as apply". Checkboxes let the user submit two answers to a question that has one answer. The rule has no exception.

## Variants

**Use only the radio button variants and options that the Recursica MCP server lists for the project.** A designer can add variants and options in Theme Forge, so each project can differ. Get the list with the server's `recursica_get_component_doc` tool, and use the names the code uses. Never invent a variant or an option.

The rules below describe each option by role, such as "the selected state". The names in the standard UI kit (the unchanged UI kit in the official Recursica release) are examples only.

**A radio field has three components: a group, items and radio buttons. Use all three components together.**

- **A group** holds the items. The group sets the label placement. The standard UI kit calls the group `radio-button-group`.
- **An item** holds one option's label and pairs the label with one radio button. The standard UI kit calls the item `radio-button-item`.
- **A radio button** is the circle that shows whether the item's option is selected. The standard UI kit calls the radio button `radio-button`.

Never build a radio group in a form from radio buttons alone, without the group and the items.

- **A selected state and an unselected state, on the radio button.** In the standard UI kit, the variant is `selection-states`, with the options `selected` and `unselected`.
- **Label placement, on the group.** Label placement is one decision for the whole field, so the variant sits on the group and not on each item.
- **A disabled state, on the item.** In the standard UI kit, the variant is `states`, with the option `disabled`. The disabled state sits on the item, so one option can be unavailable while the user can still choose among the other options.
- **Never use an indeterminate state.** A radio group is never partly selected.
- **Size.** If the project has a size variant, use the size variant.
- **Read-only is a separate component.** The read-only field, `read-only-field` in the UI kit, shows text instead of an input.

**Label placement is a variant, the same variant every field has.** A group's label sits beside the stack of options or above the stack of options. In the standard UI kit, the variant is `layouts`, with the options `side-by-side` and `stacked`.

**Label placement never sets the direction the options run.** The options always stack vertically. `recursica-skill-selection-controls` forbids a horizontal radio group outright. Never use the side-by-side label placement to put the radio buttons in a row.

## Rules

**A radio group holds at least two options.** A single radio button gives the user no choice. A single radio button also cannot be deselected once the radio button is selected.

**Keep a radio group to 7 ± 2 options.** `recursica-skill-working-memory` and `recursica-skill-selection-controls` state the same limit. Use fewer options when the options are different from each other, are hard to grasp, or need specialist knowledge. Above the limit, use a dropdown.

**Be very careful about selecting an option in advance.** Most users do not know how to deselect a radio button. A radio button also cannot be deselected once the radio button is selected. A pre-selected option therefore becomes the user's answer without the user choosing the option. Pre-select an option only when the option is correct for nearly everyone. `recursica-skill-selection-controls` sets this rule, and the rule in that skill governs here. No house rule says to select the top option.

**Traditionally, a radio group requires an answer.** The user cannot move on until the user selects one option. A radio group with no option selected, and no requirement to select an option, is unusual and confusing. When a design has such a radio group, check whether the field is a choice of one option at all.

**A radio group used for progressive disclosure (revealing more content after a choice) may start with no option selected.** The revealed content then appears only after the user chooses an option. Starting with no option selected follows the pre-selection caution above and is not an exception to the caution. No option is selected in advance, and no content is revealed until the user decides.

**Stack the options vertically, never horizontally.** In a row of radio buttons, the user cannot easily tell which circle belongs to which label. If the layout needs the options in a row, use a segmented control instead. A segmented control is limited to 2–5 options. Never use tabs instead.

**Label placement is one decision per form, not per field.** This group uses the same label placement as every other field in the form. Apply the container-width test once, to the whole form. The result sets the placement of every field in the form, including short fields that would fit side by side. A form may change placement at a breakpoint, but a form never mixes placements at one breakpoint, and a form section never gets a separate placement. `recursica-skill-forms` sets this rule.

**Put the rule for choosing an option in the assistive text**, not in a validation message that the user sees only after a failed submit. Show the rule with the assistive element. See `recursica-skill-assistive-element`.

**A radio option may reveal more fields, and the form still saves the same way.** Show the revealed fields directly below the radio group, as soon as the user selects the option. The user then sees which option added the fields. The whole form still submits together.

**Never mix instant saving with saving on submit.** A radio group in a form that submits with a button must not save when the selection changes.

**A disabled item and a read-only field are different components, not two styles of one component.**

- **A disabled item** is still a radio button and still looks like a control, but the user cannot select the disabled item right now. Use a disabled item when the user could make the option selectable by taking a different action first.
- **A read-only field** is a different component, with no input. Use a read-only field when the current user never changes the value in this place.

## Accessibility

The rules below add to the accessibility baseline in `recursica-skill-system-conventions`, which every Recursica component follows.

The radio components pair each radio button with the item label, control where focus goes inside the radio group, and show the focus ring. The app provides the group's accessible name (the name a screen reader reads out for a control), makes the selected state available in code, and adds the behavior in the two lists below.

### Screen readers

- **Give every option a real label, set on the item.** The item label is the option's accessible name. Text placed beside a radio button is not a label.
- **Give the radio group a label, set on the group.** A screen reader must announce the group label when focus enters the radio group. Text placed above the group in the reading order is not enough. Without a group label, the user hears the options with no question. A missing group label is the worst failure a radio group can have.
- **A screen reader must announce the radio group as a group, with the option's position in the group**, as in "option 2 of 5". The announcement tells the user that the options are alternatives, not separate fields.
- **The selected state must be available in code**, never shown only by a fill color or a dot. A user who cannot see the radio button must still hear "selected" or "not selected". `recursica-skill-system-conventions` requires the selected state in code.
- **A screen reader announces a pre-selected option as the current answer.** The pre-selection caution in the rules above exists because a screen reader user hears the pre-selected option as a decision the user made.
- **State that an option reveals more fields before the user chooses the option.** Put the statement in the item label or in the group's assistive text.

### Keyboard and non-mouse navigation

- **The whole radio group is one tab stop** (a place the Tab key lands). Tab moves focus into the radio group, and the next Tab moves focus out of the group. Tab does not step through the options. Do not make each option a separate tab stop. Each checkbox in a checkbox group is a separate tab stop, and each radio button is not.
- **The arrow keys move between the options in the radio group, and moving to an option selects the option.** Up Arrow and Left Arrow move to the previous option. Down Arrow and Right Arrow move to the next option. The arrow keys wrap around: the next option after the last option is the first option, and the previous option before the first option is the last option. Home and End move to the first and last option.
- **Space selects the focused option** when the focused option is not selected. Do not remap Space, and do not require Enter.
- **The radio group component handles the keys and the roving focus (where the arrow keys move between items that share one tab stop) inside the group.** Do not add custom key handling, set `tabindex` by hand, or rebuild the wrap-around. Each of those changes breaks keyboard behavior that the radio group component provides.
- **Clicking or tapping the item label selects the label's option.** A label connected to the radio button makes the label select the option, and gives the user a bigger target. Text placed beside the radio button without a connection does not select the option.
- **Do not move focus for the user.** When an option reveals fields below the radio group, focus stays in the group. The user reaches the new fields with the next Tab. Never move focus to the next field when the user selects an option.

## Styling set by tokens

**Never set or override the radio button's styling.** The theme sets every visual property of the radio button, such as size, spacing, borders and colors. Do not add extra containers or spacers to change the radio button's look. If the design needs a look the theme does not give, raise the gap. See `recursica-skill-design-router`.

Never set or override the styling of the radio group or the radio items either.

**Do not add margins or spacer elements between the options or around the radio group.**

## Related skills

- `recursica-skill-selection-controls` — choosing between a radio group, checkboxes, a switch and a dropdown, option counts, the pre-selection caution, the vertical-only layout, the controls to use for options in a row, and when a choice is saved.
- `recursica-skill-forms` — single-column layout, label placement, the container-width test for label placement, one placement per form, marking required and optional fields, when to validate, progressive disclosure, and the save mode.
- `recursica-skill-label` — the group label and the item labels, label text that makes sense without the text around the label, and the required and optional markers.
- `recursica-skill-assistive-element` — the help text and error text below the group, and the wording rules for both.
- `recursica-skill-working-memory` — the research behind the 7 ± 2 limit, and the difference between recognizing an option and comparing options.
- `recursica-skill-system-conventions` — never convey meaning in only one way.

### Only if used on the same screen

- `recursica-skill-segmented-control` — the control for choosing one option from options in a row, used instead of a horizontal radio group.

## Open questions

- **The error state of a radio group.** A required radio group can still fail validation. No rule says how a radio group shows an error. If the project has an error state on any of the three radio components, use that error state. Otherwise, ask.
- **Clearing a radio group.** The design rules treat a selected radio button as a radio button the user cannot deselect. The caution about pre-selection exists for that reason. No rule says whether a radio group may offer an explicit way to clear the selection, or a "None" option.
- **Radio buttons inside a table row.** The design rules mention radio buttons in a table row once, as an alternative to a switch. No rule sets radio buttons in a table row as a pattern.

## Pre-flight checklist

- [ ] The options rule each other out, and no choice of one option is built from checkboxes.
- [ ] The radio group holds at least two options, within 7 ± 2, and fewer for options that are hard to tell apart.
- [ ] The options are stacked vertically. No radio group runs in a row, and the side-by-side option is used only for label placement.
- [ ] Label placement matches every other field in the same form, with one placement per form at each breakpoint and no mixing between fields or form sections.
- [ ] The group, item, and radio button components are used together.
- [ ] No option is selected in advance unless the option is right for nearly everyone.
- [ ] The radio group has a real label that states the question, and every option has a real label that states the option's value.
- [ ] A screen reader announces the radio group as a group, announces the group label when focus enters the group, and can announce the option's position in the group.
- [ ] The selected state is available in code, never shown only by a fill or a dot.
- [ ] The rule for choosing an option is in the assistive text set on the component, and the required state is available in code.
- [ ] The radio group is one tab stop. The arrow keys move between the options and select, Home and End reach the first and last options, and Space selects.
- [ ] Key handling, `tabindex`, and the wrap-around inside the group come from the radio group component.
- [ ] Clicking the item label selects the option.
- [ ] Focus is never moved for the user, including when an option reveals fields below.
- [ ] The disabled state is used only for options that are unavailable for now. Values that can never be edited use the read-only field.
- [ ] Every variant, size, and state is one the project's UI kit lists, and no variant or option is invented.
- [ ] No styling is set or overridden on the radio button, the radio group or the radio items, and no container or spacer is added to change the radio button's look.
- [ ] The radio group saves with the form, in the same save mode as every other field and control in the application.
- [ ] Open questions were asked about, not decided: the group error state, clearing a group, and radio buttons in table rows.
