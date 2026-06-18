---
title: "Tabs"
description: "Recursica helps agencies build client digital products faster and more consistently. Our system streamlines design, ensures brand consistency, and improves team collaboration."
previewName: "tabs"
specs:
  - section: "States"
    items:
      - label: "Selected"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/tabs/assets/tabs-states-selected.svg"
      - label: "Unselected"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/tabs/assets/tabs-states-unselected.svg"
  - section: "Tab styles"
    items:
      - label: "Default"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/tabs/assets/tabs-tab-styles-default.svg"
      - label: "Outline"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/tabs/assets/tabs-tab-styles-outline.svg"
      - label: "Pills"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/tabs/assets/tabs-tab-styles-pills.svg"
  - section: "Orientation"
    items:
      - label: "Horizontal"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/tabs/assets/tabs-orientation-horizontal.svg"
      - label: "Vertical"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/tabs/assets/tabs-orientation-vertical.svg"
anatomy:
  image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/tabs/assets/tabs-anatomy.svg"
  items:
    - num: 1
      label: "Leading icon"
      text: "Optional and can be included in a tab to provide additional visual context for the label."
    - num: 2
      label: "Label"
      text: "The clickable title that describes the content of its corresponding panel."
    - num: 3
      label: "Counter"
      text: "A counter is a small number next to a tab's label. It provides a quick summary of items associated with that tab."
    - num: 4
      label: "Active indicator"
      text: "A visual marker, that clearly highlights the currently selected tab. Varies depending on the tab variant (Default, pills or outline)."
    - num: 5
      label: "Group container"
      text: "The tab group container defines the full width of the tab set. The orientation prop indicates a horizontal or vertical tab structure. The position prop alters the desired alignment or spacing of the tab group."
skill:
  name: recursica-skill-tabs
  path: skills/components/recursica-skill-tabs
  repository: https://github.com/borderux/recursica-knowledge
---

# Tabs

**Tabs organize content and allow users to switch between different views.**

## When to use

- **Sectioning content**: Use tabs to show users alternate views within the same group of context
- **Quick access**: Tabs allow users to navigate through different content without multiple steps
- **Save space**: Use tabs to save space and allow more content to be shown in a small space
- **Accessibility & Best Practices**: Ensure the active tab is highly distinguishable from inactive ones.

## When to avoid

- **Stepped or sequential content**: Avoid using tabs with sequential names that don’t give context to content, instead consider using a stepper if the user needs to be guided through content
- **Navigation**: As tabs are used to navigate within the same context, avoid using tabs as a form of navigation to different areas
- **Related content**: Avoid making users switch between tabs to see related content as it acts as a hindrance to users
- **Anti-patterns**: Don't use tabs for sequential workflows that must be completed in order (use a stepper).

## Specifications

### States

### Tab styles

### Orientation

### Anatomy
