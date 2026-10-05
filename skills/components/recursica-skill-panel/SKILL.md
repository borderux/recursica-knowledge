---
name: recursica-skill-panel
description: Rules for the Recursica panel — when a panel beside the page that leaves the page usable is right, no side or width options in the standard UI kit, no browser history entry, header, content, and footer, and focus return with no focus trap. Use for panels, drawers, side sheets, and filter panels. Not for blocking decisions — see recursica-skill-modal.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Panel

A panel shows extra content beside the page, without blocking the page.

## When to use a panel

- **The user needs the page underneath the panel while working in the panel**, as with filters, settings, a details view, or editing one item that is on screen. A modal cannot serve this case.
- **Secondary settings or details would clutter the main view**, but must not cover the main view.
- **The content belongs to the current view**, not to a different page or location in the application.

## When not to use a panel

| Situation                                                            | Use instead                                                                                      |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| The task must be finished or given up before the user continues      | `recursica-skill-modal`                                                                          |
| The action cannot be undone, and needs a confirmation                | `recursica-skill-modal`                                                                          |
| Confirming that an action succeeded, or offering undo                | `recursica-skill-toast`                                                                          |
| A brief alert, or a simple acknowledgment                            | `recursica-skill-toast`                                                                          |
| The content is a long form, a form with several parts, or a big form | A page, with `recursica-skill-stepper` when the form has several parts                           |
| The destination is a location the user can link to                   | A page with a route. See `recursica-skill-navigation`.                                           |
| The feature is critical, and the user must find the feature          | The page itself. The content of a panel does not exist until someone opens the panel.            |
| Primary or secondary navigation for the application                  | The application's navigation. `recursica-skill-navigation` sets the rules for hiding navigation. |
| Separating repeated items of one type, or "containing" a form        | Nothing. A panel is not a card, and a panel never contains a card. See `recursica-skill-card`.   |

**Do not hide critical content in a panel.** A panel saves space on the page, but the panel content stays out of sight until someone opens the panel. Hidden content suits filters. Hidden content does not suit any part of the panel content that the user must act on to finish the user's work.

## Variants

**Use only the panel variants and options that the Recursica MCP server lists for the project.** A designer can add variants and options in Theme Forge, so each project can differ. Get the list with the server's `recursica_get_component_doc` tool, and use the names the code uses. Never invent a variant or an option.

The rules below describe each part and option by role. The names in the standard UI kit (the unchanged UI kit in the official Recursica release) are examples only.

- **Parts.** A panel has a header with a close control, a content area, and a footer with a gap between the footer buttons. Tokens set the gap between the header and the close control, and the minimum and maximum width of the panel. The standard UI kit also defines a divider size.
- **The same parts as a modal.** A panel has the same header, content area, footer, and close control as a modal. The only difference is that the page behind a panel stays usable. The difference changes the accessibility rules below.
- **No variants in the standard UI kit.** The standard UI kit has no size, side, width, or type variant on the panel, and every property of the panel is fixed. If the project adds a variant in Theme Forge, use the project's variant.
- **No side variant in the standard UI kit.** The standard UI kit has no left, right, top, or bottom panel. If the project adds a side variant in Theme Forge, use the project's side variant. Otherwise, the designer chooses the left or the right side for each panel. The rules below say how.
- **No size or width variant in the standard UI kit.** The standard UI kit has no narrow, wide, or full-height panel, and tokens fix the minimum and maximum width. If the project adds a size or width variant in Theme Forge, use the project's variant. Otherwise, do not set a width or a size on the panel.
- **No type variant in the standard UI kit.** Only the design-system website shows a "Standard" panel and a "Scrollable" panel. The standard UI kit defines only a divider size. Nothing in the standard UI kit says when the divider appears, or which of the two types a given panel is. If the project adds a type variant in Theme Forge, use the project's type variant.

## Rules

**A button opens a panel.** The user does not navigate to a panel, and opening a panel creates no browser history entry. `recursica-skill-navigation` sets this rule for modals and panels together: a region that a control opens, such as a panel or modal, is not a location.

**The one exception is a panel built on purpose for linking.** A panel built for linking gets a route and a link that opens the panel, together, exactly as a modal may. Building a panel for linking is an explicit decision, not a default. See `recursica-skill-navigation`.

**The panel header says what the panel is for.** The header is the panel's accessible name (the name a screen reader reads out for a control). Name the object or the task in the header, not "Panel" or "Details".

**Never wrap the panel content in a card.** Never put a form, a form section, or a single form control in a card either. The panel is the boundary of the content. See `recursica-skill-card`.

**A form in a panel stacks every label above the label's field.** A panel is a narrow container. `recursica-skill-forms` makes the width of the container, not the width of the viewport, decide when labels stack. The other form rules still apply: a single column, and one field per row of the form.

**Label placement is one decision for the whole form, never for each field.** `recursica-skill-forms` allows labels side by side or stacked, and forbids both at the same breakpoint. Apply the container-width test once, to the whole form. The result sets the label placement of every field in the form. A panel is exactly the kind of container that makes labels stack. The whole form in the panel stacks, not only the fields that feel cramped. Short fields that would fit beside the labels stack too. `recursica-skill-forms` sets this rule.

**A panel does not get a separate save mode.** The panel uses the application's save mode. Saving field by field requires a save status that stays on the page. Saving the whole form at once shows no status and no indicator of unsaved changes. See `recursica-skill-forms`.

**Put one primary action at the bottom right of the panel footer.** Put the true alternative directly to the left of the primary action. `recursica-skill-buttons-links` sets this rule.

**Closing a panel must be possible and obvious**, with the close control in the header and with the Escape key. Do not build a panel that the user can leave only by finishing the task in the panel.

**Build a page, not a panel, for a task that needs a stepper or that scrolls on and on.** A process with several steps, and a task with a lot of data entry, belong on a separate page with a separate route.

**When a panel changes the page behind the panel, the change on the page is the feedback.** For example, filters in a panel narrow a table on the page. Do not add a toast for the change.

**A panel sits flush against the left or right edge of the viewport, and runs the full height of the viewport**, from top to bottom. A panel is never set in from the edge, never floating, and never less than full height. Left and right are both standard sides. The designer, or the designer agent, chooses the side for each panel. Never open panels on both sides at once. Stacked panels all use the same side, and the widths of stacked panels may differ. A panel on the top or bottom edge is allowed but extremely unusual, and has no design. Get a top or bottom panel approved before building one. `recursica-skill-panels-modals` sets this rule.

**A panel MUST NEVER scroll horizontally.** The rule has no exception. A horizontal scrollbar means the content does not belong in a panel.

**Scrolling up and down in a panel is the sign to move the task to a page.** Repeat on the new page the context the task needed.

**A panel may open a modal.** A panel is not a mode. A modal opened from a panel therefore does not stack one mode on another mode. The confirmation for unsaved changes appears as a modal opened from the panel when the panel closes.

**A panel may be stacked on top of another panel, but stacking is not ideal.** The second panel covers the first panel completely. Closing the second panel shows the first panel again. Never nest a panel inside another panel. No hard limit caps the number of stacked panels, but more than two stacked panels need the user's approval.

**A panel closes when the route changes**, except when the navigation exists only to open another panel or a modal.

**Below the tablet breakpoint, open the panel content as a page instead.** Do not use a narrower panel, or a full-screen overlay styled as a panel. At the tablet breakpoint and above, the panel stays a panel.

**NEVER draw a shader, scrim, or tint behind an open panel.** The rule has no exceptions. A panel sits beside the page so the user can read and use the page, and a scrim dims the page. `recursica-skill-panels-modals` sets this rule. The four settings below enforce the rule against the default overlay.

**An adapter may make the panel modal by default, the opposite of the house rule.** An adapter (the Recursica component library for one framework, such as Mantine or Angular Material) can build the panel on a drawer from a code library. A drawer usually draws an overlay, closes on a click outside the drawer, traps focus, and locks page scrolling, all by default. A panel built with only the documented settings then blocks the page, and nobody notices. Until the adapter's defaults are fixed, turn off all four defaults explicitly:

- the overlay
- closing on a click outside the panel
- the focus trap
- the scroll lock

Look up the name the code uses for each setting with the Recursica MCP server's `recursica_get_component_doc` tool. A build test on one adapter confirmed that all four settings are needed. The modal default is a tracked defect in the adapter. When the adapter's default is fixed, delete the four settings instead of keeping the settings. Before assuming the four settings are still needed, check the adapter's current default.

**A code library's default is not a house rule.** A drawer that blocks the page by default says nothing about what a Recursica panel should do. Never treat the drawer's modal default as a house rule. See `recursica-skill-design-router`.

**A panel is non-modal (it leaves the rest of the page usable), and leaving the page usable is the purpose of a panel.** The user can still move around the application and act on the page behind the panel. `recursica-skill-panels-modals` settles this rule directly. A panel built to block the page is a modal built with the wrong component.

**NEVER put a table inside a panel.** A panel is narrow, and a table needs width. A table in a panel either scrolls horizontally, which is forbidden outright, or truncates every column. Show repeated content as groups of stacked fields instead. Put secondary material in a second tab, not below the main content. `recursica-skill-panels-modals` sets this rule.

**Closing a panel that holds unsaved form data asks the user before throwing the data away**, the same way leaving a page with unsaved changes does. Do not ask on every close. The question is only for data the user entered and never saved.

## Accessibility

This component also follows the accessibility baseline in `recursica-skill-system-conventions`, including the focus ring. Only the rules specific to this component are listed here.

**A panel is never modal, so build every part of a panel as non-modal.** Almost every accessibility failure in a panel comes from a panel built partly as a modal. A panel built partly as a modal looks as if the page stays usable. But the panel traps focus like a dialog, or hides the page from assistive technology while the page stays clickable. The page behind a panel stays usable, readable, and reachable.

### Screen readers

- **The panel header is the panel's accessible name.** Connect the header to the panel. A panel with no accessible name is announced as a region with no name. "Panel" is not a name.
- **Give the panel the role of a named region the user can browse into and out of**, not the role of a modal dialog. When every element on the page behind a panel must be inert (impossible to reach or read), build a modal instead. See `recursica-skill-modal`.
- **Never mark a panel as modal while the page behind the panel stays usable.** Assistive technology stays inside a modal dialog. A mouse user can still use the page behind the panel, and a screen reader user cannot reach the page.
- **Do not hide the page behind a non-modal panel from assistive technology.** The page behind the panel is not inert. A screen reader user must be able to read the page and get back into the panel.
- **Place the panel content in the DOM where the panel appears on screen**, not at the end of the document. The reading order follows the visual order.
- **Every user must be able to tell that the panel opened.** Moving focus into the panel shows that the panel opened. Do not rely on the slide-in animation to show that the panel opened.
- **Give the close control a real accessible name**, such as "Close filters". An icon with no label is announced as nothing.
- **Announce every change the panel makes outside the panel**, not only redraw the page. When a filter cuts a table down to four rows, announce the result. A screen reader user inside the panel cannot see the change on the page.

### Keyboard and non-mouse navigation

- **Move focus into the panel when the panel opens.** Put focus on the first meaningful element: the first field, or the panel container. Put focus on the close button only when no other element can take focus. Never leave focus on the element that opened the panel.
- **Return focus to the element that opened the panel when the panel closes.** Teams skip this step more often than any other step. Skipping the step drops the user at the top of the document.
- **Escape closes the panel**, and closing the panel never saves.
- **Never trap focus in a panel.** Tab from the last control in the panel must move on into the page, in document order. Shift-Tab must move back into the panel. The user can still reach the page behind the panel. A panel that traps focus while the page stays usable lets a mouse user leave the panel, but not a keyboard user.
- **The tab order inside the panel follows the visual order**: the content, then the footer buttons, then the close control in the place the close control appears. The tab order must not jump between the panel and the page unpredictably.
- **Never make closing the panel pointer-only.** Escape and the close control both close the panel, no matter what a click outside the panel does.

## Styling set by tokens

**Do not set or override the panel properties below.** The panel component sets each property.

- `colors`.
- `header-style` and `content-style` type treatment.
- `header-footer-horizontal-padding`, `header-footer-vertical-padding`.
- `header-close-gap` and `footer-button-gap`.
- `content-horizontal-padding`, `content-vertical-padding`.
- `border-size`, `border-radius`, `divider-size`.
- `min-width`, `max-width`, `elevation`.

## Related skills

- `recursica-skill-panels-modals` — the design-rules skill that sets the panel rules: choosing a panel, a modal, or a page, the context test, the scrolling threshold, the ban on stacking modes, forms in a panel, protecting unsaved changes, and the difference in focus trapping.
- `recursica-skill-navigation` — a location is a route. A panel that a control opens is not a location and gets no browser history entry.
- `recursica-skill-forms` — one label placement per form and the container-width test behind the rule, single-column layout, validation, and the save mode for any form in the panel.
- `recursica-skill-buttons-links` — the button that opens the panel, one primary action per region that holds content, such as a page, panel, or modal, and the placement of footer buttons.
- `recursica-skill-system-conventions` — the accessibility baseline every component follows.

### Only if used on the same screen

- `recursica-skill-modal` — the blocking alternative, and the rules on focus trapping and an inert page that a modal panel follows.
- `recursica-skill-card` — why no card wraps the panel content, and why no form goes in a card.
- `recursica-skill-toast` — short confirmations and undo, which never belong in a panel.

## Open questions

- **Opening transition.** The side of the panel is set, and how the panel attaches to the edge is settled. Whether the panel slides in or expands when the panel opens is not settled.
- **Panel width.** Stacked panels may differ in width from each other. No rule says whether a left panel and a right panel share a width. Tokens fix the minimum and maximum width, and the standard UI kit has no size variant, so a wide panel cannot be built. Ask about a wide panel only when the project has no size variant.
- **Top or bottom panel design.** A top or bottom panel is allowed but has no design. Building a top or bottom panel needs approval, because no rule covers the design.
- **Divider visibility.** No rule says when the divider appears. Only the design-system website shows the "Standard" and "Scrollable" types. No token sets either type, and the standard UI kit has no type variant and defines only the divider size. Ask before relying on either type, but only when the project has no type variant.
- **Loading state.** The standard UI kit has no state for a panel whose content is still loading. Ask only when the project has no loading state.

## Pre-flight checklist

- [ ] The page underneath the panel is needed while the panel is open, and no critical content is hidden in the panel.
- [ ] Every task that must be finished or given up first is in a modal, and brief feedback is in a toast.
- [ ] Every variant and option on the panel is one the Recursica MCP server lists for the project. No side, width, size, or type variant is set unless the project has one, and no variant or option is invented.
- [ ] A button opens the panel, with no route and no browser history entry, unless the panel is built on purpose for linking, with a route and a link that opens the panel.
- [ ] The header names the panel's purpose and is connected as the panel's accessible name.
- [ ] No card wraps the panel content, and no form, form section, or form control sits inside a card.
- [ ] Every form in the panel stacks the labels, uses a single column, and follows the application's one save mode.
- [ ] Label placement is one decision for the whole form. Every field in the form stacks, with no mix of stacked and side-by-side labels at one breakpoint.
- [ ] The panel footer has one primary action at the bottom right, with the alternative directly to the left of the primary action.
- [ ] The panel is non-modal: the panel traps no focus, and the page behind the panel stays usable and reachable by assistive technology.
- [ ] Focus moves into the panel when the panel opens, and returns to the element that opened the panel when the panel closes.
- [ ] Escape closes the panel without saving, and closing the panel is never pointer-only.
- [ ] Focus is not trapped, and the page behind the panel is not made inert.
- [ ] The page behind a non-modal panel stays readable and reachable by assistive technology.
- [ ] The tab order follows the visual order and does not jump unpredictably between the panel and the page.
- [ ] The close control has a real accessible name, the focus ring is intact, and no control or content the user needs appears only on hover.
- [ ] Changes the panel makes to the page are announced, not only redrawn.
- [ ] Padding, gaps, borders, width, and elevation come from the panel component.
- [ ] The panel is non-modal: focus is not trapped, and the page behind the panel stays reachable by keyboard. The behavior was checked in the running application, not assumed from the settings in the code.
- [ ] No panel is nested inside another panel. Each stacked panel covers the first panel completely and uses the same side as the first panel.
- [ ] The panel sits flush against the left or right edge and runs full height, and panels are open on only one side.
- [ ] Nothing scrolls horizontally. Content that made the panel scroll up and down is on a page instead, with the context the content needed repeated on the page.
- [ ] The panel closes on a route change, unless the navigation only opens another panel or a modal.
- [ ] Below the tablet breakpoint, the panel opens as a page. More than two stacked panels, and any top or bottom panel, were approved before being built.
- [ ] Every form in the panel uses stacked label placement for every field. No table is inside the panel, and secondary material is in a separate tab.
- [ ] Closing a panel with unsaved form data asks first. Closing a panel the user has not changed does not ask.
- [ ] Open questions were asked about, not decided: the opening transition, panel width, top or bottom panel design, divider visibility, and a loading state.
