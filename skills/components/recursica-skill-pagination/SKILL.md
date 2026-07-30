---
name: recursica-skill-pagination
description: How to use the Recursica pagination correctly — which tables paginate and which scroll, that pagination is a table's footer control, the row counts that come from the table, why a page number is a link rather than a button, the separately styled page and navigation controls, and the screen-reader and keyboard requirements for announcing the current page and handling focus after a page change. Use whenever adding, reviewing, or refactoring paging on an interior table, a list, or a result set. Trigger on "pagination", "paging", "page numbers", "next page", "previous page", "rows per page", "page size", "load more", "infinite scroll", "screen reader", "tab order", or a request to break a long set of records into pages. Do NOT use for whether a table paginates at all, its footer, or its default sort — that is recursica-skill-tables. Do NOT use for showing the user where they are in the application — that is recursica-skill-breadcrumb.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Pagination

Pagination moves the user between pages of one set of records. It is a table's footer control, not a way to navigate the application.

## Use it when

- **An interior table** — a smaller grid inset in a container beside other elements — **holds more records than its fixed row count.** `recursica-skill-tables` gives it a fixed five or ten rows and then paginates.
- **That interior table must not scroll**, in either direction. Every row it holds is visible, and pagination takes over from there.
- **The user needs to come back to a specific position** in an ordered set later, which continuous scrolling does not preserve.

## Do not use it when

| Instead of pagination                                         | Use                                                                                               |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| A full-size table fills the width and height of its container | Infinite scroll. `recursica-skill-tables` prefers it — pagination is a clunky way through records |
| A feed built for continuous discovery                         | Infinite scroll, chosen once for the whole system                                                 |
| The entire set fits on one page                               | Nothing. Do not render controls for a single page                                                 |
| One continuous document runs long                             | A different structure. Never paginate prose                                                       |
| The user needs to know where they are in the app              | `recursica-skill-breadcrumb`                                                                      |
| A process moves through ordered steps                         | `recursica-skill-stepper`                                                                         |

**Pagination versus infinite scroll is one decision for the system, not a per-screen choice.** `recursica-skill-system-conventions` requires one behavioral mode per application: full-size tables scroll, interior tables paginate, and that holds everywhere. Mixing them leaves the user unable to predict how any table behaves.

## What exists

Taken from `recursica_ui-kit.json` → `ui-kit.components.pagination`. **Do not pass a variant or state — there are none.**

| Axis       | Options                                        |
| ---------- | ---------------------------------------------- |
| `variants` | None. The component has no variant axis at all |

**The properties split the controls into three separately styled groups:** `active-pages`, `inactive-pages`, and `navigation-controls`, plus `colors` and `item-gap`. Page numbers and the previous/next controls are styled apart from one another — do not restyle either to match the other.

**`active-pages` is a visual treatment, not a semantic state.** It makes the current page look current. Whether the current page is _announced_ as current is yours, and it is a separate thing.

**There is no rows-per-page select and no results-range readout** — no "Showing 1–10 of 200" element. If either is required, it is not this component.

**There is no first/last control, no ellipsis, and no truncation behavior in the kit,** though all three are documented outside the token inventory as behaviors. See the uncovered list.

## Rules for using it

**Pagination lives in the table's footer**, which the design system provides as a fixed element — `recursica-skill-tables`. It is not a free-floating control below the table.

**The row count comes from the table, not from here.** An interior table shows a fixed number of rows, typically five or ten. Pagination does not decide how many.

**Do not offer the user a rows-per-page control.** None exists in the kit, and no rule permits one.

**A page is a location, so a page number is a link with a real `href`.** `recursica-skill-buttons-links` makes anything that moves the user a link, and `recursica-skill-navigation` requires every location to be addressable in the URL with a browser history entry. If a page number cannot be a real `href` because the page is not addressable, that is a routing defect to fix, not a reason to build it as a button.

**The current page must survive a reload and the browser's back button.** A user who pages to 7, opens a record, and comes back must land on 7.

**Keep the set to page numbers plus previous and next.** First, last, jump-to-page, and ellipsis truncation are not defined in the kit — do not assemble them.

**Never render previous or next as a disabled link.** `recursica-skill-buttons-links` and `recursica-skill-link` both forbid disabling a link, and pagination is navigation — so at the first page previous is **absent or non-interactive**, and at the last page so is next. Never present a control that looks available but is not. Which of the two treatments the house prefers is the one part still open; see the uncovered list. Disabled is not one of the options.

**Default sort belongs to the table and must not change when the page changes.** `recursica-skill-tables` sets it on the primary content column; paging is not a re-sort.

**If a paginated table shows totals, the footer labels must state their scope** — whether the total covers this page or the whole set. Ambiguity here is exactly why `recursica-skill-tables` prefers infinite scroll for full-size tables.

**Never make the control set fit by shrinking or scrolling it.** A page list too long for its footer is a structural signal — see `recursica-skill-system-conventions`.

## Accessibility

Pagination is a row of small controls that all look alike and, left alone, all say nothing useful. Every failure in it is a naming failure or a focus failure.

### Screen readers

- **The set is a navigation region with a name** — "Pagination", or "Invoice pages" where more than one exists. A page carrying several navigation regions must name each one, or they cannot be told apart in a landmark list.
- **The current page must be announced as current.** `active-pages` is a fill and a color, and color is a single visual channel — prohibited as the only carrier of meaning by `recursica-skill-system-conventions`. Mark it programmatically as well.
- **Every control needs a name that says where it goes.** "Page 3", "Next page", "Previous page". A bare "3" is not a name, and a bare chevron is nothing at all.
- **The previous and next controls are icon-only**, so each needs a tooltip for sighted mouse users and, separately, an accessible name — required by `recursica-skill-buttons-links`.
- **After a page change, announce that new rows arrived** — "Page 3 of 20, 10 invoices". Without it, nothing tells the user the activation took effect, because the visual change is off-screen for them.
- **That announcement must be polite** and must not fire once per click while the user pages rapidly.
- **The ends must be perceivable.** When previous is unavailable on the first page, that unavailability must be conveyed programmatically, and the reason must exist in text — never by a lighter grey alone.
- **The controls must be marked up as a list**, as all navigation is per `recursica-skill-navigation`, so the user hears how many pages there are.
- **A truncation indicator, if one ever exists, is decorative and silent.** An ellipsis read aloud between numbers adds nothing.

### Keyboard and non-mouse navigation

- **Every control is a tab stop, in visual order** — previous, then the numbers ascending, then next.
- **After a page change, handle focus deliberately.** Keep focus on the control the user activated where it still exists — the number they clicked, or next — so they can page again immediately. Never dump the user at the top of the document, and never let focus fall to the body because the row set it was in was replaced.
- **If focus was inside the rows, move it into the new rows** — the table or its first row — not past the entire page.
- **Previous and next are never disabled links at the ends** — they are absent or non-interactive, handled the same way at both ends and on every table in the application. A control that is present and looks operable but silently does nothing is worse than one that is gone.
- **A non-interactive control is not a tab stop**, so any reason carried only by its appearance is unreachable by keyboard. Put the reason in text.
- **Add no custom key handling inside the component.** Keyboard behavior within a component is owned by the underlying coded library — `recursica-skill-navigation`.
- **Nothing may be hover-only.** A footer that reveals its controls on hover is unusable by keyboard and by touch.
- **Never suppress the focus ring, and never let `active-pages` double as the focus state.** The current page and the focused page are different facts and must look different.

## Not your decision

Do not implement, override, or tune any of these — the component owns them:

- `colors`, per group and per layer.
- `item-gap`.
- `active-pages`, `inactive-pages`, and `navigation-controls` styling.
- Control size, hit area, padding, and border radius.
- The focus ring, and keyboard behavior inside the component.

## Load these too

- [`recursica-skill-tables`](../../design-rules/recursica-skill-tables/SKILL.md) — whether this table paginates at all, the five-to-ten row count for an interior table, the prohibition on inner scrolling, the fixed header and footer, default sort, and totals scope on a paginated table.
- [`recursica-skill-buttons-links`](../../design-rules/recursica-skill-buttons-links/SKILL.md) — link vs. button semantics, the tooltip requirement for icon-only controls, and disabled controls.
- [`recursica-skill-navigation`](../../design-rules/recursica-skill-navigation/SKILL.md) — what makes something a location, routing and browser history, and semantic list markup for navigation.
- [`recursica-skill-link`](../recursica-skill-link/SKILL.md) — real `href`s, names that identify the destination, and why a link is never disabled.
- [`recursica-skill-system-conventions`](../../design-rules/recursica-skill-system-conventions/SKILL.md) — one behavioral mode per system, and never carry meaning in a single channel.

## Uncovered — ask, do not invent

- **Whether previous and next are absent or non-interactive at the ends.** That they are never rendered as disabled links is settled, above. Which of the two remaining treatments the house wants is not — ask, and apply the answer everywhere.
- **First and last page controls are documented outside the token inventory, with no token behind them.** Do not assume they are available. The same holds for an ellipsis and for truncation of a long page list: the kit defines only `navigation-controls`. Do not build any of them without asking.
- **Whether a page is a real route with a history entry.** This decides whether a page number can be a link with an `href` at all, and no rule states it for a table's pages.
- **Rows per page as a user choice.** No select exists in the kit, and no rule says whether the user may change the count.
- **A results-range readout** — "Showing 1–10 of 200". No such element exists in the kit; whether one is required, and where it sits relative to the controls, is unset.
- **Where pagination sits within the footer** — which side, and how it coexists with the totals the footer also carries.
- **Loading and error state between pages.** `recursica-skill-tables` lists table loading states as unowned, and the loader has no determinate variant.

## Pre-flight checklist

- [ ] This is an interior table; full-size tables use infinite scroll instead.
- [ ] The scroll-versus-paginate choice matches the rest of the application.
- [ ] The controls sit in the table's fixed footer, and the table itself does not scroll.
- [ ] The row count came from the table — five or ten — not from the pagination.
- [ ] No rows-per-page select and no invented results-range element were added.
- [ ] No controls are rendered when there is only one page.
- [ ] Every page number is a link with a real `href`, and the current page survives reload and the back button.
- [ ] The set is a named navigation region, marked up as a list.
- [ ] The current page is marked current programmatically, not only by the `active-pages` style.
- [ ] Every control has a name saying where it goes; previous and next have tooltips as well as names.
- [ ] A page change is announced politely, states the new page, and says that new rows arrived.
- [ ] The ends are conveyed programmatically and the reason exists in text, not in grey alone.
- [ ] Previous and next are never disabled links; at the ends they are absent or non-interactive, the same way at both ends and across the application.
- [ ] Every control is a tab stop in visual order, and focus after a page change is handled deliberately — never at the top of the document.
- [ ] No custom keyboard handling was added inside the component.
- [ ] Nothing is hover-only, the focus ring is intact, and it is distinguishable from the current-page style.
- [ ] Default sort was not changed by paging, and any totals state their scope.
- [ ] No variant, state, first/last control, or ellipsis outside the inventory above was invented.
- [ ] No component-owned styling was overridden.
- [ ] Nothing in the uncovered list was invented.
