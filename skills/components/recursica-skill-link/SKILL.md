---
name: recursica-skill-link
description: Trigger this when the developer asks to design, write, or refactor a UI layout containing the link component.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Link Skill

**A link is an interactive text element that navigates the user to a new location. This destination can be another page, a specific section within the current page, an external website, or a resource to be downloaded.**

## Anatomy & Sub-components

This skill covers the following component specs defined in the UI Kit:

- `link`

---

## When to Use

- **Standalone**: Use for navigation that stands on its own, such as in menus, footers, or as a call-to-action to view more information.
  - **Inline**: Use within a sentence or paragraph to link to relevant context, sources, or definitions without disrupting the flow of the text.
  - **Accessibility & Best Practices**: Clearly distinguish links from normal text using color, underline, or both.

---

## When Not to Use

- **For primary actions**: Do not use a link for actions that change data or the state of the current interface (e.g., "Save," "Submit," "Delete," "Close"). Use a button for such actions. Links should strictly be used for navigation.
  - **With vague text**: Avoid generic link text like "Click Here" or "Learn More." Link text should be descriptive and clearly communicate the destination to improve accessibility and user experience.
  - **Anti-patterns**: Don't use links for actions that mutate state (e.g., Delete, Save); use buttons instead.

---

## Best Practices

- Follow platform accessibility guidelines.
- Ensure consistent padding and alignments.

---

## Referential Libraries & Documentation

- Carbon Design System: [Carbon Link Documentation](https://carbondesignsystem.com)
- Material UI: [MUI Link Documentation](https://mui.com)
