---
name: recursica-skill-tables
description: House rules for tables and data grids — one table per object type, which fields get a column, horizontal scrolling as a last resort, column widths and alignment, truncating versus wrapping, pagination versus infinite scroll, empty cells, sorting, opening a record, add and bulk actions, inline editing, totals, and frozen columns. Use when building or reviewing a table or list view. Not for row selection — see recursica-skill-selection-controls.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Tables and data grids

Treat each house rule for tables as a constraint. The house rules are opinions, not neutral best practices.

The house rules assume **complex enterprise web applications, designed for desktop first**, built on the Recursica design system. The house rules decide which columns exist and how the data is arranged and aligned. The house rules also decide what the persona can do to a table row.

## Governing principles

1. **Build a table as a high-level view that leads into each record, not as a spreadsheet.** Show enough data for the persona to understand the records and act on the records. Put the remaining data behind an expansion, a panel, or a detail page. Clients often ask for a table to recreate a spreadsheet the client used outside the application. Recreating the spreadsheet is the wrong goal.
2. **Fit the table on the screen.** Decide column width, stacked cell values and truncation so the table stays inside the main desktop screen sizes. Horizontal scrolling is a failure, not a layout option.
3. **Give each table row one way to interact, and use the same way across the whole application.** Make a table row clickable only when no other element in the table row can be clicked. Turn inline editing on for every table or for none. The persona cannot see which mode a cell is in.
4. **Put one object type in one table.** Show status as a column. A screen with a separate section for each status shows a filter as page sections.

## Table or cards

**Show a set of repeating objects in a table by default.** Cards are the narrow exception. Use cards only when all three conditions hold:

- The set of objects is small and finite.
- Every object holds the same kinds of information.
- Each object contains a chart, an image or a photograph.

**Always use a table when the set of objects has high plurality (a large number of items of the same kind), has no fixed end, or keeps growing.**

**Use a table for data that is only text and numbers, however few the records.** A table shows the same values in less space. A table also lets the persona compare values down a column. `recursica-skill-card` allows an occasional exception for visual reasons, for a small, finite set. Use the exception on purpose, and say that the card set uses the exception. Never make the exception the default.

**Use cards for a set that is small, finite, and graphic.** See `recursica-skill-card`.

## One table per object type

**Put all the items of one object type in one table. NEVER split the items into sections by status.** A screen that stacks three sections, headed `Suggested`, `Consolidated people` and `Every speaker`, shows one object type three times. The persona has to add up three row counts to answer "how many people are there?" One table answers the question with one row count.

**Show status as a column, not as a heading.** The persona can sort and filter a single table by the status column. The persona can also see the share of items in each state at a glance. Three separate lists make the persona work out the share from the lengths of the three lists.

**Treat a section heading that names a state as the sign of splitting by status.** `Suggested`, `Pending`, `Archived`, `Needs review` and `Everything else` are each a status value shown as a page section. A section heading names a kind of object. A status names what happened to one object. If a section heading would be a valid value in a status column, the heading is a filter. Put the filter inside the table.

**Two tables with the same columns make the same mistake as sections by status.** Split items into two tables only when all three conditions hold:

- The items are a truly different object type.
- The two tables have different columns.
- The persona would never want to compare the two object types down a column.

Two tables with the same columns were always one table.

**One table also keeps the row count correct.** Sections by status count an item in two states twice. Sections by status also drop an item in no state, without notice. The persona can see neither problem. See the rule in `recursica-skill-screen-scaffolding` that figures shown together agree with each other.

### A table row awaiting a decision

**Show a proposed result as if the result were already applied, and mark the table row as waiting for approval.** The persona can judge a finished result. Piecing a result together from a proposal takes effort. A suggested merge of records appears as the merged record, with a pending status on the merged record.

**Show what went into the proposed result in place.** Use one level of expand and collapse on the table row, a side panel, or a modal. `recursica-skill-panels-modals` decides which of the three to use. Use one of the three, and never another section on the page. The expand-and-collapse option is the same single level of expand and collapse that the rule under "Grouped rows" requires.

**The table row MUST keep the same expansion, panel or modal after approval, with undo inside.** After approval, the expansion, panel or modal that showed the proposal shows the result. Put undo where the persona made the decision, as `recursica-skill-buttons-links` says. Approval does not end the persona's interest in the combined records. The persona most needs to check what was combined right after approval. If approval removes the only view of what happened, nobody can audit the decision.

## Which fields get a column

**Choose columns from what the persona is doing: acting on the records, or understanding the records at a high level.** A field that serves neither task does not need a column.

**Leave out a column that most table rows have no value for.** Check the real data, not the database fields. If only a few table rows have a value, the column is mostly `NA`. A mostly `NA` column takes width away from the columns the persona needs.

**NEVER give a column to an exception**: warnings, errors, flags, conflicts and unusual cases. Exceptions are rare by definition. A column for an exception is mostly empty, and no amount of data will fill the column. A `Warnings` column with thirty italic `NA`s and four badges is an example of this mistake.

**Attach an exception to the object instead, as a marker beside the object's identifying value, such as the object's name.** A marker beside the identifying value states a fact about one table row. The marker does not look like a field that every table row was meant to have.

**Make the exception marker an icon, not a badge.** A badge is a filled, bordered, colored box that holds a word. A few badges scattered down a table pull the eye away from the data. The icon is the default. Use a badge only where an exception needs the visual weight of a badge. `recursica-skill-badges-chips` owns this rule, and `recursica-skill-icon-semantics` covers the exception icon.

**Put the icon beside the identifying value, in the same cell, not alone in a separate cell.** `recursica-skill-icon-semantics` forbids a non-interactive icon by itself with no other information. A column of icons with no other information breaks the rule in `recursica-skill-icon-semantics`. A column of icons with no other information is also mostly empty. The rule on exception columns rejects a mostly empty column. The icon goes beside the name because the name gives the icon context.

**Give a column to a status that every table row has.** How many table rows have a value decides whether a field gets a column. The topic of the field does not decide. A `Status` field, where every record is `active` or `archived`, has a value in every table row. The `Status` field gets a column.

**Use a filter to find exceptions.** A persona looking for the four flagged table rows wants to see those four table rows. The persona does not want a column to scan.

**Put data that does not fit in the table in one of three places:**

- an expandable area inside the table
- a side panel
- a drill-down page (one the persona clicks through to for more detail)

**Keep paragraphs out of a table.** If a value cannot be read in a cell, put the full text on a detail page.

## Horizontal scrolling

**Avoid horizontal scrolling.** Horizontal scrolling is unusual in an application and awkward with a mouse. Horizontal scrolling also has almost no affordance (a visible cue that a control can be used, such as the underline on a link). A persona may never find out that the table has more columns to the right.

Before using horizontal scrolling, confirm with the user that horizontal scrolling is unavoidable. Then state that horizontal scrolling is unavoidable. Treat horizontal scrolling as a last resort, not a pattern. Horizontal scrolling is sometimes unavoidable. For example, a client may insist on a separate column for each field and refuse to split the table.

## Stacked cell content

**A cell may hold two values, primary text and secondary text, and never more than two.** Two stacked values are the approved way to show more data without adding columns.

**Test two stacked values against the column header.** The column header must explain both values. A "Status" column passes when the primary text is _Open_ and the secondary text is the date the item opened. Both values are facts about status. If the column header cannot explain both values, the cell combines the two values only to save space. Then put the two values in separate columns, or leave one of the two values out of the table.

**Two stacked values also fail when too many cells hold two values.** If nearly every cell has two lines, the table becomes overwhelming. The table is overwhelming even when each pair of values passes the column header test.

**Never put unrelated data in one column.** If combining unrelated values is the only way to fit all the data, the table has too many columns. Horizontal scrolling is then the only option left.

**Never show a complex data table below the tablet breakpoint.** A complex data table holds too much data for a narrow screen. Leaving the table out solves the problem of a narrow table. Making the table swipeable never solves the problem. `recursica-skill-responsive-behavior` owns this rule.

## Column widths

**Set column widths by data type**, so that text rarely needs to be cut short. Dates, currency and statuses are narrow. Sentences need room. A fixed width for each data type keeps a table stable as the data changes.

**The design system sets a maximum column width.** A value that reaches the maximum width is truncated. The design system sets the exact character count or pixel limit. The limit varies by implementation and is not a design decision.

**Set widths on the narrow data types, and leave the wide data type, sentences, unset.**

- **Give an explicit width to every column whose data type is narrow**: counts, dates, statuses, currency, and short category terms.
- **Give the sentence column no width at all.** The sentence column takes the width that the narrow columns did not use. The leftover width is the room that sentences need. The sentence column keeps the right width as the viewport changes.

**A fixed width on the sentence column is the first failure.** The sentence column keeps the fixed width, and every column beside the sentence column gets squeezed. A date column then wraps `Aug 10,` onto one line and `2026` onto the next. A wrapped date beside a sentence with spare room is the sign of this mistake.

**Setting no widths at all is the other failure.** With no widths set, the table divides the table width by the content of each column. The identity column is the column the persona scans. The identity column loses width to all the number columns to the right of the identity column. A long value in the identity column then overlaps the next column instead of wrapping inside the identity column.

**Set each width by data type, not by screen.** Define the width for each data type once, for the whole application. Use that one definition in every table. A count column is then the same width in every table. Pixel widths set separately for each table differ from table to table right away.

## Alignment

| Content                    | Alignment                             |
| -------------------------- | ------------------------------------- |
| Text and most values       | Left                                  |
| **Currency and money**     | **Right — always**                    |
| Dates                      | Left or right; a matter of preference |
| Icons, checkboxes, buttons | Centered                              |

**An icon alone in a cell is only ever an icon-only button.** A non-interactive icon NEVER sits alone in a cell with no other information. A status column pairs each status icon with the status text. `recursica-skill-icon-semantics` owns this rule.

**Currency MUST be right-aligned, with no exception.** Right alignment keeps the decimal point in the same place all the way down the column. Apply the same reason to other values. Right-align a value that has one part in a fixed position.

**`recursica-skill-dates-and-currency` owns the formatting inside a cell:**

- the date format
- the decimal precision
- the currency symbol in the column header
- accounting parentheses
- keeping the precision the same down a column

## Truncating or wrapping

Decide between truncating and wrapping in this order:

1. **A cell with secondary text cannot wrap.** A cell holds two lines at most, and the primary text and the secondary text use both lines. Truncate each value to a single line.
2. **In a cell with no secondary text, prefer wrapping onto a second line over truncating.** Truncating is a last resort.
3. **A value that will not fit in two lines does not belong in the table.** Move the value to a detail view.

**A value with no spaces does not wrap by default.** Text layout treats each of the following values as one word:

- an identifier
- a filename
- a slug (a short, URL-friendly name)
- a URL
- any value joined by underscores or dots

A value with no spaces does not break at the edge of the column. The value runs straight across the next columns. The persona sees two values overlap and takes the overlap for a display bug. The overlap is a display bug.

**Allow wrapping to break inside a word.** Set the word break on every cell, not only in the column where the overlap was noticed. Breaking inside a word is a behavior of the whole table, not a property of one column. The next set of data will put a long value in a different column.

**Correct column widths keep a break inside a word rare.** Breaking a word is the fallback for a value too long for a correctly sized column. Breaking a word is not the way to fit a column that was never given room.

## Rows, scrolling, and pagination

**A full-size table and an interior table behave differently.** An interior table is a smaller grid set inside a container beside other elements.

**Make a full-size table fill the width and height of the container the table sits in.** The container size sets the number of visible table rows. Prefer infinite scroll. Pagination, which splits the table rows into separate pages, is a clunky way to move through records.

**Give an interior table a fixed number of table rows, usually five or ten, and then paginate.**

**An interior table MUST NOT scroll, vertically or horizontally.** Every table row on the current page is visible, and pagination shows the next table rows.

## Fixed header and footer

**Keep the table header in place while the table scrolls up and down. If the table has a footer, keep the table footer in place too.** Only the table rows scroll.

## Empty and null cells

**Show `NA` in an empty or null cell, in italics, in neutral 500** (a mid-gray from the design system's neutral palette). `NA` is exact about what happened. An empty cell, or worse a zero, suggests that a value was retrieved. The value may not have been retrieved.

**Write the literal text `NA`, the same in every column.** Different wording in each column, as in `Not recorded`, `No name`, `Not set` and `None`, is a mistake. Different wording looks like a value instead of a missing value. Different wording also gives the same fact a different spelling in every column of the same table. Use one string everywhere.

**Use neutral 500, not the table cell's disabled color.** The two colors are not the same value. The table cell's disabled text color is one step lighter. The `NA` color is a stated rule, not a reuse of the disabled state. Take neutral 500 from the neutral palette token (a named design value, such as a color or a size, set by the design system), so the `NA` color changes when the theme changes.

**Keep the italics.** The italics are the second channel (color, shape, position or text, each a separate signal). `recursica-skill-system-conventions` forbids showing meaning through color alone. A gray `NA` without italics shows meaning through color alone.

**`NA` must be real text in the cell**, not a background, an icon, or an empty cell styled to look empty. A screen reader announces an empty cell as nothing at all.

**NEVER let a null value look like a real value.** A currency cell that shows `0` because the data failed to load makes a different claim from `NA`, and the difference matters.

## Default sort

**Every table MUST be sorted, and the sorted column MUST always be clearly marked.** Without a visible sort indicator, the persona has to work out the order from the data. The persona will usually get the order wrong. Mark the sorted column even when the persona cannot change the sort. A fixed order is still an order. The persona has a right to know which column sets the order, and in which direction.

Show the sort indicator on one column. The sort indicator is part of the column header component. See `recursica-skill-table`.

**Sort on the primary content column**: the column that holds the object's identity or the object's leading value. The primary content column is usually the leftmost column. A selection checkbox column or a status column may come before the primary content column. The primary content column is usually the first, second or third column.

**Choose the sort direction from the data:**

- Dates → most recent first.
- Names → A to Z.
- Statuses → most important first: errors, then problems, then active. The order depends on what matters in that table.

**The sort column does not have to be the leading column.** The leftmost column often holds the object's name, because the persona scans the name first. The meaningful sort can be a date column further to the right. Sorting on that date column is correct.

## Multi-sort

**Sorting by more than one column is allowed, behind a hidden control.** A plain click on a column header switches that column between ascending and descending. A long-press, with a mouse or by touch, opens multi-sort. One click cannot both switch the sort direction and open multi-sort.

**The number of sorted columns has no limit.** The persona sets the order of the sorted columns: first, second, third.

**Do not make a column sortable when the column's data type has no logical order to sort by.** Not every column can be sorted.

## Row density

**Never invent a row density variant**, such as high, medium and low density. Row density is how tightly the table content is packed together. A row density variant is a customization. Most personas do not want to change density, and packing in more data does not make a table better.

## Clickable rows

**A table row may be clickable only if no other element in the table row is interactive.** A table row is not clickable when the table row holds any one of the following elements:

- A selection checkbox.
- An ellipsis or "more" menu.
- A link to another page.

**The rule has no exceptions.** Two click targets in one table row leave the persona unable to predict what a click will do.

## Opening a record

**Make the identifying value of each record the link to the record.** The link needs no extra column. The persona already tries to click the identifying value. The identifying value is the name, title, label, or any value the persona would point at to mean "that one."

**If the table row holds no other interactive element, the whole table row may be the link instead.** See the rule on clickable rows. Both choices are correct. Pick one choice, and use the choice in every table in the application. The persona cannot see which mode a table is in.

**A separate edit or view action in the table row is the third option.** Use the separate action in two cases:

- The object has no single identifying value to put a link on.
- The action is editing rather than navigating.

`recursica-skill-buttons-links` covers how the separate action looks.

**NEVER trigger an action on a single record by selecting that record.** A row selection checkbox means "include this in what the bulk action does," and the row selection checkbox means nothing else. Suppose ticking one table row offers `Correct this name` and ticking two table rows offers `Combine`. Selection then means two unrelated actions, and the persona learns neither meaning. Start editing one record from that record: from the record's name, or from the record's own row action. See `recursica-skill-selection-controls`.

## Adding a record

**Put the add control, the control for adding a record, at the table header, on the right. NEVER put the add control below the table.**

**A table has an unknown number of table rows. The position below a table is unpredictable.** The area under the last table row can be one screen down on a short table. On a long table, the area under the last table row can be twenty screens down. A persona unaware of the add control has no reason to scroll to the end of a list. Content below a list of changing length may never be seen at all. The table header is the one part of a table with a fixed position. The eye already starts at the table header.

**A form that changes the table rows MUST NOT sit inline on the page.** Open a short form in a modal or a panel, and a long form on a separate page. A short form has fewer than five fields. `recursica-skill-panels-modals` sets this rule. The table has to change visibly when the persona saves the form successfully. An inline form leaves the persona looking at a form and a table at once. The persona then cannot tell which state the form or the table is in. Closing the modal or panel tells the persona the work is done. The changed table behind the modal or panel is the confirmation.

**Give a rarely used action no permanent space on the screen.** Creating a record happens now and then. The table is why the persona came. An always-visible form for adding a record uses the best part of the screen for the rarest task. See `recursica-skill-screen-priority`.

## Bulk actions

**`recursica-skill-buttons-links` owns the following bulk action topics:**

- how many bulk actions there are
- when bulk actions appear
- how the count of selected rows appears in the button label

The tables skill sets three bulk action rules.

**Put bulk actions directly above the table, and never inside the filter bar.** A filter changes which data is shown. A bulk action changes the data. See `recursica-skill-filters`.

**The bulk action area holds controls and nothing else. NEVER repeat the selection inside the bulk action area.** The ticked checkboxes show which table rows are selected, and the count is in the button label. A list of the names of the selected records repeats the selection in a weaker form. The list also makes the height of the bulk action area depend on how many table rows are ticked. The table then moves down the page as the persona works.

**Add no separate clear or deselect control.** The header checkbox is the deselect-all control, as `recursica-skill-selection-controls` says. A second deselect control in a different place is one more control to read, and a second answer to "how do I start over?"

## Inline editing

**Prefer editing the whole record on a page over editing cells in place.** Editing data in a table cell raises the same problems as editing data in a form. When a lot of data is saved at once, editing one cell at a time is the wrong choice.

**The main problem with inline editing is the affordance.** A cell shows no cue that tells the persona whether clicking the cell will edit, navigate, or select.

**Inline editing MUST be consistent across the application.** Either every table supports inline editing, or no table does. A mix of tables with and without inline editing leaves personas unable to predict what a click will do.

## Totals and the footer

**Put totals in the table footer.** The design system provides the table footer as a fixed element. The table footer can hold values for each column: currency, counts and totals.

**The table footer usually cannot be clicked.**

**Totals are another reason to prefer infinite scroll.** A single scrolling table shows that the total covers every record. On a paginated table, the persona cannot tell whether the total is for the page or for every record.

If a paginated table shows totals, the labels in the table footer must name the scope of each total. The scope of a total is either the page or the whole set of records.

## Column visibility and reordering

**Treat showing, hiding and reordering columns as a customization, with the same approach as dashboard configuration.** `recursica-skill-system-conventions` sets the approach, as the convention for an unadvertised affordance (a control that works but is not shown in the main interface, such as a keyboard shortcut). Put a fairly hidden control on the table, such as a settings or gear icon. The control opens a screen for choosing which columns are visible, and in what order.

**Drag-and-drop reordering is not preferred.** Drag and drop overloads the interaction, and drag and drop cannot be used without a mouse. If dragging is offered, another way to reorder and show or hide columns MUST also exist.

## Grouped rows

**Avoid grouped rows.** For extra detail beneath a table row, use one level of expand and collapse on that table row instead.

**If a table uses grouped rows anyway, the group headers and sub-headers MUST line up clearly with the columns above.**

## Frozen columns

**Never freeze more than three columns.** A frozen column stays in place while the other columns scroll horizontally.

**The table header and table footer always stay in place. Columns usually do not need freezing.** Because the table header stays in place, a frozen column has few problems left to solve.

## Open questions

**Confirm with the user instead of choosing.** No house rule covers the topics below yet. See the never-guess rule in `recursica-skill-design-router`. Do not stretch a rule above to fit an open question.

- **Which data types cannot be sorted.** The sorting rule leaves out data types with no logical order. Nobody has listed the data types with no logical order.
- **Error states for a table.** No rule covers error states for a table, including partial failure.
- **How many rows must have a value before a sparse column is kept.** The rule is "filled in for most rows." No exact share has been given.
- **The status of pending table rows that are pending for different reasons.** The rules cover one pending state per table. The rules do not cover how to tell different kinds of pending apart.

## Out of scope

- **The design system owns the maximum column widths and the points at which text is cut short. The design system also owns table row padding and the table footer component.**
- **`recursica-skill-buttons-links` covers row action buttons and links, how bulk actions look, and menus on table rows.**
- **`recursica-skill-selection-controls` covers row selection checkboxes, and the indeterminate behavior of the header checkbox.**
- **`recursica-skill-badges-chips` covers how status and metadata are shown in a table row.**
- **`recursica-skill-dashboards` covers whether a table belongs on a dashboard at all.**

## Pre-flight checklist

Check every item before treating a table as done.

- [ ] The sorted column is clearly marked, including on a table whose sort the persona cannot change.
- [ ] A loading table shows the loader (a spinner) by default. A loading table may show plain text or another custom component in place of the loader. A loading table never shows skeleton rows.
- [ ] One object type is in one table. No section heading on the page names a status, a state, or a filter value. Each status, state and filter value is a column value instead.
- [ ] A table row waiting for a decision shows the proposed result with a pending status. The table row shows what went into the result through one expansion, panel, or modal. The same expansion, panel or modal stays after approval, with undo inside.
- [ ] Every column serves either acting on the records or understanding the records. Data that serves neither moved to an expansion, a panel, or a detail page.
- [ ] Every column is filled in for most table rows. No column exists for an exception: warnings, errors, flags and conflicts. Each exception is an icon beside the object's identifying value, not a badge. The exception icon is never alone in a separate cell.
- [ ] The table fits the main desktop sizes. Where horizontal scrolling must be used, a reason is provided.
- [ ] No cell holds more than two values, and the column header explains both.
- [ ] No column combines unrelated values.
- [ ] Column widths are set by data type. Every narrow column has an explicit width: counts, dates, statuses, currency and short terms. The sentence column has no width and takes the leftover width. Column widths are defined once for the whole application, not for each table.
- [ ] Wrapping is allowed to break inside a word, and the word break is set for every cell. A value with no spaces wraps inside the value's column instead of running across the next column.
- [ ] Truncation follows the design system's maximum, not an invented limit.
- [ ] Currency is right-aligned, text is left-aligned, and icons, checkboxes, and buttons are centered.
- [ ] Cells with secondary text truncate. Cells without secondary text prefer wrapping onto a second line. No value longer than two lines is in the table at all.
- [ ] Full-size tables fill the container and use infinite scroll. Interior tables show five to ten table rows and paginate.
- [ ] No interior table scrolls in either direction.
- [ ] The table header and table footer stay in place, and only the table rows scroll.
- [ ] Null cells show the literal string `NA`, in italics, in neutral 500. The string is the same in every column, and the string is real text rather than styling. No null value is shown as a real value or a zero.
- [ ] The default sort is on the primary content column, in the direction the data suggests.
- [ ] Multi-sort, if present, is behind a long-press. A plain click switches the sort direction, and data types that cannot be sorted are left out.
- [ ] The table has no invented row density variant.
- [ ] A table row is clickable only if the table row holds no other interactive element.
- [ ] A record opens from the record's identifying value, the whole table row, or a separate row action. One of the three is chosen once for the whole application. Selecting a record triggers no action on that single record.
- [ ] The add control is at the table header, on the right, never below the table. A short form that adds a record opens in a modal or panel. A long form opens on a separate page. Neither sits inline on the page.
- [ ] The bulk action area holds only controls. The bulk action area has no list of the selected records. The bulk action area has no separate clear control competing with the header checkbox.
- [ ] Inline editing matches across the application: every table has inline editing, or no table does.
- [ ] Totals sit in the fixed table footer. On a paginated table, each total says whether the total covers the page or the whole set of records.
- [ ] Showing and reordering columns sits behind an unadvertised settings control, with a way to show and reorder columns without dragging.
- [ ] The table has no grouped rows. Extra detail uses one level of expand and collapse.
- [ ] No more than three columns are frozen.
- [ ] Open questions were asked about, not decided: data types that cannot be sorted, error states, how many rows must have a value before a sparse column is kept, and kinds of pending.
