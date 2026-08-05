// Who is making an edit.
//
// **This is attribution, not authentication.** Anyone who can reach the loopback port can claim
// any channel member's identity — there is no proof, only a record. That is the right trade for
// a single-user local tool and it is what was asked for, but it should never be described as
// access control.
//
// The upgrade path, when it matters: have the browser sign each edit with the user's own Nostr
// key (NIP-07 style) and store the signature alongside the edit_log row. Attribution becomes
// cryptographic and nothing in the schema has to change.

import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const run = promisify(execFile)

export function createIdentity(bq, { channelId }) {
  const T = (name) => bq.table(name)

  async function buzz(args) {
    const { stdout } = await run('buzz', args, { encoding: 'utf8', timeout: 20_000 })
    return JSON.parse(stdout)
  }

  return {
    /** Channel members with display names, for the identity picker at launch. */
    async members() {
      if (!channelId) {
        throw new Error(
          'no channel configured — pass --channel <uuid> so Stu can resolve who you are',
        )
      }
      const roster = await buzz(['channels', 'members', '--channel', channelId])
      const people = roster.filter((m) => m.role !== 'bot')

      // Profile lookups are independent; one missing profile must not lose the whole roster.
      const named = await Promise.all(people.map(async (m) => {
        try {
          const [profile] = await buzz(['users', 'get', '--pubkey', m.pubkey])
          return { pubkey: m.pubkey, role: m.role, display_name: profile?.display_name ?? null }
        } catch {
          return { pubkey: m.pubkey, role: m.role, display_name: null }
        }
      }))

      const known = await bq.query(
        `SELECT pubkey, email, display_name FROM ${T('users')}`,
      )
      const byPubkey = new Map(known.map((u) => [u.pubkey, u]))

      return named.map((m) => ({
        ...m,
        known_email: byPubkey.get(m.pubkey)?.email ?? null,
      }))
    },

    /**
     * Bind an email to a pubkey and return the actor every write is stamped with.
     * Re-binding with a different email updates the row and logs it, because a changed
     * identity is itself something a reviewer may need to see.
     */
    async bind({ pubkey, email, displayName }) {
      if (!/^[0-9a-f]{64}$/.test(pubkey ?? '')) {
        throw new Error('pubkey must be 64 hex characters')
      }
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email ?? '')) {
        throw new Error('a valid email address is required')
      }

      await bq.execute(`
        MERGE ${T('users')} T
        USING (SELECT @pubkey AS pubkey) S
        ON T.pubkey = S.pubkey
        WHEN NOT MATCHED THEN INSERT
          (pubkey, email, display_name, channel_id, first_seen_at, last_seen_at)
          VALUES (@pubkey, @email, @name, @cid, CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP())
        WHEN MATCHED THEN UPDATE SET
          email = @email,
          display_name = COALESCE(@name, T.display_name),
          channel_id = COALESCE(@cid, T.channel_id),
          last_seen_at = CURRENT_TIMESTAMP()
      `, { pubkey, email, name: displayName ?? null, cid: channelId })

      return { pubkey, email, display_name: displayName ?? null }
    },

    /** Resolve a session's claimed pubkey back to a stored identity. */
    async actor(pubkey) {
      const rows = await bq.query(
        `SELECT pubkey, email, display_name FROM ${T('users')} WHERE pubkey = @pk`,
        { pk: pubkey },
      )
      if (!rows.length) {
        throw new Error('unknown editor — bind an email to your identity before making changes')
      }
      return rows[0]
    },
  }
}
