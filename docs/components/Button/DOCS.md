---
title: "Button"
description: "Recursica helps agencies build client digital products faster and more consistently. Our system streamlines design, ensures brand consistency, and improves team collaboration."
previewName: "button"
specs:
  - section: "Styles"
    items:
      - label: "Solid"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/button/assets/button-styles-solid.svg"
      - label: "Outline"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/button/assets/button-styles-outline.svg"
      - label: "Ghost"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/button/assets/button-styles-ghost.svg"
  - section: "Sizes"
    items:
      - label: "Default"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/button/assets/button-sizes-default.svg"
      - label: "Small"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/button/assets/button-sizes-small.svg"
  - section: "Content"
    items:
      - label: "Text-only"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/button/assets/button-content-text-only.svg"
      - label: "Icon + Text"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/button/assets/button-content-icon-text.svg"
      - label: "Text + Icon"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/button/assets/button-content-text-icon.svg"
      - label: "Icon"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/button/assets/button-content-icon.svg"
anatomy:
  image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/button/assets/button-anatomy.svg"
  items:
    - num: 1
      label: "Container"
      text: "Contains all of the button content, including the icon and label."
    - num: 2
      text: "Icons can be used to help aid text by creating visual cues to the button’s action verb or noun. Use only one icon (on the left or right) to keep consistency throughout the application."
    - num: 3
      label: "Text"
      text: "Text or button label can be removed if an icon only button is desired. Use icon only buttons if the icon is easily recognizable universally."
    - num: 4
      label: "Trailing icon"
      text: "Trailing icons can be used to signal navigation/action direction."
skill:
  name: recursica-skill-button
  path: skills/components/recursica-skill-button
  repository: https://github.com/borderux/recursica-knowledge
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Button

**A button performs an action; it does not take anyone anywhere.** That single distinction settles most cases — a button acts, a link goes somewhere. If activating it changes the address bar, it is a link, however it should look.

## When to use

- **Activating it changes something**: saves, submits, deletes, applies, or opens a modal.
- **The reader stays where they are**: the page they are on is the page they end on.
- **A process moves forward or back**: a stepper's Next and Back act on the process, not on a location.
- **The label says what will happen**: a verb plus its object — "Save page", not "OK" — because the label has to make sense read on its own.
- **There is one clear primary action**: the strongest treatment goes to the one thing this surface is for.

## When to avoid

- **The reader ends up somewhere else**: use a link with a real address. When the navigation needs to feel lightweight, use a link's text treatment rather than dressing a button down.
- **Leaving a table row for a related record**: use a link. Links are quieter, which matters at table density.
- **One value is chosen from a small set**: use a segmented control.
- **An on or off state that persists as data**: use a switch or a checkbox. A button does something; it does not hold a setting.
- **Several actions crowd a row and will not fit**: cut the list down or move the extras into a menu. Shrinking the buttons hides a structural problem rather than solving it.
- **A second equally loud action on the same surface**: give the others the quieter treatments. Two primaries mean neither one is.

## Specifications

### Styles

### Sizes

### Content

### Anatomy

<!--
LEGACY — original content exported from the Recursica website, superseded by the body above.
Retained verbatim so nothing from the old site is lost. Do not render.

# Button

**Buttons are clickable elements used to trigger actions. They are visual calls to action, with labels expressing what action will occur when the user interacts with it.**

## When to use

- **Use for actions**: Employ buttons for clear actions, like submitting forms or confirming decisions
- **Clear calls to action**: Guide users on what actions are available to them in the interface
- **Navigation**: Use buttons for guiding users through navigation or multi-step processes
- **Accessibility & Best Practices**: Provide clear, action-oriented labels (e.g., 'Save Changes' instead of 'OK') and ensure a minimum tap target of 44x44px on mobile.

## When to avoid

- **Decoration**: Don't use buttons solely for decoration; reserve them for functional actions
- **Ambiguity**: Avoid buttons with unclear labels or ambiguous actions to prevent user confusion
- **Overuse**: Don't overuse buttons; choose appropriate UI elements like links if navigating users outside of the application
- **Anti-patterns**: Avoid having more than one primary button on a single view.

## Specifications

### Styles

### Sizes

### Content

### Anatomy
-->
