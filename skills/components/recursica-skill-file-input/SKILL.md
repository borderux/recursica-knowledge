---
name: recursica-skill-file-input
description: How to use the Recursica file input, the compact choose-a-file field — when it fits and when the larger upload area does, stating accepted types and size limits up front, and keyboard access. Use for a file or attachment field in a form. Not for a drop area with a file list — see recursica-skill-file-upload.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# File input

A file input is a single-line field that lets the user pick a file from their own device. It looks and behaves like a text field.

> **Not built yet.** Both adapters ship `FileInput` as a declared stub (an empty placeholder) that
> shows a placeholder — `mantine-adapter/src/components/FileInput/FileInput.module.css` and the MUI
> equivalent apply none of the 40 `file-input` variables the UI kit (the token file, `recursica_ui-kit.json`, that says which variants and states each component has) exports. Everything below is the
> intended contract, and it is correct about what the UI kit defines — but building against it today
> produces a placeholder, with no error. Use `recursica-skill-text-field` and a real `<input
type="file">` until this lands, and raise it instead of working around it.

## Use it when

- **A file is one field among many.** An attachment on a support ticket, a document on a submission, an avatar on a profile — the file is a property of the object, not the point of the screen.
- **The form is dense**, and a large drop area would take it over.
- **The number of files is small** — one file, or a few — and the user does not need a working list to manage them.

## Do not use it when

| Instead of a file input                                  | Use                                                                 |
| -------------------------------------------------------- | ------------------------------------------------------------------- |
| The user adds several files and manages them as a list   | `recursica-skill-file-upload`                                       |
| Uploading is the purpose of the screen or the section    | `recursica-skill-file-upload` — the larger area is the right weight |
| The file comes from Google Drive, Dropbox, or OneDrive   | That service's own picker. This control only reads the local device |
| The user manages folders, renames files, or moves them   | A table of the stored files — see `recursica-skill-tables`          |
| The user types a path or a URL                           | `recursica-skill-text-field`                                        |
| A file already attached is shown, but cannot be replaced | `recursica-skill-read-only-field`                                   |

**Do not use a file input for managing many files.** A field that picks a file is not a file manager. The moment the user needs to see progress, retry, or reorganize, this is the wrong control.

## What exists

Taken from `recursica_ui-kit.json` → `ui-kit.components.file-input`. **Do not pass a variant, size, or state that is not listed here.**

| Axis      | Options                   |
| --------- | ------------------------- |
| `layouts` | `stacked`, `side-by-side` |
| `states`  | `error`, `disabled`       |

**`layouts` is the label-placement axis (a variant property, as Figma calls it — one way a component varies, such as its size).** `side-by-side` — the label beside the field — is the house default. `stacked` is the fallback when the container is too narrow to fit both. What decides this is the container's width, not the viewport's (the visible area of the browser window). See `recursica-skill-forms`.

**Label placement is one decision per form, not per field.** This field's `layouts` value is not a separate choice — it matches every other field in the same form. The container-width test is applied once, to the whole form, and its answer governs every field in it, including short ones that would have fitted side by side. A whole form may switch placement between breakpoints (the screen widths at which the layout changes), but it never mixes the two at one breakpoint, and a section never gets its own placement. Owned by `recursica-skill-forms`.

**It is shaped like a single-line field.** `min-height`, `horizontal-padding`, `vertical-padding`, `border-size`, `border-radius`, `text`, and `placeholder-opacity` are the same set of properties as the text field — the clearest sign of what this component is for.

**There is one icon** — `icon-size` and `icon-text-gap`. It shows that this field takes a file.

**Placeholder is not a state**, and neither is focus. `placeholder-opacity`, and the focused border from `globals.form.field`, are handled by the component.

**There is no progress state, no success state, and no error state for each file.** There is no drop-zone axis, no size axis, and no axis for more than one file. See the uncovered list.

## Rules for using it

**State the accepted file types and the size limit in help text, before the user picks.** Both of them. "PDF or PNG, up to 10 MB" under the field. An error afterward is a failure you were left to deliver; the help text is what prevents it. Owned by `recursica-skill-assistive-element`.

**Limit the picker to the accepted types too.** The text is for the user; limiting the picker is for the computer. Do both, not one.

**Choosing a file does not start an upload.** Choosing a file saves nothing, so it does not use the form's save mode at all. The upload starts when the user clearly asks for it — never as a side effect of choosing a file. Where the form saves everything together, the upload finishes before submit. This is settled, and it does not conflict with the one-save-mode rule in `recursica-skill-forms`.

**Show the file the user picked.** A field that looks empty after a successful pick reads as a pick that failed. The selected file's name is the field's value.

**Never put the rule in the placeholder.** It disappears the moment there is a value. Use the placeholder only to show the form of what is expected.

**On error, replace the help text; do not add to it.** The message must restate the rule that was broken — "File must be under 10 MB", not "Invalid file". Swapping keeps the field's height the same, so the form below does not shift.

**Pair the error state with a signal that is not color.** Required by `recursica-skill-system-conventions`.

**Truncate a long file name; do not let the field grow.** The field is one line, and a name that pushes the layout around is worse than one that ends in an ellipsis (…). But the full name must still be available to assistive technology (tools such as screen readers that help people with disabilities use a computer).

**Never disable a file input as a way to show an attachment.** If the user can never replace it here, this is not a form control.

## Accessibility

This component also follows the accessibility baseline in `recursica-skill-system-conventions`, including the focus ring (the outline that shows which element has keyboard focus). Only what is specific to it is listed here.

The whole point of this component is that a file field is a field. Everything below is up to you, and the failures are almost always about the pointer.

### Screen readers

- **Pass a real label.** The icon does not name the field, and a placeholder is not a label. A field with no label has no accessible name (the name a screen reader reads out for a control).
- **The accepted types and the size limit must be in text that is connected to the field.** Pass them through the component as help text. Do not show them separately beside it, and do not deliver them only as an error after the user has already failed.
- **The name of the picked file must be announced as the field's value.** If the visible name is truncated, the full name must still be available.
- **Any clear or remove control needs an accessible name that includes the file name** — "Remove quarterly-report.pdf", not "Clear".
- **A removal must be announced**, and so must a rejected file and the reason it was rejected.
- **The field's icon is decorative and must be silent.** It is only a visual signal; the label and help text carry the meaning.
- **Never rely on the field's appearance to say that a file is attached.** The value must be readable, not just visible.

### Keyboard and non-mouse navigation

- **It must be a real file input, reachable with Tab and activated with Enter or Space.** Not a `div` with a click handler that opens a hidden input — only a real control gets keyboard activation and the right announcement without extra work.
- **A drop zone must never be the only way to add a file.** If drag and drop is supported at all, it is an extra on top of the control that can be reached by keyboard — never a replacement for it.
- **Any clear or remove control is its own tab stop** (a place the Tab key lands), in visual order, and works with Enter or Space.
- **When a file is removed, put focus somewhere on purpose** — back on the field itself, not lost at the top of the document.
- **Otherwise, do not move focus for the user.** Coming back from the operating system's file dialog leaves focus on the field.
- **Nothing needed may appear only on hover** — not the size limit, not the accepted types, and not the remove control.

## Decided elsewhere

Do not implement, override, or tune any of these — the component owns them:

- `min-height`, `horizontal-padding`, `vertical-padding`, `border-size`, `border-radius`.
- `icon-size` and `icon-text-gap`.
- `text` styling and `placeholder-opacity`.
- All `colors`, per layer and per state, including the focused border.
- Field colors and sizes from `globals.form.field`, label-field gaps and `vertical-item-gap` from `globals.form.properties`, and the disabled treatment from `globals.states.disabled`.

Never style an unfocused field so that it reads as disabled. An editable field must look editable at rest.

## Load these too

- `recursica-skill-label` — the field's name, placement, and the required or optional marker.
- `recursica-skill-assistive-element` — the help text carrying accepted types and the size limit, and the error message.
- `recursica-skill-forms` — single-column layout, one label placement per form and the container-width trigger for it, validation timing, save mode, and the no-form-control-in-a-card rule.
- `recursica-skill-system-conventions` — never carry meaning in a single channel; a drag or long-press always needs a second mechanism.

### Only if the screen also uses it

- `recursica-skill-file-upload` — the larger drop area with a list of uploaded files, and when it replaces this field.

## Uncovered — ask, do not invent

- **Upload feedback.** The UI kit defines no progress, no success, and no error state for each file on this component. Upload feedback is a real need, and there is nothing here to show it — do not invent a spinner, a bar, or a checkmark.
- **More than one file in one field.** A "multiple files" content option is shown only on the design-system website, but the UI kit has no axis for more than one file, and no tokens for each file. Whether this field may hold more than one, and what that looks like, is not settled — do not rely on this without asking.
- **The file chip and the clear icon.** Showing each file as a dismissible chip, plus an optional clear-all icon, is shown only on the design-system website. The UI kit defines no chip, no dismiss, and no clear control on this component. Do not rely on this without asking.
- **Retrying after a file is rejected or fails.** Nothing says whether the user can retry in place, or what the field shows while a retry is waiting.
- **A drop target on this field.** Nothing in the UI kit describes one. If drag and drop is wanted, ask.
- **Truncating file names** — how much is shown, and from which end.

## Pre-flight checklist

- [ ] The file is one field among many, and you ruled out a dedicated upload area on that basis.
- [ ] A real, visible label is passed, and its `layouts` placement matches every other field in the same form — one placement per form, as `recursica-skill-forms` requires.
- [ ] The accepted types and the size limit are stated in help text before the user picks, and the picker is limited to those types.
- [ ] No rule lives in the placeholder.
- [ ] The picked file's name is shown as the field's value, and is available in full even when truncated.
- [ ] On error, the help text is replaced by a message that restates the rule broken, with a signal that is not color.
- [ ] The control is a real file input, in the tab order, and activated by Enter or Space.
- [ ] No drop zone is the only way to add a file, and any drag support is an extra.
- [ ] Any clear or remove control is a tab stop, with a name that includes the file name.
- [ ] Removals and rejections are announced, and focus is put somewhere on purpose after a removal.
- [ ] The field's icon is silent, and the required state is shown in code.
- [ ] No upload starts as a side effect of choosing a file. It starts when the user clearly asks, and when the form saves everything together, it finishes before submit.
- [ ] You passed no variant, size, or state outside the inventory above.
- [ ] You overrode no padding, border, or color that the component owns, and no field without focus looks disabled.
- [ ] You invented nothing from the uncovered list: progress, success, more than one file, chips, and retrying.
