---
title: "Date picker"
description: "Recursica helps agencies build client digital products faster and more consistently. Our system streamlines design, ensures brand consistency, and improves team collaboration."
previewName: "date-picker"
specs:
  - section: "Label placement"
    items:
      - label: "Stacked"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/date-picker/assets/date-picker-label-placement-stacked.svg"
        text: "Please note that the stacked version does not truncate or wrap the label. Noting this, please try to keep the label as short as possible."
      - label: "Left to right"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/date-picker/assets/date-picker-label-placement-left-to-right.svg"
        text: "Please note the wrapping and truncation rules for the left to right version and how the optional label is below the label."
  - section: "States"
    items:
      - label: "Default"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/date-picker/assets/date-picker-states-default.svg"
      - label: "Disabled"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/date-picker/assets/date-picker-states-disabled.svg"
      - label: "Error"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/date-picker/assets/date-picker-states-error.svg"
      - label: "Focused"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/date-picker/assets/date-picker-states-focused.svg"
      - label: "Error focused"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/date-picker/assets/date-picker-states-error-focused.svg"
      - label: "Read only"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/date-picker/assets/date-picker-states-read-only.svg"
anatomy:
  image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/date-picker/assets/date-picker-anatomy.svg"
  items:
    - num: 1
      label: "Text field"
      text: "Opens the date picker upon selection and allows the user to manually enter a date."
    - num: 2
      label: "Dropdown menu"
      text: "Enables the ability to change the month and year for selection."
    - num: 3
      label: "Navigation arrow"
      text: "Allows ability to cycle through the month selections without leaving the date picker."
    - num: 4
      label: "Actions"
      text: "To cancel or confirm date selection."
skill:
  name: recursica-skill-date-picker
  path: skills/components/recursica-skill-date-picker
  repository: https://github.com/borderux/recursica-knowledge
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Date picker

**A date picker captures a single calendar date, either by typing it or by picking it.** Typing always stays possible — the calendar speeds entry up for people who want it, but it is never the only way in.

## When to use

- **The value is one calendar date**: a due date, a start date, an effective date.
- **A calendar genuinely helps**: someone is reasoning about weekdays, proximity, or the shape of a month rather than recalling a date they already know.
- **The date is close to today**: near enough that the calendar reaches it in a step or two.
- **The date should read unambiguously**: a spelled month, as in Jan 7, 2026, so nobody has to work out whether 01/07 means January or July.
- **The reader's own calendar is the right one**: dates follow the reader's locale and time zone, with the zone named whenever it is not theirs.

## When to avoid

- **The value is a time of day**: use a time picker.
- **The date is already known by heart**: use a text field with the expected format in the help text. Typing beats picking whenever recall is instant.
- **The date is far in the past, like a birth date**: use a text field. Paging a calendar back through decades is punishing.
- **A relative or approximate span, like "in 30 days"**: capture the offset as a number plus a unit. That is not a date.
- **A month, a quarter, or a fiscal period**: use separate inputs with the format stated. A partial date is not this control.
- **The date is only being displayed, or is never editable here**: use formatted text, or the read-only field in a form. A disabled picker is not a way to show a date.

## Specifications

### Label placement

### States

### Anatomy

<!--
LEGACY — original content exported from the Recursica website, superseded by the body above.
Retained verbatim so nothing from the old site is lost. Do not render.

# Date picker

**The date picker allows the user to pick a single date.**

## When to use

- **Date selection**: Use when users need to input or select dates such  as scheduling, setting reminders, etc.
- **Accessibility & Best Practices**: Support keyboard input and manual text entry for faster date selection.

## When to avoid

- **Complex date input**: If users need to input complex date or time formats, consider using a combination of text input fields with clear formatting instructions
- **Anti-patterns**: Don't force users to use the calendar popup for dates far in the past (like date of birth).

## Specifications

### Label placement

### States

### Anatomy
-->
