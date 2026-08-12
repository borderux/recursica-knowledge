// Every line one tag landed on, with each justification beside it.
//
// This is the view that catches a tag applied loosely. Twenty lines that do not belong together
// are obvious side by side and invisible reading the transcript one line at a time.

import { useEffect, useState } from 'react'
import { Link as RouterLink, useParams } from 'react-router'
import { Link, Text } from '@recursica/mantine-adapter'
import { api } from '../api.js'
import { Page } from '../shell/Page.jsx'
import { Absent, DataTable } from '../shell/DataTable.jsx'
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
      render: (r) => r.cleaned_text ?? r.original_text,
    },
    {
      key: 'justification',
      header: 'Why this tag',
      sortValue: (r) => r.justification ?? '',
      // The value carries the cell's own type; the missing case is the absent treatment rather
      // than a smaller size, because "no justification" is a null and not a short answer.
      render: (r) => r.justification
        ?? <Absent />,
    },
    {
      key: 'confidence',
      header: 'Confidence',
      sortValue: (r) => Number(r.confidence ?? 0),
      render: (r) => formatConfidence(r.confidence),
    },
  ]

  return (
    <Page title={tagId} trail={TRAIL}>
      {/* Half of what used to be a page lede here was the table's own row count, which the table
          already shows. The half worth keeping is the number with no justification — a reader who
          does not see it will assume every row has one, which is the "state the reader would infer
          wrongly" case. So it stays, as content, and only when it is non-zero: an all-clear is not
          worth a line. */}
      {weak > 0 && (
        <Text variant="body-small">
          {weak} of these lines carry the tag with no justification.
        </Text>
      )}

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
