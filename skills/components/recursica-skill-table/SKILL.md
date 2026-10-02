---
name: recursica-skill-table
description: Rules for the Recursica table component — the table, cell, header, and footer, sorting, cell text and width, currency cells, no density option, empty cells, footer totals, and data-table accessibility including row selection. Use for tables and data grids. Column, width, and pagination policy lives in recursica-skill-tables.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Table

A table shows many copies of one object, so the reader can compare values down a column.

> **Token styling works in Mantine only.** The MUI adapter's `Table.module.css` refers to none of
> the 101 variables the UI kit (the token file, `recursica_ui-kit.json`, that says which variants and states each component has) exports across `table`, `table-cell`, `table-header`, and `table-footer`,
> while the Mantine adapter applies all of them. On MUI, the table renders, but none of its spacing,
> type, or color comes from the design system, and no error appears. Everything below describes
> the UI kit accurately.

## When to use a table

- **The plurality (the number of items) is high, has no fixed end, or is growing.** This is the default for repeating records, with no exception.
- **The content is only data** — text, numbers, dates, currency, status.
- **The reader compares values across records**, which a column makes possible and a set of cards does not.
- **Sorting, filtering, or selecting rows is part of the work.**

## When not to use a table

| Instead of a table                                          | Use                                                |
| ----------------------------------------------------------- | -------------------------------------------------- |
| A small, finite set where each item has a chart or an image | `recursica-skill-card`                             |
| One object's properties                                     | A detail view or a form                            |
| A list of names that are all alike, with no attributes      | A list                                             |
| The data has a parent-child hierarchy                       | `recursica-skill-tree`                             |
| Laying out a page                                           | Layout. A table is for data, never for positioning |

**A table too wide for the screen is a problem with the structure, not a scrolling problem.** Use fewer columns, drill-down, or stacked text in the cells. Use horizontal scrolling only as a last resort. `recursica-skill-tables` owns that rule.

## Variants

Taken from `recursica_ui-kit.json` → `ui-kit.components.table`, `table-cell`, `table-header`, `table-footer`. **The table itself has no variant axes (the properties a component varies on, such as size and style; Figma calls them variant properties).** The three sub-specs each have one.

| Spec           | Axis     | Options    |
| -------------- | -------- | ---------- |
| `table`        | —        | no axes    |
| `table-cell`   | `states` | `disabled` |
| `table-header` | `states` | `disabled` |
| `table-footer` | `states` | `disabled` |

**Spec ownership:** `table` owns the outer frame, the row and column dividers, the row padding, the colors, and the transparencies. `table-header` is the row of column headers. `table-cell` is a body cell. `table-footer` is the row of totals.

**Sorting is built into the header.** `table-header` defines a `sorted-text-style` and an `unsorted-text-style`, a `label-sort-gap`, and an `icon-size`. The component draws the sort indicator and both type styles. Do not add them separately.

**Currency has its own style.** Both `table-cell` and `table-footer` define a `currency-style`, separate from their normal `text-style`. Use it for currency, and follow `recursica-skill-dates-and-currency` for alignment and precision.

**There is no density axis** — no compact, comfortable, or spacious. Cell padding comes from `globals.table.cell` and the component's own padding properties. This matches the house rule against density variants.

**`table-cell` defines a `max-width`, and on its own it does not limit anything.** A maximum width on a table cell is only a suggestion to the browser's automatic table layout, which sizes columns from their content and often goes past it — a 200px maximum measured 257px in a real table. **Do not use the token to fix a column that is too wide.** Set a column's width by its data type, as `recursica-skill-tables` describes. The browser applies a width set that way, and largely ignores `max-width`.

**There is no selected-row state, no hover-row state, and no expanded-row state** in the UI kit. Do not invent one. See the open questions.

**Only `disabled` exists on cells, headers, and footers.** There is no error state on a cell.

## Rules

**Null is `NA` — never an empty cell, and never `0`.** An empty cell looks like something was forgotten, and a zero looks like a real value. **This rule is owned by `recursica-skill-tables`**, which sets the text, the italics, and the neutral-500 color, and it is extended to every surface by `recursica-skill-system-conventions`. It is repeated here only because it has an effect on accessibility. Read the owning skill for the rule itself. Where that skill differs from this line, follow that skill.

**Every table has a default sort, and the sorted column always shows its indicator** — including when the sort cannot be changed. The header component provides `sorted-text-style` and the sort icon. Make sure one column shows them. A table whose order cannot be seen makes the reader guess. Owned by `recursica-skill-tables`.

**A click on a header flips the sort direction.** Sorting by more than one column is a long-press — an unadvertised affordance (a control that works but is not shown in the main interface, such as a keyboard shortcut). Multi-sort also needs a keyboard equivalent, described in the accessibility section.

**Currency is right-aligned, has two decimal places on every value, and puts its symbol in the column header** instead of repeating it in every cell. None of this is owned here. `recursica-skill-dates-and-currency` owns the format — right alignment, a fixed precision of two decimals, and the symbol in the header — and `recursica-skill-tables` owns column alignment by data type. Read those skills rather than this summary. Where they differ from it, follow them. This file adds only the token that carries the format: the `currency-style` on `table-cell` and `table-footer`.

**MUST NOT wrap a cell's value in a text component.** A cell already has `table-cell`'s `text-style` — font family, size, weight, spacing — and a text component brings its own. Putting one inside a cell replaces the type the table owns with the type that component owns, which is the override the `Set by the component` list below forbids. Put the value in the cell directly.

**This is by far the most common way a table's type goes wrong.** It is stated apart from the token list because, in code, it does not look like an override. A cell reading `<Text>{value}</Text>` looks like careful markup, but it replaces the table's type. It shows one column in a different typeface from every other column in the same table — the brand's secondary typeface where the UI kit asked for the primary. The difference is visible on screen and invisible in a code diff.

**The test is comparing columns, not reading the code.** Every column of one table shows in one typeface, one size, and one weight. If one column is different, look for a component wrapped around that column's value.

**Where a cell needs a second, less prominent line**, that is the approved stack of two values in `recursica-skill-tables` — and only the secondary line gets a different style. The primary value keeps the cell's own.

**Totals go in the footer**, using the footer's currency style.

**A row can be clicked only if nothing else in it can.** If the row has a link, a button, or a checkbox, the row itself is not a click target.

**Inline editing is either on everywhere in the application, or nowhere.** One behavioral mode per system — see `recursica-skill-system-conventions`.

**Do not put a card in a cell, and do not wrap the table in a card.**

**At most one frozen column** (a column that stays in place while the rest scroll horizontally). Owned by `recursica-skill-tables`.

## Accessibility

This component also follows the accessibility baseline in `recursica-skill-system-conventions`. Only what is specific to it is listed here.

**A data table can be used without sight only if it is built as a real table.** A grid of `div`s gives a screen reader user no way to know which column a value belongs to, and that link between value and column is the whole content of a table.

### Screen readers

- **It must be a real table, with real header cells**, each connected to its column. A cell's meaning is its column header; without that connection, the value is a number with no name.
- **The table needs an accessible name** (the name a screen reader reads out for a control) that says what these records are. A page with three tables and no names cannot be navigated.
- **The sort state must be announced on the header**: which column is sorted, in which direction, and that the header is the control that changes it. The `sorted-text-style` is only the visual channel (color, shape, position or text, each a separate signal).
- **A row's selection checkbox needs a name that identifies its row** — "Select invoice 1043", not five identical "Select" controls. The header's select-all checkbox needs its own name, and its indeterminate state (the partly selected state, shown as a dash, when some but not all items are selected) must be made available.
- **`NA` must be actual text in the cell.** This is the accessibility reason for the rule, not only a visual one: an empty cell is announced as nothing.
- **Any repeated row action must name its object**, or the row must supply that context in code.
- **A fixed header must still be the table's header row**, not a separate visual element floating above a table with no header.
- **Never let a cell's meaning depend on color or an icon alone** — a status cell needs its text.
- **Announce the result of a sort, a filter, or a page change** — how many rows there are now, or that the order changed. A silent redraw leaves the user believing nothing happened.

### Keyboard and non-mouse navigation

- **Everything interactive in the table can be reached in visual order**: header sort controls, row checkboxes, links, and row actions.
- **Sorting by more than one column with a long-press must have a keyboard equivalent.** `recursica-skill-system-conventions` requires a second way wherever the interaction is a drag or a long-press. A press-and-hold cannot be reached by keyboard, so multi-sort needs an explicit control or a modifier key.
- **The column-visibility gear is an unadvertised affordance — and unadvertised does not mean inaccessible.** It must be a real control that can be reached by keyboard, and reordering columns must work without dragging.
- **A clickable row must be a single, real control** with an accessible name — not a click handler on a `tr`. If that is awkward, make a link in one cell the target instead, which is usually the better answer.
- **Inline editing must be possible to enter and leave from the keyboard**, with Escape abandoning the edit and focus landing back on the cell.
- **Nothing may be revealed on hover.** Row actions that appear on hover cannot be reached by keyboard or by touch.
- **No horizontal scrolling area.** Beyond the house rule, a table that scrolls horizontally is close to unusable for a keyboard user, who has no way to bring a column that is off screen into view except by tabbing blindly.
- **Focus must be visible on every control in the table**, and never hidden on a focused row or cell.

## Styling set by tokens

Do not set or override any of these. The component sets them:

- `padding`, `row-padding`, `border-size`, `border-radius`, `colors`, `opacities`.
- `row-divider-size` and `column-divider-size`, plus the header's and footer's own divider sizes.
- Cell `padding-horizontal`, `padding-vertical`, `max-width`, `text-style`, `currency-style`, `colors`.
  **`text-style` is most often overridden by a text component wrapped around the cell's value** — see
  the rule above. `max-width` is listed here because the component sets it, not because it limits the column.
  The automatic table layout largely ignores it.
- Header `label-sort-gap`, `icon-size`, `sorted-text-style`, `unsorted-text-style`, `vertical-margin`.
- Footer `text-style`, `currency-style`, `vertical-margin`.
- `globals.table.cell` horizontal and vertical padding.

## Related skills

- `recursica-skill-tables` — the owning design-rules skill: table vs. cards, column widths and alignment, truncation vs. wrapping, two-value cells, pagination vs. infinite scroll, fixed header and footer, default sort, multi-sort, column visibility, frozen columns, clickable rows, inline editing, totals.
- `recursica-skill-dates-and-currency` — currency alignment and precision, date format, and the symbol in the column header.
- `recursica-skill-system-conventions` — one behavioral mode per system, the unadvertised affordance and its keyboard requirement, never carry meaning in a single channel.
- `recursica-skill-live-regions` — announcing a row count or result count that changes when the table is filtered, sorted or refreshed.
- `recursica-skill-filters` — narrowing the table: the filter bar, search, date ranges, noun labels, and showing which filters are applied.

### Only if used on the same screen

- `recursica-skill-card` — the boundary: when a repeating set is cards instead.
- `recursica-skill-pagination` — the footer control for paging.
- `recursica-skill-checkbox` — row selection and the header's select-all, including the indeterminate state.

## Open questions

- **How a selected row looks.** The design rules require row selection, but no selected state exists in the UI kit.
- **Row hover.** No hover state is defined, yet a clickable row needs an affordance.
- **Rows that expand, and nested detail.** No tokens, and no rule.
- **What `disabled` means on a cell, a header, or a footer** — a value that is unavailable, a column that cannot be sorted, or something else.
- **A supported way to mark one value as missing.** The style itself is settled — `recursica-skill-tables` sets the literal text `NA`, in italics, in neutral 500 — but the UI kit offers no way to apply it. `disabled` is the one state a cell has, it applies to the whole cell, and a component that renders only the value has no access to the cell around it. Until a way exists, take the color from the neutral palette token. Do not use the cell's disabled color, which is a different value.
- **The empty state**, and the difference between "no records yet" and "no results for these filters". Named as having no owner in `recursica-skill-design-router`.
- **Loading.** No skeleton or determinate loader exists; see `recursica-skill-loader`.
- **Behavior below desktop size.** Named as having no owner in `recursica-skill-design-router`.

## Pre-flight checklist

- [ ] The set is table data, not a small set where each item has a graphic.
- [ ] It is a real table with real header cells connected to their columns, and it has an accessible name.
- [ ] The table has no horizontal scrolling area. Columns were cut to make it fit.
- [ ] Null cells show `NA` in the style `recursica-skill-tables` sets — italics, neutral 500, and the same text in every column. There are no empty cells and no misleading zeros.
- [ ] A deliberate default sort is set. The sorted column shows its indicator even when the sort is fixed, and the sort state is announced on the header, not only styled.
- [ ] Multi-sort has a keyboard way to use it. The column-visibility gear can be reached by keyboard, and columns can be reordered without dragging.
- [ ] Row checkboxes name their row, and the select-all checkbox is named and makes its indeterminate state available.
- [ ] Currency uses the `currency-style` token, and its format — right-aligned, with the symbol in the header and two decimals — comes from `recursica-skill-dates-and-currency` and `recursica-skill-tables`, not from this file.
- [ ] Totals sit in the footer.
- [ ] A clickable row is a single real control, and the only interactive thing in that row.
- [ ] Inline editing can be entered and left from the keyboard, and matches the application's single mode.
- [ ] Repeated row actions name their object, and nothing is revealed on hover.
- [ ] Sort, filter, and page changes announce their result.
- [ ] The table has no invented density variant, selected-row state, or hover state.
- [ ] Padding, dividers, and type styling come from the component.
- [ ] No cell's value is wrapped in a text component, and every column of the table shows in the same typeface, size, and weight — checked by comparing the columns on screen, not by reading the markup.
- [ ] A column that was too wide is fixed with a width set by data type, not with the cell's `max-width` token.
- [ ] Open questions were asked about, not decided: how a selected row looks, row hover, rows that expand and nested detail, the meaning of `disabled` on a cell, a supported way to mark a missing value, the empty state, loading, and behavior below desktop size.
