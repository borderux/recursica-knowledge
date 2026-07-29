---
title: "Group"
description: "Group arranges children in a single horizontal row with consistent, token-driven spacing between them, wrapping onto new lines when space runs out."
previewName: "group"
specs:
  - section: "Gap"
    items:
      - label: "rec-none"
      - label: "rec-sm"
      - label: "rec-default"
      - label: "rec-md"
      - label: "rec-lg"
      - label: "rec-xl"
      - label: "rec-2xl"
  - section: "Alignment"
    items:
      - label: "Align items"
      - label: "Justify content"
  - section: "Wrap"
    items:
      - label: "Wrap"
      - label: "No wrap"
anatomy:
  items:
    - num: 1
      label: "Container"
      text: "A single unstyled horizontal flex container. Children flow left to right with token-driven gap spacing (the rec-* scale) between each sibling, wrapping onto new lines when space runs out (unless wrap is disabled)."
skill:
  name: recursica-skill-group
  path: skills/components/recursica-skill-group
  repository: https://github.com/borderux/recursica-knowledge
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Group

**Group arranges its children in a single horizontal row with consistent, token-driven spacing between them, wrapping onto new lines when space runs out. It's the horizontal counterpart to Stack.**

## When to use

- **Toolbars and action rows**: Arranging a row of buttons, icons, or controls with even spacing.
- **Inline metadata**: Laying out short pieces of related information side by side (e.g. a timestamp next to an author name).
- **Horizontally aligned form controls**: Placing a label and its control, or several small controls, in a single row.
- **Accessibility & Best Practices**: Group only controls visual spacing and wrapping — ensure focus order still makes sense when content wraps onto multiple lines.

## When to avoid

- **Vertical lists**: Use Stack instead for content that should flow top to bottom.
- **Multi-column, responsive layouts**: Use Grid once content needs to reflow across a fixed column count at different breakpoints, rather than relying on wrap behavior alone.
- **A single child**: If there's only one item, Group adds no value — skip the wrapper.
- **Anti-patterns**: Don't disable `wrap` on content that must remain responsive on narrow viewports; use Grid with responsive spans for that case instead.

## Specifications

### Gap

### Alignment

### Wrap

### Anatomy
