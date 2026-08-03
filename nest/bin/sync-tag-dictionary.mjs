#!/usr/bin/env node
// Sync the shared Tag Dictionary sheet into one channel's tag_library table.
//
// The tag dictionary is deliberately COMMON to every project — it lives one
// folder up from the client folders, at the shared-drive root, so it is outside
// every channel's Drive fence and no channel service account can read it. That
// is the correct shape: a channel account must never be able to reach a file
// that sits alongside other clients' folders.
//
// So the sheet never gets read at runtime. This script is the one-way bridge:
// a reader identity that holds Viewer on that single sheet pulls the rows, and
// the channel's own key writes them into research_<slug>.tag_library. At tagging
// time, Tagger reads BigQuery only. BigQuery is authoritative; the sheet is the
// human-editable source you re-sync from.
//
// Usage:
//   sync-tag-dictionary.mjs --dataset research_acme --bq-key <path> --sheet-key <path>
//   sync-tag-dictionary.mjs --dataset research_acme --bq-key <path> --from-csv <path|->
//   ... --dry-run    validate and diff, write nothing
//
// --from-csv exists so a deploy can seed a dictionary before anyone has shared
// the sheet with the reader identity, and so this is testable without Drive.
//
// Exit codes: 0 ok, 1 usage, 2 sheet unreadable, 3 validation failed (nothing
// written), 4 BigQuery write failed.

import { createSign } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const BQ_EXEC = resolve(HERE, '../mcp/bin/bq-exec.mjs')

// The one shared dictionary. Common to every project by design.
const DEFAULT_SHEET = '{{TAG_SHEET_ID}}'

// Must match the `type` enum documented in GUIDES/RESEARCH_CHANNEL_DATASET_SCHEMA.md.
const TYPES = ['insight', 'focus', 'tool', 'participant', 'action', 'emotion']

const argv = process.argv.slice(2)
const arg = (name) => {
  const i = argv.indexOf(`--${name}`)
  return i === -1 ? null : argv[i + 1]
}
const flag = (name) => argv.includes(`--${name}`)

const project = arg('project') || '{{BQ_PROJECT}}'
const dataset = arg('dataset')
const bqKey = arg('bq-key')
const sheetKey = arg('sheet-key')
const sheetId = arg('sheet') || DEFAULT_SHEET
const fromCsv = arg('from-csv')
const dryRun = flag('dry-run')

if (!dataset || !bqKey || (!sheetKey && !fromCsv)) {
  console.error(
    'usage: sync-tag-dictionary.mjs --dataset research_<slug> --bq-key <path>\n' +
    '                              (--sheet-key <path> [--sheet <id>] | --from-csv <path|->)\n' +
    '                              [--project <id>] [--dry-run]',
  )
  process.exit(1)
}

const c = (n, s) => (process.stdout.isTTY ? `\x1b[${n}m${s}\x1b[0m` : s)
const ok = (m) => console.log(`${c(32, '  ✓')} ${m}`)
const warn = (m) => console.log(`${c(33, '  !')} ${m}`)
const die = (code, m) => { console.error(`${c(31, '  ✗')} ${m}`); process.exit(code) }

// ------------------------------------------------------------------ the sheet

const b64 = (s) =>
  Buffer.from(s).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

async function accessToken(keyPath, scope) {
  const creds = JSON.parse(readFileSync(keyPath, 'utf8'))
  const now = Math.floor(Date.now() / 1000)
  const header = b64(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claims = b64(JSON.stringify({
    iss: creds.client_email, scope, aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600, iat: now,
  }))
  const signer = createSign('RSA-SHA256')
  signer.update(`${header}.${claims}`)
  const sig = signer.sign(creds.private_key, 'base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${header}.${claims}.${sig}`,
    }),
  })
  const body = await res.json()
  if (!res.ok) throw new Error(`token exchange failed: ${JSON.stringify(body)}`)
  return { token: body.access_token, email: creds.client_email }
}

async function readSheet() {
  const { token, email } = await accessToken(
    sheetKey, 'https://www.googleapis.com/auth/spreadsheets.readonly',
  )
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/A1:E1000`,
    { headers: { authorization: `Bearer ${token}` } },
  )
  const body = await res.json()
  if (!res.ok) {
    die(2,
      `cannot read the tag dictionary sheet as ${email}: ${body.error?.message}\n` +
      `    The dictionary is shared across projects, so it is NOT in any channel's\n` +
      `    Drive folder and channel accounts cannot see it. Share the sheet\n` +
      `    (${sheetId}) with ${email} as Viewer — one file, read-only, once.`)
  }
  ok(`read sheet ${sheetId} as ${email}`)
  return body.values ?? []
}

// Minimal RFC4180 reader — the description column contains commas and quotes.
function parseCsv(text) {
  const rows = []
  let row = [], field = '', inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ } else inQuotes = false
      } else field += ch
    } else if (ch === '"') inQuotes = true
    else if (ch === ',') { row.push(field); field = '' }
    else if (ch === '\n') { row.push(field); rows.push(row); row = []; field = '' }
    else if (ch !== '\r') field += ch
  }
  if (field.length || row.length) { row.push(field); rows.push(row) }
  return rows
}

// ------------------------------------------------------------- normalise rows

const HEADER = ['type', 'tag', 'aliases', 'description', 'confidence']

function normalise(values) {
  if (!values.length) die(3, 'the dictionary is empty — refusing to wipe tag_library')

  const header = (values[0] ?? []).map((h) => String(h).trim().toLowerCase())
  for (const [i, want] of HEADER.entries()) {
    if (header[i] !== want) {
      die(3, `sheet header column ${i + 1} is "${header[i] ?? ''}", expected "${want}". ` +
             `Expected header: ${HEADER.join(', ')}`)
    }
  }

  const errors = []
  const rows = []
  const seen = new Map()

  values.slice(1).forEach((raw, idx) => {
    const line = idx + 2 // 1-based, past the header
    const cell = (i) => String(raw[i] ?? '').trim()
    const [type, tag, aliasRaw, description, confidence] =
      [cell(0), cell(1), cell(2), cell(3), cell(4)]

    if (!type && !tag && !aliasRaw && !description && !confidence) return // blank row

    if (!TYPES.includes(type)) {
      errors.push(`row ${line}: type "${type}" is not one of ${TYPES.join(' | ')}`)
    }
    if (!/^[a-z][a-z0-9_]*$/.test(tag)) {
      errors.push(`row ${line}: tag "${tag}" must be lower_snake_case — it is written ` +
                  `verbatim into tags.tag_id`)
    }
    if (seen.has(tag)) errors.push(`row ${line}: tag "${tag}" already defined on row ${seen.get(tag)}`)
    else seen.set(tag, line)

    if (!description) errors.push(`row ${line}: description is empty`)

    const conf = Number(confidence)
    if (!Number.isFinite(conf) || conf <= 0 || conf > 1) {
      errors.push(`row ${line}: confidence "${confidence}" must be a number in (0, 1]`)
    }

    // Aliases are one comma-separated cell. Quoted phrases ("I wish it would")
    // contain no commas in practice, so a plain split is safe; strip the quotes.
    const alias = [...new Set(
      aliasRaw.split(',')
        .map((a) => a.trim().replace(/^["']|["']$/g, '').trim())
        .filter(Boolean),
    )]

    rows.push({ tag, type, alias, description, confidence_threshold: conf })
  })

  if (errors.length) {
    console.error(`${c(31, '  ✗')} ${errors.length} problem(s) in the dictionary — nothing written:`)
    for (const e of errors) console.error(`      ${e}`)
    process.exit(3)
  }
  if (!rows.length) die(3, 'the dictionary has a header but no rows — refusing to wipe tag_library')

  ok(`${rows.length} tags parsed and validated`)
  return rows
}

// ------------------------------------------------------------------- bigquery

function bq(sql, { json = false } = {}) {
  const res = spawnSync(
    process.execPath,
    [BQ_EXEC, '--key', bqKey, '--project', project, '--file', '-', ...(json ? [] : ['--quiet'])],
    { input: sql, encoding: 'utf8' },
  )
  if (res.status !== 0) {
    console.error(res.stdout || '')
    console.error(res.stderr || '')
    die(4, 'BigQuery statement failed')
  }
  if (!json) return null
  try { return JSON.parse(res.stdout) } catch { return [] }
}

const q = (s) => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n')}'`
// Joining aliases on a control char keeps the round-trip lossless: no alias
// can contain it, so a comparison never falsely reports "changed".
const SEP = '\u0001'
const table = `\`${project}.${dataset}.tag_library\``

// The sheet is authoritative only while Claire does the initial tagging; after that the
// human is (Aaron, 2026-08-02). `origin` is what lets this script tell its own rows from a
// human's, so it can leave theirs alone. Idempotent, and self-sufficient when run standalone
// against a dataset provisioned before the column existed. Pre-existing rows are the sheet's.
function hasOriginColumn() {
  return bq(
    `SELECT column_name FROM \`${project}.${dataset}\`.INFORMATION_SCHEMA.COLUMNS
      WHERE table_name = 'tag_library' AND column_name = 'origin'`,
    { json: true },
  ).length > 0
}

// --dry-run must stay side-effect free, so the migration is skipped there and currentRows()
// falls back to treating every row as the sheet's — which is exactly what the backfill does.
function ensureOriginColumn() {
  const present = hasOriginColumn()
  if (dryRun) {
    if (!present) {
      warn(`tag_library has no origin column yet — a real run adds it and marks existing rows 'sheet'`)
    }
    return present
  }
  if (!present) {
    bq(`ALTER TABLE ${table}
          ADD COLUMN IF NOT EXISTS origin     STRING,
          ADD COLUMN IF NOT EXISTS created_by STRING`)
  }
  // Runs whether or not this call added the column: the deploy script's DDL may have added it
  // already, which would leave every row NULL and the ownership of each row unstated. Cheap and
  // idempotent — it only ever touches NULLs, and nothing writes NULL origin after this.
  bq(`UPDATE ${table} SET origin = 'sheet' WHERE origin IS NULL`)
  return true
}

function currentRows(withOrigin = true) {
  return bq(
    `SELECT tag, type, ARRAY_TO_STRING(alias, '\\u0001') AS aliases, description,
            confidence_threshold, ${withOrigin ? `IFNULL(origin, 'sheet')` : `'sheet'`} AS origin,
            active
     FROM ${table}`,
    { json: true },
  ).map((r) => ({
    tag: r.tag,
    type: r.type,
    alias: r.aliases ? r.aliases.split(SEP) : [],
    description: r.description,
    confidence_threshold: Number(r.confidence_threshold),
    active: r.active === 'true' || r.active === true,
    origin: r.origin,
  }))
}

const same = (a, b) =>
  a.type === b.type &&
  a.description === b.description &&
  a.confidence_threshold === b.confidence_threshold &&
  a.alias.join(SEP) === b.alias.join(SEP)

// ----------------------------------------------------------------------- main

const values = fromCsv
  ? parseCsv(readFileSync(fromCsv === '-' ? 0 : fromCsv, 'utf8'))
  : await readSheet()

const wanted = normalise(values)

const originReady = ensureOriginColumn()

const before = currentRows(originReady)
const byTag = new Map(before.map((r) => [r.tag, r]))
const wantedTags = new Set(wanted.map((r) => r.tag))
const isHuman = (tag) => byTag.get(tag)?.origin === 'human'

const inserted = wanted.filter((r) => !byTag.has(r.tag))
const reactivated = wanted.filter((r) => byTag.get(r.tag) && !byTag.get(r.tag).active && !isHuman(r.tag))
const updated = wanted.filter((r) => byTag.has(r.tag) && !same(r, byTag.get(r.tag)) && !isHuman(r.tag))
const unchanged = wanted.filter((r) => byTag.has(r.tag) && same(r, byTag.get(r.tag)) && byTag.get(r.tag).active)

// Only ever retire rows this script put there. A human's tag absent from the sheet is not
// stale — it is the newer authority, and deactivating it would silently revert their work.
const retired = before.filter((r) => r.active && r.origin === 'sheet' && !wantedTags.has(r.tag))
const humanHeld = wanted.filter((r) => byTag.has(r.tag) && !same(r, byTag.get(r.tag)) && isHuman(r.tag))
const humanKept = before.filter((r) => r.active && r.origin === 'human' && !wantedTags.has(r.tag))

console.log(
  `  ${dataset}.tag_library: ${before.length} row(s) now → ` +
  `+${inserted.length} new, ~${updated.length} changed, ` +
  `${reactivated.length} reactivated, ${retired.length} retired, ${unchanged.length} unchanged` +
  (humanKept.length ? `, ${humanKept.length} human-owned left alone` : ''),
)
for (const r of inserted) console.log(`      + ${r.type}/${r.tag}`)
for (const r of updated) console.log(`      ~ ${r.type}/${r.tag}`)
for (const r of humanKept) console.log(`      = ${r.type}/${r.tag} (human-owned, not in sheet — kept active)`)
for (const r of retired) {
  warn(`retiring ${r.type}/${r.tag} — no longer in the sheet. ` +
       `Set active = FALSE, row kept: existing tags rows still reference it.`)
}
for (const r of humanHeld) {
  warn(`${r.type}/${r.tag} differs from the sheet but is human-owned — sheet change NOT applied. ` +
       `Edit it in Stu, or set origin = 'sheet' to hand it back to the sheet.`)
}

if (dryRun) {
  ok('dry run — nothing written')
  process.exit(0)
}

if (!inserted.length && !updated.length && !reactivated.length && !retired.length) {
  ok('already in sync')
  process.exit(0)
}

const source = wanted.map((r) =>
  `SELECT ${q(r.tag)} AS tag, ${q(r.type)} AS type, ` +
  `[${r.alias.map(q).join(', ')}] AS alias, ${q(r.description)} AS description, ` +
  `${r.confidence_threshold} AS confidence_threshold`,
).join('\nUNION ALL ')

// MERGE on tag so a re-run is a no-op, and so tags rows written against an
// existing tag_id keep resolving. Only touch updated_at when something changed.
bq(`
MERGE ${table} AS t
USING (
${source}
) AS s
ON t.tag = s.tag
WHEN MATCHED AND IFNULL(t.origin, 'sheet') = 'sheet' AND (
      t.type <> s.type
   OR t.description <> s.description
   OR t.confidence_threshold <> s.confidence_threshold
   OR TO_JSON_STRING(t.alias) <> TO_JSON_STRING(s.alias)
   OR t.active IS NOT TRUE
) THEN UPDATE SET
  type = s.type, alias = s.alias, description = s.description,
  confidence_threshold = s.confidence_threshold, active = TRUE,
  updated_at = CURRENT_TIMESTAMP()
WHEN NOT MATCHED THEN INSERT
  (tag, type, alias, description, confidence_threshold, active, origin, updated_at)
VALUES
  (s.tag, s.type, s.alias, s.description, s.confidence_threshold, TRUE, 'sheet', CURRENT_TIMESTAMP());
`)

// Retire rather than delete: a tags row from an earlier run still points here,
// and Tagger already filters on active = TRUE.
if (retired.length) {
  bq(`UPDATE ${table}
      SET active = FALSE, updated_at = CURRENT_TIMESTAMP()
      WHERE active AND IFNULL(origin, 'sheet') = 'sheet'
        AND tag NOT IN (${[...wantedTags].map(q).join(', ')})`)
}

// Assert every sheet tag landed, rather than counting active rows against the sheet's length.
// A count is wrong the moment a human adds a tag in Stu — and it fails the whole sync, which
// under the old reconciliation made one human tag enough to break the next deploy.
const after = currentRows(originReady)
const activeTags = new Set(after.filter((r) => r.active).map((r) => r.tag))
const missing = wanted.filter((r) => !activeTags.has(r.tag)).map((r) => r.tag)
if (missing.length) {
  die(4, `sheet tag(s) missing or inactive after sync: ${missing.join(', ')}`)
}
const humanActive = after.filter((r) => r.active && r.origin === 'human').length
ok(`${dataset}.tag_library in sync — ${wanted.length} sheet tag(s) active, ` +
   `${humanActive} human-owned active, ${after.filter((r) => !r.active).length} retired`)
