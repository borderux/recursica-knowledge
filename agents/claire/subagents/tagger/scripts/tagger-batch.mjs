#!/usr/bin/env node
// Batch server for tagging one conversation.
//
// WHY THIS EXISTS
// Which tags a line earns is judgement, so unlike the ingest tool this does NOT replace the
// model. Everything around that judgement is arithmetic and lookups, and roughly half of
// Tagger's definition was spent describing it: establish the line range, take 40-60 lines,
// fetch two lines of context either side, advance the cursor, validate each tag against the
// active library and that tag's own threshold, MERGE, record the accounting, and prove the
// batches tiled the conversation with no gap.
//
// The coverage proof is the reason this is a script rather than advice. Untagged lines and
// never-read lines look identical from the outside, which is how a previous pipeline ran
// `LIMIT 500` against longer transcripts and appeared to work — repeated runs crept forward
// through the remainder and nothing ever said a transcript was incompletely tagged. A model
// asked to track which ranges it covered is the wrong instrument for that; a script that
// derives coverage from what is recorded cannot forget.
//
// THIS FILE IS AN INSTALL SOURCE. It sits beside the skill that documents it so the tool and
// its instructions version together; bootstrap-nest.mjs installs it to ~/.buzz/bin/ (see
// nest/nest-manifest.json), resolving the project placeholder below. Set BUZZ_HOME to run it
// from a checkout.
//
// Three modes, one conversation at a time:
//
//   tagger-batch.mjs --slug <slug> --conversation <id> --next-batch
//       The next uncovered range, its lines, two lines of context either side, and the
//       active tag library. Says done when the conversation is fully covered.
//
//   tagger-batch.mjs --slug <slug> --conversation <id> --write-tags --lo N --hi M
//       Reads the judged tags as JSON on stdin, validates, MERGEs, records the batch.
//       Recording the batch is what advances the cursor, so a batch is never re-served.
//
//   tagger-batch.mjs --slug <slug> --conversation <id> --status
//       The coverage proof: ranges recorded, whether they tile lo..hi, and what is missing.
//
// Exit codes:
//   0  ok
//   1  usage error
//   3  the payload was rejected — nothing was written, "rejected" says which rows and why
//   4  BigQuery rejected a statement
//   5  coverage is broken — ranges do not tile the conversation

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
const batchSize = Number(arg('batch-size') || 50)
const contextLines = Number(arg('context') || 2)
const lo = arg('lo') === null ? null : Number(arg('lo'))
const hi = arg('hi') === null ? null : Number(arg('hi'))
const taggedBy = arg('tagged-by') || (slug ? `tagger-${slug}` : 'tagger')

const modes = ['next-batch', 'write-tags', 'status'].filter(flag)

// The per-client key comes from that client's own fence config, the same way the ingest tool
// resolves it: key filenames do not all follow one pattern, and a guessed path that happens
// to exist could belong to another client.
function fromFence(clientSlug) {
  try {
    const cfg = resolve(BUZZ_HOME, `proxy/claude-config-claire-${clientSlug}/.claude.json`)
    const servers = JSON.parse(readFileSync(cfg, 'utf8')).mcpServers ?? {}
    return (
      servers[`bq-${clientSlug}`]?.env?.GOOGLE_APPLICATION_CREDENTIALS ||
      servers[`drive-${clientSlug}`]?.env?.GOOGLE_APPLICATION_CREDENTIALS ||
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
const bqKey = arg('bq-key') || (slug ? fromFence(slug) : null)

if (!dataset || !bqKey || !conversationId || modes.length !== 1) {
  console.error(
    'usage: tagger-batch.mjs --slug <slug> --conversation <id> --next-batch\n' +
    '       tagger-batch.mjs --slug <slug> --conversation <id> --write-tags --lo N --hi M  < tags.json\n' +
    '       tagger-batch.mjs --slug <slug> --conversation <id> --status\n' +
    '\n' +
    '  exactly one mode at a time. --dataset accepts project.dataset; --slug resolves the key.\n' +
    '  optional: --batch-size (50), --context (2), --dataset, --project, --bq-key, --tagged-by',
  )
  process.exit(1)
}

const report = { conversation_id: conversationId, mode: modes[0], error: null }
const emit = (code) => {
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
  process.exit(code)
}
const die = (code, message, extra = {}) => {
  report.error = { code, message, ...extra }
  emit(code)
}

const bq = makeBq({
  bqExecPath: BQ_EXEC,
  keyPath: bqKey,
  project,
  onError: ({ label, sql, error }) => die(4, `BigQuery rejected ${label}`, { bigquery_error: error, sql }),
})
const T = (name) => tableRef(project, dataset, name)

// A batch is recorded in ingest_runs under a run_id carrying its range. That is the cursor:
// it survives a crash, it is idempotent on re-run, and it is derived from what was actually
// written rather than from anything the model has to remember.
const RUN_PREFIX = `${conversationId}:tag:`
const runIdFor = (a, b) => `${RUN_PREFIX}${a}-${b}`

function bounds() {
  const r =
    bq(
      `SELECT MIN(line_sequence_number) AS lo, MAX(line_sequence_number) AS hi, COUNT(*) AS lines
       FROM ${T('lines_current')} WHERE conversation_id = ${q(conversationId)}`,
      { json: true, label: 'conversation bounds' },
    )?.[0] ?? {}
  return { lo: Number(r.lo ?? 0), hi: Number(r.hi ?? 0), lines: Number(r.lines ?? 0) }
}

function recordedRanges() {
  const rows =
    bq(
      `SELECT run_id FROM ${T('ingest_runs')}
       WHERE conversation_id = ${q(conversationId)} AND stage = 'tag'
       ORDER BY run_id`,
      { json: true, label: 'recorded batches' },
    ) ?? []
  return rows
    .map((r) => String(r.run_id).slice(RUN_PREFIX.length).split('-').map(Number))
    .filter(([a, b]) => Number.isFinite(a) && Number.isFinite(b))
    .map(([a, b]) => ({ lo: a, hi: b }))
    .sort((x, y) => x.lo - y.lo)
}

/** Sequence numbers in lo..hi not inside any recorded range. Dense-agnostic on purpose. */
function uncovered(b, ranges) {
  const covered = new Set()
  for (const r of ranges) for (let i = r.lo; i <= r.hi; i++) covered.add(i)
  const gaps = []
  for (let i = b.lo; i <= b.hi; i++) if (!covered.has(i)) gaps.push(i)
  return gaps
}

function coverage() {
  const b = bounds()
  if (!b.lines) return { bounds: b, ranges: [], missing: [], complete: false, empty: true }
  const ranges = recordedRanges()
  const gaps = uncovered(b, ranges)
  // Collapse the missing list into ranges so a long gap is readable.
  const missing = []
  for (const n of gaps) {
    const last = missing[missing.length - 1]
    if (last && n === last.hi + 1) last.hi = n
    else missing.push({ lo: n, hi: n })
  }
  return { bounds: b, ranges, missing, complete: gaps.length === 0, empty: false }
}

// ---------------------------------------------------------------------------

function nextBatch() {
  const cov = coverage()
  if (cov.empty) die(3, 'no lines for this conversation — has it been ingested?')
  report.coverage = { bounds: cov.bounds, batches_recorded: cov.ranges.length, complete: cov.complete }

  if (cov.complete) {
    report.status = 'done'
    report.batch = null
    emit(0)
  }

  // Serve the first missing range, capped at one batch. Extending to the end of the current
  // speaker turn is deliberately NOT done here: turn boundaries are the model's to respect
  // when judging, and a range cursor has to stay arithmetic to remain provable.
  const first = cov.missing[0]
  const bLo = first.lo
  const bHi = Math.min(first.hi, bLo + batchSize - 1)

  const lines =
    bq(
      `SELECT line_id, line_sequence_number, participant_id,
              COALESCE(cleaned_text, original_text) AS text, is_human_edited
       FROM ${T('lines_current')}
       WHERE conversation_id = ${q(conversationId)}
         AND line_sequence_number BETWEEN ${num(bLo - contextLines)} AND ${num(bHi + contextLines)}
       ORDER BY line_sequence_number`,
      { json: true, label: 'batch lines' },
    ) ?? []

  const inBatch = (r) => Number(r.line_sequence_number) >= bLo && Number(r.line_sequence_number) <= bHi
  const shape = (r) => ({
    line_id: r.line_id,
    seq: Number(r.line_sequence_number),
    participant_id: r.participant_id,
    text: r.text,
    is_human_edited: r.is_human_edited === 'true' || r.is_human_edited === true,
  })

  report.batch = { lo: bLo, hi: bHi }
  report.lines_to_tag = lines.filter(inBatch).map(shape)
  // Context belongs to its own batch and gets tagged there. It is here to make a thought
  // split across turns readable, and it is labelled so it cannot be mistaken for work.
  report.context_only = lines.filter((r) => !inBatch(r)).map(shape)
  report.tag_library =
    bq(
      `SELECT tag, type, description, confidence_threshold FROM ${T('tag_library')}
       WHERE active ORDER BY tag`,
      { json: true, label: 'tag library' },
    ) ?? []
  report.status = report.tag_library.length ? 'batch-ready' : 'no-active-tags'
  report.remaining_lines_after_this = cov.missing.reduce((n, r) => n + (r.hi - r.lo + 1), 0) - (bHi - bLo + 1)
  emit(0)
}

function writeTags() {
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) die(1, '--write-tags needs --lo and --hi')

  let payload
  try {
    payload = JSON.parse(readFileSync(0, 'utf8'))
  } catch (err) {
    die(3, `stdin is not valid JSON: ${err.message}`)
  }
  const incoming = Array.isArray(payload) ? payload : (payload.tags ?? [])
  if (!Array.isArray(incoming)) die(3, 'expected {"tags":[...]} or a bare array')

  const library = new Map(
    (
      bq(
        `SELECT tag, confidence_threshold FROM ${T('tag_library')} WHERE active`,
        { json: true, label: 'tag library' },
      ) ?? []
    ).map((r) => [r.tag, Number(r.confidence_threshold)]),
  )
  const validLines = new Map(
    (
      bq(
        `SELECT line_id, line_sequence_number FROM ${T('lines_current')}
         WHERE conversation_id = ${q(conversationId)}
           AND line_sequence_number BETWEEN ${num(lo)} AND ${num(hi)}`,
        { json: true, label: 'batch line ids' },
      ) ?? []
    ).map((r) => [r.line_id, Number(r.line_sequence_number)]),
  )

  // Validate the whole payload before writing any of it. A partial write would record the
  // batch as covered while some of its tags were dropped, and the coverage proof would pass.
  const accepted = []
  const rejected = []
  for (const t of incoming) {
    const reason = (() => {
      if (!t || !t.line_id || !t.tag_id) return 'missing line_id or tag_id'
      if (!validLines.has(t.line_id)) return 'line_id is not in this batch range'
      if (!library.has(t.tag_id)) return 'tag_id is not an active tag in the library'
      const c = Number(t.confidence)
      if (!Number.isFinite(c)) return 'confidence is missing or not a number'
      if (c < library.get(t.tag_id)) return `confidence ${c} is below this tag's threshold ${library.get(t.tag_id)}`
      if (!t.justification || !String(t.justification).trim()) return 'justification is empty'
      return null
    })()
    if (reason) rejected.push({ line_id: t?.line_id ?? null, tag_id: t?.tag_id ?? null, reason })
    else accepted.push(t)
  }

  if (rejected.length) {
    report.accepted = 0
    report.rejected = rejected
    die(3, `${rejected.length} of ${incoming.length} tags rejected — nothing was written`)
  }

  if (accepted.length) {
    const values = accepted
      .map(
        (t) =>
          `SELECT ${q(t.line_id)} AS line_id, ${q(t.tag_id)} AS tag_id, ${num(t.confidence)} AS confidence, ` +
          `${num(t.window_size ?? contextLines)} AS window_size, ${q(t.justification)} AS justification`,
      )
      .join('\nUNION ALL\n')

    // MERGE on (line_id, tag_id) so a re-run rewrites the same row rather than duplicating.
    // No delete clause: a tag a person added by hand is not "not matched by source".
    bq(
      `MERGE ${T('tags')} T
       USING (\n${values}\n) S
       ON T.line_id = S.line_id AND T.tag_id = S.tag_id AND T.conversation_id = ${q(conversationId)}
       WHEN MATCHED THEN UPDATE SET
         T.confidence = S.confidence, T.window_size = S.window_size,
         T.justification = S.justification, T.tagged_at = CURRENT_TIMESTAMP(),
         T.tagged_by = ${q(taggedBy)}
       WHEN NOT MATCHED BY TARGET THEN INSERT
         (conversation_id, line_id, tag_id, confidence, window_size, justification, tagged_at, tagged_by)
         VALUES (${q(conversationId)}, S.line_id, S.tag_id, S.confidence, S.window_size,
                 S.justification, CURRENT_TIMESTAMP(), ${q(taggedBy)})`,
      { label: `tags MERGE for ${lo}-${hi}` },
    )
  }

  // Recording the batch is what advances the cursor, and it happens after the write so a
  // failed write leaves the range uncovered and it gets served again. A batch that
  // legitimately earned no tags still records — zero tags is a real result, and not
  // recording it would serve the same range forever.
  bq(
    `MERGE ${T('ingest_runs')} T
     USING (SELECT ${q(runIdFor(lo, hi))} AS run_id) S
     ON T.run_id = S.run_id
     WHEN MATCHED THEN UPDATE SET
       T.rows_expected = ${num(validLines.size)}, T.rows_returned = ${num(accepted.length)},
       T.rows_written = ${num(accepted.length)}, T.status = 'ok', T.finished_at = CURRENT_TIMESTAMP()
     WHEN NOT MATCHED THEN INSERT
       (run_id, conversation_id, stage, agent, rows_expected, rows_returned, rows_written,
        truncated, status, started_at, finished_at)
       VALUES (S.run_id, ${q(conversationId)}, 'tag', ${q(taggedBy)}, ${num(validLines.size)},
               ${num(accepted.length)}, ${num(accepted.length)}, FALSE, 'ok',
               CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP())`,
    { label: `ingest_runs for ${lo}-${hi}` },
  )

  const cov = coverage()
  report.batch = { lo, hi }
  report.accepted = accepted.length
  report.lines_in_batch = validLines.size
  report.rejected = []
  report.coverage = { bounds: cov.bounds, complete: cov.complete, missing: cov.missing }
  report.status = cov.complete ? 'conversation-complete' : 'more-batches-remain'
  emit(0)
}

function status() {
  const cov = coverage()
  if (cov.empty) die(3, 'no lines for this conversation — has it been ingested?')

  const counts =
    bq(
      `SELECT COUNT(*) AS tag_rows, COUNT(DISTINCT line_id) AS lines_with_tags
       FROM ${T('tags')} WHERE conversation_id = ${q(conversationId)} AND removed_at IS NULL`,
      { json: true, label: 'tag counts' },
    )?.[0] ?? {}

  report.coverage = {
    bounds: cov.bounds,
    batches_recorded: cov.ranges.length,
    ranges: cov.ranges,
    missing: cov.missing,
    complete: cov.complete,
  }
  report.tags = {
    tag_rows: Number(counts.tag_rows ?? 0),
    lines_with_tags: Number(counts.lines_with_tags ?? 0),
    // Lines may legitimately earn zero tags. That is different from lines never looked at,
    // and the whole point of tracking ranges is being able to tell the two apart.
    lines_considered_but_untagged: cov.complete
      ? cov.bounds.lines - Number(counts.lines_with_tags ?? 0)
      : null,
  }

  if (!cov.complete) {
    report.status = 'incomplete'
    die(5, `coverage is incomplete: ${cov.missing.length} gap(s) in ${cov.bounds.lo}..${cov.bounds.hi}`)
  }
  report.status = 'complete'
  emit(0)
}

if (modes[0] === 'next-batch') nextBatch()
else if (modes[0] === 'write-tags') writeTags()
else status()
