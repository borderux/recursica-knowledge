---
title: "Panel"
description: "Recursica helps agencies build client digital products faster and more consistently. Our system streamlines design, ensures brand consistency, and improves team collaboration."
previewName: "panel"
specs:
  - section: "Types"
    items:
      - label: "Standard"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/panel/assets/panel-types-standard.svg"
        text: "Displays all content without requiring the user to scroll through it. This state is suitable for short summaries, confirmations, or brief configuration forms."
      - label: "Scrollable"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/panel/assets/panel-types-scrollable.svg"
        text: "Triggered when the volume of content exceeds the panel's fixed height. The panel enables an internal scrollbar, allowing the user to view all information while the main header and footer CTAs remain pinned and accessible."
anatomy:
  image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/panel/assets/panel-anatomy.svg"
  items:
    - num: 1
      label: "Header"
      text: "Provides a clear title for context and a close icon, and should remain fixed as the user scrolls the content."
    - num: 2
      label: "Divider"
      text: "Appears on scroll to separate the header and footer from the content."
    - num: 3
      label: "Slot"
      text: "Allows for designers to swap in custom content supplementary information, forms, or navigation lists."
    - num: 4
      label: "Footer"
      text: "Fixed to provide a persistent location for primary and secondary action buttons related to the panel's content."
skill:
  name: recursica-skill-panel
  path: skills/components/recursica-skill-panel
  repository: https://github.com/borderux/recursica-knowledge
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Panel

**A panel puts supplementary content beside the page without blocking it.** It has the same header, content, and footer as a modal, but the page behind it stays live — so reach for it when the reader needs to see what they are working on while they work.

## When to use

- **The page underneath still matters**: filters, settings, a details view, or editing one thing that is on screen. This is the case a modal cannot serve.
- **Secondary detail would clutter the main view**: keep it one click away rather than crowding, or covering, the content it describes.
- **The content belongs to the current view**: it is about what is on screen, not about somewhere else in the application.
- **The result shows on the page itself**: a filter set that narrows a table gives its own feedback — the reader watches the table change.

## When to avoid

- **The task must be finished or abandoned before continuing**: use a modal. The same goes for anything irreversible that needs confirming first.
- **Confirming that something worked, or offering undo**: use a toast. A panel is too much furniture for a brief acknowledgement.
- **A long, multi-part, or substantial form**: give it a page of its own, and a stepper if it comes in stages. A panel that scrolls on and on is a page in disguise.
- **The reader needs to link to it or return to it later**: use a page with its own address. A panel opens from a button and leaves no trace in browser history.
- **The functionality has to be found**: put it on the page. A panel's contents do not exist until someone thinks to open it, which is the wrong trade for anything essential.
- **Primary or secondary application navigation**: use the application's own navigation. A panel is not a place to hide the way around.

## Specifications

### Types

### Anatomy

<!--
LEGACY — original content exported from the Recursica website, superseded by the body above.
Retained verbatim so nothing from the old site is lost. Do not render.

# Panel

**Panels slide in or expand from the edge of the screen to reveal additional content or functionality. They are commonly used to provide supplementary information, navigation options, or toolsets without cluttering the main interface.**

## When to use

- **Additional Content**: Use panels to display additional functionality that complements the main interface without overwhelming it. This may include options for: filtering, settings, editing tasks or supplementary information
- **Space Efficiency**: Use to help save screen real estate by concealing secondary information or modes within a panel
- **Accessibility & Best Practices**: Use panels for complex configuration or details that shouldn't obscure the main view.

## When to avoid

- **Critical Hidden Content**: Avoid hiding critical content or functionality within panels that can make it difficult for users to discover and access important features
- **Complex Interactions**: Panels may not be suitable for complex interactions or multi-step processes. Consider dedicating a whole page or modal dialog for extensive user input and navigation
- **Anti-patterns**: Don't use panels for brief, simple alerts or confirmations.

## Specifications

### Types

### Anatomy
-->
