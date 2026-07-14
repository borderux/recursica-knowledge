---
title: "Tooltip"
description: "Recursica helps agencies build client digital products faster and more consistently. Our system streamlines design, ensures brand consistency, and improves team collaboration."
previewName: "tooltip"
specs:
  - section: "Position"
    items:
      - label: "Top"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/tooltip/assets/tooltip-position-top.svg"
      - label: "Left"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/tooltip/assets/tooltip-position-left.svg"
      - label: "Right"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/tooltip/assets/tooltip-position-right.svg"
      - label: "Bottom"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/tooltip/assets/tooltip-position-bottom.svg"
  - section: "Beak alignment"
    items:
      - label: "Start"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/tooltip/assets/tooltip-beak-alignment-start.svg"
      - label: "Middle"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/tooltip/assets/tooltip-beak-alignment-middle.svg"
      - label: "End"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/tooltip/assets/tooltip-beak-alignment-end.svg"
  - section: "Content"
    items:
      - label: "Text"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/tooltip/assets/tooltip-content-text.svg"
      - label: "Custom"
anatomy:
  image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/tooltip/assets/tooltip-anatomy.svg"
  items:
    - num: 1
      text: "A flexible slot designed for brief, supplementary text or custom content that provides non-essential clarification about an interface element."
    - num: 2
      label: "Beak"
      text: "A small caret that visually connects the tooltip to its trigger element and can be positioned on any side of the content area via the position prop."
skill:
  name: recursica-skill-tooltip
  path: skills/components/recursica-skill-tooltip
  repository: https://github.com/borderux/recursica-knowledge
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Tooltip

**A tooltip is a small, contextual pop-up that appears when a user hovers over or focuses on an element. It provides brief, supplementary information that helps clarify an element's function or meaning without cluttering the interface.**

## When to use

- **Labeling icon-only controls**: Use a tooltip to reveal the function of an icon-only button (e.g., a gear icon with a "Settings" tooltip).
- **Displaying truncated text**: Show the full text when a piece of text in the UI has been truncated with an ellipsis.
- **Providing context**: Offer short, helpful clarifications for charts, data points, or form fields where a permanent label is not necessary.
- **Accessibility & Best Practices**: Use tooltips to explain cryptic icons or provide brief, supplementary context.

## When to avoid

- **Critical information**: Never place essential information that a user must see to complete their task inside a tooltip. Content should be supplementary.
- **Interactive content**: Avoid placing interactive elements like links, inputs, or buttons inside a tooltip. For interactive pop-ups, use a popover component.
- **Touch devices**: Tooltips are primarily a desktop pattern triggered by hover. They are difficult to use on mobile and other touch-based devices. Consider alternative patterns like a bottom sheet or a toggleable info icon for these contexts.
- **Long content**: Keep tooltip text very brief and scannable. If the information is lengthy or complex, it belongs in a more persistent element like a modal or a dedicated section of the page.
- **Anti-patterns**: Avoid putting essential information or interactive elements inside a tooltip.

## Specifications

### Position

### Beak alignment

### Content

### Anatomy
