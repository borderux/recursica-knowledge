---
name: recursica-skill-button
description: Rules for the Recursica button — button versus link, its styles, sizes, and content, how many primaries, labels, destructive actions, icon-only buttons, and accessibility. Use for any button, submit and cancel pair, toolbar, or row action. Not for going somewhere — see recursica-skill-link; hierarchy and undo policy live in recursica-skill-buttons-links.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Button

A button performs an action. It does not take the user anywhere.

## Use it when

- The action changes something. It saves, submits, deletes, applies a change, or opens a modal.
- The user stays on the same page after the action.
- The action moves a process forward or back, such as Next and Back in a stepper. They act on the process, not on a location.

## Do not use it when

| Situation                                 | Use instead                                                                                            |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| The user ends up somewhere else           | `recursica-skill-link`, with a real `href`                                                             |
| A table row links to a related record     | A link. A link has less visual weight than a button, and a dense table needs less weight in every row. |
| The user picks one value from a small set | `recursica-skill-segmented-control`                                                                    |
| An on/off state is saved as data          | A switch or a checkbox. See `recursica-skill-selection-controls`.                                      |
| A row has more actions than fit           | Fewer actions, not smaller buttons. See `recursica-skill-tables`.                                      |

**Never use a button to navigate.** It is the most common misuse of a button. If using it changes the URL, build it as a link, whatever it should look like. If the link must look light, use the link's text style, not a button.

## What exists

The variants come from the UI kit (the token file, `recursica_ui-kit.json`, that says which variants and states each component has), in `ui-kit.components.button`. **Use only the variants, sizes, and states listed here.**

**The third column is the React prop that sets each axis.** An axis (a property a component varies on, such as size or style; Figma calls it a variant property) is named in the UI kit. Its name is not a prop. React ignores the name, with no error, if it is passed as a prop. A blank cell means no single prop sets that axis. CSS state or separate props set it instead, and the rules below say which.

| Axis      | Options                            | React prop |
| --------- | ---------------------------------- | ---------- |
| `styles`  | `solid`, `text`, `outline`         | `variant`  |
| `sizes`   | `default`, `small`                 | `size`     |
| `content` | `icon-label`, `label`, `icon-only` |            |
| `states`  | `disabled`                         |            |

- The `text` style is called "Ghost" outside the UI kit.
- `icon-label` covers a leading icon, a trailing icon, or both. The props are the same in each case. There are no separate leading and trailing variants.
- There is no destructive or danger style. Color cannot mark a destructive action (an action that deletes data or cannot be undone). Say it in the label, and confirm any action that cannot be undone. See `recursica-skill-buttons-links`.
- Every style has a `disabled` state. Its opacity comes from `globals.states.disabled`. How to set it is still open. See the uncovered list.
- There is no loading state. While an action runs, show the `disabled` look with `icon-only` or `icon-label` content, with an icon that may animate. Do not add a spinner beside the button, change the label, or invent a new state.
- There is no success state. Show any confirmation of a finished action somewhere other than the button. See `recursica-skill-toast`.
- There is no full-width or fluid option. Never stretch a button to fill its container.

## Rules for using it

**Write the label as a verb and its object.** Write "Save page", not "OK", and "Delete invoice", not "Yes". A screen reader reads the label on its own, so it must make sense without the rest of the screen.

**Use one primary button per surface.** The primary button uses the `solid` style. Use `outline` for the secondary action and `text` for the least important ones. No other button on the surface uses `solid`.

**Put actions at the bottom right** of a form or modal footer, with the primary button last in reading order. `recursica-skill-buttons-links` sets this rule.

**Give every icon-only button a tooltip and an accessible name** (the name a screen reader reads out for a control). The tooltip is for sighted mouse users. A screen reader does not read the tooltip unless it is also the accessible name.

**Show a count in parentheses after the label, never in place of it.** Write `Apply status`, then `Apply status (1)`, then `Apply status (102)`. The words stay the same and only the number changes. Never build the number into the words, as in `Apply 102 statuses`, and never change the words between one item and many.

**Show no count when nothing is selected.** Never show `(0)`. A zero tells the user nothing they cannot already see, and it makes an inactive button look as if something is selected. Add the count with the first selection, and remove it with the last.

**Label a toggle button with its current state.** "Follow" becomes "Following" after the user follows.

**While a submit runs, show the disabled look with an animated icon.** `recursica-skill-forms` requires the submit button to show a disabled, loading state. Build it from the parts above: `icon-only` or `icon-label` content, the `disabled` state, and an animated icon. Keep the button the same size and in the same place. If it moves or resizes, it is no longer under the user's pointer.

**Never use `small` to fit more buttons.** Too many actions in a row is a structural problem. See `recursica-skill-system-conventions`.

**Explain every disabled button in text nearby.** A disabled button alone does not tell the user why it is disabled. If the user has no permission for the action, hide the button instead. See `recursica-skill-navigation`.

## Accessibility

This component also follows the accessibility baseline in `recursica-skill-system-conventions`. Only what is specific to it is listed here.

The component provides the focus ring and activation by click and keyboard. The application must provide everything below.

### Screen readers

- **Give every button an accessible name.** Set one explicitly on an `icon-only` button, because a screen reader does not read the icon. A button with no name is read only as "button".
- **The accessible name should match the visible label.** Where the two differ, the name must still contain the label. A voice-control user presses a button by saying its label.
- **Name the object in a row or list action.** A table with "Delete" in every row gives thirteen identical announcements. Put the object in the name, as in "Delete invoice 1043", or give the row that context in code.
- **Update the accessible name when a toggle button's label changes.** A name that is out of date after activation is worse than no name.
- **Spell out the count in the accessible name.** The label shows `Apply status (102)`, and the screen reader says "Apply status to 102 items." A bare number after a label, as in "Apply status 102", is unclear when heard. It could be a quantity, an ID, or part of the name.
- **The count is the one approved case where the name and the label differ.** It still follows the rule above, because the name contains the label. A voice-control user can still say "Apply status".
- **Update the name as the count changes.** With nothing selected, the name is `Apply status`, with no count. Do not announce every increase while the user selects. The name must be correct by the time the user reaches the button.
- **Use a real `button` element**, never a `div` or a `span` with a click handler. Only a real button is announced as a button and responds to Enter and Space without extra code.
- **Put the meaning in the name, not only in the icon.** A screen reader announces the name of an icon-only button and nothing about its icon. `recursica-skill-system-conventions` requires meaning in more than one signal.
- **Mark a running button as busy, and hide its animated icon from screen readers.** The animation is visual only. Without the busy state, a screen reader user hears nothing and presses again.
- **Keep the accessible name while the button is busy**, or change it to something useful, such as "Saving". Never leave the name empty.

### Keyboard and non-mouse navigation

- **Enter and Space both press a button.** Do not intercept, remap, or block either key.
- **Each button is a tab stop (a place the Tab key lands), in the same order as on screen.** A keyboard user must reach the primary action without tabbing through the whole page.
- **Never show anything the user needs only on hover.** Keyboard and touch users cannot reach a row action that appears on hover. Show every action, or put it in a menu the user can reach.
- **When a button opens a modal or a menu, move focus into it.** When the modal or menu closes, return focus to the button. If focus goes to the top of the page, a keyboard user has to tab through the whole page to get back.
- **Otherwise, leave focus on the button after it is pressed.** The user can then press it again.
- **Keep a running button in the tab order.** A disabled control leaves the tab order, and focus falls back to the top of the page. Show the disabled look without removing the button from the tab order, or move focus to the next thing the user needs.
- **The animated icon respects a reduced-motion preference** (a setting that asks for less animation).

## Set by the component

The component sets these for every style, size, and content type. Do not set or override them:

- Height, horizontal and vertical padding, `border-size`, `border-radius`.
- Icon size and the gap between the icon and the label.
- Type styling, letter case, and text alignment.
- All colors, for every style and layer, including hover, active, focus, and disabled.
- Elevation.

## Load these too

- `recursica-skill-buttons-links` — button versus link, label copy, hierarchy and placement, confirming destructive actions, undo, toggles, row and bulk actions, and buttons that open a modal.
- `recursica-skill-forms` — submit and cancel behavior, save mode, and where the footer sits.
- `recursica-skill-system-conventions` — meaning in more than one signal, and fixing the structure instead of shrinking things to fit.

## Uncovered — ask, do not invent

- **When to use `small`.** No rule says which surfaces use it.
- **Full-width buttons.** No axis supports them, and no rule says whether they are ever allowed, or where.
- **The icon for a running button.** The parts of the running state are settled. The icon, and whether its animation is defined anywhere, are not.
- **Split buttons and button groups.** The UI kit has neither. Do not build one.
- **Setting the disabled state.** The UI kit defines `disabled` under each style. Nobody has confirmed that the adapter exposes it as a prop. Check the component's props, or ask, before relying on it.

## Pre-flight checklist

- [ ] No button navigates.
- [ ] Every label is a verb and its object, and makes sense on its own.
- [ ] Any count is in parentheses after a label that does not change, and there is no count at zero.
- [ ] The accessible name spells out the count, as in "Apply status to 102 items", while the label shows it in parentheses.
- [ ] The surface has exactly one `solid` button.
- [ ] Every `icon-only` button has a tooltip and an accessible name.
- [ ] Every button is a real `button` element, is in the tab order, and works with Enter and Space.
- [ ] No action appears only on hover.
- [ ] Every row action names its object, or gets it from the row.
- [ ] Focus returns to the button when a modal or menu it opened closes.
- [ ] A running button shows the disabled look with an animated icon, with no spinner beside it, no new label, and no new state. It does not move or resize.
- [ ] A running button is marked busy, keeps its name, stays in the tab order, and respects reduced motion.
- [ ] Every variant, size, and state is in the inventory above, and there is no destructive style.
- [ ] Styling, including the focus ring, comes from the component.
- [ ] Every disabled button has its reason in text nearby. Actions the user has no permission for are hidden, not disabled.
- [ ] Uncovered items were asked about, not decided: when to use `small`, full-width buttons, the icon for a running button, split buttons and button groups, and setting the disabled state.
