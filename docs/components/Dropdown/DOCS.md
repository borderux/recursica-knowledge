---
title: "Dropdown"
description: "Recursica helps agencies build client digital products faster and more consistently. Our system streamlines design, ensures brand consistency, and improves team collaboration."
previewName: "dropdown"
specs:
  - section: "Label placement"
    items:
      - label: "Stacked"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/dropdown/assets/dropdown-label-placement-stacked.svg"
        text: "Please note that the stacked version does not truncate or wrap the label. Noting this, please try to keep the label as short as possible."
      - label: "Left to Right"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/dropdown/assets/dropdown-label-placement-left-to-right.svg"
        text: "Please note the wrapping and truncation rules for the left to right version and how the optional label is below the label."
  - section: "Content"
    items:
      - label: "Valued"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/dropdown/assets/dropdown-content-valued.svg"
      - label: "Placeholder"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/dropdown/assets/dropdown-content-placeholder.svg"
  - section: "States"
    items:
      - label: "Default"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/dropdown/assets/dropdown-states-default.svg"
      - label: "Error"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/dropdown/assets/dropdown-states-error.svg"
      - label: "Focused"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/dropdown/assets/dropdown-states-focused.svg"
      - label: "Disabled"
        image: "https://framerusercontent.com/images/sfDvl2jzq2LmyrRSXgEk9aNnME.svg"
anatomy:
  image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/dropdown/assets/dropdown-anatomy.svg"
  items:
    - num: 1
      label: "Label"
      text: 'Should indicate some kind of instruction for selection. If majority of fields are required in a single form, the "Option" label can be toggled on. If majority of fields are optional, the "Required asterisks" should instead be toggled on.'
    - num: 2
      label: "Lead icon"
      text: "Is optional and may help indicate the content of the dropdown."
    - num: 3
      label: "Assistive text"
      text: 'A persistent message below the field to provide guidance or context (e.g. "You can only select one option").'
    - num: 4
      label: "Text"
      text: "Can be either a placeholder or valued text to display the selected item."
    - num: 5
      label: "Trailing icon"
      text: "Indicates whether the dropdown is expanded to display its menu."
skill:
  name: recursica-skill-dropdown
  path: skills/components/recursica-skill-dropdown
  repository: https://github.com/borderux/recursica-knowledge
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Dropdown

**The dropdown is a form field that hides its options until it is opened, and returns one value from that set.** Reach for it when the answers are a known, finite set someone recognizes on sight, and the page cannot spare the room to show them all.

## When to use

- **The set of answers is specific and finite**: someone picks a value from it rather than typing one.
- **There are more options than a visible group can carry**: past roughly seven, and never more than eight, a radio group stops being readable.
- **Space is the constraint**: a dropdown is compact, so it can stand in for a radio group or a checklist in a long form that cannot afford the scroll.
- **The reader knows what is inside before they open it**: US states work well because everyone has a rough sense of the list. Fifty unrelated values do not.

## When to avoid

- **There are fewer than four options**: use radio buttons. Hiding three things earns nothing and costs a click.
- **The options need to stay visible while someone decides**: use a radio group, or checkboxes when more than one answer is allowed. Comparing candidates behind a closed list is slow work.
- **The list is long and the values are familiar**: use an autocomplete, so someone can type the first few letters instead of scrolling.
- **Two to five choices read well side by side**: use a segmented control, which shows the whole set at a glance.
- **The list is actions rather than values**: use a menu. A dropdown holds a value; a menu does something.
- **The value is never editable here**: use the read-only field. A disabled dropdown is not a way to display a value, and a disabled field is skipped by the keyboard, so the reason has to be in text nearby.

## Specifications

### Label placement

### Content

### States

### Anatomy

<!--
LEGACY — original content exported from the Recursica website, superseded by the body above.
Retained verbatim so nothing from the old site is lost. Do not render.

# Dropdown

**The dropdown is a form control that allows the user to select from a set of options.**

## When to use

- **Limited & specific selection**: Dropdowns are optimal when you have a specific set of answers that user selects from
- **Compact design**: Due to their compact design, you may opt to use a dropdown instead of a checklist or radio group to use less space
- **Accessibility & Best Practices**: Provide a sensible default and ensure the dropdown list doesn't get clipped by the viewport.

## When to avoid

- **Too many options**: To avoid having users scroll through a long list, you may consider a typeahead/autocomplete if the user is familiar with the options given in the dropdown menu
- **Lack of visibility**: To avoid selections being hidden from view when selecting, you may consider a radio group instead
- **Anti-patterns**: Avoid dropdowns when there are fewer than 4 options (use radio buttons instead).

## Specifications

### Label placement

### Content

### States

### Anatomy
-->
