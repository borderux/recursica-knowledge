---
name: recursica-skill-chip
description: How to use the Recursica chip correctly — when chips are the right control and when a badge, checkbox group, segmented control, or dropdown is, the selected and unselected states, selectable versus removable chips, why a status is never a chip, how many chips a group may hold, when a chip may be dismissed, and the screen-reader and keyboard requirements for a chip group. Use whenever adding, reviewing, or refactoring filter chips, tag chips, a horizontal multi-select, or a set of removable values on an object. Trigger on "chip", "chips", "tag", "tags", "filter chips", "horizontal multi-select", "removable", "dismissible", "selectable chip", "screen reader", "tab order", or a request to show or select several short values. Do NOT use for a single read-only value the system sets — that is recursica-skill-badge. Do NOT use for an exclusive choice — that is recursica-skill-segmented-control. Do NOT use for chip-vs-badge policy or group counts — that is recursica-skill-badges-chips.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Chip

A chip is one of several short values the user can see, select, or remove.

## Use it when

- **The values are plural.** Several tags, several categories, several applied filters on one object.
- **The layout calls for a horizontal multi-select.** Selectable chips are how that is done here — a checkbox group is never rotated into a row.
- **The user filters or refines** by turning options on and off.
- **The user added the values** and may take them back off.

## Do not use it when

| Instead of a chip                            | Use                                                                        |
| -------------------------------------------- | -------------------------------------------------------------------------- |
| One read-only value the system sets          | `recursica-skill-badge`                                                    |
| An exclusive single choice                   | `recursica-skill-segmented-control` horizontally, radio buttons vertically |
| A status of any kind                         | `recursica-skill-badge` — never a chip, and never an actionable one        |
| Space is tight, as in a table row            | `recursica-skill-badge`. A chip carries padding, an icon, a dismiss        |
| The option count exceeds what a row can hold | A dropdown or autocomplete — see `recursica-skill-selection-controls`      |
| Primary navigation, or labelling a nav item  | Links for navigation; a badge for the label                                |

**A status rendered as a chip is the misuse to watch for.** A chip looks operable; a status is not the user's to change.

## What exists

Taken from `recursica_ui-kit.json` → `ui-kit.components.chip`. **Do not pass a variant or state that is not listed here.**

| Axis               | Options                  |
| ------------------ | ------------------------ |
| `selection-states` | `unselected`, `selected` |
| `states`           | `error`                  |

**`states` is nested under `selection-states`** — the kit defines `error` separately for an unselected chip and for a selected one, so error and selection are independent axes that combine.

**There is no size axis, no style axis, and no disabled state.**

**Two configurations documented outside the token inventory:** a selectable chip, and a removable chip with a close icon. The kit defines a `close-icon-size` and `close-icon-color`, which is what a removable chip uses; it also defines a `leading-icon-color` for an optional icon before the label.

**A chip has a `min-width` and a `max-width`.** Long values are constrained by the component, which is another reason a chip is not for phrases.

**The error state exists in the kit and in both adapters, and the house rule forbids using it.** Both facts are true and neither cancels the other. The kit defines seven error colors for each selection state — background, border, text, icon, leading icon, selected icon, and close icon — and both adapters expose an `error` prop that applies them. "Error-selected" is not a fourth state; it is `error` combined with `selected`, which is why the axis is nested.

**Do not pass it.** `recursica-skill-badges-chips` states it plainly: do not use a chip to indicate an error, ever. A required chip group with nothing selected is a form validation error that the **group** reports below itself, and no chip changes appearance to report it. The axis is listed above so that you recognise it rather than assume a stray `error` prop is a typo — not so that you reach for it.

## Rules for using it

**Chips come in groups.** A single chip on its own is either a badge or a mistake.

**Keep a group within 7 ± 2 options**, and fewer where the choice is complex. See `recursica-skill-working-memory`.

**A chip may be dismissible only if the user put it there.** System-set values are not the user's to remove.

**Never render an error as a chip**, and never make a chip the thing that reports one. `recursica-skill-badges-chips` forbids a chip from carrying an error condition **as its content** — a chip is never how you tell the user that something is wrong.

**A required chip group with nothing selected is a form validation error, and the group reports it below itself.** `recursica-skill-forms` owns that, and it works exactly as it does for any other control: the message sits in the group's assistive element beneath the group, restates the rule the user has to satisfy, and carries a non-color cue. See `recursica-skill-assistive-element`. The two rules do not conflict — the error belongs to the group, not to any chip in it, and no chip changes appearance to report it.

**Selectable chips inherit the checkbox group's rules** — the option ceiling, pre-selection caution, and the form's commit model. If the form is batch-save, chip selections commit on submit like everything else; see `recursica-skill-forms`.

**The label is a noun, one or two words.** No verbs, no sentences, no counts inside the label.

**Never mix selectable and removable chips in one group.** One group, one behavior — the user cannot see which chips do what.

**Applied filters are shown as chips the user can remove**, and removing one re-runs the filter. Do not also leave the filter control set — the chip and the control are one state.

## Accessibility

A chip group is a form control that happens to be laid out horizontally, and it must behave like one. The most common failure is a set of clickable `div`s with a colored selected state — invisible and unusable to anyone not using a mouse.

### Screen readers

- **A selectable chip group is a group of checkboxes** and must be announced that way: a group with an accessible name, and each chip announcing its label and whether it is selected.
- **The group needs a label.** "Categories" — otherwise the user hears a run of options with no idea what they are choosing.
- **Selection must be conveyed programmatically, not by color.** A selected chip that differs only in fill is indistinguishable to a screen reader user, and `recursica-skill-system-conventions` forbids it.
- **A removable chip's close control needs a name that includes the value** — "Remove Marketing", not "Remove", and certainly not nothing. Down a row of chips, five identical "Remove" controls are unusable.
- **Announce the removal.** After a chip is removed the user needs to know it is gone and what remains; silence reads as a failed click.
- **A leading icon is decorative and must be silent.** The label carries the meaning.
- **Do not announce the chip's count of matching results as part of the chip** unless it is visible there too.

### Keyboard and non-mouse navigation

- **Every chip must be reachable and operable from the keyboard.** Space toggles a selectable chip; Enter or Space activates a removable chip's close control.
- **Where the library manages the group as a single tab stop with arrow-key movement, do not fight it** — do not add tabindex to individual chips or bolt on your own key handling.
- **A removable chip's close control is its own stop** within the chip, reachable without a pointer.
- **After removing a chip, move focus deliberately** — to the next chip, or to the group if none remain. Focus left on a removed element is lost focus, and the user is silently returned to the top of the document.
- **Never require hover to reveal the close control.** A dismiss that appears on hover cannot be reached by keyboard or touch.
- **Never suppress the focus ring**, and never let the selected style stand in for the focus style — a chip can be focused and unselected at the same time, and the user must be able to tell.

## Not your decision

Do not implement, override, or tune any of these — the component owns them:

- `horizontal-padding`, `vertical-padding`, `border-size`, `border-radius`, `elevation`.
- `min-width`, `max-width`, `text`, `text-size`.
- `icon-size`, `icon-text-gap`, `leading-icon-color`.
- `close-icon-size`, `close-icon-color`.
- All colors per selection state, including hover and focus.

## Load these too

- [`recursica-skill-badges-chips`](../../design-rules/recursica-skill-badges-chips/SKILL.md) — chip vs. badge, tags, dismissible and toggled chips, group counts, and placement.
- [`recursica-skill-selection-controls`](../../design-rules/recursica-skill-selection-controls/SKILL.md) — when selectable chips are the right control, and the rules they inherit from checkbox groups.
- [`recursica-skill-forms`](../../design-rules/recursica-skill-forms/SKILL.md) — commit model, and error presentation for the group.
- [`recursica-skill-assistive-element`](../recursica-skill-assistive-element/SKILL.md) — the element that carries the group's validation error below it, and the wording it takes.
- [`recursica-skill-working-memory`](../../psychology/recursica-skill-working-memory/SKILL.md) — the basis for option-count limits.

## Uncovered — ask, do not invent

- **Whether a chip may be disabled**, and what that would mean for a filter.
- **Overflow.** What a group does when it has more chips than the row can hold; wrapping is not stated as allowed.
- **Whether a chip group supports select-all or clear-all**, and where that control sits.
- **A chip that opens a menu** — documented in other systems, not here.

## Pre-flight checklist

- [ ] The values are plural; no single chip stands alone.
- [ ] No status, and no error condition, is rendered as a chip.
- [ ] A required group's validation error is reported by the assistive element below the group, never by a chip.
- [ ] The group is within 7 ± 2, and holds one behavior — selectable or removable, not both.
- [ ] Only user-added values are dismissible.
- [ ] Labels are one- or two-word nouns.
- [ ] The group has an accessible name; each chip announces its label and selected state.
- [ ] Selection does not rely on color alone.
- [ ] Every close control's name includes the value it removes, and removal is announced.
- [ ] Chips and close controls are keyboard-operable; nothing depends on hover.
- [ ] Focus is moved deliberately after a removal.
- [ ] Focus ring intact and distinguishable from the selected style.
- [ ] No state outside `selected` and `unselected` was passed; no size or style axis was assumed.
- [ ] No component-owned styling was overridden.
- [ ] Nothing in the uncovered list was invented.
