// A cited quote, read in the conversation it came from.
//
// The panel answers the question a citation cannot answer on its own: not "does this line exist"
// — the write tool already refuses a citation to a line that does not — but "does the line still
// mean that once you can see what was said either side of it". A quote lifted out of a leading
// question reads very differently from the same quote volunteered.
//
// **The window is bounded, and that is a design decision rather than a performance one.**
// `recursica-skill-panels-modals` sends content that induces vertical scrolling out of a panel and
// onto a page. So this shows the anchored line and one turn either side — see RADIUS below, whose
// value is measured against the real transcripts rather than picked — and choosing a different
// quote *re-anchors* the window instead of scrolling a whole transcript inside it. The full
// transcript is a page, and the footer goes there.
//
// The panel is non-modal, deliberately and consistently: the reviewer is comparing the panel
// against the finding on the page behind it, which is the mutual dependence that earns a panel at
// all. The four overrides below are what make that true — see the adapter-defect note in
// `recursica-skill-panel`.

import { useEffect, useRef, useState } from 'react'
import { Link as RouterLink } from 'react-router'
import { Avatar, Badge, Button, Group, Link, Panel, Stack, Tabs, Text } from '@recursica/mantine-adapter'
import { api } from '../api.js'

/**
 * Turns either side of the cited line. **One. This number is measured, not chosen.**
 *
 * `recursica-skill-panels-modals` forbids content that induces vertical scrolling in a panel, and
 * interview turns run to several hundred characters each, so the ceiling is far lower than it
 * looks. Sampled across 20 of the 175 citations on the Inbox, against the real transcripts:
 *
 *   radius 5 (11 turns) — overflowed by 1035px on the first citation tried
 *   radius 2 (5 turns)  — 11 of 20 overflowed, worst by 275px
 *   radius 1 (3 turns)  — 0 of 20 overflowed
 *
 * Radius 2 was the first attempt and it looked fine on the one citation it was checked against,
 * which is how the wrong number survived twice. One either side is also enough for the job: the
 * turn before is the question the quote answers, which is the leading-question check this panel
 * exists to make, and the turn after catches a walk-back. Anything wider is the transcript page,
 * which the footer links to.
 */
const RADIUS = 1

/**
 * @param citation  The evidence entry to anchor on, or null when the panel is closed.
 * @param siblings  The other citations on the same finding, so a reviewer can move between the
 *                  lines one claim rests on without closing and reopening the panel.
 * @param onAnchor  Called with a citation to re-anchor the window on it.
 */
export function QuoteContext({ citation, siblings = [], onAnchor, onClose }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const heading = useRef(null)

  const cid = citation?.conversation_id
  const seq = citation?.line_sequence_number
  // A citation resolves to no sequence number only when its line is gone: the number comes from
  // joining the cited line, so a NULL means the join found nothing. There is no window to fetch,
  // and the panel has to say that rather than open empty.
  const orphaned = Boolean(citation) && (!cid || seq == null)

  useEffect(() => {
    if (!cid || seq == null) return
    setData(null); setError(null)
    let live = true
    api.lineContext(cid, seq, RADIUS)
      .then((r) => { if (live) setData(r) })
      .catch((e) => { if (live) setError(e.message) })
    return () => { live = false }
  }, [cid, seq])

  // Opening must be perceivable, which follows from focus moving into the panel — the slide-in is
  // not allowed to be the only signal. Focus returns to the trigger on close via Mantine's
  // `returnFocus`, which restores whatever was focused before the panel opened.
  //
  // Deferred behind the open transition rather than called in the same commit. The panel is
  // `keepMounted`, so at the moment `citation` arrives the content is still display:none and
  // `focus()` on a hidden element silently does nothing — measured in the running app: focus
  // stayed on BODY. The delay clears Mantine's transition.
  useEffect(() => {
    if (!citation) return
    const t = setTimeout(() => heading.current?.focus(), 250)
    return () => clearTimeout(t)
  }, [citation])

  // The house rule is that a panel is non-modal, and Mantine hardcodes `aria-modal` on the dialog
  // with no prop to turn it off — it is written after the prop spread, so it cannot be overridden
  // from outside either. Left alone the result is the half-modal that `recursica-skill-panel` names
  // as the most common panel accessibility failure: assistive technology confines itself to the
  // dialog while the page behind stays live for everyone else. `role="dialog"` stays, because a
  // non-modal dialog is a real thing and it is what carries the panel's accessible name.
  //
  // **This is a library defect the house rule requires overriding, and reaching into the DOM is the
  // only route Mantine leaves.** It belongs in the adapter as a prop; until it is there, every
  // panel in the application has this bug.
  useEffect(() => {
    if (!citation) return
    const t = setTimeout(() => {
      heading.current?.closest('[role="dialog"]')?.removeAttribute('aria-modal')
    }, 0)
    return () => clearTimeout(t)
  }, [citation])

  const name = data?.conversation?.document_name ?? cid ?? 'Transcript'
  const others = siblings.filter((s) => s.line_id !== citation?.line_id)

  return (
    <Panel
      opened={Boolean(citation)}
      onClose={onClose}
      title={name}
      placement="right"
      returnFocus
      // The house rule is that a panel is non-modal; the adapter's Mantine Drawer defaults to the
      // opposite on all four counts. Delete these when the adapter's defaults are fixed rather
      // than carrying them forever — recursica-skill-panel calls it a tracked defect.
      withOverlay={false}
      closeOnClickOutside={false}
      trapFocus={false}
      lockScroll={false}
    >
      {!citation ? null : (
        // The wrapper carries the overflow guard. A transcript can contain an unbroken run — a URL,
        // an ASR artefact — long enough to widen the panel on its own, and horizontal scrolling
        // inside a panel is forbidden outright rather than merely discouraged.
        <div className="stu-panel-content">
        <Stack gap="md">
          {/* Focusable so opening the panel lands somewhere meaningful, but not a tab stop
              afterwards — it is a heading, not a control. The tabIndex sits on a plain element
              rather than on the Recursica Text, which owns whether it forwards a ref. */}
          <div ref={heading} tabIndex={-1}>
            <Stack gap={4}>
              <Text variant="subtitle">
                {orphaned ? 'This line is gone' : `What was said around line ${seq}`}
              </Text>
              <Text variant="body-small">
                The quote as the analysis recorded it: “{citation.quote}”
              </Text>
            </Stack>
          </div>

          {error && <Text variant="body-small">{error}</Text>}

          {orphaned ? (
            <Text variant="body-small">
              The cited line is no longer in the dataset, so there is no surrounding transcript to
              show. The citation was verified against a real line when it was written, which means
              a re-ingest has since re-parsed that line away — the claim rests on wording that is
              not there any more, and only a person can say whether it still stands.
            </Text>
          ) : !data ? null : data.lines.length === 0 ? (
            <Text variant="body-small">
              Line {String(seq)} is not in this transcript any more. The citation was checked when
              it was written, so a re-ingest has re-parsed the line away — the claim rests on
              wording that is no longer here.
            </Text>
          ) : others.length === 0 ? (
            <Window lines={data.lines} seq={seq} />
          ) : (
            /* Two tabs rather than one long column. `recursica-skill-panels-modals`: "Secondary
               information belongs in a second tab, not further down the same panel", and the
               primary content is the tab that opens. Put in sequence, the other citations pushed
               the panel into vertical scrolling — measured, twice — which is the thing the rule is
               protecting against. No tab set when there is nothing to put in the second one:
               whether an empty tab is hidden or disabled is on the tabs skill's uncovered list, so
               the set simply does not exist in that case. */
            <Tabs defaultValue="context" keepMounted={false}>
              <Tabs.List>
                <Tabs.Tab value="context">Context</Tabs.Tab>
                <Tabs.Tab value="others">
                  Other lines <Badge variant="warning">{others.length}</Badge>
                </Tabs.Tab>
              </Tabs.List>

              <Tabs.Panel value="context">
                <Window lines={data.lines} seq={seq} />
              </Tabs.Panel>

              <Tabs.Panel value="others">
                <Stack gap="sm">
                  <Text variant="caption">
                    The other {others.length === 1 ? 'line' : `${others.length} lines`} this claim
                    rests on. The quotes in full are on the finding behind this panel, which stays
                    readable — that is what a non-modal panel is for.
                  </Text>
                  {/* Re-anchors the window. FR-16: choosing a quote moves the panel to that point —
                      here by moving the window, since the panel holds no scroll region to move
                      within. The label is short and fixed rather than carrying the quote: a quote
                      inside a button label cannot wrap, and it pushed the panel into horizontal
                      scrolling at 531px of content in a 438px body, against a prohibition with no
                      exceptions. */}
                  {others.map((s) => (
                    <Stack key={s.line_id} gap={2}>
                      <Text variant="body-small">“{s.quote}”</Text>
                      <div>
                        <Button variant="text" size="small" onClick={() => onAnchor(s)}>
                          Read line {String(s.line_sequence_number)} in context
                        </Button>
                      </div>
                    </Stack>
                  ))}
                </Stack>
              </Tabs.Panel>
            </Tabs>
          )}
        </Stack>
        </div>
      )}

      {/* No link for an orphaned citation: there is no line to open, and a link to a page that
          cannot show what was asked for is worse than none. */}
      {citation && !orphaned && (
        <Panel.Footer>
          <div className="stu-actions">
            <Link
              component={RouterLink}
              to={`/interviews/${encodeURIComponent(cid)}/lines/${seq}`}
            >
              Read the whole transcript
            </Link>
          </div>
        </Panel.Footer>
      )}
    </Panel>
  )
}

/** The context window itself. Extracted so both the tabbed and untabbed paths render one thing. */
function Window({ lines, seq }) {
  return (
    <ol className="stu-context">
      {lines.map((line) => (
        <Turn key={line.line_id} line={line} cited={line.line_sequence_number === seq} />
      ))}
    </ol>
  )
}

/**
 * One turn. Avatar, name, and timestamp per FR-15 — and the name is always in text beside the
 * avatar, never replaced by it: `recursica-skill-avatar` makes that a hard requirement, because
 * initials identify nobody and do not survive being read aloud.
 */
function Turn({ line, cited }) {
  const speaker = line.participant_name ?? line.participant_id ?? 'Unattributed'
  const known = Boolean(line.participant_name)

  return (
    <li className={cited ? 'stu-context__turn stu-context__turn--cited' : 'stu-context__turn'}>
      <Group gap="sm" align="flex-start" wrap="nowrap">
        {/* `text` when a name is known, and Mantine's own person placeholder when it is not —
            which is the `icon` fallback the avatar skill asks for. Worth noting as a gap: the
            adapter derives its style from `src`/`icon` props, so it labels a childless avatar
            `text` when what it renders is the icon. */}
        <Avatar size="small">{known ? initials(speaker) : null}</Avatar>
        <Stack gap={2}>
          <Group gap="sm" align="baseline" wrap="wrap">
            <Text variant="subtitle-small">{speaker}</Text>
            {line.participant_type && <Text variant="caption">{line.participant_type}</Text>}
            {line.time && <Text variant="caption">{line.time}</Text>}
            <Text variant="caption">line {String(line.line_sequence_number)}</Text>
            {/* Not colour alone: the cited turn carries a badge as well as its own treatment. */}
            {cited && <Badge variant="warning">cited here</Badge>}
          </Group>
          <Text variant="body-small">{line.cleaned_text ?? line.original_text}</Text>
        </Stack>
      </Group>
    </li>
  )
}

/** At most two, from the first and last word. "Unattributed" has none worth showing. */
function initials(name) {
  const parts = String(name).trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return null
  const first = parts[0][0]
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return `${first}${last}`.toUpperCase()
}

