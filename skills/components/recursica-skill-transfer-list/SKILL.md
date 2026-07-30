---
name: recursica-skill-transfer-list
description: How to use the Recursica transfer list correctly — the two-column control for moving items between an excluded and an included list, when a large set with a meaningful unselected half earns it and when a checkbox group or a dropdown is right instead, which layouts and states exist, the header and filter, and the screen-reader and keyboard requirements that make the transfer work with no drag. Use whenever adding, reviewing, or refactoring a transfer list, a dual listbox, or an assign-items-to-a-group control. Trigger on "transfer list", "dual listbox", "move items", "assign to group", "pick columns", "available and selected", "move all", "screen reader", or "tab order". Do NOT use for small option sets — that is recursica-skill-checkbox. Do NOT use for choosing one value — recursica-skill-dropdown. Do NOT use for form layout or save mode — recursica-skill-forms.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Transfer list

A transfer list is two lists side by side with controls that move items between them. It is also called a dual listbox.

## Use it when

- **The set is large** — well past the 7 ± 2 ceiling that a checkbox group tops out at. See `recursica-skill-working-memory`.
- **The unselected half matters as much as the selected half.** Assigning people to a group, picking the columns of a report, choosing which options a configuration includes: the user needs to see what was left out, not just what was taken.
- **Included and excluded are the real states.** Two lists make membership immediately visible in a way a scatter of checkmarks does not.
- **The user works in bulk** — selecting several items, then moving them in one action.

## Do not use it when

| Instead of a transfer list                            | Use                                                                                        |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| There are only a handful of items                     | A checkbox group — see `recursica-skill-checkbox` and `recursica-skill-selection-controls` |
| Exactly one value is chosen                           | `recursica-skill-dropdown`, or a radio group                                               |
| Zero-to-many, but the unselected set is uninteresting | A multi-select dropdown — see `recursica-skill-selection-controls`                         |
| The container cannot fit two columns                  | A different control entirely. The lists have a fixed `width`                               |
| Items need reordering rather than including           | Not this component — no ordering axis exists                                               |
| The items are rows of stored data with actions        | A table — see `recursica-skill-tables`                                                     |
| The value is not editable by this user                | `recursica-skill-read-only-field`                                                          |

**A transfer list is the answer to a structural problem, not a decoration on a small one.** `recursica-skill-selection-controls` says that needing select-all across twenty checkboxes means the control is wrong — this is the control that replaces it. The inverse also holds: reaching for a transfer list where nine checkboxes would do is the same mistake in the other direction.

## What exists

Taken from `recursica_ui-kit.json` → `ui-kit.components.transfer-list`. **Do not pass a variant, size, or state that is not listed here.**

| Axis      | Options                   |
| --------- | ------------------------- |
| `layouts` | `stacked`, `side-by-side` |
| `states`  | `error`, `disabled`       |

**`layouts` is the label placement axis, not the arrangement of the two lists.** `side-by-side` — label beside the control — is the house default; `stacked` is the fallback when the container is too narrow to fit both. The trigger is container width, not viewport. The two lists themselves are always two columns.

**This field's `layouts` value is not an independent choice.** `recursica-skill-forms` requires **one label placement per form — side-by-side or stacked, never both at the same breakpoint.** The container-width test is applied once, to the form, and its answer governs every field in it, including short fields that would have fit. Match every other field in the same form. A whole form may switch placement across breakpoints; a section never gets its own. See `recursica-skill-forms`.

**The component owns a header, a filter, and two item lists** — `header-style`, `title-filter-gap`, `filter-items-gap`, and the `gap` between the lists. Do not compose a search field or a heading of your own above it.

**Height and width are fixed** — `height` and `width` are properties of the component, not choices. Both lists are the same size regardless of how many items are in them.

**There is no size axis, no focus state, and no loading or empty state.** There is no move-all axis — and none is wanted; see the rule below. There are no per-item tokens; see the uncovered list.

## Rules for using it

**Both lists need a name that says which side is which.** "Available" and "Selected", "Excluded" and "Included" — whatever the domain calls them. A pair of unnamed columns is a puzzle.

**Give the filter a purpose.** With a set large enough to justify this control, scanning is not viable — the filter is not optional garnish. It filters within a list; say which list it belongs to.

**Selection and membership are two different things.** Ticking an item marks it for moving; moving it changes which list it is in. Do not conflate the two, and do not move an item the instant it is ticked — bulk movement is the reason this control exists.

**Do not build move-all.** `recursica-skill-selection-controls` treats a select-all requirement as a signal to reconsider the control, and the kit defines no tokens for a bulk-move affordance. The filter is the real mechanism for working a large set, and it stays. **If the set is large enough that move-all feels necessary, that is the structural signal** — raise it with the human rather than adding the affordance, per `recursica-skill-system-conventions`.

**Order both lists the same way**, and keep that order stable across a move. An item that reappears somewhere unexpected after being moved back looks lost.

**It is a form control, so it lives in the form's single column** and never inside a card. Owned by `recursica-skill-forms`.

**Pass a real label and put the selection rule in assistive text** — minimums, maximums, what the two lists mean. "At least two must be included" belongs under the control, not in a validation message after the fact. See `recursica-skill-label` and `recursica-skill-assistive-element`.

**Pair the error state with a non-color indicator.** Required by `recursica-skill-system-conventions`.

**If the list is so long that the fixed height scrolls badly, the structure is the problem.** An inner scroll region is a coping mechanism; see `recursica-skill-system-conventions` and the uncovered list.

**Never disable a transfer list as a way to display a membership.** If the user cannot change it here, render the included set as read-only content.

## Accessibility

Two lists and a set of arrow buttons is the pattern most often shipped as mouse-only. Everything below is yours.

### Screen readers

- **Each list has its own accessible name.** Without one, a user hears a list of items with no idea which side they are on, and the whole control collapses into noise.
- **Selection state must be programmatic, not color.** An item highlighted with a background tint and nothing else is not selected as far as assistive technology is concerned. Required by `recursica-skill-system-conventions`.
- **Each move control's name says what moves where** — "Move selected to included", "Remove selected from included". A name of "Right arrow" or ">" is useless, and a pair of unlabeled arrows is indistinguishable.
- **After a move, the result must be announced**: what moved, and how many items are now in each list. The user cannot see two columns change at once.
- **The filter must announce its result count** when it changes the list — "3 of 120 shown". A silent filter reads as a list that mysteriously emptied.
- **Each list's item count should be available**, not only inferable by walking every item.
- **Pass label, help, and error text through the component**, never as loose text beside it. Only the component can associate them.
- **Do not announce the same event twice.** If the move result is announced, do not also re-announce every item as focus lands on it.

### Keyboard and non-mouse navigation

- **The transfer must be operable entirely from the keyboard, with no drag.** Selecting items, moving them, and moving them back all have to work with keys alone. If drag-and-drop is added, it is an addition and never the only path.
- **After a move, place focus deliberately** — on the moved item in its new list, or on the move control that is still relevant. Never leave focus on a control that has just become inert, and never dump it back to the top of the page.
- **Move controls are real buttons**, activated by Enter and Space, and they are tab stops in visual order between the two lists.
- **A move control with nothing to move is disabled, and the reason is in text** — an empty selection is not self-explanatory, and a disabled control is skipped by tab.
- **Tab order follows visual order**: label, filter, first list, move controls, second list.
- **Do not move focus for the user** other than the deliberate placement after a move. Typing in the filter must not throw focus into the list.
- **Nothing needed may be hover-only** — not the move controls, not a per-item remove affordance, not the counts.
- **Never suppress the focus ring**, and never let a selected item's highlight double as the focus indicator. Selection and focus are different states and need different treatments.

## Not your decision

Do not implement, override, or tune any of these — the component owns them:

- `height`, `width`, `border-size`, `border-radius`.
- `horizontal-padding`, `vertical-padding`, and every gap: `gap`, `title-filter-gap`, `filter-items-gap`.
- `header-style` and all `colors`.
- Field colors and sizes from `globals.form.field`, label-field gaps and `vertical-item-gap` from `globals.form.properties`, and the disabled treatment from `globals.states.disabled`.

## Load these too

- [`recursica-skill-selection-controls`](../../design-rules/recursica-skill-selection-controls/SKILL.md) — the control-choice ladder, the option ceiling, select-all as a signal that the structure is wrong, disabled versus read-only, and the commit model.
- [`recursica-skill-working-memory`](../../psychology/recursica-skill-working-memory/SKILL.md) — the 7 ± 2 basis, and why a recognition list may be long while a comparison set may not.
- [`recursica-skill-forms`](../../design-rules/recursica-skill-forms/SKILL.md) — single-column layout, one label placement per form and the container-width trigger for it, validation, save mode, and the no-form-control-in-a-card rule.
- [`recursica-skill-label`](../recursica-skill-label/SKILL.md) — the control's name and the group-level label.
- [`recursica-skill-assistive-element`](../recursica-skill-assistive-element/SKILL.md) — the selection rules and the error message.
- [`recursica-skill-system-conventions`](../../design-rules/recursica-skill-system-conventions/SKILL.md) — never carry meaning in a single channel; fix the structure rather than adding a mechanism to cope with it.

## Uncovered — ask, do not invent

- **Where this control sits in the selection-controls ladder.** That skill sends zero-to-many sets above the ceiling to a multi-select dropdown and never mentions a transfer list. The threshold between the two is unstated.
- **Per-item checkboxes.** A checkbox on every item is documented outside the token inventory; the kit defines no item or checkbox properties on this component. Whether items are checkbox rows or a selectable listbox is unresolved — do not rely on this without asking.
- **Overflow.** `height` is fixed, so a long list must scroll inside the control — which `recursica-skill-system-conventions` treats as a defeat. No overflow behavior is stated.
- **Narrow containers.** `layouts` moves the label only; the lists have a fixed `width`. The old house note said to avoid this control on small screens, but no responsive behavior exists.
- **Empty states** for either list, including the initial state where everything sits on one side.
- **Ordering.** Whether items are alphabetized, keep source order, or can be reordered by the user.
- **Whether an individual item can be disabled** — locked into one list while the rest move freely.

## Pre-flight checklist

- [ ] The set is genuinely large, and the excluded half is worth showing; a checkbox group or dropdown was ruled out on those grounds.
- [ ] Both lists have visible names that say which side is which, and each has an accessible name.
- [ ] A filter is present, and it announces its result count.
- [ ] Selecting an item does not move it; movement happens through the move controls.
- [ ] Both lists use the same stable order, preserved across a move.
- [ ] Move control names say what moves where, and they are real buttons activated by Enter and Space.
- [ ] The whole transfer works from the keyboard with no drag; any drag support is an addition.
- [ ] After a move, focus is placed deliberately and the result is announced — what moved, and the new count in each list.
- [ ] Selection state is exposed programmatically, not by highlight color alone.
- [ ] No move-all control was built; a set large enough to want one was raised as a structural signal instead.
- [ ] A real label is passed with selection rules in assistive text, and its `layouts` placement matches every other field in the same form — one placement per form, per `recursica-skill-forms`.
- [ ] The error state carries a non-color indicator; label, help, and error text pass through the component.
- [ ] Tab order runs label, filter, first list, move controls, second list.
- [ ] Nothing needed is hover-only; the focus ring is intact and distinct from the selected style.
- [ ] The control sits in the form's single column and not inside a card.
- [ ] No variant, size, or state outside the inventory above was passed; no header, filter, or wrapper was composed by hand.
- [ ] No component-owned dimension, padding, or gap was overridden.
- [ ] Nothing in the uncovered list — item checkboxes, overflow, ordering — was invented.
