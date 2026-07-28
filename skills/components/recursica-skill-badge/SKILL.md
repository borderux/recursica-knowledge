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
  - **To show status**: Use badges to show the current state of an item. The system sets it; the user never manipulates it
  - **Read-only metadata**: Labeling a tab, a heading, or a sidebar nav item with a single piece of information — "Active", for instance
  - **Dense views**: A badge is small with a tight type treatment, which makes it the right choice where space is constrained
  - **Accessibility & Best Practices**: A badge is not focusable and is skipped in the tab order — it is text that is read.

---

## When Not to Use

- **Long values**: Since badges are used to quickly indicate a count or a brief message, it is best to find another method if you have to support long values.
  - **Anything interactive**: There is no selectable badge and no dismissible badge. If the user must operate it, it is a chip
  - **More than one value**: A badge is singular. An object carries at most one — several values means chips
  - **Error states**: Badges carry metadata, not negative conditions, and "Error" in a badge reads as affirmative. Use an icon or a stronger purpose-built treatment
  - **Anti-patterns**: Never stack a badge above or below the object it describes; it belongs immediately after it, on the same line.

---

## Best Practices

- Follow platform accessibility guidelines.
- Spacing, padding, type treatment, and color are owned by the component. Do not tune them.
- On a status change, swap the badge to its new value with no animation.

---

## House Design Rules

Badge vs. chip selection, cardinality, and placement are governed by the design-rules skills. Load them alongside this one:

- [`recursica-skill-badges-chips`](../../design-rules/recursica-skill-badges-chips/SKILL.md) — when a badge is the right component, how many are allowed, and where it sits in tables, cards, tabs, headings, and navigation.

---

## Referential Libraries & Documentation

- Carbon Design System: [Carbon Badge Documentation](https://carbondesignsystem.com)
- Material UI: [MUI Badge Documentation](https://mui.com)
