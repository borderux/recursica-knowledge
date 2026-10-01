---
name: recursica-skill-transfer-list
description: How to use the Recursica transfer list — two lists with controls to move items between them, when a large set earns it, the filter, and moving items without dragging. Use for assigning items to a group or picking columns. Not for small sets — see recursica-skill-checkbox; not for one value — see recursica-skill-dropdown.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Transfer list

A transfer list is two lists side by side, with controls that move items between them. It is also called a dual listbox, because each side is a listbox (a list the user picks one or more options from).

> **Not implemented yet.** Both adapters ship `TransferList` as an empty placeholder. It shows
> placeholder content and applies none of the 31 `transfer-list` variables the UI kit (the token file, `recursica_ui-kit.json`, that says which variants and states each component has) exports. Everything below
> is how the component is meant to work, and is correct about the UI kit — but building with it today gives you
> a placeholder, with no error. Raise it instead of working around it.

## Use it when

- **The set is large** — well past the 7 ± 2 limit where a checkbox group stops working. See `recursica-skill-working-memory`.
- **The items not chosen matter as much as the items chosen.** Assigning people to a group, picking the columns of a report, choosing which options a setup includes: the user needs to see what was left out, not just what was taken.
- **Included and excluded are the real states.** Two lists make it clear at a glance what belongs, in a way a scatter of checkmarks does not.
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

**A transfer list solves a structural problem. It is not decoration for a small one.** `recursica-skill-selection-controls` says that needing select-all across twenty checkboxes means the control is wrong — this is the control that replaces it. The reverse is also true: using a transfer list where nine checkboxes would do is the same mistake in the other direction.

## What exists

Taken from `recursica_ui-kit.json` → `ui-kit.components.transfer-list`. **Do not pass a variant, size, or state that is not listed here.**

**The third column is the React prop that sets each axis.** An axis (a variant property, as Figma calls it — one way a component varies, such as its size) is named in the UI kit. Its name is not a prop, and if you pass it as one, React quietly ignores it. A blank cell means no single prop sets that axis — it is set by CSS state or by separate props, and the rules below say which.

| Axis      | Options                   | React prop   |
| --------- | ------------------------- | ------------ |
| `layouts` | `stacked`, `side-by-side` | `formLayout` |
| `states`  | `error`, `disabled`       |              |

**`layouts` is the label-placement axis, set by the `formLayout` prop.** `side-by-side` — the label beside the control — is the house default. `stacked` is the fallback when the container is too narrow to fit both. What decides this is the container's width, not the viewport's (the visible area of the browser window). See `recursica-skill-forms`. **It is not how the two lists are arranged** — the two lists themselves are always two columns.

**`formLayout` defaults to `stacked`, so the house rule is the one thing you must pass.** Leave it out, and you get the fallback in a container of any width — the rule turned upside down. `layouts` is the name of the token axis, not a prop: `layouts="side-by-side"` is quietly ignored by React and leaves the control stacked, with no error. Pass `formLayout="side-by-side"` explicitly.

**Label placement is one decision per form, not per field.** This field's `layouts` value is not a separate choice — it matches every other field in the same form. The container-width test is applied once, to the whole form, and its answer governs every field in it, including short ones that would have fitted side by side. A whole form may switch placement between breakpoints (the screen widths at which the layout changes), but it never mixes the two at one breakpoint, and a section never gets its own placement. Owned by `recursica-skill-forms`.

**The component owns a header, a filter, and two item lists** — `header-style`, `title-filter-gap`, `filter-items-gap`, and the `gap` between the lists. Do not build your own search field or heading above it.

**Height and width are fixed** — `height` and `width` are properties of the component, not choices. Both lists are the same size, no matter how many items are in them.

**There is no size axis, no focus state, and no loading or empty state.** There is no move-all axis — and none is wanted; see the rule below. There are no tokens for single items; see the uncovered list.

## Rules for using it

**Both lists need a name that says which side is which.** "Available" and "Selected", "Excluded" and "Included" — whatever the product calls them. Two columns with no names are a puzzle.

**Give the filter a clear job.** With a set large enough for this control, reading through every item is not realistic — the filter is not an optional extra. It filters within a list, so say which list it belongs to.

**Selecting an item and moving it are two different things.** Ticking an item marks it to be moved. Moving it changes which list it is in. Do not mix the two up, and do not move an item the moment it is ticked — moving many at once is the reason this control exists.

**Do not build move-all.** `recursica-skill-selection-controls` treats a need for select-all as a sign to rethink the control, and the UI kit defines no tokens for a move-all control. The filter is the real tool for working with a large set, and it stays. If the set is so large that move-all feels necessary, that is the structural warning sign — raise it with a person instead of adding the control, as `recursica-skill-system-conventions` says.

**Sort both lists the same way**, and keep that order the same after a move. An item that shows up somewhere unexpected after being moved back looks lost.

**It is a form control, so it goes in the form's single column**, and never inside a card. Owned by `recursica-skill-forms`.

**Pass a real label, and put the selection rule in assistive text** (help text shown with the control) — minimums, maximums, and what the two lists mean. "At least two must be included" belongs under the control, not in a validation message after the fact. See `recursica-skill-label` and `recursica-skill-assistive-element`.

**Pair the error state with a signal that is not color.** Required by `recursica-skill-system-conventions`.

**If the list is so long that it scrolls badly inside its fixed height, the structure is the problem.** A scrolling area inside the control is a way of coping, not a fix. See `recursica-skill-system-conventions` and the uncovered list.

**Never disable a transfer list as a way to show what belongs.** If the user cannot change it here, show the included set as read-only content.

## Accessibility

This component also follows the accessibility baseline in `recursica-skill-system-conventions`, including the focus ring (the outline that shows which element has keyboard focus). Only what is specific to it is listed here.

Two lists and a set of arrow buttons is the pattern most often shipped so that it works only with a mouse. Everything below is up to you.

### Screen readers

- **Each list has its own accessible name** (the name a screen reader reads out for a control). Without one, a user hears a list of items with no idea which side they are on, and the whole control turns into noise.
- **The selected state must be set in code, not shown by color.** To assistive technology (tools such as screen readers that help people with disabilities use a computer), an item with only a tinted background is not selected. Required by `recursica-skill-system-conventions`.
- **Each move control's name says what moves where** — "Move selected to included", "Remove selected from included". A name like "Right arrow" or ">" is useless, and two arrows with no labels cannot be told apart.
- **After a move, the result must be announced**: what moved, and how many items are now in each list. The user cannot see two columns change at once.
- **The filter must announce how many results it shows** when it changes the list — "3 of 120 shown". A filter that says nothing sounds like a list that emptied for no reason.
- **Each list's item count should be available**, so the user does not have to count by going through every item.
- **Do not announce the same event twice.** If the result of a move is announced, do not also announce every item again as focus lands on it.

### Keyboard and non-mouse navigation

- **The whole transfer must work from the keyboard, with no dragging.** Selecting items, moving them, and moving them back all have to work with keys alone. If drag-and-drop is added, it is extra, and never the only way.
- **After a move, put focus somewhere on purpose** — on the moved item in its new list, or on the move control that still applies. Never leave focus on a control that has just stopped working, and never drop it back to the top of the page.
- **Move controls are real buttons**, pressed with Enter and Space, and they are tab stops (places the Tab key lands), in visual order, between the two lists.
- **A move control with nothing to move is disabled, and the reason is in text.** An empty selection does not explain itself, and Tab skips a disabled control.
- **The tab order follows the visual order**: label, filter, first list, move controls, second list.
- **Do not move focus for the user**, other than placing it on purpose after a move. Typing in the filter must not throw focus into the list.
- **Nothing the user needs may appear only on hover** — not the move controls, not a remove control on each item, and not the counts.

## Decided elsewhere

Do not implement, override, or tune any of these — the component owns them:

- `height`, `width`, `border-size`, `border-radius`.
- `horizontal-padding`, `vertical-padding`, and every gap: `gap`, `title-filter-gap`, `filter-items-gap`.
- `header-style` and all `colors`.
- Field colors and sizes from `globals.form.field`, label-field gaps and `vertical-item-gap` from `globals.form.properties`, and the disabled treatment from `globals.states.disabled`.

## Load these too

- `recursica-skill-selection-controls` — the control-choice ladder, the option ceiling, select-all as a signal that the structure is wrong, disabled versus read-only, and the commit model.
- `recursica-skill-working-memory` — the 7 ± 2 basis, and why a recognition list may be long while a comparison set may not.
- `recursica-skill-forms` — single-column layout, one label placement per form and the container-width trigger for it, validation, save mode, and the no-form-control-in-a-card rule.
- `recursica-skill-label` — the control's name and the group-level label.
- `recursica-skill-assistive-element` — the selection rules and the error message.
- `recursica-skill-system-conventions` — never carry meaning in a single channel; fix the structure rather than adding a mechanism to cope with it.

## Uncovered — ask, do not invent

- **Where this control fits among the selection controls.** That skill sends zero-to-many sets above the limit to a multi-select dropdown, and never mentions a transfer list. The point where one gives way to the other is not stated.
- **Checkboxes on each item.** A checkbox on every item is shown only on the design-system website, but the UI kit defines no item or checkbox properties on this component. Whether items are checkbox rows or a selectable listbox is not settled — do not rely on this without asking.
- **Overflow.** `height` is fixed, so a long list must scroll inside the control — which `recursica-skill-system-conventions` treats as a failure. No overflow behavior is stated.
- **Narrow containers.** `layouts` moves the label only, and the lists have a fixed `width`. The old house note said to avoid this control on small screens, but no responsive behavior exists.
- **Empty states** for either list, including the starting state where every item is on one side.
- **Ordering.** Whether items are sorted alphabetically, keep their original order, or can be reordered by the user.
- **Whether a single item can be disabled** — locked into one list while the rest move freely.

## Pre-flight checklist

- [ ] The set really is large, and the excluded items are worth showing. A checkbox group or dropdown was ruled out for those reasons.
- [ ] Both lists have visible names that say which side is which, and each has an accessible name.
- [ ] A filter is present, and it announces how many results it shows.
- [ ] Selecting an item does not move it. Items move through the move controls.
- [ ] Both lists use the same order, and it stays the same after a move.
- [ ] Move control names say what moves where, and they are real buttons pressed with Enter and Space.
- [ ] The whole transfer works from the keyboard with no dragging. Any drag support is extra.
- [ ] After a move, focus is placed on purpose, and the result is announced — what moved, and the new count in each list.
- [ ] The selected state is set in code, not shown by highlight color alone.
- [ ] No move-all control was built. A set large enough to want one was raised as a structural warning sign instead.
- [ ] A real label is passed with the selection rules in assistive text, and its `layouts` placement matches every other field in the same form — one placement per form, per `recursica-skill-forms`.
- [ ] The error state has a signal that is not color. Label, help, and error text are passed through the component.
- [ ] The tab order runs: label, filter, first list, move controls, second list.
- [ ] The control is in the form's single column, and not inside a card.
- [ ] You passed no variant, size, or state outside the inventory above, and built no header, filter, or wrapper by hand.
- [ ] You overrode no size, padding, or gap that the component owns.
- [ ] You invented nothing from the uncovered list — item checkboxes, overflow, ordering.
