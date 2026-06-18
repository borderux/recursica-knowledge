---
name: recursica-skill-chip
description: Trigger this when the developer asks to design, write, or refactor a UI layout containing the chip component.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Chip Skill

**Chips are selectable or read-only elements usually containing data about a person, a place, or a thing.**

## Anatomy & Sub-components

This skill covers the following component specs defined in the UI Kit:

- `chip`

---

## When to Use

- **Displaying categorization**: Use chips to showcase categories or tags associated with an item
  - **Multiple choices**: Use selectable chips when users need to choose from a list of options, especially in scenarios where multiple selections are allowed
  - **Filtering**: Use selectable chips to enable users to apply filters or to refine search easily
  - **Accessibility & Best Practices**: Allow users to easily dismiss or clear chips when used as filters.

---

## When Not to Use

- **Limited options**: If there are only a few static options or the information is straightforward, using chips may be unnecessary
  - **Complex input**: For cases requiring more complex input or extensive data, consider alternative UI components like dropdowns or inputs
  - **Anti-patterns**: Don't use chips for primary navigation links.

---

## Best Practices

- Follow platform accessibility guidelines.
- Ensure consistent padding and alignments.

---

## Referential Libraries & Documentation

- [Carbon Implementation Audit](file:///Users/aaronmartlage/Documents/recursica-forge/recursica-forge-pagination/src/components/adapters/carbon/Chip/Chip.carbon.audit.md)
- [Mantine Implementation Audit](file:///Users/aaronmartlage/Documents/recursica-forge/recursica-forge-pagination/src/components/adapters/mantine/Chip/Chip.mantine.audit.md)
- [Material Implementation Audit](file:///Users/aaronmartlage/Documents/recursica-forge/recursica-forge-pagination/src/components/adapters/material/Chip/Chip.material.audit.md)
