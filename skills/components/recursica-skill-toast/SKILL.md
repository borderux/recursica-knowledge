---
name: recursica-skill-toast
description: How to use the Recursica toast correctly — when transient feedback is right and when a field error, a modal, or an in-place undo is the answer instead, why only default, success, and error styles exist and there is no warning, why success confirmation lives here rather than on a field, how a toast carrying an undo must stay reachable, and the screen-reader and keyboard requirements including polite versus assertive announcement and never stealing focus. Use whenever adding, reviewing, or refactoring a toast, snackbar, notification, or undo affordance. Trigger on "toast", "snackbar", "notification", "undo", "auto-dismiss", "aria-live", "live region", "success message", "screen reader", "tab order", or a request to tell the user something just happened. Do NOT use for a decision that must be made now — that is recursica-skill-modal. Do NOT use for field validation — that is recursica-skill-forms. Do NOT use for undo policy — that is recursica-skill-buttons-links.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Toast

A toast reports what just happened, without interrupting the work.

## Use it when

- **Confirming that an action succeeded** — saved, deleted, sent. **This is the only component in the system with a success treatment**, which is why success confirmation belongs here and not on a field.
- **Delivering a global undo.** `recursica-skill-buttons-links` states it directly: a global undo notification is a toast.
- **Reporting an error with no field to attach it to** — a server conflict, a business-rule violation, a background job that failed.
- **A low-priority update about a task the user took**, or one being taken on their behalf, that does not need their attention now.

## Do not use it when

| Instead of a toast                                          | Use                                                                                |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Asking the user to confirm a reversible action              | Perform it and offer undo — `recursica-skill-buttons-links`                        |
| A validation error on a specific field                      | The field's error state — `recursica-skill-forms`, `recursica-skill-text-field`    |
| Undoing the delete of one row or one item                   | An undo button in place of the delete affordance — `recursica-skill-buttons-links` |
| Whole-object destruction, irreversible and hard to recreate | Confirm up front — `recursica-skill-modal`                                         |
| A decision the user must make before continuing             | `recursica-skill-modal`                                                            |
| Information the user will need to refer to later            | Put it on the page. A toast is gone                                                |
| The persistent save status required by field-level saving   | A persistent status on the page — `recursica-skill-forms`                          |
| Progress while an action is in flight                       | The in-button loading state on submit, or `recursica-skill-loader`                 |

**A toast reports something that just happened.** That is the house test — `recursica-skill-feedback-messaging` splits the channels by tense: a completed event is a toast, a condition that has not happened yet is a banner. Check the tense of the sentence before choosing.

**A toast is the wrong home for anything that must not be missed.** It appears away from where the user is looking and leaves on its own, so a critical alert requiring immediate action is not a toast. **And there is no component in this system for one yet** — the banner the tense rule calls for is planned but not in the token inventory. Do not press a toast into that job, do not assemble a persistent alert surface, and do not send the reader to a component that does not exist. Raise it — see the uncovered list.

## What exists

Taken from `recursica_ui-kit.json` → `ui-kit.components.toast`. **Do not pass a style that is not listed here.**

| Axis     | Options                       |
| -------- | ----------------------------- |
| `styles` | `default`, `success`, `error` |

**There are exactly three styles and there is no warning.** Do not build one, and do not press `error` into service as a warning — an error style says something failed.

**`default` also goes by "Information"** in material documented outside the token inventory. One thing, two names.

**The kit defines an `icon` and a `text`, and nothing else inside the toast.** There is no token for an action button and none for a close control, though both are documented outside the token inventory. There is no duration or timer token either. See the uncovered list before building any of the three.

**There is no size axis and no position axis.** `min-width`, `max-width`, and `min-height` are fixed properties, and nothing in the kit says where a toast appears or how several of them stack.

**The three styles differ only by color and icon.** That makes the style a second channel at best and never the message.

## Rules for using it

**The text carries the meaning; the style is redundancy.** An error toast reading "Something went wrong" in red says nothing to a screen reader user and nothing in black and white. Name what happened: "Could not save — the invoice was changed by someone else." Required by `recursica-skill-system-conventions`.

**Success confirmation belongs in a toast, not on a field.** The toast is the only component carrying a success treatment, so do not invent a green tick on an input or a per-field "Saved" flourish.

**A toast is not the persistent save status.** `recursica-skill-forms` requires a persistent status message under field-level saving. A transient toast cannot satisfy a persistent requirement, and firing one per field write is noise.

**In batch mode, submission success is a toast and nothing else.** No dirty indicator, no status line — `recursica-skill-forms` is explicit that the enabled submit button is the only other signal.

**One toast per event.** Do not emit a toast per record in a bulk operation; report the operation once, with its count.

**Keep it to the shortest string that carries the information.** No sentences, no paragraphs — the same microcopy rule as forms.

**At most one action in a toast**, and it is a single contextual follow-up such as Undo. Two actions in a transient surface is a decision, and a decision belongs in a modal.

**A toast carrying an action must not be the only path to that action** — see the keyboard section. An undo that expires with the toast is an undo a keyboard user never had.

**Never use a toast as the only record of a destructive action.** Once it is gone, the user has no way back to it.

**Duration is the underlying library's, and is not modified.** Whatever Mantine, Material, or whichever library backs the component sets is the duration. Do not tune it, do not vary it per message, and do not extend it to make an action reachable. Owned by `recursica-skill-feedback-messaging`.

**A dismiss control is always present**, built into the toast component, and the user may always remove the notification from the screen. Never ship a toast that cannot be dismissed.

**An undo window is also the library's.** How long an immediate undo stays available is not set by the design.

**Because the duration cannot be extended, an undo must never live only inside a toast.** The keyboard journey to reach it — leave the field, tab to the toast, activate — runs against a timer you do not control. Put the undo somewhere persistent and let the toast point at it.

**Consolidate duplicates.** Repeated occurrences of the same message collapse into one. Ten identical toasts stacked up is a failure to handle the condition — see `recursica-skill-feedback-messaging`.

## Accessibility

**This is the highest-risk component in the system.** It appears without the user asking, disappears without the user acting, and does all its work outside the user's point of regard. A toast that is not announced is invisible to a screen reader user; a toast that steals focus interrupts typing; and a toast that auto-dismisses while carrying an undo offers an action nobody can reach with a keyboard.

### Screen readers

- **The toast must be announced when it appears, without moving focus.** Use a live region that already exists in the DOM before the message is inserted — a region created at the same moment as the message is frequently not announced at all.
- **An error toast is assertive; a success or `default` toast is polite.** Never let a confirmation interrupt what the user is reading or typing, and never leave a failure waiting behind a queue.
- **The style is not announced.** `success` and `error` differ by color and icon only, so the text must say which it is: "Saved" versus "Could not save".
- **The icon is decorative and must be silent.** It carries no information a screen reader user can use and must not be announced as an unlabeled graphic.
- **Multiple toasts must not produce overlapping announcements.** One live region, messages queued in order — never a live region per toast, and never a second message clobbering the first mid-sentence.
- **An action in the toast needs a real name that includes its object** — "Undo delete of invoice 1043", not "Undo". By the time the user reaches it, the surrounding context is gone.
- **A close control needs a real name.** An unlabeled icon is announced as nothing.
- **Do not announce the same message twice.** A live region plus a focus move produces a stutter; pick the live region.

### Keyboard and non-mouse navigation

- **Never move focus to the toast when it appears.** It rips the caret out of a field mid-word and drops the user somewhere they did not ask to be.
- **A toast containing an action cannot auto-dismiss out from under someone.** This is the central tension: reaching an undo by keyboard means leaving the current field, tabbing to the toast, and activating it — and a timer that runs during that journey makes the action unreachable in practice. **Since the duration belongs to the library and is not modified, keeping the toast on screen longer is not an available fix.** So the undo must also live somewhere persistent on the page, with the toast pointing at it. **Never ship a timed toast whose action is the only path to the undo.**
- **The toast must be reachable in the tab order while it is visible**, at a predictable point — not after the entire rest of the page.
- **If a dismissal timer pauses on hover, it must also pause on focus.** A pointer-only reprieve is not a reprieve.
- **Dismissal must not be pointer-only.** If the toast can be closed, it can be closed from the keyboard.
- **A toast must never cover a control the user needs**, and it must not sit over the focused element or the focus ring.
- **Nothing needed may appear only on hover** — not the action, not the close control, not the full text.
- **Never suppress the focus ring** on the action or the close control.

## Not your decision

Do not implement, override, or tune any of these — the component owns them for every style:

- `elevation`, `border-radius`, `border-size`.
- `vertical-padding`, `horizontal-padding`, `spacing`.
- `min-width`, `max-width`, `min-height`.
- `icon` — which icon each style carries, and its size.
- `text` type treatment, and all colors per style.

## Load these too

- [`recursica-skill-feedback-messaging`](../../design-rules/recursica-skill-feedback-messaging/SKILL.md) — the owning design-rules skill: whether success needs confirming at all, banner versus toast by tense, why inline messaging is avoided, consolidation, the waiting thresholds, and what the library owns.

- [`recursica-skill-buttons-links`](../../design-rules/recursica-skill-buttons-links/SKILL.md) — undo policy, when a reversible action is performed rather than confirmed, in-place undo versus global undo, and action label copy.
- [`recursica-skill-forms`](../../design-rules/recursica-skill-forms/SKILL.md) — field-level errors, the persistent status message field-level saving requires, and the no-status rule under batch saving.
- [`recursica-skill-modal`](../recursica-skill-modal/SKILL.md) — the blocking alternative for a decision that cannot wait, and the narrow case for confirming up front.
- [`recursica-skill-system-conventions`](../../design-rules/recursica-skill-system-conventions/SKILL.md) — never carry meaning in a single channel, which is why the style is never the message.

## Uncovered — ask, do not invent

- **Where the durations land in practice.** The house position is settled — see the rule above — but no token records what any given library's default is, so you cannot verify a duration from this repository.
- **Whether a toast may contain an action button.** "With action" and "without action" are documented outside the token inventory; the kit defines no token for an action, only `icon` and `text`. Do not rely on this without asking.
- **Where toasts appear on screen.** No position axis exists; "towards the bottom" is documented outside the token inventory. Do not rely on this without asking.
- **Stacking.** How many toasts may be visible at once, in what order, and what happens beyond that limit.
- **Warning severity, and critical alerts.** No warning style exists, and **no persistent high-severity alert surface exists in this system yet** — nothing to hold an alert the user must not miss. The banner component is planned and may close part of this; until it ships, do not assemble a substitute and do not name a component as though it were available.
- **Whether a toast is ever appropriate for a background job that finishes long after the triggering action.**

## Pre-flight checklist

- [ ] The message is transient and safe to miss; nothing critical or referenceable was put in a toast, and no non-existent alert component was named as the alternative.
- [ ] Field-level errors stayed on their fields; single-item undo stayed in place; irreversible destruction confirmed up front instead.
- [ ] Only `default`, `success`, or `error` was passed — no warning style was invented.
- [ ] The text names what happened; the style and icon are redundancy, never the only channel.
- [ ] Success confirmation lives here, not as a tick on a field.
- [ ] No toast is standing in for the persistent status message field-level saving requires.
- [ ] One toast per event, with a count for bulk operations; at most one action in it.
- [ ] A live region exists in the DOM before the message is inserted, and the toast is announced without moving focus.
- [ ] Errors announce assertively; success and default announce politely.
- [ ] The icon is silent; the text states the outcome.
- [ ] Stacked toasts share one queued live region and never produce overlapping announcements.
- [ ] Any action has a real accessible name including its object; any close control has a real name.
- [ ] No undo lives only inside a toast; the action also exists somewhere persistent.
- [ ] Duration, persistence, and the undo window were left to the library and not tuned.
- [ ] Every toast can be dismissed by the user, and duplicates are consolidated rather than stacked.
- [ ] The message reports something that just happened; anything not yet happened was raised as a banner case.
- [ ] The toast is keyboard-reachable at a predictable point in the tab order while visible.
- [ ] Any hover pause on the timer also pauses on focus; dismissal is not pointer-only.
- [ ] The toast covers no needed control and does not obscure the focus ring; nothing needed is hover-only.
- [ ] No component-owned padding, spacing, width, elevation, icon, or color was overridden.
- [ ] Nothing in the uncovered list — dismissal timing above all — was invented.
