---
name: recursica-skill-feedback-messaging
description: House rules for telling the user what happened — whether a success needs confirming, banner versus toast, avoiding inline messages, combining duplicates, where system errors appear, and when to show loading. Use for toasts, banners, success or error messages, undo, and waiting states. Not for field validation — see recursica-skill-forms.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Feedback and messaging

These are the house rules for what the application says back to the user after they act, and while they wait. They are opinions, not neutral best practices — treat them as constraints.

These rules assume **complex enterprise web applications, designed for desktop first**, built on a design system whose components are already accessible. The channel (the form a message takes: a toast, a banner or a modal) and the content are design decisions. The timing mostly is not.

## The three governing principles

1. **Success is silent.** A normal successful action needs no confirmation at all. Feedback is kept for the exceptional case — a failure, a change of context, a wait. Each message takes the user's attention on a screen they visit every day.
2. **Never change the height of the page to say something.** This is the stated reason inline messaging is avoided, and it applies more widely. A message that shifts the layout moves the control the user was about to click.
3. **Timing belongs to the library, not to the design.** How long a message stays, whether it persists, and how long an undo lasts all come from the underlying component library. Choose the channel and combine the content. Do not set durations in milliseconds.

## Choosing the channel

| The situation                                                      | The channel                                                   |
| ------------------------------------------------------------------ | ------------------------------------------------------------- |
| A normal action succeeded                                          | **Nothing.** No confirmation                                  |
| Something **just happened**                                        | A **toast**                                                   |
| Something **has not happened yet**                                 | A **banner** — a notification on the page                     |
| The system failed to do something — a save that did not go through | A **toast**                                                   |
| A broader or system-wide condition                                 | A notification channel, where one exists                      |
| An action is in progress                                           | The button's own loading state — see `recursica-skill-button` |
| A decision must be made before continuing                          | A modal — see `recursica-skill-modal`                         |
| A field's value is invalid                                         | The field's assistive element — see `recursica-skill-forms`   |

A toast is a short message that appears briefly and then disappears. A modal is a window that blocks the rest of the page until the user closes it.

## Banner versus toast: tense decides

**A banner is for something that has not happened yet. A toast is for something that just happened.** That is the whole difference, and it settles cases that no list of examples could.

- **Banner** — a notification on the page about something coming up or still pending. It sits in the page because the condition is still going on.
- **Toast** — a report on something that has finished. It is brief because the event is over.

**Applying it to a new case:** put the message in a sentence and check the tense. If it uses "will", "is about to", or "is still", it is a banner. If it uses "has", "was", or "did not", it is a toast.

**The banner component is planned, but it is not in the UI kit (the token file, `recursica_ui-kit.json`, that says which variants and states each component has) yet.** The channel rule above is settled; the component to build it with is still coming. Until it ships, **do not improvise one** — no bordered `div` used as a banner, and no toast used in its place. Raise the need for one, and if the message cannot wait for the component, ask which surface to use in the meantime. See `recursica-skill-design-router`.

## Do not use inline messaging

**Avoid inline messaging. The house does not use it at all.** An inline success or status message inserted into the page changes the height of the page. That moves everything below it while the user is reading it or about to click it.

This applies to brief status and success messages placed in the flow of the page. There are two things it does **not** override:

- **Field validation.** A field's error is shown by its assistive element, which replaces the help text instead of adding to it, so the field's height does not change. Owned by `recursica-skill-forms`.
- **A persistent save status.** Saving each field as it changes requires a save status that stays on the page. The key word is persistent: an element that is always there does not change the height of anything when it updates. Owned by `recursica-skill-forms`.

**A field that saves to the server immediately is where inline messaging is most tempting.** Use the persistent status that the forms rules require, or a toast. Do not insert and remove a message next to the field.

## Toasts

**A toast can appear at any time, over any page.** A toast is for messages that do not depend on the current view. That is also why a toast is the right channel when the action takes the user to another page.

**Use a toast when:**

- **The action took the user somewhere else**, so there is no longer a place on the previous page to say anything.
- **Saving happens bit by bit** as the user works, and interrupting the form would cost more than the reassurance is worth.
- **The system failed.** A save that did not go through is reported here.

**The duration belongs to the library.** Whatever Mantine, Material, or the underlying library sets is the duration. Do not change it, and do not build a separate timing scheme for each message.

**A dismiss control is always available.** The toast component has one, and the user can always remove the notification from the screen. Never ship a toast the user cannot dismiss.

**How long an undo lasts also belongs to the library.** The underlying library decides how long an immediate undo stays available; the design does not set it.

**A toast's duration cannot be lengthened to keep its action within reach.** Where an undo matters, it must also exist somewhere that stays on the screen. The toast points to it, instead of being the only way to reach it. See `recursica-skill-toast`.

## There is no partial success

**An operation either succeeded or it failed. The backend saves all of it or none of it.**

So there is no "3 of 5 records saved" message to design, and no list of results for each item to show. If an operation produces partial results, that is a problem with how the backend groups its changes, not a messaging problem — **raise it instead of building an interface to report it.**

This is why the channel table has no row for it: this state should not reach the interface.

## Consolidate: never stack duplicates

**Ten or twelve toasts piled up because the same error fired again and again is a failure to handle the problem, not a notification strategy.** Combine repeats of the same message into one.

**Never show many messages at the same time.** A screen with several messages at once leaves the user with no idea which to read, which to act on, or where to start. If one operation produces many errors, the interface has one thing to say about that operation, not many.

**Where duplicates are piling up, fix the cause.** An error that keeps repeating is a structural problem, and the message is only a symptom of it — see `recursica-skill-system-conventions`.

## Waiting

**Show a loading indicator when the operation will take more than about 3 seconds.** Below that, an indicator that appears and disappears is a distraction.

**The button is the indicator for its own action.** On submit, the button switches to its disabled look with an animated icon. Owned by `recursica-skill-forms`, and built as described in `recursica-skill-button`.

**Never put a blocking spinner or overlay over the page on submit.** Owned by `recursica-skill-forms`.

**When an operation runs longer than normal, the default is to show no extra message and let it finish.** A "this is taking longer than usual" toast is allowed, but it is not standard practice here. If one is used, it belongs at about 10 seconds — and more often, the right answer is to show nothing more.

## Set by the theme or the component

- **How long a toast lasts, and whether it persists.** Set by the underlying component library.
- **How long an undo stays available.** Same.
- **The dismiss control.** Built into the toast component.
- **The visual design of any message surface** — color, icon, elevation, spacing.

## Out of scope

- **When a field is validated, what its error says, and the save-status requirement** — `recursica-skill-forms`.
- **Blocking confirmations, and dialogs for destructive actions** — `recursica-skill-modal`.
- **Undo policy — when an action gets an undo instead of a confirmation** — `recursica-skill-buttons-links`.
- **The toast component's own variants, states, and accessibility details** — `recursica-skill-toast`.
- **Loader variants, and what a spinner can and cannot tell the user** — `recursica-skill-loader`.
- **Error logging, retry policy, and how the backend classifies a failure.** These are not UI concerns.
- **Transaction boundaries.** Whether an operation saves all at once is a backend requirement, not a design decision — but see the all-or-none rule above, because it is the reason a whole class of messages does not exist.

## Uncovered — ask, do not invent

- **Banners have no component.** The tense rule above says when a banner is right, but nothing says what one looks like, where it sits on the page, whether it can be dismissed, or whether several may appear at once.
- **Live regions.** Which updates are announced to assistive technology, and how urgently, was openly put off in the typography session and never taken up here. Individual component skills state their own announcement requirements, but there is no policy across all surfaces.
- **The notification channel.** It was mentioned as a place for global or system-wide conditions to go, "if one exists". Whether it exists, and what belongs in it instead of a banner, is not settled.
- **Whether a toast may have a title as well as a message**, and whether an error toast lasts a different length of time from a success toast.
- **Banner versus modal.** Named as not covered at the end of the session.

## Pre-flight checklist

- [ ] No confirmation appears for a normal successful action.
- [ ] Each message's channel matches its tense: something that has not happened yet is a banner, and something that just happened is a toast.
- [ ] No hand-built banner is used while the banner component is pending. The need for one is raised as a gap.
- [ ] No brief success or status message is inserted into the page layout.
- [ ] Any field-level save shows the persistent status that the forms rules require, or a toast — not an inline message that appears and disappears.
- [ ] There is no partial-success message and no list of results for each item. Any partial result is raised as a backend problem with how changes are grouped.
- [ ] Repeats of the same message are combined into one, and nothing stacks.
- [ ] No screen shows several messages at the same time, and a repeating error is treated as a cause to fix.
- [ ] The toast duration, persistence, and undo time are the library's defaults, unchanged.
- [ ] The user can dismiss every toast.
- [ ] No undo exists only inside a toast that times out.
- [ ] A loading indicator appears only for operations that take more than about 3 seconds, and the submit button is the indicator for its own action.
- [ ] There is no blocking spinner or overlay on submit.
- [ ] A long-running operation waits with no extra message by default. Any "taking longer than usual" message is deliberate, stated as non-standard, and appears no earlier than about 10 seconds.
- [ ] Uncovered items were asked about, not decided: what a banner looks like and where it sits, live regions, the notification channel, toast titles, how long an error toast lasts, and banner versus modal.
