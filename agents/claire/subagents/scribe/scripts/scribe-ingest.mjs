#!/usr/bin/env node
// Ingest one interview transcript into a research channel's dataset — deterministically.
//
// WHY THIS EXISTS
// Scribe used to be an LLM loop that walked the document window by window and wrote the
// rows itself. Measured on a 20b local model over 11 trials: zero rows written, eleven
// runs reporting success. It read the transcript and then described an ingest it had not
// performed. Two mechanisms did it — exact-string reproduction degrading under context
// pressure (44-char Drive ids, and SQL identifiers too), and a chat model narrating a
// pipeline instead of driving one. Neither is fixable by prompting.
//
// None of that work needs a model. Read-parse-write over a transcript is deterministic, so
// it lives here, where a row count is a fact rather than a claim. What genuinely needs
// judgement — whether a line should be corrected against the dictionary, and what to do
// about a failure — stays with the agent, which reads this script's JSON and acts on it.
//
// The client fence is NOT reimplemented here. This drives the existing fenced Drive MCP
// server as a subprocess over stdio, so windowing, .docx conversion, duplicate pairing and
// the fence itself are the same code paths the agents use, unmodified.
//
// THIS FILE IS AN INSTALL SOURCE. It lives beside the skill that documents it so the tool
// and its instructions version together, and bootstrap-nest.mjs installs it to ~/.buzz/bin/
// (see nest/nest-manifest.json), resolving the project placeholder below on the way in. The
// two helper paths are relative to that installed location; set BUZZ_HOME to run it from a
// checkout, which is how it gets tested before release.
//
// Do not name that placeholder in prose anywhere in this file. The manifest installs it with
// resolve:true, which substitutes EVERY occurrence — so a comment mentioning the marker comes
// out the other side as a sentence about a project id, which is how this comment read before.
//
// Implements the contract documented in the scribe-<slug> agent definition: derived ids,
// claim-before-write, per-chunk MERGE with a range-scoped delete, cursor advance in the
// same breath as the write, tail sweep once at the end, and a verified close. The comments
// below say which step each block is.
//
// Usage:
//   scribe-ingest.mjs --slug <slug> --plan          # what still needs work, as JSON
//   scribe-ingest.mjs --slug <slug> --document "<document name>"
//                     [--source-id <id>] [--dataset <id|project.dataset>]
//                     [--channel-id <uuid>] [--project <id>] [--project-name <name>]
//                     [--dry-run] [--max-chunks N]
//
// --slug resolves the dataset, the service-account key and the Drive folder from that
// client's installed fence config, so the caller passes neither a key path nor a folder id.
//
// Exit codes — chosen so a small model can branch without parsing prose:
//   0  done. With --plan, "outcome" is work-to-do | nothing-to-do and "plan" holds the
//      list. Otherwise "outcome" is ingested | skipped | resumed | superseded.
//   1  usage error
//   2  Drive unreadable / document not found in the fence
//   3  parse problem — the document did not yield turns where it should have
//   4  BigQuery rejected a statement; the run is resumable from the cursor
//   5  finished writing but verification failed — left at status='failed', needs a human

import { spawn, spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { createInterface } from 'node:readline'

const HERE = dirname(fileURLToPath(import.meta.url))
// Installed at ~/.buzz/bin/, so the nest root is one level up. BUZZ_HOME overrides it,
// which is what makes this runnable from a checkout for testing.
const BUZZ_HOME = process.env.BUZZ_HOME || resolve(HERE, '..')
const BQ_EXEC = resolve(BUZZ_HOME, 'mcp/bin/bq-exec.mjs')
const DRIVE_SERVER = resolve(BUZZ_HOME, 'mcp/drive-fence/server.mjs')

const argv = process.argv.slice(2)
const arg = (name) => {
  const i = argv.indexOf(`--${name}`)
  return i === -1 ? null : argv[i + 1]
}
const flag = (name) => argv.includes(`--${name}`)

const slug = arg('slug')
const documentName = arg('document')

/**
 * Resolve the per-client plumbing from what the deploy already wrote to disk, so the
 * agent's command line is the same for every client and contains no key path and no
 * folder id. Handing a small model those strings to retype is the failure this whole
 * script exists to remove, so `--slug` is the intended way to call it.
 *
 * The authoritative source is the client's own fence config — the MCP registry the
 * deploy generated. Deriving the key path from the slug instead would be wrong: key
 * filenames do not all follow one pattern, and a guessed path that happens to exist
 * could belong to a different client.
 */
function fromFence(clientSlug) {
  const cfg = resolve(BUZZ_HOME, `proxy/claude-config-claire-${clientSlug}/.claude.json`)
  let servers
  try {
    servers = JSON.parse(readFileSync(cfg, 'utf8')).mcpServers ?? {}
  } catch (err) {
    return { error: `could not read the fence config for "${clientSlug}" (${err.code ?? err.message})` }
  }
  const driveEnv = servers[`drive-${clientSlug}`]?.env ?? {}
  const bqEnv = servers[`bq-${clientSlug}`]?.env ?? {}
  const missing = []
  if (!driveEnv.DRIVE_ROOT_FOLDER_ID) missing.push(`drive-${clientSlug}.DRIVE_ROOT_FOLDER_ID`)
  if (!driveEnv.GOOGLE_APPLICATION_CREDENTIALS) missing.push(`drive-${clientSlug} credentials`)
  if (missing.length) return { error: `fence config for "${clientSlug}" is missing ${missing.join(', ')}` }
  return {
    driveRoot: driveEnv.DRIVE_ROOT_FOLDER_ID,
    driveKey: driveEnv.GOOGLE_APPLICATION_CREDENTIALS,
    bqKey: bqEnv.GOOGLE_APPLICATION_CREDENTIALS || driveEnv.GOOGLE_APPLICATION_CREDENTIALS,
  }
}

const fence = slug ? fromFence(slug) : {}

// --dataset accepts either a bare dataset or a fully-qualified `project.dataset`. The
// deploy renders @DATASET@ as the qualified form, so accepting only the bare name would
// build table references with the project doubled in.
const datasetArg = arg('dataset') || (slug ? `research_${slug.replace(/-/g, '_')}` : null)
const qualified = datasetArg && datasetArg.includes('.') ? datasetArg.split('.') : null
const project = arg('project') || qualified?.[0] || '{{BQ_PROJECT}}'
const dataset = qualified ? qualified.slice(1).join('.') : datasetArg
const bqKey = arg('bq-key') || fence.bqKey
const driveKey = arg('drive-key') || fence.driveKey
const driveRoot = arg('drive-root') || fence.driveRoot
const sourceIdArg = arg('source-id')
const channelId = arg('channel-id')
const projectName = arg('project-name')
const dryRun = flag('dry-run')
const planMode = flag('plan')
const maxChunks = Number(arg('max-chunks') || 0) || Infinity

if (!dataset || !bqKey || !driveKey || !driveRoot || (!planMode && !documentName && !sourceIdArg)) {
  if (fence.error) console.error(`error: ${fence.error}`)
  console.error(
    'usage: scribe-ingest.mjs --slug <slug> --plan\n' +
    '       scribe-ingest.mjs --slug <slug> (--document "<name>" | --source-id <id>)\n' +
    '                        [--dataset <id|project.dataset>] [--channel-id <uuid>]\n' +
    '                        [--project <id>] [--project-name <name>]\n' +
    '                        [--dry-run] [--max-chunks N]\n' +
    '\n' +
    '  --slug resolves the dataset, the service-account key and the Drive folder from that\n' +
    '  client\'s installed fence config, so no key path or folder id is passed by hand.\n' +
    '  Override any of them explicitly with --bq-key / --drive-key / --drive-root.',
  )
  process.exit(1)
}

// ---------------------------------------------------------------------------
// Result envelope. Everything the agent needs to act is in here, and it is the
// only thing written to stdout — diagnostics go to stderr so the JSON stays
// machine-readable even on failure.
// ---------------------------------------------------------------------------
const report = {
  outcome: null,
  document_name: documentName ?? null,
  source_id: sourceIdArg ?? null,
  conversation_id: null,
  total_lines: null,
  line_count: null,
  chunks: [],
  participants: [],
  correction_candidates: [],
  human_edit_conflicts: [],
  human_edit_orphans: [],
  warnings: [],
  error: null,
}

const log = (...m) => console.error('[scribe-ingest]', ...m)

function emit(code) {
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
  process.exit(code)
}

function die(code, message, extra = {}) {
  report.error = { code, message, ...extra }
  if (!report.outcome) report.outcome = 'failed'
  emit(code)
}

// ---------------------------------------------------------------------------
// BigQuery. Same helper shape as bin/sync-tag-dictionary.mjs.
// ---------------------------------------------------------------------------

// bq-exec returns every value as a string (the REST API's f[i].v), so callers
// that need a number must coerce. Kept explicit rather than guessing per column.
function bq(sql, { json = false, label = 'statement' } = {}) {
  if (dryRun && /\b(MERGE|UPDATE|DELETE|INSERT)\b/i.test(sql)) {
    log(`dry-run: skipping ${label}`)
    return json ? [] : null
  }
  const res = spawnSync(
    process.execPath,
    [BQ_EXEC, '--key', bqKey, '--project', project, '--file', '-', ...(json ? [] : ['--quiet'])],
    { input: sql, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  )
  if (res.status !== 0) {
    die(4, `BigQuery rejected ${label}`, {
      bigquery_error: (res.stdout || '').trim() || (res.stderr || '').trim(),
      // The agent's job on exit 4 is to fix and retry, so it needs the statement.
      sql: sql.length > 4000 ? `${sql.slice(0, 4000)}\n-- [truncated]` : sql,
    })
  }
  if (!json) return null
  try {
    return JSON.parse(res.stdout)
  } catch {
    return []
  }
}

// Single-quoted BigQuery string literal. Order matters: backslash first, or the
// escapes we add get escaped again.
const q = (s) =>
  s === null || s === undefined
    ? 'NULL'
    : `'${String(s)
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/\r/g, '\\r')
        .replace(/\n/g, '\\n')
        .replace(/\t/g, '\\t')}'`

const num = (v) => (v === null || v === undefined || v === '' ? 'NULL' : String(Number(v)))
const T = (name) => `\`${project}.${dataset}.${name}\``

// Delimiter for flattening ARRAY<STRING> out of BigQuery. A control character no
// variant can contain, so the round-trip is lossless. Same choice, same reason, as
// bin/sync-tag-dictionary.mjs.
const DICT_SEP = '\u0001'

// ---------------------------------------------------------------------------
// Drive, via the fenced MCP server as a subprocess. The fence is enforced there,
// not here — that is the whole point of going through it.
// ---------------------------------------------------------------------------
class DriveFence {
  constructor() {
    this.proc = spawn(process.execPath, [DRIVE_SERVER], {
      env: {
        ...process.env,
        GOOGLE_APPLICATION_CREDENTIALS: driveKey,
        DRIVE_ROOT_FOLDER_ID: driveRoot,
        DRIVE_READ_ONLY: '1',
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    this.nextId = 1
    this.pending = new Map()
    this.rl = createInterface({ input: this.proc.stdout, terminal: false })
    this.rl.on('line', (line) => {
      let msg
      try {
        msg = JSON.parse(line)
      } catch {
        return
      }
      const waiter = this.pending.get(msg.id)
      if (!waiter) return
      this.pending.delete(msg.id)
      waiter(msg)
    })
    // The server logs readiness and fence details to stderr; keep them out of stdout.
    this.proc.stderr.on('data', (d) => log('drive-fence:', String(d).trim()))
    this.exited = new Promise((res) => this.proc.on('exit', res))
  }

  request(method, params) {
    const id = this.nextId++
    const payload = { jsonrpc: '2.0', id, method, params }
    return new Promise((resolveReq, rejectReq) => {
      const timer = setTimeout(() => {
        this.pending.delete(id)
        rejectReq(new Error(`drive-fence timed out on ${method}`))
      }, 120_000)
      this.pending.set(id, (msg) => {
        clearTimeout(timer)
        if (msg.error) return rejectReq(new Error(msg.error.message || 'drive-fence error'))
        resolveReq(msg.result)
      })
      this.proc.stdin.write(`${JSON.stringify(payload)}\n`)
    })
  }

  async init() {
    await this.request('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'scribe-ingest', version: '1' },
    })
  }

  async call(name, args) {
    const result = await this.request('tools/call', { name, arguments: args })
    const text = result?.content?.[0]?.text ?? ''
    if (result?.isError || text.startsWith('ERROR:')) {
      throw new Error(text.replace(/^ERROR:\s*/, '') || `${name} failed`)
    }
    try {
      return JSON.parse(text)
    } catch {
      throw new Error(`${name} returned unparseable payload`)
    }
  }

  close() {
    try {
      this.proc.stdin.end()
    } catch {
      /* already gone */
    }
  }
}

// ---------------------------------------------------------------------------
// Parsing. The transcript format is a header block, a ==== rule, then speaker
// turns of the shape:
//
//     Speaker Name  00:00:00
//     <what they said, one or more lines>
//
// A turn is a speaker line plus every following line up to the next speaker line.
// ---------------------------------------------------------------------------
const SPEAKER_RE = /^(?<speaker>\S.*?)\s{2,}(?<time>\d{1,2}:\d{2}(?::\d{2})?)\s*$/
const RULE_RE = /^={10,}\s*$/

const slugSpeaker = (name) => {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return `p_${slug || 'unknown'}`
}

// The interviewer is a role, not a person, and is the same identity in every
// transcript — so it gets a stable id rather than a name-derived one.
const isInterviewer = (name) => /^(researcher|interviewer|moderator|facilitator)$/i.test(name.trim())
const participantIdFor = (name) => (isInterviewer(name) ? 'p_researcher' : slugSpeaker(name))

/**
 * Split one window's text into turns, tracking the absolute source line each
 * turn started on so the cursor can be set to a real line number.
 *
 * Returns turns in order. Each carries `startLine` (absolute) so the caller can
 * hold the last one back and know exactly where to resume.
 */
function parseWindow(text, windowStartLine) {
  const lines = text.split('\n')
  const turns = []
  let current = null

  lines.forEach((raw, idx) => {
    const absLine = windowStartLine + idx
    const m = raw.match(SPEAKER_RE)
    if (m) {
      if (current) turns.push(current)
      current = {
        speaker: m.groups.speaker.trim(),
        time: m.groups.time,
        startLine: absLine,
        body: [],
      }
      return
    }
    if (!current) return // header/preamble before the first speaker line
    if (RULE_RE.test(raw)) return
    current.body.push(raw)
  })
  if (current) turns.push(current)

  return turns.map((t) => ({
    speaker: t.speaker,
    time: t.time,
    startLine: t.startLine,
    text: t.body.join(' ').replace(/\s+/g, ' ').trim(),
  }))
}

// conversations.participant_type comes from the filename convention
// "NN_ParticipantType_First_Last"; the header's PARTICIPANT: line is the fallback.
function participantTypeFrom(name, headerText) {
  const fromName = name?.match(/\d+_([A-Za-z]+)_/)
  if (fromName) return fromName[1]
  const fromHeader = headerText?.match(/^PARTICIPANT:\s*[^—-]+[—-]\s*([^,(]+)/m)
  return fromHeader ? fromHeader[1].trim() : null
}

function projectNameFrom(headerText) {
  const m = headerText?.match(/^PROJECT:\s*(.+)$/m)
  return m ? m[1].trim() : null
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
const drive = new DriveFence()

/**
 * --plan: what in this folder still needs work, as JSON.
 *
 * Claire's definition used to describe this as a procedure — query conversations, match
 * against list_files, pick the ones that are new, changed by revision, or stuck. That is
 * a lookup and a comparison, so it does not need a model, and it was a SECOND copy of the
 * state rules this script already applies per document below. Two implementations of one
 * rule is the failure mode; this is the one implementation, offered folder-wide.
 *
 * Reads no document bodies: list_files once, then get_file_info per file for the revision,
 * then a single query. So it is cheap enough to run before every dispatch.
 *
 * It deliberately does NOT distinguish a cosmetic edit from a real supersede. That needs
 * the content hash, which needs a read, and the ingest run resolves it anyway — a changed
 * revision whose content matches just moves the revision pointer. The plan's job is
 * "worth dispatching or not", not the final outcome.
 */
async function plan() {
  const listing = await drive.call('list_files', { recursive: true })
  const files = listing.files ?? []

  const rows =
    bq(
      `SELECT conversation_id, source_id, document_name, status, source_revision,
              line_count, ingest_cursor_line, ingest_cursor_seq
       FROM ${T('conversations')}`,
      { json: true, label: 'work-list state query' },
    ) ?? []
  const bySource = new Map(rows.map((r) => [r.source_id, r]))

  const work = []
  const skipped = []

  for (const f of files) {
    let revision = null
    try {
      revision = (await drive.call('get_file_info', { file_id: f.id })).revision_id
    } catch (err) {
      // A file whose metadata will not load is a problem to report, not to skip past:
      // silently dropping it is how a transcript never gets ingested and nobody knows.
      work.push({
        document_name: f.name,
        source_id: f.id,
        action: 'error',
        reason: `metadata unreadable: ${err.message}`,
      })
      continue
    }

    const prior = bySource.get(f.id)
    if (!prior) {
      work.push({ document_name: f.name, source_id: f.id, action: 'ingest', reason: 'not in conversations' })
      continue
    }
    if (prior.status === 'ingesting' || prior.status === 'failed') {
      work.push({
        document_name: f.name,
        source_id: f.id,
        action: 'resume',
        reason: `status ${prior.status}`,
        resume_from_line: prior.ingest_cursor_line === null ? 1 : Number(prior.ingest_cursor_line),
        lines_already_written: Number(prior.ingest_cursor_seq ?? 0),
      })
      continue
    }
    if (prior.status === 'superseded') {
      work.push({ document_name: f.name, source_id: f.id, action: 'ingest', reason: 'prior row superseded' })
      continue
    }
    if (prior.source_revision !== revision) {
      work.push({
        document_name: f.name,
        source_id: f.id,
        action: 'changed',
        reason: 'revision moved since the last ingest; the run decides cosmetic vs supersede',
      })
      continue
    }
    skipped.push({
      document_name: f.name,
      source_id: f.id,
      conversation_id: prior.conversation_id ?? `c_${f.id}`,
      line_count: Number(prior.line_count ?? 0),
      reason: 'already ingested at this revision',
    })
  }

  // Number the work list here, once. Claire's reporting rule is that the denominator is
  // this list rather than the folder and that positions are never renumbered — so the
  // numbering belongs to whatever computes the list, not to whoever reports on it.
  work.forEach((w, i) => {
    w.position = `${i + 1} / ${work.length}`
  })

  report.outcome = work.length ? 'work-to-do' : 'nothing-to-do'
  report.plan = {
    documents_in_folder: files.length,
    to_dispatch: work.length,
    counts: work.reduce((acc, w) => ({ ...acc, [w.action]: (acc[w.action] ?? 0) + 1 }), {}),
    work,
    skipped,
  }
  // Fields that only describe a single-document run would be misleading here.
  for (const k of ['document_name', 'source_id', 'conversation_id', 'total_lines', 'line_count', 'chunks', 'participants', 'correction_candidates']) {
    delete report[k]
  }
  drive.close()
  emit(0)
}

async function main() {
  await drive.init()

  if (planMode) return plan()

  // --- Step 1: resolve the document to a source_id, without the agent ever
  // handling the id. This is the failure the baseline kept dying on.
  let sourceId = sourceIdArg
  let docName = documentName
  if (!sourceId) {
    const listing = await drive.call('list_files', { recursive: true })
    const wanted = documentName.trim().toLowerCase()
    const exact = listing.files.filter((f) => f.name.trim().toLowerCase() === wanted)
    const partial = listing.files.filter((f) => f.name.trim().toLowerCase().includes(wanted))
    const hits = exact.length ? exact : partial
    if (hits.length === 0) {
      die(2, `no document matching "${documentName}" in this fence`, {
        available: listing.files.map((f) => f.name),
      })
    }
    if (hits.length > 1) {
      die(2, `"${documentName}" matches ${hits.length} documents; pass --source-id`, {
        matches: hits.map((f) => ({ name: f.name, source_id: f.id })),
      })
    }
    sourceId = hits[0].id
    docName = hits[0].name
  }
  report.source_id = sourceId
  report.document_name = docName

  // --- Step 3 (first window): the whole-document facts come back on every read,
  // so one call gives revision, checksum and total_lines for the checks below.
  let head
  try {
    head = await drive.call('read_file', { file_id: sourceId, start_line: 1 })
  } catch (err) {
    die(2, `could not read the document: ${err.message}`)
  }

  // A duplicate_of response means we were handed the wrong format of a transcript
  // that also exists as another file. The canonical id is the one to store under,
  // or the same interview lands in conversations twice.
  if (head.duplicate_of?.id && head.duplicate_of.id !== sourceId) {
    report.warnings.push(
      `handed ${sourceId} but canonical file is ${head.duplicate_of.id}; ingesting under the canonical id`,
    )
    sourceId = head.duplicate_of.id
    report.source_id = sourceId
    head = await drive.call('read_file', { file_id: sourceId, start_line: 1 })
  }

  const conversationId = `c_${sourceId}`
  const revisionId = head.revision_id
  const checksum = head.content_sha256
  const totalLines = head.total_lines
  report.conversation_id = conversationId
  report.total_lines = totalLines

  // --- Step 2: what state is this transcript already in?
  const existing = bq(
    `SELECT conversation_id, status, source_revision, source_checksum, line_count,
            ingest_cursor_line, ingest_cursor_seq
     FROM ${T('conversations')} WHERE source_id = ${q(sourceId)}`,
    { json: true, label: 'state check' },
  )
  const prior = existing?.[0] ?? null

  let startLine = 1
  let startSeq = 0
  let outcome = 'ingested'

  if (prior) {
    const revisionMatches = prior.source_revision === revisionId
    const checksumMatches = prior.source_checksum === checksum

    if (prior.status === 'ingested' && revisionMatches) {
      // The common case on a repeat mention. One query, no read.
      report.outcome = 'skipped'
      report.line_count = Number(prior.line_count ?? 0)
      log('already ingested at this revision — nothing to do')
      drive.close()
      emit(0)
    }

    if (prior.status === 'ingested' && !revisionMatches && checksumMatches) {
      // Cosmetic edit: move the revision pointer so the next run stops above.
      bq(
        `UPDATE ${T('conversations')} SET source_revision = ${q(revisionId)}
         WHERE conversation_id = ${q(conversationId)}`,
        { label: 'cosmetic revision update' },
      )
      report.outcome = 'skipped (cosmetic edit)'
      report.line_count = Number(prior.line_count ?? 0)
      drive.close()
      emit(0)
    }

    const resumable = prior.status === 'ingesting' || prior.status === 'failed'
    if (resumable && revisionMatches) {
      // An unfinished run is unfinished even when the source has not moved. Resume
      // from the cursor — a NULL cursor means nothing landed yet, so start at 1.
      startLine = Number(prior.ingest_cursor_line ?? 1) || 1
      startSeq = Number(prior.ingest_cursor_seq ?? 0) || 0
      outcome = 'resumed'

      // The two halves of the cursor must agree, and when they do not the line
      // number wins. A row can carry ingest_cursor_line = NULL with a non-zero
      // ingest_cursor_seq — step 8 writes exactly that pair on a clean close, so
      // anything that later moves such a row back to 'ingesting' or 'failed'
      // produces it. Reading from line 1 while numbering from seq+1 writes a
      // SECOND copy of the transcript at higher sequence numbers, and the density
      // check cannot see it: count, distinct and max all still agree with lo = 1.
      // So a reset of the line implies a reset of the sequence.
      if (startLine === 1 && startSeq !== 0) {
        report.warnings.push(
          `cursor was inconsistent (line NULL/1 but seq ${startSeq}); numbering reset to 0 to avoid duplicating the transcript`,
        )
        startSeq = 0
      }
    } else if (prior.status === 'ingested' && !checksumMatches) {
      // Content genuinely changed. Same conversation_id so lines are rewritten in
      // place, and the cursor resets — a supersede that keeps the old cursor
      // numbers the new chunk 1 from the old end and duplicates the transcript.
      outcome = 'superseded'
    }
    // Everything else — superseded row, revision moved under a dead run — falls
    // through with startLine=1 / startSeq=0, which is the correct reset.
  }

  report.outcome = outcome
  log(`${outcome}: ${docName} (${totalLines} source lines), from line ${startLine}, seq ${startSeq}`)

  // --- Step 4: claim it before writing anything. MERGE on source_id so two
  // runs racing the same document cannot both claim it. revision and checksum
  // are written HERE, not at close, because that is what makes a crashed run
  // resumable — and a crashed run is the only kind that needs it.
  const headerText = head.text ?? ''
  const resolvedProjectName = projectName ?? projectNameFrom(headerText)
  const resolvedParticipantType = participantTypeFrom(docName, headerText)
  const cursorClause =
    outcome === 'resumed'
      ? // Leave the cursor exactly as it is; overwriting turns a resume into a restart.
        `T.ingest_cursor_line = T.ingest_cursor_line, T.ingest_cursor_seq = T.ingest_cursor_seq`
      : `T.ingest_cursor_line = 1, T.ingest_cursor_seq = 0`

  bq(
    `MERGE ${T('conversations')} T
     USING (SELECT ${q(sourceId)} AS source_id) S
     ON T.source_id = S.source_id
     WHEN MATCHED THEN UPDATE SET
       T.status = 'ingesting',
       T.source_revision = ${q(revisionId)},
       T.source_checksum = ${q(checksum)},
       T.document_name = ${q(docName)},
       T.source_uri = ${q(`https://docs.google.com/document/d/${sourceId}/edit`)},
       T.source_type = 'google_doc',
       ${cursorClause}
     WHEN NOT MATCHED THEN INSERT
       (conversation_id, source_id, project_name, channel_id, document_name, source_uri,
        source_type, source_revision, source_checksum, participant_type, status,
        line_count, ingest_cursor_line, ingest_cursor_seq)
     VALUES
       (${q(conversationId)}, ${q(sourceId)}, ${q(resolvedProjectName)}, ${q(channelId)},
        ${q(docName)}, ${q(`https://docs.google.com/document/d/${sourceId}/edit`)},
        'google_doc', ${q(revisionId)}, ${q(checksum)}, ${q(resolvedParticipantType)},
        'ingesting', NULL, 1, 0)`,
    { label: 'claim' },
  )

  // --- Step 5: the chunk loop. One window at a time, finished completely before
  // the next is fetched.
  // Only `active` terms count — a term at `proposed` has not been approved by a
  // human yet and scores zero. Variants are flattened server-side: bq-exec returns
  // an ARRAY<STRING> as the REST API's nested {v:[{v:..}]}, and joining on a
  // control character no variant can contain keeps the round-trip lossless.
  const dictionary = bq(
    `SELECT term_id, canonical_term,
            ARRAY_TO_STRING(variants, '\\u0001') AS variant_list
     FROM ${T('project_dictionary')} WHERE status = 'active'`,
    { json: true, label: 'dictionary read' },
  )
  const dictTerms = (dictionary ?? []).map((r) => ({
    term_id: r.term_id,
    canonical: r.canonical_term,
    variants: (r.variant_list ?? '')
      .split(DICT_SEP)
      .map((v) => v.trim())
      .filter(Boolean),
  }))
  if (dictTerms.length === 0) {
    report.warnings.push('no active dictionary terms — no corrections are possible on this run')
  }

  const speakers = new Map()
  let cursorLine = startLine
  let seq = startSeq
  let chunkCount = 0
  let complete = false

  while (!complete && chunkCount < maxChunks) {
    let window
    try {
      window = await drive.call('read_file', { file_id: sourceId, start_line: cursorLine })
    } catch (err) {
      bq(
        `UPDATE ${T('conversations')} SET status = 'failed'
         WHERE conversation_id = ${q(conversationId)}`,
        { label: 'mark failed' },
      )
      die(2, `read failed at line ${cursorLine}: ${err.message}`)
    }

    const windowStart = window.window?.start_line ?? cursorLine
    const isFinalWindow = window.complete === true || window.next_start_line === null
    let turns = parseWindow(window.text ?? '', windowStart)

    // A window ends on a line boundary but not necessarily a turn boundary. Hold
    // the last turn back so half a quote is never stored as a whole one — but
    // never on the final window (nothing follows the closing turn, so the
    // heuristic would fire on every document and drop its ending), and never
    // when nothing completed at all (that does not terminate).
    let heldBackFrom = null
    if (!isFinalWindow && turns.length > 1) {
      heldBackFrom = turns[turns.length - 1].startLine
      turns = turns.slice(0, -1)
    } else if (!isFinalWindow && turns.length === 1) {
      report.warnings.push(
        `a single turn spans the whole window at line ${windowStart}; parsed it rather than waiting for its end`,
      )
    }

    const rows = turns
      .filter((t) => t.text.length > 0)
      .map((t) => {
        seq += 1
        const participantId = participantIdFor(t.speaker)
        if (!speakers.has(participantId)) {
          speakers.set(participantId, {
            participant_id: participantId,
            participant_name: isInterviewer(t.speaker) ? 'Researcher' : t.speaker,
            participant_type: isInterviewer(t.speaker) ? 'interviewer' : 'participant',
          })
        }
        return {
          line_id: `${conversationId}:${seq}`,
          seq,
          participant_id: participantId,
          time: t.time,
          text: t.text,
        }
      })

    // Where the cursor goes: the line after the last line actually consumed.
    // Copying next_start_line in blindly is the silent-loss bug — when a turn was
    // held back it points past lines no chunk has read.
    const nextCursor = isFinalWindow
      ? totalLines + 1
      : (heldBackFrom ?? window.next_start_line ?? windowStart + 1)

    if (nextCursor <= windowStart && !isFinalWindow) {
      die(3, `cursor would not advance past line ${windowStart} — refusing to loop forever`)
    }

    if (rows.length === 0) {
      // An empty window is a no-op, never a write. Running the MERGE with an empty
      // source leaves the delete's BETWEEN bounds undefined, which turns
      // NOT MATCHED BY SOURCE into a delete of the whole conversation.
      log(`chunk at line ${windowStart}: no turns, skipping`)
    } else {
      const loSeq = rows[0].seq
      const hiSeq = rows[rows.length - 1].seq
      const values = rows
        .map(
          (r) =>
            `SELECT ${q(r.line_id)} AS line_id, ${num(r.seq)} AS line_sequence_number, ` +
            `${q(r.participant_id)} AS participant_id, ${q(r.time)} AS time, ${q(r.text)} AS original_text`,
        )
        .join('\nUNION ALL\n')

      // MERGE keyed on line_id, with the delete scoped to BOTH this conversation
      // and this chunk's sequence range. Without the range, chunk 2 deletes
      // chunk 1; without the conversation, it reaches every other conversation.
      bq(
        `MERGE ${T('transcript_lines')} T
         USING (\n${values}\n) S
         ON T.line_id = S.line_id AND T.conversation_id = ${q(conversationId)}
         WHEN MATCHED THEN UPDATE SET
           T.line_sequence_number = S.line_sequence_number,
           T.participant_id = S.participant_id,
           T.time = S.time,
           T.original_text = S.original_text
         WHEN NOT MATCHED BY TARGET THEN INSERT
           (conversation_id, line_id, participant_id, line_sequence_number, time, original_text)
           VALUES (${q(conversationId)}, S.line_id, S.participant_id, S.line_sequence_number,
                   S.time, S.original_text)
         WHEN NOT MATCHED BY SOURCE
           AND T.conversation_id = ${q(conversationId)}
           AND T.line_sequence_number BETWEEN ${num(loSeq)} AND ${num(hiSeq)}
         THEN DELETE`,
        { label: `chunk MERGE at line ${windowStart}` },
      )

      // Cursor advance in the same breath as the write. A chunk written but not
      // recorded is re-done harmlessly; a cursor advanced past a chunk that
      // failed to write loses those lines permanently.
      bq(
        `UPDATE ${T('conversations')}
         SET ingest_cursor_line = ${num(nextCursor)}, ingest_cursor_seq = ${num(hiSeq)}
         WHERE conversation_id = ${q(conversationId)}`,
        { label: `cursor advance to ${nextCursor}` },
      )

      // Per-chunk accounting, MERGEd on run_id — a resume re-reads the chunk it
      // died on at the same start_line, so the id repeats and an INSERT would
      // double-count the very accounting used to detect a short read.
      bq(
        `MERGE ${T('ingest_runs')} T
         USING (SELECT ${q(`${conversationId}:extract:${windowStart}`)} AS run_id) S
         ON T.run_id = S.run_id
         WHEN MATCHED THEN UPDATE SET
           T.rows_expected = ${num(turns.length)}, T.rows_returned = ${num(rows.length)},
           T.rows_written = ${num(rows.length)}, T.status = 'ok', T.finished_at = CURRENT_TIMESTAMP()
         WHEN NOT MATCHED THEN INSERT
           (run_id, conversation_id, channel_id, stage, agent, rows_expected, rows_returned,
            rows_written, truncated, status, started_at, finished_at)
           VALUES (S.run_id, ${q(conversationId)}, ${q(channelId)}, 'extract', 'scribe-ingest.mjs',
                   ${num(turns.length)}, ${num(rows.length)}, ${num(rows.length)}, FALSE, 'ok',
                   CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP())`,
        { label: `ingest_runs for line ${windowStart}` },
      )

      report.chunks.push({
        start_line: windowStart,
        end_line: window.window?.end_line ?? null,
        held_back_from: heldBackFrom,
        seq_from: loSeq,
        seq_to: hiSeq,
        rows: rows.length,
      })

      // Correction is judgement, not parsing, so it is deliberately NOT applied
      // here. A dictionary hit alone scores 3 of the 7 the rules require; the
      // acoustic and context halves are the agent's call, and it is the agent that
      // must set cleaned_text, correction_type, confidence_score and
      // dictionary_term_ids together. All this does is point at the lines worth
      // looking at: one that already reads as the canonical term needs nothing,
      // and one carrying an approved term's known variant is a candidate.
      for (const r of rows) {
        const haystack = r.text.toLowerCase()
        for (const term of dictTerms) {
          if (!term.canonical) continue
          if (haystack.includes(term.canonical.toLowerCase())) continue
          const hit = term.variants.find((v) => v && haystack.includes(v.toLowerCase()))
          if (hit) {
            report.correction_candidates.push({
              line_id: r.line_id,
              term_id: term.term_id,
              canonical_term: term.canonical,
              matched_variant: hit,
            })
          }
        }
      }
    }

    cursorLine = nextCursor
    chunkCount += 1
    complete = isFinalWindow
  }

  if (!complete) {
    report.outcome = 'partial'
    bq(
      `UPDATE ${T('conversations')} SET status = 'failed'
       WHERE conversation_id = ${q(conversationId)}`,
      { label: 'mark partial' },
    )
    die(3, `stopped after ${chunkCount} chunks with the document unfinished (cursor at ${cursorLine})`)
  }

  // --- Step 6: sweep the tail once, after the last chunk. A transcript that
  // shrank leaves lines beyond its new end that no chunk's range delete covers.
  // The bound is the highest sequence this run wrote — line_count is still the
  // previous run's number, and total_lines counts source lines, not turns.
  bq(
    `DELETE FROM ${T('transcript_lines')}
     WHERE conversation_id = ${q(conversationId)} AND line_sequence_number > ${num(seq)}`,
    { label: 'tail sweep' },
  )

  // Participants, derived from the speakers actually seen.
  report.participants = [...speakers.values()]
  if (report.participants.length > 0) {
    const pValues = report.participants
      .map(
        (p) =>
          `SELECT ${q(p.participant_id)} AS participant_id, ${q(p.participant_name)} AS participant_name, ` +
          `${q(p.participant_type)} AS participant_type`,
      )
      .join('\nUNION ALL\n')
    bq(
      `MERGE ${T('participants')} T
       USING (\n${pValues}\n) S
       ON T.conversation_id = ${q(conversationId)} AND T.participant_id = S.participant_id
       WHEN MATCHED THEN UPDATE SET
         T.participant_name = S.participant_name, T.participant_type = S.participant_type
       WHEN NOT MATCHED BY TARGET THEN INSERT
         (conversation_id, participant_id, participant_name, participant_type)
         VALUES (${q(conversationId)}, S.participant_id, S.participant_name, S.participant_type)`,
      { label: 'participants MERGE' },
    )
  }

  // --- Step 7: report anything disturbed that a person had touched. Findings,
  // not errors — and never resolved here.
  if (!dryRun) {
    report.human_edit_conflicts =
      bq(
        `SELECT line_id, line_sequence_number, edited_by, edited_at
         FROM ${T('lines_current')}
         WHERE conversation_id = ${q(conversationId)} AND source_changed_since_edit
         ORDER BY line_sequence_number`,
        { json: true, label: 'human edit conflicts' },
      ) ?? []
    report.human_edit_orphans =
      bq(
        `SELECT e.line_id, e.edited_by, e.edited_at
         FROM ${T('line_edits')} e
         LEFT JOIN ${T('transcript_lines')} l
           ON l.conversation_id = e.conversation_id AND l.line_id = e.line_id
         WHERE e.conversation_id = ${q(conversationId)} AND l.line_id IS NULL`,
        { json: true, label: 'human edit orphans' },
      ) ?? []
  }

  // --- Step 8: verify before closing. Dense sequence numbers from 1, and a row
  // count that matches what was parsed. A short read that looks plausible is the
  // failure this whole design exists to eliminate.
  if (dryRun) {
    report.line_count = seq
    report.warnings.push('dry run — nothing was written and nothing verified')
    drive.close()
    emit(0)
  }

  const check =
    bq(
      `SELECT COUNT(*) AS lines, MIN(line_sequence_number) AS lo, MAX(line_sequence_number) AS hi,
              COUNT(DISTINCT line_sequence_number) AS distinct_seq
       FROM ${T('transcript_lines')} WHERE conversation_id = ${q(conversationId)}`,
      { json: true, label: 'density check' },
    )?.[0] ?? {}

  const lines = Number(check.lines ?? 0)
  const lo = Number(check.lo ?? 0)
  const hi = Number(check.hi ?? 0)
  const distinct = Number(check.distinct_seq ?? 0)
  report.line_count = lines
  report.verification = { lines, lo, hi, distinct_seq: distinct, parsed: seq }

  if (!(lines === distinct && lines === hi && lo === 1 && lines === seq)) {
    bq(
      `UPDATE ${T('conversations')} SET status = 'failed' WHERE conversation_id = ${q(conversationId)}`,
      { label: 'mark failed after verification' },
    )
    bq(
      `UPDATE ${T('ingest_runs')} SET truncated = TRUE
       WHERE conversation_id = ${q(conversationId)} AND stage = 'extract'`,
      { label: 'mark truncated' },
    )
    report.outcome = 'failed'
    die(5, `verification failed: ${lines} rows, seq ${lo}..${hi}, ${distinct} distinct, parsed ${seq}`)
  }

  // Close the claim in one statement, only after the count is verified. This is
  // the only place the cursor goes NULL — doing it at the last chunk would make
  // "ingesting + NULL" ambiguous with "nothing landed yet".
  bq(
    `UPDATE ${T('conversations')}
     SET status = 'ingested', line_count = ${num(lines)}, ingest_cursor_line = NULL,
         ingest_cursor_seq = ${num(seq)}, ingested_at = CURRENT_TIMESTAMP()
     WHERE conversation_id = ${q(conversationId)}`,
    { label: 'close claim' },
  )

  log(`${report.outcome}: ${lines} lines across ${report.chunks.length} chunks`)
  drive.close()
  emit(0)
}

main().catch((err) => {
  drive.close()
  die(4, `unhandled: ${err.message}`, { stack: err.stack })
})
