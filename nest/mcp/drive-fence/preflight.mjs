#!/usr/bin/env node
// Confirm a service account can actually reach a Drive folder before the deploy
// script registers a server pointed at it. Catches the most common setup error:
// the folder was never shared with the SA, because service accounts are not
// members of the Workspace domain and inherit nothing from it.
//
// Env: GOOGLE_APPLICATION_CREDENTIALS, DRIVE_ROOT_FOLDER_ID
// Exit: 0 reachable and a folder, 1 otherwise.

import { getToken } from './token.mjs'

const folderId = process.env.DRIVE_ROOT_FOLDER_ID
if (!folderId) {
  console.error('DRIVE_ROOT_FOLDER_ID is not set')
  process.exit(1)
}

let token
try {
  token = await getToken({ scope: 'https://www.googleapis.com/auth/drive' })
} catch (err) {
  console.error(`could not authenticate: ${err.message}`)
  process.exit(1)
}

const url = new URL(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(folderId)}`)
url.searchParams.set('supportsAllDrives', 'true')
url.searchParams.set('fields', 'id,name,mimeType,capabilities(canAddChildren,canListChildren)')

const res = await fetch(url, { headers: { authorization: `Bearer ${token}` } })
if (!res.ok) {
  console.error(`Drive returned ${res.status}: ${(await res.text()).slice(0, 400)}`)
  process.exit(1)
}

const folder = await res.json()
if (folder.mimeType !== 'application/vnd.google-apps.folder') {
  console.error(`${folderId} is ${folder.mimeType}, not a folder`)
  process.exit(1)
}

const canWrite = folder.capabilities?.canAddChildren === true
console.log(`folder "${folder.name}" reachable; can write: ${canWrite}`)
if (!canWrite) {
  console.error('WARNING: read-only access. Share as Contributor if agents must write artifacts.')
}
