---
name: recursica-skill-accordion
description: Trigger this when the developer asks to design, write, or refactor a UI layout containing the accordion component (including accordion, accordion-item).
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Accordion Skill

**Accordions allow users to show and hide sections on a page.**

## Anatomy & Sub-components

This skill covers the following component specs defined in the UI Kit:

- `accordion`
- `accordion-item`

---

## When to Use

- **Display grouping**: Use accordions to group together content in a single area
  - **Segment content**: Guide users by separating content into different sections allowing them to move one at a time
  - **Maximize space**: Use accordions to save space and only show what’s necessary to the user in the moment
  - **Accessibility & Best Practices**: Ensure the accordion supports keyboard navigation (Space/Enter to toggle).

---

## When Not to Use

- **User access**: Avoid using accordions when users to need to access the content inside frequently
  - **Little content**: When there’s little content on the page, avoid using accordions so the page doesn’t feel too empty
  - **Complex content**: If the content within an accordion is too complex or has too many levels, avoid using an accordion as space can be limited
  - **Anti-patterns**: Avoid hiding critical path information that the user must read to proceed.

---

## Best Practices

- Follow platform accessibility guidelines.
- Ensure consistent padding and alignments.

---

## Referential Libraries & Documentation

- Carbon Design System: [Carbon Accordion Documentation](https://carbondesignsystem.com)
- Material UI: [MUI Accordion Documentation](https://mui.com)
