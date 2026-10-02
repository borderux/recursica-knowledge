---
name: recursica-skill-file-upload
description: Rules for the Recursica file upload, the larger area with a list of added files — when it replaces the file input, stating types and size limits up front, and never making drag and drop the only way in. Use for upload areas, drop zones, and attachment lists. Not for one file in a dense form — see recursica-skill-file-input.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# File upload

A file upload is a bordered area for adding files, with a list below it of the files that have been added.

> **Not built yet.** Both adapters ship `FileUpload` as a declared stub (an empty placeholder) that
> shows a placeholder, and they apply none of the 32 `file-upload` variables the UI kit (the token file, `recursica_ui-kit.json`, that says which variants and states each component has) exports.
> Everything below is the intended contract and is correct about the UI kit — but building against it
> today produces a placeholder, with no error. Report the missing component instead of working around it.

## When to use a file upload

- **Uploading is the point of the surface** — an attachments section, a document intake, a submission step. Uploading is the main task, so the upload area can take a large part of the page.
- **There are several files**, and the user needs to see the whole set, check it, and remove the wrong one before saving.
- **The list has to stay in place** while the user keeps working, rather than being a single value that gets replaced.

## When not to use a file upload

| Instead of a file upload                                 | Use                                                                 |
| -------------------------------------------------------- | ------------------------------------------------------------------- |
| A file is one field in a dense form                      | `recursica-skill-file-input`                                        |
| One image is replaced, and no list is kept               | `recursica-skill-file-input` — a profile picture needs no queue     |
| The file comes from Google Drive, Dropbox, or OneDrive   | That service's own picker. This control only reads the local device |
| The user manages files that are already stored           | A table of those files — see `recursica-skill-tables`               |
| Reporting how far some work already underway has got     | `recursica-skill-loader` — this component has no progress state     |
| The attached files are shown, but cannot be changed here | `recursica-skill-read-only-field`                                   |

**A large upload area inside an otherwise compact form is out of proportion.** If the file is a minor property of the object, use the file input.

## File upload label placements and states

Taken from `recursica_ui-kit.json` → `ui-kit.components.file-upload`. **Do not pass a variant, size, or state that is not listed here.**

| Axis      | Options                   |
| --------- | ------------------------- |
| `layouts` | `stacked`, `side-by-side` |
| `states`  | `error`, `disabled`       |

**`layouts` is the label-placement axis (a property a component varies on, such as size or style; Figma calls it a variant property).** `side-by-side` — the label beside the control — is the house default. `stacked` is the fallback when the container is too narrow to fit both. What decides this is the container's width, not the viewport's. See `recursica-skill-forms`.

**Label placement is one decision per form, not per field.** This field's `layouts` value is not a separate choice — it matches every other field in the same form. The container-width test is applied once, to the whole form, and its answer governs every field in it, including short ones that would have fitted side by side. A whole form may switch placement between breakpoints, but it never mixes the two at one breakpoint, and a section never gets its own placement. Owned by `recursica-skill-forms`.

**This is the larger area, and the tokens say so.** `border-style`, `border-size`, `border-radius`, and `padding` describe a region rather than a line. `item-gap`, `list-spacing`, and `vertical-element-gap` describe the list of added files beneath it. That is the whole difference from `file-input`, which is shaped like a single-line field.

**The list of added files is part of this component.** Do not build a separate list, chips, or rows below it.

**There is no progress state, no success state, and no error state for each file.** There is no styles axis, no size axis, and no axis for one file versus several. See the open questions.

## Rules for file uploads

**State the accepted file types and the size limit in text, before the user picks.** Both, up front. "PDF or DOCX, up to 25 MB each" in help text under the control. With the limits stated first, the user picks a file that will be accepted. Owned by `recursica-skill-assistive-element`.

**Limit the picker to those types as well.** The help text tells the user which files are accepted. The picker limit keeps other file types from being selected. Do both.

**Drag and drop is an extra, never the way in.** The area may accept a dropped file, but the button inside it is the required way in and has to work. `recursica-skill-system-conventions` requires a second mechanism for every drag interaction.

**Every added file needs a visible name and its own remove control.** The editable list is the reason to use this larger component. Without names and remove controls, the user cannot check the set or remove the wrong file.

**Choosing a file does not start an upload.** Choosing a file saves nothing, so it does not use the form's save mode at all. The upload starts when the user clearly asks for it — never as a side effect of choosing a file. Where the form saves everything together, the upload finishes before submit. This is settled, and it is consistent with the one-save-mode rule in `recursica-skill-forms`.

**Never block the interface while an upload runs.** No spinner in a modal, no locked viewport, and no grayed-out form — the user must be able to keep reading what they entered. `recursica-skill-forms` bans blocking overlays on submit for the same reason.

**Removing a file from the list happens immediately.** No confirmation. The user can add the file again, and `recursica-skill-forms` calls for a confirmation only when there is no way to recover.

**On error, replace the help text; do not add to it.** The message restates the rule that was broken — "Each file must be under 25 MB" — not "Upload failed".

**Pair the error state with a signal that is not color.** Required by `recursica-skill-system-conventions`.

**Keep the list in the order the files were added**, so the user can find the file they picked last.

**It is a form control, so it sits in the form's single column**, and never inside a card. Owned by `recursica-skill-forms`.

**Never use a disabled control to show a set of attachments.** If nothing can be added or removed here, this is not a form control.

## Accessibility

This component also follows the accessibility baseline in `recursica-skill-system-conventions`, including the focus ring. Only what is specific to it is listed here.

The application must provide everything listed below. A drop zone is the single most common control in an enterprise application that works only with a mouse.

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
- **After a removal, put focus somewhere on purpose** — on the next item's remove control, or on the add control if the list is now empty. When the focused element is removed, focus is lost with no announcement, and the keyboard user loses their place on the page.
- **Otherwise, do not move focus for the user.** Coming back from the file dialog leaves focus on the add control, so the user can add another file.
- **The tab order follows the visual order**: the label, the add control, then the list from top to bottom.
- **Nothing needed may appear only on hover** — not the remove control, not the file name, and not the size limit. A remove button that appears when hovering over a row cannot be reached by keyboard or by touch.

## Styling the file upload sets itself

Do not set or override any of these. The component sets them:

- `border-style`, `border-size`, `border-radius`, `padding`.
- `item-gap`, `list-spacing`, `vertical-element-gap`.
- `text` styling and all `colors`.
- Field colors and sizes from `globals.form.field`, label-field gaps and `vertical-item-gap` from `globals.form.properties`, and the disabled treatment from `globals.states.disabled`.

## Skills to read with this one

- `recursica-skill-label` — the control's name, placement, and the required or optional marker.
- `recursica-skill-assistive-element` — the help text carrying accepted types and the size limit, and the error message.
- `recursica-skill-forms` — single-column layout, one label placement per form and the container-width trigger for it, validation timing, save mode, the ban on blocking overlays, and the confirmation test.
- `recursica-skill-system-conventions` — never carry meaning in a single channel; a drag interaction always needs a second mechanism.

### Only if the screen also uses those components

- `recursica-skill-file-input` — the compact single-line file field, and when it is the right control instead of this one.

## Open questions: ask, do not decide

- **Upload feedback.** The UI kit defines no progress, no success, and no error state for each file. Upload feedback is a real need, and this component cannot show it — do not invent a bar, a spinner, or a checkmark on each row.
- **A button versus a drop zone, as documented styles.** Both are shown only on the design-system website. The UI kit has a single `border-style` property and no styles axis, so which arrangement it produces, and whether both are available, is not settled — do not rely on this without asking.
- **One file versus several, as documented types.** Both are shown only on the design-system website, but the UI kit has no such axis. Do not rely on this without asking.
- **Retrying.** Nothing says what happens to a file that failed to upload, or whether the user can retry it in place.
- **Overall limits.** A maximum number of files, or a total size across the whole set.
- **Thumbnails or previews** of image files in the list.
- **An empty state** for the list, before anything is added.

## Pre-flight checklist

- [ ] Uploading is the point of this surface, which rules out a compact file input.
- [ ] A real, visible label is passed, and its `layouts` placement matches every other field in the same form — one placement per form, as `recursica-skill-forms` requires.
- [ ] The accepted types and the size limit are stated in help text before the user picks, and the picker is limited to those types.
- [ ] The add control is a real file input, in the tab order, and activated by Enter or Space.
- [ ] No drop zone is the only way to add a file. Any drag support is an extra, and the text does not suggest otherwise.
- [ ] Every added file shows its name and has its own remove control, visible without hover.
- [ ] Each remove control is a tab stop, with a name that includes the file name.
- [ ] Additions, removals, and rejections are announced, along with the reason for a rejection.
- [ ] After a removal, focus moves to a chosen element, such as the next remove control. Otherwise, focus stays where it is.
- [ ] Removal happens immediately, with no confirmation dialog.
- [ ] The list keeps the order the files were added, and the number of files is available.
- [ ] On error, the help text is replaced by a message that restates the rule broken, with a signal that is not color.
- [ ] No upload starts as a side effect of choosing a file. It starts when the user clearly asks; when the form saves everything together, it finishes before submit; and nothing blocks the interface while it runs.
- [ ] The tab order runs label, add control, then the list. The focus ring is intact, and looks different from the drop-target highlight.
- [ ] The control sits in the form's single column, and not inside a card.
- [ ] Every variant, size, and state passed is in the inventory above, and the list of added files comes from the component, with no hand-built list, chips, or rows.
- [ ] Borders, padding, and gaps come from the component.
- [ ] Open questions were asked about, not decided: progress, success, retrying, previews, and overall limits.
