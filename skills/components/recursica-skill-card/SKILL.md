---
name: recursica-skill-card
description: Trigger this when the developer asks to design, write, or refactor a UI layout containing the card component.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Card Skill

**A card is a flexible and extensible content container. It groups related information and actions about a single subject into a digestible, self-contained unit. Cards are a foundational component for creating scannable, grid-based layouts.**

## Anatomy & Sub-components

This skill covers the following component specs defined in the UI Kit:

- `card`

---

## When to Use

- **Displaying a collection of content**: Use to present a collection of items with varied content, such as articles, products, or search results, allowing users to easily compare and browse.
  - **Summarizing information**: When you need to show a summary of content that links to a more detailed view (e.g. a blog post summary that links to the full article).
  - **Creating modular layouts**: Cards are ideal for creating responsive, grid-based layouts that reflow easily on different screen sizes.
  - **Accessibility & Best Practices**: Use cards to group related information that forms a single, coherent unit.

---

## When Not to Use

- **For simple lists**: If the content is a simple, homogeneous list (e.g. a list of names or files), a standard menu component might be more appropriate and less visually heavy.
  - **Highly detailed content**: Avoid overloading a single card with too much information. If the content is too complex for a summary, it may be better suited for a dedicated page.
  - **Anti-patterns**: Avoid nesting cards within cards, which complicates the visual hierarchy.

---

## Best Practices

- Follow platform accessibility guidelines.
- Ensure consistent padding and alignments.

---

## Referential Libraries & Documentation

- Carbon Design System: [Carbon Card Documentation](https://carbondesignsystem.com)
- Material UI: [MUI Card Documentation](https://mui.com)
