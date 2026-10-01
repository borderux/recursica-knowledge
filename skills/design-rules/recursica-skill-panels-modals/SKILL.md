---
name: recursica-skill-panels-modals
description: House rules for choosing between a panel, a modal, and a page — mode as the real difference, the context test, never stacking modals, stacking and sides for panels, forms in panels, unsaved changes, and routes. Use when deciding where a task belongs. Not for the components themselves — see recursica-skill-panel and recursica-skill-modal.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Panels and modals

These are the house rules for deciding where a task lives: in a panel beside the page, in a modal over it, or on a page of its own. They are opinions, not neutral best practices — treat them as constraints.

These rules assume **complex enterprise web applications, designed for desktop first**, built on a design system whose components are already accessible. Which surface (a region that holds content, such as a page, panel, or modal) a task belongs on is your decision. What that surface looks like is not.

## The three governing principles

1. **Mode is the only real difference.** A modal covers the page and stops the user from interacting with the rest of the application — they are in a mode, which is what the word means. A panel is not modal: the user can still move around and do things in the application. Every other rule here follows from that one difference.
2. **Choose by how much the work depends on its context, not by how hard it is.** The question is whether the work needs the page it sits beside. Size and complexity come second, and cognitive load (the mental effort a task demands) is not the test at all.
3. **Never stack a mode on a mode, and never nest a surface inside itself.** Two modals must never be open at once. Once the user is in a mode, a second one leaves them with no idea where they are or what closing will do. A panel is not a mode, so a panel may open over another panel — but a panel must never contain one.

## Choosing the surface

Work through these in order:

| Ask                                                                                                            | If yes                                                          |
| -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Must the user interact with this, or make a decision here, before doing anything else?                         | A **modal**                                                     |
| Does the work change the contents of the thing behind it — adding to or editing a row of the list on the page? | A **modal** or a **panel**, never inline on the page. See below |
| Does the work need information from the page — or does the page need the panel's work?                         | A **panel**                                                     |
| Can the user do all of it without the page's context?                                                          | A **page**. Simpler, and it has room                            |
| Does the content cause scrolling inside the panel?                                                             | A **page**, even if context is needed. See below                |
| Is the viewport at a smaller breakpoint?                                                                       | A **page**. Panels become pages there                           |

The viewport is the visible area of the browser window. A breakpoint is the screen width at which the layout changes.

## The context test

**A panel is for work done alongside the work on the page.** The test is whether each depends on the other. Going into the panel helps the user keep track of what they were doing, and they need information on the page in order to work in the panel — or the other way round.

**When that context is not needed, a page is simpler.** If the user can do all the work without anything from the page behind, there is no reason to squeeze it into a narrow surface.

**A modal is only for when the user really needs to interact or decide inside it.** The mode is the cost, and something has to justify it.

### Work that changes what is behind it

**A form that adds to or edits the collection on the page belongs on a surface that opens and closes — never inline on the page beside it.** Creating a row in the table, or editing a record in the list: both go in a modal or a panel.

**The reason is the moment of saving, not the size of the form.** The list has to change visibly when the work succeeds, and closing the surface is what says it is done — the reader looks up and the row is there. An inline form leaves them looking at a form and a list at the same time, with no sign of which state either one is in, and no answer to "did that save?" except re-reading the list to check.

**Which of the two to use follows the ordinary test above.** A create form usually needs nothing from the page, so if it were only about context, it would be a page. But it is small, it is used now and then, and the reader wants to get back to exactly where they were — which is what these surfaces are for. Where the form really needs to read the list while it is open — picking rows to combine, or comparing against what already exists — that two-way dependence makes it a panel.

**Where the trigger sits is the list's own rule**, not this skill's: at the header of the table, on the right. See `recursica-skill-tables`, and `recursica-skill-screen-priority` on why a form used now and then does not get permanent space.

## A panel is semi-modal, and never shaded

**A panel is not modal. It is semi-modal.** The user is working in something that has a mode, but the mode is not exclusive — the rest of the page stays readable and reachable.

**NEVER draw a shader, scrim (a dimmed overlay), tint, or overlay behind an open panel.** There is no value in hiding the content. The whole reason a panel exists is that the user can see and work with what is behind it, so dimming it removes the panel's only reason to exist. This is not negotiable — it is the house's statement of how Recursica can work at all.

**A panel that has to shade the page is the wrong surface.** If the content behind really must be blocked, build a page or a real modal instead. Opening something small, working in it, and going straight back is not worth all that machinery.

**Mantine and MUI both draw an overlay behind a drawer by default, and the house overrides it.** A library's default is not a house rule — see `recursica-skill-design-router` and the adapter note in `recursica-skill-panel`.

### Terminology

- **Drawer and panel mean the same thing.** A drawer is a panel: a surface that slides in. A navigation drawer is a panel holding navigation, and it is no different in kind from a hamburger menu (a button with three horizontal lines that opens a menu).
- **A sidebar is not a drawer.** A sidebar is permanently on screen — the desktop alternative to a top navigation, down the left side. See `recursica-skill-navigation`.
- **Modal and dialog mean the same thing here.** A modal is a mode; a dialog box is one.

## Scrolling

**A panel MUST NEVER scroll sideways.** There is no exception, and no case that earns one. A sideways scrollbar inside a panel means the content does not belong in a panel — not that it needs a scrolling area.

**Scrolling up and down is the sign that the work belongs on a page.** Content that makes the user scroll down shows that too much is going on in there. Once it is more than the panel holds on a screen of normal resolution, move it to a page.

**Cognitive load is not the test.**

Hard work can properly live in a panel: a task with a high mental load may _need_ the information on the page beside it, and that need matters more than how hard it is. Do not move a task to a page because it is hard. Move it because it does not fit.

**When it moves to a page, repeat the context there.** It is better to reproduce what the user needed from the previous page on the new one than to force the work into a panel it does not fit.

## Geometry and side

**A panel is attached to an edge of the viewport and fills the viewport from top to bottom.** It runs flush against either the left or the right edge, and from the top of the viewport to the bottom. It is never set in from the edge, never floating, and never less than full height.

**Each panel is set to open from either the left or the right.** Both are standard, and the side belongs to that panel.

**A top or bottom edge is allowed but extremely unusual, and no design exists for one.** It could happen. It is not something to reach for, and because there is no designed treatment, a horizontal panel must be approved before you build it — see `recursica-skill-design-router`.

**NEVER open panels on both sides at the same time.** Only one side is in use at a time.

**Panels stacked on top of each other must all use the same side.** A second panel arriving from the opposite edge breaks whatever sense of space the user had built up.

**Stacked panels may be different widths.** The second does not have to match the first.

## Never stack modes

**NEVER open a modal from another modal.** If the user is in a mode, they do not go into modes within it.

**A modal on top of another modal, each with its own scrim over the content, must never happen.** Two overlays dimming the page is the anti-pattern that most reliably shows the flow was not designed.

**The one exception is replacing, not stacking.** A shared confirmation modal used across the application may appear after an action finishes inside another modal — but it appears in place of the modal that was there. The first modal goes away, and the new one appears. It is never on top. This is not ideal, and it exists because secondary modals get reused. It is not permission to chain modals together.

**NEVER nest a panel inside a panel.** A panel is a single object, not a container for another one. This ban is absolute.

**Opening a panel on top of another panel is allowed, though not ideal.** The second panel sits fully over the first and hides it completely, and closing the second shows the first again. That is stacking, not nesting, and the difference is the whole rule: a panel may be _covered_ by another panel, but it may never _contain_ one.

**Prefer a structure that does not need the second panel.** Stacking is allowed where drilling down really is the shape of the work. It is not something to reach for by default.

**There is no hard limit on how many panels may stack — but more than two needs the user's approval.** Two is the practical limit you may build to on your own. A third or more is not forbidden, and it is not a judgment call either: stop and ask before building it. See `recursica-skill-design-router`.

**A panel may open a modal.** A panel is not a mode, so opening a modal over one is not stacking modes. It is exactly how the unsaved-changes confirmation appears when a panel holding unsaved data is closed.

## Forms in a panel

**A panel may contain a form.** This is a normal case, not a compromise.

**Use stacked label placement for every field in it.** A panel is narrow, which is exactly the container-width condition that triggers stacking — and the whole form stacks, including the short fields that would have fitted side by side. One placement per form. Owned by `recursica-skill-forms`.

**If the form is long enough to make the panel scroll, it is not a panel form.** See the scrolling rule above.

## What a panel's content looks like

**NEVER put a table inside a panel.** A panel is narrow and a table needs width. The result either scrolls sideways, which is absolutely forbidden, or cuts every column down until it is useless. Where a panel needs to show several records, or several attributes of one record, they become groups of stacked fields, not rows and columns.

**Repeating structures inside a panel are groups of stacked fields.** One group for each item, with each field on its own line under its label. That is the shape a narrow surface supports.

**Secondary information goes in a second tab, not further down the same panel.** When a panel holds both the thing the user came for and supporting material — a history, an audit log, related records — putting them one after another makes the panel long and buries the main content. Tabs inside the panel separate them, and the main content is the tab that opens.

**A log is not a future state.** Where a panel shows a history, every entry in it has already happened. So none of them may be shown in a pending, upcoming, or toned-down style. A dimmed history looks like something scheduled rather than something done — see `recursica-skill-timeline`.

## Dismissal and unsaved work

**Both surfaces close the same way:** a close control in the header, and an action button in the footer.

**Closing a panel with unsaved changes should ask the user first.** This is no different from leaving a page with unsaved data, and that prompt is a proper use of a confirmation modal.

**Do not ask on every close.** A modal appearing every time the user closes a panel is an interruption. The prompt is called for when the user entered data into a form and never saved it — then a confirmation that they are throwing away their changes makes sense.

## Deep-linkable URLs

**A panel may have its own URL that can be linked to, on purpose — the same as a modal.** There are real cases for sending someone a URL that opens a particular view with that panel or modal already open.

**This is a deliberate decision, not a default.** Where it applies, the surface gets a route and a link trigger together. Owned by `recursica-skill-navigation`, which has the same exception for modals.

## Route changes

**A panel does not survive a route change.** Navigating away closes it.

**The exception is a route change whose only purpose is to open another panel or modal.** Where the navigation exists to open the next surface — including one deliberately built to be linked to — the panel already open is not closed by it. That is what makes a stacked panel reachable by URL.

## Below tablet

**Below the tablet breakpoint, every panel opens as a page instead.** Not a narrower panel, and not a full-screen overlay pretending to be one — a page.

**Tablet size and above keeps the panel.** The dividing line is the tablet breakpoint: at or above it, a panel is a panel. Below it, there are no panels anywhere in the application.

A panel gets its shape from sitting beside the page it depends on. Below the width where both fit, there is no "beside," so the idea of working alongside the page is gone, and the panel has nothing left to be.

**A modal where work is done becomes a page there too, and a confirmation does not.** The test is whether the user is doing work in it:

- **A small workflow, a form, or editing details in a modal → a page** below tablet size.
- **A confirmation modal stays a modal** at every width. "Are you sure you want to delete this?" is not work.

**MUST NOT reach for a surface native to one platform instead.** The iOS sheet (a panel that slides up from the bottom on iPhones) is the particular temptation, and it is forbidden. It does not exist on Android, and to someone who does not use that platform, it looks confusing rather than familiar. Keep the interaction patterns the desktop application already uses — see `recursica-skill-responsive-behavior`.

## Focus and navigation priority

**A modal or a panel comes first in navigation, ahead of the page beneath it.** Reaching it must not require moving through the whole page first.

**A modal traps focus.** It blocks the Tab key from moving through the page — while the modal is open, keyboard focus always stays inside it.

**A panel does not trap focus.** The user must be able to tab to other elements on the page, because a panel is not a modal state. This settles the question directly: a panel is non-modal (it leaves the rest of the page usable), and building one that traps focus contradicts the reason it exists.

## Decided elsewhere

- **What goes on inside the components** — the panel's and modal's padding, sizes, dividers, elevation (how raised a surface looks), and overlay treatment.
- **How wide a panel is.** `min-width` and `max-width` are fixed properties with no size options. Which side it opens from is yours to set, but its width is not.
- **How focus works inside a component.** The system provides it; your job is not to break it.

## Out of scope

- **The panel and modal components' own variants, states, and accessibility details** — `recursica-skill-panel` and `recursica-skill-modal`.
- **When a confirmation is called for at all, policy on destructive actions, and undo** — `recursica-skill-buttons-links`.
- **Routing and browser history in general** — `recursica-skill-navigation`.
- **Form layout, validation, and how saving works** — `recursica-skill-forms`.
- **Small attached surfaces — tooltips, hover cards, popovers.** Those are not modes, and they are not covered here.
- **Whether the backend saves everything at once.** Not a UI concern — see `recursica-skill-feedback-messaging`.

## Uncovered — ask, do not invent

- **What "more than the panel holds on a normal-resolution screen" is in numbers.** It was deliberately stated as a judgment about the scrolling it causes, rather than as a pixel limit.
- **What a top or bottom panel looks like.** It is allowed but not designed, which is why it needs approval rather than a rule.
- **Whether a panel's width may depend on its side.** Stacked panels may differ from each other, but nothing says whether a left panel and a right panel share a width.

## Pre-flight checklist

- [ ] You chose each surface by mode and context, not by how hard or how big the task is.
- [ ] Every modal exists because the user must interact or decide there before continuing.
- [ ] The work in every panel really depends on the page beside it, or the page depends on the panel's work.
- [ ] No form that adds to or edits the collection on the page sits inline beside it. Each one opens in a modal or panel, so that closing the surface is what confirms the list changed.
- [ ] No panel scrolls sideways, under any circumstances.
- [ ] Nothing in a panel causes scrolling up and down. You moved anything that did to a page.
- [ ] Every panel is flush against the left or right edge of the viewport and runs full height, from top to bottom.
- [ ] Only one side is in use at a time, and stacked panels all share that side.
- [ ] You got approval before building any top or bottom panel, since none is designed.
- [ ] You moved no task to a page just for being hard, when it still needed the page's context.
- [ ] Where work moved to a page, you reproduced the context it needed there.
- [ ] No modal opens another modal on top of it, and no two scrims are ever visible at once.
- [ ] Any reused confirmation modal replaces the modal that was open, instead of stacking on it.
- [ ] No panel is nested inside a panel. Any second panel stacks fully over the first, and shows it again when closed.
- [ ] You stacked panels only where that is the shape of the work, not by default, and you got approval before going beyond two stacked panels.
- [ ] Every form in a panel uses stacked label placement for all of its fields.
- [ ] There is no table inside a panel; repeating content is groups of stacked fields.
- [ ] Secondary material sits in a second tab, not below the main content.
- [ ] Nothing that has already happened is shown in a pending or toned-down style.
- [ ] Closing a panel with unsaved form data asks before throwing it away. Closing an untouched panel does not.
- [ ] Any panel or modal that can be linked to is there by deliberate decision, with a route and a link trigger.
- [ ] Panels close on a route change, except where the navigation exists only to open another panel or modal.
- [ ] Below the tablet breakpoint, every panel opens as a page — not as a narrow panel or a full-screen stand-in.
- [ ] Modals where work is done become pages below tablet size, and confirmations stay modals.
- [ ] No iOS or Android surface — no sheet — takes the place of a panel or modal below desktop size.
- [ ] No shader, scrim, or tint is drawn behind any open panel, and you overrode the library's default overlay.
- [ ] Nothing called a drawer is treated as a different thing from a panel, and no permanent sidebar is called a drawer.
- [ ] The modal traps focus. The panel does not, and the page behind it stays reachable by keyboard.
- [ ] You invented nothing from the uncovered list.
