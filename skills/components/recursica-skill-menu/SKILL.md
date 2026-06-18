---
name: recursica-skill-menu
description: Trigger this when the developer asks to design, write, or refactor a UI layout containing the menu component (including menu, menu-item).
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Menu Skill

**A menu displays a list of choices or actions in a temporary pop-up container. It is triggered by a user's interaction with an element like a button or dropdown, providing a compact way to present multiple options without cluttering the interface.**

## Anatomy & Sub-components

This skill covers the following component specs defined in the UI Kit:

- `menu`
- `menu-item`

---

## When to Use

- **Dropdown lists**: As the list of options for a dropdown component.
  - **Action menus**: For "ellipsis (⋮) or (⋯)" icon buttons that reveal a set of contextual actions.
  - **Context menus**: To provide a list of actions related to a specific UI element, often triggered by a right-click.
  - **Simple navigation**: For basic, single-level navigation dropdowns.
  - **Accessibility & Best Practices**: Organize items logically, using dividers to separate distinct groups of actions.

---

## When Not to Use

- **Primary navigation**: For the main site navigation, use a more persistent component like a navigation bar.
  - **Single action**: If there is only one possible action, use a component like a button.
  - **Complex content**: Avoid embedding complex forms or multi-step flows within a menu. A modal or panel is better suited for such tasks.
  - **Anti-patterns**: Don't hide primary actions inside a menu. Expose them directly if space permits.

---

## Best Practices

- Follow platform accessibility guidelines.
- Ensure consistent padding and alignments.

---

## Referential Libraries & Documentation

- Carbon Design System: [Carbon Menu Documentation](https://carbondesignsystem.com)
- Material UI: [MUI Menu Documentation](https://mui.com)
