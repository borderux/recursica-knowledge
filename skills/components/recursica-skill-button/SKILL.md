---
name: recursica-skill-button
description: Rules for the Recursica button — button versus link, button styles, sizes, and content, how many primaries, labels, destructive actions, icon-only buttons, and accessibility. Use for any button, submit and cancel pair, toolbar, or row action. Not for going to another page — see recursica-skill-link; hierarchy and undo policy live in recursica-skill-buttons-links.
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

| Situation                                                     | Use instead                                                                                       |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Clicking goes to a different page or URL                      | A link, with a real `href`. See `recursica-skill-link`.                                           |
| A table row opens a related record                            | A link. A link has less visual weight than a button, and a dense table needs less weight per row. |
| The user chooses one of two to five options, such as a view   | A segmented control. See `recursica-skill-segmented-control`.                                     |
| The user turns a setting on or off, such as email alerts      | A switch or a checkbox. See `recursica-skill-selection-controls`.                                 |
| A table row has more action buttons than the row has room for | Fewer actions in the row, not smaller buttons. See `recursica-skill-tables`.                      |

**Never use a button to go to a different page or URL.** Using a button to go to a different page is the most common misuse of buttons. If clicking the control changes the URL, build the control as a link, even when the design shows a button. When the link needs less visual weight, use the link's text style, never a button.

## Variants

Each project can add, rename, or remove button variants in the project's UI kit (the token file, `recursica_ui-kit.json`, that says which variants and states each component has). Get the project's button variants from the Recursica MCP server's `recursica_get_component_doc` tool. **Use only the button variants the tool lists, under the names the code uses. Never invent a variant.**

The rules below describe each variant by role. The names in the standard UI kit are examples.

- **Three styles, by prominence.** The primary style is for the main action. The secondary style is for the next most important action. The least prominent style is for every other action. In the standard UI kit, the three styles are `solid`, `outline`, and `text`. The `text` style is also called "Ghost".
- **Two sizes.** A default size and a smaller size. The standard UI kit calls the smaller size `small`.
- **Three kinds of content.** A label alone, an icon with a label, or an icon alone. An icon with a label can show the icon before the label, after the label, or both. The settings are the same for each position.
- **A disabled state for every style.** The disabled opacity comes from `globals.states.disabled`. How to set the disabled state is an open question.
- **No destructive style.** Never invent a destructive style. Color alone cannot mark a destructive action (an action that deletes data or cannot be undone). Name the destructive action in the label, as in "Delete invoice", and confirm any action that cannot be undone. See `recursica-skill-buttons-links`.
- **No loading state.** While an action runs, show the disabled look with an animated icon, with or without a label. Never add a spinner beside the button, change the label, or invent any new state.
- **No success state.** Show any confirmation of a finished action outside the button, such as in a toast. See `recursica-skill-toast`.
- **No full-width option.** Never stretch a button to fill a container.

## Rules

**Write the label as a verb and an object.** Write "Save page", not "OK". Write "Delete invoice", not "Yes". The label alone must make clear what the button does, because a screen reader often reads the label without the text around the button.

**Use one primary button per page, panel, or modal.** The primary button uses the primary style. The next most important action uses the secondary style, and every other action uses the least prominent style. No other button in the same page, panel, or modal uses the primary style.

**Put action buttons at the bottom right** of a form footer or a modal footer, with the primary button last in reading order. `recursica-skill-buttons-links` sets this rule.

**Give every icon-only button a tooltip and an accessible name** (the name a screen reader reads out for a control). The tooltip is for sighted mouse users. A screen reader does not read the tooltip unless the tooltip text is also the accessible name.

**Show a count in parentheses after the label, never in place of the label.** Write `Apply status`, then `Apply status (1)`, then `Apply status (102)`. The words stay the same, and only the number changes. Never build the number into the words, as in `Apply 102 statuses`. Never change the words between one item and many.

**Show no count when nothing is selected.** Never show `(0)`. A zero tells the user nothing the user cannot already see, and a zero makes the button look as if an item is selected. Add the count at the first selection, and remove the count when the last selection is cleared.

**Label a toggle button with the current state.** "Follow" becomes "Following" after the user follows.

**While a submit action runs, show the disabled look with an animated icon.** `recursica-skill-forms` requires a disabled, loading look on the submit button. Build the look from the variants above: an icon, with or without a label, plus the disabled state, with the icon animated. Keep the button the same size and in the same place. A button that moves or resizes is no longer under the user's pointer.

**Never use the smaller size to fit more buttons.** Too many actions in a row is a structural problem. See `recursica-skill-system-conventions`.

**Hide a button the user has no permission to use.** Never show the button disabled instead. See `recursica-skill-navigation`.

## Accessibility

This component also follows the accessibility baseline in `recursica-skill-system-conventions`. Only the rules specific to this component are listed here.

The button component provides the focus ring, and pressing by click and by keyboard. The application must provide the behavior in the two lists below.

### Screen readers

- **Give every button an accessible name.** Set the name explicitly on an icon-only button, because a screen reader does not read the icon. A button with no name is read only as "button".
- **The accessible name should match the visible label.** When the name and the label differ, the name must still contain the label. A voice-control user presses a button by saying the label.
- **Name the object in a row action or a list action.** A table with "Delete" in every row gives thirteen identical announcements. Put the object in the name, as in "Delete invoice 1043", or give the row that context in code.
- **Update the accessible name when a toggle button's label changes.** An accessible name that is out of date after a press is worse than no name.
- **Spell out the count in the accessible name.** The label shows `Apply status (102)`, and the screen reader says "Apply status to 102 items." A bare number after a label, as in "Apply status 102", is unclear when heard. The number could be a quantity, an ID, or part of the name.
- **The count is the one approved case where the name and the label differ.** The count still follows the rule above, because the name contains the label. A voice-control user can still say "Apply status".
- **Update the accessible name as the count changes.** With nothing selected, the name is `Apply status`, with no count. Do not announce every increase while the user selects. The name must be correct by the time the user reaches the button.
- **Use a real `button` element**, never a `div` or a `span` with a click handler. Only a real button element is announced as a button and responds to Enter and Space without extra code.
- **Put the meaning in the accessible name, not only in the icon.** A screen reader announces the name of an icon-only button and nothing about the icon. `recursica-skill-system-conventions` requires meaning in more than one signal.
- **Mark a running button as busy, and hide the animated icon from screen readers.** The animation is visual only. Without the busy state, a screen reader user hears nothing and presses the button again.
- **Keep the accessible name while the button is busy**, or change the name to a useful one, such as "Saving". Never leave the name empty.

### Keyboard and non-mouse navigation

- **Enter and Space both press a button.** Do not intercept, remap, or block either key.
- **Each button is a tab stop (a place the Tab key lands), in the same order as on screen.** A keyboard user must reach the primary button without tabbing through the whole page.
- **Never show a needed action, label, or value only on hover.** Keyboard users and touch users cannot reach a row action that appears on hover. Show every action, or put the action in a menu the user can reach.
- **When a button opens a modal or a menu, move focus into the modal or menu.** When the modal or menu closes, return focus to the button. If focus goes to the top of the page, a keyboard user has to tab through the whole page to get back.
- **For any other action, leave focus on the button after a press.** The user can then press the button again.
- **Keep a running button in the tab order.** A disabled control leaves the tab order, and focus falls back to the top of the page. Show the disabled look without removing the button from the tab order, or move focus to the next element the user needs.
- **The animated icon respects a reduced-motion preference** (a setting that asks for less animation).

## Styling set by tokens

The button component sets these properties for every style, size, and kind of content. Never set or override the properties below:

- Height, horizontal and vertical padding, `border-size`, `border-radius`.
- Icon size and the gap between the icon and the label.
- Type styling, letter case, and text alignment.
- All colors, for every style and layer, including hover, active, focus, and disabled.
- Elevation.

## Related skills

- `recursica-skill-buttons-links` — button versus link, label copy, hierarchy and placement, confirming destructive actions, undo, toggles, row and bulk actions, and buttons that open a modal.
- `recursica-skill-forms` — submit and cancel behavior, save mode, and where the footer sits.
- `recursica-skill-system-conventions` — meaning in more than one signal, and fixing the structure instead of shrinking controls to fit.

## Open questions

- **When to use the smaller size.** No rule says which screens use the smaller size.
- **Full-width buttons.** No variant property supports a full-width button, and no rule says whether full-width buttons are ever allowed, or where.
- **The icon for a running button.** The parts of the running look are settled. The icon is not settled. Whether the UI kit or the adapter defines the animation is also unknown.
- **Split buttons and button groups.** The UI kit has neither. Do not build either one.
- **Setting the disabled state.** The standard UI kit defines a disabled state under each style. Nobody has confirmed that the adapter exposes the disabled state as a setting. Check the component's settings, or ask, before relying on the disabled state.

## Pre-flight checklist

- [ ] No button goes to a different page or URL.
- [ ] Every label is a verb and an object, and makes clear what the button does without the text around the button.
- [ ] Any count is in parentheses after a label that does not change, and no count appears at zero.
- [ ] The accessible name spells out the count, as in "Apply status to 102 items", while the label shows the count in parentheses.
- [ ] Each page, panel, or modal has exactly one button in the primary style.
- [ ] Every icon-only button has a tooltip and an accessible name.
- [ ] Every button is a real `button` element, is in the tab order, and works with Enter and Space.
- [ ] No action appears only on hover.
- [ ] Every row action names the object, or gets the object from the row.
- [ ] Focus returns to the button when a modal or menu that the button opened closes.
- [ ] A running button shows the disabled look with an animated icon, with no spinner beside the button, no new label, and no new state. The button does not move or resize.
- [ ] A running button is marked busy, keeps the accessible name, stays in the tab order, and respects reduced motion.
- [ ] Every variant, size, and state is one the project's UI kit lists, and no destructive style is invented.
- [ ] Styling, including the focus ring, comes from the button component.
- [ ] Actions the user has no permission for are hidden, not disabled.
- [ ] Open questions were asked about, not decided: when to use the smaller size, full-width buttons, the icon for a running button, split buttons and button groups, and setting the disabled state.
