---
name: recursica-skill-file-input
description: How to use the Recursica file input correctly — the compact single-line "choose a file" field for a form, when it is right and when the larger file upload area is, which layouts and states exist, stating accepted types and the size limit before the user picks, and the screen-reader and keyboard requirements that keep a file reachable without a pointer. Use whenever adding, reviewing, or refactoring a file picker inside a form, an attachment field, or an avatar or document field. Trigger on "file input", "file picker", "choose file", "attach a file", "browse", "accepted file types", "max file size", "screen reader", or "tab order". Do NOT use for a drop area with a list of uploaded files — that is recursica-skill-file-upload. Do NOT use for form layout, validation timing, or save mode — that is recursica-skill-forms.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# File input

A file input is a single-line field that lets the user pick a file from their own device. It looks and behaves like a text field.

> **Not implemented yet.** Both adapters ship `FileInput` as a declared stub that renders a
> placeholder — `mantine-adapter/src/components/FileInput/FileInput.module.css` and the MUI
> equivalent apply none of the 40 `file-input` variables the kit exports. Everything below is the
> intended contract, and it is correct about what the kit defines, but building against it today
> produces a placeholder with no error. Use `recursica-skill-text-field` and a real `<input
> type="file">` until this lands, and raise it rather than working around it.

## Use it when

- **A file is one field among many.** An attachment on a support ticket, a document on a submission, an avatar on a profile — the file is a property of the object, not the point of the screen.
- **The form is dense** and a large drop area would dominate it.
- **The count is small** — one file, or a few — and the user does not need a working list to manage.

## Do not use it when

| Instead of a file input                                | Use                                                                 |
| ------------------------------------------------------ | ------------------------------------------------------------------- |
| The user adds several files and manages them as a list | `recursica-skill-file-upload`                                       |
| Uploading is the purpose of the screen or the section  | `recursica-skill-file-upload` — the larger area is the right weight |
| The file comes from Google Drive, Dropbox, or OneDrive | That service's own picker. This control reads the local device only |
| The user manages folders, renames, or moves files      | A table of the stored files — see `recursica-skill-tables`          |
| The user types a path or a URL                         | `recursica-skill-text-field`                                        |
| An already-attached file is shown but not replaceable  | `recursica-skill-read-only-field`                                   |

**Do not use a file input for bulk file management.** A field that picks a file is not a file manager; the moment the user needs to see progress, retry, or reorganize, this is the wrong control.

## What exists

Taken from `recursica_ui-kit.json` → `ui-kit.components.file-input`. **Do not pass a variant, size, or state that is not listed here.**

| Axis      | Options                   |
| --------- | ------------------------- |
| `layouts` | `stacked`, `side-by-side` |
| `states`  | `error`, `disabled`       |

**`layouts` is the label placement axis.** `side-by-side` — label beside the field — is the house default; `stacked` is the fallback when the container is too narrow to fit both. The trigger is container width, not viewport.

**This field's `layouts` value is not an independent choice.** `recursica-skill-forms` requires **one label placement per form — side-by-side or stacked, never both at the same breakpoint.** The container-width test is applied once, to the form, and its answer governs every field in it, including short fields that would have fit. Match every other field in the same form. A whole form may switch placement across breakpoints; a section never gets its own. See `recursica-skill-forms`.

**It is shaped like a single-line field.** `min-height`, `horizontal-padding`, `vertical-padding`, `border-size`, `border-radius`, `text`, and `placeholder-opacity` are the same vocabulary as the text field — that is the clearest signal of what this component is for.

**There is one icon** — `icon-size` and `icon-text-gap`. It signals that this field takes a file.

**Placeholder is not a state**, and neither is focus. `placeholder-opacity` and the focused border from `globals.form.field` are handled by the component.

**There is no progress state, no success state, and no per-file error state.** There is no drop-zone axis, no size axis, and no multiple-file axis. See the uncovered list.

## Rules for using it

**State the accepted types and the size limit in help text, before the user picks.** Both. "PDF or PNG, up to 10 MB" under the field. An error afterwards is a failure the component made you deliver; the help text is what prevents it. Owned by `recursica-skill-assistive-element`.

**Constrain the picker to the accepted types too.** The text is for the user; restricting the picker is for the machine. Do both, not one.

**File selection does not start an upload.** Choosing a file is not saving anything, so it does not engage the form's save mode at all. **The upload begins on explicit user intent — never as a side effect of selection.** Where the form is batch-save, the upload completes before submit. This is settled, and it does not compete with the one-save-mode rule in `recursica-skill-forms`.

**Show the file the user picked.** A field that looks empty after a successful pick reads as a failed pick. The selected file name is the field's value.

**Never put the rule in the placeholder.** It disappears the moment there is a value. Use the placeholder only to show the shape of what is expected.

**On error, replace the help text; do not add to it.** The message must restate the rule broken — "File must be under 10 MB", not "Invalid file". Swapping keeps the field height stable so the form below does not shift.

**Pair the error state with a non-color indicator.** Required by `recursica-skill-system-conventions`.

**Truncate a long file name, do not let the field grow.** The field is one line, and a name that pushes the layout around is worse than one that ends in an ellipsis — but the full name must still be available to assistive technology.

**Never disable a file input as a way to display an attachment.** If the user can never replace it here, this is not a form control.

## Accessibility

The whole point of this component is that a file field is a field. Everything below is yours, and the failures are almost always about the pointer.

### Screen readers

- **Pass a real label.** The icon does not name the field, and a placeholder is not a label. A field with no label has no accessible name.
- **The accepted types and the size limit must be in text that is associated with the field**, passed through the component as help text — not rendered loosely beside it, and not delivered only as an error after the user has already failed.
- **The picked file's name must be announced as the field's value.** If the visible name is truncated, the full name must still be exposed.
- **Any clear or remove affordance needs an accessible name that includes the file name** — "Remove quarterly-report.pdf", not "Clear".
- **A removal must be announced**, and so must a rejected file and the reason.
- **The field's icon is decorative and must be silent.** It is a visual channel; the label and help text carry the meaning.
- **Convey required state programmatically**, not by an asterisk alone.
- **Never rely on the field's appearance to say a file is attached.** The value must be readable, not merely visible.

### Keyboard and non-mouse navigation

- **It must be a real file input, reachable by Tab and activated by Enter or Space.** Not a `div` with a click handler that opens a hidden input — only a real control gets keyboard activation and the right announcement for free.
- **A drop zone must never be the only way to add a file.** If drag-and-drop is supported at all, it is an addition on top of the keyboard-reachable control, never a replacement for it.
- **Any clear or remove control is its own tab stop**, in visual order, operable by Enter or Space.
- **When a file is removed, place focus deliberately** — back on the field itself, not lost at the top of the document.
- **Do not move focus for the user otherwise.** Returning from the operating system's file dialog leaves focus on the field.
- **Tab order follows visual order**, which the single-column form layout in `recursica-skill-forms` makes trivial.
- **Nothing needed may be hover-only** — not the size limit, not the accepted types, not the remove control.
- **A disabled field is skipped by tab**, so put the reason it is disabled in text.
- **Never suppress the focus ring.**

## Not your decision

Do not implement, override, or tune any of these — the component owns them:

- `min-height`, `horizontal-padding`, `vertical-padding`, `border-size`, `border-radius`.
- `icon-size` and `icon-text-gap`.
- `text` styling and `placeholder-opacity`.
- All `colors`, per layer and per state, including the focused border.
- Field colors and sizes from `globals.form.field`, label-field gaps and `vertical-item-gap` from `globals.form.properties`, and the disabled treatment from `globals.states.disabled`.

Never style an unfocused field so that it reads as disabled. An editable field must look editable at rest.

## Load these too

- [`recursica-skill-file-upload`](../recursica-skill-file-upload/SKILL.md) — the larger drop area with a list of uploaded files, and when it replaces this field.
- [`recursica-skill-label`](../recursica-skill-label/SKILL.md) — the field's name, placement, and the required or optional marker.
- [`recursica-skill-assistive-element`](../recursica-skill-assistive-element/SKILL.md) — the help text carrying accepted types and the size limit, and the error message.
- [`recursica-skill-forms`](../../design-rules/recursica-skill-forms/SKILL.md) — single-column layout, one label placement per form and the container-width trigger for it, validation timing, save mode, and the no-form-control-in-a-card rule.
- [`recursica-skill-system-conventions`](../../design-rules/recursica-skill-system-conventions/SKILL.md) — never carry meaning in a single channel; a drag or long-press always needs a second mechanism.

## Uncovered — ask, do not invent

- **Upload feedback.** The kit defines no progress, no success, and no per-file error state on this component. Upload feedback is a real need and there is nothing here to express it — do not invent a spinner, a bar, or a checkmark.
- **Multiple files in one field.** A "multiple files" content option is documented outside the token inventory; the kit has no multiple-file axis and no per-file tokens. Whether this field may hold more than one, and what that looks like, is unresolved — do not rely on this without asking.
- **The file chip and the clear icon.** Each file as a dismissible chip, plus an optional clear-all icon, is documented outside the token inventory; the kit defines no chip, no dismiss, and no clear control on this component. Do not rely on this without asking.
- **Retry after a rejected or failed file.** Nothing states whether the user can retry in place, or what the field shows while a retry is pending.
- **A drop target on this field.** Nothing in the kit describes one. If drag-and-drop is wanted, ask.
- **File name truncation** — how much is shown, and from which end.

## Pre-flight checklist

- [ ] The file is one field among many; a dedicated upload area was ruled out on that basis.
- [ ] A real visible label is passed, and its `layouts` placement matches every other field in the same form — one placement per form, per `recursica-skill-forms`.
- [ ] Accepted types and the size limit are stated in help text before the user picks, and the picker is restricted to those types.
- [ ] No rule lives in the placeholder.
- [ ] The picked file's name is shown as the field's value, and exposed in full even when truncated.
- [ ] On error, the help text is replaced by a message restating the rule broken, with a non-color indicator.
- [ ] The control is a real file input, in the tab order, activated by Enter or Space.
- [ ] No drop zone is the only way to add a file; any drag support is an addition.
- [ ] Any clear or remove control is a tab stop with a name that includes the file name.
- [ ] Removals and rejections are announced, and focus is placed deliberately after a removal.
- [ ] The field's icon is silent; required state is conveyed programmatically.
- [ ] Tab order follows visual order, nothing needed is hover-only, and the focus ring is intact.
- [ ] No upload starts as a side effect of selection; it begins on explicit user intent, and under batch save it completes before submit.
- [ ] No variant, size, or state outside the inventory above was passed.
- [ ] No component-owned padding, border, or color was overridden, and no unfocused field reads as disabled.
- [ ] Nothing in the uncovered list — progress, success, multiple files, chips, retry — was invented.
