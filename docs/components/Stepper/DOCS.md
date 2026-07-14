---
title: "Stepper"
description: "Recursica helps agencies build client digital products faster and more consistently. Our system streamlines design, ensures brand consistency, and improves team collaboration."
previewName: "stepper"
specs:
  - section: "Step indicator size"
    items:
      - label: "Large"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/stepper/assets/stepper-step-indicator-size-large.svg"
      - label: "Small"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/stepper/assets/stepper-step-indicator-size-small.svg"
  - section: "Position"
    items:
      - label: "Horizontal"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/stepper/assets/stepper-position-horizontal.svg"
      - label: "Vertical"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/stepper/assets/stepper-position-vertical.svg"
  - section: "Behavior"
    items:
      - label: "Done, Current, & Upcoming states"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/stepper/assets/stepper-behavior-done-current-upcoming-states.svg"
anatomy:
  image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/stepper/assets/stepper-anatomy.svg"
  items:
    - num: 1
      label: "Indicator"
      text: "The circular element that contains the step number or an icon (like a checkmark). Its style changes based on the step's state."
    - num: 2
      label: "Label"
      text: "The descriptive text that names the step."
    - num: 3
      label: "Supporting text"
      text: "Optional text that can be used as short descriptor text."
    - num: 4
      label: "Connector"
      text: "The line that visually connects one step to the next, illustrating the linear flow of the process."
    - num: 5
      label: "Step number"
      text: "The number inside the indicator."
skill:
  name: recursica-skill-stepper
  path: skills/components/recursica-skill-stepper
  repository: https://github.com/borderux/recursica-knowledge
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Stepper

**A stepper is a navigation component that guides users through a multi-stage process by visualizing their progress. It shows the total number of steps, indicates the user's current position, and previews what's next, making complex tasks feel more manageable.**

## When to use

- **Multi-step forms**: Ideal for checkout processes, application forms, or any form that is logically divided into distinct sections.
- **Setup wizards**: Use it to guide users through an initial configuration or onboarding flow.
- **Process tracking**: To show the status of a linear workflow, such as order fulfillment ("Processing" → "Shipped" → "Delivered").
- **Accessibility & Best Practices**: Clearly indicate completed, current, and future steps in the process.

## When to avoid

- **Non-linear tasks**: If users can complete steps in any order, a stepper is not appropriate. Use a checklist or dashboard instead.
- **Simple forms**: For short forms that can be completed on a single page, a stepper adds unnecessary complexity.
- **Main navigation**: A stepper should not be used for primary site navigation; its purpose is to guide users through a single, contained task.
- **Anti-patterns**: Don't use a stepper if the steps can be completed in any order (use tabs instead).

## Specifications

### Step indicator size

### Position

### Behavior

### Anatomy
