---
name: recursica-skill-panel
description: Rules for the Recursica panel — when a side surface that leaves the page usable is right, no side or width options, no history entry, header, content, and footer, and focus return with no focus trap. Use for panels, drawers, side sheets, and filter panels. Not for blocking decisions — see recursica-skill-modal.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Panel

A panel puts extra content beside the page, without blocking it.

## When to use a panel

- **The user needs the page underneath while working** — filters, settings, a details view, or editing one thing that is on screen. This is the case a modal cannot serve.
- **Secondary settings or details would clutter the main view**, but must not cover it.
- **The content belongs to the current view**, not to a different place in the application.

## When not to use a panel

| Instead of a panel                                                  | Use                                                                                  |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| The task must be finished or given up before continuing             | `recursica-skill-modal`                                                              |
| The action cannot be undone, and needs a confirmation               | `recursica-skill-modal`                                                              |
| Confirming that something succeeded, or offering undo               | `recursica-skill-toast`                                                              |
| A brief alert, or a simple acknowledgment                           | `recursica-skill-toast`                                                              |
| The content is a long form, a form with several parts, or a big one | A page — and `recursica-skill-stepper` if it has several parts                       |
| The destination is a location the user can link to                  | A page with a route — see `recursica-skill-navigation`                               |
| The feature is critical, and the user must find it                  | The page itself. A panel's contents do not exist until someone opens it              |
| Primary or secondary navigation for the application                 | The app's navigation — hiding navigation is governed by `recursica-skill-navigation` |
| Separating repeating peer objects, or "containing" a form           | Nothing. See `recursica-skill-card` — a panel is not a card, and never contains one  |

**Do not hide critical content in a panel.** A panel saves space on the page, but its content stays out of sight until someone opens it. That suits a set of filters, and does not suit anything a user must act on to finish their work.

## Variants

Taken from the UI kit (the token file, `recursica_ui-kit.json`, that says which variants and states each component has) → `ui-kit.components.panel`. **The panel has no variants at all** — no sizes, no sides, no widths, no types. Every entry below is a fixed property.

**Parts of the component:** the panel has a header with a close control (`header-close-gap`), a content area, and a footer with a gap between buttons. Tokens define `min-width` and `max-width`, and the UI kit also defines a `divider-size`.

**Do not pass a side or an edge.** There is no left, right, top, or bottom panel in the UI kit. Do not set which edge a panel comes from — see the open questions.

**Do not pass a width or a size.** `min-width` and `max-width` are fixed. There is no narrow, wide, or full-height panel.

**There is no types variant.** A "Standard" panel and a "Scrollable" panel are shown only on the design-system website. The UI kit defines only `divider-size`, with nothing that says when the divider appears, or which of the two a given panel is.

**In structure, the panel is the modal without the blocking.** It has the same header, content, footer, and close control as the modal. The only difference is that the page behind a panel stays usable. That difference changes the accessibility work described below.

## Rules

**A button opens a panel; the user does not navigate to it, and it creates no browser history entry.** `recursica-skill-navigation` says this for modals and panels together: a surface opened by a trigger is not a location. The one exception is a panel deliberately built to be linked to: it gets a route and a link trigger together, exactly as a modal may.

**The header says what the panel is for**, and it is the panel's accessible name (the name a screen reader reads out for a control). Name the object or the job, not "Panel" or "Details".

**Never wrap the panel's content in a card, and never put a form, a form section, or a single form control in one.** The panel itself is the boundary. See `recursica-skill-card`.

**A form in a panel stacks its labels above its fields.** The panel is a narrow container, and `recursica-skill-forms` makes the container's width — not the viewport's — what decides stacking. The other form rules still apply: a single column, and one field per row.

**Label placement is one decision for the whole form, never for each field.** `recursica-skill-forms` allows labels side by side or stacked, and forbids both at the same breakpoint. The container-width test is applied once, to the form, and the answer governs every field in it. A panel is exactly the container that triggers stacking. The whole form inside it stacks, not only the fields that feel cramped, including the short ones that would have fitted beside their labels.

**The panel does not get its own save mode.** The panel uses the application's save mode. Saving field by field requires a save status that stays on the page. Saving everything together shows no status and no indicator of unsaved changes. See `recursica-skill-forms`.

**Footer actions follow the house placement:** one primary action at the bottom right, with its true alternative right to its left. Owned by `recursica-skill-buttons-links`.

**It must be possible, and obvious, to close it** — with the header's close control, and with Escape. Do not build a panel the user can only leave by finishing it.

**A panel that needs a stepper, or that scrolls on and on, is a page.** Processes with several steps, and a lot of data entry, belong on their own route.

**When the panel changes the page behind it** — a set of filters that narrows a table — the change on the page is the feedback. Do not add a toast for it.

**A panel sits flush against the left or right edge of the viewport, and runs its full height**, from top to bottom. It is never set in from the edge, never floating, and never less than full height. Left and right are both standard, and the side is set for each panel. Never open panels on both sides at once. Where panels stack, they all use the same side, though their widths may differ. A top or bottom edge is allowed, but extremely unusual, and has no designed treatment — get it approved before building one. Owned by `recursica-skill-panels-modals`.

**A panel MUST NEVER scroll horizontally.** No exception. A horizontal scrollbar means the content does not belong in a panel.

**Scrolling up and down is the sign to move the work to a page**, reproducing on that page whatever context it needed.

**A panel may open a modal.** A panel is not a mode, so this is not stacking modes — and it is how the unsaved-changes confirmation appears when the panel closes.

**A panel may be stacked on top of another panel, though it is not ideal.** The second one covers the first completely, and closing it shows the first again. It may never be nested inside one. There is no hard limit on stacking, but more than two stacked panels needs the user's approval.

**A panel does not survive a route change**, except where the navigation exists only to open another panel or modal.

**Below the tablet breakpoint, open the panel as a page instead** — not a narrower panel, and not a full-screen overlay styled as a panel. At tablet size and above, it stays a panel.

**NEVER draw a shader, scrim, or tint behind an open panel.** This rule has no exceptions. A panel exists to sit beside the page while the user reads and uses it, and a scrim dims that page. `recursica-skill-panels-modals` owns the rule. The overrides below enforce it against the library's default.

**An adapter may make this component modal by default, which is the opposite of the house rule.** An adapter can build the panel on its library's drawer, and a drawer usually draws an overlay, closes on a click outside it, traps focus, and locks page scrolling by default. A panel built with only the documented options is then modal without anyone noticing. Until the adapter's defaults are fixed, turn off all four explicitly:

- the overlay
- closing on a click outside the panel
- the focus trap
- the scroll lock

Look up each setting's name in the adapter with the Recursica MCP server's `recursica_get_component_doc` tool. A build test on the Mantine adapter confirmed that all four are needed. **A library default is not a house rule.** A drawer's modal default says nothing about what a Recursica panel should do. It must never be treated as a house rule — see `recursica-skill-design-router`. This is a tracked defect in the adapter. When the default is fixed, delete the overrides instead of keeping them. Check before assuming they are still needed.

**A panel is non-modal (it leaves the rest of the page usable), and that is the point of it.** The user can still move around the application, and act on the page behind it — see `recursica-skill-panels-modals`, which settles this directly. A panel built to block the page is a modal using the wrong component.

**NEVER put a table inside a panel.** The panel is narrow and a table needs width, so the result either scrolls horizontally — forbidden outright — or truncates every column. Repeating content becomes groups of stacked fields instead. Secondary material goes in a second tab, not below the main content. Owned by `recursica-skill-panels-modals`.

**A form in a panel uses stacked label placement for every field.** The panel is narrow, which is the container-width condition that triggers stacking, and the whole form stacks — including short fields that would have fitted side by side. Owned by `recursica-skill-forms`.

**Closing a panel that holds unsaved form data asks before throwing it away**, the same way leaving a page with unsaved changes does. Do not ask on every close; the prompt is for data the user entered and never saved.

**A panel may be deliberately built to be linked to**, with a route and a link trigger together, exactly as a modal may. This is an explicit decision, not a default — see `recursica-skill-navigation`.

## Accessibility

This component also follows the accessibility baseline in `recursica-skill-system-conventions`, including the focus ring. Only the rules specific to this component are listed here.

**A panel is never modal, so build every part of it as non-modal.** Almost every panel accessibility failure comes from a panel built partly as a modal. It looks like it leaves the page usable, but it traps focus like a dialog, or hides the page from assistive technology while leaving it clickable. The page behind stays usable, readable, and reachable.

### Screen readers

- **The panel's accessible name is its header.** Connect the two. An unnamed panel is announced as a region with no name, and "Panel" is not a name.
- **The role is a named region the user can browse into and out of**, not a modal dialog. A surface that needs everything behind it inert (impossible to reach or read) is a modal — use `recursica-skill-modal` instead.
- **Never mark a panel as modal while the page behind stays interactive.** Assistive technology stays inside a modal dialog. A mouse user can still use the page behind the panel, and a screen reader user cannot reach it.
- **In a non-modal panel, do not hide the page behind it from assistive technology.** It is not inert. A screen reader user must be able to read the page, and get back into the panel.
- **The panel's content must sit in a sensible reading position in the DOM** — where it appears visually, not added to the end of the document. The reading order follows the visual order.
- **Opening the panel must be perceivable**, which follows from moving focus into it. Do not rely on the slide-in animation to show that anything happened.
- **The close control needs a real name** — "Close filters", rather than an unlabeled icon, which is announced as nothing.
- **Anything the panel changes somewhere else must be announced**, not only redrawn. A filter that cuts a table down to four rows needs that result stated. The visual change is invisible to a screen reader user who is still inside the panel.

### Keyboard and non-mouse navigation

- **Focus moves into the panel when it opens.** Put it on the first meaningful element — the first field, or the panel container. Do not put it on the close button unless nothing else can receive focus, and never leave it on the trigger.
- **Focus returns to the element that opened the panel when it closes.** This is the step most often skipped, and skipping it drops the user at the top of the document.
- **Escape closes the panel**, and closing never saves.
- **Do not trap focus in a non-modal panel.** Tab from the last control in the panel must carry on into the page in document order, and Shift-Tab must come back. The user can still reach the page behind the panel.
- **Trap focus only if the panel is modal** — and then the page behind must also be inert, and must not scroll. Trapping focus while the page stays usable lets the mouse leave the panel, but not the keyboard.
- **The tab order inside the panel follows the visual order** — the content, then the footer buttons, then the close control where it sits visually — and must not jump between the panel and the page unpredictably.
- **Never make closing it pointer-only.** Escape and the close control both work, whatever a click outside does.

## Styling set by tokens

Do not set or override any of these. The component sets them:

- `colors`.
- `header-style` and `content-style` type treatment.
- `header-footer-horizontal-padding`, `header-footer-vertical-padding`.
- `header-close-gap` and `footer-button-gap`.
- `content-horizontal-padding`, `content-vertical-padding`.
- `border-size`, `border-radius`, `divider-size`.
- `min-width`, `max-width`, `elevation`.

## Related skills

- `recursica-skill-panels-modals` — the owning design-rules skill: panel vs. modal vs. page, the context test, the scrolling threshold, the prohibition on stacking modes, forms in a panel, unsaved-change protection, and the focus-trapping difference.
- `recursica-skill-navigation` — a location is a route; a trigger-invoked panel is not one and gets no history entry.
- `recursica-skill-forms` — one label placement per form and the container-width test behind it, single-column layout, validation, and save mode for any form the panel holds.
- `recursica-skill-buttons-links` — the trigger is a button, one primary action per surface, footer placement.
- `recursica-skill-system-conventions` — the accessibility baseline every component follows.

### Only if used on the same screen

- `recursica-skill-modal` — the blocking alternative, and the focus-trap and inert-background rules a modal panel inherits.
- `recursica-skill-card` — why the panel's content is not wrapped in a card, and why no form goes in one.
- `recursica-skill-toast` — transient confirmation and undo, which never belong in a panel.

## Open questions

- **Opening transition.** The side is set, and how the panel is anchored is settled. Whether it slides in or expands when it opens is not settled.
- **Panel width.** `min-width` and `max-width` are fixed, and there is no size variant, so a "wide panel" cannot be built. Stacked panels may still differ in width from each other, and nothing says whether a left panel and a right panel share a width.
- **Top or bottom panel design.** A top or bottom panel is allowed but has no design. Building one needs approval, because no rule covers it.
- **Divider visibility.** Nothing says when the divider appears. "Standard" and "Scrollable" types are shown only on the design-system website, with no token behind either, and no types variant — the UI kit defines only `divider-size`. Ask before relying on either type.
- **Loading state.** The component has no state for a panel whose content is being fetched.

## Pre-flight checklist

- [ ] The page underneath is needed while the panel is open, and nothing critical is hidden inside it.
- [ ] Anything that must be finished or given up first went to a modal, and brief feedback went to a toast.
- [ ] The code passes no side, width, size, or type variant — none exist.
- [ ] A button triggers it, with no route and no browser history entry — unless it is deliberately built to be linked to, with a route and a link trigger together.
- [ ] The header names the panel's purpose, and is connected as its accessible name.
- [ ] No card wraps the content, and no form, section, or control sits inside a card.
- [ ] Any form inside stacks its labels, stays in a single column, and follows the application's one save mode.
- [ ] Label placement is one decision for the whole form — every field in it stacks, with no mix of stacked and side by side at one breakpoint.
- [ ] There is one primary action at the bottom right, with its alternative right to its left.
- [ ] Whether the panel is modal or non-modal is decided and stated, and the role, what is inert, and the focus behavior all match that decision.
- [ ] Focus moves into the panel when it opens, and returns to the trigger when it closes.
- [ ] Escape closes it without saving, and closing it is never pointer-only.
- [ ] Focus is not trapped, and the page behind is not made inert.
- [ ] The page behind a non-modal panel stays readable and reachable by assistive technology.
- [ ] The tab order follows the visual order, and does not jump unpredictably between the panel and the page.
- [ ] The close control has a real accessible name, the focus ring is intact, and nothing needed appears only on hover.
- [ ] Changes the panel makes to the page are announced, not only redrawn.
- [ ] Padding, gaps, borders, width, and elevation come from the component.
- [ ] The panel is non-modal: focus is not trapped, and the page behind stays reachable by keyboard — checked in the running application, not assumed from the settings passed.
- [ ] No panel is nested inside another. Any stacked panel covers the first completely, and shares its side.
- [ ] The panel sits flush against the left or right edge and is full height, and only one side is in use.
- [ ] Nothing scrolls horizontally. Any content that made the panel scroll up and down is on a page instead, with the context it needed reproduced there.
- [ ] The panel closes on a route change, unless the navigation only opens another panel or modal.
- [ ] Below tablet size, it opens as a page. More than two stacked panels, and any top or bottom panel, were approved before they were built.
- [ ] Any form inside uses stacked label placement throughout. There is no table inside the panel, and secondary material is in its own tab.
- [ ] Closing with unsaved form data asks first; closing an untouched panel does not.
- [ ] Open questions were asked about, not decided: the opening transition, panel width, top or bottom panel design, divider visibility, and a loading state.
