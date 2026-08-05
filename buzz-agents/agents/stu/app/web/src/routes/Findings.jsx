// Findings, and the check on them.
//
// Every citation shows two things side by side: the quote the agent recorded, and what the line
// says now. Drift between them is on screen rather than taken on trust. The write tool already
// refuses a citation to a line that does not exist, so a finding here always points somewhere
// real — this screen answers the next question, which is whether it points somewhere that
// supports it.

import { useEffect, useState } from 'react'
import { Link as RouterLink } from 'react-router'
import { Badge, Button, Group, Layer, Link, Stack, Text, TextField, Title } from '@recursica/mantine-adapter'
import { api } from '../api.js'
import { Empty, Page, Section } from '../shell/Page.jsx'
import { formatConfidence } from './Interview.jsx'

export function Findings({ identity, revision, onChanged }) {
  const [rows, setRows] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.findings().then(setRows).catch((e) => setError(e.message))
  }, [revision])

  if (error) return <Page title="Findings"><Text>{error}</Text></Page>
  if (!rows) return null

  const waiting = rows.filter((f) => f.status === 'proposed')
  const settled = rows.filter((f) => f.status !== 'proposed')

  return (
    <Page
      title="Findings"
      lede="What the analysis claims, and the lines each claim rests on."
    >
      <Section title="Waiting on you">
        {waiting.length === 0
          ? <Empty>Nothing is waiting. Analyst writes findings here as 'proposed' — it has no way to approve its own.</Empty>
          : waiting.map((f) => (
            <Finding key={f.finding_id} finding={f} identity={identity} onChanged={onChanged} />
          ))}
      </Section>

      {settled.length > 0 && (
        <Section title="Decided">
          {settled.map((f) => (
            <Finding key={f.finding_id} finding={f} identity={identity} onChanged={onChanged} />
          ))}
        </Section>
      )}
    </Page>
  )
}

const DECISIONS = [
  { status: 'active', label: 'Approve' },
  { status: 'rejected', label: 'Reject' },
]

function Finding({ finding, identity, onChanged }) {
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState(null)

  async function decide(status) {
    setBusy(true); setProblem(null)
    try {
      await api.decideFinding(finding.finding_id, {
        pubkey: identity.pubkey, status, note: note || null,
      })
      setNote('')
      onChanged()
    } catch (e) { setProblem(e.message) } finally { setBusy(false) }
  }

  const evidence = finding.evidence ?? []

  return (
    <div className="stu-record">
    <Layer layer={1}>
      <Stack gap="sm">
        <Group gap="sm" align="baseline" wrap="wrap">
          <Title order={3}>{finding.title}</Title>
          <Badge variant={finding.status === 'active' ? 'success' : finding.status === 'rejected' ? 'alert' : 'warning'}>
            {finding.status}
          </Badge>
          <Text variant="caption">{finding.finding_type} · {finding.scope}</Text>
          <Text variant="caption">confidence {formatConfidence(finding.confidence)}</Text>
        </Group>

        <Text variant="body">{finding.statement}</Text>
        {finding.detail && <Text variant="body-small">{finding.detail}</Text>}

        <Stack gap={4}>
          <Text variant="caption">Evidence — {evidence.length} line{evidence.length === 1 ? '' : 's'}</Text>
          {evidence.length === 0
            ? <Text variant="body-small">
                None. The write tool refuses a finding with no evidence, so an empty list here
                means the row predates that gate — treat the claim as unsupported.
              </Text>
            : (
              <ul className="stu-quotes">
                {evidence.map((e, i) => (
                  <li key={`${e.line_id}-${i}`}>
                    <Text variant="body-small">Quoted: “{e.quote}”</Text>
                    {/* What the line says now. If these two have drifted apart, the finding is
                        resting on wording that has since been corrected. */}
                    <Text variant="body-small">
                      Line now: {e.line_text ?? 'this line no longer exists'}
                    </Text>
                    {e.quote && e.line_text && e.quote.trim() !== e.line_text.trim() && (
                      <Badge variant="warning">quote and line differ</Badge>
                    )}
                    <Link
                      component={RouterLink}
                      to={`/interviews/${encodeURIComponent(e.conversation_id)}/lines/${e.line_sequence_number}`}
                    >
                      Read it in context
                    </Link>
                  </li>
                ))}
              </ul>
            )}
        </Stack>

        <Text variant="caption">
          Produced by {finding.produced_by ?? 'unknown'}
          {finding.reviewed_by && ` · reviewed by ${finding.reviewed_by}`}
        </Text>

        {problem && <Text variant="body-small">{problem}</Text>}

        <TextField
          label="Note"
          placeholder="Optional — why you decided this way"
          value={note}
          onChange={(e) => setNote(e.currentTarget.value)}
        />

        <div className="stu-actions">
          {DECISIONS.filter((d) => d.status !== finding.status).map((d) => (
            <Button
              key={d.status}
              // Approve is the action reached for most often; it gets the solid treatment.
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
