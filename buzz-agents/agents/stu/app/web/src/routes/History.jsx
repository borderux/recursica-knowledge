// The audit trail: every human change, what it was before, what it is now, and who made it.
//
// Also the place orphaned corrections surface. An edit whose line was re-parsed away is still
// safe — it lives in `line_edits`, which no agent writes — but it is attached to nothing, so
// without this list nobody would ever see it again.

import { useEffect, useState } from 'react'
import { Text } from '@recursica/mantine-adapter'
import { api } from '../api.js'
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
      render: (r) => r.old_value ?? <Absent>Nothing</Absent>,
    },
    {
      key: 'to',
      header: 'To',
      sortValue: (r) => r.new_value ?? '',
      render: (r) => r.new_value ?? <Absent>Nothing</Absent>,
    },
  ]

  const orphanColumns = [
    { key: 'line_id', header: 'Line', sortValue: (r) => r.line_id, render: (r) => r.line_id },
    {
      key: 'text',
      header: 'Your correction',
      sortValue: (r) => r.cleaned_text ?? '',
      render: (r) => r.cleaned_text ?? <Absent>You cleared the correction</Absent>,
    },
    {
      key: 'was',
      header: 'The line it was made against',
      sortValue: (r) => r.original_text_at_edit ?? '',
      render: (r) => <Text variant="body-small">{r.original_text_at_edit}</Text>,
    },
    {
      key: 'edited_at',
      header: 'When',
      sortValue: (r) => r.edited_at?.value ?? r.edited_at,
      render: (r) => <Stamp value={r.edited_at} />,
    },
  ]

  return (
    <Page
      title="History"
      lede="Every change a person has made in this channel, and what it replaced."
    >
      {orphans.length > 0 && (
        <Section
          title="Corrections with no line"
          note="A re-ingest re-parsed these lines away. The corrections were not lost — nothing can delete them — but they are attached to nothing until someone decides what they belong to now."
        >
          <DataTable
            columns={orphanColumns}
            rows={orphans}
            initialSort={{ key: 'edited_at', direction: 'desc' }}
            getRowKey={(r) => r.line_id}
            emptyMessage="None."
          />
        </Section>
      )}

      <Section title="Changes" note="Newest first. Append-only: nothing here is ever rewritten.">
        <DataTable
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

function Stamp({ value }) {
  const raw = value?.value ?? value
  if (!raw) return <Absent>Not recorded</Absent>
  return <>{new Date(raw).toISOString().replace('T', ' ').slice(0, 16)}</>
}
