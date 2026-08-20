// Personas, and the one decision a human makes about them.
//
// Percy writes a `persona_sets` row per population per run, always as `draft` — the schema's own
// column comment says promoting a version to `current` happens "only a human, through Stu," and
// until this screen existed that path did not exist anywhere. Same split as Findings: a Review
// view for what is waiting on a person, a Decided view for what has already been ruled on,
// because triaging new output and browsing settled output want opposite things on screen.
//
// Every claim inside a persona — a goal, a behavior, a pain point, a representative quote — is
// evidence-grounded the same way a finding is: each one cites transcript lines, and this screen
// resolves every citation to what the line actually says now, so drift between the claim and the
// live transcript is visible rather than taken on trust.

import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'
import {
  Badge, Button, Group, Layer, Link, SegmentedControl, Stack, Tabs, Text, TextArea, Title,
} from '@recursica/mantine-adapter'
import { api } from '../api.js'
import { Empty, Page, Section } from '../shell/Page.jsx'
import { QuoteContext } from '../shell/QuoteContext.jsx'

const TABS = ['review', 'decided']

export function Personas({ identity, revision, onChanged }) {
  const { tab = 'review' } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [context, setContext] = useState(null)

  useEffect(() => {
    api.personas().then(setData).catch((e) => setError(e.message))
  }, [revision])

  if (!TABS.includes(tab)) return <Navigate to="/personas/review" replace />
  if (error) return <Page title="Personas"><Text>{error}</Text></Page>
  if (!data) return null

  const { personaSets, conversationPopulations } = data
  // Waiting means undecided — a draft a person has neither promoted nor rejected yet.
  // `resolution` carries the verdict on a rejected draft, since `status` has no fourth value for it.
  const waiting = personaSets.filter((ps) => ps.status === 'draft' && ps.resolution == null)

  return (
    <Page title="Personas">
      <Tabs value={tab} keepMounted={false} onChange={(next) => navigate(`/personas/${next}`)}>
        <Tabs.List>
          <Tabs.Tab
            value="review"
            rightSection={waiting.length > 0 ? <Badge variant="warning">{waiting.length}</Badge> : null}
          >
            Review
          </Tabs.Tab>
          <Tabs.Tab value="decided">Decided</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="review">
          <Review
            rows={waiting}
            identity={identity}
            onChanged={onChanged}
            onOpenContext={setContext}
          />
        </Tabs.Panel>

        <Tabs.Panel value="decided">
          <Decided
            rows={personaSets}
            conversationPopulations={conversationPopulations}
            onOpenContext={setContext}
          />
        </Tabs.Panel>
      </Tabs>

      <QuoteContext
        citation={context?.citation ?? null}
        siblings={context?.siblings ?? []}
        onAnchor={(citation) => setContext((c) => ({ ...c, citation }))}
        onClose={() => setContext(null)}
      />
    </Page>
  )
}

// -------------------------------------------------------------------------------- review

function Review({ rows, identity, onChanged, onOpenContext }) {
  if (rows.length === 0) {
    return (
      <Section title="Waiting on you">
        <Empty>
          Nothing is waiting. Percy writes a persona set here as `draft` — it has no way to
          promote or reject its own.
        </Empty>
      </Section>
    )
  }

  return (
    <Section title="Waiting on you">
      {rows.map((ps) => (
        <PersonaSet
          key={`${ps.population_id}:${ps.version}`}
          personaSet={ps}
          identity={identity}
          onChanged={onChanged}
          onOpenContext={onOpenContext}
          decidable
        />
      ))}
    </Section>
  )
}

// -------------------------------------------------------------------------------- decided

const VIEWS = [
  { value: 'current', label: 'Current' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'superseded', label: 'Superseded' },
]

function Decided({ rows, conversationPopulations, onOpenContext }) {
  const [view, setView] = useState('current')

  const decided = rows.filter((ps) => !(ps.status === 'draft' && ps.resolution == null))
  const inView = decided.filter((ps) => {
    if (view === 'current') return ps.status === 'current'
    if (view === 'superseded') return ps.status === 'superseded'
    return ps.status === 'draft' && ps.resolution === 'rejected'
  })

  const populationCounts = useMemo(() => {
    const counts = new Map()
    for (const row of conversationPopulations) {
      if (!row.population_id) continue
      counts.set(row.population_id, (counts.get(row.population_id) ?? 0) + 1)
    }
    return counts
  }, [conversationPopulations])

  return (
    <Section title={VIEWS.find((v) => v.value === view)?.label}>
      <Layer layer={1}>
        <Stack gap={4}>
          <Text variant="caption">View</Text>
          <div role="group" aria-label="View">
            <SegmentedControl data={VIEWS} value={view} onChange={setView} />
          </div>
        </Stack>
      </Layer>

      {inView.length === 0 ? (
        <Empty>
          {view === 'current' && 'Nothing has been promoted yet. Promote a draft in Review and it appears here.'}
          {view === 'rejected' && 'Nothing has been rejected.'}
          {view === 'superseded' && 'Nothing has been superseded yet — that happens automatically when a later version is promoted.'}
        </Empty>
      ) : (
        inView.map((ps) => (
          <PersonaSet
            key={`${ps.population_id}:${ps.version}`}
            personaSet={ps}
            onOpenContext={onOpenContext}
            conversationCount={populationCounts.get(ps.population_id) ?? 0}
          />
        ))
      )}
    </Section>
  )
}

// ---------------------------------------------------------------------------- persona set

function PersonaSet({ personaSet: ps, identity, onChanged, onOpenContext, decidable = false, conversationCount = 0 }) {
  // Every citation anywhere in this version — goals, behaviors, pain points, representative
  // quotes — cites a `line_id`. This is where those get resolved to what the line actually says
  // now, once per set rather than once per claim.
  const evidenceByLine = useMemo(() => {
    const map = new Map()
    for (const e of ps.evidence ?? []) map.set(e.line_id, e)
    return map
  }, [ps.evidence])

  const runSummary = ps.run_summary ?? {}
  const cohort = ps.cohort_alignment ?? null
  const personas = ps.personas ?? []

  return (
    <div className="stu-record">
      <Layer layer={1}>
        <Stack gap="sm">
          <Group gap="sm" align="baseline" wrap="wrap">
            <Title order={3}>{ps.population_id}</Title>
            <Text variant="caption">v{ps.version}</Text>
            <Badge variant={statusVariant(ps.status, ps.resolution)}>
              {ps.status === 'draft' && ps.resolution === 'rejected' ? 'rejected' : ps.status}
            </Badge>
            {conversationCount > 0 && (
              <Text variant="caption">{conversationCount} conversation{conversationCount === 1 ? '' : 's'} in this population</Text>
            )}
          </Group>

          <Text variant="caption">
            {runSummary.interviews ?? '?'} interviews · {runSummary.total_participants ?? '?'} participants ·{' '}
            {runSummary.placed ?? '?'} placed · {(runSummary.singletons ?? []).length} singleton{(runSummary.singletons ?? []).length === 1 ? '' : 's'} ·{' '}
            {runSummary.cluster_count ?? personas.length} cluster{(runSummary.cluster_count ?? personas.length) === 1 ? '' : 's'}
          </Text>

          {!ps.goals_available && (
            <Text variant="body-small">
              No research goals exist for this population — clustered emergently, on behavior
              alone. That is the intended mode here, not a degraded result.
            </Text>
          )}

          {cohort && (
            <Stack gap={2}>
              <Text variant="caption">Cohort alignment — {cohort.result?.replace(/_/g, ' ') ?? 'unreported'}</Text>
              {cohort.narrative && <Text variant="body-small">{cohort.narrative}</Text>}
            </Stack>
          )}

          {ps.diff && (
            <Stack gap={2}>
              <Text variant="caption">Changed since the version this one supersedes</Text>
              <Text variant="body-small">{JSON.stringify(ps.diff)}</Text>
            </Stack>
          )}

          {ps.document_uri && (
            <Link href={ps.document_uri} target="_blank" rel="noreferrer">Open the Drive write-up</Link>
          )}

          <Text variant="caption">
            Produced by {ps.produced_by ?? 'unknown'}
            {ps.reviewed_by && ` · reviewed by ${ps.reviewed_by}`}
          </Text>

          {ps.notes && <Text variant="body-small">Note on the record: {ps.notes}</Text>}

          <Stack gap="md">
            {personas.map((p) => (
              <Persona key={p.id} persona={p} evidenceByLine={evidenceByLine} onOpenContext={onOpenContext} />
            ))}
          </Stack>

          {decidable && (
            <Decision
              populationId={ps.population_id}
              version={ps.version}
              identity={identity}
              onChanged={onChanged}
            />
          )}
        </Stack>
      </Layer>
    </div>
  )
}

function statusVariant(status, resolution) {
  if (status === 'current') return 'success'
  if (status === 'draft' && resolution === 'rejected') return 'alert'
  return 'warning'
}

// -------------------------------------------------------------------------------- persona

function Persona({ persona: p, evidenceByLine, onOpenContext }) {
  const participantCount = (p.participant_ids ?? []).length

  return (
    <div className="stu-record">
      <Stack gap="sm">
        <Group gap="sm" align="baseline" wrap="wrap">
          <Title order={4}>{p.name}</Title>
          <Badge variant={p.status === 'confirmed' ? 'success' : 'warning'}>{p.status}</Badge>
          <Text variant="caption">
            {participantCount} participant{participantCount === 1 ? '' : 's'}
          </Text>
        </Group>

        <Text variant="body">{p.summary}</Text>

        {p.distinguishing_axis && (
          <Stack gap={2}>
            <Text variant="caption">What sets this cluster apart</Text>
            <Text variant="body-small">{p.distinguishing_axis}</Text>
          </Stack>
        )}

        {p.mental_model && (
          <Stack gap={2}>
            <Text variant="caption">Mental model</Text>
            <Text variant="body-small">{p.mental_model}</Text>
          </Stack>
        )}

        <ClaimGroup title="Goals" claims={p.goals} evidenceByLine={evidenceByLine} onOpenContext={onOpenContext} />
        <ClaimGroup title="Behaviors" claims={p.behaviors} evidenceByLine={evidenceByLine} onOpenContext={onOpenContext} />
        <ClaimGroup title="Pain points" claims={p.pain_points} evidenceByLine={evidenceByLine} onOpenContext={onOpenContext} />

        {(p.representative_quotes ?? []).length > 0 && (
          <Stack gap={4}>
            <Text variant="caption">Representative quotes</Text>
            <ul className="stu-quotes">
              {p.representative_quotes.map((q, i) => (
                <li key={`${q.line_id}-${i}`}>
                  <Quote citation={q} evidenceByLine={evidenceByLine} onOpenContext={onOpenContext} />
                  {q.figurative && <Badge variant="warning">figurative</Badge>}
                </li>
              ))}
            </ul>
          </Stack>
        )}

        {(p.gaps ?? []).length > 0 && (
          <Stack gap={4}>
            <Text variant="caption">What the data does not tell you about this group</Text>
            <ul>
              {p.gaps.map((g, i) => <li key={i}><Text variant="body-small">{g}</Text></li>)}
            </ul>
          </Stack>
        )}
      </Stack>
    </div>
  )
}

/** One `{statement, type, support, evidence}` group — a persona's goals, behaviors, or pain points. */
function ClaimGroup({ title, claims, evidenceByLine, onOpenContext }) {
  if (!claims?.length) return null
  return (
    <Stack gap="sm">
      <Text variant="caption">{title}</Text>
      {claims.map((c, i) => (
        <Stack key={i} gap={4}>
          <Group gap="sm" align="baseline" wrap="wrap">
            <Text variant="body-small">{c.statement}</Text>
            <Badge variant={c.type === 'inferred' ? 'warning' : 'success'}>{c.type}</Badge>
            <Text variant="caption">support: {c.support}</Text>
          </Group>
          {(c.evidence ?? []).length > 0 && (
            <ul className="stu-quotes">
              {c.evidence.map((e, j) => (
                <li key={`${e.line_id}-${j}`}>
                  <Quote citation={e} evidenceByLine={evidenceByLine} onOpenContext={onOpenContext} />
                </li>
              ))}
            </ul>
          )}
        </Stack>
      ))}
    </Stack>
  )
}

/**
 * One citation, wherever it appears in a persona. Resolved against the version's flattened
 * `evidence` (which carries the live line text and sequence number) rather than trusting the
 * citation's own `quote` as still current — same drift check `Findings.jsx` makes.
 */
function Quote({ citation, evidenceByLine, onOpenContext }) {
  const resolved = evidenceByLine.get(citation.line_id)
  const lineText = resolved?.line_text
  const drifted = Boolean(lineText) && !flat(lineText).includes(flat(citation.quote))

  return (
    <Stack gap={2}>
      <Text variant="body-small">Quoted: "{citation.quote}"</Text>
      <Text variant="body-small">
        Line now: {lineText ?? (resolved ? 'this line no longer exists' : 'not resolved in this version’s evidence')}
      </Text>
      {drifted && <Badge variant="warning">quote is no longer in this line</Badge>}
      {resolved?.line_sequence_number != null && (
        <div>
          <Button
            variant="text"
            size="small"
            onClick={() => onOpenContext({ citation: resolved, siblings: [] })}
          >
            Read it in context
          </Button>
        </div>
      )}
    </Stack>
  )
}

function flat(s) {
  return String(s ?? '').replace(/\s+/g, ' ').trim().toLowerCase()
}

// ------------------------------------------------------------------------------- decision

function Decision({ populationId, version, identity, onChanged }) {
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState(null)

  async function decide(decision) {
    setBusy(true); setProblem(null)
    try {
      await api.decidePersonaSet(populationId, version, {
        pubkey: identity.pubkey, decision, note: note || null,
      })
      setNote('')
      onChanged()
    } catch (e) { setProblem(e.message) } finally { setBusy(false) }
  }

  return (
    <Stack gap="sm">
      {problem && <Text variant="body-small">{problem}</Text>}

      <TextArea
        formLayout="side-by-side"
        label="Note"
        placeholder="Optional — why you decided this way"
        value={note}
        autosize
        minRows={2}
        onChange={(e) => setNote(e.currentTarget.value)}
      />

      <div className="stu-actions">
        <Button variant="outline" size="small" loading={busy} onClick={() => decide('reject')}>
          Reject
        </Button>
        <Button variant="solid" size="small" loading={busy} onClick={() => decide('promote')}>
          Promote to current
        </Button>
      </div>
    </Stack>
  )
}
