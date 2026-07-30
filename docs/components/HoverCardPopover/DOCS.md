---
title: "Hover card and popover"
description: "Recursica helps agencies build client digital products faster and more consistently. Our system streamlines design, ensures brand consistency, and improves team collaboration."
previewName: "hover-card"
specs:
  - section: "Hover card content types"
    items:
      - label: "Text"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/hover-card/assets/hover-card-content-types-text.svg"
      - label: "Custom"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/hover-card/assets/hover-card-content-types-custom.svg"
  - section: "Hover card behavior"
    items:
      - label: "Trigger"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/hover-card/assets/hover-card-behavior-trigger.svg"
        text: "The card appears after the user's cursor rests on the target element for a brief moment."
      - label: "Dismissal"
        image: "https://framerusercontent.com/images/yk6U93a0kziqzS2aGIRA4WIxQ0.svg"
        text: "The card is hidden when the cursor is moved off of both the target element and the card itself."
  - section: "Popover position"
    items:
      - label: "Top"
        image: "https://framerusercontent.com/images/2mfhAmLUg9mQgWapNYsSKLipzE.svg"
      - label: "Left"
        image: "https://framerusercontent.com/images/TjQbTFalaGIdHbbl8wA5cyI6928.svg"
      - label: "Right"
        image: "https://framerusercontent.com/images/Eqj34eyhVcNGZ1oIAeFEEnjqMA.svg"
      - label: "Bottom"
        image: "https://framerusercontent.com/images/KvqZ6blLQZBIrG8ygdHyD8HI1bI.svg"
  - section: "Popover beak alignment"
    items:
      - label: "Start"
        image: "https://framerusercontent.com/images/CUaSE0h4g8ymgp59yJDvM20LyU.svg"
      - label: "Middle"
        image: "https://framerusercontent.com/images/KvqZ6blLQZBIrG8ygdHyD8HI1bI.svg"
      - label: "End"
        image: "https://framerusercontent.com/images/YG1GMT02Tt5ZOWI4ntNvWTrdnE.svg"
  - section: "Popover content types"
    items:
      - label: "Text"
        image: "https://framerusercontent.com/images/FHQZdd51y4THPpaAksheSQvWXA.svg"
      - label: "Custom"
        image: "https://framerusercontent.com/images/GtjQy83k9yKSGnKCqlXFdCfdP98.svg"
  - section: "Popover behavior"
    items:
      - label: "Trigger"
        image: "https://framerusercontent.com/images/t9WGUGnq97C5GOsIqQ8gBHW2fw.svg"
        text: "The popover must appear on a user click or tap."
      - label: "Dismissal"
        image: "https://framerusercontent.com/images/l0I4uCA7a1VWjnhu1Feze5QO0k.svg"
        text: 'The popover should close when the user clicks outside of it, clicks the trigger element again, or presses the "Esc" key.'
      - label: "Focus management"
        image: "https://framerusercontent.com/images/ieMB4NdYloFKnWlYdOMv02j4.svg"
        text: "For accessibility, when the popover opens, keyboard focus should move to the first interactive element inside it. When it closes, focus should return to the original trigger element."
  - section: "Popover anatomy"
    items:
      - label: "Content"
        image: "https://framerusercontent.com/images/43RZrWYLvLZOi6XtA3XTYrzM0M.svg"
        text: "A flexible slot designed for or custom content."
      - label: "Beak"
        text: "A small caret that visually connects the popover to its trigger element and can be positioned on any side of the content area via the position prop."
anatomy:
  image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/hover-card/assets/hover-card-anatomy.svg"
  items:
    - num: 1
      label: "Container"
      text: "The floating card that appears and holds the content."
    - num: 2
      label: "Content"
      text: 'The information displayed inside the container, which can be simple "Text" or a "Custom" component.'
skill:
  name: recursica-skill-hover-card-popover
  path: skills/components/recursica-skill-hover-card-popover
  repository: https://github.com/borderux/recursica-knowledge
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Hover card and popover

**Two small surfaces that attach to the element they belong to, separated by how they open and what they may hold.** A hover card appears on hover and is for reading; a popover opens on click and is the only one of the two that may contain anything the reader operates.

## When to use

- **A hover card, for a preview**: extra detail about the thing under the pointer — a person, a record, a term — that saves a trip to another page.
- **A popover, for actions**: a short list of actions revealed by clicking a button, such as Share or Filter.
- **A popover, for interactive content**: buttons, links, or simple form controls belong here and nowhere else among the attached surfaces.
- **A popover, on touch**: with no hover available, a popover does the job a hover card does on a desktop.
- **Either one, for supplementary information**: content worth offering but never required to finish the task.

## When to avoid

- **The content is a short label for a control with no visible name**: use a tooltip.
- **Anything inside it is interactive and it opens on hover**: make it a popover with a real click trigger. A button inside a hover card cannot be reached without a pointer.
- **The reader needs the content to complete the task**: put it on the page. Neither surface may be the only place a piece of information exists.
- **Critical information, a warning, or a complex form**: use a modal, which blocks the page and earns the attention.
- **The reader needs it while working elsewhere on the page**: use a panel, which stays open beside the content.
- **Primary navigation**: use a dedicated menu or navigation bar.

## Specifications

### Hover card content types

### Hover card behavior

### Popover position

### Popover beak alignment

### Popover content types

### Popover behavior

### Popover anatomy

### Anatomy

<!--
LEGACY — original content exported from the Recursica website, superseded by the body above.
Retained verbatim so nothing from the old site is lost. Do not render.

# Hover card

**A hover card is a pop-up container that reveals richer content when a user hovers their cursor over a target element. It provides more detailed, on-demand information than a tooltip, without requiring a click.**

## When to use

- **Profile previews**: To show a mini user profile when hovering over an avatar or username.
- **Product summaries**: To display a quick look at a product's details, like an image and price, when hovering over its name.
- **Link previews**: To offer a preview, or thumbnail, of an article or page when a user hovers over a link.
- **Accessibility & Best Practices**: Add a slight delay before showing the hover card to prevent accidental triggers.

## When to avoid

- **Critical information**: Do not place essential information or primary actions (like "Submit" or "Delete") inside a hover card. Its content is not guaranteed to be seen.
- **Simple labels**: For simple, single-line text labels (e.g., for an icon button), use a tooltip instead.
- **Mobile devices**: Hover is not a reliable interaction on touch screens. This component is designed for desktop use. Information should be revealed by a tap on mobile, likely within a modal or popover.
- **Anti-patterns**: Don't place critical functionality or primary actions solely inside a hover card.

## Specifications

### Content types

### Behavior

### Anatomy
-->

<!--
CAPTURED FROM THE LIVE SITE — https://www.recursica.com/docs/components/popover
The popover is published as its own page. Its content is combined into this file so the two
related surfaces stay together. The site's wording is retained verbatim. Do not render.

### Popover

A popover is a non-modal dialog that appears when a user clicks a trigger element. It's used to display additional information or a set of related actions in a small container that is attached to the trigger.

#### When to use

Action menus
Use a popover to display a list of actions when a user clicks a button, such as a "Share" or "Filter" button.

Interactive information
It's ideal for showing content that includes interactive elements, like buttons, links, or simple form controls.

Mobile context menus
On touch devices, popovers are a great way to reveal information or actions that would be shown in a hover card on desktop.

#### When to avoid

On hover
If the content should be revealed by hovering, use a tooltip (for simple text) or a hover card (for richer, non-interactive content). A popover should always be triggered by a click.

Critical information
For critical information, warnings, or complex forms that require the user's full attention, use a modal dialog instead.

Primary navigation
A dedicated menu or navigation bar is more appropriate.
-->
