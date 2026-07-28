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
  - **In table rows**: Use a link for navigation out of a row to a related object's page. Links are quieter than buttons, which matters at table density.
  - **Accessibility & Best Practices**: Always render a real `href` so the browser's own capabilities work — right-click, open in new tab, copy link address.

---

## When Not to Use

- **For primary actions**: Do not use a link for actions that change data or the state of the current interface (e.g., "Save," "Submit," "Delete," "Close"). Use a button for such actions. Links should strictly be used for navigation. If the action must look lightweight, use a text button — never a link.
  - **With vague text**: Avoid generic link text like "Click Here" or "Learn More." A link label names the object it opens, with no verb — what the user does there is their choice.
  - **Disabled**: Never disable a link. Navigation to a related object is always available; only actions get disabled.
  - **Forced new tabs**: Don't open a link in a new tab automatically unless that is unmistakably the only possible behavior. Let the user choose via context menu or keyboard.
  - **Anti-patterns**: Don't use links for actions that mutate state (e.g., Delete, Save); use buttons instead.

---

## Best Practices

- Follow platform accessibility guidelines.
- Spacing, padding, underline, and color are owned by the component. Do not tune them.

---

## House Design Rules

Component choice, labeling, and placement are governed by the design-rules skills. Load them alongside this one:

- [`recursica-skill-buttons-links`](../../design-rules/recursica-skill-buttons-links/SKILL.md) — link vs. button semantics, label copy, table row usage, new-tab behavior, modal triggers.
- [`recursica-skill-navigation`](../../design-rules/recursica-skill-navigation/SKILL.md) — routing, browser history, and where links belong in an app shell.

---

## Referential Libraries & Documentation

- Carbon Design System: [Carbon Link Documentation](https://carbondesignsystem.com)
- Material UI: [MUI Link Documentation](https://mui.com)
