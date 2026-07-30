---
name: recursica-skill-textarea
description: How to use the Recursica textarea correctly — when multi-line entry is the right control and when a single-line field or another component replaces it, which states and layouts exist, why row count is token-owned rather than yours, character limits and why a limit needs a stated rule, label and help and error text rules, and the screen-reader and keyboard requirements for a multi-line field. Use whenever adding, reviewing, or refactoring a comment box, a description, a message composer, or any field expected to run past one line. Trigger on "textarea", "text area", "multi-line", "multiline", "comment box", "description field", "rows", "character count", "character limit", "resize", "screen reader", "tab order", or a request to let a user write more than a sentence. Do NOT use for single-line entry — that is recursica-skill-text-field. Do NOT use for form layout, validation timing, or save behavior — that is recursica-skill-forms.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Textarea

A textarea captures plain text across multiple lines.

## Use it when

- **The expected answer runs past one sentence** — a description, a justification, a note.
- **The user is composing, not identifying** — comments, feedback, messages, support-ticket detail.
- **Line breaks are part of the value.** If the user needs paragraphs, this is the control.

## Do not use it when

Each of these has a different component. Switch to it rather than adapting a textarea:

| Instead of a textarea                       | Use                                                                                          |
| ------------------------------------------- | -------------------------------------------------------------------------------------------- |
| The content is short and fits one line      | `recursica-skill-text-field` — the field's size tells the user how much to write             |
| The value comes from a known set of options | A dropdown, radio group, or autocomplete — see `recursica-skill-selection-controls`          |
| The user must apply bold, italics, or lists | A rich text editor. No such component exists in this kit — see Uncovered                     |
| The value is a number, a date, or a time    | `recursica-skill-number-input`, `recursica-skill-date-picker`, `recursica-skill-time-picker` |
| The value is never editable here            | `recursica-skill-read-only-field` — renders label and text, no input                         |
| Long text is only being read, not written   | Body copy in the page, not a field                                                           |

**A textarea is not a way to make a short field look important.** Size it to the answer you expect: an oversized box for a one-line answer invites the wrong amount of text.

**A disabled textarea is not a way to display text.** If nobody can ever edit it here, it is not a form control.

## What exists

Taken from `recursica_ui-kit.json` → `ui-kit.components.textarea`. **Do not pass a variant or state that is not listed here** — other design systems have sizes, resize modes, warning states, and built-in counters that this component does not.

| Axis      | Options                   |
| --------- | ------------------------- |
| `layouts` | `stacked`, `side-by-side` |
| `states`  | `error`, `disabled`       |

**`layouts` is the label placement axis.** `side-by-side` — label beside the field — is the house default; `stacked` is the fallback when the container is too narrow to fit both. The trigger is container width, not viewport. See `recursica-skill-forms`.

**Focus and placeholder are not variants.** The component handles them: `placeholder-opacity` here, and the focused border via `globals.form.field.colors.border-selected`. Do not build them as states.

**`rows` is a token-owned property, not a prop you set per instance.** The row count is fixed by the component. Do not pass a height, do not set a row count to fit a particular answer, and do not add a wrapper to stretch it. If the fixed height is wrong for a case, that is a question for a human — see the uncovered list.

**There is no size axis and no width property.** Field width comes from `globals.form.field.size`.

**There is no icon property.** No `icon-size`, no `icon-text-gap` — this component defines no in-field icon.

**There is no character counter.** Nothing in the kit renders a count.

**There is no read-only state.** Read-only is a separate component — `read-only-field`, with the same `layouts` axis and no input.

## Rules for using it

**Always pass a visible label.** Name the object explicitly; a screen reader user hears the label alone, without the surrounding context. Sentence capitalization, no trailing colon.

**Never put required information in the placeholder.** It disappears on the first keystroke. Use it only to show the shape of an expected answer.

**Put the rule in help text** — what to include, any minimum, any maximum — so the user has it before they get it wrong.

**Never enforce a character limit the user cannot see.** If a maximum exists, the limit must be stated up front, and the user must be able to tell where they stand against it. The kit provides no counter, so if the design needs one, raise it rather than building one.

**Never truncate or discard what the user typed.** Do not silently drop characters past a limit and do not clear the field on a failed validation — the text is theirs.

**On error, replace the help text; do not add to it.** Swapping keeps the field height stable so the form below does not shift. The message must restate the rule: "Invalid input" is not an error message; "Enter at least 20 characters" is.

**Pair the error state with a non-color indicator** — an icon or the message itself. Required by `recursica-skill-system-conventions`.

**Do not add spacing around it to compensate for its height.** Field and section spacing is built into the components; a textarea is the tallest field in a form and that irregular rhythm is expected. Owned by `recursica-skill-forms`.

**Label placement is one decision per form, not per field.** This field's `layouts` value is not an independent choice — it matches every other field in the same form. The container-width test is applied once, to the form as a whole, and its answer governs every field in it, including short ones that would have fitted side by side. A whole form may switch placement between breakpoints, but never mixes the two at one breakpoint, and a section never gets its own placement. Owned by `recursica-skill-forms`.

**A stacked layout is often more comfortable around a textarea** — a tall field beside a single-line label reads badly in a narrow container — **but that is never a reason to stack this one field on its own.** The trigger is the form container's width, not the field's height, and if the form is side-by-side then this field is side-by-side too.

**Disabled and read-only are different components, not two styles of one.**

- **Disabled textarea** — still a field, still visibly an input, not currently operable. Use it when the user could make it operable by doing something else first.
- **Read-only field** — a different component. Label and text, no input. Use it when this user never edits this value here.

## Accessibility

The component wires the label to the input and provides the focus ring. Everything below is yours, and the keyboard rules matter more here than on a single-line field because Enter and Tab mean something different inside a textarea.

### Screen readers

- **Pass a real label.** Never let placeholder text be the accessible name — it is not announced as a label, and it disappears on input. A field with no label has no accessible name.
- **Pass help text and error text through the component**, never as a loose element rendered beside the field. Only the component can associate them with the input, and unassociated text is invisible to a user who tabs straight into the field.
- **Convey required state programmatically, not with an asterisk alone.** The asterisk is a visual convention, not an accessible name for "required".
- **State the limit and the expected content in the help text.** A visible character counter is not associated with the field and may never be announced, so the maximum has to be in words the user hears when they arrive.
- **Announce the field as multi-line.** It must be a real multi-line control, not a single-line input styled tall, so a screen reader tells the user that line breaks are allowed.
- **The component defines no in-field icon, so any icon you place there is yours** — give it an accessible name if it is interactive, and keep it silent if it is decorative.
- **The error message is the announced text.** Because it replaces the help text, it is the only thing that will be read — so it has to carry the rule.
- **Do not announce every keystroke.** A live count that updates on each character floods a screen reader; if progress toward a limit must be spoken, it is announced sparingly, and the limit itself stays in the help text.

### Keyboard and non-mouse navigation

- **Never remove the field from the tab order**, and never make reaching it depend on a pointer.
- **Tab order follows visual order.** The single-column form rule in `recursica-skill-forms` is what keeps this true.
- **Tab must move out of the field, not insert a tab character.** This is the only way a keyboard user leaves a textarea.
- **Enter inserts a line break and must not submit the form.** Never bind submit to Enter inside a textarea, and never map a modifier combination as the only way to enter a newline.
- **Escape must not clear the field** or discard the entry.
- **Every in-field control is its own tab stop** and operable with Enter or Space, not a click-only handler.
- **Do not move focus for the user** when the value reaches a length or a limit.
- **If the content scrolls, it must be scrollable from the keyboard** with focus inside the field — arrow keys, Page Up and Page Down. Content the user cannot reach without a pointer is unreachable content.
- **Never make resizing necessary to read or finish the value.** A drag handle is not keyboard operable, so the field must be usable at its given size.
- **A disabled field is skipped by tab**, so anything conveyed only by the disabled state is unreachable. Put the reason in text.
- **Nothing needed to complete the field may appear only on hover** — not the limit, not the rule.
- **Never suppress the focus ring**, and never rely on the caret alone to show where focus is.

## Not your decision

Do not implement, override, or tune any of these — the component owns them:

- `border-radius`, `horizontal-padding`, `vertical-padding`, `border-size`.
- `rows` — the field's height. It is fixed by the component.
- Field width and sizing from `globals.form.field.size`.
- `text` styling and `placeholder-opacity`.
- `colors` per layer, including the focused border from `globals.form.field.colors.border-selected` and the global disabled treatment from `globals.states.disabled`.
- The label-field gaps and `vertical-item-gap` from `globals.form.properties`.
- The label-to-input association and key handling inside the field.

Never style an unfocused textarea so it reads as disabled. An editable field must look editable at rest.

## Load these too

- [`recursica-skill-forms`](../../design-rules/recursica-skill-forms/SKILL.md) — label placement and one placement per form, single-column layout, the no-custom-spacing rule, validation timing, microcopy, save mode, and the rule that no form control goes inside a card.
- [`recursica-skill-label`](../recursica-skill-label/SKILL.md) — the label component, its placement axis, and required vs. optional marking.
- [`recursica-skill-assistive-element`](../recursica-skill-assistive-element/SKILL.md) — the help and error text below the field, and why the error replaces the help.
- [`recursica-skill-text-field`](../recursica-skill-text-field/SKILL.md) — the control for single-line entry, and the overflow rule that sends a long value here.
- [`recursica-skill-read-only-field`](../recursica-skill-read-only-field/SKILL.md) — the component for text the user never edits here.
- [`recursica-skill-system-conventions`](../../design-rules/recursica-skill-system-conventions/SKILL.md) — never carry meaning in a single channel.

## Uncovered — ask, do not invent

- **Auto-resize.** The kit fixes `rows`, and **a vertical-resize axis with `auto` and `custom` is documented outside the token inventory, with no token behind it.** **These disagree.** Whether the field grows with its content, and whether a user-draggable handle exists, must be settled by a human. Do not rely on a resize axis without asking.
- **What a fixed `rows` does with a longer value.** A "default fixed height before content truncation" is described outside the token inventory; whether the overflow scrolls or truncates is unstated, and truncating a user's own entry would be a serious problem. Do not rely on either behaviour without asking.
- **The character counter.** One is documented outside the token inventory, with no token behind it; the kit renders none. Where a count lives, and what happens at the limit, is unsettled — the same gap is open in `recursica-skill-assistive-element`. Do not rely on a counter without asking.
- **A rich text editor.** No component in the kit produces formatted content. Do not assemble one out of a textarea.
- **Minimum length.** Nothing states whether a minimum is a supported constraint or only a validation message.

## Pre-flight checklist

- [ ] The expected answer genuinely runs past one line, and a single-line field would be wrong.
- [ ] A visible label is passed and reads correctly on its own.
- [ ] Label placement is side-by-side unless the container is too narrow.
- [ ] `layouts` matches every other field in the same form — one placement per form at any given breakpoint, with no mixing between fields or sections, and this field was not stacked on its own because it is tall.
- [ ] No required information lives in placeholder text.
- [ ] Help text states what to include and any limit; on error it is replaced by a message restating the rule.
- [ ] The error state carries a non-color indicator.
- [ ] Help and error text are passed through the component, not rendered beside it.
- [ ] No character limit is enforced without being stated, and no text is silently truncated or cleared.
- [ ] Required state is conveyed programmatically, not by an asterisk alone.
- [ ] The field announces as multi-line, and any icon you added is named if interactive, silent if decorative.
- [ ] The field is in the tab order and tab order matches visual order.
- [ ] Tab exits the field, Enter inserts a line break and does not submit, and Escape does not clear it.
- [ ] Overflowing content is scrollable from the keyboard, and resizing is never required to finish the value.
- [ ] Focus is never moved for the user, and no live count floods a screen reader.
- [ ] A disabled field's reason is in text; nothing needed requires hover; the focus ring is intact.
- [ ] `rows`, height, and spacing were left to the component — no wrapper, no custom margins.
- [ ] No variant, size, or state outside the inventory above was passed.
- [ ] Non-editable text uses the read-only component, not a disabled textarea.
- [ ] Nothing in the uncovered list was invented.
