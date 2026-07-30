---
title: "Breadcrumb"
description: "Recursica helps agencies build client digital products faster and more consistently. Our system streamlines design, ensures brand consistency, and improves team collaboration."
previewName: "breadcrumb"
specs:
  - section: "Content"
    items:
      - label: "Label only"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/breadcrumb/assets/breadcrumb-content-label-only.svg"
        text: "Use labels only for the standard navigational trail to maintain the lightweight breadcrumb pattern and ensure high scannability."
      - label: "Icon + Label"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/breadcrumb/assets/breadcrumb-content-icon-label.svg"
        text: "Use this to reinforce the section that the label refers to."
      - label: "Icon only"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/breadcrumb/assets/breadcrumb-content-icon-only.svg"
        text: "Use this only for highly compact interfaces where the icon is universally understood (like a Home/Product link) and no space for a label exists."
      - label: "Mixed"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/breadcrumb/assets/breadcrumb-content-mixed.svg"
        text: "Mix and match properties to display the clickable element with only an icon, and the non-clickable element with an icon and a label."
anatomy:
  image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/breadcrumb/assets/breadcrumb-anatomy.svg"
  items:
    - num: 1
      label: "Icon"
      text: "Add an icon to a breadcrumb link only when it provides immediate and unambiguous meaning, helping users to quickly scan and identify their place in the navigation trail."
    - num: 2
      label: "Interactive"
      text: "Directs user to a previous page in the breadcrumb trail."
    - num: 3
      label: "Read-only"
      text: "Helps represent the current page the user is on."
skill:
  name: recursica-skill-breadcrumb
  path: skills/components/recursica-skill-breadcrumb
  repository: https://github.com/borderux/recursica-knowledge
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Breadcrumb

**A breadcrumb states where the current page sits in the hierarchy and gives a way back up it.** It is supplementary wayfinding — useful alongside the navigation, never a substitute for it. The last item is the page you are on, and it is not a link to itself.

## When to use

- **The structure is genuinely nested**: the page sits more than one level down.
- **The page has to answer "where am I" by itself**: even with the navigation off screen, the trail plus the heading say where you are.
- **The path runs through several levels or categories**: a trail keeps orientation across a deep hierarchy.
- **The trail reflects structure, not history**: two people who arrive at the same page from different directions see the same crumbs.
- **Each label names its destination**: the crumb matches the heading you land on, so arriving confirms the trail rather than contradicting it.

## When to avoid

- **The application is only one or two levels deep**: use headings. A clear heading hierarchy already expresses location.
- **It would be the only way back to the parent**: use real navigation — a sidebar or a top bar. Removing the trail should never trap anyone in a section.
- **Location is already unambiguous from the heading and the navigation**: leave it out. A redundant trail is clutter.
- **Someone is moving through ordered steps in a process**: use a stepper.
- **Someone is switching between parts of one page**: use tabs.
- **You want to record where someone has been**: show the hierarchy instead. A breadcrumb is structural, not a history log.

## Specifications

### Content

### Anatomy

<!--
LEGACY — original content exported from the Recursica website, superseded by the body above.
Retained verbatim so nothing from the old site is lost. Do not render.

# Breadcrumb

**Breadcrumbs visually show the platform’s structural hierarchy, helping users to understand the path they’ve taken, allowing them to navigate easily.**

## When to use

- **Nested structure**: Use breadcrumbs when a platform has a complex structure composed of nested links to allow users to better navigate and understand it.
- **Promote wayfinding**: Breadcrumbs are effective for long navigation paths where users may traverse multiple levels or categories. It helps users maintain orientation and context, especially when navigating through deep hierarchies or extensive content.
- **Accessibility & Best Practices**: Always clearly mark the current page (usually the last item) and leave it unlinked.

## When to avoid

- **Shallow navigation**: If the platform/application has only a few levels or pages, breadcrumbs may not be necessary and users can rely on primary navigation menus or buttons
- **Redundant navigation**: Avoid using where the navigation path is clearly indicated by other UI elements or contextual clues
- **Anti-patterns**: Don't use breadcrumbs as the primary navigation. They are a supplementary wayfinding tool.

## Specifications

### Content

### Anatomy
-->
