---
name: recursica-skill-chip
description: Rules for the Recursica chip — when to use chips, the selected and unselected states, selectable versus removable chips, why a chip never shows a status, chip group size, and chip group accessibility. Use for filter chips, tags, and a horizontal multi-select. Not for a read-only value — see recursica-skill-badge. Not for one choice — see recursica-skill-segmented-control.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Chip

A chip is one of several short values the persona can see, select, or remove.

## When to use a chip

- **Chips show several values, not one.** Examples are several tags, several categories, or several applied filters on one object.
- **A layout needs a horizontal multi-select, where the persona picks several options laid out side by side.** Use selectable chips for a horizontal multi-select. Never lay out a checkbox group in a horizontal row.
- **The persona filters or narrows down the content on the screen** by turning options on and off.
- **The persona added the values**, and may remove the values again.

## When not to use a chip

| Situation                                           | Use instead                                                                                                                                      |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| One read-only value that the system sets            | A badge. See `recursica-skill-badge`.                                                                                                            |
| One choice that rules out every other option        | A segmented control for options laid out horizontally, or radio buttons for options stacked vertically. See `recursica-skill-segmented-control`. |
| A status of any kind                                | A badge. See `recursica-skill-badge`. Never use any element the persona can act on for a status.                                                 |
| Space is tight, as in a table row                   | A badge. See `recursica-skill-badge`. A chip takes more room, with an icon and a close control.                                                  |
| More options than one row of chips can hold         | A dropdown or an autocomplete. See `recursica-skill-selection-controls`.                                                                         |
| Primary navigation, or a label on a navigation item | Links for navigation, and a badge for the label on a navigation item.                                                                            |

**Never show a status as a chip.** A status shown as a chip is the misuse to watch for. A chip looks like a control the persona can click. A status is not for the persona to change.

## Variants

**Use only the chip variants and options that the Recursica MCP server lists for the project.** A designer can add variants and options in Theme Forge, so each project can differ. Get the list with the server's `recursica_get_component_doc` tool, and use the names the code uses. Never invent a variant or an option.

The rules below describe each option by role, such as "the selected state". The names in the standard UI kit (the unchanged UI kit in the official Recursica release) are examples only.

- **A chip is either unselected or selected.** In the standard UI kit, the two selection states are `unselected` and `selected`.
- **The UI kit and both Recursica component libraries (one for each framework) define an error state for the chip, and a house rule forbids using the error state.** The house rule does not remove the error state from the UI kit or the component libraries. The error state in the UI kit and the component libraries does not cancel the house rule.
- **A chip is set up as a selectable chip or as a removable chip.** A removable chip has a close icon. Only the design-system website shows the two chip setups. A chip can also show an optional icon before the label.

**The error state combines with either selection state.** Error and selection are separate variants. The UI kit defines the error state separately for an unselected chip and for a selected chip. In the standard UI kit, the error state is called `error` and sits under each selection state. "Error-selected" is the error state on a selected chip, not a fourth state. The error state sits under each selection state because the error state combines with the selected state.

**Never set the error state.** `recursica-skill-badges-chips` says never to use a chip to show an error. Both component libraries offer an `error` setting that applies the error state. An `error` setting found in code is the error state, not a typo. This skill describes the error state only so that an agent recognizes the `error` setting, never as an option to set. To report a missing selection in a required chip group, follow the validation rule under "Rules".

## Rules

**Show chips in groups.** A single chip alone is either a badge or a mistake.

**Keep a chip group to 7 ± 2 options**, and use fewer options when the choice is complex. See `recursica-skill-working-memory`.

**Let the persona remove a chip only when the persona added the chip.** The persona must not remove a value the system set.

**Never show an error as a chip, and never use a chip to report an error.** `recursica-skill-badges-chips` forbids an error condition as the content of a chip. A chip never tells the persona about a problem.

**When a required chip group has no chip selected, show a form validation error below the chip group.** `recursica-skill-forms` sets this rule, and every other form control follows the same rule. The error message goes in the chip group's assistive element, below the chip group. The error message restates the rule the persona must meet, and shows a signal that is not color. See `recursica-skill-assistive-element`. This validation rule and the rule against errors on chips do not conflict. The error belongs to the chip group, not to any chip in the chip group, and no chip changes the chip's look to report the error.

**Selectable chips follow the rules for a checkbox group.** The checkbox group rules cover the limit on the number of options, caution with options selected in advance, and how the form saves. When the form saves every field together, the chip selections save when the persona submits the form, the same as every other field. See `recursica-skill-forms`.

**Write each chip label as a noun of one or two words.** Never put a verb, a sentence or a count in a chip label. The chip has a maximum width, which limits how long a chip label can be. The maximum width is one more reason to keep phrases out of a chip.

**Never mix selectable chips and removable chips in one chip group.** Give each chip group one behavior. In a mixed chip group, the persona cannot see which chips select a value and which chips remove a value.

**Show applied filters as chips the persona can remove.** Removing a filter chip runs the filter again. Removing a filter chip also clears the matching filter control. The filter chip and the filter control share one state.

## Accessibility

The rules below add to the accessibility baseline in `recursica-skill-system-conventions`, including the focus ring, which every Recursica component follows.

A chip group is a form control laid out horizontally. A chip group must behave like every other form control. The most common failure is a group of clickable `div` elements with a colored selected state. A persona who does not use a mouse cannot find or use chips built as clickable `div` elements with a colored selected state.

### Screen readers

- **A selectable chip group is a group of checkboxes, and a screen reader must announce the chip group as a group of checkboxes.** The chip group has an accessible name (the name a screen reader reads out for a control). Each chip announces the chip's label and whether the chip is selected.
- **Give the chip group a label, such as "Categories".** Without a label, the persona hears a list of options and does not know what the options are for.
- **Mark the selected state in the code, not only by color on the screen.** A persona using a screen reader cannot tell a selected chip from an unselected chip when only the fill color differs. `recursica-skill-system-conventions` forbids showing the selected state only by color.
- **Give the close control of a removable chip (the control that removes the chip) an accessible name that includes the chip's value**, such as "Remove Marketing". Never name the close control "Remove" alone, and never leave the accessible name empty. A row of five close controls that are each named "Remove" cannot be used.
- **Announce each chip removal.** After a chip is removed, the persona needs to know that the chip is gone and which chips are left. Without an announcement, a persona using a screen reader cannot tell a removal from a click that failed.
- **Keep the leading icon (an optional icon before the label) silent to a screen reader.** The leading icon is decorative, and the chip label gives the meaning.
- **Do not announce a chip's count of matching results as part of the chip**, unless the chip also shows the count.

### Keyboard and non-mouse navigation

- **A persona using a keyboard must be able to reach and use every chip.** Space selects or clears a selectable chip. Enter or Space activates the close control of a removable chip.
- **When the component library makes the chip group a single tab stop (a place the Tab key lands), with the arrow keys moving between chips, keep that behavior.** Do not add a `tabindex` to an individual chip, and do not add custom key handling on top of the component library's key handling.
- **The close control of a removable chip is a separate stop for keyboard focus, inside the chip.** A persona can reach the close control without a pointer.
- **After a chip is removed, move focus on purpose**, to the next chip, or to the chip group when no chips are left. When focus stays on a removed chip, focus is lost, and the persona is quietly sent back to the top of the page.
- **Never show the close control only on hover.** A persona using a keyboard or a persona on a touch device cannot reach a close control that appears only on hover.

## Styling set by tokens

**Never set or override the chip's styling.** The theme sets every visual property of the chip, such as size, spacing, borders, colors and animation. Do not add extra containers or spacers to change the chip's look. If the design needs a look the theme does not give, raise the gap. See `recursica-skill-design-router`.

## Related skills

- `recursica-skill-badges-chips` — chip versus badge, tags, removable chips and selectable chips, chip-group counts, and where chips go.
- `recursica-skill-selection-controls` — when to use selectable chips, and the checkbox group rules that selectable chips follow.
- `recursica-skill-forms` — the form's save mode, and how to show the chip group's validation error.
- `recursica-skill-assistive-element` — the element below the chip group that shows the chip group's validation error, and the wording of the error.
- `recursica-skill-working-memory` — the research behind the limits on the number of options.
- `recursica-skill-system-conventions` — the accessibility baseline every component follows.

## Open questions

- **Whether a chip may be disabled.** No rule says whether a chip may be disabled, or what a disabled chip would mean for a filter. Ask only when the project has no disabled state.
- **Overflow.** No rule says what a chip group does when the chip group has more chips than one row can hold. No rule says whether chips may wrap to a second row.
- **Select-all or clear-all.** No rule says whether a chip group supports a select-all or a clear-all control, or where that control would go.
- **A chip that opens a menu.** Other design systems document a chip that opens a menu. If the project has a chip that opens a menu, use that chip. Otherwise, ask.

## Pre-flight checklist

- [ ] Chips show several values, and no chip stands alone.
- [ ] No status, and no error condition, is shown as a chip.
- [ ] A required chip group's validation error appears in the assistive element below the chip group, and no chip reports the error.
- [ ] Each chip group stays within 7 ± 2 options, and has one behavior: selectable or removable, never both.
- [ ] Only chips with values the persona added can be removed.
- [ ] Every chip label is a noun of one or two words.
- [ ] Each chip group has an accessible name, and each chip announces the chip's label and whether the chip is selected.
- [ ] The selected state does not depend on color alone.
- [ ] Every close control's accessible name includes the value the close control removes, and every removal is announced.
- [ ] Every chip and every close control works from the keyboard, and nothing in the chip group depends on hover.
- [ ] Focus moves on purpose after a chip is removed.
- [ ] Every chip uses only the states and variants the project lists, and no chip is set to the error state.
- [ ] No styling is set or overridden on the chip, and no container or spacer is added to change the chip's look.
- [ ] Open questions were asked about, not decided: whether a chip may be disabled, overflow, select-all or clear-all, and a chip that opens a menu.
