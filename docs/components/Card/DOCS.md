---
title: "Card"
description: "Recursica helps agencies build client digital products faster and more consistently. Our system streamlines design, ensures brand consistency, and improves team collaboration."
previewName: "card"
specs:
  - section: "Style"
    items:
      - label: "Elevation"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/card/assets/card-style-elevation.png"
        text: "Use a shadow to create depth off the surface layer. Best for layouts where cards need to stand out."
      - label: "Outline"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/card/assets/card-style-outline.png"
        text: "Uses a simple 1px border to contain the content for a flatter, more minimalist UI."
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
      label: "Slot"
      text: "The header is a flexible slot for replaceable content (like an image) and can be hidden for a minimal, text-only card."
    - num: 2
      label: "Border"
      text: "Use the default border for a defined edge, or remove it and use a shadow for cards that need to appear elevated."
    - num: 3
      label: "Text content"
      text: "The content block containing a title and description can be positioned either above or below the header slot."
    - num: 4
      label: "Button"
      text: "A single, optional call-to-action button. The style of the button can be any (Primary, Outline, or Ghost)."
    - num: 5
      label: "Badge"
      text: "An optional badge can be used to provide secondary status information."
    - num: 6
      label: "Header button"
      text: "A button with a set of three vertical dots (or a similar icon) that opens a menu containing secondary or contextual actions related to the card's content. It is typically hidden until accessed."
skill:
  name: recursica-skill-card
  path: skills/components/recursica-skill-card
  repository: https://github.com/borderux/recursica-knowledge
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Card

**A card separates one repeating object from its peers.** It is not a general container for whatever needs grouping — grouping is done with space, and a drawn boundary has to be earned. Overuse is the usual failure: screens turn into nested boxes because a card looks like a safe way to tidy things up.

## When to use

- **There is a set of repeating objects of the same type**: several products, records, or search results, each built from the same information in the same arrangement.
- **The set is small and finite**: bounded and short enough to take in at a glance.
- **Each one holds something visual**: a chart, an image, or a photograph — content a table row could not carry legibly.
- **Peers would otherwise blur together**: where the boundary between one object and the next is genuinely at risk of being misread.
- **Occasionally, because it simply looks better**: a small, repeating, text-only set can be a legitimate exception. It should stay rare — if most card sets in an application rest on it, the reasoning has drifted.

## When to avoid

- **The set is large, unbounded, or growing**: use a table. High plurality is a table, with no exception.
- **The content is only text and numbers**: use a table. Without something visual in each one, cards add weight and take away comparison.
- **You are showing one object's properties**: use a detail view or a form. A single object is never a card.
- **A form, a form section, or a single form control**: never put one in a card. A form is one object's properties rather than a set of peers, so the box has nothing to separate, and the spacing a form needs is already built in.
- **A region of a page needs to read as a unit**: use white space and type hierarchy. A region of a page does not need a box around it.
- **You want to contain a chart or a table**: leave it be — a chart or a table is already an object. And never nest a card inside a card or build a whole screen out of them; a dashboard is a layout with hierarchy, not a grid of equal boxes.

## Specifications

### Style

### Slot

### Anatomy

<!--
LEGACY — original content exported from the Recursica website, superseded by the body above.
Retained verbatim so nothing from the old site is lost. Do not render.

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
-->
