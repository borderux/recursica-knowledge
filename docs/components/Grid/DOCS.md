---
title: "Grid"
description: "Grid is a responsive, column-based layout system for arranging content into rows that reflow across breakpoints, from a single stacked column on mobile to multiple columns on larger screens."
previewName: "grid"
specs:
  - section: "Columns"
    items:
      - label: "12 columns (default)"
      - label: "Custom column count"
  - section: "Gap"
    items:
      - label: "rec-none"
      - label: "rec-sm"
      - label: "rec-default"
      - label: "rec-md"
      - label: "rec-lg"
      - label: "rec-xl"
      - label: "rec-2xl"
  - section: "Responsive span"
    items:
      - label: "Fixed span"
      - label: "Per-breakpoint span"
  - section: "Behavior"
    items:
      - label: "Grow"
      - label: "Offset"
      - label: "Order"
      - label: "Visible from / Hidden from"
anatomy:
  items:
    - num: 1
      label: "Grid"
      text: "The root container. Defines the total number of columns in a row (default 12) and the gap between columns and rows."
    - num: 2
      label: "Grid.Col"
      text: "An individual column within the Grid. Declares how many of the parent's columns it spans, its offset and order, and at which breakpoints it should be visible or hidden. Span, offset, and order can each be a fixed value or a per-breakpoint object so a column can reflow differently across screen sizes."
skill:
  name: recursica-skill-grid
  path: skills/components/recursica-skill-grid
  repository: https://github.com/borderux/recursica-knowledge
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Grid

**Grid is a responsive, column-based layout system for arranging content into rows that reflow across breakpoints. Each Grid.Col declares how many of the parent's columns it spans, letting a layout adapt from a single stacked column on mobile to a multi-column arrangement on larger screens.**

## When to use

- **Dashboard and card layouts**: Arranging a collection of cards or panels into a responsive multi-column layout.
- **Responsive forms**: Placing form fields side by side on wide screens that stack to full width on narrow ones.
- **Multi-column page sections**: Any section whose content should reflow between one and several columns depending on available width.
- **Accessibility & Best Practices**: Grid controls visual order and reflow only — ensure the underlying DOM/reading order still makes sense, especially when using `order` to reorder columns visually.

## When to avoid

- **Single-axis lists**: Use Stack (vertical) or Group (horizontal) for content that only ever needs one row or one column.
- **One-off arrangements with no reflow need**: Use Flex for a single custom arrangement that doesn't need responsive column spans.
- **A single row that never changes**: If the arrangement never needs to reflow across breakpoints, Group is simpler than a 1-row Grid.
- **Anti-patterns**: Don't nest a Grid just to reproduce Flex or Stack behavior for a single row or column; use those primitives directly.

## Specifications

### Columns

### Gap

### Responsive span

### Behavior

### Anatomy
