---
name: recursica-skill-table
description: How to use the Recursica table correctly — what the table, cell, header, and footer specs provide, sorting as a first-class part of the header, why a cell's value must never be wrapped in a text component, the inert cell max-width, the currency style on cells and footers, why there is no density axis and no horizontal scrolling, null cells, totals in the footer, and the screen-reader and keyboard requirements for a data table including sort announcement, row selection, and the keyboard alternative to long-press multi-sort. Use whenever adding, reviewing, or refactoring a table, data grid, or list of records with columns. Trigger on "table", "data grid", "column header", "sort", "row selection", "totals row", "sticky header", "cell font", "wrong typeface", "screen reader", or "tab order". Do NOT use for small repeating sets with a chart or image each — that is recursica-skill-card. Do NOT use for column choice, widths, truncation, or pagination policy — that is recursica-skill-tables.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Table

A table shows many copies of one object, so the reader can compare values down a column.

> **Token styling works in Mantine only.** The MUI adapter's `Table.module.css` refers to none of
> the 101 variables the kit exports across `table`, `table-cell`, `table-header`, and `table-footer`,
> while the Mantine adapter applies all of them. On MUI, the table shows up, but none of its spacing,
> type, or color comes from the design system — and nothing shows an error. Everything below is
> correct about the kit.

## Use it when

- **The plurality (how many of something there are) is high, has no fixed end, or is growing.** This is the default for repeating records, with no exception.
- **The content is only data** — text, numbers, dates, currency, status.
- **The reader compares values across records**, which a column makes possible and a set of cards does not.
- **Sorting, filtering, or selecting rows is part of the work.**

## Do not use it when

| Instead of a table                                          | Use                                                |
| ----------------------------------------------------------- | -------------------------------------------------- |
| A small, finite set where each item has a chart or an image | `recursica-skill-card`                             |
| One object's properties                                     | A detail view or a form                            |
| A list of names that are all alike, with no attributes      | A list                                             |
| The data has a parent-child hierarchy                       | `recursica-skill-tree`                             |
| Laying out a page                                           | Layout. A table is for data, never for positioning |

**A table too wide for the screen is a problem with the structure, not a scrolling problem.** Use fewer columns, drill-down, or stacked text in the cells. Sideways scrolling is a defeat — owned by `recursica-skill-tables`.

## What exists

Taken from `recursica_ui-kit.json` → `ui-kit.components.table`, `table-cell`, `table-header`, `table-footer`. **The table itself has no variant axes.** The three sub-specs each have one.

| Spec           | Axis     | Options    |
| -------------- | -------- | ---------- |
| `table`        | —        | no axes    |
| `table-cell`   | `states` | `disabled` |
| `table-header` | `states` | `disabled` |
| `table-footer` | `states` | `disabled` |

**Which spec owns what:** `table` owns the outer frame, the row and column dividers, the row padding, the colors, and the transparencies. `table-header` is the row of column headers. `table-cell` is a body cell. `table-footer` is the row of totals.

**Sorting is built into the header.** `table-header` defines a `sorted-text-style` and an `unsorted-text-style`, a `label-sort-gap`, and an `icon-size` — so the sort indicator and its two type styles are part of the component, not something you add.

**Currency has its own style.** Both `table-cell` and `table-footer` define a `currency-style`, separate from their normal `text-style`. Use it for currency, and follow `recursica-skill-dates-and-currency` for alignment and precision.

**There is no density axis** — no compact, comfortable, or spacious. Cell padding comes from `globals.table.cell` and the component's own padding properties. This matches the house rule against density variants.

**`table-cell` defines a `max-width`, and on its own it does not limit anything.** A maximum width on a table cell is only a suggestion to the browser's automatic table layout, which sizes columns from their content and often goes past it — a 200px maximum measured 257px in a real table. **Do not treat the token as the answer to a column that is too wide.** Column widths are set by data type in `recursica-skill-tables`, and that is the method that actually holds.

**There is no selected-row state, no hover-row state, and no expanded-row state** in the kit. Do not invent one; see the uncovered list.

**Only `disabled` exists on cells, headers, and footers.** There is no error state on a cell.

## Rules for using it

**Null is `NA` — never an empty cell, and never `0`.** An empty cell looks like something was forgotten, and a zero looks like a real value. **This rule is owned by `recursica-skill-tables`**, which sets the text, the italics, and the neutral-500 colour, and it is extended to every surface by `recursica-skill-system-conventions`. It is repeated here only because it has an effect on accessibility. Read the owning skill for the rule itself — and where it differs from this line, it is correct.

**Every table has a default sort, and the sorted column always shows its indicator** — including when the sort cannot be changed. The header component provides `sorted-text-style` and the sort icon; your job is making sure one column carries them. A table whose order cannot be seen makes the reader guess. Owned by `recursica-skill-tables`.

**A click on a header flips the sort direction.** Sorting by more than one column is a long-press — an unadvertised affordance (a control that is deliberately not promoted), which means it also needs a way to use it from the keyboard; see the accessibility section.

**Currency is right-aligned, has two decimal places on every value, and puts its symbol in the column header** instead of repeating it in every cell. **None of this is owned here.** `recursica-skill-dates-and-currency` owns the format — right alignment, a fixed precision of two decimals, and the symbol in the header — and `recursica-skill-tables` owns column alignment by data type. Read those skills rather than this summary; where they differ from it, they are correct. All this file adds is which token carries it: the `currency-style` on `table-cell` and `table-footer`.

**MUST NOT wrap a cell's value in a text component.** A cell already has `table-cell`'s `text-style` — font family, size, weight, spacing — and a text component brings its own. Putting one inside a cell replaces the type the table owns with the type that component owns, which is the override the `Not your decision` list below forbids. **Put the value in the cell directly.**

**This is by far the most common way a table's type goes wrong**, and it is worth stating apart from the token list, because it does not look like an override while you are writing it. A cell reading `<Text>{value}</Text>` looks like careful markup, and it is the opposite. What it produces is one column in a different typeface from every other column in the same table — the brand's secondary typeface where the kit asked for the primary. Anyone looking at the screen can see the difference, while it stays invisible in the code changes.

**The test is comparing columns, not reading the code.** Every column of one table shows in one typeface, one size, and one weight. If one column is different, look for a component wrapped around that column's value.

**Where a cell really needs a second, quieter line**, that is the approved stack of two values in `recursica-skill-tables` — and only the secondary line gets a different style. The primary value keeps the cell's own.

**Totals go in the footer**, using the footer's currency style.

**A row can be clicked only if nothing else in it can.** If the row has a link, a button, or a checkbox, the row itself is not a click target.

**Inline editing is either on everywhere in the application, or nowhere.** One behavioral mode per system — see `recursica-skill-system-conventions`.

**Do not put a card in a cell, and do not wrap the table in a card.**

**At most one frozen column** (a column that stays in place while the rest scroll sideways). Owned by `recursica-skill-tables`.

## Accessibility

This component also follows the accessibility baseline in `recursica-skill-system-conventions`. Only what is specific to it is listed here.

A data table can only be used without sight if its structure is real. The failures here are serious: a grid of `div`s gives a screen reader (software that reads the screen aloud) user no way to know which column a value belongs to — and that is the whole content of a table.

### Screen readers

- **It must be a real table, with real header cells**, each connected to its column. A cell's meaning is its column header; without that connection, the value is a number with no name.
- **The table needs an accessible name** (the name a screen reader reads out for a control) — what these records are. A page with three tables and no names cannot be navigated.
- **The sort state must be announced on the header**: which column is sorted, in which direction, and that the header is the control that changes it. The `sorted-text-style` is only the visual channel (a way of carrying meaning, such as color, shape, position, or text).
- **A row's selection checkbox needs a name that identifies its row** — "Select invoice 1043", not five identical "Select" controls. The header's select-all checkbox needs its own name, and its indeterminate state (the partly selected state, shown as a dash, when some but not all items are selected) must be made available.
- **`NA` must be actual text in the cell.** This is the accessibility reason for the rule, not just a visual one: an empty cell is announced as nothing.
- **Any repeated row action must name its object**, or the row must supply that context in code.
- **A fixed header must still be the table's header row**, not a separate visual element floating above a table with no header.
- **Never let a cell's meaning depend on color or an icon alone** — a status cell needs its text.
- **Announce the result of a sort, a filter, or a page change** — how many rows there are now, or that the order changed. A silent redraw leaves the user believing nothing happened.

### Keyboard and non-mouse navigation

- **Everything interactive in the table can be reached in visual order**: header sort controls, row checkboxes, links, and row actions.
- **Sorting by more than one column with a long-press must have a keyboard equivalent.** `recursica-skill-system-conventions` requires a second way wherever the interaction is a drag or a long-press. A press-and-hold cannot be reached by keyboard, so multi-sort needs an explicit control or a modifier key.
- **The column-visibility gear is an unadvertised affordance — and unadvertised does not mean inaccessible.** It must be a real control that can be reached by keyboard, and reordering columns must have a way to do it that is not dragging.
- **A clickable row must be a single, real control** with an accessible name — not a click handler on a `tr`. If that is awkward, make a link in one cell the target instead, which is usually the better answer.
- **Inline editing must be possible to enter and leave from the keyboard**, with Escape abandoning the edit and focus landing back on the cell.
- **Nothing may be revealed on hover.** Row actions that appear on hover cannot be reached by keyboard or by touch.
- **No sideways scrolling area.** Beyond the house rule, a table that scrolls sideways is close to unusable for a keyboard user, who has no way to bring a column that is off screen into view except by tabbing blindly.
- **Focus must be visible on every control in the table**, and never hidden on a focused row or cell.

## Not your decision

Do not implement, override, or tune any of these — the component owns them:

- `padding`, `row-padding`, `border-size`, `border-radius`, `colors`, `opacities`.
- `row-divider-size` and `column-divider-size`, plus the header's and footer's own divider sizes.
- Cell `padding-horizontal`, `padding-vertical`, `max-width`, `text-style`, `currency-style`, `colors`.
  **The way `text-style` gets overridden in practice is a text component wrapped around the cell's value** — see
  the rule above. `max-width` is listed here because it is not yours to set, not because it works; the automatic
  table layout largely ignores it.
- Header `label-sort-gap`, `icon-size`, `sorted-text-style`, `unsorted-text-style`, `vertical-margin`.
- Footer `text-style`, `currency-style`, `vertical-margin`.
- `globals.table.cell` horizontal and vertical padding.

## Load these too

- `recursica-skill-tables` — the owning design-rules skill: table vs. cards, column widths and alignment, truncation vs. wrapping, two-value cells, pagination vs. infinite scroll, fixed header and footer, default sort, multi-sort, column visibility, frozen columns, clickable rows, inline editing, totals.
- `recursica-skill-dates-and-currency` — currency alignment and precision, date format, and the symbol in the column header.
- `recursica-skill-system-conventions` — one behavioral mode per system, the unadvertised affordance and its keyboard requirement, never carry meaning in a single channel.

### Only if the screen also uses it

- `recursica-skill-card` — the boundary: when a repeating set is cards instead.
- `recursica-skill-pagination` — the footer control for paging.
- `recursica-skill-checkbox` — row selection and the header's select-all, including the indeterminate state.

## Uncovered — ask, do not invent

- **How a selected row looks.** The design rules require row selection, but no selected state exists in the kit.
- **Row hover.** No hover state is defined, yet a clickable row needs an affordance.
- **Rows that expand, and nested detail.** No tokens, and no rule.
- **What `disabled` means on a cell, a header, or a footer** — a value that is unavailable, a column that cannot be sorted, or something else.
- **A supported way to mark one value as missing.** The style itself is settled — `recursica-skill-tables` sets the literal text `NA`, in italics, in neutral 500 — but the kit offers no way to apply it. `disabled` is the one state a cell has, it applies to the whole cell, and something that draws only the value cannot reach the cell it will land in. Until a way exists, read the neutral palette token. Do not reach for the cell's disabled colour, which is a different value.
- **The empty state**, and the difference between "no records yet" and "no results for these filters". Named as having no owner in `recursica-skill-design-router`.
- **Loading.** No skeleton or determinate loader exists; see `recursica-skill-loader`.
- **Behavior below desktop size.** Named as having no owner in `recursica-skill-design-router`.

## Pre-flight checklist

- [ ] The set really is table data, not a small set where each item has a graphic.
- [ ] It is a real table with real header cells connected to their columns, and it has an accessible name.
- [ ] There is no sideways scrolling area; you reduced the number of columns instead.
- [ ] Null cells show `NA` in the style `recursica-skill-tables` sets — italics, neutral 500, and the same text in every column. There are no empty cells and no misleading zeros.
- [ ] A deliberate default sort is set. The sorted column shows its indicator even when the sort is fixed, and the sort state is announced on the header, not only styled.
- [ ] Multi-sort has a keyboard way to use it. The column-visibility gear can be reached by keyboard, and reordering has a way to do it that is not dragging.
- [ ] Row checkboxes name their row, and the select-all checkbox is named and makes its indeterminate state available.
- [ ] Currency uses the `currency-style` token, and its format — right-aligned, with the symbol in the header and two decimals — comes from `recursica-skill-dates-and-currency` and `recursica-skill-tables`, not from this file.
- [ ] Totals sit in the footer.
- [ ] A clickable row is a single real control, and the only interactive thing in that row.
- [ ] Inline editing can be entered and left from the keyboard, and matches the application's single mode.
- [ ] Repeated row actions name their object, and nothing is revealed on hover.
- [ ] Sort, filter, and page changes announce their result.
- [ ] You invented no density variant, selected-row state, or hover state.
- [ ] You overrode no padding, divider, or type styling that the component owns.
- [ ] No cell's value is wrapped in a text component, and every column of the table shows in the same typeface, size, and weight — checked by comparing the columns on screen, not by reading the markup.
- [ ] You fixed any column that was too wide with a width set by data type, not by relying on the cell's `max-width` token.
- [ ] You invented nothing from the uncovered list.
