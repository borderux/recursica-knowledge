// Launch gate. Confirms who is editing and binds that person to an identity — a Buzz pubkey where
// there is one, an email address anywhere else. `server/actor.mjs` decides which are acceptable;
// nothing in this file re-states that rule.
//
// It says plainly on screen that this is attribution and not authentication, because a tool whose
// entire job is verifying provenance should not misrepresent its own.
//
// Three paths, in the order they are preferred:
//
//   1. The launcher passed --user. Show that person and ask them to confirm. This is the
//      ordinary case and it needs nothing from the network.
//   2. It did not, but the channel roster is readable. Pick from the roster, as before.
//   3. Neither. Accept an identity by hand, and say why the roster is missing.
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
  const [emailTouched, setEmailTouched] = useState(false)
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

  // Typing an identity by hand: fill in the email already on file for it, so the manual path is
  // still one field for anyone who has used the app before.
  //
  // There is deliberately no validity check here. `server/actor.mjs` is the single authority on
  // what an identity may be, this is a separate bundle that cannot import it, and a second copy
  // of the rule is how the two drift apart. The test below only decides when it is worth *asking*
  // the server — it carries no claim about what is acceptable, and submitting is what finds out.
  async function lookupTyped(next) {
    setTypedPubkey(next)
    setPubkey(next || null)
    // When the identity *is* an email, the field below is asking the same question twice. Fill it
    // in and let them move on — unless they have edited it themselves, in which case what they
    // typed wins. Binding a different email to an identity is legitimate and the server logs it.
    if (!emailTouched && next.includes('@')) setEmail(next)
    if (!next.includes('@') && next.length !== 64) return
    try {
      const stored = await api.knownIdentity(next)
      if (stored?.email && !emailTouched) setEmail(stored.email)
    } catch {
      // An identity with nothing on file is the normal first-run case, not a problem.
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

  // An email is short and is itself the recognisable thing, so truncating it helps nobody; a
  // 64-character pubkey is unreadable whole. Only abbreviate the one that needs it.
  const identity = presented?.pubkey ?? ''
  const label =
    presented?.display_name ?? (identity.includes('@') ? identity : `${identity.slice(0, 12)}…`)

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
              {/* Redundant when the identity is the email itself, and the label already shows it. */}
              {label !== identity && <Text variant="body-small">{identity}</Text>}
              {!presented.recognised && (
                <Text variant="body-small">
                  First time on this project — the email below is what future changes are
                  attributed to.
                </Text>
              )}
            </Stack>
          ) : roster?.length ? (
            <Dropdown
              formLayout="side-by-side"
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
              {/* `assistiveText`, not `description`, and the difference is not cosmetic.
                  **The adapter's `TextField` never destructures `description`**, so it falls
                  through `filterStylingProps` onto the bare Mantine `Input` and lands on the DOM
                  `<input>` as an unknown attribute — no help text at all. It type-checks and
                  vanishes at runtime, which is why it survived seven call sites. `assistiveText`
                  is the prop the adapter actually forwards: `FormControlWrapper` resolves
                  `assistiveText || description` and renders an `AssistiveElement` from it.

                  **That restores the help text and not the `aria-describedby`, and the second half
                  is not fixable from here.** Measured in the running app: the assistive element is
                  present with id `recursica-fc-<n>-assistive`, and the `<input>` carries no
                  `aria-describedby` at all. `FormControlWrapper` does clone the child with one —
                  but the child is Mantine's bare `Input`, which builds
                  `ariaAttributes = { …, 'aria-describedby': ctx?.describedBy }` and spreads it
                  *after* `...rest` (`@mantine/core` `Input.mjs`). With no `Input.Wrapper` above it
                  `ctx` is null, so the clone's value is overwritten with `undefined` on every
                  render.

                  The only call-site lever is `withAria={false}`, and it is a worse trade than it
                  first looks. That block is `{ required, disabled, 'aria-invalid', 'aria-describedby',
                  id: ctx?.inputId || id }` — so switching it off drops the input's **id**, which is
                  what the label points at. It would trade a missing description for a broken label.
                  Not taken.

                  Two upstream items, then, not one: forward `description` from `TextField`, and
                  give the input its describedby (`Input.Wrapper`, or `withAria={false}` plus the
                  adapter setting the aria itself). Note the first alone would not fix the second.

                  `TextArea` and `Dropdown` keep `description` on purpose, and theirs is wired
                  correctly — measured: `aria-describedby` present and resolving. They reach
                  Mantine's own `Input.Wrapper`, which is exactly the `ctx` that `TextField` lacks.
                  Two spellings in one app is not tidy; changing the two that work to match the five
                  that did not would be churn against a defect that belongs upstream. */}
              <TextField
                formLayout="side-by-side"
                label="Email or pubkey"
                assistiveText="An email address, or 64 hex characters from Buzz Desktop → your profile."
                placeholder="you@company.com"
                value={typedPubkey}
                onChange={(e) => lookupTyped(e.currentTarget.value.trim())}
              />
              <Text variant="body-small">
                Nobody was named at launch
                {unavailable ? ` and the channel roster is unavailable — ${unavailable}` : ''}.
                Relaunch with <code>--user-email &lt;you@company.com&gt;</code> to skip this next
                time.
              </Text>
            </Stack>
          )}

          <TextField
            formLayout="side-by-side"
            label="Email"
            assistiveText="Tied to your identity in the users table"
            placeholder="you@company.com"
            type="email"
            value={email}
            onChange={(e) => {
              setEmailTouched(true)
              setEmail(e.currentTarget.value)
            }}
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
