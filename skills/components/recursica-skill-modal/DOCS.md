---
title: "Modal"
description: "Recursica helps agencies build client digital products faster and more consistently. Our system streamlines design, ensures brand consistency, and improves team collaboration."
previewName: "modal"
specs:
  - section: "Sample"
    items:
      - label: "Demands immediate user attention to confirm a critical action or respond to a system event before the user can resume work in the main application."
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/modal/assets/modal-sample-demands-immediate-user-attention-to-confirm-a-critical-action-or-respond-to-a-system-event-before-the-user-can-resume-work-in-the-main-application.svg"
anatomy:
  image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/modal/assets/modal-anatomy.svg"
  items:
    - num: 1
      label: "Title"
      text: "Should provide a clear and concise summary of the modal's purpose or the key question being asked."
    - num: 2
      label: "Slot"
      text: "Allows designers to swap in customizable content. Can be plain text, a form, and / or images. Keep content in modals brief to help the user understand information or to quickly complete a task."
    - num: 3
      label: "Divider"
      text: "Only appears on scroll in modals with longer content."
    - num: 4
      label: "Footer"
      text: "Fixed to provide a persistent location for primary and secondary action buttons related to the modal's content. Almost always, the primary action should allow the user to complete and close the modal."
skill:
  name: recursica-skill-modal
  path: skills/components/recursica-skill-modal
  repository: https://github.com/borderux/recursica-knowledge
---

# Modal

**Modals are a type of window that appears in front of a page’s content to provide information or ask for a decision. Modals require immediate attention and disable all functionality until the user decides to confirm, dismiss or take appropriate action.**

## When to use

- **Focused action**: Use modals to have users complete actions in a focused setting
- **Immediate attention**: As modals isolate users in a mode, modals can be used to indicate that a task needs immediate attention in order to progress
- **Preventative measure**: Use modals as a way to confirm that the user understands the action they’re about to take and the consequences of following through
- **Accessibility & Best Practices**: Trap keyboard focus within the modal while it's open, and allow dismissal via the Escape key.

## When to avoid

- **Related to covered content**: As modals appear on top of content, it takes users out of context and may unintentionally make it harder for the user to complete the task without being able to view the content
- **Repeated interruption**: Modals should be used sparingly as each time it is used, it forces the user into a focused mode, taking time away from the previous flow
- **Anti-patterns**: Avoid opening modals from within other modals.

## Specifications

### Sample

### Anatomy
