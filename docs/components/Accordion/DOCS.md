---
title: "Accordion"
description: "Recursica helps agencies build client digital products faster and more consistently. Our system streamlines design, ensures brand consistency, and improves team collaboration."
previewName: "accordion"
specs:
  - section: "States"
    items:
      - label: "Collapsed"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/accordion/assets/accordion-states-collapsed.svg"
      - label: "Expanded"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/accordion/assets/accordion-states-expanded.svg"
anatomy:
  image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/accordion/assets/accordion-anatomy.svg"
  items:
    - num: 1
      label: "Title"
      text: "The title should give users a brief understanding of what the accordion contains."
    - num: 2
      label: "Slot"
      text: "The slot allows designers to swap in unique content for the accordion such as text, images, form fields and more."
    - num: 3
      label: "Icon"
      text: "The chevron will indicate whether the accordion is open or closed."
    - num: 4
      label: "Divider"
      text: "The divider can be hidden if accordion is the last child in a list or accordion group."
skill:
  name: recursica-skill-accordion
  path: skills/components/recursica-skill-accordion
  repository: https://github.com/borderux/recursica-knowledge
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Accordion

**An accordion collapses peer sections of content so someone opens only the one they need.** Reach for it when a page carries more sections than anyone needs at once, and working through them one at a time is the natural way. Panels start collapsed, and the set stays one level deep.

## When to use

- **There are more sections than the reader needs at once**: reading one at a time is how the page is meant to be used.
- **The sections are peers**: one level, side by side, none contained in another.
- **A navigation group with no landing page of its own**: it reveals its sub-items in place instead of going somewhere.
- **A table row has sub-detail**: a single level of expand and collapse on that row.
- **The header labels can be chosen from while closed**: if someone has to open a section to learn what is in it, the label is the thing to fix.

## When to avoid

- **The content has more than one level of nesting**: use a tree. Real hierarchy needs a structure built for it, and an accordion inside an accordion gets lost fast.
- **The content is needed frequently**: show it. Anything behind a header costs a click every single time.
- **The page is short to begin with**: leave it open. Collapsing a sparse page only makes it feel emptier.
- **The sections are parts of one whole someone flips between**: use tabs.
- **The content is a form, or part of one**: use a page, or a stepper for a multi-part form. Entry is not sectioned content, and a form split across panels is easy to half-finish.
- **The content is on the critical path**: put it on the page, uncollapsed. Hiding what someone must read to act is the one thing progressive disclosure does not excuse.

## Specifications

### States

### Anatomy

<!--
LEGACY — original content exported from the Recursica website, superseded by the body above.
Retained verbatim so nothing from the old site is lost. Do not render.

# Accordion

**Accordions allow users to show and hide sections on a page.**

## When to use

- **Display grouping**: Use accordions to group together content in a single area
- **Segment content**: Guide users by separating content into different sections allowing them to move one at a time
- **Maximize space**: Use accordions to save space and only show what’s necessary to the user in the moment
- **Accessibility & Best Practices**: Ensure the accordion supports keyboard navigation (Space/Enter to toggle).

## When to avoid

- **User access**: Avoid using accordions when users to need to access the content inside frequently
- **Little content**: When there’s little content on the page, avoid using accordions so the page doesn’t feel too empty
- **Complex content**: If the content within an accordion is too complex or has too many levels, avoid using an accordion as space can be limited
- **Anti-patterns**: Avoid hiding critical path information that the user must read to proceed.

## Specifications

### States

### Anatomy
-->
