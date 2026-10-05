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
- **The action cannot be undone, is massively destructive, and is hard to recreate.** Only an action like this justifies a confirmation.
- **The user must acknowledge a system event** before work can continue.

## When not to use a modal

| Situation                                                | Use instead                                                                              |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| The user needs the content under the modal while working | A panel, or editing in place on the page. See `recursica-skill-panel`.                   |
| The action can be undone                                 | Do the action, and offer undo. See `recursica-skill-buttons-links`.                      |
| The message confirms a success                           | A toast. See `recursica-skill-toast`.                                                    |
| The task is long, has several steps, or is a big form    | A page. A form inside a modal that scrolls belongs on a separate route.                  |
| The content is a location the user can link to           | A page, unless the content is a modal built on purpose for linking. See the rules below. |
| Another modal is already open                            | No second modal and no alternative from this table. Restructure the flow.                |

**Routine confirmation is the main misuse of a modal to watch for.** Asking "Are you sure?" about an action that can be undone teaches the user to dismiss confirmations without reading the confirmation. The user then dismisses the one confirmation that comes before a dangerous action.

## Variants

**Use only the modal variants and options that the Recursica MCP server lists for the project.** A designer can add variants and options in Theme Forge, so each project can differ. Get the list with the server's `recursica_get_component_doc` tool, and use the names the code uses. Never invent a variant or an option.

The rules below describe each part and option by role. The names in the standard UI kit (the unchanged UI kit in the official Recursica release) are examples only.

- **Parts.** The modal component provides a header, a content area, a footer, a divider that appears when the content scrolls, and a gap between the buttons in the footer.
- **Structure on the website.** Only the design-system website shows the modal's structure as a title, a content slot, a divider, and a footer.
- **No variants in the standard UI kit.** The standard UI kit has no size, type, or severity variant on the modal, and every property of the modal is fixed. If the project adds a variant in Theme Forge, use the project's variant.
- **No size variant in the standard UI kit.** The standard UI kit has no small, medium, large, or full-screen modal. If the project adds a size variant in Theme Forge, use the project's size variant. Otherwise, never set a size on a modal. Tokens set the minimum and maximum width and height of the modal. Content that does not fit inside the minimum and maximum width and height does not belong in a modal.
- **No severity or destructive variant in the standard UI kit.** If the project adds a severity or destructive variant in Theme Forge, use the project's variant. Otherwise, a dangerous confirmation looks like any other modal, and the modal's text states the danger.

## Rules

**Open a modal with a button.** The user never navigates to a modal, and opening a modal creates no browser history entry. The one exception is a modal built on purpose for linking, with a URL the user can share. A modal built for linking is a location, so the modal gets a route and a link that opens the modal, both on purpose. `recursica-skill-navigation` sets this rule.

**In a confirmation, use the primary style for the primary action and the secondary style for cancel.** In the standard UI kit, the primary style is `solid`. Put both buttons at the bottom right of the modal. The label of the primary action says what will happen, as in "Delete project", never "Yes" or "OK".

**The title states the decision, not the name of the component.** Write "Delete this project?", not "Confirm".

**Never open a modal from another modal.** A modal puts the user in a mode, and the user never enters a second mode inside the first mode. Stacked modals leave the user with no idea where in the task the user is, or what closing a modal will do. Two scrims must never darken the page at once.

**The one exception replaces the open modal instead of stacking a second modal on top.** A shared confirmation modal, used across the application, may appear after an action finishes inside another modal. The confirmation modal appears in place of the first modal, and the first modal closes as the confirmation modal appears. The confirmation modal never appears on top of the first modal. The exception is not ideal. The exception exists because secondary modals get reused. `recursica-skill-panels-modals` sets this rule.

**Never put a form in a card inside a modal.** Do not wrap the content of the modal in a card either. The modal is the boundary of the content. See `recursica-skill-card`.

**A modal that scrolls is a warning sign.** The scroll divider is for content that sometimes runs long. The scroll divider does not make a whole page acceptable inside a modal.

**Closing a modal must be possible and obvious**, with a cancel action in the footer and with the Escape key. Do not build a modal that the user can leave only by finishing the task, unless the state in the modal cannot be abandoned.

## Accessibility

The rules below add to the accessibility baseline in `recursica-skill-system-conventions`, including the focus ring, which every Recursica component follows.

Accessibility failures are more serious in a modal than in any other component. When focus handling is wrong, a keyboard user or a screen reader user is either trapped, or is reading a page the user cannot see. Most of the rules below are behavior to build and test, not styling.

### Screen readers

- **Announce the modal as a dialog, and mark the dialog as modal.** Assistive technology then stays inside the modal and does not read the page behind the modal.
- **The modal's title is the modal's accessible name** (the name a screen reader reads out for a control). Connect the title to the dialog. Do not leave the dialog without a name, and do not name the dialog "Dialog".
- **Every element behind the modal must be inert**, so that no user can reach, read, or tab to the page behind the modal. A screen reader user who wanders into the page behind the modal has no way to know that the user has left the dialog.
- **A screen reader must announce the content of the modal when the modal opens.** Moving focus inside the modal makes the screen reader announce the content. Do not rely on how the modal looks to show that an event happened.
- **A destructive confirmation must say in words that the action is destructive.** Color and icons tell a screen reader nothing. `recursica-skill-system-conventions` requires a second channel (color, shape, position or text, each a separate signal). With no severity variant, the text is the only second channel.
- **Give the close control a real name**, such as "Close", or better, the name of what the close control closes. An icon-only close button with no label is announced as nothing.

### Keyboard and non-mouse navigation

- **Move focus into the modal when the modal opens.** Put focus on the first meaningful element: the first field, or the modal container. Put focus on the close button only when no other element can take focus. Never leave focus on the button or element that opened the modal, behind the overlay.
- **Trap focus inside the modal while the modal is open.** Focus stays inside the modal until the modal closes. Tab and Shift-Tab cycle through the modal and never reach the page behind the modal.
- **Escape closes the modal and does the same as the cancel action.** Escape never saves.
- **Return focus to the element that opened the modal when the modal closes.** Teams skip this step more often than any other step. Skipping the step drops the user at the top of the page.
- **Every control in the modal can be reached by keyboard, in visual order**, including the footer buttons and the close control.
- **The page behind the modal must not scroll**, and no element behind the modal may take focus.
- **Never make closing the modal pointer-only.** A click on the overlay may close the modal, but Escape and the cancel action must both work.

## Styling set by tokens

**Do not set or override the modal properties below.** The modal component sets each property.

- `min-width`, `max-width`, `min-height`, `max-height`.
- `header-footer-horizontal-padding`, `header-footer-vertical-padding`, `content-horizontal-padding`, `content-vertical-padding`.
- `border-size`, `border-radius`, `elevation`, `colors`, and the overlay treatment.
- `scroll-divider-size` and when the divider appears.
- `button-gap` in the footer.
- `header-style` and `content-style` type treatment.

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
- **A loading state inside a modal**, while an action is still running. The standard UI kit has no loading state on the modal. Ask only when the project has no loading state.
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
- [ ] Padding, size, and overlay styling come from the modal component.
- [ ] Open questions were asked about, not decided: whether clicking the overlay closes the modal, a loading state inside a modal, whether a modal that cannot be closed is allowed, and confirming inside a modal.
