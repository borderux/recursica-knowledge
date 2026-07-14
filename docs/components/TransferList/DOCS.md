---
title: "Transfer list"
description: "Recursica helps agencies build client digital products faster and more consistently. Our system streamlines design, ensures brand consistency, and improves team collaboration."
previewName: "transfer-list"
specs:
  - section: "Behavior"
    items:
      - label: "Selection"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/transfer-list/assets/transfer-list-behavior-selection.svg"
      - label: "Filtering"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/transfer-list/assets/transfer-list-behavior-filtering.svg"
      - label: "Bulk transfer"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/transfer-list/assets/transfer-list-behavior-bulk-transfer.svg"
anatomy:
  image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/transfer-list/assets/transfer-list-anatomy.svg"
  items:
    - num: 1
      label: "Label"
      text: "Should indicate the content within the list containers."
    - num: 2
      label: "Search field"
      text: "Allows the ability to quickly filter for items within each list."
    - num: 3
      text: "Contains list of items. Each list item includes a checkbox, allowing the ability to select one or more items to be transferred to the other list."
    - num: 4
      label: "Controls"
      text: "Used to transfer selected items — or all items at once — between the two lists."
skill:
  name: recursica-skill-transfer-list
  path: skills/components/recursica-skill-transfer-list
  repository: https://github.com/borderux/recursica-knowledge
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Transfer list

**A transfer list, also known as a dual listbox, is a user interface component that allows users to move a selection of items from one list to another. It typically consists of two adjacent lists with controls to move items between them.**

## When to use

- **Selecting multiple items from a large dataset**: It's ideal when users need to assign users to a group, select columns for a report, or choose options for configuration.
- **Clear distinction between states**: Use it when there is a clear included and excluded state for a group of items. The two lists provide an immediate visual representation of which items have been chosen.
- **Bulk actions**: It's efficient for users to select several items at once before moving them in a single action.
- **Accessibility & Best Practices**: Provide "move all" buttons and a search filter for long lists.

## When to avoid

- **Few items**: If there are only a handful of items to choose from (e.g., less than 5), a simple group of checkboxes or toggle switches is more straightforward and requires less screen space.
- **Single selection**: For scenarios where only one item can be selected from a list, a dropdown menu or a set of radio buttons is a more appropriate component.
- **Mobile interfaces**: The side-by-side layout of a transfer list can be difficult to use on small screens. Consider an alternative pattern, like a multi-select list that navigates to a separate screen to show selections.
- **Anti-patterns**: Don't use transfer lists if the selection space is small (use standard checkboxes).

## Specifications

### Behavior

### Anatomy
