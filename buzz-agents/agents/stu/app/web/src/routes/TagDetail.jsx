// Every line one tag landed on, with each justification beside it.
//
// This is the view that catches a tag applied loosely. Twenty lines that do not belong together
// are obvious side by side and invisible reading the transcript one line at a time.

import { useEffect, useState } from 'react'
import { Link as RouterLink, useParams } from 'react-router'
import { Link, Text } from '@recursica/mantine-adapter'
import { api } from '../api.js'
import { Page } from '../shell/Page.jsx'
import { DataTable } from '../shell/DataTable.jsx'
import { formatConfidence } from './Interview.jsx'

export function TagDetail({ revision }) {
  const { tagId } = useParams()
  const [rows, setRows] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.tagUsage(tagId).then(setRows).catch((e) => setError(e.message))
  }, [tagId, revision])

  if (error) return <Page title={tagId} trail={TRAIL}><Text>{error}</Text></Page>
  if (!rows) return null

  const weak = rows.filter((r) => !r.justification?.trim()).length

  const columns = [
    {
      key: 'line',
      header: 'Line',
      sortValue: (r) => Number(r.line_sequence_number),
      render: (r) => (
        <Link
          component={RouterLink}
          to={`/interviews/${encodeURIComponent(r.conversation_id)}/lines/${r.line_sequence_number}`}
        >
          {r.line_sequence_number}
        </Link>
      ),
    },
    {
      key: 'speaker',
      header: 'Speaker',
      sortValue: (r) => r.participant_name,
      render: (r) => r.participant_name ?? 'Unattributed',
    },
    {
      key: 'text',
      header: 'What was said',
      sortValue: (r) => r.cleaned_text ?? r.original_text,
      render: (r) => <Text variant="body-small">{r.cleaned_text ?? r.original_text}</Text>,
    },
    {
      key: 'justification',
      header: 'Why this tag',
      sortValue: (r) => r.justification ?? '',
      render: (r) => r.justification
        ? <Text variant="body-small">{r.justification}</Text>
        : <Text variant="body-small">No justification recorded — this tag cannot be checked.</Text>,
    },
    {
      key: 'confidence',
      header: 'Confidence',
      sortValue: (r) => Number(r.confidence ?? 0),
      render: (r) => formatConfidence(r.confidence),
    },
  ]

  return (
    <Page
      title={tagId}
      trail={TRAIL}
      lede={weak
        ? `${rows.length} lines carry this tag, and ${weak} of them have no justification.`
        : `${rows.length} lines carry this tag, each with a stated reason.`}
    >
      {/* A row here already contains a link to the line, so the row itself must not also
          navigate — one click target per row. */}
      <DataTable
        columns={columns}
        rows={rows}
        initialSort={{ key: 'confidence', direction: 'desc' }}
        getRowKey={(r) => `${r.conversation_id}:${r.line_id}`}
        emptyMessage="No line carries this tag."
      />
    </Page>
  )
}

const TRAIL = [{ label: 'Tags', to: '/tags' }]
