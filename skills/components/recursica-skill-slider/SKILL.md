---
name: recursica-skill-slider
description: Trigger this when the developer asks to design, write, or refactor a UI layout containing the slider component.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Slider Skill

**The slider lets the user make a selection from a range of values.**

## Anatomy & Sub-components

This skill covers the following component specs defined in the UI Kit:

- `slider`

---

## When to Use

- **Touch interface**: Use sliders on mobile or touch screen for convenient value selection
  - **Approximate selection, set range**: Use sliders when the user is presented with a range and when preciseness doesn’t matter
  - **Instant results**: Sliders are great for things like changing volume or brightness as it makes instant changes letting the user view the results
  - **Accessibility & Best Practices**: Provide a visible current value and consider allowing manual number input alongside it.

---

## When Not to Use

- **Preciseness**: If precise values are desired and the user has a value in mind, then consider using an input instead
  - **No set range**: If the user has an infinite range of possibilities, consider using an input allowing the user to enter any value they want
  - **Anti-patterns**: Avoid sliders for selecting precise, discrete values without clear stepping.

---

## Best Practices

- Follow platform accessibility guidelines.
- Ensure consistent padding and alignments.

---

## Referential Libraries & Documentation

- Carbon Design System: [Carbon Slider Documentation](https://carbondesignsystem.com)
- Material UI: [MUI Slider Documentation](https://mui.com)
