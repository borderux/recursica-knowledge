---
name: recursica-skill-tooltip
description: Trigger this when the developer asks to design, write, or refactor a UI layout containing the tooltip component.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Tooltip Skill

**A tooltip is a small, contextual pop-up that appears when a user hovers over or focuses on an element. It provides brief, supplementary information that helps clarify an element's function or meaning without cluttering the interface.**

## Anatomy & Sub-components

This skill covers the following component specs defined in the UI Kit:

- `tooltip`

---

## When to Use

- **Labeling icon-only controls**: Use a tooltip to reveal the function of an icon-only button (e.g., a gear icon with a "Settings" tooltip).
  - **Displaying truncated text**: Show the full text when a piece of text in the UI has been truncated with an ellipsis.
  - **Providing context**: Offer short, helpful clarifications for charts, data points, or form fields where a permanent label is not necessary.
  - **Accessibility & Best Practices**: Use tooltips to explain cryptic icons or provide brief, supplementary context.

---

## When Not to Use

- **Critical information**: Never place essential information that a user must see to complete their task inside a tooltip. Content should be supplementary.
  - **Interactive content**: Avoid placing interactive elements like links, inputs, or buttons inside a tooltip. For interactive pop-ups, use a popover component.
  - **Touch devices**: Tooltips are primarily a desktop pattern triggered by hover. They are difficult to use on mobile and other touch-based devices. Consider alternative patterns like a bottom sheet or a toggleable info icon for these contexts.
  - **Long content**: Keep tooltip text very brief and scannable. If the information is lengthy or complex, it belongs in a more persistent element like a modal or a dedicated section of the page.
  - **Anti-patterns**: Avoid putting essential information or interactive elements inside a tooltip.

---

## Best Practices

- Follow platform accessibility guidelines.
- Ensure consistent padding and alignments.

---

## Referential Libraries & Documentation

- Carbon Design System: [Carbon Tooltip Documentation](https://carbondesignsystem.com)
- Material UI: [MUI Tooltip Documentation](https://mui.com)
