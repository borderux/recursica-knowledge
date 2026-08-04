#!/usr/bin/env node
// Fenced Google Drive MCP server.
//
// One server instance == one service account + one root folder. Every file the
// agent names is ancestry-checked against that root before it is touched, so a
// stray file ID from a prompt, a transcript, or another channel cannot be read
// or written.
//
// Zero dependencies on purpose: this is the choke point for client data
// isolation, so it should be auditable in one file with nothing to supply-chain.
//
// Required env:
//   GOOGLE_APPLICATION_CREDENTIALS  service account JSON key path
//   DRIVE_ROOT_FOLDER_ID            the fence root; nothing outside is reachable
// Optional env:
//   DRIVE_FENCE_LABEL               channel name, used in tool descriptions
//   DRIVE_READ_ONLY                 "1" to drop the write tools entirely

import { createHash, createSign } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createInterface } from 'node:readline'

const SERVER_NAME = 'drive-fence'
const SERVER_VERSION = '1.0.0'
const DEFAULT_PROTOCOL = '2025-06-18'

// stdout is the JSON-RPC channel. Everything human-facing goes to stderr.
const logf = (...a) => console.error(`[${SERVER_NAME}]`, ...a)

// ---------------------------------------------------------------- config

const KEY_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS
const ROOT_FOLDER_ID = process.env.DRIVE_ROOT_FOLDER_ID
const FENCE_LABEL = process.env.DRIVE_FENCE_LABEL || ROOT_FOLDER_ID || 'unconfigured'
const READ_ONLY = process.env.DRIVE_READ_ONLY === '1'

if (!KEY_PATH) fatal('GOOGLE_APPLICATION_CREDENTIALS is not set')
if (!ROOT_FOLDER_ID) fatal('DRIVE_ROOT_FOLDER_ID is not set — refusing to start unfenced')

function fatal(msg) {
  logf('FATAL:', msg)
  process.exit(1)
}

let credentials
try {
  credentials = JSON.parse(readFileSync(KEY_PATH, 'utf8'))
} catch (err) {
  fatal(`could not read key at ${KEY_PATH}: ${err.message}`)
}
if (credentials.type !== 'service_account') {
  fatal(`key at ${KEY_PATH} is type "${credentials.type}", expected "service_account"`)
}

// Docs/Sheets scopes are separate from Drive on purpose. This Workspace has
// download/copy restricted at the org level (files.export returns 403
// cannotExportFile even for a writer), so Google Docs must be read through the
// Docs API structural endpoint rather than exported. Same for Sheets.
const SCOPE = [
  READ_ONLY ? 'https://www.googleapis.com/auth/drive.readonly' : 'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/documents.readonly',
  'https://www.googleapis.com/auth/spreadsheets.readonly',
].join(' ')

// ---------------------------------------------------------------- auth

let cachedToken = null // { value, expiresAt }

function b64url(input) {
  return Buffer.from(input).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function getAccessToken() {
  const now = Math.floor(Date.now() / 1000)
  // Refresh a minute early so a token never expires mid-request.
  if (cachedToken && cachedToken.expiresAt > now + 60) return cachedToken.value

  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claims = b64url(JSON.stringify({
    iss: credentials.client_email,
    scope: SCOPE,
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  }))
  const signer = createSign('RSA-SHA256')
  signer.update(`${header}.${claims}`)
  const assertion = `${header}.${claims}.${signer.sign(credentials.private_key, 'base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  })
  const body = await res.text()
  if (!res.ok) throw new Error(`token exchange failed (${res.status}): ${body}`)

  const parsed = JSON.parse(body)
  cachedToken = { value: parsed.access_token, expiresAt: now + (parsed.expires_in ?? 3600) }
  return cachedToken.value
}

// ---------------------------------------------------------------- drive api

const DRIVE_COMMON = { supportsAllDrives: 'true', includeItemsFromAllDrives: 'true' }

async function driveFetch(url, opts = {}) {
  const token = await getAccessToken()
  const res = await fetch(url, {
    ...opts,
    headers: { authorization: `Bearer ${token}`, ...(opts.headers || {}) },
  })
  if (!res.ok) {
    const detail = await res.text()
    throw new Error(`Drive API ${res.status} on ${new URL(url).pathname}: ${detail.slice(0, 600)}`)
  }
  return res
}

function driveUrl(path, params) {
  const url = new URL(`https://www.googleapis.com/drive/v3${path}`)
  for (const [k, v] of Object.entries({ ...DRIVE_COMMON, ...params })) {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v))
  }
  return url.toString()
}

// `version` is a monotonic counter Drive bumps on any change, content or metadata.
// `md5Checksum` is only ever returned for binary uploads — native Google Docs do not
// have one, verified against live Drive. For Docs the change signal is the Docs API
// revisionId, fetched separately by docRevisionId().
const FILE_FIELDS =
  'id,name,mimeType,parents,size,modifiedTime,createdTime,trashed,webViewLink,version,md5Checksum'

// Canonical content hash. Every agent must get the same answer for the same text, so
// the normalisation lives here rather than in each caller: CRLF folded, trailing
// whitespace per line dropped, trailing blank lines dropped.
function contentNormalise(text) {
  return String(text)
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/, ''))
    .join('\n')
    .replace(/\n+$/, '')
}

function contentSha256(text) {
  return createHash('sha256').update(contentNormalise(text), 'utf8').digest('hex')
}

// ------------------------------------------------------- windowed reads
//
// A two-hour interview is 60–100k characters. Returned whole it consumes the
// reader's entire context before the reader gets a say, and the failure is the
// worst kind: the model keeps working on the part it can still see and reports
// success. So the ceiling lives here, in the tool, and not in a prompt — a
// prompt can forget a parameter, a tool cannot forget its own limit.
//
// Windows are measured in LINES and never split one. A transcript line is a
// speaker turn; half a turn is not a smaller unit of the same thing, it is a
// misquote. The char cap therefore trims whole lines off the end of a window
// rather than cutting mid-line, and a single line longer than the cap is
// returned whole and flagged instead of being chopped.
// Sized against the real corpus, measured rather than guessed. The acme
// transcripts run 51k–80k characters over 118–185 lines, so a line cap alone
// would never bind: 120 lines of ~500 characters is 60k, the whole document.
// The char cap is what actually holds, and the cost it bounds is not the read
// alone — it is the read plus the MERGE statement built from it, which inlines
// every line again. At 12k a chunk and its SQL stay a few thousand tokens
// together, so an ingest is a sequence of bounded steps however long the
// transcript is. A 76k transcript becomes about seven chunks.
//
// On line boundaries in these files: the Docs API renders a soft line break
// (Shift+Enter) as \v, which is NOT folded here, so a soft-broken paragraph
// counts as one line. Measured across six real transcripts that leaves the
// longest single line at 1,417 characters — an eighth of the cap, and none over
// it — so folding \v would buy no granularity that matters. It is deliberately
// left alone because contentNormalise() does not fold it either: changing that
// changes content_sha256, which is the stored change-detection key for every
// conversation already ingested. The oversize_line flag below covers the case
// this corpus does not have.
const READ_WINDOW_MAX_CHARS = 12_000
const READ_WINDOW_DEFAULT_LINES = 120
// An upper bound on what a caller may ask for. The char cap already bounds the
// response, so this only bounds the work done to build it.
const MAX_WINDOW_LINES = 5_000

// Lines for windowing purposes: CRLF folded so line indices are the same on
// every platform, and nothing else touched. Joining consecutive windows with
// "\n" reproduces this text exactly, which is what makes chunked ingestion
// equivalent to a whole-document read.
function contentLines(text) {
  return String(text).replace(/\r\n?/g, '\n').split('\n')
}

// A positive integer, or the fallback. Arguments arrive from a model, so 0,
// null, -3 and "abc" all have to land somewhere defined — and the JSON Schema
// on the tool is documentation, not a validator. Note 0 must fall back rather
// than clamp to 1: `max_lines: 0` meaning "one line" would be a silent
// misreading of an obvious mistake.
function positiveInt(value, fallback) {
  const n = Math.trunc(Number(value))
  return Number.isFinite(n) && n >= 1 ? n : fallback
}

// Slice one window out of a document. `startLine` is 1-based and inclusive.
// Returns the window plus everything a caller needs to advance or to know it
// is done — never a bare string, because a bare string is what lets a partial
// read pass for a whole one.
function windowOf(text, { startLine, maxLines } = {}) {
  const lines = contentLines(text)
  const totalLines = lines.length

  // Past the end is not an error: a loop that advances by next_start_line lands
  // here exactly once, and an empty window with complete: true is how it stops.
  const start = Math.min(positiveInt(startLine, 1), totalLines + 1)
  const wanted = Math.min(positiveInt(maxLines, READ_WINDOW_DEFAULT_LINES), MAX_WINDOW_LINES)

  let end = Math.min(start + wanted - 1, totalLines)
  let cappedBy = end < totalLines ? 'max_lines' : null

  // Keep whole lines up to the char cap, always keeping at least one. Walking a
  // running total rather than re-joining per candidate: a caller is allowed to
  // ask for a large max_lines, and shedding one line at a time from a re-joined
  // string is quadratic in exactly that case.
  let slice = lines.slice(start - 1, end)
  let oversizeLine = false
  if (slice.length === 0) {
    end = start - 1 // start is past the end: an empty window
  } else {
    let acc = 0
    let kept = 0
    for (let i = 0; i < slice.length; i += 1) {
      const add = (i === 0 ? 0 : 1) + slice[i].length // the "\n" joining it to the previous
      if (i > 0 && acc + add > READ_WINDOW_MAX_CHARS) break
      acc += add
      kept = i + 1
    }
    if (kept < slice.length) {
      slice = slice.slice(0, kept)
      end = start + kept - 1
      cappedBy = 'max_chars' // set only when lines were actually dropped
    }
    // A single line over the cap is returned whole rather than chopped —
    // splitting a speaker turn mid-sentence is worse than one large response.
    // Nothing was trimmed to get here, so this is not a `max_chars` capping.
    oversizeLine = slice.length === 1 && slice[0].length > READ_WINDOW_MAX_CHARS
  }

  const windowText = slice.join('\n')
  // `complete` means "there is nothing after this window", which is the question
  // every caller is actually asking. Defining it as "this response is the whole
  // document" instead — start === 1 && end >= totalLines — makes it false on the
  // FINAL chunk of every multi-chunk document, at the same time as
  // next_start_line goes null. A loop written against it then reads
  // "incomplete, continue from null", starts over at line 1, and never ends.
  const complete = end >= totalLines

  return {
    text: windowText,
    total_lines: totalLines,
    // The whole document on the same normalisation the windows use, so window
    // character counts sum to it.
    document_character_count: lines.reduce((n, l) => n + l.length, 0) + Math.max(totalLines - 1, 0),
    complete,
    next_start_line: end >= totalLines ? null : end + 1,
    window: {
      start_line: start,
      end_line: end,
      line_count: slice.length,
      character_count: windowText.length,
      capped_by: cappedBy,
      ...(oversizeLine ? { oversize_line: true } : {}),
    },
  }
}

async function getFile(fileId, fields = FILE_FIELDS) {
  const res = await driveFetch(driveUrl(`/files/${encodeURIComponent(fileId)}`, { fields }))
  return res.json()
}

// Drive query strings are single-quoted, so a name containing an apostrophe —
// "Transcript - O'Brien.docx" — breaks the query unless it is escaped.
function escapeDriveQuery(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

// ------------------------------------------------------- conversion
//
// Word files and plain text are both unreadable here, for the same reason once
// removed: the Docs API only speaks native Google Docs, and alt=media returns
// 403 cannotDownloadFile because the org blocks downloads. That kills .docx
// (binary, no Docs endpoint) and .txt (readable in principle, but only by
// downloading it) alike.
//
// What is NOT blocked is a server-side files.copy with a target mimeType —
// Drive converts the document in place and the copy reads through the Docs API
// like any other Doc. Verified live for both .docx and text/plain.
//
// So a read of any of these becomes: find-or-make a converted twin beside the
// original, read the twin, report the original. The twin's name is prefixed so
// a human can spot and bulk-delete them later; list_files hides them by default
// so they never get mistaken for a second transcript.
const CONVERTED_PREFIX = '_CONVERTED_TO_GOOGLE_'
const CONVERTIBLE_TO_DOC = new Set([
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/msword', // .doc
  'text/plain', // .txt — conversion is the only path; alt=media is blocked org-wide
  'text/markdown', // .md, same story
])

// Plain-text sources are special in one useful way: Drive's `size` for them is
// the byte length of the text itself. A .docx's `size` is its compressed zip
// length and says nothing about the content. See lengthAgreement() below.
const PLAIN_TEXT_MIMES = new Set(['text/plain', 'text/markdown'])

const isConvertedCopy = (name) => typeof name === 'string' && name.startsWith(CONVERTED_PREFIX)

// Extensions this server knows how to read. Used both to name converted copies
// and to decide that "Foo.docx" and "Foo.txt" are the same transcript.
const READABLE_EXT = /\.(docx?|txt|md)$/i

// Drive drops the extension when it converts, so "Foo.docx" comes back as
// "_CONVERTED_TO_GOOGLE_Foo". Ask for that name up front rather than being
// surprised by it — and note that it means two sources differing only by
// extension (Foo.docx, Foo.txt) would want the same name, which is why the
// twin is matched by recorded source id below and not by name.
const convertedName = (sourceName) => CONVERTED_PREFIX + sourceName.replace(READABLE_EXT, '')

// Provenance lives in appProperties: a private key-value pair on the copy that
// only this application sees. Matching on it means a rename, an extension
// collision, or a hand-edited title cannot make one source read another's text.
const SOURCE_ID_KEY = 'fence_converted_from'

// The newest non-trashed twin of this exact source, or null. Newest wins because
// a changed source produces a fresh conversion rather than mutating the old one.
async function findConvertedTwin(source, parent) {
  const q = [
    `'${parent}' in parents`,
    `appProperties has { key='${SOURCE_ID_KEY}' and value='${escapeDriveQuery(source.id)}' }`,
    `mimeType = 'application/vnd.google-apps.document'`,
    'trashed = false',
  ].join(' and ')

  const url = driveUrl('/files', {
    q,
    fields: `files(${FILE_FIELDS})`,
    orderBy: 'createdTime desc',
    pageSize: 10,
    corpora: 'allDrives',
  })
  const page = await (await driveFetch(url)).json()
  return (page.files || [])[0] || null
}

async function convertToGoogleDoc(source, parent) {
  if (READ_ONLY) {
    throw new Error(
      `${source.name} is a Word document and has to be converted to a Google Doc before ` +
      `it can be read, but this server is read-only (DRIVE_READ_ONLY=1). Convert it in ` +
      `Drive by hand (File → Save as Google Docs), or run against a writable fence.`
    )
  }
  await assertInFence(parent, { forWrite: true })

  const res = await driveFetch(
    driveUrl(`/files/${encodeURIComponent(source.id)}/copy`, { fields: FILE_FIELDS }),
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: convertedName(source.name),
        parents: [parent],
        mimeType: 'application/vnd.google-apps.document',
        appProperties: { [SOURCE_ID_KEY]: source.id },
      }),
    }
  )
  const created = await res.json()
  ancestryCache.set(created.id, true)
  logf(`converted ${source.name} -> ${created.name} (${created.id})`)
  return created
}

// Drive's file search is an index, and the index lags: a copy created four
// seconds ago is reliably NOT found by a files.list query yet (observed — two
// reads of the same .docx seconds apart produced two copies). So remember what
// this process converted and check that before asking Drive. The search still
// runs for twins made by an earlier process, by which time the index has caught up.
const convertedTwinCache = new Map() // source file id -> { id, createdTime }

// Reuse an existing twin only if it is at least as new as the source. A twin
// older than the source's last edit is stale, and reading it would silently
// serve yesterday's transcript.
const twinIsFresh = (twin, source) => Date.parse(twin.createdTime) >= Date.parse(source.modifiedTime)

async function getOrCreateConvertedTwin(source) {
  const parent = (source.parents || [])[0]
  if (!parent) {
    throw new Error(`${source.name} has no parent folder, so its converted copy has nowhere to go`)
  }

  const remembered = convertedTwinCache.get(source.id)
  if (remembered && twinIsFresh(remembered, source)) {
    // Confirm it is still there — someone clearing out the converted copies by
    // hand is expected, and re-converting is the right answer when they have.
    const live = await getFile(remembered.id).catch(() => null)
    if (live && !live.trashed) return { twin: live, freshly_converted: false }
    convertedTwinCache.delete(source.id)
  }

  const existing = await findConvertedTwin(source, parent)
  if (existing && twinIsFresh(existing, source)) {
    convertedTwinCache.set(source.id, { id: existing.id, createdTime: existing.createdTime })
    return { twin: existing, freshly_converted: false }
  }

  const twin = await convertToGoogleDoc(source, parent)
  convertedTwinCache.set(source.id, { id: twin.id, createdTime: twin.createdTime })
  return { twin, freshly_converted: true }
}

// -------------------------------------------------- same-transcript pairing
//
// These folders hold the same interview twice: "Interview.docx" sits beside
// "Interview.txt". Converting both produces two Google Docs of one transcript,
// and — worse — two entries in the inventory, which becomes two conversations
// for one interview downstream. The service account cannot delete anything in
// this shared drive (canDelete=false, canTrash=false, verified live), so a
// redundant copy is permanent. Dedupe therefore has to happen BEFORE the copy.
//
// Pairing is on folder + name-with-extension-stripped, because that is what the
// real duplicates look like. Same stem in a *different* folder is deliberately
// NOT a pair: folder names are the cohort signal in this project, so two
// same-named files in different folders are two different interviews.
const nameStem = (name) =>
  String(name).replace(READABLE_EXT, '').replace(/\s+/g, ' ').trim().toLowerCase()

// Which format wins when the same transcript exists in several. A native Doc
// first because it needs no copy at all. Then Word ahead of plain text — not
// because Word is better, but because it leaves the .txt's `size` free as an
// independent check on the pairing (see lengthAgreement). Converting the .txt
// instead would spend the only corroborating measurement available.
const SOURCE_RANK = {
  'application/vnd.google-apps.document': 0,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 1, // .docx
  'application/msword': 2, // .doc
  'text/plain': 3,
  'text/markdown': 4,
}

const compareSourcePreference = (a, b) =>
  (SOURCE_RANK[a.mimeType] ?? 99) - (SOURCE_RANK[b.mimeType] ?? 99) ||
  Date.parse(b.modifiedTime || 0) - Date.parse(a.modifiedTime || 0) ||
  String(a.id).localeCompare(String(b.id))

// Split a set of same-folder files into canonical sources and the duplicates
// they stand for.
//
// Only cross-FORMAT duplicates are collapsed. Two files with the same stem and
// the same mime type are two separate files that happen to share a name — Drive
// allows it, and hiding one would lose a document. So a duplicate must differ in
// format from the canonical.
function pairByStem(files) {
  const groups = new Map()
  for (const file of files) {
    const parent = (file.parents || [])[0] || 'orphan'
    const key = `${parent}::${nameStem(file.name)}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(file)
  }

  const canonicalFor = new Map() // duplicate file id -> canonical file
  const coveredBy = new Map() // canonical file id -> [duplicate files]

  for (const members of groups.values()) {
    if (members.length < 2) continue
    const ordered = [...members].sort(compareSourcePreference)
    const canonical = ordered[0]
    const dupes = ordered.slice(1).filter((f) => f.mimeType !== canonical.mimeType)
    if (!dupes.length) continue
    for (const d of dupes) canonicalFor.set(d.id, canonical)
    coveredBy.set(canonical.id, dupes)
  }
  return { canonicalFor, coveredBy }
}

// The pairing above is a name match, and a name match can be wrong. This is the
// check on it, and it is free.
//
// A text/plain file's Drive `size` is the byte length of its text. Measured
// against four converted transcripts, `size` minus normalised text length was a
// constant 2-3 characters. So when the duplicate is plain text and the canonical
// is not, the .txt's size is an independent measurement of its own content that
// can be compared to the canonical's text — without converting the .txt.
//
// The tolerance is loose on purpose. The stem match is doing the real work; this
// is here to catch a gross mismatch (two unrelated documents that happen to
// share a name), not to police a few characters. UTF-8 needs the headroom too:
// `size` counts bytes and text length counts characters, so an accented
// transcript legitimately runs over. The measured delta is always reported so a
// human can see how close the call actually was.
function lengthAgreement(duplicate, canonicalText) {
  if (!PLAIN_TEXT_MIMES.has(duplicate.mimeType)) {
    return { checked: false, reason: `no content-length signal for ${duplicate.mimeType}` }
  }
  const declaredBytes = Number(duplicate.size)
  if (!Number.isFinite(declaredBytes) || declaredBytes <= 0) {
    return { checked: false, reason: 'Drive reported no size for this file' }
  }
  const textLength = contentNormalise(canonicalText).length
  const delta = Math.abs(declaredBytes - textLength)
  const tolerance = Math.max(256, Math.round(textLength * 0.02))
  return {
    checked: true,
    agrees: delta <= tolerance,
    duplicate_size_bytes: declaredBytes,
    canonical_text_length: textLength,
    delta,
    tolerance,
  }
}

// One non-recursive page-complete listing of a folder's files, used to find a
// file's same-stem siblings at read time.
async function listFolderChildren(folderId) {
  const out = []
  let pageToken = null
  do {
    const url = driveUrl('/files', {
      q: `'${folderId}' in parents and trashed = false`,
      fields: `nextPageToken,files(${FILE_FIELDS})`,
      pageSize: 1000,
      pageToken,
      corpora: 'allDrives',
    })
    const page = await (await driveFetch(url)).json()
    for (const f of page.files || []) {
      if (f.mimeType === 'application/vnd.google-apps.folder') continue
      // Reached as a child of an in-fence folder, so in-fence by construction —
      // record it, the same as the recursive listing does. A sibling promoted to
      // canonical then gets read without a second ancestry walk.
      ancestryCache.set(f.id, true)
      if (isConvertedCopy(f.name)) continue
      out.push(f)
    }
    pageToken = page.nextPageToken || null
  } while (pageToken)
  return out
}

// ---------------------------------------------------------------- the fence

const ancestryCache = new Map() // fileId -> boolean

// Walk parents upward. A file counts as inside the fence only if the root folder
// is reachable from it. Anything else — including a file the SA can otherwise
// read, e.g. shared with it separately — is refused.
async function assertInFence(fileId, { forWrite = false } = {}) {
  if (typeof fileId !== 'string' || !fileId.trim()) {
    throw new Error('fileId is required')
  }
  if (forWrite && READ_ONLY) {
    throw new Error('this server is configured read-only (DRIVE_READ_ONLY=1)')
  }
  if (fileId === ROOT_FOLDER_ID) return

  const cached = ancestryCache.get(fileId)
  if (cached === true) return
  if (cached === false) throw fenceError(fileId)

  const seen = new Set()
  const queue = [fileId]
  let hops = 0

  while (queue.length && hops < 100) {
    const current = queue.shift()
    hops += 1
    if (current === ROOT_FOLDER_ID) {
      ancestryCache.set(fileId, true)
      return
    }
    if (seen.has(current)) continue
    seen.add(current)

    let meta
    try {
      meta = await getFile(current, 'id,parents')
    } catch (err) {
      // A 404 here usually means the SA cannot see the file at all, which is
      // itself a fence answer.
      throw new Error(`cannot verify ${fileId} is inside the fence: ${err.message}`)
    }
    for (const parent of meta.parents || []) queue.push(parent)
  }

  ancestryCache.set(fileId, false)
  throw fenceError(fileId)
}

function fenceError(fileId) {
  return new Error(
    `FENCE VIOLATION: ${fileId} is not inside the "${FENCE_LABEL}" root folder ` +
    `(${ROOT_FOLDER_ID}). This server can only reach files under that folder. ` +
    `If this file belongs to this project, move it into the folder; do not ask ` +
    `for it by ID from elsewhere.`
  )
}

// ---------------------------------------------------------------- listing

// Recursive breadth-first listing with full pagination.
//
// Pagination is exhaustive by design: a partial listing that looks complete is
// the exact failure mode this whole project exists to eliminate. Every result
// carries `complete` and `pages_fetched` so a short read is visible rather than
// plausible.
async function listUnderFolder(folderId, {
  recursive = true,
  mimeType = null,
  includeConverted = false,
  includeDuplicates = false,
} = {}) {
  const collected = []
  const folders = [folderId]
  const visited = new Set()
  let pagesFetched = 0
  let convertedHidden = 0

  while (folders.length) {
    const current = folders.shift()
    if (visited.has(current)) continue
    visited.add(current)

    let pageToken = null
    do {
      const url = driveUrl('/files', {
        q: `'${current}' in parents and trashed = false`,
        fields: `nextPageToken,files(${FILE_FIELDS})`,
        pageSize: 1000,
        pageToken,
        corpora: 'allDrives',
      })
      const page = await (await driveFetch(url)).json()
      pagesFetched += 1

      for (const file of page.files || []) {
        if (file.mimeType === 'application/vnd.google-apps.folder') {
          if (recursive) folders.push(file.id)
          continue
        }
        ancestryCache.set(file.id, true) // reached from root, so it is in-fence
        // A converted twin is a rendering of a file already in this listing, not a
        // document of its own. Surfacing it invites a second ingest of the same
        // transcript under a different file id.
        if (!includeConverted && isConvertedCopy(file.name)) {
          convertedHidden += 1
          continue
        }
        collected.push(file)
      }
      pageToken = page.nextPageToken || null
    } while (pageToken)
  }

  // Pair before filtering by mime type. Filtering first would change which
  // format is present in a group and so change which one is canonical —
  // list_files(mime_type=text/plain) would promote a .txt that a plain listing
  // treats as a duplicate, and the two calls would disagree about what exists.
  const { canonicalFor, coveredBy } = pairByStem(collected)

  const files = []
  const duplicateGroups = []
  let duplicatesHidden = 0

  for (const file of collected) {
    const canonical = canonicalFor.get(file.id)
    if (canonical && !includeDuplicates) {
      duplicatesHidden += 1
      continue
    }
    if (mimeType && file.mimeType !== mimeType) continue
    files.push(file)
    const covers = coveredBy.get(file.id)
    if (covers?.length) {
      duplicateGroups.push({
        transcript: nameStem(file.name),
        reading: { id: file.id, name: file.name, mime_type: file.mimeType },
        set_aside: covers.map((d) => ({ id: d.id, name: d.name, mime_type: d.mimeType })),
      })
    }
  }

  return {
    files,
    pagesFetched,
    foldersScanned: visited.size,
    convertedHidden,
    duplicatesHidden,
    duplicateGroups,
  }
}

// ---------------------------------------------------------------- exports

// Flatten a Docs API document into plain text. Paragraph runs in order, plus
// table cells, so a transcript laid out in a table still comes through.
function extractDocText(node) {
  const out = []
  const walkElements = (elements = []) => {
    for (const el of elements) {
      if (el.paragraph) {
        for (const run of el.paragraph.elements || []) {
          if (run.textRun?.content) out.push(run.textRun.content)
        }
      } else if (el.table) {
        for (const row of el.table.tableRows || []) {
          for (const cell of row.tableCells || []) walkElements(cell.content)
        }
      } else if (el.tableOfContents) {
        walkElements(el.tableOfContents.content)
      }
    }
  }
  walkElements(node.body?.content)
  return out.join('')
}

async function readGoogleDoc(fileId) {
  const res = await driveFetch(`https://docs.googleapis.com/v1/documents/${encodeURIComponent(fileId)}`)
  const doc = await res.json()
  return { text: extractDocText(doc), read_via: 'docs-api', revision_id: doc.revisionId }
}

// The Docs API revision id without pulling the document body — this is what makes
// "have I already processed this?" answerable before paying for a full read.
async function docRevisionId(fileId) {
  const url = `https://docs.googleapis.com/v1/documents/${encodeURIComponent(fileId)}?fields=revisionId`
  const res = await driveFetch(url)
  return (await res.json()).revisionId
}

async function readGoogleSheet(fileId) {
  const url = new URL(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(fileId)}`)
  url.searchParams.set('includeGridData', 'true')
  url.searchParams.set('fields', 'sheets(properties(title),data(rowData(values(formattedValue))))')
  const sheet = await (await driveFetch(url.toString())).json()

  const chunks = []
  for (const s of sheet.sheets || []) {
    chunks.push(`# ${s.properties?.title ?? 'Sheet'}`)
    for (const grid of s.data || []) {
      for (const row of grid.rowData || []) {
        chunks.push((row.values || []).map((c) => c.formattedValue ?? '').join('\t'))
      }
    }
  }
  return { text: chunks.join('\n'), read_via: 'sheets-api' }
}

// Read exactly this file, converting it if that is the only way in. Duplicate
// resolution is the caller's job — by the time we are here, the decision about
// WHICH file to read has been made.
async function readResolved(meta) {
  if (meta.mimeType === 'application/vnd.google-apps.document') {
    return readGoogleDoc(meta.id)
  }
  if (meta.mimeType === 'application/vnd.google-apps.spreadsheet') {
    return readGoogleSheet(meta.id)
  }
  if (CONVERTIBLE_TO_DOC.has(meta.mimeType)) {
    const { twin, freshly_converted } = await getOrCreateConvertedTwin(meta)
    const read = await readGoogleDoc(twin.id)
    return {
      ...read,
      read_via: 'docs-api-converted',
      converted_copy: {
        id: twin.id,
        name: twin.name,
        created_time: twin.createdTime,
        freshly_converted,
      },
    }
  }

  // Everything left that is nominally text. In this Workspace alt=media is
  // blocked, so this path mostly produces an honest 403 rather than bytes —
  // text/plain is handled above precisely because of that.
  if (meta.mimeType?.startsWith('text/') || meta.mimeType === 'application/json') {
    const url = driveUrl(`/files/${encodeURIComponent(meta.id)}`, { alt: 'media' })
    const text = await (await driveFetch(url)).text()
    return { text, read_via: 'drive-media' }
  }

  throw new Error(
    `${meta.name} is ${meta.mimeType}, which this tool cannot read as text. ` +
    `Readable: Google Docs, Google Sheets, Word .doc/.docx and .txt/.md ` +
    `(converted automatically), application/json.`
  )
}

// Is this file one format of a transcript that exists in another format in the
// same folder? Returns the canonical file to read instead, or the duplicates
// this file stands for, or null.
async function resolvePairing(meta) {
  const parent = (meta.parents || [])[0]
  if (!parent) return null
  // Only formats that can plausibly have a cross-format twin are worth a lookup.
  const pairable =
    CONVERTIBLE_TO_DOC.has(meta.mimeType) || meta.mimeType === 'application/vnd.google-apps.document'
  if (!pairable) return null

  // Drive nominally allows several parents, so parents[0] being in-fence does not
  // follow from the file being in-fence — check it before enumerating it, or a
  // multi-parented file could make this list a folder outside the fence and cache
  // its children as reachable.
  await assertInFence(parent)

  const { canonicalFor, coveredBy } = pairByStem(await listFolderChildren(parent))
  const canonical = canonicalFor.get(meta.id)
  if (canonical) return { canonical }
  const covers = coveredBy.get(meta.id)
  return covers?.length ? { covers } : null
}

const brief = (f) => ({ id: f.id, name: f.name, mime_type: f.mimeType })

async function readFileText(fileId) {
  await assertInFence(fileId)
  const meta = await getFile(fileId)
  const pairing = await resolvePairing(meta)

  // This file is a duplicate: read the canonical copy of the transcript and
  // serve its text, so one transcript only ever gets converted once.
  if (pairing?.canonical) {
    const read = await readResolved(pairing.canonical)
    const verification = lengthAgreement(meta, read.text)

    if (verification.checked && !verification.agrees) {
      // The name matched but the content lengths do not. Two different documents
      // that happen to share a name — convert this one on its own and say so,
      // rather than quietly serving the wrong transcript.
      logf(
        `pairing REJECTED: ${meta.name} vs ${pairing.canonical.name} — ` +
        `${verification.duplicate_size_bytes}B vs ${verification.canonical_text_length} chars ` +
        `(delta ${verification.delta} > tolerance ${verification.tolerance})`
      )
      const own = await readResolved(meta)
      return {
        meta,
        ...own,
        duplicate_check: {
          outcome: 'rejected — same name but different content, converted separately',
          compared_with: brief(pairing.canonical),
          ...verification,
        },
      }
    }

    return {
      meta,
      ...read,
      duplicate_of: {
        ...brief(pairing.canonical),
        matched_on: 'same file name, ignoring extension, in the same folder',
        note:
          'Same transcript in another format. Its text is what you are reading, and no ' +
          'second converted copy was made. Ingest this transcript once — and store it ' +
          'under the id above, because "text", "content_sha256" and "revision_id" in ' +
          'this response all describe that file, not the one you asked for.',
        verification,
      },
    }
  }

  const read = await readResolved(meta)
  return {
    meta,
    ...read,
    ...(pairing?.covers ? { also_covers: pairing.covers.map(brief) } : {}),
  }
}

// ---------------------------------------------------------------- writes

// Formats that survive a round-trip in this Workspace.
//
// Raw uploads (text/plain, text/csv as blobs) can be created but NOT read back:
// the org restricts downloads, so Drive returns 403 cannotDownloadFile on
// alt=media. Native Google formats are readable via the Docs/Sheets APIs, which
// the restriction does not cover. So native is the default and raw is opt-in.
const WRITE_FORMATS = {
  google_doc: { target: 'application/vnd.google-apps.document', upload: 'text/plain' },
  google_sheet: { target: 'application/vnd.google-apps.spreadsheet', upload: 'text/csv' },
  raw: { target: null, upload: null },
}

async function writeFile({ name, content, parentFolderId, format = 'google_doc', mimeType }) {
  const parent = parentFolderId || ROOT_FOLDER_ID
  await assertInFence(parent, { forWrite: true })

  const spec = WRITE_FORMATS[format]
  if (!spec) throw new Error(`unknown format "${format}" — use google_doc, google_sheet, or raw`)

  const metadata = { name, parents: [parent] }
  if (spec.target) metadata.mimeType = spec.target
  const uploadType = spec.upload || mimeType || 'text/plain'

  const boundary = `fence-${Math.floor(Date.now() / 1000)}-${process.pid}`
  const body =
    `--${boundary}\r\ncontent-type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\ncontent-type: ${uploadType}; charset=UTF-8\r\n\r\n` +
    `${content}\r\n--${boundary}--`

  const url = new URL('https://www.googleapis.com/upload/drive/v3/files')
  url.searchParams.set('uploadType', 'multipart')
  url.searchParams.set('supportsAllDrives', 'true')
  url.searchParams.set('fields', FILE_FIELDS)

  const res = await driveFetch(url.toString(), {
    method: 'POST',
    headers: { 'content-type': `multipart/related; boundary=${boundary}` },
    body,
  })
  const created = await res.json()
  ancestryCache.set(created.id, true)
  return created
}

async function updateFileContent({ fileId, content, mimeType }) {
  await assertInFence(fileId, { forWrite: true })

  const url = new URL(`https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(fileId)}`)
  url.searchParams.set('uploadType', 'media')
  url.searchParams.set('supportsAllDrives', 'true')
  url.searchParams.set('fields', FILE_FIELDS)

  const res = await driveFetch(url.toString(), {
    method: 'PATCH',
    headers: { 'content-type': mimeType || 'text/plain' },
    body: content,
  })
  return res.json()
}

async function createFolder({ name, parentFolderId }) {
  const parent = parentFolderId || ROOT_FOLDER_ID
  await assertInFence(parent, { forWrite: true })

  const res = await driveFetch(driveUrl('/files', { fields: FILE_FIELDS }), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      name,
      parents: [parent],
      mimeType: 'application/vnd.google-apps.folder',
    }),
  })
  const created = await res.json()
  ancestryCache.set(created.id, true)
  return created
}

// ---------------------------------------------------------------- tools

const READ_TOOLS = [
  {
    name: 'list_files',
    description:
      `List every file under the "${FENCE_LABEL}" project folder, recursively — ` +
      `subfolders included, which is where transcripts usually live. Results are ` +
      `exhaustively paginated; the response includes "complete": true so a short ` +
      `read is never mistaken for an empty folder. Two kinds of duplicate are ` +
      `filtered out so the listing is one entry per transcript: auto-generated "` +
      `${CONVERTED_PREFIX}" copies (counted in "converted_copies_hidden"), and the ` +
      `same transcript saved in two formats, e.g. "Interview.docx" beside ` +
      `"Interview.txt" (counted in "duplicate_sources_hidden" and spelled out in ` +
      `"duplicate_groups", which names exactly which file is being read and which ` +
      `were set aside). Treat each listed file as one transcript to ingest once. ` +
      `Files outside this folder do not exist as far as this tool is concerned.`,
    inputSchema: {
      type: 'object',
      properties: {
        mime_type: {
          type: 'string',
          description:
            'Optional exact MIME filter, e.g. "application/vnd.google-apps.document" for Google Docs.',
        },
        recursive: {
          type: 'boolean',
          description: 'Descend into subfolders. Defaults to true.',
        },
        folder_id: {
          type: 'string',
          description:
            'Optional subfolder to list instead of the project root. Must be inside the fence.',
        },
        include_converted: {
          type: 'boolean',
          description:
            `Include the auto-generated "${CONVERTED_PREFIX}" Google Doc copies of Word ` +
            `and text files. Defaults to false; only useful when cleaning them up.`,
        },
        include_duplicates: {
          type: 'boolean',
          description:
            'Include the same-transcript-different-format files that are normally set ' +
            'aside (the ".txt" next to an identically named ".docx"). Defaults to false. ' +
            'Turn it on only to audit the pairing — ingesting these produces the same ' +
            'transcript twice.',
        },
      },
    },
    handler: async (args) => {
      const start = args.folder_id || ROOT_FOLDER_ID
      if (args.folder_id) await assertInFence(args.folder_id)
      const {
        files, pagesFetched, foldersScanned, convertedHidden, duplicatesHidden, duplicateGroups,
      } = await listUnderFolder(start, {
        recursive: args.recursive !== false,
        mimeType: args.mime_type || null,
        includeConverted: args.include_converted === true,
        includeDuplicates: args.include_duplicates === true,
      })
      return {
        fence: { label: FENCE_LABEL, root_folder_id: ROOT_FOLDER_ID },
        listed_from: start,
        count: files.length,
        complete: true,
        pages_fetched: pagesFetched,
        folders_scanned: foldersScanned,
        converted_copies_hidden: convertedHidden,
        duplicate_sources_hidden: duplicatesHidden,
        duplicate_groups: duplicateGroups,
        files: files.map((f) => ({
          id: f.id,
          name: f.name,
          mime_type: f.mimeType,
          size: f.size,
          modified_time: f.modifiedTime,
          created_time: f.createdTime,
          web_view_link: f.webViewLink,
        })),
      }
    },
  },
  {
    name: 'read_file',
    description:
      `Read a file's full text content — Google Docs via the Docs API, Google Sheets ` +
      `via the Sheets API. Word .doc/.docx and plain .txt/.md are converted to a ` +
      `Google Doc automatically (a "${CONVERTED_PREFIX}" copy is left beside the ` +
      `original) and read from that; you still pass the original's file id and the ` +
      `response still reports the original. If the file is the same transcript as a ` +
      `differently formatted file in the same folder, the already-converted one is ` +
      `read instead of making a second copy, and "duplicate_of" says which — a ` +
      `response carrying "duplicate_of" is a transcript you have already seen, so do ` +
      `not ingest it twice. The file must be inside the "${FENCE_LABEL}" project ` +
      `folder; IDs from anywhere else are refused.\n\n` +
      `READS ARE WINDOWED. A long transcript comes back one chunk at a time — at most ` +
      `${READ_WINDOW_DEFAULT_LINES} lines or ${READ_WINDOW_MAX_CHARS} characters per call, ` +
      `whichever is hit first — so it cannot exhaust your context. Windows are cut on line ` +
      `boundaries and never split a speaker turn. Check "complete": when it is false the ` +
      `document continues, and "next_start_line" is the line to pass as start_line on your ` +
      `next call. Loop until complete is true or next_start_line is null. Never treat one ` +
      `window as the whole document. "content_sha256", "character_count" and "total_lines" ` +
      `always describe the WHOLE document regardless of the window, so change detection ` +
      `works from any single call; "window" describes what this call returned.`,
    inputSchema: {
      type: 'object',
      properties: {
        file_id: { type: 'string', description: 'Drive file ID, from list_files.' },
        start_line: {
          type: 'integer',
          minimum: 1,
          description:
            'First line of the window, 1-based. Defaults to 1. Pass the previous ' +
            'response\'s next_start_line to continue reading.',
        },
        max_lines: {
          type: 'integer',
          minimum: 1,
          description:
            `Maximum lines in this window. Defaults to ${READ_WINDOW_DEFAULT_LINES}. A ` +
            `window is trimmed further if it would exceed ${READ_WINDOW_MAX_CHARS} ` +
            `characters, so a larger value here does not raise that ceiling.`,
        },
      },
      required: ['file_id'],
    },
    handler: async (args) => {
      const {
        meta, text, read_via, revision_id, converted_copy, duplicate_of, duplicate_check, also_covers,
      } = await readFileText(args.file_id)

      // The window is cut from the full text the server already holds. The cost
      // this saves is the caller's context, not the fetch — so the whole-document
      // facts below stay whole-document, computed from the same read.
      const win = windowOf(text, { startLine: args.start_line, maxLines: args.max_lines })

      return {
        file_id: meta.id,
        name: meta.name,
        mime_type: meta.mimeType,
        read_via,
        converted_copy: converted_copy ?? null,
        duplicate_of: duplicate_of ?? null,
        ...(duplicate_check ? { duplicate_check } : {}),
        ...(also_covers ? { also_covers } : {}),
        modified_time: meta.modifiedTime,
        drive_version: meta.version,
        revision_id: revision_id ?? null,
        // Whole-document, every call. Windowing must not change what a checksum
        // means, or "have I already ingested this?" quietly starts comparing a
        // chunk against a document.
        content_sha256: contentSha256(text),
        // Counted over CRLF-folded text, the same basis as total_lines and the
        // per-window counts — otherwise on a CRLF document the window counts can
        // never sum to the document total and the two disagree by a line count.
        character_count: win.document_character_count,
        total_lines: win.total_lines,
        window: win.window,
        next_start_line: win.next_start_line,
        complete: win.complete,
        ...(win.complete
          ? {}
          : {
              note:
                `PARTIAL READ — lines ${win.window.start_line}-${win.window.end_line} of ` +
                `${win.total_lines}. This is not the whole document. Call read_file again ` +
                `with start_line: ${win.next_start_line} to continue.`,
            }),
        text: win.text,
      }
    },
  },
  {
    name: 'get_file_info',
    description:
      `Metadata for one file inside the "${FENCE_LABEL}" project folder, without reading its contents.`,
    inputSchema: {
      type: 'object',
      properties: {
        file_id: { type: 'string', description: 'Drive file ID.' },
      },
      required: ['file_id'],
    },
    handler: async (args) => {
      await assertInFence(args.file_id)
      const meta = await getFile(args.file_id)
      const isDoc = meta.mimeType === 'application/vnd.google-apps.document'
      const isUpload = CONVERTIBLE_TO_DOC.has(meta.mimeType)
      return {
        id: meta.id,
        name: meta.name,
        mime_type: meta.mimeType,
        size: meta.size,
        created_time: meta.createdTime,
        modified_time: meta.modifiedTime,
        // Change signals, cheapest first. revision_id is the one to compare against a
        // prior ingest before deciding to read the document at all.
        //
        // An uploaded file has no Docs revision — .docx and .txt alike are stored
        // bytes, and their md5 changes on every re-upload — so the md5 plays that
        // role for them. Change detection then works the same for every kind of
        // source, which is what callers actually depend on. revision_source says
        // which one you got.
        drive_version: meta.version,
        revision_id: isDoc ? await docRevisionId(args.file_id) : (isUpload ? meta.md5Checksum ?? null : null),
        revision_source: isDoc ? 'docs-api' : (isUpload ? 'md5' : null),
        md5_checksum: meta.md5Checksum ?? null,
        web_view_link: meta.webViewLink,
        inside_fence: true,
      }
    },
  },
]

const WRITE_TOOLS = [
  {
    name: 'write_file',
    description:
      `Create a new file inside the "${FENCE_LABEL}" project folder. Writes anywhere ` +
      `else are refused. Defaults to a native Google Doc because this Workspace ` +
      `blocks downloads — raw uploads can be written but never read back. Pass ` +
      `format "google_sheet" with CSV content for tabular output.`,
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'File name.' },
        content: {
          type: 'string',
          description: 'Full file content. For format "google_sheet", supply CSV.',
        },
        parent_folder_id: {
          type: 'string',
          description: 'Optional subfolder inside the fence. Defaults to the project root.',
        },
        format: {
          type: 'string',
          enum: ['google_doc', 'google_sheet', 'raw'],
          description:
            'google_doc (default) and google_sheet are readable back via read_file. ' +
            '"raw" stores bytes as-is but is NOT readable back in this Workspace.',
        },
        mime_type: {
          type: 'string',
          description: 'Only used with format "raw". Defaults to text/plain.',
        },
      },
      required: ['name', 'content'],
    },
    handler: async (args) => {
      const created = await writeFile({
        name: args.name,
        content: args.content,
        parentFolderId: args.parent_folder_id,
        format: args.format || 'google_doc',
        mimeType: args.mime_type,
      })
      return {
        id: created.id,
        name: created.name,
        mime_type: created.mimeType,
        web_view_link: created.webViewLink,
        bytes_written: Buffer.byteLength(args.content, 'utf8'),
      }
    },
  },
  {
    name: 'update_file',
    description:
      `Overwrite the contents of an existing file inside the "${FENCE_LABEL}" project folder.`,
    inputSchema: {
      type: 'object',
      properties: {
        file_id: { type: 'string', description: 'Drive file ID to overwrite.' },
        content: { type: 'string', description: 'New full content.' },
        mime_type: { type: 'string', description: 'Content MIME type. Defaults to text/plain.' },
      },
      required: ['file_id', 'content'],
    },
    handler: async (args) => {
      const updated = await updateFileContent({
        fileId: args.file_id,
        content: args.content,
        mimeType: args.mime_type,
      })
      return {
        id: updated.id,
        name: updated.name,
        modified_time: updated.modifiedTime,
        bytes_written: Buffer.byteLength(args.content, 'utf8'),
      }
    },
  },
  {
    name: 'create_folder',
    description: `Create a subfolder inside the "${FENCE_LABEL}" project folder.`,
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Folder name.' },
        parent_folder_id: {
          type: 'string',
          description: 'Optional parent inside the fence. Defaults to the project root.',
        },
      },
      required: ['name'],
    },
    handler: async (args) => {
      const created = await createFolder({ name: args.name, parentFolderId: args.parent_folder_id })
      return { id: created.id, name: created.name, web_view_link: created.webViewLink }
    },
  },
]

const TOOLS = READ_ONLY ? READ_TOOLS : [...READ_TOOLS, ...WRITE_TOOLS]
const TOOL_BY_NAME = new Map(TOOLS.map((t) => [t.name, t]))

// ---------------------------------------------------------------- jsonrpc

function send(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`)
}

function respond(id, result) {
  send({ jsonrpc: '2.0', id, result })
}

function respondError(id, code, message) {
  send({ jsonrpc: '2.0', id, error: { code, message } })
}

async function handleRequest(msg) {
  const { id, method, params } = msg

  switch (method) {
    case 'initialize': {
      const requested = params?.protocolVersion
      respond(id, {
        protocolVersion: typeof requested === 'string' ? requested : DEFAULT_PROTOCOL,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
        instructions:
          `Google Drive access fenced to the "${FENCE_LABEL}" project folder ` +
          `(${ROOT_FOLDER_ID})${READ_ONLY ? ', read-only' : ''}. Files outside it are ` +
          `unreachable by design — this enforces client data separation. Start with ` +
          `list_files, which descends into subfolders; never invent or reuse a file ID ` +
          `from another project. Word .doc/.docx and plain .txt/.md files read fine — ` +
          `read_file converts them to a Google Doc on the fly and leaves a ` +
          `"${CONVERTED_PREFIX}" copy beside the original, which list_files then hides. ` +
          `When the same transcript exists in two formats in one folder ("Interview.docx" ` +
          `and "Interview.txt"), list_files shows it once and read_file serves both from ` +
          `a single conversion — so one listed file means one transcript to ingest once. ` +
          `read_file is WINDOWED: a long document arrives in chunks of at most ` +
          `${READ_WINDOW_DEFAULT_LINES} lines / ${READ_WINDOW_MAX_CHARS} characters, cut on ` +
          `line boundaries. Read "complete" on every response and keep calling with ` +
          `start_line: next_start_line until it is true. Work each chunk before fetching the ` +
          `next one — holding them all at once defeats the point.`,
      })
      return
    }

    case 'ping':
      respond(id, {})
      return

    case 'tools/list':
      respond(id, {
        tools: TOOLS.map(({ name, description, inputSchema }) => ({
          name, description, inputSchema,
        })),
      })
      return

    case 'tools/call': {
      const tool = TOOL_BY_NAME.get(params?.name)
      if (!tool) {
        respondError(id, -32602, `unknown tool: ${params?.name}`)
        return
      }
      try {
        const result = await tool.handler(params.arguments || {})
        respond(id, {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        })
      } catch (err) {
        logf(`tool ${tool.name} failed:`, err.message)
        // Surface as a tool error, not a protocol error, so the agent sees it
        // and can correct course.
        respond(id, {
          content: [{ type: 'text', text: `ERROR: ${err.message}` }],
          isError: true,
        })
      }
      return
    }

    default:
      respondError(id, -32601, `method not found: ${method}`)
  }
}

const rl = createInterface({ input: process.stdin, terminal: false })

rl.on('line', (line) => {
  const trimmed = line.trim()
  if (!trimmed) return

  let msg
  try {
    msg = JSON.parse(trimmed)
  } catch {
    logf('dropped unparseable line')
    return
  }

  // Notifications carry no id and get no response.
  if (msg.id === undefined || msg.id === null) return

  handleRequest(msg).catch((err) => {
    logf('handler crashed:', err.stack || err.message)
    respondError(msg.id, -32603, `internal error: ${err.message}`)
  })
})

rl.on('close', () => process.exit(0))

logf(
  `ready — fence "${FENCE_LABEL}" root=${ROOT_FOLDER_ID} ` +
  `sa=${credentials.client_email} tools=${TOOLS.length}${READ_ONLY ? ' (read-only)' : ''}`
)
