---
title: "Menu"
description: "Recursica helps agencies build client digital products faster and more consistently. Our system streamlines design, ensures brand consistency, and improves team collaboration."
previewName: "menu"
specs:
  - section: "Type"
    items:
      - label: "Single select"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/menu/assets/menu-type-single-select.svg"
      - label: "Multi select"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/menu/assets/menu-type-multi-select.svg"
      - label: "Custom content"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/menu/assets/menu-type-custom-content.svg"
anatomy:
  image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/menu/assets/menu-anatomy.svg"
  items:
    - num: 1
      label: "Lead icon"
      text: "Optional and can be used to visually represent or reinforce the action of a menu item."
    - num: 2
      label: "Trailing cheveron"
      text: "Indicates that the menu item contains a nested submenu that will open on hover or click."
    - num: 3
      label: "Supporting text"
      text: "A secondary line of text for additional description."
    - num: 4
      label: "Divider"
      text: "Should be used to create visual groupings for related sets of menu items."
    - num: 5
      label: "Menu item"
      text: "Menus are made up of menu items in a list. Each menu item consists of a clear and concise text label that describes its action or navigation destination."
skill:
  name: recursica-skill-menu
  path: skills/components/recursica-skill-menu
  repository: https://github.com/borderux/recursica-knowledge
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Menu

**A menu displays a list of choices or actions in a temporary pop-up container. It is triggered by a user's interaction with an element like a button or dropdown, providing a compact way to present multiple options without cluttering the interface.**

## When to use

- **Dropdown lists**: As the list of options for a dropdown component.
- **Action menus**: For "ellipsis (⋮) or (⋯)" icon buttons that reveal a set of contextual actions.
- **Context menus**: To provide a list of actions related to a specific UI element, often triggered by a right-click.
- **Simple navigation**: For basic, single-level navigation dropdowns.
- **Accessibility & Best Practices**: Organize items logically, using dividers to separate distinct groups of actions.

## When to avoid

- **Primary navigation**: For the main site navigation, use a more persistent component like a navigation bar.
- **Single action**: If there is only one possible action, use a component like a button.
- **Complex content**: Avoid embedding complex forms or multi-step flows within a menu. A modal or panel is better suited for such tasks.
- **Anti-patterns**: Don't hide primary actions inside a menu. Expose them directly if space permits.

## Specifications

### Type

### Anatomy
