---
title: "Card"
description: "Recursica helps agencies build client digital products faster and more consistently. Our system streamlines design, ensures brand consistency, and improves team collaboration."
previewName: "card"
specs:
  - section: "Style"
    items:
      - label: "Elevation"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/card/assets/card-style-elevation.png"
      - label: "Outline"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/card/assets/card-style-outline.png"
  - section: "Slot"
    items:
      - label: "Top"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/card/assets/card-slot-top.png"
      - label: "Bottom"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/card/assets/card-slot-bottom.png"
      - label: "None"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/card/assets/card-slot-none.svg"
anatomy:
  image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/card/assets/card-anatomy.png"
  items:
    - num: 1
      text: "The header is a flexible slot for replaceable content (like an image) and can be hidden for a minimal, text-only card."
    - num: 2
      label: "Border"
      text: "Use the default border for a defined edge, or remove it and use a shadow for cards that need to appear elevated."
    - num: 3
      label: "Text content"
      text: "The content block containing a title and description can be positioned either above or below the header slot."
    - num: 4
      text: "A single, optional call-to-action button. The style of the button can be any (Primary, Outline, or Ghost)."
    - num: 5
      text: "An optional badge can be used to provide secondary status information."
    - num: 6
      label: "Header button"
      text: "A button with a set of three vertical dots (or a similar icon) that opens a menu containing secondary or contextual actions related to the card's content. It is typically hidden until accessed."
skill:
  name: recursica-skill-card
  path: skills/components/recursica-skill-card
  repository: https://github.com/borderux/recursica-knowledge
---

# Card

**A card is a flexible and extensible content container. It groups related information and actions about a single subject into a digestible, self-contained unit. Cards are a foundational component for creating scannable, grid-based layouts.**

## When to use

- **Displaying a collection of content**: Use to present a collection of items with varied content, such as articles, products, or search results, allowing users to easily compare and browse.
- **Summarizing information**: When you need to show a summary of content that links to a more detailed view (e.g. a blog post summary that links to the full article).
- **Creating modular layouts**: Cards are ideal for creating responsive, grid-based layouts that reflow easily on different screen sizes.
- **Accessibility & Best Practices**: Use cards to group related information that forms a single, coherent unit.

## When to avoid

- **For simple lists**: If the content is a simple, homogeneous list (e.g. a list of names or files), a standard menu component might be more appropriate and less visually heavy.
- **Highly detailed content**: Avoid overloading a single card with too much information. If the content is too complex for a summary, it may be better suited for a dedicated page.
- **Anti-patterns**: Avoid nesting cards within cards, which complicates the visual hierarchy.

## Specifications

### Style

### Slot

### Anatomy
