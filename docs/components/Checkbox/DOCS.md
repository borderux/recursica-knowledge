---
title: "Checkbox"
description: "Recursica helps agencies build client digital products faster and more consistently. Our system streamlines design, ensures brand consistency, and improves team collaboration."
previewName: "checkbox"
specs:
  - section: "Label placement"
    items:
      - label: "Stacked"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/checkbox/assets/checkbox-label-placement-stacked.svg"
      - label: "Left to right"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/checkbox/assets/checkbox-label-placement-left-to-right.svg"
  - section: "States"
    items:
      - label: "Selected"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/checkbox/assets/checkbox-states-selected.svg"
      - label: "Selected-disabled"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/checkbox/assets/checkbox-states-selected-disabled.svg"
      - label: "Indeterminate"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/checkbox/assets/checkbox-states-indeterminate.svg"
      - label: "Indeterminate-disabled"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/checkbox/assets/checkbox-states-indeterminate-disabled.svg"
      - label: "Unselected"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/checkbox/assets/checkbox-states-unselected.svg"
      - label: "Unselected-disabled"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/checkbox/assets/checkbox-states-unselected-disabled.svg"
anatomy:
  image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/checkbox/assets/checkbox-anatomy.svg"
  items:
    - num: 1
      label: "Label"
      text: 'Should indicate some kind of instruction for selection. If majority of fields are required in a single form, the "Option" label can be toggled on. If majority of fields are optional, the "Required asterisks" should instead be toggled on.'
    - num: 2
      label: "Group"
      text: "A checkbox group must include at least two or more items for a proper selection"
skill:
  name: recursica-skill-checkbox
  path: skills/components/recursica-skill-checkbox
  repository: https://github.com/borderux/recursica-knowledge
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Checkbox

**Checkboxes allow users to select one or more items from a list.**

## When to use

- **Multiple selection**: Use checkboxes to allow users to select one or more items
- **Scannable lists**: Use radio groups to show users all the options that are available to choose from all at once
- **Present sub-lists**: Checkboxes allow users to see a parent-child relationship with other checkboxes
- **Accessibility & Best Practices**: Use checkboxes for independent, non-mutually exclusive selections.

## When to avoid

- **Single selection**: If users can only select one option from a list, consider using radio buttons instead of checkboxes
- **Too many options**: For cases requiring a large amount of items in the list, consider using a selectable dropdown menu in a form setting
- **Anti-patterns**: Don't use checkboxes when a change requires immediate application (use a switch instead).

## Specifications

### Label placement

### States

### Anatomy
