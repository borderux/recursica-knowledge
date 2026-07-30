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
        text: "Displays a simple, plain text string."
      - label: "Custom"
        image: "https://framerusercontent.com/images/taKUtIL5Q6rKPh7zvCd2U5831GQ.svg"
        text: "Allows for embedding a custom component or a more complex layout within the tooltip."
anatomy:
  image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/tooltip/assets/tooltip-anatomy.svg"
  items:
    - num: 1
      label: "Content"
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

**A tooltip is a short text label for a control that has no visible one.** Reach for it on an icon-only button, or to show text in full when it has been shortened with an ellipsis.

## When to use

- **The control is icon-only**: an icon on its own rarely names its action, so every icon-only button gets a tooltip.
- **Visible text has been shortened with an ellipsis**: the tooltip shows the whole value.
- **One clarifying phrase for an unusual function**: only where the label is already good and a newcomer might still not guess what the control does.
- **The content is genuinely supplementary**: a tooltip that appears on hover is not available to someone using a keyboard, and there is no hover at all on a touch screen, so nothing in it can be the only copy of a piece of information.

## When to avoid

- **The information is needed to finish the task**: put it on the page, in view, where nobody has to go looking for it.
- **The content is richer than a short phrase**: use a hover card or popover, which is built to hold more.
- **The content holds a link, a button, or any other control**: use a popover. Keeping a pointer on the trigger while reaching for something inside the tooltip is a trap.
- **A button's label is weak**: write a better label. A tooltip never rescues one.
- **A field needs a format rule, a hint, or an error message**: use assistive text under the field, which stays visible while the reader types.
- **A column is so narrow that every cell is truncated**: fix the columns. Truncating text and annotating it with a tooltip is a coping mechanism, not a fix.

## Specifications

### Position

### Beak alignment

### Content

### Anatomy

<!--
LEGACY — original content exported from the Recursica website, superseded by the body above.
Retained verbatim so nothing from the old site is lost. Do not render.

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
-->
