---
name: recursica-skill-panel
description: How to use the Recursica panel correctly — when a non-blocking side surface is justified and when a modal, a page, or an inline edit is the right answer instead, why the panel has no side, size, or width axis, why it creates no history entry, what its header, content, and footer hold, and the screen-reader and keyboard requirements including focus return, Escape, and the decision not to trap focus. Use whenever adding, reviewing, or refactoring a panel, drawer, side sheet, or filter surface. Trigger on "panel", "drawer", "side sheet", "slide-out", "flyout", "filter panel", "details pane", "escape to close", "focus return", "focus trap", "screen reader", "tab order", or a request to show supplementary content without leaving the page. Do NOT use for a surface that blocks the page for one decision — that is recursica-skill-modal. Do NOT use for transient feedback or undo — that is recursica-skill-toast. Do NOT use for routing and history rules — that is recursica-skill-navigation.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Panel

A panel puts supplementary content beside the page without blocking it.

## Use it when

- **The user needs the page underneath while working** — filters, settings, a details view, or an edit of one thing on screen. This is the case a modal cannot serve.
- **Secondary configuration or detail would clutter the main view** but must not obscure it.
- **The content belongs to the current view**, not to a different place in the application.

## Do not use it when

| Instead of a panel                                        | Use                                                                                |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| The task must be finished or abandoned before continuing  | `recursica-skill-modal`                                                            |
| The action is irreversible and needs a confirmation       | `recursica-skill-modal`                                                            |
| Confirming that something succeeded, or offering undo     | `recursica-skill-toast`                                                            |
| A brief alert or a simple acknowledgement                 | `recursica-skill-toast`                                                            |
| The content is a long, multi-part, or substantial form    | A page — and `recursica-skill-stepper` if it is multi-part                         |
| The destination is a location the user can link to        | A page with a route — see `recursica-skill-navigation`                             |
| The functionality is critical and must be found           | The page itself. A panel's contents do not exist until someone opens it            |
| Primary or secondary application navigation               | The app's nav — hiding nav is governed by `recursica-skill-navigation`             |
| Separating repeating peer objects, or "containing" a form | Nothing. See `recursica-skill-card` — a panel is not a card and never contains one |

**Hiding critical content is the misuse to watch for.** A panel trades discoverability for space. That trade is correct for a filter set and wrong for anything a user must act on to finish their work.

## What exists

Taken from `recursica_ui-kit.json` → `ui-kit.components.panel`. **The panel has no variant axes at all** — no sizes, no sides, no widths, no types. Every entry below is a fixed property.

**What the component provides:** a header with a close control (`header-close-gap`), a content area, and a footer with a button gap. `min-width` and `max-width` are token-defined properties, and a `divider-size` exists.

**Do not pass a side or an edge.** There is no left, right, top, or bottom panel in the kit. Which edge a panel appears from is not yours to set — see the uncovered list.

**Do not pass a width or a size.** `min-width` and `max-width` are fixed. There is no narrow, wide, or full-height panel.

**There is no types axis.** A "Standard" and a "Scrollable" panel are documented outside the token inventory; the kit defines only `divider-size`, with nothing that says when the divider appears or which of the two you are building.

**Structurally the panel is the modal minus the blocking.** Same header, content, footer, and close control. The whole difference is that the page behind stays live — which is exactly what changes the accessibility work below.

## Rules for using it

**A panel is invoked by a button, not navigated to, and creates no browser history entry.** `recursica-skill-navigation` states this for modals and panels together: a trigger-invoked surface is not a location. The deep-linkable exception in that skill is written for modals only, so a panel that genuinely needs a shareable URL is a question to raise, not a pattern to copy.

**The header states what the panel is for**, and it is the panel's accessible name. Not "Panel", not "Details" — the object or the function.

**Never wrap the panel's content in a card, and never put a form, a form section, or a single form control in one.** The panel is already the boundary. See `recursica-skill-card`.

**A form in a panel stacks its labels above its fields.** The panel is a narrow container, and `recursica-skill-forms` makes container width — not viewport — the trigger for stacking. Everything else about the form still holds: single column, one field per row.

**Label placement is one decision for the whole form, never per field.** `recursica-skill-forms` allows side-by-side labels or stacked labels and forbids both at the same breakpoint: the container-width test is applied once, to the form, and the answer governs every field in it. A panel is exactly the container that triggers stacking — so **the whole form inside it stacks, not just the fields that feel cramped**, including the short ones that would have fit beside their labels.

**The panel does not get its own save mode.** Whatever the application uses, the panel uses. Field-level saving requires a persistent status message; batch saving shows no status and no dirty indicator. See `recursica-skill-forms`.

**Footer actions follow the house placement:** one primary action, bottom right, its true alternative immediately to the left. Owned by `recursica-skill-buttons-links`.

**Dismissal must be possible and obvious** — the header's close control, and Escape. Do not build a panel the user can only leave by completing it.

**A panel that needs a stepper, or that scrolls indefinitely, is a page.** Multi-step processes and extensive data entry belong on their own route.

**When the panel changes the page behind it** — a filter set that narrows a table — the change on the page is the feedback. Do not add a toast for it.

## Accessibility

**Decide, and state, whether you are building a modal panel or a non-modal one, then build one of them consistently.** Almost every panel accessibility failure is a half-modal: a surface that looks non-blocking, traps focus like a dialog, or hides the page from assistive technology while leaving it clickable. The default here is non-modal — the page behind stays live, readable, and reachable.

### Screen readers

- **The panel's accessible name is its header.** Associate them. An unnamed panel is announced as an anonymous region, and "Panel" is not a name.
- **The role must match the behavior you chose.** A non-modal panel is a named region the user can browse into and out of. A genuinely modal panel is a dialog marked modal, with everything behind it inert — and at that point read `recursica-skill-modal`, because that is what you have built.
- **Never mark a panel modal while the page behind stays interactive.** Assistive technology confines itself to a modal dialog; if the page is still live for a mouse user, the two experiences have diverged.
- **In a non-modal panel, do not hide the page behind from assistive technology.** It is not inert. A screen reader user must be able to read the page and get back into the panel.
- **The panel's content must sit in a sensible reading position in the DOM** — where it appears visually, not appended to the end of the document. Reading order follows visual order.
- **Opening must be perceivable**, which follows from moving focus into the panel. Do not rely on the slide-in animation to convey that anything happened.
- **The close control needs a real name** — "Close filters" rather than an unlabeled icon, which is announced as nothing.
- **Anything the panel changes elsewhere must be announced**, not just re-rendered. A filter that reduces a table to four rows needs that result stated; the visual change is invisible to a screen reader user still inside the panel.

### Keyboard and non-mouse navigation

- **Focus moves into the panel when it opens.** Put it on the first meaningful element — the first field, or the panel container. Do not put it on the close button unless nothing else is focusable, and never leave it on the trigger.
- **Focus returns to the element that opened the panel when it closes.** This is the step most often skipped, and skipping it drops the user at the top of the document.
- **Escape closes the panel**, and closing never commits.
- **Do not trap focus in a non-modal panel.** Tab from the last control in the panel must continue into the page in document order, and Shift-Tab must come back. The page behind is still the user's to reach.
- **Trap focus only if the panel is genuinely modal**, and then the page behind must also be inert and must not scroll. Trapping focus while the page stays live is the worst of both: the mouse can leave, the keyboard cannot.
- **Tab order inside the panel follows visual order** — content, then footer buttons, then the close control where it sits visually — and must not bounce between the panel and the page unpredictably.
- **Never make dismissal pointer-only.** Escape and the close control both work, whatever a click outside does.
- **Nothing needed may appear only on hover**, and **never suppress the focus ring** inside the panel.

## Not your decision

Do not implement, override, or tune any of these — the component owns them:

- `colors`.
- `header-style` and `content-style` type treatment.
- `header-footer-horizontal-padding`, `header-footer-vertical-padding`.
- `header-close-gap` and `footer-button-gap`.
- `content-horizontal-padding`, `content-vertical-padding`.
- `border-size`, `border-radius`, `divider-size`.
- `min-width`, `max-width`, `elevation`.

## Load these too

- [`recursica-skill-modal`](../recursica-skill-modal/SKILL.md) — the blocking alternative, and the focus-trap and inert-background rules a genuinely modal panel inherits.
- [`recursica-skill-navigation`](../../design-rules/recursica-skill-navigation/SKILL.md) — a location is a route; a trigger-invoked panel is not one and gets no history entry.
- [`recursica-skill-forms`](../../design-rules/recursica-skill-forms/SKILL.md) — one label placement per form and the container-width test behind it, single-column layout, validation, and save mode for any form the panel holds.
- [`recursica-skill-buttons-links`](../../design-rules/recursica-skill-buttons-links/SKILL.md) — the trigger is a button, one primary action per surface, footer placement.
- [`recursica-skill-card`](../recursica-skill-card/SKILL.md) — why the panel's content is not wrapped in a card, and why no form goes in one.
- [`recursica-skill-toast`](../recursica-skill-toast/SKILL.md) — transient confirmation and undo, which never belong in a panel.

## Uncovered — ask, do not invent

- **Which edge the panel appears from**, and whether it slides in or expands. No axis defines it.
- **Panel width.** `min-width` and `max-width` are fixed and no size axis exists, so a "wide panel" cannot be built.
- **Whether the panel is modal or non-modal by house default**, and whether an overlay or scrim is ever drawn behind it.
- **Whether clicking outside the panel dismisses it.**
- **When the divider appears.** "Standard" and "Scrollable" types are documented outside the token inventory, with no token behind either and no types axis — the kit defines only `divider-size`. Do not rely on this without asking.
- **Whether a panel may ever be routed and deep-linkable.** `recursica-skill-navigation` states that exception for modals only.
- **Unsaved-change protection** when the user closes a panel containing edits.
- **Whether a panel may open a modal, or a second panel**, and whether more than one panel may be open at once. The prohibition on stacking is stated for modals, not panels.
- **Loading state inside a panel** while its content is fetched. No such state exists on the component.

## Pre-flight checklist

- [ ] The page underneath is genuinely needed while the panel is open; nothing critical was hidden inside it.
- [ ] Anything that must be finished or abandoned first went to a modal; transient feedback went to a toast.
- [ ] No side, width, size, or type variant was passed — none exist.
- [ ] Triggered by a button, with no route and no browser history entry.
- [ ] The header names the panel's purpose and is wired up as its accessible name.
- [ ] No card wraps the content; no form, section, or control sits inside a card.
- [ ] Any form inside stacks its labels, stays single-column, and follows the application's one save mode.
- [ ] Label placement was decided once for the whole form — every field in it stacks, with no mix of stacked and side-by-side at one breakpoint.
- [ ] One primary action, bottom right, with its alternative immediately to the left.
- [ ] Modal or non-modal was decided and stated, and the role, inertness, and focus behavior all agree with that decision.
- [ ] Focus moves into the panel on open and returns to the trigger on close.
- [ ] Escape closes without committing; dismissal is never pointer-only.
- [ ] Focus is not trapped unless the panel is genuinely modal with an inert, non-scrolling page behind it.
- [ ] The page behind a non-modal panel remains readable and reachable by assistive technology.
- [ ] Tab order follows visual order and does not jump unpredictably between panel and page.
- [ ] The close control has a real accessible name; the focus ring is intact; nothing needed is hover-only.
- [ ] Changes the panel makes to the page are announced, not only re-rendered.
- [ ] No component-owned padding, gap, border, width, or elevation was overridden.
- [ ] Nothing in the uncovered list was invented.
