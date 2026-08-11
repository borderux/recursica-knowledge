// Tests for who an edit can be recorded against.
//
//   node --test server/
//
// Node's own runner, so there is nothing to install — the server has no dependencies and this
// keeps it that way. This is the first test in the repository; if you add another, `node --test`
// finds any `*.test.mjs`.
//
// Worth testing rather than eyeballing: this is the rule that decides whether a person outside
// Buzz can record an edit at all, and it is a pair of regexes, which is exactly the kind of code
// that looks obviously right and is off by one character.

import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, describe, it } from 'node:test'
import { pathToFileURL } from 'node:url'
import { promisify } from 'node:util'

import { actorIdKind, isActorId, isEmail } from './actor.mjs'
import { createIdentity } from './identity.mjs'

const run = promisify(execFile)
const HERE = new URL('.', import.meta.url).pathname
const PUBKEY = 'a'.repeat(64)
const EMAIL = 'someone@example.com'

describe('what shape an identity may be', () => {
  it('accepts a 64-character lowercase hex pubkey', () => {
    assert.equal(actorIdKind(PUBKEY), 'pubkey')
  })

  it('accepts an email address', () => {
    assert.equal(actorIdKind(EMAIL), 'email')
  })

  it('refuses an npub, which is the pubkey mistake people actually make', () => {
    assert.equal(actorIdKind('npub1ex09d20j6eugqyyj7nsp8qrx2jnfgpwq60v5ukqr7cfw89sqe27q62hw8x'), null)
  })

  it('refuses uppercase hex, because a BigQuery key is case-sensitive', () => {
    assert.equal(actorIdKind('A'.repeat(64)), null)
  })

  it('refuses hex of the wrong length', () => {
    assert.equal(actorIdKind('a'.repeat(63)), null)
    assert.equal(actorIdKind('a'.repeat(65)), null)
  })

  it('refuses nothing, and non-strings', () => {
    for (const value of ['', null, undefined, 42, {}]) assert.equal(actorIdKind(value), null)
  })

  it('refuses a bare word — an identity is not free text', () => {
    assert.equal(actorIdKind('me'), null)
    assert.equal(isActorId('me'), false)
  })

  it('holds the claim the shared column rests on: only one shape contains "@"', () => {
    assert.ok(EMAIL.includes('@'))
    assert.ok(!PUBKEY.includes('@'))
  })

  it('keeps isEmail narrower than isActorId — a pubkey is not an email', () => {
    assert.equal(isEmail(PUBKEY), false)
    assert.equal(isActorId(PUBKEY), true)
  })
})

describe('what the launcher flags resolve to', () => {
  const dir = mkdtempSync(join(tmpdir(), 'stu-actor-test-'))
  const key = join(dir, 'key.json')
  writeFileSync(key, JSON.stringify({ project_id: 'p', client_email: 'sa@example.com' }))

  // loadConfig reads process.argv at call time, and config.mjs holds no state, so a fresh import
  // per case is only needed to avoid the module cache returning a memoised result. It does not,
  // but importing per case costs nothing and removes the question.
  let n = 0
  const load = async (...extra) => {
    process.argv = ['node', 'stu', '--slug', 'acme', '--project', 'p', '--key', key, ...extra]
    for (const k of Object.keys(process.env)) if (k.startsWith('STU_')) delete process.env[k]
    const { loadConfig } = await import(`./config.mjs?case=${n++}`)
    return loadConfig()
  }

  it('takes an email as the identity when that is all there is — the portable case', async () => {
    const { user } = await load('--user-email', EMAIL)
    assert.equal(user.pubkey, EMAIL)
    assert.equal(user.email, EMAIL)
  })

  it('prefers a pubkey when both are given, because it survives an email change', async () => {
    const { user } = await load('--user', PUBKEY, '--user-email', EMAIL)
    assert.equal(user.pubkey, PUBKEY)
    assert.equal(user.email, EMAIL)
  })

  it('leaves the Buzz path exactly as it was', async () => {
    const { user } = await load('--user', PUBKEY)
    assert.equal(user.pubkey, PUBKEY)
    assert.equal(user.email, null, 'no email is invented')
  })

  it('still allows naming nobody, so the gate can ask', async () => {
    const { user } = await load()
    assert.equal(user, null)
  })

  it('passes the display name through', async () => {
    const { user } = await load('--user-email', EMAIL, '--user-name', 'A Person')
    assert.equal(user.display_name, 'A Person')
  })

  // loadConfig calls process.exit on bad input, so this one has to be a subprocess. It runs a
  // script file rather than `node -e`: with -e, a following `--slug` is claimed by node itself as
  // an unknown option and the process dies with exit 9 before loadConfig is ever reached.
  it('exits with an explanation on an identity it cannot use', async () => {
    const entry = join(dir, 'load.mjs')
    writeFileSync(entry, `import { loadConfig } from ${JSON.stringify(pathToFileURL(join(HERE, 'config.mjs')).href)}\nloadConfig()\n`)
    await assert.rejects(
      run(process.execPath, [entry, '--slug', 'acme', '--project', 'p', '--key', key, '--user', 'npub1abc']),
      (err) => {
        assert.equal(err.code, 1, 'a usage error, not a crash')
        assert.match(err.stderr, /not a usable identity/)
        assert.match(err.stderr, /email address/, 'says what would work, not just that this did not')
        return true
      },
    )
  })

  after(() => { process.argv = ['node', 'test'] })
})

describe('what bind() writes, which is the authority the browser is not', () => {
  const stub = () => {
    const writes = []
    return {
      writes,
      bq: {
        table: (name) => `\`d.${name}\``,
        query: async () => [],
        execute: async (_sql, params) => { writes.push(params); return [] },
      },
    }
  }

  it('binds an email identity — the thing that was impossible before', async () => {
    const { bq, writes } = stub()
    const identity = createIdentity(bq, { channelId: null, user: null })
    const actor = await identity.bind({ pubkey: EMAIL, email: EMAIL, displayName: 'A Person' })
    assert.equal(actor.pubkey, EMAIL)
    assert.equal(writes.length, 1, 'it reached the MERGE')
    assert.equal(writes[0].pubkey, EMAIL)
  })

  it('still binds a pubkey identity', async () => {
    const { bq, writes } = stub()
    const identity = createIdentity(bq, { channelId: null, user: null })
    const actor = await identity.bind({ pubkey: PUBKEY, email: EMAIL, displayName: null })
    assert.equal(actor.pubkey, PUBKEY)
    assert.equal(writes.length, 1)
  })

  it('refuses anything that is not an identity, and writes nothing', async () => {
    for (const bad of ['npub1abc', 'A'.repeat(64), 'nonsense', '', undefined]) {
      const { bq, writes } = stub()
      const identity = createIdentity(bq, { channelId: null, user: null })
      await assert.rejects(() => identity.bind({ pubkey: bad, email: EMAIL }))
      assert.equal(writes.length, 0, `nothing written for ${JSON.stringify(bad)}`)
    }
  })

  it('still requires a real email alongside a pubkey', async () => {
    const { bq, writes } = stub()
    const identity = createIdentity(bq, { channelId: null, user: null })
    await assert.rejects(() => identity.bind({ pubkey: PUBKEY, email: 'not-an-email' }))
    assert.equal(writes.length, 0)
  })
})
