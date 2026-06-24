---
name: recursica-skill-text-field
description: Trigger this when the developer asks to design, write, or refactor a UI layout containing the text-field component.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# TextField Skill

**The text field allows users to enter and edit text.**

## Anatomy & Sub-components

This skill covers the following component specs defined in the UI Kit:

- `text-field`

---

## When to Use

- **User information**: Text fields allow users to enter information such as contact or payment information
  - **Flexible content**: Text fields are flexible fields that allow different inputs like text, paragraphs, or numeric values
  - **Accessibility & Best Practices**: Provide clear labels, placeholder text, and helpful error messages below the field.

---

## When Not to Use

- **Specified answers**: In the case that users are expected to respond a certain way, you may consider using a dropdown instead
  - **Yes or no answers**: In the case that users are supposed to indicate a simple yes or no answer, you may consider using a switch instead
  - **Anti-patterns**: Avoid relying solely on placeholder text as a label, since it disappears on input.

---

## Best Practices

- Follow platform accessibility guidelines.
- Ensure consistent padding and alignments.

---

## Referential Libraries & Documentation

- Carbon Design System: [Carbon TextField Documentation](https://carbondesignsystem.com)
- Material UI: [MUI TextField Documentation](https://mui.com)
