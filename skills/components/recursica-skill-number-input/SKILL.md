---
name: recursica-skill-number-input
description: Trigger this when the developer asks to design, write, or refactor a UI layout containing the number-input component.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# NumberInput Skill

**A number input is an element used for entering and adjusting numerical values. It combines a text field with up and down arrows as controls to quickly increment or decrement the value.**

## Anatomy & Sub-components

This skill covers the following component specs defined in the UI Kit:

- `number-input`

---

## When to Use

- **Adjust numberical values**: Use a number input whenever a user needs to enter or adjust a specific quantity or value that can be represented as an integer.
  - **Accessibility & Best Practices**: Include stepper controls (+/-) and support arrow key increments.

---

## When Not to Use

- **Predefined values**: Do not use a number input when the user must select a number from a small, predefined set of options. A dropdown menu or radio buttons are better for these cases, as they prevent invalid input.
  - **Anti-patterns**: Don't use number inputs for values where the precise number is arbitrary or a large range (use a slider).

---

## Best Practices

- Follow platform accessibility guidelines.
- Ensure consistent padding and alignments.

---

## Referential Libraries & Documentation

- Carbon Design System: [Carbon NumberInput Documentation](https://carbondesignsystem.com)
- Material UI: [MUI NumberInput Documentation](https://mui.com)
