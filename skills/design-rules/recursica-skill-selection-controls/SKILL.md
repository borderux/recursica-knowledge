---
name: recursica-skill-selection-controls
description: House rules for choosing among selection controls in enterprise web applications — checkbox vs. switch vs. radio group vs. dropdown vs. multi-select, option counts and 7 ± 2, pre-selected defaults, select-all and indeterminate states, table header checkbox mechanics, disabled vs. read-only, vertical-only layout, and immediate vs. batch submit. Use whenever picking or reviewing the control for a set of options: checkboxes, switches, toggles, radio buttons, selects, multi-selects, selectable chips, or row and header selection in a table. Trigger on "checkbox or switch", "radio or dropdown", "toggle", "multi-select", "select all", "indeterminate", "pre-selected", "how many options", or any question about which control a field should use. Do NOT use for form layout, validation timing, or error presentation — that is recursica-skill-forms. Do NOT use for button or link triggers — that is recursica-skill-buttons-links.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Selection controls

House rules for deciding which selection control a field gets — checkbox, switch, radio group, dropdown, or multi-select — and how that control behaves. These are opinions, not neutral best practices. Apply them as constraints.

Context these rules assume: **complex enterprise web applications, desktop-first**, built on the Recursica design system. Control styling, states, and keyboard interaction within a control are inherited from the components and are never your decision. Your decisions are which control, how many options, what is pre-selected, and when the change commits.

## Governing principles

1. **The shape of the data picks the control.** How many values are selectable, are they mutually exclusive, and is the inverse of the value knowable? Answer those and the control is determined. Appearance is the last consideration, not the first.
2. **Options should be visible and scannable.** Vertical, and within working memory. Hiding options inside a dropdown has to be earned by the set being predictable enough that the user knows what's in there before opening it.
3. **One commit boundary per form.** Batch submit is the default, and instant-save and deferred-save must never coexist in the same system. The user needs one reliable answer to "is my work saved?"

## Choosing the control

Work down this list; the first match wins.

1. **One value, and its inverse is binary, known, and unique → switch.** See the binary-inverse test below.
2. **Mutually exclusive options, one must be chosen → radio group**, up to the option-count ceiling. Where the layout calls for a horizontal arrangement, use a **segmented control** instead.
3. **Mutually exclusive options above the ceiling → dropdown** (single select).
4. **Zero to many selectable → checkbox group**, up to the option-count ceiling. Where the layout calls for a horizontal arrangement, use **selectable chips** instead.
5. **Zero to many above the ceiling, or the form is already very long → multi-select dropdown** (a checkbox group inside a dropdown).

## Switch vs. checkbox

**A switch has a deliberately narrow use.** Reach for a checkbox unless the switch test passes.

**The binary-inverse test — MUST pass before using a switch.** The inverse of the value must be binary, known, and unique: true/false, yes/no, on/off. Qualitative pairs fail. "Black" is not a valid switch value, because _not black_ is not guaranteed to be white — it could be gray, or pink, or anything. If the opposite of the value is not the single obvious other state, it is not a switch.

**The label test — what distinguishes a switch from a radio group.** A radio group is _one label with multiple values_: the user picks which value to associate with the label. A switch is _one label whose value is implied_ — the label alone says what is being controlled, and the state is simply true or false. Use a switch only when both the value **and** the thing the label governs are binary.

**A checkbox flips a true/false flag on a specific value**, and that value can be anything. That is why checkboxes work in groups and switches do not.

**The lone binary field.** A single checkbox sitting alone in a checkbox group looks odd; a switch usually reads better in a form. Functionally the two are interchangeable here, so this is the one case where appearance may decide.

## Checkbox vs. radio

**MUST use radio buttons for mutually exclusive options.** Never checkboxes. Checkboxes mean "select as many as apply" by definition, so using them for an exclusive choice misstates the data.

- **Radio group** = exactly one of N. Traditionally an answer is required, and the user cannot progress until one option is selected.
- **Checkbox group** = zero through N.

**A radio group with nothing selected and no requirement to select is unusual and confusing.** It happens, but treat it as a smell — if nothing needs to be chosen, question whether it is really an exclusive choice.

## Defaults and pre-selection

**Checkbox groups: pre-select freely.** Zero, some, or all pre-checked are all acceptable; there is no house rule either way.

**Radio groups: be very cautious about pre-selecting a value.** Most users do not know how to deselect a radio button once one is selected, so a default silently becomes the answer. Only pre-select when the default is genuinely correct for nearly everyone.

## Option counts and dropdowns

**Target 7 ± 2 options, scaled by cognitive load.** See `recursica-skill-working-memory` for the basis and the boundary — the ceiling governs comparison sets, not lists the user merely recognizes from:

- **Similar, easily understood options** → the upper end of the range is fine.
- **Dissimilar or cognitively challenging options, or ones that need domain expertise** → use fewer.

**Above that ceiling, convert to a dropdown.** Dropdowns handle large option sets well, and are typically single select. A multi-select dropdown — a checkbox group inside a dropdown — is available when many values are selectable.

**The dropdown affordance test.** A dropdown hides its options, so the user has no affordance for what is inside. Before choosing one, ask: **does the user know what is in there before they click it?**

- **Good:** US states. Finite, alphabetized, and everyone has a rough sense of the quantity — predictable and conventional.
- **Bad:** 50 disparate values with nothing in common. Overwhelming and cognitively expensive to pick from.

**Checkboxes vs. multi-select dropdown** turns on quantity of options, similarity of topic, complexity of differentiating them, and the size of the form overall. Six easily-read options are normally checkboxes — but if the form is already long, collapsing them into a multi-select dropdown to avoid a large vertical scroll is a legitimate trade.

## Select all and indeterminate state

**Select all is fine to include in a checkbox group**, and the group component provides the indeterminate state: select all, deselect one item, and the select-all control moves to indeterminate.

**Treat the need for select all as a signal.** If the user would find checking items one by one arduous — twenty checkboxes, say — the control is probably wrong. Reconsider the form design before adding the affordance.

## Selection in tables

**Row selection is a checkbox in the leftmost cell, with a checkbox in the table header.** Table structure itself is `recursica-skill-tables`.

**Header checkbox mechanics — MUST behave this way:**

- Indeterminate (a mix of selected and unselected rows) + click → **always goes to fully checked.** Never to unchecked.
- From fully checked or fully unchecked, a click flips to the other.
- Indeterminate is reachable **only** by selecting or deselecting individual rows. It is never a state the header control is clicked into.

**Avoid switches in table rows.** A switch is bulky and takes space inelegantly at row density; a checkbox is far more efficient. Prefer a checkbox or radio in the row and handle the toggle another way. Not impossible, but avoid it.

## Layout

**MUST arrange checkboxes and radio buttons vertically. NEVER horizontally.** Horizontal arrangement is hard to scan and makes it hard to tell which control belongs to which label — the pairing between control and value stops being discrete. The system should never produce a horizontal checkbox or radio group.

**When the layout genuinely calls for a horizontal arrangement, change the control rather than rotating the group:**

| Need                               | Horizontal control                                                    |
| ---------------------------------- | --------------------------------------------------------------------- |
| Single select (mutually exclusive) | **Segmented control** — this is how horizontal radio buttons are done |
| Multi-select                       | **Selectable chips**                                                  |

Both keep each value's boundary visible, which is exactly what a rotated radio or checkbox group loses. All the other rules still apply — the option-count ceiling, pre-selection caution for single select, and the commit model.

**The segmented control caps at 2–5 options**, tighter than the general 7 ± 2 ceiling, because it is horizontal and compact. Above five, go back to a vertical radio group, or a dropdown if the set also exceeds the general ceiling. Never fall back to tabs.

## Immediate vs. batch submit

**Default: batch submit behind a submit button.** Rationale, in order:

1. The user must be able to change their mind before anything is written.
2. Record tracking and logging are far easier — one timestamp, one update, much less noise than field-level writes.

**MUST NOT mix field-level instant writes with batch submit.** Either every field commits on change or every field commits on submit. Mixing them is genuinely confusing, because the user can no longer tell which of their changes are live.

**Avoid immediate server-side saving in any form with multiple fields.**

**Switches follow the same consistency rule.** A switch may commit immediately or commit with the form — immediate is slightly more natural for a switch — but whichever it is, **use switches the same way throughout the system.**

## Uncommitted changes

**A form is in exactly one save mode, and the mode decides what you show:**

- **Batch save → no status, no dirty indicator.** Showing that a form has unsaved changes is very rarely worth doing. The signal the user needs is the submit button becoming enabled once every editable control is valid — nothing else.
- **Field-level / instant save → a persistent status message is required.** If the server commits on every field change, the user must be able to see that state on the page at all times.

Never mix the two modes within a system. See `recursica-skill-forms` for the full save-mode table.

## Progressive disclosure

**Selection controls may reveal further fields, and this does not change the commit model.** A checkbox that introduces a field or group further down the form is fine, and the whole thing still submits as one batch — which is easier, not harder.

Example: a set of transportation modes where checking "Car" reveals a car attributes group with make, model, and color.

## Disabled vs. read-only

**Disable a control when the user could take some action to enable it.** Every control — switch, checkbox, radio, dropdown — has a disabled state, and that is the correct presentation for a temporarily unavailable choice.

**Use the read-only control when the value is not editable and the user has no mechanism in this form to make it editable.** The read-only control presents a label with its values and fits the form layout.

**If a value will never be editable by the user, it should not be a form control at all.**

## Assistive text

**Every control supports assistive text below it — use it to carry selection rules**, regardless of control type. "At least two options required" belongs under the checkbox group, not in a validation message the user only sees after failing.

## Resetting

**Reset is a form-level concern, not a control-level one.** Where a reset is warranted, use a button labeled with a verb and its object — "Reset form", "Clear form" — calling the native HTML reset. There is no per-control restore behavior.

## Out of scope

- **All color, visual design, and styling**, plus keyboard interaction within a control. Handled by Recursica components.
- **Form layout, validation timing, error presentation, and save-status display.** Covered by `recursica-skill-forms`.
- **Confirmation of high-risk or destructive operations**, including bulk deletes. Covered by `recursica-skill-buttons-links`.

## Pre-flight checklist

Before considering a set of selection controls done, verify:

- [ ] Mutually exclusive options use a radio group, never checkboxes.
- [ ] Every switch passes the binary-inverse test — the opposite state is known, unique, and binary.
- [ ] Every switch passes the label test — the label alone names what is controlled, with no competing values.
- [ ] Checkbox groups are used wherever zero-to-many selection is possible.
- [ ] Each group holds 7 ± 2 options, fewer where the options are dissimilar or need domain knowledge.
- [ ] Sets above the ceiling use a dropdown, and the set is predictable enough that the user knows what's inside before opening it.
- [ ] No radio value is pre-selected unless the default is right for nearly everyone.
- [ ] Select all appears only where the group is genuinely long, and the group exposes an indeterminate state.
- [ ] Table row selection is a leftmost checkbox with a header checkbox; clicking an indeterminate header selects all.
- [ ] No switches in table rows.
- [ ] Checkboxes and radios are stacked vertically — never horizontal. Horizontal needs use a segmented control (single select) or selectable chips (multi-select).
- [ ] The form commits as one batch behind a submit button; no field-level instant writes anywhere in it.
- [ ] Switch commit timing is consistent across the whole system.
- [ ] No dirty-state indicator; the enabled submit button is the only signal.
- [ ] Disclosed fields submit with the same batch as their trigger.
- [ ] Temporarily unavailable choices are disabled; permanently non-editable values use the read-only control or are not form controls at all.
- [ ] Selection rules (minimums, maximums) appear as assistive text under the control.
