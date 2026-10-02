---
name: recursica-skill-checkbox
description: Rules for the Recursica checkbox and checkbox group — zero-to-many selection, option counts, select-all and the indeterminate state, table row selection, and disabled versus read-only. Use for checkboxes, checklists, and row selection. Not for one choice — see recursica-skill-radio-button; not for instant on/off settings — see recursica-skill-switch.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Checkbox

A checkbox turns a true/false flag on or off for one specific value. A group of them lets the user select zero through N.

## When to use a checkbox

- **Zero to many options may be selected** — the options are independent, and they do not rule each other out.
- **The user should see every option at once**, stacked and easy to scan, instead of opening something to find out what is available.
- **The options have a parent-child relationship** — a parent checkbox summarizing a sub-list, which is what the indeterminate state is for.
- **The change is saved with the form**, on submit, not the moment the box is ticked.

## When not to use a checkbox

| Instead of a checkbox                                      | Use                                                                                 |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| The options rule each other out — exactly one of N         | `recursica-skill-radio-button`. Never checkboxes for a choice of one                |
| The change must take effect the instant it is flipped      | `recursica-skill-switch`                                                            |
| There is one lone binary field, with no others beside it   | Usually a switch in a form — `recursica-skill-switch`                               |
| There are more options than the limit                      | `recursica-skill-dropdown` — a multi-select dropdown is a checkbox group inside one |
| The options must sit in a row                              | Selectable chips — `recursica-skill-chip`. Never lay a checkbox group out in a row  |
| The user is choosing an action rather than setting a value | `recursica-skill-button`                                                            |
| This user can never edit the value                         | `recursica-skill-read-only-field` — shows the label and text, with no input         |

**Do not use a disabled checkbox to show a value.** A value nobody can ever change here does not belong in a form control.

## Variants

Taken from the UI kit (the token file, `recursica_ui-kit.json`, that says which variants and states each component has) → `ui-kit.components.checkbox`, `checkbox-group`, and `checkbox-item`. **Do not pass a variant, size, or state that is not listed here.**

| Component        | Variants           | Options                                 |
| ---------------- | ------------------ | --------------------------------------- |
| `checkbox`       | `selection-states` | `checked`, `unchecked`, `indeterminate` |
| `checkbox-group` | `layouts`          | `stacked`, `side-by-side`               |
| `checkbox-item`  | `states`           | `disabled`                              |

**Three components, one form field.** The group owns the layout and the spacing between items. The item owns one option's label, and pairs it with a box. The checkbox owns the box itself and whether it is selected. Use all three together; never place bare `checkbox` instances in a form and call it a group.

**The variants sit on different parts, and that is on purpose.** `layouts` belongs to the group — it is one decision for the whole field. `disabled` belongs to the item — so a single option can be unavailable while the ones next to it can still be used. There is no disabled state for the group as a whole; `globals.states.disabled` supplies the look.

**`layouts` is the label-placement variant, the same variant every field has.** `side-by-side` puts the group's label beside the stack of items; `stacked` puts it above. **It is not a variant for which way the items run.** Items are always stacked vertically — `recursica-skill-selection-controls` forbids a horizontal checkbox group outright — so `side-by-side` must never be read as "put the checkboxes in a row."

**`indeterminate` is a state of the `checkbox`, not a separate component.** It is the partly-selected state, shown as a dash, that a select-all or a parent checkbox shows when some but not all of its children are checked.

**None of the three has an error state**, and there is no required variant. `Selected-disabled` and `Indeterminate-disabled` are shown only on the design-system website as states. Each is the item's `disabled` combined with the checkbox's selection state, not an extra selection state.

**"Selected" and "Unselected" are shown only on the design-system website; the UI kit says `checked` and `unchecked`.** Both pairs name the same two states.

**There is no size variant.** `size` and `icon-size` are fixed properties of the checkbox.

**Read-only is a separate component** — `read-only-field`, which shows text instead of inputs.

## Rules

**A checkbox group holds at least two items.** One checkbox alone is not a group. For a single binary field, consider a switch instead.

**Keep the group to 7 ± 2 options, leaning lower** where the options are different from each other, hard to grasp, or need specialist knowledge. Above the limit, switch to a multi-select dropdown. See `recursica-skill-working-memory` for why the number is what it is.

**A long form is a valid reason to collapse a group into a multi-select dropdown**, even below the limit. Six options that are easy to read are normally checkboxes, but avoiding a lot of scrolling down the page can justify the dropdown.

**Stack items vertically. Never horizontally.** A row of checkboxes makes it hard to tell which box belongs to which label. If the layout calls for a row, change the control to selectable chips.

**Label placement is one decision per form, not per field.** This group's `layouts` value is not a separate choice — it matches every other field in the same form. The container-width test is applied once, to the whole form, and its answer governs every field in it, including short ones that would have fitted side by side. A whole form may switch placement between breakpoints, but it never mixes the two at one breakpoint, and a section never gets its own placement. Owned by `recursica-skill-forms`.

**Pre-select freely.** Zero, some, or all checked in advance are all acceptable in a checkbox group — there is no house rule against it. This is the opposite of the radio group rule.

**Put the selection rule in assistive text**, not in a validation message the user only sees after they fail. "At least two options required" belongs under the group. Pass it through `recursica-skill-assistive-element`.

**Select all is fine to include, and the group provides the indeterminate state.** Select all, then deselect one item, and the select-all control moves to indeterminate.

**Treat the need for select all as a warning sign.** If ticking items one by one would be tiring — twenty checkboxes — the control is wrong. Fix the structure before adding the affordance (a visible cue that a control can be used, such as the underline on a link).

**Selecting table rows uses a checkbox in the leftmost cell, with a checkbox in the table header.** How the header checkbox works is fixed:

- Indeterminate plus a click → **always becomes fully checked.** Never unchecked.
- From fully checked or fully unchecked, a click switches to the other.
- Indeterminate can be reached **only** by selecting or deselecting individual rows. Clicking the header control never puts it into that state.

**A checkbox may reveal more fields, and that does not change how saving works.** Checking "Car" may reveal a group of car details directly below; the whole form still submits together. Keep the revealed content right next to the checkbox that triggered it.

**Never mix instant saving with saving everything together.** A checkbox group in a form that submits on a button must not save when it changes.

**Disabled and read-only are different components, not two styles of one.**

- **Disabled item** — still a checkbox, still clearly a control, but not usable right now. Use it when the user could make it usable by doing something else first.
- **Read-only field** — a different component entirely, with no input at all. Use it when this user never changes this value here.

## Accessibility

This component also follows the accessibility baseline in `recursica-skill-system-conventions`. Only the rules specific to this component are listed here.

The component pairs each box with its item label, and provides the focus ring. The application must provide the group's name, make the state available in code, and cover everything listed below. These are the parts most often missed.

### Screen readers

- **Every item needs a real label passed to `checkbox-item`.** That label is the accessible name (the name a screen reader reads out for a control). Text drawn beside a box is not a label, and it leaves the checkbox with no name.
- **The group needs its own label passed to `checkbox-group`**, and it must be announced when focus enters the group — not only sit above it in the reading order. Without it, the user hears a list of options with no question attached.
- **The group label and the item labels do different jobs.** Never use one to do the other's work; see `recursica-skill-label`.
- **The checked state must be available in code**, never shown only by a fill color or a tick mark. A user who cannot see the box must still hear "checked" or "not checked". Required by `recursica-skill-system-conventions`.
- **Indeterminate must be made available as a mixed state**, not as a dash that exists only on screen. "Partially checked" is information; a horizontal bar is not.
- **A select-all control must name what it selects** — "Select all rows", not "Select all" floating in a table header.
- **In a table, each row checkbox must name its row.** Thirteen announcements of "checkbox, unchecked" tell the user nothing. Either the name carries the object, or the row supplies it in code.
- **When a checkbox reveals more fields, say so before it is ticked** — in the item label, or in the group's assistive text. Content that appears silently below is easy to miss when read in order.

### Keyboard and non-mouse navigation

- **Space toggles a checkbox.** That is the expected key. Do not remap it, do not require Enter instead, and do not swallow it.
- **The library owns how keys work inside the control.** Do not attach custom key listeners to the box or rebuild the toggling. Either one breaks behavior that already works.
- **Every checkbox in a group is its own tab stop** (a place the Tab key lands). This is the opposite of a radio group. Do not add roving focus (where the arrow keys move between items that share one tab stop) inside a checkbox group, and do not repurpose Home and End — they belong to the page.
- **Clicking or tapping the item label toggles its checkbox.** A real connected label provides this with no extra code, and it gives the user a bigger target. Do not break it by showing the label as text that is not connected to the box.
- **Do not move focus for the user.** When a checkbox reveals fields below, focus stays on the checkbox, and the user reaches the new fields with the next Tab. Pulling focus into the revealed content takes both keyboard and screen reader users away from the checkbox they just used.

## Styling set by tokens

Do not set or override any of these. The components set them:

- On `checkbox`: `border-radius`, `border-size`, `size`, `icon-size`.
- On `checkbox-group`: `item-gap`, `padding`.
- On `checkbox-item`: `label-gap`, `max-width`, `text`, `colors`.
- Field colors and sizes from `globals.form.field`, and the disabled treatment from `globals.states.disabled`.
- The label-to-field gaps and the spacing between items in a form — `globals.form.properties.label-field-gap-horizontal`, `label-field-gap-vertical`, `vertical-item-gap`.
- The tick and indeterminate glyphs, hover and active styling, and the focus ring.

Do not add margins or spacer elements between items or between the group and its neighbors; the components carry the spacing.

## Related skills

- `recursica-skill-selection-controls` — which control a field gets, checkbox vs. switch vs. radio, option counts, pre-selection, select-all, table selection mechanics, vertical-only layout, and commit timing.
- `recursica-skill-forms` — single-column layout, label placement, its container-width trigger, and one placement per form, required vs. optional marking, validation timing, save mode, and the rule that no form control goes inside a card.
- `recursica-skill-label` — the group label and the item labels, copy that stands alone, and the required and optional markers.
- `recursica-skill-assistive-element` — the help and error text below the group, and the copy rules for both.
- `recursica-skill-working-memory` — the 7 ± 2 basis, and the recognition-versus-comparison boundary that decides when a long list is acceptable.
- `recursica-skill-tables` — table structure around row and header selection.
- `recursica-skill-system-conventions` — never carry meaning in a single channel; fix the structure rather than adding a mechanism to cope with it.

## Open questions

- **How a checkbox group shows an error.** The UI kit gives `dropdown` and `autocomplete` an `error` state, and gives the checkbox none — yet a group can carry a selection rule that fails validation. The error treatment for a group is not stated.
- **The multi-select dropdown does not exist, and this is now confirmed in the shipped adapter as well as in the UI kit** — the dropdown maps to a single-value select, with no multi-select variant. `recursica-skill-selection-controls` requires one in two places. It is a gap in the component inventory, not an invitation to build one out of other parts: do not put a checkbox group inside a dropdown, and do not substitute a transfer list without asking. Where several values must be filtered, a build test used separate single-value filters that AND together (a row appears only if it matches all of them) successfully as the workaround. Ask.
- **Whether a select-all control is a `checkbox-item` in the group, or something outside it**, and how it relates to the group's `item-gap`.
- **Limits on selection.** Whether a user may be limited to _n_ out of many.
- **How deep parent-child checkboxes may nest.** The indeterminate state implies a hierarchy, but no rule says how deep it may go, or how a parent's state is worked out beyond one level.

## Pre-flight checklist

- [ ] The options do not rule each other out, and no choice of one is built as checkboxes.
- [ ] The group holds at least two items, within 7 ± 2, and fewer where the options are hard to tell apart.
- [ ] Items are stacked vertically. There is no horizontal group, and `side-by-side` is used only for label placement.
- [ ] `layouts` matches every other field in the same form — one placement per form at any given breakpoint, with no mixing between fields or sections.
- [ ] `checkbox`, `checkbox-item`, and `checkbox-group` are used together, not bare checkboxes in a form.
- [ ] The group has a real label, every item has a real label, and neither does the other's job.
- [ ] The group label is announced when focus enters the group.
- [ ] The checked and indeterminate states are available in code, never shown only by a fill or a mark.
- [ ] Selection rules are in assistive text passed through the component, and the required state is available in code.
- [ ] Select all appears only where the group is long, and clicking an indeterminate header checkbox selects all.
- [ ] Row checkboxes in a table name their row, and the header checkbox names what it selects.
- [ ] Space toggles the box, every checkbox is its own tab stop, arrow keys do not move focus between items, and key handling comes from the library.
- [ ] Clicking the item label toggles the box.
- [ ] Focus is never moved for the user, including when a checkbox reveals fields below.
- [ ] Disabled is used only for options that are unavailable for now. Values that can never be edited use the read-only field.
- [ ] Only variants, sizes, and states from the inventory above are used, and every property the component owns comes from the component.
- [ ] The group saves with the form, in the same save mode as everything else in the system.
- [ ] Open questions were asked about, not decided: the group error state, the multi-select dropdown, where a select-all control sits, limits on selection, and nesting depth.
