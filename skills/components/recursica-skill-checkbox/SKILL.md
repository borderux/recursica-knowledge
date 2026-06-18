---
name: recursica-skill-checkbox
description: Trigger this when the developer asks to design, write, or refactor a UI layout containing the checkbox component (including checkbox, checkbox-item, checkbox-group).
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Checkbox Skill

**Checkboxes allow users to select one or more items from a list.**

## Anatomy & Sub-components

This skill covers the following component specs defined in the UI Kit:

- `checkbox`
- `checkbox-item`
- `checkbox-group`

---

## When to Use

- **Multiple selection**: Use checkboxes to allow users to select one or more items
  - **Scannable lists**: Use radio groups to show users all the options that are available to choose from all at once
  - **Present sub-lists**: Checkboxes allow users to see a parent-child relationship with other checkboxes
  - **Accessibility & Best Practices**: Use checkboxes for independent, non-mutually exclusive selections.

---

## When Not to Use

- **Single selection**: If users can only select one option from a list, consider using radio buttons instead of checkboxes
  - **Too many options**: For cases requiring a large amount of items in the list, consider using a selectable dropdown menu in a form setting
  - **Anti-patterns**: Don't use checkboxes when a change requires immediate application (use a switch instead).

---

## Best Practices

- Follow platform accessibility guidelines.
- Ensure consistent padding and alignments.

---

## Referential Libraries & Documentation

- Carbon Design System: [Carbon Checkbox Documentation](https://carbondesignsystem.com)
- Material UI: [MUI Checkbox Documentation](https://mui.com)
