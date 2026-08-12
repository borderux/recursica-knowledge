// The project dictionary, and the human gate on it.
//
// Lexicon can only ever write `proposed`. Everything that moves a term off that status happens
// here, which makes this screen the enforcement point for the rule the schema describes: an agent
// never approves the terms that license its own corrections.
//
// Terms are shown with the quotes that produced them, so the decision is made against evidence
// rather than against a plausible-sounding definition.
//
// Lexicon writes two shapes into one table, and they are two different questions:
//
//   Spellings    — the term lists variants. "Are all of these genuinely the same thing?" This is
//                  where an over-merge does damage, because the merge applies to every future
//                  transcript and erases the distinction in all of them.
//   Definitions  — the term lists none. "Is this definition right, and grounded in the quotes?"
//                  No text is unified, so the stakes are lower.
//
// They are tabs rather than one list because a reviewer can only hold one of those questions at a
// time, and because the consequence of approving differs between them. The page used to spell that
// consequence out in a paragraph above each list; the owner removed all such text, so the split
// itself now carries it and the tab a reviewer is standing in is what says which question they are
// answering.

import { useEffect, useMemo, useState } from 'react'
import { Link as RouterLink, Navigate, useNavigate, useParams } from 'react-router'
import {
  Badge, Button, Dropdown, Group, Layer, Link, Stack, Tabs, Text, TextField, Title,
} from '@recursica/mantine-adapter'
import { api } from '../api.js'
import { Empty, Page, Section } from '../shell/Page.jsx'
import { UnsavedWork, useUnsavedWork } from '../shell/UnsavedWork.jsx'
import { formatConfidence } from './Interview.jsx'

/** The two tabs, which are also the two routes under `/dictionary`. */
const TABS = ['spellings', 'definitions']

/**
 * The split is `variants`, not `term_type`. A term that lists an alternative spelling is a
 * request to unify text; a term that lists none is a request to record a meaning. `term_type`
 * cuts across both and is a filter inside a tab rather than a third tab.
 */
function unifiesSpelling(term) {
  return (term.variants?.length ?? 0) > 0
}

function isWaiting(term) {
  return term.status === 'proposed' || term.status === 'needs_clarification'
}

export function Dictionary({ identity, revision, onChanged }) {
  const { tab = 'spellings' } = useParams()
  const navigate = useNavigate()
  const [rows, setRows] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.dictionary().then(setRows).catch((e) => setError(e.message))
  }, [revision])

  // An address that is not one of the tabs is not a location this page has — the same rule the
  // Findings tabs follow. A tab that survives a refresh is the whole reason these are routes.
  if (!TABS.includes(tab)) return <Navigate to="/dictionary/spellings" replace />

  if (error) return <Page title="Dictionary"><Text>{error}</Text></Page>
  if (!rows) return null

  const spellings = rows.filter(unifiesSpelling)
  const definitions = rows.filter((t) => !unifiesSpelling(t))

  return (
    <Page title="Dictionary">
      {/* keepMounted={false} for the same reason Findings sets it: each panel is a whole screen
          with its own filter bar and its own live region, and a live region that is not on screen
          has no business being able to speak.

          Which is also why a tab switch used to destroy a half-typed note without asking — the
          panel unmounts and the local state goes with it. `UnsavedWork` puts the prompt
          `recursica-skill-navigation` requires in front of that, rather than keeping the panel
          mounted and reintroducing the live region that can speak from off screen. */}
      <UnsavedWork>
        {(guard) => (
          <Tabs
            value={tab}
            keepMounted={false}
            onChange={(next) => guard(() => navigate(`/dictionary/${next}`))}
          >
            <Tabs.List>
              {/* Nouns, not the questions they stand for — recursica-skill-tabs. The count is what
                  is waiting on a person, not the size of the tab: the size is on screen once you
                  are in it, and how much work is behind the label is the one thing worth knowing
                  before clicking. Metadata, never a control. */}
              <Tabs.Tab value="spellings" rightSection={<Waiting rows={spellings} />}>
                Spellings
              </Tabs.Tab>
              <Tabs.Tab value="definitions" rightSection={<Waiting rows={definitions} />}>
                Definitions
              </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="spellings">
              <Terms
                rows={spellings}
                kind="spellings"
                empty={rows.length === 0
                  ? 'The dictionary is empty. Lexicon writes terms here as it reads transcripts.'
                  : 'No term proposed so far lists an alternative spelling. Every one of them is a definition.'}
                identity={identity}
                onChanged={onChanged}
              />
            </Tabs.Panel>

            <Tabs.Panel value="definitions">
              <Terms
                rows={definitions}
                kind="definitions"
                empty={rows.length === 0
                  ? 'The dictionary is empty. Lexicon writes terms here as it reads transcripts.'
                  : 'Every term proposed so far lists an alternative spelling, so all of them are on the Spellings tab.'}
                identity={identity}
                onChanged={onChanged}
              />
            </Tabs.Panel>
          </Tabs>
        )}
      </UnsavedWork>
    </Page>
  )
}

/** The count of terms still waiting, or nothing. Announced with its tab, not beside it. */
function Waiting({ rows }) {
  const n = rows.filter(isWaiting).length
  return n > 0 ? <Badge variant="warning">{n}</Badge> : null
}

/**
 * One tab's worth of terms: the filter that narrows them, then the two sections they fall into.
 *
 * The filter sits above both sections because it acts on both — recursica-skill-filters, "filters
 * sit above the collection they act on". `Waiting on you` and `Decided` are two views of one
 * collection, not two collections.
 */
function Terms({ rows, kind, empty, identity, onChanged }) {
  const [type, setType] = useState(null)

  // Options come from the rows actually present, never from the six types the schema names: a
  // filter offering a value that matches nothing reads as broken data. Same rule as Findings.
  const types = useMemo(() => (
    [...new Set(rows.map((t) => t.term_type).filter(Boolean))]
      .sort()
      .map((value) => ({ value, label: value }))
  ), [rows])

  const visible = useMemo(() => (
    type ? rows.filter((t) => t.term_type === type) : rows
  ), [rows, type])

  // A tab with nothing in it at all gets one heading naming what it holds, not `Waiting on you` —
  // that heading would be claiming work is waiting when none exists. Whether an empty tab should
  // instead be hidden or disabled is on `recursica-skill-tabs`' uncovered list, so it is asked
  // rather than decided here: both tabs always render.
  if (rows.length === 0) {
    return (
      <Section title={kind === 'spellings' ? 'Spellings' : 'Definitions'}>
        <Empty>{empty}</Empty>
      </Section>
    )
  }

  const waiting = visible.filter(isWaiting)
  const settled = visible.filter((t) => !isWaiting(t))

  return (
    <>
      <Layer layer={1}>
        <Stack gap="md">
          {/* A noun naming the field, matching what each term shows, and `Any` for the neutral
              state — the convention the Findings filter bar already set. Person and org under
              Spellings are the highest-risk group, and this is what isolates them. */}
          <Group gap="lg" align="flex-end" wrap="wrap">
            <Dropdown
              label="Type"
              placeholder="Any"
              data={types}
              value={type}
              onChange={setType}
              clearable
              disabled={types.length === 0}
            />
          </Group>

          {/* Filtering moves no focus, so the count is the only thing that tells a screen reader
              user the collection changed size. Politely, and it is the only live region here. */}
          <div aria-live="polite">
            <Text variant="body-small">
              {type
                ? `Showing ${visible.length} of ${rows.length} terms. A filter is applied.`
                : `${rows.length} term${rows.length === 1 ? '' : 's'}.`}
            </Text>
          </div>
        </Stack>
      </Layer>

      {/* No sub-text here. This region used to carry a paragraph explaining what approving a term
          does; the owner ruled it out along with every other piece of explanatory text in the app,
          having been told it was the one exception. Prose above a list is a poor place to explain an
          action regardless of whether the rule technically permits it — nobody reads it at the
          moment they act, which is the moment it would matter.

          If that consequence needs saying, it belongs at the point of the decision rather than
          above the collection. Not built here, because it was not asked for. */}
      <Section title="Waiting on you">
        {waiting.length === 0
          ? (
            <Empty>
              {/* Filtered to nothing and nothing being waiting are different states with
                  different next actions, so they do not share a sentence. */}
              {type
                ? `No ${type} term is waiting. Clear the filter to see the rest.`
                : 'Nothing is waiting. Every term has been decided.'}
            </Empty>
          )
          : waiting.map((term) => (
            <Term key={term.term_id} term={term} kind={kind} identity={identity} onChanged={onChanged} />
          ))}
      </Section>

      <Section title="Decided">
        {settled.length === 0
          ? <Empty>{type ? `No ${type} term has been decided yet.` : 'No term has been decided yet.'}</Empty>
          : settled.map((term) => (
            <Term key={term.term_id} term={term} kind={kind} identity={identity} onChanged={onChanged} />
          ))}
      </Section>
    </>
  )
}

const DECISIONS = [
  { status: 'active', label: 'Approve' },
  { status: 'rejected', label: 'Reject' },
  { status: 'needs_clarification', label: 'Unclear' },
]

function Term({ term, kind, identity, onChanged }) {
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState(null)

  // A note nobody has typed into is not unsaved work, so switching tabs past an untouched form
  // asks nothing. Cleared on save, which is what takes the prompt back down.
  useUnsavedWork(note.trim().length > 0)

  async function decide(status) {
    setBusy(true); setProblem(null)
    try {
      await api.decideTerm(term.term_id, { pubkey: identity.pubkey, status, note: note || null })
      setNote('')
      onChanged()
    } catch (e) { setProblem(e.message) } finally { setBusy(false) }
  }

  return (
    <div className="stu-record">
    <Layer layer={1}>
      <Stack gap="sm">
        <Group gap="sm" align="baseline" wrap="wrap">
          <Title order={3}>{term.canonical_term}</Title>
          <Badge variant={statusVariant(term.status)}>{term.status}</Badge>
          <Text variant="caption">{term.term_type ?? 'type not recorded'}</Text>
          <Text variant="caption">seen {String(term.occurrence_count ?? 0)}×</Text>
          {/* Lexicon sets this deliberately and it is the strongest triage signal on the page:
              0.9+ means a participant spelled the term out or defined it outright, 0.5–0.7 means
              it was inferred from context. The rows arrive sorted by it. */}
          <Text variant="caption">confidence {formatConfidence(term.confidence)}</Text>
        </Group>

        <Text variant="body">{term.definition ?? 'No definition was recorded for this term.'}</Text>

        {kind === 'spellings' && (
          <Stack gap={2}>
            <Text variant="body-small">Also written: {term.variants.join(', ')}</Text>
            <Impact term={term} />
          </Stack>
        )}

        <Stack gap={4}>
          <Text variant="caption">Evidence</Text>
          {term.evidence?.length
            ? (
              <ul className="stu-quotes">
                {term.evidence.map((e, i) => (
                  <li key={`${e.line_id}-${i}`}>
                    <Text variant="body-small">“{e.quote}”</Text>
                    {/* A citation you cannot follow is a citation you have to take on trust,
                        which is the thing this tool exists not to ask of anyone. */}
                    <Link
                      component={RouterLink}
                      to={lineRoute(e)}
                    >
                      Read it in context
                    </Link>
                  </li>
                ))}
              </ul>
            )
            : <Text variant="body-small">
                None cited. A term with no evidence is a term nobody can check — reject it or ask
                for the line it came from.
              </Text>}
        </Stack>

        {term.decided_by && (
          <Text variant="caption">
            Decided by {term.decided_by} on {String(term.decided_at?.value ?? term.decided_at ?? '')}
          </Text>
        )}

        {problem && <Text variant="body-small">{problem}</Text>}

        <TextField
          formLayout="side-by-side"
          label="Note"
          placeholder="Optional — why you decided this way"
          value={note}
          onChange={(e) => setNote(e.currentTarget.value)}
        />

        <div className="stu-actions">
          {DECISIONS.filter((d) => d.status !== term.status).map((d) => (
            <Button
              key={d.status}
              // Approve is the action reached for most often, so it is the solid one. The others
              // are real choices, not afterthoughts, so they are outlined rather than text.
              variant={d.status === 'active' ? 'solid' : 'outline'}
              size="small"
              loading={busy}
              onClick={() => decide(d.status)}
            >
              {d.label}
            </Button>
          ))}
        </div>
      </Stack>
    </Layer>
    </div>
  )
}

/**
 * How much text this merge is about, so the decision has a size attached rather than being an
 * abstract yes.
 *
 * Counted by the API over `lines_current.original_text` — see `queries.mjs`. Zero is a real and
 * useful answer, not a missing value: it says the variants proposed for unification appear
 * nowhere in the corpus as it currently stands, which is worth knowing before agreeing that two
 * spellings are the same thing.
 */
function Impact({ term }) {
  const n = Number(term.lines_matching ?? 0)

  if (n === 0) {
    return (
      <Text variant="caption">
        No line currently contains any of these spellings.
      </Text>
    )
  }

  return (
    <Text variant="caption">
      {n} line{n === 1 ? '' : 's'} currently contain{n === 1 ? 's' : ''} one of these spellings.
    </Text>
  )
}

function statusVariant(status) {
  if (status === 'active') return 'success'
  if (status === 'rejected') return 'alert'
  return 'warning'
}

/**
 * `line_id` is `<conversation_id>:<sequence>` by construction — the derived-key rule the whole
 * dataset depends on. That makes the sequence recoverable from the id, so a dictionary citation
 * can link to the line even though the evidence struct does not carry the number.
 */
function lineRoute(evidence) {
  const seq = String(evidence.line_id ?? '').split(':').pop()
  return `/interviews/${encodeURIComponent(evidence.conversation_id)}/lines/${seq}`
}
