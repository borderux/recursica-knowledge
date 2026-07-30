---
title: "Radio"
description: "Recursica helps agencies build client digital products faster and more consistently. Our system streamlines design, ensures brand consistency, and improves team collaboration."
previewName: "radio"
specs:
  - section: "Label placement"
    items:
      - label: "Stacked"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/radio/assets/radio-label-placement-stacked.svg"
        text: "The stacked version does not truncate or wrap the label. Noting this, please try to keep the label as short as possible."
      - label: "Left to Right"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/radio/assets/radio-label-placement-left-to-right.svg"
        text: 'Please note the wrapping and truncation rules for the left to right version and how the "Optional" label is below the label.'
  - section: "States"
    items:
      - label: "Enabled Selected"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/radio/assets/radio-states-enabled-selected.svg"
      - label: "Disabled Selected"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/radio/assets/radio-states-disabled-selected.svg"
      - label: "Enabled Unselected"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/radio/assets/radio-states-enabled-unselected.svg"
      - label: "Disabled Unselected"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/radio/assets/radio-states-disabled-unselected.svg"
anatomy:
  image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/radio/assets/radio-anatomy.svg"
  items:
    - num: 1
      label: "Label"
      text: 'Should indicate some kind of instruction for selection. If majority of fields are required in a single form, the "Option" label can be toggled on. If majority of fields are optional, the "Required asterisks" should instead be toggled on.'
    - num: 2
      label: "Group"
      text: "A radio group must include two or more items for a proper selection. By default, it's best practice to always have the top radio button in a group selected. For progressive disclosure forms, always display a radio group with no radio items selected."
skill:
  name: recursica-skill-radio-button
  path: skills/components/recursica-skill-radio-button
  repository: https://github.com/borderux/recursica-knowledge
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Radio

**A radio group is one question with several answers, of which exactly one can be chosen.** Reach for it when the options are few enough to read side by side, stacked one per row so each choice sits clearly beside its own label.

## When to use

- **Exactly one option applies**: the answers are mutually exclusive, and one of them has to be picked.
- **Every option should be visible**: the reader compares the whole set in place instead of opening something to find out what is on offer.
- **The set is small**: keep it to a handful — around seven at most, fewer when the options are unfamiliar, dissimilar, or need real expertise to tell apart.
- **The choice commits with the form**: it is saved on submit along with the fields around it, not the instant it is clicked.

## When to avoid

- **More than one answer can apply**: use checkboxes. A checkbox means "as many as apply", which is a different question entirely.
- **The value is on or off, and the opposite is obvious**: use a switch.
- **There are more options than a group can comfortably hold**: use a single-select dropdown, which keeps a long list tidy.
- **The reader will type to find a value in a long, familiar list**: use an autocomplete.
- **The options have to sit in a row**: use a segmented control, which is built for two to five short options. Radio buttons stay stacked, and tabs are not a substitute.
- **The value is never editable here**: use a read-only field, which shows the label and the value with no control at all.

## Specifications

### Label placement

### States

### Anatomy

<!--
LEGACY — original content exported from the Recursica website, superseded by the body above.
Retained verbatim so nothing from the old site is lost. Do not render.

# Radio

**Radio buttons allow users to select a single item from a list.**

## When to use

- **Single selection**: Use radio buttons to restrict users to only being able to choose a single item
- **Scannable lists**: Use radio groups to show users all the options that are available to choose from all at once
- **Accessibility & Best Practices**: Use radio buttons when users must select exactly one option from a mutually exclusive list.

## When to avoid

- **Too many options**: For cases requiring more than 8 items in the list, consider using a selectable dropdown menu in a form setting
- **Anti-patterns**: Don't use radio buttons for binary on/off states that take immediate effect (use a switch).

## Specifications

### Label placement

### States

### Anatomy
-->
