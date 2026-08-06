#!/usr/bin/env node
// Run SQL against BigQuery with a service-account key, over REST.
//
// Exists because neither `gcloud` nor `bq` is installed on this host, and the
// deploy script must not depend on an MCP client being up.
//
// Usage:
//   bq-exec.mjs --key <path> --project <id> --sql "SELECT 1"
//   bq-exec.mjs --key <path> --project <id> --file script.sql
//   cat script.sql | bq-exec.mjs --key <path> --project <id> --file -
//
// Exit codes: 0 ok, 1 usage, 2 query failed.

import { createSign } from 'node:crypto'
import { readFileSync } from 'node:fs'

const argv = process.argv.slice(2)
const arg = (name) => {
  const i = argv.indexOf(`--${name}`)
  return i === -1 ? null : argv[i + 1]
}

const keyPath = arg('key') || process.env.GOOGLE_APPLICATION_CREDENTIALS
const project = arg('project')
const location = arg('location') || 'US'
const file = arg('file')
const inlineSql = arg('sql')
const quiet = argv.includes('--quiet')

if (!keyPath || !project || (!file && !inlineSql)) {
  console.error('usage: bq-exec.mjs --key <path> --project <id> (--sql "..." | --file <path|->)')
  process.exit(1)
}

const sql = inlineSql ?? readFileSync(file === '-' ? 0 : file, 'utf8')

const b64 = (s) =>
  Buffer.from(s).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

async function accessToken(creds) {
  const now = Math.floor(Date.now() / 1000)
  const header = b64(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claims = b64(JSON.stringify({
    iss: creds.client_email,
    scope: 'https://www.googleapis.com/auth/bigquery',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
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
  return body.access_token
}

const creds = JSON.parse(readFileSync(keyPath, 'utf8'))
const token = await accessToken(creds)

const res = await fetch(
  `https://bigquery.googleapis.com/bigquery/v2/projects/${project}/queries`,
  {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      query: sql,
      useLegacySql: false,
      location,
      // No maxResults: a capped read that looks complete is the bug this whole
      // project exists to remove.
      timeoutMs: 120000,
    }),
  },
)

const body = await res.json()

if (!res.ok || body.error) {
  console.error('QUERY FAILED')
  console.error(JSON.stringify(body.error ?? body, null, 2))
  process.exit(2)
}
if (body.errors?.length) {
  console.error('QUERY REPORTED ERRORS')
  console.error(JSON.stringify(body.errors, null, 2))
  process.exit(2)
}

if (quiet) {
  process.exit(0)
}

const fields = body.schema?.fields?.map((f) => f.name) ?? []
const rows = (body.rows ?? []).map((r) =>
  Object.fromEntries(fields.map((name, i) => [name, r.f[i].v])),
)

if (!fields.length) {
  console.log(`OK — ${body.numDmlAffectedRows ?? 0} row(s) affected, statement complete`)
} else {
  console.log(JSON.stringify(rows, null, 2))
  console.error(`(${rows.length} row(s); jobComplete=${body.jobComplete})`)
}
