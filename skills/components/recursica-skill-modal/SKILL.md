---
name: recursica-skill-modal
description: Rules for the Recursica modal — when interrupting the user is justified, triggers and history, confirmations, footer buttons, never a modal from a modal, and focus trapping and return. Use for dialogs, confirmations, and blocking overlays. Not for a panel, drawer or side sheet — see recursica-skill-panel; not for brief feedback — see recursica-skill-toast.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Modal

A modal blocks the page until the user makes one decision or finishes one short task. Then the modal closes.

## When to use a modal

- **The task is short and self-contained, and the user must finish or give up the task** before going on with other work.
- **The action cannot be undone, is massively destructive, and is hard to recreate.** Only an action of this kind justifies a confirmation.
- **The user must acknowledge a system event** before work can continue.

## When not to use a modal

| Situation                                                | Use instead                                                                              |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| The user needs the content under the modal while working | A panel, or editing in place on the page. See `recursica-skill-panel`.                   |
| The action can be undone                                 | Do the action, and offer undo. See `recursica-skill-buttons-links`.                      |
| The message confirms a success                           | A toast. See `recursica-skill-toast`.                                                    |
| The task is long, has several steps, or is a big form    | A page. A form inside a modal that scrolls belongs on a separate route.                  |
| The content is a location the user can link to           | A page, unless the content is a modal built on purpose for linking. See the rules below. |
| Another modal is already open                            | Do not open a second modal or use an alternative from this table. Restructure the flow.  |

**The main misuse of a modal to watch for is a routine confirmation.** Asking "Are you sure?" about an action that can be undone teaches the user to dismiss confirmations without reading each confirmation. The user then dismisses the one confirmation that comes before a dangerous action.

## Variants

**Use only the modal variants and options that the Recursica MCP server lists for the project.** A designer can add variants and options in Theme Forge, so each project can differ. Get the list with the server's `recursica_get_component_doc` tool, and use the names the code uses. Never invent a variant or an option.

The rules below describe each part and option by role. The names in the standard UI kit (the unchanged UI kit in the official Recursica release) are examples only.

- **A modal has a header, a content area and a footer.** A scroll divider appears when the content area scrolls.
- **Only the design-system website shows the modal's structure as a title, a content slot, a divider, and a footer.**
- **If the project has a size variant, use the project's size variant.** Otherwise, never set a size on a modal. The theme limits how small and how large a modal can be. Content that does not fit inside the modal's size limits does not belong in a modal.
- **If the project has a severity or destructive variant, use that severity or destructive variant.** Otherwise, a dangerous confirmation looks like any other modal, and the modal's text states the danger.

## Rules

**Open a modal with a button.** The user never navigates to a modal, and opening a modal creates no browser history entry. The one exception is a modal built on purpose for linking, with a URL the user can share. A modal built for linking is a location, so the modal gets a route and a link that opens the modal. Add the route and the link on purpose. `recursica-skill-navigation` sets this rule.

**In a confirmation modal, use the primary style for the primary action button and the secondary style for the cancel button.** In the standard UI kit, the primary style is `solid`. Put both buttons at the bottom right of the modal. The label of the primary action button says what will happen, as in "Delete project", never "Yes" or "OK".

**The title of a modal states the decision, not the name of the component.** Write "Delete this project?", not "Confirm".

**Never open a modal from another modal.** A modal puts the user in a mode, and the user never enters a second mode inside the first mode. Stacked modals leave the user with no idea where the user is in the task, or what closing a modal will do. Two scrims must never darken the page at once.

**The one exception to the ban on stacked modals is a shared confirmation modal that replaces the open modal.** A shared confirmation modal, used across the application, may appear after an action finishes inside a first modal. The confirmation modal appears in place of the first modal, and the first modal closes as the confirmation modal appears. The confirmation modal never appears on top of the first modal. The exception is not ideal. The exception exists because secondary modals get reused. `recursica-skill-panels-modals` sets this rule.

**Never put a form in a card inside a modal.** Do not wrap the content of the modal in a card either. The modal itself is the container for the content. See `recursica-skill-card`.

**A modal that scrolls is a warning sign.** The scroll divider is for content that sometimes runs long. The scroll divider does not make a whole page acceptable inside a modal.

**Closing a modal must be possible and obvious.** Give the modal a cancel action in the footer, and make the Escape key close the modal. Do not build a modal that the user can leave only by finishing the task, unless the state in the modal cannot be abandoned.

## Accessibility

The rules below add to the accessibility baseline in `recursica-skill-system-conventions`, including the focus ring, which every Recursica component follows.

Accessibility failures are more serious in a modal than in any other component. When focus handling is wrong, a keyboard user or a screen reader user is either trapped, or is reading a page the user cannot see. Most of the rules below are behavior to build and test, not styling.

### Screen readers

- **Announce the modal as a dialog, and mark the dialog as modal.** Assistive technology then stays inside the modal and does not read the page behind the modal.
- **The modal's title is the modal's accessible name** (the name a screen reader reads out for a control). Connect the title to the dialog. Do not leave the dialog without a name, and do not name the dialog "Dialog".
- **Every element behind the modal must be inert**, so that no user can reach, read, or tab to the page behind the modal. A screen reader user who moves into the page behind the modal has no way to know that the user has left the dialog.
- **A screen reader must announce the content of the modal when the modal opens.** Moving focus inside the modal makes the screen reader announce the content. Do not rely on how the modal looks to show that an event happened.
- **A destructive confirmation must say in words that the action is destructive.** Color and icons tell a screen reader nothing. `recursica-skill-system-conventions` requires a second channel (color, shape, position or text, each a separate signal). When the project has no severity variant, the text is the only second channel.
- **Give a close control a real name**, such as "Close", or better, the name of what the close control closes. An icon-only close button with no label is announced as nothing.

### Keyboard and non-mouse navigation

- **Move focus into the modal when the modal opens.** Put focus on the first meaningful element: the first field, or the modal container. Put focus on the close button only when no other element can take focus. Never leave focus on the button or element that opened the modal, behind the overlay.
- **Trap focus inside the modal while the modal is open.** Focus stays inside the modal until the modal closes. Tab and Shift-Tab cycle through the controls in the modal and never reach the page behind the modal.
- **Escape closes the modal and does the same as the cancel action.** Escape never saves.
- **Return focus to the element that opened the modal when the modal closes.** Teams skip returning focus more often than any other step. Without returned focus, the user lands at the top of the page.
- **Every control in the modal can be reached by keyboard, in visual order**, including the footer buttons and the close control.
- **The page behind the modal must not scroll**, and no element behind the modal may take focus.
- **Never make closing the modal pointer-only.** A click on the overlay may close the modal, but Escape and the cancel action must both work.

## Styling set by tokens

**Never set or override the modal's styling.** The theme sets every visual property of the modal. Do not add extra containers or spacers to change the modal's look. If the design needs a look the theme does not give, report the missing look as a gap in the design system. See `recursica-skill-design-router`.

Never restyle the overlay behind the modal. Never change when the scroll divider appears.

## Related skills

- `recursica-skill-panels-modals` — the design-rules skill that sets the modal rules: choosing a modal, a panel, or a page, why mode is the only real difference among the three, the ban on stacking modals, and protecting unsaved changes.
- `recursica-skill-buttons-links` — the controls that open a modal, confirming destructive actions, undo, and the order of importance of footer buttons.
- `recursica-skill-navigation` — routes and browser history, including the exception for a modal built on purpose for linking.
- `recursica-skill-forms` — the save mode and validation of any form inside the modal.
- `recursica-skill-system-conventions` — the accessibility baseline every component follows.

### Only if used on the same screen

- `recursica-skill-card` — why no card wraps the content of the modal.

## Open questions

- **Whether clicking the overlay closes the modal.** No rule says either way.
- **A loading state inside a modal**, while an action is still running. Ask only when the project has no loading state.
- **Whether a modal that cannot be closed is ever allowed**, such as a forced acknowledgment with no cancel.
- **Confirming inside a modal.** No rule says how to confirm a destructive action from inside a modal, given the ban on stacking modals.

## Pre-flight checklist

- [ ] Blocking the page is justified, and the task is short and self-contained.
- [ ] No action that can be undone asks for confirmation. Each action that can be undone offers undo instead.
- [ ] Every variant and option on the modal is one the Recursica MCP server lists for the project. No size, type, or severity variant is set unless the project has one, and no variant or option is invented.
- [ ] A button opens the modal, with no browser history entry, unless the modal is built on purpose for linking and has a route.
- [ ] The title states the decision, and the label of the primary action says what will happen.
- [ ] No modal opens another modal on top of the first modal, and no two scrims are ever visible at once. A reused confirmation modal replaces the open modal instead of stacking on the open modal.
- [ ] No card wraps the content of the modal.
- [ ] The dialog is announced as modal and named by the modal's title, and every element behind the modal is inert.
- [ ] Focus moves into the modal when the modal opens, stays trapped while the modal is open, and returns to the element that opened the modal when the modal closes.
- [ ] Escape closes the modal and acts as cancel, and closing the modal is never pointer-only.
- [ ] The close control has a real accessible name, and the focus ring is intact.
- [ ] The destructive consequence is stated in words, not shown by color.
- [ ] No styling is set or overridden on the modal, and no container or spacer is added to change the modal's look.
- [ ] The overlay behind the modal is not restyled.
- [ ] Open questions were asked about, not decided: whether clicking the overlay closes the modal, a loading state inside a modal, whether a modal that cannot be closed is allowed, and confirming inside a modal.
