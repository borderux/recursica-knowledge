---
name: recursica-skill-file-upload
description: How to use the Recursica file upload correctly — the larger bordered area for adding files with a list of what has been added, when it replaces the compact file input, which layouts and states exist, stating accepted types and the size limit before the user picks, and the screen-reader and keyboard requirements that keep a drop zone from being the only way in. Use whenever adding, reviewing, or refactoring an upload area, an attachments section, a drop zone, or a multi-file picker. Trigger on "file upload", "drop zone", "drag and drop files", "upload area", "attachments", "uploaded files list", "remove file", "accepted file types", "max file size", "screen reader", or "tab order". Do NOT use for a single file inside a dense form — that is recursica-skill-file-input. Do NOT use for form layout, validation timing, or save mode — that is recursica-skill-forms.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# File upload

A file upload is a bordered area for adding files, with a list below it of the files that have been added.

> **Not built yet.** Both adapters ship `FileUpload` as a declared stub (an empty placeholder) that
> shows a placeholder, and they apply none of the 32 `file-upload` variables the kit exports.
> Everything below is the intended contract and is correct about the kit — but building against it
> today produces a placeholder, with no error. Raise it instead of working around it.

## Use it when

- **Uploading is the point of the surface** — an attachments section, a document intake, a submission step. The control earns the space it takes.
- **There are several files**, and the user needs to see the whole set, check it, and remove the wrong one before saving.
- **The list has to stay in place** while the user keeps working, rather than being a single value that gets replaced.

## Do not use it when

| Instead of a file upload                                 | Use                                                                 |
| -------------------------------------------------------- | ------------------------------------------------------------------- |
| A file is one field in a dense form                      | `recursica-skill-file-input`                                        |
| One image is replaced, and no list is kept               | `recursica-skill-file-input` — a profile picture needs no queue     |
| The file comes from Google Drive, Dropbox, or OneDrive   | That service's own picker. This control only reads the local device |
| The user manages files that are already stored           | A table of those files — see `recursica-skill-tables`               |
| Reporting how far some work already underway has got     | `recursica-skill-loader` — this component has no progress state     |
| The attached files are shown, but cannot be changed here | `recursica-skill-read-only-field`                                   |

**A large upload area inside an otherwise compact form is out of proportion.** If the file is a minor property of the object, use the file input.

## What exists

Taken from `recursica_ui-kit.json` → `ui-kit.components.file-upload`. **Do not pass a variant, size, or state that is not listed here.**

| Axis      | Options                   |
| --------- | ------------------------- |
| `layouts` | `stacked`, `side-by-side` |
| `states`  | `error`, `disabled`       |

**`layouts` is the label-placement axis.** `side-by-side` — the label beside the control — is the house default. `stacked` is the fallback when the container is too narrow to fit both. What decides this is the container's width, not the viewport's (the visible area of the browser window). See `recursica-skill-forms`.

**Label placement is one decision per form, not per field.** This field's `layouts` value is not a separate choice — it matches every other field in the same form. The container-width test is applied once, to the whole form, and its answer governs every field in it, including short ones that would have fitted side by side. A whole form may switch placement between breakpoints (the screen widths at which the layout changes), but it never mixes the two at one breakpoint, and a section never gets its own placement. Owned by `recursica-skill-forms`.

**This is the larger area, and the tokens say so.** `border-style`, `border-size`, `border-radius`, and `padding` describe a region rather than a line. `item-gap`, `list-spacing`, and `vertical-element-gap` describe the list of added files beneath it. That is the whole difference from `file-input`, which is shaped like a single-line field.

**The list of added files is part of this component.** Do not build your own list, chips, or rows below it.

**There is no progress state, no success state, and no error state for each file.** There is no styles axis, no size axis, and no axis for one file versus several. See the uncovered list.

## Rules for using it

**State the accepted file types and the size limit in text, before the user picks.** Both, up front. "PDF or DOCX, up to 25 MB each" in help text under the control. A rejection message after the fact is the failure this text prevents. Owned by `recursica-skill-assistive-element`.

**Limit the picker to those types as well.** The text is for the user; the limit is for the computer. Do both.

**Drag and drop is an extra, never the way in.** The area may accept a dropped file, but the button inside it is what actually has to work. `recursica-skill-system-conventions` requires a second way of doing it wherever the interaction is a drag.

**Every added file needs a visible name and its own remove control.** The list is what makes this component worth its size — a queue the user cannot edit is just a receipt.

**Choosing a file does not start an upload.** Choosing a file saves nothing, so it does not use the form's save mode at all. **The upload starts when the user clearly asks for it — never as a side effect of choosing a file.** Where the form saves everything together, the upload finishes before submit. This is settled, and it does not conflict with the one-save-mode rule in `recursica-skill-forms`.

**Never block the interface while an upload runs.** No spinner in a modal, no locked viewport, and no grayed-out form — the user must be able to keep reading what they entered. `recursica-skill-forms` bans blocking overlays on submit for the same reason.

**Removing a file from the list happens immediately.** No confirmation — the user can add it again, which is exactly the way to recover that `recursica-skill-forms` requires before a confirmation is called for.

**On error, replace the help text; do not add to it.** The message restates the rule that was broken — "Each file must be under 25 MB" — not "Upload failed".

**Pair the error state with a signal that is not color.** Required by `recursica-skill-system-conventions`.

**Keep the list in the order the files were added**, so the user can find the one they just picked.

**It is a form control, so it sits in the form's single column**, and never inside a card. Owned by `recursica-skill-forms`.

**Never disable the control as a way to show a set of attachments.** If nothing can be added or removed here, this is not a form control.

## Accessibility

This component also follows the accessibility baseline in `recursica-skill-system-conventions`, including the focus ring (the outline that shows which element has keyboard focus). Only what is specific to it is listed here.

A drop zone is the single most common control in an enterprise application that works only with a mouse. Everything below is up to you.

### Screen readers

- **Pass a real label** for the whole control. The area's own text — "Drag files here" — is an instruction, not a name.
- **The accepted types and the size limit must be in connected text**, passed through the component, and available before the user picks — not only in a rejection afterward.
- **Every item in the list of added files announces its file name.** A row that announces only "file" or "document" cannot be used in a list of eight.
- **Each remove control's accessible name (the name a screen reader reads out for a control) must include the file name** — "Remove quarterly-report.pdf", not "Remove". Eight identical "Remove" buttons are eight buttons nobody can tell apart.
- **A removal must be announced**, and so must an addition and a rejection — including which file, and why it was rejected.
- **The number of files in the list should be available**, not something the user can only count by going through every row.
- **Do not describe dropping files as the only way in.** Text that says "drag files here" and nothing else tells a keyboard user the control is not for them.
- **The area's icon is decorative and must be silent.**

### Keyboard and non-mouse navigation

- **The control must be a real file input, reachable with Tab and activated with Enter or Space.** Not a `div` with a click handler wrapped around a hidden input.
- **A drop zone must never be the only way to add a file.** This is the rule this component breaks most often. If drag and drop is present, the keyboard way is present too, and it does the same job.
- **Every remove control is its own tab stop** (a place the Tab key lands), in visual order down the list, and works with Enter or Space.
- **After a removal, put focus somewhere on purpose** — on the next item's remove control, or on the add control if the list is now empty. Focus left on an element that has been removed strands the user without warning.
- **Otherwise, do not move focus for the user.** Coming back from the file dialog leaves focus on the add control, so the user can add another file.
- **The tab order follows the visual order**: the label, the add control, then the list from top to bottom.
- **Nothing needed may appear only on hover** — not the remove control, not the file name, and not the size limit. A remove button that appears when hovering over a row cannot be reached by keyboard or by touch.

## Not your decision

Do not implement, override, or tune any of these — the component owns them:

- `border-style`, `border-size`, `border-radius`, `padding`.
- `item-gap`, `list-spacing`, `vertical-element-gap`.
- `text` styling and all `colors`.
- Field colors and sizes from `globals.form.field`, label-field gaps and `vertical-item-gap` from `globals.form.properties`, and the disabled treatment from `globals.states.disabled`.

## Load these too

- `recursica-skill-label` — the control's name, placement, and the required or optional marker.
- `recursica-skill-assistive-element` — the help text carrying accepted types and the size limit, and the error message.
- `recursica-skill-forms` — single-column layout, one label placement per form and the container-width trigger for it, validation timing, save mode, the ban on blocking overlays, and the confirmation test.
- `recursica-skill-system-conventions` — never carry meaning in a single channel; a drag interaction always needs a second mechanism.

### Only if the screen also uses it

- `recursica-skill-file-input` — the compact single-line file field, and when it is the right control instead of this one.

## Uncovered — ask, do not invent

- **Upload feedback.** The kit defines no progress, no success, and no error state for each file. Upload feedback is a real need, and this component cannot show it — do not invent a bar, a spinner, or a checkmark on each row.
- **A button versus a drop zone, as documented styles.** Both are documented outside the token inventory. The kit has a single `border-style` property and no styles axis, so which arrangement it produces, and whether both are available, is not settled — do not rely on this without asking.
- **One file versus several, as documented types.** Both are documented outside the token inventory, but the kit has no such axis. Do not rely on this without asking.
- **Retrying.** Nothing says what happens to a file that failed to upload, or whether the user can retry it in place.
- **Overall limits.** A maximum number of files, or a total size across the whole set.
- **Thumbnails or previews** of image files in the list.
- **An empty state** for the list, before anything is added.

## Pre-flight checklist

- [ ] Uploading is the point of this surface, and you ruled out a compact file input on that basis.
- [ ] A real, visible label is passed, and its `layouts` placement matches every other field in the same form — one placement per form, as `recursica-skill-forms` requires.
- [ ] The accepted types and the size limit are stated in help text before the user picks, and the picker is limited to those types.
- [ ] The add control is a real file input, in the tab order, and activated by Enter or Space.
- [ ] No drop zone is the only way to add a file. Any drag support is an extra, and the text does not suggest otherwise.
- [ ] Every added file shows its name and has its own remove control, visible without hover.
- [ ] Each remove control is a tab stop, with a name that includes the file name.
- [ ] Additions, removals, and rejections are announced, along with the reason for a rejection.
- [ ] After a removal, focus is put somewhere on purpose; otherwise, focus is not moved.
- [ ] Removal happens immediately, with no confirmation dialog.
- [ ] The list keeps the order the files were added, and the number of files is available.
- [ ] On error, the help text is replaced by a message that restates the rule broken, with a signal that is not color.
- [ ] No upload starts as a side effect of choosing a file. It starts when the user clearly asks; when the form saves everything together, it finishes before submit; and nothing blocks the interface while it runs.
- [ ] The tab order runs label, add control, then the list. The focus ring is intact, and looks different from the drop-target highlight.
- [ ] The control sits in the form's single column, and not inside a card.
- [ ] You passed no variant, size, or state outside the inventory above, and built no list, chip, or row by hand.
- [ ] You overrode no border, padding, or gap that the component owns.
- [ ] You invented nothing from the uncovered list: progress, success, retrying, previews, and overall limits.
