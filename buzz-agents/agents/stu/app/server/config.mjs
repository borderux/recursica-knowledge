// Stu is fenced to exactly one channel's dataset, resolved once at startup.
//
// Same discipline as the bq-<slug> MCP server: the dataset name is derived from the channel
// slug and nothing at runtime can widen it. The service-account key is the channel's own, so
// even a bug here cannot reach another client's data — IAM is the fence that fails safe.

import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const BUZZ_HOME = process.env.BUZZ_HOME || join(homedir(), '.buzz')

const arg = (name) => {
  const i = process.argv.indexOf(`--${name}`)
  return i === -1 ? null : process.argv[i + 1]
}

export function loadConfig() {
  const slug = arg('slug') || process.env.STU_SLUG
  if (!slug) fail('--slug is required (e.g. --slug acme)')
  if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) fail(`--slug must be lowercase alphanumeric with hyphens: got "${slug}"`)

  // No default. A project id names a real client's data, so it is supplied per install
  // (stu.env, the environment, or the flag) rather than baked into a versioned file.
  const project = arg('project') || process.env.STU_PROJECT
  if (!project) {
    fail('--project is required (or set STU_PROJECT, e.g. in stu.env)\n' +
         '  It is the Google Cloud project holding the research dataset.')
  }

  const dataset = arg('dataset') || process.env.STU_DATASET || `research_${slug.replace(/-/g, '_')}`
  const channelId = arg('channel') || process.env.STU_CHANNEL || null
  const keyPath = arg('key') || process.env.STU_BQ_KEY ||
    join(BUZZ_HOME, '.secrets', `claire-${slug}-service-user.json`)
  const port = Number(arg('port') || process.env.STU_PORT || 4317)

  // Who the launcher says is at the keyboard. The alternative was asking the app to work it out
  // by listing the channel roster, which needs a relay credential — and a launchd job has none,
  // so that path 400s for every launch a person makes rather than an agent. Whoever starts the
  // explorer already knows who they are starting it for, so they say.
  //
  // Presented, not proven: see identity.mjs. This decides who the app *offers* to record as the
  // editor, and the person still confirms it on screen.
  const userPubkey = arg('user') || process.env.STU_USER_PUBKEY || null
  if (userPubkey && !/^[0-9a-f]{64}$/.test(userPubkey)) {
    fail(`--user must be a 64-character hex pubkey (not an npub): got "${userPubkey}"`)
  }
  const user = userPubkey
    ? {
        pubkey: userPubkey,
        display_name: arg('user-name') || process.env.STU_USER_NAME || null,
        email: arg('user-email') || process.env.STU_USER_EMAIL || null,
      }
    : null

  if (!existsSync(keyPath)) {
    fail(`service-account key not found at ${keyPath}\n` +
         `  Pass --key <path>, or deploy the channel first with bin/deploy-claire-channel.sh.`)
  }

  return {
    slug,
    project,
    dataset,
    channelId,
    keyPath,
    port,
    user,
    // Loopback only. The key lives in this process; the browser talks to 127.0.0.1 and nothing
    // else can reach the API even on a shared network.
    host: '127.0.0.1',
    buzzHome: BUZZ_HOME,
  }
}

function fail(msg) {
  console.error(`stu: ${msg}`)
  process.exit(1)
}
