// Top level of the Interviews section: many instances of one object, so a table
// (`recursica-skill-design-router` decision 6).

import { useEffect, useState } from 'react'
import { Badge, Text } from '@recursica/mantine-adapter'
import { api } from '../api.js'
import { formatDate } from '../format.js'
import { Page } from '../shell/Page.jsx'
import { Absent, COLUMN_WIDTH, DataTable } from '../shell/DataTable.jsx'
import { Figures } from '../shell/Figures.jsx'

export function Interviews({ revision }) {
  const [rows, setRows] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.conversations().then(setRows).catch((e) => setError(e.message))
  }, [revision])

  if (error) return <Page title="Interviews"><Text>{error}</Text></Page>
  if (!rows) return null

  const totals = {
    interviews: rows.length,
    lines: sum(rows, 'actual_line_count'),
    tagged: sum(rows, 'tagged_line_count'),
    edits: sum(rows, 'edited_line_count'),
    conflicts: sum(rows, 'conflict_count'),
  }

  const columns = [
    {
      key: 'name',
      header: 'Interview',
      // No width. This is the sentence column, and it takes whatever the narrow ones leave.
      sortValue: (r) => r.document_name ?? r.conversation_id,
      // No `Text` wrapper. A cell already carries the kit's `table-cell` text style, and
      // `recursica-skill-table` lists that style under "Not your decision" — wrapping the value
      // put this one column in the brand's secondary typeface while every other column stayed
      // in the primary.
      render: (r) => r.document_name ?? r.conversation_id,
    },
    {
      key: 'participant_type',
      header: 'Cohort',
      width: COLUMN_WIDTH.term,
      sortValue: (r) => r.participant_type,
      render: (r) => r.participant_type ?? <Absent>Not recorded</Absent>,
    },
    {
      key: 'lines',
      header: 'Lines',
      width: COLUMN_WIDTH.count,
      sortValue: (r) => Number(r.actual_line_count ?? 0),
      render: (r) => Number(r.actual_line_count ?? 0),
    },
    {
      key: 'untagged',
      header: 'Untagged lines',
      width: COLUMN_WIDTH.count,
      sortValue: (r) => untagged(r),
      // How much of the interview the analysis does not rest on. Kept as its own column rather
      // than folded into a percentage: "45 of 75 untagged" changes what you conclude.
      render: (r) => untagged(r),
    },
    {
      key: 'edits',
      header: 'Your corrections',
      width: COLUMN_WIDTH.count,
      sortValue: (r) => Number(r.edited_line_count ?? 0),
      render: (r) => Number(r.edited_line_count ?? 0),
    },
    {
      key: 'status',
      header: 'Status',
      width: COLUMN_WIDTH.status,
      // Sort on the word displayed, not on `r.status` — otherwise a row reading "Tagged" sorts
      // among the rows reading "Ingested" and the column disagrees with itself.
      sortValue: (r) => statusLabel(r),
      // One badge per row — recursica-skill-badges-chips forbids stacking several on one object.
      render: (r) => <Badge variant={statusVariant(r)}>{statusLabel(r)}</Badge>,
    },
    {
      key: 'ingested_at',
      header: 'Ingested',
      width: COLUMN_WIDTH.date,
      sortValue: (r) => r.ingested_at?.value ?? r.ingested_at,
      render: (r) => <DateOnly value={r.ingested_at} />,
    },
  ]

  return (
    <Page
      title="Interviews"
      lede="Everything Claire has ingested into this channel, and how much of it has been checked."
    >
      <Figures
        items={[
          { label: 'Interviews', value: totals.interviews },
          { label: 'Transcript lines', value: totals.lines },
          { label: 'Tagged lines', value: totals.tagged },
          { label: 'Lines you have corrected', value: totals.edits },
          { label: 'Corrections needing review', value: totals.conflicts },
        ]}
      />

      <DataTable
        columns={columns}
        rows={rows}
        initialSort={{ key: 'ingested_at', direction: 'desc' }}
        getRowKey={(r) => r.conversation_id}
        rowHref={(r) => `/interviews/${encodeURIComponent(r.conversation_id)}`}
        emptyMessage="Claire has not ingested a transcript into this channel yet."
      />
    </Page>
  )
}

function untagged(r) {
  return Number(r.actual_line_count ?? 0) - Number(r.tagged_line_count ?? 0)
}

// The ingest status vocabulary is exactly ingesting | ingested | failed | superseded. A count
// mismatch is a separate and more serious claim than any of them, so it takes the row's one badge.
//
// "Tagged" is not a member of that vocabulary and is never written back to it — an earlier
// version of Scribe tested for a `status = 'complete'` that no writer ever set, and the lesson
// was to keep derived claims out of the column. It is derived per read from `fullyTagged`, and it
// outranks the plain ingest status because by the time it holds, the ingest status is old news.
function statusLabel(r) {
  if (countMismatch(r)) return 'Line count mismatch'
  if (fullyTagged(r)) return 'Tagged'
  return r.status ?? 'Unknown'
}

function statusVariant(r) {
  if (countMismatch(r)) return 'alert'
  if (fullyTagged(r)) return 'success'
  if (r.status === 'ingested') return 'success'
  if (r.status === 'failed') return 'alert'
  return 'warning'
}

/**
 * Whether Tagger has been over the whole transcript — which is a different claim from every line
 * carrying a tag, and the weaker-looking one is the true one. Tagger tags substantive turns and
 * deliberately leaves backchannel and interviewer turns alone, so the tagged share of a finished
 * transcript runs about a fifth of it and never reaches all of it. Reading "fully tagged" as
 * `untagged === 0` would therefore be a badge that can never appear.
 *
 * What is being asserted is coverage: a tag run completed, untruncated, over a range spanning the
 * transcript. A transcript with tags on it but no such run does not qualify — tags whose coverage
 * nothing recorded are exactly the case this app exists to keep visible.
 */
export function fullyTagged(r) {
  const lines = Number(r.actual_line_count ?? 0)
  if (r.tag_lines_covered == null || lines <= 0) return false
  return Number(r.tag_lines_covered) >= lines
}

export function countMismatch(r) {
  return r.line_count != null && Number(r.line_count) !== Number(r.actual_line_count)
}

export function DateOnly({ value }) {
  const text = formatDate(value)
  if (!text) return <Absent>Not recorded</Absent>
  return <>{text}</>
}

function sum(rows, key) {
  return rows.reduce((n, r) => n + Number(r[key] ?? 0), 0)
}
