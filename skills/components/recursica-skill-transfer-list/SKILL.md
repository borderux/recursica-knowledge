---
name: recursica-skill-transfer-list
description: Rules for the Recursica transfer list — two lists side by side with buttons that move items from one list to the other, when a list of options is long enough to need a transfer list, the filter, and moving items without dragging. Use for assigning items to a group or picking columns. Not for a short list of options — see recursica-skill-checkbox; not for one value — see recursica-skill-dropdown.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Transfer list

A transfer list shows two lists of options side by side. An item is one option in a list. Move buttons move items from one list to the other. A transfer list is also called a dual listbox, because each list is a listbox (a list the persona picks one or more options from).

> **The transfer list is not built yet.** Both adapters (the Recursica component library for one framework, such as Mantine or Angular Material) ship the transfer list as a stub (an empty placeholder) that shows placeholder content. The adapters apply none of the 31 `transfer-list` tokens (named design values, such as colors or sizes, set by the design system) that the UI kit (the token file, `recursica_ui-kit.json`, that says which variants and states each component has) exports. The rules in this skill describe the intended transfer list, and the rules match the UI kit. A transfer list built today shows only a placeholder, with no error. Raise the missing transfer list with a person instead of building a workaround.

## When to use a transfer list

- **The list of options is long, well past the 7 ± 2 limit where a checkbox group stops working.** See `recursica-skill-working-memory`.
- **The items not chosen matter as much as the items chosen.** Examples are assigning people to a group, picking the columns of a report, and choosing which options a setup includes. The persona needs to see the items left out, not only the items chosen.
- **Each item is either included or excluded.** Two lists show at a glance which items are included. Checkmarks spread through one long checkbox group do not show the included items at a glance.
- **The persona works in bulk.** The persona selects several items, then moves the selected items in one action.

## When not to use a transfer list

| Situation                                                                                           | Use instead                                                                                                                   |
| --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| The list has only a few options                                                                     | A checkbox group. See `recursica-skill-checkbox` and `recursica-skill-selection-controls`.                                    |
| The persona chooses exactly one value                                                               | A dropdown or a radio group. See `recursica-skill-dropdown`.                                                                  |
| The persona chooses any number of options, including none, and the options not chosen do not matter | A multi-select dropdown. See `recursica-skill-selection-controls`.                                                            |
| The container is too narrow for two lists side by side                                              | A different component. Each list has a fixed width.                                                                           |
| The persona puts items in order, instead of including or excluding items                            | If the project has an ordering variant for the transfer list, use the ordering variant. Otherwise, use a different component. |
| The items are stored records with actions                                                           | A table. See `recursica-skill-tables`.                                                                                        |
| The persona viewing the screen cannot change which items are included                               | A read-only field. See `recursica-skill-read-only-field`.                                                                     |

**A transfer list solves one problem in a screen's structure: a list of options too long for a checkbox group.** `recursica-skill-selection-controls` says that twenty checkboxes that need a select-all checkbox are the wrong control, and a transfer list replaces those checkboxes. A transfer list where nine checkboxes would do is also the wrong control.

## Variants

**Use only the transfer list variants and options that the Recursica MCP server lists for the project.** A designer can add variants and options in Theme Forge, so each project can differ. Get the list with the server's `recursica_get_component_doc` tool, and use the names the code uses. A wrong name in code has no effect and shows no error. Never invent a variant or an option.

The rules below describe each option by role, such as "the error state". The names in the standard UI kit (the unchanged UI kit in the official Recursica release) are examples only.

- **The transfer list has an error state and a disabled state.** In the standard UI kit, the state variant is `states`, with the options `error` and `disabled`.
- **A transfer list has a header with a title, a filter, and two item lists.** A filter is a search field that narrows a list to the matching items. The transfer list component shows the header, the filter and both lists. Do not build a separate search field or heading above the transfer list.
- **The transfer list's height and width are fixed.** Neither the height nor the width is an option. Both lists are the same size, however many items each list holds.
- **A move-all control is not wanted.** See the move-all rule under Rules.

**Label placement is a variant.** A control's label sits beside the control or above the control. In the standard UI kit, the variant is `layouts`, with the options `side-by-side` and `stacked`. The label beside the control is the house default. The label above the control is the fallback when the form's container is too narrow for both side by side. The container's width decides, not the viewport's width. See `recursica-skill-forms`. The label placement variant does not arrange the two lists. The two lists always sit in two columns.

**Set label placement explicitly on every field.** The house rule puts the label beside the input. The code library under an adapter may put the label above the input by default, at every container width. Set the label beside the input on every field, using the names the code uses for the variant and the option.

**Label placement is one decision per form, not per field.** This field uses the same label placement as every other field in the form. Apply the container-width test once, to the whole form. The result sets the placement of every field in the form, including short fields that would fit side by side. A form may change placement at a breakpoint, but a form never mixes placements at one breakpoint, and a form section never gets a separate placement. `recursica-skill-forms` sets this rule.

## Rules

**Give each list a name that tells the two lists apart.** Use the product's words, such as "Available" and "Selected", or "Excluded" and "Included". Without names, the persona cannot tell which list holds the chosen items.

**The filter is required, and the filter's label names the list the filter searches.** A list long enough for a transfer list is too long for the persona to read every item.

**Keep selecting an item and moving an item as two separate actions.** Selecting, or checking, an item marks the item to be moved. Moving the item puts the item in the other list. Do not move an item at the moment the persona selects the item. Moving many items at once is the reason a transfer list exists.

**Do not build a move-all control.** `recursica-skill-selection-controls` treats a need for select-all as a sign to reconsider the control. The filter is the tool for working with a long list. Keep the filter. A list so long that a move-all control seems necessary is a sign that the screen's structure is wrong. Raise the problem with a person instead of adding a move-all control, as `recursica-skill-system-conventions` says.

**Sort both lists the same way, and keep the sort order the same after a move.** An item that appears in an unexpected place after the persona moves the item back looks lost.

**Put the transfer list in the form's single column, and never inside a card.** A transfer list is a form control. `recursica-skill-forms` sets this rule.

**Give the transfer list a real label, and put the selection rules in assistive text** (help text shown with the control). The selection rules are the minimum, the maximum, and what the two lists mean. Put a rule such as "At least two must be included" under the transfer list, not in a validation message after the persona makes a mistake. See `recursica-skill-label` and `recursica-skill-assistive-element`.

**Pair the error state with a signal that is not color.** `recursica-skill-system-conventions` requires the second signal.

**When a list needs long scrolling inside the fixed height, the screen's structure is the problem.** A scrolling area inside the transfer list works around the problem and does not fix the problem. See `recursica-skill-system-conventions` and the open questions.

**Never disable a transfer list to show which items are included.** When the persona cannot change the included items in the current context, show the included items as read-only content.

## Accessibility

The rules below add to the accessibility baseline in `recursica-skill-system-conventions`, including the focus ring, which every Recursica component follows.

A transfer list with arrow buttons often works only with a mouse. The app must add every behavior listed under "Screen readers" and "Keyboard and non-mouse navigation".

### Screen readers

- **Give each list a separate accessible name** (the name a screen reader reads out for a control). Without an accessible name, a persona using a screen reader hears a list of items, cannot tell which list holds the items, and cannot use the transfer list.
- **Set the selected state in code, not by color.** Assistive technology does not treat an item with only a tinted background as selected. `recursica-skill-system-conventions` sets this rule.
- **Name each move button with what moves and where**, such as "Move selected to included" or "Remove selected from included". A name like "Right arrow" or ">" does not say what moves where. Two arrow buttons with no labels cannot be told apart.
- **After a move, announce the result.** Announce the items that moved, and how many items each list now holds. The persona cannot see both lists change at once.
- **When the filter changes a list, announce how many items the list shows**, such as "3 of 120 shown". Without the count, a persona using a screen reader hears a list that seems to empty for no reason.
- **Each list's item count should be available**, so the persona does not have to go through every item to count the items.
- **Do not announce the same event twice.** When the result of a move is announced, do not also announce every item again as focus lands on each item.

### Keyboard and non-mouse navigation

- **Every step of a transfer must work from the keyboard, with no dragging.** Selecting items, moving the items, and moving the items back must all work with keys alone. Drag and drop may be added as an extra way to move items, and never as the only way.
- **After a move, put focus in a chosen place.** Put focus on the moved item in the moved item's new list, or on the move button that still applies. Never leave focus on a control that has just become disabled. Never let focus drop back to the top of the page.
- **Each move button is a real button, pressed with Enter and Space.** The move buttons are tab stops (places the Tab key lands), in visual order, between the two lists.
- **Disable a move button when the move button has no item to move.**
- **The tab order follows the visual order**: label, filter, first list, move buttons, second list.
- **Do not move focus for the persona**, except to put focus in a chosen place after a move. Typing in the filter must not move focus into the list the filter searches.
- **No control, label, count or other content the persona needs may appear only on hover.** This rule covers the move buttons, a remove control on each item, and the item counts.

## Styling set by tokens

**Never set or override the transfer list's styling.** The theme sets every visual property of the transfer list, such as size, spacing, borders, colors and animation. Do not add extra containers or spacers to change the transfer list's look. If the design needs a look the theme does not give, report the missing look as a gap in the design system. See `recursica-skill-design-router`.

## Related skills

- `recursica-skill-selection-controls` — which selection control to choose, the most options each selection control can hold, select-all as a sign that the screen's structure is wrong, disabled versus read-only, and when a selection is saved.
- `recursica-skill-working-memory` — the research behind the 7 ± 2 limit, and why a list the persona scans to recognize an item may be long while a set of items the persona compares may not.
- `recursica-skill-forms` — the single-column layout, one label placement per form and the container width that sets the label placement, validation, save mode, and the rule against a form control inside a card.
- `recursica-skill-label` — the transfer list's label, and the label for a group of fields.
- `recursica-skill-assistive-element` — the help text for the selection rules, and the error message.
- `recursica-skill-system-conventions` — showing meaning in more than one way, and fixing the screen's structure instead of adding a feature to work around a problem in the structure.

## Open questions

- **Where the transfer list fits among the selection controls.** `recursica-skill-selection-controls` sends a choice of any number of options, including none, to a multi-select dropdown when the options pass the option limit. `recursica-skill-selection-controls` never mentions a transfer list. No rule says at how many options a transfer list replaces the multi-select dropdown.
- **Checkboxes on each item.** Only the design-system website shows a checkbox on every item. Nobody has settled whether the items are rows with checkboxes or items in a selectable listbox. Ask before relying on a checkbox on each item. Ask only when the project has no checkbox option for an item.
- **Overflow.** The height is fixed, so a long list must scroll inside the transfer list. `recursica-skill-system-conventions` treats a scrolling area inside a control as a failure. No rule says what a list does when the items do not fit the height.
- **Narrow containers.** The label placement variant moves only the label, and the lists have a fixed width. An earlier house note said to avoid the transfer list on small screens, but the transfer list has no responsive behavior.
- **Empty states.** No rule sets an empty state for either list, including the starting state where every item is in one list. Ask only when the project has no empty state.
- **Ordering.** No rule says whether items are sorted alphabetically, keep the original order, or can be reordered by the persona.
- **Disabled items.** No rule says whether a single item can be disabled, locked in one list while the other items move. Ask only when the project has no disabled state for a single item.

## Pre-flight checklist

- [ ] The list of options is long, and the persona needs to see the excluded items. A checkbox group and a dropdown were ruled out for those reasons.
- [ ] Both lists have visible names that tell the two lists apart, and each list has an accessible name.
- [ ] A filter is present, and the filter announces how many items a filtered list shows.
- [ ] Selecting an item does not move the item. Items move through the move buttons.
- [ ] Both lists use the same sort order, and the sort order stays the same after a move.
- [ ] Each move button's name says what moves where. Each move button is a real button, pressed with Enter and Space.
- [ ] Every step of a transfer works from the keyboard, with no dragging. Any drag and drop is an extra way to move items.
- [ ] After a move, focus goes to a chosen place, and the result is announced: the items that moved, and the new count in each list.
- [ ] The selected state is set in code, not shown by highlight color alone.
- [ ] No move-all control was built. A list long enough to seem to need a move-all control was raised with a person as a sign that the screen's structure is wrong.
- [ ] The transfer list has a real label, with the selection rules in assistive text.
- [ ] The label placement matches every other field in the same form, with one placement per form, as `recursica-skill-forms` requires.
- [ ] The error state has a signal that is not color. The label, the help text, and the error text are set through the transfer list component.
- [ ] The tab order runs: label, filter, first list, move buttons, second list.
- [ ] The transfer list is in the form's single column, and not inside a card.
- [ ] Every variant, size, and state is one the project's UI kit lists, and no variant or option is invented. No header, filter, or wrapper is built by hand.
- [ ] No styling is set or overridden on the transfer list, and no container or spacer is added to change the transfer list's look.
- [ ] Open questions were asked about, not decided: item checkboxes, overflow, ordering.
