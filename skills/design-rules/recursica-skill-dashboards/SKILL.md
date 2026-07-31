---
name: recursica-skill-dashboards
description: House rules for dashboards in enterprise web applications — what a dashboard is for, the dashboard vs. workbench test, layout stability across visits, opinionated hierarchy, how many charts and cards, numbers over charts, one or two calls to action, no work on the dashboard, max width, no inner scrolling, the funnel structure, empty and first-run states, customization, data freshness disclosure, and adaptive behavior at smaller sizes. Use whenever asked to design, review, or refactor a dashboard, landing page, overview page, home screen, summary view, or widget layout. Trigger on "dashboard", "widget", "KPI", "overview page", "landing page", "home screen", "at a glance", "summary cards", or a request to surface key metrics. Do NOT use for the internals of an individual chart — that is recursica-skill-data-visualization. Do NOT use for table structure.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Dashboards

House rules for dashboards. These are opinions, and they are unusually strong ones — the team's position is that most dashboards in enterprise software are failures. Apply them as constraints.

Context these rules assume: **complex enterprise web applications, desktop-first**, built on the Recursica design system. Grids, gutters, breakpoints, type styles, elevation, and spacing all come from the system's layouts and tokens and must not be modified. Your decisions are whether a dashboard is the right answer at all, what goes on it, and what the user does next.

## Governing principles

1. **A dashboard is a gauge cluster, not a workspace.** The metaphor is a car: a speedometer, a fuel gauge, an RPM needle in the red. Glanceable, consistent, and there to tell you what needs attention right now — then send you somewhere else to act.
2. **Stability over novelty.** The data is volatile; the layout must not be. Every visit puts the same things in the same places, because a snapshot only works if the reader already knows where to look.
3. **Be opinionated, or do not build one.** A dashboard is the team asserting what matters. Surfacing data and letting the user work out its significance is the lazy answer, and it is what has made most modern dashboards worthless.

## Is this actually a dashboard?

**Apply the workbench test first.** Most requests for a dashboard are requests for something else:

| What the user needs                                     | What to build                                  |
| ------------------------------------------------------- | ---------------------------------------------- |
| A glance at what needs attention, then a way out to act | **Dashboard**                                  |
| Tools and data to do their actual work in one place     | **Workbench** — and do not call it a dashboard |

**If work happens there, it is a workbench.** Name it for the function it performs — "Scorecard", "Queue", whatever the job is. High-level visualizations sitting above a work area are fine; that composition is simply not a dashboard.

**A dashboard is only worth its cost in a large application.** If the product is small enough to put the user directly into the tooling, do that instead. In a ten-section application the dashboard earns its place by pointing at the one section that needs attention.

**If the team cannot say what matters, do not build a dashboard.** Reaching for a table or a configurable canvas because nobody has an opinion is three compounding failures dressed as a feature. Do not junk up a screen to cover for not knowing.

**A dashboard must not exist to compensate for a poorly organized application.** If it is being built so users can finally find things, the navigation and information architecture are the actual problem.

## What belongs on it

**The target shape: one thing that needs attention, plus perhaps two or three supporting items, each of them actionable.** "Inventory is running low — reorder these products," with a way to go do it. Not an inventory chart the reader must interpret.

**MUST answer "what needs attention right now, and is everything okay."** That is the job.

**Do not announce that everything is fine.** A dashboard shouting good news is noise.

**Status without trend is close to useless.** A green light says nothing about whether the number is falling toward yellow. Where a value has a healthy range, show the threshold and the direction of travel, so the reader can act before the state changes.

**NEVER add an AI summary of the dashboard.** A widget that summarizes the screen is an admission that the screen failed to communicate. Fix the dashboard.

**Do not recreate the navigation in cards.** If the application has a nav, let the nav do that work.

## How much

**Figures shown together must reconcile with one another.** Two counts side by side invite the reader to relate them, so a subset must be visibly a subset. A dashboard reporting three pending and eighteen overdue, where overdue is a subset of pending, is not a labelling nuisance — it reports something impossible, and the reader stops trusting every number on the screen. Check the arithmetic between figures before shipping. Naming is owned by `recursica-skill-naming-terminology`; the layout of a figure group by `recursica-skill-screen-scaffolding`.

**Before any chart on a dashboard, confirm the application has a charting library.** Recursica draws no charts; if none is declared, prompt the user to add one before designing the dashboard around visualizations that cannot yet be built. See `recursica-skill-data-visualization`.

**At most four charts.** Beyond that the reader is doing analysis, not glancing.

**Four cards across the top is good; six to eight is the ceiling.** Order the page so the fastest-to-read things come first — a single number is read in a second, a table takes real time to digest.

**Prefer a number to a chart.** If a percentage, count, or quantity carries the information, display the number and **give it weight through typographic scale** rather than wrapping it in a visualization. A chart that restates a number it sits next to earns nothing.

**Fewer data points is better.** The measure of a dashboard is how actionable and clear its few insights are, not how much it shows.

**Never make the whole page cards.** All-cards layouts are chaotic, because a grid of equal-weight cards has no hierarchy — and hierarchy is exactly what a car dashboard has and a card wall does not. Use the system's layout structures, type hierarchy, and whitespace to build a static composition, and place cards inside it. A card is for repeating peer objects — see `recursica-skill-card` and the earned-container convention in `recursica-skill-system-conventions`.

**No competing visualizations on screen at once.**

## Structure

**Compose as a funnel:** broad at the top, more granular as the reader moves down.

**Everything below the fold is optional.** The reader must never have to scroll to learn what is going on.

**Data tables probably do not belong on a dashboard** — a table is a drill-down. Where one is unavoidable, show rollups: counts, percentages, aggregates that are themselves actionable, with a way to drill into the detail. Once the screen is presenting a full table, it has stopped being a dashboard.

## Interaction

**One, maybe two calls to action for the entire dashboard.** Everything else on the screen exists to support them.

**Aim for zero or one interactive element per card.**

**The interaction model is peruse, then click.** Once action buttons start appearing, the screen is doing too much.

**NEVER put filtering, sorting, or view controls on a dashboard.** Doing work here is the most common failure mode. The dashboard is a transient moment: gut check, then out into the application.

**Minimize points of interaction** so the next step is unambiguous.

**It must load fast.** A dashboard that takes longer to load than it takes to navigate directly to the work has defeated itself.

## Stability and customization

**MUST be stable across visits.** Same objects, same locations, every time. A snapshot is only readable if the reader knows the layout already.

**NEVER let the dashboard reshuffle its own content between visits.** Dynamically chosen content — AI-selected widgets, changing arrangements — must not be the main dashboard. Acceptable forms: a separate dynamic view the user chooses to open, or one designated widget that behaves that way. The whole screen must not shift.

**Default: dashboards are not configurable.** Configurability is usually a technical answer to not having researched what the user needs, and it carries a real support cost — a customized dashboard makes data problems much harder to diagnose than a common one.

**Prefer per-persona static dashboards** over user configuration. Different personas seeing different fixed dashboards on login is correct.

**Where customization is required anyway:**

- The user's arrangement **persists across sessions** — it is set once, not shuffled by the system.
- **Do not advertise it.** Provide a settings or configuration entry point without calling attention to it, and let it be discovered or passed along between colleagues. This is the unadvertised affordance convention — see `recursica-skill-system-conventions`, and `recursica-skill-discoverability` for why it works.

## Empty and first-run states

**NEVER ship an empty dashboard.** A new user does not know what the product can do and has no basis for assembling their own view. An empty dashboard is the end of a chain of failures: not knowing what matters, making it configurable to avoid deciding, then having no defaults to populate it with.

**If there is nothing worth putting on it, there should be no dashboard.**

**A first-run dashboard should carry an onboarding element** that walks the user through initial tasks and orients them to what the product does — and it must be **dismissible**, so the user stays in control of whether the guidance continues.

## Data freshness

**Disclose how current the data is.** A dashboard refreshed every two days, presented as if it were live, is worse than no dashboard.

**Where components refresh on different intervals, say so per component.** One widget updating by the minute beside another rebuilt monthly, with nothing indicating the difference, is a common and serious failure.

## Do not juxtapose unrelated data

**Two charts side by side imply a relationship.** Placing data on different scales, or data that does not relate, next to each other invites the reader to draw inferences the data does not support. Proximity is a claim — only make it when it is true.

## Layout constraints

**MUST have a maximum width.** A dashboard stretched across a very large monitor is unusable. Available space is not an obligation to fill it.

**NEVER use inner scrolling areas** — not in the dashboard, not inside a card. The dashboard is one pane of glass. Ten cards each with their own scrolling region is unambiguously wrong.

**Use the design system's layouts and tokens** for grids, gutters, breakpoints, type styles, elevation, and spacing, and do not modify them. Ample whitespace separates groups.

## Smaller viewports

**Adapt; do not force one dashboard to stretch from phone to desktop.** Someone checking in on a phone is doing something different from someone working at a desk all day. Understand the context of use, decide what is removed, and treat the compact view as its own design.

## Uncovered — ask, do not invent

No house rule covers these yet. **Ask the human rather than choosing** — see the never-guess rule in `recursica-skill-design-router`. Do not pattern-match them to a rule above.

- **What occupies the primary position when everything genuinely is fine.** Announcing good news is forbidden; the alternative is unset.
- **Whether one or two CTAs survives multiple personas on one screen.**
- **Where a dashboard sits in the navigation**, given that every location needs a route and a nav item.
- **Loading behavior.** Fast is required; whether the screen appears progressively or all at once is unset.

## Out of scope

- **The internals of a chart** — type, axes, labels, thresholds. Covered by `recursica-skill-data-visualization`.
- **Individual card anatomy.** Covered by the card component skill.
- **Grid column counts, gutters, widget aspect ratios, and minimum sizes.** These come from the design system's layouts.
- **Table structure.**

## Pre-flight checklist

Before considering a dashboard done, verify:

- [ ] The workbench test was applied — if the user works here, it is not called a dashboard.
- [ ] The application is large enough to justify a dashboard at all.
- [ ] The team can state what matters on this screen; nothing was added to cover for not knowing.
- [ ] The screen answers "what needs attention right now," and does not announce that everything is fine.
- [ ] Statuses carry thresholds and trend, not just a current state.
- [ ] At most four charts; four cards across the top, eight at the absolute most.
- [ ] Simple metrics are numbers with typographic emphasis, not charts restating them.
- [ ] The layout is a static composition with real hierarchy — not a wall of equal-weight cards.
- [ ] Content is funneled broad to granular, and nothing essential sits below the fold.
- [ ] No full data table; rollups with drill-down instead.
- [ ] One or two calls to action total; zero or one interactive element per card.
- [ ] No filtering, sorting, or view controls; no navigation recreated in cards.
- [ ] No AI summary widget.
- [ ] Objects sit in the same place on every visit; nothing reshuffles itself.
- [ ] Not configurable by default; where it is, the entry point is unadvertised and the arrangement persists.
- [ ] Not empty on first run, and a dismissible onboarding element is present.
- [ ] Data currency is disclosed, per component where intervals differ.
- [ ] No unrelated or differently scaled data placed side by side.
- [ ] A maximum width is set, and there are no inner scrolling regions anywhere.
- [ ] Smaller viewports get an adapted design, not a squeezed one.
- [ ] Nothing in the uncovered list — the all-clear state, multi-persona CTAs, nav placement, load behavior — was decided without asking.
