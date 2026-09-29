---
name: recursica-skill-data-visualization
description: House rules for charts and data visualization in enterprise web applications — when to visualize at all, chart type selection, the near-ban on pie and donut charts, zero baselines and linear scales, time as a dimension, sequence integrity, gridlines, axis and value labels, thresholds and benchmarks, tooltips as supplementary only, encoding beyond color, accompanying data tables, missing data, projections, real-time updates, annotations, drill-down, and adaptive behavior at smaller sizes. Use whenever adding, reviewing, or refactoring any chart, graph, plot, or visual data display. Trigger on "chart", "graph", "plot", "bar chart", "line chart", "pie chart", "donut", "axis", "legend", "trend line", "sparkline", "visualize this data", or any request to show numbers visually. Do NOT use for dashboard composition — that is a separate topic. Do NOT use for data tables as a primary surface.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Data visualization

These are the house rules for charts in enterprise applications. They are opinions, not neutral best practices. Treat them as constraints.

These rules assume **complex enterprise web applications, designed for desktop first**, built on the Recursica design system. The color palette and component styling are already handled. Your decisions are whether to visualize at all, which chart to use, what the axes (variant properties, as Figma calls them — the ways a component varies, such as its size) do, what gets labeled, and what the user can interact with.

## Read this first: charts come from a library, not from Recursica

**Nothing in the Recursica component set draws a chart, and nothing is planned.** Charting comes from a third-party library. So on any screen that needs a chart, the first question is not how to build it — it is whether the application has a charting library at all.

### The sequence

1. **Check whether the data needs a chart.** The next section often answers this: a number or a table is frequently better than a chart. Settle this first, because it may make the library question go away entirely.
2. **Check the project for a declared charting library.** Look in the dependency list and in the project's own configuration. If one is there, use it. That decision has already been made, and adding a second charting library is not yours to do.
3. **If none is declared, stop and prompt the user to add one.** Do not go ahead, and do not build around the gap. Present open-source options that suit this application's architecture, along with their tradeoffs, and let the user choose. See `recursica-skill-design-router` on asking instead of guessing.
4. **Never build a chart by hand out of basic layout components.** In a build test, a bar chart was made from `Grid`, `Flex`, `Stack`, and `Text`, using badges as the bars. It worked, and it is not allowed. A badge is not a bar, and the styling escape hatch is for a missing prop or token (a named design value, such as a color or a size, set by the design system) — never for a missing component.

### What makes a charting library fit

When you present options, judge them against this application, not by how popular they are:

- **Truly open source**, under a permissive license — MIT, Apache 2.0, or BSD.
- **Built for React first**, rather than an older library with a thin React wrapper that fights how React draws the page.
- **Themeable from the outside**, so series colors, axes, and gridlines can be driven by Recursica tokens. A library that insists on its own palette cannot meet the color rules below.
- **No competing theme provider.** A library that brings its own theme settings and expects to control the color scheme is how a page ends up only half themed — the same problem already seen between the Recursica and Mantine layers.
- **Gives you control over what these rules require**: a zero baseline, linear scales, axis labels, and pattern or texture in addition to color. A library whose defaults are decorative — 3D effects, gradient fills, animated pie charts — will fight every rule below.
- **Reasonable in size.** These are dense data screens that people use all day. Downloading a large library for one chart is a poor trade.
- **Accessible output, or output you can pair with a data table.** The rule requiring an accompanying data table is not optional, so the chart does not have to solve accessibility on its own — but it must not actively block it.

**No library has been endorsed by the house yet.** Nothing has been chosen, so present candidates and their tradeoffs instead of stating a standard. Once a project picks one, that choice belongs to the project — and every rule below still applies to whatever it draws.

The rest of this skill describes what a correct chart looks like, whichever library draws it.

## Governing principles

1. **Decide the story first, then use the simplest form that tells it.** Decide what the chart is saying — a change, a lack of change, a comparison — and then use the simplest chart that carries it. There is a constant pull to add one more dimension or one more series. Resist it: the more data you add, the less likely the reader is to see the simple story.
2. **Keep the data honest.** Charts are extremely easy to make misleading, usually by accident. Use zero baselines, linear scales, and complete sequences; add no unexplained emphasis; and mark projections as projections.
3. **Never carry meaning in a single channel.** A channel is a way of carrying meaning, such as color, shape, position, or text. Color alone fails for a large share of readers, and on every printed page. Pattern, labels, values, and an available data table are what keep a chart readable.

## Whether to visualize at all

**A chart must be a simpler way to tell the story than words, numbers, or a table.** That is the only reason to have one. If the reader cannot understand it quickly, plain text or a table would have worked better.

**Do not chart a difference too small to see.** 51% versus 49% is not a chart. Just state it.

**Only put a chart on a dashboard when it tells the story more simply, at a glance.** Ten charts on one dashboard is overwhelming and confusing, and the urge to add charts nobody needs is real. See `recursica-skill-dashboards` for the limits — at most four charts, and a number in large type rather than a chart that repeats it.

**NEVER use an infographic in an enterprise application.** Infographics are a marketing storytelling tool. Do not dress up application data; let the data speak for itself.

## Chart type

**Pie and donut charts are effectively banned.** The only allowed case is two segments — three, very rarely — with a large enough difference in value that the difference is visible. Anything else uses a different chart.

- **Segments MUST add up to 100%.** A pie that does not add up to the whole is invalid.
- **Do not put the chart's own value in the donut hole.** A two-segment donut labeled "75%" tells the story twice and adds nothing. A _different_ kind of value there is fine — a written summary, such as an overall status.

**Choosing between bars and columns, or lines and areas, is not all-or-nothing.** They tell the same story in different ways. What sets them apart is slope. A line or an area shows the rate of change: how steep it is carries meaning. Bars and columns show values at single moments and make the reader work out the slope. Pick based on which story you are telling.

**Nominal categories never get a line chart.** Nominal categories are ones with no natural order. If you could rearrange the categories without changing the meaning — apples, oranges, bananas — there is no slope between them to draw. A line suggests a connection between neighboring points that does not exist. Time, or any sequence with a natural order, does have that connection, and that is what makes it suitable for a line.

**Combine different techniques instead of repeating one.** A trend line over a column chart, or an area behind bars — using two different visual techniques together is how overlapping data stays easy to tell apart.

**NEVER use 3D.** Every chart is two-dimensional. A third dimension may be shown as the size of a dot or bubble — never as depth or volume.

**A third dimension must earn its place.** Bubble size and clustering are valid, but size draws attention and creates its own effects on reading order. Be sure the third dimension adds value before you use it.

## Axes and scale

**MUST start the value axis at zero.** Starting the axis above zero exaggerates the variation. Values between one and five million that vary by one percent look wildly unstable if the axis starts at 900,000. This is the most common way an honest chart becomes a dishonest one.

**MUST use a linear scale. NEVER logarithmic.** On a logarithmic scale, each step up the axis multiplies the value by the same amount, such as ten. People do not read those steps as evenly spaced, so a log scale is misleading by its very design, and it makes the chart harder for everyone to read.

**Put time on the horizontal axis whenever the data has a time dimension.** Time is the most powerful dimension available, because it shows a trend. A value without time is a single moment with no answer to "is this getting better or worse?" If a third dimension is needed, keep time on X and show the third one as size.

**NEVER skip values in a sequence.** Showing five of seven days to suggest a weekly trend is invalid. If the data for those points does not exist, this is the wrong way to show it.

**NEVER rearrange a natural sequence.** Sorting days of the week by amount — Monday, Wednesday, Thursday, Tuesday — cannot be read, because the reader's sense of time fights the chart. The same goes for numbered groups and any set that has a built-in order.

**Axes that are purely categories may be ordered on purpose** — largest to smallest, or alphabetically — when no natural sequence exists. Order them in the most natural way the data allows.

**Include gridlines, spaced far enough apart to be useful.** With too few, the reader cannot tell what a bar's value is; with too many, the chart is chaotic and hard to follow. Use enough to read the values, and no more.

## Labels

**Always label both axes. Always show the values.**

**Put the value at the end of each bar or column** where there is room, even when it falls between gridlines. If the axis reads 10 and the value is 11, show 11 — being exact beats making the reader guess.

**Keep labels as short as they can be while still being understood.** Shortening to "1M" or "2M" is fine when the reader knows the unit. Do not use abbreviations or acronyms that the reader's knowledge of the field may not cover.

**Make numbers easy for people to read.** Very large numbers with many decimal places are effectively unreadable. Round to what the reader can actually use.

## Thresholds and benchmarks

**Include thresholds, ideal ranges, or reference lines wherever a value can be "good" or "bad."** The reader usually does not know what a healthy number looks like. A threshold turns a chart they must interpret into one they can read at a glance. This is one of the most valuable things you can add.

**Label benchmarks clearly and say where they came from.** Make it clear that a benchmark is a benchmark, that it is not your data, and what its source is. Label trend lines. Naming the source is what keeps a comparison from misleading.

## Encoding, color, and accessibility

Encoding is how the data is turned into visual marks — position, length, color, pattern.

**NEVER rely on color alone to tell series apart.** Use a pattern — and, where it helps, an icon in the legend — in addition to color. This applies even to a two-color donut.

**Series must be easy to tell apart for readers with a color vision impairment.** Avoid putting colors like purple and fuchsia next to each other, especially when the segments are far apart and the reader must match each one back to the legend.

**The black-and-white test:** show the chart without color. If the story survives, the encoding is sound. If it does not, add patterns or labels. This matters for another reason too: printed reports may have no color at all.

**The same color MUST mean the same thing across neighboring charts.** If blue means one thing in one bar chart and something else in the bar chart next to it, the reader can no longer read either chart quickly.

**All charts must meet contrast and accessibility requirements**, including their labels — labels are where this fails most often.

**A chart must offer an accessible equivalent.** A bare graph gives a screen reader (software that reads the screen aloud) nothing.

## The accompanying data table

**Provide a data table next to the chart whenever there is room.** A summary table is almost never wasted: some readers simply prefer tables, the two can sit side by side, and the table is the accessible version of the same data.

**At a minimum, the data table must be available**, so a reader using a screen reader can reach the values.

## Tooltips and interaction

**Tooltip content MUST be extra detail only.** If information is needed to understand the story, it belongs in the chart itself.

**Anti-pattern — the chart you have to hover to read.** A chart whose meaning can only be pieced together by hovering over each element in turn is inaccessible. It also forces the reader to hold each value in their head to compare it with the next. The axes and the legend carry the story; the tooltip adds detail.

**Hover aids are welcome** — highlighting the element being hovered, or a guide line that helps the reader find a value.

**Highlight or isolate on interaction, not permanently.** Emphasis belongs to hovering, clicking, or an isolate control, because it is part of exploring. A permanent visual difference just adds noise.

**Be careful about permanently emphasizing particular elements.** Random differences in lightness or color strength read as a ranking that the data does not support. There must be a stated reason.

**Drill-down does not conflict with simplicity.** A drill-down lets the reader click through to more detail. A good chart invites exploring, so let the reader click through to the underlying data. The chart itself does not need to change.

## Missing and incomplete data

**Data with large gaps should not be charted at all.**

**Data that lags behind must say so**, clearly and visibly.

**Where a few points are missing, leave them out instead of suggesting values for them**, and point out the gap clearly. Never let a chart suggest continuity it does not have.

## Projections and forecasts

**Any projected or forecast part of a chart MUST look different** — dashed or see-through — so it cannot be mistaken for recorded data.

**A trend line drawn over existing data is fine.** Base a projection on a median of the past range shown, or on a weighted value where the period calls for it, such as quarter over quarter.

## Real-time data

**True real-time charts are rare.** There are two acceptable patterns:

1. **Continuous refresh**, with the reader clearly told that this is a live display.
2. **A refresh control or a new-data indicator**, so the reader chooses when to load new data.

**NEVER let a chart update silently** while the reader believes they are looking at a fixed view.

## Filtering and default views

**Prefer filters the reader applies themselves.**

**Where data is filtered by default, say so clearly** — the reader must know they are looking at only part of the data.

## Annotations and outliers

**Keep notes off the chart itself.** Mark an outlier with a symbol — a cross or a double cross — and put the explanation in a note or footnote beside the chart. Do not cover the chart with note text.

## Density

**Use different techniques when series overlap.** Several lines told apart only by the shape of their points — triangles, squares, stars — sitting on top of each other cannot be read. Columns with a single line over them separate cleanly.

**When there are too many points to label, make the chart bigger.** Physical size is the main way to fit more labels. Reach for it before you drop detail.

## Smaller viewports

**Adapt the chart; do not shrink it.** Forcing one chart to work on both desktop and phone either loses detail — which changes the story — or flattens the desktop version into something that says little.

**The story must be the same at every size.** A larger display may carry a richer set of data, and where information is left out at a smaller size, say so clearly.

## Uncovered — ask, do not invent

- **Which charting library, if any, becomes the house standard.** The selection criteria above are settled, and so is the process — check for a declared library, and prompt for one if there is none. But no library has been chosen, so every project currently answers this on its own.
- **How a chosen library's theming is connected to Recursica tokens.** The requirement is clear; the method is not, and no adapter exists for it.
- **Category colors when the palette runs out.** A badge offers four meaning-based colors, which cannot show five or more categories. In the build test, this forced a single, uniform fill — which the never-single-channel rule wanted anyway, but by accident rather than by design.

No house rule covers these yet. **Ask the person instead of choosing** — see the never-guess rule in `recursica-skill-design-router`. Do not stretch a rule above to fit them.

- **Sparklines (tiny charts without axes) and other small charts inside table cells.**
- **Where the legend goes**, and whether a chart has a title and where.
- **Empty states for charts** — no data yet, versus no results for the current filters.
- **Export.** Whether a chart can be exported, and in what form.

## Out of scope

- **Choosing the palette and styling components.** The Recursica components handle these. The rules here govern which channel carries the meaning, not which colors are used.
- **How a dashboard is put together** — what goes on it and how it is arranged. Covered by `recursica-skill-dashboards`.
- **Data tables as the main content of a screen.** Covered by `recursica-skill-tables`. This skill only requires that one comes with a chart.

## Pre-flight checklist

- [ ] The data really needs a chart. You ruled out a number or a table first.
- [ ] You used the project's declared charting library. If none was declared, you prompted the user to add one, gave real open-source options and their tradeoffs, and stopped there.
- [ ] No chart is built by hand out of basic layout components, and no component is being used as part of a chart.

Before treating a chart as done, check:

- [ ] The chart is a simpler way to tell this story than words or a table, and differences too small to see are not charted.
- [ ] There is no pie or donut chart, except one with two — rarely three — clearly different segments that add up to 100%.
- [ ] No donut hole repeats a value the chart already shows.
- [ ] No line chart runs across nominal categories that could be rearranged freely.
- [ ] There is no 3D. Any third dimension is shown as size, and earns its place.
- [ ] Nothing is styled as an infographic.
- [ ] The value axis starts at zero, and the scale is linear.
- [ ] Time is on the horizontal axis wherever the data has a time dimension.
- [ ] No points are skipped, and no natural sequence is rearranged.
- [ ] Gridlines are present, spaced so they are easy to read.
- [ ] Both axes are labeled, values are shown, and each bar's value sits at the end of the bar.
- [ ] Labels are short, but not abbreviated where the reader may not know the field. Numbers are rounded to something a person can read.
- [ ] Thresholds or reference ranges are present wherever "good" and "bad" exist.
- [ ] Benchmarks are labeled, and their source is named.
- [ ] No series is told apart by color alone, and the chart passes the black-and-white test.
- [ ] The same color means the same thing across neighboring charts.
- [ ] A data table comes with the chart, or is at least available.
- [ ] Nothing needed to understand the story is only in a tooltip.
- [ ] Emphasis happens on interaction, not as permanent styling.
- [ ] Missing data is left out and labeled, never implied, and data with large gaps is not charted.
- [ ] Projections are dashed or see-through, and cannot be mistaken for recorded data.
- [ ] Live data either refreshes while the reader is told it is live, or waits behind a refresh control.
- [ ] Default filters are disclosed.
- [ ] Notes sit beside the chart, not on top of it.
- [ ] Overlapping series use different techniques, not just different point shapes.
- [ ] At smaller sizes, the chart adapts instead of shrinking, and anything left out is pointed out.
- [ ] You asked before deciding anything on the uncovered list: sparklines, legends, chart titles, empty states, and export.
