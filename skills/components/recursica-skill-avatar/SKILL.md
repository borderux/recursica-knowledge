---
name: recursica-skill-avatar
description: Trigger this when the developer asks to design, write, or refactor a UI layout containing the avatar component.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Avatar Skill

**An avatar is a visual element that represents a user or entity. It typically displays a user's profile picture, initials, or a generic icon to provide a quick visual identity in the interface.**

## Anatomy & Sub-components

This skill covers the following component specs defined in the UI Kit:

- `avatar`

---

## When to Use

- **User identification**: To represent users in profile sections, account menus, or navigation bars.
  - **Content attribution**: To show who created a piece of content, such as next to a comment, forum post, or chat message in collaborative UI's..
  - **Lists of people**: To create a visually scannable list of users, such as in contact lists, team member directories, or permission settings.
  - **Collaborative contexts**: To indicate who is currently active on a page or to whom a document is shared.
  - **Accessibility & Best Practices**: Provide descriptive `alt` text and a robust fallback mechanism (like initials) when the image fails to load.

---

## When Not to Use

- **As a primary action**: While it can be interactive (linking to a profile), its primary purpose is identification, not action (e.g. "Save" or "Submit").
  - **Where identity is not needed**: Avoid using in contexts where a visual representation adds no value or creates unnecessary visual clutter, such as in dense data tables where a name is more sufficient.
  - **Anti-patterns**: Don't use avatars for decorative icons that don't represent a person or entity.

---

## Best Practices

- Follow platform accessibility guidelines.
- Ensure consistent padding and alignments.

---

## Referential Libraries & Documentation

- Carbon Design System: [Carbon Avatar Documentation](https://carbondesignsystem.com)
- Material UI: [MUI Avatar Documentation](https://mui.com)
