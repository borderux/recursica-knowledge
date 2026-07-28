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
  - **Advancing a process**: Use buttons to move a flow forward or back (a stepper's Next and Back), which acts on the process rather than navigating to another page
  - **Accessibility & Best Practices**: Label with a verb plus its object ('Save page', not 'OK'), and always give an icon-only button a tooltip.

---

## When Not to Use

- **Decoration**: Don't use buttons solely for decoration; reserve them for functional actions
  - **Ambiguity**: Avoid buttons with unclear labels or ambiguous actions to prevent user confusion
  - **Navigation**: Never use a button to move the user to another page or object — that is a link. Buttons are local to the page they sit on
  - **Anti-patterns**: Avoid having more than one primary button on a single view.

---

## Best Practices

- Follow platform accessibility guidelines.
- Spacing, padding, and visual weight are owned by the component. Do not tune them.

---

## House Design Rules

Component choice, labeling, hierarchy, and placement are governed by the design-rules skills. Load them alongside this one:

- [`recursica-skill-buttons-links`](../../design-rules/recursica-skill-buttons-links/SKILL.md) — button vs. link semantics, icon-only vs. text, disabled states, primary/secondary hierarchy, label copy, destructive confirmation, undo, toggles, toolbar overflow.
- [`recursica-skill-forms`](../../design-rules/recursica-skill-forms/SKILL.md) — submit and cancel behavior inside forms.

---

## Referential Libraries & Documentation

- Carbon Design System: [Carbon Button Documentation](https://carbondesignsystem.com)
- Material UI: [MUI Button Documentation](https://mui.com)
