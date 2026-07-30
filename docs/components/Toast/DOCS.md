---
title: "Toast"
description: "Recursica helps agencies build client digital products faster and more consistently. Our system streamlines design, ensures brand consistency, and improves team collaboration."
previewName: "toast"
specs:
  - section: "Message"
    items:
      - label: "With Action"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/toast/assets/toast-message-with-action.svg"
      - label: "Without Action"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/toast/assets/toast-message-without-action.svg"
  - section: "Types"
    items:
      - label: "Information"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/toast/assets/toast-types-information.svg"
      - label: "Success"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/toast/assets/toast-types-success.svg"
      - label: "Error"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/toast/assets/toast-types-error.svg"
anatomy:
  image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/toast/assets/toast-anatomy.svg"
  items:
    - num: 1
      label: "Icon"
      text: "Provides immediate visual context for the message type, such as success, error, or warning."
    - num: 2
      label: "Message"
      text: "Should be a brief, clear, and concise statement confirming the result of the user's recent action."
    - num: 3
      label: "Action button"
      text: 'Optional and can be included to offer the user a single, contextual follow-up, such as "Undo" or "View details."'
    - num: 4
      label: "Close icon"
      text: "Allows the user to manually dismiss the toast, overriding the default auto-dismiss timer."
skill:
  name: recursica-skill-toast
  path: skills/components/recursica-skill-toast
  repository: https://github.com/borderux/recursica-knowledge
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Toast

**A toast is a brief message reporting what just happened, without interrupting the work.** Reach for it to confirm that something succeeded, and to offer the reader a way to undo it.

## When to use

- **Confirming that an action succeeded**: saved, deleted, sent. The toast is the only place in the system that carries a success treatment, so confirmation belongs here rather than on a field.
- **Offering an undo**: when an action applies across the screen or the application, the toast is where the reader takes it back.
- **Reporting an error with no field to attach it to**: a conflict on the server, a business rule the request broke, a background job that failed.
- **A low-priority update**: about a task the reader took, or one taken on their behalf, that does not need their attention right now.

## When to avoid

- **Asking someone to confirm a reversible action**: just do it and offer an undo in the toast. A confirmation step for something easily reversed is a question nobody needed to be asked.
- **A validation error on a specific field**: use the field's own error state, which stays put next to the thing that needs fixing.
- **Undoing the delete of a single row or item**: put the undo where the delete control was, which is where the reader is already looking.
- **A decision that has to be made before continuing, or destruction that cannot be undone**: use a modal and ask up front.
- **Anything the reader must act on or refer back to**: put it on the page. A toast appears away from where they are looking and leaves on its own, so it is safe to miss by design.
- **Progress while an action is still running**: use the loading state on the button that started it, or a loader. A toast reports a result, not a wait.

## Specifications

### Message

### Types

### Anatomy

<!--
LEGACY — original content exported from the Recursica website, superseded by the body above.
Retained verbatim so nothing from the old site is lost. Do not render.

# Toast

**Toasts display brief notifications that appear towards the bottom of the screen. They provide feedback or information to users without interrupting their current workflow.**

## When to use

- **Low priority update**: Toasts are good for low priority updates regarding a task the user has taken or is being taken
- **Minimal interruption**: Use toasts to give updates with little interruption to the user’s workflow such as: successful updates, errors messages, and confirmation like saving or deleting items
- **Accessibility & Best Practices**: Ensure toasts auto-dismiss after a reasonable time (e.g., 4-6s) and provide a manual close button.

## When to avoid

- **Urgent / critical action**: Avoid using toasts for critical alerts that require immediate attention or user action, as they can be easily missed or dismissed without notice. Instead, use banners
- **Long-term information**: Don’t display persistent information that users may need to reference later. Toasts are best suited for transient messages that can disappear after a short period
- **Anti-patterns**: Don't use toasts for critical system alerts or errors that require immediate user action.

## Specifications

### Message

### Types

### Anatomy
-->
