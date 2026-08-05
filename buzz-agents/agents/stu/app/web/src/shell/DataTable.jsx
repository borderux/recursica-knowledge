// One table implementation for the whole app, because `recursica-skill-tables` requires the
// behaviour to be consistent across it: if tables sort, they all sort; if rows navigate, they all
// navigate the same way.
//
// The two rules it exists to make unbreakable:
//   1. **Every table is sorted and the sorted column is visibly indicated** — including tables
//      whose order cannot be changed. A fixed order is still an order and the reader is entitled
//      to know which column produced it, in which direction.
//   2. **One click target per row.** Either the whole row navigates or nothing in it does. Two
//      competing targets means the user cannot predict what a click does.
//
// It never scrolls horizontally. `recursica-skill-tables` says there is no exception to that, so
// a table that would need it is a table with too many columns.

import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { Table, Text } from '@recursica/mantine-adapter'

/**
 * @param columns  `[{ key, header, sortValue, render }]`
 *                 `sortValue(row)` opts a column into sorting. Omit it and the header is inert.
 * @param initialSort `{ key, direction }` — required. There is no unsorted state.
 * @param rowHref  `(row) => string`. Provide it and the entire row navigates; provide nothing in
 *                 the cells that also clicks.
 */
export function DataTable({ columns, rows, initialSort, rowHref, getRowKey, emptyMessage }) {
  const [sort, setSort] = useState(initialSort)
  const navigate = useNavigate()

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

  return (
    <Table>
      <Table.Thead>
        <Table.Tr>
          {columns.map((c) => {
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
          const href = rowHref?.(row)
          return (
            <Table.Tr
              key={getRowKey(row)}
              onClick={href ? () => navigate(href) : undefined}
              // A row that navigates is reachable by keyboard, or it is only navigable by mouse.
              tabIndex={href ? 0 : undefined}
              role={href ? 'link' : undefined}
              onKeyDown={href ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(href) }
              } : undefined}
            >
              {columns.map((c) => (
                <Table.Td key={c.key}>{c.render(row)}</Table.Td>
              ))}
            </Table.Tr>
          )
        })}
      </Table.Tbody>
    </Table>
  )
}

/**
 * A value that is absent, rendered so it cannot be mistaken for a real one.
 * `recursica-skill-tables`: never let a null read as a value — 0 because the fetch failed is a
 * different claim from "none".
 */
export function Absent({ children = 'None' }) {
  return <Text variant="body-small" component="span">{children}</Text>
}
