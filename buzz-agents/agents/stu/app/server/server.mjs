#!/usr/bin/env node
// Stu — local data explorer for one research channel.
//
// Binds 127.0.0.1 only. The service-account key is read in this process and never sent to the
// browser; the front end talks to this API and this API talks to BigQuery.
//
// Usage:
//   node server/server.mjs --slug acme --project <gcp-project> --channel <uuid> [--port 4317]
//
// Every mutating route goes through server/edits.mjs, which writes the audit row. There is no
// route that reaches BigQuery with a write and skips it.

import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

import { loadConfig } from './config.mjs'
import { createClient } from './bq.mjs'
import { createQueries } from './queries.mjs'
import { createEdits } from './edits.mjs'
import { createIdentity } from './identity.mjs'

const HERE = fileURLToPath(new URL('.', import.meta.url))
const WEB_DIST = join(HERE, '..', 'web', 'dist')

const config = loadConfig()
const bq = createClient(config)
const queries = createQueries(bq)
const edits = createEdits(bq, queries)
const identity = createIdentity(bq, config)

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2',
}

// ------------------------------------------------------------------- routing

const routes = [
  ['GET', '/api/config', async () => ({
    slug: config.slug,
    dataset: `${config.project}.${config.dataset}`,
    channel_id: config.channelId,
  })],

  // Deliberately not folded into /api/config: that route is the launcher's readiness probe and
  // gets polled in a loop, so it stays a cheap static answer with no query behind it.
  ['GET', '/api/identity/presented', () => identity.presented()],

  ['GET', '/api/identity/known/:pubkey', (p) => identity.known(p.pubkey)],

  ['GET', '/api/members', () => identity.members()],

  ['POST', '/api/identity', async (_p, body) => identity.bind(body)],

  ['GET', '/api/conversations', () => queries.conversations()],

  ['GET', '/api/conversations/:cid/participants', (p) => queries.participants(p.cid)],

  ['GET', '/api/conversations/:cid/transcript', async (p) => ({
    lines: await queries.transcript(p.cid),
    participants: await queries.participants(p.cid),
  })],

  // The window behind the quote-in-context panel. Deliberately not served from the transcript
  // route: that returns every line of an interview, up to 912 of them, where the panel shows
  // eleven and re-anchors rather than scrolls.
  ['GET', '/api/conversations/:cid/context', (p, _b, url) => queries.lineContext(
    p.cid,
    Number(url.searchParams.get('seq')),
    Number(url.searchParams.get('radius') ?? 5),
  )],

  // The consolidation screen's whole payload in one call. Suggestions are computed against the
  // same snapshot the roster is drawn from, so a merge offered is a merge the table can show.
  ['GET', '/api/participants', async () => {
    const [roster, people, candidates, unattributed] = await Promise.all([
      queries.participantRoster(),
      queries.people(),
      queries.duplicateCandidates(),
      queries.unattributedLines(),
    ])
    return { roster, people, ...candidates, unattributed }
  }],

  ['POST', '/api/people', async (_p, body) => {
    const actor = await identity.actor(body.pubkey)
    return edits.mergeParticipants(actor, {
      participantIds: body.participant_ids,
      personId: body.person_id,
      displayName: body.display_name,
      participantType: body.participant_type,
      email: body.email,
      note: body.note,
    })
  }],

  ['PATCH', '/api/people/:personId', async (p, body) => {
    const actor = await identity.actor(body.pubkey)
    return edits.updatePerson(actor, {
      personId: p.personId,
      displayName: body.display_name,
      participantType: body.participant_type,
      email: body.email,
      note: body.note,
    })
  }],

  // Undo a consolidation for one participant id. Deliberately not DELETE /api/people/:id — a
  // person is not the thing being withdrawn, one record's membership in it is.
  ['DELETE', '/api/participants/:participantId/person', async (p, body) => {
    const actor = await identity.actor(body.pubkey)
    return edits.detachParticipant(actor, {
      participantId: p.participantId,
      note: body.note,
    })
  }],

  ['GET', '/api/tag-library', () => queries.tagLibrary()],

  ['GET', '/api/tags/:tagId/usage', (p) => queries.tagUsage(p.tagId)],

  ['GET', '/api/dictionary', () => queries.dictionary()],

  ['GET', '/api/findings', () => queries.findings()],

  ['GET', '/api/edits', (_p, _b, url) => queries.edits({
    conversationId: url.searchParams.get('conversation_id'),
    targetTable: url.searchParams.get('target_table'),
    limit: Number(url.searchParams.get('limit') ?? 500),
  })],

  ['GET', '/api/orphaned-edits', () => queries.orphanedEdits()],

  ['PATCH', '/api/lines/:lineId', async (p, body) => {
    const actor = await identity.actor(body.pubkey)
    return edits.setCleanedText(actor, {
      conversationId: body.conversation_id,
      lineId: p.lineId,
      value: body.cleaned_text,
      note: body.note,
    })
  }],

  // Withdraw the override and hand the line back to the AI's value. Deliberately a separate
  // route from PATCH with an empty body — that means "no correction needed", which is a verdict.
  ['DELETE', '/api/lines/:lineId/edit', async (p, body) => {
    const actor = await identity.actor(body.pubkey)
    return edits.clearCleanedTextEdit(actor, {
      conversationId: body.conversation_id,
      lineId: p.lineId,
      note: body.note,
    })
  }],

  ['POST', '/api/lines/:lineId/tags', async (p, body) => {
    const actor = await identity.actor(body.pubkey)
    return edits.addTag(actor, {
      conversationId: body.conversation_id,
      lineId: p.lineId,
      tagId: body.tag_id,
      justification: body.justification,
      confidence: body.confidence,
    })
  }],

  ['DELETE', '/api/lines/:lineId/tags/:tagId', async (p, body) => {
    const actor = await identity.actor(body.pubkey)
    return edits.removeTag(actor, {
      conversationId: body.conversation_id,
      lineId: p.lineId,
      tagId: p.tagId,
      note: body.note,
    })
  }],

  ['POST', '/api/tag-library', async (_p, body) => {
    const actor = await identity.actor(body.pubkey)
    return edits.addLibraryTag(actor, {
      tag: body.tag,
      type: body.type,
      description: body.description,
      confidenceThreshold: body.confidence_threshold,
      alias: body.alias,
    })
  }],

  ['PATCH', '/api/dictionary/:termId', async (p, body) => {
    const actor = await identity.actor(body.pubkey)
    return edits.decideTerm(actor, { termId: p.termId, status: body.status, note: body.note })
  }],

  ['PATCH', '/api/findings/:findingId', async (p, body) => {
    const actor = await identity.actor(body.pubkey)
    return edits.decideFinding(actor, {
      findingId: p.findingId, status: body.status, note: body.note,
    })
  }],

  // Answering an open question is not the same operation as approving a finding, so it is not the
  // same route with an extra field. A verdict on a claim and an answer the dataset did not
  // contain are different acts, and the audit trail should not have to guess which one happened.
  ['PUT', '/api/findings/:findingId/resolution', async (p, body) => {
    const actor = await identity.actor(body.pubkey)
    return edits.resolveQuestion(actor, {
      findingId: p.findingId,
      answer: body.answer,
      dismiss: body.dismiss === true,
      note: body.note,
    })
  }],
]

function match(method, pathname) {
  for (const [routeMethod, pattern, handler] of routes) {
    if (routeMethod !== method) continue
    const patternParts = pattern.split('/')
    const pathParts = pathname.split('/')
    if (patternParts.length !== pathParts.length) continue

    const params = {}
    let ok = true
    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i].startsWith(':')) {
        params[patternParts[i].slice(1)] = decodeURIComponent(pathParts[i])
      } else if (patternParts[i] !== pathParts[i]) {
        ok = false
        break
      }
    }
    if (ok) return { handler, params }
  }
  return null
}

// ------------------------------------------------------------------- server

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${config.host}:${config.port}`)

  if (url.pathname.startsWith('/api/')) {
    try {
      const route = match(req.method, url.pathname)
      if (!route) return json(res, 404, { error: `no route for ${req.method} ${url.pathname}` })

      const body = await readBody(req)
      const result = await route.handler(route.params, body, url)
      return json(res, 200, result ?? null)
    } catch (err) {
      // BigQuery RAISE messages and validation errors are both written for a human to read.
      // Pass them through rather than flattening to "internal error".
      const status = /not found|unknown/i.test(err.message) ? 404 : 400
      return json(res, status, { error: err.message })
    }
  }

  return serveStatic(url.pathname, res)
})

async function readBody(req) {
  if (req.method === 'GET' || req.method === 'HEAD') return {}
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  if (!chunks.length) return {}
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    throw new Error('request body is not valid JSON')
  }
}

function json(res, status, payload) {
  const text = JSON.stringify(payload)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(text),
    'cache-control': 'no-store',
  })
  res.end(text)
}

async function serveStatic(pathname, res) {
  // normalize() then a prefix check: a path like /../../.secrets/key.json must not escape dist.
  const rel = normalize(pathname === '/' ? '/index.html' : pathname).replace(/^(\.\.[/\\])+/, '')
  const file = join(WEB_DIST, rel)
  if (!file.startsWith(WEB_DIST)) {
    res.writeHead(403).end('forbidden')
    return
  }

  try {
    const info = await stat(file)
    if (info.isDirectory()) throw new Error('directory')
    const data = await readFile(file)
    res.writeHead(200, {
      'content-type': MIME[extname(file)] ?? 'application/octet-stream',
      'content-length': data.length,
    })
    res.end(data)
  } catch {
    // Single-page app: unknown paths fall back to index.html so client routing works.
    try {
      const data = await readFile(join(WEB_DIST, 'index.html'))
      res.writeHead(200, { 'content-type': MIME['.html'], 'content-length': data.length })
      res.end(data)
    } catch {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
      res.end(
        `Stu's web build is missing.\n\n` +
        `Build it first:\n  cd ${join(HERE, '..', 'web')} && npm install && npm run build\n`,
      )
    }
  }
}

server.listen(config.port, config.host, () => {
  console.log(`stu: ${config.slug} → ${config.project}.${config.dataset}`)
  console.log(`stu: http://${config.host}:${config.port}`)
})
