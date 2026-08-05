// Launch gate. Confirms who is editing and binds that person to a channel member's pubkey.
//
// It says plainly on screen that this is attribution and not authentication, because a tool whose
// entire job is verifying provenance should not misrepresent its own.
//
// Three paths, in the order they are preferred:
//
//   1. The launcher passed --user. Show that person and ask them to confirm. This is the
//      ordinary case and it needs nothing from the network.
//   2. It did not, but the channel roster is readable. Pick from the roster, as before.
//   3. Neither. Accept a pubkey by hand, and say why the roster is missing.
//
// Path 2 used to be the only one, which made the whole app unreachable whenever the roster
// lookup failed — and it fails for every launch that is not an agent process, because the buzz
// CLI needs a relay credential that a launchd job does not have. See server/identity.mjs.

import { useEffect, useState } from 'react'
import { Button, Dropdown, Stack, Text, TextField, Title } from '@recursica/mantine-adapter'
import { api } from '../api.js'

export function IdentityGate({ config, onBound }) {
  const [presented, setPresented] = useState(null)
  const [roster, setRoster] = useState(null)
  const [unavailable, setUnavailable] = useState(null)
  const [pubkey, setPubkey] = useState(null)
  const [typedPubkey, setTypedPubkey] = useState('')
  const [email, setEmail] = useState('')
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const who = await api.presentedIdentity()
        if (cancelled) return
        if (who?.pubkey) {
          setPresented(who)
          setPubkey(who.pubkey)
          if (who.email) setEmail(who.email)
          setReady(true)
          return
        }
        // No identity was passed in. Fall back to the roster, and treat its absence as a
        // state to render rather than an error that stops everything.
        const { members = [], unavailable: why } = await api.members()
        if (cancelled) return
        setRoster(members)
        setUnavailable(why)
        if (members.length === 1) {
          setPubkey(members[0].pubkey)
          if (members[0].known_email) setEmail(members[0].known_email)
        }
      } catch (e) {
        if (!cancelled) setError(e.message)
      } finally {
        if (!cancelled) setReady(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // Typing a pubkey by hand: fill in the email already on file for it, so the manual path is
  // still one field for anyone who has used the app before.
  async function lookupTyped(next) {
    setTypedPubkey(next)
    if (!/^[0-9a-f]{64}$/.test(next)) return
    setPubkey(next)
    try {
      const stored = await api.knownIdentity(next)
      if (stored?.email) setEmail(stored.email)
    } catch {
      // A pubkey with nothing on file is the normal first-run case, not a problem.
    }
  }

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const displayName =
        presented?.display_name ??
        roster?.find((m) => m.pubkey === pubkey)?.display_name ??
        null
      onBound(await api.bindIdentity({ pubkey, email: email.trim(), displayName }))
    } catch (e) {
      setError(e.message)
      setBusy(false)
    }
  }

  // Nothing until we know which path we are on — no spinner, per the scaffolding rule on loading.
  if (!ready) return null

  const label = presented?.display_name ?? `${presented?.pubkey?.slice(0, 12)}…`

  return (
    <main className="stu-page stu-page--narrow">
      <form onSubmit={submit}>
        <Stack gap="lg">
          <Stack gap="xs">
            <Title order={1}>{presented ? 'Is this you?' : 'Who is editing?'}</Title>
            <Text variant="subtitle">
              Every change is recorded against this identity — what changed, from what, to what,
              and when.
            </Text>
          </Stack>

          {error && <Text variant="body">{error}</Text>}

          {presented ? (
            <Stack gap="xs">
              <Text variant="body">
                <strong>{label}</strong>
              </Text>
              <Text variant="body-small">{presented.pubkey}</Text>
              {!presented.recognised && (
                <Text variant="body-small">
                  First time on this channel — the email below is what future changes are
                  attributed to.
                </Text>
              )}
            </Stack>
          ) : roster?.length ? (
            <Dropdown
              label="You are"
              description={`Members of the ${config.slug} channel`}
              data={roster.map((m) => ({
                value: m.pubkey,
                label: m.display_name ?? `${m.pubkey.slice(0, 12)}…`,
              }))}
              value={pubkey}
              onChange={(next) => {
                setPubkey(next)
                const found = roster.find((m) => m.pubkey === next)
                if (found?.known_email) setEmail(found.known_email)
              }}
            />
          ) : (
            <Stack gap="xs">
              <TextField
                label="Your Buzz pubkey"
                description="64 hex characters. Buzz Desktop → your profile."
                placeholder="0000000000000000000000000000000000000000000000000000000000000000"
                value={typedPubkey}
                onChange={(e) => lookupTyped(e.currentTarget.value.trim())}
              />
              <Text variant="body-small">
                The channel roster is unavailable
                {unavailable ? ` — ${unavailable}` : ''}. Relaunch with{' '}
                <code>--user &lt;pubkey&gt;</code> to skip this next time.
              </Text>
            </Stack>
          )}

          <TextField
            label="Email"
            description="Tied to your Buzz pubkey in the users table"
            placeholder="you@company.com"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.currentTarget.value)}
          />

          <Text variant="body-small">
            This is attribution, not a login. Anyone who can reach this local port can pick any
            name here. It records who says they made a change; it does not prove it.
          </Text>

          <div className="stu-actions">
            <Button type="submit" loading={busy} disabled={!pubkey || !email.trim()}>
              {presented ? 'Confirm and start' : 'Start exploring'}
            </Button>
          </div>
        </Stack>
      </form>
    </main>
  )
}
