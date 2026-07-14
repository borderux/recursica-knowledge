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
