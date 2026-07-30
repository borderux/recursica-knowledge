---
title: "Time picker"
description: "Recursica helps agencies build client digital products faster and more consistently. Our system streamlines design, ensures brand consistency, and improves team collaboration."
previewName: "time-picker"
specs:
  - section: "Label placement"
    items:
      - label: "Stacked"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/time-picker/assets/time-picker-label-placement-stacked.svg"
        text: "Please note that the stacked version does not truncate or wrap the label. Noting this, please try to keep the label as short as possible."
      - label: "Left to right"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/time-picker/assets/time-picker-label-placement-left-to-right.svg"
        text: "Please note the wrapping and truncation rules for the left to right version and how the optional label is below the label."
  - section: "States"
    items:
      - label: "Default"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/time-picker/assets/time-picker-states-default.svg"
      - label: "Error"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/time-picker/assets/time-picker-states-error.svg"
      - label: "Focused"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/time-picker/assets/time-picker-states-focused.png"
      - label: "Disabled"
        image: "https://framerusercontent.com/images/r4rxhYWgqffvPUiRzuBCOGCGDk4.png"
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

**The time picker captures a point in the day, either by typing it or by choosing it.** Reach for it when an exact hour and minute matter — a start time, an end time, a reminder, an appointment.

## When to use

- **A specific time of day has to be set**: the start or end of an event, a reminder, an appointment.
- **Hours and minutes are stated explicitly**: the reader names the time rather than picking from a short list.
- **The precision matters to the task**: if any nearby time would do, the reader is not really setting a time.
- **Typing is always possible**: someone who already knows the time types it and moves on, while someone who does not opens the picker. Neither path should be the only way in.
- **The clock follows the reader**: whether the time reads as 12-hour or 24-hour comes from their own locale or setting, not from the screen, and it stays the same everywhere they go.

## When to avoid

- **An approximate or relative time**: "in 30 minutes" is an offset, not a time — capture a number and its unit instead.
- **A few preset times**: use a segmented control or a dropdown, which show the choices at a glance.
- **A length of time rather than a point in time**: use a number input for each unit, so it reads "3h 20m" and cannot be mistaken for a clock time.
- **A calendar date**: use the date picker. When a date and a time are both needed, put the two controls side by side on one row under a single label.
- **Recurring or conditional scheduling**: "every Monday at 3 PM" needs a scheduling surface built for the job, not one field.
- **The value is never editable here**: use the read-only field. A disabled picker is not a way to display a time.

## Specifications

### Label placement

### States

### Anatomy

<!--
LEGACY — original content exported from the Recursica website, superseded by the body above.
Retained verbatim so nothing from the old site is lost. Do not render.

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
-->
