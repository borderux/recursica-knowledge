---
name: recursica-skill-hover-card-popover
description: Trigger this when the developer asks to design, write, or refactor a UI layout containing the hover-card-popover component.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# HoverCardPopover Skill

**A hover card is a pop-up container that reveals richer content when a user hovers their cursor over a target element. It provides more detailed, on-demand information than a tooltip, without requiring a click.**

## Anatomy & Sub-components

This skill covers the following component specs defined in the UI Kit:

- `hover-card-popover`

---

## When to Use

- **Profile previews**: To show a mini user profile when hovering over an avatar or username.
  - **Product summaries**: To display a quick look at a product's details, like an image and price, when hovering over its name.
  - **Link previews**: To offer a preview, or thumbnail, of an article or page when a user hovers over a link.
  - **Accessibility & Best Practices**: Add a slight delay before showing the hover card to prevent accidental triggers.

---

## When Not to Use

- **Critical information**: Do not place essential information or primary actions (like "Submit" or "Delete") inside a hover card. Its content is not guaranteed to be seen.
  - **Simple labels**: For simple, single-line text labels (e.g., for an icon button), use a tooltip instead.
  - **Mobile devices**: Hover is not a reliable interaction on touch screens. This component is designed for desktop use. Information should be revealed by a tap on mobile, likely within a modal or popover.
  - **Anti-patterns**: Don't place critical functionality or primary actions solely inside a hover card.

---

## Best Practices

- Follow platform accessibility guidelines.
- Ensure consistent padding and alignments.

---

## Referential Libraries & Documentation

- Carbon Design System: [Carbon HoverCardPopover Documentation](https://carbondesignsystem.com)
- Material UI: [MUI HoverCardPopover Documentation](https://mui.com)
