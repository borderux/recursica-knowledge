---
name: recursica-skill-time-picker
description: Trigger this when the developer asks to design, write, or refactor a UI layout containing the time-picker component.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# TimePicker Skill

**Time pickers allow users to select a time value quickly using a text input. They are commonly used for scheduling, reminders, alarms, or any task that requires precise time entry.**

## Anatomy & Sub-components

This skill covers the following component specs defined in the UI Kit:

- `time-picker`

---

## When to Use

- **Scheduling tasks**: Use time pickers when users need to specify a start or end time for events, reminders, or activities.
  - **Inputting precise values**: When hours and minutes (and sometimes seconds) need to be explicitly set rather than selected from a short list.
  - **Supporting multiple formats**: Allow users to enter or choose times in 12-hour or 24-hour formats, depending on locale or context.
  - **Mobile-friendly entry**: Provide an intuitive way to set times on smaller screens without relying on keyboard input.
  - **Accessibility & Best Practices**: Support localized time formats (12h vs 24h) based on the user's locale.

---

## When Not to Use

- **Relative times**: Don’t use a time picker if the user only needs to choose approximate or relative times (e.g., “in 30 minutes,” “later today”).
  - **Fixed options**: Avoid when the choices are limited to a few preset times… use buttons, chips, or a select menu instead.
  - **Date and time together**: If a user must select both a date and a time, use a combined DateTime picker for clarity and efficiency.
  - **Complex scheduling**: Avoid for recurring or advanced scheduling (e.g., “every Monday at 3 PM”); a dedicated scheduling UI is better.
  - **Anti-patterns**: Don't force manual typing; always provide a visual selector or dropdown options.

---

## Best Practices

- Follow platform accessibility guidelines.
- Ensure consistent padding and alignments.

---

## Referential Libraries & Documentation

- Carbon Design System: [Carbon TimePicker Documentation](https://carbondesignsystem.com)
- Material UI: [MUI TimePicker Documentation](https://mui.com)
