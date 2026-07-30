---
title: "Pagination"
description: "Recursica helps agencies build client digital products faster and more consistently. Our system streamlines design, ensures brand consistency, and improves team collaboration."
previewName: "pagination"
specs:
  - section: "Behavior"
    items:
      - label: "First / Last buttons"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/pagination/assets/pagination-behavior-first-last-buttons.svg"
        text: "An optional boolean (True / False) property. Jumps the user directly to the first or last page in a larger pagination set."
      - label: "Truncation"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/pagination/assets/pagination-behavior-truncation.svg"
        text: "When the total number of pages exceeds the visible number of items, an ellipsis (...) is used to indicate a gap in the page sequence. This ensures a more compact component."
anatomy:
  image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/pagination/assets/pagination-anatomy.svg"
  items:
    - num: 1
      label: "Page item"
      text: "A clickable element, usually a number, that navigates to a specific page. Can be active (filled background) to represent the user's current page."
    - num: 2
      label: "Ellipsis"
      text: "A non-interactive indicator representing a range of skipped page numbers."
    - num: 3
      label: "Previous / Next controls"
      text: "Arrow buttons (<, >) for navigating one page at a time."
    - num: 4
      label: "First / Last controls"
      text: "Buttons that navigate to the first (<<) or last (>>) page in a large number of page items."
skill:
  name: recursica-skill-pagination
  path: skills/components/recursica-skill-pagination
  repository: https://github.com/borderux/recursica-knowledge
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Pagination

**Pagination moves the reader between pages of one set of records.** It belongs to the table it serves, sitting in the table's footer — it is a way through records, not a way around the application.

## When to use

- **A table holds more records than it can show**: a table set inside a larger page shows a fixed handful of rows — five or ten is plenty — and pagination carries the rest.
- **The table should not scroll**: every row it holds is visible at once, so nothing is hidden behind a scrollbar in either direction.
- **The order is stable and someone will come back to a position**: a reader who reaches page 7, opens a record, and returns should land on page 7 again. Continuous scrolling cannot promise that.
- **The current page is marked plainly**: page numbers only help if the reader can tell at a glance which one they are on.

## When to avoid

- **A full-size table filling its container**: use infinite scroll. Clicking through page after page of a large grid is a clunky way to read it.
- **A feed built for continuous discovery**: use infinite scroll, and pick that once for the whole product so every table behaves the way the reader expects.
- **The whole set fits on one page**: show no controls at all. Page numbers for a single page are noise.
- **One long, continuous document**: use a different structure. Splitting prose into pages breaks the reading.
- **Showing the reader where they are in the application**: use breadcrumbs. Pagination says which page of a list, not which part of the product.
- **A process that moves through ordered steps**: use a stepper.

## Specifications

### Behavior

### Anatomy

<!--
LEGACY — original content exported from the Recursica website, superseded by the body above.
Retained verbatim so nothing from the old site is lost. Do not render.

# Pagination

**A pagination component is a navigational element used to split a large collection of content — such as search results or products — into separate pages. It allows users to browse the content in manageable chunks without having to load everything at once.**

## When to use

- **Large data sets**: Use in ordered dataset like a table of users, a list of transactions, or a product catalog.
- **Search results**: Sometimes, it's essential for organizing search results into browsable pages.
- **Content archives**: Helpful for browsing blog posts, articles, or any collection of content that grows over time.
- **Accessibility & Best Practices**: Indicate the current page clearly and provide shortcuts to the first and last pages.

## When to avoid

- **Small data sets**: If the total number of items can be comfortably displayed on a single page without performance issues, pagination is unnecessary.
- **Indefinite feeds**: For content where continuous discovery is key (like a social media feed), an "infinite scroll" or a "Load more" indicator is a better user experience.
- **Sequential content**: Avoid paginating a single, continuous piece of content like an article or a legal document, as it disrupts the reading flow.
- **Anti-patterns**: Avoid infinite scrolling when users need to easily reference specific items later.

## Specifications

### Behavior

### Anatomy
-->
