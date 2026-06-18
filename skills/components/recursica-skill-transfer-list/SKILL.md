---
name: recursica-skill-transfer-list
description: Trigger this when the developer asks to design, write, or refactor a UI layout containing the transfer-list component.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# TransferList Skill

**A transfer list, also known as a dual listbox, is a user interface component that allows users to move a selection of items from one list to another. It typically consists of two adjacent lists with controls to move items between them.**

## Anatomy & Sub-components

This skill covers the following component specs defined in the UI Kit:

- `transfer-list`

---

## When to Use

- **Selecting multiple items from a large dataset**: It's ideal when users need to assign users to a group, select columns for a report, or choose options for configuration.
  - **Clear distinction between states**: Use it when there is a clear included and excluded state for a group of items. The two lists provide an immediate visual representation of which items have been chosen.
  - **Bulk actions**: It's efficient for users to select several items at once before moving them in a single action.
  - **Accessibility & Best Practices**: Provide "move all" buttons and a search filter for long lists.

---

## When Not to Use

- **Few items**: If there are only a handful of items to choose from (e.g., less than 5), a simple group of checkboxes or toggle switches is more straightforward and requires less screen space.
  - **Single selection**: For scenarios where only one item can be selected from a list, a dropdown menu or a set of radio buttons is a more appropriate component.
  - **Mobile interfaces**: The side-by-side layout of a transfer list can be difficult to use on small screens. Consider an alternative pattern, like a multi-select list that navigates to a separate screen to show selections.
  - **Anti-patterns**: Don't use transfer lists if the selection space is small (use standard checkboxes).

---

## Best Practices

- Follow platform accessibility guidelines.
- Ensure consistent padding and alignments.

---

## Referential Libraries & Documentation

- Carbon Design System: [Carbon TransferList Documentation](https://carbondesignsystem.com)
- Material UI: [MUI TransferList Documentation](https://mui.com)
