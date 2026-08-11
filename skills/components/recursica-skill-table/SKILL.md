---
name: recursica-skill-table
description: How to use the Recursica table correctly — what the table, cell, header, and footer specs provide, sorting as a first-class part of the header, why a cell's value must never be wrapped in a text component, the inert cell max-width, the currency style on cells and footers, why there is no density axis and no horizontal scrolling, null cells, totals in the footer, and the screen-reader and keyboard requirements for a data table including sort announcement, row selection, and the keyboard alternative to long-press multi-sort. Use whenever adding, reviewing, or refactoring a table, data grid, or list of records with columns. Trigger on "table", "data grid", "column header", "sort", "row selection", "totals row", "sticky header", "cell font", "wrong typeface", "screen reader", or "tab order". Do NOT use for small repeating sets with a chart or image each — that is recursica-skill-card. Do NOT use for column choice, widths, truncation, or pagination policy — that is recursica-skill-tables.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Table

A table shows many instances of one object so the reader can compare values down a column.

## Use it when

- **Plurality is high, unbounded, or growing.** This is the default for repeating records, with no exception.
- **The content is purely data** — text, numbers, dates, currency, status.
- **The reader compares values across instances**, which is what a column makes possible and a card set does not.
- **Sorting, filtering, or row selection are part of the work.**

## Do not use it when

| Instead of a table                                           | Use                                                |
| ------------------------------------------------------------ | -------------------------------------------------- |
| A small, finite set where each instance has a chart or image | `recursica-skill-card`                             |
| One object's properties                                      | A detail view or a form                            |
| A homogeneous list of names with no attributes               | A list                                             |
| The data has a parent-child hierarchy                        | `recursica-skill-tree`                             |
| Laying out a page                                            | Layout. A table is for data, never for positioning |

**A table too wide for the screen is a structural problem, not a scrolling problem.** Fewer columns, drill-down, or stacked cell text. Horizontal scrolling is a defeat — owned by `recursica-skill-tables`.

## What exists

Taken from `recursica_ui-kit.json` → `ui-kit.components.table`, `table-cell`, `table-header`, `table-footer`. **The table itself has no variant axes.** The three sub-specs each have one.

| Spec           | Axis     | Options    |
| -------------- | -------- | ---------- |
| `table`        | —        | no axes    |
| `table-cell`   | `states` | `disabled` |
| `table-header` | `states` | `disabled` |
| `table-footer` | `states` | `disabled` |

**Which spec owns what:** `table` owns the outer frame, the row and column dividers, row padding, colors, and opacities. `table-header` is the column header row. `table-cell` is a body cell. `table-footer` is the totals row.

**Sorting is built into the header.** `table-header` defines a `sorted-text-style` and an `unsorted-text-style`, a `label-sort-gap`, and an `icon-size` — so the sort indicator and its two type treatments are part of the component, not something you add.

**Currency has its own treatment.** Both `table-cell` and `table-footer` define a `currency-style` separate from their normal `text-style`. Use it for currency and follow `recursica-skill-dates-and-currency` for alignment and precision.

**There is no density axis** — no compact, comfortable, or spacious. Cell padding comes from `globals.table.cell` and the component's own padding properties. This matches the house rule against density variants.

**`table-cell` defines a `max-width`, and it does not constrain anything on its own.** A maximum width on a table cell is advisory to the automatic table layout algorithm, which sizes columns from their content and routinely exceeds it — a 200px maximum measured 257px in a real table. **Do not treat the token as the answer to a column that is too wide.** Column widths are set per data type by `recursica-skill-tables`, and that is the mechanism that actually holds.

**There is no selected-row state, no hover-row state, and no expanded-row state** in the kit. Do not invent one; see the uncovered list.

**Only `disabled` exists on cells, headers, and footers.** There is no error state on a cell.

## Rules for using it

**Null is `NA`, never an empty cell and never `0`.** An empty cell reads as an oversight and a zero reads as a real value. **This rule is owned by `recursica-skill-tables`**, which specifies `NA` in disabled-looking text, and generalized by `recursica-skill-system-conventions`. It is restated here only because it has an accessibility consequence; read the owning skill for the rule itself, and where it differs from this line, it is correct.

**Every table has a default sort, and the sorted column always shows its indicator** — including when the sort cannot be changed. The header component provides `sorted-text-style` and the sort icon; your job is making sure one column carries them. A table whose order is invisible makes the reader guess. Owned by `recursica-skill-tables`.

**A click on a header flips the sort direction.** Multi-sort is a long-press — an unadvertised affordance, which means it also needs a keyboard path; see the accessibility section.

**Currency is right-aligned, carries two decimal places on every value, and takes its symbol in the column header** rather than repeating it in every cell. **None of this is owned here.** `recursica-skill-dates-and-currency` owns the format — right alignment, fixed two-decimal precision, the symbol in the header — and `recursica-skill-tables` owns column alignment by data type. Read those skills rather than this restatement; where they differ from it, they are correct. All this file adds is which token carries it: the `currency-style` on `table-cell` and `table-footer`.

**MUST NOT wrap a cell's value in a text component.** A cell already carries `table-cell`'s `text-style` — family, size, weight, spacing — and a text component brings its own. Putting one inside a cell replaces the type the table owns with the type that component owns, which is the override the `Not your decision` list below prohibits. **Put the value in the cell directly.**

**This is by far the most common way a table's type goes wrong**, and it is worth stating separately from the token list because it does not look like an override while you are writing it. A cell reading `<Text>{value}</Text>` looks like careful markup and is the opposite. What it produces is one column in a different typeface from every other column in the same table — the brand's secondary face where the kit asked for the primary — and the difference is legible to anyone looking at the screen while being invisible in the diff.

**The test is comparing columns, not reading the code.** Every column of one table renders in one typeface, one size, one weight. If one column differs, look for a component wrapped around that column's value.

**Where a cell genuinely needs a second, quieter line**, that is the sanctioned two-value stack in `recursica-skill-tables` — and only the secondary line takes a different treatment. The primary value keeps the cell's own.

**Totals go in the footer**, using the footer's currency style.

**A row is clickable only if nothing else in it is.** If the row carries a link, a button, or a checkbox, the row itself is not a click target.

**Inline editing is all-or-none across the application.** One behavioral mode per system — see `recursica-skill-system-conventions`.

**Do not put a card in a cell, and do not wrap the table in a card.**

**At most one frozen column.** Owned by `recursica-skill-tables`.

## Accessibility

A data table is only usable non-visually if the structure is real. The failures here are severe: a grid of `div`s gives a screen reader user no way to know which column a value belongs to, which is the entire content of a table.

### Screen readers

- **It must be a real table with real header cells**, each associated with its column. A cell's meaning is its column header; without the association the value is a number with no name.
- **The table needs an accessible name** — what these records are. A page with three tables and no names is unnavigable.
- **Sort state must be announced on the header**: which column is sorted, in which direction, and that the header is the control that changes it. The `sorted-text-style` is the visual channel only.
- **A row selection checkbox needs a name identifying its row** — "Select invoice 1043", not five identical "Select" controls. The header's select-all checkbox needs its own name, and its indeterminate state must be exposed.
- **`NA` must be actual text in the cell.** This is the accessibility reason for the rule, not just a visual one: an empty cell is announced as nothing.
- **Any repeated row action must name its object**, or the row must supply that context programmatically.
- **A fixed header must still be the table's header row**, not a separate visual element floating above an unheaded table.
- **Never carry a cell's meaning in color or an icon alone** — a status cell needs its text.
- **Announce the result of a sort, a filter, or a page change** — how many rows now, or that the order changed. A silent re-render leaves the user believing nothing happened.

### Keyboard and non-mouse navigation

- **Every interactive thing in the table is reachable in visual order**: header sort controls, row checkboxes, links, and row actions.
- **Long-press multi-sort must have a keyboard equivalent.** `recursica-skill-system-conventions` requires a second mechanism wherever the interaction is a drag or a long-press — a press-and-hold is unreachable by keyboard, so multi-sort needs an explicit control or a modifier key.
- **The column-visibility gear is an unadvertised affordance, and unadvertised is not inaccessible.** It must be a real, keyboard-reachable control, and column reordering must have a non-drag path.
- **A clickable row must be a single, real control** with an accessible name — not a click handler on a `tr`. If that is awkward, make a cell's link the target instead, which is usually the better answer.
- **Inline editing must be enterable and exitable from the keyboard**, with Escape abandoning the edit and focus landing back on the cell.
- **Nothing may be revealed on hover.** Row actions that appear on hover are unreachable by keyboard and by touch.
- **No horizontal scroll region.** Beyond the house rule, a horizontally scrolling table is close to unusable for a keyboard user, who has no way to bring an off-screen column into view except by tabbing blindly.
- **Focus must be visible on every control in the table**, and never suppressed on a focused row or cell.

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

- [`recursica-skill-tables`](../../design-rules/recursica-skill-tables/SKILL.md) — the owning design-rules skill: table vs. cards, column widths and alignment, truncation vs. wrapping, two-value cells, pagination vs. infinite scroll, fixed header and footer, default sort, multi-sort, column visibility, frozen columns, clickable rows, inline editing, totals.
- [`recursica-skill-dates-and-currency`](../../design-rules/recursica-skill-dates-and-currency/SKILL.md) — currency alignment and precision, date format, and the symbol in the column header.
- [`recursica-skill-card`](../recursica-skill-card/SKILL.md) — the boundary: when a repeating set is cards instead.
- [`recursica-skill-pagination`](../recursica-skill-pagination/SKILL.md) — the footer control for paging.
- [`recursica-skill-checkbox`](../recursica-skill-checkbox/SKILL.md) — row selection and the header's select-all, including the indeterminate state.
- [`recursica-skill-system-conventions`](../../design-rules/recursica-skill-system-conventions/SKILL.md) — one behavioral mode per system, the unadvertised affordance and its keyboard requirement, never carry meaning in a single channel.

## Uncovered — ask, do not invent

- **The selected-row treatment.** Row selection is required by the design rules but no selected state exists in the kit.
- **Row hover.** No hover state is defined, yet a clickable row needs an affordance.
- **Expandable rows and nested detail.** No tokens, no rule.
- **What `disabled` means on a cell, a header, or a footer** — an unavailable value, an unsortable column, or something else.
- **How to mark one value absent.** `recursica-skill-tables` requires `NA` in disabled-looking text, and `disabled`
  is the one state the kit gives a cell — but only as a state on the whole cell, which a renderer producing just
  the value cannot reach. There is no supported way to render one value in the cell's disabled treatment.
- **The empty state**, and the difference between "no records yet" and "no results for these filters". Named as unowned in `recursica-skill-design-router`.
- **Loading.** No skeleton or determinate loader exists; see `recursica-skill-loader`.
- **Behavior below desktop.** Named as unowned in `recursica-skill-design-router`.

## Pre-flight checklist

- [ ] The set is genuinely tabular data, not a small set with a graphic each.
- [ ] It is a real table with real header cells associated with their columns, and it has an accessible name.
- [ ] No horizontal scroll region; column count was reduced instead.
- [ ] Null cells read `NA`, per `recursica-skill-tables`; no empty cells and no misleading zeros.
- [ ] A deliberate default sort is set, the sorted column shows its indicator even when sort is fixed, and sort state is announced on the header rather than only styled.
- [ ] Multi-sort has a keyboard path; the column-visibility gear is keyboard reachable and reordering has a non-drag path.
- [ ] Row checkboxes name their row; select-all is named and exposes its indeterminate state.
- [ ] Currency uses the `currency-style` token, and its format — right-aligned, symbol in the header, two decimals — was taken from `recursica-skill-dates-and-currency` and `recursica-skill-tables`, not from this file.
- [ ] Totals sit in the footer.
- [ ] A clickable row is a single real control and the only interactive thing in that row.
- [ ] Inline editing is keyboard enterable and exitable, and matches the application's single mode.
- [ ] Repeated row actions name their object; nothing is revealed on hover.
- [ ] Sort, filter, and page changes announce their result.
- [ ] No density variant, selected-row state, or hover state was invented.
- [ ] No component-owned padding, divider, or type treatment was overridden.
- [ ] No cell's value is wrapped in a text component, and every column of the table renders in the same typeface,
      size, and weight — verified by comparing columns on screen, not by reading the markup.
- [ ] A too-wide column was solved with a width by data type, not by relying on the cell's `max-width` token.
- [ ] Nothing in the uncovered list was invented.
