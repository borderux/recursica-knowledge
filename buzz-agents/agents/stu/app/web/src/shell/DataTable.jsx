// One table implementation for the whole app, because `recursica-skill-tables` requires the
// behaviour to be consistent across it: if tables sort, they all sort; if rows navigate, they all
// navigate the same way.
//
// The three rules it exists to make unbreakable:
//   1. **Every table is sorted and the sorted column is visibly indicated** — including tables
//      whose order cannot be changed. A fixed order is still an order and the reader is entitled
//      to know which column produced it, in which direction.
//   2. **One click target per row.** Two competing targets means the user cannot predict what a
//      click does. `recursica-skill-tables` names two correct modes and says to pick one and use
//      it in every table in the application; this one is the identifying value carrying a real
//      link, so the row itself is never interactive.
//   3. **Every table has an accessible name.** It is a required prop rather than an optional one
//      — `recursica-skill-table`: "A page with three tables and no names is unnavigable", and
//      History is a page with two.
//
// It never scrolls horizontally. `recursica-skill-tables` says there is no exception to that, so
// a table that would need it is a table with too many columns.
//
// **There is deliberately no `rowHref`.** The row used to navigate through `role="link"` plus an
// `onClick`, with no anchor anywhere — so Cmd/Ctrl/Shift-click navigated in place, middle-click
// did nothing, and there was no "copy link address". `recursica-skill-buttons-links` is a
// design-rules skill and its rule is absolute — "Links MUST render a real `href`" — so it outranks
// the tables skill's *permission* for whole-row navigation. The prop is gone rather than fixed,
// because a prop that spells "the whole row navigates" has no correct implementation here.

import { Fragment, useMemo, useState } from 'react'
import { Checkbox, Table, Text } from '@recursica/mantine-adapter'

/**
 * Column widths by data type.
 *
 * `recursica-skill-tables`: "Set widths by data type, so that truncation is rarely needed —
 * dates, currency, and statuses are narrow; sentences need room. Fixing widths per content type
 * is what keeps a table stable as data varies."
 *
 * These are the narrow types. The sentence column is deliberately given no width at all: the
 * automatic layout hands it whatever the narrow ones did not take, which is the behaviour the
 * rule wants and is stable as the viewport changes. Setting a width on the wide column instead
 * is the version that fails — it holds its size while the date column wraps around it.
 */
export const COLUMN_WIDTH = {
  /** The selection column. Owned by `DataTable`, never declared by a caller. */
  select: '3.5rem',
  count: '6rem',
  /** A part-of-whole count — `11 / 34`. Two grouped numbers and a separator, so wider than one. */
  ratio: '8rem',
  date: '8rem',
  status: '8rem',
  /** A short categorical value — a cohort, a role, a type. */
  term: '13rem',
}

/**
 * @param columns  `[{ key, header, sortValue, render, width }]`
 *                 `sortValue(row)` opts a column into sorting. Omit it and the header is inert.
 *                 `width` is a CSS length for the column, declared in a `colgroup`.
 *                 `recursica-skill-tables` asks for widths set by data type — dates, counts and
 *                 statuses narrow, sentences given room — so that wrapping is the exception
 *                 rather than what every long value does. Without it the automatic layout
 *                 divides the table by content and the identity column, which is the one that
 *                 actually needs room, loses to six numeric columns that do not.
 * @param initialSort `{ key, direction }` — required. There is no unsorted state.
 * @param label    **Required.** The table's accessible name — what these records are, as a noun
 *                 phrase. `recursica-skill-table` requires one on every table, and the reason it
 *                 is required rather than optional is `History.jsx`, which puts two tables on one
 *                 page: with no name, a screen reader user reaches "table" twice and has no way to
 *                 tell the audit trail from the orphaned corrections. It is not rendered visibly —
 *                 every table here already sits under a heading that says the same thing, and a
 *                 caption would print it twice.
 *
 *                 Getting into a record is the identifying value's link, in every table in this
 *                 application — see the note at the top of this file. Put it in that column's
 *                 `render`.
 * @param rowLabel `(row) => string`. What one row is called, for the controls in it that a screen
 *                 reader reaches without their column. **Required once a row carries a checkbox or
 *                 a disclosure control**, because `getRowKey` is not a name: People's keys are
 *                 `p:<person_id>` and `s:<a>+<b>`, so a select checkbox named from the key
 *                 announced a synthetic string instead of the person. `recursica-skill-table`:
 *                 "Select invoice 1043", not five identical "Select" controls.
 * @param selection `{ selected: Set, onChange: (next: Set) => void }`. Opts the table into row
 *                 selection.
 *
 *                 **The checkbox column is built here and cannot be supplied by a caller.** That is
 *                 the point: `recursica-skill-selection-controls` has always required a header
 *                 checkbox beside the row checkboxes, and this app shipped without one because
 *                 every page hand-rolled its own checkbox column and there was nowhere for a header
 *                 control to live. A rule with no slot to occupy is a rule that loses. Now the only
 *                 way to get row selection is to get the header with it.
 *
 *                 Header mechanics are the skill's, exactly: indeterminate resolves to fully
 *                 checked on click and is never a state the header is clicked *into* — it is
 *                 reachable only by picking rows individually.
 *
 *                 Selection feeds bulk actions and nothing else. It is not a way to open, focus, or
 *                 edit one record — see `recursica-skill-tables`.
 * @param expandable `{ render: (row) => node, canExpand?: (row) => bool }`. Gives each row a
 *                 disclosure control that reveals sub-detail in place. What the control is named
 *                 after comes from `rowLabel`, which the checkbox column uses too — one answer to
 *                 "what is this row called" rather than two that can disagree.
 *
 *                 **One level, and it does not nest.** `recursica-skill-tables` avoids grouped rows
 *                 and asks for a single expand/collapse on the row instead, so what is revealed
 *                 must not itself be expandable.
 *
 *                 This is how a record shows what it is made of without a second screen — and, for
 *                 a row awaiting a decision, how the reader inspects the proposal before approving
 *                 and inspects the result afterwards. The skill requires the same affordance to
 *                 survive approval, with the undo inside it, because approval is the moment the
 *                 reader most needs to check what happened.
 */
export function DataTable({
  columns, rows, initialSort, label, rowLabel, getRowKey, emptyMessage, selection, expandable,
}) {
  const [sort, setSort] = useState(initialSort)
  const [expanded, setExpanded] = useState(() => new Set())

  // Both names are decided by props rather than by data, so these either throw on the first render
  // of a route or they never can. Same shape as the mutually-exclusive checks this replaced: the
  // point of putting them here is that a table cannot reach a reader unnamed.
  if (!label) {
    throw new Error('DataTable: `label` is required — every table needs an accessible name.')
  }
  if ((selection || expandable) && !rowLabel) {
    throw new Error(
      'DataTable: `rowLabel` is required once a row carries a checkbox or a disclosure control — '
      + 'those controls are named after the row, and `getRowKey` is a key, not a name.',
    )
  }

  const sorted = useMemo(() => {
    const column = columns.find((c) => c.key === sort.key)
    if (!column?.sortValue) return rows
    const factor = sort.direction === 'asc' ? 1 : -1
    return [...rows].sort((a, b) => {
      const x = column.sortValue(a)
      const y = column.sortValue(b)
      if (x == null && y == null) return 0
      if (x == null) return 1   // nulls last in both directions: absence is not a small value
      if (y == null) return -1
      if (typeof x === 'string' || typeof y === 'string') {
        return String(x).localeCompare(String(y)) * factor
      }
      return (x < y ? -1 : x > y ? 1 : 0) * factor
    })
  }, [rows, columns, sort])

  if (!rows.length) return <Text variant="body-small">{emptyMessage}</Text>

  function toggle(column) {
    if (!column.sortValue) return
    setSort((current) => current.key === column.key
      ? { key: column.key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
      : { key: column.key, direction: 'asc' })
  }

  const keys = rows.map(getRowKey)
  const selectedHere = selection ? keys.filter((k) => selection.selected.has(k)) : []
  const allSelected = selection && keys.length > 0 && selectedHere.length === keys.length
  // Only ever reached by selecting rows one at a time, never by clicking the header.
  const someSelected = selection && selectedHere.length > 0 && !allSelected

  function toggleRow(key) {
    const next = new Set(selection.selected)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    selection.onChange(next)
  }

  /**
   * Fully checked → cleared. Everything else, **including indeterminate → fully checked.** The
   * skill is explicit that indeterminate never resolves to unchecked.
   */
  function toggleAll() {
    const next = new Set(selection.selected)
    if (allSelected) keys.forEach((k) => next.delete(k))
    else keys.forEach((k) => next.add(k))
    selection.onChange(next)
  }

  function toggleExpanded(key) {
    setExpanded((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  // The selection column is prepended here, so a caller cannot ship rows of checkboxes with no
  // header control. `recursica-skill-badges-chips` also reserves column one for exactly this.
  const withSelect = selection
    ? [{
      key: '__select',
      width: COLUMN_WIDTH.select,
      header: (
        <Checkbox
          aria-label={allSelected ? 'Deselect all rows' : 'Select all rows'}
          checked={allSelected}
          indeterminate={someSelected}
          onChange={toggleAll}
        />
      ),
      render: (row) => (
        <Checkbox
          // Named for a screen reader but not on screen: the row's identity is in the next cell,
          // and repeating it visibly turns the column into noise. Named from `rowLabel` and never
          // from `getRowKey` — a key is not a name.
          aria-label={`Select ${rowLabel(row)}`}
          checked={selection.selected.has(getRowKey(row))}
          onChange={() => toggleRow(getRowKey(row))}
        />
      ),
    }, ...columns]
    : columns

  /**
   * The disclosure column, appended last.
   *
   * `recursica-skill-tables` allows **one level** of expand/collapse for a row's sub-detail and
   * rejects grouped rows, so this is deliberately not nestable: a row is open or shut, and what it
   * reveals cannot itself expand.
   *
   * It sits at the end rather than the start because the left edge is the strongest scan position
   * and belongs to selection and identity. A control the reader uses occasionally does not outrank
   * the value they came to read.
   */
  const allColumns = expandable
    ? [...withSelect, {
      key: '__expand',
      width: COLUMN_WIDTH.select,
      header: '',
      render: (row) => {
        const key = getRowKey(row)
        if (!expandable.canExpand?.(row) && expandable.canExpand) return null
        const open = expanded.has(key)
        return (
          <button
            type="button"
            className="stu-disclose"
            aria-expanded={open}
            aria-controls={`stu-detail-${key}`}
            // Named for what it reveals, because the icon alone is a direction and not a subject.
            aria-label={`${open ? 'Hide' : 'Show'} what makes up ${rowLabel(row)}`}
            onClick={() => toggleExpanded(key)}
          >
            <span aria-hidden="true">{open ? '▾' : '▸'}</span>
          </button>
        )
      },
    }]
    : withSelect

  return (
    // `aria-label` is not in the adapter's BLOCKED_STYLING_KEYS, so it survives `filterStylingProps`
    // and lands on the real `<table>`. Not a `Table.Caption`: the caption would repeat the section
    // heading directly above it on every one of these tables.
    <Table aria-label={label}>
      {/* Plain HTML, not a Recursica element — the adapter filters styling props off its own
          components, and a column width is neither a style it owns nor one it exposes. */}
      {allColumns.some((c) => c.width) && (
        <colgroup>
          {allColumns.map((c) => <col key={c.key} style={c.width ? { width: c.width } : undefined} />)}
        </colgroup>
      )}
      <Table.Thead>
        <Table.Tr>
          {allColumns.map((c) => {
            const active = sort.key === c.key
            return (
              <Table.Th
                key={c.key}
                // `data-sorted` is the design system's own hook: Table.module.css styles
                // `th[data-sorted="true"]` with the kit's sorted cell colour and text style, and
                // everything else with the unsorted pair. There is no prop for it and it appears
                // in no doc — it is only visible by reading the CSS module. Setting it here is
                // what makes the sorted column look sorted in Recursica's terms rather than mine.
                data-sorted={active ? 'true' : 'false'}
                aria-sort={active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : undefined}
              >
                {c.sortValue ? (
                  <button type="button" className="stu-sort" onClick={() => toggle(c)}>
                    {c.header}
                    {/* Direction is ours to draw. The kit sizes a sort icon through a
                        `.sortIcon` class, but that class is hash-scoped to the component's own
                        CSS module, so nothing outside the package can apply it. A text arrow
                        also carries the direction without relying on colour or weight. */}
                    <span aria-hidden="true" className="stu-sort__mark">
                      {active ? (sort.direction === 'asc' ? '▲' : '▼') : ''}
                    </span>
                  </button>
                ) : c.header}
              </Table.Th>
            )
          })}
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {sorted.map((row) => {
          const key = getRowKey(row)
          const open = expandable && expanded.has(key)
          return (
            <Fragment key={key}>
            {/* The row carries no role, no tabIndex and no click handler. Whatever is interactive
                in it is a real control in a cell — see the note at the top of this file. */}
            <Table.Tr>
              {allColumns.map((c) => (
                // Every cell's content goes in the same plain wrapper, which carries no type
                // and no colour of its own — the cell already has both. It is here so that
                // wrapping behaves the same in every column, per `recursica-skill-tables`:
                // prefer a second line to truncating. See `.stu-cell`.
                <Table.Td key={c.key}>
                  <span className="stu-cell">{c.render(row)}</span>
                </Table.Td>
              ))}
            </Table.Tr>
            {/* The detail sits in its own row spanning every column, which is what keeps it aligned
                under the row it belongs to. `recursica-skill-tables` rejects grouped rows and asks
                for one level of expansion instead, so nothing in here expands again. */}
            {open && (
              <Table.Tr>
                <Table.Td colSpan={allColumns.length} id={`stu-detail-${key}`}>
                  <div className="stu-detail-row">{expandable.render(row)}</div>
                </Table.Td>
              </Table.Tr>
            )}
            </Fragment>
          )
        })}
      </Table.Tbody>
    </Table>
  )
}

/**
 * A value that is absent. `recursica-skill-tables`: never let a null read as a value — a `0`
 * because the fetch failed is a different claim from "none" — and it must be text, not an empty
 * cell, because an empty cell is announced as nothing.
 *
 * **The text is always `NA`, and it takes no arguments on purpose.** It used to accept per-column
 * copy — "Not recorded", "No name", "You cleared the correction" — which read as a value rather
 * than as the absence of one, and gave the same fact five spellings down a table. One string is
 * the rule.
 *
 * Italic and neutral 500, both set by the owner on 2026-08-11 and recorded in
 * `recursica-skill-tables`. Neutral 500 is deliberately **not** the cell's own
 * `text-color-disabled`, which resolves a step lighter at neutral 400 — the treatment is a stated
 * value, not a reuse of the disabled state, and that is why it is worth writing down.
 */
export function Absent() {
  return <span className="stu-cell--absent">NA</span>
}
