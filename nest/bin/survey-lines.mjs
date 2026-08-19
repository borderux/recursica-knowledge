#!/usr/bin/env node
// Reading a conversation in passes, and checking the quotes that come out of it.
//
// WHY THIS EXISTS
// Analyst and Persona both synthesise over more transcript than fits alongside the writing,
// so both read in passes over line ranges, and both carried near-identical instructions for
// doing it. Serving a range and remembering which ranges were served is bookkeeping.
//
// The citation check is the real reason this is a script. Both definitions document the
// same unenforced failure in almost the same words: a quote recalled from a window you no
// longer hold "reads right and does not match the line", and the existing write path
// verifies that the cited line_id EXISTS, never that the quote matches it. So the one
// mistake both prompts warn about is the one nothing catches. Here it is catchable —
// compare the quote against the line's resolved text and say which citations fail.
//
// Coverage is recorded rather than remembered, for the same reason it is in the tagger
// tool: "I read 120 of 400 lines" is only worth anything if it is derived from what was
// actually served.
//
// SHARED BY TWO SUBAGENTS, so it lives here rather than beside one of them. A tool sits
// next to its skill when it has one owner; this has two, and copying it into both would be
// the divergence the shared BigQuery helper was extracted to avoid.
//
// THIS FILE IS AN INSTALL SOURCE — bootstrap-nest.mjs puts it in ~/.buzz/bin/ and resolves
// the project placeholder below. Set BUZZ_HOME to run it from a checkout.
//
//   survey-lines.mjs --slug <slug> --conversation <id> --survey
//   survey-lines.mjs --slug <slug> --conversation <id> --range --lo N --hi M
//   survey-lines.mjs --slug <slug> --conversation <id> --coverage
//   survey-lines.mjs --slug <slug> --conversation <id> --verify-citations   < citations.json
//
// Exit codes:
//   0  ok
//   1  usage error
//   3  bad input — no such conversation, or a malformed payload
//   4  BigQuery rejected a statement
//   6  at least one citation does not match its line

import { readFileSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const BUZZ_HOME = process.env.BUZZ_HOME || resolve(HERE, '..')
const BQ_EXEC = resolve(BUZZ_HOME, 'mcp/bin/bq-exec.mjs')
const { makeBq, q, num, tableRef } = await import(pathToFileURL(resolve(BUZZ_HOME, 'bin/lib/bq.mjs')).href)

const argv = process.argv.slice(2)
const arg = (n) => {
  const i = argv.indexOf(`--${n}`)
  return i === -1 ? null : argv[i + 1]
}
const flag = (n) => argv.includes(`--${n}`)

const slug = arg('slug')
const conversationId = arg('conversation')
const lo = arg('lo') === null ? null : Number(arg('lo'))
const hi = arg('hi') === null ? null : Number(arg('hi'))
const stage = arg('stage') || 'analyze'
const agentName = arg('agent') || (slug ? `analyst-${slug}` : 'analyst')
const modes = ['survey', 'range', 'coverage', 'verify-citations'].filter(flag)

function keyFromFence(clientSlug) {
  try {
    const cfg = resolve(BUZZ_HOME, `proxy/claude-config-claire-${clientSlug}/.claude.json`)
    const s = JSON.parse(readFileSync(cfg, 'utf8')).mcpServers ?? {}
    // Analyst and Persona hold the read-only server, so prefer its key; fall back to the
    // read-write one, which is the same credential on a normal deploy.
    return (
      s[`bq-${clientSlug}-ro`]?.env?.GOOGLE_APPLICATION_CREDENTIALS ||
      s[`bq-${clientSlug}`]?.env?.GOOGLE_APPLICATION_CREDENTIALS ||
      null
    )
  } catch {
    return null
  }
}

const datasetArg = arg('dataset') || (slug ? `research_${slug.replace(/-/g, '_')}` : null)
const qualified = datasetArg && datasetArg.includes('.') ? datasetArg.split('.') : null
const project = arg('project') || qualified?.[0] || '{{BQ_PROJECT}}'
const dataset = qualified ? qualified.slice(1).join('.') : datasetArg
const bqKey = arg('bq-key') || (slug ? keyFromFence(slug) : null)

if (!dataset || !bqKey || !conversationId || modes.length !== 1) {
  console.error(
    'usage: survey-lines.mjs --slug <slug> --conversation <id> --survey\n' +
    '       survey-lines.mjs --slug <slug> --conversation <id> --range --lo N --hi M\n' +
    '       survey-lines.mjs --slug <slug> --conversation <id> --coverage\n' +
    '       survey-lines.mjs --slug <slug> --conversation <id> --verify-citations < citations.json\n' +
    '\n' +
    '  exactly one mode. optional: --dataset project.dataset, --project, --bq-key,\n' +
    '                              --stage (analyze|persona), --agent',
  )
  process.exit(1)
}

const report = { conversation_id: conversationId, mode: modes[0], error: null }
const emit = (c) => {
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
  process.exit(c)
}
const die = (c, message, extra = {}) => {
  report.error = { code: c, message, ...extra }
  emit(c)
}

const bq = makeBq({
  bqExecPath: BQ_EXEC,
  keyPath: bqKey,
  project,
  onError: ({ label, sql, error }) => die(4, `BigQuery rejected ${label}`, { bigquery_error: error, sql }),
})
const T = (n) => tableRef(project, dataset, n)

const RUN_PREFIX = `${conversationId}:${stage}:read:`

function bounds() {
  const r =
    bq(
      `SELECT MIN(line_sequence_number) AS lo, MAX(line_sequence_number) AS hi, COUNT(*) AS lines
       FROM ${T('lines_current')} WHERE conversation_id = ${q(conversationId)}`,
      { json: true, label: 'conversation bounds' },
    )?.[0] ?? {}
  return { lo: Number(r.lo ?? 0), hi: Number(r.hi ?? 0), lines: Number(r.lines ?? 0) }
}

function rangesRead() {
  const rows =
    bq(
      `SELECT run_id FROM ${T('ingest_runs')}
       WHERE conversation_id = ${q(conversationId)} AND stage = ${q(stage)}
         AND STARTS_WITH(run_id, ${q(RUN_PREFIX)})`,
      { json: true, label: 'ranges read' },
    ) ?? []
  return rows
    .map((r) => String(r.run_id).slice(RUN_PREFIX.length).split('-').map(Number))
    .filter(([a, b]) => Number.isFinite(a) && Number.isFinite(b))
    .map(([a, b]) => ({ lo: a, hi: b }))
    .sort((x, y) => x.lo - y.lo)
}

function coverageOf(b, ranges) {
  const seen = new Set()
  for (const r of ranges) for (let i = r.lo; i <= r.hi; i++) if (i >= b.lo && i <= b.hi) seen.add(i)
  const gaps = []
  for (let i = b.lo; i <= b.hi; i++) if (!seen.has(i)) gaps.push(i)
  const unread = []
  for (const n of gaps) {
    const last = unread[unread.length - 1]
    if (last && n === last.hi + 1) last.hi = n
    else unread.push({ lo: n, hi: n })
  }
  return { lines_read: seen.size, unread, complete: gaps.length === 0 }
}

/**
 * Normalise before comparing a quote to a line.
 *
 * Strict equality would fail on things that are not paraphrase — a curly apostrophe against
 * a straight one, a line break collapsed to a space, a capital at the start of a sentence
 * fragment. Normalising those away keeps the check aimed at the failure it is for: text
 * recalled rather than read. It stays a substring test on the real words, so a reworded
 * quote still fails.
 */
const normalise = (s) =>
  String(s)
    .normalize('NFKC')
    .replace(/[‘’‛′]/g, "'")
    .replace(/[“”‟″]/g, '"')
    .replace(/[‐-―]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()

// ---------------------------------------------------------------------------

function survey() {
  const b = bounds()
  if (!b.lines) die(3, 'no lines for this conversation — has it been ingested?')

  report.bounds = b
  // The tags are already a compressed index of the interview, so this is the cheap shape
  // of it before any transcript is read.
  report.tag_summary =
    bq(
      `SELECT t.tag_id, COUNT(*) AS hits,
              MIN(l.line_sequence_number) AS first_line, MAX(l.line_sequence_number) AS last_line
       FROM ${T('tags')} t
       JOIN ${T('lines_current')} l USING (conversation_id, line_id)
       WHERE t.conversation_id = ${q(conversationId)} AND t.removed_at IS NULL
       GROUP BY t.tag_id ORDER BY hits DESC`,
      { json: true, label: 'tag summary' },
    ) ?? []
  report.participants =
    bq(
      `SELECT participant_id, COUNT(*) AS lines
       FROM ${T('lines_current')} WHERE conversation_id = ${q(conversationId)}
       GROUP BY participant_id ORDER BY lines DESC`,
      { json: true, label: 'participants' },
    ) ?? []
  report.human_edited_lines =
    Number(
      bq(
        `SELECT COUNT(*) AS n FROM ${T('lines_current')}
         WHERE conversation_id = ${q(conversationId)} AND is_human_edited`,
        { json: true, label: 'human edited count' },
      )?.[0]?.n ?? 0,
    )

  const cov = coverageOf(b, rangesRead())
  report.coverage = cov
  // A suggested walk, so neither agent has to do range arithmetic. Following it is not
  // required — coverage is measured from what was actually served, not from this.
  const suggested = []
  for (const gap of cov.unread) {
    for (let a = gap.lo; a <= gap.hi; a += 50) suggested.push({ lo: a, hi: Math.min(a + 49, gap.hi) })
  }
  report.suggested_ranges = suggested
  report.tags_present = report.tag_summary.length > 0
  if (!report.tags_present) {
    report.warning = 'no tags on this conversation — the survey pass has no index to work from, so the walk carries all the weight'
  }
  emit(0)
}

function range() {
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) die(1, '--range needs --lo and --hi')
  if (hi < lo) die(1, '--hi is below --lo')

  const rows =
    bq(
      `SELECT line_id, line_sequence_number, participant_id, time,
              COALESCE(cleaned_text, original_text) AS text, is_human_edited
       FROM ${T('lines_current')}
       WHERE conversation_id = ${q(conversationId)}
         AND line_sequence_number BETWEEN ${num(lo)} AND ${num(hi)}
       ORDER BY line_sequence_number`,
      { json: true, label: 'range lines' },
    ) ?? []

  if (!rows.length) die(3, `no lines in ${lo}..${hi} for this conversation`)

  // Record the read so the coverage claim in the report is derived rather than asserted.
  // MERGE on the range id, so re-reading a range does not double-count it.
  bq(
    `MERGE ${T('ingest_runs')} T
     USING (SELECT ${q(`${RUN_PREFIX}${lo}-${hi}`)} AS run_id) S
     ON T.run_id = S.run_id
     WHEN MATCHED THEN UPDATE SET
       T.rows_returned = ${num(rows.length)}, T.finished_at = CURRENT_TIMESTAMP()
     WHEN NOT MATCHED THEN INSERT
       (run_id, conversation_id, stage, agent, rows_expected, rows_returned, rows_written,
        truncated, status, started_at, finished_at)
       VALUES (S.run_id, ${q(conversationId)}, ${q(stage)}, ${q(agentName)}, ${num(hi - lo + 1)},
               ${num(rows.length)}, 0, FALSE, 'ok', CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP())`,
    { label: `record read of ${lo}-${hi}` },
  )

  report.range = { lo, hi }
  report.lines = rows.map((r) => ({
    line_id: r.line_id,
    seq: Number(r.line_sequence_number),
    participant_id: r.participant_id,
    time: r.time,
    text: r.text,
    is_human_edited: r.is_human_edited === 'true' || r.is_human_edited === true,
  }))
  const cov = coverageOf(bounds(), rangesRead())
  report.coverage = cov
  emit(0)
}

function coverage() {
  const b = bounds()
  if (!b.lines) die(3, 'no lines for this conversation — has it been ingested?')
  const ranges = rangesRead()
  const cov = coverageOf(b, ranges)
  report.bounds = b
  report.ranges_read = ranges
  report.coverage = cov
  // Deliberately not an error. An analysis covering part of an interview can still be worth
  // reading — it just has to say so, and this is the number it says it with.
  report.summary = `read ${cov.lines_read} of ${b.lines} lines across ${ranges.length} range(s)`
  emit(0)
}

function verifyCitations() {
  let payload
  try {
    payload = JSON.parse(readFileSync(0, 'utf8'))
  } catch (err) {
    die(3, `stdin is not valid JSON: ${err.message}`)
  }
  const citations = Array.isArray(payload) ? payload : (payload.citations ?? [])
  if (!Array.isArray(citations) || !citations.length) {
    die(3, 'expected {"citations":[{"line_id":"...","quote":"..."}]}')
  }

  const wanted = [...new Set(citations.map((c) => c?.line_id).filter(Boolean))]
  const rows =
    bq(
      `SELECT line_id, COALESCE(cleaned_text, original_text) AS text
       FROM ${T('lines_current')}
       WHERE conversation_id = ${q(conversationId)}
         AND line_id IN (${wanted.map(q).join(', ')})`,
      { json: true, label: 'cited lines' },
    ) ?? []
  const byId = new Map(rows.map((r) => [r.line_id, r.text]))

  const checked = citations.map((c) => {
    if (!c?.line_id || !c?.quote) return { ...c, ok: false, reason: 'missing line_id or quote' }
    if (!byId.has(c.line_id)) return { ...c, ok: false, reason: 'line_id not in this conversation' }
    const text = byId.get(c.line_id)
    if (normalise(text).includes(normalise(c.quote))) return { line_id: c.line_id, ok: true }
    return {
      line_id: c.line_id,
      // Echoed back so a failure is identifiable when several citations share a line.
      quote: c.quote,
      ok: false,
      reason: 'quote does not appear in that line',
      // The line is returned so the fix is a copy rather than another recall.
      line_text: text,
    }
  })

  const failed = checked.filter((c) => !c.ok)
  report.checked = checked.length
  report.verified = checked.length - failed.length
  report.failed = failed
  if (failed.length) {
    die(6, `${failed.length} of ${checked.length} citations do not match their line`)
  }
  report.status = 'all citations verified'
  emit(0)
}

if (modes[0] === 'survey') survey()
else if (modes[0] === 'range') range()
else if (modes[0] === 'coverage') coverage()
else verifyCitations()
