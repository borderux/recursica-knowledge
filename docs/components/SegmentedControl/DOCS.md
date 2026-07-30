---
title: "Segmented control"
description: "Recursica helps agencies build client digital products faster and more consistently. Our system streamlines design, ensures brand consistency, and improves team collaboration."
previewName: "segmented-control"
specs:
  - section: "Default states"
    items:
      - label: "Horizontal"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/segmented-control/assets/segmented-control-default-states-horizontal.svg"
        text: "The standard layout: segments arranged from left to right, only as wide as needed for the content."
      - label: "Vertical"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/segmented-control/assets/segmented-control-default-states-vertical.svg"
        text: "Exact sizing as horizontal, but segments stacked top-to-bottom. Ideal for tight widths."
  - section: "Wide states"
    items:
      - label: "Horizontal"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/segmented-control/assets/segmented-control-wide-states-stretches-to-fill-the-available-container-width-segments-share-equal-width.svg"
        text: "Stretches to fill the available container width; segments share equal width."
      - label: "Vertical"
        image: "https://framerusercontent.com/images/1wtIZOABviyFXBEtSR0amESCsQ.svg"
        text: "Fills vertical space available; segments stacked, each taking full width of container."
anatomy:
  image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/segmented-control/assets/segmented-control-anatomy.svg"
  items:
    - num: 1
      label: "Leading icon"
      text: "Optional and can be included within each segment to provide additional visual context for the label."
    - num: 2
      label: "Control"
      text: 'The active segment highlighting a contrasting "pill" that animates to indicate the user''s current selection.'
    - num: 3
      label: "Container"
      text: "The outer shape that visually groups and houses the segments. It provides structure and a uniform background."
skill:
  name: recursica-skill-segmented-control
  path: skills/components/recursica-skill-segmented-control
  repository: https://github.com/borderux/recursica-knowledge
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Segmented control

**A segmented control is a horizontal single-select: a few options in a row, all visible, exactly one of them chosen.** Reach for it when the layout calls for a choice laid out sideways and the labels are short enough to fit.

## When to use

- **The layout wants a horizontal single-select**: this is how that is done here. Radio buttons stay vertical, and a segmented control takes the row.
- **Two to five short options**: one or two words each. If a label needs more room than that, the control is the wrong one, not the label.
- **The choice switches a view or a mode**: list or grid, daily or weekly — options tied closely to what is on screen.
- **Inline filtering**: quick, in-place filtering that would be heavy-handed in a dropdown or a modal.
- **Switching is cheap**: something is always selected, and moving between options is instant and harmless.

## When to avoid

- **More than five options**: use a vertical radio group, or a dropdown once the list runs past about seven. Tabs are not the fallback.
- **Long or complex labels**: use a vertical radio group. Long labels break the compact row, and stretching the control to fit does not raise the ceiling.
- **More than one option can be chosen**: use selectable chips in a row, or a stacked checkbox group.
- **The options are parts of one whole, each with its own content**: use tabs, which carry their own addresses. Tabs and a segmented control are not interchangeable — tabs hold the parts of one thing, a segmented control holds the values of one choice.
- **Switching triggers a slow or destructive change**: use a control the reader submits deliberately, with clear feedback when it lands.
- **The choice is simply on or off**: use a switch or a checkbox.

## Specifications

### Default states

### Wide states

### Anatomy

<!--
LEGACY — original content exported from the Recursica website, superseded by the body above.
Retained verbatim so nothing from the old site is lost. Do not render.

# Segmented control

**Segmented controls allow users to select one choice from a limited, linear set of options, often used for switching views or sorting elements.**

## When to use

- **Switching views**: Let users toggle between different layouts or modes (e.g., list vs. grid or daily vs. weekly view).
- **Inline filtering**: Provide quick filtering options without forcing users to open a dropdown or modal.
- **Exclusive choice**: Use when only one option should be active at a time from a small set (2–5 items).
- **Compact UI**: Offer a more space-efficient alternative to radio buttons in toolbars or headers.
- **Accessibility & Best Practices**: Use segmented controls to switch between related views or data sets tightly coupled to the layout.

## When to avoid

- **Too many options**: Avoid when more than five options are needed. Use Tabs or a Select component instead.
- **Long labels**: Not suitable if labels are lengthy or complex, which can break the compact layout.
- **Multiple selections**: Avoid using when users must select more than one option. Checkboxes or multi-select are better.
- **Disruptive changes**: Avoid if switching options triggers heavy reloads or disruptive actions without clear feedback.
- **Anti-patterns**: Don't use segmented controls for more than 4-5 items (use a dropdown instead).

## Specifications

### Default states

### Wide states

### Anatomy
-->
