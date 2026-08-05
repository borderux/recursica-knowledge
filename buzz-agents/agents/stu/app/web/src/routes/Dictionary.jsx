// The project dictionary, and the human gate on it.
//
// Lexicon can only ever write `proposed`. Everything that moves a term off that status happens
// here, which makes this screen the enforcement point for the rule the schema describes: an agent
// never approves the terms that license its own corrections.
//
// Terms are shown with the quotes that produced them, so the decision is made against evidence
// rather than against a plausible-sounding definition.

import { useEffect, useState } from 'react'
import { Link as RouterLink } from 'react-router'
import { Badge, Button, Group, Layer, Link, Stack, Text, TextField, Title } from '@recursica/mantine-adapter'
import { api } from '../api.js'
import { Empty, Page, Section } from '../shell/Page.jsx'

export function Dictionary({ identity, revision, onChanged }) {
  const [rows, setRows] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.dictionary().then(setRows).catch((e) => setError(e.message))
  }, [revision])

  if (error) return <Page title="Dictionary"><Text>{error}</Text></Page>
  if (!rows) return null

  const waiting = rows.filter((t) => t.status === 'proposed' || t.status === 'needs_clarification')
  const settled = rows.filter((t) => !waiting.includes(t))

  return (
    <Page
      title="Dictionary"
      lede="The terms this project has agreed on. Only a person moves a term off 'proposed'."
    >
      <Section
        title="Waiting on you"
        note={waiting.length
          ? 'Each decision is recorded against your identity.'
          : undefined}
      >
        {waiting.length === 0
          ? <Empty>Nothing is waiting. Every term has been decided.</Empty>
          : waiting.map((term) => (
            <Term key={term.term_id} term={term} identity={identity} onChanged={onChanged} />
          ))}
      </Section>

      <Section title="Decided" note="Still editable — a decision can be revisited, and the change is logged.">
        {settled.length === 0
          ? <Empty>No term has been decided yet.</Empty>
          : settled.map((term) => (
            <Term key={term.term_id} term={term} identity={identity} onChanged={onChanged} />
          ))}
      </Section>
    </Page>
  )
}

const DECISIONS = [
  { status: 'active', label: 'Approve' },
  { status: 'rejected', label: 'Reject' },
  { status: 'needs_clarification', label: 'Unclear' },
]

function Term({ term, identity, onChanged }) {
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState(null)

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
        </Group>

        <Text variant="body">{term.definition ?? 'No definition was recorded for this term.'}</Text>

        {term.variants?.length > 0 && (
          <Text variant="body-small">Also written: {term.variants.join(', ')}</Text>
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
