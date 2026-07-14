---
title: "Number input"
description: "Recursica helps agencies build client digital products faster and more consistently. Our system streamlines design, ensures brand consistency, and improves team collaboration."
previewName: "number-input"
specs:
  - section: "Label placement"
    items:
      - label: "Stacked"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/number-input/assets/number-input-label-placement-stacked.svg"
      - label: "Left to right"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/number-input/assets/number-input-label-placement-left-to-right.svg"
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
