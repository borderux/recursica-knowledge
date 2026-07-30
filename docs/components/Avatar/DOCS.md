---
title: "Avatar"
description: "Recursica helps agencies build client digital products faster and more consistently. Our system streamlines design, ensures brand consistency, and improves team collaboration."
previewName: "avatar"
specs:
  - section: "Style"
    items:
      - label: "Image"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/avatar/assets/avatar-style-image.png"
        text: "Displays a user's photograph."
      - label: "Primary"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/avatar/assets/avatar-style-primary.svg"
        text: "Primary-colored background when no image. High contrast."
      - label: "Background"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/avatar/assets/avatar-style-background.svg"
        text: "A neutral background color for low contrast, secondary uses."
      - label: "Ghost"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/avatar/assets/avatar-style-ghost.svg"
        text: "A transparent background with a simple icon. Ensure it's placed on top of an accessible background."
  - section: "Size"
    items:
      - label: "Small, Default, Large"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/avatar/assets/avatar-size-small-default-large.svg"
        text: "Use the small size for more dense UI's like a list of users. Use the large option for more prominent placements like a user profile page header."
  - section: "Border"
    items:
      - label: "True"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/avatar/assets/avatar-border-true.svg"
        text: "Adds a 1px border around the avatar. Useful for creating visual separation from the background or a group of avatars."
      - label: "False"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/avatar/assets/avatar-border-false.svg"
        text: "The avatar has no border."
anatomy:
  image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/avatar/assets/avatar-anatomy.svg"
  items:
    - num: 1
      label: "Border"
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

**An avatar is a small visual stand-in for a person or entity.** It supports identification; it never supplies it on its own. The name in text is what identifies someone — the avatar is the shortcut to it.

## When to use

- **The person is already named nearby**: a face makes a list faster to scan — a comment author, a row's assignee, a team directory.
- **It is the trigger for the account menu**: that is the one case where an avatar is a control rather than decoration.
- **A photograph adds real recognition**: collaborators on a document, or who is active on a page right now.
- **You have something to show, in order**: a photograph if there is one, initials if there is a name, and a generic person icon when there is neither — so a missing image never leaves an empty circle.

## When to avoid

- **The name alone identifies the record and space is tight**: use plain text. At table density a name column beats a picture.
- **Status, presence, or a count needs showing**: use a badge beside the name. An avatar carries no status dot.
- **Several people should read as one overlapping cluster**: name them in text. The system has no avatar group, so do not assemble one out of single avatars.
- **The graphic stands for a concept rather than a person**: use an icon. An avatar is identity, not decoration.
- **It would be the only way to tell whose row, comment, or assignment this is**: put the name in text with the avatar beside it. A photo and a pair of initials are both ambiguous — two people share "AM".
- **You need someone to do something**: use a button. An avatar identifies; it is not a call to action.

## Specifications

### Style

### Size

### Border

### Anatomy

<!--
LEGACY — original content exported from the Recursica website, superseded by the body above.
Retained verbatim so nothing from the old site is lost. Do not render.

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
-->
