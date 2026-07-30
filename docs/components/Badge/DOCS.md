---
title: "Badge"
description: "Recursica helps agencies build client digital products faster and more consistently. Our system streamlines design, ensures brand consistency, and improves team collaboration."
previewName: "badge"
specs:
  - section: "Size"
    items:
      - label: "Default"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/badge/assets/badge-size-default.svg"
      - label: "Large"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/badge/assets/badge-size-large.svg"
  - section: "Content"
    items:
      - label: "Message"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/badge/assets/badge-content-message.svg"
        text: "A badge with a message shows a non-interactive label used to highlight an item's status, attribute, or category."
      - label: "Counter"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/badge/assets/badge-content-counter.svg"
        text: "A counter badge is a small, non-interactive visual indicator that displays a number."
  - section: "Styles"
    items:
      - label: "Primary"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/badge/assets/badge-styles-primary.svg"
      - label: "Background"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/badge/assets/badge-styles-background.svg"
      - label: "Alert"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/badge/assets/badge-styles-alert.svg"
      - label: "Success"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/badge/assets/badge-styles-success.svg"
anatomy:
  image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/badge/assets/badge-anatomy.svg"
  items:
    - num: 1
      label: "Label"
      text: "The label content can be either numerical or text. If numerical, use the padding-false prop which removes the horizontal space for a tighter, more optically balanced look around the numbers."
    - num: 2
      label: "Container"
      text: "Contains the numerical or text value. Offers a default and large size which alters the vertical-padding."
skill:
  name: recursica-skill-badge
  path: skills/components/recursica-skill-badge
  repository: https://github.com/borderux/recursica-knowledge
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Badge

**A badge is one piece of read-only metadata attached to something else.** The system sets it and nobody touches it. Reach for it when a status, a count, or one short attribute needs to sit alongside the thing it describes.

## When to use

- **One value describes the object**: a status the system owns, a count, or a single short attribute.
- **It sits on something else**: a row, a heading, a tab, a nav item, a card. A badge never stands alone.
- **Space is tight**: a badge is small and tightly set, which is what dense views need.
- **A count comes with its unit**: "3 unread messages" reads on its own; a bare "12" only means something because of what it is attached to.

## When to avoid

- **Someone selects, toggles, or dismisses it**: use a chip. There is no selectable or dismissible badge here — if it has to be operated, it is a chip.
- **The object carries several values**: use chips. A badge is singular, and two of them side by side means the information is plural.
- **The value is an error or a failure**: use an icon or a treatment built for it. Badges read as affirmative metadata, so "Error" in a badge reads oddly like an achievement.
- **The text runs to a phrase**: use plain text. A badge is not a container for a sentence.
- **It labels the page or the section itself**: use a heading. A badge modifies an object, not a view.
- **Every row is already wearing one**: leave the routine values as plain text and badge only the exception. Badges everywhere stop signalling anything.

## Specifications

### Size

### Content

### Styles

### Anatomy

<!--
LEGACY — original content exported from the Recursica website, superseded by the body above.
Retained verbatim so nothing from the old site is lost. Do not render.

# Badge

**Badges show notifications, counts, or status information.**

## When to use

- **To indicate a count**: Use badges to indicate a notification or number count
- **To show status**: Use badges to show the current state of an item
- **Accessibility & Best Practices**: Ensure high color contrast for the badge text and background. Avoid relying solely on color to convey meaning (consider icons).

## When to avoid

- **Long values**: Since badges are used to quickly indicate a count or a brief message, it is best to find another method if you have to support long values.
- **Anti-patterns**: Don't overwhelm the UI with too many badges at once, which causes cognitive overload.

## Specifications

### Size

### Content

### Styles

### Anatomy
-->
