---
title: "Pagination"
description: "Recursica helps agencies build client digital products faster and more consistently. Our system streamlines design, ensures brand consistency, and improves team collaboration."
previewName: "pagination"
specs:
  - section: "Behavior"
    items:
      - label: "First / Last buttons"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/pagination/assets/pagination-behavior-first-last-buttons.svg"
      - label: "Truncation"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/pagination/assets/pagination-behavior-truncation.svg"
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
---

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
