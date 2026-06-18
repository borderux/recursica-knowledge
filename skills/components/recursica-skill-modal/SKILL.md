---
name: recursica-skill-modal
description: Trigger this when the developer asks to design, write, or refactor a UI layout containing the modal component.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Dialog Skill

**Modals are a type of window that appears in front of a page’s content to provide information or ask for a decision. Modals require immediate attention and disable all functionality until the user decides to confirm, dismiss or take appropriate action.**

## Anatomy & Sub-components

This skill covers the following component specs defined in the UI Kit:

- `modal`

---

## When to Use

- **Focused action**: Use modals to have users complete actions in a focused setting
  - **Immediate attention**: As modals isolate users in a mode, modals can be used to indicate that a task needs immediate attention in order to progress
  - **Preventative measure**: Use modals as a way to confirm that the user understands the action they’re about to take and the consequences of following through
  - **Accessibility & Best Practices**: Trap keyboard focus within the modal while it's open, and allow dismissal via the Escape key.

---

## When Not to Use

- **Related to covered content**: As modals appear on top of content, it takes users out of context and may unintentionally make it harder for the user to complete the task without being able to view the content
  - **Repeated interruption**: Modals should be used sparingly as each time it is used, it forces the user into a focused mode, taking time away from the previous flow
  - **Anti-patterns**: Avoid opening modals from within other modals.

---

## Best Practices

- Follow platform accessibility guidelines.
- Ensure consistent padding and alignments.

---

## Referential Libraries & Documentation

- Carbon Design System: [Carbon Dialog Documentation](https://carbondesignsystem.com)
- Material UI: [MUI Dialog Documentation](https://mui.com)
