---
name: recursica-skill-selection-controls
description: House rules for choosing among selection controls in enterprise web applications — checkbox vs. switch vs. radio group vs. dropdown vs. multi-select, option counts and 7 ± 2, pre-selected defaults, select-all and indeterminate states, table header checkbox mechanics, disabled vs. read-only, vertical-only layout, and immediate vs. batch submit. Use whenever picking or reviewing the control for a set of options — checkboxes, switches, toggles, radio buttons, selects, multi-selects, selectable chips, or row and header selection in a table. Trigger on "checkbox or switch", "radio or dropdown", "toggle", "multi-select", "select all", "indeterminate", "pre-selected", "how many options", or any question about which control a field should use. Do NOT use for form layout, validation timing, or error presentation — that is recursica-skill-forms. Do NOT use for button or link triggers — that is recursica-skill-buttons-links.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Selection controls

These are the house rules for deciding which selection control a field gets — checkbox, switch, radio group, dropdown, or multi-select — and how that control behaves. They are opinions, not neutral best practices. Treat them as constraints.

These rules assume **complex enterprise web applications, designed for desktop first**, built on the Recursica design system. How a control looks, its states, and keyboard interaction inside it all come from the components, and are never your decision. Your decisions are which control to use, how many options it has, what is selected in advance, and when a change is saved.

## Governing principles

1. **The shape of the data picks the control.** How many values can be selected? Do they rule each other out? Is the opposite of the value obvious? Answer those questions, and the control is decided. How it looks comes last, not first.
2. **Options should be visible and easy to scan.** Arrange them vertically, and keep them within working memory (how much a person can hold in mind at once). Hiding options inside a dropdown has to be earned, by the set being predictable enough that the user knows what is in it before opening it.
3. **One saving point per form.** Submitting everything together is the default, and saving instantly and saving later must never exist side by side in the same system. The user needs one reliable answer to "is my work saved?"

## Choosing the control

Work down this list; the first match wins.

1. **One value, whose opposite is binary, known, and unique → switch.** See the binary-inverse test below.
2. **Options that rule each other out, where one must be chosen → radio group**, up to the limit on the number of options. Where the layout calls for a horizontal arrangement, use a segmented control (a row of joined buttons, one of which is selected) instead.
3. **Options that rule each other out, above the limit → dropdown** (single select).
4. **Zero to many can be selected → checkbox group**, up to the limit on the number of options. Where the layout calls for a horizontal arrangement, use selectable chips instead.
5. **Zero to many, above the limit, or the form is already very long → multi-select dropdown** (a checkbox group inside a dropdown).

## Switch vs. checkbox

**A switch only ever appears inside a form.** That is the first test, and it comes before the tests below. Anywhere else — application chrome (the frame around the content), a filter bar, a toolbar, a page header — a toggle is a segmented control, not a switch. See `recursica-skill-segmented-control`.

**A switch has a deliberately narrow use.** Inside a form, reach for a checkbox unless the switch test passes.

**The binary-inverse test — MUST pass before you use a switch.** The opposite of the value must be binary, known, and unique: true/false, yes/no, on/off. Pairs based on qualities fail. "Black" is not a valid switch value, because _not black_ is not guaranteed to be white — it could be gray, or pink, or anything. If the opposite of the value is not the single, obvious other state, it is not a switch.

**The label test — what separates a switch from a radio group.** A radio group is _one label with several values_: the user picks which value goes with the label. A switch is _one label whose value is implied_ — the label alone says what is being controlled, and the state is simply true or false. Use a switch only when both the value and the thing the label controls are binary.

**A checkbox turns a true/false flag on or off for a specific value**, and that value can be anything. That is why checkboxes work in groups and switches do not.

**The lone binary field.** A single checkbox sitting alone in a checkbox group looks odd; a switch usually reads better in a form. Here the two work the same way, so this is the one case where appearance may decide.

## Checkbox vs. radio

**MUST use radio buttons for options that rule each other out.** Never checkboxes. Checkboxes mean "select as many as apply" by definition, so using them for a choice of one gets the data wrong.

- **Radio group** = exactly one of N. Traditionally an answer is required, and the user cannot move on until one option is selected.
- **Checkbox group** = zero through N.

**A radio group with nothing selected, and no requirement to select anything, is unusual and confusing.** It happens, but treat it as a warning sign — if nothing needs to be chosen, question whether it is really a choice of one.

## Defaults and pre-selection

**Checkbox groups: pre-select freely.** Zero, some, or all checked in advance are all acceptable; there is no house rule either way.

**Radio groups: be very careful about selecting a value in advance.** Most users do not know how to deselect a radio button once one is selected, so a default quietly becomes the answer. A pre-selected radio button is the most costly default in the system.

**The threshold is about 90 percent** — pre-select only where about that share of users would choose that option anyway. And never pre-select an option that has major consequences later in the workflow, however likely it is. Both tests are owned by `recursica-skill-defaults`.

## Option counts and dropdowns

**Aim for 7 ± 2 options, adjusted for cognitive load** (the mental effort a task demands). See `recursica-skill-working-memory` for the reasoning and its limits — the limit applies to sets of options the user compares, not to lists they simply recognize an item from:

- **Options that are similar and easy to understand** → the upper end of the range is fine.
- **Options that are different from each other, hard to grasp, or need specialist knowledge** → use fewer.

**Above that limit, switch to a dropdown.** Dropdowns handle large sets of options well, and are usually single select. A multi-select dropdown — a checkbox group inside a dropdown — is available when many values can be selected.

**The dropdown affordance test.** A dropdown hides its options, so the user has no affordance (a visible cue that tells the user they can act on something) for what is inside. Before choosing one, ask: does the user know what is in there before they click it?

- **Good:** US states. A fixed list, in alphabetical order, and everyone has a rough idea of how many there are — predictable and familiar.
- **Bad:** 50 unrelated values with nothing in common. Overwhelming, and mentally expensive to pick from.

**Choosing between checkboxes and a multi-select dropdown** depends on the number of options, how similar their topics are, how hard they are to tell apart, and the overall size of the form. Six options that are easy to read are normally checkboxes. But if the form is already long, collapsing them into a multi-select dropdown to avoid a lot of scrolling down the page is a fair trade.

## Select all and indeterminate state

**Select all is fine to include in a checkbox group**, and the group component provides the indeterminate state (the partly selected state, shown as a dash, when some but not all items are selected). Select all, then deselect one item, and the select-all control moves to indeterminate.

**Treat the need for select all as a warning sign.** If checking the items one by one would be tiring for the user — twenty checkboxes, say — the control is probably wrong. Rethink the form design before adding the affordance.

## Selection in tables

**Selecting a row uses a checkbox in the leftmost cell, with a checkbox in the table header.** Table structure itself is owned by `recursica-skill-tables`.

**The header checkbox is not optional.** Every table with checkboxes in its rows has one. Without it, there is no way to select or release the whole set, and the reader is left clicking down a list to undo a selection they made by accident.

**A row checkbox means one thing: include this row in what the bulk action does.** It is not a way to focus on a record, open it, or show actions for it. NEVER let selecting a single row trigger an action on that one record. A table that offers `Correct this name` when one row is selected and `Combine` when two are has made the checkbox mean two unrelated things, and the reader learns neither. Editing one record is started from that record; see `recursica-skill-tables`.

**No separate clear or deselect-all control.** The header checkbox already is that control — click it when it is checked or indeterminate, and the set resolves. A second control doing the same job somewhere else is one more thing to read, and a second answer to "how do I start over?"

**How the header checkbox works — it MUST behave this way:**

- Indeterminate + click → **always becomes fully checked.** Never unchecked.
- From fully checked or fully unchecked, a click switches to the other.
- Indeterminate can be reached **only** by selecting or deselecting individual rows. Clicking the header control never puts it into that state.

**Avoid switches in table rows.** A switch is bulky and takes up space awkwardly in a dense row; a checkbox is far more efficient. Prefer a checkbox or radio in the row, and handle the toggle another way. It is not impossible, but avoid it.

## Layout

**MUST arrange checkboxes and radio buttons vertically. NEVER horizontally.** A horizontal arrangement is hard to scan, and it is hard to tell which control belongs to which label — the pairing between each control and its value stops being clear. The system should never produce a horizontal checkbox or radio group.

**When the layout really calls for a horizontal arrangement, change the control instead of turning the group sideways:**

| Need                                        | Horizontal control                                                    |
| ------------------------------------------- | --------------------------------------------------------------------- |
| Single select (options rule each other out) | **Segmented control** — this is how horizontal radio buttons are done |
| Multi-select                                | **Selectable chips**                                                  |

Both keep the edge of each value visible, which is exactly what a sideways radio or checkbox group loses. All the other rules still apply — the limit on the number of options, care with pre-selection for single select, and how saving works.

**The segmented control is limited to 2–5 options**, tighter than the general 7 ± 2 limit, because it is horizontal and compact. Above five, go back to a vertical radio group — or a dropdown, if the set is also over the general limit. Never fall back to tabs.

## Immediate vs. batch submit

**Default: submit everything together, behind a submit button.** The reasons, in order:

1. The user must be able to change their mind before anything is saved.
2. Tracking and logging records is far easier — one timestamp and one update, with much less noise than saving field by field.

**MUST NOT mix instant saving of individual fields with submitting everything together.** Either every field saves when it changes, or every field saves on submit. Mixing them is truly confusing, because the user can no longer tell which of their changes are live.

**Avoid saving to the server immediately in any form with more than one field.**

**Switches follow the same consistency rule.** A switch may save immediately or save with the form — immediately feels slightly more natural for a switch — but whichever it is, use switches the same way throughout the system.

## Uncommitted changes

**A form is in exactly one save mode, and the mode decides what you show:**

- **Batch save → no status, and no indicator of unsaved changes.** Showing that a form has unsaved changes is very rarely worth doing. The signal the user needs is the submit button becoming enabled once every editable control is valid — nothing else.
- **Field-level / instant save → a status message that stays on the page is required.** If the server saves on every field change, the user must be able to see that state on the page at all times.

Never mix the two modes within a system. See `recursica-skill-forms` for the full table of save modes.

## Progressive disclosure

**Selection controls may reveal more fields, and this does not change how saving works.** A checkbox that brings in a field or group further down the form is fine, and the whole thing still submits together — which is easier, not harder.

Example: a set of ways to travel, where checking "Car" reveals a group of car details with make, model, and color.

## Disabled vs. read-only

**Disable a control when the user could do something to enable it.** Every control — switch, checkbox, radio, dropdown — has a disabled state, and that is the right way to show a choice that is unavailable for now.

**Use the read-only control when the value cannot be edited, and the user has no way in this form to make it editable.** The read-only control shows a label with its values, and it fits the form layout.

**If the user will never be able to edit a value, it should not be a form control at all.**

## Assistive text

**Every control supports assistive text below it — use it to state the selection rules**, whatever the type of control. "At least two options required" belongs under the checkbox group, not in a validation message the user only sees after they fail.

## Resetting

**Resetting belongs to the whole form, not to one control.** Where a reset is called for, use a button labeled with a verb and its object — "Reset form", "Clear form" — that calls the native HTML reset. No control has its own restore behavior.

## Uncovered — ask, do not invent

No house rule covers these yet. **Ask the person instead of choosing** — see the never-guess rule in `recursica-skill-design-router`. Do not stretch a rule above to fit them.

- **When autocomplete or typeahead replaces a dropdown.** A dropdown handles many options, but the point at which searching beats scanning has not been set.
- **Radio buttons inside a table row.** Mentioned in passing as an alternative to a switch, but not established as a pattern.
- **Limits on multi-select.** Whether a user may be limited to selecting _n_ out of many.

## Out of scope

- **All color, visual design, and styling**, plus keyboard interaction inside a control. The Recursica components handle these.
- **Form layout, when validation happens, how errors are shown, and how save status is displayed.** Covered by `recursica-skill-forms`.
- **Confirming high-risk or destructive operations**, including bulk deletes. Covered by `recursica-skill-buttons-links`.

## Pre-flight checklist

Before treating a set of selection controls as done, check:

- [ ] Every switch is inside a form, and every toggle outside a form is a segmented control.
- [ ] Options that rule each other out use a radio group, never checkboxes.
- [ ] Every switch passes the binary-inverse test — the opposite state is known, unique, and binary.
- [ ] Every switch passes the label test — the label alone names what is controlled, with no competing values.
- [ ] Checkbox groups are used wherever zero to many can be selected.
- [ ] Each group holds 7 ± 2 options, and fewer where the options are different from each other or need specialist knowledge.
- [ ] Sets above the limit use a dropdown, and the set is predictable enough that the user knows what is inside before opening it.
- [ ] No radio value is selected in advance unless the default is right for nearly everyone.
- [ ] Select all appears only where the group really is long, and the group shows an indeterminate state.
- [ ] Row selection in a table uses a leftmost checkbox with a header checkbox, on every table that has row checkboxes. Clicking an indeterminate header selects all.
- [ ] Selecting rows only feeds bulk actions. Selecting one row triggers no action on that single record, and there is no separate clear or deselect-all control beside the header checkbox.
- [ ] There are no switches in table rows.
- [ ] Checkboxes and radio buttons are stacked vertically — never horizontally. Where horizontal is needed, a segmented control is used for single select, or selectable chips for multi-select.
- [ ] The form saves everything together, behind a submit button, with no instant saving of individual fields anywhere in it.
- [ ] Switches save at the same point everywhere in the system.
- [ ] There is no indicator of unsaved changes; the enabled submit button is the only signal.
- [ ] Revealed fields submit together with the control that revealed them.
- [ ] Choices that are unavailable for now are disabled. Values that are permanently not editable use the read-only control, or are not form controls at all.
- [ ] Selection rules (minimums and maximums) appear as assistive text under the control.
- [ ] You asked before deciding anything on the uncovered list: when autocomplete replaces a dropdown, radio buttons in rows, and limits on selection.
