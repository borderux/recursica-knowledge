---
title: "Number input"
description: "Recursica helps agencies build client digital products faster and more consistently. Our system streamlines design, ensures brand consistency, and improves team collaboration."
previewName: "number-input"
specs:
  - section: "Label placement"
    items:
      - label: "Stacked"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/number-input/assets/number-input-label-placement-stacked.svg"
        text: "Please note that the stacked version does not truncate or wrap the label. Noting this, please try to keep the label as short as possible."
      - label: "Left to right"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/number-input/assets/number-input-label-placement-left-to-right.svg"
        text: "Please note the wrapping and truncation rules for the left to right version and how the optional label is below the label."
  - section: "States"
    items:
      - label: "Collapsed"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/number-input/assets/number-input-states-collapsed.svg"
      - label: "Expanded"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/number-input/assets/number-input-states-expanded.svg"
  - section: "Content"
    items:
      - label: "Unvalued"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/number-input/assets/number-input-content-unvalued.svg"
      - label: "Unvalued with placeholder"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/number-input/assets/number-input-content-unvalued-with-placeholder.svg"
      - label: "Valued"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/number-input/assets/number-input-content-valued.svg"
anatomy:
  image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/number-input/assets/number-input-anatomy.svg"
  items:
    - num: 1
      label: "Label"
      text: 'Should indicate some kind of instruction for selection. If majority of fields are required in a single form, the "Option" label can be toggled on. If majority of fields are optional, the "Required asterisks" should instead be toggled on.'
    - num: 2
      label: "Leading icon"
      text: "Optional icon or unit symbol can be placed inside the field to provide essential context for the numerical value, such as currency."
    - num: 3
      label: "Assistive text"
      text: "Communicate additional constraints or formatting rules, like minimum and maximum values."
    - num: 4
      label: "Controls"
      text: "Allows the ability to increment or decrement the input's value in predefined steps."
skill:
  name: recursica-skill-number-input
  path: skills/components/recursica-skill-number-input
  repository: https://github.com/borderux/recursica-knowledge
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Number input

**The number input captures a quantity someone types or adjusts.** Reach for it when the value is a real number — something you could add up or average — and the exact figure matters.

## When to use

- **The value is a quantity**: a count, an amount, a rate, a measurement. Something arithmetic could be done on.
- **The range is open, or wide enough that a list would be wrong**: and the person already knows the number they want.
- **Precision matters**: the exact value is needed, not something close to it.
- **The limits can be said up front**: put the minimum, maximum, and step in the help text, so nobody has to discover them by getting it wrong.

## When to avoid

- **The number comes from a small known set**: use a radio group or a dropdown. Choosing from valid answers beats typing an invalid one.
- **The exact value is arbitrary across a large range**: use a slider. Someone dragging to "about a third" is choosing a position, not entering a number.
- **The digits are an identifier rather than a quantity**: use a text field. Phone numbers, postal codes, account and card numbers are strings — anywhere 007 and 7 mean different things, it is not a number.
- **The value is a length of time**: use one field per unit, written the way people say it — 3h 20m.
- **The value is a date or a time**: use the date picker or the time picker.
- **The value is never editable here**: use the read-only field. A disabled number input is not a way to display a value.

## Specifications

### Label placement

### States

### Content

### Anatomy

<!--
LEGACY — original content exported from the Recursica website, superseded by the body above.
Retained verbatim so nothing from the old site is lost. Do not render.

# Number input

**A number input is an element used for entering and adjusting numerical values. It combines a text field with up and down arrows as controls to quickly increment or decrement the value.**

## When to use

- **Adjust numberical values**: Use a number input whenever a user needs to enter or adjust a specific quantity or value that can be represented as an integer.
- **Accessibility & Best Practices**: Include stepper controls (+/-) and support arrow key increments.

## When to avoid

- **Predefined values**: Do not use a number input when the user must select a number from a small, predefined set of options. A dropdown menu or radio buttons are better for these cases, as they prevent invalid input.
- **Anti-patterns**: Don't use number inputs for values where the precise number is arbitrary or a large range (use a slider).

## Specifications

### Label placement

### States

### Content

### Anatomy
-->
