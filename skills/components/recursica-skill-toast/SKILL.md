---
name: recursica-skill-toast
description: Rules for the Recursica toast — when brief feedback is right, only default, success, and error styles, success confirmations, keeping an undo reachable, and announcing without taking focus. Use for toasts, snackbars, and just-happened notifications. Not for decisions — see recursica-skill-modal; not for field errors — see recursica-skill-forms.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Toast

A toast reports what just happened, without interrupting the work.

## When to use a toast

- **Confirming that an action worked** — saved, deleted, sent. This is the only component in the system with a success style, which is why a success confirmation belongs here and not on a field.
- **Offering an undo for the whole page.** `recursica-skill-buttons-links` says so directly: a global undo notification is a toast.
- **Reporting an error that has no field to attach to** — a conflict on the server, a broken business rule, a background job that failed.
- **A low-priority update about a task the user started**, or one being done for them, that does not need their attention now.

## When not to use a toast

| Instead of a toast                                          | Use                                                                             |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Asking the user to confirm a reversible action              | Perform it and offer undo — `recursica-skill-buttons-links`                     |
| A validation error on a specific field                      | The field's error state — `recursica-skill-forms`, `recursica-skill-text-field` |
| Undoing the delete of one row or one item                   | An undo button in place of the delete button — `recursica-skill-buttons-links`  |
| Whole-object destruction, irreversible and hard to recreate | Confirm up front — `recursica-skill-modal`                                      |
| A decision the user must make before continuing             | `recursica-skill-modal`                                                         |
| Information the user will need to refer to later            | Put it on the page. A toast is gone                                             |
| The persistent save status required by field-level saving   | A persistent status on the page — `recursica-skill-forms`                       |
| Progress while an action is in flight                       | The in-button loading state on submit, or `recursica-skill-loader`              |

**A toast reports something that just happened.** That is the house test. `recursica-skill-feedback-messaging` splits the channels (the forms a message takes: a toast, a banner or a modal) by tense: an event that is finished is a toast, and a condition that has not happened yet is a banner. Check the tense of the message before choosing a channel.

**A toast is the wrong place for anything that must not be missed.** It appears away from where the user is looking, and closes on its own. A critical alert that needs action right away is not a toast. No component in this system holds a critical alert yet. The banner the tense rule calls for is planned, but not in the UI kit (the token file, `recursica_ui-kit.json`, that says which variants and states each component has). Do not use a toast for a critical alert, do not build a custom alert that stays on screen, and do not point the reader to a component that does not exist. Raise it with the user — see the open questions.

## Toast styles

Taken from `recursica_ui-kit.json` → `ui-kit.components.toast`. **Do not pass a style that is not listed here.**

**These are design-system names, not code names.** An axis (a property a component varies on, such as size or style; Figma calls it a variant property) and its options are named in the UI kit. Each adapter names them its own way, and an adapter may ignore a name it does not know, with no error. Before setting one in code, look up the adapter's name for it with the Recursica MCP server's `recursica_get_component_doc` tool.

| Axis     | Options                       |
| -------- | ----------------------------- |
| `styles` | `default`, `success`, `error` |

**There are exactly three styles, and there is no warning.** Do not build one, and do not use `error` as a warning — an error style says something failed.

**`default` is also called "Information"** in material shown only on the design-system website. It is one thing with two names.

**The UI kit defines an `icon` and a `text`, and nothing else inside the toast.** There is no token for an action button and none for a close control, though both are shown only on the design-system website. There is no duration or timer token either. Check the open questions before building any of the three.

**There is no size axis and no position axis.** `min-width`, `max-width`, and `min-height` are fixed properties, and nothing in the UI kit says where a toast appears or how several of them stack.

**The three styles differ only by color and icon.** The style only backs up what the text says. It never carries the message on its own.

## Rules for toasts

**The text carries the meaning; the style only backs it up.** An error toast that reads "Something went wrong" in red tells a screen reader user nothing, and tells anyone nothing in black and white. Name what happened: "Could not save — the invoice was changed by someone else." Required by `recursica-skill-system-conventions`.

**A success confirmation belongs in a toast, not on a field.** The toast is the only component with a success style. Do not add a green tick to an input, or a "Saved" note to each field.

**A toast is not the save status that stays on screen.** `recursica-skill-forms` requires a status message that stays visible when each field saves on its own. A toast that disappears cannot meet a requirement to stay visible, and showing one every time a field saves is noise.

**When the form saves in one batch, success on submit is a toast and nothing else.** Show no marker for unsaved changes and no status line. `recursica-skill-forms` is explicit that the enabled submit button is the only other signal.

**One toast per event.** Do not show a toast for each record in a bulk action. Report the whole action once, with its count.

**Use the shortest text that gets the information across.** Do not write full sentences or paragraphs. This is the same microcopy rule forms follow.

**At most one action in a toast**, and it is a single follow-up, such as Undo. Two actions on something that disappears is a decision, and a decision belongs in a modal.

**A toast with an action must not be the only way to reach that action** — see the keyboard section. An undo that disappears with the toast is gone before a keyboard user can reach it.

**Never use a toast as the only record of a destructive action** (an action that deletes data or cannot be undone). Once it is gone, the user has no way back to it.

**The underlying library sets the duration, and the duration stays unchanged.** The duration is whatever Mantine, Material, or the library behind the component sets. Do not tune it, do not vary it by message, and do not make it longer so an action can be reached. Owned by `recursica-skill-feedback-messaging`.

**A dismiss control is always present**, built into the toast component, and the user may always remove the notification from the screen. Never ship a toast that cannot be dismissed.

**How long an undo stays available is also up to the library.** The design does not set how long an immediate undo lasts.

**Because the duration cannot be made longer, an undo must never live only inside a toast.** A keyboard user has to leave the field, tab to the toast, and press the undo before the library's timer closes the toast. Put the undo somewhere on the page that stays, and let the toast point to it.

**Combine duplicates.** The same message repeated collapses into one. Ten identical toasts stacked on screen report one problem ten times — see `recursica-skill-feedback-messaging`.

## Accessibility

This component also follows the accessibility baseline in `recursica-skill-system-conventions`. Only what is specific to it is listed here.

**This is the riskiest component in the system.** It appears without the user asking, disappears without the user doing anything, and shows everything away from where the user is looking. A toast that is not announced is invisible to a screen reader user. A toast that takes focus interrupts typing. And a toast that closes on its own while holding an undo offers an action nobody can reach with a keyboard.

### Screen readers

- **The toast must be announced when it appears, without moving focus.** Use a live region (an area a screen reader announces automatically when its content changes) that exists in the DOM before the message is added. A region created at the same moment as the message is often not announced at all.
- **An error toast is announced right away; a success or `default` toast waits its turn.** The urgent setting, `assertive`, interrupts whatever the screen reader is saying. Use it only for failures. Never let a confirmation cut into what the user is reading or typing, and never leave a failure waiting in a queue. Owned by `recursica-skill-live-regions`.
- **A toast always announces.** No toast appears silently. The toast's text is the announcement. Nothing else should repeat it.
- **The style is not announced.** `success` and `error` differ only by color and icon, so the text must say which it is: "Saved" versus "Could not save".
- **The icon is decorative and must be silent.** It gives a screen reader user nothing useful, and must not be announced as an unlabeled graphic.
- **Several toasts must not produce announcements that overlap.** Use one live region, with messages lined up in order — never one live region per toast, and never a second message cutting off the first in the middle of a sentence.
- **An action in the toast needs a real name that includes what it acts on** — "Undo delete of invoice 1043", not "Undo". By the time the user reaches it, the context around it is gone.
- **A close control needs a real name.** An icon with no label is announced as nothing.
- **Do not announce the same message twice.** A live region and a focus move together make the screen reader read it twice. Use the live region.

### Keyboard and non-mouse navigation

- **Never move focus to the toast when it appears.** It pulls the caret out of a field in the middle of a word, and drops the user somewhere they did not ask to go.
- **A toast with an action cannot close on its own while someone is trying to reach it.** Reaching an undo by keyboard means leaving the current field, tabbing to the toast, and pressing it. A timer running during those steps makes the action impossible to reach. The library sets the duration and it is not changed, so the toast cannot stay on screen longer. The undo must also live somewhere on the page that stays, with the toast pointing to it. Never ship a timed toast whose action is the only way to undo.
- **The toast must be reachable in the tab order while it is visible**, at a predictable point — not after the whole rest of the page.
- **If the timer pauses on hover, it must also pause on focus.** Otherwise the pause helps only mouse users.
- **Closing must work from the keyboard, not only with a pointer.** Every toast has a dismiss control, and that control works from the keyboard.
- **A toast must never cover a control the user needs**, and must not sit over the focused element or the focus ring.
- **Nothing the user needs may appear only on hover** — not the action, not the close control, and not the full text.

## Styling the toast sets itself

Do not set or override any of these. The component sets them for every style:

- `elevation`, `border-radius`, `border-size`.
- `vertical-padding`, `horizontal-padding`, `spacing`.
- `min-width`, `max-width`, `min-height`.
- `icon` — which icon each style carries, and its size.
- `text` type treatment, and all colors per style.

## Skills to read with this one

- `recursica-skill-feedback-messaging` — the owning design-rules skill: whether success needs confirming at all, banner versus toast by tense, why inline messaging is avoided, consolidation, the waiting thresholds, and what the library owns.
- `recursica-skill-buttons-links` — undo policy, when a reversible action is performed rather than confirmed, in-place undo versus global undo, and action label copy.
- `recursica-skill-forms` — field-level errors, the persistent status message field-level saving requires, and the no-status rule under batch saving.
- `recursica-skill-system-conventions` — never carry meaning in a single channel, which is why the style is never the message.
- `recursica-skill-live-regions` — what the application must announce around a toast, and changes the user did not cause.

### Only if the screen also uses those components

- `recursica-skill-modal` — the blocking alternative for a decision that cannot wait, and the narrow case for confirming up front.

## Open questions: ask, do not decide

- **Duration values.** The house position is settled — see the rule above — but no token records what any given library's default is. A duration cannot be checked from this repository.
- **How a toast's action button is styled.** One action is allowed — see the rules above — but the UI kit defines no token for it, only `icon` and `text`. Ask before styling it.
- **Where toasts appear on screen.** No position axis exists. "Towards the bottom" is shown only on the design-system website. Ask before relying on it.
- **Stacking.** How many toasts may be visible at once, in what order, and what happens past that limit.
- **Warnings, and critical alerts.** No warning style exists, and no alert that stays on screen for serious problems exists in this system yet — nothing to hold an alert the user must not miss. The banner component is planned and may cover part of this. Until it ships, do not build a substitute, and do not name a component as though it were available.
- **Whether a toast is ever right for a background job that finishes long after the action that started it.**

## Pre-flight checklist

- [ ] The message is short-lived and safe to miss. Nothing critical, or needed later, was put in a toast, and no alert component that does not exist was named as the alternative.
- [ ] Field errors stayed on their fields. Undo for a single item stayed in place. Deleting something that cannot be undone was confirmed up front instead.
- [ ] Only `default`, `success`, or `error` was passed — no warning style was invented.
- [ ] The text names what happened. The style and icon only back it up, and are never the only way it is shown.
- [ ] The success confirmation is a toast, not a tick on a field.
- [ ] No toast is standing in for the status message that field-level saving requires to stay on screen.
- [ ] There is one toast per event, with a count for bulk actions, and at most one action in it.
- [ ] A live region exists in the DOM before the message is added, and the toast is announced without moving focus.
- [ ] Errors are announced right away (`assertive`); success and default wait their turn (`polite`). Every toast announces, and nothing repeats it.
- [ ] The icon is silent, and the text states the result.
- [ ] Stacked toasts share one live region with messages in order, and their announcements never overlap.
- [ ] Any action has a real accessible name (the name a screen reader reads out for a control) that includes what it acts on. Any close control has a real name.
- [ ] No undo lives only inside a toast. The action also exists somewhere on the page that stays.
- [ ] The duration, how long it stays, and the undo window were left to the library and not tuned.
- [ ] The user can dismiss every toast, and duplicates are combined, not stacked.
- [ ] The message reports something that just happened. Anything that has not happened yet was raised as a case for a banner.
- [ ] The toast can be reached by keyboard at a predictable point in the tab order while it is visible.
- [ ] If hover pauses the timer, focus pauses it too. Closing does not depend on a pointer.
- [ ] The toast covers no control the user needs and does not hide the focus ring. Nothing needed appears only on hover.
- [ ] Padding, spacing, width, elevation, icon, and color come from the component.
- [ ] Open questions were asked about, not decided: duration values, how the action button is styled, where toasts appear on screen, stacking, warnings and critical alerts, and toasts for a background job.
