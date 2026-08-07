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

import { ACTOR_ID_EXPECTED, isActorId, isEmail } from './actor.mjs'

const run = promisify(execFile)

export function createIdentity(bq, { channelId, user }) {
  const T = (name) => bq.table(name)

  async function buzz(args) {
    const { stdout } = await run('buzz', args, { encoding: 'utf8', timeout: 20_000 })
    return JSON.parse(stdout)
  }

  /** What we already have on file for a pubkey, so a returning editor only has to confirm. */
  async function known(pubkey) {
    const rows = await bq.query(
      `SELECT pubkey, email, display_name FROM ${T('users')} WHERE pubkey = @pk`,
      { pk: pubkey },
    )
    return rows[0] ?? null
  }

  return {
    /**
     * Who the launcher presented, enriched with anything already stored for them.
     *
     * This is the ordinary path. `members()` below needs the `buzz` CLI holding a relay
     * credential, which exists only inside an agent's environment — so for every launch a
     * person makes it failed, and the gate had nothing to offer. The launcher knows who it
     * is starting the explorer for; it says so, and the person confirms.
     */
    async presented() {
      if (!user) return null
      const stored = await known(user.pubkey)
      return {
        pubkey: user.pubkey,
        // A name passed at launch is the fresher fact; fall back to what was stored.
        display_name: user.display_name ?? stored?.display_name ?? null,
        email: user.email ?? stored?.email ?? null,
        // Distinguishes "confirm this" from "confirm this for the first time" in the UI.
        recognised: Boolean(stored),
      }
    },

    /** Look up one pubkey the person typed in by hand. */
    known,

    /**
     * Channel members with display names — the optional convenience path.
     *
     * Returns a reason instead of throwing. Requiring a relay credential is fine for a
     * nice-to-have; it is not fine for the only way into the app, which is what it used to
     * be. Callers render the reason and fall back to confirming a presented identity or
     * accepting a pubkey by hand.
     */
    async members() {
      if (!channelId) {
        return { members: [], unavailable: 'no channel configured (pass --channel <uuid>)' }
      }
      let roster
      try {
        roster = await buzz(['channels', 'members', '--channel', channelId])
      } catch (err) {
        // The two real cases: the CLI is not on PATH, or it has no credential. Neither is
        // recoverable from inside a launchd job, so report and let the caller move on.
        const detail = /BUZZ_PRIVATE_KEY|auth error/i.test(err.message)
          ? 'the buzz CLI has no relay credential in this environment'
          : /ENOENT/.test(err.message)
            ? 'the buzz CLI is not on PATH'
            : err.message.split('\n')[0]
        return { members: [], unavailable: detail }
      }
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

      const onFile = await bq.query(
        `SELECT pubkey, email, display_name FROM ${T('users')}`,
      )
      const byPubkey = new Map(onFile.map((u) => [u.pubkey, u]))

      return {
        members: named.map((m) => ({
          ...m,
          known_email: byPubkey.get(m.pubkey)?.email ?? null,
        })),
        unavailable: null,
      }
    },

    /**
     * Bind an email to a pubkey and return the actor every write is stamped with.
     * Re-binding with a different email updates the row and logs it, because a changed
     * identity is itself something a reviewer may need to see.
     */
    async bind({ pubkey, email, displayName }) {
      // The single authority on what an identity may be. The browser has its own check, but only
      // to decide when to enable a button — it is a separate bundle and cannot share this module,
      // so it must not be the thing relied on. Reject here.
      if (!isActorId(pubkey)) {
        throw new Error(ACTOR_ID_EXPECTED)
      }
      if (!isEmail(email)) {
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
