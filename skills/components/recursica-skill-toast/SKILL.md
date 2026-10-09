---
name: recursica-skill-toast
description: Rules for the Recursica toast — when brief feedback is right, toast styles, success confirmations, keeping an undo reachable, and announcing without taking focus. Use for toasts, snackbars, and just-happened notifications. Not for decisions — see recursica-skill-modal; not for field errors — see recursica-skill-forms.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Toast

A toast reports what just happened, without interrupting the persona's work.

## When to use a toast

- **Confirming that an action worked**, such as "Invoice saved", "Comment deleted" or "Message sent".
- **Offering an undo for the whole page.** `recursica-skill-buttons-links` requires a toast for an undo notification that covers the whole page.
- **Reporting an error that belongs to no field.** For example:
  - a conflict on the server, such as another persona changing the same invoice
  - a broken business rule
  - a background job that failed
- **Giving a low-priority update about a task that does not need the persona's attention now.** The task is one the persona started, or one being done for the persona.

## When not to use a toast

| Situation                                                                                      | Use instead                                                                            |
| ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Asking the persona to confirm an action that can be reversed                                   | Perform the action and offer an undo. See `recursica-skill-buttons-links`.             |
| A validation error on a specific field                                                         | The field's error state. See `recursica-skill-forms` and `recursica-skill-text-field`. |
| Undoing the delete of one row in a table or a list, or of one item                             | An undo button in place of the delete button. See `recursica-skill-buttons-links`.     |
| Destroying a whole object, when the delete cannot be undone and the object is hard to recreate | A confirmation before the action. See `recursica-skill-modal`.                         |
| A decision the persona must make before continuing                                             | A modal. See `recursica-skill-modal`.                                                  |
| Information the persona will need to refer to later                                            | The page. A toast disappears.                                                          |
| The save status that must stay on screen when each field saves separately                      | A status on the page that stays on screen. See `recursica-skill-forms`.                |
| Progress while an action is still running                                                      | The loading look on a submit button, or a loader. See `recursica-skill-loader`.        |

**A toast reports an event that just happened. A banner reports a condition that has not happened yet.** For example, "Invoice sent" is a toast, and "Maintenance will start at 6 p.m." is a banner. Check the tense of the message before choosing a channel (the form a message takes: a toast, a banner or a modal). `recursica-skill-feedback-messaging` sets this tense rule.

**Do not put a message the persona must not miss in a toast.** A toast appears away from where the persona is looking, and the toast closes by itself. A critical alert that needs action right away is not a toast. The tense rule calls for a banner instead.

**If the theme (the design a designer sets in Theme Forge: the token values, and each component's variants, states and sizes) has a banner component, use the banner component.** Otherwise, do not build a banner or another alert that stays on screen by hand. Do not point the persona to a component the theme does not have. Report the missing banner as a gap in the design system. Do not use a toast for a critical alert. Confirm the critical alert with the user, as the open questions describe.

## Variants

**Use only the toast variants and options that the Recursica MCP server lists for the theme.** A designer can add variants and options in Theme Forge, so each theme can differ. Get the list with the server's `recursica_get_component_doc` tool, and use the names the code uses. Never invent a variant or an option.

The rules below describe each option by role, such as "the success style". The names in the standard UI kit (the unchanged UI kit in the official Recursica release) are examples only.

- **Style.** In the standard UI kit, a toast has a default style, a success style, and an error style, named `default`, `success`, and `error`. Only the design-system website calls the default style "Information". "Default" and "Information" are two names for one style.
- **Warning.** If the theme has a warning style, use the warning style. Never use the error style as a warning, because the error style says that a failure happened.
- **Color and icon.** The toast styles differ only in color and icon. The toast's text says what happened, and the style only supports the text.
- **Parts.** In the standard UI kit, a toast shows an icon and text. If the theme has a style for an action button or a close control, use the theme's style. Check the open questions before building a timer, an action button or a close control the theme does not define.
- **Size and position.** If the theme has a size variant or a position variant, use the theme's variant.

## Rules

**Put the meaning in the toast's text, and use the style only to support the text.** For example, write "Could not save — the invoice was changed by someone else." An error toast that reads "Something went wrong" in red tells a persona using a screen reader nothing. In black and white, the same toast tells no persona what happened. `recursica-skill-system-conventions` requires this rule.

**Put a success confirmation in a toast, never on a field.** The rule has no exception. Never add a green check mark to an input, or a "Saved" note to each field.

**Never use a toast as the save status that stays on screen.** When each field in a form saves separately, `recursica-skill-forms` requires a status message that stays visible. A toast disappears, so a toast cannot be the status message. A toast each time a field saves also shows the persona too many messages.

**When a form saves all changes at once on submit, confirm success with a toast and nothing else.** Show no marker for unsaved changes and no status line. `recursica-skill-forms` states that the enabled submit button is the only other signal to the persona.

**Show one toast per event.** For example, when the persona deletes 12 invoices at once, show one toast: "12 invoices deleted".

- Do not show a toast for each record in a bulk action.
- Report the whole bulk action once, with the number of records.

**Write the shortest toast text that gives the information.** For example, write "Invoice saved", not "Your invoice has been saved successfully." Do not write full sentences or paragraphs. The short text in a form, such as labels, hints and messages, follows the same rule.

**Put at most one action in a toast**, and make the action a single follow-up, such as Undo. A toast with two actions asks the persona to make a decision before the toast disappears. A decision belongs in a modal.

**A toast's action must not be the only way to reach that action.** An undo that disappears with the toast is gone before a persona using a keyboard can reach the undo. See the keyboard rules below.

**Never use a toast as the only record of a destructive action** (an action that deletes data or cannot be undone). Once the toast is gone, the persona has no way back to the record.

**Leave the duration (how long the toast stays on screen) unchanged.** The code library behind the toast component sets the duration. `recursica-skill-feedback-messaging` owns this rule.

- Do not tune the duration.
- Do not give different messages different durations.
- Do not make the duration longer so the persona can reach an action.

**Every toast has a dismiss control, built into the toast component.** The persona can always close the toast. Never ship a toast that cannot be dismissed.

**Do not set in the design how long an immediate undo lasts.** The code library also sets how long an undo stays available.

**An undo must never exist only inside a toast, because the toast's duration cannot be made longer.**

- Put the toast's undo action in a part of the page that stays on screen.
- Have the toast point to the undo action on the page.

A persona using a keyboard has to leave the current field, tab to the toast, and press the undo. All three steps have to happen before the code library's timer closes the toast.

**Combine duplicate toasts.** Show a repeated message as one toast. For example, ten identical "Could not save" toasts stacked on screen report one problem ten times. See `recursica-skill-feedback-messaging`.

## Accessibility

The rules below add to the accessibility baseline in `recursica-skill-system-conventions`, which every Recursica component follows.

**The toast is the riskiest component in the system.** A toast appears without the persona asking, and disappears with no action from the persona. A toast shows every message away from where the persona is looking. Three mistakes follow from those facts:

- A persona using a screen reader never learns about a toast that is not announced.
- A toast that takes focus interrupts typing.
- A toast that closes by itself while holding an undo offers an action no persona using a keyboard can reach.

### Screen readers

- **Announce the toast when the toast appears, without moving focus.** Use a live region (an area of the page that a screen reader announces automatically when the area's content changes) that is in the page before the message is added. A live region created at the same moment as the message is often not announced at all.
- **Announce an error toast right away. Let a success toast or a toast in the default style wait until the screen reader finishes speaking.** The urgent setting, `assertive`, interrupts what the screen reader is saying. Use `assertive` only for failures. Never let a confirmation interrupt what the persona is reading or typing. Never leave a failure waiting in a queue. `recursica-skill-live-regions` owns this rule.
- **Announce every toast.** The announcement is the toast's text. Nothing else should repeat the toast's text.
- **A screen reader does not announce the style.** The success style and the error style differ only in color and icon. The text must say which style the toast is, as in "Saved" for success versus "Could not save" for an error.
- **The toast's icon is decorative and must be silent.** The icon gives a persona using a screen reader nothing useful. The icon must not be announced as an unlabeled graphic.
- **Announcements from several toasts must not overlap.** Use one live region for every toast, and announce the messages in order. Never use one live region per toast. Never let a second message cut off the first message in the middle of a sentence.
- **Give an action in a toast a real accessible name (the name a screen reader reads out for a control) that includes the item the action affects.** For example, name the action "Undo delete of invoice 1043", not "Undo". By the time the persona reaches the action, the context around the action is gone.
- **Give the close control a real accessible name.** A screen reader announces nothing for an icon with no label.
- **Do not announce the same message twice.** A live region and a focus move together make the screen reader read the message twice. Use the live region.

### Keyboard and non-mouse navigation

- **Never move focus to the toast when the toast appears.** A focus move pulls the text cursor out of a field in the middle of a word. A focus move also puts the persona in a place the persona did not ask to go.
- **A toast with an action cannot close by itself while a persona is trying to reach the action.** Reaching an undo by keyboard means leaving the current field, tabbing to the toast, and pressing the undo. A timer running during those steps makes the action impossible to reach. The code library sets the duration, and nobody changes the duration. So the toast's undo action must also be in a part of the page that stays on screen. Have the toast point to the undo action on the page. Never ship a timed toast whose action is the only way to undo.
- **The toast must be in the tab order while the toast is visible.** The toast's place in the tab order must be predictable, not after every other element on the page.
- **If the toast's timer pauses on hover, the timer must also pause on focus.** Otherwise the pause helps only personas using a mouse.
- **Closing a toast must work from the keyboard, not only with a pointer.** Every toast has a dismiss control, and the dismiss control works from the keyboard.
- **A toast must never cover a control the persona needs.** A toast must not cover the focused element or the focus ring.
- **No content the persona needs may appear only on hover.** Content the persona needs includes the toast's action, the close control, and the full text.

## Styling set by tokens

**Never set or override the toast's styling.** The theme sets every visual property of the toast, such as size, spacing, borders, colors and animation. Do not add extra containers or spacers to change the toast's look. If the design needs a look the theme does not give, report the missing look as a design-system gap. See `recursica-skill-design-router`.

The theme also sets which icon each toast style shows. Never change the icon a style shows.

## Related skills

- `recursica-skill-feedback-messaging` — the design-rules skill that owns the toast rules. The feedback-messaging skill covers the following topics:
  - whether a success needs a confirmation
  - banner versus toast, by the tense of the message
  - combining messages
  - why messages next to the content are avoided
  - what the code library controls
  - the time limits for showing feedback while the persona waits
- `recursica-skill-buttons-links` — the rules for undo, and the wording of action labels. The buttons-links skill also covers an undo in place versus an undo for the whole page. The buttons-links skill says when to perform a reversible action instead of asking the persona to confirm.
- `recursica-skill-forms` — errors on fields, and the status message that must stay on screen when each field saves separately. The forms skill also holds the rule against any status when the form saves all changes at once.
- `recursica-skill-system-conventions` — showing meaning in more than one way. The system-conventions rule is why the style is never the whole message.
- `recursica-skill-live-regions` — what the app must announce along with a toast, and how to announce changes the persona did not cause.

### Only if used on the same screen

- `recursica-skill-modal` — a modal blocks the page. Use a modal for a decision that cannot wait. Also use a modal for the few cases that need a confirmation before the action.

## Open questions

- **Duration values.** The house rule on duration is settled, as the rules above state. No token records the default duration of any code library. Nobody can check a duration from this repository.
- **How a toast's action button is styled.** The rules above allow one action. Only when the theme has no style for a toast's action button, confirm with the user before styling the button.
- **Where toasts appear on screen.** Only the design-system website shows toasts toward the bottom of the screen. Confirm with the user before relying on that placement, and only when the theme has no position variant.
- **Stacking.** No rule says how many toasts may be visible at once, or in what order the toasts appear. No rule says what happens when more toasts arrive than the limit allows.
- **Warnings and critical alerts.** No rule says which component holds an alert that stays on screen for a serious problem. No rule says which component holds an alert the persona must not miss. If the theme has a banner component, the banner may cover part of the need for those alerts. Otherwise, do not build a substitute, and do not name a component the theme does not have. Confirm a warning style with the user only when the theme has no warning style.
- **Toasts for a background job.** Some background jobs finish long after the action that started the job. Nobody has decided whether a toast is ever right for such a job.

## Pre-flight checklist

- [ ] Each toast message is short-lived and safe to miss. No critical message and no information needed later is in a toast. No alert component that does not exist is named as the alternative.
- [ ] Errors on a field stay on the field. The undo for a single item stays in place. A delete that cannot be undone is confirmed before the action instead.
- [ ] Every toast style is one the theme's UI kit lists, such as `default`, `success`, or `error` in the standard UI kit. No warning style or other style is invented.
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
- [ ] The code library sets the duration (how long the toast stays on screen), and the duration is not tuned. The code library also sets how long the undo stays available, and that time is not tuned.
- [ ] The persona can dismiss every toast, and duplicate toasts are combined, not stacked.
- [ ] Each toast message reports an event that just happened. Each message about a condition that has not happened yet was raised as a case for a banner.
- [ ] The toast can be reached by keyboard at a predictable point in the tab order while the toast is visible.
- [ ] If hover pauses the toast's timer, focus pauses the timer too. Closing a toast does not depend on a pointer.
- [ ] The toast covers no control the persona needs and does not hide the focus ring. No content the persona needs appears only on hover.
- [ ] No styling is set or overridden on the toast. No container or spacer is added to change the toast's look. Each toast style shows the icon the theme sets for that style.
- [ ] Open questions were asked about, not decided: duration values, how the action button is styled, where toasts appear on screen, stacking, warnings and critical alerts, and toasts for a background job.
