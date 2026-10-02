---
name: recursica-skill-modal
description: Rules for the Recursica modal — when interrupting the user is justified, triggers and history, confirmations, footer buttons, never a modal from a modal, and focus trapping and return. Use for dialogs, confirmations, and blocking overlays. Not for a side surface — see recursica-skill-panel; not for brief feedback — see recursica-skill-toast.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Modal

A modal blocks the page to get one decision or one short task done, then closes.

## Use it when

- **The task is short, self-contained, and must be finished or given up** before the user carries on.
- **The action cannot be undone, is massively destructive, and is hard to recreate** — the only case that justifies a confirmation.
- **The user must acknowledge a system event** before work can continue.

## Do not use it when

| Instead of a modal                                    | Use                                                                         |
| ----------------------------------------------------- | --------------------------------------------------------------------------- |
| The user needs the content underneath while working   | `recursica-skill-panel`, or editing in place on the page                    |
| The action can be undone                              | Do it, and offer undo — see `recursica-skill-buttons-links`                 |
| Confirming that something succeeded                   | `recursica-skill-toast`                                                     |
| The task is long, has several steps, or is a big form | A page. A form in a modal that scrolls belongs on its own route             |
| The destination is a location the user can link to    | A page — unless it is a modal deliberately built to be linked to, see below |
| Another modal is already open                         | Neither. Restructure the flow                                               |

**Routine confirmation is the misuse to watch for.** Asking "Are you sure?" about an action that can be undone trains the user to dismiss confirmations without reading. The user then dismisses the one confirmation that guards a dangerous action.

## What exists

Taken from the UI kit (the token file, `recursica_ui-kit.json`, that says which variants and states each component has) → `ui-kit.components.modal`. **The modal has no variant axes (the properties a component varies on, such as size and style; Figma calls them variant properties) at all** — no sizes, no types, no severity variants. Everything is a fixed property.

**What the component provides:** a header, a content area, a footer, a divider that appears when the content scrolls, and a gap between the buttons in the footer. Its `min-width`, `max-width`, `min-height`, and `max-height` are set by tokens.

**Do not pass a size.** There is no small, medium, large, or full-screen modal. If the content does not fit inside the limits the tokens set, it is not modal content.

**There is no severity or destructive variant.** A dangerous confirmation looks like any other modal. Its text states the danger.

**Structure shown only on the design-system website:** a title, a content slot, a divider, and a footer.

## Rules for using it

**A button opens a modal; the user does not navigate to it, and it creates no browser history entry.** The one exception is a modal deliberately built to be linked to, with a URL that can be shared. That one gets a route and a link trigger together, on purpose, because it is a location. Owned by `recursica-skill-navigation`.

**In a confirmation, the primary action is the `solid` button, and cancel is the secondary**, at the bottom right. The primary action's label says what will happen — "Delete project" — never "Yes" or "OK".

**The title states the decision**, not the name of the component. "Delete this project?" rather than "Confirm".

**Never open a modal from a modal.** Once the user is in a mode, they do not go into modes within it. Stacked modals leave them with no idea where they are, or what dismissing will do. Two scrims darkening the page at once must never happen.

**The one exception is replacing, not stacking.** A shared confirmation modal used across the application may appear after an action finishes inside another modal — but it appears in place of the first one, which goes away as the new one appears. Never on top. This is not ideal. It exists because secondary modals get reused. Owned by `recursica-skill-panels-modals`.

**Never put a form in a card inside a modal**, and do not wrap the modal's own content in a card. The modal is the boundary; see `recursica-skill-card`.

**A modal that scrolls is a warning sign.** The scroll divider exists for content that sometimes runs long — not as permission to put a whole page inside a dialog.

**It must be possible, and obvious, to close it** — with a cancel action in the footer, and with Escape. Do not build a modal the user can only leave by finishing it, unless the state cannot be abandoned.

## Accessibility

This component also follows the accessibility baseline in `recursica-skill-system-conventions`, including the focus ring. Only what is specific to it is listed here.

A modal is the component where accessibility failures are most serious. Get the focus handling wrong, and a keyboard or screen reader user is either trapped, or reading a page they cannot see. Most of this is behavior to build and test, not styling.

### Screen readers

- **The modal must be announced as a dialog, and marked as modal**, so assistive technology stays inside it, and does not read the page behind.
- **The modal's accessible name (the name a screen reader reads out for a control) is its title.** Connect the two; do not leave the dialog unnamed, and do not name it "Dialog".
- **Everything behind the modal must be inert** — impossible to reach, read, or tab to. A screen reader user who wanders into the page underneath has no way to know they have left the dialog.
- **The content must be announced when the modal opens**, which follows from putting focus inside it. Do not rely on how it looks to show that something happened.
- **A destructive confirmation must say in words that the action is destructive.** With no severity variant, color and icons tell a screen reader nothing — `recursica-skill-system-conventions` requires a second channel (color, shape, position or text, each a separate signal), and here the text is the only one.
- **The close control needs a real name** — "Close", or better, what it closes. An unlabeled icon-only close button is announced as nothing.

### Keyboard and non-mouse navigation

- **Focus moves into the modal when it opens.** Put it on the first meaningful element — the first field, or the modal container itself. Do not put it on the close button unless nothing else can receive focus, and never leave it on the trigger behind the overlay.
- **Focus is trapped while the modal is open** — kept inside it until it closes. Tab and Shift-Tab cycle within it, and never reach the page behind.
- **Escape closes the modal**, and does the same thing as cancel — it never saves.
- **Focus returns to the element that opened the modal** when it closes. This is the step most often skipped, and skipping it drops the user at the top of the document.
- **Every control in the modal can be reached by keyboard, in visual order**, including the footer buttons and the close control.
- **The page behind must not scroll**, and no element behind it may take focus.
- **Never make closing it pointer-only.** A click on the overlay may close it, but Escape and the cancel action must both work.

## Set by the component

Do not set or override any of these. The component sets them:

- `min-width`, `max-width`, `min-height`, `max-height`.
- `header-footer-horizontal-padding`, `header-footer-vertical-padding`, `content-horizontal-padding`, `content-vertical-padding`.
- `border-size`, `border-radius`, `elevation`, `colors`, and the overlay treatment.
- `scroll-divider-size` and when the divider appears.
- `button-gap` in the footer.
- `header-style` and `content-style` type treatment.

## Load these too

- `recursica-skill-panels-modals` — the owning design-rules skill: modal vs. panel vs. page, why mode is the only real difference, the prohibition on stacking, and unsaved-change protection.
- `recursica-skill-buttons-links` — modal triggers, destructive-action confirmation, undo, footer button hierarchy.
- `recursica-skill-navigation` — routing and browser history, including the deep-linkable modal exception.
- `recursica-skill-forms` — save mode and validation for any form the modal contains.
- `recursica-skill-system-conventions` — the accessibility baseline every component follows.

### Only if the screen also uses it

- `recursica-skill-card` — why the modal's content is not wrapped in a card.

## Uncovered — ask, do not invent

- **Whether clicking the overlay closes the modal.** Not stated either way.
- **A loading state inside a modal**, while an action is in flight. There is no such state on the component.
- **Whether a modal that cannot be closed is ever allowed** — a forced acknowledgment, with no cancel.
- **Confirming inside a modal** — confirming a destructive action from inside a modal, given the ban on stacking.

## Pre-flight checklist

- [ ] Blocking the page is justified, and the task is short and self-contained.
- [ ] There is no confirmation on an action that can be undone. Those actions offer undo instead.
- [ ] No size, type, or severity variant is set — none exist.
- [ ] A button triggers it, with no history entry — unless it is a modal deliberately built to be linked to, with a route.
- [ ] The title states the decision, and the primary action's label says what will happen.
- [ ] No modal opens another modal on top of it, and no two scrims are ever visible at once. Any reused confirmation replaces the open modal instead of stacking on it.
- [ ] No card wraps the content.
- [ ] The dialog is announced as modal and named by its title, and everything behind it is inert.
- [ ] Focus moves into the modal when it opens, is trapped while it is open, and returns to the trigger when it closes.
- [ ] Escape closes it and acts as cancel, and closing it is never pointer-only.
- [ ] The close control has a real accessible name, and the focus ring is intact.
- [ ] The destructive consequence is stated in words, not carried by color.
- [ ] Padding, size, and overlay styling come from the component.
- [ ] Uncovered items were asked about, not decided: whether clicking the overlay closes the modal, a loading state inside a modal, whether a modal that cannot be closed is allowed, and confirming inside a modal.
