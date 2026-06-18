---
name: recursica-skill-radio-button
description: Trigger this when the developer asks to design, write, or refactor a UI layout containing the radio-button component (including radio-button, radio-button-item, radio-button-group).
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# RadioButton Skill

**Radio buttons allow users to select a single item from a list.**

## Anatomy & Sub-components

This skill covers the following component specs defined in the UI Kit:

- `radio-button`
- `radio-button-item`
- `radio-button-group`

---

## When to Use

- **Single selection**: Use radio buttons to restrict users to only being able to choose a single item
  - **Scannable lists**: Use radio groups to show users all the options that are available to choose from all at once
  - **Accessibility & Best Practices**: Use radio buttons when users must select exactly one option from a mutually exclusive list.

---

## When Not to Use

- **Too many options**: For cases requiring more than 8 items in the list, consider using a selectable dropdown menu in a form setting
  - **Anti-patterns**: Don't use radio buttons for binary on/off states that take immediate effect (use a switch).

---

## Best Practices

- Follow platform accessibility guidelines.
- Ensure consistent padding and alignments.

---

## Referential Libraries & Documentation

- Carbon Design System: [Carbon RadioButton Documentation](https://carbondesignsystem.com)
- Material UI: [MUI RadioButton Documentation](https://mui.com)
