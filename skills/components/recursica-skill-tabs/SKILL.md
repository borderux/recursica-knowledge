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

- **Sectioning content**: Use tabs to show users alternate views within the same group of context — parts of one whole, like folders in a single file drawer
  - **Quick access**: Tabs allow users to navigate through different content without multiple steps
  - **Save space**: Use tabs to save space and allow more content to be shown in a small space
  - **Accessibility & Best Practices**: Keyboard interaction within the tab set is owned by the underlying library — do not add custom key handling. Give each tab its own sub-path under the parent route so it is linkable and works with back and forward.

---

## When Not to Use

- **Stepped or sequential content**: Avoid using tabs with sequential names that don’t give context to content, instead consider using a stepper if the user needs to be guided through content
  - **Navigation**: As tabs are used to navigate within the same context, avoid using tabs as a form of navigation to different areas
  - **Related content**: Avoid making users switch between tabs to see related content as it acts as a hindrance to users
  - **Forms**: Never spread a form across tabs. Breaking a multi-part form into tabs is an invalid use — use a stepper
  - **Anti-patterns**: Don't use tabs for sequential workflows that must be completed in order (use a stepper).

---

## Best Practices

- Follow platform accessibility guidelines.
- Spacing, padding, and active-state styling are owned by the component. Do not tune them.

---

## House Design Rules

Tab usage, routing, and location indication are governed by the design-rules skills. Load them alongside this one:

- [`recursica-skill-navigation`](../../design-rules/recursica-skill-navigation/SKILL.md) — what tabs may contain, tab routes and history, active states, breadcrumbs.
- [`recursica-skill-forms`](../../design-rules/recursica-skill-forms/SKILL.md) — stepper and multi-step form behavior, the correct alternative to tabbed forms.

---

## Referential Libraries & Documentation

- Carbon Design System: [Carbon Tabs Documentation](https://carbondesignsystem.com)
- Material UI: [MUI Tabs Documentation](https://mui.com)
