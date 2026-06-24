---
name: recursica-skill-tabs
description: Trigger this when the developer asks to design, write, or refactor a UI layout containing the tabs component.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Tabs Skill

**Tabs organize content and allow users to switch between different views.**

## Anatomy & Sub-components

This skill covers the following component specs defined in the UI Kit:

- `tabs`

---

## When to Use

- **Sectioning content**: Use tabs to show users alternate views within the same group of context
  - **Quick access**: Tabs allow users to navigate through different content without multiple steps
  - **Save space**: Use tabs to save space and allow more content to be shown in a small space
  - **Accessibility & Best Practices**: Ensure the active tab is highly distinguishable from inactive ones.

---

## When Not to Use

- **Stepped or sequential content**: Avoid using tabs with sequential names that don’t give context to content, instead consider using a stepper if the user needs to be guided through content
  - **Navigation**: As tabs are used to navigate within the same context, avoid using tabs as a form of navigation to different areas
  - **Related content**: Avoid making users switch between tabs to see related content as it acts as a hindrance to users
  - **Anti-patterns**: Don't use tabs for sequential workflows that must be completed in order (use a stepper).

---

## Best Practices

- Follow platform accessibility guidelines.
- Ensure consistent padding and alignments.

---

## Referential Libraries & Documentation

- Carbon Design System: [Carbon Tabs Documentation](https://carbondesignsystem.com)
- Material UI: [MUI Tabs Documentation](https://mui.com)
