---
name: recursica-skill-tables
description: House rules for tables and data grids in enterprise web applications — what earns a column, the prohibition on horizontal scrolling, stacked cell text, column widths by data type, alignment including right-aligned currency, truncate vs. wrap, infinite scroll vs. pagination, fixed headers and footers, null cells, default sort and multi-sort, when a row may be clickable, inline editing, totals, column visibility, grouped rows, and frozen columns. Use whenever building, reviewing, or refactoring a table, data grid, list view, or any tabular display. Trigger on "table", "data grid", "columns", "rows", "sort", "pagination", "infinite scroll", "sticky header", "truncate", "inline edit", "row actions", "totals row", or a request to display many records. Do NOT use for row action buttons and links — that is recursica-skill-buttons-links. Do NOT use for row selection checkboxes — that is recursica-skill-selection-controls.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Tables and data grids

House rules for tabular data. These are opinions, not neutral best practices. Apply them as constraints.

Context these rules assume: **complex enterprise web applications, desktop-first**, built on the Recursica design system. Maximum column widths, truncation thresholds, row padding, and the table footer component all come from the system. Your decisions are which columns exist, how the data is arranged and aligned, and what the user can do to a row.

## Governing principles

1. **A table is a high-level view with a way in, not a spreadsheet.** Clients frequently ask for a table because they were using a spreadsheet outside the application and want to reproduce it. That is the wrong target. Show enough to understand and act, and put the rest behind an expansion, a panel, or a detail page.
2. **Fit the screen.** Every column-width, stacking, and truncation decision exists to keep the table inside the primary desktop dimensions. Horizontal scrolling is the failure state, not a layout option.
3. **One interaction model per row, and per application.** A row is clickable only when nothing else in it is. Inline editing is on for every table or none, because the user cannot see which mode a cell is in.

## Table or cards?

**A set of repeating objects is a table by default.** Cards are the narrow exception, and they require all of the following: the set is **small and finite**, every instance carries **the same information types**, and each instance contains a **graphical element** — a chart, an image, a photograph.

- **High plurality, unbounded, or growing → table.** Always.
- **Purely textual and numeric data → table**, however few the records. A table shows the same values in less space and lets the reader compare down a column. `recursica-skill-card` allows an occasional aesthetic exception here for a small, finite set — invoked deliberately and stated, never as the default.
- **Small, finite, and graphical → cards.** See `recursica-skill-card`.

## What earns a column

**Decide from what the user is doing:** taking action on these records, or understanding them at a high level. Anything that serves neither does not need a column.

**Data that does not fit belongs somewhere else** — an expandable area inside the table, a side panel, or a drill-down page.

**A table is not for paragraphs.** If a value cannot be read in a cell, the full text lives on a detail page.

## Horizontal scrolling

**MUST NOT scroll horizontally. There is no exception to this rule.** It is atypical in an application, awkward with a mouse, and has almost no affordance — a user may never discover there is more table to the right.

It is occasionally unavoidable when a client insists every field occupy its own column and will not accept splitting the view. Treat that as a forced defeat, not a pattern: **the intent is always to fit.**

## Stacked cell content

**A cell may hold two values — primary text and secondary text — and never more than two.** This is the sanctioned way to carry more data without adding columns.

**The column-header test decides whether a stack is legitimate.** Both values must be explained by the column's own header. A "Status" column whose primary text is _Open_ and secondary text is the date it opened passes: both are facts about status. **If the header can no longer account for both values, you are conflating two things to save space** — they are separate columns, or one of them does not belong.

**Stacking also fails on volume.** If nearly every cell carries two lines, the density becomes overwhelming even when each stack is individually valid.

**Unrelated data in one column is never permitted.** If the only way to fit everything is to combine unrelated values, the table has already lost and horizontal scrolling is what remains.

## Column widths

**Set widths by data type**, so that truncation is rarely needed: dates, currency, and statuses are narrow; sentences need room. Fixing widths per content type is what keeps a table stable as data varies.

**A maximum column width is set by the design system**, and values are truncated when they reach it. The exact character count or pixel threshold is the system's, varies by implementation, and **is not a design decision.**

## Alignment

| Content                    | Alignment                              |
| -------------------------- | -------------------------------------- |
| Text and most values       | Left                                   |
| **Currency and money**     | **Right — always**                     |
| Dates                      | Left or right; a subjective preference |
| Icons, checkboxes, buttons | Centered                               |

**A lone icon in a cell is only ever an icon-only button.** A non-interactive icon NEVER sits alone in a cell with no other information — a status column pairs the icon with its text. Owned by `recursica-skill-icon-semantics`.

**Currency MUST be right-aligned, with no exception**, so the decimal point sits in the same position down the column. Generalize the reason: **any value with a fixed positional feature aligns right.**

**Cell formatting itself — date format, decimal precision, the currency symbol in the header, accounting parentheses, precision consistency down a column — is owned by `recursica-skill-dates-and-currency`.**

## Truncate or wrap

Decide in this order:

1. **If the cell has secondary text, it cannot wrap.** Two lines is the ceiling for a cell, and the stack already uses both. Truncate the single line.
2. **With no secondary text, prefer wrapping to a second line over truncating.** Truncation is a last resort.
3. **If the value will not fit in two lines, it does not belong in the table.** Move it to a detail view.

## Rows, scrolling, and pagination

**Two table sizes behave differently:**

**A full-size table fills the width and height of its container**, and the number of visible rows follows from that. **Prefer infinite scroll.** Pagination is a clunky way to move through records.

**An interior table** — a smaller grid inset into a container alongside other elements — **gets a fixed number of rows, typically five or ten, and then paginates.**

**An interior table MUST NOT scroll, vertically or horizontally.** Every row it holds is visible; pagination takes over from there.

## Fixed header and footer

**The header stays fixed during vertical scrolling. A footer, where present, stays fixed too.** Only the rows scroll.

## Empty and null cells

**Show "NA" in disabled-looking text.** The reason is precision about what happened: an empty cell, or worse a zero, implies a value was retrieved when it may not have been.

**NEVER let a null read as a real value.** Currency displaying `0` because the fetch failed is a different claim from `NA`, and the difference matters.

## Default sort

**MUST: every table is sorted, and the sorted column is always visibly indicated.** A table with no visible sort indicator forces the reader to infer the order from the data, and they will usually infer it wrong. **This holds even when the sort cannot be changed** — a fixed order is still an order, and the reader is entitled to know which column produced it and in which direction.

The indicator is part of the column header component; see `recursica-skill-table`. Your job is to make sure one column carries it.

**Sort on the primary content column** — the column carrying the object's identity or leading value. That is typically the leftmost column, allowing that a selection checkbox or a status column may precede it, so in practice it is the first, second, or third.

**Direction follows the data:**

- Dates → most recent first.
- Names → A to Z.
- Statuses → most important first: errors, then problems, then active, depending on what matters in that table.

**Exception — sort column need not be the leading column.** The leftmost column often holds the object's name because that is what the reader scans first, while the meaningful sort is a date further right. Sorting on that column is correct.

## Multi-sort

**Multi-sort is allowed, behind a hidden affordance.** A plain click on a header flips ascending to descending; **long-press** — mouse or touch — opens multi-sort, because layering both behaviors onto a single click is not workable.

**No limit on the number of sorted columns.** The user assigns order: first, second, third.

**Not every column is sortable.** Exclude data types with no logical sequence to order by.

## Row density

**There are no row density variants.** The design system does not define high, medium, and low density, and adding them is a customization. Most users do not want to change density, and packing in more data does not make a table better.

## Clickable rows

**A row may be clickable only if nothing else inside it is interactive.** Any of the following removes the possibility:

- A selection checkbox.
- An ellipsis or "more" menu.
- A link to another page.

**There are no exceptions.** Two competing click targets in one row means the user cannot predict what a click does.

## Inline editing

**Prefer editing the whole record on a page over editing cells in place.** Inline editing is a form problem: if a lot of data is being saved at once, cell-level editing is the wrong mechanism.

**The core difficulty is affordance.** Nothing about a cell tells the user whether clicking it edits, navigates, or selects.

**MUST be consistent across the application.** If tables support inline editing, they all do; if they do not, none do. Mixing the two is what leaves users unable to predict a click.

## Totals and the footer

**Totals live in the table footer**, which the design system provides as a fixed element and which can carry values — currency, counts, totals — per column.

**The footer is usually not clickable.**

**Totals are another argument for infinite scroll.** With a single scrolling table it is clear the total covers everything. With pagination it is ambiguous whether the total is for the page or the whole set, so **if a paginated table shows totals, the footer labels must say which.**

## Column visibility and reordering

**Treat it as a customization, using the same model as dashboard configuration** — the unadvertised affordance convention in `recursica-skill-system-conventions`**:** a relatively hidden affordance — a settings or gear icon on the table — opening a UI for choosing visible columns and their order.

**Drag-and-drop reordering is not preferred.** It overloads the interaction and is not accessible without a mouse. **If dragging is offered, another mechanism to reorder and toggle columns MUST also exist.**

## Grouped rows

**Avoid grouped rows.** Where a row has sub-detail, use **a single level of expand/collapse** on that row instead.

**If grouped rows are used anyway, their headers and sub-headers MUST align clearly with the columns above.**

## Frozen columns

**The header and footer are always sticky. Columns generally do not need freezing** — with headers already fixed, there is little left for a frozen column to solve.

**Freeze at most one column. Never more than three.**

## Uncovered — ask, do not invent

No house rule covers these yet. **Ask the human rather than choosing** — see the never-guess rule in `recursica-skill-design-router`. Do not pattern-match them to a rule above.

- **Which data types are unsortable.** The rule excludes types with no logical sequence; the list has not been enumerated.
- **Loading and error states for a table**, including partial failure.
- **Where the detail link lives.** A row may not be clickable when it holds an interactive element, so which column carries the way in is unset.
- **Bulk action placement relative to the table** — above it, in a toolbar, or elsewhere.

## Out of scope

- **Maximum column widths, truncation thresholds, row padding, and the footer component.** Owned by the design system.
- **Row action buttons and links, bulk action presentation, and row-level menus.** Covered by `recursica-skill-buttons-links`.
- **Row selection checkboxes and the header checkbox's indeterminate behavior.** Covered by `recursica-skill-selection-controls`.
- **Status and metadata treatment in a row.** Covered by `recursica-skill-badges-chips`.
- **Whether a table belongs on a dashboard at all.** Covered by `recursica-skill-dashboards`.

## Pre-flight checklist

Before considering a table done, verify:

- [ ] The sorted column is visibly indicated, including on tables whose sort cannot be changed.
- [ ] A loading table shows nothing rather than skeleton rows.
- [ ] Every column serves either acting on the records or understanding them; the rest moved to expansion, panel, or detail page.
- [ ] The table fits the primary desktop dimensions with no horizontal scrolling.
- [ ] No cell holds more than two values, and the column header explains both.
- [ ] No unrelated values were combined into one column.
- [ ] Widths are set by data type; truncation relies on the system's maximum, not an invented threshold.
- [ ] Currency is right-aligned; text is left; icons, checkboxes, and buttons are centered.
- [ ] Cells with secondary text truncate; cells without prefer wrapping to a second line; nothing longer than two lines is in the table at all.
- [ ] Full-size tables fill their container and use infinite scroll; interior tables show five to ten rows and paginate.
- [ ] No interior table scrolls in either direction.
- [ ] Header and footer stay fixed; only rows scroll.
- [ ] Null cells read "NA" in disabled text; no null is displayed as a real value or a zero.
- [ ] Default sort is on the primary content column, in the direction the data implies.
- [ ] Multi-sort, if present, is behind long-press; plain click flips direction; unsortable types are excluded.
- [ ] No row density variants were invented.
- [ ] The row is clickable only if it contains no other interactive element.
- [ ] Inline editing matches the rest of the application — all tables or none.
- [ ] Totals sit in the fixed footer, and a paginated table's totals state their scope.
- [ ] Column visibility and reordering sit behind an unadvertised settings affordance, with a non-drag mechanism available.
- [ ] No grouped rows; sub-detail uses one level of expand/collapse.
- [ ] At most one frozen column, never more than three.
- [ ] Nothing in the uncovered list — unsortable types, loading and error states, detail-link placement, bulk action placement — was decided without asking.
