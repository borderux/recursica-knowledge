---
title: "Avatar"
description: "Recursica helps agencies build client digital products faster and more consistently. Our system streamlines design, ensures brand consistency, and improves team collaboration."
previewName: "avatar"
specs:
  - section: "Style"
    items:
      - label: "Image"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/avatar/assets/avatar-style-image.png"
      - label: "Primary"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/avatar/assets/avatar-style-primary.svg"
      - label: "Background"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/avatar/assets/avatar-style-background.svg"
      - label: "Ghost"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/avatar/assets/avatar-style-ghost.svg"
  - section: "Size"
    items:
      - label: "Small, Default, Large"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/avatar/assets/avatar-size-small-default-large.svg"
  - section: "Border"
    items:
      - label: "True"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/avatar/assets/avatar-border-true.svg"
      - label: "False"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/avatar/assets/avatar-border-false.svg"
anatomy:
  image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/avatar/assets/avatar-anatomy.svg"
  items:
    - num: 1
      text: "Use the optional white border to separate overlapping avatars in a group or to make a single avatar stand out on a busy or low-contrast background."
    - num: 2
      label: "Content"
      text: "For no-image avatars, designers can swap the content between text or an icon."
skill:
  name: recursica-skill-avatar
  path: skills/components/recursica-skill-avatar
  repository: https://github.com/borderux/recursica-knowledge
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Avatar

**An avatar is a visual element that represents a user or entity. It typically displays a user's profile picture, initials, or a generic icon to provide a quick visual identity in the interface.**

## When to use

- **User identification**: To represent users in profile sections, account menus, or navigation bars.
- **Content attribution**: To show who created a piece of content, such as next to a comment, forum post, or chat message in collaborative UI's..
- **Lists of people**: To create a visually scannable list of users, such as in contact lists, team member directories, or permission settings.
- **Collaborative contexts**: To indicate who is currently active on a page or to whom a document is shared.
- **Accessibility & Best Practices**: Provide descriptive `alt` text and a robust fallback mechanism (like initials) when the image fails to load.

## When to avoid

- **As a primary action**: While it can be interactive (linking to a profile), its primary purpose is identification, not action (e.g. "Save" or "Submit").
- **Where identity is not needed**: Avoid using in contexts where a visual representation adds no value or creates unnecessary visual clutter, such as in dense data tables where a name is more sufficient.
- **Anti-patterns**: Don't use avatars for decorative icons that don't represent a person or entity.

## Specifications

### Style

### Size

### Border

### Anatomy
