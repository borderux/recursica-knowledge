// Participant consolidation, in one table.
//
// The transcription service names the same person differently in every transcript, so one
// interviewer arrives as `p_int` in one document and `p_int_smith` in ten others, and a name comes
// through with their employer attached or a first name only. This screen is where a person says
// which records are one human being and what that human being is called.
//
// Two things it keeps visible, because both are the difference between a tool you can audit and one
// you have to trust:
//
//   1. **The transcription service's own label never disappears.** A consolidated record shows the
//      corrected name and the source name together, the same way a corrected line shows
//      `original_text` beside `cleaned_text`. The difference between them is the correction.
//   2. **A merge is a layer, not a rewrite.** Nothing here edits `participants` or
//      `transcript_lines.participant_id` — that id is what tags and findings cite.
//
// ## Why this is one table
//
// It used to be four regions stacked down the page: `Suggested`, `Speakers with no name`,
// `Consolidated people`, `Every speaker`. Every one of those headings named a *state*, which means
// the page had taken a filter and built structure out of it. `recursica-skill-tables` now rejects
// that outright, and the reasons showed up immediately in the data:
//
//   - **The count was unanswerable.** "How many people are there" needed three row counts added
//     together, and a record could appear in two regions at once.
//   - **Three of the four regions were empty** on a real dataset — eleven speakers, no suggestions,
//     nobody consolidated — so the screen was mostly headings over nothing.
//
// One table, status as a column, and a row that needs a decision carries it. A suggested merge is
// shown **as though it were already consolidated, marked as awaiting approval**, because a reader
// can judge a result but has to assemble a proposal. The expansion shows what went into it, and it
// stays after approval with the undo inside it — approval is the moment the reader most needs to
// see what happened, so removing the view at that moment is what makes a merge unauditable.

import { useEffect, useMemo, useRef, useState } from 'react'
import { Link as RouterLink } from 'react-router'
import {
  Button, Dropdown, Group, Link, Modal, Stack, Text, TextField,
} from '@recursica/mantine-adapter'
import { api } from '../api.js'
import { Absent, COLUMN_WIDTH, DataTable } from '../shell/DataTable.jsx'
import { Page, Section } from '../shell/Page.jsx'

// A person's role is a property of the appearance, not of the person — the same researcher runs
// nineteen interviews and observes the twentieth. So this only ever fills a gap for a record whose
// transcript states no role, and the label on the field says so.
const ROLES = ['participant', 'interviewer', 'stakeholder', 'observer']

export function People({ identity, revision, onChanged }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [selected, setSelected] = useState(() => new Set())
  const [proposal, setProposal] = useState(null)

  useEffect(() => {
    api.participants().then(setData).catch((e) => setError(e.message))
  }, [revision])

  if (error) return <Page title="People"><Text>{error}</Text></Page>
  if (!data) return null

  const { roster, people, pairs, personMatches, unattributed } = data
  const byId = new Map(roster.map((r) => [r.participant_id, r]))
  const rows = buildRows({ roster, people, pairs, personMatches })

  /** Open the form for a set of ids, prefilled from whichever record carries the most transcript. */
  function propose(participantIds, personId = null) {
    const records = participantIds.map((id) => byId.get(id)).filter(Boolean)
    const heaviest = [...records].sort((a, b) => b.line_count - a.line_count)[0]
    const person = people.find((p) => p.person_id === personId)
    setProposal({
      participantIds,
      personId,
      displayName: person?.display_name ?? heaviest?.source_names[0] ?? '',
      role: person?.participant_type ?? '',
      email: person?.email ?? heaviest?.source_emails[0] ?? '',
    })
  }

  // What the one bulk action can act on.
  //
  // Resolved through the rows rather than by pattern-matching the selected keys. A row's key is not
  // always a speaker id — a consolidated person is `p:<person_id>` and a suggested merge is
  // `s:<a>+<b>` — so filtering the keys by prefix and passing them on handed the merge form an id
  // that is not in the roster, and it opened with nothing in it. Only a `Separate` row is a
  // candidate: a pending row is approved from its own expansion and a consolidated one is taken
  // apart there, and neither is a combine.
  const combinable = rows
    .filter((r) => selected.has(r.id) && r.status === 'Separate')
    .flatMap((r) => r.participantIds)

  // A status column only when the data varies. With no suggestion and nothing consolidated every
  // row reads `Separate`, and a column repeating one value down eleven rows is the empty column
  // `recursica-skill-tables` rejects — it takes width from the columns the reader came for and
  // tells them nothing. Same test the figure group has to pass, applied to a column.
  const statuses = new Set(rows.map((r) => r.status))
  const showStatus = statuses.size > 1

  const columns = [
    {
      key: 'name',
      header: 'Person',
      // No width: this is the sentence column and takes whatever the narrow ones leave.
      sortValue: (r) => r.name ?? r.id,
      render: (r) => <Identity row={r} onEdit={() => propose(r.participantIds, r.personId)} />,
    },
    ...(showStatus ? [{
      key: 'status',
      header: 'Status',
      // `term`, not `status`. Widths follow the data type, and the longest value here is
      // `Awaiting approval` — a two-word phrase, not a one-word state. At the narrow status width
      // it wrapped onto two lines, which is the same defect the skill describes as a wrapped date
      // beside a comfortable sentence: a width set for data that is not this shape.
      width: COLUMN_WIDTH.term,
      // Pending first: it is the only value that asks the reader for something.
      sortValue: (r) => (r.status === 'Awaiting approval' ? 0 : 1),
      render: (r) => r.status,
    }] : []),
    {
      key: 'role',
      header: 'Role',
      width: COLUMN_WIDTH.term,
      sortValue: (r) => r.roles[0] ?? null,
      render: (r) => (r.roles.length ? r.roles.join(' / ') : <Absent />),
    },
    {
      key: 'interviews',
      header: 'Interviews',
      width: COLUMN_WIDTH.count,
      sortValue: (r) => r.conversationCount,
      render: (r) => r.conversationCount,
    },
    {
      key: 'lines',
      header: 'Lines',
      width: COLUMN_WIDTH.count,
      sortValue: (r) => r.lineCount,
      render: (r) => r.lineCount,
    },
  ]

  return (
    <Page title="People">
      {/* No figure group. Four counts sat here and three of them read zero on real data —
          `Consolidated`, `People`, `Suggested merges` — while the fourth, `Speaker records`, was the
          row count of the table directly below. `recursica-skill-screen-scaffolding` now gates a
          figure on the dataset being large enough that the content does not already show its shape,
          on the number moving, and on it guiding an action. With eleven rows none of the four
          passes, so there is no figure group rather than a padded one. */}

      <Section
        title="Speakers"
        action={(
          // Bulk region: controls only. No count of what is selected, no list of the selected
          // names, no separate clear, and nothing at all when the selection is empty — the ticked
          // boxes already say which rows, and the parenthetical says how many.
          combinable.length > 1
            ? (
              <Button variant="solid" onClick={() => propose(combinable)}>
                {`Combine (${combinable.length})`}
              </Button>
            )
            : null
        )}
      >
        <DataTable
          label="Speakers"
          rows={rows}
          columns={columns}
          getRowKey={(r) => r.id}
          // The person, not the key. A key here is `p:<person_id>` or `s:<a>+<b>`, and naming the
          // checkbox and the disclosure control from it announced that string to a screen reader
          // instead of the speaker.
          rowLabel={(r) => r.name ?? r.id}
          initialSort={{ key: 'lines', direction: 'desc' }}
          emptyMessage="This channel has no transcripts with speakers yet."
          // Selection feeds the one bulk action and nothing else. Correcting a single name is
          // reached from that person's name, never by ticking their row.
          selection={{ selected, onChange: setSelected }}
          expandable={{
            canExpand: (r) => r.participantIds.length > 1 || r.status !== 'Separate',
            render: (r) => (
              <Composition row={r} identity={identity} onChanged={onChanged} onApprove={() => propose(r.participantIds, r.personId)} />
            ),
          }}
        />
      </Section>

      {/* Lines with no speaker are a genuinely different object type — transcript lines, not
          people — with different columns and nothing to compare down a column against the table
          above. That is the one split `recursica-skill-tables` allows, so it stays a region. */}
      {unattributed.length > 0 && (
        <Section title="Lines with no speaker">
          <ul className="stu-quotes">
            {unattributed.map((u) => (
              <li key={u.conversation_id}>
                <Link component={RouterLink} to={`/interviews/${encodeURIComponent(u.conversation_id)}`}>
                  {u.document_name ?? u.conversation_id}
                </Link>
                <Text variant="caption"> — {u.line_count} lines</Text>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Mounted always, opened by the presence of a proposal — **not** `{proposal && <MergeForm/>}`.
          Mounting it on the click made Mantine's `opened` a literal `true` for the component's whole
          life, and the focus return is gated on that value *changing*. See `MergeForm` itself. */}
      <MergeForm
        proposal={proposal}
        roster={byId}
        people={people}
        identity={identity}
        onClose={() => setProposal(null)}
        onDone={() => { setProposal(null); setSelected(new Set()); onChanged() }}
      />
    </Page>
  )
}

/**
 * One row per person-or-speaker, which is what makes this one table instead of four regions.
 *
 * Three kinds of thing become the same shape:
 *
 *   - a consolidated person, whose folded speaker ids are its composition
 *   - a suggested merge, shown **as if consolidated** with a pending status. Nothing is written to
 *     `participant_links` until a human approves, so this is a read-side synthesis and the row
 *     disappears if the suggestion does
 *   - an unconsolidated speaker record, on its own
 *
 * A record that is already part of a person does not also appear alone, which is the double-count
 * the stacked-section version had no way to avoid.
 */
export function buildRows({ roster, people, pairs, personMatches }) {
  const byId = new Map(roster.map((r) => [r.participant_id, r]))
  const spokenFor = new Set()
  const rows = []

  const totals = (ids) => {
    const records = ids.map((id) => byId.get(id)).filter(Boolean)
    return {
      lineCount: records.reduce((n, r) => n + Number(r.line_count ?? 0), 0),
      conversationCount: new Set(
        records.flatMap((r) => (r.appearances ?? []).map((a) => a.conversation_id)),
      ).size,
      roles: [...new Set(records.flatMap((r) => r.source_types ?? []))],
      sourceNames: [...new Set(records.flatMap((r) => r.source_names ?? []))],
      records,
    }
  }

  for (const person of people) {
    const ids = person.participant_ids ?? []
    ids.forEach((id) => spokenFor.add(id))
    const t = totals(ids)
    rows.push({
      id: `p:${person.person_id}`,
      personId: person.person_id,
      participantIds: ids,
      name: person.display_name,
      sourceNames: t.sourceNames,
      roles: person.participant_type ? [person.participant_type] : t.roles,
      lineCount: t.lineCount || Number(person.line_count ?? 0),
      conversationCount: t.conversationCount || Number(person.conversation_count ?? 0),
      status: 'Consolidated',
      notes: person.notes,
      warnings: [],
    })
  }

  // A suggested pair, presented as the consolidated record it would become. The name shown is the
  // one the merge form would default to — the heaviest record's — so the row is the actual outcome
  // rather than a description of one.
  for (const pair of pairs) {
    const ids = [pair.a_participant_id, pair.b_participant_id]
    if (ids.some((id) => spokenFor.has(id))) continue
    ids.forEach((id) => spokenFor.add(id))
    const t = totals(ids)
    const heaviest = [...t.records].sort((a, b) => b.line_count - a.line_count)[0]
    rows.push({
      id: `s:${ids.join('+')}`,
      personId: null,
      participantIds: ids,
      name: heaviest?.source_names[0] ?? ids[0],
      sourceNames: t.sourceNames,
      roles: t.roles,
      lineCount: t.lineCount,
      conversationCount: t.conversationCount,
      status: 'Awaiting approval',
      reasons: pair.reasons ?? [],
      warnings: [],
    })
  }

  // A record the system thinks belongs to a person who already exists.
  for (const match of personMatches) {
    if (spokenFor.has(match.participant_id)) continue
    spokenFor.add(match.participant_id)
    const t = totals([match.participant_id])
    rows.push({
      id: `m:${match.participant_id}+${match.person_id}`,
      personId: match.person_id,
      participantIds: [match.participant_id],
      name: match.person_name,
      sourceNames: t.sourceNames,
      roles: t.roles,
      lineCount: t.lineCount,
      conversationCount: t.conversationCount,
      status: 'Awaiting approval',
      reasons: match.reasons ?? [],
      warnings: [],
    })
  }

  for (const r of roster) {
    if (spokenFor.has(r.participant_id)) continue
    const t = totals([r.participant_id])
    rows.push({
      id: r.participant_id,
      personId: r.person_id ?? null,
      participantIds: [r.participant_id],
      name: r.person_name ?? r.source_names[0] ?? null,
      sourceNames: t.sourceNames,
      roles: t.roles,
      lineCount: t.lineCount,
      conversationCount: t.conversationCount,
      status: 'Separate',
      warnings: warningsFor(r),
    })
  }

  return rows
}

/**
 * What is wrong with a record, in the user's words rather than the schema's.
 *
 * These used to be a `Warnings` column, which was empty for every one of eleven rows — rare by
 * construction, so a column of `NA` with an occasional badge in it. `recursica-skill-tables` now
 * rejects a column for an exception: it attaches to the object instead.
 */
export function warningsFor(row) {
  const warnings = []
  if (!row.source_names.length && !row.person_name) warnings.push('no name in the transcript')
  if (row.unregistered_count > 0) {
    warnings.push(row.unregistered_count === row.record_count
      ? 'not in the roster'
      : `${row.unregistered_count} of ${row.record_count} not in the roster`)
  }
  if (row.line_count === 0) warnings.push('says nothing')
  if (row.source_types.length > 1) warnings.push('role differs by interview')
  if (row.person_count > 1) warnings.push('split across people')
  return warnings
}

/**
 * The identity cell: the name, what the transcript called it, and any exception.
 *
 * **The name is the way in.** `recursica-skill-tables` settled that a single-record action is
 * reached from the object itself — usually its name — and never by selecting the row. Ticking a
 * checkbox used to reveal `Correct this name` at one selection and `Combine` at two, which made the
 * checkbox mean two unrelated things.
 *
 * **A text button, not a link.** This one is the identifying value in every other table too, and
 * there it is a `Link` — but there it *navigates*, to a route, through a real `href`. Here it opens
 * a modal and writes a name: an action on this object, with nowhere to go. It was a
 * `Link component="button"`, which is the exact shape `recursica-skill-buttons-links` refuses —
 * "the component follows the intent, not the appearance", a link must render a real `href`, and
 * "if you don't want it to look like a button, use a text button — that is what the text variant
 * exists for". The two cases looking alike is the trap, and the anchor-on-the-identifying-value
 * fix everywhere else is what made this one easy to read as already correct.
 *
 * An exception rides here as an icon beside the name rather than in a column of its own, which is
 * both what the tables rule asks and where `recursica-skill-icon-semantics` requires a
 * non-interactive icon to sit — it never sits alone in a cell.
 */
function Identity({ row, onEdit }) {
  return (
    <Stack gap={2}>
      <Group gap={4} align="center" wrap="nowrap">
        {row.name
          ? <Button variant="text" onClick={onEdit}>{row.name}</Button>
          : <Button variant="text" onClick={onEdit}><code>{row.id}</code></Button>}
        {row.warnings.length > 0 && (
          // An icon, not a badge. `recursica-skill-badges-chips` makes the badge the earned
          // exception and the icon the default, because a badge is heavy enough that a scattering
          // of them down a table pulls the eye off the data. The title carries the words.
          <span className="stu-flag" title={row.warnings.join('; ')} aria-label={row.warnings.join('; ')} role="img">⚠</span>
        )}
      </Group>
      {/* The source label never disappears behind the correction. */}
      {row.name && row.sourceNames.length > 0 && row.sourceNames[0] !== row.name && (
        <Text variant="caption">transcript says {row.sourceNames.join(' / ')}</Text>
      )}
    </Stack>
  )
}

/**
 * What a row is made of, revealed in place — and the decision, where the row is awaiting one.
 *
 * The same affordance serves before and after approval, which `recursica-skill-tables` requires:
 * approving is when the reader most needs to see what was combined, so the view that showed the
 * proposal is the view that shows the result, and **the undo lives in it.**
 */
function Composition({ row, identity, onChanged, onApprove }) {
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState(null)

  async function detach(participantId) {
    setBusy(true); setProblem(null)
    try {
      await api.detachParticipant(participantId, { pubkey: identity.pubkey, note: null })
      onChanged()
    } catch (e) { setProblem(e.message) } finally { setBusy(false) }
  }

  const pending = row.status === 'Awaiting approval'

  return (
    <Stack gap="sm">
      {pending && row.reasons?.length > 0 && (
        <Text variant="body-small">Matched on {row.reasons.join(', ')}.</Text>
      )}

      <Stack gap={4}>
        <Text variant="caption">Speaker ids</Text>
        <ul className="stu-quotes">
          {row.participantIds.map((id) => (
            <li key={id}>
              <Text variant="body-small"><code>{id}</code></Text>
              {!pending && row.participantIds.length > 1 && (
                <Button variant="text" size="small" loading={busy} onClick={() => detach(id)}>
                  Separate this one
                </Button>
              )}
            </li>
          ))}
        </ul>
      </Stack>

      {row.notes && <Text variant="body-small">{row.notes}</Text>}
      {problem && <Text variant="body-small">{problem}</Text>}

      {pending && (
        <div className="stu-actions">
          <Button variant="solid" size="small" onClick={onApprove}>Approve this consolidation</Button>
        </div>
      )}
    </Stack>
  )
}

/**
 * The merge form. Shows the records being combined and their weight before the button that does it
 * — a merge across 3,000 lines of transcript and one across 40 are different decisions, and the
 * numbers are what tell them apart.
 */
function MergeForm({ proposal, roster, people, identity, onClose, onDone }) {
  const [displayName, setDisplayName] = useState('')
  const [role, setRole] = useState('')
  const [email, setEmail] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState(null)

  // **This component stays mounted whether or not there is a proposal**, so that `opened` below is a
  // binding that transitions rather than a literal `true`. Mantine returns focus to the trigger
  // through `useFocusReturn({ opened, … })`, which is wrapped in `useDidUpdate` — it skips the first
  // run and fires only when `opened` changes. Mounting the modal on the click made that effect body
  // unreachable, so the trigger was never captured and closing dropped focus.
  //
  // Two consequences, both handled here rather than by the caller:
  //
  //   `active` — the modal animates shut *after* `proposal` goes null, so the last one is held to
  //   render against. Without it the content blanks out mid-transition, and every derivation below
  //   would have to be null-guarded twice over.
  const last = useRef(null)
  if (proposal) last.current = proposal
  const active = proposal ?? last.current

  //   The fields no longer initialise from props at mount, because mount happens once now. They are
  //   seeded when a proposal arrives instead — which also reseeds them correctly when a second
  //   record is opened without the page reloading.
  useEffect(() => {
    if (!proposal) return
    setDisplayName(proposal.displayName)
    setRole(proposal.role)
    setEmail(proposal.email)
    setNote('')
    setProblem(null)
    setBusy(false)
  }, [proposal])

  const records = (active?.participantIds ?? []).map((id) => roster.get(id)).filter(Boolean)
  const person = people.find((p) => p.person_id === active?.personId)
  const totalLines = records.reduce((n, r) => n + r.line_count, 0)
  const totalInterviews = new Set(records.flatMap((r) => r.appearances.map((a) => a.conversation_id))).size
  const roleIsMissing = records.some((r) => !r.source_types.length)

  const candidates = useMemo(() => {
    const seen = new Map()
    for (const r of [...records].sort((a, b) => b.line_count - a.line_count)) {
      for (const n of r.source_names) if (!seen.has(n)) seen.set(n, r.line_count)
    }
    if (person) seen.delete(person.display_name)
    return [...seen.keys()]
  }, [records, person])

  async function submit() {
    setBusy(true); setProblem(null)
    try {
      await api.mergeParticipants({
        pubkey: identity.pubkey,
        participant_ids: active.participantIds,
        person_id: active.personId,
        display_name: displayName,
        participant_type: role || null,
        email: email || null,
        note: note || null,
      })
      onDone()
    } catch (e) { setProblem(e.message); setBusy(false) }
  }

  const title = person
    ? `Add to ${person.display_name}`
    : records.length > 1 ? 'Combine these records' : 'Correct this name'

  return (
    // Neither Mantine nor the adapter labels the close control, so without `closeButtonProps` it
    // is a button announced as nothing. Named after this form's own title, because the form is
    // three different acts depending on what was selected.
    <Modal
      opened={Boolean(proposal)}
      onClose={onClose}
      title={title}
      closeButtonProps={{ 'aria-label': `Close without saving — ${title}` }}
    >
      <Stack gap="sm">
        <Text variant="body-small">
          {records.length} speaker id{records.length === 1 ? '' : 's'} · {totalInterviews} interview
          {totalInterviews === 1 ? '' : 's'} · {totalLines} lines of transcript.
        </Text>

        <ul className="stu-quotes">
          {records.map((r) => (
            <li key={r.participant_id}>
              <Text variant="body-small">
                {r.source_names.length ? r.source_names.join(' / ') : 'no name'}{' '}
                <Text variant="caption" component="span"><code>{r.participant_id}</code></Text>
              </Text>
              <Text variant="caption">
                {r.line_count} lines in {r.conversation_count} interview
                {r.conversation_count === 1 ? '' : 's'}
                {r.person_name && r.person_name !== person?.display_name
                  ? ` — currently ${r.person_name}`
                  : ''}
              </Text>
            </li>
          ))}
        </ul>

        {/* `assistiveText` and not `description` on every TextField here — the adapter's TextField
            drops `description` silently, help text and `aria-describedby` with it. See the note in
            `shell/IdentityGate.jsx`. The `Dropdown` below keeps `description`, which works. */}
        <TextField
          // Opening focus goes to the first field. Without `data-autofocus` Mantine's focus trap
          // takes the first tabbable node, and the adapter renders the header before the body — so
          // it landed on the close button, which `recursica-skill-modal:78` allows only when
          // nothing else is focusable.
          data-autofocus
          formLayout="side-by-side"
          label="Name"
          assistiveText="What this person is actually called. Replaces the transcription service's label wherever it is read."
          value={displayName}
          onChange={(e) => setDisplayName(e.currentTarget.value)}
        />

        {candidates.length > 1 && (
          <Group gap={4} wrap="wrap">
            <Text variant="caption">From the transcripts:</Text>
            {candidates.map((c) => (
              <Button key={c} variant="text" size="small" onClick={() => setDisplayName(c)}>{c}</Button>
            ))}
          </Group>
        )}

        {roleIsMissing && (
          <Dropdown
            formLayout="side-by-side"
            label="Role, where the transcript does not say"
            description="Only fills a gap. A role the transcript states is left exactly as it is — the same person can interview one session and observe the next."
            placeholder="Leave unset"
            data={ROLES}
            value={role || null}
            onChange={(v) => setRole(v ?? '')}
            clearable
          />
        )}

        <TextField
          formLayout="side-by-side"
          label="Email"
          placeholder="Optional"
          value={email}
          onChange={(e) => setEmail(e.currentTarget.value)}
        />

        <TextField
          formLayout="side-by-side"
          label="Note"
          assistiveText="How you know these are the same person."
          value={note}
          onChange={(e) => setNote(e.currentTarget.value)}
        />

        {problem && <Text variant="body-small">{problem}</Text>}
      </Stack>

      <Modal.Footer>
        <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
        <Button variant="solid" loading={busy} disabled={!displayName.trim()} onClick={submit}>
          {person ? 'Add to this person' : records.length > 1 ? 'Combine' : 'Save name'}
        </Button>
      </Modal.Footer>
    </Modal>
  )
}
