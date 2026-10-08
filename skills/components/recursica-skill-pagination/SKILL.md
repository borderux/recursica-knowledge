---
name: recursica-skill-pagination
description: Rules for the Recursica pagination, a table's footer control — which tables page and which scroll, row counts from the table, page numbers as links, and announcing the page and handling focus. Use for paging a table or result set. Whether a table pages at all is in recursica-skill-tables.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Pagination

Pagination moves the persona between pages of one list of records. Pagination is a control in a table's footer, not a way to move around the application.

## When to use pagination

- **An interior table holds more records than the table's fixed number of table rows.** An interior table is a smaller table set inside a container, beside other elements. `recursica-skill-tables` gives an interior table a fixed five or ten table rows. An interior table with more records than those table rows paginates.
- **The interior table must not scroll**, in either direction. Every table row is visible without scrolling. Pagination shows the records that do not fit in the visible table rows.
- **The persona needs to come back later to a specific place in an ordered list of records.** Continuous scrolling does not keep the persona's place.

## When not to use pagination

| Situation                                                             | Use instead                                                                                                                                |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| A full-size table fills the width and height of the table's container | Infinite scroll. `recursica-skill-tables` prefers infinite scroll, because pagination makes the persona click through records page by page |
| A feed built for continuous browsing                                  | Infinite scroll, chosen once for the whole system                                                                                          |
| Every record fits on one page                                         | No pagination. Never show pagination controls for a single page                                                                            |
| One continuous document runs long                                     | A different structure. Never paginate running text                                                                                         |
| The persona needs to know the current location in the app             | `recursica-skill-breadcrumb`                                                                                                               |
| A process moves through ordered steps                                 | `recursica-skill-stepper`                                                                                                                  |

**Choose pagination or infinite scroll once for the whole system, not for each screen.** `recursica-skill-system-conventions` requires one behavior for the whole application. Full-size tables scroll, and interior tables paginate, on every screen. When tables mix the two behaviors, the persona cannot predict how any table behaves.

## Variants

**Use only the pagination variants and options that the Recursica MCP server lists for the project.** A designer can add variants and options in Theme Forge, so each project can differ. Get the list with the server's `recursica_get_component_doc` tool, and use the names the code uses. Never invent a variant or an option.

The rules below describe each option by role. The names in the standard UI kit (the unchanged UI kit in the official Recursica release) are examples only.

- **Pagination has three groups of controls, and each group has a separate look.** A page number is a control that goes to one page of the table. The current page number marks the page the table shows now. The previous control goes to the page before the current page, and the next control goes to the page after the current page. The three groups are the current page number, the other page numbers, and the previous and next controls. In the standard UI kit, the groups are `active-pages`, `inactive-pages` and `navigation-controls`. Never restyle the page numbers to match the previous and next controls, or the previous and next controls to match the page numbers.
- **The current-page style changes only the look of the current page number, not a state in the code.** The current-page style does not tell a screen reader which page is current. Mark the current page as current in code as well, as "Screen readers" below says.
- **If the project has a rows-per-page select or a results readout, use the project's version.** A results readout is a line such as "Showing 1–10 of 200". A project adds either one as an extension of the pagination, outside the build. Never build either one. When the requirements call for one and the project has none, flag the gap as an opportunity to extend the pagination. Both questions are listed under "Open questions".
- **If the project has a first-page control, a last-page control, an ellipsis, or a way to shorten a long list of page numbers, use the project's version.** The design-system website is the only source that shows first-page and last-page controls, an ellipsis, and a shortened list of page numbers. The website shows each one as a behavior. The questions are listed under "Open questions".

## Rules

**Put pagination in the table's footer.** The design system provides the table footer as a fixed element. See `recursica-skill-tables`. Never place pagination as a separate control below the table.

**The table sets the number of table rows on each page, not the pagination.** An interior table shows a fixed number of table rows, usually five or ten. Pagination never decides the number of table rows.

**Never give the persona a rows-per-page control, unless the project has a rows-per-page select.** Never build a rows-per-page control from other components.

**Make each page number a link with a real `href`, because a page is a location.** `recursica-skill-buttons-links` requires a link for every element on the screen that moves the persona. `recursica-skill-navigation` requires every location to have a URL the persona can reach, with an entry in the browser history. If a page of the table has no URL, the page number cannot have a real `href`. Fix the missing URL as a routing defect. Never build the page number as a button instead.

**The current page must stay the same after a reload and after the browser's back button.** A persona who goes to page 7, opens a record, and comes back must land on page 7.

**Show only the page numbers and the previous and next controls, unless the project's UI kit lists more controls.** Never build a first-page control, a last-page control, a jump-to-page control, or an ellipsis that shortens the list of page numbers from other components.

**Never show the previous control or the next control as a disabled link.** `recursica-skill-buttons-links` and `recursica-skill-link` both forbid disabling a link, and pagination is navigation. On the first page, the previous control is missing or cannot be used. On the last page, the next control is missing or cannot be used. Handle the previous and next controls the same way on the first page, on the last page, and in every table in the application. Never show a control that looks available but cannot be used. A control that is present and looks usable but does nothing without notice is worse than a missing control. A disabled control is not one of the two options.

No rule yet says whether the house prefers a missing control or a control that cannot be used. The question is listed under "Open questions".

**Keep the table's default sort when the page changes.** The default sort belongs to the table. `recursica-skill-tables` sets the default sort on the primary content column. Changing pages never re-sorts the table.

**If a paginated table shows totals, the footer labels must say what each total covers**: the current page, or every record in the table. Personas confuse a total for the current page with a total for every record. `recursica-skill-tables` prefers infinite scroll for full-size tables for that reason.

**Never shrink the pagination controls or make the controls scroll to fit the footer.** When the list of page numbers is too long for the footer, fix the structure instead. See `recursica-skill-system-conventions`.

## Accessibility

The rules below add to the accessibility baseline in `recursica-skill-system-conventions`, including the focus ring, which every Recursica component follows.

Pagination is a row of small controls that all look alike. Without names added in code, a screen reader announces nothing useful for any pagination control. Every accessibility failure in pagination is a failure of naming or of focus.

### Screen readers

- **Make the pagination controls a navigation region with a name**, such as "Pagination", or "Invoice pages" when the page has more than one navigation region. A page with several navigation regions must name each navigation region. Otherwise, a persona using a screen reader cannot tell the navigation regions apart in a landmark list (the list of labeled page regions a screen reader can jump between).
- **The current page must be announced as current.** On screen, color shows which page is current. Color is a single visual channel (color, shape, position or text, each a separate signal), and `recursica-skill-system-conventions` forbids color as the only way to show meaning. Mark the current page as current in code as well.
- **Give every control a name that says where the control goes**, such as "Page 3", "Next page" or "Previous page". A bare "3" is not a name. A bare chevron has no name at all.
- **The previous and next controls are icon-only. Each one needs a tooltip and an accessible name** (the name a screen reader reads out for a control). The tooltip is for sighted personas using a mouse. `recursica-skill-buttons-links` requires both.
- **After a page change, announce that new table rows arrived**, as in "Page 3 of 20, 10 invoices". The change on the screen is out of the persona's sight. Without the announcement, nothing tells the persona that the control worked.
- **The announcement must be polite.** The announcement must not play on every click while the persona pages quickly.
- **The persona must be able to tell when the previous or next control cannot be used.** When the previous control cannot be used on the first page, the code must say that the previous control cannot be used. A lighter gray alone is not enough.
- **Mark up the pagination controls as a list**, as `recursica-skill-navigation` requires for all navigation. The list markup lets the persona hear how many pages there are.
- **If the project ever has a truncation indicator, such as an ellipsis between page numbers, the truncation indicator is decorative and hidden from screen readers.** An ellipsis read aloud between page numbers adds nothing.

### Keyboard and non-mouse navigation

- **Every control is a tab stop (a place the Tab key lands), in the order the controls appear on screen**: the previous control, then the page numbers in order, then the next control.
- **After a page change, choose where focus goes.** Keep focus on the control the persona activated, if that control still exists, such as the page number the persona clicked or the next control. The persona can then page again right away. Never move focus to the top of the document. Never let focus fall to the page body because the table rows that held focus were replaced.
- **If focus was in a table row, move focus into the new table rows**, onto the table or the first table row. Never move focus past the whole page.
- **The previous and next controls are never disabled links on the first page and the last page.** "Rules" above says how to handle the previous and next controls on the first page and the last page.
- **Never add custom key handling inside the pagination component.** The component library the code uses handles keyboard behavior inside each component. See `recursica-skill-navigation`.

## Styling set by tokens

**Never set or override the pagination's styling.** The theme sets every visual property of the pagination, such as size, spacing, borders, colors and animation. Do not add extra containers or spacers to change the pagination's look. If the design needs a look the theme does not give, report the missing look as a gap in the design system. See `recursica-skill-design-router`.

The theme also sets the focus ring and the area that responds to a click or a tap. Never change the focus ring or the area that responds to a click or a tap.

## Related skills

- `recursica-skill-tables` — whether a table paginates at all, the five-to-ten row count for an interior table, the ban on scrolling inside a table, the fixed header and footer, the default sort, and what totals cover on a paginated table.
- `recursica-skill-buttons-links` — when a control is a link and when a control is a button, the tooltip on an icon-only control, and disabled controls.
- `recursica-skill-navigation` — what counts as a location, routing and browser history, and semantic list markup for navigation.
- `recursica-skill-system-conventions` — one behavior for the whole system, and never showing meaning in only one way.
- `recursica-skill-live-regions` — announcing the new page and the new range of table rows after a page change.

### Only if used on the same screen

- `recursica-skill-link` — real `href`s, link names that name the destination, and why a link is never disabled.

## Open questions

- **Whether the previous and next controls are missing, or present but unusable, on the first page and the last page.** The rule that the previous and next controls are never disabled links is settled, under "Rules". No rule says which of the two other options the house wants. Ask, and apply the answer everywhere.
- **First-page and last-page controls.** Only the design-system website shows first-page and last-page controls. Do not assume the project has first-page and last-page controls. The same goes for an ellipsis, and for shortening a long list of page numbers. Do not build any of the controls without asking. Ask about each control, and about shortening the list, only when the project has no such control.
- **Whether a page of a table is a real route with a history entry.** The answer decides whether a page number can be a link with an `href` at all. No rule says whether a table's pages are routes.
- **Rows per page as the persona's choice.** No rule says whether the persona may change the number of table rows on each page. Ask only when the project has no rows-per-page select.
- **A results readout**, such as "Showing 1–10 of 200". No rule says whether a results readout is required, or where the readout sits next to the pagination controls. Ask only when the project has no results readout.
- **Where pagination sits in the footer.** No rule says which side of the footer pagination takes, or how pagination fits beside the totals the footer also shows.
- **Loading and error states between pages.** `recursica-skill-tables` says no skill owns table loading states yet.

## Pre-flight checklist

- [ ] The table is an interior table. Full-size tables use infinite scroll instead.
- [ ] The choice between scrolling and paginating matches every other screen in the application.
- [ ] The pagination controls sit in the table's fixed footer, and the table does not scroll.
- [ ] The table sets the number of table rows, five or ten, not the pagination.
- [ ] The footer has no rows-per-page select and no results readout, unless the project has the control. A requirement for either one was flagged as a gap.
- [ ] No pagination controls are shown when the table has only one page.
- [ ] Every page number is a link with a real `href`, and the current page stays the same after a reload and after the back button.
- [ ] The pagination controls are a named navigation region, marked up as a list.
- [ ] The current page is marked as current in code, not only by the current-page style.
- [ ] Every control has a name that says where the control goes. The previous and next controls have tooltips as well as names.
- [ ] A page change is announced politely, names the new page, and says that new table rows arrived.
- [ ] On the first page and the last page, the code says when the previous or next control cannot be used, not gray alone.
- [ ] The previous and next controls are never disabled links. On the first page and the last page, the controls are missing or cannot be used, the same way on both pages and in every table in the application.
- [ ] Every control is a tab stop in on-screen order. After a page change, focus goes to a chosen place, never the top of the document.
- [ ] The pagination component has no custom key handling.
- [ ] Changing pages did not change the default sort, and each total says what the total covers.
- [ ] Every variant, state and control is one the project's UI kit lists. No variant, state, first-page or last-page control, or ellipsis is invented.
- [ ] No styling is set or overridden on the pagination, and no container or spacer is added to change the pagination's look.
- [ ] Open questions were asked about, not decided: missing or unusable controls on the first page and the last page, first-page and last-page controls, the ellipsis, whether a page is a real route, rows per page, a results readout, where pagination sits in the footer, and loading and error states between pages.
