---
name: recursica-skill-panels-modals
description: House rules for choosing between a panel, a modal, and a page — mode as the real difference, the context test, never stacking modals, stacking and sides for panels, forms in panels, unsaved changes, and routes. Use when deciding where a task belongs. Not for the components themselves — see recursica-skill-panel and recursica-skill-modal.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Panels and modals

Use the house rules below to decide where a task goes. A task goes in a panel beside the page, in a modal over the page, or on a separate page. Treat every rule as a constraint. The rules are the team's opinions, not neutral best practices.

The rules are written for **complex enterprise web applications, designed for desktop first**. The applications are built on a design system with accessible components. The components set how a page, a panel and a modal look, and the rules below do not.

## The three governing principles

1. **Mode is the only real difference between a panel and a modal.** A modal covers the page. While a modal is open, the persona cannot use any other part of the application. That blocked state is a mode, which is where the word "modal" comes from. A panel is never modal. While a panel is open, the persona can still move around and work in the application. Every other rule below follows from the difference in mode.
2. **Choose by how much the task depends on the page, not by how hard the task is.** Ask whether the task needs the page beside the task. Size and complexity come second. Cognitive load is not the test at all.
3. **Never stack a mode on a mode. Never nest a panel inside a panel, or a modal inside a modal.** Two modals must never be open at once. With two modals open, the persona cannot tell where the persona is, or what closing will do. A panel is not a mode. A panel may therefore open over another panel, but a panel must never contain another panel.

## Page, panel, or modal

Ask the questions in the table in order.

| Question                                                                                           | If yes                                                                                                                                                       |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Must the persona interact or decide in the task before taking any other action?                    | A **modal**                                                                                                                                                  |
| Does the task add to or edit a collection on the page, such as a table or a list?                  | A short form: a **modal** or a **panel**. A long form: a separate **page**. Never inline on the page. See "Forms that change a collection on the page" below |
| Does the task need information from the page, or does the page need the task done beside the page? | A **panel**                                                                                                                                                  |
| Can the persona do the whole task without the page's context?                                      | A **page**. A page is simpler and has more room                                                                                                              |
| Would the content make the panel scroll?                                                           | A **page**, even if the task needs the page's context. See "Scrolling" below                                                                                 |
| Is the viewport at a smaller breakpoint?                                                           | A **page**. Panels become pages at smaller breakpoints                                                                                                       |

## The context test

**Use a panel for work done beside the work on the page.** The context test asks whether the task in the panel and the page depend on each other. The task and the page depend on each other in two cases:

- The persona needs information on the page to do the task in the panel. For example, the persona copies an order number from a table on the page into the panel.
- The page needs the work done in the panel.

A panel keeps the page in view, so the persona keeps track of the work on the page.

**A task that does not need the page is simpler on a separate page.** When the persona can do the whole task without information from the page, a narrow panel gains nothing.

**Use a modal only when the persona needs to interact or decide inside the modal.** For example, "Delete 3 orders?" asks the persona for a decision. While a modal is open, the persona cannot see or use any other part of the page.

### Forms that change a collection on the page

**Put a short form that adds to or edits a collection on the page in a modal or a panel.** A table and a list are examples of a collection. Adding a row to a table and editing a record in a list are examples of such a form. Give a long form a separate page. A short form has fewer than five fields. A long form has five or more. Never put the form inline on the page beside the collection.

**Never put the form inline, because of what happens when the form saves.** The collection has to change visibly when the save succeeds. Closing the modal or panel tells the persona the work is done. The persona looks up and sees the added or edited row in the list. An inline form leaves the persona looking at a form and a list at the same time. Nothing shows whether the form saved or whether the list changed. The only answer to "did that save?" is to read the list again.

**Use a modal for the form, unless the persona needs information from the page to fill in the form.** In that case, use a panel, so the page stays in view beside the form. For example, the persona picks table rows to combine, or compares a new record with the existing records.

**Put the control that opens the form in the table header, on the right.** `recursica-skill-tables` sets the rule for that control, not the panels-and-modals skill. `recursica-skill-screen-priority` explains why a form used now and then gets no permanent space on the page.

## Panel mode and shading

**Never make a panel modal.** While a panel is open, keep every other part of the page readable and reachable.

**NEVER draw a shader, scrim, tint, or overlay behind an open panel.** Hiding the page content does not help the persona. A panel exists so the persona can see and work with the page behind the panel. Dimming the page removes the only reason for the panel. The ban on shading behind a panel is not negotiable, and the ban is a core Recursica rule.

**If the page behind the panel must be blocked, build a page or a real modal instead of a panel.** A panel is for a small task. The persona opens the panel, does the task and goes straight back to the page. A small task like that does not need the page blocked.

**Turn off the overlay that a code library may show behind a drawer by default.** The ban on shading overrides the code library's default. A code library's default is not a house rule. See `recursica-skill-design-router`, and the note in `recursica-skill-panel` on the defaults a code library sets.

### Terminology

- **Drawer and panel are two names for one component.** A drawer is a panel, a region that slides in. A navigation drawer is a panel that holds navigation. A navigation drawer is the same kind of component as a hamburger menu.
- **A sidebar is not a drawer.** A sidebar stays on screen at all times. A sidebar runs down the left side, and is the desktop alternative to a top navigation. See `recursica-skill-navigation`.
- **In this skill, modal and dialog are two names for one component.** A modal and a dialog box both put the persona in a mode.

## Scrolling

**A panel MUST NEVER scroll horizontally.** The rule has no exception, for any content. Content that needs a horizontal scrollbar does not belong in a panel, even inside a scrolling area.

**Move the content to a page when the panel's content is more than the panel holds on a normal-resolution screen.** When the persona has to scroll up and down in a panel, the work belongs on a page.

**Do not move a task to a page because the task is hard.** Move a task to a page when the task does not fit in the panel. Cognitive load is not the test.

- A hard task can properly go in a panel.
- A hard task may _need_ the information on the page beside the panel. For example, matching payments to invoices is hard, and the persona needs the invoice list in view.
- The need for the page's information matters more than how hard the task is.

**When a task moves to a page, repeat the context on the new page.** Show the information the persona needed from the previous page. For example, a page for editing an order shows the order's customer and total. Repeating the information is better than forcing the work into a panel that is too small.

## Panel position and side

**Attach every panel to an edge of the viewport, and fill the viewport from top to bottom.**

- Place the panel flush against the left or the right edge.
- Run the panel from the top of the viewport to the bottom.
- Never set a panel in from the edge, let a panel float, or make a panel less than full height.

**The agent or the user chooses the left or right side for each panel.** Both sides are standard. The side is part of the design of that one panel.

**A panel on the top or bottom edge is allowed but extremely unusual.** Do not choose the top or bottom edge without a specific reason. Confirm with the user before building a top or bottom panel. No design exists for a top or bottom panel. See `recursica-skill-design-router`.

**NEVER open panels on both sides at the same time.**

**Stacked panels (panels opened on top of each other) must all use the same side.** A second panel from the opposite edge breaks the persona's mental picture of the screen layout.

**Stacked panels may be different widths.** The second panel does not have to match the width of the first panel.

## Stacked modals and panels

**NEVER open a modal from another modal.** A persona in one mode never enters a second mode inside the first mode.

**A modal must never sit on top of another modal, with two scrims dimming the page content.** Two scrims dimming the page are the most reliable sign that nobody designed the flow.

**The one exception to the ban on stacking modals is replacing a modal.** A shared confirmation modal used across the application may appear after an action finishes inside another modal.

- Close the first modal, then open the confirmation modal in place of the first modal.
- Never show the confirmation modal on top of the first modal.

The exception is not ideal. The exception exists because an application reuses secondary modals, such as a shared confirmation modal. The exception does not permit chaining modals together.

**NEVER nest a panel inside a panel.** A panel is a single object, not a container for another panel. The ban on nesting is absolute.

**A panel may open on top of another panel, though stacking panels is not ideal.** Opening one panel over another panel is stacking, not nesting.

- The second panel sits fully over the first panel and hides the first panel completely.
- Closing the second panel shows the first panel again.

A panel may be _covered_ by another panel, but a panel may never _contain_ another panel.

**Prefer a design that does not need a second panel.** Stacking is allowed where the work drills down from one item into the next item. For example, an order panel opens a second panel for one line item of the order. Do not stack panels by default.

**Confirm with the user before stacking a third panel.** The number of stacked panels has no hard limit. Build up to two stacked panels without confirming with the user. From the third stacked panel on, the user decides, not the agent. See `recursica-skill-design-router`.

**A panel may open a modal.** A panel is not a mode. A modal opened over a panel therefore does not stack one mode on another mode. A confirmation for unsaved changes is a modal opened from a panel. The confirmation appears when the persona closes a panel that holds unsaved data.

## Forms in a panel

**A panel may contain a form.** A form in a panel is a normal case, not a compromise.

**Use stacked label placement for every field in a form in a panel.** A panel is narrow, and the container-width test stacks the labels in a narrow container. Short fields that would fit side by side stack too, because a form has one label placement. `recursica-skill-forms` sets this rule.

**Do not put a form in a panel when the form is long enough to make the panel scroll.** See the scrolling rules above.

## Panel content

**NEVER put a table inside a panel.** A panel is narrow, and a table needs width. A table in a panel either scrolls horizontally or narrows every column until nobody can read the table. Scrolling horizontally in a panel is forbidden without exception. Use groups of stacked fields instead of rows and columns:

- Show several records in a panel as groups of stacked fields.
- Show several attributes of one record in a panel as groups of stacked fields.

**Show repeated content inside a panel as groups of stacked fields.** Use one group for each repeated item. Put each field on a separate line, under the field's label. A narrow panel has room for one field per line. For example, a panel listing three contacts shows three groups. Each group shows a name, an email and a phone number on separate lines.

**Put secondary information in a second tab of the panel, not further down the same tab.** Secondary information includes a history, an audit log and related records. For example, an order panel has a Details tab and a History tab. Secondary information placed after the main content makes the panel long and buries the main content. When the panel opens, show the tab with the main content.

**Where a panel shows a history, never show an entry in a pending, upcoming, or toned-down style.** A history is not a future state. Every entry in a history has already happened. A dimmed entry looks scheduled rather than done. See `recursica-skill-timeline`.

## Closing and unsaved changes

**A panel and a modal close the same way.** Both close with a close control in the header, and with an action button in the footer.

**Before a panel with unsaved changes closes, the application should ask the persona.** Closing the panel is no different from leaving a page with unsaved data. A confirmation modal is a proper way to ask.

**Do not ask every time a panel closes.** A confirmation modal fits when the persona entered data into a form and never saved the data. In that case, the persona is about to throw the changes away. A confirmation modal on every close interrupts the persona.

## Links to a panel or modal

**A panel may have a separate URL that a persona can link to on purpose, the same as a modal.** A persona may need to send another person a URL. The URL opens a particular view with the panel or modal already open. For example, a persona sends a coworker a link that opens the Orders page with one order's panel already open.

**A link to a panel or modal is a deliberate decision, not a default.** Give a panel or modal built for linking both a route and a link that opens the panel or modal. `recursica-skill-navigation` sets this rule, and the navigation skill makes the same exception for modals.

## Route changes

**A route change closes the open panel.** Navigating away closes any open panel. For example, clicking a link to the Customers page closes an open order panel.

**The exception is a route change whose only purpose is to open another panel or modal.** That route change leaves the open panel open. The exception includes a panel or modal built on purpose for linking. The exception lets a URL open a stacked panel.

## Below the tablet breakpoint

**Below the tablet breakpoint, open every panel as a page instead.** Do not use a narrower panel, or a full-screen overlay styled as a panel.

**At the tablet breakpoint and above, a panel stays a panel.** Below the tablet breakpoint, the application has no panels at all.

A panel exists to sit beside the page the panel depends on. On a screen too narrow for a panel and the page side by side, a panel has no purpose.

**Below the tablet breakpoint, a modal where the persona does work also becomes a page.** The test is whether the persona does work in the modal:

- **A small workflow, a form, or editing details in a modal becomes a page** below the tablet breakpoint.
- **A confirmation modal stays a modal** at every width. "Are you sure you want to delete this?" is not work.

**An application MUST NOT replace a page, panel or modal with a pattern native to one platform.** The iOS sheet (a panel that slides up from the bottom on iPhones) is the most likely substitute, and the iOS sheet is forbidden. Android does not use the iOS sheet. A persona who does not use iOS finds the sheet confusing rather than familiar. Keep the interaction patterns the desktop application uses. See `recursica-skill-responsive-behavior`.

## Focus and navigation priority

**A modal or a panel comes first in navigation, ahead of the page beneath the modal or panel.** A persona must reach the modal or panel without moving through the whole page first.

**A modal traps focus.** While the modal is open, keyboard focus always stays inside the modal. The Tab key never moves into the page.

**A panel does not trap focus.** The persona must be able to reach other elements on the page with the Tab key. A panel is non-modal (the page behind stays usable). A panel that traps focus blocks the page the panel exists to keep usable.

## Set by the theme or the component

- **Panel and modal styling inside the components:** padding, sizes, dividers, elevation (the shadow that makes a layer, card, menu, popover, panel or modal look raised), and overlay treatment.
- **Panel width.** In the standard UI kit (the unchanged UI kit in the official Recursica release), the panel's minimum and maximum width are fixed. If the theme (the design a designer sets in Theme Forge: the token values, and each component's variants, states and sizes) has a size variant, use the size variant. Otherwise, do not set the panel width. The user still chooses the side each panel opens from.
- **Focus inside a component.** The design system provides focus behavior inside each component. Do not break the focus behavior.

## Out of scope

- **The variants, states, and accessibility details of the panel and modal components** — `recursica-skill-panel` and `recursica-skill-modal`.
- **When to ask for a confirmation at all, policy on destructive actions, and undo** — `recursica-skill-buttons-links`.
- **Routing and browser history in general** — `recursica-skill-navigation`.
- **Form layout, validation, and saving behavior** — `recursica-skill-forms`.
- **Tooltips, hover cards, and popovers.** Tooltips, hover cards, and popovers are small components attached to one element, not modes, and are outside the panels-and-modals skill.
- **Whether the backend saves all data at once.** The backend save is not a UI concern. See `recursica-skill-feedback-messaging`.

## Open questions

- **The scrolling limit in numbers.** No number defines the phrase "more than the panel holds on a normal-resolution screen" in the scrolling rules. The team stated the limit on purpose as a judgment about the scrolling the content causes. The team did not state a pixel limit.
- **What a top or bottom panel looks like.** A top or bottom panel is allowed but not designed. Building a top or bottom panel is therefore confirmed with the user, not settled by a rule.
- **Whether a panel's width may depend on the panel's side.** Stacked panels may differ in width from each other. No rule says whether a left panel and a right panel share a width.

## Pre-flight checklist

- [ ] The choice of page, panel, or modal for each task follows from mode and context. The choice does not follow from how hard or how big the task is.
- [ ] Every modal exists because the persona must interact or decide in the modal before continuing.
- [ ] The work in every panel depends on the page beside the panel, or the page depends on the panel's work.
- [ ] No form that adds to or edits a collection on the page sits inline beside the collection. Each short form opens in a modal or panel, so that closing the modal or panel confirms the list changed. Each long form opens on a separate page.
- [ ] No panel scrolls horizontally, under any circumstances.
- [ ] No content in a panel causes scrolling up and down. Content that caused scrolling is on a page.
- [ ] Every panel is flush against the left or right edge of the viewport. Every panel runs full height, from top to bottom.
- [ ] Panels are open on only one side at a time, and stacked panels all share that side.
- [ ] Any top or bottom panel was confirmed with the user, since no top or bottom panel has a design.
- [ ] No task that needs the page's context has moved to a page only because the task is hard.
- [ ] Where work moved to a page, the context the work needs is repeated on that page.
- [ ] No modal opens another modal on top of the first modal, and no two scrims are ever visible at once.
- [ ] Any reused confirmation modal replaces the modal that was open, instead of stacking on the open modal.
- [ ] No panel is nested inside a panel. Any second panel stacks fully over the first panel, and closing the second panel shows the first panel again.
- [ ] Panels stack only where the work drills down, not by default. Any stack of more than two panels was confirmed with the user.
- [ ] Every form in a panel uses stacked label placement for every field in the form.
- [ ] No panel holds a table. Repeated content in a panel is shown as groups of stacked fields.
- [ ] Secondary material sits in a second tab, not below the main content.
- [ ] Nothing that has already happened is shown in a pending or toned-down style.
- [ ] Closing a panel with unsaved form data asks before throwing the data away. Closing a panel the persona has not touched does not ask.
- [ ] Every panel or modal that a URL can link to was built for linking by deliberate decision. Each such panel or modal has a route and a link that opens the panel or modal.
- [ ] Panels close on a route change, except where the navigation exists only to open another panel or modal.
- [ ] Below the tablet breakpoint, every panel opens as a page.
- [ ] Below the tablet breakpoint, no panel opens as a narrower panel or a full-screen overlay styled as a panel.
- [ ] Modals where the persona does work become pages below the tablet breakpoint, and confirmation modals stay modals.
- [ ] Below desktop size, no pattern native to iOS or Android takes the place of a panel or modal. A sheet is one such pattern.
- [ ] No shader, scrim, or tint is drawn behind any open panel, and the code library's default overlay is overridden.
- [ ] Every drawer is treated as a panel, and no permanent sidebar is called a drawer.
- [ ] Every modal traps focus. No panel is modal or traps focus, and the page behind a panel stays reachable by keyboard.
- [ ] Open questions were asked about, not decided: the scrolling limit in numbers, what a top or bottom panel looks like, and whether a panel's width depends on the panel's side.
