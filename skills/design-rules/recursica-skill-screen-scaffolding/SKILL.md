---
name: recursica-skill-screen-scaffolding
description: House rules for the composition of a page and the surfaces a region sits on — where application chrome such as a theme control belongs, when a region needs its own surface rather than sitting loose on the page, and the relationship between a plain region, a layer, and a card. Use when laying out a page, deciding where a region begins and ends, placing controls that belong to the application rather than the content, or deciding whether something needs a container. Trigger on "page layout", "scaffolding", "where does this go", "header", "app chrome", "theme toggle", "layer", "surface", "container", "does this need a box", or a region that reads as blurring into the one beside it. Do NOT use for whether a card is the right component — that is recursica-skill-card. Do NOT use for what earns the top of the page — that is prioritization, recorded separately.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Screen scaffolding

House rules for how a page is composed and what each region sits on. These are opinions, not neutral best practices — apply them as constraints.

> **This skill is partial.** It currently holds only what has been decided directly; the standard page composition — title, breadcrumb, primary action, filters, content, and the order they appear in — is being recorded and will be added. Where this skill is silent, that is a genuine gap: **ask rather than assuming a scaffold.** See `recursica-skill-design-router`.

## Application chrome versus content

**A control that belongs to the application rather than to the content belongs in the header** — the top navigation area, typically the upper right.

**A theme control is chrome.** Light and dark mode is a property of the application, not of the page the user happens to be on, so it never sits in the content area above a page title.

**It is a segmented control with icons, not a switch with a label.** A switch belongs in a form; see `recursica-skill-selection-controls`. Outside a form, a toggle is a segmented control, and in chrome it carries icons rather than text.

**Chrome does not scroll away with the content**, and it does not change from page to page.

## Layering: when a region needs a surface

**Grouping is expressed with space first.** That rule stands — see `recursica-skill-card` and convention 5 in `recursica-skill-system-conventions`. Most regions need nothing.

**But a region that reads as blurring into the one beside it needs a surface.** When adjacent regions have no visual separation and the reader cannot tell where one ends and the next begins, spacing alone has failed, and the region needs to sit on its own layer.

**There are three levels of containment, and they are not interchangeable:**

| Level            | What it is for                                                         | Owner                                      |
| ---------------- | ---------------------------------------------------------------------- | ------------------------------------------ |
| **No container** | The default. Space and type hierarchy do the grouping                  | `recursica-skill-card`                     |
| **A layer**      | A region that needs its own surface but is not one of a set of peers   | this skill                                 |
| **A card**       | A small, finite set of repeating peer objects, each carrying a graphic | `recursica-skill-card`, and its five tests |

**A layer is the middle option, and it is the one most often missed.** An agent that knows only "card or nothing" will either box everything or box nothing. A region that deserves separation but has no peers — a chart and its labels, a group of summary figures — takes a layer, not a card.

**A layer does not waive the card tests.** Needing a surface is not evidence of peer-hood. If the five card tests fail, the answer is a layer, never a card that ignores them.

**The `Layer` component is referenced in the component documentation but is not exported.** Until it ships, a region that needs a surface is a gap to raise — **do not paint one with raw CSS variables or reach into the underlying library's tokens.** See `recursica-skill-design-router` on the styling escape hatch.

## Summary figures

**A group of summary figures at the top of a screen is a set of peers**, and is treated as one — the same treatment applied consistently across all of them, not one figure styled differently from the next.

**Each figure is named by a noun phrase that says what is being counted**, and the naming rules apply in full: no filler words, and no term left without its noun. `Pending requests`, not `Total pending requests` — _total_ adds nothing that _pending requests_ does not already say. And `Overdue requests`, not `Overdue` — a bare adjective is not the name of a thing. See `recursica-skill-naming-terminology`.

**Figures shown together must be reconcilable.** Two counts sitting side by side invite the reader to relate them, so if one is a subset of the other, the labels must make that true and visible. A screen showing three pending and eighteen overdue, where overdue is a subset of pending, is not a labelling nuisance — it is a screen that reports something impossible, and the reader will trust neither number afterwards.

**Do not define a term next to itself.** A figure captioned to explain what its own label means — `Overdue — past the start date` — is a label that failed. Fix the label. If the concept genuinely needs explaining, that is a tooltip or help content, not a subtitle. See `recursica-skill-naming-terminology`.

## Not your decision

- **Spacing, padding, elevation, and the surface treatment of any layer or card.** Owned by the components and the tokens.
- **Whether a card is the right component.** Owned by `recursica-skill-card` and its five tests.
- **Type styles and case.** Owned by `recursica-skill-typography-semantics`.

## Out of scope

- **What earns the strongest position on a screen, and how much may compete for attention.** That is prioritization, recorded separately.
- **Whether a task belongs on this page at all** — `recursica-skill-panels-modals`.
- **Navigation structure, routes, and breadcrumbs** — `recursica-skill-navigation`.
- **The filter bar** — `recursica-skill-filters`.
- **Behavior below desktop** — `recursica-skill-panels-modals` covers panels; the rest is unowned.

## Uncovered — ask, do not invent

- **The standard page composition.** Which elements every page has and in what order, where the title and breadcrumb sit, where the primary action lives, whether pages have footers and a maximum width. Being recorded.
- **What each layer level means.** The component documentation refers to layers 0 through 3; nothing states what distinguishes them or when to step from one to the next.
- **Whether summary figures sit on layers or in cards**, and whether that changes with how many there are.
- **What else counts as chrome** beyond the theme control, and whether anything may sit in the header alongside it.
- **Whether a page may have more than one layered region** side by side, and whether nested layers are permitted.
- **The page-level canvas.** Nothing in the component set paints the background a layer would sit against.

## Pre-flight checklist

- [ ] Controls belonging to the application, not the content, sit in the header rather than in the page body.
- [ ] Any theme control is a segmented control with icons in the header, never a labelled switch in the content area.
- [ ] Every region was tried with space first; a surface was added only where regions genuinely blurred together.
- [ ] A region needing separation but having no peers took a layer, not a card; the five card tests were not waived.
- [ ] No surface was painted with raw CSS or the underlying library's tokens; a missing `Layer` was raised as a gap.
- [ ] Summary figures are treated as a set, with one consistent treatment.
- [ ] Every figure is named by a noun phrase with no filler word and no missing noun.
- [ ] Figures shown together reconcile with one another, and any subset relationship is visible in the labels.
- [ ] No label is explained by a caption beside it.
- [ ] Nothing in the uncovered list was invented, and no page scaffold was assumed while this skill is still partial.
