// Top level of the Interviews section: many instances of one object, so a table
// (`recursica-skill-design-router` decision 6).

import { useEffect, useState } from 'react'
import { Link as RouterLink } from 'react-router'
import { Badge, Link, Text } from '@recursica/mantine-adapter'
import { api } from '../api.js'
import { formatCount, formatRatio, formatWhen } from '../format.js'
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
      // The way into the record, and the only interactive thing in the row. A real `<a href>`, so
      // Cmd-click, middle-click and "copy link address" all work — `recursica-skill-buttons-links`
      // requires that and it outranks the tables skill's permission for a whole-row target.
      //
      // No `Text` wrapper. A cell already carries the kit's `table-cell` text style, and
      // `recursica-skill-table` lists that style under "Not your decision" — wrapping the value
      // put this one column in the brand's secondary typeface while every other column stayed
      // in the primary. `Link` is exempt from that: it is the design system's own link treatment.
      render: (r) => (
        <Link component={RouterLink} to={`/interviews/${encodeURIComponent(r.conversation_id)}`}>
          {r.document_name ?? r.conversation_id}
        </Link>
      ),
    },
    {
      key: 'participant_type',
      header: 'Cohort',
      width: COLUMN_WIDTH.term,
      sortValue: (r) => r.participant_type,
      render: (r) => r.participant_type ?? <Absent />,
    },
    {
      key: 'tagged',
      header: 'Tagged lines',
      // Was two columns, `Lines` and `Untagged lines`, which made the reader subtract to learn
      // the one thing the column is for: how much of the interview the analysis rests on. One
      // column with the arithmetic done — `recursica-skill-naming-terminology`, "a label that
      // will not compress is usually two labels". Still not a percentage: 11 / 34 and 110 / 340
      // are the same percentage and are not the same situation.
      width: COLUMN_WIDTH.ratio,
      sortValue: (r) => Number(r.tagged_line_count ?? 0),
      render: (r) => formatRatio(r.tagged_line_count ?? 0, r.actual_line_count ?? 0),
    },
    {
      key: 'edits',
      header: 'Corrections',
      width: COLUMN_WIDTH.count,
      sortValue: (r) => Number(r.edited_line_count ?? 0),
      render: (r) => formatCount(r.edited_line_count),
    },
    {
      key: 'status',
      header: 'Status',
      width: COLUMN_WIDTH.status,
      // Sort on the word displayed, not on `r.status` — otherwise a row reading "Tagged" sorts
      // among the rows reading "Ingested" and the column disagrees with itself. A row with no
      // status sorts as a null, which `DataTable` already puts last in both directions.
      sortValue: (r) => statusLabel(r),
      // One badge per row — recursica-skill-badges-chips forbids stacking several on one object.
      //
      // **`<Absent />` replaces the badge rather than filling it.** A row whose status is null used
      // to read `Unknown`, which is per-column wording for an absence and the exact failure
      // `recursica-skill-tables` names — the rule is one string everywhere, which is why `Absent`
      // takes no arguments. It cannot go *inside* a badge: the treatment is italic neutral-500 text
      // and a badge has its own variant colours, so a badge reading `NA` would be an absence
      // dressed as a value. So the cell holds one or the other.
      render: (r) => {
        const label = statusLabel(r)
        return label ? <Badge variant={statusVariant(r)}>{label}</Badge> : <Absent />
      },
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
    <Page title="Interviews">
      {/* `Interviews` used to lead this row and it was the row count of the table directly below —
          the reader can already see how many interviews there are, so the box restated the table's
          own length in a bigger font. `recursica-skill-screen-scaffolding` now gates a figure on
          the content not already showing its shape.

          The four that remain are sums across rows, which a table of per-row values genuinely does
          not show: you cannot read a total off a column by eye. Each of them also moves on every
          ingest, and the last one names work waiting for a person. They reconcile as nested
          subsets — tagged, corrected and conflicting are all subsets of transcript lines. */}
      <Figures
        items={[
          { label: 'Transcript lines', value: totals.lines },
          { label: 'Tagged lines', value: totals.tagged },
          { label: 'Corrected lines', value: totals.edits },
          { label: 'Corrections to review', value: totals.conflicts },
        ]}
      />

      <DataTable
        label="Interviews"
        columns={columns}
        rows={rows}
        initialSort={{ key: 'ingested_at', direction: 'desc' }}
        getRowKey={(r) => r.conversation_id}
        emptyMessage="Claire has not ingested a transcript into this channel yet."
      />
    </Page>
  )
}

// The ingest status vocabulary is exactly ingesting | ingested | failed | superseded. A count
// mismatch is a separate and more serious claim than any of them, so it takes the row's one badge.
//
// "Tagged" is not a member of that vocabulary and is never written back to it — an earlier
// version of Scribe tested for a `status = 'complete'` that no writer ever set, and the lesson
// was to keep derived claims out of the column. It is derived per read from `fullyTagged`, and it
// outranks the plain ingest status because by the time it holds, the ingest status is old news.
// Null when there is no status, rather than the word `Unknown` — see the column's own note. The
// caller renders the absence; this only says whether there is one.
function statusLabel(r) {
  if (countMismatch(r)) return 'Line count mismatch'
  if (fullyTagged(r)) return 'Tagged'
  return r.status ?? null
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
 * zero untagged lines would therefore be a badge that can never appear.
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

// Relative within the last week, the absolute date beyond it — the threshold the owner set. No
// clock time: this column is headed with a date, and the hour of an ingest is not what is being
// compared down the column.
export function DateOnly({ value }) {
  const text = formatWhen(value)
  if (!text) return <Absent />
  return <>{text}</>
}

function sum(rows, key) {
  return rows.reduce((n, r) => n + Number(r[key] ?? 0), 0)
}
