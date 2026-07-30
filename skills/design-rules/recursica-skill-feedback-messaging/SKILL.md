---
name: recursica-skill-feedback-messaging
description: House rules for telling the user what happened in enterprise web applications — whether a successful action needs confirming at all, the banner-versus-toast distinction, why inline messaging is avoided, consolidating duplicate messages instead of stacking toasts, where system errors surface, the threshold for showing a loading indication, and what belongs to the underlying library rather than to the design. Use whenever adding, reviewing, or refactoring a toast, a banner, an on-page notification, a success or error message, an undo affordance, or any waiting state. Trigger on "toast", "notification", "banner", "snackbar", "success message", "error message", "confirmation", "undo", "loading indicator", "spinner", "taking longer than usual", or a question about how to tell the user something happened. Do NOT use for field-level validation copy or timing — that is recursica-skill-forms. Do NOT use for a decision that must block the page — that is recursica-skill-modal.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Feedback and messaging

House rules for what the application says back to the user after they act, and while they wait. These are opinions, not neutral best practices — apply them as constraints.

Context these rules assume: **complex enterprise web applications, desktop-first**, built on a design system whose components are already accessible. The channel and the content are your decisions. Timing is mostly not.

## The three governing principles

1. **Success is silent.** A standard successful action needs no confirmation at all. Feedback is reserved for the exceptional case — a failure, a context change, a wait. Every message you add costs attention on a screen the user visits daily.
2. **Never change the height of the page to say something.** This is the stated reason inline messaging is avoided, and it generalizes: a message that reflows the layout moves the thing the user was about to click.
3. **Timing belongs to the library, not to the design.** Durations, persistence, and undo windows come from the underlying component library. Your job is choosing the channel and consolidating the content — not tuning milliseconds.

## Choosing the channel

| The situation                                                | The channel                                                   |
| ------------------------------------------------------------ | ------------------------------------------------------------- |
| A standard action succeeded                                  | **Nothing.** No confirmation                                  |
| Something **just happened**                                  | A **toast**                                                   |
| Something **has not happened yet**                           | A **banner** — an on-page notification                        |
| The system failed to do something — a save that did not land | A **toast**                                                   |
| A broader or system-wide condition                           | A notification channel, where one exists                      |
| An action is in flight                                       | The button's own loading state — see `recursica-skill-button` |
| A decision must be made before continuing                    | A modal — see `recursica-skill-modal`                         |
| A field's value is invalid                                   | The field's assistive element — see `recursica-skill-forms`   |

## Banner versus toast: tense decides

**A banner is for something that has not happened yet. A toast is for something that just happened.** This is the whole distinction, and it settles cases no list of examples could.

- **Banner** — an on-page notification about a future or pending condition. It sits in the page because the condition persists.
- **Toast** — a report on a completed event. It is transient because the event is over.

**Applying it to a new case:** put the message in a sentence and check the tense. If it is "will", "is about to", or "is still", it is a banner. If it is "has", "was", or "did not", it is a toast.

**The banner component is planned but not yet in the token inventory.** The channel rule above is settled; the component to build it with is coming. Until it ships, **do not improvise one** — no bordered `div` pressed into service, and no toast standing in for it. Raise it, and if the message cannot wait for the component, ask which surface to use in the meantime. See `recursica-skill-design-router`.

## Do not use inline messaging

**Avoid inline messaging. The house does not do it at all.** An inline success or status message inserted into the page layout changes the height of things, which moves everything below it at the moment the user is reading or reaching.

This applies to transient status and success messaging placed in the flow of the page. Two things it does **not** override:

- **Field validation.** A field's error is carried by its assistive element, which replaces the help text rather than adding to it, so the field's height does not change. Owned by `recursica-skill-forms`.
- **A persistent save status.** Field-level save mode requires a persistent status message on the page. Persistent is the operative word: an element that is always present does not change the height of anything when it updates. Owned by `recursica-skill-forms`.

**A field saving immediately to the server is the case where inline messaging is most tempting.** Use the persistent status the forms rules require, or a toast. Do not insert and remove a message beside the field.

## Toasts

**A toast can appear at any time, over any page.** That independence from the current view is what it is for, and it is why a toast is the right channel when the action navigates away.

**Reach for a toast when:**

- **The action routed the user somewhere else**, so there is no longer a place on the previous page to say anything.
- **Saving happens progressively** as the user works, and interrupting the flow of the form would cost more than the reassurance is worth.
- **The system failed.** A save that did not land is reported here.

**Duration is the library's.** Whatever Mantine, Material, or the underlying library sets is the duration. **Do not modify it**, and do not build a per-message timing scheme.

**A dismiss control is always available.** The toast component carries one, and the user may always remove the notification from the screen. Never ship a toast the user cannot dismiss.

**Undo windows are also the library's.** How long an immediate-undo affordance stays available is determined by the underlying library, not set by the design.

**Because the duration is not yours to extend, a toast's action cannot be made reliably reachable by keeping the toast on screen longer.** Where an undo matters, it must also exist somewhere persistent — the toast points at it rather than being the only path to it. See `recursica-skill-toast`.

## There is no partial success

**An operation either succeeded or it failed. The backend commits all of it or none of it.**

So there is no "3 of 5 records saved" message to design, and no per-item result list to render. If an operation is producing partial outcomes, that is a transaction boundary problem in the backend, not a messaging problem — **raise it rather than building an interface to report it.**

This is why the channel table has no row for it: the state should not reach the interface.

## Consolidate: never stack duplicates

**Ten or twelve toasts stacked up because the same error fired repeatedly is a failure to handle the condition, not a notification strategy.** Collapse repeated occurrences of the same message into one.

**Never show many messages concurrently.** A screen carrying several messages at once leaves the user with no idea which to read, which to act on, or where to start. If a single operation produces many errors, the interface has one thing to say about that operation, not many.

**Where duplicates are piling up, fix the cause.** A repeating error is a structural problem, and the message is only its symptom — see `recursica-skill-system-conventions`.

## Waiting

**Show a loading indication when the operation will take more than roughly 3 seconds.** Below that, showing and hiding an indicator is noise.

**The button is the indicator for its own action.** On submit, the button becomes its disabled treatment with an animated icon. Owned by `recursica-skill-forms` and built as described in `recursica-skill-button`.

**Never throw a blocking spinner or overlay over the page on submit.** Owned by `recursica-skill-forms`.

**When an operation runs longer than normal, the default is to let it sit and wait.** A "this is taking longer than usual" toast is permitted but is not standard practice here. If one is used, it belongs at roughly 10 seconds — and the more common correct answer is to show nothing further.

## Not your decision

- **Toast duration and persistence.** Set by the underlying component library.
- **How long an undo stays available.** Same.
- **The dismiss control.** Built into the toast component.
- **Component-level visual design** of any message surface — color, icon, elevation, spacing.

## Out of scope

- **Field-level validation timing, error copy, and the save-status requirement** — `recursica-skill-forms`.
- **Blocking confirmations and destructive-action dialogs** — `recursica-skill-modal`.
- **Undo policy — when an action earns an undo rather than a confirmation** — `recursica-skill-buttons-links`.
- **The toast component's own variants, states, and accessibility mechanics** — `recursica-skill-toast`.
- **Loader variants and what a spinner can and cannot communicate** — `recursica-skill-loader`.
- **Error logging, retry policy, and how the backend classifies a failure.** Not UI concerns.
- **Transaction boundaries.** Whether an operation commits atomically is a backend requirement, not a design decision — but see the all-or-none rule above, because it is the reason a whole class of messaging does not exist.

## Uncovered — ask, do not invent

- **Banners have no component.** The tense rule above says when a banner is correct; nothing says what one looks like, where on the page it sits, whether it is dismissible, or whether several may appear at once.
- **Live regions.** Which updates are announced to assistive technology, and how urgently, was explicitly deferred in the typography session and never picked up here. Individual component skills state their own announcement requirements; there is no cross-surface policy.
- **The notification channel.** Referred to as somewhere global or system-wide conditions could go, "if one exists". Whether it exists, and what belongs in it rather than a banner, is unsettled.
- **Whether a toast may carry a title as well as a message**, and whether an error toast differs in duration from a success one.
- **Banner versus modal.** Named as not covered at the end of the session.

## Pre-flight checklist

- [ ] No confirmation was added for a standard successful action.
- [ ] Every message's channel was chosen by tense: not-yet-happened is a banner, just-happened is a toast.
- [ ] No banner was improvised while the component is still pending; the need was raised instead.
- [ ] No transient success or status message was inserted into the page layout.
- [ ] Any field-level save shows the persistent status the forms rules require, or a toast — not an inline message that appears and disappears.
- [ ] No partial-success message or per-item result list was built; any partial outcome was raised as a backend transaction problem.
- [ ] Repeated occurrences of the same message are consolidated into one; nothing stacks.
- [ ] No screen shows several messages concurrently; a repeating error was treated as a cause to fix.
- [ ] Toast duration, persistence, and undo windows were left to the library and not tuned.
- [ ] Every toast can be dismissed by the user.
- [ ] No undo exists only inside a timed toast.
- [ ] A loading indication appears only for operations over roughly 3 seconds, and the submit button is the indicator for its own action.
- [ ] No blocking spinner or overlay on submit.
- [ ] A long-running operation was left to wait; any "taking longer than usual" message was deliberate, stated as non-standard, and no earlier than roughly 10 seconds.
- [ ] Nothing in the uncovered list was invented.
