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

- **Switching views**: Let users toggle between different layouts or modes (e.g., list vs. grid or daily vs. weekly view).
  - **Inline filtering**: Provide quick filtering options without forcing users to open a dropdown or modal.
  - **Exclusive choice**: Use when only one option should be active at a time from a small set (2–5 items).
  - **Compact UI**: Offer a more space-efficient alternative to radio buttons in toolbars or headers.
  - **Accessibility & Best Practices**: Use segmented controls to switch between related views or data sets tightly coupled to the layout.

---

## When Not to Use

- **Too many options**: Avoid when more than five options are needed. Use Tabs or a Select component instead.
  - **Long labels**: Not suitable if labels are lengthy or complex, which can break the compact layout.
  - **Multiple selections**: Avoid using when users must select more than one option. Checkboxes or multi-select are better.
  - **Disruptive changes**: Avoid if switching options triggers heavy reloads or disruptive actions without clear feedback.
  - **Anti-patterns**: Don't use segmented controls for more than 4-5 items (use a dropdown instead).

---

## Best Practices

- Follow platform accessibility guidelines.
- Ensure consistent padding and alignments.

---

## Referential Libraries & Documentation

- Carbon Design System: [Carbon SegmentedControl Documentation](https://carbondesignsystem.com)
- Material UI: [MUI SegmentedControl Documentation](https://mui.com)
