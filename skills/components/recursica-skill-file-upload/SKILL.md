---
name: recursica-skill-file-upload
description: Rules for the Recursica file upload, the larger area with a list of added files — when the file upload replaces the file input, stating types and size limits up front, and never making drag and drop the only way to add a file. Use for upload areas, drop zones, and attachment lists. Not for one file in a dense form — see recursica-skill-file-input.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# File upload

A file upload has two parts: an upload area and a list of added files.

- The upload area is a bordered area where the persona adds files. The upload area holds an add control, such as a "Browse files" button. The add control opens the file picker on the persona's device.
- The list of added files sits below the upload area. The list shows each file the persona has added.

> **The file upload is not built yet.** Both adapters (the Recursica component library for one framework, such as Mantine or Angular Material) ship the file upload as a stub (an empty placeholder). The adapters apply none of the file upload's tokens (named design values, such as colors or sizes, set by the design system) from the UI kit (the token file, `recursica_ui-kit.json`, that says which variants and states each component has).
>
> - A file upload built today shows only placeholder content, with no error.
> - The rules in this skill describe the planned file upload, and the rules match the UI kit.
> - Report the missing file upload instead of building a workaround.

## When to use a file upload

- **Use a file upload when uploading files is the main task of the area that holds the file upload.** The area is a page, a panel, a modal, or a part of a page. Examples include an Attachments section, a document intake, or a submission step. The upload area can take a large part of the page, because uploading is the main task.
- **Use a file upload when the persona adds several files.** For example, a persona attaches three receipts to an expense report. The persona needs to see every added file, check the list, and remove a wrong file before saving.
- **Use a file upload when the list of added files must stay in place while the persona keeps working.** The list is not a single value that the next file replaces.

## When not to use a file upload

| Situation                                                                         | Use instead                                                                                |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| A file is one field in a dense form                                               | A file input. See `recursica-skill-file-input`.                                            |
| One image is replaced, and no list of files is kept                               | A file input. See `recursica-skill-file-input`. A profile picture needs no list of files.  |
| The file comes from Google Drive, Dropbox, or OneDrive                            | The file picker of that service. A file upload reads files only from the persona's device. |
| The persona manages files that are already stored                                 | A table of the stored files. See `recursica-skill-tables`.                                 |
| The screen shows the progress of a task that is already running                   | A loader. See `recursica-skill-loader`.                                                    |
| The attached files are shown in a place where the persona cannot change the files | A read-only field. See `recursica-skill-read-only-field`.                                  |

**Use a file input when the file is a minor detail of the object the form describes.** For example, a form that describes a vendor may take one optional logo file. A large upload area looks too big inside an otherwise compact form.

## Variants

**Use only the file upload variants and options that the Recursica MCP server lists for the theme (the design a designer sets in Theme Forge: the token values, and each component's variants, states and sizes).** A designer can add variants and options in Theme Forge, so each theme can differ. Get the list with the server's `recursica_get_component_doc` tool, and use the names the code uses. Never invent a variant or an option.

Each option below is described by role, such as "the error state". A name from the standard UI kit (the unchanged UI kit in the official Recursica release) is only an example.

**Label placement is a variant.** A control's label sits beside the control or above the control. In the standard UI kit, the variant is `layouts`, with the options `side-by-side` and `stacked`. The label beside the control is the house default. The label above the control is the fallback when the form's container is too narrow for both side by side. The container's width decides, not the viewport's width. See `recursica-skill-forms`.

- **States.** The file upload has an error state and a disabled state. In the standard UI kit, the variant is `states`, with the options `error` and `disabled`.
- **A file upload differs from a file input in two parts only.** The file upload has the upload area and the list of added files. A file input is a single-line field.
- **The file upload component shows the list of added files.** Do not build a separate list, chips, or list rows below the upload area.
- **Upload feedback.** If the theme has a progress, success, or error state for each file, use the theme's state. Otherwise, see the open questions.
- **Style, size, and one file versus several files.** If the theme has one of the following variants, use the theme's variant:

  - a style variant
  - a size variant
  - a variant for one file versus several files

  If the theme has no size variant, use the file upload's default size. For a missing style or file-count variant, see the open questions.

## Rules

**Label placement is one decision per form, not per field.** This field uses the same label placement as every other field in the form. Apply the container-width test once, to the whole form. The result sets the placement of every field in the form. Short fields that would fit side by side follow the result too. A form may change placement at a breakpoint. A form never mixes placements at one breakpoint. A form section never gets a separate placement. `recursica-skill-forms` sets this rule.

**State the accepted file types and the size limit in text, before the persona picks a file.** Put both in the help text under the file upload, such as "PDF or DOCX, up to 25 MB each". The persona then knows the limits before picking a file, and picks a file that the file upload accepts. `recursica-skill-assistive-element` sets this rule.

**Also limit the file picker to the accepted file types.** The help text tells the persona which files the file upload accepts. The limit in the file picker keeps the persona from selecting other file types. For example, when the help text says "PDF or DOCX", the file picker lets the persona select only PDF and DOCX files. Use both the help text and the limit in the file picker.

**Never make drag and drop the required way to add a file.** The button inside the upload area, such as "Browse files", is the required way to add a file. The button must work. The upload area may also accept a dropped file, as an extra way to add a file. `recursica-skill-system-conventions` requires a way other than dragging for every drag action.

**Show the name of every added file, with a remove control for that one file.** For example, a list item shows "quarterly-report.pdf" with a Remove button next to the file name. The persona uses the file names to check the list, and the remove controls to take out a wrong file. An editable list of added files is the reason to use a file upload instead of a file input.

**Do not start an upload when the persona chooses a file.** Choosing a file saves nothing, so choosing a file is outside the form's save mode.

- Start the upload when the persona clearly asks to upload, such as by clicking "Upload".
- Never start an upload as a side effect of choosing a file.
- When the form saves all fields together, finish the upload before the form is submitted.

This rule is settled. This rule agrees with the rule in `recursica-skill-forms` that a form has one save mode.

**Never block the screen while an upload runs.** The persona must be able to keep reading the values the persona entered.

- Never show a spinner in a modal.
- Never lock the page.
- Never gray out the form.

`recursica-skill-forms` bans overlays that block the screen during submit, for the same reason.

**Remove a file from the list immediately, with no confirmation.** The persona can add the file again. `recursica-skill-forms` asks for a confirmation only when the persona cannot recover from the action.

**On error, an error message replaces the help text.** Do not add the error message to the help text. The error message restates the broken rule. For example, write "Each file must be under 25 MB", not "Upload failed".

**Pair the error state with a signal that is not color, such as an icon.** `recursica-skill-system-conventions` requires the second signal.

**Keep the list of added files in the order the persona added the files.** The persona can then find the file the persona picked last.

**Place the file upload in the form's single column, never inside a card.** The file upload is a form control. `recursica-skill-forms` sets this rule.

**Never use a disabled control to show a list of attachments.** For example, the attachments on a closed support ticket can no longer change. A list of attachments that nobody can add to or remove from in this place needs no form control.

## Accessibility

The rules below add to the accessibility baseline in `recursica-skill-system-conventions`, including the focus ring, which every Recursica component follows.

The application must add every behavior in the two lists below. A drop zone (an area that accepts dropped files) is the most common mouse-only control in an enterprise application.

### Screen readers

- **Give the whole file upload a real label, such as "Supporting documents".** The text in the upload area, such as "Drag files here", is an instruction, not a name.
- **The accepted file types and the size limit must be in text connected to the file upload.** Set the text through the file upload component. The text must be available before the persona picks a file, not only in a rejection message afterward.
- **Every item in the list of added files announces the file name.** A persona using a screen reader cannot tell apart eight list items that announce only "file" or "document".
- **The accessible name (the name a screen reader reads out for a control) of each remove control must include the file name**, such as "Remove quarterly-report.pdf", not "Remove". Nobody can tell eight identical "Remove" buttons apart.
- **Every addition, every removal and every rejection must be announced.** Each announcement names the file. A rejection announcement also says why the file was rejected. For example, announce "photo.png rejected. Files must be PDF or DOCX."
- **The number of files in the list should be available, such as "3 files".** The persona should not have to count the files by going through every list item.
- **Do not describe dropping files as the only way to add files.** For example, "Drag files here or browse" names a second way to add files, and "Drag files here" alone does not. Text about dragging alone tells a persona using a keyboard that the file upload excludes the persona.
- **A screen reader must not announce the icon in the upload area.** The icon is decorative.

### Keyboard and non-mouse navigation

- **The add control must be a real file input element.** The persona reaches the add control with Tab and presses the add control with Enter or Space. Do not build a `div` with a click handler wrapped around a hidden input.
- **A drop zone must never be the only way to add a file.** A file upload breaks this rule more often than any other rule in this skill. When the file upload accepts dropped files, give the file upload a way to add files by keyboard. The keyboard way does the same job as dropping.
- **Every remove control is a separate tab stop** (a place the Tab key lands), in visual order down the list, and works with Enter or Space.
- **After a removal, move focus to a specific element.**

  - Move focus to the next file's remove control.
  - When the list is now empty, move focus to the add control.

  When the focused element is removed, focus is lost with no announcement. The persona using a keyboard then no longer knows where focus is on the page.

- **At any other time, do not move focus.** When the file picker closes, focus stays on the add control. The persona can then add another file.
- **The tab order follows the visual order.** The order is the label, the add control, then the list from top to bottom.
- **Nothing the persona needs may appear only on hover.** This rule covers the remove control, the file name, and the size limit. A remove button shown only on hover over a list item cannot be reached by keyboard or by touch.

## Styling set by tokens

**Never set or override the file upload's styling.** The theme sets every visual property of the file upload, such as size, spacing, borders, colors and animation. Do not add extra containers or spacers to change the file upload's look. If the design needs a look the theme does not give, report the missing look as a gap. See `recursica-skill-design-router`.

## Related skills

- `recursica-skill-label` — the label of the file upload, label placement, and the required or optional marker.
- `recursica-skill-assistive-element` — the help text that states the accepted file types and the size limit, and the error message.
- `recursica-skill-forms` — the form rules a file upload follows:
  - the single-column layout
  - one label placement per form, and the container width that decides the placement
  - when to validate
  - the save mode
  - the ban on overlays that block the screen
  - when to ask for confirmation
- `recursica-skill-system-conventions` — showing meaning in more than one way, and a way other than dragging for every drag action.

### Only if used on the same screen

- `recursica-skill-file-input` — the compact single-line file field, and when to use the file input instead of the file upload.

## Open questions

- **Upload feedback.** The persona needs feedback on each file's upload: progress, success, or an error. Do not invent a progress bar, a spinner, or a checkmark on each list item. Confirm with the user about a kind of feedback only when the theme has no state for that kind.
- **A button style and a drop zone style.** Only the design-system website shows the two styles. The design system has not settled two points:

  - which of the two styles the standard UI kit produces
  - whether both styles are available

  Do not rely on either style without confirming with the user. Confirm with the user only when the theme has no style variant.

- **One file versus several files.** Only the design-system website shows a type for one file and a type for several files. Do not rely on either type without confirming with the user. Confirm with the user only when the theme has no variant for one file versus several files.
- **Retrying.** No rule says what happens to a file that failed to upload. No rule says whether the persona can retry the upload in place.
- **Overall limits.** No rule sets a maximum number of files, or a maximum total size for all files in the list.
- **Thumbnails or previews.** No rule says whether the list shows a thumbnail or a preview of an image file.
- **An empty state.** No rule says what the list shows before the persona adds a file.

## Pre-flight checklist

- [ ] Uploading files is the main task of the page, panel, modal, or part of a page holding the file upload. Because uploading is the main task, a compact file input was ruled out.
- [ ] The file upload has a real, visible label. The label placement (`layouts` in the standard UI kit) matches every other field in the same form. Each form has one placement, as `recursica-skill-forms` requires.
- [ ] The help text states the accepted file types and the size limit before the persona picks a file. The file picker allows only the accepted file types.
- [ ] The add control is a real file input element, in the tab order, and works with Enter or Space.
- [ ] No drop zone is the only way to add a file. Drag and drop is an extra, and no text suggests that dragging is the only way to add a file.
- [ ] Every added file shows the file name and has a remove control for that one file. The file name and the remove control are visible without hover.
- [ ] Each remove control is a tab stop, with an accessible name that includes the file name.
- [ ] Every addition, removal, and rejection is announced, with the reason for each rejection.
- [ ] After a removal, focus moves to a specific element, such as the next remove control. At any other time, focus does not move.
- [ ] A file is removed immediately, with no confirmation dialog.
- [ ] The list of added files keeps the order the persona added the files in. The number of files in the list is available.
- [ ] On error, an error message replaces the help text and restates the broken rule. The error message has a signal that is not color.
- [ ] No upload starts as a side effect of choosing a file. An upload starts when the persona clearly asks to upload. When the form saves all fields together, the upload finishes before the form is submitted. The screen is never blocked while an upload runs.
- [ ] The tab order runs from the label to the add control, then down the list. The focus ring is intact. The focus ring looks different from the highlight that shows where to drop a file.
- [ ] The file upload sits in the form's single column, not inside a card.
- [ ] Every variant, size, and state is one the Recursica MCP server lists for the theme. No variant or option is invented. The list of added files comes from the file upload component, with no hand-built list, chips, or list rows.
- [ ] No styling is set or overridden on the file upload. No container or spacer is added to change the file upload's look.
- [ ] Open questions were asked about, not decided: progress, success, retrying, previews, and overall limits.
