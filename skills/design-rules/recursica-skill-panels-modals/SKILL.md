---
name: recursica-skill-panels-modals
description: House rules for choosing between a panel, a modal, and a dedicated page in enterprise web applications — mode as the only real difference, the context test that decides which one, why cognitive load is not the criterion, never stacking modals, never nesting a panel though stacking is permitted, edge anchoring with one side at a time, no horizontal scrolling ever, forms in a panel, unsaved-change protection, route changes, and panels becoming pages at smaller breakpoints. Use when deciding where a task belongs, or adding or reviewing a panel, drawer, modal, or dialog. Trigger on "panel", "modal", "dialog", "drawer", "should this be a page", "stacked panels", "nested panel", "which side", "unsaved changes", or a question about where a task lives. Do NOT use for the components' own internals — those are recursica-skill-panel and recursica-skill-modal.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Panels and modals

House rules for deciding where a task lives: in a panel beside the page, in a modal over it, or on a page of its own. These are opinions, not neutral best practices — apply them as constraints.

Context these rules assume: **complex enterprise web applications, desktop-first**, built on a design system whose components are already accessible. Which surface a task belongs on is your decision. What that surface looks like is not.

## The three governing principles

1. **Mode is the only real difference.** A modal obscures the page and stops the user interacting with the rest of the application — they are in a mode, which is what the word means. A panel is not modal: the user can still navigate around and do things in the application. Every other rule here follows from that one distinction.
2. **Choose by context dependence, not by difficulty.** The question is whether the work needs the page it sits beside. Size and complexity come second, and cognitive load is not the criterion at all.
3. **Never stack a mode on a mode, and never nest a surface inside itself.** Two modals must never be open at once — once the user is in a mode, a second one leaves them with no model of where they are or what closing will do. A panel is not a mode, so a panel may open over another panel; what a panel must never do is contain one.

## Choosing the surface

Work through these in order:

| Ask                                                                                    | If yes                                           |
| -------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Must the user interact with this, or make a decision here, before doing anything else? | A **modal**                                      |
| Does the work change the contents of the thing behind it — adding to or editing a row of the list on the page? | A **modal** or a **panel**, never inline on the page. See below |
| Does the work need information from the page — or does the page need the panel's work? | A **panel**                                      |
| Can the user do all of it without the page's context?                                  | A **page**. Simpler, and it has room             |
| Does the content induce scrolling inside the panel?                                    | A **page**, even if context is needed. See below |
| Is the viewport at a smaller breakpoint?                                               | A **page**. Panels become pages there            |

## The context test

**A panel is for work done in parallel with the work on the page.** The test is mutual dependence: going into the panel helps the user stay in context of what they were doing, and they need information on the page in order to work in the panel — or the reverse.

**When that context is not necessary, a page is simpler.** If the user can do all the work without anything from the page behind, there is no reason to constrain it to a narrow surface.

**A modal is only for when the user truly needs to interact or decide inside it.** The mode is the cost; something has to justify it.

### Work that changes what is behind it

**A form that adds to or edits the collection on the page belongs on a surface that opens and closes — never inline on the page beside it.** Creating a row in the table, editing a record in the list: both go in a modal or a panel.

**The reason is the commit, not the size of the form.** The list has to visibly change when the work succeeds, and **closing the surface is what says it is done** — the reader looks up and the row is there. An inline form leaves them looking at a form and a list at the same time with no signal which state either is in, and no answer to "did that save?" beyond re-reading the list to check.

**Which of the two follows the ordinary test above.** A create form usually needs nothing from the page, so if it were only about context it would be a page — but it is small, it is occasional, and the reader wants to return to exactly where they were, which is what these surfaces are for. Where the form genuinely needs to read the list while it is open — picking rows to combine, comparing against what exists — that mutual dependence is a panel.

**Where the trigger sits is the list's own rule**, not this skill's: at the header of the table, to the right. See `recursica-skill-tables`, and `recursica-skill-screen-priority` on why an occasional form does not hold permanent space.

## A panel is semi-modal, and never shaded

**A panel is not modal. It is semi-modal.** The user is interacting with something in a mode, but the mode is not exclusive — the rest of the page stays readable and reachable.

**NEVER draw a shader, scrim, tint, or overlay behind an open panel.** There is no value in hiding the content. The entire reason a panel exists is that the user can see and work with what is behind it, so dimming it removes the panel's only justification. **This is not negotiable — it is the way the house says Recursica can work at all.**

**A panel that has to shade the page is the wrong surface.** If the content behind genuinely must be blocked, build a page or a real modal instead. Opening something small, working in it, and going straight back is not a pattern worth the machinery.

**Mantine and MUI both draw an overlay behind a drawer by default, and the house overrides it.** A library default is not a house rule — see `recursica-skill-design-router` and the adapter note in `recursica-skill-panel`.

### Terminology

- **Drawer and panel are synonyms.** A drawer is a panel: a surface that slides in. A navigation drawer is a panel holding navigation, and it is no different in kind from a hamburger menu.
- **A sidebar is not a drawer.** A sidebar is permanently on screen — the desktop left-nav alternative to a top nav. See `recursica-skill-navigation`.
- **Modal and dialog are used interchangeably.** A modal is a mode; a dialog box is one.

## Scrolling

**A panel MUST NEVER scroll horizontally.** There is no exception and no case that earns one. A horizontal scrollbar inside a panel means the content does not belong in a panel — not that it needs a scroll region.

**Vertical scrolling is the signal that the work belongs on a page.** Content that makes the user scroll down is the indication that too much is going on in there. Once it exceeds what the panel holds on a normal-resolution screen, move it to a page.

**Cognitive load is not the criterion.**

Difficult work can legitimately live in a panel: a task with high cognitive load may _need_ the information on the page beside it, and that need outweighs its difficulty. Do not move a task to a page because it is hard. Move it because it does not fit.

**When it moves to a page, repeat the context there.** Better to reproduce what the user needed from the previous page on the new one than to jam the work into a panel it does not fit.

## Geometry and side

**A panel is anchored to a viewport edge and fills the viewport vertically.** It runs flush to either the left or the right edge, and from the top of the viewport to the bottom. It is never inset from the edge, never floating, and never a partial-height surface.

**A panel is designated to open from the left or from the right.** Both are standard, and the side is a property of that panel.

**A top or bottom edge is permitted but extremely nonstandard, and no design exists for one.** It could happen. It is not something to reach for, and because there is no designed treatment, **a horizontal panel must be approved before you build it** — see `recursica-skill-design-router`.

**NEVER open panels on both sides at the same time.** One side is in use at a time.

**Panels stacked on top of one another must all use the same side.** A second panel arriving from the opposite edge tears up whatever spatial model the user had built.

**Stacked panels may differ in width.** The second does not have to match the first.

## Never stack modes

**NEVER open a modal from another modal.** If the user is in a mode, they do not go into sub-modes.

**A modal sitting on top of another modal, each with its own scrim over the content, must never occur.** Two overlays dimming the page is the anti-pattern that most reliably signals the flow was not designed.

**The one exception is replacement, not stacking.** A shared confirmation modal reused across the application may be raised after an action completes inside another modal — but it appears **in place of** the modal that was there. The first modal goes away; the new one appears. It is never on top. This is not ideal, and it exists because secondary modals get reused; it is not a licence to chain modals.

**NEVER nest a panel inside a panel.** A panel is a single object, not a container for another one. This prohibition is absolute.

**Opening a panel on top of another panel is permitted, though not ideal.** The second panel sits fully over the first, obscuring it completely, and closing it reveals the first again. That is stacking, not nesting, and the distinction is the whole rule: a panel may be _covered_ by another panel, and may never _contain_ one.

**Prefer a structure that does not need the second panel.** Stacking is allowed where the drill-down is genuinely the shape of the work; it is not a default reach.

**There is no hard limit on how many panels may stack — but more than two requires the user's approval.** Two is the practical ceiling you may build to on your own. A third and beyond is not forbidden and is not a judgment call either: **stop and ask before building it.** See `recursica-skill-design-router`.

**A panel may open a modal.** A panel is not a mode, so raising a modal over one is not stacking modes — and it is exactly how the unsaved-changes confirmation appears when a panel holding dirty data is closed.

## Forms in a panel

**A panel may contain a form.** This is a normal case, not a compromise.

**Use stacked label placement for every field in it.** A panel is narrow, which is exactly the container-width condition that triggers stacking — and the whole form stacks, including the short fields that would have fitted side by side. One placement per form. Owned by `recursica-skill-forms`.

**If the form is long enough to scroll the panel, it is not a panel form.** See the scrolling rule above.

## What a panel's content looks like

**NEVER put a table inside a panel.** A panel is narrow and a table needs width; the result either scrolls horizontally, which is absolutely forbidden, or truncates every column into uselessness. Where a panel needs to show several records or several attributes of one record, they become **field groups with stacked fields**, not rows and columns.

**Repeating structures inside a panel are stacked field groups.** One group per item, each field on its own line under its label. That is the shape a narrow surface supports.

**Secondary information belongs in a second tab, not further down the same panel.** When a panel holds both the thing the user came for and supporting material — a history, an audit log, related records — putting them in sequence makes the panel long and buries the primary content. Tabs inside the panel separate them, and the primary content is the tab that opens.

**A log is not a future state.** Where a panel shows a history, every entry in it has already happened, so none of them may be rendered in a pending, upcoming, or de-emphasised treatment. A dimmed history reads as something scheduled rather than something done — see `recursica-skill-timeline`.

## Dismissal and unsaved work

**Both surfaces dismiss the same way:** a close control in the header, and an action button in the footer.

**Closing a panel with unsaved changes should prompt the user.** This is no different from navigating away from a page with dirty data, and the prompt is where a confirmation modal is legitimately used.

**Do not prompt on every close.** A modal appearing every time the user closes a panel is interrupting. The prompt is warranted when the user entered data into a form and never saved it — then a confirmation that they are discarding changes is logical.

## Deep-linkable URLs

**A panel may have its own addressable URL, on purpose — the same as a modal.** There are real cases for sending someone a URL that opens a particular view with that panel or modal already open.

**This is a deliberate decision, not a default.** Where it applies, the surface gets a route and a link trigger together. Owned by `recursica-skill-navigation`, which carries the same exception for modals.

## Route changes

**A panel does not survive a route change.** Navigating away closes it.

**The exception is a route change whose only purpose is opening another panel or modal.** Where the navigation exists to raise the next surface — including a deliberately deep-linkable one — the panel already open is not torn down by it. That is what makes a stacked panel reachable by URL.

## Below tablet

**Below the tablet breakpoint, every panel opens as a page instead.** Not a narrower panel, not a full-screen overlay imitating one — a page.

**Tablet and above keeps the panel.** The threshold is the tablet breakpoint: at or above it, a panel is a panel; below it, there are no panels in the application at all.

A panel earns its shape from sitting beside the page it depends on. Below the width where both fit, there is no beside, so the parallel-work premise is gone and the panel has nothing left to be.

**A work-bearing modal becomes a page there too, and a confirmation does not.** The test is whether the user is doing work in it:

- **A mini workflow, a form, or editing details in a modal → a page** below tablet.
- **A confirmation modal stays a modal** at every width. "Are you sure you want to delete this?" is not work.

**MUST NOT reach for a platform-native surface instead.** The iOS sheet is the specific temptation and it is forbidden: it does not exist on Android, and to someone who does not use that platform it reads as confusing rather than familiar. **Keep the interaction patterns the desktop application already uses** — see `recursica-skill-responsive-behavior`.

## Focus and navigation priority

**A modal or a panel takes navigation priority over the page beneath it.** Reaching it must not require traversing the page first.

**A modal traps focus.** It blocks tab movement through the page — focus is always trapped within the modal while it is open.

**A panel does not trap focus.** The user must be able to tab to other elements on the page, because a panel is not a modal state. **This settles the question directly: a panel is non-modal, and building one that traps focus contradicts the reason it exists.**

## Not your decision

- **Component internals** — the panel's and modal's padding, sizes, dividers, elevation, and overlay treatment.
- **How wide a panel is.** `min-width` and `max-width` are fixed properties with no size axis — which side it opens from is yours to designate, but its width is not.
- **Focus mechanics inside a component.** The system provides them; your job is not to defeat them.

## Out of scope

- **The panel and modal components' own variants, states, and accessibility mechanics** — `recursica-skill-panel` and `recursica-skill-modal`.
- **When a confirmation is warranted at all, destructive-action policy, and undo** — `recursica-skill-buttons-links`.
- **Routing and browser history in general** — `recursica-skill-navigation`.
- **Form layout, validation, and save mode** — `recursica-skill-forms`.
- **Small attached surfaces — tooltips, hover cards, popovers.** Those are not modes and are not in scope here.
- **Whether the backend commits atomically.** Not a UI concern — see `recursica-skill-feedback-messaging`.

## Uncovered — ask, do not invent

- **What "exceeds panel size on a normal-resolution screen" is in numbers.** Stated deliberately as a judgment about induced vertical scrolling rather than a pixel threshold.
- **What a top or bottom panel looks like.** It is permitted and undesigned, which is why it needs approval rather than a rule.
- **Whether a panel's width may differ by side.** Stacked panels may differ from each other; nothing says whether a left panel and a right panel share a width.

## Pre-flight checklist

- [ ] The surface was chosen by mode and context, not by how hard or how big the task is.
- [ ] Every modal exists because the user must interact or decide there before continuing.
- [ ] Every panel's work genuinely depends on the page beside it, or the page on the panel's work.
- [ ] No form that adds to or edits the collection on the page sits inline beside it; each opens in a
      modal or panel, so that closing the surface is what confirms the list changed.
- [ ] No panel scrolls horizontally, under any circumstances.
- [ ] Nothing in a panel induces vertical scrolling; anything that did was moved to a page.
- [ ] Every panel is flush to the left or right viewport edge and runs full height, top to bottom.
- [ ] Only one side is in use at a time, and stacked panels all share that side.
- [ ] Any top or bottom panel was approved first, since none is designed.
- [ ] No task was moved to a page for being cognitively demanding while still needing the page's context.
- [ ] Where work moved to a page, the context it needed was reproduced there.
- [ ] No modal opens another modal on top of it; no two scrims are ever visible at once.
- [ ] Any reused confirmation modal replaces the modal that was open rather than stacking on it.
- [ ] No panel is nested inside a panel; any second panel stacks fully over the first and reveals it on close.
- [ ] Stacking was the shape of the work, not a default reach, and anything beyond two stacked panels was approved first.
- [ ] Every form in a panel uses stacked label placement for all of its fields.
- [ ] No table inside a panel; repeating content is stacked field groups.
- [ ] Secondary material sits in a second tab rather than below the primary content.
- [ ] Nothing already completed is shown in a pending or de-emphasised treatment.
- [ ] Closing a panel with unsaved form data prompts before discarding; closing an untouched panel does not.
- [ ] Any deep-linkable panel or modal was a deliberate decision with a route and a link trigger.
- [ ] Panels close on a route change, except where the navigation exists only to open another panel or modal.
- [ ] Below the tablet breakpoint every panel opens as a page, not as a narrow panel or a full-screen stand-in.
- [ ] Work-bearing modals become pages below tablet; confirmations stay modals.
- [ ] No iOS or Android surface — no sheet — stands in for a panel or modal below desktop.
- [ ] No shader, scrim, or tint is drawn behind any open panel, and the library's default overlay was overridden.
- [ ] Nothing labelled a drawer was treated as a different construct from a panel, and no permanent sidebar was called one.
- [ ] The modal traps focus; the panel does not, and the page behind it stays reachable by keyboard.
- [ ] Nothing in the uncovered list was invented.
