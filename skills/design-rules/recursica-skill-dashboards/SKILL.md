---
name: recursica-skill-dashboards
description: House rules for dashboards and overview pages — the dashboard versus workbench test, a stable opinionated layout, numbers over charts, one or two calls to action, no work on the dashboard, empty and first-run states, customization, and data freshness. Use for any dashboard, landing, home, or KPI screen. Not for chart internals — see recursica-skill-data-visualization.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Dashboards

This skill holds the house rules for dashboards. The house rules are opinions, and unusually strong opinions. The team holds that most dashboards in enterprise software are failures. Treat each house rule as a constraint.

The house rules assume **complex enterprise web applications, designed for desktop first**, built on the Recursica design system. This skill covers three decisions: whether a dashboard is the right answer at all, what goes on the dashboard, and what the persona does next.

## Governing principles

1. **A dashboard is for reading at a glance, not for doing work.** A dashboard is always laid out the same way. A dashboard shows the persona what needs attention right now, then sends the persona away from the dashboard to act.
2. **Choose stability over novelty.** The data changes constantly, and the layout must not change. Every visit puts the same content in the same places. A quick look at a dashboard works only when the reader already knows where to look.
3. **Decide what matters, or do not build a dashboard.** A dashboard is the team's statement of what matters. Showing data and leaving the persona to work out what the data means is the lazy answer. The lazy answer has made most modern dashboards worthless.

## The workbench test

**Apply the workbench test first.** Most requests for a dashboard are requests for a different kind of screen.

| What the persona needs                                  | What to build                                         |
| ------------------------------------------------------- | ----------------------------------------------------- |
| A glance at what needs attention, then a way out to act | **Dashboard**                                         |
| Tools and data in one place, to do the persona's work   | **Workbench**. Do not call the workbench a dashboard. |

**A screen where the persona does work is a workbench.** Name the workbench for the job the workbench does, such as "Scorecard" or "Queue". High-level charts may sit above a work area. A work area with charts above the work area is still not a dashboard.

**Build a dashboard only for a large application.** If the product is small enough to open straight on the tools, open the product on the tools instead of on a dashboard. In an application with ten sections, the dashboard's job is to point to the one section that needs attention.

**If the team cannot say what matters, do not build a dashboard.** Do not fall back on a table or a configurable canvas because nobody has an opinion. A fallback table or canvas combines the same three failures as an empty dashboard: not knowing what matters, making the screen configurable to avoid deciding, and having no default content. The fallback presents the three failures as a feature. Do not clutter a screen to hide that nobody knows what matters.

**A dashboard must not exist to make up for a badly organized application.** If the reason for a dashboard is to let personas finally find content in the application, the real problem is the navigation and the information architecture (how the application's content is organized and labeled).

## Dashboard content

**Aim for one item that needs attention, plus maybe two or three supporting items, each an item the persona can act on.** For example, show "Inventory is running low — reorder these products," with a way to go and reorder the products. An inventory chart that the reader must interpret does not meet this aim.

**A dashboard MUST answer "what needs attention right now, and is everything okay."**

**Do not announce that nothing needs attention.** A dashboard that announces good news adds noise.

**A status without a trend is close to useless.** A green status light says nothing about whether the number is falling toward yellow. Where a value has a healthy range, show the threshold and the direction the value is moving. The threshold and the direction let the reader act before the status changes.

**NEVER add an AI summary of the dashboard.** A widget that summarizes the dashboard shows that the dashboard failed to communicate. Fix the dashboard.

**Do not rebuild the navigation out of cards.** If the application has navigation, let the navigation take the persona to each section.

## Amount of content

**Never use inner scrolling (a region that scrolls separately from the page) on any screen in the application, not only on dashboards.** The application has one scrollbar, plus sticky regions that stay in place. No region requires the persona to hover over the region before the region scrolls. See `recursica-skill-screen-priority`.

**Numbers shown together must agree with each other.** Two counts side by side invite the reader to compare the two counts. A number that is a subset of another number must clearly look like a subset. For example, a dashboard reports three pending and eighteen overdue, where overdue is a subset of pending. The pair of counts reports an impossible result, not a labeling problem. The reader then stops trusting every number on the screen. Check the math between the numbers before shipping. `recursica-skill-naming-terminology` owns naming. `recursica-skill-screen-scaffolding` owns the layout of a group of numbers.

**Before putting any chart on a dashboard, confirm that the application has a charting library.** Recursica does not provide charts, so a chart needs a separate charting library. If the application declares no charting library, confirm with the user that the project should add a charting library. Ask before designing the dashboard around charts that cannot be built yet. See `recursica-skill-data-visualization`.

**Put at most four charts on a dashboard.** With more than four charts, the reader is doing analysis, not glancing.

**Four cards across the top of a dashboard is good. Six to eight cards is the limit.** Order the page so the content that is fastest to read comes first. A single number is read in a second. A table takes much longer to read.

**Prefer a number to a chart.** When a percentage, a count or a quantity gives the information, show the number in a larger type size instead of in a chart. A chart that repeats a number right next to the chart adds nothing.

**Fewer data points are better.** Judge a dashboard by how clear and actionable the dashboard's few insights are, not by how much data the dashboard shows.

**Never make the whole page out of cards.** A layout made entirely of cards is chaotic. A grid of equally weighted cards has no hierarchy, and a dashboard needs a clear order of importance. Build a fixed layout from the design system's layout structures, type hierarchy and white space. Place cards inside the fixed layout. A card is for repeating peer objects (objects of the same kind, such as rows in a list). See `recursica-skill-card`, and the convention to group with space in `recursica-skill-system-conventions`.

**Do not show competing visualizations on the screen at the same time.** Confirm with the user which visualizations on the dashboard compete.

## Structure

**Order the dashboard from broad to detailed.** Put the summary at the top, and show more detail as the reader moves down the page.

**All content below the fold (the part of the page visible only after scrolling) is optional.** The reader must never have to scroll to learn what is going on.

**A data table probably does not belong on a dashboard.** A data table is a drill-down (a click through to more detail). Where a data table cannot be avoided, show rollups: counts, percentages and totals that the persona can act on themselves, with a way to click through to the detail. A screen that shows a full table is no longer a dashboard.

## Interaction

**Give the whole dashboard one call to action, or at most two.** A call to action (CTA) is a button or link that prompts the persona's next step. Every other element on the dashboard exists to support the calls to action.

**Aim for zero or one element per card that the persona can interact with.**

**The interaction pattern is look, then click.** When action buttons start to appear, the dashboard is doing too much.

**NEVER put filtering, sorting, or view controls on a dashboard.** Doing work on the dashboard is the most common way dashboards fail. A visit to the dashboard is brief: a quick check, then out into the application.

**Keep the number of elements the persona can interact with to a minimum**, so the next step is obvious.

**A dashboard must load fast.** A dashboard that takes longer to load than going straight to the work defeats the purpose of the dashboard.

## Stability and customization

**A dashboard MUST be stable across visits.** The same objects sit in the same places on every visit. A reader can read a snapshot quickly only when the reader already knows the layout.

**NEVER let a dashboard rearrange the dashboard's content between visits.** Content chosen on the fly, such as widgets picked by AI or arrangements that change, must not be the main dashboard. Content chosen on the fly is acceptable in two forms: a separate changing view that the persona chooses to open, or one specific widget that changes. The whole screen must not shift.

**By default, a dashboard is not configurable.** Configurability is usually a technical answer to not having researched what the persona needs. A configurable dashboard is also harder to support. Data problems are much harder to track down in a customized dashboard than in a shared dashboard.

**Prefer a fixed dashboard for each role over a dashboard that each persona configures.** Showing each role a different fixed dashboard at login is correct.

**Where customization is required anyway, follow two rules:**

- **Keep each persona's individual arrangement across sessions.** The persona sets the arrangement once, and the system does not rearrange the arrangement.
- **Do not advertise customization.** Offer a settings or configuration entry point without drawing attention to the entry point. Let people find the entry point, or learn about the entry point from colleagues. An unadvertised entry point follows the unadvertised affordance convention in `recursica-skill-system-conventions`. See `recursica-skill-discoverability` for why the convention works.

## Empty and first-run states

**NEVER ship an empty dashboard.** A persona new to the product does not know what the product can do. A persona new to the product has no basis for building a personal view. An empty dashboard is the result of three failures: not knowing what matters, making the dashboard configurable to avoid deciding, and having no default content to fill the dashboard.

**If no content is worth putting on a dashboard, the application should have no dashboard.**

**A first-run dashboard should include an onboarding element.** The onboarding element walks the persona through the persona's first tasks and explains what the product does. The onboarding element must be dismissible, so the persona decides whether the guidance continues.

## Data freshness

**Say how up to date the data is.** A dashboard refreshed every two days but presented as live is worse than no dashboard.

**Where parts of the dashboard refresh on different schedules, say how up to date each part is.** For example, one widget updates every minute, and the widget next to the first widget is rebuilt monthly. Showing nothing to tell the two schedules apart is a common and serious failure.

## Unrelated data side by side

**Two charts side by side suggest a relationship.** Data on different scales, or unrelated data, placed side by side invites the reader to draw conclusions the data does not support. Placing two elements close together claims that the two elements are related. Place two elements close together only when the claim is true.

## Layout constraints

**A dashboard MUST have a maximum width.** A dashboard stretched across a very large monitor cannot be used. Do not fill space only because the space is available.

**NEVER use inner scrolling areas, in the dashboard or inside a card.** The whole dashboard scrolls as one page. Ten cards that each have a separate scrolling area are clearly wrong.

**Use the design system's layouts and tokens (named design values, such as colors or sizes, set by the design system) for grids, gutters, breakpoints, type styles, elevation (the shadow that makes a layer, card, menu, popover, panel or modal look raised), and spacing.** Do not change the grids, gutters, breakpoints, type styles, elevation or spacing. Do not change the layouts or the tokens. Plenty of white space separates the groups of content on the dashboard.

## Smaller viewports

**Adapt the dashboard to smaller viewports. Do not force one dashboard to stretch from phone to desktop.** A person checking in on a phone has a different task than a person working at a desk all day. Learn how people use the dashboard in each setting. Decide which content to remove. Treat the compact view as a separate design.

## Open questions

No house rule covers the following questions yet. **Confirm with the user instead of choosing.** See the never-guess rule in `recursica-skill-design-router`. Do not stretch a rule in this skill to fit an open question.

- **The main position when nothing needs attention.** Announcing good news is forbidden, and no rule says what fills the main position instead.
- **Calls to action for several roles.** No rule says whether the limit of one or two calls to action still holds when several roles share one screen.
- **The dashboard's place in the navigation.** Every location in the application needs a route and a navigation item. No rule says where a dashboard sits in the navigation.
- **Loading behavior.** A dashboard must load fast. No rule says whether the dashboard appears piece by piece or all at once.

## Out of scope

- **The inside of a chart**, meaning the chart's type, variants, labels and thresholds. `recursica-skill-data-visualization` covers the inside of a chart.
- **The anatomy of an individual card.** `recursica-skill-card` covers the anatomy of a card.
- **Grid column counts, gutters, widget shapes, and minimum sizes.** The design system's layouts set the grid column counts, gutters, widget shapes and minimum sizes.
- **Table structure.**

## Pre-flight checklist

Check every item before treating a dashboard as done.

- [ ] The screen passes the workbench test. A screen where the persona does work is not called a dashboard.
- [ ] The application is large enough to justify having a dashboard at all.
- [ ] The team can say what matters on the dashboard. No element on the dashboard is there to cover for not knowing what matters.
- [ ] The dashboard answers "what needs attention right now", and does not announce that nothing needs attention.
- [ ] Each status shows the status's threshold and trend, not only the current state.
- [ ] The dashboard has at most four charts. The dashboard has four cards across the top, and never more than eight cards.
- [ ] Simple metrics are shown as numbers in larger type, not as charts that repeat the numbers.
- [ ] The layout is fixed and has a real hierarchy. The layout is not a grid made only of equally weighted cards.
- [ ] Content runs from broad to detailed, and no essential content sits below the fold.
- [ ] The dashboard has no full data table. Rollups with a way to click through to the detail replace the full table.
- [ ] The dashboard has one or two calls to action in total, and each card has zero or one element the persona can interact with.
- [ ] The dashboard has no filtering, sorting, or view controls, and the navigation is not rebuilt out of cards.
- [ ] The dashboard has no AI summary widget.
- [ ] Every object sits in the same place on every visit. No content on the dashboard rearranges itself.
- [ ] The dashboard is not configurable by default. Where the dashboard is configurable, the entry point is not advertised, and each persona's individual arrangement is kept.
- [ ] The dashboard is not empty on first run, and a dismissible onboarding element is present.
- [ ] The dashboard says how up to date the data is, for each part of the dashboard where the refresh schedules differ.
- [ ] No unrelated data, and no data on different scales, is placed side by side.
- [ ] The dashboard has a maximum width, and the screen has no inner scrolling area of any kind.
- [ ] Smaller viewports get an adapted design, not a squeezed version of the desktop design.
- [ ] Open questions were asked about, not decided: the main position when nothing needs attention, calls to action for several roles, the dashboard's place in the navigation, and loading behavior.
