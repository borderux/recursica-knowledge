// Typed-and-not-saved text, and the prompt that stops a tab switch from throwing it away.
//
// **This is damage control, and `recursica-skill-navigation` says to treat it as such.** Its rule
// reads: "MUST NOT spread a form across tabs… If forms on multiple tabs are unavoidable, you MUST
// prompt the user on unsaved changes — most likely a modal on tab click. Recognize what this costs:
// it compounds tab selection with dirty-form handling into one interaction, which is the clearest
// evidence that tabs were the wrong container."
//
// Findings and Dictionary both put forms on every tab, and both set `keepMounted={false}` — for a
// good reason that has not changed: with the panels mounted, the Inbox's records and the other
// tab's filter bar and live region were all in the DOM at once, and a live region nobody can see
// was able to speak. So the panel unmounts, and unmounting is exactly what destroyed the typing.
// Flipping `keepMounted` back would trade a silent data loss for a silent announcement; the prompt
// keeps both properties.
//
// What this is not: a general dirty-form guard. It fires on a tab switch and nothing else. A route
// change away from a half-typed correction is a different question with a different answer, and it
// has not been asked.

import { createContext, useContext, useEffect, useId, useMemo, useRef, useState } from 'react'
import { Button, Modal, Stack, Text } from '@recursica/mantine-adapter'

const UnsavedContext = createContext(null)

/**
 * Wraps a tab set whose panels hold forms.
 *
 * `children` is a function taking `guard` — call it with whatever the tab change was going to do,
 * and it either runs it now or holds it behind the confirmation. A render prop rather than a
 * context read, because the component that owns the tab set is the same one that renders this, and
 * a component cannot consume a context it provides.
 */
export function UnsavedWork({ children }) {
  // A ref, not state: which fields are dirty changes on every keystroke and nothing here renders
  // from it. Re-rendering the whole tab set per character is a real cost for no visible effect.
  const dirty = useRef(new Set())
  // The deferred action, or null. Held in a wrapper object because a function stored in state is
  // otherwise called by the updater.
  const [pending, setPending] = useState(null)

  const registry = useMemo(() => ({
    mark(id, isDirty) {
      if (isDirty) dirty.current.add(id)
      else dirty.current.delete(id)
    },
  }), [])

  function guard(go) {
    // Not on every switch — only when something was actually typed. `recursica-skill-panels-modals`
    // says the same thing about closing a panel: "Do not prompt on every close. A modal appearing
    // every time the user closes a panel is interrupting."
    if (dirty.current.size === 0) { go(); return }
    setPending({ go })
  }

  function discard() {
    const { go } = pending
    setPending(null)
    // The panels unmount on the way out and their cleanups clear the registry, but the switch
    // happens in the same commit — so clear it here rather than relying on the order.
    dirty.current.clear()
    go()
  }

  return (
    <UnsavedContext.Provider value={registry}>
      {children(guard)}

      {pending && (
        <Modal
          opened
          onClose={() => setPending(null)}
          title="You have not saved what you typed"
          closeButtonProps={{ 'aria-label': 'Close and stay on this tab' }}
        >
          <Stack gap="sm">
            <Text variant="body">
              Moving to the other tab closes this one, and text you have typed and not saved goes
              with it. Nothing here has been written to the dataset yet.
            </Text>
          </Stack>

          <Modal.Footer>
            {/* Staying is the safe path and the one most people want, so it is the solid button.
                Discarding is the destructive one and it says what it destroys. */}
            <Button variant="outline" onClick={discard}>Discard it and switch</Button>
            <Button variant="solid" onClick={() => setPending(null)}>Stay here</Button>
          </Modal.Footer>
        </Modal>
      )}
    </UnsavedContext.Provider>
  )
}

/**
 * Declare that this component is holding unsaved text, or has stopped.
 *
 * The caller decides what dirty means, because it differs: a note is dirty when it is not empty, an
 * answer pre-filled with the agent's proposal is dirty only once it differs from that proposal.
 *
 * Registering nothing outside an `UnsavedWork` is deliberate — the same form components render on
 * routes with no tab set, and they should not have to know which.
 */
export function useUnsavedWork(isDirty) {
  const registry = useContext(UnsavedContext)
  const id = useId()

  useEffect(() => {
    if (!registry) return undefined
    registry.mark(id, isDirty)
    // Unmounting is the case this whole file is about: the panel goes away, and what it was
    // holding is no longer anyone's unsaved work.
    return () => registry.mark(id, false)
  }, [registry, id, isDirty])
}
