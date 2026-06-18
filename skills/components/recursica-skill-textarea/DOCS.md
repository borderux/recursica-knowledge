---
title: "Text area"
description: "Recursica helps agencies build client digital products faster and more consistently. Our system streamlines design, ensures brand consistency, and improves team collaboration."
previewName: "text-area"
specs:
  - section: "Label placement"
    items:
      - label: "Stacked"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/text-area/assets/text-area-label-placement-stacked.svg"
      - label: "Left"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/text-area/assets/text-area-label-placement-left.svg"
  - section: "Vertical resize"
    items:
      - label: "Auto"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/text-area/assets/text-area-vertical-resize-auto.svg"
      - label: "Custom"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/text-area/assets/text-area-vertical-resize-custom.svg"
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
---

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
