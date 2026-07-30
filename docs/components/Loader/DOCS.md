---
title: "Loader"
description: "Recursica helps agencies build client digital products faster and more consistently. Our system streamlines design, ensures brand consistency, and improves team collaboration."
previewName: "loader"
specs:
  - section: "Types"
    items:
      - label: "Oval"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/loader/assets/loader-types-oval.svg"
        text: "A circular spinner. This is a classic, universally understood loader suitable for most use cases, especially in compact spaces."
      - label: "Bars"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/loader/assets/loader-types-bars.svg"
        text: "A series of animating vertical bars. A stylistic alternative to the oval."
      - label: "Dots"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/loader/assets/loader-types-dots.svg"
        text: "A sequence of three or more animating dots. Another alternative to the oval."
  - section: "Size"
    items:
      - label: "xs"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/loader/assets/loader-size-xs.svg"
      - label: "Sm"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/loader/assets/loader-size-sm.svg"
      - label: "Md"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/loader/assets/loader-size-md.svg"
      - label: "Lg"
        image: "https://framerusercontent.com/images/k3yDXUWfjTYvgpJ0WKA9kA9Zg.svg"
      - label: "Xl"
        image: "https://framerusercontent.com/images/Fwxp9V0AJBBR6sKhXt7f41F7g.svg"
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

**A loader says that something is happening.** It cannot say how much is done or how long is left, so pair it with a few words naming what is being loaded.

## When to use

- **A wait is real and its length is unknown**: fetching data, submitting a form, running a recalculation.
- **The wait is long enough to notice**: past roughly a third of a second. Below that, a spinner appears and vanishes, which reads as a glitch.
- **One region is loading**: scope the loader to that card, panel, or modal rather than covering the screen. A screen-wide loader is for a screen-wide wait.
- **Text can sit beside it**: "Loading invoices" rather than "Loading". The words carry the meaning; the spinner only says a wait is underway.

## When to avoid

- **The amount of work is known**: a spinner cannot show how far along something is. A determinate progress indicator can, and that is a different control.
- **The operation finishes in well under a second**: show no indicator at all. The flash is more distracting than the wait.
- **The wait is over and the result needs stating**: put text where the result belongs, or use a toast for something page-wide.
- **There is no data and there never was**: use an empty state. A spinner suggests data is on its way when nothing is coming.
- **The operation failed**: stop the spinner and show an error message that says what happened. A spinner that keeps turning tells someone the system is still trying.
- **The motion would be the only signal**: pair it with text. A turning shape says nothing to someone using a screen reader, nothing when motion is turned off in system settings, and nothing in a screenshot.

## Specifications

### Types

### Size

### Anatomy

<!--
LEGACY — original content exported from the Recursica website, superseded by the body above.
Retained verbatim so nothing from the old site is lost. Do not render.

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
-->
