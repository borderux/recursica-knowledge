---
name: recursica-skill-dashboards
description: House rules for dashboards and overview pages — the dashboard versus workbench test, a stable opinionated layout, numbers over charts, one or two calls to action, no work on the dashboard, empty and first-run states, customization, and data freshness. Use for any dashboard, landing, home, or KPI screen. Not for chart internals — see recursica-skill-data-visualization.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Dashboards

These are the house rules for dashboards. They are opinions, and unusually strong ones: the team's position is that most dashboards in enterprise software are failures. Treat them as constraints.

These rules assume **complex enterprise web applications, designed for desktop first**, built on the Recursica design system. Grids, gutters, breakpoints, type styles, elevation (the shadow that makes a surface look raised), and spacing all come from the system's layouts and tokens (named design values, such as colors or sizes, set by the design system). Do not change them. The decisions this skill covers are whether a dashboard is the right answer at all, what goes on it, and what the user does next.

## Governing principles

1. **A dashboard is for reading at a glance, not for doing work.** It is always laid out the same way. It shows the user what needs attention right now, then sends the user somewhere else to act.
2. **Stability over novelty.** The data changes constantly; the layout must not. Every visit puts the same things in the same places, because a snapshot only works if the reader already knows where to look.
3. **Take a position, or do not build one.** A dashboard is the team saying what matters. Showing data and leaving the user to work out what it means is the lazy answer, and it is what has made most modern dashboards worthless.

## Is this a dashboard?

**Apply the workbench test first.** Most requests for a dashboard are requests for something else:

| What the user needs                                     | What to build                                  |
| ------------------------------------------------------- | ---------------------------------------------- |
| A glance at what needs attention, then a way out to act | **Dashboard**                                  |
| Tools and data to do their work in one place            | **Workbench** — and do not call it a dashboard |

**If work happens there, it is a workbench.** Name it for the job it does — "Scorecard", "Queue", or whatever the job is. High-level charts sitting above a work area are fine, but that layout is not a dashboard.

**Build a dashboard only for a large application.** If the product is small enough to take the user straight to the tools, do that instead. In an application with ten sections, the dashboard's job is to point to the one section that needs attention.

**If the team cannot say what matters, do not build a dashboard.** Do not fall back on a table or a configurable canvas because nobody has an opinion. That fallback combines three failures and presents them as a feature. Do not clutter a screen to hide the fact that nobody knows.

**A dashboard must not exist to make up for a badly organized application.** If it is being built so that users can finally find things, the real problem is the navigation and the information architecture (how the application's content is organized and labeled).

## What belongs on it

**Aim for one thing that needs attention, plus maybe two or three supporting items, each of which the user can act on.** "Inventory is running low — reorder these products," with a way to go do it. Not an inventory chart that the reader must interpret.

**MUST answer "what needs attention right now, and is everything okay."** That is the job.

**Do not announce that everything is fine.** A dashboard shouting good news is noise.

**Status without a trend is close to useless.** A green light says nothing about whether the number is falling toward yellow. Where a value has a healthy range, show the threshold and which way the value is moving, so the reader can act before the state changes.

**NEVER add an AI summary of the dashboard.** A widget that summarizes the screen admits that the screen failed to communicate. Fix the dashboard.

**Do not rebuild the navigation out of cards.** If the application has navigation, let the navigation do that work.

## How much

**The ban on inner scrolling is not limited to dashboards — it applies to the whole application.** There is one scrollbar, sticky regions that stay in place, and no region the user must hover over to scroll. See `recursica-skill-screen-priority`.

**Figures shown together must agree with each other.** Two counts side by side invite the reader to compare them, so a subset must clearly look like a subset. Picture a dashboard reporting three pending and eighteen overdue, where overdue is a subset of pending. That is not a labeling annoyance — it reports something impossible, and the reader stops trusting every number on the screen. Check the math between figures before shipping. Naming is owned by `recursica-skill-naming-terminology`, and the layout of a group of figures by `recursica-skill-screen-scaffolding`.

**Before putting any chart on a dashboard, confirm that the application has a charting library.** Recursica draws no charts. If none is declared, prompt the user to add one before designing the dashboard around charts that cannot be built yet. See `recursica-skill-data-visualization`.

**At most four charts.** Beyond that, the reader is doing analysis, not glancing.

**Four cards across the top is good; six to eight is the limit.** Order the page so the fastest things to read come first — a single number is read in a second, while a table takes real time to take in.

**Prefer a number to a chart.** If a percentage, count, or quantity carries the information, show the number and give it weight with a larger type size, instead of wrapping it in a chart. A chart that repeats a number sitting right next to it adds nothing.

**Fewer data points is better.** A dashboard is measured by how clear and actionable its few insights are, not by how much it shows.

**Never make the whole page out of cards.** Layouts made entirely of cards are chaotic, because a grid of equally weighted cards has no hierarchy — and a dashboard needs a clear order of importance. Use the system's layout structures, type hierarchy, and white space to build a fixed layout, and place cards inside it. A card is for repeating peer objects (objects of the same kind, such as rows in a list) — see `recursica-skill-card` and the group-with-space convention in `recursica-skill-system-conventions`.

**No competing visualizations on screen at the same time.**

## Structure

**Order it from broad to detailed:** the summary at the top, more detail as the reader moves down.

**Everything below the fold (the part of the page visible only after scrolling) is optional.** The reader must never have to scroll to learn what is going on.

**Data tables probably do not belong on a dashboard** — a table is a drill-down (a click through to more detail). Where one cannot be avoided, show rollups: counts, percentages, and totals that the user can act on themselves, with a way to click through to the detail. Once the screen is showing a full table, it has stopped being a dashboard.

## Interaction

**One, or at most two, calls to action (CTAs — the buttons or links that prompt the user's next step) for the whole dashboard.** Everything else on the screen exists to support them.

**Aim for zero or one interactive element per card.**

**The interaction pattern is look, then click.** Once action buttons start appearing, the screen is doing too much.

**NEVER put filtering, sorting, or view controls on a dashboard.** Doing work here is the most common way dashboards fail. The dashboard is a brief moment: a quick check, then out into the application.

**Keep points of interaction to a minimum**, so the next step is obvious.

**It must load fast.** A dashboard that takes longer to load than it takes to go straight to the work has defeated its own purpose.

## Stability and customization

**MUST be stable across visits.** The same objects in the same places, every time. A snapshot can only be read quickly if the reader already knows the layout.

**NEVER let the dashboard rearrange its own content between visits.** Content chosen on the fly — widgets picked by AI, arrangements that change — must not be the main dashboard. Two forms are acceptable: a separate changing view that the user chooses to open, or one specific widget that behaves that way. The whole screen must not shift.

**Default: dashboards are not configurable.** Configurability is usually a technical answer to not having researched what the user needs. It also carries a real support cost — a customized dashboard makes data problems much harder to track down than a shared one.

**Prefer a fixed dashboard for each persona** over letting users configure their own. Different personas seeing different fixed dashboards when they log in is correct.

**Where customization is required anyway:**

- The user's arrangement **is kept across sessions.** It is set once, not rearranged by the system.
- **Do not advertise it.** Offer a settings or configuration entry point without drawing attention to it, and let people discover it or pass it along to colleagues. This is the unadvertised affordance convention — see `recursica-skill-system-conventions`, and `recursica-skill-discoverability` for why it works.

## Empty and first-run states

**NEVER ship an empty dashboard.** A new user does not know what the product can do, and has no basis for building their own view. An empty dashboard is the result of three failures: not knowing what matters, making it configurable to avoid deciding, and having no defaults to fill it with.

**If there is nothing worth putting on it, there should be no dashboard.**

**A first-run dashboard should include an onboarding element** that walks the user through their first tasks and explains what the product does. It must be dismissible, so the user stays in control of whether the guidance continues.

## Data freshness

**Say how up to date the data is.** A dashboard refreshed every two days but presented as if it were live is worse than no dashboard.

**Where different components refresh on different schedules, say so for each component.** One widget updating every minute next to another rebuilt monthly, with nothing to show the difference, is a common and serious failure.

## Do not juxtapose unrelated data

**Two charts side by side suggest a relationship.** Putting data on different scales, or data that does not relate, next to each other invites the reader to draw conclusions the data does not support. Placing things close together is a claim — only make it when it is true.

## Layout constraints

**MUST have a maximum width.** A dashboard stretched across a very large monitor cannot be used. Do not fill space only because it is available.

**NEVER use inner scrolling areas** — not in the dashboard, and not inside a card. The whole dashboard scrolls as one page. Ten cards, each with its own scrolling area, is clearly wrong.

**Use the design system's layouts and tokens** for grids, gutters, breakpoints, type styles, elevation, and spacing, and do not change them. Plenty of white space separates the groups.

## Smaller viewports

**Adapt; do not force one dashboard to stretch from phone to desktop.** Someone checking in on a phone is doing something different from someone working at a desk all day. Understand how the dashboard is used in each setting, decide what to remove, and treat the compact view as its own design.

## Open questions

No house rule covers these yet. **Ask the person instead of choosing** — see the never-guess rule in `recursica-skill-design-router`. Do not stretch a rule above to fit them.

- **What fills the main position when everything is fine.** Announcing good news is forbidden, and no alternative has been set.
- **Whether the limit of one or two CTAs still holds when several personas share one screen.**
- **Where a dashboard sits in the navigation**, given that every location needs a route and a nav item.
- **Loading behavior.** Fast is required, but whether the screen appears piece by piece or all at once has not been decided.

## Out of scope

- **The inside of a chart** — its type, axes (the properties a component varies on, such as size and style; Figma calls them variant properties), labels, and thresholds. Covered by `recursica-skill-data-visualization`.
- **The anatomy of an individual card.** Covered by the card component skill.
- **Grid column counts, gutters, widget shapes, and minimum sizes.** These come from the design system's layouts.
- **Table structure.**

## Pre-flight checklist

Before treating a dashboard as done, check:

- [ ] The screen passes the workbench test: if the user does their work on it, it is not called a dashboard.
- [ ] The application is large enough to justify having a dashboard at all.
- [ ] The team can say what matters on this screen, and nothing on it is there to cover for not knowing what matters.
- [ ] The screen answers "what needs attention right now", and does not announce that everything is fine.
- [ ] Each status shows its threshold and its trend, not only its current state.
- [ ] There are at most four charts. There are four cards across the top, and never more than eight.
- [ ] Simple metrics are shown as numbers with larger type, not as charts that repeat them.
- [ ] The layout is fixed and has a real hierarchy — it is not a wall of equally weighted cards.
- [ ] Content runs from broad to detailed, and nothing essential sits below the fold.
- [ ] There is no full data table; rollups with a way to click through take its place.
- [ ] There are one or two calls to action in total, and zero or one interactive element per card.
- [ ] There are no filtering, sorting, or view controls, and the navigation is not rebuilt out of cards.
- [ ] There is no AI summary widget.
- [ ] Every object sits in the same place on every visit; nothing rearranges itself.
- [ ] It is not configurable by default. Where it is, the entry point is not advertised, and the user's arrangement is kept.
- [ ] It is not empty on first run, and a dismissible onboarding element is present.
- [ ] It says how up to date the data is, for each component where the refresh schedules differ.
- [ ] No unrelated data, and no data on different scales, is placed side by side.
- [ ] A maximum width is set, and there are no inner scrolling areas anywhere.
- [ ] Smaller viewports get an adapted design, not a squeezed one.
- [ ] Open questions were asked about, not decided: what fills the main position when everything is fine, CTAs for several personas, where it sits in the navigation, and loading behavior.
