---
name: recursica-skill-badges-chips
description: House rules for badges vs. chips in enterprise web applications — status and metadata display vs. selection, the one-badge-per-object rule, tags, pills, dismissible and toggleable chips, placement in table rows, cards, tabs, headings and sidebar navigation, chip group counts, error states, data density, and keyboard behavior. Use whenever labeling an object with status, counts, tags, or metadata, or when building filter bars and chip groups. Trigger on "badge or chip", "tag", "pill", "status indicator", "status column", "filter chips", "dismissible chip", "selectable chip", "count badge", or any question about how to mark an object's state. Do NOT use to choose between form controls like checkbox vs. radio — that is recursica-skill-selection-controls, though selectable chips inherit its rules. Do NOT use for buttons or links.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Badges and chips

House rules for deciding whether something is a badge or a chip, how many of them an object may carry, and where they sit. These are opinions, not neutral best practices. Apply them as constraints.

Context these rules assume: **complex enterprise web applications, desktop-first**, built on the Recursica design system. Badge and chip styling, sizing, hover and focus states are inherited from the components. Your decisions are which component, how many, and where.

## Governing principles

1. **Interactivity decides the component.** A badge is displayed; a chip is operated. Status is something the system reports, selection is something the user does — and a status the user can click is a category error, not a design variant.
2. **A badge is singular; chips are plural.** One object carries at most one badge. The moment you need more than one value, they are chips.
3. **Association is positional.** The object comes first and its status immediately after, on the same line, close enough to read as a sentence.

## The core distinction

**Badge — status and metadata display.**

- Shows a status, a count, or a short label.
- **MUST NOT be interactive.** There is no such thing as a selectable badge and no such thing as a dismissible badge. It is text that is read, for data purposes only.
- Updated by the system when the underlying object changes. The user never manipulates the badge to change the status.

**Chip — a larger component that may or may not be interactive.**

- A selectable chip stands in for a checkbox: filters, variables, on/off, usually several at once.
- A static chip is legitimate, and **tags are chips.**

**Cardinality is the fastest test available:**

| Values on the object | Component |
| -------------------- | --------- |
| One                  | Badge     |
| More than one        | Chips     |

**MUST NOT place multiple badges on one object.** An account status is the single badge on the row. Several metadata values on a card are an assortment of chips.

**When both are static and unselectable, choosing between them is a stylistic call** — they simply look different. The rules above bind whenever interactivity or cardinality is in play.

## Pills

**Recursica has no pill component.** There are chips and badges. "Pill" is an interchangeable word from other systems, so translate it: if they mean a chip, use a chip; if they mean a badge, use a badge. All the rules here apply unchanged.

## Status is never interactive

**An actionable status chip is an incorrect use of a chip.** Status is not something the user toggles. If a status needs to change, the change comes from an action elsewhere and the badge re-renders in its new state.

**Selectable chips are for selection, not state reporting** — choosing filters, picking variables, turning several options on and off.

## Dismissible chips

**A chip is dismissible only when the user added it.** Two interactive patterns exist, and neither one applies to badges:

1. **Added chip.** The user searched — typically through an autocomplete — selected an item, and a chip appeared that was not there before. Clicking its close icon removes it from the view.
2. **Toggled chip.** The chip is already present and the user turns it on or off, exactly like checking a checkbox.

**NEVER a dismissible badge.**

## Placement in table rows

**Put status near the left edge**, because left-to-right reading makes the left edge the strongest scan position. In practice that is **the second or third column**.

- **The first column is reserved for the bulk-selection checkbox** where one exists.
- Place status **immediately before or after the object's identifying information.** If the leading information is in the first column, status goes in the second; if identity occupies the second, status can lead in the first.

The point is association: the status must read as belonging to that object. Column order and widths are `recursica-skill-tables`.

## Placement elsewhere — the sentence rule

**Put the badge immediately after the object it describes**, on the same line:

- On a tab → after the tab label.
- On a heading → immediately after the H1 or H2 text.

**Object first, then its status.** You are establishing the thing, then reporting on it, and the two must be tightly coupled horizontally so the pair reads as a sentence: _the heading has the status of `<badge>`_.

**NEVER stack a badge above or below its object.** Stacking forces a different scan pattern and the association becomes ambiguous. The only acceptable reason is a genuine space constraint — mobile or a similarly compact layout.

**Anti-pattern — competing status.** A badge above a heading with a chip below it. Now two elements compete to be the object's primary status and neither reads as authoritative.

## Placement in cards

**The card component already positions the badge: upper right corner**, on the opposite side of the card from the heading. Do not invent a different position.

**Chips belong in the card's content area.**

## Sidebar navigation

**Labeling a nav item is a badge situation.** It is read-only metadata attached to a menu option — "Active", for instance. **Almost never use a chip in sidebar navigation**, since nothing there is being selected in the chip sense.

## How many chips

**A chip group follows the same ceiling as a checkbox group: 7 ± 2**, scaled by cognitive load — up to nine when the items are similar and easy to understand, down to five when they are dissimilar or conceptually complex. A filter bar is a chip group.

See `recursica-skill-working-memory` for the basis and the boundary.

## Error states

**Do not use a chip to indicate an error. Ever.**

**A badge for an error is an exception at best.** Badges carry additional metadata, not negative conditions, and a badge reading "Error" is easily misconstrued as an affirmative or positive marker.

**Prefer a stronger, purpose-built treatment** — an icon or another emphasis mechanism. If a design needs an error state on an object, design that rather than reaching for a badge.

## Data density

**In tight views, prefer the badge.** It is deliberately small, with a very small type treatment, and reads as a compact status bug.

**Chips are poor in data-dense views.** A chip is a larger object with real padding and spacing needs, and it may carry an icon or a dismiss button. That complexity does not compress.

## Keyboard behavior

Both cases are handled by the components — hover and focus states are built in — but the expected behavior is:

- **A static badge is not focusable and not keyboard navigable.** It is skipped in the tab order and read as text.
- **An interactive chip is focusable**, can be toggled on and off, and exposes its dismiss control as a sub-selection where one exists.

## Status changes at runtime

**Just swap the badge to its new value.** No transition, no animation — animating a small status badge is egregious, nobody is watching it that closely, and a user who caused the change already expects it.

## Uncovered — ask, do not invent

No house rule covers these yet. **Ask the human rather than choosing** — see the never-guess rule in `recursica-skill-design-router`. Do not pattern-match them to a rule above.

- **Count formatting inside a badge.** Whether counts cap — `99+` — and at what value.
- **Whether a badge may carry an icon.**
- **What a filter bar does when it exceeds 7 ± 2.** Overflow and scrolling are forbidden elsewhere; the alternative here is unset.

## Out of scope

- **All color, visual design, and styling**, including badge and chip sizing, type treatment, and focus states. Handled by Recursica components.
- **Choosing between form controls** — checkbox, radio, switch, dropdown. Covered by `recursica-skill-selection-controls`; selectable chips inherit its option-count and commit rules.
- **Card content layout beyond badge and chip placement.**

## Pre-flight checklist

Before considering status and metadata treatment done, verify:

- [ ] No badge is interactive, selectable, or dismissible.
- [ ] Each object carries at most one badge; multiple values are chips.
- [ ] No status is rendered as an actionable chip.
- [ ] Tags are chips, not badges.
- [ ] "Pill" in a spec was translated to a chip or a badge.
- [ ] Dismissible chips are only those the user added; toggled chips behave like checkboxes.
- [ ] In tables, status sits in the second or third column, beside the object's identifying information, with column one left to bulk selection.
- [ ] Badges sit immediately after their object on the same line — never stacked, except under a real space constraint.
- [ ] No object has competing status elements above and below it.
- [ ] Card badges use the component's upper-right position; card chips sit in the content area.
- [ ] Sidebar nav labels are badges, not chips.
- [ ] Chip groups hold 7 ± 2 items, scaled by cognitive load.
- [ ] No chip communicates an error state, and no badge does so without an explicit exception.
- [ ] Data-dense views use badges rather than chips.
- [ ] Badges are not focusable; interactive chips are.
- [ ] Status updates swap the badge with no animation.
- [ ] Nothing in the uncovered list — count caps, icons in badges, filter bars over the ceiling — was decided without asking.
