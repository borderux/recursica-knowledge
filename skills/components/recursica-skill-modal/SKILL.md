---
name: recursica-skill-modal
description: Rules for the Recursica modal — when interrupting the persona is justified, triggers and history, confirmations, footer buttons, never a modal from a modal, and focus trapping and return. Use for dialogs, confirmations, and blocking overlays. Not for a panel, drawer or side sheet — see recursica-skill-panel; not for brief feedback — see recursica-skill-toast.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Modal

A modal blocks the page until the persona makes one decision or finishes one short task. Then the modal closes.

## When to use a modal

- **Use a modal when the persona must finish or give up a short, self-contained task** before doing other work. For example, the persona names a new folder.
- **Use a modal to confirm an action that has all three of these traits:**

  - The action cannot be undone.
  - The action is massively destructive.
  - The action is hard to recreate.

  Only an action with all three traits justifies a confirmation. For example, permanently deleting an account and every file in the account.

- **Use a modal when the persona must acknowledge a system event** before work can continue. For example, the session has expired.

## When not to use a modal

| Situation                                                   | Use instead                                                                                    |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| The persona needs the content under the modal while working | A panel, or editing in place on the page. See `recursica-skill-panel`.                         |
| The action can be undone                                    | Do the action, and offer undo. See `recursica-skill-undo`.                                     |
| The message confirms a success                              | A toast. See `recursica-skill-toast`.                                                          |
| The task is long, has several steps, or is a big form       | A page. A form inside a modal that scrolls belongs on a separate route.                        |
| Another modal is already open                               | Restructure the flow. Do not open a second modal, and do not use another option in this table. |

**Watch for the main misuse of a modal, a routine confirmation.** Asking "Are you sure?" about an action that can be undone teaches the persona to dismiss confirmations without reading each confirmation. The persona then dismisses the one confirmation that comes before a dangerous action.

## Variants

**Use only the modal variants and options that the Recursica MCP server lists for the theme (the design a designer sets in Theme Forge: the token values, the components, and each component's variants, states and sizes).** A designer can add variants and options in Theme Forge, so each theme can differ. Get the list with the server's `recursica_get_component_doc` tool, and use the names the code uses. Never invent a variant or an option.

The rules below describe each part and option by role. The names in the standard UI kit (the unchanged UI kit in the official Recursica release) are examples only.

- **Parts.** A modal has three parts: a header, a content area and a footer. A scroll divider appears when the content area scrolls.
  - Only the design-system website shows the parts as a title, a content slot, a divider and a footer.
- **Size.** The theme limits how small and how large a modal can be.
  - If the theme has a size variant, use the size variant.
  - Otherwise, never set a size on a modal.
  - Content that does not fit inside the modal's size limits does not belong in a modal.
- **Danger.** If the theme has a severity or destructive variant, use that variant.
  - Otherwise, a dangerous confirmation looks like any other modal.
  - The modal's text then states the danger, as in "All 40 files in this folder will be deleted."

## Rules

**Open a modal with a button.** The persona never navigates to a modal. Opening a modal adds no entry to the browser history.

**Give the modal an address whenever possible.** The address opens the page with the modal already open. A confirmation modal, such as "Delete this invoice?", gets no address. `recursica-skill-navigation` sets this rule.

**In a confirmation modal, give the primary action button the primary style and the cancel button the secondary style.** In the standard UI kit, the primary style is `solid`.

- Put both buttons at the bottom right of the modal.
- Label the primary action button with what will happen, as in "Delete project", never "Yes" or "OK".

**Write a modal title that states the decision, not the name of the component.** Write "Delete this project?", not "Confirm".

**Never open a modal from another modal.** Two scrims must never darken the page at once.

A modal puts the persona in a mode. The persona never enters a second mode inside the first mode. With stacked modals, the persona cannot tell where the persona is in the task. The persona also cannot tell what closing a modal will do.

**The one exception to the ban on stacked modals is a shared confirmation modal that replaces the open modal.** A shared confirmation modal is a confirmation modal used across the application.

- The shared confirmation modal may appear after an action finishes inside a first modal.
- The confirmation modal appears in place of the first modal.
- The first modal closes as the confirmation modal appears.
- The confirmation modal never appears on top of the first modal.

The exception is not ideal. The exception exists because secondary modals, such as a shared confirmation modal, get reused. `recursica-skill-panels-modals` sets this rule.

**Never put a form in a card inside a modal.** Do not wrap the content of the modal in a card either. The modal itself is the container for the content. See `recursica-skill-card`.

**Treat a modal that scrolls as a warning sign.** The scroll divider is for content that sometimes runs long, such as a list of files to delete. A whole page inside a modal is still not acceptable, even with the scroll divider.

**Closing a modal must be possible and obvious.**

- Give the modal a cancel action in the footer.
- Make the Escape key close the modal.
- Do not build a modal that the persona can leave only by finishing the task. The one exception is a modal the persona must finish before using the application at all. For example, the persona signs in again after a session ends. Confirm the exception with the user.

## Accessibility

The rules below add to the accessibility baseline in `recursica-skill-design-system-conventions`, including the focus ring, which every Recursica component follows.

**Build and test most of the rules below as behavior, such as where focus goes, not as styling.** Accessibility failures are more serious in a modal than in any other component. Wrong focus handling fails a persona using a keyboard or a screen reader in one of two ways:

- The persona is trapped.
- The persona reads a page the persona cannot see, such as the page behind the modal.

### Screen readers

- **Announce the modal as a dialog, and mark the dialog as modal.** Assistive technology then stays inside the modal and does not read the page behind the modal.
- **Use the modal's title as the modal's accessible name** (the name a screen reader reads out for a control). Connect the title to the dialog. Do not leave the dialog without a name, and do not name the dialog "Dialog".
- **Every element behind the modal must be inert.** Then no persona can reach, read, or tab to the page behind the modal. If the page behind the modal is not inert, a persona using a screen reader can move into the page. The persona then has no way to know the persona has left the dialog.
- **A screen reader must announce the content of the modal when the modal opens.** Moving focus inside the modal makes the screen reader announce the content. Do not rely on how the modal looks to tell the persona that an event happened.
- **A destructive confirmation must say in words that the action is destructive.** Color and icons tell a screen reader nothing. `recursica-skill-design-system-conventions` requires a second channel (color, shape, position or text, each a separate signal). When the theme has no severity variant, the text is the only second channel. An example of the words is "All 40 files in this folder will be deleted."
- **Give a close control a real name**, such as "Close", or better, the name of what the close control closes. An example of the better name is "Close invoice details". A screen reader announces nothing for an icon-only close button with no label.

### Keyboard and non-mouse navigation

- **Move focus into the modal when the modal opens.** Put focus on the first meaningful element, which is the first field or the modal container. Put focus on the close button only when no other element can take focus. Never leave focus on the button or element that opened the modal, behind the overlay.
- **Trap focus inside the modal while the modal is open.** Focus stays inside the modal until the modal closes. Tab and Shift-Tab cycle through the controls in the modal and never reach the page behind the modal.
- **Escape closes the modal and does the same as the cancel action.** Escape never saves.
- **Return focus to the element that opened the modal when the modal closes.** Teams skip returning focus more often than any other step. Without returned focus, the persona lands at the top of the page.
- **Make every control in the modal reachable by keyboard, in visual order.** Include the footer buttons and the close control.
- **The page behind the modal must not scroll**, and no element behind the modal may take focus.
- **Never make pointer input, such as a mouse click or a tap, the only way to close the modal.** A click on the overlay may close the modal. Escape and the cancel action must both work too.

## Styling set by tokens

**Never set or override the modal's styling.** The theme sets every visual property of the modal, such as size, spacing, borders, colors and animation. Do not add extra containers or spacers to change the modal's look. If the theme does not give a look the design needs, report a gap in the design system. See `recursica-skill-design-router`.

Never restyle the overlay behind the modal. Never change when the scroll divider appears.

## Related skills

- `recursica-skill-panels-modals` — the design-rules skill that sets the modal rules:
  - choosing a modal, a panel, or a page
  - why mode is the only real difference among a modal, a panel and a page
  - the ban on stacking modals
  - protecting unsaved changes
- `recursica-skill-buttons-links` — the controls that open a modal, confirming destructive actions, and the order of importance of footer buttons.
- `recursica-skill-undo` — offering an undo instead of a confirmation.
- `recursica-skill-navigation` — routes, addresses and browser history.
- `recursica-skill-forms` — the save mode and validation of any form inside the modal.
- `recursica-skill-design-system-conventions` — the accessibility baseline every component follows.

### Only if used on the same screen

- `recursica-skill-card` — why no card wraps the content of the modal.

## Open questions

- **Whether clicking the overlay closes the modal.** No rule says either way.
- **A loading state inside a modal**, while an action is still running. Confirm with the user only when the theme has no loading state.
- **Confirming inside a modal.** No rule says how to confirm a destructive action from inside a modal, given the ban on stacking modals.

## Pre-flight checklist

- [ ] Blocking the page is justified, and the task is short and self-contained.
- [ ] No action that can be undone asks for confirmation. Each action that can be undone offers undo instead.
- [ ] Every variant and option on the modal is one the Recursica MCP server lists for the theme. No size, type, or severity variant is set unless the theme has one, and no variant or option is invented.
- [ ] A button opens the modal, with no browser history entry. The modal has an address whenever possible, unless the modal is a confirmation.
- [ ] The title states the decision, and the label of the primary action says what will happen.
- [ ] No modal opens another modal on top of the first modal, and no two scrims are ever visible at once. A reused confirmation modal replaces the open modal instead of stacking on the open modal.
- [ ] No card wraps the content of the modal.
- [ ] The dialog is announced as modal and named by the modal's title, and every element behind the modal is inert.
- [ ] Focus moves into the modal when the modal opens, and stays trapped while the modal is open.
- [ ] Focus returns to the element that opened the modal when the modal closes.
- [ ] Escape closes the modal and acts as cancel, and closing the modal is never pointer-only.
- [ ] Every modal has a cancel action. The one exception is a modal the persona must finish before using the application, and the user confirmed that exception.
- [ ] The close control has a real accessible name, and the focus ring is intact.
- [ ] The destructive consequence is stated in words, not shown by color.
- [ ] No styling is set or overridden on the modal.
- [ ] No container or spacer is added to change the modal's look.
- [ ] The overlay behind the modal is not restyled.
- [ ] Open questions were asked about, not decided: whether clicking the overlay closes the modal, a loading state inside a modal, and confirming inside a modal.
