// Findings, and the check on them.
//
// Two jobs, and the page used to run them together. Triaging what the analysis just produced and
// browsing what has already been vetted want opposite things: the first wants everything unread
// in front of you, the second wants the in-progress noise gone. So the page is two tabs, each
// with its own route.
//
//   Inbox      — what is waiting on a person. Findings and open questions, grouped.
//   Confirmed  — what survived review, browsable by anyone. Rejected rows live here too, behind
//                their own view, because a rejection is a record and not a deletion.
//
// Every citation still shows two things side by side: the quote the agent recorded, and what the
// line says now. Drift between them is on screen rather than taken on trust. The write tool
// already refuses a citation to a line that does not exist, so a finding here always points
// somewhere real — this screen answers the next question, which is whether it points somewhere
// that supports it.

import { useEffect, useMemo, useState } from 'react'
import { Link as RouterLink, Navigate, useNavigate, useParams } from 'react-router'
import {
  Accordion, AccordionItem, Badge, Button, Chip, Dropdown, Group, Layer, Link, SegmentedControl,
  Stack, Tabs, Text, TextArea, TextField, Title,
} from '@recursica/mantine-adapter'
import { api } from '../api.js'
import { Empty, Page, Section } from '../shell/Page.jsx'
import { QuoteContext } from '../shell/QuoteContext.jsx'
import { formatConfidence } from './Interview.jsx'

/**
 * The two kinds that are not ordinary claims, each a `finding_type` of its own.
 *
 * The prefix tests are a bridge, not a convention to keep. Analyst's only writable surface is
 * `write_finding`, and until these existed as types it had nowhere to record that a row was
 * anything other than a claim — so it wrote the kind into the title, where nothing could filter or
 * count it. Reading the prefixes here means the rows already in the dataset land in the right group
 * today instead of after a re-run. Once Analyst writes the types, these clauses stop matching
 * anything and should go.
 */
const LEGACY_QUESTION = /^\s*OPEN QUESTIONS?\s*:/i
const LEGACY_HYPOTHESIS = /^\s*HYPOTHES[EI]S\s*:/i

export function isQuestion(finding) {
  return finding.finding_type === 'open_question' || LEGACY_QUESTION.test(finding.title ?? '')
}

/**
 * A hypothesis is a claim the analysis is offering tentatively, not a question it could not
 * settle. That difference is why it is its own type rather than being folded into
 * `open_question`: conflating them would lose the distinction between "I think this, weakly" and
 * "I cannot tell", which are different things to a reviewer and want different scrutiny.
 *
 * It keeps Approve and Reject rather than the answer form, because it is a claim and a claim is
 * judged on its evidence. What it gains is a name the dataset can count and a group of its own,
 * so nobody reads a 0.45-confidence speculation as a finding because both said "theme".
 */
export function isHypothesis(finding) {
  return finding.finding_type === 'hypothesis' || LEGACY_HYPOTHESIS.test(finding.title ?? '')
}

/** The two tabs, which are also the two routes under `/findings`. */
const TABS = ['inbox', 'confirmed']

/** `recursica-skill-badges-chips`'s ceiling for a chip group: 7 ± 2, and `tag_ids` is unbounded. */
const MAX_VISIBLE_THEMES = 9

export function Findings({ identity, revision, onChanged }) {
  const { tab = 'inbox' } = useParams()
  const navigate = useNavigate()
  const [rows, setRows] = useState(null)
  const [error, setError] = useState(null)

  // The panel's state lives here rather than inside a card, because only one may be open at a
  // time — `recursica-skill-panels-modals`: one side is in use at a time, and a panel is never
  // nested in another. Holding it at the page makes that structural rather than a hope.
  const [context, setContext] = useState(null)

  useEffect(() => {
    api.findings().then(setRows).catch((e) => setError(e.message))
  }, [revision])

  // An address that is not one of the tabs is not a location this page has. Redirect rather than
  // render the Inbox under a URL that names something else — a tab that survives a refresh is the
  // whole reason these are routes.
  if (!TABS.includes(tab)) return <Navigate to="/findings/inbox" replace />

  if (error) return <Page title="Findings"><Text>{error}</Text></Page>
  if (!rows) return null

  const waiting = rows.filter((f) => f.status === 'proposed')

  return (
    <Page title="Findings">
      {/* Tabs, not navigation: both panels are about one subject and either could be looked at
          first. Each carries its own route so it survives a refresh and works with back — a house
          preference stated outright in recursica-skill-tabs. */}
      {/* keepMounted={false} because the panels are whole screens, not a few fields. Left at the
          default, the Inbox's 35 cards and the Confirmed tab's filter bar and live region were all
          in the DOM at once whichever tab was showing — measured in the running app: 36 card
          headings and both switchers present on both tabs, and a hidden aria-live region reading
          "1 confirmed." while the Inbox was open. A live region that is not on screen has no
          business being able to speak. */}
      <Tabs value={tab} keepMounted={false} onChange={(next) => navigate(`/findings/${next}`)}>
        <Tabs.List>
          <Tabs.Tab
            value="inbox"
            // The count is metadata on the tab, not a control: it says how much work is behind
            // the label, which is the one thing a reviewer wants before clicking.
            rightSection={waiting.length > 0 ? <Badge variant="warning">{waiting.length}</Badge> : null}
          >
            Inbox
          </Tabs.Tab>
          <Tabs.Tab value="confirmed">Confirmed</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="inbox">
          <Inbox
            rows={waiting}
            identity={identity}
            onChanged={onChanged}
            onOpenContext={setContext}
          />
        </Tabs.Panel>

        <Tabs.Panel value="confirmed">
          <Confirmed
            rows={rows}
            identity={identity}
            onChanged={onChanged}
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

// ------------------------------------------------------------------------------ inbox

const GROUPINGS = [
  { value: 'interview', label: 'Interview' },
  { value: 'type', label: 'Type' },
]

/**
 * A named segmented control.
 *
 * `recursica-skill-segmented-control` requires the group to carry an accessible name — "without it
 * the user hears three options and no question" — and the component takes no `label` prop: it
 * wraps Mantine's, whose own API has none. So the name is supplied here, visibly and
 * programmatically at once, rather than left off.
 *
 * **This is a gap in the adapter, not a styling choice.** A control the house requires to be named
 * has no way to accept a name. It wants a `label` prop, the way `Dropdown` and `TextField` have
 * one; until it has, every caller has to rebuild this.
 */
function Switcher({ id, label, children }) {
  return (
    <Stack gap={4}>
      <div id={id}><Text variant="caption">{label}</Text></div>
      {/* Mantine renders real radio inputs, so the wrapper is what carries the group name. */}
      <div role="group" aria-labelledby={id}>{children}</div>
    </Stack>
  )
}

function Inbox({ rows, identity, onChanged, onOpenContext }) {
  // Interview first, matching FR-4's "parent grouping" — and it is the grouping that matches how
  // the work arrives, one transcript at a time.
  const [grouping, setGrouping] = useState('interview')

  const groups = useMemo(() => (
    grouping === 'interview' ? byInterview(rows) : byKind(rows)
  ), [rows, grouping])

  if (rows.length === 0) {
    return (
      <Section title="Waiting on you">
        <Empty>
          Nothing is waiting. Analyst writes findings and open questions here as 'proposed' — it
          has no way to approve or answer its own.
        </Empty>
      </Section>
    )
  }

  return (
    <Section title="Waiting on you">
      <Layer layer={1}>
        {/* A view switcher, not a filter — it hides nothing and narrows nothing. That is what a
            segmented control is for, and why this is not in a filter bar. */}
        <Switcher id="inbox-grouping" label="Grouping">
          <SegmentedControl data={GROUPINGS} value={grouping} onChange={setGrouping} />
        </Switcher>
      </Layer>

      {groups.map((group) => (
        <Stack key={group.key} gap="sm">
          <Group gap="sm" align="baseline" wrap="wrap">
            <Title order={3}>{group.label}</Title>
            <Text variant="caption">
              {group.items.length} item{group.items.length === 1 ? '' : 's'}
            </Text>
          </Group>
          {group.items.map((f) => (
            <Record
              key={f.finding_id}
              finding={f}
              identity={identity}
              onChanged={onChanged}
              onOpenContext={onOpenContext}
              openEvidenceByDefault
            />
          ))}
        </Stack>
      ))}
    </Section>
  )
}

/**
 * One group per interview, with open questions ahead of findings inside it — FR-4's "sorted by
 * type within the interview". Questions come first because they block: a claim can be judged on
 * its evidence, and a question is the analysis saying it could not be.
 */
function byInterview(rows) {
  const groups = new Map()
  for (const f of rows) {
    const key = f.conversation_id ?? '—'
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        // A finding with no conversation_id is a cross-interview one, which is a real state the
        // schema allows — not a broken row, and it must not be filed under a fabricated name.
        label: f.document_name ?? (f.conversation_id ?? 'Across every interview'),
        items: [],
      })
    }
    groups.get(key).items.push(f)
  }
  for (const g of groups.values()) g.items.sort(byKindThenConfidence)
  return [...groups.values()].sort((a, b) => a.label.localeCompare(b.label))
}

/**
 * Grouped by type, in the order a reviewer should meet them: what the analysis could not settle,
 * then what it is only guessing at, then what it is actually claiming. FR-4 named two groups
 * because there were two kinds; a hypothesis is a third kind and reads wrong in either of the
 * others. Empty groups do not render.
 */
const KINDS = [
  { key: 'questions', label: 'Open questions', test: isQuestion },
  { key: 'hypotheses', label: 'Hypotheses', test: isHypothesis },
  { key: 'findings', label: 'Findings', test: (f) => !isQuestion(f) && !isHypothesis(f) },
]

function byKind(rows) {
  return KINDS
    .map((k) => ({ key: k.key, label: k.label, items: rows.filter(k.test).sort(byConfidence) }))
    .filter((g) => g.items.length > 0)
}

/** Same order inside an interview — FR-4's "sorted by type within the interview". */
function kindRank(f) {
  if (isQuestion(f)) return 0
  if (isHypothesis(f)) return 1
  return 2
}

function byKindThenConfidence(a, b) {
  const kind = kindRank(a) - kindRank(b)
  return kind !== 0 ? kind : byConfidence(a, b)
}

function byConfidence(a, b) {
  return (b.confidence ?? 0) - (a.confidence ?? 0)
}

// -------------------------------------------------------------------------- confirmed

const VIEWS = [
  { value: 'active', label: 'Confirmed' },
  { value: 'rejected', label: 'Rejected' },
]

function Confirmed({ rows, identity, onChanged, onOpenContext }) {
  const [view, setView] = useState('active')
  const [interview, setInterview] = useState(null)
  const [theme, setTheme] = useState(null)
  const [text, setText] = useState('')

  const decided = rows.filter((f) => f.status !== 'proposed')
  const inView = decided.filter((f) => f.status === view)

  // Options come from the rows actually present, never from a fixed list: a filter offering a
  // value that matches nothing is a filter that reads as broken data.
  const interviews = useMemo(() => optionsFrom(
    inView, (f) => (f.conversation_id ? [[f.conversation_id, f.document_name ?? f.conversation_id]] : []),
  ), [inView])
  const themes = useMemo(() => optionsFrom(
    inView, (f) => (f.tag_ids ?? []).map((t) => [t, t]),
  ), [inView])

  const visible = useMemo(() => {
    const needle = text.trim().toLowerCase()
    return inView.filter((f) => {
      if (interview && f.conversation_id !== interview) return false
      if (theme && !(f.tag_ids ?? []).includes(theme)) return false
      if (needle) {
        const hay = `${f.title ?? ''} ${f.statement ?? ''} ${f.detail ?? ''} ${f.resolution ?? ''}`
        if (!hay.toLowerCase().includes(needle)) return false
      }
      return true
    })
  }, [inView, interview, theme, text])

  const filtering = Boolean(interview || theme || text.trim())
  // Anything decided that is neither confirmed nor rejected — `superseded`. Reported rather than
  // dropped: a row that appears in no view is indistinguishable from a row that does not exist.
  const elsewhere = decided.filter((f) => f.status !== 'active' && f.status !== 'rejected')

  return (
    <Section title={view === 'active' ? 'Confirmed' : 'Rejected'}>
      {/* The view switcher sits outside the filter bar on purpose. It does not narrow a
          collection — it chooses which collection is on screen — so folding it in would break the
          filter bar's one convention for "not filtering". */}
      <Layer layer={1}>
        <Stack gap="md">
          <Switcher id="confirmed-view" label="View">
            <SegmentedControl data={VIEWS} value={view} onChange={(next) => {
              setView(next)
              // Options are derived from the rows in view, so a filter held across the switch
              // could name something the new view does not contain — an applied filter matching
              // nothing.
              setInterview(null); setTheme(null)
            }} />
          </Switcher>

          <Group gap="lg" align="flex-end" wrap="wrap">
            <Dropdown
              label="Interview"
              placeholder="Any"
              data={interviews}
              value={interview}
              onChange={setInterview}
              searchable
              clearable
              disabled={interviews.length === 0}
            />
            <Dropdown
              label="Theme"
              placeholder="Any"
              data={themes}
              value={theme}
              onChange={setTheme}
              searchable
              clearable
              disabled={themes.length === 0}
            />
            <TextField
              label="Text"
              // The label names a field, per recursica-skill-filters — but this one control reads
              // four of them, which that skill lists as uncovered ("whether a filter may ever be a
              // text search across several fields at once, and how that is labelled"). The
              // description says which, rather than leaving the scope to be guessed at.
              description="Title, statement, detail, and any answer recorded"
              value={text}
              onChange={(e) => setText(e.currentTarget.value)}
            />
          </Group>

          {/* An applied filter has to be visible without opening each control, and a filtered
              count must not read as the size of the collection.
              Announced, not merely re-rendered: filtering moves no focus and the switcher changes
              which collection is on screen, so a screen reader user is told nothing unless the
              count says it. Politely, and it is the only live region on the page. */}
          <div aria-live="polite">
            <Text variant="body-small">
              {filtering
                ? `Showing ${visible.length} of ${inView.length} ${view === 'active' ? 'confirmed' : 'rejected'}. Filters are applied.`
                : `${inView.length} ${view === 'active' ? 'confirmed' : 'rejected'}.`}
            </Text>
          </div>
        </Stack>
      </Layer>

      {elsewhere.length > 0 && (
        <Text variant="body-small">
          {elsewhere.length} decided {elsewhere.length === 1 ? 'row is' : 'rows are'} in neither
          view — {[...new Set(elsewhere.map((f) => f.status))].join(', ')}. Neither confirmed nor
          rejected, so neither tab claims {elsewhere.length === 1 ? 'it' : 'them'}.
        </Text>
      )}

      {visible.length === 0
        ? (
          <Empty>
            {/* Filtered to nothing and never having had anything are different states with
                different next actions, so they do not share a sentence. */}
            {inView.length === 0
              ? view === 'active'
                ? 'Nothing has been approved yet. Approve something in the Inbox and it appears here.'
                : 'Nothing has been rejected.'
              : 'No row matches those filters.'}
          </Empty>
        )
        : visible.map((f) => (
          <Record
            key={f.finding_id}
            finding={f}
            identity={identity}
            onChanged={onChanged}
            onOpenContext={onOpenContext}
          />
        ))}
    </Section>
  )
}

/** Distinct `[value, label]` pairs in first-seen order, as the Dropdown's data shape. */
function optionsFrom(rows, extract) {
  const seen = new Map()
  for (const row of rows) {
    for (const [value, label] of extract(row)) {
      if (!seen.has(value)) seen.set(value, label)
    }
  }
  return [...seen.entries()].map(([value, label]) => ({ value, label }))
}

// ------------------------------------------------------------------------------ record

/**
 * The confidence meter beside a finding's metadata row: five segments, filled proportionally
 * (90% fills 4.5 of them) alongside the number itself. `aria-hidden` throughout — the number is
 * the one channel a screen reader needs, and `recursica-skill-system-conventions` forbids the
 * segments from being the only place the value lives, which the visible number already prevents.
 */
function ConfidenceMeter({ value }) {
  if (value == null) return <Text variant="caption">confidence unscored</Text>

  const filled = Math.max(0, Math.min(5, Number(value) * 5))
  return (
    <Group gap={6} align="center" wrap="nowrap">
      <span className="stu-meter" aria-hidden="true">
        {Array.from({ length: 5 }, (_, i) => (
          <span key={i} className="stu-meter__segment">
            <span
              className="stu-meter__fill"
              style={{ width: `${Math.max(0, Math.min(1, filled - i)) * 100}%` }}
            />
          </span>
        ))}
      </span>
      <Text variant="caption">confidence {formatConfidence(value)}</Text>
    </Group>
  )
}

/** Matches an inline "Seq 127" (or "seq 127") reference inside the analyst's reasoning prose. */
const CITATION_RE = /\bseq\.?\s*\d+\b/gi

/**
 * The reasoning paragraph with every inline sequence reference broken out as its own span, styled
 * as a subtle citation chip — see `.stu-citation` for why this is neither the Chip nor Badge
 * component. `String.split` on a global regex keeps the surrounding prose in order; `String.match`
 * recovers the matched text those gaps were split on, so zipping the two back together rebuilds
 * the paragraph with the citations marked rather than discarding any of it.
 */
function withCitations(text) {
  const prose = text.split(CITATION_RE)
  const citations = text.match(CITATION_RE) ?? []
  return prose.flatMap((part, i) => (
    citations[i] ? [part, <span key={i} className="stu-citation">{citations[i]}</span>] : [part]
  ))
}

/**
 * One row, whatever kind it is. What differs is the decision at the bottom: a claim is approved or
 * rejected, and a question is answered or dismissed. A hypothesis takes the claim's actions — it is
 * a claim, just a weak one — and is marked instead, because the thing a reviewer needs to know
 * about it is that the analysis is not asserting it. Everything above the decision — the evidence,
 * the drift check, the provenance — is the same work and reads the same way for all three.
 *
 * The zones below are ranked, top to bottom: the title is the one dominant element; status, type
 * and confidence are secondary metadata beside it; the statement is the primary takeaway; the
 * analyst's reasoning and the provenance trail are real but secondary, so each stays its own
 * collapsed-by-default `Accordion` item rather than competing with the statement for the same
 * attention. `multiple` because they are independent questions a reviewer may want open together —
 * opening the evidence has no reason to shut the reasoning underneath it.
 *
 * Evidence is the one exception: `openEvidenceByDefault` starts it open on the Inbox, where a
 * quote is what an Approve/Reject decision rests on and `recursica-skill-accordion` puts anything
 * on that critical path on the page itself, not a click away. Confirmed carries no such decision,
 * so it stays collapsed there like every other panel.
 */
function Record({ finding, identity, onChanged, onOpenContext, openEvidenceByDefault = false }) {
  const question = isQuestion(finding)
  const hypothesis = isHypothesis(finding)
  const evidence = finding.evidence ?? []
  const themes = finding.tag_ids ?? []

  return (
    <div className="stu-record">
    <Layer layer={1}>
      <Stack gap="md">
        <Stack gap={4}>
          <Title order={4}>{finding.title}</Title>
          <Group gap="sm" align="center" wrap="wrap">
            <Badge variant={statusVariant(finding.status)}>{finding.status}</Badge>
            {question && <Badge variant="warning">open question</Badge>}
            {hypothesis && <Badge variant="warning">hypothesis</Badge>}
            <Text variant="caption">{finding.finding_type} · {finding.scope}</Text>
            <ConfidenceMeter value={finding.confidence} />
          </Group>
        </Stack>

        {hypothesis && (
          <Text variant="body-small">
            Offered as a hypothesis, not a claim — approving it promotes a guess to a finding, so
            the evidence below carries the whole weight of that decision.
          </Text>
        )}

        {/* `.stu-text` is the same long-form-reading measure `Interview.jsx` gives a transcript
            line's own body text — this is the same kind of content, a paragraph of prose, and the
            card's width otherwise runs the statement edge-to-edge at whatever the page happens to
            measure. */}
        <div className="stu-text">
          <Text variant="body">{finding.statement}</Text>
        </div>

        <hr className="stu-record__divider" />

        {/* Reasoning and evidence share one `Accordion` — they're peers a reviewer weighs
            together. Provenance sits in a separate one below the themes, matching the ranked
            reading order rather than a shared container it has no reason to join. */}
        <Accordion multiple defaultValue={openEvidenceByDefault ? ['evidence'] : undefined}>
          {finding.detail && (
            <AccordionItem value="reasoning" title="Analyst reasoning">
              {/* `accordion-content`'s own padding is theme-owned and not ours to override — see
                  `recursica-skill-accordion`'s "Not your decision" list. This is a second,
                  additive indent on the content we supply, not a change to the component's. */}
              <div className="stu-panel-indent">
                <Text variant="body-small">{withCitations(finding.detail)}</Text>
              </div>
            </AccordionItem>
          )}

          <AccordionItem
            value="evidence"
            title={evidenceTitle(evidence)}
          >
            <div className="stu-panel-indent">
              <Evidence evidence={evidence} onOpenContext={onOpenContext} />
            </div>
          </AccordionItem>
        </Accordion>

        {themes.length > 0 && (
          <Stack gap={4}>
            <Text variant="caption" id={`themes-caption-${finding.finding_id}`}>Themes</Text>
            {/* Tags are chips, not badges, per `recursica-skill-badges-chips` — cardinality alone
                settles it once there is more than one value. But these are read-only, produced by
                the analysis rather than picked by the reviewer, not something to toggle — so
                `checked` stays off. The adapter's own static-chip path takes it from there: with no
                `checked`, `defaultChecked`, `onRemove`, or `onClick`, it applies `tabIndex={-1}` and
                `aria-hidden` to the chip's input itself, which is the one the house wants read-only.
                The group points `aria-labelledby` at the visible "Themes" caption rather than
                spelling every value into an `aria-label` — Mantine's chip text lives in a `<label>`
                that stays in the accessibility tree regardless of the input's own `aria-hidden`, so
                an `aria-label` enumerating the values would have announced them a second time. */}
            <div role="group" aria-labelledby={`themes-caption-${finding.finding_id}`} className="stu-chip-row">
              {themes.slice(0, MAX_VISIBLE_THEMES).map((t) => (
                <Chip key={t}>{t}</Chip>
              ))}
              {/* `recursica-skill-badges-chips`: a chip group holds 7 ± 2 items. `tag_ids` carries
                  no such ceiling, so past it this reads as a count rather than growing the row
                  further. */}
              {themes.length > MAX_VISIBLE_THEMES && (
                <Text variant="caption">+{themes.length - MAX_VISIBLE_THEMES} more</Text>
              )}
            </div>
          </Stack>
        )}

        <Accordion>
          <AccordionItem value="provenance" title="Provenance & corrections">
            {/* `className` on a Recursica component is stripped by the adapter's anti-override
                layer unless `overStyled` is passed — see `filterStylingProps`. The low-emphasis
                opacity has to land on a plain wrapper instead, not on the `Text` itself. The
                extra indent is additive to our own content, not an override of the component's
                own theme-owned padding — see the same note on the reasoning/evidence panels. */}
            <div className="stu-panel-indent stu-muted">
              <Stack gap={4}>
                <Text variant="caption">
                  Produced by {finding.produced_by ?? 'unknown'}
                  {finding.reviewed_by && ` · reviewed by ${finding.reviewed_by}`}
                </Text>
                {finding.notes && (
                  <Text variant="body-small">Note on the record: {finding.notes}</Text>
                )}
              </Stack>
            </div>
          </AccordionItem>
        </Accordion>

        <hr className="stu-record__divider" />

        {question
          ? <Resolution finding={finding} identity={identity} onChanged={onChanged} />
          : <Decision finding={finding} identity={identity} onChanged={onChanged} />}
      </Stack>
    </Layer>
    </div>
  )
}

/**
 * Has the quote drifted from the line it cites?
 *
 * Containment, not equality. A quote is a fragment of a line by design — Analyst is told to quote
 * verbatim from the line, not to quote the whole of it — so testing equality flagged drift on
 * essentially every citation. Seen in the running app: three of three citations on one finding
 * carried the warning, all three of them fine. A badge that is always on is not a signal, and this
 * one is the traceability check the page exists to make, so a false positive on every row is worse
 * than no badge at all.
 *
 * Whitespace is normalised because the stored line wraps and the quote does not.
 */
function hasDrifted(e) {
  if (!e.quote || !e.line_text) return false
  const flat = (s) => s.replace(/\s+/g, ' ').trim().toLowerCase()
  return !flat(e.line_text).includes(flat(e.quote))
}

/**
 * The evidence accordion's own label, so the drift check reads even while the panel is collapsed
 * — it is the one warning on this card that must not go two clicks deep. Silent when nothing has
 * drifted, so the common case still reads as the plain count it always was.
 */
function evidenceTitle(evidence) {
  const base = `Evidence — ${evidence.length} supporting quote${evidence.length === 1 ? '' : 's'}`
  const drifted = evidence.filter(hasDrifted).length
  if (drifted === 0) return base
  return drifted === 1
    ? `${base}, 1 no longer matches its line`
    : `${base}, ${drifted} no longer match their lines`
}

/**
 * The evidence list, once its accordion item is open. The count and the reveal control are the
 * accordion header itself now — see the `title` on the "evidence" `AccordionItem` in `Record` —
 * so this renders only what opening it was for.
 */
function Evidence({ evidence, onOpenContext }) {
  if (evidence.length === 0) {
    return (
      <Text variant="body-small">
        None. The write tool refuses a finding with no evidence, so an empty list here
        means the row predates that gate — treat the claim as unsupported.
      </Text>
    )
  }

  return (
    <ul className="stu-quotes">
      {evidence.map((e, i) => (
        <EvidenceItem key={`${e.line_id}-${i}`} evidence={e} siblings={evidence} onOpenContext={onOpenContext} />
      ))}
    </ul>
  )
}

/**
 * One cited line. The quote leads, emphasized — it is what the finding rests on. What the line
 * says now is real but secondary, so it stays in the same de-emphasized caption treatment it has
 * always had — but it prints unconditionally rather than behind its own toggle. Evidence is
 * already one fold inside the Analyst reasoning/Evidence accordion; a second, per-quote disclosure
 * nested inside that made it two accordions deep for no reading gain, since this line is short and
 * costs nothing to show plainly.
 */
function EvidenceItem({ evidence: e, siblings, onOpenContext }) {
  return (
    <li>
      <Stack gap={4}>
        <Text variant="body">“{e.quote}”</Text>
        {hasDrifted(e) && <Badge variant="warning">quote is no longer in this line</Badge>}

        {/* Same measure as `.stu-text`'s long-form reading rule — the raw line can run to a full
            transcript sentence, and an unbounded caption was the "super long, hard to read" line. */}
        <div className="stu-muted stu-context-line">
          <Text variant="caption">Line now: {e.line_text ?? 'this line no longer exists'}</Text>
        </div>

        <Group gap="sm" wrap="wrap">
          {/* A button, because it opens a panel beside this page rather than going
              anywhere — a panel is invoked, not navigated to, and takes no history entry. */}
          <Button
            variant="text"
            size="small"
            onClick={() => onOpenContext({ citation: e, siblings })}
          >
            Read it in context
          </Button>
          {/* And the page, for reading past the window the panel holds. */}
          <Link
            component={RouterLink}
            to={`/interviews/${encodeURIComponent(e.conversation_id)}/lines/${e.line_sequence_number}`}
          >
            Open the transcript
          </Link>
        </Group>
      </Stack>
    </li>
  )
}

const DECISIONS = [
  { status: 'active', label: 'Approve' },
  { status: 'rejected', label: 'Reject' },
]

function Decision({ finding, identity, onChanged }) {
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

  return (
    <Stack gap="sm">
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
  )
}

/**
 * The three resolution paths, in one form — FR-10 and FR-11.
 *
 * A reviewer types an answer, or edits the agent's assumed one, or accepts that assumption
 * unchanged. All three are the same act from the record's point of view: a person put an answer
 * on this question. So there is one box, pre-filled with the agent's assumption when there is
 * one, and every path is available on every question without the reviewer choosing a mode first.
 *
 * `proposed_answer` stays visible above it rather than being replaced by the edit, so what the
 * agent would have assumed remains checkable after a person has decided otherwise.
 */
function Resolution({ finding, identity, onChanged }) {
  const [answer, setAnswer] = useState(finding.resolution ?? finding.proposed_answer ?? '')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState(null)

  useEffect(() => {
    setAnswer(finding.resolution ?? finding.proposed_answer ?? '')
  }, [finding.resolution, finding.proposed_answer])

  async function send(body) {
    setBusy(true); setProblem(null)
    try {
      await api.resolveQuestion(finding.finding_id, { pubkey: identity.pubkey, ...body })
      setNote('')
      onChanged()
    } catch (e) { setProblem(e.message) } finally { setBusy(false) }
  }

  const assumed = finding.proposed_answer
  const untouched = assumed != null && answer.trim() === assumed.trim()

  return (
    <Stack gap="sm">
      <Text variant="subtitle-small">Resolve this question</Text>

      {assumed
        ? (
          <Stack gap={2}>
            <Text variant="caption">What the analysis would assume if nobody rules</Text>
            <Text variant="body-small">{assumed}</Text>
          </Stack>
        )
        : (
          <Text variant="body-small">
            The analysis proposed no answer — it recorded the question as unresolvable from the
            transcript. Answering it means going outside the data.
          </Text>
        )}

      {finding.resolution && (
        <Stack gap={2}>
          <Text variant="caption">Answered</Text>
          <Text variant="body-small">{finding.resolution}</Text>
        </Stack>
      )}

      <TextArea
        label="Answer"
        description={assumed
          ? 'Pre-filled with the assumption. Save it as it stands to confirm it, or change it first.'
          : 'What the answer actually is, and how you know.'}
        value={answer}
        autosize
        minRows={2}
        onChange={(e) => setAnswer(e.currentTarget.value)}
      />
      <TextField
        label="Note"
        placeholder="Optional — where the answer came from"
        value={note}
        onChange={(e) => setNote(e.currentTarget.value)}
      />

      {problem && <Text variant="body-small">{problem}</Text>}

      <div className="stu-actions">
        {/* Dismissal is a real choice rather than an afterthought, so it is outlined, not text —
            and it is a separate action from saving an empty answer, which this form refuses. */}
        <Button
          variant="outline"
          size="small"
          loading={busy}
          onClick={() => send({ dismiss: true, note: note || null })}
        >
          Dismiss the question
        </Button>
        <Button
          size="small"
          loading={busy}
          disabled={!answer.trim()}
          onClick={() => send({ answer, note: note || null })}
        >
          {untouched ? 'Confirm this answer' : 'Save answer'}
        </Button>
      </div>
    </Stack>
  )
}

function statusVariant(status) {
  if (status === 'active') return 'success'
  if (status === 'rejected') return 'alert'
  return 'warning'
}
