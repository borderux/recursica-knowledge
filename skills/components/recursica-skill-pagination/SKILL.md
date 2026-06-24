---
name: recursica-skill-pagination
description: Trigger this when the developer asks to design, write, or refactor a UI layout containing the pagination component.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Pagination Skill

**A pagination component is a navigational element used to split a large collection of content — such as search results or products — into separate pages. It allows users to browse the content in manageable chunks without having to load everything at once.**

## Anatomy & Sub-components

This skill covers the following component specs defined in the UI Kit:

- `pagination`

---

## When to Use

- **Large data sets**: Use in ordered dataset like a table of users, a list of transactions, or a product catalog.
  - **Search results**: Sometimes, it's essential for organizing search results into browsable pages.
  - **Content archives**: Helpful for browsing blog posts, articles, or any collection of content that grows over time.
  - **Accessibility & Best Practices**: Indicate the current page clearly and provide shortcuts to the first and last pages.

---

## When Not to Use

- **Small data sets**: If the total number of items can be comfortably displayed on a single page without performance issues, pagination is unnecessary.
  - **Indefinite feeds**: For content where continuous discovery is key (like a social media feed), an "infinite scroll" or a "Load more" indicator is a better user experience.
  - **Sequential content**: Avoid paginating a single, continuous piece of content like an article or a legal document, as it disrupts the reading flow.
  - **Anti-patterns**: Avoid infinite scrolling when users need to easily reference specific items later.

---

## Best Practices

- Follow platform accessibility guidelines.
- Ensure consistent padding and alignments.

---

## Referential Libraries & Documentation

- Carbon Design System: [Carbon Pagination Documentation](https://carbondesignsystem.com)
- Material UI: [MUI Pagination Documentation](https://mui.com)
