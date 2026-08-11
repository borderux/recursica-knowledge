// Participant consolidation.
//
// The transcription service names the same person differently in every transcript, so one
// interviewer arrives as `p_int` in one document and `p_int_smith` in ten others, and a name comes
// through with their employer attached or a first name only. This screen is where a person says
// which records are one human being and what that human being is called.
//
// Two things it is careful to keep visible, because both are the difference between a tool you can
// audit and one you have to trust:
//
//   1. **The transcription service's own label never disappears.** A consolidated record shows the
//      corrected name and the source name together, the same way a corrected line shows
//      `original_text` beside `cleaned_text`. The difference between them is the correction.
//   2. **A merge is a layer, not a rewrite.** Nothing here edits `participants` or
//      `transcript_lines.participant_id` — that id is what tags and findings cite. Said in words on
//      the screen, because a user deciding whether to merge is entitled to know what it costs.
//
// Suggestions are offered, never applied. Every one of them carries the reason it was made.

import { useEffect, useMemo, useState } from 'react'
import { Link as RouterLink } from 'react-router'
import {
  Badge, Button, Checkbox, Dropdown, Group, Layer, Link, Modal, Stack, Text, TextField, Title,
} from '@recursica/mantine-adapter'
import { api } from '../api.js'
import { Absent, DataTable } from '../shell/DataTable.jsx'
import { Empty, Page, Section } from '../shell/Page.jsx'
import { Figures } from '../shell/Figures.jsx'

// A person's role is a property of the appearance, not of the person — the same researcher runs
// nineteen interviews and observes the twentieth. So this only ever fills a gap for a record whose
// transcript states no role, and the label on the field says so.
const ROLES = ['participant', 'interviewer', 'stakeholder', 'observer']

export function People({ identity, revision, onChanged }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [selected, setSelected] = useState(() => new Set())
  // The merge form, or null when it is closed. Holds the ids being combined and, when absorbing
  // into someone who already exists, the person they are joining.
  const [proposal, setProposal] = useState(null)

  useEffect(() => {
    api.participants().then(setData).catch((e) => setError(e.message))
  }, [revision])

  if (error) return <Page title="People"><Text>{error}</Text></Page>
  if (!data) return null

  const { roster, people, pairs, personMatches, unattributed } = data
  const byId = new Map(roster.map((r) => [r.participant_id, r]))

  // No name from anywhere — neither the transcript's nor a person's. Testing only the source name
  // would leave a speaker sitting in "needs a name" after it had just been given one.
  const unnamed = roster.filter((r) => !r.source_names.length && !r.person_name)
  const consolidatedIds = roster.filter((r) => r.person_id).length
  const unattributedLines = unattributed.reduce((n, u) => n + u.line_count, 0)

  function toggle(participantId) {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(participantId)) next.delete(participantId)
      else next.add(participantId)
      return next
    })
  }

  /** Open the form for a set of ids, prefilled from whichever record carries the most transcript. */
  function propose(participantIds, personId = null) {
    const records = participantIds.map((id) => byId.get(id)).filter(Boolean)
    const heaviest = [...records].sort((a, b) => b.line_count - a.line_count)[0]
    const person = people.find((p) => p.person_id === personId)
    setProposal({
      participantIds,
      personId,
      // The name from the record with the most lines is the best guess available, and it is only
      // ever a default — the field is editable and the point of the screen is correcting it.
      displayName: person?.display_name ?? heaviest?.source_names[0] ?? '',
      role: person?.participant_type ?? '',
      email: person?.email ?? heaviest?.source_emails[0] ?? '',
    })
  }

  const selectedIds = [...selected]

  return (
    <Page
      title="People"
      lede="One person, however many ways the transcription service spelled them."
    >
      <Figures items={[
        { label: 'Speaker records', value: String(roster.length) },
        { label: 'Consolidated', value: String(consolidatedIds) },
        { label: 'People', value: String(people.length) },
        { label: 'Suggested merges', value: String(pairs.length + personMatches.length) },
      ]} />

      <Section
        title="Suggested"
        note={pairs.length + personMatches.length > 0
          ? 'Each suggestion says why it was made. None of them has been applied — the merge is yours.'
          : undefined}
      >
        {pairs.length + personMatches.length === 0
          ? <Empty>
              Nothing looks like a duplicate right now. New transcripts can introduce more, so this
              is worth another look after an ingest.
            </Empty>
          : (
            <Stack gap="sm">
              {pairs.map((pair) => (
                <Suggestion
                  key={`${pair.a_participant_id}+${pair.b_participant_id}`}
                  reasons={pair.reasons}
                  records={[
                    { id: pair.a_participant_id, name: pair.a_source_name, lines: pair.a_line_count, interviews: pair.a_conversation_count },
                    { id: pair.b_participant_id, name: pair.b_source_name, lines: pair.b_line_count, interviews: pair.b_conversation_count },
                  ]}
                  onReview={() => propose([pair.a_participant_id, pair.b_participant_id])}
                />
              ))}
              {personMatches.map((match) => (
                <Suggestion
                  key={`${match.participant_id}+${match.person_id}`}
                  reasons={match.reasons}
                  into={match.person_name}
                  records={[
                    { id: match.participant_id, name: match.source_name, lines: match.line_count, interviews: match.conversation_count },
                  ]}
                  onReview={() => propose([match.participant_id], match.person_id)}
                />
              ))}
            </Stack>
          )}
      </Section>

      {unnamed.length > 0 && (
        <Section
          title="Speakers with no name"
          note={
            'The transcription service gave these records no name at all. The transcript they ' +
            'appear in usually says who they are.'
          }
        >
          <Stack gap="sm">
            {unnamed.map((row) => (
              <div className="stu-record" key={row.participant_id}>
                <Layer layer={1}>
                  <Stack gap="xs">
                    <Group gap="sm" align="baseline" wrap="wrap">
                      <Title order={3}><code>{row.participant_id}</code></Title>
                      <Text variant="caption">
                        {row.line_count} line{row.line_count === 1 ? '' : 's'}
                        {' · '}
                        {row.conversation_count} interview{row.conversation_count === 1 ? '' : 's'}
                      </Text>
                      {row.unregistered_count > 0 && (
                        <Badge variant="warning">not in the roster</Badge>
                      )}
                    </Group>
                    <Text variant="body-small">Speaks in:</Text>
                    <ul className="stu-quotes">
                      {row.appearances.map((a) => (
                        <li key={a.conversation_id}>
                          <Link component={RouterLink} to={`/interviews/${encodeURIComponent(a.conversation_id)}`}>
                            {a.document_name ?? a.conversation_id}
                          </Link>
                          <Text variant="caption"> — {a.line_count} lines</Text>
                        </li>
                      ))}
                    </ul>
                    <div className="stu-actions">
                      <Button variant="solid" size="small" onClick={() => propose([row.participant_id])}>
                        Give this speaker a name
                      </Button>
                    </div>
                  </Stack>
                </Layer>
              </div>
            ))}
          </Stack>
        </Section>
      )}

      <Section
        title="Consolidated people"
        note="A name here overrides the transcription service's everywhere it is read."
      >
        {people.length === 0
          ? <Empty>Nobody has been consolidated yet.</Empty>
          : (
            <Stack gap="sm">
              {people.map((person) => (
                <Person
                  key={person.person_id}
                  person={person}
                  identity={identity}
                  onChanged={onChanged}
                  onAbsorb={() => propose(selectedIds.filter((id) => !byId.get(id)?.person_id), person.person_id)}
                  absorbCount={selectedIds.filter((id) => !byId.get(id)?.person_id).length}
                />
              ))}
            </Stack>
          )}
      </Section>

      <Section
        title="Every speaker"
        note={
          'One row per speaker id, totalled across every interview it appears in. Select two or ' +
          'more to combine them; select one to correct its name.'
        }
      >
        <Layer layer={1}>
          <div className="stu-filters">
            <Group gap="sm" align="center" wrap="wrap">
              <Text variant="body-small">
                {selectedIds.length === 0
                  ? 'Nothing selected.'
                  : `${selectedIds.length} selected: ${selectedIds.join(', ')}`}
              </Text>
              {selectedIds.length > 0 && (
                <>
                  <Button variant="solid" size="small" onClick={() => propose(selectedIds)}>
                    {selectedIds.length === 1 ? 'Correct this name' : `Combine ${selectedIds.length} records`}
                  </Button>
                  <Button variant="text" size="small" onClick={() => setSelected(new Set())}>
                    Clear
                  </Button>
                </>
              )}
            </Group>
          </div>
        </Layer>

        <DataTable
          rows={roster}
          getRowKey={(r) => r.participant_id}
          initialSort={{ key: 'lines', direction: 'desc' }}
          emptyMessage="This channel has no transcripts with speakers yet."
          columns={[
            {
              key: 'select',
              header: 'Combine',
              render: (r) => (
                <Checkbox
                  // Named for a screen reader but not on screen: the id it selects is already in
                  // the very next cell, and repeating it visibly turns the column into noise.
                  aria-label={`Select ${r.participant_id}`}
                  checked={selected.has(r.participant_id)}
                  onChange={() => toggle(r.participant_id)}
                />
              ),
            },
            {
              key: 'speaker',
              header: 'Speaker',
              sortValue: (r) => r.person_name ?? r.source_names[0] ?? r.participant_id,
              render: (r) => (
                <Stack gap={2}>
                  {r.person_name
                    ? (
                      <>
                        <span>{r.person_name}</span>
                        {/* The source label never disappears behind the correction. */}
                        <Text variant="caption">
                          transcript says {r.source_names.length ? r.source_names.join(' / ') : 'nothing'}
                        </Text>
                      </>
                    )
                    : r.source_names.length
                      ? <span>{r.source_names.join(' / ')}</span>
                      : <Absent />}
                  <Text variant="caption"><code>{r.participant_id}</code></Text>
                </Stack>
              ),
            },
            {
              key: 'role',
              header: 'Role',
              sortValue: (r) => r.source_types[0] ?? null,
              render: (r) => r.source_types.length
                ? r.source_types.join(' / ')
                : <Absent />,
            },
            {
              key: 'interviews',
              header: 'Interviews',
              sortValue: (r) => r.conversation_count,
              render: (r) => r.conversation_count,
            },
            {
              key: 'lines',
              header: 'Lines',
              sortValue: (r) => r.line_count,
              render: (r) => r.line_count,
            },
            {
              key: 'warnings',
              header: 'Warnings',
              sortValue: (r) => warningsFor(r).length,
              render: (r) => {
                const warnings = warningsFor(r)
                return warnings.length
                  ? (
                    <Group gap={4} wrap="wrap">
                      {warnings.map((w) => <Badge key={w} variant="warning">{w}</Badge>)}
                    </Group>
                  )
                  : <Absent />
              },
            },
          ]}
        />
      </Section>

      {unattributed.length > 0 && (
        <Section
          title="Lines with no speaker"
          note={
            'These cannot be consolidated — there is no speaker label to attach to anyone. They are ' +
            'listed because they are transcript with its provenance missing, which is worth ' +
            'knowing rather than rounding away.'
          }
        >
          <Text variant="body-small">
            {unattributedLines} line{unattributedLines === 1 ? '' : 's'} across{' '}
            {unattributed.length} interview{unattributed.length === 1 ? '' : 's'}:
          </Text>
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

      {proposal && (
        <MergeForm
          proposal={proposal}
          roster={byId}
          people={people}
          identity={identity}
          onClose={() => setProposal(null)}
          onDone={() => { setProposal(null); setSelected(new Set()); onChanged() }}
        />
      )}
    </Page>
  )
}

/**
 * What is wrong with a record, in the user's words rather than the schema's. Only ever additive:
 * a row with nothing wrong says "None" instead of leaving the cell blank, because an empty cell
 * and a cell meaning "no problems" are different claims.
 */
function warningsFor(row) {
  const warnings = []
  // A record a person has named is named, even though the transcript never named it.
  if (!row.source_names.length && !row.person_name) warnings.push('no name')
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

/** One offered merge, with the reason it is being offered. */
function Suggestion({ reasons, records, into, onReview }) {
  return (
    <div className="stu-record">
      <Layer layer={1}>
        <Stack gap="xs">
          <Group gap="sm" align="baseline" wrap="wrap">
            {records.map((r) => (
              <Text key={r.id} variant="subtitle-small">
                {r.name ?? 'unnamed'} <Text variant="caption" component="span"><code>{r.id}</code></Text>
              </Text>
            ))}
            {into && <Text variant="body-small">→ {into}</Text>}
          </Group>
          <Group gap={4} wrap="wrap">
            {reasons.map((reason) => <Badge key={reason} variant="warning">{reason}</Badge>)}
          </Group>
          <Text variant="body-small">
            {records.map((r) => `${r.name ?? r.id}: ${r.lines} lines in ${r.interviews} interview${r.interviews === 1 ? '' : 's'}`).join(' · ')}
          </Text>
          <div className="stu-actions">
            <Button variant="solid" size="small" onClick={onReview}>Review</Button>
          </div>
        </Stack>
      </Layer>
    </div>
  )
}

/** A consolidated person: what they are called, what was folded in, and how to undo it. */
function Person({ person, identity, onChanged, onAbsorb, absorbCount }) {
  const [name, setName] = useState(person.display_name)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState(null)

  async function rename() {
    setBusy(true); setProblem(null)
    try {
      await api.updatePerson(person.person_id, {
        pubkey: identity.pubkey, display_name: name, note: note || null,
      })
      setNote('')
      onChanged()
    } catch (e) { setProblem(e.message) } finally { setBusy(false) }
  }

  async function detach(participantId) {
    setBusy(true); setProblem(null)
    try {
      await api.detachParticipant(participantId, { pubkey: identity.pubkey, note: note || null })
      onChanged()
    } catch (e) { setProblem(e.message) } finally { setBusy(false) }
  }

  return (
    <div className="stu-record">
      <Layer layer={1}>
        <Stack gap="sm">
          <Group gap="sm" align="baseline" wrap="wrap">
            <Title order={3}>{person.display_name}</Title>
            {person.participant_type && <Badge variant="default">{person.participant_type}</Badge>}
            <Text variant="caption">
              {person.record_count} record{person.record_count === 1 ? '' : 's'}
              {' · '}
              {person.conversation_count} interview{person.conversation_count === 1 ? '' : 's'}
              {' · '}
              {person.line_count} lines
            </Text>
          </Group>

          {person.source_names.length > 0 && (
            <Text variant="body-small">
              The transcription service called them: {person.source_names.join(', ')}
            </Text>
          )}

          <Stack gap={4}>
            <Text variant="caption">Speaker ids folded in</Text>
            <Group gap="sm" wrap="wrap">
              {person.participant_ids.map((id) => (
                <Group key={id} gap={4} align="center">
                  <Text variant="body-small"><code>{id}</code></Text>
                  <Button variant="text" size="small" loading={busy} onClick={() => detach(id)}>
                    Separate
                  </Button>
                </Group>
              ))}
            </Group>
          </Stack>

          {person.notes && <Text variant="body-small">{person.notes}</Text>}
          {problem && <Text variant="body-small">{problem}</Text>}

          <TextField
            formLayout="side-by-side"
            label="Name"
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
          />
          <TextField
            formLayout="side-by-side"
            label="Note"
            placeholder="Optional — how you know, for whoever reads this next"
            value={note}
            onChange={(e) => setNote(e.currentTarget.value)}
          />

          <div className="stu-actions">
            {absorbCount > 0 && (
              <Button variant="outline" size="small" onClick={onAbsorb}>
                Add {absorbCount} selected
              </Button>
            )}
            <Button
              variant="solid"
              size="small"
              loading={busy}
              disabled={name.trim() === person.display_name || !name.trim()}
              onClick={rename}
            >
              Save name
            </Button>
          </div>
        </Stack>
      </Layer>
    </div>
  )
}

/**
 * The merge form. Deliberately shows the records being combined and their weight before the
 * button that does it — a merge across 3,000 lines of transcript and one across 40 are different
 * decisions, and the numbers are what tell them apart.
 */
function MergeForm({ proposal, roster, people, identity, onClose, onDone }) {
  const [displayName, setDisplayName] = useState(proposal.displayName)
  const [role, setRole] = useState(proposal.role)
  const [email, setEmail] = useState(proposal.email)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState(null)

  const records = proposal.participantIds.map((id) => roster.get(id)).filter(Boolean)
  const person = people.find((p) => p.person_id === proposal.personId)
  const totalLines = records.reduce((n, r) => n + r.line_count, 0)
  const totalInterviews = new Set(records.flatMap((r) => r.appearances.map((a) => a.conversation_id))).size
  // Only offer the role field when it can do something: it fills a gap, so if every record's
  // transcript already states a role there is nothing for it to fill.
  const roleIsMissing = records.some((r) => !r.source_types.length)

  // The suggested names, so correcting one is a click rather than retyping. Sorted heaviest first
  // because that is usually the fullest spelling.
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
        participant_ids: proposal.participantIds,
        person_id: proposal.personId,
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
    <Modal opened onClose={onClose} title={title}>
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

        <TextField
          formLayout="side-by-side"
          label="Name"
          description="What this person is actually called. Replaces the transcription service's label wherever it is read."
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
          placeholder="Optional — how you know these are the same person"
          value={note}
          onChange={(e) => setNote(e.currentTarget.value)}
        />

        <Text variant="caption">
          Recorded in <code>participant_links</code>, which no agent writes, so a re-ingest cannot
          undo it. Nothing is deleted: the speaker ids stay exactly as they are, so every tag and
          finding that cites one still resolves. Separating them again is one click.
        </Text>

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
