---
name: recursica-skill-breadcrumb
description: Trigger this when the developer asks to design, write, or refactor a UI layout containing the breadcrumb component.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Breadcrumb Skill

**Breadcrumbs visually show the platform’s structural hierarchy, helping users to understand the path they’ve taken, allowing them to navigate easily.**

## Anatomy & Sub-components

This skill covers the following component specs defined in the UI Kit:

- `breadcrumb`

---

## When to Use

- **Nested structure**: Use breadcrumbs when a platform has a complex structure composed of nested links to allow users to better navigate and understand it.
  - **Promote wayfinding**: Breadcrumbs are effective for long navigation paths where users may traverse multiple levels or categories. It helps users maintain orientation and context, especially when navigating through deep hierarchies or extensive content.
  - **Accessibility & Best Practices**: Always clearly mark the current page (usually the last item) and leave it unlinked.

---

## When Not to Use

- **Shallow navigation**: If the platform/application has only a few levels or pages, breadcrumbs may not be necessary and users can rely on primary navigation menus or buttons
  - **Redundant navigation**: Avoid using where the navigation path is clearly indicated by other UI elements or contextual clues
  - **Anti-patterns**: Don't use breadcrumbs as the primary navigation. They are a supplementary wayfinding tool.

---

## Best Practices

- Follow platform accessibility guidelines.
- Ensure consistent padding and alignments.

---

## Referential Libraries & Documentation

- Carbon Design System: [Carbon Breadcrumb Documentation](https://carbondesignsystem.com)
- Material UI: [MUI Breadcrumb Documentation](https://mui.com)
