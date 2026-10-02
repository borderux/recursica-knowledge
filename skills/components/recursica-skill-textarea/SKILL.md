---
name: recursica-skill-textarea
description: Rules for the Recursica textarea — when multi-line entry is right, states and label placement, the fixed row count, character limits with a stated rule, and multi-line accessibility. Use for comments, descriptions, and message fields. Not for single-line text — see recursica-skill-text-field.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Textarea

A textarea records plain text across several lines.

## When to use a textarea

- **The expected answer runs past one sentence** — a description, a justification, a note.
- **The user is writing, not identifying something** — comments, feedback, messages, the details of a support ticket.
- **Line breaks are part of the value.** If the user needs paragraphs, use a textarea.

**The field's label is the fastest check for whether a textarea is right.** `Description`, `Notes`, `Comments`, `Justification`, `Reason`, `Summary`, and `Details` all promise the user room to write. A label that calls for prose on a single-line field is a mismatch. The user discovers it by running out of space, after typing into a box that scrolls horizontally and hides what they wrote. If the label suggests prose, use a textarea. If it does not, rethink the label.

## When not to use a textarea

Each case below has its own component. Use that component instead of adapting a textarea:

| Instead of a textarea                       | Use                                                                                          |
| ------------------------------------------- | -------------------------------------------------------------------------------------------- |
| The content is short, and fits on one line  | `recursica-skill-text-field` — the size of the field tells the user how much to write        |
| The value comes from a known set of options | A dropdown, a radio group, or an autocomplete — see `recursica-skill-selection-controls`     |
| The user must apply bold, italics, or lists | A rich text editor. No such component exists in this kit — see the open questions            |
| The value is a number, a date, or a time    | `recursica-skill-number-input`, `recursica-skill-date-picker`, `recursica-skill-time-picker` |
| The value can never be edited here          | `recursica-skill-read-only-field` — shows the label and text, with no input                  |
| Long text is only being read, not written   | Body text on the page, not a field                                                           |

**Do not use a textarea to make a short field look important.** Size the field to the expected answer. An oversized box for a one-line answer leads the user to write more than the answer needs.

**Do not use a disabled textarea to show text.** Text that nobody can ever edit here is not a form control.

## Variants

Taken from the UI kit (the token file, `recursica_ui-kit.json`, that says which variants and states each component has) → `ui-kit.components.textarea`. **Pass only the variants and states listed here.** Other design systems have sizes, resize modes, warning states, and built-in counters that this component does not.

**Look up each variant's name in code before using the variant.** The names in this skill are the names in Figma and the UI kit. The code can use a different name for the same variant. A wrong name in code has no effect and shows no error. The Recursica MCP server's `recursica_get_component_doc` tool gives the name to use in code.

| Variant property | Options                   |
| ---------------- | ------------------------- |
| `layouts`        | `stacked`, `side-by-side` |
| `states`         | `error`, `disabled`       |

**`layouts` is the label-placement variant property.** `side-by-side` — the label beside the field — is the house default. `stacked` is the fallback when the container is too narrow to fit both. What decides this is the container's width, not the viewport's. See `recursica-skill-forms`.

**Set label placement explicitly on every field.** An adapter's default may be `stacked`, which puts the label above the input at any container width and breaks the house rule. Set `layouts` to `side-by-side` to put the label beside the input, under the names the code uses for both.

**Focus and placeholder are not variants.** The component handles them: `placeholder-opacity` here, and the focused border through `globals.form.field.colors.border-selected`. Do not build them as states.

**The tokens set `rows`. Do not set it on each instance.** The component fixes the number of rows. Do not pass a height, do not set a row count to fit a particular answer, and do not add a wrapper to stretch it. If the fixed height is wrong for a case, ask a person — see the open questions.

**There is no size variant property, and no width property.** The field's width comes from `globals.form.field.size`.

**There is no icon property.** The component has no `icon-size` and no `icon-text-gap`, because it defines no icon inside the field.

**There is no character counter.** Nothing in the UI kit shows a count.

**There is no read-only state.** Read-only is a separate component — `read-only-field`, with the same `layouts` variant property and no input.

## Rules

**Always pass a visible label.** Name the object clearly; a screen reader user hears the label on its own, without the context around it. Use sentence capitalization, with no colon at the end.

**Never put required information in the placeholder.** It disappears on the first keystroke. Use it only to show the expected format of the answer.

**Put the rule in help text** — what to include, any minimum, any maximum — so the user has it before they get it wrong.

**Never enforce a character limit the user cannot see.** If there is a maximum, the limit must be stated up front, and the user must be able to tell where they stand against it. The UI kit has no counter. If the design needs one, ask a person instead of building one.

**Never cut off or throw away what the user typed.** Do not quietly drop characters past a limit, and do not clear the field when validation fails — the text is theirs.

**On error, replace the help text; do not add to it.** Swapping keeps the field's height the same, so the form below does not shift. The message must restate the rule: "Invalid input" is not an error message; "Enter at least 20 characters" is.

**Pair the error state with a signal that is not color** — an icon, or the message itself. `recursica-skill-system-conventions` requires this.

**Do not add spacing around it to make up for its height.** The spacing between fields and sections is built into the components. A textarea is the tallest field in a form, and the difference in height is expected. `recursica-skill-forms` owns this rule.

**Label placement is one decision per form, not per field.** This field's `layouts` value is not a separate choice — it matches every other field in the same form. The container-width test is applied once, to the whole form, and its answer governs every field in it, including short ones that would have fitted side by side. A whole form may switch placement between breakpoints, but it never mixes the two at one breakpoint, and a section never gets its own placement. Owned by `recursica-skill-forms`.

**Never stack a textarea on its own because it is tall.** A stacked layout often looks better around a textarea, because a tall field beside a single-line label looks unbalanced in a narrow container. The width of the form's container decides placement, not the height of the field. If the form is side by side, this field is side by side too.

**Disabled and read-only are different components, not two styles of one.**

- **Disabled textarea** — a field that still looks like an input but cannot be used right now. Use it when the user could make it usable by doing something else first.
- **Read-only field** — a different component that shows a label and text, with no input. Use it when this user never edits this value here.

## Accessibility

This component also follows the accessibility baseline in `recursica-skill-system-conventions`. Only the rules specific to this component are listed here.

The component connects the label to the input and provides the focus ring. The application must handle everything below. The keyboard rules matter more here than on a single-line field, because Enter and Tab mean something different inside a textarea.

### Screen readers

- **Pass a real label.** Never let placeholder text be the accessible name (the name a screen reader reads out for a control) — it is not announced as a label, and it disappears when the user types. A field with no label has no accessible name.
- **State the limit, and what should go in the field, in the help text.** A visible character counter is not connected to the field, and may never be announced. Put the maximum in words the user hears on reaching the field.
- **Announce the field as multi-line.** It must be a real multi-line control, not a single-line input styled to look tall, so that a screen reader tells the user that line breaks are allowed.
- **The component defines no icon inside the field, and the application owns any icon placed there.** Give the icon an accessible name if it is clickable, and hide it from screen readers if it is decorative.
- **The error message is the text that gets announced.** It replaces the help text and is the only text read for the field. It must state the rule.
- **Do not announce every keystroke.** A live count that updates on every character interrupts the screen reader on every keystroke. If progress toward a limit must be spoken, announce it sparingly, and keep the limit itself in the help text.

### Keyboard and non-mouse navigation

- **Never remove the field from the tab order**, and never make reaching it depend on a pointer.
- **Tab must move out of the field, not insert a tab character.** This is the only way a keyboard user can leave a textarea.
- **Enter inserts a line break, and must not submit the form.** Never connect submit to Enter inside a textarea, and never make a key combination the only way to add a new line.
- **Escape must not clear the field**, or throw away what was entered.
- **Every control inside the field is its own tab stop** (a place the Tab key lands), and works with Enter or Space — not with a handler that only responds to clicks.
- **Do not move focus for the user** when the value reaches a length or a limit.
- **If the content scrolls, it must be scrollable from the keyboard** with focus inside the field — with the arrow keys, Page Up, and Page Down. A keyboard user cannot reach content that only a pointer can scroll to.
- **Never make resizing necessary to read or finish the value.** A drag handle cannot be used from the keyboard, so the field must be usable at the size it is given.
- **Nothing needed to complete the field may appear only on hover** — not the limit, and not the rule.

## Styling set by tokens

Do not set or override any of these. The component sets them:

- `border-radius`, `horizontal-padding`, `vertical-padding`, `border-size`.
- `rows` — the field's height. It is fixed by the component.
- Field width and sizing from `globals.form.field.size`.
- `text` styling and `placeholder-opacity`.
- `colors` per layer, including the focused border from `globals.form.field.colors.border-selected` and the global disabled treatment from `globals.states.disabled`.
- The label-field gaps and `vertical-item-gap` from `globals.form.properties`.
- The label-to-input association and key handling inside the field.

Never style an unfocused textarea to look disabled. An editable field must look editable at rest.

## Related skills

- `recursica-skill-forms` — label placement and one placement per form, single-column layout, the no-custom-spacing rule, validation timing, microcopy, save mode, and the rule that no form control goes inside a card.
- `recursica-skill-label` — the label component, its placement variant property, and required vs. optional marking.
- `recursica-skill-assistive-element` — the help and error text below the field, and why the error replaces the help.
- `recursica-skill-system-conventions` — never carry meaning in a single channel.

### Only if used on the same screen

- `recursica-skill-text-field` — the control for single-line entry, and the overflow rule that sends a long value here.
- `recursica-skill-read-only-field` — the component for text the user never edits here.

## Open questions

- **Growing to fit the content.** The UI kit fixes `rows`, and **a vertical-resize variant property with `auto` and `custom` is shown only on the design-system website, with no token behind it. These disagree.** Whether the field grows with its content, and whether there is a handle the user can drag, must be settled by a person. Do not rely on a resize variant property without asking.
- **What a fixed `rows` does with a longer value.** A "default fixed height before content truncation" is described outside the UI kit. Whether the extra text scrolls or is cut off is not stated — and cutting off a user's own entry would be a serious problem. Do not rely on either behavior without asking.
- **The character counter.** One is shown only on the design-system website, with no token behind it, and the UI kit shows none. Where a count lives, and what happens at the limit, is not settled — the same gap is open in `recursica-skill-assistive-element`. Do not rely on a counter without asking.
- **A rich text editor.** No component in the UI kit produces formatted content. Do not build one out of a textarea.
- **A minimum length.** Nothing says whether a minimum is a supported limit, or only a validation message.

## Pre-flight checklist

- [ ] The expected answer runs past one line, and a single-line field would be wrong.
- [ ] No field whose label promises prose — `Description`, `Notes`, `Comments`, `Justification`, `Reason`, `Summary`, `Details` — is built as a single-line text field.
- [ ] A visible label is passed, and it makes sense on its own.
- [ ] Label placement is side by side, unless the container is too narrow.
- [ ] `layouts` matches every other field in the same form — one placement per form at any given breakpoint, with no mixing between fields or sections — and this field is stacked only when the whole form is.
- [ ] No required information lives in placeholder text.
- [ ] Help text says what to include and any limit. On error, it is replaced by a message that restates the rule.
- [ ] The error state has a signal that is not color.
- [ ] No character limit is enforced without being stated, and no text is quietly cut off or cleared.
- [ ] The field is announced as multi-line. Any icon added to the field has an accessible name if it is clickable, and is hidden from screen readers if it is decorative.
- [ ] Tab leaves the field, Enter inserts a line break and does not submit, and Escape does not clear it.
- [ ] Content that overflows can be scrolled from the keyboard, and resizing is never needed to finish the value.
- [ ] Focus is never moved for the user, and no live count is announced on every keystroke.
- [ ] `rows`, height, and spacing come from the component, with no wrapper and no custom margins.
- [ ] Every variant, size, and state passed appears in the inventory above.
- [ ] Text that cannot be edited uses the read-only component, not a disabled textarea.
- [ ] Open questions were asked about, not decided: growing to fit the content, what a fixed `rows` does with a longer value, the character counter, a rich text editor, and a minimum length.
