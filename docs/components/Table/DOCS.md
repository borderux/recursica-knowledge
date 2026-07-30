---
title: "Table"
description: "A table displays a structured set of data in rows and columns, letting users compare, sort, and scan values across many records at once."
previewName: "table"
specs:
  - section: "Table properties"
    items:
      - label: "Header"
        image: "https://framerusercontent.com/images/K80IcYNar4i2O5qk6oCXJJbUYe0.svg"
        text: "The header contains the table title, a search bar, and primary action buttons, all of which are optional."
      - label: "Pagination"
        image: "https://framerusercontent.com/images/wyYIMoU1N0qBTHheq0tqRpOs4qM.svg"
        text: "Use for navigating large data sets or to minimize a long scrolling data set. Pagination is optional."
      - label: "Border"
        image: "https://framerusercontent.com/images/vEfmssbKpLMJdDBETFYFimBoZwM.svg"
        text: "The border around the table is also optional. For UIs that utilize borders to separate sections or layers on a page."
  - section: "Column header properties"
    items:
      - label: "Sort"
        image: "https://framerusercontent.com/images/Sslbn77lhq6XbiFtEGo1vYI1A.svg"
        text: "Controls the sorting state and corresponding icon for a column (Not sortable, Is sortable, Ascending, Descending)."
      - label: "Alignment"
        image: "https://framerusercontent.com/images/Nz8CraGLmaPA3Hk4mrsNg7TgTcQ.svg"
        text: "Sets the horizontal alignment of the header text (Left, Center, Right)."
  - section: "Cell properties"
    items:
      - label: "Text, text strong, supporting text"
        image: "https://framerusercontent.com/images/d5Cf6iyz0qzjLspN4BHxkM68GwI.svg"
      - label: "Link"
        image: "https://framerusercontent.com/images/10uubmBmlLgnTEzOlQRgxrvMjK4.svg"
      - label: "Icon, badge, button"
        image: "https://framerusercontent.com/images/1vDq7T6GJuTSVtQjIEY7yEThKsY.svg"
      - label: "Checkbox, radio, chevron"
        image: "https://framerusercontent.com/images/gaLACloAiDPSdc5SRtmRx8bZT4U.svg"
      - label: "Action icons"
        image: "https://framerusercontent.com/images/9d5FPdwaxLCJfdfi1anlqXodSKc.svg"
      - label: "Slot"
        image: "https://framerusercontent.com/images/lyUeysaCzzMfTnfcvoRqm88MXgI.svg"
  - section: "Row properties"
    items:
      - label: "Zebra stripe"
        image: "https://framerusercontent.com/images/GDPO1NDomGfPMpwwFdBOsPou74.svg"
        text: "Applies alternating background colors to rows to improve readability."
      - label: "Default, hover, selected, focus"
        image: "https://framerusercontent.com/images/TslLxXLbX4XKP4Jwo6I8gRKfFU.svg"
anatomy:
  image: "https://framerusercontent.com/images/u8KzxKUyGEglnqW2kCqM2VSI1E.svg"
  items:
    - num: 1
      label: "Table header (Optional)"
      text: "The top-level section above the table, containing the title, a search field, and primary action buttons."
    - num: 2
      label: "Column headers"
      text: "The row at the top of the table that labels each data column and often includes sorting controls."
    - num: 3
      label: "Cell"
      text: "The individual container for a piece of data at the intersection of a row and column."
    - num: 4
      label: "Pagination (Optional)"
      text: "The section at the bottom of the table that allows users to navigate through pages of data."
    - num: 5
      label: "Border (Optional)"
      text: "The outer border that frames the entire table. Fo UIs that utilize borders for sections or layers on pages."
    - num: 6
      label: "Caption (Optional)"
      text: "A brief title or description of the table's content, positioned below the table."
skill:
  name: recursica-skill-table
  path: skills/components/recursica-skill-table
  repository: https://github.com/borderux/recursica-knowledge
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Table

**A table displays a structured set of data in rows and columns, allowing users to compare, sort, and scan values across many records at a glance.** It is the default whenever a screen has to present a set of records that is large, unbounded, or still growing.

## When to use

- **Many records of one kind**: user lists, product inventories, financial reports — anything where the same attributes repeat on every row.
- **Comparing values**: a column is what lets someone read one attribute across every record at once. Nothing else does that as well.
- **The content is plain data**: text, numbers, dates, currency, status.
- **Sorting, filtering, or selecting rows is part of the work**: a table is built for working with the data, not just displaying it.

## When to avoid

- **A small, finite set where each item carries a chart or an image**: use cards. Once each item has a graphic, columns stop earning their keep.
- **The properties of a single object**: use a detail view or a form. There is nothing to compare a lone row against.
- **A plain list of names with no attributes**: use a list. Column structure with nothing in it adds work without adding meaning.
- **The data has a parent-child hierarchy**: use a tree, which can show the nesting a flat row cannot.
- **Laying out a page**: use layout. A table is for data, never for positioning things.
- **The table is too wide for the screen**: that is too many columns rather than a missing scrollbar. Cut columns, let someone open a record for the rest, or stack two related values in one cell.

## Specifications

### Table properties

### Column header properties

### Cell properties

### Row properties

### Anatomy

<!--
LEGACY — original content exported from the Recursica website, superseded by the body above.
Retained verbatim so nothing from the old site is lost. Do not render.

# Table

**A table is a component that organizes and displays large sets of structured data in a grid of rows and columns. It's designed to make complex information easy to scan, compare, sort, and analyze.**

## When to use

- **Displaying dense data**: Ideal for user lists, product inventories, financial reports, or any dataset with clear attributes.
- **Comparing information**: Use when users need to compare items by viewing their corresponding values in each column.
- **Data manipulation**: When functionalities like sorting, filtering, and row selection are necessary for the user to work with the data.

## When to avoid

- **Unstructured content**: For simple, non-tabular data, create a list or use a menu component.
- **Visually rich content**: When presenting a collection of heterogeneous items with a strong visual focus (like images and long descriptions), cards are a better choice.
- **Small screens**: Complex tables can be difficult to use on mobile devices. Consider a responsive approach that refactors the table into a list or card view on smaller screens.

## Specifications

### States

### Tab styles

### Orientation

### Anatomy
-->
