---
name: recursica-skill-pagination
description: How to use the Recursica pagination, a table's footer control — which tables page and which scroll, row counts from the table, page numbers as links, and announcing the page and handling focus. Use for paging a table or result set. Whether a table pages at all is in recursica-skill-tables.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Pagination

Pagination moves the user between pages of one set of records. It is a control in a table's footer, not a way to move around the application.

## Use it when

- **An interior table** — a smaller grid set inside a container beside other elements — holds more records than its fixed number of rows. `recursica-skill-tables` gives it a fixed five or ten rows, and then paginates.
- **That interior table must not scroll**, in either direction. Every row it holds is visible, and pagination takes over from there.
- **The user needs to come back to a specific position** in an ordered set later, which continuous scrolling does not keep.

## Do not use it when

| Instead of pagination                                         | Use                                                                                                                                    |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| A full-size table fills the width and height of its container | Infinite scroll (more rows load as the user scrolls). `recursica-skill-tables` prefers it — pagination is a clunky way through records |
| A feed built for continuous browsing                          | Infinite scroll, chosen once for the whole system                                                                                      |
| The whole set fits on one page                                | Nothing. Do not show controls for a single page                                                                                        |
| One continuous document runs long                             | A different structure. Never paginate running text                                                                                     |
| The user needs to know where they are in the app              | `recursica-skill-breadcrumb`                                                                                                           |
| A process moves through ordered steps                         | `recursica-skill-stepper`                                                                                                              |

**Pagination versus infinite scroll is one decision for the whole system, not a choice for each screen.** `recursica-skill-system-conventions` requires one behavioral mode per application: full-size tables scroll, interior tables paginate, and that holds everywhere. Mixing them leaves the user unable to predict how any table behaves.

## What exists

Taken from the UI kit (the token file, `recursica_ui-kit.json`, that says which variants and states each component has) → `ui-kit.components.pagination`. **Do not pass a variant or state — there are none.**

| Axis       | Options                                        |
| ---------- | ---------------------------------------------- |
| `variants` | None. The component has no variant axis at all |

**The properties split the controls into three groups, each styled separately:** `active-pages`, `inactive-pages`, and `navigation-controls`, plus `colors` and `item-gap`. The page numbers and the previous and next controls are styled apart from each other — do not restyle either to match the other.

**`active-pages` is a visual style, not a state in the code.** It makes the current page look current. Whether the current page is _announced_ as current is up to you, and it is a separate thing.

**There is no rows-per-page select and no results readout** — no "Showing 1–10 of 200" element. If either one is required, it is not this component.

**There is no first or last control, no ellipsis, and no truncating behavior in the UI kit**, though all three are shown only on the design-system website as behaviors. See the uncovered list.

## Rules for using it

**Pagination lives in the table's footer**, which the design system provides as a fixed element — `recursica-skill-tables`. It is not a separate control floating below the table.

**The number of rows comes from the table, not from here.** An interior table shows a fixed number of rows, usually five or ten. Pagination does not decide how many.

**Do not give the user a rows-per-page control.** None exists in the UI kit, and no rule allows one.

**A page is a location, so a page number is a link with a real `href`.** `recursica-skill-buttons-links` makes anything that moves the user a link, and `recursica-skill-navigation` requires every location to be reachable by its URL, with a browser history entry. If a page number cannot be a real `href` because the page has no address, that is a routing defect to fix — not a reason to build it as a button.

**The current page must survive a reload and the browser's back button.** A user who pages to 7, opens a record, and comes back must land on 7.

**Keep the set to the page numbers plus previous and next.** First, last, jump-to-page, and shortening the list with an ellipsis are not defined in the UI kit — do not put them together yourself.

**Never show previous or next as a disabled link.** `recursica-skill-buttons-links` and `recursica-skill-link` both forbid disabling a link, and pagination is navigation. So on the first page, previous is missing or cannot be used, and on the last page, so is next. Never show a control that looks available but is not. Which of the two the house prefers is the one part still open; see the uncovered list. Disabled is not one of the options.

**The default sort belongs to the table, and must not change when the page changes.** `recursica-skill-tables` sets it on the primary content column; changing pages is not re-sorting.

**If a paginated table shows totals, the footer labels must say what they cover** — this page, or the whole set. Confusion here is exactly why `recursica-skill-tables` prefers infinite scroll for full-size tables.

**Never make the controls fit by shrinking them or making them scroll.** A list of pages too long for its footer is a sign of a problem with the structure — see `recursica-skill-system-conventions`.

## Accessibility

This component also follows the accessibility baseline in `recursica-skill-system-conventions`, including the focus ring (the outline that shows which element has keyboard focus). Only what is specific to it is listed here.

Pagination is a row of small controls that all look alike and, left alone, all say nothing useful. Every failure here is a failure of naming or of focus.

### Screen readers

- **The set is a navigation region with a name** — "Pagination", or "Invoice pages" where there is more than one. A page with several navigation regions must name each one, or they cannot be told apart in a landmark list (the list of labeled page regions a screen reader can jump between).
- **The current page must be announced as current.** `active-pages` is a fill and a color, and color is a single visual channel (a way of carrying meaning, such as color, shape, position, or text) — forbidden as the only carrier of meaning by `recursica-skill-system-conventions`. Mark it in code as well.
- **Every control needs a name that says where it goes.** "Page 3", "Next page", "Previous page". A bare "3" is not a name, and a bare chevron is nothing at all.
- **The previous and next controls are icon-only**, so each one needs a tooltip for sighted mouse users and, separately, an accessible name (the name a screen reader reads out for a control) — as `recursica-skill-buttons-links` requires.
- **After a page change, announce that new rows arrived** — "Page 3 of 20, 10 invoices". Without it, nothing tells the user that activating the control worked, because the visual change is out of their sight.
- **That announcement must be polite**, and must not fire on every click while the user pages quickly.
- **The ends must be perceivable.** When previous is unavailable on the first page, that must be available in code, and the reason must exist in text — never shown by a lighter gray alone.
- **The controls must be marked up as a list**, as all navigation is, according to `recursica-skill-navigation`, so the user hears how many pages there are.
- **A truncation indicator, if one ever exists, is decorative and silent.** An ellipsis read aloud between numbers adds nothing.

### Keyboard and non-mouse navigation

- **Every control is a tab stop (a place the Tab key lands), in visual order** — previous, then the numbers in order, then next.
- **After a page change, handle focus on purpose.** Keep focus on the control the user activated, where it still exists — the number they clicked, or next — so they can page again right away. Never drop the user at the top of the document, and never let focus fall to the page body because the rows it was in were replaced.
- **If focus was inside the rows, move it into the new rows** — the table, or its first row — not past the whole page.
- **Previous and next are never disabled links at the ends.** They are missing or cannot be used, and they are handled the same way at both ends and on every table in the application. A control that is present and looks usable, but quietly does nothing, is worse than one that is gone.
- **A control that cannot be used is not a tab stop**, so any reason shown only by how it looks cannot be reached by keyboard. Put the reason in text.
- **Add no custom key handling inside the component.** Keyboard behavior inside a component is owned by the underlying coded library — `recursica-skill-navigation`.

## Not your decision

Do not implement, override, or tune any of these — the component owns them:

- `colors`, per group and per layer.
- `item-gap`.
- `active-pages`, `inactive-pages`, and `navigation-controls` styling.
- Control size, hit area, padding, and border radius.
- The focus ring, and keyboard behavior inside the component.

## Load these too

- `recursica-skill-tables` — whether this table paginates at all, the five-to-ten row count for an interior table, the prohibition on inner scrolling, the fixed header and footer, default sort, and totals scope on a paginated table.
- `recursica-skill-buttons-links` — link vs. button semantics, the tooltip requirement for icon-only controls, and disabled controls.
- `recursica-skill-navigation` — what makes something a location, routing and browser history, and semantic list markup for navigation.
- `recursica-skill-system-conventions` — one behavioral mode per system, and never carry meaning in a single channel.

### Only if the screen also uses it

- `recursica-skill-link` — real `href`s, names that identify the destination, and why a link is never disabled.

## Uncovered — ask, do not invent

- **Whether previous and next are missing, or present but unusable, at the ends.** That they are never shown as disabled links is settled, above. Which of the two remaining options the house wants is not — ask, and apply the answer everywhere.
- **First and last page controls are shown only on the design-system website, with no token behind them.** Do not assume they are available. The same goes for an ellipsis, and for shortening a long list of pages: the UI kit defines only `navigation-controls`. Do not build any of them without asking.
- **Whether a page is a real route with a history entry.** This decides whether a page number can be a link with an `href` at all, and no rule states it for a table's pages.
- **Rows per page as the user's choice.** No select exists in the UI kit, and no rule says whether the user may change the number.
- **A results readout** — "Showing 1–10 of 200". No such element exists in the UI kit. Whether one is required, and where it sits relative to the controls, is not set.
- **Where pagination sits within the footer** — which side, and how it fits alongside the totals the footer also carries.
- **Loading and error states between pages.** `recursica-skill-tables` lists table loading states as having no owner, and the loader has no determinate variant.

## Pre-flight checklist

- [ ] This is an interior table. Full-size tables use infinite scroll instead.
- [ ] The choice between scrolling and paginating matches the rest of the application.
- [ ] The controls sit in the table's fixed footer, and the table itself does not scroll.
- [ ] The number of rows comes from the table — five or ten — not from the pagination.
- [ ] You added no rows-per-page select and invented no results readout.
- [ ] No controls are shown when there is only one page.
- [ ] Every page number is a link with a real `href`, and the current page survives a reload and the back button.
- [ ] The set is a named navigation region, marked up as a list.
- [ ] The current page is marked as current in code, not only by the `active-pages` style.
- [ ] Every control has a name that says where it goes, and previous and next have tooltips as well as names.
- [ ] A page change is announced politely, states the new page, and says that new rows arrived.
- [ ] The ends are available in code, and the reason exists in text — not shown by gray alone.
- [ ] Previous and next are never disabled links. At the ends, they are missing or cannot be used, the same way at both ends and across the application.
- [ ] Every control is a tab stop in visual order, and focus after a page change is handled on purpose — never at the top of the document.
- [ ] You added no custom keyboard handling inside the component.
- [ ] Changing pages did not change the default sort, and any totals say what they cover.
- [ ] You invented no variant, state, first or last control, or ellipsis outside the inventory above.
- [ ] You overrode no styling that the component owns.
- [ ] You invented nothing from the uncovered list.
