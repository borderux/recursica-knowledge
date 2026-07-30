---
title: "Slider"
description: "Recursica helps agencies build client digital products faster and more consistently. Our system streamlines design, ensures brand consistency, and improves team collaboration."
previewName: "slider"
specs:
  - section: "Types"
    items:
      - label: "Continuous"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/slider/assets/slider-types-continuous.svg"
        text: "Allows the user to select any value within a defined minimum and maximum range. The movement of the thumb along the track is smooth and continuous, allowing for precise adjustments across all fractional values."
      - label: "Discrete"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/slider/assets/slider-types-discrete.svg"
        text: "Constrains the user's selection to a specific set of fixed values (steps) within the range. Markers along the track typically indicate the available selection points, and the thumb will snap to the nearest valid step when adjusted."
      - label: "Single Selection"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/slider/assets/slider-types-single-selection.svg"
        text: "A general term for any slider (continuous or discrete) that uses a single thumb to select a single value point within a range. This type is used when the user only needs to define one threshold or setting."
      - label: "Range Selection"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/slider/assets/slider-types-range-selection.svg"
        text: "Features two thumbs (a start value and an end value). It allows the user to select a contiguous range of values, defining both a minimum and a maximum boundary simultaneously."
  - section: "States"
    items:
      - label: "Enabled"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/slider/assets/slider-states-enabled.svg"
        text: "The default state where the slider is fully interactive. The user can drag the thumb to adjust the value. The track and thumb are clearly visible and typically use primary or accent colors."
      - label: "Hover"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/slider/assets/slider-states-hover.svg"
        text: "The state that appears when the user's cursor is positioned directly over the slider's thumb or the track, often by showing an enlarged thumb and/or a tooltip (value label)."
      - label: "Disabled"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/slider/assets/slider-states-disabled.svg"
        text: "The non-interactive state where the user cannot adjust the slider's value. The component is visually grayed out/faded to signal that it is currently unavailable or locked."
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

**A slider picks a value from a bounded range by moving a thumb along a track.** Reach for it when "about here" is good enough and the result is visible straight away. Always show the chosen value as a number beside it, so the reader knows what they have landed on.

## When to use

- **The range is bounded and known**: there is a real minimum and a real maximum, and both ends can be shown.
- **Precision does not matter**: the reader wants roughly this much, not one specific figure.
- **The effect is instant and visible**: volume, brightness, opacity, zoom — the value is judged by what it does, not by reading it back.
- **The value is shown as it moves**: the slider carries its own number readout, so the choice is never a guess and can be repeated or reported later.
- **The surface is touch or pen**: a long track with a large thumb is a comfortable target where a small numeric field is not.

## When to avoid

- **The reader already has an exact number in mind**: use a number input. A precise figure is better typed than dragged.
- **The range is open-ended**: use a number input. A track needs two ends to exist at all.
- **There are only a few discrete values**: use a segmented control or a radio group, where each choice is named.
- **The value has to match an outside source exactly**: use a typed field, so the reader can enter the figure they were given.
- **Showing how far something has progressed**: use a loader. A slider is something you set, not something you watch.
- **The value is never editable here**: use a read-only field. Disabling a slider is not a way to display a value.

## Specifications

### Types

### States

### Anatomy

<!--
LEGACY — original content exported from the Recursica website, superseded by the body above.
Retained verbatim so nothing from the old site is lost. Do not render.

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
-->
