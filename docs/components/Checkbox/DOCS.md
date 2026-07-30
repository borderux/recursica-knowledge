---
title: "Checkbox"
description: "Recursica helps agencies build client digital products faster and more consistently. Our system streamlines design, ensures brand consistency, and improves team collaboration."
previewName: "checkbox"
specs:
  - section: "Label placement"
    items:
      - label: "Stacked"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/checkbox/assets/checkbox-label-placement-stacked.svg"
        text: "The stacked version does not truncate or wrap the label. Noting this, please try to keep the label as short as possible."
      - label: "Left to right"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/checkbox/assets/checkbox-label-placement-left-to-right.svg"
        text: 'Please note the wrapping and truncation rules for the left to right version and how the "Optional" label is below the label.'
  - section: "States"
    items:
      - label: "Selected"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/checkbox/assets/checkbox-states-selected.svg"
      - label: "Selected-disabled"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/checkbox/assets/checkbox-states-selected-disabled.svg"
      - label: "Indeterminate"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/checkbox/assets/checkbox-states-indeterminate.svg"
      - label: "Indeterminate-disabled"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/checkbox/assets/checkbox-states-indeterminate-disabled.svg"
      - label: "Unselected"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/checkbox/assets/checkbox-states-unselected.svg"
      - label: "Unselected-disabled"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/checkbox/assets/checkbox-states-unselected-disabled.svg"
anatomy:
  image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/checkbox/assets/checkbox-anatomy.svg"
  items:
    - num: 1
      label: "Label"
      text: 'Should indicate some kind of instruction for selection. If majority of fields are required in a single form, the "Option" label can be toggled on. If majority of fields are optional, the "Required asterisks" should instead be toggled on.'
    - num: 2
      label: "Group"
      text: "A checkbox group must include at least two or more items for a proper selection"
skill:
  name: recursica-skill-checkbox
  path: skills/components/recursica-skill-checkbox
  repository: https://github.com/borderux/recursica-knowledge
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Checkbox

**A checkbox turns one value on or off.** A group of them is how several related choices are combined, letting someone select none, some, or all of them. Items in a group stack vertically.

## When to use

- **Any number of options may be selected**: the options are independent and not mutually exclusive.
- **Every option should be visible at once**: a stacked, scannable list beats opening something to find out what is available.
- **The options have a parent and children**: a parent box summarises its sub-list, and shows a partly-selected state when only some children are chosen.
- **The choice commits with the form**: on submit, not the instant a box is ticked.
- **Some options can start out selected**: pre-selecting none, some, or all is fine in a checkbox group.

## When to avoid

- **Exactly one option may be chosen**: use radio buttons. Checkboxes suggest that more than one is allowed.
- **The change must apply the moment it is flipped**: use a switch.
- **There is one lone yes-or-no field with no peers**: a switch usually reads better in a form.
- **There are more options than stay scannable**: use a multi-select dropdown. Around seven is the practical ceiling, fewer when the options are hard to tell apart — and a very long form is a fair reason to collapse a group even below that.
- **The options need to sit in a row**: use selectable chips. A horizontal row of checkboxes makes it hard to tell which box belongs to which label, so a group is never rotated sideways.
- **The value is never editable here**: use the read-only field. A disabled checkbox is not a way to display a value.

## Specifications

### Label placement

### States

### Anatomy

<!--
LEGACY — original content exported from the Recursica website, superseded by the body above.
Retained verbatim so nothing from the old site is lost. Do not render.

# Checkbox

**Checkboxes allow users to select one or more items from a list.**

## When to use

- **Multiple selection**: Use checkboxes to allow users to select one or more items
- **Scannable lists**: Use radio groups to show users all the options that are available to choose from all at once
- **Present sub-lists**: Checkboxes allow users to see a parent-child relationship with other checkboxes
- **Accessibility & Best Practices**: Use checkboxes for independent, non-mutually exclusive selections.

## When to avoid

- **Single selection**: If users can only select one option from a list, consider using radio buttons instead of checkboxes
- **Too many options**: For cases requiring a large amount of items in the list, consider using a selectable dropdown menu in a form setting
- **Anti-patterns**: Don't use checkboxes when a change requires immediate application (use a switch instead).

## Specifications

### Label placement

### States

### Anatomy
-->
