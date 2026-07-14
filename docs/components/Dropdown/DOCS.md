---
title: "Dropdown"
description: "Recursica helps agencies build client digital products faster and more consistently. Our system streamlines design, ensures brand consistency, and improves team collaboration."
previewName: "dropdown"
specs:
  - section: "Label placement"
    items:
      - label: "Stacked"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/dropdown/assets/dropdown-label-placement-stacked.svg"
      - label: "Left to Right"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/dropdown/assets/dropdown-label-placement-left-to-right.svg"
  - section: "Content"
    items:
      - label: "Valued"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/dropdown/assets/dropdown-content-valued.svg"
      - label: "Placeholder"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/dropdown/assets/dropdown-content-placeholder.svg"
  - section: "States"
    items:
      - label: "Default"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/dropdown/assets/dropdown-states-default.svg"
      - label: "Error"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/dropdown/assets/dropdown-states-error.svg"
      - label: "Focused"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/dropdown/assets/dropdown-states-focused.svg"
anatomy:
  image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/dropdown/assets/dropdown-anatomy.svg"
  items:
    - num: 1
      label: "Label"
      text: 'Should indicate some kind of instruction for selection. If majority of fields are required in a single form, the "Option" label can be toggled on. If majority of fields are optional, the "Required asterisks" should instead be toggled on.'
    - num: 2
      label: "Lead icon"
      text: "Is optional and may help indicate the content of the dropdown."
    - num: 3
      label: "Assistive text"
      text: 'A persistent message below the field to provide guidance or context (e.g. "You can only select one option").'
    - num: 4
      label: "Text"
      text: "Can be either a placeholder or valued text to display the selected item."
    - num: 5
      label: "Trailing icon"
      text: "Indicates whether the dropdown is expanded to display its menu."
skill:
  name: recursica-skill-dropdown
  path: skills/components/recursica-skill-dropdown
  repository: https://github.com/borderux/recursica-knowledge
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Dropdown

**The dropdown is a form control that allows the user to select from a set of options.**

## When to use

- **Limited & specific selection**: Dropdowns are optimal when you have a specific set of answers that user selects from
- **Compact design**: Due to their compact design, you may opt to use a dropdown instead of a checklist or radio group to use less space
- **Accessibility & Best Practices**: Provide a sensible default and ensure the dropdown list doesn't get clipped by the viewport.

## When to avoid

- **Too many options**: To avoid having users scroll through a long list, you may consider a typeahead/autocomplete if the user is familiar with the options given in the dropdown menu
- **Lack of visibility**: To avoid selections being hidden from view when selecting, you may consider a radio group instead
- **Anti-patterns**: Avoid dropdowns when there are fewer than 4 options (use radio buttons instead).

## Specifications

### Label placement

### Content

### States

### Anatomy
