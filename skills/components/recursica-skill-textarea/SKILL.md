---
name: recursica-skill-textarea
description: How to use the Recursica textarea correctly — when multi-line entry is the right control and when a single-line field or another component replaces it, which states and layouts exist, why row count is token-owned rather than yours, character limits and why a limit needs a stated rule, label and help and error text rules, and the screen-reader and keyboard requirements for a multi-line field. Use whenever adding, reviewing, or refactoring a comment box, a description, a message composer, or any field expected to run past one line. Trigger on "textarea", "text area", "multi-line", "multiline", "comment box", "description field", "rows", "character count", "character limit", "resize", "screen reader", "tab order", or a request to let a user write more than a sentence. Do NOT use for single-line entry — that is recursica-skill-text-field. Do NOT use for form layout, validation timing, or save behavior — that is recursica-skill-forms.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Textarea

A textarea records plain text across several lines.

## Use it when

- **The expected answer runs past one sentence** — a description, a justification, a note.
- **The user is writing, not identifying something** — comments, feedback, messages, the details of a support ticket.
- **Line breaks are part of the value.** If the user needs paragraphs, this is the control.

**The label usually gives it away, and it is the fastest check there is.** `Description`, `Notes`, `Comments`, `Justification`, `Reason`, `Summary`, and `Details` all promise the user room to write. **A label that calls for prose, over a single-line field, is a mismatch the user discovers by running out of space** — and by then they have typed into a box that scrolls sideways, where they cannot see what they wrote. If the label suggests prose, the control is a textarea; if it does not, rethink the label.

## Do not use it when

Each of these has a different component. Switch to it, instead of adapting a textarea:

| Instead of a textarea                       | Use                                                                                          |
| ------------------------------------------- | -------------------------------------------------------------------------------------------- |
| The content is short, and fits on one line  | `recursica-skill-text-field` — the size of the field tells the user how much to write        |
| The value comes from a known set of options | A dropdown, a radio group, or an autocomplete — see `recursica-skill-selection-controls`     |
| The user must apply bold, italics, or lists | A rich text editor. No such component exists in this kit — see Uncovered                     |
| The value is a number, a date, or a time    | `recursica-skill-number-input`, `recursica-skill-date-picker`, `recursica-skill-time-picker` |
| The value can never be edited here          | `recursica-skill-read-only-field` — shows the label and text, with no input                  |
| Long text is only being read, not written   | Body text on the page, not a field                                                           |

**A textarea is not a way to make a short field look important.** Size it to the answer you expect: an oversized box for a one-line answer invites the wrong amount of text.

**A disabled textarea is not a way to show text.** If nobody can ever edit it here, it is not a form control.

## What exists

Taken from `recursica_ui-kit.json` → `ui-kit.components.textarea`. **Do not pass a variant or state that is not listed here** — other design systems have sizes, resize modes, warning states, and built-in counters that this component does not.

**The third column is the React prop that sets each axis.** The axis name comes from the token inventory. It is not a prop, and if you pass it as one, React quietly ignores it. A blank cell means no single prop sets that axis — it is set by CSS state or by separate props, and the rules below say which.

| Axis      | Options                   | React prop   |
| --------- | ------------------------- | ------------ |
| `layouts` | `stacked`, `side-by-side` | `formLayout` |
| `states`  | `error`, `disabled`       |              |

**`layouts` is the label-placement axis, set by the `formLayout` prop.** `side-by-side` — the label beside the field — is the house default. `stacked` is the fallback when the container is too narrow to fit both. What decides this is the container's width, not the viewport's (the visible area of the browser window). See `recursica-skill-forms`.

**`formLayout` defaults to `stacked`, so the house rule is the one thing you must pass.** Leave it out, and you get the fallback in a container of any width — the rule turned upside down. `layouts` is the name of the token axis, not a prop: `layouts="side-by-side"` is quietly ignored by React and leaves the control stacked, with no error. Pass `formLayout="side-by-side"` explicitly.

**Focus and placeholder are not variants.** The component handles them: `placeholder-opacity` here, and the focused border through `globals.form.field.colors.border-selected`. Do not build them as states.

**`rows` is a property owned by tokens, not a prop you set for each instance.** The component fixes the number of rows. Do not pass a height, do not set a row count to fit a particular answer, and do not add a wrapper to stretch it. If the fixed height is wrong for a case, that is a question for a person — see the uncovered list.

**There is no size axis, and no width property.** The field's width comes from `globals.form.field.size`.

**There is no icon property.** No `icon-size`, and no `icon-text-gap` — this component defines no icon inside the field.

**There is no character counter.** Nothing in the kit shows a count.

**There is no read-only state.** Read-only is a separate component — `read-only-field`, with the same `layouts` axis and no input.

## Rules for using it

**Always pass a visible label.** Name the object clearly; a screen reader user hears the label on its own, without the context around it. Use sentence capitalization, with no colon at the end.

**Never put required information in the placeholder.** It disappears on the first keystroke. Use it only to show the form of the answer you expect.

**Put the rule in help text** — what to include, any minimum, any maximum — so the user has it before they get it wrong.

**Never enforce a character limit the user cannot see.** If there is a maximum, the limit must be stated up front, and the user must be able to tell where they stand against it. The kit has no counter, so if the design needs one, raise it instead of building one.

**Never cut off or throw away what the user typed.** Do not quietly drop characters past a limit, and do not clear the field when validation fails — the text is theirs.

**On error, replace the help text; do not add to it.** Swapping keeps the field's height the same, so the form below does not shift. The message must restate the rule: "Invalid input" is not an error message; "Enter at least 20 characters" is.

**Pair the error state with a signal that is not color** — an icon, or the message itself. Required by `recursica-skill-system-conventions`.

**Do not add spacing around it to make up for its height.** The spacing between fields and sections is built into the components. A textarea is the tallest field in a form, and that uneven rhythm is expected. Owned by `recursica-skill-forms`.

**Label placement is one decision per form, not per field.** This field's `layouts` value is not a separate choice — it matches every other field in the same form. The container-width test is applied once, to the whole form, and its answer governs every field in it, including short ones that would have fitted side by side. A whole form may switch placement between breakpoints (the screen widths at which the layout changes), but it never mixes the two at one breakpoint, and a section never gets its own placement. Owned by `recursica-skill-forms`.

**A stacked layout is often more comfortable around a textarea** — a tall field beside a single-line label reads badly in a narrow container — **but that is never a reason to stack this one field on its own.** What decides it is the width of the form's container, not the height of the field. If the form is side by side, then this field is side by side too.

**Disabled and read-only are different components, not two styles of one.**

- **Disabled textarea** — still a field, still clearly an input, but not usable right now. Use it when the user could make it usable by doing something else first.
- **Read-only field** — a different component. A label and text, with no input. Use it when this user never edits this value here.

## Accessibility

This component also follows the accessibility baseline in `recursica-skill-system-conventions`. Only what is specific to it is listed here.

The component connects the label to the input, and provides the focus ring (the outline that shows which element has keyboard focus). Everything below is up to you. The keyboard rules matter more here than on a single-line field, because Enter and Tab mean something different inside a textarea.

### Screen readers

- **Pass a real label.** Never let placeholder text be the accessible name (the name a screen reader reads out for a control) — it is not announced as a label, and it disappears when the user types. A field with no label has no accessible name.
- **State the limit, and what should go in the field, in the help text.** A visible character counter is not connected to the field, and may never be announced. So the maximum has to be in words the user hears when they arrive.
- **Announce the field as multi-line.** It must be a real multi-line control, not a single-line input styled to look tall, so that a screen reader (software that reads the screen aloud) tells the user that line breaks are allowed.
- **The component defines no icon inside the field, so any icon you place there is yours** — give it an accessible name if it can be used, and keep it silent if it is decorative.
- **The error message is the text that gets announced.** Because it replaces the help text, it is the only thing that will be read — so it has to state the rule.
- **Do not announce every keystroke.** A live count that updates on every character floods a screen reader. If progress toward a limit must be spoken, announce it sparingly, and keep the limit itself in the help text.

### Keyboard and non-mouse navigation

- **Never remove the field from the tab order**, and never make reaching it depend on a pointer.
- **Tab must move out of the field, not insert a tab character.** This is the only way a keyboard user can leave a textarea.
- **Enter inserts a line break, and must not submit the form.** Never connect submit to Enter inside a textarea, and never make a key combination the only way to add a new line.
- **Escape must not clear the field**, or throw away what was entered.
- **Every control inside the field is its own tab stop** (a place the Tab key lands), and works with Enter or Space — not with a handler that only responds to clicks.
- **Do not move focus for the user** when the value reaches a length or a limit.
- **If the content scrolls, it must be scrollable from the keyboard** with focus inside the field — with the arrow keys, Page Up, and Page Down. Content the user cannot reach without a pointer cannot be reached at all.
- **Never make resizing necessary to read or finish the value.** A drag handle cannot be used from the keyboard, so the field must be usable at the size it is given.
- **Nothing needed to complete the field may appear only on hover** — not the limit, and not the rule.

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

- `recursica-skill-forms` — label placement and one placement per form, single-column layout, the no-custom-spacing rule, validation timing, microcopy, save mode, and the rule that no form control goes inside a card.
- `recursica-skill-label` — the label component, its placement axis, and required vs. optional marking.
- `recursica-skill-assistive-element` — the help and error text below the field, and why the error replaces the help.
- `recursica-skill-system-conventions` — never carry meaning in a single channel.

### Only if the screen also uses it

- `recursica-skill-text-field` — the control for single-line entry, and the overflow rule that sends a long value here.
- `recursica-skill-read-only-field` — the component for text the user never edits here.

## Uncovered — ask, do not invent

- **Growing to fit the content.** The kit fixes `rows`, and **a vertical-resize axis with `auto` and `custom` is documented outside the token inventory, with no token behind it.** **These disagree.** Whether the field grows with its content, and whether there is a handle the user can drag, must be settled by a person. Do not rely on a resize axis without asking.
- **What a fixed `rows` does with a longer value.** A "default fixed height before content truncation" is described outside the token inventory. Whether the extra text scrolls or is cut off is not stated — and cutting off a user's own entry would be a serious problem. Do not rely on either behaviour without asking.
- **The character counter.** One is documented outside the token inventory, with no token behind it, and the kit shows none. Where a count lives, and what happens at the limit, is not settled — the same gap is open in `recursica-skill-assistive-element`. Do not rely on a counter without asking.
- **A rich text editor.** No component in the kit produces formatted content. Do not build one out of a textarea.
- **A minimum length.** Nothing says whether a minimum is a supported limit, or only a validation message.

## Pre-flight checklist

- [ ] The expected answer really runs past one line, and a single-line field would be wrong.
- [ ] No field whose label promises prose — `Description`, `Notes`, `Comments`, `Justification`, `Reason`, `Summary`, `Details` — is built as a single-line text field.
- [ ] A visible label is passed, and it makes sense on its own.
- [ ] Label placement is side by side, unless the container is too narrow.
- [ ] `layouts` matches every other field in the same form — one placement per form at any given breakpoint, with no mixing between fields or sections — and you did not stack this field on its own because it is tall.
- [ ] No required information lives in placeholder text.
- [ ] Help text says what to include and any limit. On error, it is replaced by a message that restates the rule.
- [ ] The error state has a signal that is not color.
- [ ] No character limit is enforced without being stated, and no text is quietly cut off or cleared.
- [ ] The field is announced as multi-line. Any icon you added is named if it can be used, and silent if it is decorative.
- [ ] Tab leaves the field, Enter inserts a line break and does not submit, and Escape does not clear it.
- [ ] Content that overflows can be scrolled from the keyboard, and resizing is never needed to finish the value.
- [ ] Focus is never moved for the user, and no live count floods a screen reader.
- [ ] You left `rows`, height, and spacing to the component — no wrapper, and no custom margins.
- [ ] You passed no variant, size, or state outside the inventory above.
- [ ] Text that cannot be edited uses the read-only component, not a disabled textarea.
- [ ] You invented nothing from the uncovered list.
