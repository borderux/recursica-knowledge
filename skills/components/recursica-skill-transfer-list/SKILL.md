---
name: recursica-skill-transfer-list
description: Rules for the Recursica transfer list — two lists with controls to move items between them, when a set is large enough to need one, the filter, and moving items without dragging. Use for assigning items to a group or picking columns. Not for small sets — see recursica-skill-checkbox; not for one value — see recursica-skill-dropdown.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Transfer list

A transfer list is two lists side by side, with controls that move items between them. It is also called a dual listbox, because each side is a listbox (a list the user picks one or more options from).

> **Not implemented yet.** Both adapters ship `TransferList` as an empty placeholder. It shows
> placeholder content and applies none of the 31 `transfer-list` variables the UI kit (the token file, `recursica_ui-kit.json`, that says which variants and states each component has) exports. The text below
> describes the intended component and matches the UI kit, but building with it today renders
> a placeholder, with no error. Raise the missing implementation with a person instead of working around it.

## When to use a transfer list

- **The set is large** — well past the 7 ± 2 limit where a checkbox group stops working. See `recursica-skill-working-memory`.
- **The items not chosen matter as much as the items chosen.** Assigning people to a group, picking the columns of a report, choosing which options a setup includes: the user needs to see what was left out, not only what was taken.
- **Included and excluded are the real states.** Two lists show at a glance which items belong. Checkmarks spread through one long group do not.
- **The user works in bulk** — selecting several items, then moving them in one action.

## When not to use a transfer list

| Instead of a transfer list                            | Use                                                                                        |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| There are only a handful of items                     | A checkbox group — see `recursica-skill-checkbox` and `recursica-skill-selection-controls` |
| Exactly one value is chosen                           | `recursica-skill-dropdown`, or a radio group                                               |
| Zero-to-many, but the unselected set is uninteresting | A multi-select dropdown — see `recursica-skill-selection-controls`                         |
| The container cannot fit two columns                  | A different control entirely. The lists have a fixed `width`                               |
| Items need reordering rather than including           | Not this component — no ordering variant property exists                                   |
| The items are rows of stored data with actions        | A table — see `recursica-skill-tables`                                                     |
| The value is not editable by this user                | `recursica-skill-read-only-field`                                                          |

**A transfer list fixes a structural problem: a set too large for a checkbox group. It is not for a small set.** `recursica-skill-selection-controls` says that needing select-all across twenty checkboxes means the control is wrong — this is the control that replaces it. The reverse is also true: using a transfer list where nine checkboxes would do is the same mistake in the other direction.

## Variants

Taken from `recursica_ui-kit.json` → `ui-kit.components.transfer-list`. **Pass only a variant, size, or state listed here.**

**Look up each variant's name in code before using the variant.** The names in this skill are the names in Figma and the UI kit. The code can use a different name for the same variant. A wrong name in code has no effect and shows no error. The Recursica MCP server's `recursica_get_component_doc` tool gives the name to use in code.

| Variant property | Options                   |
| ---------------- | ------------------------- |
| `layouts`        | `stacked`, `side-by-side` |
| `states`         | `error`, `disabled`       |

**`layouts` is the label-placement variant property.** `side-by-side` — the label beside the control — is the house default. `stacked` is the fallback when the container is too narrow to fit both. What decides this is the container's width, not the viewport's. See `recursica-skill-forms`. **It does not arrange the two lists** — they are always two columns.

**Set label placement explicitly on every field.** An adapter's default may be `stacked`, which puts the label above the input at any container width and breaks the house rule. Set `layouts` to `side-by-side` to put the label beside the input, under the names the code uses for both.

**Label placement is one decision per form, not per field.** This field's `layouts` value is not a separate choice — it matches every other field in the same form. The container-width test is applied once, to the whole form, and its answer governs every field in it, including short ones that would have fitted side by side. A whole form may switch placement between breakpoints, but it never mixes the two at one breakpoint, and a section never gets its own placement. Owned by `recursica-skill-forms`.

**The component owns a header, a filter, and two item lists** — `header-style`, `title-filter-gap`, `filter-items-gap`, and the `gap` between the lists. Do not build a separate search field or heading above it.

**Height and width are fixed** — `height` and `width` are properties of the component, not choices. Both lists are the same size, no matter how many items are in them.

**There is no size variant property, no focus state, and no loading or empty state.** There is no move-all variant property — and none is wanted; see the rule below. There are no tokens for single items; see the open questions.

## Rules

**Both lists need a name that says which side is which.** "Available" and "Selected", "Excluded" and "Included" — whatever the product calls them. Without names, the user cannot tell which column holds the chosen items.

**The filter is required, and its label names the list it filters.** In a set large enough for this control, the user cannot read through every item.

**Selecting an item and moving it are two different things.** Ticking an item marks it to be moved. Moving it changes which list it is in. Keep the two actions separate, and do not move an item the moment it is ticked. Moving many items at once is the reason this control exists.

**Do not build move-all.** `recursica-skill-selection-controls` treats a need for select-all as a sign to rethink the control, and the UI kit defines no tokens for a move-all control. The filter is the tool for working with a large set, and it stays. A set so large that move-all feels necessary is a sign that the structure is wrong. Raise it with a person instead of adding the control, as `recursica-skill-system-conventions` says.

**Sort both lists the same way**, and keep that order the same after a move. An item that shows up somewhere unexpected after being moved back looks lost.

**It is a form control, so it goes in the form's single column**, and never inside a card. Owned by `recursica-skill-forms`.

**Pass a real label, and put the selection rule in assistive text** (help text shown with the control) — minimums, maximums, and what the two lists mean. "At least two must be included" belongs under the control, not in a validation message after the fact. See `recursica-skill-label` and `recursica-skill-assistive-element`.

**Pair the error state with a signal that is not color.** Required by `recursica-skill-system-conventions`.

**If a list needs long scrolling inside its fixed height, the structure is the problem.** A scrolling area inside the control works around the problem and does not fix it. See `recursica-skill-system-conventions` and the open questions.

**Never disable a transfer list to show what belongs.** If the user cannot change it here, show the included set as read-only content.

## Accessibility

This component also follows the accessibility baseline in `recursica-skill-system-conventions`, including the focus ring. Only the rules specific to this component are listed here.

Two lists with arrow buttons are often shipped so that they work only with a mouse. The application must provide everything below.

### Screen readers

- **Each list has its own accessible name** (the name a screen reader reads out for a control). Without one, a user hears a list of items, cannot tell which list it is, and cannot use the control.
- **The selected state must be set in code, not shown by color.** To assistive technology, an item with only a tinted background is not selected. Required by `recursica-skill-system-conventions`.
- **Each move control's name says what moves where** — "Move selected to included", "Remove selected from included". A name like "Right arrow" or ">" does not say what moves where, and two arrows with no labels cannot be told apart.
- **After a move, the result must be announced**: what moved, and how many items are now in each list. The user cannot see two columns change at once.
- **The filter must announce how many results it shows** when it changes the list — "3 of 120 shown". Without the count, a screen reader user hears a list that seems to empty for no reason.
- **Each list's item count should be available**, so the user does not have to count by going through every item.
- **Do not announce the same event twice.** If the result of a move is announced, do not also announce every item again as focus lands on it.

### Keyboard and non-mouse navigation

- **The whole transfer must work from the keyboard, with no dragging.** Selecting items, moving them, and moving them back all have to work with keys alone. If drag-and-drop is added, it is extra, and never the only way.
- **After a move, put focus somewhere on purpose** — on the moved item in its new list, or on the move control that still applies. Never leave focus on a control that has just become disabled, and never drop it back to the top of the page.
- **Move controls are real buttons**, pressed with Enter and Space, and they are tab stops (places the Tab key lands), in visual order, between the two lists.
- **A move control with nothing to move is disabled.**
- **The tab order follows the visual order**: label, filter, first list, move controls, second list.
- **Do not move focus for the user**, other than placing it on purpose after a move. Typing in the filter must not move focus into the list.
- **Nothing the user needs may appear only on hover** — not the move controls, not a remove control on each item, and not the counts.

## Styling set by tokens

Do not set or override any of these. The component sets them:

- `height`, `width`, `border-size`, `border-radius`.
- `horizontal-padding`, `vertical-padding`, and every gap: `gap`, `title-filter-gap`, `filter-items-gap`.
- `header-style` and all `colors`.
- Field colors and sizes from `globals.form.field`, label-field gaps and `vertical-item-gap` from `globals.form.properties`, and the disabled treatment from `globals.states.disabled`.

## Related skills

- `recursica-skill-selection-controls` — the control-choice ladder, the option ceiling, select-all as a signal that the structure is wrong, disabled versus read-only, and the commit model.
- `recursica-skill-working-memory` — the 7 ± 2 basis, and why a recognition list may be long while a comparison set may not.
- `recursica-skill-forms` — single-column layout, one label placement per form and the container-width trigger for it, validation, save mode, and the no-form-control-in-a-card rule.
- `recursica-skill-label` — the control's name and the group-level label.
- `recursica-skill-assistive-element` — the selection rules and the error message.
- `recursica-skill-system-conventions` — never carry meaning in a single channel; fix the structure rather than adding a mechanism to cope with it.

## Open questions

- **Where this control fits among the selection controls.** `recursica-skill-selection-controls` sends zero-to-many sets above the limit to a multi-select dropdown, and never mentions a transfer list. The set size at which a transfer list replaces the multi-select dropdown is not stated.
- **Checkboxes on each item.** A checkbox on every item is shown only on the design-system website, but the UI kit defines no item or checkbox properties on this component. Whether items are checkbox rows or a selectable listbox is not settled — ask before relying on it.
- **Overflow.** `height` is fixed, so a long list must scroll inside the control — which `recursica-skill-system-conventions` treats as a failure. No overflow behavior is stated.
- **Narrow containers.** `layouts` moves the label only, and the lists have a fixed `width`. The old house note said to avoid this control on small screens, but no responsive behavior exists.
- **Empty states** for either list, including the starting state where every item is on one side.
- **Ordering.** Whether items are sorted alphabetically, keep their original order, or can be reordered by the user.
- **Whether a single item can be disabled** — locked into one list while the rest move freely.

## Pre-flight checklist

- [ ] The set is large, and the user needs to see the excluded items. A checkbox group or dropdown was ruled out for those reasons.
- [ ] Both lists have visible names that say which side is which, and each has an accessible name.
- [ ] A filter is present, and it announces how many results it shows.
- [ ] Selecting an item does not move it. Items move through the move controls.
- [ ] Both lists use the same order, and it stays the same after a move.
- [ ] Move control names say what moves where, and they are real buttons pressed with Enter and Space.
- [ ] The whole transfer works from the keyboard with no dragging. Any drag support is extra.
- [ ] After a move, focus is placed on purpose, and the result is announced — what moved, and the new count in each list.
- [ ] The selected state is set in code, not shown by highlight color alone.
- [ ] No move-all control was built. A set large enough to want one was raised with a person as a sign that the structure is wrong.
- [ ] A real label is passed with the selection rules in assistive text, and its `layouts` placement matches every other field in the same form — one placement per form, per `recursica-skill-forms`.
- [ ] The error state has a signal that is not color. Label, help, and error text are passed through the component.
- [ ] The tab order runs: label, filter, first list, move controls, second list.
- [ ] The control is in the form's single column, and not inside a card.
- [ ] Every variant, size, and state comes from the inventory above. No header, filter, or wrapper is built by hand.
- [ ] Sizes, padding, and gaps come from the component.
- [ ] Open questions were asked about, not decided: item checkboxes, overflow, ordering.
