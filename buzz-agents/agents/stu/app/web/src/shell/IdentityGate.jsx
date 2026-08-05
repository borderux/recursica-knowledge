// Launch gate. Asks who is editing and binds that person to a channel member's pubkey.
//
// It says plainly on screen that this is attribution and not authentication, because a tool whose
// entire job is verifying provenance should not misrepresent its own.

import { useEffect, useState } from 'react'
import { Button, Dropdown, Stack, Text, TextField, Title } from '@recursica/mantine-adapter'

export function IdentityGate({ config, onBound }) {
  const [members, setMembers] = useState(null)
  const [pubkey, setPubkey] = useState(null)
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    api().then((rows) => {
      setMembers(rows)
      if (rows.length === 1) {
        setPubkey(rows[0].pubkey)
        if (rows[0].known_email) setEmail(rows[0].known_email)
      }
    }).catch((e) => setError(e.message))
  }, [])

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const member = members.find((m) => m.pubkey === pubkey)
      const res = await fetch('/api/identity', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          pubkey, email: email.trim(), displayName: member?.display_name ?? null,
        }),
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload?.error ?? 'could not record that identity')
      onBound(payload)
    } catch (e) {
      setError(e.message)
      setBusy(false)
    }
  }

  // Nothing until the members are known — no spinner, per the scaffolding rule on loading.
  if (!members && !error) return null

  return (
    <main className="stu-page stu-page--narrow">
      <form onSubmit={submit}>
        <Stack gap="lg">
          <Stack gap="xs">
            <Title order={1}>Who is editing?</Title>
            <Text variant="subtitle">
              Every change is recorded against this identity — what changed, from what, to what,
              and when.
            </Text>
          </Stack>

          {error && <Text variant="body">{error}</Text>}

          {members && (
            <>
              <Dropdown
                label="You are"
                description={`Members of the ${config.slug} channel`}
                data={members.map((m) => ({
                  value: m.pubkey,
                  label: m.display_name ?? `${m.pubkey.slice(0, 12)}…`,
                }))}
                value={pubkey}
                onChange={(next) => {
                  setPubkey(next)
                  const found = members.find((m) => m.pubkey === next)
                  if (found?.known_email) setEmail(found.known_email)
                }}
              />

              <TextField
                label="Email"
                description="Tied to your Buzz pubkey in the users table"
                placeholder="you@company.com"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.currentTarget.value)}
              />

              <Text variant="body-small">
                This is attribution, not a login. Anyone who can reach this local port can pick
                any name here. It records who says they made a change; it does not prove it.
              </Text>

              <div className="stu-actions">
                <Button type="submit" loading={busy} disabled={!pubkey || !email.trim()}>
                  Start exploring
                </Button>
              </div>
            </>
          )}
        </Stack>
      </form>
    </main>
  )
}

async function api() {
  const res = await fetch('/api/members')
  const payload = await res.json()
  if (!res.ok) throw new Error(payload?.error ?? 'could not read channel members')
  return payload
}
