---
name: recursica-skill-dropdown
description: Trigger this when the developer asks to design, write, or refactor a UI layout containing the dropdown component.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Select Skill

**The dropdown is a form control that allows the user to select from a set of options.**

## Anatomy & Sub-components

This skill covers the following component specs defined in the UI Kit:

- `dropdown`

---

## When to Use

- **Limited & specific selection**: Dropdowns are optimal when you have a specific set of answers that user selects from
  - **Compact design**: Due to their compact design, you may opt to use a dropdown instead of a checklist or radio group to use less space
  - **Accessibility & Best Practices**: Provide a sensible default and ensure the dropdown list doesn't get clipped by the viewport.

---

## When Not to Use

- **Too many options**: To avoid having users scroll through a long list, you may consider a typeahead/autocomplete if the user is familiar with the options given in the dropdown menu
  - **Lack of visibility**: To avoid selections being hidden from view when selecting, you may consider a radio group instead
  - **Anti-patterns**: Avoid dropdowns when there are fewer than 4 options (use radio buttons instead).

---

## Best Practices

- Follow platform accessibility guidelines.
- Ensure consistent padding and alignments.

---

## Referential Libraries & Documentation

- Carbon Design System: [Carbon Select Documentation](https://carbondesignsystem.com)
- Material UI: [MUI Select Documentation](https://mui.com)
