---
name: recursica-skill-panel
description: Rules for the Recursica panel — when to use a panel beside the page that leaves the page usable, why opening a panel adds no browser history entry, the header, content and footer, and returning focus with no focus trap. Use for panels, drawers, side sheets, and filter panels. Not for blocking decisions — see recursica-skill-modal.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Panel

A panel shows extra content beside the page, without blocking the page.

## When to use a panel

- **The persona needs the page underneath the panel while working in the panel.** Examples are filters, settings, a details view, or editing one item that is on screen. A modal cannot serve this case.
- **Secondary settings or details would clutter the main view**, but must not cover the main view.
- **The content belongs to the current view**, not to a different page or location in the application.

## When not to use a panel

| Situation                                                            | Use instead                                                                                      |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| The task must be finished or given up before the persona continues   | `recursica-skill-modal`                                                                          |
| The action cannot be undone, and needs a confirmation                | `recursica-skill-modal`                                                                          |
| Confirming that an action succeeded, or offering undo                | `recursica-skill-toast`                                                                          |
| A brief alert, or a simple acknowledgment                            | `recursica-skill-toast`                                                                          |
| The content is a long form, a form with several parts, or a big form | A page, with `recursica-skill-stepper` when the form has several parts                           |
| The destination is a location the persona can link to                | A page with a route. See `recursica-skill-navigation`.                                           |
| The feature is critical, and the persona must find the feature       | The page itself. The content of a panel does not exist until someone opens the panel.            |
| Primary or secondary navigation for the application                  | The application's navigation. `recursica-skill-navigation` sets the rules for hiding navigation. |
| Separating repeated items of one type, or wrapping a form in a box   | Nothing. A panel is not a card, and a panel never contains a card. See `recursica-skill-card`.   |

**Do not hide critical content in a panel.** A panel saves space on the page, but the panel content stays out of sight until someone opens the panel. Hidden content suits filters. Hidden content does not suit panel content the persona must act on to finish the work.

## Variants

**Use only the panel variants and options that the Recursica MCP server lists for the project.** A designer can add variants and options in Theme Forge, so each project can differ. Get the list with the server's `recursica_get_component_doc` tool, and use the names the code uses. Never invent a variant or an option.

The rules below describe each part and option by role. The names in the standard UI kit (the unchanged UI kit in the official Recursica release) are examples only.

- **A panel has a header with a close control, a content area, and a footer with buttons.** The standard UI kit also defines a divider.
- **A panel has the same header, content area, footer, and close control as a modal.** The only difference is that the page behind a panel stays usable. That difference changes the accessibility rules below.
- **If the project has a side variant, use the side variant.** Otherwise, the designer chooses the left or the right side for each panel, as the rules below describe.
- **If the project has a size or width variant, use that variant.** Otherwise, do not set a width or a size on the panel.

## Rules

**Open a panel with a button.** Opening a panel creates no browser history entry. The persona does not navigate to a panel. A region that a control opens, such as a panel or modal, is not a location. `recursica-skill-navigation` sets this rule for modals and panels together.

**The one exception is a panel built on purpose for linking.** Give a panel built for linking both a route and a link that opens the panel. A modal may get both in exactly the same way. Building a panel for linking is an explicit decision, not a default. See `recursica-skill-navigation`.

**Write a panel header that says what the panel is for.** Name the object or the task in the header, not "Panel" or "Details". The header is the panel's accessible name (the name a screen reader reads out for a control).

**Never wrap the panel content in a card.** Never put a form, a form section, or a single form control in a card either. The edges of the panel separate the panel content from the page. See `recursica-skill-card`.

**In a form in a panel, stack every label above the label's field.** A panel is a narrow container. In `recursica-skill-forms`, the width of the container, not the width of the viewport, decides when labels stack. The other form rules still apply: a single column, and one field per row of the form.

**Label placement is one decision for the whole form, never for each field.** `recursica-skill-forms` allows labels side by side or stacked, and forbids both placements at the same breakpoint. Apply the container-width test once, to the whole form. The result of the test sets the label placement of every field in the form. A panel is exactly the kind of container that makes labels stack. Every field in a form in a panel stacks, not only the fields that feel cramped. Short fields that would fit beside the field's label stack too. `recursica-skill-forms` sets this rule.

**Give a panel no separate save mode.** Use the application's save mode in the panel. Saving field by field requires a save status that stays on the page. Saving the whole form at once shows no status and no indicator of unsaved changes. See `recursica-skill-forms`.

**Put one primary action at the bottom right of the panel footer.** Put a true alternative directly to the left of the primary action. `recursica-skill-buttons-links` sets this rule.

**Closing a panel must be possible and obvious.** The close control in the header closes the panel, and so does the Escape key. Do not build a panel that the persona can leave only by finishing the task in the panel.

**Build a page, not a panel, for a task that needs a stepper or that scrolls a long way.** A process with several steps belongs on a separate page with a separate route. A task with a lot of data entry belongs on a separate page with a separate route too.

**Do not add a toast when a panel changes the page behind the panel.** The change on the page is the feedback. For example, filters in a panel narrow a table on the page.

**Place a panel flush against the left or right edge of the viewport.** The panel runs the full height of the viewport, from top to bottom. A panel is never set in from the edge, never floating, and never less than full height. Left and right are both standard sides. The designer, or the designer agent, chooses the side for each panel. Never open panels on both sides at once. Panels stacked on top of each other all use the same side, and may differ in width. A panel on the top or bottom edge is allowed but extremely unusual. The design system has no design for a top or bottom panel. Get a top or bottom panel approved before building one. `recursica-skill-panels-modals` sets this rule.

**A panel MUST NEVER scroll horizontally.** The rule has no exception. A horizontal scrollbar means the content does not belong in a panel.

**A panel that scrolls up and down is the sign to move the task to a page.** On the new page, repeat the context the task needed.

**A panel may open a modal.** A panel is not a mode. A modal opened from a panel therefore does not stack one mode on another mode. A confirmation for unsaved changes is a modal that the panel opens when the panel closes.

**A panel may be stacked on top of another panel, but stacking is not ideal.** The second panel covers the first panel completely. Closing the second panel shows the first panel again. Never nest a panel inside another panel. Any number of panels may stack, with no hard limit, but more than two stacked panels need the user's approval.

**Close a panel when the route changes**, except when the navigation exists only to open another panel or a modal.

**Below the tablet breakpoint, open the panel content as a page instead.** Do not use a narrower panel, or a full-screen overlay styled as a panel. At the tablet breakpoint and above, the panel stays a panel.

**NEVER draw a shader, scrim, or tint behind an open panel.** The rule has no exceptions. A panel sits beside the page so the persona can read and use the page. A scrim dims the page. `recursica-skill-panels-modals` sets this rule. The four settings below keep this rule when an adapter draws an overlay by default.

**Until the adapter's defaults are fixed, turn off four modal defaults explicitly.** An adapter (the Recursica component library for one framework, such as Mantine or Angular Material) may make a panel modal by default. An adapter can build the panel on a drawer from a code library. Most drawers from code libraries turn on four modal defaults:

- the overlay
- closing on a click outside the panel
- the focus trap
- the scroll lock

A modal panel is the opposite of the house rule that a panel leaves the page usable. With only the adapter's documented settings, a panel built on such a drawer blocks the page, and nobody notices.

Look up the name the code uses for each of the four settings with the Recursica MCP server's `recursica_get_component_doc` tool. A build test on one adapter confirmed that all four settings are needed. The modal default is a tracked defect in the adapter. When the adapter's default is fixed, delete the four settings. Before assuming the four settings are still needed, check the adapter's current default.

**A code library's default is not a house rule.** A drawer that blocks the page by default says nothing about what a Recursica panel should do. Never treat the drawer's modal default as a house rule. See `recursica-skill-design-router`.

**A panel is non-modal (the page behind stays usable), and leaving the page usable is the purpose of a panel.** The persona can still move around the application and act on the page behind the panel. `recursica-skill-panels-modals` sets this rule directly. A panel built to block the page is a modal built with the wrong component.

**NEVER put a table inside a panel.** Show repeated content as groups of stacked fields instead. Put secondary material in a second tab, not below the main content. A panel is narrow, and a table needs width. A table in a panel either scrolls horizontally, which is forbidden outright, or truncates every column. `recursica-skill-panels-modals` sets this rule.

**When a panel holds unsaved form data, closing the panel asks the persona before throwing the data away.** Leaving a page with unsaved changes asks the same way. Do not ask on every close. Ask only about data the persona entered and never saved.

## Accessibility

The rules below add to the accessibility baseline in `recursica-skill-system-conventions`, including the focus ring, which every Recursica component follows.

**A panel is never modal, so build every part of a panel as non-modal.** Almost every accessibility failure in a panel comes from a panel built partly as a modal. A panel built partly as a modal looks as if the page stays usable. But that panel traps focus like a dialog, or hides the page from assistive technology while the page stays clickable. The page behind a panel stays usable, readable, and reachable.

### Screen readers

- **Connect the panel header to the panel as the panel's accessible name.** A panel with no accessible name is announced as a region with no name. "Panel" is not a name.
- **Give the panel the role of a named region, not the role of a modal dialog.** The persona can browse into and out of a named region. Build a modal instead when the whole page behind the panel must be inert (impossible to reach or read). See `recursica-skill-modal`.
- **Never mark a panel as modal while the page behind the panel stays usable.** Assistive technology stays inside a modal dialog. A persona using a mouse can still use the page behind the panel. A persona using a screen reader cannot reach the page.
- **Do not hide the page behind a non-modal panel from assistive technology.** The page behind the panel is not inert. A persona using a screen reader must be able to read the page and get back into the panel.
- **Place the panel content in the document where the panel appears on screen, not at the end of the document.** The reading order follows the visual order.
- **Every persona using the panel must be able to tell that the panel opened.** Moving focus into the panel shows that the panel opened. Do not rely on a slide-in animation to show that the panel opened.
- **Give the close control a real accessible name**, such as "Close filters". An icon with no label is announced as nothing.
- **Announce every change the panel makes outside the panel.** Redrawing the page is not enough. When a filter cuts a table down to four rows, announce the result. A persona using a screen reader inside the panel cannot see the change on the page.

### Keyboard and non-mouse navigation

- **Move focus into the panel when the panel opens.** Put focus on the first meaningful element: the first field, or the panel container. Put focus on the close button only when no other element can take focus. Never leave focus on the element that opened the panel.
- **Return focus to the element that opened the panel when the panel closes.** Teams skip this step more often than any other step. Skipping the step drops the persona at the top of the document.
- **Escape closes the panel**, and closing the panel never saves.
- **Never trap focus in a panel.** Pressing Tab on the last control in the panel must move focus on into the page, in document order. Pressing Shift-Tab must move focus back into the panel. The persona can still reach the page behind the panel. A panel that traps focus while the page stays usable lets a persona using a mouse leave the panel. A persona using a keyboard cannot leave the panel.
- **Make the tab order inside the panel follow the visual order.** The order is the content, then the footer buttons, then the close control in the place the close control appears. The tab order must not jump between the panel and the page unpredictably.
- **Never make closing the panel pointer-only.** Escape and the close control both close the panel, no matter what a click outside the panel does.

## Styling set by tokens

**Never set or override the panel's styling.** The theme sets every visual property of the panel, such as size, spacing, borders, colors and animation. Do not add extra containers or spacers to change the panel's look. If the design needs a look the theme does not give, report the missing look as a design-system gap. See `recursica-skill-design-router`.

## Related skills

- `recursica-skill-panels-modals` — the design-rules skill that sets the panel rules:
  - choosing a panel, a modal, or a page
  - the context test
  - the scrolling threshold
  - the ban on stacking modes
  - forms in a panel
  - protecting unsaved changes
  - the difference in focus trapping
- `recursica-skill-navigation` — a location is a route. A panel that a control opens is not a location and gets no browser history entry.
- `recursica-skill-forms` — the form rules:
  - one label placement per form, and the container-width test behind the rule
  - single-column layout
  - validation
  - the save mode for any form in the panel
- `recursica-skill-buttons-links` — the button rules:
  - the button that opens the panel
  - one primary action per region that holds content, such as a page, panel, or modal
  - the placement of footer buttons
- `recursica-skill-system-conventions` — the accessibility baseline every component follows.

### Only if used on the same screen

- `recursica-skill-modal` — the blocking alternative, and the rules on focus trapping and an inert page that a modal follows.
- `recursica-skill-card` — why no card wraps the panel content, and why no form goes in a card.
- `recursica-skill-toast` — short confirmations and undo, which never belong in a panel.

## Open questions

- **Opening transition.** The side of the panel is set, and how the panel attaches to the edge is settled. No rule says whether the panel slides in or expands when the panel opens.
- **Panel width.** Stacked panels may differ in width from each other. No rule says whether a left panel and a right panel share a width. Confirm a wide panel with the user only when the project has no size variant.
- **Top or bottom panel design.** A top or bottom panel is allowed but has no design. Building a top or bottom panel needs approval, because no rule covers the design.
- **Divider visibility.** No rule says when the divider appears. Only the design-system website shows the "Standard" and "Scrollable" divider types. Confirm with the user before relying on either divider type, but only when the project has no type variant.
- **Loading state.** Confirm with the user how to show a panel whose content is still loading. Confirm only when the project has no loading state.

## Pre-flight checklist

- [ ] The page underneath the panel is needed while the panel is open. No critical content is hidden in the panel.
- [ ] Every task that must be finished or given up first is in a modal. Brief feedback is in a toast.
- [ ] Every variant and option on the panel is one the Recursica MCP server lists for the project. No side, width, size, or type variant is set unless the project has that variant. No variant or option is invented.
- [ ] A button opens the panel, with no route and no browser history entry. The one exception is a panel built on purpose for linking. A panel built for linking has both a route and a link that opens the panel.
- [ ] The header names the panel's purpose and is connected as the panel's accessible name.
- [ ] No card wraps the panel content, and no form, form section, or form control sits inside a card.
- [ ] Every form in the panel stacks the labels, uses a single column, and follows the application's one save mode.
- [ ] Label placement is one decision for the whole form. Every field in the form stacks, with no mix of stacked and side-by-side labels at one breakpoint.
- [ ] The panel footer has one primary action at the bottom right. The alternative sits directly to the left of the primary action.
- [ ] The panel is non-modal: the panel traps no focus. The page behind the panel stays usable and reachable by assistive technology.
- [ ] Focus moves into the panel when the panel opens. Focus returns to the element that opened the panel when the panel closes.
- [ ] Escape closes the panel without saving, and closing the panel is never pointer-only.
- [ ] Focus is not trapped, and the page behind the panel is not made inert.
- [ ] The page behind a non-modal panel stays readable and reachable by assistive technology.
- [ ] The tab order follows the visual order and does not jump unpredictably between the panel and the page.
- [ ] The close control has a real accessible name, and the focus ring is intact. No control or content the persona needs appears only on hover.
- [ ] Changes the panel makes to the page are announced, not only redrawn.
- [ ] No styling is set or overridden on the panel. No container or spacer is added to change the panel's look.
- [ ] The panel is non-modal: focus is not trapped, and the page behind the panel stays reachable by keyboard. The behavior was checked in the running application, not assumed from the settings in the code.
- [ ] No panel is nested inside another panel. Each stacked panel covers the first panel completely and uses the same side as the first panel.
- [ ] The panel sits flush against the left or right edge and runs full height. Panels are open on only one side.
- [ ] Nothing scrolls horizontally. Content that made the panel scroll up and down is on a page instead. The page repeats the context the content needed.
- [ ] The panel closes on a route change, unless the navigation only opens another panel or a modal.
- [ ] Below the tablet breakpoint, the panel opens as a page. More than two stacked panels, and any top or bottom panel, were approved before being built.
- [ ] Every form in the panel uses stacked label placement for every field. No table is inside the panel, and secondary material is in a separate tab.
- [ ] Closing a panel with unsaved form data asks first. Closing a panel the persona has not changed does not ask.
- [ ] Open questions were asked about, not decided: the opening transition, panel width, top or bottom panel design, divider visibility, and a loading state.
