---
name: recursica-skill-stepper
description: Trigger this when the developer asks to design, write, or refactor a UI layout containing the stepper component.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Stepper Skill

**A stepper is a navigation component that guides users through a multi-stage process by visualizing their progress. It shows the total number of steps, indicates the user's current position, and previews what's next, making complex tasks feel more manageable.**

## Anatomy & Sub-components

This skill covers the following component specs defined in the UI Kit:

- `stepper`

---

## When to Use

- **Multi-step forms**: Ideal for checkout processes, application forms, or any form that is logically divided into distinct sections.
  - **Setup wizards**: Use it to guide users through an initial configuration or onboarding flow.
  - **Process tracking**: To show the status of a linear workflow, such as order fulfillment ("Processing" → "Shipped" → "Delivered").
  - **Accessibility & Best Practices**: Clearly indicate completed, current, and future steps in the process.

---

## When Not to Use

- **Non-linear tasks**: If users can complete steps in any order, a stepper is not appropriate. Use a checklist or dashboard instead.
  - **Simple forms**: For short forms that can be completed on a single page, a stepper adds unnecessary complexity.
  - **Main navigation**: A stepper should not be used for primary site navigation; its purpose is to guide users through a single, contained task.
  - **Anti-patterns**: Don't use a stepper if the steps can be completed in any order (use tabs instead).

---

## Best Practices

- Follow platform accessibility guidelines.
- Ensure consistent padding and alignments.

---

## Referential Libraries & Documentation

- Carbon Design System: [Carbon Stepper Documentation](https://carbondesignsystem.com)
- Material UI: [MUI Stepper Documentation](https://mui.com)
