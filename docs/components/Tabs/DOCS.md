---
title: "Tabs"
description: "Recursica helps agencies build client digital products faster and more consistently. Our system streamlines design, ensures brand consistency, and improves team collaboration."
previewName: "tabs"
specs:
  - section: "States"
    items:
      - label: "Selected"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/tabs/assets/tabs-states-selected.svg"
        text: "This state is applied to the active tab, indicating the content pane that is currently visible to the user. Only one tab can be in the selected state at a time."
      - label: "Unselected"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/tabs/assets/tabs-states-unselected.svg"
        text: "This state is applied to all other tabs that are not currently active. These tabs are ready to be activated but are not currently displaying their associated content."
  - section: "Tab styles"
    items:
      - label: "Default"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/tabs/assets/tabs-tab-styles-default.svg"
        text: "This standard style is characterized by an active indicator, a colored line, that highlights the selected tab."
      - label: "Outline"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/tabs/assets/tabs-tab-styles-outline.svg"
        text: "Emulates a physical folder system where the selected tab looses its bottom border to connect it with content below."
      - label: "Pills"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/tabs/assets/tabs-tab-styles-pills.svg"
        text: "The pills style encloses tabs in a rounded container. The selected tab is highlighted with a filled background, giving it a button-like look."
  - section: "Orientation"
    items:
      - label: "Horizontal"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/tabs/assets/tabs-orientation-horizontal.svg"
        text: "Use horizontal tabs for top-level navigation, to save vertical screen space, and when all tab labels are concise."
      - label: "Vertical"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/tabs/assets/tabs-orientation-vertical.svg"
        text: "Use vertical tabs for secondary navigation, particularly for complex settings or deep content hierarchies."
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
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Tabs

**Tabs switch between parts of one whole — folders in a single file drawer.** Reach for them when every section is about the same subject and the reader could reasonably look at any of them first.

## When to use

- **The panels are peers of one subject**: every tab covers the same object from a different angle.
- **Order does not matter**: nothing in the third tab depends on the first having been visited.
- **One click between sections**: the reader moves from any tab to any other with no intermediate step.
- **A noun names each tab well**: "Overview", "Members", "Billing". If you find yourself numbering them, this is not a tab set.

## When to avoid

- **The sections must be completed in order**: use a stepper. Tabs make no promise about sequence, so nothing tells the reader where to start.
- **A form is too long for one screen**: use a stepper. A half-filled form behind an unselected tab hides both the remaining work and the errors in it.
- **The sections are different areas of the application**: use navigation. Tabs say "still the same thing"; navigation says "somewhere else".
- **The reader needs to compare content across sections**: show both in one view. Tabs hide exactly what is being compared.
- **The sections are long-form reference content**: use an accordion, so the reader can open what they need and skim the rest.
- **The tabs do not fit the space**: use fewer or shorter tabs, or a vertical set. Avoid wrapping them onto a second line, scrolling them, or hiding the remainder in a menu — a tab the reader cannot see is a section they will not find.

## Specifications

### States

### Tab styles

### Orientation

### Anatomy

<!--
LEGACY — original content exported from the Recursica website, superseded by the body above.
Retained verbatim so nothing from the old site is lost. Do not render.

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
-->
