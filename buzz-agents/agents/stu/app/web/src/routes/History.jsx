// The audit trail: every human change, what it was before, what it is now, and who made it.
//
// Also the place orphaned corrections surface. An edit whose line was re-parsed away is still
// safe — it lives in `line_edits`, which no agent writes — but it is attached to nothing, so
// without this list nobody would ever see it again.

import { useEffect, useState } from 'react'
import { Text } from '@recursica/mantine-adapter'
import { api } from '../api.js'
import { formatWhen } from '../format.js'
import { Page, Section } from '../shell/Page.jsx'
import { Absent, DataTable } from '../shell/DataTable.jsx'

export function History({ revision }) {
  const [rows, setRows] = useState(null)
  const [orphans, setOrphans] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.edits({ limit: 500 }).then(setRows).catch((e) => setError(e.message))
    api.orphanedEdits().then(setOrphans).catch(() => setOrphans([]))
  }, [revision])

  if (error) return <Page title="History"><Text>{error}</Text></Page>
  if (!rows || !orphans) return null

  const columns = [
    {
      key: 'edited_at',
      header: 'When',
      sortValue: (r) => r.edited_at?.value ?? r.edited_at,
      render: (r) => <Stamp value={r.edited_at} />,
    },
    {
      key: 'who',
      header: 'Who',
      sortValue: (r) => r.editor_email ?? r.editor_pubkey,
      render: (r) => r.editor_email ?? `${r.editor_pubkey.slice(0, 12)}…`,
    },
    { key: 'table', header: 'What', sortValue: (r) => r.target_table, render: (r) => r.target_table },
    { key: 'field', header: 'Field', sortValue: (r) => r.field, render: (r) => r.field },
    { key: 'action', header: 'Change', sortValue: (r) => r.action, render: (r) => r.action },
    {
      key: 'from',
      header: 'From',
      sortValue: (r) => r.old_value ?? '',
      render: (r) => r.old_value ?? <Absent />,
    },
    {
      key: 'to',
      header: 'To',
      sortValue: (r) => r.new_value ?? '',
      render: (r) => r.new_value ?? <Absent />,
    },
  ]

  const orphanColumns = [
    { key: 'line_id', header: 'Line', sortValue: (r) => r.line_id, render: (r) => r.line_id },
    {
      key: 'text',
      header: 'Correction',
      sortValue: (r) => r.cleaned_text ?? '',
      render: (r) => r.cleaned_text ?? <Absent />,
    },
    {
      key: 'was',
      // Renamed from `Line`, which is what the id column beside it is called — two columns under
      // one heading in one table. No rule requires distinct headers and the reviewer withdrew it as
      // a finding; it is changed because it is confusing, which is reason enough. `Source text` is
      // what this value is called everywhere else in the app.
      header: 'Source text',
      sortValue: (r) => r.original_text_at_edit ?? '',
      // `?? <Absent />`, like both siblings above. The column is nullable — the schema declares it
      // with no NOT NULL — and the `sortValue` one line up already guarded it, which is the tell
      // that the render was the half that got missed. Without it a null is an empty cell, and
      // `recursica-skill-tables` makes that an accessibility failure rather than a cosmetic one: an
      // empty cell is announced as nothing at all.
      render: (r) => r.original_text_at_edit ?? <Absent />,
    },
    {
      key: 'edited_at',
      header: 'When',
      sortValue: (r) => r.edited_at?.value ?? r.edited_at,
      render: (r) => <Stamp value={r.edited_at} />,
    },
  ]

  return (
    <Page title="History">
      {orphans.length > 0 && (
        <Section title="Corrections with no line">
          <DataTable
            // Two tables on one page is exactly the case `recursica-skill-table` names: without
            // names a screen reader user reaches "table" twice and cannot tell them apart.
            label="Corrections with no line"
            columns={orphanColumns}
            rows={orphans}
            initialSort={{ key: 'edited_at', direction: 'desc' }}
            getRowKey={(r) => r.line_id}
            emptyMessage="None."
          />
        </Section>
      )}

      <Section title="Changes">
        <DataTable
          label="Changes"
          columns={columns}
          rows={rows}
          initialSort={{ key: 'edited_at', direction: 'desc' }}
          getRowKey={(r) => r.edit_id}
          emptyMessage="Nobody has changed anything in this channel yet."
        />
      </Section>
    </Page>
  )
}

// An edit's timestamp, in the reader's own zone: relative within the last week, the absolute date
// and time beyond it. This is a log of recent changes, which is the case relative time exists for —
// "3 hours ago" is what the reader wanted, and the clock time made them subtract to get it. The
// one-week threshold is the owner's, recorded in `recursica-skill-dates-and-currency`.
function Stamp({ value }) {
  const text = formatWhen(value, { withTime: true })
  if (!text) return <Absent />
  return <>{text}</>
}
