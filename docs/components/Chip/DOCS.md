---
title: "Chip"
description: "Recursica helps agencies build client digital products faster and more consistently. Our system streamlines design, ensures brand consistency, and improves team collaboration."
previewName: "chip"
specs:
  - section: "Types"
    items:
      - label: "Selectable chip"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/chip/assets/chip-types-selectable-chip.svg"
        text: "Selectable chips can be used when users have to choose from a list of 2 or more options."
      - label: "Removable chip"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/chip/assets/chip-types-removable-chip.svg"
        text: "Removeable chips can be used to alter selections in filtering to customize or refine a search more easily."
  - section: "States"
    items:
      - label: "Unselected"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/chip/assets/chip-states-unselected.svg"
      - label: "Selected"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/chip/assets/chip-states-selected.svg"
      - label: "Error"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/chip/assets/chip-states-error.svg"
      - label: "Error selected"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/chip/assets/chip-states-error-selected.svg"
anatomy:
  image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/chip/assets/chip-anatomy.svg"
  items:
    - num: 1
      label: "Icon (Optional)"
      text: "Icons can be used to help aid text by creating visual cues to nouns."
    - num: 2
      label: "Label"
      text: "Should identify a name, place, description, or tag."
    - num: 3
      label: "Remove icon"
      text: "Only used for the removable chip variant (typically to display removable filters or tags)."
skill:
  name: recursica-skill-chip
  path: skills/components/recursica-skill-chip
  repository: https://github.com/borderux/recursica-knowledge
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Chip

**A chip is one of several short values someone can see, select, or remove.** Where a badge is a single read-only value the system sets, a chip is one of several a person operates. Chips come in groups, and a group holds one behaviour — selectable or removable, not both.

## When to use

- **The values are plural**: several tags, several categories, several filters applied to one object.
- **The layout calls for a horizontal multi-select**: selectable chips are how that is done, since a checkbox group is never rotated into a row.
- **Someone filters or refines**: turning options on and off to narrow a result set.
- **Someone added the values and may take them back off**: applied filters show as removable chips, and removing one re-runs the filter.
- **The labels are short nouns**: one or two words each, so the row stays readable.

## When to avoid

- **One read-only value the system sets**: use a badge.
- **A status of any kind**: use a badge. A chip looks operable, and a status is not anyone's to change.
- **An exclusive single choice**: use a segmented control across a row, or radio buttons down a column.
- **Space is tight, as in a table row**: use a badge. A chip carries padding, an icon, and often a dismiss.
- **There are more options than a row can hold**: use a dropdown or an autocomplete. Around seven is where a group stops being scannable.
- **Primary navigation, or labelling a nav item**: use links to navigate and a badge for the label.

## Specifications

### Types

### States

### Anatomy

<!--
LEGACY — original content exported from the Recursica website, superseded by the body above.
Retained verbatim so nothing from the old site is lost. Do not render.

# Chip

**Chips are selectable or read-only elements usually containing data about a person, a place, or a thing.**

## When to use

- **Displaying categorization**: Use chips to showcase categories or tags associated with an item
- **Multiple choices**: Use selectable chips when users need to choose from a list of options, especially in scenarios where multiple selections are allowed
- **Filtering**: Use selectable chips to enable users to apply filters or to refine search easily
- **Accessibility & Best Practices**: Allow users to easily dismiss or clear chips when used as filters.

## When to avoid

- **Limited options**: If there are only a few static options or the information is straightforward, using chips may be unnecessary
- **Complex input**: For cases requiring more complex input or extensive data, consider alternative UI components like dropdowns or inputs
- **Anti-patterns**: Don't use chips for primary navigation links.

## Specifications

### Types

### States

### Anatomy
-->
