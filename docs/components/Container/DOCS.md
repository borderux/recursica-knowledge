---
title: "Container"
description: "Container centers its content horizontally and constrains it to a maximum width, providing the outermost page or section wrapper that keeps content readable on wide screens."
previewName: "container"
specs:
  - section: "Size"
    items:
      - label: "Small"
      - label: "Medium"
      - label: "Large"
      - label: "Extra large"
  - section: "Fluid"
    items:
      - label: "Fluid (100% width)"
      - label: "Constrained (max-width)"
anatomy:
  items:
    - num: 1
      label: "Container"
      text: "A single centered wrapper that constrains its content to a maximum width and centers it horizontally within the available space. When fluid, it instead takes 100% of the available width."
skill:
  name: recursica-skill-container
  path: skills/components/recursica-skill-container
  repository: https://github.com/borderux/recursica-knowledge
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Container

**Container centers its content horizontally and constrains it to a maximum width, providing the outermost page or section wrapper that keeps content readable on wide screens.**

## When to use

- **Page-level wrapper**: As the outermost wrapper for a page's main content, keeping line lengths readable on large monitors.
- **Section wrapper**: To constrain and center a distinct section of a page (e.g. a marketing section) independently of the rest of the layout.
- **Consistent reading width**: Anywhere text-heavy content needs a predictable, centered maximum width across screen sizes.
- **Accessibility & Best Practices**: Constraining line length improves readability — avoid letting body text stretch edge to edge on wide viewports.

## When to avoid

- **Full-bleed content**: When content needs to span edge to edge (e.g. a hero image or full-width band), use the `fluid` variant or skip Container entirely.
- **Nested constraints**: Avoid nesting multiple Containers to fine-tune width — adjust the `size` prop on a single Container instead.
- **Non-page layout**: For arranging a handful of elements within an already-constrained area, use Flex, Stack, Group, or Grid instead.
- **Anti-patterns**: Don't combine a fixed `size` with manual width overrides to hit a one-off measurement — pick the closest standard size.

## Specifications

### Size

### Fluid

### Anatomy
