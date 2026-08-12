---
name: recursica-skill-tables
description: House rules for tables and data grids in enterprise web applications — one table per object type with status as a column, not a section per state, rows awaiting approval and undo after it, what earns a column including that it must be populated and that an exception never gets one, no horizontal scrolling, stacked cell text, column widths by data type, alignment, truncate vs. wrap, infinite scroll vs. pagination, null cells, sorting, how a record is opened, where the add affordance sits, what the bulk region may hold, inline editing, totals, and frozen columns. Use when building or reviewing a table, data grid, or list view. Trigger on "table", "data grid", "columns", "sort", "pagination", "truncate", "column width", "inline edit", "status section", "pending approval", "empty column", "warnings column", "add button", or "bulk action". Do NOT use for row action buttons — that is recursica-skill-buttons-links. Do NOT use for row selection checkboxes — that is recursica-skill-selection-controls.
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
4. **One object type, one table.** Status is a column. A screen that stacks a section per state has taken a filter and built page structure out of it.

## Table or cards?

**A set of repeating objects is a table by default.** Cards are the narrow exception, and they require all of the following: the set is **small and finite**, every instance carries **the same information types**, and each instance contains a **graphical element** — a chart, an image, a photograph.

- **High plurality, unbounded, or growing → table.** Always.
- **Purely textual and numeric data → table**, however few the records. A table shows the same values in less space and lets the reader compare down a column. `recursica-skill-card` allows an occasional aesthetic exception here for a small, finite set — invoked deliberately and stated, never as the default.
- **Small, finite, and graphical → cards.** See `recursica-skill-card`.

## One table per object type

**All instances of one object type belong in one table. NEVER partition them into sections by status.** A screen running `Suggested` over `Consolidated people` over `Every speaker` presents one object type three times, and the reader has to add three row counts together to answer "how many people are there" — a question one table answers by existing.

**Status is a column, not a heading.** That is the whole mechanism. One table with a status column can be sorted and filtered by state, and the proportion in each state is visible at a glance instead of inferred from the lengths of three separate lists.

**The signature of the mistake is a heading that names a state.** `Suggested`, `Pending`, `Archived`, `Needs review`, `Everything else` — each one is a value that got promoted to page structure. **A section heading names a kind of thing; a status names what happened to one.** If the heading would be a legitimate value in a status column, it is a filter and it belongs inside the table.

**Two tables of the same shape is the tell.** Splitting is legitimate only for a genuinely different object type, with different columns, that the reader would never want to compare down a column. Same columns twice means it was always one table.

**This is also what keeps the count honest.** Sections by status double-count anything in two states and silently drop anything in none, and neither is visible to the reader. See the reconciliation rule in `recursica-skill-screen-scaffolding`.

### A row awaiting a decision

**Show the proposed outcome as though it were applied, and mark the row as awaiting approval.** The reader judges a result, which they can do, rather than assembling one from a proposal, which is work. A suggested consolidation appears as the consolidated record with a pending status on it.

**What went into it is revealed in place** — one level of expand/collapse on the row, a side panel, or a modal. Which of the three is `recursica-skill-panels-modals`; the constraint here is that it is one of them and **never another section on the page.** This is the same single-level expansion the grouped-rows rule below requires.

**MUST keep that affordance after approval, and put undo in it.** Approval does not end the reader's interest in what was combined — it is the moment they most need to check it. The affordance that showed the proposal shows the result, and the reversal lives where the decision was made, per `recursica-skill-buttons-links`. **A screen where approving removes the only view of what happened has made the decision unauditable.**

## What earns a column

**Decide from what the user is doing:** taking action on these records, or understanding them at a high level. Anything that serves neither does not need a column.

**A column also has to earn its place by being populated.** Judge it against the data as it actually is, not against the schema. A field present for a minority of rows renders as a stripe of `NA` down the screen, and it took its width from the columns the reader came for.

**NEVER dedicate a column to an exception.** Warnings, errors, flags, conflicts, anomalies — these are rare by definition, so the column is empty by construction and no amount of data will change that. A `Warnings` header over thirty italic `NA`s and four badges is the shape to recognize.

**An exception attaches to the object instead**, as a marker beside its identifying value, where it reads as a fact about that row rather than as a field every row was meant to have.

**That marker is an icon, not a badge.** A badge is a filled, bordered, coloured box carrying a word, and it is heavy enough that a scattering of them down a table pulls the eye off the data. **Prefer an icon and reach for a badge only where something genuinely needs that weight** — the default is the icon. Owned by `recursica-skill-badges-chips`; the icon itself is `recursica-skill-icon-semantics`.

**The icon is beside the identifying value, in that cell — not alone in a cell of its own.** `recursica-skill-icon-semantics` forbids a non-interactive icon sitting by itself with no other information, and a column of bare icons is both that and the empty column this rule just rejected. Beside the name it has the name for company, which is the whole point of putting it there.

**A status every row has is a different thing and does get its column.** The distinction is coverage, not subject matter: `Status` where every record is `active` or `archived` is populated data. Same column, and the rule flips on how much of it is filled.

**Filtering is what actually serves the exception.** A reader who wants the four flagged rows wants those four and not a column to scan for them.

**Data that does not fit belongs somewhere else** — an expandable area inside the table, a side panel, or a drill-down page.

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

**A complex data table is not displayed below the tablet breakpoint at all.** There is too much data for the space, so the narrow-table problem is solved by the table not being there — never by making it swipeable. Owned by `recursica-skill-responsive-behavior`.

## Column widths

**Set widths by data type**, so that truncation is rarely needed: dates, currency, and statuses are narrow; sentences need room. Fixing widths per content type is what keeps a table stable as data varies.

**A maximum column width is set by the design system**, and values are truncated when they reach it. The exact character count or pixel threshold is the system's, varies by implementation, and **is not a design decision.**

**Width the narrow types and leave the wide one unset.** This is the part that decides whether the rule actually works:

- **Give an explicit width to every column whose data type is narrow** — counts, dates, statuses, currency, short categorical terms.
- **Give the sentence column no width at all.** It takes whatever the narrow columns did not, which is what "sentences need room" means in practice, and it stays right as the viewport changes.

**Doing it the other way round is the failure.** Fixing a width on the wide column instead holds that column's size while everything beside it is squeezed, so the date column wraps `Aug 10,` onto one line and `2026` onto the next — a wrapped date beside a comfortable sentence is the signature of this mistake.

**Setting no widths at all is the other failure.** Left alone, the layout divides the table by content, and the identity column — the one the reader scans — loses to however many numeric columns are to its right. A long value there then collides with its neighbour instead of wrapping inside its own column.

**Widths belong to the data type, not to the screen.** Define them once for the application so that a count column is the same width in every table, and reference that definition. Per-table pixel values drift apart immediately.

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

**A value with no spaces in it cannot wrap, and by default it does not try.** An identifier, a filename, a slug, a URL — anything joined by underscores or dots — is one word as far as text layout is concerned, so it does not break at the edge of its column: it runs straight across the columns beside it. The reader sees two values collide and reads it as a rendering bug, which it is.

**So wrapping has to be permitted to break inside a word, and it has to be set for every cell rather than the one column where the problem was noticed.** It is the table's behaviour, not a property of one column, and the next dataset puts a long value somewhere else.

**Getting the widths right is what keeps this rare.** Breaking mid-word is the safety net for the value that is long anyway, not the mechanism for fitting a column that was never given room.

## Rows, scrolling, and pagination

**Two table sizes behave differently:**

**A full-size table fills the width and height of its container**, and the number of visible rows follows from that. **Prefer infinite scroll.** Pagination is a clunky way to move through records.

**An interior table** — a smaller grid inset into a container alongside other elements — **gets a fixed number of rows, typically five or ten, and then paginates.**

**An interior table MUST NOT scroll, vertically or horizontally.** Every row it holds is visible; pagination takes over from there.

## Fixed header and footer

**The header stays fixed during vertical scrolling. A footer, where present, stays fixed too.** Only the rows scroll.

## Empty and null cells

**Show `NA`, in italics, in neutral 500.** The reason is precision about what happened: an empty cell, or worse a zero, implies a value was retrieved when it may not have been.

**The string is literally `NA`, and it is the same in every column.** Per-column wording — `Not recorded`, `No name`, `Not set`, `None` — is the failure mode here. It reads as a value rather than as the absence of one, and it gives the same fact a different spelling in every column of the same table. **One string, everywhere.**

**Neutral 500, not the component's disabled colour.** They are not the same value — a cell's `text-color-disabled` resolves a step lighter — and this treatment is a stated one rather than a reuse of the disabled state. Take it from the neutral palette token so it re-themes.

**Italic is load-bearing.** It is the second channel: `recursica-skill-system-conventions` forbids carrying meaning in colour alone, and a grey `NA` on its own does exactly that.

**`NA` must be real text in the cell**, not a background, an icon, or an empty cell styled to look absent. An empty cell is announced as nothing at all.

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

## Getting into a record

**The object's own identifying value is the way in.** The name, the title, the label — whatever the reader would point at to mean "that one" — is the link. It costs no column, and it is where the reader already tries to click.

**Where the row holds nothing else interactive, the whole row may carry it instead**, per the rule above. Both are correct. **Pick one and use it in every table in the application**, because the reader cannot see which mode a table is in.

**A dedicated edit or view action on the row is the third option**, for an object with no single identifying value to hang a link on, or where the action is editing rather than navigating. Its presentation is `recursica-skill-buttons-links`.

**NEVER invoke a single-record action by selecting the record.** A row checkbox means "include this in what the bulk action does", and it means only that. A table where ticking one row offers `Correct this name` and ticking two offers `Combine` has made selection mean two unrelated things and taught the reader neither. **Editing one record is reached from that record** — its name, or its own row action. See `recursica-skill-selection-controls`.

## Adding a record

**The add affordance sits at the table's header, to the right. NEVER below the table.**

**A table has an undefined number of rows, so below it is nowhere.** Whatever is under the last row is at a position no one can predict — one screen down on a short table, twenty on a long one — and a reader who does not already know it is there has no reason to scroll to the end of a list to look for it. **Anything below a variable-length list may never be seen at all.** The header is the one part of a table whose position is fixed, and it is already where the eye starts.

**A form that changes the table's rows MUST NOT sit inline on the page.** Open it in a modal or a panel, per `recursica-skill-panels-modals`. The reason is the commit: the table has to visibly change when the form succeeds, and an inline form leaves the reader looking at a form and a table at once with no idea which state either is in. **Closing the surface is what says the work is done, and the changed table behind it is the confirmation.**

**A rarely-used action does not hold permanent screen space.** Creating a record is occasional; the table is why the reader came. A permanently mounted create form spends the most valuable region of the screen on the least frequent task — see `recursica-skill-screen-priority`.

## Bulk actions

**How many there are, when they appear, and how the count rides in the label are owned by `recursica-skill-buttons-links`.** Three constraints belong to the table:

**They sit directly above the table, and never inside the filter bar.** A filter changes what is shown; a bulk action changes the data. See `recursica-skill-filters`.

**The region holds controls and nothing else. NEVER report the selection back in it.** The ticked checkboxes already say which rows are selected, and the count already rides in the button label. Listing the selected records' names restates it in the weaker form and makes the region's height depend on how many rows are ticked, so the table moves down the page as the reader works.

**No separate clear or deselect control.** The header checkbox is the deselect-all affordance — that is what it is for, per `recursica-skill-selection-controls` — and a second control that does the same thing in a different place is one more thing to read and a second answer to "how do I start over".

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
- **The coverage threshold at which a sparse column stops earning its place.** "Populated for most rows" is the rule; the fraction is a judgment call and has not been given a number.
- **How a pending row's status reads once several rows are pending for different reasons.** One pending state per table is covered; distinguishing kinds of pending is not.

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
- [ ] One object type is in one table. No section heading on the page names a status, a state, or a
      filter value — every one of those is a column value instead.
- [ ] A row awaiting a decision shows the proposed outcome with a pending status, reveals its inputs
      through one expansion, panel, or modal, and keeps that same affordance — with undo in it —
      after approval.
- [ ] Every column serves either acting on the records or understanding them; the rest moved to expansion, panel, or detail page.
- [ ] Every column is populated for most rows. No column exists for an exception — warnings, errors,
      flags, conflicts — those attach beside the object's identifying value as an icon, not a badge,
      and never alone in a cell of their own.
- [ ] The table fits the primary desktop dimensions with no horizontal scrolling.
- [ ] No cell holds more than two values, and the column header explains both.
- [ ] No unrelated values were combined into one column.
- [ ] Widths are set by data type: an explicit width on every narrow column — counts, dates, statuses, currency,
      short terms — and none on the sentence column, which takes the remainder. Widths are defined once for the
      application rather than per table.
- [ ] Wrapping is allowed to break inside a word, set for every cell, so a value with no spaces in it wraps in its
      own column instead of running across the next one.
- [ ] Truncation relies on the system's maximum, not an invented threshold.
- [ ] Currency is right-aligned; text is left; icons, checkboxes, and buttons are centered.
- [ ] Cells with secondary text truncate; cells without prefer wrapping to a second line; nothing longer than two lines is in the table at all.
- [ ] Full-size tables fill their container and use infinite scroll; interior tables show five to ten rows and paginate.
- [ ] No interior table scrolls in either direction.
- [ ] Header and footer stay fixed; only rows scroll.
- [ ] Null cells read the literal string `NA`, italic, in neutral 500 — the same string in every column, as real
      text rather than styling; no null is displayed as a real value or a zero.
- [ ] Default sort is on the primary content column, in the direction the data implies.
- [ ] Multi-sort, if present, is behind long-press; plain click flips direction; unsortable types are excluded.
- [ ] No row density variants were invented.
- [ ] The row is clickable only if it contains no other interactive element.
- [ ] The way into a record is its own identifying value, the whole row, or a dedicated row action —
      one of the three, chosen once for the application. No single-record action is invoked by
      selecting the record.
- [ ] The add affordance is at the table header, to its right — never below the table — and the
      create form opens in a modal or panel rather than sitting inline on the page.
- [ ] The bulk region holds controls only: no list of the selected records, and no separate clear
      control competing with the header checkbox.
- [ ] Inline editing matches the rest of the application — all tables or none.
- [ ] Totals sit in the fixed footer, and a paginated table's totals state their scope.
- [ ] Column visibility and reordering sit behind an unadvertised settings affordance, with a non-drag mechanism available.
- [ ] No grouped rows; sub-detail uses one level of expand/collapse.
- [ ] At most one frozen column, never more than three.
- [ ] Nothing in the uncovered list — unsortable types, loading and error states, the sparse-column threshold, kinds of pending — was decided without asking.
