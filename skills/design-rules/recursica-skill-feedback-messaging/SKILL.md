---
name: recursica-skill-feedback-messaging
description: House rules for telling the user what happened — whether a success needs confirming, banner versus toast, avoiding inline messages, combining duplicates, where system errors appear, and when to show loading. Use for toasts, banners, success or error messages, undo, and waiting states. Not for field validation — see recursica-skill-forms.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Feedback and messaging

This skill sets the house rules for the messages the application shows the user after the user acts, and while the user waits. The house rules are opinions, not neutral best practices. Treat each house rule as a constraint.

The house rules assume **complex enterprise web applications, designed for desktop first**, built on a design system whose components are accessible. A message's channel (the form a message takes: a toast, a banner or a modal) and the message's content are design decisions. The message's timing mostly is not a design decision.

## The three governing principles

1. **A normal successful action shows no message and needs no confirmation.** Keep messages for the exceptional cases: a failure, a change of context, or a wait. Each message takes the user's attention, on a screen the user visits every day.
2. **Never change the height of the page to show a message.** A message that shifts the page layout moves the control the user was about to click. This rule is the stated reason the house rules avoid inline messages. An inline message is a brief status or success message placed in the page layout. The rule also covers messages other than inline messages.
3. **The code library behind the components sets the message timing. The design does not set the timing.** The code library sets how long a message stays, whether the message persists, and how long an undo lasts. Choose the channel and combine the message content. Do not set any duration in milliseconds.

## Choosing the channel

| The situation                                                                   | The channel                                                                           |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| A normal action succeeded                                                       | **No message.** No confirmation                                                       |
| An event or condition **just happened**                                         | A **toast**                                                                           |
| An event or condition **has not happened yet**                                  | A **banner**, a notification on the page                                              |
| The system failed to complete an action, such as a save that did not go through | A **toast**                                                                           |
| A broader or system-wide condition                                              | A notification channel, where one exists                                              |
| An action is in progress                                                        | The loading state of the button that started the action. See `recursica-skill-button` |
| A decision must be made before continuing                                       | A modal. See `recursica-skill-modal`                                                  |
| A field's value is invalid                                                      | The field's assistive element. See `recursica-skill-forms`                            |

A toast is a short message that appears briefly and then disappears. A modal is a window that blocks every other part of the page until the user closes the modal.

## Banner or toast

**Use a banner for an event or condition that has not happened yet. Use a toast for an event or condition that just happened.** The tense of the message is the whole difference between a banner and a toast. The tense settles cases that no list of examples could settle.

- **Banner**: a notification on the page about an event or condition that is coming up or still pending. The banner stays in the page because the condition is still going on.
- **Toast**: a report on an event or condition that has finished. The toast is brief because the event or condition is over.

**Check the tense to decide a new case.** Write the message as a sentence and check the tense of the sentence. If the sentence uses "will", "is about to" or "is still", use a banner. If the sentence uses "has", "was" or "did not", use a toast.

**A banner component is planned, but the banner component is not in the UI kit (the token file, `recursica_ui-kit.json`, that says which variants and states each component has) yet.** The channel rule above is settled. The banner component is still coming. **Until the banner component ships, do not improvise a banner.** Do not use a bordered container as a banner, and do not use a toast in place of a banner. Raise the need for a banner component. If the message cannot wait for the banner component, ask the designer which component shows the message in the meantime. See `recursica-skill-design-router`.

## Inline messages

**Avoid inline messages. The house does not use inline messages at all.** An inline success or status message inserted into the page changes the height of the page. The change in height moves all the content below the message while the user is reading that content or about to click that content.

The ban on inline messages covers brief status and success messages placed in the page layout. The ban does **not** override two rules:

- **Field validation.** The field's assistive element shows the field's error. The error replaces the help text instead of adding to the help text. Because the error replaces the help text, the height of the field does not change. `recursica-skill-forms` owns this rule.
- **A persistent save status.** A form that saves each field as the field changes requires a save status that stays on the page. The key word is persistent. An element that is always on the page does not change the height of any part of the page when the element updates. `recursica-skill-forms` owns this rule.

**On a field that saves to the server immediately, use the persistent save status that the forms rules require, or a toast.** Do not insert and remove a message next to the field. An inline message is most tempting on a field that saves immediately.

## Toasts

**A toast can appear at any time, over any page.** A toast is for a message that does not depend on the current view. For the same reason, a toast is the right channel when an action takes the user to a different page.

**Use a toast when:**

- **The action moved the user away from the place where the user acted.** The previous page no longer has a place on screen to show a message.
- **Saving happens bit by bit as the user works, and a message in the form would interrupt the user more than the message would reassure the user.**
- **The system failed.** Report a save that did not go through in a toast.

**The code library behind the toast component sets the duration (how long the toast stays on screen).** Use the duration the code library sets. Do not change the duration, and do not build a separate timing scheme for each message.

**Every toast has a dismiss control.** The toast component has a dismiss control built in. Never ship a toast the user cannot dismiss.

**The code library also sets how long an undo lasts, including how long an immediate undo stays available.** The design does not set how long an undo lasts.

**A toast's duration cannot be made longer to keep the toast's action within reach.** Where an undo matters, the undo must also exist in a place that stays on the screen. The toast points to that undo, and the toast is not the only way to reach the undo. See `recursica-skill-toast`.

## No partial success

**An operation either succeeded or failed. The backend saves all of an operation's changes or none of the changes.**

The interface therefore has no "3 of 5 records saved" message to design, and no list of results for each item to show. If an operation produces partial results, the cause is a problem with how the backend groups the operation's changes, not a messaging problem. **Raise the partial results as a backend problem instead of building an interface to report the partial results.**

The channel table above has no row for a partial success, because a partial success should not reach the interface.

## Duplicate messages

**Never stack duplicate messages. Combine repeats of the same message into one message.** Ten or twelve identical toasts piled up from one repeating error show that the application failed to handle the underlying problem. A stack of identical toasts is not a notification strategy.

**Never show many messages at the same time.** A screen with several messages at once leaves the user with no idea which message to read, which message to act on, or where to start. If one operation produces many errors, show one message about that operation, not many messages.

**Where duplicate messages pile up, fix the cause.** An error that keeps repeating is a structural problem. The message is only a sign of the structural problem. See `recursica-skill-system-conventions`.

## Waiting

**Show a loading indicator when an operation will take more than about 3 seconds.** For a shorter operation, an indicator that appears and disappears is a distraction.

**The button that starts an action is the loading indicator for that action.** On submit, the button switches to the disabled look with an animated icon. `recursica-skill-forms` owns this rule, and `recursica-skill-button` describes how to build the loading button.

**Never put a blocking spinner or overlay over the page on submit.** `recursica-skill-forms` owns this rule.

**When an operation runs longer than normal, show no extra message by default, and let the operation finish.** A "this is taking longer than usual" toast is allowed, but the toast is not standard practice in the house rules. If a "taking longer than usual" toast is used, show the toast at about 10 seconds. More often, show no extra message.

## Set by the theme or the component

- **How long a toast lasts, and whether the toast persists.** The code library behind the components sets both.
- **How long an undo stays available.** The code library behind the components sets the undo time.
- **The dismiss control.** The toast component has the dismiss control built in.
- **The visual design of every message**: color, icon, elevation and spacing.

## Out of scope

- **When a field is validated, what the field's error says, and the save-status requirement**: `recursica-skill-forms`.
- **Blocking confirmations, and dialogs for destructive actions**: `recursica-skill-modal`.
- **Undo policy, meaning when an action gets an undo instead of a confirmation**: `recursica-skill-buttons-links`.
- **The toast component's variants, states and accessibility details**: `recursica-skill-toast`.
- **Loader variants, and what a spinner can and cannot tell the user**: `recursica-skill-loader`.
- **Error logging, retry policy, and how the backend classifies a failure.** These topics are not interface decisions.
- **Transaction boundaries, meaning which changes the backend saves together.** Whether an operation saves all at once is a backend requirement, not a design decision. See the all-or-none rule under "No partial success" above. The all-or-none rule is the reason the interface has no partial-success messages and no lists of results for each item.

## Open questions

- **Banners have no component.** The tense rule above says when a banner is right. No rule says what a banner looks like, where a banner sits on the page, whether the user can dismiss a banner, or whether several banners may appear at once.
- **Live regions.** Nobody has decided which updates are announced to assistive technology, or how urgently. The team openly put the question off when recording the typography rules, and this skill does not answer the question. Individual component skills state the announcement requirements for each skill's component, but no policy covers the whole application.
- **The notification channel.** The team named a notification channel as the place for global or system-wide conditions, "if one exists". Whether a notification channel exists, and what belongs in a notification channel instead of a banner, is not settled.
- **Whether a toast may have a title as well as a message**, and whether an error toast lasts a different length of time from a success toast.
- **Banner versus modal.** The team named banner versus modal as not covered, at the end of the session that recorded these rules.

## Pre-flight checklist

- [ ] No confirmation appears for a normal successful action.
- [ ] Each message's channel matches the message's tense: a message about an event or condition that has not happened yet is a banner, and a message about an event or condition that just happened is a toast.
- [ ] No hand-built banner is used while the banner component is pending. The need for a banner component is raised as a gap.
- [ ] No brief success or status message is inserted into the page layout.
- [ ] Every field-level save shows the persistent save status that the forms rules require, or a toast, not an inline message that appears and disappears.
- [ ] No partial-success message and no list of results for each item appear. Every partial result is raised as a backend problem with how the backend groups changes.
- [ ] Repeats of the same message are combined into one message, and no messages stack.
- [ ] No screen shows several messages at the same time, and a repeating error is treated as a cause to fix.
- [ ] The toast duration, the toast persistence and the undo time are the code library's defaults, unchanged.
- [ ] The user can dismiss every toast.
- [ ] No undo exists only inside a toast that times out.
- [ ] A loading indicator appears only for operations that take more than about 3 seconds, and the submit button is the loading indicator for the submit action.
- [ ] No blocking spinner or overlay appears on submit.
- [ ] A long-running operation waits with no extra message by default. Any "taking longer than usual" message is deliberate, stated as non-standard, and appears no earlier than about 10 seconds.
- [ ] Open questions were asked about, not decided: what a banner looks like and where a banner sits, live regions, the notification channel, toast titles, how long an error toast lasts, and banner versus modal.
