---
title: "Link"
description: "Recursica helps agencies build client digital products faster and more consistently. Our system streamlines design, ensures brand consistency, and improves team collaboration."
previewName: "link"
specs:
  - section: "Variations"
    items:
      - label: "Standalone"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/link/assets/link-variations-a-link-that-appears-as-a-block-level-or-standalone-element-it-is-typically-used-for-navigation-or-calls-to-action.svg"
        text: "A link that appears as a block-level or standalone element. It is typically used for navigation or calls-to-action."
      - label: "Inline"
        image: "https://framerusercontent.com/images/8xyOQOFrCG5fCyyWZ6vOP0SNvgE.svg"
        text: "A link that is part of a larger block of text, like a sentence. Its styling is designed to be clear but not disruptive to the reading flow."
  - section: "Behavior"
    items:
      - label: "Navigation"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/link/assets/link-behavior-navigation.svg"
        text: 'Clicking a link navigates the user to the destination specified in its "href" attribute.'
      - label: "External link"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/link/assets/link-behavior-external-link.svg"
        text: 'Links that navigate to an external website or domain should be accompanied by an "external link" icon to inform the user they are leaving the current site. This helps manage user expectations.'
anatomy:
  image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/link/assets/link-anatomy.svg"
  items:
    - num: 1
      label: "Link text"
      text: "The descriptive, clickable text that informs the user about the link's destination."
    - num: 2
      label: "Icon (Lead / Trailing)"
      text: "An icon, typically placed after or before the text, to provide additional context (e.g., an external link icon, a download icon)."
skill:
  name: recursica-skill-link
  path: skills/components/recursica-skill-link
  repository: https://github.com/borderux/recursica-knowledge
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Link

**A link takes someone somewhere; it never changes data.** That is the whole distinction from a button: a link goes to a location, a button performs an action. Getting it right is what lets people predict what will happen before they commit.

## When to use

- **Activating it changes the location**: another page, a section of this page, an external site, or a file to download.
- **The navigation sits inside prose**: a source, a definition, a related record mentioned in a sentence.
- **The navigation stands on its own**: a menu, a footer, a "view all" beside a heading.
- **Leaving a table row for a related record**: a link is quieter than a button, which is what dense rows need.

## When to avoid

- **It changes data or state**: use a button. Save, Delete, Close, and Apply are buttons even when a link would look tidier.
- **It only needs to look lightweight**: use a button in the text style. Looking quiet is a matter of styling, not of meaning.
- **It opens a modal on the same page**: use a button. A modal is not a location.
- **The destination is unavailable right now**: omit the link, or say why in text. Links are not disabled — a greyed-out link explains nothing and cannot be reached by keyboard.
- **The label would read "Click here" or "Learn more"**: name the destination instead — "Billing settings". People scanning a list of links out of context need each one to make sense on its own.
- **The text is only wired to a click**: use a real link, so right-click, middle-click, copy link address, and open in a new tab all work. For the same reason, let the reader decide when a new tab opens rather than forcing one.

## Specifications

### Variations

### Behavior

### Anatomy

<!--
LEGACY — original content exported from the Recursica website, superseded by the body above.
Retained verbatim so nothing from the old site is lost. Do not render.

# Link

**A link is an interactive text element that navigates the user to a new location. This destination can be another page, a specific section within the current page, an external website, or a resource to be downloaded.**

## When to use

- **Standalone**: Use for navigation that stands on its own, such as in menus, footers, or as a call-to-action to view more information.
- **Inline**: Use within a sentence or paragraph to link to relevant context, sources, or definitions without disrupting the flow of the text.
- **Accessibility & Best Practices**: Clearly distinguish links from normal text using color, underline, or both.

## When to avoid

- **For primary actions**: Do not use a link for actions that change data or the state of the current interface (e.g., "Save," "Submit," "Delete," "Close"). Use a button for such actions. Links should strictly be used for navigation.
- **With vague text**: Avoid generic link text like "Click Here" or "Learn More." Link text should be descriptive and clearly communicate the destination to improve accessibility and user experience.
- **Anti-patterns**: Don't use links for actions that mutate state (e.g., Delete, Save); use buttons instead.

## Specifications

### Variations

### Behavior

### Anatomy
-->
