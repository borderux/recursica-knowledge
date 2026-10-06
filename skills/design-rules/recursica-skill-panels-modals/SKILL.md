---
name: recursica-skill-panels-modals
description: House rules for choosing between a panel, a modal, and a page — mode as the real difference, the context test, never stacking modals, stacking and sides for panels, forms in panels, unsaved changes, and routes. Use when deciding where a task belongs. Not for the components themselves — see recursica-skill-panel and recursica-skill-modal.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Panels and modals

The house rules below decide where a task goes: in a panel beside the page, in a modal over the page, or on a separate page. The rules are the team's opinions, not neutral best practices. Treat every rule as a constraint.

The rules assume **complex enterprise web applications, designed for desktop first**, built on a design system with accessible components. Use the rules to choose the surface (a region that holds content, such as a page, panel, or modal) for each task. The components set how each surface looks, and the rules below do not.

## The three governing principles

1. **Mode is the only real difference between a panel and a modal.** A modal covers the page and stops the user from using any other part of the application. The user is in a mode, which is what the word "modal" means. A panel is never modal. With a panel open, the user can still move around and work in the application. Every other rule in the skill follows from the difference in mode.
2. **Choose by how much the task depends on the page, not by how hard the task is.** Ask whether the task needs the page beside the task. Size and complexity come second. Cognitive load is not the test at all.
3. **Never stack a mode on a mode, and never nest a panel inside a panel or a modal inside a modal.** Two modals must never be open at once. Once the user is in a mode, a second mode leaves the user with no idea where the user is or what closing will do. A panel is not a mode. A panel may therefore open over another panel, but a panel must never contain another panel.

## Page, panel, or modal

Ask the questions in the table in order:

| Question                                                                                                                    | If yes                                                                                                       |
| --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Must the user interact with the task, or make a decision in the task, before doing any other action?                        | A **modal**                                                                                                  |
| Does the work change the page behind the task, by adding to or editing a collection on the page, such as a table or a list? | A **modal** or a **panel**, never inline on the page. See "Forms that change a collection on the page" below |
| Does the work need information from the page, or does the page need the work done in the panel?                             | A **panel**                                                                                                  |
| Can the user do all of the work without the page's context?                                                                 | A **page**. A page is simpler and has room                                                                   |
| Does the content cause scrolling inside the panel?                                                                          | A **page**, even if the work needs the page's context. See "Scrolling" below                                 |
| Is the viewport at a smaller breakpoint?                                                                                    | A **page**. Panels become pages at smaller breakpoints                                                       |

## The context test

**A panel is for work done beside the work on the page.** The context test asks whether the work in the panel and the work on the page depend on each other. The user needs information on the page to work in the panel, or the page needs the work done in the panel. Working in a panel helps the user keep track of the work on the page.

**When the work does not need the page's context, a page is simpler.** If the user can do all the work without information from the page behind, squeezing the work into a narrow panel gains nothing.

**Use a modal only when the user needs to interact or decide inside the modal.** While a modal is open, the user cannot see or use any other part of the page.

### Forms that change a collection on the page

**A form that adds to or edits a collection on the page, such as a table or a list, goes in a modal or a panel.** Never put the form inline on the page beside the collection. Creating a row in a table and editing a record in a list both go in a modal or a panel.

**The reason is the moment of saving, not the size of the form.** The collection has to change visibly when the save succeeds. Closing the modal or panel tells the user the work is done, and the user looks up and sees the added or edited row in the list. An inline form leaves the user looking at a form and a list at the same time. Nothing shows which state the form or the list is in. The only answer to "did that save?" is to read the list again.

**Choose between a modal and a panel with the context test above.** A form that creates a record usually needs nothing from the page. By the context test alone, a create form would go on a page. But a create form is small and used now and then, and the user wants to get back to exactly the same place on the page. Modals and panels exist for that kind of task. When a form needs to read the list on the page while the form is open, the form and the page depend on each other, and the form goes in a panel. Picking rows to combine is one example. Comparing a new record against the records that exist is another.

**The control that opens the form sits in the table header, on the right.** `recursica-skill-tables` sets this rule, not the panels-and-modals skill. `recursica-skill-screen-priority` explains why a form used now and then gets no permanent space on the page.

## Panel mode and shading

**A panel is never modal.** While a panel is open, every other part of the page stays readable and reachable.

**NEVER draw a shader, scrim, tint, or overlay behind an open panel.** Hiding the page content gives the user nothing. A panel exists so the user can see and work with the page behind the panel. Dimming the page removes the only reason for the panel. The ban on shading behind a panel is not negotiable, and the ban is a core Recursica rule.

**A panel that has to shade the page is the wrong choice.** If the page behind the panel must be blocked, build a page or a real modal instead. A panel is for a small task: the user opens the panel, works in the panel, and goes straight back to the page. A small task like that does not need the page blocked.

**A code library may show an overlay behind a drawer by default, and the house rule overrides that default.** A code library's default is not a house rule. See `recursica-skill-design-router`, and the note in `recursica-skill-panel` on the defaults a code library sets.

### Terminology

- **Drawer and panel are two names for one component.** A drawer is a panel: a region that slides in. A navigation drawer is a panel that holds navigation. A navigation drawer is the same kind of component as a hamburger menu.
- **A sidebar is not a drawer.** A sidebar stays on screen at all times. A sidebar runs down the left side, and is the desktop alternative to a top navigation. See `recursica-skill-navigation`.
- **Modal and dialog are two names for one component in this skill.** A modal is a mode, and a dialog box is a mode too.

## Scrolling

**A panel MUST NEVER scroll horizontally.** The rule has no exception, for any content. A horizontal scrollbar inside a panel means the content does not belong in a panel. The scrollbar does not mean the content needs a scrolling area.

**Scrolling up and down in a panel is the sign that the work belongs on a page.** Content that makes the user scroll down shows that the panel holds too much. When the content is more than the panel holds on a screen of normal resolution, move the content to a page.

**Cognitive load is not the test.** A hard task can properly go in a panel. A task with a high mental load may _need_ the information on the page beside the panel, and that need matters more than how hard the task is. Do not move a task to a page because the task is hard. Move a task to a page because the task does not fit in the panel.

**When a task moves to a page, repeat the context on the new page.** Show on the new page the information the user needed from the previous page. Repeating the context is better than forcing the work into a panel the work does not fit.

## Panel position and side

**A panel is attached to an edge of the viewport and fills the viewport from top to bottom.** A panel sits flush against the left or the right edge, and runs from the top of the viewport to the bottom. A panel is never set in from the edge, never floating, and never less than full height.

**The designer chooses the left or the right side for each panel.** Both sides are standard. The side is part of the design of that one panel.

**A panel on the top or bottom edge is allowed but extremely unusual, and no design exists for a top or bottom panel.** Do not choose the top or bottom edge without a specific reason. Get approval before building a top or bottom panel, because no design exists for one. See `recursica-skill-design-router`.

**NEVER open panels on both sides at the same time.** Use only one side at a time.

**Panels stacked on top of each other must all use the same side.** A second panel that opens from the opposite edge breaks the sense of space the user has built up.

**Stacked panels may be different widths.** The second panel does not have to match the width of the first panel.

## Stacked modals and panels

**NEVER open a modal from another modal.** A user in a mode does not enter a second mode inside the first mode.

**A modal on top of another modal, each with a scrim over the content, must never happen.** Two overlays dimming the page is the anti-pattern that most reliably shows that nobody designed the flow.

**The one exception to the ban on stacking modals is replacing a modal.** A shared confirmation modal used across the application may appear after an action finishes inside another modal. The confirmation modal appears in place of the first modal. The first modal closes, and the confirmation modal opens. The confirmation modal is never on top of the first modal. The exception is not ideal. The exception exists because secondary modals get reused. The exception does not permit chaining modals together.

**NEVER nest a panel inside a panel.** A panel is a single object, not a container for another panel. The ban on nesting is absolute.

**Opening a panel on top of another panel is allowed, though not ideal.** The second panel sits fully over the first panel and hides the first panel completely. Closing the second panel shows the first panel again. Opening one panel over another is stacking, not nesting, and the rule rests on that difference. A panel may be _covered_ by another panel, but a panel may never _contain_ another panel.

**Prefer a design that does not need a second panel.** Stacking is allowed where the work drills down from one item into the next item. Do not stack panels by default.

**The number of stacked panels has no hard limit, but more than two stacked panels need the user's approval.** Build up to two stacked panels without asking. A third stacked panel is not forbidden, and a third panel is not a judgment call either. Stop and ask before building a third stacked panel or more. See `recursica-skill-design-router`.

**A panel may open a modal.** A panel is not a mode. A modal opened over a panel therefore does not stack one mode on another mode. A confirmation for unsaved changes is a modal opened from a panel. The confirmation appears when the user closes a panel that holds unsaved data.

## Forms in a panel

**A panel may contain a form.** A form in a panel is a normal case, not a compromise.

**Use stacked label placement for every field in a form in a panel.** A panel is narrow. In a narrow container, the container-width test stacks the labels. The whole form stacks, including the short fields that would fit side by side. A form has one label placement. `recursica-skill-forms` sets this rule.

**A form long enough to make the panel scroll is not a panel form.** See the scrolling rules above.

## Panel content

**NEVER put a table inside a panel.** A panel is narrow, and a table needs width. A table in a panel either scrolls horizontally, which is forbidden without exception, or cuts every column down until the table is useless. Where a panel needs to show several records, or several attributes of one record, show the records or attributes as groups of stacked fields, not as rows and columns.

**Show repeated content inside a panel as groups of stacked fields.** Use one group for each repeated item. Put each field on a separate line, under the field's label. A narrow panel has room for one field per line.

**Put secondary information in a second tab, not further down the same panel.** A panel may hold both the content the user came for and supporting material, such as a history, an audit log or related records. Placing the supporting material after the main content makes the panel long and buries the main content. Tabs inside the panel separate the main content from the supporting material. The tab with the main content is open when the panel opens.

**Where a panel shows a history, never show an entry in a pending, upcoming, or toned-down style.** A log is not a future state. Every entry in the history has already happened. A dimmed history looks scheduled rather than done. See `recursica-skill-timeline`.

## Closing and unsaved changes

**A panel and a modal close the same way:** with a close control in the header, and with an action button in the footer.

**Closing a panel with unsaved changes should ask the user first.** Closing the panel is no different from leaving a page with unsaved data. Asking the user is a proper use of a confirmation modal.

**Do not ask on every close.** A modal that appears every time the user closes a panel interrupts the user. The confirmation modal fits when the user entered data into a form and never saved the data. A confirmation that the user is throwing away the changes then makes sense.

## Links to a panel or modal

**A panel may have a separate URL that a user can link to, on purpose, the same as a modal.** Sometimes a user needs to send another person a URL that opens a particular view with the panel or modal already open.

**A link to a panel or modal is a deliberate decision, not a default.** Where a panel or modal gets a link, the panel or modal gets a route and a link that opens the panel or modal, together. `recursica-skill-navigation` sets this rule, and has the same exception for modals.

## Route changes

**A route change closes the panel.** Navigating away closes any open panel.

**The exception is a route change whose only purpose is to open another panel or modal.** Where the navigation exists to open the next panel or modal, including one built on purpose for linking, the navigation does not close the open panel. The exception lets a URL reach a stacked panel.

## Below the tablet breakpoint

**Below the tablet breakpoint, every panel opens as a page instead.** Do not use a narrower panel, or a full-screen overlay styled as a panel. Use a page.

**At the tablet breakpoint and above, a panel stays a panel.** The tablet breakpoint is the dividing line. Below the tablet breakpoint, the application has no panels at all.

A panel exists to sit beside the page the panel depends on. Below the width where a panel and the page fit side by side, the panel cannot sit beside the page. Below that width, the panel has no purpose.

**Below the tablet breakpoint, a modal where the user does work also becomes a page, and a confirmation modal does not.** The test is whether the user does work in the modal:

- **A small workflow, a form, or editing details in a modal becomes a page** below the tablet breakpoint.
- **A confirmation modal stays a modal** at every width. "Are you sure you want to delete this?" is not work.

**MUST NOT use a surface native to one platform instead.** The iOS sheet (a panel that slides up from the bottom on iPhones) is the most likely substitute, and the iOS sheet is forbidden. Android has no iOS sheet. A user who does not use iOS finds the sheet confusing rather than familiar. Keep the interaction patterns the desktop application already uses. See `recursica-skill-responsive-behavior`.

## Focus and navigation priority

**A modal or a panel comes first in navigation, ahead of the page beneath the modal or panel.** A user must reach the modal or panel without moving through the whole page first.

**A modal traps focus.** The modal stops the Tab key from moving through the page. While the modal is open, keyboard focus always stays inside the modal.

**A panel does not trap focus.** The user must be able to tab to other elements on the page, because a panel is not a modal state. A panel is non-modal (the page behind stays usable). A panel that traps focus contradicts the reason a panel exists.

## Set by the theme or the component

- **Panel and modal styling inside the components:** padding, sizes, dividers, elevation (the shadow that makes a surface look raised), and overlay treatment.
- **Panel width.** In the standard UI kit (the unchanged UI kit in the official Recursica release), the panel's minimum and maximum width are fixed. If the project has a size variant, use the size variant. Otherwise, do not set the panel width. The designer still chooses the side each panel opens from.
- **Focus inside a component.** The design system provides focus behavior inside each component. Do not break the focus behavior.

## Out of scope

- **The variants, states, and accessibility details of the panel and modal components** — `recursica-skill-panel` and `recursica-skill-modal`.
- **When to ask for a confirmation at all, policy on destructive actions, and undo** — `recursica-skill-buttons-links`.
- **Routing and browser history in general** — `recursica-skill-navigation`.
- **Form layout, validation, and saving behavior** — `recursica-skill-forms`.
- **Tooltips, hover cards, and popovers.** Tooltips, hover cards, and popovers are small attached components, not modes, and are outside the panels-and-modals skill.
- **Whether the backend saves all data at once.** The backend save is not a UI concern. See `recursica-skill-feedback-messaging`.

## Open questions

- **The scrolling limit in numbers.** The skill gives no number for how much content is "more than the panel holds on a normal-resolution screen." The limit was stated on purpose as a judgment about the scrolling the content causes, rather than as a pixel limit.
- **What a top or bottom panel looks like.** A top or bottom panel is allowed but not designed. A top or bottom panel therefore needs approval rather than a rule.
- **Whether a panel's width may depend on the panel's side.** Stacked panels may differ in width from each other. No rule says whether a left panel and a right panel share a width.

## Pre-flight checklist

- [ ] The choice of page, panel, or modal for each task follows from mode and context, not from how hard or how big the task is.
- [ ] Every modal exists because the user must interact or decide in the modal before continuing.
- [ ] The work in every panel depends on the page beside the panel, or the page depends on the panel's work.
- [ ] No form that adds to or edits a collection on the page sits inline beside the collection. Each such form opens in a modal or panel, so that closing the modal or panel confirms the list changed.
- [ ] No panel scrolls horizontally, under any circumstances.
- [ ] No content in a panel causes scrolling up and down. Content that caused scrolling is on a page.
- [ ] Every panel is flush against the left or right edge of the viewport and runs full height, from top to bottom.
- [ ] Panels are open on only one side at a time, and stacked panels all share that side.
- [ ] Any top or bottom panel has approval, since no top or bottom panel has a design.
- [ ] No task that needs the page's context has moved to a page only because the task is hard.
- [ ] Where work moved to a page, the context the work needs is repeated on that page.
- [ ] No modal opens another modal on top of the first modal, and no two scrims are ever visible at once.
- [ ] Any reused confirmation modal replaces the modal that was open, instead of stacking on the open modal.
- [ ] No panel is nested inside a panel. Any second panel stacks fully over the first panel, and closing the second panel shows the first panel again.
- [ ] Panels stack only where the work drills down, not by default, and any stack of more than two panels has approval.
- [ ] Every form in a panel uses stacked label placement for every field in the form.
- [ ] No panel holds a table. Repeated content in a panel is shown as groups of stacked fields.
- [ ] Secondary material sits in a second tab, not below the main content.
- [ ] Nothing that has already happened is shown in a pending or toned-down style.
- [ ] Closing a panel with unsaved form data asks before throwing the data away. Closing a panel the user has not touched does not ask.
- [ ] Every panel or modal that a URL can link to was built for linking by deliberate decision, with a route and a link that opens the panel or modal.
- [ ] Panels close on a route change, except where the navigation exists only to open another panel or modal.
- [ ] Below the tablet breakpoint, every panel opens as a page, not as a narrower panel or a full-screen overlay styled as a panel.
- [ ] Modals where the user does work become pages below the tablet breakpoint, and confirmation modals stay modals.
- [ ] No surface native to iOS or Android, such as a sheet, takes the place of a panel or modal below desktop size.
- [ ] No shader, scrim, or tint is drawn behind any open panel, and the code library's default overlay is overridden.
- [ ] Every drawer is treated as a panel, and no permanent sidebar is called a drawer.
- [ ] Every modal traps focus. No panel is modal or traps focus, and the page behind a panel stays reachable by keyboard.
- [ ] Open questions were asked about, not decided: the scrolling limit in numbers, what a top or bottom panel looks like, and whether a panel's width depends on the panel's side.
