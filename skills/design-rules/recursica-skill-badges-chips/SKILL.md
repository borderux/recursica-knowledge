---
name: recursica-skill-badges-chips
description: House rules for marking an object's status, counts, tags, or metadata — badge versus chip versus icon, one badge per object, selectable and dismissible chips, placement in rows, cards, tabs, and navigation, and chip-group counts. Use when labeling objects or building filter chips. Not for choosing a form control — see recursica-skill-selection-controls.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Badges and chips

This skill holds the house rules for badges and chips on an object. The rules decide whether a status or a value on an object is a badge or a chip, how many badges and chips one object may carry, and where each badge and chip sits. The rules are the team's opinions, not neutral best practices. Treat each rule as a constraint.

The rules assume **complex enterprise web applications, designed for desktop first**, built on the Recursica design system. The badge and chip components handle the styling, the sizing, and the hover and focus states. The rules in this skill decide which component to use, how many to use, and where each one goes.

## Governing principles

1. **Whether the user can interact with the component decides between a badge and a chip.** A badge is only displayed. The user operates a chip. A status is a fact the system reports, and a selection is a choice the user makes. A status the user can click is the wrong component for a status, not a design variation.
2. **A badge holds one value, and chips hold several values.** One object carries at most one badge. When an object has more than one value, use chips.
3. **Position shows which object each badge or chip belongs to.** Put the object first and the object's status right after the object, on the same line. Place the object and the status close enough that the reader reads the two together, like a sentence.
4. **A badge draws a lot of attention, and a badge is not the default.** Prefer an icon. Use a badge only where the information needs that much attention. Decide between an icon and a badge first, before deciding between a badge and a chip.

## Badge or chip

**A badge shows status and metadata.**

- A badge shows a status, a count, or a short label.
- **A badge MUST NOT be interactive.** A badge is never selectable and never dismissible. A badge is text for the user to read, for information only.
- The system updates a badge when the object the badge describes changes. The user never changes the badge to change the status.

**A chip is a larger component, and a chip may or may not be interactive.**

- A selectable chip takes the place of a checkbox. Use selectable chips for filters, for variables, and for turning options on and off, usually several at once.
- A static chip is also valid. **Tags are chips.**

**The number of values on the object is the fastest test.**

| Values on the object | Component |
| -------------------- | --------- |
| One                  | Badge     |
| More than one        | Chips     |

**MUST NOT place more than one badge on one object.** An account's status is the single badge on the account's row. Several metadata values on a card are a set of chips.

**When a badge and a chip would both be static and unselectable, the choice between the two is a matter of style.** The only difference between the two is how each one looks. The rules above apply whenever interaction or the number of values is involved.

## Icon or badge

**Prefer an icon. A badge is the exception, used only in the cases listed below.**

**A badge demands a lot of attention.** A badge is a filled, bordered, colored box with a word in the box, sized to be noticed. A badge is right for one important fact, and wrong for eight. Each badge on a screen takes some of the reader's attention, and the data the reader came for gets less attention. A badge stands out only when few other badges are on the screen.

**Use an icon by default.** An icon shows the same fact and draws far less attention. Using icons by default keeps badges for the facts the reader must notice. `recursica-skill-icon-semantics` owns the icon and the icon's meaning.

**Use a badge for the object's one main status**, when the reader's next decision depends on the status, and when a word rather than a symbol makes the status clear. Use one badge per object, as principle 2 requires.

**Do not use a badge for a rare exception or warning, a role or type that is an ordinary field value, a count, or any value that appears on most rows.** A rare exception or warning, a role or type, a count, or a value on most rows should be an icon, a column, or plain text.

**Put an icon that replaces a badge beside the value that identifies the object, not alone in a cell.** `recursica-skill-icon-semantics` forbids a non-interactive icon by itself with no other information. `recursica-skill-tables` forbids a column that is empty for most rows. An icon beside the object's name breaks neither rule.

**Do not make a badge smaller to reduce the attention the badge draws.** A badge draws attention because a badge is a filled, bordered, colored box, not because of the badge's size. A small badge still draws attention, and a small badge is also hard to read.

## Pills

**Recursica has no pill component.** Recursica has chips and badges. Other design systems use the word "pill" for either a chip or a badge, so translate the word. When "pill" means a chip, use a chip. When "pill" means a badge, use a badge. Every rule in this skill applies to the chip or the badge without change.

## Status and selection

**A status chip that the user can act on is a wrong use of a chip.** The user never toggles a status. A change to a status comes from an action in a different place, and the badge then shows the new status.

**Selectable chips are for choices, not for reporting a state.** Use selectable chips to choose filters, to pick variables, and to turn several options on and off.

## Dismissible chips

**A chip can be dismissed only when the user added the chip.** Interactive chips follow two patterns, and neither pattern applies to badges:

1. **Added chip.** The user searches, usually with an autocomplete, and picks an item. A chip appears that was not on the screen before. Clicking the chip's close icon removes the chip from the view.
2. **Toggled chip.** The chip is on the screen before the user acts. The user turns the chip on or off, exactly like checking a checkbox.

**NEVER make a badge dismissible.**

## Placement in table rows

**A status gets a separate column only when most table rows have a status.** Check the share of table rows first. `recursica-skill-tables` rejects a column that is empty for most table rows, so a rare exception never gets a column. Show a rare exception as an icon beside the object's identifying value, inside the identifying value's table cell. The rules below in this section apply to a status that the whole table carries.

**Put the status near the left edge of the table.** People read left to right, so the eye lands first on the left edge when scanning a table. The status therefore goes in the second or third column.

- **Keep the first column for the bulk-selection checkbox**, where the table has one.
- Place the status **right before or right after the information that identifies the object.** If the identifying information is in the first column, the status goes in the second column. If the identifying information is in the second column, the status can come first.

The status must sit where a reader sees at once which object the status belongs to. `recursica-skill-tables` owns column order and column widths.

## Placement beside the object

**Put the badge right after the object the badge describes, on the same line.**

- On a tab, put the badge after the tab label.
- On a heading, put the badge right after the H1 or H2 text.

**Show the object first, then the object's status.** Name the object, then report the object's status. The object and the badge must sit close together, side by side, so the pair forms a sentence: _the heading has the status of `<badge>`_.

**NEVER stack a badge above or below the badge's object.** A stacked badge makes the eye scan in a different pattern, and the reader can no longer tell which object the badge belongs to. The only acceptable reason to stack a badge is a real lack of space, as on mobile or in a similarly compact layout.

**A badge above a heading and a chip below the heading is an anti-pattern, called competing status.** The badge and the chip compete to be the object's main status, and the reader cannot tell which one is the main status.

## Placement in cards

**The card component places the badge in the upper-right corner of the card**, on the opposite side of the card from the heading. Do not invent a different position for the badge.

**Chips belong in the card's content area.**

## Sidebar navigation

**Use a badge to label a navigation item.** The badge is read-only metadata attached to a menu option, such as "Active". Almost never use a chip in sidebar navigation. The user does not select items in sidebar navigation the way a user selects a chip.

## How many chips

**A chip group follows the same limit as a checkbox group: 7 ± 2**, adjusted for cognitive load. Allow up to nine chips when the chips are similar and easy to understand. Allow as few as five when the chips differ from each other or are hard to grasp. A filter bar is a chip group.

`recursica-skill-working-memory` gives the reasoning for the limit and says where the limit stops applying.

## Error states

**Do not use a chip to show an error, ever.**

**A badge for an error is an exception at best.** Badges show extra metadata, not negative conditions. A reader easily mistakes a badge that says "Error" for a positive marker.

**Prefer a stronger treatment designed to show an error**, such as an icon or another visual treatment that draws attention. If a design needs an error state on an object, design the error state instead of reaching for a badge.

## Data density

Density is how tightly content is packed together.

**In tight views, prefer the badge.** A badge is deliberately small, with very small type, and is designed as a compact status marker.

**Chips work poorly in dense data views.** A chip is larger than a badge and needs real padding and spacing. A chip may also hold an icon or a dismiss button. The padding, the spacing, the icon and the dismiss button do not shrink well.

## Keyboard behavior

The badge and chip components handle both cases below, and the hover and focus states are built in. Expect the following behavior.

- **A static badge cannot receive focus and cannot be reached with the keyboard.** A static badge is not a tab stop (a place the Tab key lands). A static badge is text for the user to read.
- **An interactive chip can receive focus** and can be toggled on and off. When an interactive chip has a dismiss control, the chip offers the dismiss control as a separate step.

## Status updates

**Swap the badge to the new value when a status changes.** Use no transition and no animation. Animating a small status badge is excessive. Nobody watches a status badge that closely, and a user who caused the change expects the change.

## Open questions

No house rule covers the following questions yet. **Ask the person instead of choosing.** See the never-guess rule in `recursica-skill-design-router`. Do not stretch a rule in this skill to fit an open question.

- **How counts are written inside a badge.** No rule says whether counts stop at a maximum, such as `99+`, or at what number.
- **Whether a badge may hold an icon.** If a badge gets an icon, `recursica-skill-icon-semantics` decides which symbol the badge may use. `recursica-skill-icon-semantics` also sets a chip's dismiss control as an X, never a trash can, because a trash can cannot be understood at chip size.
- **What a filter bar does when the filter bar has more than 7 ± 2 items.** Other rules forbid overflow and scrolling, and this skill sets no alternative.

## Out of scope

- **All color, visual design, and styling**, including badge and chip sizing, type, and focus states. The Recursica badge and chip components handle color, visual design, and styling.
- **Choosing between form controls** — a checkbox, a radio button, a switch, or a dropdown. `recursica-skill-selection-controls` covers that choice. Selectable chips follow the rules in `recursica-skill-selection-controls` for how many options to show and when a choice takes effect.
- **Card content layout, beyond where badges and chips go.**

## Pre-flight checklist

Check every item below before treating status and metadata as done.

- [ ] Every badge on the screen shows a main status that the reader's next decision depends on, where an icon would not do. No rare exception, no role or type that is a field value, and no count is shown as a badge.
- [ ] Every icon that replaces a badge sits beside the value that identifies the object. No such icon is alone in a cell or in a column that is empty for most rows.
- [ ] No badge is interactive, selectable, or dismissible.
- [ ] Each object carries at most one badge. When an object has more than one value, the values are chips.
- [ ] No status is shown as a chip the user can act on.
- [ ] Tags are chips, not badges.
- [ ] Every "pill" in the spec is built as a chip or a badge.
- [ ] Only chips the user added can be dismissed, and toggled chips behave like checkboxes.
- [ ] A status column exists only where most table rows have a status. In a table, the status column is the second or third column, beside the information that identifies the object. The first column is left for bulk selection.
- [ ] Each badge sits right after the badge's object, on the same line. No badge is stacked, except where space is too tight to fit the badge beside the object.
- [ ] No object has competing status elements above and below the object.
- [ ] Each badge on a card uses the card component's upper-right position, and chips on a card sit in the card's content area.
- [ ] Labels on sidebar navigation items are badges, not chips.
- [ ] Chip groups hold 7 ± 2 items, adjusted for cognitive load.
- [ ] No chip shows an error state. No badge shows an error state without an explicit exception.
- [ ] Dense data views use badges, not chips.
- [ ] Badges cannot receive focus. Interactive chips can receive focus.
- [ ] When a status updates, the badge is swapped with no animation.
- [ ] Open questions were asked about, not decided: count limits, icons in badges, and a filter bar with more than 7 ± 2 items.
