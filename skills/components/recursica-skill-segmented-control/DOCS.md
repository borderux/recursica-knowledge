---
title: "Segmented control"
description: "Recursica helps agencies build client digital products faster and more consistently. Our system streamlines design, ensures brand consistency, and improves team collaboration."
previewName: "segmented-control"
specs:
  - section: "Default states"
    items:
      - label: "Horizontal"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/segmented-control/assets/segmented-control-default-states-horizontal.svg"
      - label: "Vertical"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/segmented-control/assets/segmented-control-default-states-vertical.svg"
  - section: "Wide states"
    items:
      - label: "Stretches to fill the available container width; segments share equal width."
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/segmented-control/assets/segmented-control-wide-states-stretches-to-fill-the-available-container-width-segments-share-equal-width.svg"
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
---

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
