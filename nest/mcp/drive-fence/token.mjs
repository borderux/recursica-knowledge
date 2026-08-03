// Service-account access token helper, for tests and diagnostics only.
// server.mjs deliberately keeps its own copy so it stays a single auditable file.

import { createSign } from 'node:crypto'
import { readFileSync } from 'node:fs'

const b64 = (s) =>
  Buffer.from(s).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

export async function getToken({
  keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS,
  scope = 'https://www.googleapis.com/auth/drive',
} = {}) {
  const creds = JSON.parse(readFileSync(keyPath, 'utf8'))
  const now = Math.floor(Date.now() / 1000)
  const header = b64(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claims = b64(JSON.stringify({
    iss: creds.client_email,
    scope,
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
