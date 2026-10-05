---
name: recursica-skill-checkbox
description: Rules for the Recursica checkbox and checkbox group — zero-to-many selection, option counts, select-all and the indeterminate state, table row selection, and disabled versus read-only. Use for checkboxes, checklists, and row selection. Not for one choice — see recursica-skill-radio-button; not for instant on/off settings — see recursica-skill-switch.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Checkbox

A checkbox turns one specific value on or off. A checkbox group lets the user select any number of options, from none to all of the options in the group.

## When to use a checkbox

- **The user may select zero, one, or many options.** The options are independent. Selecting one option never rules out another option.
- **The user should see every option at once**, in a stacked list that is easy to scan. The user should not have to open a control to find out which options are available.
- **The options have a parent-child relationship**, such as a parent checkbox that sums up a list of child checkboxes. The indeterminate state (the partly selected state, shown as a dash, when some but not all items are selected) exists for this case.
- **A change to a checkbox saves with the form** when the user submits the form, not the moment the user checks the checkbox.

## When not to use a checkbox

| Situation                                                                        | Use instead                                                                                                             |
| -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Selecting one option rules out the other options, and the user picks exactly one | A radio group. See `recursica-skill-radio-button`. Never use checkboxes when the user picks exactly one option.         |
| The change must take effect the moment the user turns the setting on or off      | A switch. See `recursica-skill-switch`.                                                                                 |
| There is one lone yes-or-no field, with no others beside the field               | Usually a switch, in the form. See `recursica-skill-switch`.                                                            |
| The group has more options than the option limit in the rules below              | A multi-select dropdown. See `recursica-skill-dropdown`. A multi-select dropdown is a checkbox group inside a dropdown. |
| The options must sit side by side in a horizontal row                            | Selectable chips. See `recursica-skill-chip`. Never lay out a checkbox group in a horizontal row.                       |
| The user chooses an action, not a value                                          | A button. See `recursica-skill-button`.                                                                                 |
| The current user can never edit the value                                        | A read-only field, which shows the label and the value as text, with no input. See `recursica-skill-read-only-field`.   |

**Do not use a disabled checkbox to show a value.** A value that nobody can ever change here does not belong in a form control.

## Variants

**Use only the checkbox variants and options that the Recursica MCP server lists for the project.** A designer can add variants and options in Theme Forge, so each project can differ. Get the list with the server's `recursica_get_component_doc` tool, and use the names the code uses. Never invent a variant or an option.

The rules below describe each option by role, such as "the checked state". The names in the standard UI kit (the unchanged UI kit in the official Recursica release) are examples only.

- **A checkbox field has three components:** the checkbox, the checkbox item and the checkbox group. A checkbox is the box, and holds whether the box is selected. A checkbox item holds the label of one option and pairs the label with a box. A checkbox group sets the layout and the spacing between the checkbox items. In the standard UI kit, the three components are `checkbox-group`, `checkbox-item`, and `checkbox`. Use all three components together. Never place bare `checkbox` components in a form and call the checkboxes a group.
- **A checkbox has three selection states.** A checkbox is checked, unchecked, or indeterminate. In the standard UI kit, the variant is `selection-states`, with the options `checked`, `unchecked`, and `indeterminate`.
- **The indeterminate state is a state of the checkbox, not a separate component.** A select-all checkbox or a parent checkbox shows the indeterminate state when some, but not all, of the child checkboxes are checked.
- **Two names for the same two selection states.** Only the design-system website says "Selected" and "Unselected". The standard UI kit says `checked` and `unchecked`. Both pairs of names mean the same two states.
- **A disabled state on each checkbox item.** The disabled state belongs to the checkbox item, so one option can be unavailable while the options next to the disabled option stay usable. In the standard UI kit, the variant is `states`, with the option `disabled`. The checkbox components show the disabled look automatically.
- **Disabled combined with a selection state.** Only the design-system website shows `Selected-disabled` and `Indeterminate-disabled` as states. Each one is the disabled state of the checkbox item combined with the selection state of the checkbox, not an extra selection state.
- **Read-only is a separate component.** The read-only field, `read-only-field` in the standard UI kit, shows text instead of inputs.
- **Two label placements on the checkbox group.** The label of the checkbox group sits beside the checkbox items or above the checkbox items. Label placement is one decision for the whole field, so the variant belongs to the checkbox group. In the standard UI kit, the variant is `layouts`, with the options `side-by-side` and `stacked`.

**Label placement is a variant, the same variant every field has.** A group's label sits beside the stack of items or above the stack of items. In the standard UI kit, the variant is `layouts`, with the options `side-by-side` and `stacked`. **Label placement is not a variant for which way the items run.** Items are always stacked vertically — `recursica-skill-selection-controls` forbids a horizontal checkbox group outright — so `side-by-side` must never be read as "put the checkboxes in a row."

## Rules

**A checkbox group holds at least two checkbox items.** One checkbox alone is not a group. For a single yes-or-no field, consider a switch instead.

**Keep a checkbox group to 7 ± 2 options.** Lean toward fewer options when the options differ from each other, are hard to understand, or need specialist knowledge. With more options than the limit, switch to a multi-select dropdown. `recursica-skill-working-memory` gives the reason for the limit.

**A long form is a valid reason to replace a checkbox group with a multi-select dropdown**, even below the limit. Six options that are easy to read are normally checkboxes. A multi-select dropdown can still be the right choice when the dropdown saves a lot of scrolling down the page.

**Stack checkbox items vertically. Never lay out checkbox items horizontally.** In a horizontal row of checkboxes, the user cannot easily tell which box belongs to which label. If the layout needs the options in a row, change the control to selectable chips.

**Label placement is one decision per form, not per field.** This group uses the same label placement as every other field in the form. Apply the container-width test once, to the whole form. The result sets the placement of every field in the form, including short fields that would fit side by side. A form may change placement at a breakpoint, but a form never mixes placements at one breakpoint, and a form section never gets a separate placement. `recursica-skill-forms` sets this rule.

**Pre-select freely.** A checkbox group may start with no options, some options, or all options checked. No house rule limits pre-selection in a checkbox group. The radio group rule is the opposite.

**Put the selection rule in assistive text**, not in a validation message that the user sees only after breaking the rule. For example, put "At least two options required" under the group. Show the selection rule with the assistive element. See `recursica-skill-assistive-element`.

**A select-all checkbox is fine to include, and the select-all checkbox uses the indeterminate state.** When the user selects all, then deselects one checkbox item, the select-all control changes to the indeterminate state.

**Treat a need for select all as a warning sign.** If checking items one at a time would tire the user, as with twenty checkboxes, a checkbox group is the wrong control. Fix the screen's structure before adding the select-all affordance (a visible cue that a control can be used, such as the underline on a link).

**To select table rows, put a checkbox in the leftmost cell of each table row, and a checkbox in the table header.** The header checkbox always behaves as follows:

- A click on an indeterminate header checkbox **always makes the header checkbox fully checked.** The click never makes the header checkbox unchecked.
- A click on a fully checked header checkbox makes the header checkbox fully unchecked. A click on a fully unchecked header checkbox makes the header checkbox fully checked.
- The header checkbox becomes indeterminate **only** when the user selects or deselects individual table rows. A click on the header checkbox never makes the header checkbox indeterminate.

**A checkbox may reveal more fields, and the form still saves the same way.** For example, checking "Car" may reveal a group of car details directly below the checkbox. The whole form still submits together. Keep the revealed content right next to the checkbox that revealed the content.

**Never mix instant saving with saving the whole form together.** A checkbox group in a form that submits with a button must not save when the selection changes.

**A disabled checkbox item and a read-only field are different components, not two styles of one component.**

- **Disabled checkbox item.** A disabled item is still a checkbox and still clearly a control, but the user cannot use the item right now. Use a disabled item when the user could make the item usable by first taking a different action.
- **Read-only field.** A read-only field is a different component, with no input at all. Use a read-only field when the current user never changes the value here.

## Accessibility

The rules below add to the accessibility baseline in `recursica-skill-system-conventions`, which every Recursica component follows.

The checkbox component pairs each box with the item label and provides the focus ring. The app must give the group a name and make each checkbox's state available in code. The app must also add the behavior in the two lists below. Apps most often miss the behavior in the two lists below.

### Screen readers

- **Set a real label on every checkbox item (`checkbox-item`).** The item label is the accessible name (the name a screen reader reads out for a control). Text placed beside a box is not a label, and leaves the checkbox with no accessible name.
- **Set a separate label on the checkbox group (`checkbox-group`).** A screen reader must announce the group label when focus enters the group. A group label that only sits above the group in the reading order is not enough. Without the group label, the user hears a list of options with no question.
- **The group label and the item labels do different jobs.** Never use the group label to do an item label's job, or an item label to do the group label's job. See `recursica-skill-label`.
- **Make the checked state available in code.** Never show the checked state only by a fill color or a check mark. A user who cannot see the box must still hear "checked" or "not checked". The rule comes from `recursica-skill-system-conventions`.
- **Make the indeterminate state available in code as a mixed state**, not as a dash that exists only on screen. "Partially checked" gives the user information, and a horizontal bar gives none.
- **A select-all control must name what the control selects**, as in "Select all rows". Never use a bare "Select all" in a table header.
- **In a table, each row checkbox must name the table row.** Thirteen announcements of "checkbox, unchecked" tell the user nothing. Put the object in the checkbox's accessible name, or let the table row supply the object in code.
- **When a checkbox reveals more fields, tell the user before the user checks the box.** Put the notice in the item label or in the group's assistive text. Fields that appear below without an announcement are easy to miss when the page is read in order.

### Keyboard and non-mouse navigation

- **Space toggles a checkbox.** Users expect the Space key. Do not remap Space, do not require Enter instead, and do not block Space.
- **The adapter (the Recursica component library for one framework, such as Mantine or Angular Material) handles the keys inside the checkbox.** Do not add custom key handlers to the box, and do not rebuild the toggling. A custom key handler or rebuilt toggling breaks behavior that works.
- **Every checkbox in a group is a separate tab stop** (a place the Tab key lands). A radio group works the opposite way. Do not add roving focus (where the arrow keys move between items that share one tab stop) inside a checkbox group. Do not repurpose Home and End. Home and End belong to the page.
- **Clicking or tapping the item label toggles the checkbox.** A real label connected to the box toggles the checkbox automatically, and gives the user a bigger target. Do not show the label as text that is not connected to the box.
- **Do not move focus for the user.** When a checkbox reveals fields below, focus stays on the checkbox. The user reaches the new fields with the next Tab. Moving focus into the revealed fields takes keyboard users and screen reader users away from the checkbox they just used.

## Styling set by tokens

**Do not set or override the checkbox properties below.** The three checkbox components set each property.

- On `checkbox`: `border-radius`, `border-size`, `size`, `icon-size`.
- On `checkbox-group`: `item-gap`, `padding`.
- On `checkbox-item`: `label-gap`, `max-width`, `text`, `colors`.
- Field colors and sizes from `globals.form.field`, and the disabled look from `globals.states.disabled`.
- The gaps between the label and the field, and the spacing between items in a form: `globals.form.properties.label-field-gap-horizontal`, `label-field-gap-vertical`, `vertical-item-gap`.
- The check mark and the indeterminate dash, the hover and active styling, and the focus ring.

**Do not add margins or spacer elements between checkbox items, or between the group and the elements next to the group.** The components set the spacing.

## Related skills

- `recursica-skill-selection-controls` — which control a field gets (a checkbox, a switch, or a radio button), option counts, pre-selection, select all, how table row selection works, vertical layout only, and when a change saves.
- `recursica-skill-forms` — single-column layout, label placement, the container width that decides label placement, one label placement per form, marking a field required or optional, when validation runs, save mode, and the rule that no form control goes inside a card.
- `recursica-skill-label` — the group label and the item labels, label text that makes sense without the text around the label, and the required and optional markers.
- `recursica-skill-assistive-element` — the help text and error text below the group, and the wording rules for both.
- `recursica-skill-working-memory` — the reason for the 7 ± 2 limit, and the line between recognizing an option and comparing options, which decides when a long list is acceptable.
- `recursica-skill-tables` — the table structure around row selection and the header checkbox.
- `recursica-skill-system-conventions` — never showing a meaning in only one way, and fixing the screen's structure instead of adding a mechanism to cope with a bad structure.

## Open questions

- **How a checkbox group shows an error.** A checkbox group can have a selection rule that fails validation. No rule says how a checkbox group shows the validation error. If the project has an error state for the checkbox group, the checkbox item or the checkbox, use the project's error state. Otherwise, ask.
- **Whether the project has a multi-select dropdown.** `recursica-skill-selection-controls` requires a multi-select dropdown in two places. If the project has a multi-select dropdown, use the project's multi-select dropdown. Otherwise, ask. A project with no multi-select dropdown has a gap in the list of components, not an invitation to build a multi-select dropdown from other parts. Do not put a checkbox group inside a dropdown, and do not use a transfer list instead without asking. When the user must filter by several values, one build test used separate single-value filters that AND together (a row appears only if the row matches every filter), and the workaround succeeded.
- **Whether a select-all control is a `checkbox-item` in the group, or a separate control outside the group**, and how the select-all control relates to the group's `item-gap`.
- **Limits on selection.** No rule says whether a user may be limited to selecting _n_ options out of many.
- **How deep parent-child checkboxes may nest.** The indeterminate state implies a hierarchy of parent and child checkboxes. No rule says how many levels deep the hierarchy may go, or how a parent checkbox's state is worked out beyond one level.

## Pre-flight checklist

- [ ] Selecting one option never rules out another option, and no single-choice question is built as checkboxes.
- [ ] The group holds at least two items, within 7 ± 2, and fewer where the options are hard to tell apart.
- [ ] Items are stacked vertically. There is no horizontal group, and `side-by-side` is used only for label placement.
- [ ] Label placement matches every other field in the same form, with one placement per form at each breakpoint and no mixing between fields or form sections.
- [ ] `checkbox`, `checkbox-item`, and `checkbox-group` are used together. No form holds a bare `checkbox` without the item and the group.
- [ ] The group has a real label, and every item has a real label. The group label never does an item label's job, and an item label never does the group label's job.
- [ ] The group label is announced when focus enters the group.
- [ ] The checked and indeterminate states are available in code, never shown only by a fill or a mark.
- [ ] Selection rules are in assistive text shown with the assistive element, and the required state is available in code.
- [ ] A select-all control appears only where the group is long, and clicking an indeterminate header checkbox selects all.
- [ ] Each row checkbox in a table names the table row, and the header checkbox names what the header checkbox selects.
- [ ] Space toggles the box, every checkbox is a separate tab stop, the arrow keys do not move focus between items, and key handling comes from the adapter.
- [ ] Clicking the item label toggles the box.
- [ ] Focus is never moved for the user, including when a checkbox reveals fields below.
- [ ] The disabled state is used only for options that are unavailable for now. A value that can never be edited uses the read-only field.
- [ ] Every variant, size, and state is one the Recursica MCP server lists for the project, and every property the checkbox components set comes from the components.
- [ ] The group saves with the form, in the same save mode as every other part of the system.
- [ ] Open questions were asked about, not decided: the group error state, the multi-select dropdown, where a select-all control sits, limits on selection, and nesting depth.
