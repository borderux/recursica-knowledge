---
name: recursica-skill-textarea
description: Rules for the Recursica textarea — when multi-line entry is right, states and label placement, the fixed row count, character limits with a stated rule, and multi-line accessibility. Use for comments, descriptions, and message fields. Not for single-line text — see recursica-skill-text-field.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Textarea

A textarea is a field where the user types plain text on several lines.

## When to use a textarea

- **The expected answer is longer than one sentence**, such as a description, a justification or a note.
- **The user writes text, not a value that names or identifies an item**, such as a comment, feedback, a message or the details of a support ticket.
- **Line breaks are part of the value.** If the user needs paragraphs, use a textarea.

**The field's label is the fastest check for whether a textarea is right.** The labels `Description`, `Notes`, `Comments`, `Justification`, `Reason`, `Summary` and `Details` each promise the user room to write. A single-line field with a label that asks for prose is a mismatch. The user finds the mismatch by running out of space. The single-line field scrolls sideways and hides the text the user wrote. If the label suggests prose, use a textarea. If the label does not suggest prose, rethink the label.

## When not to use a textarea

For each case below, use the component the table names instead of adapting a textarea.

| Situation                                             | Use instead                                                                                                                                        |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| The text is short and fits on one line                | A text field. The size of the field tells the user how much to write. See `recursica-skill-text-field`.                                            |
| The user picks the value from a known list of options | A dropdown, a radio group, or an autocomplete. See `recursica-skill-selection-controls`.                                                           |
| The user must apply bold, italics, or lists           | A rich text editor. See the open questions.                                                                                                        |
| The value is a number, a date, or a time              | A number input, a date picker, or a time picker. See `recursica-skill-number-input`, `recursica-skill-date-picker`, `recursica-skill-time-picker`. |
| Nobody can ever edit the value here                   | A read-only field, which shows the label and the text with no input. See `recursica-skill-read-only-field`.                                        |
| The user only reads long text and writes nothing      | Body text on the page, not a field.                                                                                                                |

**Do not use a textarea to make a short field look important.** Size the field to the expected answer. A large textarea for a one-line answer leads the user to write more than the answer needs.

**Do not use a disabled textarea to show text.** Text that nobody can ever edit here does not belong in a form control.

## Variants

**Use only the textarea variants and options that the Recursica MCP server lists for the project.** A designer can add variants and options in Theme Forge, so each project can differ. Get the list with the server's `recursica_get_component_doc` tool, and use the names the code uses. The code can use a different name from the name in Figma and the UI kit. A wrong name in code has no effect and shows no error. Never invent a variant or an option.

The rules below describe each option by role, such as "the label beside the field". The names in the standard UI kit (the unchanged UI kit in the official Recursica release) are examples only.

- **An error state and a disabled state.** In the standard UI kit, the two states are `error` and `disabled`.
- **A fixed number of rows.** The textarea's tokens set the number of rows, and the component keeps that number fixed. Do not set the number of rows on any one textarea. Do not set a height. Do not set a row count to fit a particular answer. Do not wrap the textarea in a container to stretch the textarea. If the fixed height is wrong for a case, ask a person. See the open questions.
- **Size and width.** If the project has a size variant or a width property, use the project's variant or property. Otherwise, the form's field-size tokens set the textarea's width.
- **Read-only value.** A read-only value uses a separate component, the read-only field, not a read-only state on the textarea. The read-only field has the same label-placement variant and no input.

**Label placement is a variant.** The label sits beside the field or above the field. In the standard UI kit, the variant is `layouts`, with the options `side-by-side` and `stacked`. The label beside the field is the house default. The label above the field is the fallback when the form's container is too narrow for both side by side. The container's width decides, not the viewport's width. See `recursica-skill-forms`.

**Set label placement explicitly on every field.** An adapter's default may put the label above the input at every container width, which breaks the house rule. Set the label beside the input on every field, using the names the code uses for the variant and the option.

**Never build a focus state or a placeholder state.** Every Recursica field already shows the focus border and the placeholder text.

## Rules

**Always give the textarea a visible label.** Name the object clearly in the label. A screen reader user hears the label alone, without the text around the field. Write the label in sentence case, with no colon at the end.

**Never put required information in the placeholder.** The placeholder disappears when the user types the first character. Use the placeholder only to show the expected format of the answer.

**Put the rules for the answer in the help text.** State what to include, any minimum and any maximum. The user then sees the rules before breaking one.

**Never enforce a character limit the user cannot see.** If the field has a maximum, state the maximum before the user starts typing. The user must be able to tell how close the text is to the maximum. If the project has a character counter, use the project's counter. If the project has no character counter and the design needs one, ask a person instead of building a counter.

**Never cut off or delete the text the user typed.** Do not quietly drop characters past a limit. Do not clear the field when validation fails. The text belongs to the user.

**On error, replace the help text with the error message.** Do not add the error message to the help text. Replacing the help text keeps the field's height the same, so the form below the field does not move. The error message must restate the rule. "Invalid input" is not an error message. "Enter at least 20 characters" is an error message.

**Pair the error state with a signal that is not color: an icon, or the error message.** `recursica-skill-system-conventions` requires a signal that is not color.

**Do not add spacing around a textarea to make up for the textarea's height.** The components set the spacing between fields and between form sections. A textarea is the tallest field in a form, and the difference in height is expected. `recursica-skill-forms` sets this rule.

**Label placement is one decision per form, not per field.** This field uses the same label placement as every other field in the form. Apply the container-width test once, to the whole form. The result sets the placement of every field in the form, including short fields that would fit side by side. A form may change placement at a breakpoint, but a form never mixes placements at one breakpoint, and a form section never gets a separate placement. `recursica-skill-forms` sets this rule.

**Never stack the label of one textarea because the textarea is tall.** A stacked label often looks better on a textarea. A tall field beside a one-line label looks unbalanced in a narrow container. The width of the form's container decides label placement, not the height of the field. If the form's labels are side by side, the textarea's label is side by side too.

**A disabled textarea and a read-only field are different components, not two styles of one component.**

- **Disabled textarea.** A disabled textarea still looks like an input, but the user cannot use the textarea right now. Use a disabled textarea when the user could make the textarea usable by taking another step first.
- **Read-only field.** A read-only field is a different component that shows a label and text, with no input. Use a read-only field when this user never edits this value here.

## Accessibility

The rules below add to the accessibility baseline in `recursica-skill-system-conventions`, which every Recursica component follows.

The textarea component connects the label to the input and provides the focus ring. The app must add the behavior in the two lists below. The keyboard rules matter more for a textarea than for a single-line field, because Enter and Tab work differently inside a textarea.

### Screen readers

- **Give the textarea a real label.** Never let the placeholder text be the accessible name (the name a screen reader reads out for a control). A screen reader does not announce placeholder text as a label, and the placeholder text disappears when the user types. A field with no label has no accessible name.
- **State the limit, and what to write in the field, in the help text.** A visible character counter is not connected to the field, and a screen reader may never announce the counter. Put the maximum in words the user hears on reaching the field.
- **Make a screen reader announce the field as multi-line.** The textarea must be a real multi-line control, not a single-line input styled to look tall. A screen reader then tells the user that line breaks are allowed.
- **The app owns any icon placed inside the field.** Give a clickable icon an accessible name. Hide a decorative icon from screen readers.
- **A screen reader announces the error message.** The error message replaces the help text and is the only text a screen reader reads for the field. The error message must state the rule.
- **Do not announce every keystroke.** A live count that updates on every character interrupts the screen reader at each key press. If a screen reader must announce progress toward a limit, announce the progress sparingly, and keep the limit in the help text.

### Keyboard and non-mouse navigation

- **Never remove the field from the tab order.** Never make a pointer the only way to reach the field.
- **Tab must move focus out of the field, not insert a tab character.** Tab is the only way a keyboard user can leave a textarea.
- **Enter inserts a line break and must not submit the form.** Never make Enter submit the form from inside a textarea. Never make a key combination the only way to add a new line.
- **Escape must not clear the field or delete the text the user entered.**
- **Every control inside the field is a separate tab stop (a place the Tab key lands)** and works with Enter or Space. A control inside the field must not respond only to clicks.
- **Do not move focus automatically** when the text reaches a set length or a limit.
- **If the text in the field scrolls, the user must be able to scroll the text from the keyboard** with focus inside the field. The arrow keys, Page Up and Page Down must scroll the text. A keyboard user cannot reach text that only a pointer can scroll to.
- **Never make the user resize the field to read or finish the text.** A keyboard user cannot use a drag handle. The field must be usable at the size the field is given.
- **Never show information needed to complete the field only on hover**, including the limit and the rules for the answer.

## Styling set by tokens

**Do not set or override the textarea properties below.** The component sets each property.

- `border-radius`, `horizontal-padding`, `vertical-padding`, `border-size`.
- `rows`, which sets the field's height. The component keeps `rows` fixed.
- The field's width and size, from `globals.form.field.size`.
- The `text` style and `placeholder-opacity`.
- `colors` for each layer (a numbered background level, 0 to 3, that sets the colors of the components on that level). The colors include the focus border from `globals.form.field.colors.border-selected` and the disabled look that all components share, from `globals.states.disabled`.
- The gaps between the label and the field, and `vertical-item-gap`, from `globals.form.properties`.
- The connection between the label and the input, and the handling of keys inside the field.

**Never style an unfocused textarea to look disabled.** An editable field must look editable when the field does not have focus.

## Related skills

- `recursica-skill-forms` — label placement and one placement per form, single-column layout, the rule against custom spacing, when to validate, microcopy, save mode, and the rule that no form control goes inside a card.
- `recursica-skill-label` — the label component, the label-placement variant, and marking a field as required or optional.
- `recursica-skill-assistive-element` — the help text and error text below the field, and why the error message replaces the help text.
- `recursica-skill-system-conventions` — showing meaning in more than one way.

### Only if used on the same screen

- `recursica-skill-text-field` — the field for one line of text, and the rule that sends a value too long for one line to a textarea.
- `recursica-skill-read-only-field` — the component for text the user never edits here.

## Open questions

- **Growing to fit the text.** The UI kit fixes `rows`. The design-system website shows a vertical-resize variant with the options `auto` and `custom`. The UI kit and the website disagree. A person must decide whether the field grows with the text, and whether the field has a handle the user can drag. Do not rely on a resize variant without asking. Ask only when the project has no resize variant.
- **Text longer than the fixed number of rows.** A source outside the UI kit describes a "default fixed height before content truncation". No source says whether the extra text scrolls or is cut off. Cutting off the text a user typed would be a serious problem. Do not rely on either behavior without asking.
- **The character counter.** The design-system website shows a character counter. Nobody has settled where a count goes or what happens at the limit. `recursica-skill-assistive-element` has the same open question. Do not rely on a counter without asking. Ask only when the project has no character counter.
- **A rich text editor.** Ask only when the project has no rich text editor. Do not build a rich text editor out of a textarea.
- **A minimum length.** No rule says whether a minimum length is a limit the component supports, or only a validation message.

## Pre-flight checklist

- [ ] The expected answer is longer than one line, and a single-line field would be wrong.
- [ ] No field with a label that promises prose (`Description`, `Notes`, `Comments`, `Justification`, `Reason`, `Summary`, `Details`) is built as a single-line text field.
- [ ] The textarea has a visible label, and the label makes sense without the text around the field.
- [ ] Label placement is side by side, unless the form's container is too narrow.
- [ ] Label placement matches every other field in the same form, with one placement per form at each breakpoint and no mixing between fields or form sections. The textarea's label is stacked only when the whole form is stacked.
- [ ] No required information is in the placeholder text.
- [ ] The help text says what to include and any limit. On error, an error message that restates the rule replaces the help text.
- [ ] The error state has a signal that is not color.
- [ ] Every character limit the field enforces is stated, and no text is quietly cut off or cleared.
- [ ] A screen reader announces the field as multi-line. Any clickable icon added to the field has an accessible name, and any decorative icon is hidden from screen readers.
- [ ] Tab leaves the field. Enter inserts a line break and does not submit the form. Escape does not clear the field.
- [ ] Text that overflows the field scrolls from the keyboard, and the user never needs to resize the field to finish the text.
- [ ] Focus never moves automatically, and no live count is announced on every keystroke.
- [ ] `rows`, height, and spacing come from the component, with no wrapper and no custom margins.
- [ ] Every variant, size, and state is one the project's UI kit lists, and no variant or option is invented.
- [ ] Text that nobody can edit uses the read-only field, not a disabled textarea.
- [ ] Open questions were asked about, not decided: growing to fit the text, text longer than the fixed number of rows, the character counter, a rich text editor, and a minimum length.
