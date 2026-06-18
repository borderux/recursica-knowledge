---
title: "Radio"
description: "Recursica helps agencies build client digital products faster and more consistently. Our system streamlines design, ensures brand consistency, and improves team collaboration."
previewName: "radio"
specs:
  - section: "Label placement"
    items:
      - label: "Stacked"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/radio/assets/radio-label-placement-stacked.svg"
      - label: "Left to Right"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/radio/assets/radio-label-placement-left-to-right.svg"
  - section: "States"
    items:
      - label: "Enabled Selected"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/radio/assets/radio-states-enabled-selected.svg"
      - label: "Disabled Selected"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/radio/assets/radio-states-disabled-selected.svg"
      - label: "Enabled Unselected"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/radio/assets/radio-states-enabled-unselected.svg"
      - label: "Disabled Unselected"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/radio/assets/radio-states-disabled-unselected.svg"
anatomy:
  image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/radio/assets/radio-anatomy.svg"
  items:
    - num: 1
      label: "Label"
      text: 'Should indicate some kind of instruction for selection. If majority of fields are required in a single form, the "Option" label can be toggled on. If majority of fields are optional, the "Required asterisks" should instead be toggled on.'
    - num: 2
      label: "Group"
      text: "A radio group must include two or more items for a proper selection. By default, it's best practice to always have the top radio button in a group selected. For progressive disclosure forms, always display a radio group with no radio items selected."
skill:
  name: recursica-skill-radio-button
  path: skills/components/recursica-skill-radio-button
  repository: https://github.com/borderux/recursica-knowledge
---

# Radio

**Radio buttons allow users to select a single item from a list.**

## When to use

- **Single selection**: Use radio buttons to restrict users to only being able to choose a single item
- **Scannable lists**: Use radio groups to show users all the options that are available to choose from all at once
- **Accessibility & Best Practices**: Use radio buttons when users must select exactly one option from a mutually exclusive list.

## When to avoid

- **Too many options**: For cases requiring more than 8 items in the list, consider using a selectable dropdown menu in a form setting
- **Anti-patterns**: Don't use radio buttons for binary on/off states that take immediate effect (use a switch).

## Specifications

### Label placement

### States

### Anatomy
