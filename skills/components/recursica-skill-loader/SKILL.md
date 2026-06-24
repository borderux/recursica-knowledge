---
name: recursica-skill-loader
description: Trigger this when the developer asks to design, write, or refactor a UI layout containing the loader component.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Loader Skill

**A loader, also known as an activity indicator or spinner, is an animated graphic that notifies users that an operation is in progress. It helps manage expectations during a waiting period of unknown duration, such as fetching data or processing a request.**

## Anatomy & Sub-components

This skill covers the following component specs defined in the UI Kit:

- `loader`

---

## When to Use

- **Data fetching**: When loading data from a server or API to populate a page or component.
  - **Form submissions**: Display after a user submits a form to indicate that their submission is being processed.
  - **In-place loading**: Use within a specific component (like a card or modal) when only that section of the UI is loading new content.
  - **Page transitions**: Display a loader during initial page loads or when navigating between complex views.
  - **Accessibility & Best Practices**: Use loaders for operations taking longer than 300ms, and pair with text explaining what is happening.

---

## When Not to Use

- **Determinate processes**: If a process has a known duration or progress (like a file upload), use a progress bar instead. A progress bar is more informative as it shows how much is complete.
  - **Very fast actions**: Avoid showing a loader for operations that complete in under a second. A brief flash of a loader can be more distracting than helpful.
  - **Anti-patterns**: Avoid flashing loaders for near-instant operations.

---

## Best Practices

- Follow platform accessibility guidelines.
- Ensure consistent padding and alignments.

---

## Referential Libraries & Documentation

- Carbon Design System: [Carbon Loader Documentation](https://carbondesignsystem.com)
- Material UI: [MUI Loader Documentation](https://mui.com)
