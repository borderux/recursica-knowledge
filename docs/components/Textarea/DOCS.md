---
title: "Text area"
description: "Recursica helps agencies build client digital products faster and more consistently. Our system streamlines design, ensures brand consistency, and improves team collaboration."
previewName: "text-area"
specs:
  - section: "Label placement"
    items:
      - label: "Stacked"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/text-area/assets/text-area-label-placement-stacked.svg"
        text: "Please note that the stacked version does not truncate or wrap the label. Noting this, please try to keep the label as short as possible."
      - label: "Left"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/text-area/assets/text-area-label-placement-left.svg"
        text: "Please note the wrapping and truncation rules for the left to right version and how the optional label is below the label."
  - section: "Vertical resize"
    items:
      - label: "Auto"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/text-area/assets/text-area-vertical-resize-auto.svg"
        text: "The text area automatically grows in height to fit the content as the user types."
      - label: "Custom"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/text-area/assets/text-area-vertical-resize-custom.svg"
        text: "The text area has a custom fixed height, and a scrollbar appears if the content overflows."
anatomy:
  image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/text-area/assets/text-area-anatomy.svg"
  items:
    - num: 1
      label: "Label"
      text: 'Should indicate some kind of instruction for selection. If majority of fields are required in a single form, the "Option" label can be toggled on. If majority of fields are optional, the "Required asterisks" should instead be toggled on.'
    - num: 2
      label: "Content"
      text: "Contains optional placeholder text or valued content input by the user."
    - num: 3
      label: "Assistive text"
      text: "For additional instructions, formatting requirements, or validation messages."
    - num: 4
      label: "Character count"
      text: "Displays the current number of characters entered relative to the maximum allowed limit."
    - num: 5
      label: "Container"
      text: "The multi-line input area that can be configured to have a custom height or a default fixed height before content truncation."
skill:
  name: recursica-skill-textarea
  path: skills/components/recursica-skill-textarea
  repository: https://github.com/borderux/recursica-knowledge
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Text area

**The text area captures plain text across more than one line.** Reach for it when the answer runs past a sentence — a comment, a description, a message — and when line breaks are part of what someone is writing.

## When to use

- **The expected answer runs past one sentence**: a description, a justification, a note.
- **The reader is composing, not identifying**: comments, feedback, messages, the detail on a support ticket.
- **Line breaks belong in the value**: if paragraphs are part of the answer, this is the control.
- **The size sets the expectation**: the height of the box tells the reader roughly how much to write, so match it to the answer you expect rather than using a big box to make a small field look important.

## When to avoid

- **The content fits on one line**: use a text field. Its size tells the reader how short the answer should be.
- **The value comes from a known set of options**: use a dropdown, radio group, or autocomplete. Free text over a fixed set of answers invites mistakes.
- **The reader needs bold, italics, or lists**: use a rich text editor. A text area produces plain text only.
- **The value is a number, a date, or a time**: use a number input, a date picker, or a time picker, each of which can check what it is given.
- **The value is never editable here**: use the read-only field. A disabled text area is not a way to display text.
- **A character limit the reader cannot see**: state the limit up front and keep it in view. Silently dropping what someone typed loses their words.

## Specifications

### Label placement

### Vertical resize

### Anatomy

<!--
LEGACY — original content exported from the Recursica website, superseded by the body above.
Retained verbatim so nothing from the old site is lost. Do not render.

# Text area

**A text area is a form control that allows users to enter and edit multiple lines of text. It's designed for collecting long-form content such as comments, messages, or detailed descriptions.**

## When to use

- **Comments and feedback**: Use for comment fields, feedback forms, or posts.
- **Detailed descriptions**: When you need users to provide a detailed description, like for a support ticket or a product profile.
- **Messaging**: For composing messages in a chat or email interface.
- **Exceeding one line**: Anywhere the expected user input is likely to exceed a single sentence of text.
- **Accessibility & Best Practices**: Allow the text area to dynamically resize based on its content.

## When to avoid

- **Single-lined input**: For brief information like names, emails, or search queries, use a text input to save space and better indicate the expected length.
- **Formatted content**: If users need to apply formatting like bold, italics, or lists, a rich text editor is more appropriate.
- **Anti-patterns**: Don't restrict users strictly by character count without a visible counter.

## Specifications

### Label placement

### Vertical resize

### Anatomy
-->
