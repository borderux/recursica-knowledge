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

- **Horizontal multi select**: Selectable chips are how a horizontal multi-select is done. Checkboxes must never be rotated into a horizontal row — when the layout calls for one, reach for selectable chips.
  - **Displaying categorization**: Use chips to showcase categories or tags associated with an item
  - **Multiple choices**: Use selectable chips when users need to choose from a list of options, especially in scenarios where multiple selections are allowed
  - **Filtering**: Use selectable chips to enable users to apply filters or to refine search easily
  - **Accessibility & Best Practices**: Allow users to easily dismiss or clear chips when used as filters.

---

## When Not to Use

- **Limited options**: If there are only a few static options or the information is straightforward, using chips may be unnecessary
  - **Complex input**: For cases requiring more complex input or extensive data, consider alternative UI components like dropdowns or inputs
  - **Single select**: Chips are for multi-select. For an exclusive choice use a segmented control horizontally, or a radio group vertically
  - **Anti-patterns**: Don't use chips for primary navigation links.

---

## Best Practices

- Follow platform accessibility guidelines.
- Spacing, padding, and selected-state styling are owned by the component. Do not tune them.
- Selectable chips inherit the checkbox group's rules — the option ceiling, and the form's commit model.

---

## House Design Rules

Control choice, option counts, and commit timing are governed by the design-rules skills. Load them alongside this one:

- [`recursica-skill-selection-controls`](../../design-rules/recursica-skill-selection-controls/SKILL.md) — when selectable chips are the right control, and the rules they inherit from checkbox groups.
- [`recursica-skill-working-memory`](../../psychology/recursica-skill-working-memory/SKILL.md) — the basis for option-count limits.

---

## Referential Libraries & Documentation

- Carbon Design System: [Carbon Chip Documentation](https://carbondesignsystem.com)
- Material UI: [MUI Chip Documentation](https://mui.com)
