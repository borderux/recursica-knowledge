---
title: "Flex"
description: "Flex is a bare-metal layout primitive that exposes standard CSS flexbox behavior — direction, wrapping, alignment, and gap — for building custom one-off arrangements."
previewName: "flex"
specs:
  - section: "Direction"
    items:
      - label: "Row"
      - label: "Column"
      - label: "Row reverse"
      - label: "Column reverse"
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
      text: "A single unstyled flex container. Recursica intercepts the gap and margin props to enforce token-based spacing (the rec-* scale); direction, wrap, align, and justify pass through as native CSS flexbox values."
skill:
  name: recursica-skill-flex
  path: skills/components/recursica-skill-flex
  repository: https://github.com/borderux/recursica-knowledge
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Flex

**Flex is a bare-metal layout primitive that exposes standard CSS flexbox behavior — direction, wrapping, alignment, and gap — for assembling one-off arrangements that don't fit a more opinionated structural component.**

## When to use

- **Ad hoc arrangements**: When content needs custom flexbox behavior that doesn't match the fixed vertical/horizontal shape of Stack or Group.
- **Building block for composite layouts**: As the underlying primitive when constructing a more specific layout pattern that isn't yet a first-class Recursica component.
- **Mixed-direction responsiveness**: When a layout needs to switch between row and column arrangement at different breakpoints.
- **Accessibility & Best Practices**: Flex has no semantic meaning of its own — ensure the content placed inside still communicates structure via proper headings, landmarks, or list semantics.

## When to avoid

- **Simple vertical lists**: Use Stack instead of configuring Flex with `direction="column"` by hand.
- **Simple horizontal rows**: Use Group instead of configuring Flex with `direction="row"` by hand.
- **Multi-column, reflowing layouts**: Use Grid once content needs to wrap across a fixed column count or responsive spans, rather than faking it with wrapped Flex items.
- **Anti-patterns**: Don't reach for Flex as a generic escape hatch when a more specific layout component (Stack, Group, Grid, Container) already models the intended structure.

## Specifications

### Direction

### Alignment

### Wrap

### Anatomy
