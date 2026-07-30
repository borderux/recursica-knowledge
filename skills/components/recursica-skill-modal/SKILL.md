---
name: recursica-skill-modal
description: How to use the Recursica modal correctly — when interrupting the user is justified and when a panel, page, inline edit, or toast is the right answer instead, what the component provides, how a modal is triggered and why it creates no history entry, when a confirmation is warranted, footer button hierarchy, the prohibition on modals opening modals, and the screen-reader and keyboard requirements including focus trapping and return. Use whenever adding, reviewing, or refactoring a modal, dialog, confirmation, or any overlay that blocks the page. Trigger on "modal", "dialog", "popup", "confirmation", "are you sure", "overlay", "focus trap", "escape to close", "screen reader", "tab order", or a request to interrupt the user for a decision. Do NOT use for a non-blocking side surface — that is recursica-skill-panel. Do NOT use for transient feedback — that is recursica-skill-toast. Do NOT use for destructive-action policy or undo — that is recursica-skill-buttons-links.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Modal

A modal blocks the page to get one decision or one short task done, then gets out of the way.

## Use it when

- **The task is short, self-contained, and must be finished or abandoned** before the user carries on.
- **The action is irreversible, massively destructive, and hard to recreate** — the only case that justifies a confirmation.
- **A system event must be acknowledged** before work can resume.

## Do not use it when

| Instead of a modal                                  | Use                                                             |
| --------------------------------------------------- | --------------------------------------------------------------- |
| The user needs the content underneath while working | `recursica-skill-panel`, or an inline edit                      |
| The action is reversible                            | Do it, and offer undo — see `recursica-skill-buttons-links`     |
| Confirming that something succeeded                 | `recursica-skill-toast`                                         |
| The task is long, multi-step, or a substantial form | A page. A form in a modal that scrolls belongs on its own route |
| The destination is a location the user can link to  | A page — unless it is a deliberate deep-linkable modal, below   |
| Another modal is already open                       | Neither. Restructure the flow                                   |

**Routine confirmation is the misuse to watch for.** "Are you sure?" on a reversible action trains the user to dismiss without reading, which is exactly what makes the one genuinely dangerous confirmation ineffective.

## What exists

Taken from `recursica_ui-kit.json` → `ui-kit.components.modal`. **The modal has no variant axes at all** — no sizes, no types, no severity variants. Everything is a fixed property.

**What the component provides:** a header, a content area, a footer, a scroll divider that appears when the content scrolls, and a button gap in the footer. Its `min-width`, `max-width`, `min-height`, and `max-height` are set by tokens.

**Do not pass a size.** There is no small, medium, large, or full-screen modal. If the content does not fit inside the token-defined bounds, it is not modal content.

**There is no severity or destructive variant.** A dangerous confirmation looks like any other modal; the words carry the weight.

**Structure documented outside the token inventory:** a title, a content slot, a divider, and a footer.

## Rules for using it

**A modal is invoked by a button, not navigated to, and creates no browser history entry.** The single exception is a deliberately deep-linkable modal with a shareable URL — that one gets a route and a link trigger together, on purpose, because it is a location. Owned by `recursica-skill-navigation`.

**In a confirmation, the primary action is the `solid` button and cancel is the secondary**, bottom-right. The primary action's label states what will happen — "Delete project" — never "Yes" or "OK".

**The title states the decision**, not the component. "Delete this project?" rather than "Confirm".

**Never open a modal from a modal.** Stacked modals leave the user with no model of where they are or what dismissing will do.

**Never put a form in a card inside a modal**, and do not wrap the modal's own content in a card. The modal is already the boundary; see `recursica-skill-card`.

**A modal that scrolls is a warning sign.** The scroll divider exists for content that occasionally runs long, not as permission to put a page inside a dialog.

**Dismissal must be possible and obvious** — a cancel action in the footer, and Escape. Do not build a modal the user can only leave by completing it, unless the state genuinely cannot be abandoned.

## Accessibility

A modal is the component where accessibility failures are most severe: get the focus handling wrong and a keyboard or screen reader user is either trapped or reading a page they cannot see. Most of this is behavior you must ensure, not styling.

### Screen readers

- **The modal must be announced as a dialog and marked modal**, so assistive technology confines itself to it and does not read the page behind.
- **The modal's accessible name is its title.** Associate them; do not leave the dialog unnamed, and do not name it "Dialog".
- **Everything behind the modal must be inert** — not reachable, not readable, not tabbable. A screen reader user browsing into the page underneath has no way to know they left the dialog.
- **The content must be announced when the modal opens**, which follows from putting focus inside it. Do not rely on the visual appearance to convey that something happened.
- **A destructive confirmation must read as destructive in words.** With no severity variant, the color and icon carry nothing to a screen reader — `recursica-skill-system-conventions` requires the second channel, and here the text is the only one.
- **The close control needs a real name** — "Close", or better, what it closes. An unlabeled icon-only close button is announced as nothing.

### Keyboard and non-mouse navigation

- **Focus moves into the modal when it opens.** Put it on the first meaningful element — the first field, or the modal container itself. Do not put it on the close button unless nothing else is focusable, and never leave it on the trigger behind the overlay.
- **Focus is trapped while the modal is open.** Tab and Shift-Tab cycle within it and never reach the page behind.
- **Escape closes the modal**, and does the same thing as cancel — it never commits.
- **Focus returns to the element that opened the modal** when it closes. This is the step most often skipped, and skipping it drops the user at the top of the document.
- **Every control in the modal is reachable by keyboard in visual order**, including the footer buttons and the close control.
- **The page behind must not scroll**, and no element behind may take focus.
- **Never make dismissal pointer-only.** A click on the overlay may close it, but Escape and the cancel action must both work.
- **Never suppress the focus ring** inside the modal.

## Not your decision

Do not implement, override, or tune any of these — the component owns them:

- `min-width`, `max-width`, `min-height`, `max-height`.
- `header-footer-horizontal-padding`, `header-footer-vertical-padding`, `content-horizontal-padding`, `content-vertical-padding`.
- `border-size`, `border-radius`, `elevation`, `colors`, and the overlay treatment.
- `scroll-divider-size` and when the divider appears.
- `button-gap` in the footer.
- `header-style` and `content-style` type treatment.

## Load these too

- [`recursica-skill-buttons-links`](../../design-rules/recursica-skill-buttons-links/SKILL.md) — modal triggers, destructive-action confirmation, undo, footer button hierarchy.
- [`recursica-skill-navigation`](../../design-rules/recursica-skill-navigation/SKILL.md) — routing and browser history, including the deep-linkable modal exception.
- [`recursica-skill-forms`](../../design-rules/recursica-skill-forms/SKILL.md) — save mode and validation for any form the modal contains.
- [`recursica-skill-card`](../recursica-skill-card/SKILL.md) — why the modal's content is not wrapped in a card.

## Uncovered — ask, do not invent

- **Whether clicking the overlay dismisses the modal.** Not stated either way.
- **Unsaved-change protection** when the user cancels a modal containing edits.
- **Loading state inside a modal** while an action is in flight. No such state exists on the component.
- **Whether a non-dismissible modal is ever permitted** — a forced acknowledgement with no cancel.
- **Nested confirmation** — confirming a destructive action from inside a modal, given the prohibition on stacking.

## Pre-flight checklist

- [ ] Blocking the page is justified; the task is short and self-contained.
- [ ] No confirmation on a reversible action; reversible actions offer undo instead.
- [ ] No size, type, or severity variant was passed — none exist.
- [ ] Triggered by a button, with no history entry, unless it is a deliberate deep-linkable modal with a route.
- [ ] Title states the decision; the primary action's label states what will happen.
- [ ] No modal opens another modal; no card wraps the content.
- [ ] The dialog is announced as modal and named by its title; everything behind it is inert.
- [ ] Focus moves into the modal on open, is trapped while open, and returns to the trigger on close.
- [ ] Escape closes and behaves as cancel; dismissal is never pointer-only.
- [ ] The close control has a real accessible name; the focus ring is intact.
- [ ] Destructive consequence is stated in words, not carried by color.
- [ ] No component-owned padding, size, or overlay treatment was overridden.
- [ ] Nothing in the uncovered list was invented.
