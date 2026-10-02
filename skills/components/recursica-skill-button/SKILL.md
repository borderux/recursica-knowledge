---
name: recursica-skill-button
description: Rules for the Recursica button — button versus link, button styles, sizes and content, how many primary buttons, labels, destructive actions, icon-only buttons, and accessibility. Use for any button, submit and cancel pair, toolbar, or row action. Not for going to another page — see recursica-skill-link. Button hierarchy and undo rules are in recursica-skill-buttons-links.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Button

A button performs an action. A button never takes the user to a different page or URL.

## When to use a button

- The action saves, submits, deletes, applies a change, or opens a modal.
- The user stays on the same page after the action.
- The action moves a process forward or back, such as Next and Back in a stepper. Next and Back change the step, not the page.

## When not to use a button

| Situation                                                           | Use instead                                                                                                        |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Clicking goes to a different page or URL                            | A link, with a real `href`. See `recursica-skill-link`.                                                            |
| A table row opens a related record                                  | A link. A link has less visual weight than a button, and a dense table needs less visual weight in each table row. |
| The user chooses one of two to five options, such as a view         | A segmented control. See `recursica-skill-segmented-control`.                                                      |
| The user turns a setting on or off, such as email alerts            | A switch or a checkbox. See `recursica-skill-selection-controls`.                                                  |
| A table row has more action buttons than the table row has room for | Fewer actions in the table row, not smaller buttons. See `recursica-skill-tables`.                                 |

**Never use a button to go to a different page or URL.** Using a button to go to a different page is the most common misuse of buttons. If clicking a control changes the URL, build the control as a link, even when the design shows a button. A link already has less visual weight than a button. When a page change must look light, use a link, never a button in the text style.

## Variants

**Use only the button variants the Recursica MCP server lists for the project, under the names the code uses. Never invent a variant.** Get the list from the server's `recursica_get_component_doc` tool. Each project can add, rename, or remove button variants in the project's UI kit (the token file, `recursica_ui-kit.json`, that says which variants and states each component has).

The rules below describe each variant by role. The names in the standard UI kit (the unchanged UI kit in the official Recursica release) are examples.

- **Three styles, from most to least prominent.** The primary style is for the main action. The secondary style is for the next most important action. The least prominent style is for every other action. In the standard UI kit, the three styles are `solid`, `outline`, and `text`. The `text` style is also called "Ghost".
- **Two sizes.** A button comes in a default size and a smaller size. The standard UI kit calls the smaller size `small`.
- **Three kinds of content.** A button shows a label alone, an icon with a label, or an icon alone. One variant covers an icon before the label, after the label, or both. There are no separate variants for each icon position.
- **A disabled state for every style.** The opacity of a disabled button comes from `globals.states.disabled`. How to turn on the disabled state is an open question.
- **No destructive style.** Never invent a destructive style. Color alone cannot mark a destructive action (an action that deletes data or cannot be undone). Name the destructive action in the label, as in "Delete invoice". Confirm any action that cannot be undone. See `recursica-skill-buttons-links`.
- **No loading state.** Show a loading button (a button whose action is still running) in the disabled look with an animated icon, with or without a label. Never add a spinner beside the button, change the label, or invent any new state.
- **No success state.** Show any confirmation of a finished action outside the button, such as in a toast. See `recursica-skill-toast`.
- **No full-width option.** Never stretch a button to fill the container the button sits in.

## Rules

**Write the label as a verb and an object.** Write "Save page", not "OK". Write "Delete invoice", not "Yes". The label alone must say what the button does. A screen reader often reads the label without the text around the button.

**Use one primary button per page, panel, or modal.** The primary button uses the primary style. The button for the next most important action uses the secondary style. Every other button uses the least prominent style. No other button in the same page, panel, or modal uses the primary style.

**Put action buttons at the bottom right of a form footer or a modal footer.** Put the primary button last in reading order. `recursica-skill-buttons-links` sets this rule.

**Give every icon-only button a tooltip and an accessible name** (the name a screen reader reads out for a control). The tooltip is for sighted mouse users. A screen reader does not read the tooltip unless the tooltip text is also the accessible name.

**Show a count in parentheses after the label, never in place of the label.** Write `Apply status`, then `Apply status (1)`, then `Apply status (102)`. The label words stay the same, and only the number changes. Never build the number into the label words, as in `Apply 102 statuses`. Never change the label words between one item and many items.

**Show no count when no item is selected.** Never show `(0)`. A zero only repeats what the user can already see. A zero also makes the button look as if an item is selected. Add the count when the user selects the first item. Remove the count when the last selected item is cleared.

**Label a toggle button with the button's current state.** "Follow" becomes "Following" after the user presses Follow.

**While a submit action runs, show the submit button in the disabled look with an animated icon.** `recursica-skill-forms` requires a disabled, loading look on the submit button. Build the look from the variants above: the disabled state and an icon, with or without a label. Animate the icon. Keep the button the same size and in the same place. A button that moves or resizes is no longer under the user's pointer.

**Never use the smaller size to fit more buttons side by side**, in a toolbar, a footer, or a table row. Too many buttons side by side means the screen offers too many actions. Fix the structure instead. See `recursica-skill-system-conventions`.

**Hide a button the user has no permission to use.** Never show the button disabled instead. See `recursica-skill-navigation`.

## Accessibility

This component also follows the accessibility baseline in `recursica-skill-system-conventions`. Only the rules specific to this component are listed here.

The button component provides the focus ring. The button component also handles a press by click and by keyboard. The app must add the behavior in the two lists below.

### Screen readers

- **Give every button an accessible name.** Set the accessible name explicitly on an icon-only button. A screen reader does not read the icon. A button with no accessible name is read only as "button".
- **The accessible name should match the visible label.** When the accessible name and the label differ, the accessible name must still contain the label. A voice-control user presses a button by saying the label.
- **Name the object in an action button in a table row or a list.** In a table of thirteen rows with "Delete" in every table row, a screen reader announces "Delete" thirteen times with nothing to tell the rows apart. Put the object in the accessible name, as in "Delete invoice 1043". Or give the row the object as context in code.
- **Update the accessible name when a toggle button's label changes.** An accessible name that is out of date after a press is worse than no accessible name.
- **Spell out the count in the accessible name.** The label shows `Apply status (102)`, and the screen reader says "Apply status to 102 items." A bare number after the label, as in "Apply status 102", is unclear when heard. The number could be a quantity, an ID, or part of the name.
- **The count is the one approved case where the accessible name and the label differ.** The count still follows the rule that the accessible name must contain the label, because the accessible name contains the label. A voice-control user can still say "Apply status".
- **Update the accessible name as the count changes.** With no item selected, the accessible name is `Apply status`, with no count. Do not announce every increase in the count while the user selects items. The accessible name must be correct by the time the user reaches the button.
- **Use a real `button` element**, never a `div` or a `span` with a click handler. Only a real button element is announced as a button and responds to Enter and Space without extra code.
- **Put the meaning in the accessible name, not only in the icon.** A screen reader announces the accessible name of an icon-only button and nothing about the icon. `recursica-skill-system-conventions` requires every meaning to be shown in more than one way.
- **Mark a loading button as busy, and hide the animated icon from screen readers.** The animation is visual only. Without the busy state, a screen reader user hears nothing and presses the button again.
- **Keep the accessible name while the button is busy**, or change the accessible name to another useful name, such as "Saving". Never leave the accessible name empty.

### Keyboard and non-mouse navigation

- **Enter and Space both press a button.** Do not intercept, remap, or block either key.
- **Each button is a tab stop (a place the Tab key lands), in the order the buttons appear on screen.** A keyboard user must reach the primary button without tabbing through the whole page.
- **Never show an action, label, or value the user needs only on hover.** Keyboard users and touch users cannot reach an action that appears only when the pointer is over a table row or list item. Show every action, or put the action in a menu the user can reach.
- **When a button opens a modal or a menu, move focus into the modal or menu.** When the modal or menu closes, return focus to the button. If focus goes to the top of the page instead, a keyboard user has to tab through the whole page to get back to the button.
- **When a button does not open a modal or a menu, leave focus on the button after a press.** The user can then press the button again.
- **Keep a loading button in the tab order.** A disabled control leaves the tab order, and focus falls back to the top of the page. Show the disabled look without removing the button from the tab order, or move focus to the next element the user needs.
- **The animated icon follows the user's reduced-motion preference** (a setting that asks for less animation).

## Styling set by tokens

**Never set or override the button properties below.** The button component sets each property for every style, size, and kind of content.

- Height, horizontal and vertical padding, `border-size`, `border-radius`.
- Icon size and the gap between the icon and the label.
- Typography, letter case, and text alignment.
- All colors, for every style and every layer (a numbered background level, 0 to 3, that sets the colors of the components on that level), including hover, active, focus, and disabled.
- Elevation.

## Related skills

- `recursica-skill-buttons-links` — button versus link, label wording, button hierarchy and placement, confirming destructive actions, undo, toggles, row actions and bulk actions, and buttons that open a modal.
- `recursica-skill-forms` — what submit and cancel buttons do, the form's save mode, and where the form footer goes.
- `recursica-skill-system-conventions` — showing meaning in more than one way, and changing the screen's structure instead of shrinking controls to fit.

## Open questions

- **When to use the smaller size.** No rule says which screens use the smaller size.
- **Full-width buttons.** No variant property supports a full-width button. No rule says whether a full-width button is ever allowed, or where.
- **The icon for a loading button.** A loading button uses the disabled look with an animated icon, and that part is settled. Which icon to use is not settled. Whether the UI kit or the adapter (the Recursica component library for one framework, such as Mantine or Angular Material) defines the animation is also unknown.
- **Split buttons and button groups.** The UI kit has neither. Do not build either one.
- **Setting the disabled state.** The standard UI kit defines a disabled state under each style. Nobody has confirmed that the adapter exposes the disabled state as a setting. Check the button component's settings, or ask, before relying on the disabled state.

## Pre-flight checklist

- [ ] No button goes to a different page or URL.
- [ ] Every label is a verb and an object, and says what the button does without the text around the button.
- [ ] Any count is in parentheses after label words that do not change, and no count appears at zero.
- [ ] The accessible name spells out the count, as in "Apply status to 102 items", while the label shows the count in parentheses.
- [ ] Each page, panel, or modal has exactly one button in the primary style.
- [ ] Every icon-only button has a tooltip and an accessible name.
- [ ] Every button is a real `button` element, is in the tab order, and works with Enter and Space.
- [ ] No action appears only on hover.
- [ ] Every row action names the object, or gets the object from the row.
- [ ] Focus returns to the button when a modal or menu that the button opened closes.
- [ ] A loading button shows the disabled look with an animated icon, with no spinner beside the button, no new label, and no new state. The loading button does not move or resize.
- [ ] A loading button is marked busy, keeps the accessible name, stays in the tab order, and follows the user's reduced-motion preference.
- [ ] Every variant, size, and state is one the project's UI kit lists, and no destructive style is invented.
- [ ] Styling, including the focus ring, comes from the button component.
- [ ] Actions the user has no permission for are hidden, not disabled.
- [ ] Open questions were asked about, not decided: when to use the smaller size, full-width buttons, the icon for a loading button, split buttons and button groups, and setting the disabled state.
