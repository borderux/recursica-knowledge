---
name: recursica-skill-segmented-control
description: Trigger this when the developer asks to design, write, or refactor a UI layout containing the segmented-control component (including segmented-control, segmented-control-item).
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# SegmentedControl Skill

**Segmented controls allow users to select one choice from a limited, linear set of options, often used for switching views or sorting elements.**

## Anatomy & Sub-components

This skill covers the following component specs defined in the UI Kit:

- `segmented-control`
- `segmented-control-item`

---

## When to Use

- **Horizontal single select**: This is how a horizontal radio group is done. Checkboxes and radio buttons must never be rotated into a horizontal row — when the layout calls for one, a segmented control is the control to reach for.
  - **Switching views**: Let users toggle between different layouts or modes (e.g., list vs. grid or daily vs. weekly view).
  - **Inline filtering**: Provide quick filtering options without forcing users to open a dropdown or modal.
  - **Exclusive choice**: Use when only one option should be active at a time from a small set (2–5 items).
  - **Compact UI**: Offer a more space-efficient alternative to radio buttons in toolbars or headers.
  - **Accessibility & Best Practices**: Use segmented controls to switch between related views or data sets tightly coupled to the layout.

---

## When Not to Use

- **Too many options**: Avoid above five options. Fall back to a vertical radio group, or a dropdown if the set also exceeds the general option ceiling. **Do not fall back to Tabs** — tabs hold parts of one whole, not the values of a single-select field.
  - **Long labels**: Not suitable if labels are lengthy or complex, which can break the compact layout.
  - **Multiple selections**: Avoid using when users must select more than one option. Selectable chips are the horizontal multi-select control; a checkbox group is the vertical one.
  - **Disruptive changes**: Avoid if switching options triggers heavy reloads or disruptive actions without clear feedback.
  - **Anti-patterns**: Don't use segmented controls for more than 4-5 items.

---

## Best Practices

- Follow platform accessibility guidelines.
- Spacing, padding, and selected-state styling are owned by the component. Do not tune them.
- **This control's ceiling is tighter than the general one.** The house option ceiling is 7 ± 2, but a segmented control is horizontal and compact, so it caps at 2–5. The tighter limit wins here.

---

## House Design Rules

Control choice, option counts, pre-selection, and commit timing are governed by the design-rules skills. Load them alongside this one:

- [`recursica-skill-selection-controls`](../../design-rules/recursica-skill-selection-controls/SKILL.md) — when a segmented control is the right control, and the rules it inherits from radio groups.
- [`recursica-skill-working-memory`](../../psychology/recursica-skill-working-memory/SKILL.md) — the basis for option-count limits.

---

## Referential Libraries & Documentation

- Carbon Design System: [Carbon SegmentedControl Documentation](https://carbondesignsystem.com)
- Material UI: [MUI SegmentedControl Documentation](https://mui.com)
