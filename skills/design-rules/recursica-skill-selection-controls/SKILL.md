---
name: recursica-skill-selection-controls
description: House rules for choosing a selection control — checkbox, switch, radio group, dropdown, or multi-select, option counts, pre-selection, select-all and the indeterminate state, disabled versus read-only, vertical layout, and instant versus batch saving. Use when deciding which control a set of options gets. Not for form layout — see recursica-skill-forms.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Selection controls

This skill holds the house rules for choosing the selection control a field gets: a checkbox, a switch, a radio group, a dropdown or a multi-select. The skill also sets how the chosen control behaves. The rules are the team's opinions, not neutral best practices. Treat each rule as a constraint.

The rules assume **complex enterprise web applications, designed for desktop first**, built on the Recursica design system. The Recursica components set how each control looks, the control's states, and the keyboard interaction inside the control. This skill does not decide the look, the states or the keyboard interaction. This skill decides which control to use, how many options the control has, which options are selected in advance, and when a change is saved.

## Governing principles

1. **The type and structure of the data decide which control fits best.** Ask three questions. How many values can the persona select? Do the values rule each other out? Is the opposite of the value obvious? The answers decide the control. How the control looks comes last, not first.
2. **Options should be visible and easy to scan.** Arrange the options vertically. Keep the number of options within working memory (how much a person can hold in mind at once). Hide options inside a dropdown only when the list of options is predictable enough that the persona knows the options before opening the dropdown.
3. **Each form has one save point.** By default, the form submits every field together. Never mix instant saving with saving later, such as on submit, in the same system. The persona needs one reliable answer to the question "Is my work saved?"

## Choosing the control

Work down this list. The first match decides the control.

1. **One value whose opposite is binary, known, and unique → a switch.** See the binary-inverse test below.
2. **Options that rule each other out, where the persona must choose one → a radio group**, up to the limit on the number of options. When the layout needs a horizontal arrangement, use a segmented control instead.
3. **Options that rule each other out, more options than the limit → a dropdown** (single select).
4. **The persona can select zero to many options → a checkbox group**, up to the limit on the number of options. When the layout needs a horizontal arrangement, use selectable chips instead.
5. **The persona can select zero to many options, with more options than the limit or a form that is already very long → a multi-select dropdown** (a checkbox group inside a dropdown).

## Switch vs. checkbox

**A switch only ever appears inside a form.** Check whether the value is inside a form first, before the tests below. Outside a form, a toggle is a segmented control, not a switch. Places outside a form include application chrome (the header, navigation and footer around the content), a filter bar, a toolbar and a page header. See `recursica-skill-segmented-control`.

**Inside a form, use a checkbox unless the value passes the switch tests below.** A switch has a deliberately narrow use.

**Every switch MUST pass the binary-inverse test.** The opposite of the switch value must be binary, known, and unique: true or false, yes or no, on or off. A pair of qualities fails the test. "Black" is not a valid switch value, because _not black_ is not always white. _Not black_ could be gray, pink or any other color. If the opposite of the value is not the single, obvious other state, the value does not get a switch.

**The label test separates a switch from a radio group.** A radio group is _one label with several values_. The persona picks which value goes with the radio group label. A switch is _one label whose value is implied_. The switch label alone says which setting the switch controls, and the switch state is true or false. Use a switch only when both the value and the setting the label names are binary.

**A checkbox turns a true/false flag on or off for one specific value, and that value can be any value.** For that reason, a checkbox works in a group, and a switch does not.

**A lone binary field is the one case where appearance may decide.** A lone binary field is a checkbox group that holds only one checkbox. A lone checkbox looks odd. In a form, a switch usually looks better. A checkbox and a switch work the same way for a lone binary field.

## Checkbox vs. radio

**MUST use radio buttons for options that rule each other out.** Never use checkboxes for options that rule each other out. Checkboxes mean "select as many as apply" by definition. Checkboxes used for a choice of one get the data wrong.

- **Radio group:** the persona selects exactly one of N options. Traditionally, an answer is required, and the persona cannot move on until one option is selected.
- **Checkbox group:** the persona selects zero through N options.

**A radio group with no option selected, and no requirement to select an option, is unusual and confusing.** A radio group like that does happen. Treat the empty radio group as a warning sign. If the persona does not need to choose an option, question whether the field is a choice of one at all.

## Defaults and pre-selection

**Pre-select checkboxes freely.** A checkbox group may start with no checkboxes, some checkboxes or every checkbox checked. No house rule limits checkbox defaults either way.

**Be very careful about selecting a radio button in advance.** Most personas do not know how to deselect a radio button after one is selected. A default radio button quietly becomes the persona's answer. A pre-selected radio button is the riskiest default in the system.

**Pre-select an option only where about 90 percent of personas would choose that option anyway.** Never pre-select an option that has major consequences later in the workflow, however likely the option is. `recursica-skill-defaults` sets both tests.

## Option counts and dropdowns

**Aim for 7 ± 2 options, adjusted for how hard the options are to understand.** The 7 ± 2 limit applies to options the persona compares, not to a list the persona recognizes an item from. See `recursica-skill-working-memory` for the reasoning and the limits of the reasoning. Adjust the number of options this way:

- **Options that are similar and easy to understand** → the upper end of the range is fine.
- **Options that are different from each other, hard to grasp, or need specialist knowledge** → use fewer.

**Above the option limit, use a dropdown.** A dropdown handles a long list of options well. A dropdown is usually single select. A multi-select dropdown (a checkbox group inside a dropdown) is available when the persona can select many values.

**Before choosing a dropdown, ask whether the persona knows the options before clicking the dropdown.** A dropdown hides the options. The persona has no affordance (a visible cue that a control can be used, such as the underline on a link) for the options inside the dropdown. The question is the dropdown affordance test.

- **Good:** US states. The list of states is fixed and in alphabetical order. Everyone has a rough idea of how many states there are. The list is predictable and familiar.
- **Bad:** 50 unrelated values with nothing in common. A list of 50 unrelated values overwhelms the persona and takes a lot of mental effort to pick from.

**The choice between checkboxes and a multi-select dropdown depends on four factors:** the number of options, how similar the options' topics are, how hard the options are to tell apart, and the overall size of the form. Six options that are easy to read normally get a checkbox group. If the form is already long, a multi-select dropdown for the six options is acceptable, because the dropdown saves a lot of scrolling down the page.

## Select all and indeterminate state

**A checkbox group may include a select-all control.** The checkbox group has the indeterminate state (the partly selected state, shown as a dash, when some but not all items are selected). When the persona selects all and then deselects one checkbox, the select-all control moves to the indeterminate state.

**Treat the need for select all as a warning sign.** If checking each checkbox one by one would tire the persona, as with twenty checkboxes, a checkbox group is probably the wrong control. Rethink the form design before adding a select-all control.

## Selection in tables

**Table row selection uses a checkbox in the leftmost cell of the table row, and a header checkbox in the table header.** `recursica-skill-tables` sets the table structure.

**Every table with checkboxes in the table rows has a header checkbox.** The header checkbox is not optional. Without a header checkbox, the persona has no way to select every table row or clear the whole selection. The persona then has to clear each row checkbox one by one to undo a selection made by accident.

**A row checkbox has one meaning: the row checkbox adds the table row to a bulk action.** A row checkbox is not a way to focus on a record, open a record, or show actions for a record. NEVER let selecting a single table row trigger an action on that one record. A table that offers `Correct this name` for one selected table row and `Combine` for two selected table rows gives the checkbox two unrelated meanings. The persona learns neither meaning. Editing one record starts from that record. See `recursica-skill-tables`.

**Never add a separate clear or deselect-all control.** The header checkbox is the clear control. When the header checkbox is checked or indeterminate, a click on the header checkbox changes the selection as the header checkbox rules below set out. A second control that does the same job in another place is one more control to read. The second control also gives a second answer to the question "How do I start over?"

**The header checkbox MUST behave this way:**

- A click on an indeterminate header checkbox **always makes the header checkbox fully checked.** The click never makes the header checkbox unchecked.
- A click on a fully checked header checkbox makes the header checkbox fully unchecked. A click on a fully unchecked header checkbox makes the header checkbox fully checked.
- The header checkbox becomes indeterminate **only** when the persona selects or deselects individual table rows. A click on the header checkbox never makes the header checkbox indeterminate.

**Avoid switches in table rows.** A switch is bulky and fits awkwardly in a dense table row. A checkbox takes far less space. Prefer a checkbox or a radio button in the table row, and handle the on or off setting another way. If the design still calls for a switch in a table row, confirm with the user.

## Layout

**MUST arrange checkboxes and radio buttons vertically. NEVER arrange checkboxes or radio buttons horizontally.** A horizontal row of checkboxes or radio buttons is hard to scan. In a horizontal row, the persona cannot easily tell which control belongs to which label. The pairing between each control and the control's value stops being clear. The system should never produce a horizontal checkbox group or radio group.

**When the layout needs a horizontal arrangement, change the control instead of laying out the group in a row:**

| Need                                        | Horizontal control                                                        |
| ------------------------------------------- | ------------------------------------------------------------------------- |
| Single select (options rule each other out) | **Segmented control.** A segmented control is the horizontal radio group. |
| Multi-select                                | **Selectable chips**                                                      |

A segmented control and selectable chips both show where each option begins and ends. A radio group or checkbox group laid out in a row does not. Every other rule still applies to both controls, including the limit on the number of options, care with pre-selection for single select, and how saving works.

**A segmented control is limited to 2–5 options.** The 2–5 limit is tighter than the general 7 ± 2 limit, because a segmented control is horizontal and compact. Above five options, go back to a vertical radio group. If the options are also over the general limit, use a dropdown. Never fall back to tabs.

## Immediate vs. batch submit

**By default, a form submits every field together when the persona clicks a submit button.** Two reasons support the default, most important first:

1. The persona must be able to change a decision before any change is saved.
2. Tracking and logging records is far easier. One submit makes one timestamp and one update. Saving field by field makes much more noise in the records.

**MUST NOT mix instant saving of individual fields with submitting every field together.** Either every field saves when the field changes, or every field saves on submit. Mixing the two confuses the persona, because the persona can no longer tell which changes are live.

**Avoid saving to the server immediately in any form with more than one field.**

**A switch saves at the same point as every other field in the system.** In a system that saves on change, a switch saves immediately. In a system that saves on submit, a switch saves with the form. A switch never saves at a different point from the fields around the switch. A switch in a form that saves on submit is allowed, but not ideal. The switch then acts like a checkbox and saves with the other fields.

## Uncommitted changes

**A form uses exactly one save mode, and the save mode decides what the form shows:**

- **Batch save → no status, and no sign of unsaved changes.** A sign of unsaved changes is very rarely worth showing. The only signal the persona needs is the submit button becoming enabled once every editable control is valid.
- **Field-level or instant save → a save status message that stays on the page is required.** If the server saves on every field change, the persona must be able to see the save status on the page at all times.

Never mix the two save modes within a system. See `recursica-skill-forms` for the full table of save modes.

## Progressive disclosure

**A selection control may reveal more fields, and the revealed fields save the same way as every other field in the form.** A checkbox may reveal a field or a group of fields further down the form. The revealed fields still submit together with every other field in the form. Submitting every field together is easier than saving the revealed fields separately.

For example, a checkbox group lists ways to travel. Checking "Car" reveals a group of car details: make, model, and color.

## Disabled vs. read-only

**Disable a control when the persona can take an action that would enable the control.** Every selection control (switch, checkbox, radio button and dropdown) has a disabled state. The disabled state is the right way to show a choice that is unavailable for now.

**Use the read-only control when the value cannot be edited, and the persona has no way in this form to make the value editable.** The read-only control shows the field label with the field's values, and the read-only control fits the form layout.

**If the persona will never be able to edit a value, the value should not be in a form control at all.**

## Assistive text

**State the selection rules in the assistive text below the control.** Every type of control can show assistive text below the control. For example, "At least two options required" belongs under the checkbox group. The selection rule does not belong in a validation message that the persona sees only after failing the rule.

## Resetting

**A reset applies to the whole form, not to one control.** When a form needs a reset, use a button labeled with a verb and an object, such as "Reset form" or "Clear form". The reset button calls the native HTML reset. No single control has a reset of the control's own.

## Open questions

No house rule covers the following questions yet. **Confirm with the user instead of choosing.** See the never-guess rule in `recursica-skill-design-router`. Do not stretch a rule in this skill to fit an open question.

- **When autocomplete or typeahead replaces a dropdown.** A dropdown handles many options. No rule sets the point at which searching works better than scanning.
- **Radio buttons inside a table row.** This skill mentions radio buttons in a table row in passing, as an alternative to a switch. Radio buttons in a table row are not an established pattern.
- **Limits on multi-select.** No rule says whether a form may limit the persona to selecting _n_ options out of many.

## Out of scope

- **All color, visual design, and styling**, plus keyboard interaction inside a control. The Recursica components handle color, visual design, styling and keyboard interaction.
- **Form layout, when validation happens, how errors are shown, and how save status is displayed.** See `recursica-skill-forms`.
- **Confirming high-risk or destructive operations**, including bulk deletes. See `recursica-skill-buttons-links`.

## Pre-flight checklist

Check every item before treating a set of selection controls as done:

- [ ] Every switch is inside a form, and every toggle outside a form is a segmented control.
- [ ] Options that rule each other out use a radio group, never checkboxes.
- [ ] Every switch passes the binary-inverse test: the opposite state is known, unique, and binary.
- [ ] Every switch passes the label test: the switch label alone names the setting the switch controls, with no competing values.
- [ ] A checkbox group is used wherever the persona can select zero to many options.
- [ ] Each group holds 7 ± 2 options, and fewer where the options are different from each other or need specialist knowledge.
- [ ] A list of options above the limit uses a dropdown, and the list is predictable enough that the persona knows the options before opening the dropdown.
- [ ] No radio button is selected in advance unless the default is right for nearly everyone.
- [ ] A select-all control appears only where the checkbox group is long, and the checkbox group shows an indeterminate state.
- [ ] Row selection in a table uses a checkbox in the leftmost cell with a header checkbox, on every table that has row checkboxes. A click on an indeterminate header checkbox selects every table row.
- [ ] Row checkboxes only choose table rows for bulk actions. Selecting one table row triggers no action on that single record. No separate clear or deselect-all control sits beside the header checkbox.
- [ ] No table row holds a switch, unless the user approved the switch.
- [ ] Checkboxes and radio buttons are stacked vertically, never horizontally. Where a horizontal arrangement is needed, a segmented control is used for single select, or selectable chips for multi-select.
- [ ] The form saves every field together when the persona clicks a submit button. No field in the form saves instantly.
- [ ] Switches save at the same point everywhere in the system.
- [ ] The form shows no sign of unsaved changes. The enabled submit button is the only signal.
- [ ] Revealed fields submit together with the selection control that revealed the fields.
- [ ] Choices that are unavailable for now are disabled. Values that are permanently not editable use the read-only control, or are not in a form control at all.
- [ ] Selection rules (minimums and maximums) appear as assistive text under the control.
- [ ] Open questions were asked about, not decided: when autocomplete replaces a dropdown, radio buttons in rows, and limits on selection.
