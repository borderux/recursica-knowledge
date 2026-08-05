// BigQuery client for Stu. Service-account auth over REST, zero dependencies.
//
// Three things this does that `mcp/bin/bq-exec.mjs` deliberately does not, because that script
// is a deploy-time utility and this is the read path behind a UI:
//
//   1. **Parameterised queries only.** No caller interpolates a value into SQL. Every user-
//      supplied string travels as a query parameter, so a line_id containing a quote is data.
//   2. **Follows pageToken to exhaustion.** A partial read that looks complete is the exact bug
//      this project was built to remove (see ingest_runs reconciliation in the schema guide).
//      `query()` returns every row or throws; it never returns a short read quietly.
//   3. **Decodes nested and repeated fields.** transcript tags, findings.evidence, and
//      project_dictionary.evidence are ARRAY<STRUCT<…>>. The flat `r.f[i].v` mapping used by
//      bq-exec renders those as raw BigQuery cell objects.
//
// The service-account key is read here and never leaves the server process.

import { createSign } from 'node:crypto'
import { readFileSync } from 'node:fs'

const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const SCOPE = 'https://www.googleapis.com/auth/bigquery'

const b64url = (s) =>
  Buffer.from(s).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

export function createClient({ keyPath, project, dataset, location = 'US' }) {
  if (!keyPath) throw new Error('createClient: keyPath is required')
  if (!project) throw new Error('createClient: project is required')
  if (!dataset) throw new Error('createClient: dataset is required')

  const creds = JSON.parse(readFileSync(keyPath, 'utf8'))
  if (creds.type !== 'service_account') {
    throw new Error(`key at ${keyPath} is type "${creds.type}", expected "service_account"`)
  }

  // Cached until shortly before expiry. One local user does not need a token dance per click.
  let cached = null

  async function accessToken() {
    const now = Math.floor(Date.now() / 1000)
    if (cached && cached.expiresAt > now + 60) return cached.token

    const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
    const claims = b64url(JSON.stringify({
      iss: creds.client_email,
      scope: SCOPE,
      aud: TOKEN_URL,
      exp: now + 3600,
      iat: now,
    }))
    const signer = createSign('RSA-SHA256')
    signer.update(`${header}.${claims}`)
    const sig = signer.sign(creds.private_key, 'base64')
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: `${header}.${claims}.${sig}`,
      }),
    })
    const body = await res.json()
    if (!res.ok) throw new Error(`token exchange failed: ${JSON.stringify(body)}`)
    cached = { token: body.access_token, expiresAt: now + Number(body.expires_in ?? 3600) }
    return cached.token
  }

  async function api(path, init) {
    const token = await accessToken()
    const res = await fetch(`https://bigquery.googleapis.com/bigquery/v2/projects/${project}${path}`, {
      ...init,
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', ...init?.headers },
    })
    const body = await res.json()
    if (!res.ok || body.error) {
      const err = body.error ?? body
      // BigQuery puts RAISE messages here — they are written to be read by a human, so surface
      // the message rather than a wrapped generic.
      throw Object.assign(new Error(err.message ?? `BigQuery request failed: ${JSON.stringify(err)}`), {
        bigquery: err,
      })
    }
    return body
  }

  return {
    project,
    dataset,
    /** Fully-qualified, backtick-quoted table reference. Never takes user input. */
    table(name) {
      if (!/^[a-z_][a-z0-9_]*$/.test(name)) throw new Error(`refusing unsafe table name: ${name}`)
      return `\`${project}.${dataset}.${name}\``
    },
    query: (sql, params) => runQuery({ api, location }, sql, params),
    /** For DML. Returns rows affected; there is no result set to decode. */
    async execute(sql, params) {
      const body = await api('/queries', {
        method: 'POST',
        body: JSON.stringify({
          query: sql,
          useLegacySql: false,
          location,
          timeoutMs: 120_000,
          ...encodeParams(params),
        }),
      })
      await waitForJob({ api, location }, body)
      return Number(body.numDmlAffectedRows ?? 0)
    },
  }
}

async function runQuery({ api, location }, sql, params) {
  let body = await api('/queries', {
    method: 'POST',
    body: JSON.stringify({
      query: sql,
      useLegacySql: false,
      location,
      timeoutMs: 120_000,
      // No maxResults here: the page size is BigQuery's default and we follow every page.
      ...encodeParams(params),
    }),
  })

  body = await waitForJob({ api, location }, body)

  const fields = body.schema?.fields ?? []
  const rows = decodeRows(fields, body.rows)
  const total = Number(body.totalRows ?? rows.length)

  // Follow pageToken to exhaustion. This loop is the whole reason for the totalRows check below.
  let pageToken = body.pageToken
  const jobId = body.jobReference?.jobId
  while (pageToken && jobId) {
    const page = await api(
      `/queries/${encodeURIComponent(jobId)}?location=${encodeURIComponent(location)}` +
      `&pageToken=${encodeURIComponent(pageToken)}`,
      { method: 'GET' },
    )
    rows.push(...decodeRows(page.schema?.fields ?? fields, page.rows))
    pageToken = page.pageToken
  }

  if (rows.length !== total) {
    throw new Error(
      `short read: BigQuery reported ${total} row(s), assembled ${rows.length}. ` +
      `Refusing to return a partial result.`,
    )
  }
  return rows
}

// A query can come back with jobComplete: false when it outruns timeoutMs. Poll rather than
// treat an incomplete job as an empty result — that misread is indistinguishable from "no data".
async function waitForJob({ api, location }, body) {
  if (body.jobComplete !== false) return body
  const jobId = body.jobReference?.jobId
  if (!jobId) throw new Error('BigQuery returned an incomplete job with no job id')

  for (let attempt = 0; attempt < 60; attempt++) {
    await new Promise((r) => setTimeout(r, 1000))
    const polled = await api(
      `/queries/${encodeURIComponent(jobId)}?location=${encodeURIComponent(location)}&timeoutMs=30000`,
      { method: 'GET' },
    )
    if (polled.jobComplete !== false) return polled
  }
  throw new Error(`BigQuery job ${jobId} did not complete within 60s of polling`)
}

// ------------------------------------------------------------------ parameters

// BigQuery's REST parameter encoding is positional-or-named with an explicit type. We only use
// named. Types are inferred from the JS value, with an explicit escape hatch via {type, value}.
function encodeParams(params) {
  if (!params || Object.keys(params).length === 0) return { parameterMode: 'NAMED' }
  return {
    parameterMode: 'NAMED',
    queryParameters: Object.entries(params).map(([name, raw]) => ({
      name,
      ...encodeParam(raw),
    })),
  }
}

function encodeParam(raw) {
  const explicit = raw && typeof raw === 'object' && !Array.isArray(raw) && 'type' in raw && 'value' in raw
  const value = explicit ? raw.value : raw
  const forced = explicit ? raw.type : null

  if (Array.isArray(value)) {
    const itemType = forced ?? scalarType(value.find((v) => v != null))
    return {
      parameterType: { type: 'ARRAY', arrayType: { type: itemType } },
      parameterValue: { arrayValues: value.map((v) => ({ value: v == null ? null : String(v) })) },
    }
  }

  const type = forced ?? scalarType(value)
  return {
    parameterType: { type },
    parameterValue: { value: value == null ? null : String(value) },
  }
}

function scalarType(v) {
  if (v == null) return 'STRING'
  if (typeof v === 'boolean') return 'BOOL'
  if (typeof v === 'number') return Number.isInteger(v) ? 'INT64' : 'FLOAT64'
  if (v instanceof Date) return 'TIMESTAMP'
  return 'STRING'
}

// ------------------------------------------------------------------- decoding

// BigQuery returns every value as a string inside a nested {v: …} envelope, with repeated
// fields wrapped one level deeper. Decoding has to be driven by the schema, not by guessing at
// the shape of the value.
function decodeRows(fields, rows) {
  if (!rows?.length) return []
  return rows.map((row) => decodeStruct(fields, row.f))
}

function decodeStruct(fields, cells) {
  const out = {}
  fields.forEach((field, i) => {
    out[field.name] = decodeCell(field, cells?.[i]?.v)
  })
  return out
}

function decodeCell(field, value) {
  if (field.mode === 'REPEATED') {
    if (value == null) return []
    // Each element arrives as {v: …}; a repeated STRUCT nests {v: {f: [...]}}.
    return value.map((entry) => decodeScalarOrStruct(field, entry?.v))
  }
  return decodeScalarOrStruct(field, value)
}

function decodeScalarOrStruct(field, value) {
  if (value == null) return null
  if (field.type === 'RECORD' || field.type === 'STRUCT') {
    return decodeStruct(field.fields ?? [], value.f)
  }
  return decodeScalar(field.type, value)
}

function decodeScalar(type, value) {
  switch (type) {
    case 'INTEGER':
    case 'INT64':
      return Number(value)
    case 'FLOAT':
    case 'FLOAT64':
    case 'NUMERIC':
    case 'BIGNUMERIC':
      return Number(value)
    case 'BOOLEAN':
    case 'BOOL':
      return value === 'true' || value === true
    case 'TIMESTAMP':
      // BigQuery hands back epoch seconds as a string with microsecond precision.
      return new Date(Number(value) * 1000).toISOString()
    case 'JSON':
      try { return JSON.parse(value) } catch { return value }
    default:
      return value
  }
}
