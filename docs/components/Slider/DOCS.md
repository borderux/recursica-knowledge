---
title: "Slider"
description: "Recursica helps agencies build client digital products faster and more consistently. Our system streamlines design, ensures brand consistency, and improves team collaboration."
previewName: "slider"
specs:
  - section: "Types"
    items:
      - label: "Continuous"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/slider/assets/slider-types-continuous.svg"
      - label: "Discrete"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/slider/assets/slider-types-discrete.svg"
      - label: "Single Selection"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/slider/assets/slider-types-single-selection.svg"
      - label: "Range Selection"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/slider/assets/slider-types-range-selection.svg"
  - section: "States"
    items:
      - label: "Enabled"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/slider/assets/slider-states-enabled.svg"
      - label: "Hover"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/slider/assets/slider-states-hover.svg"
      - label: "Disabled"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/slider/assets/slider-states-disabled.svg"
anatomy:
  image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/slider/assets/slider-anatomy.svg"
  items:
    - num: 1
      label: "Label"
      text: 'Should indicate some kind of instruction for selection. If majority of fields are required in a single form, the "Option" label can be toggled on. If majority of fields are optional, the "Required asterisks" should instead be toggled on.'
    - num: 2
      label: "Track"
      text: "Represents the visual range of possible values."
    - num: 3
      label: "Value"
      text: "Indicates how much of the range was selected or progressed."
    - num: 4
      label: "Value labels"
      text: "Displays the minimum and maximum ranges of the slider."
    - num: 5
      label: "Handle"
      text: "A interactive control element that users drag along the track to select a value within the range."
    - num: 6
      label: "Input"
      text: "Optional, but highly recommended. Allows users to input precise values when applicable."
skill:
  name: recursica-skill-slider
  path: skills/components/recursica-skill-slider
  repository: https://github.com/borderux/recursica-knowledge
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Slider

**The slider lets the user make a selection from a range of values.**

## When to use

- **Touch interface**: Use sliders on mobile or touch screen for convenient value selection
- **Approximate selection, set range**: Use sliders when the user is presented with a range and when preciseness doesn’t matter
- **Instant results**: Sliders are great for things like changing volume or brightness as it makes instant changes letting the user view the results
- **Accessibility & Best Practices**: Provide a visible current value and consider allowing manual number input alongside it.

## When to avoid

- **Preciseness**: If precise values are desired and the user has a value in mind, then consider using an input instead
- **No set range**: If the user has an infinite range of possibilities, consider using an input allowing the user to enter any value they want
- **Anti-patterns**: Avoid sliders for selecting precise, discrete values without clear stepping.

## Specifications

### Types

### States

### Anatomy
