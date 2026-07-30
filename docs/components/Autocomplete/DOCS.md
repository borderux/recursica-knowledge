---
title: "Autocomplete"
description: "Recursica helps agencies build client digital products faster and more consistently. Our system streamlines design, ensures brand consistency, and improves team collaboration."
previewName: "autocomplete"
specs:
  - section: "State"
    items:
      - label: "Default"
        image: "https://framerusercontent.com/images/OQpt2yMzoufRAg6u8kR33XY2X0A.svg"
      - label: "Focused"
        image: "https://framerusercontent.com/images/FStZuzKKh9zlL1OQswX6qU8KC4.svg"
      - label: "Valued"
        image: "https://framerusercontent.com/images/JFRvv0vmg5yS6YT6sDN6q7nkEBQ.svg"
  - section: "Behavior"
    items:
      - label: "Autocomplete (Optional)"
        image: "https://framerusercontent.com/images/YhGOKolhLQGD7eWUsvIJ3KKPQ8.svg"
        text: "As the user types, the search can be enhanced to show a dropdown menu of suggested queries."
anatomy:
  image: "https://framerusercontent.com/images/0UsCzzvnHf0DbTFtgwPal04Xs.svg"
  items:
    - num: 1
      label: "Content"
      text: "The leading search icon provides a visual cue, while the input area accepts a text query or displays a helpful placeholder."
    - num: 2
      label: "Clear icon"
      text: "Appears once text is entered and allows the user to instantly reset the search query."
skill:
  name: recursica-skill-autocomplete
  path: skills/components/recursica-skill-autocomplete
  repository: https://github.com/borderux/recursica-knowledge
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Autocomplete

**Autocomplete is an input that narrows a set as the reader types.** Reach for it when the reader is looking something up — because the list is too long to scroll, or because typing part of a known answer is faster than choosing from it.

## When to use

- **The list is too long to choose from**: past the point where a dropdown is readable, typing a few characters beats scrolling.
- **The reader already knows the answer**: a country, a city, an account name — typing it is faster than hunting for it.
- **Filtering a collection**: narrowing a data table, a list of people, or a grid of records that is already on the page.
- **Site-wide lookup**: a global search in the header or navigation bar.

## When to avoid

- **Standard data entry**: a name, an email, a password — use a text field. This is not a general-purpose input.
- **The set is small enough to show**: use a dropdown, radio buttons, or a segmented control. Making someone type when they could have read the options is a step backwards.
- **Filtering by a small, known set of categories**: use chips or checkboxes. Free text where the answers are fixed invites typos and dead ends.
- **The value is genuinely unpredictable**: use a text field. Autocomplete implies there is a right answer to find.
- **There is nothing to narrow**: a lookup field over three rows costs more attention than it saves.

## Specifications

### State

### Behavior

### Anatomy

<!--
CAPTURED FROM THE LIVE SITE — https://www.recursica.com/docs/components/search
This component is published as "Search"; it has since been renamed Autocomplete. It had no page
in this repository at all. The site's own wording is retained verbatim below so nothing from it
is lost, including the former name. Do not render.

### Search

Search is a specialized input field that allows users to enter a query to find relevant content within a website, application, or specific dataset. It's a fundamental tool for information discovery and navigation.

#### When to use

Site-wide search
To provide a global search function, typically placed in the main header or navigation bar.

Search filtering collections
To find or filter a specific set of content on a page, such as a data table, a list of users, or a product grid.

Knowledge bases
As the primary interaction for users to find articles or answers in a help center or documentation site.

#### When to avoid

For data entry
For standard form fields like name, email, or password, use a text input component.

With predefined options
When users need to filter by a small, known set of categories (e.g., status, type), use selects, chips, or checkboxes instead of a free-text search.
-->
