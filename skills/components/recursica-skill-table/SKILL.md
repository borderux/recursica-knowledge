---
name: recursica-skill-table
description: Rules for the Recursica table component — the table, cell, header, and footer, sorting, cell text and width, currency cells, density, empty cells, footer totals, and data-table accessibility including row selection. Use for tables and data grids. For column, width, and pagination rules, use recursica-skill-tables.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Table

A table shows many records of one type. The reader compares the values in one column across the records.

> **On one adapter, a table shows no spacing, type, or color from the design system, and no error appears.** The UI kit (the token file, `recursica_ui-kit.json`, that says which variants and states each component has) exports 101 tokens for the table and the table's body cells, header row, and footer row. One adapter applies none of the 101 tokens. Another adapter applies all 101 tokens. Every rule below matches the UI kit.

## When to use a table

- **The number of items is high, has no fixed end, or is growing.** A table is the default for repeating records, with no exception.
- **The content is only data**: text, numbers, dates, currency, or status.
- **The reader compares values across records.** A table column lets the reader compare values. Cards do not.
- **Sorting, filtering, or selecting table rows is part of the user's task.**

## When not to use a table

| Situation                                                                        | Use instead                                                   |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| A few items, in a list with a fixed end, where each item has a chart or an image | `recursica-skill-card`                                        |
| The properties of one object                                                     | A detail view or a form                                       |
| A list of names of one kind, with no attributes                                  | A list                                                        |
| The data has a parent-child hierarchy                                            | `recursica-skill-tree`                                        |
| Laying out a page                                                                | A layout. A table is for data, never for positioning content. |

**When a table is too wide for the screen, change the table's structure instead of adding scrolling.** Use fewer columns, a drill-down, or stacked text in the cells. Use horizontal scrolling only as a last resort. `recursica-skill-tables` owns this rule.

## Variants

**Use only the table variants and options that the Recursica MCP server lists for the project.** A designer can add variants and options in Theme Forge, so each project can differ. Get the list with the server's `recursica_get_component_doc` tool, and use the names the code uses. Never invent a variant or an option.

The rules below describe each part and option by role, such as "the header row". The names in the standard UI kit (the unchanged UI kit in the official Recursica release) are examples only.

- **A table has four parts:** the table frame, the header row, the body cells, and the footer row. In the standard UI kit, the four parts are `table`, `table-header`, `table-cell`, and `table-footer`.
- **The table frame** is the outer frame around every table row.
- **The header row** is the top table row. The header row holds the column headers.
- **A body cell** holds one value of one record.
- **The footer row** is the bottom table row. The footer row holds the totals.
- **In the standard UI kit, the header row, the body cells, and the footer row each have a disabled state.** The meaning of the disabled state is an open question.
- **The header row shows the sort indicator, the sorted text style, and the unsorted text style.** Do not add a separate sort indicator or a separate sort text style.
- **Body cells and the footer row have a currency text style, separate from the normal text style.** Use the `currency-style` token for currency. Follow `recursica-skill-dates-and-currency` for alignment and precision.
- **If the project has a density variant, such as compact, comfortable, or spacious, use the project's density variant.** Never invent a density variant. `recursica-skill-tables` sets this rule.
- **If the project has a selected-row state, a row hover state, or an expanded-row state, use the project's state.** Never invent a selected-row state, a row hover state, or an expanded-row state. See "Open questions".

## Rules

**Show `NA` for a null value, never an empty cell and never `0`.** An empty cell looks like a forgotten value, and a zero looks like a real value. `recursica-skill-tables` owns this rule and sets the text, the italics, and the neutral-500 color. `recursica-skill-system-conventions` extends the rule to every region that holds content, such as a page, panel, or modal. This skill repeats the rule only because the rule affects accessibility. Read `recursica-skill-tables` for the rule itself. Where `recursica-skill-tables` differs from this paragraph, follow `recursica-skill-tables`.

**Every table has a default sort, and the sorted column always shows the sort indicator**, even when the user cannot change the sort. The header row has the sorted text style and the sort icon. Make sure one column shows both. When the reader cannot see the order of the table rows, the reader has to guess the order. `recursica-skill-tables` owns this rule.

**Clicking a column header reverses the sort direction.** The user sorts by more than one column with a long-press. The long-press is an unadvertised affordance (a control that works but is not shown in the main interface, such as a keyboard shortcut). Sorting by more than one column also needs a keyboard equivalent, described under "Keyboard and non-mouse navigation".

**Currency is right-aligned, shows two decimal places on every value, and shows the currency symbol in the column header** instead of in every cell. `recursica-skill-dates-and-currency` owns this currency format, including the fixed precision of two decimals. `recursica-skill-tables` owns column alignment by data type. Read those two skills rather than this summary. Where those two skills differ from this summary, follow those two skills. This skill adds only the token for the currency format: the `currency-style` token on body cells and the footer row.

**MUST NOT wrap a cell's value in a text component.** A body cell sets the text style of the cell's value. A text component has a different text style. A text component inside a cell replaces the table's text style with the text component's style. The rule under "Styling set by tokens" forbids replacing the table's text style. Put the value in the cell directly.

**A text component wrapped around a cell's value is by far the most common cause of the wrong type in a table.** This skill states the rule apart from the styling rule because, in code, a text component around a value does not look like an override. A cell value inside a text component looks like careful markup, but the text component replaces the table's type. The column with the text component then shows in a different typeface from every other column in the same table, such as the brand's secondary typeface where the UI kit sets the primary typeface. The difference is visible on screen and invisible in a code diff.

**Check the type by comparing the columns on screen, not by reading the code.** Every column of one table shows in one typeface, one size, and one weight. If one column differs, look for a component wrapped around the values in that column.

**When a cell needs a second, less prominent line, use the approved cell in `recursica-skill-tables` that stacks two values.** Only the second line gets a different style. The primary value keeps the cell's text style.

**Put totals in the footer row**, in the footer row's currency text style.

**Make a table row clickable only when nothing else in the table row is clickable.** When a table row holds a link, a button, or a checkbox, the table row is not a click target.

**Turn inline editing on everywhere in the application, or nowhere.** `recursica-skill-system-conventions` requires one behavioral mode per system.

**Do not put a card in a cell, and do not wrap the table in a card.**

**A table has at most one frozen column** (a column that stays in place while the other columns scroll horizontally). `recursica-skill-tables` owns this rule.

**Do not use the body cell's `max-width` token to fix a column that is too wide.** The `max-width` token limits nothing by itself. A maximum width on a table cell is only a suggestion to the browser's automatic table layout. The automatic table layout sizes each column from the column's content and often goes past the maximum width. In one real table, a 200px maximum width measured 257px. Set a column's width by the column's data type, as `recursica-skill-tables` describes. The browser applies a width set by data type, and largely ignores `max-width`.

## Accessibility

The rules below add to the accessibility baseline in `recursica-skill-system-conventions`, which every Recursica component follows.

**A data table can be used without sight only when the table is built as a real table.** In a grid of `div` elements, a screen reader user has no way to know which column a value belongs to. A table's meaning is the link between each value and the value's column.

### Screen readers

- **The table must be a real table, with real header cells**, each header cell connected to the header cell's column. A cell's meaning is the cell's column header. Without the connection between a header cell and the header cell's column, a value is a number with no name.
- **The table needs an accessible name** (the name a screen reader reads out for a control) that says what the table's records are. A page with three tables and no table names cannot be navigated.
- **The sort state must be announced on the column header**: which column is sorted, in which direction, and that the column header is the control that changes the sort. The sorted text style shows the sort state only to a user who can see the table.
- **Each table row's selection checkbox needs a name that identifies the checkbox's table row**, such as "Select invoice 1043", not five identical "Select" controls. The select-all checkbox in the header row needs a separate name. The select-all checkbox's indeterminate state (the partly selected state, shown as a dash, when some but not all items are selected) must be available to assistive technology.
- **`NA` must be real text in the cell.** The `NA` rule has an accessibility reason as well as a visual reason. A screen reader announces an empty cell as nothing.
- **Every repeated row action must name the object the action acts on**, or the table row must give the object as context in code.
- **A fixed header must still be the table's header row**, not a separate visual element placed above a table with no header row.
- **Never let a cell's meaning depend on color or an icon alone.** A status cell needs text.
- **Announce the result of a sort, a filter, or a page change**: how many table rows there are now, or that the order changed. When the table updates with no announcement, the user believes nothing happened.

### Keyboard and non-mouse navigation

- **Every control in the table can be reached in visual order**: the header sort controls, row checkboxes, links, and row actions.
- **Sorting by more than one column with a long-press must have a keyboard equivalent.** `recursica-skill-system-conventions` requires a second way to do every drag or long-press. A keyboard cannot press and hold. Sorting by more than one column needs an explicit control or a modifier key.
- **A column-visibility gear must be a real control that a keyboard can reach.** A column-visibility gear is a gear icon that lets the user show or hide columns. The gear is an unadvertised affordance, and an unadvertised affordance must still be accessible. Reordering columns must work without dragging.
- **A clickable table row must be a single, real control** with an accessible name, not a click handler on a `tr` element. If a single control for the whole table row is awkward, make a link in one cell the click target instead. A link in one cell is usually the better choice.
- **A keyboard user must be able to start and leave inline editing.** Escape abandons the edit, and focus returns to the cell.
- **Reveal nothing on hover.** Row actions that appear on hover cannot be reached by keyboard or by touch.
- **Give the table no horizontal scrolling area.** `recursica-skill-tables` has a house rule against horizontal scrolling. Horizontal scrolling also makes a table close to unusable for a keyboard user. A keyboard user has no way to bring an off-screen column into view except by tabbing blindly.
- **Focus must be visible on every control in the table**, and never hidden on a focused table row or cell.

## Styling set by tokens

**Never set or override the table's styling.** The theme sets every visual property of the table, such as size, spacing, borders, colors and animation. Do not add extra containers or spacers to change the table's look. If the design needs a look the theme does not give, report the missing look as a gap in the design system. See `recursica-skill-design-router`.

Never set or override the styling of the header row, the body cells or the footer row either. A text component wrapped around a cell's value is the most common override of the table's text style. See "Rules".

## Related skills

- `recursica-skill-tables` — the owning design-rules skill: table versus cards, column widths and alignment, truncation versus wrapping, cells with two values, pagination versus infinite scroll, fixed header and footer, default sort, sorting by more than one column, column visibility, frozen columns, clickable table rows, inline editing, and totals.
- `recursica-skill-dates-and-currency` — currency alignment and precision, date format, and the currency symbol in the column header.
- `recursica-skill-system-conventions` — one behavioral mode per system, unadvertised affordances and the keyboard way to use an unadvertised affordance, and never showing meaning in only one way.
- `recursica-skill-live-regions` — announcing a row count or result count that changes when the table is filtered, sorted, or refreshed.
- `recursica-skill-filters` — narrowing the table: the filter bar, search, date ranges, noun labels, and showing which filters are applied.

### Only if used on the same screen

- `recursica-skill-card` — the boundary: when repeating records are cards instead of a table.
- `recursica-skill-pagination` — the footer control for paging.
- `recursica-skill-checkbox` — row selection and the select-all checkbox in the header row, including the indeterminate state.

## Open questions

- **How a selected table row looks.** The design rules require row selection. Ask only when the project has no selected-row state.
- **Row hover.** A clickable table row needs a visible cue that the row can be clicked. Ask only when the project has no row hover state.
- **Table rows that expand, and nested detail.** No rule covers an expanding table row or nested detail. Ask about the tokens for an expanding table row only when the project has no expanded-row state.
- **What the disabled state means on a cell, a header, or a footer**: a value that is unavailable, a column that cannot be sorted, or a different meaning.
- **A supported way to mark one value as missing.** The missing-value style is settled: `recursica-skill-tables` sets the literal text `NA`, in italics, in neutral 500. In the standard UI kit, a cell's disabled state applies to the whole cell. A component that shows only the value cannot change the cell around the value. If the project has a way to apply the missing-value style, use that way. Otherwise, take the color from the neutral palette token. Do not use the cell's disabled color, which is a different value.
- **The empty state**, and the difference between "no records yet" and "no results for these filters". `recursica-skill-design-router` lists the empty state as a topic that no skill owns.
- **Loading.** See `recursica-skill-loader`.
- **Behavior below desktop size.** `recursica-skill-design-router` lists behavior below desktop size as a topic that no skill owns.

## Pre-flight checklist

- [ ] The records are table data, not a few items where each item has a graphic, such as a chart or an image.
- [ ] The table is a real table with real header cells connected to the header cells' columns, and the table has an accessible name.
- [ ] The table has no horizontal scrolling area. Columns were cut to make the table fit.
- [ ] Null cells show `NA` in the style `recursica-skill-tables` sets: italics, neutral 500, and the same text in every column. No cell is empty, and no zero stands in for a missing value.
- [ ] A deliberate default sort is set. The sorted column shows the sort indicator even when the sort is fixed, and the sort state is announced on the column header, not only styled.
- [ ] Sorting by more than one column has a keyboard equivalent. The column-visibility gear can be reached by keyboard, and columns can be reordered without dragging.
- [ ] Each row checkbox names the checkbox's table row. The select-all checkbox has a name and makes the indeterminate state available to assistive technology.
- [ ] Currency uses the `currency-style` token. The currency format, right-aligned with the symbol in the column header and two decimals, comes from `recursica-skill-dates-and-currency` and `recursica-skill-tables`, not from this skill.
- [ ] Totals sit in the footer row.
- [ ] A clickable table row is a single real control, and the only control in that table row.
- [ ] Inline editing can be started and left from the keyboard, and inline editing is on everywhere in the application or nowhere.
- [ ] Every repeated row action names the object the action acts on, and nothing is revealed on hover.
- [ ] Every sort, filter, and page change announces the result.
- [ ] The table has no invented density variant, selected-row state, or hover state.
- [ ] No styling is set or overridden on the table, the header row, the body cells or the footer row, and no container or spacer is added to change the table's look.
- [ ] No cell's value is wrapped in a text component. Every column of the table shows in the same typeface, size, and weight, checked by comparing the columns on screen, not by reading the markup.
- [ ] A column that was too wide is fixed with a width set by data type, not with the cell's `max-width` token.
- [ ] Open questions were asked about, not decided: how a selected table row looks, row hover, table rows that expand and nested detail, the meaning of the disabled state on a cell, a supported way to mark a missing value, the empty state, loading, and behavior below desktop size.
