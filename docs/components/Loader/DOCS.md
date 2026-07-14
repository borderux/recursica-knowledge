---
title: "Loader"
description: "Recursica helps agencies build client digital products faster and more consistently. Our system streamlines design, ensures brand consistency, and improves team collaboration."
previewName: "loader"
specs:
  - section: "Types"
    items:
      - label: "Oval"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/loader/assets/loader-types-oval.svg"
      - label: "Bars"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/loader/assets/loader-types-bars.svg"
      - label: "Dots"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/loader/assets/loader-types-dots.svg"
  - section: "Size"
    items:
      - label: "xs"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/loader/assets/loader-size-xs.svg"
      - label: "Sm"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/loader/assets/loader-size-sm.svg"
      - label: "Md"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/loader/assets/loader-size-md.svg"
anatomy:
  image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/loader/assets/loader-anatomy.svg"
  items:
    - num: 1
      label: "Track"
      text: "Represents the total progress to be completed for the animated spinner. Not all of Loader variants include a track based on the component style and animation type."
    - num: 2
      label: "Indicator"
      text: "Animates along the track to visually represent the current percentage of completion."
skill:
  name: recursica-skill-loader
  path: skills/components/recursica-skill-loader
  repository: https://github.com/borderux/recursica-knowledge
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Loader

**A loader, also known as an activity indicator or spinner, is an animated graphic that notifies users that an operation is in progress. It helps manage expectations during a waiting period of unknown duration, such as fetching data or processing a request.**

## When to use

- **Data fetching**: When loading data from a server or API to populate a page or component.
- **Form submissions**: Display after a user submits a form to indicate that their submission is being processed.
- **In-place loading**: Use within a specific component (like a card or modal) when only that section of the UI is loading new content.
- **Page transitions**: Display a loader during initial page loads or when navigating between complex views.
- **Accessibility & Best Practices**: Use loaders for operations taking longer than 300ms, and pair with text explaining what is happening.

## When to avoid

- **Determinate processes**: If a process has a known duration or progress (like a file upload), use a progress bar instead. A progress bar is more informative as it shows how much is complete.
- **Very fast actions**: Avoid showing a loader for operations that complete in under a second. A brief flash of a loader can be more distracting than helpful.
- **Anti-patterns**: Avoid flashing loaders for near-instant operations.

## Specifications

### Types

### Size

### Anatomy
