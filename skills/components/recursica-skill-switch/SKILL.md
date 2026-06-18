---
name: recursica-skill-switch
description: Trigger this when the developer asks to design, write, or refactor a UI layout containing the switch component (including switch, switch-item, switch-group).
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Switch Skill

**Switches toggle the state of a single item off or on.**

## Anatomy & Sub-components

This skill covers the following component specs defined in the UI Kit:

- `switch`
- `switch-item`
- `switch-group`

---

## When to Use

- **Simple Action**: Switches allow uses to easily toggle an item off or on
  - **Mobile/Tablet**: Switches have a larger visual touch area for mobile users to easily see whether the item is off or on
  - **Accessibility & Best Practices**: Use switches for settings that are immediately applied without needing a 'Save' button.

---

## When Not to Use

- **Complex Selection**: A switch must have an quick and instantaneous understanding if the user is toggling something off or on
  - **Critical Settings**: Avoid using switches for actions that could have serious consequences if accidentally toggled. Instead, use confirmation modals or other safeguards to prevent these changes
  - **Anti-patterns**: Don't use a switch if the user must click 'Submit' or 'Save' to confirm the change (use a checkbox).

---

## Best Practices

- Follow platform accessibility guidelines.
- Ensure consistent padding and alignments.

---

## Referential Libraries & Documentation

- [Carbon Implementation Audit](file:///Users/aaronmartlage/Documents/recursica-forge/recursica-forge-pagination/src/components/adapters/carbon/Switch/audit.md)
- [Mantine Implementation Audit](file:///Users/aaronmartlage/Documents/recursica-forge/recursica-forge-pagination/src/components/adapters/mantine/Switch/audit.md)
- [Material Implementation Audit](file:///Users/aaronmartlage/Documents/recursica-forge/recursica-forge-pagination/src/components/adapters/material/Switch/audit.md)
