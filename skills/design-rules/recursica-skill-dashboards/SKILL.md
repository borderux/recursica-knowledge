---
name: recursica-skill-dashboards
description: House rules for dashboards and overview pages — the dashboard versus workbench test, a stable opinionated layout, numbers over charts, one or two calls to action, no work on the dashboard, empty and first-run states, customization, and data freshness. Use for any dashboard, landing, home, or KPI screen. Not for chart internals — see recursica-skill-data-visualization.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Dashboards

Treat each house rule for dashboards as a constraint. The house rules are unusually strong opinions. The team holds that most dashboards in enterprise software are failures.

The house rules assume **complex enterprise web applications, designed for desktop first**, built on the Recursica design system.

## Governing principles

1. **Build a dashboard for a quick look, not for doing work.**
   - Always lay out a dashboard the same way.
   - Show the persona what needs attention right now.
   - Then send the persona away from the dashboard to act, such as to the Orders page.
2. **Choose stability over novelty.** The data changes constantly. The layout must not change. Put the same content in the same places on every visit. A quick look works only when the persona already knows where to look.
3. **Decide what matters, or do not build a dashboard.** A dashboard states what the team thinks matters. Showing data and leaving the persona to work out the meaning is the lazy answer. The lazy answer has made most modern dashboards worthless.

## The workbench test

**Apply the workbench test first.** Most requests for a dashboard are requests for a different kind of screen.

| What the persona needs                                  | What to build                                         |
| ------------------------------------------------------- | ----------------------------------------------------- |
| A glance at what needs attention, then a way out to act | **Dashboard**                                         |
| Tools and data in one place, to do the persona's work   | **Workbench**. Do not call the workbench a dashboard. |

**A screen where the persona does work is a workbench.** Name the workbench for the job the workbench does, such as "Scorecard" or "Queue". A workbench may show high-level charts above the work area. The charts do not make the workbench a dashboard.

**Build a dashboard only for a large application.**

- If the product is small enough to open straight on the tools, open the product on the tools. For example, a small product opens straight on the Orders page. Do not open that product on a dashboard.
- In an application with ten sections, use the dashboard to point to the one section that needs attention.

**If the team cannot say what matters, do not build a dashboard.** Do not fall back on a table or a configurable canvas because nobody has an opinion. An example of a configurable canvas is a page of widgets the persona arranges. A fallback table or canvas has the same three failures as an empty dashboard:

- not knowing what matters
- making the screen configurable to avoid deciding
- having no default content

The fallback presents the three failures as a feature. Do not clutter a screen to hide that nobody knows what matters.

**A dashboard must not exist to make up for a badly organized application.** Sometimes personas need a dashboard to finally find content, such as the Reports page. Then the real problem is the navigation and the information architecture. The information architecture is how the application's content is organized and labeled.

## Dashboard content

**Aim for one item that needs attention, plus maybe two or three supporting items.** Aim for each item to be one the persona can act on.

- Meets the aim: "Inventory is running low — reorder these products", with a way to go and reorder the products.
- Does not meet the aim: an inventory chart that the persona must interpret.

**A dashboard MUST answer "what needs attention right now, and is everything okay."**

**Do not announce that nothing needs attention.** For example, leave out a message such as "Everything is on track". A dashboard that announces good news adds noise.

**Where a value has a healthy range, show the threshold and the direction the value is moving.** For example, show the limit for late orders, and whether late orders are rising or falling.

- A status without a trend is close to useless.
- A green status light says nothing about whether the number is falling toward yellow.
- The threshold and the direction let the persona act before the status changes.

**NEVER add an AI summary of the dashboard.** A widget that summarizes the dashboard shows that the dashboard failed to communicate. Fix the dashboard.

**Do not rebuild the navigation out of cards.** For example, do not add cards named "Orders" and "Reports" that repeat the menu. If the application has navigation, let the navigation take the persona to each section.

## Amount of content

**Never use inner scrolling (a region that scrolls separately from the page) on any screen in the application.** The ban covers every screen, not only dashboards.

- Give the application one scrollbar, plus sticky regions that stay in place.
- Do not make the persona hover over a region before the region scrolls.

See `recursica-skill-screen-priority`.

**Numbers shown together must agree with each other.** Check the math between the numbers before shipping. The persona compares two counts placed side by side. A number that is a subset of another number must clearly look like a subset.

For example, a dashboard shows 3 pending and 18 overdue, and overdue items are a subset of pending items. The pair of counts reports an impossible result, not a labeling problem. The persona then stops trusting every number on the screen.

`recursica-skill-naming-terminology` owns naming. `recursica-skill-screen-scaffolding` owns the layout of a group of numbers.

**Before putting any chart on a dashboard, confirm that the application has a charting library.** Recursica does not provide charts. A chart needs a separate charting library.

- If the application declares no charting library, confirm with the user that the code should add a charting library.
- Confirm with the user before designing the dashboard around charts that cannot be built yet.

See `recursica-skill-data-visualization`.

**Put at most four charts on a dashboard.** With more than four charts, the persona is doing analysis, not glancing.

**Show as many cards as the data needs, and never more than eight.** Order the page so the content that is fastest to read comes first. A single number is read in a second. A table takes much longer to read.

**Prefer a number to a chart.** If a percentage, a count or a quantity gives the information, show the number in a larger type size. Show the number instead of a chart. For example, show "92% on time" instead of a pie chart of on-time orders. A chart that repeats a number right next to the chart adds nothing.

**Prefer fewer data points.** Judge a dashboard by how clear the dashboard's few insights are, and how easily the persona acts on the insights. Do not judge a dashboard by how much data the dashboard shows.

**Never make the whole page out of cards.**

- Build a fixed layout from the design system's layout structures, type hierarchy and white space.
- Place cards inside the fixed layout.

A card is for repeating peer objects (objects of the same kind, such as rows in a list). A page made entirely of cards is chaotic. A grid of cards that all look equally important has no hierarchy. A dashboard needs a clear order of importance. See `recursica-skill-card`, and the convention to group with space in `recursica-skill-system-conventions`.

**Do not show competing visualizations on the screen at the same time.** Confirm with the user which visualizations on the dashboard compete.

## Structure

**Order the dashboard from broad to detailed.** Put the summary at the top, and show more detail as the persona moves down the page.

**All content below the fold (the part of the page visible only after scrolling) is optional.** The persona must never have to scroll to learn what is going on.

**Never put a full data table on a dashboard.** Show rollups instead, with a way to click through to the detail.

- A rollup is a count, a percentage or a total that the persona can act on directly.
- For example, show "12 late orders", with a link to the late orders.
- A data table is a drill-down (a click through to more detail).

A screen that shows a full table is no longer a dashboard.

## Interaction

**Give the whole dashboard one call to action, or at most two.** A call to action (CTA) is a button or link that prompts the persona's next step, such as "Reorder products". Make every other element on the dashboard support the calls to action.

**Aim for zero or one interactive element per card**, such as one "View orders" link.

**Keep the interaction pattern to look, then click.** When action buttons such as "Approve" start to appear, the dashboard is doing too much.

**NEVER put filtering, sorting, or view controls on a dashboard.** For example, leave out a Region filter, a "Sort by date" menu and a switch between chart and table. Doing work on the dashboard is the most common way dashboards fail. A visit to the dashboard is brief: a quick check, then out into the application.

**Keep the number of interactive elements to a minimum.** Few interactive elements keep the next step obvious.

**A dashboard must load fast.** A dashboard that loads slower than going straight to the work defeats the purpose of the dashboard.

## Stability and customization

**A dashboard MUST be stable across visits.** Keep the same objects in the same places on every visit. For example, the late orders count sits in the same place on every visit. A persona reads a dashboard quickly only when the persona already knows the layout.

**NEVER let a dashboard rearrange the dashboard's content between visits.** Content chosen on the fly must not be the main dashboard. Examples are widgets picked by AI and layouts that change. Content chosen on the fly is acceptable in two forms:

- a separate changing view that the persona chooses to open
- one specific widget that changes

The whole screen must not shift.

**Do not make a dashboard configurable by default.**

- Most configurable dashboards are a technical answer to not having researched what the persona needs.
- A configurable dashboard is also harder to support.
- Data problems are much harder to track down in a customized dashboard than in a shared dashboard.

**Prefer a fixed dashboard for each role over a dashboard that each persona configures.** Showing each role a different fixed dashboard at login is correct. For example, an admin and a first-time buyer each see a different fixed dashboard.

**Where customization is required anyway, follow two rules:**

- **Keep each persona's individual arrangement across sessions.** The persona sets the arrangement once. The system does not rearrange the arrangement.
- **Do not advertise customization.** Offer an entry point to settings or configuration, such as a "Customize" item in a menu. Do not draw attention to the entry point. Let personas find the entry point, or learn about the entry point from colleagues. An unadvertised entry point follows the unadvertised affordance convention in `recursica-skill-system-conventions`. See `recursica-skill-discoverability` for why the convention works.

## Empty and first-run states

**NEVER ship an empty dashboard.** A persona new to the product does not know what the product can do. The new persona has no basis for building a personal view. An empty dashboard is the result of three failures:

- not knowing what matters
- making the dashboard configurable to avoid deciding
- having no default content to fill the dashboard

**If no content is worth putting on a dashboard, the application should have no dashboard.**

**A first-run dashboard should include an onboarding element**, such as a "Get started" checklist.

- The onboarding element walks the persona through the persona's first tasks.
- The onboarding element explains what the product does.
- The onboarding element must be dismissible. The persona decides whether the guidance continues.

## Data freshness

**Say how up to date the data is**, such as "Updated 5 minutes ago". A dashboard refreshed every two days but presented as live is worse than no dashboard.

**Where parts of the dashboard refresh on different schedules, say how up to date each part is.** For example, one widget updates every minute, and the widget next to the first widget is rebuilt monthly. Showing nothing to tell the two schedules apart is a common and serious failure.

## Unrelated data side by side

**Place two elements close together only when the two elements are related.** The persona reads two elements placed close together as related.

- Two charts side by side suggest a relationship.
- Unrelated data side by side invites conclusions the data does not support.
- Data on different scales side by side, such as dollars next to percentages, invites the same unsupported conclusions.

## Layout constraints

**A dashboard MUST have a maximum width.** A dashboard stretched across a very large monitor cannot be used. Do not fill space only because the space is available.

**NEVER use inner scrolling areas, in the dashboard or inside a card.** Let the whole dashboard scroll as one page. Ten cards that each have a separate scrolling area are clearly wrong.

**Use the design system's layouts and tokens (named design values, such as colors or sizes, set by the design system) for grids, gutters, breakpoints, type styles, elevation (the shadow that makes a layer, card, menu, popover, panel or modal look raised), and spacing.** Do not change the grids, gutters, breakpoints, type styles, elevation or spacing. Do not change the layouts or the tokens. Separate the groups of content on the dashboard with plenty of white space.

## Smaller viewports

**Adapt the dashboard to smaller viewports. Do not force one dashboard to stretch from phone to desktop.** A persona checking in on a phone has a different task than a persona working at a desk all day.

- Learn how personas use the dashboard in each setting, such as on a phone or at a desk.
- Decide which content to remove.
- Treat the compact view as a separate design.

## Open questions

**Confirm with the user instead of choosing.** No house rule covers the following questions yet. See the never-guess rule in `recursica-skill-design-router`. Do not stretch a rule in this skill to fit an open question.

- **The main position when nothing needs attention.** Announcing good news is forbidden. No rule says what fills the main position instead.
- **Calls to action for several roles.** No rule says whether the limit of one or two calls to action holds when several roles share one screen.
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
- [ ] The dashboard has at most four charts. The dashboard never has more than eight cards.
- [ ] Simple metrics are shown as numbers in larger type, not as charts that repeat the numbers.
- [ ] The layout is fixed and has a real hierarchy. The layout is not a grid made only of equally weighted cards.
- [ ] Content runs from broad to detailed, and no essential content sits below the fold.
- [ ] The dashboard has no full data table. Rollups with a way to click through to the detail replace the full table.
- [ ] The dashboard has one or two calls to action in total.
- [ ] Each card has zero or one interactive element.
- [ ] The dashboard has no filtering, sorting, or view controls.
- [ ] The navigation is not rebuilt out of cards.
- [ ] The dashboard has no AI summary widget.
- [ ] Every object sits in the same place on every visit. No content on the dashboard rearranges itself.
- [ ] The dashboard is not configurable by default.
- [ ] Where the dashboard is configurable, the entry point is not advertised, and each persona's individual arrangement is kept.
- [ ] The dashboard is not empty on first run, and a dismissible onboarding element is present.
- [ ] The dashboard says how up to date the data is, for each part where the refresh schedules differ.
- [ ] No unrelated data, and no data on different scales, is placed side by side.
- [ ] The dashboard has a maximum width, and the screen has no inner scrolling area of any kind.
- [ ] Smaller viewports get an adapted design, not a squeezed version of the desktop design.
- [ ] Open questions were asked about, not decided: the main position when nothing needs attention, calls to action for several roles, the dashboard's place in the navigation, and loading behavior.
