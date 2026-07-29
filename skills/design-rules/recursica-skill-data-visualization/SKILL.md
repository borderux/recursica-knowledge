---
name: recursica-skill-data-visualization
description: House rules for charts and data visualization in enterprise web applications — when to visualize at all, chart type selection, the near-ban on pie and donut charts, zero baselines and linear scales, time as a dimension, sequence integrity, gridlines, axis and value labels, thresholds and benchmarks, tooltips as supplementary only, encoding beyond color, accompanying data tables, missing data, projections, real-time updates, annotations, drill-down, and adaptive behavior at smaller sizes. Use whenever adding, reviewing, or refactoring any chart, graph, plot, or visual data display. Trigger on "chart", "graph", "plot", "bar chart", "line chart", "pie chart", "donut", "axis", "legend", "trend line", "sparkline", "visualize this data", or any request to show numbers visually. Do NOT use for dashboard composition — that is a separate topic. Do NOT use for data tables as a primary surface.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Data visualization

House rules for charts in enterprise applications. These are opinions, not neutral best practices. Apply them as constraints.

Context these rules assume: **complex enterprise web applications, desktop-first**, built on the Recursica design system. Palette selection and component styling are inherited. Your decisions are whether to visualize at all, which chart, what the axes do, what is labeled, and what the user can interact with.

## Governing principles

1. **Story first, then the simplest form that tells it.** Decide what the visualization is saying — change, lack of change, comparison — and then use the simplest chart that carries it. There is a constant pull to add one more dimension or one more series. Resist it: the more data you add, the less likely the reader sees the simple story.
2. **Keep the data honest.** Charts are extraordinarily easy to make misleading, usually by accident. Zero baselines, linear scales, intact sequences, no unexplained emphasis, projections marked as projections.
3. **Never carry meaning in a single channel.** Color alone fails for a large share of readers and every printed page. Pattern, label, value, and an available data table are how a chart stays readable.

## Whether to visualize at all

**A chart must be a simpler way to tell the story than words, numbers, or a table.** That is the entire justification for one. If the reader cannot interpret it quickly, plain text or a table would have served better.

**Do not visualize a difference too small to see.** 51% versus 49% is not a chart. State it.

**Only put a visualization on a dashboard when it tells the story more simply at a glance.** Ten visualizations on one dashboard is overwhelming and confusing, and the tendency to add charts that serve no one is real. See `recursica-skill-dashboards` for the limits — at most four charts, and a number with typographic emphasis in preference to a chart that restates it.

**NEVER use an infographic in an enterprise application.** Infographics are a marketing storytelling device. Do not dress up application data; let the data come through.

## Chart type

**Pie and donut charts are effectively banned.** The single permitted case: **two segments — three very rarely — with a large enough difference in value that the difference is visible.** Anything else uses a different chart.

- **Segments MUST total 100%.** A pie that does not sum to the whole is invalid.
- **Do not put the chart's own value in the donut hole.** A two-segment donut labeled "75%" tells the story twice and earns nothing. A _different_ kind of value there is fine — a qualitative summary such as an overall status.

**Bars and columns versus lines and areas is not an exclusive choice.** They tell the same story in different registers. **The differentiator is slope.** A line or area encodes rate of change: the steepness itself carries meaning. Bars and columns show values at moments and force the reader to infer the slope. Pick by which story you are telling.

**Nominal categories never get a line chart.** If the sequence of the categories could be reordered without changing the meaning — apples, oranges, bananas — there is no slope between them to draw. A line implies a relationship between adjacent points that does not exist. Time, or any naturally ordered sequence, does imply that relationship, and that is what makes it chartable as a line.

**Layer different techniques rather than repeating one.** A trend line over a column chart, an area behind bars — combining two visual techniques is how overlapping data stays separable.

**NEVER use 3D.** Every chart is two-dimensional. A third dimension may be encoded as the size of a dot or bubble, never as depth or volume.

**A third dimension must earn itself.** Bubble size and clustering are legitimate, but size draws attention and introduces its own sequencing effects. Be certain the third dimension adds value before spending it.

## Axes and scale

**MUST start the value axis at zero.** A truncated baseline exaggerates variance: values between one and five million that vary by one percent look wildly volatile if the axis starts at 900,000. This is the most common way an honest chart becomes a dishonest one.

**MUST use a linear scale. NEVER logarithmic.** People do not read orders of magnitude as evenly spaced steps, so a log scale misleads by construction and makes interpretation harder for everyone.

**Use time as a dimension whenever the data has one, on the horizontal axis.** Time is the most powerful dimension available because it produces trend. A value without time is a moment with no answer to "is this getting better or worse." If a third dimension is needed, keep time on X and encode the third as size.

**NEVER skip values in a sequence.** Showing five of seven days to imply a weekly trend is invalid. If the data for those points does not exist, this is the wrong representation.

**NEVER reorder a natural sequence.** Sorting days of the week by quantity — Monday, Wednesday, Thursday, Tuesday — is unreadable, because the reader's model of time fights the chart. The same applies to numbered groups and any inherently ordered set.

**Purely categorical axes may be ordered deliberately** — largest to smallest, or alphabetically — when no natural sequence exists. Order them the most natural way the data allows.

**Include gridlines, at intervals coarse enough to be useful.** Too few and the reader cannot tell what a bar's value is; too many and the chart is chaotic and hard to trace. Enough to read the values, no more.

## Labels

**Always label both axes. Always show the values.**

**Put the value at the end of each bar or column** where space allows, even when it falls between gridlines. If the axis reads 10 and the value is 11, show 11 — precision beats inference.

**Keep labels as short as they can be while still understood.** Abbreviating to "1M" or "2M" is fine when the reader knows the unit. **Do not use abbreviations or acronyms the reader's domain knowledge may not cover.**

**Make numbers human-readable.** Very large numbers carrying many decimal places are effectively unreadable. Round to what the reader can use.

## Thresholds and benchmarks

**Include thresholds, ideal ranges, or reference lines wherever a value has a "good" and "bad."** The reader usually does not know what a healthy number looks like, and a threshold converts a chart they must interpret into one they can read at a glance. This is one of the highest-value additions available.

**Attribute and label benchmarks explicitly.** Make clear that a benchmark is a benchmark, that it is not your data, and where it came from. Label trend lines. Attribution is what keeps a comparison from being misleading.

## Encoding, color, and accessibility

**NEVER rely on color alone to distinguish series.** Use a pattern — and where useful an icon in the legend — in addition to color. This holds even for a two-color donut.

**Series must be distinguishable for readers with a color vision impairment.** Avoid neighbors like purple and fuchsia, especially when the segments are far apart and the reader must match them back to the legend.

**The black-and-white test:** render the chart without color. If the story survives, the encoding is sound. If it does not, add pattern or labels. This also matters because printed reports may have no color at all.

**The same color MUST mean the same thing across adjacent charts.** Two bar charts side by side where blue means one thing in the first and something else in the second destroys the reader's ability to interpret either quickly.

**All visualizations must meet contrast and accessibility requirements**, labels included — labels are where this most often fails.

**A chart must expose an accessible equivalent.** A bare graph gives a screen reader nothing.

## The accompanying data table

**Provide a data table alongside the visualization whenever space allows.** A summary table is almost never useless: some readers prefer tables outright, both can coexist, and it is the accessible representation of the same data.

**At minimum the data table must be available**, so a reader navigating with a screen reader can reach the values.

## Tooltips and interaction

**Tooltip content MUST be supplementary.** If information is required to understand the story, it belongs in the visualization itself.

**Anti-pattern — the hover-to-read chart.** A visualization whose meaning can only be assembled by hovering each element in turn is inaccessible, and it forces the reader to hold each value in memory to compare it with the next. The axes and legend carry the story; the tooltip adds detail.

**Hover aids are welcome** — highlighting the hovered element, or a guide line that helps locate a value.

**Highlight or isolate on interaction, not permanently.** Emphasis belongs to hover, click, or an isolation control, because it is an act of investigation. A permanent visual distinction adds noise.

**Be careful about permanently emphasizing specific elements.** Arbitrary differences in lightness or saturation read as prioritization the data does not support. There must be a stated reason.

**Drill-down does not conflict with simplicity.** A good visualization invites exploration, so let the reader click through to the underlying data. The chart itself need not change.

## Missing and incomplete data

**Substantially incomplete data should not be visualized at all.**

**Data that lags must say so**, clearly and visibly.

**Where a few points are missing, omit them rather than implying values**, and identify the omission explicitly. Never let a chart imply continuity it does not have.

## Projections and forecasts

**Any projected or forecast portion MUST be visually distinct** — dashed or translucent — so it cannot be mistaken for recorded data.

**A trend line drawn over existing data is fine.** Base a projection on a median of the historical range shown, or a weighted value where the period demands it, such as quarter over quarter.

## Real-time data

**Genuine real-time visualization is rare.** Two acceptable patterns:

1. **Continuous refresh**, with the reader clearly told this is a live display.
2. **A refresh control or new-data indicator**, letting the reader choose when to fetch.

**NEVER let a chart update silently** while the reader believes they are looking at a fixed view.

## Filtering and default views

**Prefer filters the reader applies themselves.**

**Where data is filtered by default, say so unmistakably** — the reader must know they are looking at a partial view.

## Annotations and outliers

**Keep annotations off the plot.** Mark an outlier with a symbol — a cross or double cross — and put the explanation in a note or footnote beside the chart. Do not overlay the visualization with annotation text.

## Density

**Vary the technique when series overlap.** Several lines distinguished only by node shape — triangles, squares, stars — sitting on top of each other are unreadable. Columns with a single line over them separate cleanly.

**When there are too many points to label, make the chart bigger.** Physical size is the primary lever for label density; reach for it before dropping detail.

## Smaller viewports

**Adapt the visualization; do not shrink it.** Forcing one chart to serve desktop and phone either loses fidelity — which changes the story — or flattens the desktop version into something uninformative.

**The story must be identical at every size.** A larger display may carry a richer set of data, and **where information is omitted at a smaller size, say so explicitly.**

## Out of scope

- **Palette selection and component styling.** Handled by Recursica components. The rules here govern the encoding channel, not which colors are used.
- **Dashboard composition** — what goes on a dashboard and how it is arranged. Covered by `recursica-skill-dashboards`.
- **Data tables as a primary surface.** Covered by `recursica-skill-tables`. This skill only requires that one accompany a chart.

## Pre-flight checklist

Before considering a visualization done, verify:

- [ ] The chart is a simpler way to tell this story than words or a table; differences too small to see are not charted.
- [ ] No pie or donut except two — rarely three — highly differentiated segments totalling 100%.
- [ ] No donut hole repeating a value the chart already shows.
- [ ] No line chart across nominal categories that could be reordered freely.
- [ ] No 3D. A third dimension is encoded as size, and earns its place.
- [ ] No infographic treatment.
- [ ] The value axis starts at zero and the scale is linear.
- [ ] Time is on the horizontal axis wherever the data has a time dimension.
- [ ] No skipped points and no reordered natural sequences.
- [ ] Gridlines are present at readable intervals.
- [ ] Both axes are labeled, values are shown, and bar values sit at the end of each bar.
- [ ] Labels are short but unabbreviated where the reader may not know the domain; numbers are rounded to something human.
- [ ] Thresholds or reference ranges are present wherever "good" and "bad" exist.
- [ ] Benchmarks are labeled and attributed.
- [ ] No series is distinguished by color alone; the chart survives the black-and-white test.
- [ ] The same color means the same thing across adjacent charts.
- [ ] A data table accompanies the chart, or is at minimum available.
- [ ] Nothing required to understand the story lives in a tooltip.
- [ ] Emphasis happens on interaction, not as permanent styling.
- [ ] Missing data is omitted and labeled, never implied; substantially incomplete data is not charted.
- [ ] Projections are dashed or translucent and unmistakable as projections.
- [ ] Live data either refreshes with the reader informed, or waits behind a refresh control.
- [ ] Default filters are disclosed.
- [ ] Annotations sit beside the chart, not over it.
- [ ] Overlapping series use different techniques, not just different node shapes.
- [ ] At smaller sizes the chart adapts rather than shrinks, and omitted information is called out.
