---
name: recursica-skill-button
description: Trigger this when the developer asks to design, write, or refactor a UI layout containing the button component.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Button Skill

**Buttons are clickable elements used to trigger actions. They are visual calls to action, with labels expressing what action will occur when the user interacts with it.**

## Anatomy & Sub-components

This skill covers the following component specs defined in the UI Kit:

- `button`

---

## When to Use

- **Use for actions**: Employ buttons for clear actions, like submitting forms or confirming decisions
  - **Clear calls to action**: Guide users on what actions are available to them in the interface
  - **Navigation**: Use buttons for guiding users through navigation or multi-step processes
  - **Accessibility & Best Practices**: Provide clear, action-oriented labels (e.g., 'Save Changes' instead of 'OK') and ensure a minimum tap target of 44x44px on mobile.

---

## When Not to Use

- **Decoration**: Don't use buttons solely for decoration; reserve them for functional actions
  - **Ambiguity**: Avoid buttons with unclear labels or ambiguous actions to prevent user confusion
  - **Overuse**: Don't overuse buttons; choose appropriate UI elements like links if navigating users outside of the application
  - **Anti-patterns**: Avoid having more than one primary button on a single view.

---

## Best Practices

- Follow platform accessibility guidelines.
- Ensure consistent padding and alignments.

---

## Referential Libraries & Documentation

- [Carbon Implementation Audit](file:///Users/aaronmartlage/Documents/recursica-forge/recursica-forge-pagination/src/components/adapters/carbon/Button/audit.md)
- [Mantine Implementation Audit](file:///Users/aaronmartlage/Documents/recursica-forge/recursica-forge-pagination/src/components/adapters/mantine/Button/audit.md)
- [Material Implementation Audit](file:///Users/aaronmartlage/Documents/recursica-forge/recursica-forge-pagination/src/components/adapters/material/Button/audit.md)
