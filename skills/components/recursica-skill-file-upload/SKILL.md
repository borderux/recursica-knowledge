---
name: recursica-skill-file-upload
description: How to use the Recursica file upload correctly — the larger bordered area for adding files with a list of what has been added, when it replaces the compact file input, which layouts and states exist, stating accepted types and the size limit before the user picks, and the screen-reader and keyboard requirements that keep a drop zone from being the only way in. Use whenever adding, reviewing, or refactoring an upload area, an attachments section, a drop zone, or a multi-file picker. Trigger on "file upload", "drop zone", "drag and drop files", "upload area", "attachments", "uploaded files list", "remove file", "accepted file types", "max file size", "screen reader", or "tab order". Do NOT use for a single file inside a dense form — that is recursica-skill-file-input. Do NOT use for form layout, validation timing, or save mode — that is recursica-skill-forms.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# File upload

A file upload is a bordered area for adding files, with a list of the files that have been added below it.

> **Not implemented yet.** Both adapters ship `FileUpload` as a declared stub that renders a
> placeholder and apply none of the 32 `file-upload` variables the kit exports. Everything below
> is the intended contract and is correct about the kit, but building against it today produces a
> placeholder with no error. Raise it rather than working around it.

## Use it when

- **Uploading is the point of the surface** — an attachments section, a document intake, a submission step. The control earns the space it takes.
- **There are several files** and the user needs to see the whole set, check it, and remove the wrong one before committing.
- **The list has to persist** while the user keeps working, rather than a single value that is replaced.

## Do not use it when

| Instead of a file upload                               | Use                                                                 |
| ------------------------------------------------------ | ------------------------------------------------------------------- |
| A file is one field in a dense form                    | `recursica-skill-file-input`                                        |
| One image is replaced and no list is kept              | `recursica-skill-file-input` — a profile picture needs no queue     |
| The file comes from Google Drive, Dropbox, or OneDrive | That service's own picker. This control reads the local device only |
| The user manages files that are already stored         | A table of those files — see `recursica-skill-tables`               |
| Reporting how far work already underway has got        | `recursica-skill-loader` — this component has no progress state     |
| The attached files are shown but not changeable here   | `recursica-skill-read-only-field`                                   |

**A large upload area inside an otherwise compact form is a weight mismatch.** If the file is a minor property of the object, use the file input.

## What exists

Taken from `recursica_ui-kit.json` → `ui-kit.components.file-upload`. **Do not pass a variant, size, or state that is not listed here.**

| Axis      | Options                   |
| --------- | ------------------------- |
| `layouts` | `stacked`, `side-by-side` |
| `states`  | `error`, `disabled`       |

**`layouts` is the label placement axis.** `side-by-side` — label beside the control — is the house default; `stacked` is the fallback when the container is too narrow to fit both. The trigger is container width, not viewport.

**This field's `layouts` value is not an independent choice.** `recursica-skill-forms` requires **one label placement per form — side-by-side or stacked, never both at the same breakpoint.** The container-width test is applied once, to the form, and its answer governs every field in it, including short fields that would have fit. Match every other field in the same form. A whole form may switch placement across breakpoints; a section never gets its own. See `recursica-skill-forms`.

**This is the larger area, and the tokens say so.** `border-style`, `border-size`, `border-radius`, and `padding` describe a region rather than a line; `item-gap`, `list-spacing`, and `vertical-element-gap` describe the list of added files beneath it. That is the whole distinction from `file-input`, which is shaped like a single-line field.

**The added-file list is part of this component.** Do not compose your own list, chips, or rows below it.

**There is no progress state, no success state, and no per-file error state.** There is no styles axis, no size axis, and no single-versus-multi-file axis. See the uncovered list.

## Rules for using it

**State the accepted types and the size limit in text, before the user picks.** Both, up front. "PDF or DOCX, up to 25 MB each" in help text under the control. A rejection message after the fact is the failure this text prevents. Owned by `recursica-skill-assistive-element`.

**Restrict the picker to those types as well.** The text is for the user, the restriction is for the machine. Do both.

**Drag-and-drop is an addition, never the mechanism.** The area may accept a drop; the button inside it is what actually has to work. `recursica-skill-system-conventions` requires a second mechanism wherever the interaction is a drag.

**Every added file needs a visible name and its own remove control.** The list is what makes this component worth its size — a queue the user cannot edit is just a receipt.

**File selection does not start an upload.** Choosing a file is not saving anything, so it does not engage the form's save mode at all. **The upload begins on explicit user intent — never as a side effect of selection.** Where the form is batch-save, the upload completes before submit. This is settled, and it does not compete with the one-save-mode rule in `recursica-skill-forms`.

**Never block the interface while an upload runs.** No modal spinner, no locked viewport, no grayed-out form — the user must be able to keep reading their own entries. `recursica-skill-forms` bans blocking overlays on submit for the same reason.

**Removing a file from the list is immediate.** No confirmation — the user can add it again, which is exactly the recovery path `recursica-skill-forms` requires before a confirmation is warranted.

**On error, replace the help text; do not add to it.** The message restates the rule broken — "Each file must be under 25 MB" — not "Upload failed".

**Pair the error state with a non-color indicator.** Required by `recursica-skill-system-conventions`.

**Keep the list in the order files were added**, so the user can find the one they just picked.

**It is a form control, so it sits in the form's single column** and never inside a card. Owned by `recursica-skill-forms`.

**Never disable the control as a way to display a set of attachments.** If nothing can be added or removed here, this is not a form control.

## Accessibility

A drop zone is the single most common mouse-only control in an enterprise application. Everything below is yours.

### Screen readers

- **Pass a real label** for the whole control. The area's own copy — "Drag files here" — is instruction, not a name.
- **The accepted types and the size limit must be in associated text**, passed through the component, available before the user picks and not only in a rejection afterwards.
- **Every item in the added list announces its file name.** A row that announces only "file" or "document" is unusable in a list of eight.
- **Each remove control's accessible name must include the file name** — "Remove quarterly-report.pdf", not "Remove". Eight identical "Remove" buttons are eight indistinguishable buttons.
- **A removal must be announced**, and so must an addition and a rejection — including which file and why it was rejected.
- **The number of files in the list should be available**, not only countable by walking every row.
- **Do not describe the drop behavior as the only way in.** Copy that says "drag files here" and nothing else tells a keyboard user the control is not for them.
- **The area's icon is decorative and must be silent.**
- **Convey required state programmatically**, not by an asterisk alone.

### Keyboard and non-mouse navigation

- **The control must be a real file input, reachable by Tab and activated with Enter or Space.** Not a `div` with a click handler wrapping a hidden input.
- **A drop zone must never be the only way to add a file.** This is the rule this component exists to break most often; if drag-and-drop is present, the keyboard path is present too and does the same job.
- **Every remove control is its own tab stop**, in visual order down the list, operable by Enter or Space.
- **After a removal, place focus deliberately** — on the next item's remove control, or on the add control when the list is now empty. Focus left on a destroyed element strands the user silently.
- **Do not move focus for the user otherwise.** Returning from the file dialog leaves focus on the add control so the user can add another.
- **Tab order follows visual order**: label, add control, then the list top to bottom.
- **Nothing needed may be hover-only** — not the remove control, not the file name, not the size limit. A remove button revealed on row hover is unreachable by keyboard and by touch alike.
- **A disabled control is skipped by tab**, so put the reason in text.
- **Never suppress the focus ring**, and never let the drop-target highlight double as the focus indicator.

## Not your decision

Do not implement, override, or tune any of these — the component owns them:

- `border-style`, `border-size`, `border-radius`, `padding`.
- `item-gap`, `list-spacing`, `vertical-element-gap`.
- `text` styling and all `colors`.
- Field colors and sizes from `globals.form.field`, label-field gaps and `vertical-item-gap` from `globals.form.properties`, and the disabled treatment from `globals.states.disabled`.

## Load these too

- [`recursica-skill-file-input`](../recursica-skill-file-input/SKILL.md) — the compact single-line file field, and when it is the right control instead of this one.
- [`recursica-skill-label`](../recursica-skill-label/SKILL.md) — the control's name, placement, and the required or optional marker.
- [`recursica-skill-assistive-element`](../recursica-skill-assistive-element/SKILL.md) — the help text carrying accepted types and the size limit, and the error message.
- [`recursica-skill-forms`](../../design-rules/recursica-skill-forms/SKILL.md) — single-column layout, one label placement per form and the container-width trigger for it, validation timing, save mode, the ban on blocking overlays, and the confirmation test.
- [`recursica-skill-system-conventions`](../../design-rules/recursica-skill-system-conventions/SKILL.md) — never carry meaning in a single channel; a drag interaction always needs a second mechanism.

## Uncovered — ask, do not invent

- **Upload feedback.** The kit defines no progress, no success, and no per-file error state. Upload feedback is a real need and this component cannot express it — do not invent a bar, a spinner, or a per-row checkmark.
- **Button versus drop zone as documented styles.** Both are documented outside the token inventory; the kit has a single `border-style` property and no styles axis, so which arrangement it produces, and whether both are available, is unresolved — do not rely on this without asking.
- **Single-file versus multi-file as documented types.** Both are documented outside the token inventory; the kit has no such axis. Do not rely on this without asking.
- **Retry.** Nothing states what happens to a file that failed to upload, or whether the user can retry it in place.
- **Total limits.** A maximum number of files, or a total size across the set.
- **Thumbnails or previews** of image files in the list.
- **An empty state** for the list before anything is added.

## Pre-flight checklist

- [ ] Uploading is the point of this surface, and a compact file input was ruled out on that basis.
- [ ] A real visible label is passed, and its `layouts` placement matches every other field in the same form — one placement per form, per `recursica-skill-forms`.
- [ ] Accepted types and the size limit are stated in help text before the user picks, and the picker is restricted to those types.
- [ ] The add control is a real file input, in the tab order, activated by Enter or Space.
- [ ] No drop zone is the only way to add a file; any drag support is an addition, and the copy does not imply otherwise.
- [ ] Every added file shows its name and has its own remove control, visible without hover.
- [ ] Each remove control is a tab stop with a name including the file name.
- [ ] Additions, removals, and rejections are announced, with the reason for a rejection.
- [ ] After a removal, focus is placed deliberately; focus is not moved otherwise.
- [ ] Removal is immediate, with no confirmation dialog.
- [ ] The list keeps the order files were added; the file count is available.
- [ ] On error, help text is replaced by a message restating the rule broken, with a non-color indicator.
- [ ] No upload starts as a side effect of selection; it begins on explicit user intent, under batch save it completes before submit, and nothing blocks the interface while it runs.
- [ ] Tab order runs label, add control, then the list; the focus ring is intact and distinct from the drop-target highlight.
- [ ] The control sits in the form's single column and not inside a card.
- [ ] No variant, size, or state outside the inventory above was passed; no list, chip, or row was composed by hand.
- [ ] No component-owned border, padding, or gap was overridden.
- [ ] Nothing in the uncovered list — progress, success, retry, previews, total limits — was invented.
