// The reading view, and the reason the tool exists.
//
// Three rules it never breaks:
//   1. `original_text` and the correction are shown together, never merged into one "current"
//      string. Seeing what the machine changed *is* the hallucination check.
//   2. A tag never renders without its confidence and justification within reach. A tag with a
//      vague justification should look weak, because it is.
//   3. A line is a place. `/interviews/:cid/lines/:seq` opens the transcript with that line
//      expanded, so a finding's citation can link straight to the sentence it rests on.
//
// The transcript is one long page with one scrollbar. `recursica-skill-screen-priority` forbids
// an inner scrolling region, which rules out the list-beside-detail layout this would otherwise
// want — the detail opens inline, in the flow, where the line already is.

import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import {
  Badge, Button, Checkbox, Chip, Dropdown, Group, Layer, Stack, Text, TextArea, TextField, Title,
  Tooltip,
} from '@recursica/mantine-adapter'
import { api } from '../api.js'
import { Empty, Page, Section } from '../shell/Page.jsx'
import { Figures } from '../shell/Figures.jsx'
import { countMismatch } from './Interviews.jsx'

export function Interview({ identity, revision, onChanged }) {
  const { cid, seq } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [meta, setMeta] = useState(null)
  const [error, setError] = useState(null)
  const [onlyTagged, setOnlyTagged] = useState(false)
  const [onlyCorrected, setOnlyCorrected] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    setData(null)
    api.transcript(cid).then(setData).catch((e) => setError(e.message))
  }, [cid, revision])

  useEffect(() => {
    api.conversations()
      .then((rows) => setMeta(rows.find((r) => r.conversation_id === cid) ?? null))
      .catch(() => setMeta(null))
  }, [cid, revision])

  const lines = data?.lines ?? []

  // Filters arrive unapplied and stay visible. `recursica-skill-defaults` forbids a default that
  // silently narrows the collection: a filtered transcript reads as a short interview, which is
  // exactly the misreading this tool exists to prevent.
  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return lines.filter((l) => {
      if (onlyTagged && !l.tags?.length) return false
      if (onlyCorrected && !l.cleaned_text) return false
      if (needle) {
        const hay = `${l.original_text ?? ''} ${l.cleaned_text ?? ''}`.toLowerCase()
        if (!hay.includes(needle)) return false
      }
      return true
    })
  }, [lines, onlyTagged, onlyCorrected, search])

  if (error) return <Page title="Interview" trail={TRAIL}><Text>{error}</Text></Page>
  if (!data) return null

  const title = meta?.document_name ?? cid
  const corrected = lines.filter((l) => l.cleaned_text).length
  const edited = lines.filter((l) => l.is_human_edited).length
  const conflicts = lines.filter((l) => l.source_changed_since_edit)
  const filtering = onlyTagged || onlyCorrected || search.trim()

  return (
    <Page
      title={title}
      trail={TRAIL}
    >
      <Figures
        items={[
          { label: 'Transcript lines', value: lines.length },
          { label: 'Tagged lines', value: lines.filter((l) => l.tags?.length).length },
          { label: 'AI corrections', value: corrected },
          { label: 'Human corrections', value: edited },
        ]}
      />

      {meta && countMismatch(meta) && (
        <Notice tone="alert" title="Line count does not match">
          The ingest recorded {String(meta.line_count)} lines but {lines.length} are present.
          Treat this transcript as incomplete until Scribe is re-run — anything concluded from it
          rests on a partial read.
        </Notice>
      )}

      {conflicts.length > 0 && (
        <Notice tone="warning" title="The source changed under your corrections">
          {conflicts.length} line{conflicts.length === 1 ? '' : 's'} you corrected {conflicts.length === 1 ? 'has' : 'have'} since
          been re-ingested with different source text. Your correction still stands and nothing
          overwrote it — but it was made against wording that is no longer there, so only you can
          say whether it still applies.
        </Notice>
      )}

      <Section
        title="Transcript"
      >
        <Layer layer={1}>
          <Group gap="lg" align="flex-end" wrap="wrap">
            <Checkbox
              label="Only tagged lines"
              checked={onlyTagged}
              onChange={(e) => setOnlyTagged(e.currentTarget.checked)}
            />
            <Checkbox
              label={`Only corrected lines (${corrected + edited})`}
              checked={onlyCorrected}
              onChange={(e) => setOnlyCorrected(e.currentTarget.checked)}
              disabled={corrected + edited === 0}
            />
            <TextField
              label="Search this transcript"
              placeholder="Any words in the line"
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
            />
          </Group>
          {/* Filters that are on must say so in words, next to the count they changed. */}
          {filtering && (
            <Text variant="body-small">
              Showing {visible.length} of {lines.length} lines. Filters are applied.
            </Text>
          )}
        </Layer>

        {visible.length === 0
          ? <Empty>No line in this transcript matches those filters.</Empty>
          : (
            <ol className="stu-lines">
              {visible.map((line) => (
                <Line
                  key={line.line_id}
                  line={line}
                  cid={cid}
                  open={String(line.line_sequence_number) === seq}
                  onToggle={() => navigate(
                    String(line.line_sequence_number) === seq
                      ? `/interviews/${encodeURIComponent(cid)}`
                      : `/interviews/${encodeURIComponent(cid)}/lines/${line.line_sequence_number}`,
                  )}
                  identity={identity}
                  onChanged={onChanged}
                />
              ))}
            </ol>
          )}
      </Section>
    </Page>
  )
}

const TRAIL = [{ label: 'Interviews', to: '/interviews' }]

/**
 * One line. Collapsed it shows who spoke, the text, and the tags. Expanded it adds every piece of
 * provenance behind those two things, plus the controls to disagree with them.
 */
function Line({ line, cid, open, onToggle, identity, onChanged }) {
  const ref = useRef(null)

  useEffect(() => {
    if (open) ref.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [open])

  const speaker = line.participant_name ?? line.participant_id ?? 'Unattributed'
  const machineCorrected = Boolean(line.ai_cleaned_text)

  return (
    <li className="stu-line" ref={ref} id={`line-${line.line_sequence_number}`}>
      <div className="stu-line__gutter">
        <Text variant="caption">{line.line_sequence_number}</Text>
      </div>

      <Stack gap="xs">
        <Group gap="sm" align="baseline" wrap="wrap">
          <Text variant="subtitle-small">{speaker}</Text>
          {line.participant_type && <Text variant="caption">{line.participant_type}</Text>}
          {line.time && <Text variant="caption">{line.time}</Text>}
          {line.is_human_edited && <Badge variant="success">corrected by you</Badge>}
          {!line.is_human_edited && machineCorrected && <Badge variant="warning">AI corrected</Badge>}
        </Group>

        <TextPair line={line} />

        {line.tags?.length > 0 && (
          <Group gap="xs" wrap="wrap">
            {line.tags.map((t) => (
              // A tag is one of several metadata values on the object, so it is a chip, not a
              // badge. The tooltip carries the justification — a tag whose reasoning you cannot
              // reach in one move is a tag you have to take on trust.
              <Tooltip key={t.tag_id} label={t.justification || 'No justification was recorded'} multiline w={340}>
                <Chip checked readOnly error={!t.justification}>
                  {t.tag_id} · {formatConfidence(t.confidence)}
                </Chip>
              </Tooltip>
            ))}
          </Group>
        )}

        <div>
          <Button variant="text" size="small" onClick={onToggle}>
            {open ? 'Hide provenance' : 'Show provenance'}
          </Button>
        </div>

        {open && (
          <LineDetail line={line} cid={cid} identity={identity} onChanged={onChanged} />
        )}
      </Stack>
    </li>
  )
}

/**
 * The source text and the correction, always both. When they differ the original is struck
 * through so the change is visible without relying on colour, which is what makes this readable
 * to someone who cannot see the hue difference.
 */
function TextPair({ line }) {
  const current = line.cleaned_text
  if (!current) {
    return <div className="stu-text"><Text variant="body">{line.original_text}</Text></div>
  }

  return (
    <Stack gap={2}>
      <div className="stu-text stu-text--replaced"><Text variant="body">{line.original_text}</Text></div>
      <div className="stu-text"><Text variant="body">{current}</Text></div>
    </Stack>
  )
}

function LineDetail({ line, cid, identity, onChanged }) {
  return (
    <div className="stu-detail">
    <Layer layer={2}>
      <Stack gap="md">
        <Provenance line={line} />
        <CorrectionForm line={line} cid={cid} identity={identity} onChanged={onChanged} />
        <TagForm line={line} cid={cid} identity={identity} onChanged={onChanged} />
      </Stack>
    </Layer>
    </div>
  )
}

function Provenance({ line }) {
  const rows = [
    ['Line id', line.line_id],
    ['Source text', line.original_text],
    ['AI correction', line.ai_cleaned_text ?? 'None — the machine left this line alone'],
    ['Correction type', line.correction_type ?? 'None'],
    ['Correction confidence', line.confidence_score == null ? 'Not scored' : String(line.confidence_score)],
    ['Dictionary terms relied on', line.dictionary_term_ids?.length
      ? line.dictionary_term_ids.join(', ')
      : 'None'],
    ['Your correction', line.is_human_edited
      ? (line.cleaned_text ?? 'You cleared the correction — the source text stands')
      : 'None'],
    ['Corrected by you at', line.edited_at?.value ?? line.edited_at ?? '—'],
  ]

  return (
    <Stack gap="xs">
      <Text variant="subtitle">Where this line comes from</Text>
      <dl className="stu-facts">
        {rows.map(([label, value]) => (
          <div key={label} className="stu-facts__row">
            <dt><Text variant="caption">{label}</Text></dt>
            <dd><Text variant="body-small">{String(value)}</Text></dd>
          </div>
        ))}
      </dl>
    </Stack>
  )
}

function CorrectionForm({ line, cid, identity, onChanged }) {
  const [value, setValue] = useState(line.cleaned_text ?? '')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState(null)

  useEffect(() => { setValue(line.cleaned_text ?? '') }, [line.cleaned_text])

  async function save() {
    setBusy(true); setProblem(null)
    try {
      await api.setCleanedText(line.line_id, {
        pubkey: identity.pubkey, conversation_id: cid, cleaned_text: value, note: note || null,
      })
      setNote('')
      onChanged()
    } catch (e) { setProblem(e.message) } finally { setBusy(false) }
  }

  async function withdraw() {
    setBusy(true); setProblem(null)
    try {
      await api.clearLineEdit(line.line_id, {
        pubkey: identity.pubkey, conversation_id: cid, note: note || null,
      })
      setNote('')
      onChanged()
    } catch (e) { setProblem(e.message) } finally { setBusy(false) }
  }

  return (
    <Stack gap="sm">
      <Text variant="subtitle">Correct this line</Text>

      {/* The paragraph that used to sit here went with every other piece of sub-text in the app.
          Two of its three sentences were reassurance about where the edit is stored, which is not
          something the person making it has to act on. The third told them what an empty box means,
          and that is a rule about this field — so it moved onto the field, which is where
          `recursica-skill-forms` puts a control's own rules and where it is still legible at the
          moment of typing rather than three elements above it. */}
      <TextArea
        formLayout="side-by-side"
        label="Corrected text"
        description="Empty records that the source text was right as it stood."
        value={value}
        autosize
        minRows={2}
        onChange={(e) => setValue(e.currentTarget.value)}
      />
      <TextField
        formLayout="side-by-side"
        label="Why"
        placeholder="What the machine got wrong, or why nothing needed changing"
        value={note}
        onChange={(e) => setNote(e.currentTarget.value)}
      />

      {problem && <Text variant="body-small">{problem}</Text>}

      {/* The page's primary action sits at the end, on the right. */}
      <div className="stu-actions">
        {line.is_human_edited && (
          <Button variant="outline" size="small" onClick={withdraw} loading={busy}>
            Withdraw my correction
          </Button>
        )}
        <Button size="small" onClick={save} loading={busy}>Save correction</Button>
      </div>
    </Stack>
  )
}

function TagForm({ line, cid, identity, onChanged }) {
  const [library, setLibrary] = useState(null)
  const [tagId, setTagId] = useState(null)
  const [justification, setJustification] = useState('')
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState(null)

  useEffect(() => { api.tagLibrary().then(setLibrary).catch(() => setLibrary([])) }, [])

  const applied = new Set((line.tags ?? []).map((t) => t.tag_id))
  const options = (library ?? [])
    .filter((t) => t.active && !applied.has(t.tag))
    .map((t) => ({ value: t.tag, label: `${t.tag} — ${t.type}` }))

  async function add() {
    setBusy(true); setProblem(null)
    try {
      await api.addTag(line.line_id, {
        pubkey: identity.pubkey, conversation_id: cid, tag_id: tagId, justification,
      })
      setTagId(null); setJustification('')
      onChanged()
    } catch (e) { setProblem(e.message) } finally { setBusy(false) }
  }

  async function remove(id) {
    setBusy(true); setProblem(null)
    try {
      await api.removeTag(line.line_id, id, { pubkey: identity.pubkey, conversation_id: cid })
      onChanged()
    } catch (e) { setProblem(e.message) } finally { setBusy(false) }
  }

  return (
    <Stack gap="sm">
      <Text variant="subtitle">Tags on this line</Text>

      {line.tags?.length
        ? (
          <ul className="stu-taglist">
            {line.tags.map((t) => (
              <li key={t.tag_id}>
                <Stack gap={2}>
                  <Group gap="sm" align="baseline" wrap="wrap">
                    <Text variant="subtitle-small">{t.tag_id}</Text>
                    <Text variant="caption">{t.tag_type ?? 'type not in library'}</Text>
                    <Text variant="caption">confidence {formatConfidence(t.confidence)}</Text>
                    <Text variant="caption">{t.added_by ? 'added by hand' : `by ${t.tagged_by ?? 'unknown'}`}</Text>
                  </Group>
                  <Text variant="body-small">
                    {t.justification || 'No justification was recorded — this tag cannot be checked.'}
                  </Text>
                  <div>
                    <Button variant="text" size="small" onClick={() => remove(t.tag_id)} loading={busy}>
                      Remove this tag
                    </Button>
                  </div>
                </Stack>
              </li>
            ))}
          </ul>
        )
        : <Empty>No tag has been applied to this line.</Empty>}

      <Dropdown
        formLayout="side-by-side"
        label="Add a tag"
        description="Only tags already in the library. A tag id invented on a line cannot be counted or filtered."
        placeholder="Choose a tag"
        data={options}
        value={tagId}
        onChange={setTagId}
        searchable
      />
      <TextField
        formLayout="side-by-side"
        label="Justification"
        description="Quote what in this line supports the tag. Held to the same bar as the agents."
        value={justification}
        onChange={(e) => setJustification(e.currentTarget.value)}
      />

      {problem && <Text variant="body-small">{problem}</Text>}

      <div className="stu-actions">
        <Button size="small" onClick={add} loading={busy} disabled={!tagId || !justification.trim()}>
          Add tag
        </Button>
      </div>
    </Stack>
  )
}

function Notice({ tone, title, children }) {
  return (
    <div className="stu-notice">
    <Layer layer={2}>
      <Stack gap="xs">
        <Group gap="sm" align="baseline">
          <Badge variant={tone}>{tone === 'alert' ? 'Problem' : 'Needs your eye'}</Badge>
          <Text variant="subtitle-small">{title}</Text>
        </Group>
        <Text variant="body-small">{children}</Text>
      </Stack>
    </Layer>
    </div>
  )
}

export function formatConfidence(value) {
  if (value == null) return 'unscored'
  const n = Number(value)
  return n <= 1 ? `${Math.round(n * 100)}%` : String(n)
}
