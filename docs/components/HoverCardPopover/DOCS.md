---
title: "Hover card"
description: "Recursica helps agencies build client digital products faster and more consistently. Our system streamlines design, ensures brand consistency, and improves team collaboration."
previewName: "hover-card"
specs:
  - section: "Content types"
    items:
      - label: "Text"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/hover-card/assets/hover-card-content-types-text.svg"
      - label: "Custom"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/hover-card/assets/hover-card-content-types-custom.svg"
  - section: "Behavior"
    items:
      - label: "Trigger"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/hover-card/assets/hover-card-behavior-trigger.svg"
      - label: "Dismissal"
anatomy:
  image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/hover-card/assets/hover-card-anatomy.svg"
  items:
    - num: 1
      label: "Container"
      text: "The floating card that appears and holds the content."
    - num: 2
      label: "Content"
      text: 'The information displayed inside the container, which can be simple "Text" or a "Custom" component.'
skill:
  name: recursica-skill-hover-card-popover
  path: skills/components/recursica-skill-hover-card-popover
  repository: https://github.com/borderux/recursica-knowledge
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Hover card

**A hover card is a pop-up container that reveals richer content when a user hovers their cursor over a target element. It provides more detailed, on-demand information than a tooltip, without requiring a click.**

## When to use

- **Profile previews**: To show a mini user profile when hovering over an avatar or username.
- **Product summaries**: To display a quick look at a product's details, like an image and price, when hovering over its name.
- **Link previews**: To offer a preview, or thumbnail, of an article or page when a user hovers over a link.
- **Accessibility & Best Practices**: Add a slight delay before showing the hover card to prevent accidental triggers.

## When to avoid

- **Critical information**: Do not place essential information or primary actions (like "Submit" or "Delete") inside a hover card. Its content is not guaranteed to be seen.
- **Simple labels**: For simple, single-line text labels (e.g., for an icon button), use a tooltip instead.
- **Mobile devices**: Hover is not a reliable interaction on touch screens. This component is designed for desktop use. Information should be revealed by a tap on mobile, likely within a modal or popover.
- **Anti-patterns**: Don't place critical functionality or primary actions solely inside a hover card.

## Specifications

### Content types

### Behavior

### Anatomy
