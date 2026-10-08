---
name: recursica-skill-data-visualization
description: House rules for charts — whether to chart at all, choosing the chart type, the near-ban on pie and donut charts, honest scales and baselines, labels and gridlines, thresholds, encoding that does not rely on color, the companion data table, and missing or live data. Use for any chart, graph, plot, or sparkline. Not for dashboard layout — see recursica-skill-dashboards.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Data visualization

This skill holds the house rules for charts in enterprise applications. The rules are opinions, not neutral best practices. Treat each rule as a constraint.

The rules assume **complex enterprise web applications, designed for desktop first**, built on the Recursica design system. The Recursica theme sets the color palette and the styling of the Recursica components. A chart design still needs five decisions: whether to show a chart at all, which chart to use, what the chart axes show, what gets a label, and what the user can interact with in the chart.

## Charts from a charting library

Read this section first.

**No Recursica component shows a chart, and no chart component is planned.** Charts come from a third-party charting library. The first question for any screen that needs a chart is whether the application has a charting library at all. The question of how to build the chart comes later.

### Steps before building a chart

1. **Check whether the data needs a chart.** A number or a table is often better than a chart. The section "When to use a chart" often settles the question. Settle the question first, because the answer may remove the need for a charting library.
2. **Check the project for a declared charting library.** Look in the project's dependency list and in the project's configuration. If the project declares a charting library, use that library. Do not add a second charting library. The project has made that decision.
3. **If the project declares no charting library, stop and ask the user to add one.** Do not go ahead, and do not build a workaround for the missing library. Present open-source charting libraries that suit the application's architecture, with the tradeoffs of each library, and let the user choose. See `recursica-skill-design-router` on asking instead of guessing.
4. **Never build a chart by hand out of basic layout components.** In a build test, a bar chart was built from layout and text components, with badges as the bars. The bar chart worked, but a chart built that way is not allowed. A badge is not a bar. Custom styling is for a missing setting or token (a named design value, such as a color or a size, set by the design system), never for a missing component.

### Criteria for a charting library

Judge each charting library by how well the library fits the application, not by how popular the library is.

- **The library is truly open source**, under a permissive license: MIT, Apache 2.0, or BSD.
- **The library is built first for the project's framework.** The project's adapter (the Recursica component library for one framework, such as Mantine or Angular Material) sets the framework. Avoid an older library that connects to the framework through a wrapper (a thin layer of extra code) that conflicts with how the framework builds the page.
- **The library's theme can be set from outside the library**, so Recursica tokens can set the series colors, the chart axes and the gridlines. A library that forces a built-in palette cannot meet the color rules below.
- **The library has no competing theme provider (code that sets a theme).** A library that brings separate theme settings and expects to control the color scheme leaves a page only half themed. A half-themed page follows the Recursica theme in some places and the library's theme in other places.
- **The library has a setting for each feature the rules in this skill require**: a zero baseline, linear scales, axis labels, and pattern or texture in addition to color. A library with decorative defaults, such as 3D effects, gradient fills and animated pie charts, will conflict with every rule below.
- **The library is reasonable in size.** Enterprise data screens are dense, and people use the screens all day. Downloading a large library for one chart is a poor trade.
- **The library's output is accessible, or works alongside a data table.** The rule that requires a data table with each chart is not optional. The chart does not have to solve accessibility alone, because the data table comes with the chart. The chart still must not actively block accessibility.

**The house has not endorsed a charting library yet.** Present candidate libraries and the tradeoffs of each library instead of stating a standard. Once a project picks a charting library, the choice belongs to the project. Every rule below still applies to every chart the chosen library draws.

The sections below describe a correct chart, whichever library draws the chart.

## Governing principles

1. **Decide the story first, then use the simplest form that tells the story.** Decide what the chart says, such as a change, a lack of change or a comparison. Then use the simplest chart that shows that story. The temptation to add one more dimension or one more series is constant. Resist the temptation. Each added dimension or series makes the simple story harder for the reader to see.
2. **Keep the data honest.** A chart is extremely easy to make misleading, usually by accident. Use zero baselines, linear scales and complete sequences. Add no unexplained emphasis. Mark projections as projections.
3. **Never show meaning in only one channel (color, shape, position or text, each a separate signal).** Color alone fails for a large share of readers, and on every printed page. Patterns, labels, values and an available data table keep a chart readable.

## When to use a chart

**A chart must tell the story more simply than words, numbers or a table.** A simpler story is the only reason to have a chart. If the reader cannot understand the chart quickly, plain text or a table would have worked better.

**Do not chart a difference too small to see.** A split of 51% versus 49% does not get a chart. State a difference that small in text.

**Only put a chart on a dashboard when the chart tells the story more simply, at a glance.** Ten charts on one dashboard overwhelm and confuse the reader. The urge to add charts nobody needs is real. See `recursica-skill-dashboards` for the limits: at most four charts, and a number in large type instead of a chart that repeats the number.

**NEVER use an infographic in an enterprise application.** An infographic is a marketing tool for telling a story. Do not decorate application data. Show the data plainly.

## Chart type

**Pie and donut charts are effectively banned.** A pie or donut chart is allowed only with two segments, or very rarely three, where the difference in value is large enough to see. Every other case uses a different chart.

- **The segments of a pie or donut chart MUST add up to 100%.** A pie chart whose segments do not add up to the whole is invalid.
- **Do not put the chart's value in the donut hole.** A two-segment donut chart labeled "75%" in the hole tells the story twice and adds nothing. A _different_ kind of value in the donut hole is fine: a written summary, such as an overall status.

**The choice between bars and columns, or lines and areas, is not all-or-nothing.** Bars, columns, lines and areas tell the same story in different ways. Lines and areas differ from bars and columns in slope. A line or an area shows the rate of change, and the steepness of the line or area has meaning. Bars and columns show values at single moments, and the reader must work out the slope. Pick the chart type that fits the story.

**Never use a line chart for nominal categories.** Nominal categories have no natural order. If reordering the categories does not change the meaning, as with apples, oranges and bananas, no slope exists between the categories to draw. A line suggests a connection between neighboring points, and nominal categories have no such connection. Time, and any sequence with a natural order, does connect neighboring points. That connection makes time and ordered sequences suitable for a line.

**Combine different chart techniques instead of repeating one.** Two different techniques used together keep overlapping data easy to tell apart. Examples are a trend line over a column chart, or an area behind bars.

**NEVER use 3D.** Every chart is two-dimensional. A third data dimension may be shown as the size of a dot or bubble, never as depth or volume.

**Use a third data dimension only when the third dimension adds value.** Bubble size and clustering are valid. Size draws attention, though, and changes what the reader looks at first. Confirm that the third dimension adds value before using the third dimension.

## Axes and scale

**The value axis MUST start at zero.** A value axis that starts above zero exaggerates the variation. Values between one and five million that vary by one percent look wildly unstable if the axis starts at 900,000. A value axis that starts above zero is the most common way an honest chart becomes a dishonest one.

**The scale MUST be linear. NEVER use a logarithmic scale.** On a logarithmic scale, each step up the axis multiplies the value by the same amount, such as ten. People do not read the steps of a logarithmic scale as evenly spaced. A logarithmic scale misleads by design, and makes the chart harder for everyone to read.

**Put time on the horizontal axis whenever the data has a time dimension.** Time is the most powerful dimension available, because time shows a trend. A value without time is a single moment. A single moment gives no answer to "Is this getting better or worse?" If the chart needs a third dimension, keep time on the horizontal axis and show the third dimension as size.

**NEVER skip values in a sequence.** A chart that shows five of seven days to suggest a weekly trend is invalid. If the data for some points in a sequence does not exist, do not skip those points. Mark the gap instead, as the section "Missing and incomplete data" describes.

**NEVER rearrange a natural sequence.** Days of the week sorted by amount, such as Monday, Wednesday, Thursday, Tuesday, cannot be read, because the reader expects the days in calendar order. The same rule applies to numbered groups and to any set with a built-in order.

**An axis of categories with no natural sequence may be sorted on purpose**, from largest to smallest, or alphabetically. Sort the categories in the most natural way the data allows.

**Include gridlines, spaced far enough apart to be useful.** The reader cannot tell a bar's value when a chart has too few gridlines. A chart with too many gridlines is chaotic and hard to follow. Use enough gridlines to read the values, and no more.

## Labels

**Always label both axes. Always show the data values.**

**Put the value at the end of each bar or column** where the chart has room, even when the value falls between gridlines. If the axis reads 10 and the value is 11, show 11. An exact value is better than making the reader guess.

**Keep each label as short as possible while the reader still understands the label.** Shortening to "1M" or "2M" is fine when the reader knows the unit. Do not use an abbreviation or an acronym that the reader may not know from the reader's field.

**Make numbers easy for people to read.** Very large numbers with many decimal places are effectively unreadable. Round each number to a precision the reader can use.

## Thresholds and benchmarks

**Include thresholds, ideal ranges, or reference lines wherever a value can be "good" or "bad."** The reader usually does not know what a healthy number looks like. A threshold turns a chart the reader must interpret into a chart the reader can read at a glance. A threshold is one of the most valuable additions to a chart.

**Label each benchmark clearly and name the benchmark's source.** Make clear that a benchmark is a benchmark, not the application's data. Label trend lines. Naming the source keeps a comparison from misleading the reader.

## Encoding, color, and accessibility

Encoding is how the data becomes visual marks: position, length, color and pattern.

**NEVER rely on color alone to tell series apart.** Use a pattern in addition to color. Where an icon in the legend helps, add the icon too. The rule applies even to a two-color donut chart.

**Readers with a color vision impairment must be able to tell the series apart easily.** Avoid putting colors such as purple and fuchsia next to each other, especially when the chart's segments are far apart and the reader must match each segment to the legend.

**Apply the black-and-white test: show the chart without color.** If the story is still clear, the encoding is sound. If the story is lost, add patterns or labels. The test matters for a second reason: printed reports may have no color at all.

**Each color MUST have the same meaning across neighboring charts.** If blue has one meaning in one bar chart and a different meaning in the bar chart beside that chart, the reader can no longer read either chart quickly.

**Every chart, including the chart's labels, must meet contrast and accessibility requirements.** Chart labels fail contrast and accessibility requirements most often.

**A chart must offer an accessible equivalent.** A chart alone gives a screen reader nothing.

## The accompanying data table

**Put a data table next to the chart whenever the page has room for the data table.** A summary table is almost never wasted. Some readers prefer tables. The data table and the chart can sit side by side. The data table is the accessible version of the chart's data.

**At a minimum, the data table must be available**, so a screen reader user can reach the chart's values.

## Tooltips and interaction

**Tooltip content MUST be extra detail only.** Put any information needed to understand the story in the chart itself.

**A chart that can only be read by hovering is an anti-pattern.** A chart whose meaning the reader must piece together by hovering over each element in turn is inaccessible. The reader must also remember each value to compare the value with the next one. The axes and the legend show the story, and the tooltip adds detail.

**Hover aids are welcome**, such as a highlight on the hovered element, or a guide line that helps the reader find a value.

**Highlight or isolate on interaction, not permanently.** Show emphasis on hover, on click or through an isolate control (a control that singles out the selected data), because emphasis is part of exploring the chart. A permanent visual difference adds clutter.

**Be careful about permanently emphasizing particular chart elements.** Random differences in lightness or color strength suggest a ranking that the data does not support. Permanent emphasis must have a stated reason.

**A drill-down does not conflict with a simple chart.** A drill-down lets the reader click through to more detail. A good chart lets the reader explore. Let the reader click through to the underlying data. The chart itself does not need to change.

## Missing and incomplete data

**Data with large gaps should not be charted at all.**

**A chart of data that lags behind must say that the data lags**, clearly and visibly.

**Where a few data points are missing, leave the points out instead of suggesting values for the points**, and point out the gap clearly. Never let a chart suggest continuity the data does not have.

## Projections and forecasts

**Any projected or forecast part of a chart MUST look different**, dashed or see-through, so the reader cannot mistake the projection for recorded data.

**A trend line drawn over existing data is fine.** Base a projection on a median of the past range shown, or on a weighted value where the period calls for a weighted value, such as quarter over quarter.

## Real-time data

**True real-time charts are rare.** A live chart has two acceptable patterns:

1. **Continuous refresh**, with the reader clearly told that the chart is a live display.
2. **A refresh control or a new-data indicator**, so the reader chooses when to load new data.

**NEVER let a chart update silently** while the reader believes the chart is a fixed view.

## Filtering and default views

**Prefer filters that the reader applies.**

**Where the chart's data is filtered by default, say so clearly.** The reader must know that the chart shows only part of the data.

## Annotations and outliers

**Keep notes off the chart itself.** Mark an outlier with a symbol, a cross or a double cross, and put the explanation of the outlier in a note or footnote beside the chart. Do not cover the chart with note text.

## Density

**Use different chart techniques when series overlap.** Several overlapping lines told apart only by the shape of the points, such as triangles, squares and stars, cannot be read. Columns with a single line over the columns separate cleanly.

**When a chart has too many points to label, make the chart bigger.** Physical size is the main way to fit more labels. Increase the chart's size before dropping detail.

## Smaller viewports

**Adapt the chart; do not shrink the chart.** One chart forced to work on both desktop and phone either loses detail, which changes the story, or reduces the desktop version to a chart that says little.

**The story must be the same at every size.** A larger display may show a richer set of data. Where a smaller size leaves out information, say so clearly.

## Open questions

- **A house-standard charting library, if any.** The selection criteria above are settled. The process is settled too: check for a declared charting library, and ask the user to add one if the project has none. No library has been chosen. Each project currently makes the choice.
- **Connecting a chosen library's theme to Recursica tokens.** The requirement for Recursica tokens to set the chart's theme is clear. The method is not clear, and no adapter exists to connect a charting library to Recursica tokens.
- **Category colors when the palette runs out.** In the build test, a badge in the standard UI kit (the unchanged UI kit in the official Recursica release) had four colors, each with a meaning. Four colors could not show five or more categories, and the shortage of colors forced a single, uniform fill. The rule against a single channel called for a uniform fill anyway. The build test reached the uniform fill by accident, not by design.

No house rule covers the topics below yet. **Ask the person instead of choosing.** See the never-guess rule in `recursica-skill-design-router`. Do not stretch a rule above to fit the topics below.

- **Sparklines (tiny charts without axes) and other small charts inside table cells.**
- **Legend placement**, and whether a chart has a title, and where the title goes.
- **Empty states for charts**: no data yet, versus no results for the current filters.
- **Export.** Whether a chart can be exported, and in what form.

## Out of scope

- **Choosing the palette and styling components.** The Recursica theme sets the palette and the styling of the Recursica components. The rules in this skill govern which channel shows the meaning, not which colors to use.
- **Dashboard layout**: what goes on a dashboard and how the dashboard is arranged. `recursica-skill-dashboards` covers dashboard layout.
- **Data tables as the main content of a screen.** `recursica-skill-tables` covers data tables as main content. This skill only requires a data table with each chart.

## Pre-flight checklist

- [ ] The data needs a chart. A number or a table was ruled out first.
- [ ] The chart uses the project's declared charting library. If the project declared no charting library, the user was asked to add one, with real open-source options and the tradeoffs of each option, and work stopped there.
- [ ] No chart is built by hand out of basic layout components, and no component is used as part of a chart.

Before treating a chart as done, check each item below.

- [ ] The chart tells the story more simply than words or a table. No difference too small to see is charted.
- [ ] No pie or donut chart appears, except one with two clearly different segments, or rarely three, that add up to 100%.
- [ ] No donut hole repeats a value the chart already shows.
- [ ] No line chart runs across nominal categories that could be rearranged freely.
- [ ] No chart uses 3D. Any third dimension is shown as size, and adds value.
- [ ] No part of the screen is styled as an infographic.
- [ ] The value axis starts at zero, and the scale is linear.
- [ ] Time is on the horizontal axis wherever the data has a time dimension.
- [ ] No data points are skipped, and no natural sequence is rearranged.
- [ ] Gridlines are present, spaced so the gridlines are easy to read.
- [ ] Both axes are labeled, values are shown, and each bar's value sits at the end of the bar.
- [ ] Labels are short, but not abbreviated where the reader may not know the field's terms. Numbers are rounded to a precision a person can read.
- [ ] Thresholds or reference ranges are present wherever a value can be "good" or "bad".
- [ ] Each benchmark is labeled, and the benchmark's source is named.
- [ ] No series is told apart by color alone, and the chart passes the black-and-white test.
- [ ] Each color has the same meaning across neighboring charts.
- [ ] A data table comes with the chart, or is at least available.
- [ ] No information needed to understand the story appears only in a tooltip.
- [ ] Emphasis happens on interaction, not as permanent styling.
- [ ] Missing data is left out and labeled, never implied, and data with large gaps is not charted.
- [ ] Projections are dashed or see-through, and cannot be mistaken for recorded data.
- [ ] A live chart either refreshes while the reader is told the chart is live, or waits behind a refresh control.
- [ ] A chart whose data is filtered by default says clearly that the data is filtered.
- [ ] Notes sit beside the chart, not on top of the chart.
- [ ] Overlapping series use different techniques, not only different point shapes.
- [ ] At smaller sizes, the chart adapts instead of shrinking, and any information left out is pointed out.
- [ ] Open questions were asked about, not decided: sparklines, legends, chart titles, empty states, and export.
