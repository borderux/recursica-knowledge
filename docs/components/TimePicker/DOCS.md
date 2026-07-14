---
title: "Time picker"
description: "Recursica helps agencies build client digital products faster and more consistently. Our system streamlines design, ensures brand consistency, and improves team collaboration."
previewName: "time-picker"
specs:
  - section: "Label placement"
    items:
      - label: "Stacked"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/time-picker/assets/time-picker-label-placement-stacked.svg"
      - label: "Left to right"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/time-picker/assets/time-picker-label-placement-left-to-right.svg"
  - section: "States"
    items:
      - label: "Default"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/time-picker/assets/time-picker-states-default.svg"
      - label: "Error"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/time-picker/assets/time-picker-states-error.svg"
      - label: "Focused"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/time-picker/assets/time-picker-states-focused.png"
anatomy:
  image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/time-picker/assets/time-picker-anatomy.svg"
  items:
    - num: 1
      label: "Label"
      text: "Identifies the purpose of the field (e.g., “Start time”) and provides context for the time being selected."
    - num: 2
      label: "Leading icon"
      text: "An optional clock icon that visually reinforces the action of entering or adjusting a time."
    - num: 3
      label: "Time input"
      text: "Editable field that displays the selected time and accepts direct text entry."
    - num: 4
      label: "Period selector"
      text: "Toggle control for AM/PM selection in 12-hour format; hidden in 24-hour mode."
    - num: 5
      label: "Dropdown indicator"
      text: "Affords interaction by opening the dial or input picker for adjusting the time."
    - num: 6
      label: "Container"
      text: "The outer shape that holds all elements, giving structure, spacing, and visual consistency."
skill:
  name: recursica-skill-time-picker
  path: skills/components/recursica-skill-time-picker
  repository: https://github.com/borderux/recursica-knowledge
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Time picker

**Time pickers allow users to select a time value quickly using a text input. They are commonly used for scheduling, reminders, alarms, or any task that requires precise time entry.**

## When to use

- **Scheduling tasks**: Use time pickers when users need to specify a start or end time for events, reminders, or activities.
- **Inputting precise values**: When hours and minutes (and sometimes seconds) need to be explicitly set rather than selected from a short list.
- **Supporting multiple formats**: Allow users to enter or choose times in 12-hour or 24-hour formats, depending on locale or context.
- **Mobile-friendly entry**: Provide an intuitive way to set times on smaller screens without relying on keyboard input.
- **Accessibility & Best Practices**: Support localized time formats (12h vs 24h) based on the user's locale.

## When to avoid

- **Relative times**: Don’t use a time picker if the user only needs to choose approximate or relative times (e.g., “in 30 minutes,” “later today”).
- **Fixed options**: Avoid when the choices are limited to a few preset times… use buttons, chips, or a select menu instead.
- **Date and time together**: If a user must select both a date and a time, use a combined DateTime picker for clarity and efficiency.
- **Complex scheduling**: Avoid for recurring or advanced scheduling (e.g., “every Monday at 3 PM”); a dedicated scheduling UI is better.
- **Anti-patterns**: Don't force manual typing; always provide a visual selector or dropdown options.

## Specifications

### Label placement

### States

### Anatomy
