---
title: "Switch"
description: "Recursica helps agencies build client digital products faster and more consistently. Our system streamlines design, ensures brand consistency, and improves team collaboration."
previewName: "switch"
specs:
  - section: "Orientation"
    items:
      - label: "On Left"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/switch/assets/switch-orientation-on-left.svg"
      - label: "On Right"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/switch/assets/switch-orientation-on-right.svg"
  - section: "States"
    items:
      - label: "Enabled Selected"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/switch/assets/switch-states-enabled-selected.svg"
      - label: "Disabled Selected"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/switch/assets/switch-states-disabled-selected.svg"
      - label: "Enabled Unselected"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/switch/assets/switch-states-enabled-unselected.svg"
      - label: "Disabled Unselected"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/switch/assets/switch-states-disabled-unselected.svg"
anatomy:
  image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/switch/assets/switch-anatomy.svg"
  items:
    - num: 1
      label: "Track"
      text: "The background of the switch, which changes color to provide a clear visual indication of the on/off state."
    - num: 2
      label: "Thumb"
      text: "The sliding handle that the user interacts with to toggle the switch between its two states."
    - num: 3
      label: "Label"
      text: 'Should indicate some kind of instruction for selection. If majority of fields are required in a single form, the "Option" label can be toggled on. If majority of fields are optional, the "Required asterisks" should instead be toggled on.'
skill:
  name: recursica-skill-switch
  path: skills/components/recursica-skill-switch
  repository: https://github.com/borderux/recursica-knowledge
---

# Switch

**Switches toggle the state of a single item off or on.**

## When to use

- **Simple Action**: Switches allow uses to easily toggle an item off or on
- **Mobile/Tablet**: Switches have a larger visual touch area for mobile users to easily see whether the item is off or on
- **Accessibility & Best Practices**: Use switches for settings that are immediately applied without needing a 'Save' button.

## When to avoid

- **Complex Selection**: A switch must have an quick and instantaneous understanding if the user is toggling something off or on
- **Critical Settings**: Avoid using switches for actions that could have serious consequences if accidentally toggled. Instead, use confirmation modals or other safeguards to prevent these changes
- **Anti-patterns**: Don't use a switch if the user must click 'Submit' or 'Save' to confirm the change (use a checkbox).

## Specifications

### Orientation

### States

### Anatomy
