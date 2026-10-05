---
name: recursica-skill-toast
description: Rules for the Recursica toast — when brief feedback is right, toast styles, success confirmations, keeping an undo reachable, and announcing without taking focus. Use for toasts, snackbars, and just-happened notifications. Not for decisions — see recursica-skill-modal; not for field errors — see recursica-skill-forms.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Toast

A toast reports what just happened, without interrupting the user's work.

## When to use a toast

- **Confirming that an action worked**, such as saved, deleted, or sent. A success confirmation goes in a toast, never on a field.
- **Offering an undo for the whole page.** `recursica-skill-buttons-links` sets this rule: a notification that offers an undo for the whole page is a toast.
- **Reporting an error that belongs to no field**, such as a conflict on the server, a broken business rule, or a background job that failed.
- **A low-priority update about a task**, when the user started the task or the task is being done for the user, and the update does not need the user's attention now.

## When not to use a toast

| Situation                                                                                      | Use instead                                                                            |
| ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Asking the user to confirm an action that can be reversed                                      | Perform the action and offer an undo. See `recursica-skill-buttons-links`.             |
| A validation error on a specific field                                                         | The field's error state. See `recursica-skill-forms` and `recursica-skill-text-field`. |
| Undoing the delete of one row in a table or a list, or of one item                             | An undo button in place of the delete button. See `recursica-skill-buttons-links`.     |
| Destroying a whole object, when the delete cannot be undone and the object is hard to recreate | A confirmation before the action. See `recursica-skill-modal`.                         |
| A decision the user must make before continuing                                                | A modal. See `recursica-skill-modal`.                                                  |
| Information the user will need to refer to later                                               | The page. A toast disappears.                                                          |
| The save status that must stay on screen when each field saves separately                      | A status on the page that stays on screen. See `recursica-skill-forms`.                |
| Progress while an action is still running                                                      | The loading look on a submit button, or a loader. See `recursica-skill-loader`.        |

**A toast reports an event that just happened, and that tense is the house test for a toast.** `recursica-skill-feedback-messaging` chooses between the channels (the forms a message takes: a toast, a banner or a modal) by tense. A finished event is a toast. A condition that has not happened yet is a banner. Check the tense of the message before choosing a channel.

**A toast is the wrong place for a message the user must not miss.** A toast appears away from where the user is looking, and the toast closes by itself. A critical alert that needs action right away is not a toast. No component in this system holds a critical alert yet. The banner component that the tense rule calls for is planned, but the banner is not in the UI kit (the token file, `recursica_ui-kit.json`, that says which variants and states each component has). Do not use a toast for a critical alert. Do not build a custom alert that stays on screen. Do not point the reader to a component that does not exist. Raise the critical alert with the user, as the open questions describe.

## Variants

**Use only the toast variants and options that the Recursica MCP server lists for the project.** A designer can add variants and options in Theme Forge, so each project can differ. Get the list with the server's `recursica_get_component_doc` tool, and use the names the code uses. Never invent a variant or an option.

The rules below describe each option by role, such as "the success style". The names in the standard UI kit (the unchanged UI kit in the official Recursica release) are examples only.

- **Style.** In the standard UI kit, a toast has a default style, a success style, and an error style, named `default`, `success`, and `error`. Only the design-system website calls the default style "Information". "Default" and "Information" are two names for one style.
- **Warning.** If the project has a warning style, use the warning style. Never use the error style as a warning. The error style says that a failure happened.
- **The styles differ only in color and icon.** A style never shows the message without the text. The style only supports what the text says.
- **Parts.** In the standard UI kit, a toast shows an icon and text. If the project has a style for an action button or a close control, use the project's style. Check the open questions before building a timer, or an action button or a close control that the project does not define.
- **Size and position.** If the project has a size variant or a position variant, use the project's variant. A toast's minimum width, maximum width, and minimum height are fixed.

## Rules

**Put the meaning in the toast's text, and use the style only to support the text.** An error toast that reads "Something went wrong" in red tells a screen reader user nothing. In black and white, the same toast tells no user what happened. Name what happened: "Could not save — the invoice was changed by someone else." `recursica-skill-system-conventions` requires this rule.

**A success confirmation belongs in a toast, never on a field.** The rule has no exception. Never add a green check mark to an input, or a "Saved" note to each field.

**Never use a toast as the save status that stays on screen.** `recursica-skill-forms` requires a status message that stays visible when each field saves separately. A toast disappears, so a toast cannot meet a requirement to stay visible. A toast each time a field saves also shows the user too many messages.

**When a form saves all changes at once on submit, confirm success with a toast and nothing else.** Show no marker for unsaved changes and no status line. `recursica-skill-forms` states that the enabled submit button is the only other signal to the user.

**Show one toast per event.** Do not show a toast for each record in a bulk action. Report the whole bulk action once, with the number of records.

**Write the shortest toast text that gives the information.** Do not write full sentences or paragraphs. The short text in forms follows the same rule.

**Put at most one action in a toast**, and make the action a single follow-up, such as Undo. Two actions in a toast that disappears ask the user to make a decision. A decision belongs in a modal.

**A toast's action must not be the only way to reach that action.** See the keyboard rules below. An undo that disappears with the toast is gone before a keyboard user can reach the undo.

**Never use a toast as the only record of a destructive action** (an action that deletes data or cannot be undone). Once the toast is gone, the user has no way back to the record.

**The code library behind the toast component sets the duration (how long the toast stays on screen), and the duration stays unchanged.** Do not tune the duration. Do not vary the duration by message. Do not make the duration longer so the user can reach an action. `recursica-skill-feedback-messaging` owns this rule.

**Every toast has a dismiss control, built into the toast component.** The user may always remove the toast from the screen. Never ship a toast that cannot be dismissed.

**The code library also sets how long an undo stays available.** The design does not set how long an immediate undo lasts.

**An undo must never exist only inside a toast, because the toast's duration cannot be made longer.** A keyboard user has to leave the current field, tab to the toast, and press the undo before the code library's timer closes the toast. Put the undo in a part of the page that stays on screen, and have the toast point to that undo.

**Combine duplicate toasts.** Show a repeated message as one toast. Ten identical toasts stacked on screen report one problem ten times. See `recursica-skill-feedback-messaging`.

## Accessibility

The rules below add to the accessibility baseline in `recursica-skill-system-conventions`, which every Recursica component follows.

**The toast is the riskiest component in the system.** A toast appears without the user asking. A toast disappears with no action from the user. A toast shows every message away from where the user is looking. A screen reader user never learns about a toast that is not announced. A toast that takes focus interrupts typing. A toast that closes by itself while holding an undo offers an action that no keyboard user can reach.

### Screen readers

- **Announce the toast when the toast appears, without moving focus.** Use a live region (an area of the page that a screen reader announces automatically when the area's content changes) that is already in the page before the message is added. A live region created at the same moment as the message is often not announced at all.
- **Announce an error toast right away, and let a success toast or a toast in the default style wait until the screen reader finishes speaking.** The urgent setting, `assertive`, interrupts what the screen reader is saying. Use `assertive` only for failures. Never let a confirmation interrupt what the user is reading or typing. Never leave a failure waiting in a queue. `recursica-skill-live-regions` owns this rule.
- **Every toast is announced.** No toast appears silently. The announcement is the toast's text. Nothing else should repeat the toast's text.
- **A screen reader does not announce the style.** The success style and the error style differ only in color and icon. The text must say which style the toast is, as in "Saved" versus "Could not save".
- **The toast's icon is decorative and must be silent.** The icon gives a screen reader user nothing useful. The icon must not be announced as an unlabeled graphic.
- **Announcements from several toasts must not overlap.** Use one live region, with the messages lined up in order. Never use one live region per toast. Never let a second message cut off the first message in the middle of a sentence.
- **Give an action in a toast a real accessible name (the name a screen reader reads out for a control) that includes the item the action affects**, as in "Undo delete of invoice 1043", not "Undo". By the time the user reaches the action, the context around the action is gone.
- **Give the close control a real accessible name.** A screen reader announces nothing for an icon with no label.
- **Do not announce the same message twice.** A live region and a focus move together make the screen reader read the message twice. Use the live region.

### Keyboard and non-mouse navigation

- **Never move focus to the toast when the toast appears.** A focus move pulls the text cursor out of a field in the middle of a word. A focus move also puts the user in a place the user did not ask to go.
- **A toast with an action cannot close by itself while a user is trying to reach the action.** Reaching an undo by keyboard means leaving the current field, tabbing to the toast, and pressing the undo. A timer running during those steps makes the action impossible to reach. The code library sets the duration, and the duration is not changed. The toast therefore cannot stay on screen longer. The undo must also be in a part of the page that stays on screen, with the toast pointing to that undo. Never ship a timed toast whose action is the only way to undo.
- **The toast must be in the tab order while the toast is visible**, at a predictable point, not after every other element on the page.
- **If the toast's timer pauses on hover, the timer must also pause on focus.** Otherwise the pause helps only mouse users.
- **Closing a toast must work from the keyboard, not only with a pointer.** Every toast has a dismiss control, and the dismiss control works from the keyboard.
- **A toast must never cover a control the user needs.** A toast must not cover the focused element or the focus ring.
- **No content the user needs may appear only on hover**, including the toast's action, the close control, and the full text.

## Styling set by tokens

**Never set or override the toast properties below.** The toast component sets each property for every style.

- `elevation`, `border-radius`, `border-size`.
- `vertical-padding`, `horizontal-padding`, `spacing`.
- `min-width`, `max-width`, `min-height`.
- `icon`: which icon each style shows, and the icon's size.
- `text` typography, and all colors for each style.

## Related skills

- `recursica-skill-feedback-messaging` — the design-rules skill that owns the toast rules: whether a success needs a confirmation, banner versus toast by tense, why messages next to the content are avoided, combining messages, the time limits for showing feedback while the user waits, and what the code library controls.
- `recursica-skill-buttons-links` — the rules for undo, when to perform an action that can be reversed instead of asking the user to confirm, an undo in place versus an undo for the whole page, and the wording of action labels.
- `recursica-skill-forms` — errors on fields, the status message that must stay on screen when each field saves separately, and the rule against any status when the form saves all changes at once.
- `recursica-skill-system-conventions` — showing meaning in more than one way. This rule is why the style is never the whole message.
- `recursica-skill-live-regions` — what the app must announce along with a toast, and how to announce changes the user did not cause.

### Only if used on the same screen

- `recursica-skill-modal` — a modal blocks the page. Use a modal for a decision that cannot wait, and for the few cases that need a confirmation before the action.

## Open questions

- **Duration values.** The house rule on duration is settled, as the rules above state. No token records the default duration of any code library. Nobody can check a duration from this repository.
- **How a toast's action button is styled.** The rules above allow one action. Ask before styling the action button. Ask only when the project has no style for a toast's action button.
- **Where toasts appear on screen.** Only the design-system website shows toasts toward the bottom of the screen. Ask before relying on that placement. Ask only when the project has no position variant.
- **Stacking.** No rule says how many toasts may be visible at once, in what order the toasts appear, or what happens when more toasts arrive than the limit allows.
- **Warnings, and critical alerts.** This system has no alert that stays on screen for serious problems yet. No component holds an alert the user must not miss. The planned banner component may cover part of this need. Until the banner ships, do not build a substitute, and do not name a component as though the component were available. Ask about a warning style only when the project has no warning style.
- **Toasts for a background job.** Nobody has decided whether a toast is ever right for a background job that finishes long after the action that started the job.

## Pre-flight checklist

- [ ] Each toast message is short-lived and safe to miss. No critical message and no information needed later is in a toast. No alert component that does not exist is named as the alternative.
- [ ] Errors on a field stay on the field. The undo for a single item stays in place. A delete that cannot be undone is confirmed before the action instead.
- [ ] Every toast style is one the project's UI kit lists, such as `default`, `success`, or `error` in the standard UI kit. No warning style or other style is invented.
- [ ] The toast's text names what happened. The style and the icon only support the text, and are never the only way the message is shown.
- [ ] The success confirmation is a toast, not a check mark on a field.
- [ ] No toast replaces the status message that must stay on screen when each field saves separately.
- [ ] Each event has one toast, with a count for a bulk action. Each toast has at most one action.
- [ ] A live region is in the page before the message is added, and the toast is announced without moving focus.
- [ ] Error toasts are announced right away (`assertive`). Success toasts and toasts in the default style wait until the screen reader finishes speaking (`polite`). Every toast is announced, and nothing repeats the toast's text.
- [ ] The icon is silent, and the text states the result.
- [ ] Stacked toasts share one live region, with messages in order. The announcements of stacked toasts never overlap.
- [ ] Every toast action has a real accessible name that includes the item the action affects. Every close control has a real accessible name.
- [ ] No undo exists only inside a toast. The action also exists in a part of the page that stays on screen.
- [ ] The duration (how long the toast stays on screen) and how long the undo stays available are left to the code library and not tuned.
- [ ] The user can dismiss every toast, and duplicate toasts are combined, not stacked.
- [ ] Each toast message reports an event that just happened. Each message about a condition that has not happened yet was raised as a case for a banner.
- [ ] The toast can be reached by keyboard at a predictable point in the tab order while the toast is visible.
- [ ] If hover pauses the toast's timer, focus pauses the timer too. Closing a toast does not depend on a pointer.
- [ ] The toast covers no control the user needs and does not hide the focus ring. No content the user needs appears only on hover.
- [ ] Padding, spacing, width, elevation, icon, and color come from the toast component.
- [ ] Open questions were asked about, not decided: duration values, how the action button is styled, where toasts appear on screen, stacking, warnings and critical alerts, and toasts for a background job.
