---
name: recursica-skill-selection-controls
description: House rules for choosing a selection control — checkbox, switch, radio group, dropdown, or multi-select, option counts, pre-selection, select-all and the indeterminate state, disabled versus read-only, vertical layout, and instant versus batch saving. Use when deciding which control a set of options gets. Not for form layout — see recursica-skill-forms.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.2.0
---

# Selection controls

Use these house rules to choose the selection control for a field. The selection controls are a checkbox, a switch, a radio group, a dropdown and a multi-select. The rules also set how the chosen control behaves. The rules are the team's opinions, not neutral best practices. Treat each rule as a constraint.

The rules assume **complex enterprise web applications, designed for desktop first**, built on the Recursica design system. The Recursica components set how each control looks, the control's states, and the keyboard interaction inside the control. This skill does not decide the look, the states or the keyboard interaction. This skill decides four choices:

- which control to use
- how many options the control has
- which options start out selected
- when a change is saved

## Governing principles

1. **Let the type and structure of the data decide the control.** Answer three questions about the field:

   - How many values can the persona select?
   - Do the values rule each other out?
   - Is the opposite of the value obvious?

   The answers decide the control. Decide how the control looks last, not first.

2. **Options should be visible and easy to scan.**

   - Stack the options vertically.
   - Keep the number of options within working memory (how much a person can hold in mind at once).
   - Put options inside a dropdown only when the list is predictable enough that the persona knows the options in advance. A list of US states is an example.

3. **Give each form one save point.** By default, every field in a form saves together when the persona clicks the submit button. In one application, never mix fields that save on change with fields that save later, such as on submit. The persona needs one reliable answer to the question "Is my work saved?"

## Choosing the control

Work down this list. The first match decides the control.

1. **One value whose opposite is binary, known, and unique → a switch.** For example, "Email alerts" is either on or off. See the binary-inverse test below.
2. **Options that rule each other out, where the persona must choose one, up to the option limit → a radio group.** For example, a shipping speed of Standard, Express or Overnight. When the layout needs a horizontal arrangement, use a segmented control instead.
3. **Options that rule each other out, more options than the limit → a dropdown** (single select).
4. **The persona can select zero to many options, up to the option limit → a checkbox group.** When the layout needs a horizontal arrangement, use selectable chips instead.
5. **The persona can select zero to many options, and either case below is true → a multi-select dropdown.** A multi-select dropdown is a checkbox group inside a dropdown.
   - The list has more options than the limit.
   - The form is already very long.

The option limit is set under "Option counts and dropdowns" below.

## Switch vs. checkbox

**Use a switch only in the page's content.** A switch may sit in a form, or on the switch's own, as on a settings page. Check where the value sits before the tests below. In the following places, use a segmented control for a toggle, not a switch:

- application chrome (the header, navigation and footer around the content)
- a filter bar
- a toolbar
- a page header

See `recursica-skill-segmented-control`.

**In the page's content, use a checkbox unless the value passes the switch tests below.** A switch has a deliberately narrow use.

**Every switch MUST pass the binary-inverse test.** The opposite of the switch's value must be binary, known, and unique. True or false, yes or no, and on or off pass the test. A choice between two qualities, such as black or white, fails the test. "Black" is not a valid switch value, because _not black_ is not always white. _Not black_ could be gray, pink or any other color. If the opposite of the value is not the single, obvious other state, do not use a switch.

**Use the label test to choose between a switch and a radio group.**

- A radio group is _one label with several values_. For example, the label "Shipping speed" has the values Standard, Express and Overnight. The persona picks which value goes with the label.
- A switch is _one label whose value is implied_. The switch label alone says which setting the switch controls, and the switch state is true or false. For example, the label "Email alerts" names the setting.

Use a switch only when both the value and the setting the label names are binary.

**A checkbox marks one specific value as true or false.** For example, in a "Contact me by" group, the "Email" checkbox marks Email as chosen or not chosen. A checkbox can stand for any value. For that reason, checkboxes work in a group, and switches do not.

**A lone binary field is the one case where the look may decide between a checkbox and a switch.** A lone binary field is one yes-or-no field with no others beside the field. A checkbox and a switch work the same way for a lone binary field. A lone checkbox looks odd, and a switch often looks better. Confirm the choice with the user.

## Checkbox vs. radio

**MUST use radio buttons for options that rule each other out.** Never use checkboxes for options that rule each other out. By definition, checkboxes mean "select as many as apply." Checkboxes used for a choice of one get the data wrong.

- **Radio group:** the persona selects exactly one of N options. Traditionally, an answer is required, and the persona cannot move on until one option is selected.
- **Checkbox group:** the persona selects zero through N options.

**Treat a radio group with no option selected, and no answer required, as a warning sign.** A radio group like that does happen, but the radio group is unusual and confusing. If no answer is required, check whether the field is a choice of one at all.

## Defaults and pre-selection

**Be very careful about selecting a radio button in advance.** Most personas do not know how to deselect a radio button after one is selected. A radio button selected in advance quietly becomes the persona's answer. A pre-selected radio button is the riskiest default in an application.

**Pre-select an option only where about 90 percent of personas would choose that option anyway.** The rule covers checkboxes, radio buttons and every other option. Never pre-select an option that has major consequences later in the workflow, however likely the option is. `recursica-skill-screen-starting-state` sets both tests.

## Option counts and dropdowns

**Aim for about 7 ± 2 options, adjusted for how hard the options are to understand.** The number is a guideline from psychology, not a hard limit. Use judgment. For example, more items fit when every label is short. Going well past the guideline is a sign that a different pattern or component may fit better. The guideline applies to options the persona compares. The guideline does not apply to a list where the persona recognizes an item. See `recursica-skill-working-memory` for the reasoning and the limits of the reasoning. Adjust the number of options this way:

- **Options that are similar and easy to understand** → the upper end of the range is fine.
- **Options that are different from each other, hard to grasp, or need specialist knowledge** → use fewer.

**Above the option limit, use a dropdown.** A dropdown handles a long list of options well. A dropdown is single select by default. A multi-select dropdown (a checkbox group inside a dropdown) is available when the persona can select many values.

**Before choosing a dropdown, apply the dropdown affordance test.** The test asks whether the persona knows the options before clicking the dropdown. A dropdown hides the options. The persona has no affordance (a visible cue that a control can be used, such as the underline on a link) for the options inside the dropdown.

- **Good:** US states. The list of states is fixed and in alphabetical order. Everyone has a rough idea of how many states there are. The list is predictable and familiar.
- **Bad:** 50 unrelated values with nothing in common. A list of 50 unrelated values overwhelms the persona and takes a lot of mental effort to pick from.

**Weigh four factors to choose between checkboxes and a multi-select dropdown:**

- the number of options
- how similar the options' topics are
- how hard the options are to tell apart
- the overall size of the form

For example, six options that are easy to read fit a checkbox group. If the form is already long, a multi-select dropdown for the six options is acceptable. The dropdown saves a lot of scrolling down the page.

## Select all and indeterminate state

**A checkbox group may include a select-all control.** The checkbox group has the indeterminate state (the partly selected state, shown as a dash, when some but not all items are selected). When the persona selects all and then deselects one checkbox, the select-all control moves to the indeterminate state.

**Treat the need for select all as a warning sign.** If checking each checkbox one by one would tire the persona, question whether a checkbox group is the right control. For example, twenty checkboxes would tire the persona. Rethink the form design before adding a select-all control.

## Selection in tables

**To let the persona select table rows, put a checkbox in the leftmost cell of each table row.** Put a header checkbox in the table header. `recursica-skill-tables` sets the table structure.

**Every table with checkboxes in the table rows has a header checkbox.** The header checkbox is not optional. Without a header checkbox, the persona has no way to select every table row or clear the whole selection. The persona then has to clear each row checkbox one by one to undo a selection made by accident.

**A row checkbox has one meaning: the row checkbox adds the table row to a bulk action.** A row checkbox does not focus on a record, open a record, or show actions for a record. NEVER let selecting a single table row trigger an action on that one record.

For example, a table offers `Correct this name` when one table row is selected and `Combine` when two are selected. The checkbox then has two unrelated meanings, and the persona learns neither meaning. Editing one record starts from that record. See `recursica-skill-tables`.

**Never add a separate clear or deselect-all control.** The header checkbox is the clear control. When the header checkbox is checked or indeterminate, a click on the header checkbox changes the selection. The header checkbox rules below set how the selection changes. A second control that does the same job in another place is one more control to read. A second control also gives a second answer to the question "How do I start over?"

**The header checkbox MUST behave this way:**

- A click on an indeterminate header checkbox **always makes the header checkbox fully checked.** The click never makes the header checkbox unchecked.
- A click on a fully checked header checkbox makes the header checkbox fully unchecked. A click on a fully unchecked header checkbox makes the header checkbox fully checked.
- The header checkbox becomes indeterminate **only** when the persona selects or deselects individual table rows. A click on the header checkbox never makes the header checkbox indeterminate.

**An on/off value in a table row follows the editable-cell rule in `recursica-skill-tables`.** A switch may sit in the cell when the edit is small and a mistake costs little. The switch saves right away. Otherwise, change the value on the record's page. Never use a checkbox for the value, because a row checkbox only selects the row.

## Layout

**MUST arrange checkboxes and radio buttons vertically. NEVER arrange checkboxes or radio buttons horizontally.** A horizontal row of checkboxes or radio buttons is hard to scan. In a horizontal row, the persona cannot easily tell which control belongs to which label. The pairing between each control and the control's value stops being clear. Never build a horizontal checkbox group or radio group.

**When the layout needs a horizontal arrangement, change the control instead of laying out the group in a row:**

| Need                                        | Horizontal control                                                        |
| ------------------------------------------- | ------------------------------------------------------------------------- |
| Single select (options rule each other out) | **Segmented control.** A segmented control is the horizontal radio group. |
| Multi-select                                | **Selectable chips**                                                      |

A segmented control and selectable chips both show where each option begins and ends. A radio group or checkbox group laid out in a row does not. Every other rule still applies to both controls, including:

- the limit on the number of options
- care with pre-selection for single select
- how saving works

**Limit a segmented control to 2–5 options.** The 2–5 limit is tighter than the general 7 ± 2 guideline, because a segmented control is horizontal and compact. Above five options, go back to a vertical radio group. If the options are also over the general limit, use a dropdown. Never use tabs instead.

## Immediate vs. batch submit

**By default, submit every field in a form together when the persona clicks a submit button.** Two reasons support the default, most important first:

1. The persona must be able to change a decision before any change is saved.
2. Tracking and logging records is far easier. One submit makes one timestamp and one update. Saving field by field makes much more noise in the records.

**MUST NOT mix instant saving of individual fields with submitting every field together.** Either every field saves when the field changes, or every field saves on submit. Mixing the two save modes confuses the persona. The persona can no longer tell which changes are live.

**Avoid saving to the server immediately in any form with more than one field.**

**A control that is not part of a form saves right away.** `recursica-skill-forms` sets this rule.

**Save a switch inside a form at the same point as every other field in the application.** A switch on the switch's own, not part of a form, saves right away.

- In an application that saves on change, a switch saves immediately.
- In an application that saves on submit, a switch saves with the form.

A switch never saves at a different point from the fields around the switch. A switch in a form that saves on submit is allowed, but not ideal. The switch then acts like a checkbox and saves with the other fields.

## Uncommitted changes

**Use exactly one save mode in a form. The save mode decides what the form shows:**

- **Batch save, on submit → no save status, and no sign of unsaved changes.** A sign of unsaved changes is very rarely worth showing. The submit button becomes enabled once every editable control is valid. That enabled submit button is the only signal the persona needs.
- **Field-level or instant save → a save status message that stays on the page is required.** If the server saves on every field change, the save status must stay visible on the page at all times.

Never mix the two save modes within an application. See `recursica-skill-forms` for the full table of save modes.

## Progressive disclosure

**Save revealed fields the same way as every other field in the form.** A selection control may reveal more fields. For example, a checkbox may reveal a field or a group of fields further down the form. The revealed fields still submit together with every other field in the form. Submitting every field together is easier than saving the revealed fields separately.

For example, a checkbox group lists ways to travel. Checking "Car" reveals fields for the car's make, model and color.

## Disabled vs. read-only

**Disable a control when the persona can take an action that would enable the control.** For example, a "Text me updates" checkbox stays disabled until the persona enters a phone number. Every selection control (switch, checkbox, radio button and dropdown) has a disabled state. The disabled state is the right way to show a choice that is unavailable for now.

**Use the read-only control when both conditions below are true:**

- The value cannot be edited.
- The persona has no way in this form to make the value editable.

The read-only control shows the field label with the field's values, and the read-only control fits the form layout.

**If the persona can never edit a value, the value should not be in a form control at all.**

## Assistive text

**State the selection rules in the assistive text below the control.** Every type of control can show assistive text below the control. For example, "At least two options required" belongs under the checkbox group. The selection rule does not belong in a validation message that the persona sees only after failing the rule.

## Resetting

**Apply a reset to the whole form, not to one control.** When a form needs a reset, use a button labeled with a verb and an object, such as "Reset form" or "Clear form". The reset button uses the native HTML reset, which returns every field in the form to the field's default value. No single control has a reset of the control's own.

## Open questions

**Confirm with the user instead of choosing.** No house rule covers the following questions yet. See the never-guess rule in `recursica-skill-design-router`. Do not stretch a rule in this skill to fit an open question.

- **When autocomplete or typeahead replaces a dropdown.** A dropdown handles many options. No rule sets the point at which searching works better than scanning.
- **Limits on multi-select.** No rule says whether a form may limit the persona to selecting _n_ options out of many.

## Out of scope

- **All color, visual design, and styling**, plus keyboard interaction inside a control. The Recursica components handle color, visual design, styling and keyboard interaction.
- **Form layout, when validation happens, how errors are shown, and how save status is displayed.** See `recursica-skill-forms`.
- **Confirming high-risk or destructive operations**, including bulk deletes. See `recursica-skill-buttons-links`.

## Pre-flight checklist

Check every item before treating a set of selection controls as done:

- [ ] Every switch is in the page's content. Every toggle in chrome, a filter bar, a toolbar or a page header is a segmented control.
- [ ] Options that rule each other out use a radio group, never checkboxes.
- [ ] Every switch passes the binary-inverse test: the opposite state is known, unique, and binary.
- [ ] Every switch passes the label test: the switch label alone names the setting the switch controls, with no competing values.
- [ ] A checkbox group is used wherever the persona can select zero to many options.
- [ ] Each group holds about 7 ± 2 options, judged by label length and how hard the options are to tell apart.
- [ ] A list of options above the limit uses a dropdown. The list is predictable enough that the persona knows the options before opening the dropdown.
- [ ] A checkbox or radio button starts selected only when about 90 percent of personas would choose the option. The option also has no major later consequences.
- [ ] A select-all control appears only where the checkbox group is long, and the checkbox group shows an indeterminate state.
- [ ] Row selection in a table uses a checkbox in the leftmost cell of the table row. Every table that has row checkboxes has a header checkbox.
- [ ] A click on an indeterminate header checkbox selects every table row.
- [ ] Row checkboxes only choose table rows for bulk actions. Selecting one table row triggers no action on that single record. No separate clear or deselect-all control sits beside the header checkbox.
- [ ] A switch in a table row passes the editable-cell rule and saves right away. No row checkbox stands for an on/off value.
- [ ] Checkboxes and radio buttons are stacked vertically, never horizontally. Where a horizontal arrangement is needed, a segmented control is used for single select, or selectable chips for multi-select.
- [ ] The form uses the application's one save mode. By default, every field saves together when the persona clicks a submit button.
- [ ] Switches save at the same point everywhere in the application.
- [ ] With batch save, the form shows no sign of unsaved changes, and the enabled submit button is the only signal. With instant save, a save status stays on the page.
- [ ] Revealed fields submit together with the selection control that revealed the fields.
- [ ] Choices that are unavailable for now are disabled. Values that are permanently not editable use the read-only control, or are not in a form control at all.
- [ ] Selection rules (minimums and maximums) appear as assistive text under the control.
- [ ] Open questions were asked about, not decided: when autocomplete replaces a dropdown, and limits on selection.
