---
name: recursica-skill-file-input
description: Rules for the Recursica file input, the compact choose-a-file field — when it fits and when the larger upload area does, stating accepted types and size limits up front, and keyboard access. Use for a file or attachment field in a form. Not for a drop area with a file list — see recursica-skill-file-upload.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# File input

A file input is a single-line field where the user picks a file from the user's device. A file input looks and behaves like a text field.

> **The file input is not built yet.** Both Recursica component libraries ship the file input as a stub (an empty placeholder) that shows a placeholder. Neither component library applies any of the 40 `file-input` variables that the UI kit (the token file, `recursica_ui-kit.json`, that says which variants and states each component has) exports. The rules below describe the file input as intended, and the rules are correct about what the UI kit defines. A screen built on the file input today shows a placeholder, with no error. Until the file input is built, use `recursica-skill-text-field` and a real `<input type="file">`. Report the missing file input instead of working around the missing file input.

## When to use a file input

- **The file is one field among many.** Examples are an attachment on a support ticket, a document on a submission, and an avatar on a profile. The file is one detail of the ticket, the submission or the profile, not the purpose of the screen.
- **The form is dense**, and a large drop area would take up too much of the form.
- **The user adds one file or a few files**, and the user does not need a list for managing the files.

## When not to use a file input

| Situation                                                       | Use instead                                                                                         |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| The user adds several files and manages the files in a list     | A file upload. See `recursica-skill-file-upload`.                                                   |
| Uploading is the purpose of the screen or the section           | A file upload. The larger drop area has the right visual weight. See `recursica-skill-file-upload`. |
| The file comes from Google Drive, Dropbox, or OneDrive          | The file picker of that service. A file input reads files from the user's device only.              |
| The user manages folders, renames files, or moves files         | A table of the stored files. See `recursica-skill-tables`.                                          |
| The user types a path or a URL                                  | A text field. See `recursica-skill-text-field`.                                                     |
| An attached file is shown, and the user cannot replace the file | A read-only field. See `recursica-skill-read-only-field`.                                           |

**Do not use a file input to manage many files.** A file input picks a file. A file input is not a file manager. When the user needs to see upload progress, retry a file, or reorganize files, the file input is the wrong control.

## Variants

**Use only the file input variants and options that the Recursica MCP server lists for the project.** A designer can add variants and options in Theme Forge, so each project can differ. Get the list with the server's `recursica_get_component_doc` tool, and use the names the code uses. Never invent a variant or an option.

The rules below describe each option by role, such as "the error state". The names in the standard UI kit (the unchanged UI kit in the official Recursica release) are examples only.

- **An error state and a disabled state.** The standard UI kit calls the state variant `states`, with the two options `error` and `disabled`.
- **A single-line field.** The standard UI kit gives the file input the same minimum height, padding, border, corner radius, text style and placeholder style as a text field. The matching properties are the clearest sign that a file input is a single-line form field.
- **One icon.** The icon shows that the field takes a file. The standard UI kit sets the icon size and the gap between the icon and the text.
- **Upload feedback.** If the project has a progress state, a success state, or an error state for each file, use the project's state. Otherwise, see the open questions.
- **Drop zone.** If the project has a drop-zone variant, use the drop-zone variant. Otherwise, see the open questions.
- **More than one file.** If the project has a variant for more than one file, use that variant. Otherwise, see the open questions.
- **File chip and clear control.** If the project has a file chip, a dismiss control, or a clear control, use the project's version. Otherwise, see the open questions.

**Never build a focus state or a placeholder state.** Every Recursica field already shows the focus border and the placeholder text.

**Label placement is a variant.** A field's label sits beside the field or above the field. In the standard UI kit, the variant is `layouts`, with the options `side-by-side` and `stacked`. The label beside the field is the house default. The label above the field is the fallback when the form's container is too narrow for both side by side. The container's width decides, not the viewport's width. See `recursica-skill-forms`.

## Rules

**Label placement is one decision per form, not per field.** This field uses the same label placement as every other field in the form. Apply the container-width test once, to the whole form. The result sets the placement of every field in the form, including short fields that would fit side by side. A form may change placement at a breakpoint, but a form never mixes placements at one breakpoint, and a form section never gets a separate placement. `recursica-skill-forms` sets this rule.

**State both the accepted file types and the size limit in help text, before the user picks a file.** For example, the help text under the field reads "PDF or PNG, up to 10 MB". When the help text states the limits first, the user picks a file the field accepts. `recursica-skill-assistive-element` sets the rules for help text.

**Also limit the file picker to the accepted file types.** The help text tells the user which file types the field accepts. The limit on the file picker makes the computer offer only the accepted file types. Use both the help text and the limit on the file picker, never only one.

**Choosing a file does not start an upload.** Choosing a file saves nothing. Choosing a file therefore does not use the form's save mode at all. The upload starts when the user clearly asks for the upload, never as a side effect of choosing a file. When the form saves every field together, the upload finishes before the form submits. The upload rule is settled. The upload rule does not conflict with the one-save-mode rule in `recursica-skill-forms`.

**Show the file the user picked.** A field that looks empty after the user picks a file looks as if the pick failed. The name of the picked file is the field's value.

**Never put a field rule in the placeholder.** The placeholder disappears as soon as the field has a value. Use the placeholder only to show the format the field expects.

**On error, replace the help text with the error message.** Do not add the error message to the help text. The error message must restate the rule the file broke, as in "File must be under 10 MB", not "Invalid file". Replacing the help text keeps the field the same height, so the fields below the file input do not move.

**Pair the error state with a signal that is not color.** `recursica-skill-system-conventions` sets this rule.

**Truncate a long file name. Do not let the field grow to fit the file name.** The field is one line high. A file name that moves the layout around the field is worse than a file name that ends in an ellipsis (…). Assistive technology must still get the full file name.

**Never use a disabled file input to show an attached file.** When the user can never replace the attached file here, the screen does not need a form control.

## Accessibility

The rules below add to the accessibility baseline in `recursica-skill-system-conventions`, including the focus ring, which every Recursica component follows.

A file input is a form field, and a file input follows the same rules as every other form field. The app must add every behavior in the two lists below. Most failures come from a control that works only with a pointer.

### Screen readers

- **Give the file input a real label.** The icon does not name the field. A placeholder is not a label. A field with no label has no accessible name (the name a screen reader reads out for a control).
- **The accepted file types and the size limit must be in text connected to the field.** Set the accepted file types and the size limit as the component's help text. Do not show the accepted file types and the size limit in separate text beside the field. Do not show the accepted file types and the size limit only in an error message, after the user picks a file the field rejects.
- **A screen reader must announce the name of the picked file as the field's value.** When the visible file name is truncated, the full file name must still be available.
- **Give any clear or remove control an accessible name that includes the file name**, as in "Remove quarterly-report.pdf", not "Clear".
- **The app must announce a removed file.** The app must also announce a rejected file and the reason the field rejected the file.
- **The field's icon is decorative and must be silent.** The icon is only a visual signal. The label and the help text state the meaning.
- **Never show that a file is attached by the field's look alone.** A screen reader must be able to read the field's value, and the value must also be visible on screen.

### Keyboard and non-mouse navigation

- **Use a real file input, which the Tab key reaches and Enter or Space activates.** Never use a `div` with a click handler that opens a hidden input. Only a real file input gets keyboard activation and the right screen reader announcement without extra code.
- **A drop zone must never be the only way to add a file.** When the field supports drag and drop, drag and drop is an extra way to add a file. Drag and drop never replaces the file input, which the keyboard can reach.
- **Each clear or remove control is a separate tab stop** (a place the Tab key lands), in the order the controls appear on screen. Each clear or remove control works with Enter or Space.
- **When the user removes a file, move focus on purpose, back to the file input.** Focus must not get lost at the top of the page.
- **Except after a removal, do not move focus for the user.** When the user returns from the operating system's file dialog, focus stays on the file input.
- **Never show content the user needs only on hover.** The size limit, the accepted file types, and the remove control must all show without hover.

## Styling set by tokens

**Do not set or override the file input properties below.** The file input component sets each property.

- `min-height`, `horizontal-padding`, `vertical-padding`, `border-size`, `border-radius`.
- `icon-size` and `icon-text-gap`.
- `text` styling and `placeholder-opacity`.
- All `colors`, per layer (a numbered background level, 0 to 3, that sets the colors of the components on that level) and per state, including the focused border.
- Field colors and sizes from `globals.form.field`, the gaps between the label and the field and `vertical-item-gap` from `globals.form.properties`, and the disabled look from `globals.states.disabled`.

**Never style an unfocused file input so that the field looks disabled.** An editable field must look editable when the user is not using the field.

## Related skills

- `recursica-skill-label` — the label text, the label placement, and the required or optional marker.
- `recursica-skill-assistive-element` — the help text that states the accepted file types and the size limit, and the error message.
- `recursica-skill-forms` — single-column layout, one label placement per form, the container width that switches label placement, when validation runs, the form's save mode, and the rule against form controls in a card.
- `recursica-skill-system-conventions` — never giving meaning through only one signal, and a second way to do any action that needs a drag or a long press.

### Only if used on the same screen

- `recursica-skill-file-upload` — the larger drop area with a list of uploaded files, and when the larger drop area replaces the file input.

## Open questions

- **Upload feedback.** The user needs feedback on an upload. Do not invent a spinner, a progress bar, or a checkmark. Ask only when the project has no progress state, no success state, or no error state for each file.
- **More than one file in one field.** Only the design-system website shows a "multiple files" content option. Whether a file input may hold more than one file, and how the file input then looks, is not settled. Do not rely on the "multiple files" option without asking. Ask only when the project has no variant for more than one file.
- **The file chip and the clear icon.** Only the design-system website shows each file as a chip the user can dismiss, with an optional icon that clears every file. Do not rely on the chip or the clear icon without asking. Ask only when the project has no file chip, no dismiss control, or no clear control.
- **Retrying after the field rejects a file or an upload fails.** No rule says whether the user can retry in the same field, or what the field shows while a retry waits.
- **A drop target on the file input.** If the design needs drag and drop, ask. Ask only when the project has no drop-zone variant.
- **Truncating file names.** How much of a long file name to show, and from which end to truncate the file name, are not settled.

## Pre-flight checklist

- [ ] The file is one field among many, so a separate upload area does not fit.
- [ ] The file input has a real, visible label. The label placement matches every other field in the same form, with one placement per form, as `recursica-skill-forms` requires.
- [ ] The help text states the accepted file types and the size limit before the user picks a file. The file picker offers only the accepted file types.
- [ ] The placeholder holds no field rule.
- [ ] The name of the picked file shows as the field's value. The full file name is available even when the visible name is truncated.
- [ ] On error, an error message that restates the broken rule replaces the help text, with a signal that is not color.
- [ ] The control is a real file input, in the tab order, and Enter or Space activates the control.
- [ ] A drop zone is never the only way to add a file. Any drag and drop is an extra way to add a file.
- [ ] Each clear or remove control is a tab stop, with an accessible name that includes the file name.
- [ ] Removed files and rejected files are announced. After a removal, focus is moved on purpose.
- [ ] The field's icon is silent, and the required state is set in code.
- [ ] Choosing a file does not start an upload. The upload starts when the user clearly asks for the upload. When the form saves every field together, the upload finishes before the form submits.
- [ ] Every variant, size, and state is one the project's UI kit lists, and no variant or option is invented.
- [ ] Padding, borders, and colors come from the file input component. Every file input without focus looks editable, not disabled.
- [ ] Open questions were asked about, not decided: progress, success, more than one file, chips, and retrying.
