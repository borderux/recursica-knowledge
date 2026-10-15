---
name: recursica-skill-feedback-messaging
description: House rules for telling the persona what happened — whether a success needs confirming, banner versus toast, avoiding inline messages, combining duplicates, where system errors appear, and when to show loading. Use for toasts, banners, success or error messages, and waiting states. Not for field validation — see recursica-skill-forms.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.2.0
---

# Feedback and messaging

Treat each house rule as a constraint. The house rules are opinions, not neutral best practices. The house rules cover every message the application shows the persona after the persona acts and while the persona waits.

The house rules assume **complex enterprise web applications, designed for desktop first**. The applications are built on a design system whose components are accessible.

The design decides two parts of a message:

- the message's channel (the form a message takes: a toast, a banner or a modal)
- the message's content

The message's timing, such as how long a toast stays, comes from the code library by default.

## The three governing principles

1. **A normal successful action shows no message and needs no confirmation.** For example, applying a filter to a table shows no "Filter applied" message. Keep messages for three exceptional cases:

   - a failure
   - a change of context, such as an action that opens a different page
   - a wait

   Each message takes the persona's attention, on a screen the persona visits every day.

2. **Never change the height of the page to show a message.** A message that shifts the page layout moves the control the persona was about to click.

   - This rule is the stated reason the house rules avoid inline messages.
   - An inline message is a brief status or success message placed in the page layout. For example, "Changes saved" text that appears under a form is an inline message.
   - The rule also covers messages other than inline messages.

3. **Use the code library's default message timing, unless the user asks for a change.** The code library behind the adapter sets three parts of the timing:

   - how long a message stays
   - whether the message persists
   - how long an undo lasts

## Choosing the channel

| The situation                                                                        | The channel                                                                           |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| A normal action succeeded                                                            | **No message.** No confirmation                                                       |
| An event or condition **just happened**                                              | A **toast**                                                                           |
| An event or condition **has not happened yet**                                       | A **banner**, a notification on the page                                              |
| The application failed to complete an action, such as a save that did not go through | A **toast**                                                                           |
| A broader or system-wide condition                                                   | A notification channel, if the application has a notification channel                 |
| An action is in progress                                                             | The loading state of the button that started the action. See `recursica-skill-button` |
| A decision must be made before continuing                                            | A modal. See `recursica-skill-modal`                                                  |
| A field's value is invalid                                                           | The field's assistive element. See `recursica-skill-forms`                            |

A toast is a short message that appears briefly and then disappears. A modal is a window that blocks every other part of the page until the persona closes the modal.

## Banner or toast

**Use a banner for an event or condition that has not happened yet. Use a toast for an event or condition that just happened.** For example:

- "Scheduled maintenance will start at 6 PM" goes in a banner.
- "The report did not send" goes in a toast.

The tense of the message is the whole difference between a banner and a toast. The tense settles cases that no list of examples could settle.

- **Banner**: a notification on the page about an event or condition that is coming up or still pending. The banner stays on the page because the condition is still going on.
- **Toast**: a report on an event or condition that has finished. The toast is brief because the event or condition is over.

**Check the tense to decide a new case.** Write the message as a sentence and check the tense of the sentence.

- If the sentence uses "will", "is about to" or "is still", use a banner.
- If the sentence uses "has", "was" or "did not", use a toast.

**If the theme (the design a designer sets in Theme Forge: the token values, the components, and each component's variants, states and sizes) has a banner component, use the banner component.** Otherwise, follow the steps under "Missing components" in `recursica-skill-design-router`. Never build a banner by hand. Do not use a bordered container as a banner, and do not use a toast in place of a banner. If the message cannot wait for a banner component, confirm with the user which component shows the message until then.

## Inline messages

**Avoid inline messages. The house rules use no inline messages at all.** An inline success or status message inserted into the page changes the height of the page. The change in height moves all the content below the message. For example, "Changes saved" text that appears under a form pushes down the content below the text. The content moves while the persona reads the content or is about to click the content.

The ban on inline messages covers brief status and success messages placed in the page layout. The ban does **not** override two rules from `recursica-skill-forms`:

- **Field validation.** The field's assistive element shows the field's error. The error replaces the help text instead of adding to the help text. Because the error replaces the help text, the height of the field does not change.
- **A persistent save status.** A form that saves each field as the field changes requires a save status that stays on the page. The key word is persistent. When an element that is always on the page updates, no part of the page changes height.

**On a field that saves to the server immediately, show the persistent save status from `recursica-skill-forms`, not a toast.** Do not insert and remove a message next to the field. An inline message is most tempting on a field that saves immediately.

## Toasts

**A toast can appear at any time, over any page.** A toast is for a message that does not depend on the current view. For the same reason, a toast is the right channel when an action takes the persona to a different page.

**Use a toast when:**

- **The action moved the persona away from the place where the persona acted.** The previous page no longer has a place on screen to show a message.
- **The action removed the object from view.** See `recursica-skill-undo`.
- **The application failed.** Report a save that did not go through in a toast.

**Use the toast duration (how long the toast stays on screen) that the code library behind the toast component sets.** Change the duration only when the user asks. Do not build a separate timing scheme for each message.

**Every toast has a dismiss control.** The toast component has a dismiss control built in. Never ship a toast the persona cannot dismiss.

**The code library also sets how long an undo lasts, including how long an immediate undo stays available.** Change how long an undo lasts only when the user asks.

**Do not make a toast's duration longer to keep the toast's action, such as Undo, within reach.** For an Undo button in a toast, follow `recursica-skill-undo`.

## No partial success

**An operation either succeeded or failed. The backend saves all of an operation's changes or none of the changes.** For example, an edit to five records saves all five records or none of the records.

The interface therefore has no "3 of 5 records saved" message to design, and no list of results for each item to show.

**Raise partial results as a backend problem. Do not build an interface to report the partial results.** Partial results come from how the backend groups an operation's changes, so partial results are not a messaging problem.

A partial success should not reach the interface. For that reason, the channel table above has no row for a partial success.

## Duplicate messages

**Never stack duplicate messages. Combine repeats of the same message into one message.** For example, show one "Connection lost" toast, not twelve. Ten or twelve identical toasts from one repeating error show that the application failed to handle the underlying problem. A stack of identical toasts is not a notification strategy.

**Never let messages pile up.** A screen full of messages confuses the persona. The persona cannot tell which message to read, which message to act on, or where to start. Different messages about different events may stack briefly, one toast for each event. `recursica-skill-toast` covers stacking.

**If one operation produces many errors, show one message about that operation, not many messages.** For example, an import with 40 bad rows shows one error message about the import.

**Where duplicate messages pile up, fix the cause.** An error that keeps repeating is a structural problem. The message is only a sign of the structural problem. See `recursica-skill-design-system-conventions`.

## Waiting

**Show a loading indicator when an operation will take more than about 3 seconds.** For a shorter operation, an indicator that appears and disappears is a distraction.

**The button that starts an action is the loading indicator for that action.** On submit, the button shows the theme's loading state. Without a loading state, the button shows the disabled look with an animated icon. For example, a form's Submit button shows the animated icon after the persona clicks the Submit button. `recursica-skill-forms` owns this rule, and `recursica-skill-button` describes how to build the loading button.

**Never put a blocking spinner or overlay over the page on submit.** `recursica-skill-forms` owns this rule.

**When an operation runs longer than normal, show no extra message by default, and let the operation finish.**

- A "this is taking longer than usual" toast is allowed, but the toast is not standard practice in the house rules.
- If a "taking longer than usual" toast is used, show the toast at about 10 seconds.
- More often, show no extra message.

## Set by the theme or the component

- **How long a toast lasts, and whether the toast persists.** The code library behind the components sets both.
- **How long an undo stays available.** The code library behind the components sets the undo time.
- **The dismiss control.** The toast component has the dismiss control built in.
- **The visual design of every message**: color, icon, elevation and spacing.

## Out of scope

- **When a field is validated, what the field's error says, and the save-status requirement**: `recursica-skill-forms`.
- **Blocking confirmations, and dialogs for destructive actions**: `recursica-skill-modal`.
- **Undo policy, meaning when an action gets an undo and where the undo goes**: `recursica-skill-undo`.
- **The toast component's variants, states and accessibility details**: `recursica-skill-toast`.
- **Loader variants, and what a spinner can and cannot tell the persona**: `recursica-skill-loader`.
- **Which changes are announced to assistive technology, and how urgently**: `recursica-skill-live-regions`.
- **Error logging, retry policy, and how the backend classifies a failure.** These topics are not interface decisions.
- **Transaction boundaries, meaning which changes the backend saves together.** Whether an operation saves all at once is a backend requirement, not a design decision. See the all-or-none rule under "No partial success" above. The all-or-none rule is the reason the interface has no partial-success messages and no lists of results for each item.

## Open questions

- **What a banner looks like and where a banner sits.** The tense rule above says when to use a banner. No rule says what a banner looks like or where a banner sits on the page. No rule says whether the persona can dismiss a banner, or whether several banners may appear at once.
- **The notification channel.** The team named a notification channel as the place for global or system-wide conditions, "if one exists". Whether a notification channel exists, and what belongs in a notification channel instead of a banner, is not settled.
- **Toast titles and how long an error toast lasts.** Nobody has decided whether a toast may have a title as well as a message. Nobody has decided whether an error toast lasts a different length of time from a success toast.
- **Banner versus modal.** The team named banner versus modal as not covered, at the end of the session that recorded these rules.

## Pre-flight checklist

- [ ] No confirmation appears for a normal successful action.
- [ ] Every message about an event or condition that has not happened yet is a banner.
- [ ] Every message about an event or condition that just happened is a toast.
- [ ] No banner is built by hand. Where the theme has no banner component, the steps for a missing component were followed.
- [ ] No brief success or status message is inserted into the page layout.
- [ ] Every field-level save shows the persistent save status the forms rules require, never a toast.
- [ ] No field-level save shows an inline message that appears and disappears.
- [ ] No partial-success message and no list of results for each item appear. Every partial result is raised as a backend problem with how the backend groups changes.
- [ ] Repeats of the same message are combined into one message, and no messages stack.
- [ ] Messages never pile up. Duplicates combine, and many messages about one operation become one message. A repeating error is treated as a cause to fix.
- [ ] The toast duration, the toast persistence and the undo time are the code library's defaults.
- [ ] A changed duration, persistence or undo time was asked for by the user.
- [ ] The persona can dismiss every toast.
- [ ] A loading indicator appears only for operations that take more than about 3 seconds.
- [ ] The submit button is the loading indicator for the submit action.
- [ ] No blocking spinner or overlay appears on submit.
- [ ] A long-running operation waits with no extra message by default. Any "taking longer than usual" message is deliberate, stated as non-standard, and appears no earlier than about 10 seconds.
- [ ] Open questions were asked about, not decided: what a banner looks like and where a banner sits, the notification channel, toast titles, how long an error toast lasts, and banner versus modal.
