---
name: recursica-skill-tables
description: House rules for tables and data grids — one table per object type, what earns a column, horizontal scrolling as a last resort, column widths and alignment, truncating versus wrapping, pagination versus infinite scroll, empty cells, sorting, opening a record, add and bulk actions, inline editing, totals, and frozen columns. Use when building or reviewing a table or list view. Not for row selection — see recursica-skill-selection-controls.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Tables and data grids

These are the house rules for data in tables. They are opinions, not neutral best practices. Treat them as constraints.

These rules assume **complex enterprise web applications, designed for desktop first**, built on the Recursica design system. Maximum column widths, the points at which text is cut short, row padding, and the table footer component all come from the system. Your decisions are which columns exist, how the data is arranged and aligned, and what the user can do to a row.

## Governing principles

1. **A table is a high-level view with a way in, not a spreadsheet.** Clients often ask for a table because they were using a spreadsheet outside the application and want to recreate it. That is the wrong goal. Show enough to understand and act, and put the rest behind an expansion, a panel, or a detail page.
2. **Fit the screen.** Every decision about column width, stacking, and cutting text short exists to keep the table inside the main desktop dimensions. Sideways scrolling is the failure state, not a layout option.
3. **One way of interacting per row, and per application.** A row can be clicked only when nothing else in it can be. Inline editing is either on for every table or for none, because the user cannot see which mode a cell is in.
4. **One object type, one table.** Status is a column. A screen that stacks a separate section for each state has taken a filter and built page structure out of it.

## Table or cards?

**A set of repeating objects is a table by default.** Cards are the narrow exception, and they need all of the following: the set is small and finite, every item carries the same kinds of information, and each item contains a graphic — a chart, an image, a photograph.

- **High plurality (a large number of items of the same kind), no fixed end, or growing → table.** Always.
- **Data that is only text and numbers → table**, however few the records. A table shows the same values in less space, and lets the reader compare down a column. `recursica-skill-card` allows an occasional exception here for looks, for a small, finite set — used on purpose and stated, never as the default.
- **Small, finite, and graphic → cards.** See `recursica-skill-card`.

## One table per object type

**All the items of one object type belong in one table. NEVER split them into sections by status.** A screen running `Suggested` over `Consolidated people` over `Every speaker` shows one object type three times. The reader has to add up three row counts to answer "how many people are there?" — a question one table answers just by existing.

**Status is a column, not a heading.** That is the whole mechanism. One table with a status column can be sorted and filtered by state, and the share in each state can be seen at a glance, instead of worked out from the lengths of three separate lists.

**The mark of this mistake is a heading that names a state.** `Suggested`, `Pending`, `Archived`, `Needs review`, `Everything else` — each one is a value that got promoted into page structure. A section heading names a kind of thing; a status names what happened to one. If the heading would be a valid value in a status column, it is a filter, and it belongs inside the table.

**Two tables of the same shape give it away.** Splitting is valid only for a truly different object type, with different columns, that the reader would never want to compare down a column. The same columns twice means it was always one table.

**This is also what keeps the count honest.** Sections by status count anything in two states twice, and quietly drop anything in no state, and the reader can see neither problem. See the rule about figures agreeing with each other in `recursica-skill-screen-scaffolding`.

### A row awaiting a decision

**Show the proposed result as if it were already applied, and mark the row as waiting for approval.** The reader judges a result, which they can do, instead of piecing one together from a proposal, which is work. A suggested merge of records appears as the merged record, with a pending status on it.

**What went into it is revealed in place** — one level of expand and collapse on the row, a side panel, or a modal. Which of the three is decided by `recursica-skill-panels-modals`. The rule here is that it is one of them, and never another section on the page. This is the same single-level expansion that the grouped-rows rule below requires.

**MUST keep that control after approval, and put undo in it.** Approving does not end the reader's interest in what was combined — it is the moment they most need to check it. The control that showed the proposal now shows the result, and the way back lives where the decision was made, as `recursica-skill-buttons-links` says. A screen where approving removes the only view of what happened has made the decision impossible to audit.

## What earns a column

**Decide from what the user is doing:** acting on these records, or understanding them at a high level. Anything that serves neither does not need a column.

**A column also has to earn its place by being filled in.** Judge it against the data as it really is, not against the database design. A field that only a minority of rows have shows up as a stripe of `NA` down the screen — and it took its width from the columns the reader came for.

**NEVER give a column to an exception.** Warnings, errors, flags, conflicts, unusual cases — these are rare by definition, so the column is empty by its very nature, and no amount of data will change that. A `Warnings` header over thirty italic `NA`s and four badges is the shape to recognize.

**An exception attaches to the object instead**, as a marker beside its identifying value. There, it reads as a fact about that row, instead of as a field every row was meant to have.

**That marker is an icon, not a badge.** A badge is a filled, bordered, colored box carrying a word. It is heavy enough that a scattering of them down a table pulls the eye away from the data. Prefer an icon, and use a badge only where something really needs that weight — the icon is the default. Owned by `recursica-skill-badges-chips`; the icon itself is `recursica-skill-icon-semantics`.

**The icon goes beside the identifying value, in that cell — not alone in a cell of its own.** `recursica-skill-icon-semantics` forbids a non-interactive icon sitting by itself with no other information, and a column of bare icons is both that and the empty column this rule just rejected. Beside the name, it has the name for company, which is the whole point of putting it there.

**A status that every row has is a different thing, and it does get its column.** The difference is how much of it is filled in, not what it is about: `Status`, where every record is `active` or `archived`, is data that is filled in. The same column, and the rule flips on how much of it is filled.

**Filtering is what actually serves the exception.** A reader who wants the four flagged rows wants those four — not a column to scan for them.

**Data that does not fit belongs somewhere else** — an expandable area inside the table, a side panel, or a drill-down page (one the user clicks through to for more detail).

**A table is not for paragraphs.** If a value cannot be read in a cell, the full text lives on a detail page.

## Horizontal scrolling

**Avoid scrolling sideways.** It is unusual in an application, awkward with a mouse, and has almost no affordance (a visible cue that tells the user they can act on something) — a user may never find out that there is more table to the right.

It is sometimes unavoidable — for example, when a client insists that every field gets its own column and will not accept splitting the view. When it is, say so, and treat it as a last resort, not a pattern: the goal is always to fit.

## Stacked cell content

**A cell may hold two values — primary text and secondary text — and never more than two.** This is the approved way to carry more data without adding columns.

**The column-header test decides whether a stack is valid.** Both values must be explained by the column's own header. A "Status" column whose primary text is _Open_ and whose secondary text is the date it opened passes: both are facts about status. If the header can no longer account for both values, you are merging two things to save space — they are separate columns, or one of them does not belong.

**Stacking also fails when there is too much of it.** If nearly every cell has two lines, the table becomes overwhelming, even when each stack is valid on its own.

**Unrelated data in one column is never allowed.** If the only way to fit everything is to combine unrelated values, the table has already lost, and sideways scrolling is what is left.

**A complex data table is not shown below the tablet breakpoint at all** (the screen width at which the layout changes for tablets). There is too much data for the space, so the problem of a narrow table is solved by the table not being there — never by making it swipeable. Owned by `recursica-skill-responsive-behavior`.

## Column widths

**Set widths by data type**, so that cutting text short is rarely needed. Dates, currency, and statuses are narrow; sentences need room. Fixing widths for each type of content is what keeps a table stable as the data changes.

**The design system sets a maximum column width**, and values are truncated (cut short and ended with an ellipsis, …) when they reach it. The exact character count or pixel limit belongs to the system, varies by implementation, and is not a design decision.

**Set widths on the narrow types, and leave the wide one unset.** This is the part that decides whether the rule actually works:

- **Give an explicit width to every column whose data type is narrow** — counts, dates, statuses, currency, and short category terms.
- **Give the sentence column no width at all.** It takes whatever the narrow columns did not use — which is what "sentences need room" means in practice — and it stays right as the viewport changes.

**Doing it the other way round is the failure.** Fixing a width on the wide column instead keeps that column's size while everything beside it gets squeezed. So the date column wraps `Aug 10,` onto one line and `2026` onto the next. A wrapped date beside a comfortable sentence is the mark of this mistake.

**Setting no widths at all is the other failure.** Left alone, the layout divides the table up by its content, and the identity column — the one the reader scans — loses out to however many number columns sit to its right. A long value there then crashes into its neighbor instead of wrapping inside its own column.

**Widths belong to the data type, not to the screen.** Define them once for the whole application, so that a count column is the same width in every table, and refer to that definition. Pixel values set separately for each table drift apart right away.

## Alignment

| Content                    | Alignment                             |
| -------------------------- | ------------------------------------- |
| Text and most values       | Left                                  |
| **Currency and money**     | **Right — always**                    |
| Dates                      | Left or right; a matter of preference |
| Icons, checkboxes, buttons | Centered                              |

**An icon alone in a cell is only ever an icon-only button.** A non-interactive icon NEVER sits alone in a cell with no other information — a status column pairs the icon with its text. Owned by `recursica-skill-icon-semantics`.

**Currency MUST be right-aligned, with no exception**, so the decimal point sits in the same place all the way down the column. Apply the reason more widely: any value with a fixed position for some part of it aligns right.

**Formatting within the cell — the date format, the decimal precision, the currency symbol in the header, accounting parentheses, and keeping precision the same down a column — is owned by `recursica-skill-dates-and-currency`.**

## Truncate or wrap

Decide in this order:

1. **If the cell has secondary text, it cannot wrap.** Two lines is the most a cell can hold, and the stack already uses both. Truncate the single line.
2. **With no secondary text, prefer wrapping onto a second line over truncating.** Truncating is a last resort.
3. **If the value will not fit in two lines, it does not belong in the table.** Move it to a detail view.

**A value with no spaces in it cannot wrap, and by default it does not try.** An identifier, a filename, a slug (a short, URL-friendly name), a URL — anything joined by underscores or dots — counts as one word as far as text layout is concerned. So it does not break at the edge of its column: it runs straight across the columns beside it. The reader sees two values crash into each other and reads it as a display bug, which it is.

**So wrapping has to be allowed to break inside a word, and it has to be set for every cell — not just the one column where the problem was noticed.** It is how the table behaves, not a property of one column, and the next set of data will put a long value somewhere else.

**Getting the widths right is what keeps this rare.** Breaking in the middle of a word is the safety net for a value that is long anyway. It is not the way to fit a column that was never given room.

## Rows, scrolling, and pagination

**Two sizes of table behave differently:**

**A full-size table fills the width and height of its container**, and the number of visible rows follows from that. Prefer infinite scroll (more rows load as the user scrolls). Pagination — splitting the rows into separate pages — is a clunky way to move through records.

**An interior table** — a smaller grid set inside a container alongside other elements — gets a fixed number of rows, usually five or ten, and then paginates.

**An interior table MUST NOT scroll, up and down or sideways.** Every row it holds is visible, and pagination takes over from there.

## Fixed header and footer

**The header stays in place during scrolling up and down. A footer, where there is one, stays in place too.** Only the rows scroll.

## Empty and null cells

**Show `NA`, in italics, in neutral 500** (a mid-gray from the design system's neutral palette). The reason is being exact about what happened: an empty cell — or worse, a zero — suggests that a value was retrieved, when it may not have been.

**The text is literally `NA`, and it is the same in every column.** Different wording in each column — `Not recorded`, `No name`, `Not set`, `None` — is the mistake here. It reads as a value instead of as the absence of one, and it gives the same fact a different spelling in every column of the same table. **One string, everywhere.**

**Neutral 500, not the component's disabled color.** They are not the same value — a cell's `text-color-disabled` works out one step lighter — and this treatment is a stated rule, not a reuse of the disabled state. Take it from the neutral palette token (a named design value, such as a color or a size, set by the design system), so it changes when the theme does.

**The italics matter.** They are the second channel (a way of carrying meaning, such as color, shape, position, or text). `recursica-skill-system-conventions` forbids carrying meaning through color alone, and a gray `NA` on its own does exactly that.

**`NA` must be real text in the cell**, not a background, an icon, or an empty cell styled to look empty. An empty cell is announced as nothing at all.

**NEVER let a null value read as a real value.** Currency showing `0` because the data failed to load makes a different claim from `NA`, and the difference matters.

## Default sort

**MUST: every table is sorted, and the sorted column is always clearly marked.** A table with no visible sort indicator forces the reader to work out the order from the data, and they will usually get it wrong. This holds even when the sort cannot be changed — a fixed order is still an order, and the reader has a right to know which column produced it, and in which direction.

The indicator is part of the column header component; see `recursica-skill-table`. Your job is to make sure one column carries it.

**Sort on the primary content column** — the column that carries the object's identity or its leading value. That is usually the leftmost column, allowing for a selection checkbox or a status column that may come before it. So in practice, it is the first, second, or third.

**The direction follows the data:**

- Dates → most recent first.
- Names → A to Z.
- Statuses → most important first: errors, then problems, then active — depending on what matters in that table.

**Exception — the sort column does not have to be the leading column.** The leftmost column often holds the object's name, because that is what the reader scans first, while the meaningful sort is a date further to the right. Sorting on that column is correct.

## Multi-sort

**Sorting by more than one column is allowed, behind a hidden control.** A plain click on a header flips it between ascending and descending. A long-press — with a mouse or by touch — opens multi-sort, because putting both behaviors on a single click does not work.

**There is no limit on the number of sorted columns.** The user sets the order: first, second, third.

**Not every column can be sorted.** Leave out data types that have no logical order to sort by.

## Row density

Density is how tightly content is packed together.

**There are no row density variants.** The design system does not define high, medium, and low density, and adding them is a customization. Most users do not want to change density, and packing in more data does not make a table better.

## Clickable rows

**A row may be clickable only if nothing else inside it is interactive.** Any of these rules it out:

- A selection checkbox.
- An ellipsis or "more" menu.
- A link to another page.

**There are no exceptions.** Two competing click targets in one row mean the user cannot predict what a click will do.

## Getting into a record

**The object's own identifying value is the way in.** The name, the title, the label — whatever the reader would point at to mean "that one" — is the link. It costs no column, and it is where the reader already tries to click.

**Where the row holds nothing else interactive, the whole row may carry the link instead**, as the rule above allows. Both are correct. Pick one, and use it in every table in the application, because the reader cannot see which mode a table is in.

**A separate edit or view action on the row is the third option.** It is for an object with no single identifying value to put a link on, or where the action is editing rather than navigating. How it looks is covered by `recursica-skill-buttons-links`.

**NEVER trigger an action on a single record by selecting that record.** A row checkbox means "include this in what the bulk action does," and it means only that. A table where ticking one row offers `Correct this name` and ticking two offers `Combine` has made selection mean two unrelated things, and taught the reader neither. Editing one record is started from that record — from its name, or from its own row action. See `recursica-skill-selection-controls`.

## Adding a record

**The add control sits at the table's header, on the right. NEVER below the table.**

**A table has an unknown number of rows, so "below it" is nowhere.** Whatever is under the last row is at a position no one can predict — one screen down on a short table, twenty on a long one. A reader who does not already know it is there has no reason to scroll to the end of a list to look for it. Anything below a list of changing length may never be seen at all. The header is the one part of a table whose position is fixed, and it is already where the eye starts.

**A form that changes the table's rows MUST NOT sit inline on the page.** Open it in a modal or a panel, as `recursica-skill-panels-modals` says. The reason is the moment of saving: the table has to change visibly when the form succeeds. An inline form leaves the reader looking at a form and a table at once, with no idea which state either one is in. Closing the surface is what says the work is done, and the changed table behind it is the confirmation.

**An action that is rarely used does not get permanent space on the screen.** Creating a record happens now and then; the table is why the reader came. A create form that is permanently on screen spends the most valuable part of the screen on the least frequent task — see `recursica-skill-screen-priority`.

## Bulk actions

**How many there are, when they appear, and how the count appears in the label are owned by `recursica-skill-buttons-links`.** Three rules belong to the table:

**They sit directly above the table, and never inside the filter bar.** A filter changes what is shown; a bulk action changes the data. See `recursica-skill-filters`.

**The region holds controls and nothing else. NEVER repeat the selection inside it.** The ticked checkboxes already show which rows are selected, and the count is already in the button label. Listing the names of the selected records says it again in a weaker form, and makes the region's height depend on how many rows are ticked — so the table moves down the page as the reader works.

**No separate clear or deselect control.** The header checkbox is the deselect-all control — that is what it is for, as `recursica-skill-selection-controls` says. A second control that does the same thing in a different place is one more thing to read, and a second answer to "how do I start over?"

## Inline editing

**Prefer editing the whole record on a page over editing cells in place.** Inline editing is really a form problem: if a lot of data is being saved at once, editing cell by cell is the wrong tool.

**The core difficulty is the affordance.** Nothing about a cell tells the user whether clicking it will edit, navigate, or select.

**MUST be consistent across the application.** If tables support inline editing, they all do; if they do not, none of them do. Mixing the two is what leaves users unable to predict what a click will do.

## Totals and the footer

**Totals live in the table footer**, which the design system provides as a fixed element. It can carry values for each column — currency, counts, totals.

**The footer usually cannot be clicked.**

**Totals are another reason to prefer infinite scroll.** With a single scrolling table, it is clear that the total covers everything. With pagination, it is unclear whether the total is for the page or for the whole set. So if a paginated table shows totals, the footer labels must say which.

## Column visibility and reordering

**Treat it as a customization, using the same approach as dashboard configuration.** That is the unadvertised affordance convention in `recursica-skill-system-conventions`. Put a fairly hidden control on the table, such as a settings or gear icon. It opens a screen for choosing which columns are visible, and in what order.

**Drag-and-drop reordering is not preferred.** It overloads the interaction, and it is not accessible without a mouse. If dragging is offered, another way to reorder and show or hide columns MUST also exist.

## Grouped rows

**Avoid grouped rows.** Where a row has extra detail beneath it, use a single level of expand and collapse on that row instead.

**If grouped rows are used anyway, their headers and sub-headers MUST line up clearly with the columns above.**

## Frozen columns

A frozen column stays in place while the rest of the table scrolls sideways.

**The header and footer are always sticky. Columns usually do not need freezing** — with the headers already fixed, there is little left for a frozen column to solve.

**Never freeze more than three columns.**

## Uncovered — ask, do not invent

No house rule covers these yet. **Ask the person instead of choosing** — see the never-guess rule in `recursica-skill-design-router`. Do not stretch a rule above to fit them.

- **Which data types cannot be sorted.** The rule leaves out types with no logical order, but no list of them has been made.
- **Error states for a table**, including partial failure.
- **How full a sparse column has to be before it stops earning its place.** "Filled in for most rows" is the rule; the exact share is a judgment call, and no number has been given.
- **How a pending row's status reads when several rows are pending for different reasons.** One pending state per table is covered; telling different kinds of pending apart is not.

## Out of scope

- **Maximum column widths, the points at which text is cut short, row padding, and the footer component.** Owned by the design system.
- **Row action buttons and links, how bulk actions look, and menus on rows.** Covered by `recursica-skill-buttons-links`.
- **Row selection checkboxes, and the header checkbox's indeterminate behavior.** Covered by `recursica-skill-selection-controls`.
- **How status and metadata are shown in a row.** Covered by `recursica-skill-badges-chips`.
- **Whether a table belongs on a dashboard at all.** Covered by `recursica-skill-dashboards`.

## Pre-flight checklist

Before treating a table as done, check:

- [ ] The sorted column is clearly marked, including on tables whose sort cannot be changed.
- [ ] A loading table shows the loader (a spinner) by default, or plain text or another custom component in its place — never skeleton rows.
- [ ] One object type is in one table. No section heading on the page names a status, a state, or a filter value — every one of those is a column value instead.
- [ ] A row waiting for a decision shows the proposed result with a pending status, reveals what went into it through one expansion, panel, or modal, and keeps that same control — with undo in it — after approval.
- [ ] Every column serves either acting on the records or understanding them. The rest moved to an expansion, a panel, or a detail page.
- [ ] Every column is filled in for most rows. No column exists for an exception — warnings, errors, flags, conflicts. Those attach beside the object's identifying value as an icon, not a badge, and never alone in a cell of their own.
- [ ] The table fits the main desktop dimensions. Where sideways scrolling could not be avoided, you said so.
- [ ] No cell holds more than two values, and the column header explains both.
- [ ] You combined no unrelated values into one column.
- [ ] Widths are set by data type: an explicit width on every narrow column — counts, dates, statuses, currency, short terms — and none on the sentence column, which takes what is left. Widths are defined once for the whole application, not for each table.
- [ ] Wrapping is allowed to break inside a word, and is set for every cell, so a value with no spaces in it wraps in its own column instead of running across the next one.
- [ ] Truncation depends on the system's maximum, not on a limit you made up.
- [ ] Currency is right-aligned, text is left-aligned, and icons, checkboxes, and buttons are centered.
- [ ] Cells with secondary text truncate. Cells without it prefer wrapping onto a second line. Nothing longer than two lines is in the table at all.
- [ ] Full-size tables fill their container and use infinite scroll. Interior tables show five to ten rows and paginate.
- [ ] No interior table scrolls in either direction.
- [ ] The header and footer stay in place, and only the rows scroll.
- [ ] Null cells show the literal string `NA`, in italics, in neutral 500 — the same string in every column, as real text rather than styling. No null value is shown as a real value or a zero.
- [ ] The default sort is on the primary content column, in the direction the data suggests.
- [ ] Multi-sort, if present, is behind a long-press. A plain click flips the direction, and types that cannot be sorted are left out.
- [ ] You invented no row density variants.
- [ ] The row is clickable only if it contains no other interactive element.
- [ ] The way into a record is its own identifying value, the whole row, or a separate row action — one of the three, chosen once for the whole application. Selecting a record triggers no action on that single record.
- [ ] The add control is at the table header, on the right — never below the table — and the create form opens in a modal or panel instead of sitting inline on the page.
- [ ] The bulk region holds only controls: no list of the selected records, and no separate clear control competing with the header checkbox.
- [ ] Inline editing matches the rest of the application — all tables or none.
- [ ] Totals sit in the fixed footer, and a paginated table's totals say what they cover.
- [ ] Showing and reordering columns sits behind an unadvertised settings control, with a way to do it that is not dragging.
- [ ] There are no grouped rows; extra detail uses one level of expand and collapse.
- [ ] No more than three columns are frozen.
- [ ] You asked before deciding anything on the uncovered list: types that cannot be sorted, error states, the fill level at which a sparse column stops earning its place, and kinds of pending.
