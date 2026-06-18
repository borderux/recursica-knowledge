---
name: recursica-skill-badge
description: Trigger this when the developer asks to design, write, or refactor a UI layout containing the badge component.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Badge Skill

**Badges show notifications, counts, or status information.**

## Anatomy & Sub-components

This skill covers the following component specs defined in the UI Kit:

- `badge`

---

## When to Use

- **To indicate a count**: Use badges to indicate a notification or number count
  - **To show status**: Use badges to show the current state of an item
  - **Accessibility & Best Practices**: Ensure high color contrast for the badge text and background. Avoid relying solely on color to convey meaning (consider icons).

---

## When Not to Use

- **Long values**: Since badges are used to quickly indicate a count or a brief message, it is best to find another method if you have to support long values.
  - **Anti-patterns**: Don't overwhelm the UI with too many badges at once, which causes cognitive overload.

---

## Best Practices

- Follow platform accessibility guidelines.
- Ensure consistent padding and alignments.

---

## Referential Libraries & Documentation

- [Carbon Implementation Audit](file:///Users/aaronmartlage/Documents/recursica-forge/recursica-forge-pagination/src/components/adapters/carbon/Badge/audit.md)
- [Mantine Implementation Audit](file:///Users/aaronmartlage/Documents/recursica-forge/recursica-forge-pagination/src/components/adapters/mantine/Badge/audit.md)
- [Material Implementation Audit](file:///Users/aaronmartlage/Documents/recursica-forge/recursica-forge-pagination/src/components/adapters/material/Badge/audit.md)
