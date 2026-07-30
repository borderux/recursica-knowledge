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

**A menu is a temporary list of choices or actions that a trigger opens and dismissal closes.** It opens on click, never on hover — steering a pointer through a menu that appears under the cursor is fiddly for everyone and impossible for some.

## When to use

- **One object has several actions on it**: the ellipsis or "more" menu that collects them once a row has more than one action.
- **A control needs an option list**: a menu is what a dropdown or an autocomplete opens. The field owns the value; the menu owns the list.
- **A configuration entry point needs somewhere to open**: the gear beside a table that reveals which columns are shown, for example.
- **A global utility needs its actions**: the account menu, which does not belong in primary navigation.

## When to avoid

- **There is only one action**: use a button. A menu holding one item is a click someone did not need.
- **It is the primary action on a surface or a row**: use a visible button. A menu is where secondary and tertiary actions go once the primary one has been named.
- **It would carry primary or secondary navigation**: use persistent navigation. An overflow menu is never the way to make a navigation bar fit — use fewer, shorter items instead.
- **The list has outgrown what fits**: a very long menu is a sign the structure needs rethinking. Fewer items, or a different arrangement.
- **The content is a form or a multi-step flow**: use a modal or a panel, which have room for it.
- **The chosen value has to stay visible in a field**: use a dropdown. A menu closes and takes the list with it.

## Specifications

### Type

### Anatomy

<!--
LEGACY — original content exported from the Recursica website, superseded by the body above.
Retained verbatim so nothing from the old site is lost. Do not render.

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
-->
