---
name: recursica-skill-badges-chips
description: House rules for marking an object's status, counts, tags, or metadata — badge versus chip versus icon, one badge per object, selectable and dismissible chips, placement in rows, cards, tabs, and navigation, and chip-group counts. Use when labeling objects or building filter chips. Not for choosing a form control — see recursica-skill-selection-controls.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Badges and chips

These are the house rules for deciding whether something is a badge or a chip, how many of them an object may carry, and where they sit. They are opinions, not neutral best practices. Treat them as constraints.

These rules assume **complex enterprise web applications, designed for desktop first**, built on the Recursica design system. The components handle badge and chip styling, sizing, and hover and focus states. The decisions left are which component to use, how many, and where.

## Governing principles

1. **Whether the user can interact with it decides the component.** A badge is displayed; a chip is operated. A status is something the system reports, and a selection is something the user does. A status the user can click is the wrong component for a status, not a design variation.
2. **A badge is singular; chips are plural.** One object carries at most one badge. When an object has more than one value, use chips.
3. **Position shows what belongs to what.** The object comes first and its status comes right after it, on the same line, close enough that the two are read together like a sentence.
4. **A badge draws a lot of attention, so it is not the default.** Prefer an icon, and use a badge only where something needs that much attention. Ask this question first, before the badge-or-chip question below.

## The core distinction

**Badge — shows status and metadata.**

- Shows a status, a count, or a short label.
- **MUST NOT be interactive.** There is no such thing as a selectable badge, and no such thing as a dismissible badge. It is text that is read, for information only.
- The system updates it when the object it describes changes. The user never changes the badge to change the status.

**Chip — a larger component that may or may not be interactive.**

- A selectable chip takes the place of a checkbox: filters, variables, on and off, usually several at once.
- A static chip is also valid, and **tags are chips.**

**Cardinality (how many values there are) is the fastest test:**

| Values on the object | Component |
| -------------------- | --------- |
| One                  | Badge     |
| More than one        | Chips     |

**MUST NOT place more than one badge on one object.** An account status is the single badge on its row. Several metadata values on a card are a set of chips.

**When both would be static and unselectable, choosing between them is a matter of style.** The only difference is how they look. The rules above apply whenever interaction or the number of values is involved.

## Before either: does this need a badge at all?

**Prefer an icon. A badge is the exception, used only in the cases listed below.**

**A badge demands a lot of attention.** It is a filled, bordered, colored box with a word in it, sized to be noticed. That is the right tool for one important thing. It is the wrong tool for eight. Each badge on a screen takes some of the reader's attention, and the data they came for gets less. A badge stands out only when few others are on the screen.

**So the default is an icon.** It shows the same fact while drawing far less attention, and it keeps the badge for what must be noticed. `recursica-skill-icon-semantics` owns the icon and its meaning.

**Use a badge for:** the object's one main status, when the reader's next decision depends on it, and when a word rather than a symbol is what makes it clear. One per object, as principle 2 requires.

**Do not use a badge for:** a rare exception or warning, a role or type that is an ordinary field value, a count, or anything that appears on most rows. Those should be an icon, a column, or plain text.

**An icon that replaces a badge goes beside the value that identifies the object, not alone in a cell.** `recursica-skill-icon-semantics` forbids a non-interactive icon sitting by itself with no other information, and `recursica-skill-tables` forbids a column that is empty for most rows. An icon beside the name breaks neither rule.

**Do not solve this by making the badge smaller.** A badge draws attention because of what it is — a filled, bordered, colored box — not because of its size. A small badge is still a badge — and now it is also hard to read.

## Pills

**Recursica has no pill component.** There are chips and badges. "Pill" is a word other systems use for either one, so translate it: if they mean a chip, use a chip; if they mean a badge, use a badge. All the rules here apply without change.

## Status is never interactive

**A status chip that the user can act on is a wrong use of a chip.** Status is not something the user toggles. If a status needs to change, the change comes from an action somewhere else, and the badge then shows its new state.

**Selectable chips are for choosing things, not for reporting state** — choosing filters, picking variables, turning several options on and off.

## Dismissible chips

**A chip can be dismissed only when the user added it.** There are two interactive patterns, and neither applies to badges:

1. **Added chip.** The user searched — usually with an autocomplete — picked an item, and a chip appeared that was not there before. Clicking its close icon removes it from the view.
2. **Toggled chip.** The chip is already there, and the user turns it on or off, exactly like checking a checkbox.

**NEVER a dismissible badge.**

## Placement in table rows

**A status gets its own column only when most rows have one.** Check that first. `recursica-skill-tables` rejects a column that is empty for most rows, so a rare exception never gets a column. A rare exception is an icon beside the object's identifying value, inside that cell. Everything below applies to a status that the whole table carries.

**Put status near the left edge.** People read left to right, so the left edge is where the eye lands first when scanning. That means the second or third column.

- **The first column is kept for the bulk-selection checkbox**, where there is one.
- Place the status **right before or right after the information that identifies the object.** If that information is in the first column, the status goes in the second. If the identity is in the second column, the status can come first.

The status must sit where a reader sees at once which object it belongs to. Column order and widths are owned by `recursica-skill-tables`.

## Placement elsewhere — the sentence rule

**Put the badge right after the object it describes**, on the same line:

- On a tab → after the tab label.
- On a heading → right after the H1 or H2 text.

**The object first, then its status.** Name the object, then report its status. The two must sit close together side by side, so the pair forms a sentence: _the heading has the status of `<badge>`_.

**NEVER stack a badge above or below its object.** Stacking makes the eye scan in a different pattern, and it becomes unclear what the badge belongs to. The only acceptable reason is a real lack of space — on mobile, or in a similarly compact layout.

**Anti-pattern — competing status.** A badge above a heading and a chip below it. Now two elements compete to be the object's main status, and the reader cannot tell which one is the main status.

## Placement in cards

**The card component places the badge in the upper right corner**, on the opposite side of the card from the heading. Do not invent a different position.

**Chips belong in the card's content area.**

## Sidebar navigation

**Labeling a nav item calls for a badge.** It is read-only metadata attached to a menu option — "Active", for example. Almost never use a chip in sidebar navigation, because nothing there is being selected in the way a chip is selected.

## How many chips

**A chip group follows the same limit as a checkbox group: 7 ± 2**, adjusted for cognitive load. Allow up to nine when the items are similar and easy to understand, and as few as five when they are different from each other or hard to grasp. A filter bar is a chip group.

See `recursica-skill-working-memory` for the reasoning and where the limit stops applying.

## Error states

**Do not use a chip to show an error. Ever.**

**A badge for an error is an exception at best.** Badges carry extra metadata, not negative conditions, and a badge reading "Error" is easily mistaken for a positive marker.

**Prefer a stronger treatment designed for the purpose** — an icon or another visual treatment that draws attention. If a design needs an error state on an object, design that, instead of reaching for a badge.

## Data density

Density is how tightly content is packed together.

**In tight views, prefer the badge.** It is deliberately small, with very small type, and is designed as a compact status marker.

**Chips work poorly in dense data views.** A chip is a larger object that needs real padding and spacing, and it may carry an icon or a dismiss button. All of that does not shrink well.

## Keyboard behavior

The components handle both cases — hover and focus states are built in — but this is the expected behavior:

- **A static badge cannot receive focus and cannot be reached with the keyboard.** It is not a tab stop (a place the Tab key lands), and it is read as text.
- **An interactive chip can receive focus**, can be toggled on and off, and offers its dismiss control as a separate step, where it has one.

## Status changes at runtime

**Swap the badge to its new value.** No transition, no animation. Animating a small status badge is excessive: nobody is watching it that closely, and a user who caused the change already expects it.

## Uncovered — ask, do not invent

No house rule covers these yet. **Ask the person instead of choosing** — see the never-guess rule in `recursica-skill-design-router`. Do not stretch a rule above to fit them.

- **How counts are written inside a badge.** Whether counts stop at a maximum — `99+` — and at what number.
- **Whether a badge may carry an icon.** If one is added, `recursica-skill-icon-semantics` decides which symbol it may use. That skill also sets a chip's dismiss control as an X, never a trash can, because a trash can cannot be understood at that size.
- **What a filter bar does when it has more than 7 ± 2 items.** Overflow and scrolling are forbidden elsewhere, and no alternative has been set here.

## Out of scope

- **All color, visual design, and styling**, including badge and chip sizing, type, and focus states. The Recursica components handle these.
- **Choosing between form controls** — checkbox, radio, switch, dropdown. Covered by `recursica-skill-selection-controls`. Selectable chips follow its rules for how many options to show and when a choice takes effect.
- **How card content is laid out, beyond where badges and chips go.**

## Pre-flight checklist

Before treating status and metadata as done, check:

- [ ] Every badge on the screen shows a main status that the reader's next decision depends on, where an icon would not do. No rare exception, no role or type that is a field value, and no count is shown as a badge.
- [ ] Any icon that replaces a badge sits beside the value that identifies the object. It is never alone in a cell, and never in a column that is empty for most rows.
- [ ] No badge is interactive, selectable, or dismissible.
- [ ] Each object carries at most one badge. When an object has more than one value, the values are chips.
- [ ] No status is shown as a chip the user can act on.
- [ ] Tags are chips, not badges.
- [ ] Every "pill" in the spec is built as a chip or a badge.
- [ ] Only chips the user added can be dismissed, and toggled chips behave like checkboxes.
- [ ] A status column exists only where most rows have a status. In tables, it sits in the second or third column, beside the information that identifies the object, with the first column left for bulk selection.
- [ ] Each badge sits right after its object on the same line. It is never stacked, except where space is too tight to fit it beside the object.
- [ ] No object has competing status elements above and below it.
- [ ] Card badges use the component's upper-right position, and card chips sit in the content area.
- [ ] Sidebar nav labels are badges, not chips.
- [ ] Chip groups hold 7 ± 2 items, adjusted for cognitive load.
- [ ] No chip shows an error state, and no badge does either without an explicit exception.
- [ ] Dense data views use badges, not chips.
- [ ] Badges cannot receive focus; interactive chips can.
- [ ] When a status updates, the badge is swapped with no animation.
- [ ] Uncovered items were asked about, not decided: count limits, icons in badges, and a filter bar with more than 7 ± 2 items.
