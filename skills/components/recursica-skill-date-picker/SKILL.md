---
name: recursica-skill-date-picker
description: Trigger this when the developer asks to design, write, or refactor a UI layout containing the date-picker component.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# DatePicker Skill

**The date picker allows the user to pick a single date.**

## Anatomy & Sub-components

This skill covers the following component specs defined in the UI Kit:

- `date-picker`

---

## When to Use

- **Date selection**: Use when users need to input or select dates such  as scheduling, setting reminders, etc.
  - **Accessibility & Best Practices**: Support keyboard input and manual text entry for faster date selection.

---

## When Not to Use

- **Complex date input**: If users need to input complex date or time formats, consider using a combination of text input fields with clear formatting instructions
  - **Anti-patterns**: Don't force users to use the calendar popup for dates far in the past (like date of birth).

---

## Best Practices

- Follow platform accessibility guidelines.
- Ensure consistent padding and alignments.

---

## Referential Libraries & Documentation

- Carbon Design System: [Carbon DatePicker Documentation](https://carbondesignsystem.com)
- Material UI: [MUI DatePicker Documentation](https://mui.com)
