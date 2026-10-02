---
name: recursica-skill-chip
description: Rules for the Recursica chip — when chips are right, selected and unselected states, selectable versus removable chips, never a status, group size, and chip-group accessibility. Use for filter chips, tags, and a horizontal multi-select. Not for a read-only value — see recursica-skill-badge; not for one choice — see recursica-skill-segmented-control.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Chip

A chip is one of several short values the user can see, select, or remove.

## When to use a chip

- **The values are plural.** Several tags, several categories, several applied filters on one object.
- **The layout calls for a horizontal multi-select.** Use selectable chips for it. Never lay a checkbox group out in a horizontal row.
- **The user filters or narrows things down** by turning options on and off.
- **The user added the values**, and may take them off again.

## When not to use a chip

| Instead of a chip                          | Use                                                                        |
| ------------------------------------------ | -------------------------------------------------------------------------- |
| One read-only value the system sets        | `recursica-skill-badge`                                                    |
| A single choice that rules out the others  | `recursica-skill-segmented-control` horizontally, radio buttons vertically |
| A status of any kind                       | `recursica-skill-badge` — never a chip, and never one the user can act on  |
| Space is tight, as in a table row          | `recursica-skill-badge`. A chip carries padding, an icon, a dismiss        |
| There are more options than a row can hold | A dropdown or autocomplete — see `recursica-skill-selection-controls`      |
| Primary navigation, or labeling a nav item | Links for navigation; a badge for the label                                |

**A status shown as a chip is the misuse to watch for.** A chip looks like a control the user can click. A status is not the user's to change.

## Variants

Taken from the UI kit (the token file, `recursica_ui-kit.json`, that says which variants and states each component has) → `ui-kit.components.chip`. **Do not pass a variant or state that is not listed here.**

| Axis               | Options                  |
| ------------------ | ------------------------ |
| `selection-states` | `unselected`, `selected` |
| `states`           | `error`                  |

**`states` is nested under `selection-states`.** The UI kit defines `error` separately for an unselected chip and for a selected one, so error and selection are independent axes (the properties a component varies on, such as size and style; Figma calls them variant properties) that combine.

**There is no size axis, no style axis, and no disabled state.**

**Two setups are shown only on the design-system website:** a selectable chip, and a removable chip with a close icon. The UI kit defines a `close-icon-size` and a `close-icon-color`, which is what a removable chip uses. It also defines a `leading-icon-color` for an optional icon before the label.

**A chip has a `min-width` and a `max-width`.** The component limits long values, which is another reason a chip is not for phrases.

**The error state exists in the UI kit and in both adapters, and the house rule forbids using it.** Both facts are true, and neither cancels the other. The UI kit defines seven error colors for each selection state — background, border, text, icon, leading icon, selected icon, and close icon — and both adapters offer an `error` setting that applies them. "Error-selected" is not a fourth state; it is `error` combined with `selected`, which is why the axis is nested.

**Do not pass it.** `recursica-skill-badges-chips` says it plainly: do not use a chip to show an error, ever. A required chip group with nothing selected is a form validation error that the group reports below itself, and no chip changes how it looks to report it. An `error` setting found in code is this axis, not a typo. The axis is listed above for that reason only, not as an option to pass.

## Rules

**Chips come in groups.** A single chip on its own is either a badge or a mistake.

**Keep a group to 7 ± 2 options**, and fewer where the choice is complex. See `recursica-skill-working-memory`.

**A chip may be dismissed only if the user put it there.** Values the system set are not the user's to remove.

**Never show an error as a chip**, and never use a chip to report one. `recursica-skill-badges-chips` forbids a chip from carrying an error condition as its content. A chip never tells the user that something is wrong.

**A required chip group with nothing selected is a form validation error, and the group reports it below itself.** `recursica-skill-forms` owns that, and it works exactly as it does for any other control. The message sits in the group's assistive element beneath the group, restates the rule the user has to meet, and carries a signal that is not color. See `recursica-skill-assistive-element`. The two rules do not conflict — the error belongs to the group, not to any chip in it, and no chip changes how it looks to report it.

**Selectable chips follow the checkbox group's rules** — the limit on the number of options, care with pre-selection, and how the form saves. If the form saves everything together, chip selections are saved on submit like everything else; see `recursica-skill-forms`.

**The label is a noun, one or two words.** No verbs, no sentences, and no counts inside the label.

**Never mix selectable and removable chips in one group.** One group, one behavior — the user cannot see which chips do what.

**Applied filters are shown as chips the user can remove**, and removing one runs the filter again. Removing a chip also clears the matching filter control. The chip and the control are one state.

## Accessibility

This component also follows the accessibility baseline in `recursica-skill-system-conventions`, including the focus ring. Only what is specific to it is listed here.

A chip group is a form control that happens to be laid out horizontally, and it must behave like one. The most common failure is a set of clickable `div`s with a colored selected state — invisible and unusable to anyone not using a mouse.

### Screen readers

- **A selectable chip group is a group of checkboxes**, and it must be announced that way: a group with an accessible name (the name a screen reader reads out for a control), and each chip announcing its label and whether it is selected.
- **The group needs a label.** "Categories" — otherwise the user hears a run of options with no idea what they are choosing.
- **Selection must be available in code, not shown by color.** A selected chip that differs only in its fill cannot be told apart by a screen reader user, and `recursica-skill-system-conventions` forbids it.
- **A removable chip's close control needs a name that includes the value** — "Remove Marketing", not "Remove", and certainly not nothing. Five identical "Remove" controls down a row of chips cannot be used.
- **Announce the removal.** After a chip is removed, the user needs to know it is gone and what is left. With no announcement, a screen reader user cannot tell the removal from a click that failed.
- **A leading icon is decorative and must be silent.** The label carries the meaning.
- **Do not announce the chip's count of matching results as part of the chip**, unless it is visible there too.

### Keyboard and non-mouse navigation

- **Every chip must be reachable and usable from the keyboard.** Space toggles a selectable chip. Enter or Space activates a removable chip's close control.
- **Where the library handles the group as a single tab stop (a place the Tab key lands) with the arrow keys moving between chips, do not fight it.** Do not add a tabindex to individual chips, and do not add custom key handling on top.
- **A removable chip's close control is its own stop** within the chip, reachable without a pointer.
- **After a chip is removed, move focus on purpose** — to the next chip, or to the group if none are left. Focus left on a removed element is lost, and the user is quietly sent back to the top of the document.
- **Never require hover to reveal the close control.** A dismiss that appears on hover cannot be reached by keyboard or by touch.

## Styling set by tokens

Do not set or override any of these. The component sets them:

- `horizontal-padding`, `vertical-padding`, `border-size`, `border-radius`, `elevation`.
- `min-width`, `max-width`, `text`, `text-size`.
- `icon-size`, `icon-text-gap`, `leading-icon-color`.
- `close-icon-size`, `close-icon-color`.
- All colors per selection state, including hover and focus.

## Related skills

- `recursica-skill-badges-chips` — chip vs. badge, tags, dismissible and toggled chips, group counts, and placement.
- `recursica-skill-selection-controls` — when selectable chips are the right control, and the rules they inherit from checkbox groups.
- `recursica-skill-forms` — commit model, and error presentation for the group.
- `recursica-skill-assistive-element` — the element that carries the group's validation error below it, and the wording it takes.
- `recursica-skill-working-memory` — the basis for option-count limits.
- `recursica-skill-system-conventions` — the accessibility baseline every component follows.

## Open questions

- **Whether a chip may be disabled**, and what that would mean for a filter.
- **Overflow.** What a group does when it has more chips than the row can hold; wrapping is not stated as allowed.
- **Whether a chip group supports select-all or clear-all**, and where that control would sit.
- **A chip that opens a menu** — documented in other systems, but not here.

## Pre-flight checklist

- [ ] The values are plural, and no single chip stands alone.
- [ ] No status, and no error condition, is shown as a chip.
- [ ] A required group's validation error is reported by the assistive element below the group, never by a chip.
- [ ] The group is within 7 ± 2, and has one behavior — selectable or removable, not both.
- [ ] Only values the user added can be dismissed.
- [ ] Labels are nouns of one or two words.
- [ ] The group has an accessible name, and each chip announces its label and whether it is selected.
- [ ] Selection does not depend on color alone.
- [ ] Every close control's name includes the value it removes, and removal is announced.
- [ ] Chips and close controls can be used from the keyboard, and nothing depends on hover.
- [ ] Focus is moved on purpose after a removal.
- [ ] No chip is passed a state other than `selected` or `unselected`, or any size or style setting.
- [ ] Styling comes from the component.
- [ ] Open questions were asked about, not decided: whether a chip may be disabled, overflow, select-all or clear-all, and a chip that opens a menu.
