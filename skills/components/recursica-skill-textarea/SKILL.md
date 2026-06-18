---
name: recursica-skill-textarea
description: Trigger this when the developer asks to design, write, or refactor a UI layout containing the textarea component.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Textarea Skill

**A text area is a form control that allows users to enter and edit multiple lines of text. It's designed for collecting long-form content such as comments, messages, or detailed descriptions.**

## Anatomy & Sub-components

This skill covers the following component specs defined in the UI Kit:

- `textarea`

---

## When to Use

- **Comments and feedback**: Use for comment fields, feedback forms, or posts.
  - **Detailed descriptions**: When you need users to provide a detailed description, like for a support ticket or a product profile.
  - **Messaging**: For composing messages in a chat or email interface.
  - **Exceeding one line**: Anywhere the expected user input is likely to exceed a single sentence of text.
  - **Accessibility & Best Practices**: Allow the text area to dynamically resize based on its content.

---

## When Not to Use

- **Single-lined input**: For brief information like names, emails, or search queries, use a text input to save space and better indicate the expected length.
  - **Formatted content**: If users need to apply formatting like bold, italics, or lists, a rich text editor is more appropriate.
  - **Anti-patterns**: Don't restrict users strictly by character count without a visible counter.

---

## Best Practices

- Follow platform accessibility guidelines.
- Ensure consistent padding and alignments.

---

## Referential Libraries & Documentation

- Carbon Design System: [Carbon Textarea Documentation](https://carbondesignsystem.com)
- Material UI: [MUI Textarea Documentation](https://mui.com)
