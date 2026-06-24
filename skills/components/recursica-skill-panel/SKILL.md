---
name: recursica-skill-panel
description: Trigger this when the developer asks to design, write, or refactor a UI layout containing the panel component.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Panel Skill

**Panels slide in or expand from the edge of the screen to reveal additional content or functionality. They are commonly used to provide supplementary information, navigation options, or toolsets without cluttering the main interface.**

## Anatomy & Sub-components

This skill covers the following component specs defined in the UI Kit:

- `panel`

---

## When to Use

- **Additional Content**: Use panels to display additional functionality that complements the main interface without overwhelming it. This may include options for: filtering, settings, editing tasks or supplementary information
  - **Space Efficiency**: Use to help save screen real estate by concealing secondary information or modes within a panel
  - **Accessibility & Best Practices**: Use panels for complex configuration or details that shouldn't obscure the main view.

---

## When Not to Use

- **Critical Hidden Content**: Avoid hiding critical content or functionality within panels that can make it difficult for users to discover and access important features
  - **Complex Interactions**: Panels may not be suitable for complex interactions or multi-step processes. Consider dedicating a whole page or modal dialog for extensive user input and navigation
  - **Anti-patterns**: Don't use panels for brief, simple alerts or confirmations.

---

## Best Practices

- Follow platform accessibility guidelines.
- Ensure consistent padding and alignments.

---

## Referential Libraries & Documentation

- Carbon Design System: [Carbon Panel Documentation](https://carbondesignsystem.com)
- Material UI: [MUI Panel Documentation](https://mui.com)
