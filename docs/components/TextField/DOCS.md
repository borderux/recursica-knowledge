---
title: "Text field"
description: "Recursica helps agencies build client digital products faster and more consistently. Our system streamlines design, ensures brand consistency, and improves team collaboration."
previewName: "text-field"
specs:
  - section: "Label placement"
    items:
      - label: "Stacked"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/text-field/assets/text-field-label-placement-stacked.svg"
        text: "Please note that the stacked version does not truncate or wrap the label. Noting this, please try to keep the label as short as possible."
      - label: "Left to Right"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/text-field/assets/text-field-label-placement-left-to-right.svg"
        text: "Please note the wrapping and truncation rules for the left to right version and how the optional label is below the label."
  - section: "Content"
    items:
      - label: "Valued"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/text-field/assets/text-field-content-valued.svg"
      - label: "Placeholder"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/text-field/assets/text-field-content-placeholder.svg"
  - section: "States"
    items:
      - label: "Default"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/text-field/assets/text-field-states-default.svg"
      - label: "Disabled"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/text-field/assets/text-field-states-disabled.svg"
      - label: "Focused"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/text-field/assets/text-field-states-focused.svg"
      - label: "Error"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/text-field/assets/text-field-states-error.svg"
      - label: "Read only"
        image: "https://framerusercontent.com/images/CWoGZVREpZtBIcD55AEfVboMs.svg"
anatomy:
  image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/text-field/assets/text-field-anatomy.svg"
  items:
    - num: 1
      label: "Label"
      text: 'Should indicate some kind of instruction for selection. If majority of fields are required in a single form, the "Option" label can be toggled on. If majority of fields are optional, the "Required asterisks" should instead be toggled on.'
    - num: 2
      label: "Lead / Trailing icon"
      text: "Optional icons can be placed on either the leading or trailing edge to add visual meaning or functionality to the text field."
    - num: 3
      label: "Assistive text"
      text: "For additional instructions or validation messages, which can be paired with an icon for enhanced visual meaning."
skill:
  name: recursica-skill-text-field
  path: skills/components/recursica-skill-text-field
  repository: https://github.com/borderux/recursica-knowledge
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Text field

**The text field lets someone enter and edit a single line of text.** Reach for it when the value can't be predicted from a set of options, and when typing it is faster than choosing it.

## When to use

- **The value is unpredictable**: names, addresses, descriptions, references — anything a preset list couldn't enumerate.
- **Typing beats choosing**: memorable data someone enters faster by hand than by navigating a control.
- **Short, single-line content**: any combination of letters, numbers, and symbols.

## When to avoid

- **The value comes from a known set**: use a dropdown, radio group, or autocomplete. A free-form field over a fixed set of answers invites errors.
- **The answer is yes or no**: use a switch or a checkbox.
- **The content runs to multiple lines**: use a textarea. A single-line field scrolls its value sideways, which makes long entries unreadable.
- **A number that needs increment controls**: use a number input.
- **The value is never editable**: use the read-only field. A disabled input isn't a way to display a value.
- **Placeholder text as the label**: it disappears on the first keystroke, so anything needed to complete the field is lost.

## Specifications

### Label placement

### Content

### States

### Anatomy

<!--
LEGACY — original content exported from the Recursica website, superseded by the body above.
Retained verbatim so nothing from the old site is lost. Do not render.

# Text field

**The text field allows users to enter and edit text.**

## When to use

- **User information**: Text fields allow users to enter information such as contact or payment information
- **Flexible content**: Text fields are flexible fields that allow different inputs like text, paragraphs, or numeric values
- **Accessibility & Best Practices**: Provide clear labels, placeholder text, and helpful error messages below the field.

## When to avoid

- **Specified answers**: In the case that users are expected to respond a certain way, you may consider using a dropdown instead
- **Yes or no answers**: In the case that users are supposed to indicate a simple yes or no answer, you may consider using a switch instead
- **Anti-patterns**: Avoid relying solely on placeholder text as a label, since it disappears on input.

## Specifications

### Label placement

### Content

### States

### Anatomy
-->
