---
name: recursica-skill-toast
description: Trigger this when the developer asks to design, write, or refactor a UI layout containing the toast component.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Toast Skill

**Toasts display brief notifications that appear towards the bottom of the screen. They provide feedback or information to users without interrupting their current workflow.**

## Anatomy & Sub-components

This skill covers the following component specs defined in the UI Kit:

- `toast`

---

## When to Use

- **Low priority update**: Toasts are good for low priority updates regarding a task the user has taken or is being taken
  - **Minimal interruption**: Use toasts to give updates with little interruption to the user’s workflow such as: successful updates, errors messages, and confirmation like saving or deleting items
  - **Accessibility & Best Practices**: Ensure toasts auto-dismiss after a reasonable time (e.g., 4-6s) and provide a manual close button.

---

## When Not to Use

- **Urgent / critical action**: Avoid using toasts for critical alerts that require immediate attention or user action, as they can be easily missed or dismissed without notice. Instead, use banners
  - **Long-term information**: Don’t display persistent information that users may need to reference later. Toasts are best suited for transient messages that can disappear after a short period
  - **Anti-patterns**: Don't use toasts for critical system alerts or errors that require immediate user action.

---

## Best Practices

- Follow platform accessibility guidelines.
- Ensure consistent padding and alignments.

---

## Referential Libraries & Documentation

- [Carbon Implementation Audit](file:///Users/aaronmartlage/Documents/recursica-forge/recursica-forge-pagination/src/components/adapters/carbon/Toast/Toast.carbon.audit.md)
- [Mantine Implementation Audit](file:///Users/aaronmartlage/Documents/recursica-forge/recursica-forge-pagination/src/components/adapters/mantine/Toast/Toast.mantine.audit.md)
- [Material Implementation Audit](file:///Users/aaronmartlage/Documents/recursica-forge/recursica-forge-pagination/src/components/adapters/material/Toast/Toast.material.audit.md)
