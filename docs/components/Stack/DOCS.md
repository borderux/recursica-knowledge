---
title: "Stack"
description: "Stack arranges children in a single vertical column with consistent, token-driven spacing between them — the default way to lay out a list of blocks without managing margins by hand."
previewName: "stack"
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
anatomy:
  items:
    - num: 1
      label: "Container"
      text: "A single unstyled vertical flex container. Children stack top to bottom with token-driven gap spacing (the rec-* scale) between each sibling."
skill:
  name: recursica-skill-stack
  path: skills/components/recursica-skill-stack
  repository: https://github.com/borderux/recursica-knowledge
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Stack

**Stack arranges its children in a single vertical column with consistent, token-driven spacing between them. It's the default way to lay out a list of blocks — form fields, cards, page sections — without manually managing margins.**

## When to use

- **Vertical rhythm**: Any time a set of blocks needs consistent, even spacing stacked top to bottom.
- **Form layout**: Arranging form fields or field groups vertically.
- **List-like content**: Rendering a list of cards, rows, or sections where each item spans the full available width.
- **Accessibility & Best Practices**: Stack only controls visual spacing — use semantic list markup (`<ul>`/`<ol>`) separately when the content is actually a list.

## When to avoid

- **Horizontal layouts**: Use Group instead for content that should flow left to right.
- **Multi-column, responsive layouts**: Use Grid once content needs to reflow across a fixed column count at different breakpoints.
- **A single child**: If there's only one item, Stack adds no value — skip the wrapper.
- **Anti-patterns**: Don't hand-roll `margin-bottom` spacing between siblings to simulate vertical rhythm; use Stack's `gap` instead.

## Specifications

### Gap

### Alignment

### Anatomy
