---
name: recursica-skill-badges-chips
description: House rules for marking an object's status, counts, tags, or metadata — badge versus chip versus icon, one badge per object, selectable and dismissible chips, placement in rows, cards, tabs, and navigation, and chip-group counts. Use when labeling objects or building filter chips. Not for choosing a form control — see recursica-skill-selection-controls.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Badges and chips

Use these house rules for a badge or a chip on an object. An object is the item a badge or a chip describes. For example, an object can be an order in a table row, a card, a tab or a page heading. The rules decide three choices:

- whether a status or a value on an object is a badge or a chip
- how many badges and chips one object may have
- where each badge and chip sits

The rules are the team's opinions, not neutral best practices. Treat each rule as a constraint.

The rules assume **complex enterprise web applications, designed for desktop first**, built on the Recursica design system. The badge and chip components handle the styling, the sizing, and the hover and focus states.

## Governing principles

1. **Choose between a badge and a chip by whether the persona can act on the component.** A badge only shows information. The persona acts on a chip.
   - A status is a fact the system reports, such as an order's "Shipped" status.
   - A selection is a choice the persona makes, such as a "Shipped" filter.
   - A status the persona can click is not a design variation. A status the persona can click uses the wrong component.
2. **A badge holds one value, and chips hold several values.** One object has at most one badge. When an object has more than one value, use chips.
3. **Place each badge or chip so the persona sees which object the badge or chip belongs to.** Put the object first and the object's status right after the object, on the same line. Keep the object and the status close together, so the persona reads the pair like a sentence.
4. **Prefer an icon to a badge.** A badge draws a lot of attention, and a badge is not the default. Use a badge only where the information needs that much attention. Choose between an icon and a badge first. Then choose between a badge and a chip.

## Badge or chip

**A badge shows a status or metadata.**

- A badge shows a status, a count, or a short label.
- **A badge MUST NOT be interactive.** A badge is never selectable and never dismissible. A badge is text for the persona to read, for information only.
- The system updates a badge when the object the badge describes changes. For example, the badge on an order changes from "Processing" to "Shipped" when the order ships. The persona never changes the badge to change the status.

**A chip is larger than a badge. The persona can act on some chips and not on others.**

- A selectable chip takes the place of a checkbox. Use selectable chips for filters, for variables, and for turning options on and off, usually several at once.
- A static chip is a chip the persona cannot act on. A static chip is also valid. Use a chip for a tag.

**Count the values on the object to choose fastest.**

| Values on the object | Component |
| -------------------- | --------- |
| One                  | Badge     |
| More than one        | Chips     |

**MUST NOT place more than one badge on one object.** For example, an account's status is the one badge on the account's row. Several metadata values on a card are chips.

**When the badge and the chip would both be static and unselectable, choose either one by style.** A static badge and a static chip differ only in looks. The rules above apply whenever the persona can act on the component or the number of values matters.

## Icon or badge

**Prefer an icon. Use a badge only in the cases listed below.**

**A badge draws a lot of attention.** A badge is a filled, bordered, colored box with a word in the box, sized to be noticed.

- A badge is right for one important fact, and wrong for eight.
- Each badge on a screen takes some of the persona's attention. The data the persona came for then gets less attention.
- A badge stands out only when few other badges are on the screen.

**Use an icon by default.** An icon shows the same fact and draws far less attention. Icons by default save badges for the facts the persona must notice. `recursica-skill-icon-semantics` sets the rules for the icon and the icon's meaning.

**Use a badge for the object's one main status, when both of the following are true:**

- The persona's next decision depends on the status.
- A word makes the status clear, and a symbol does not.

Use one badge per object, as principle 2 requires.

**Do not use a badge for any of the following values:**

- a rare exception or warning
- a role or type that is an ordinary field value, such as "Admin" in a Role field
- a count, such as the number of comments on an order
- any value that appears on most rows

Each value in the list above should be an icon, a column, or plain text.

**Put an icon that replaces a badge beside the value that identifies the object, not alone in a cell.** The value that identifies the object is a value such as the order number or the account name.

- `recursica-skill-icon-semantics` forbids a non-interactive icon by itself with no other information.
- `recursica-skill-tables` forbids a column that is empty for most table rows.
- An icon beside the object's name breaks neither rule.

**Do not make a badge smaller to reduce the attention the badge draws.** A badge draws attention because a badge is a filled, bordered, colored box, not because of the badge's size. A small badge still draws attention, and a small badge is also hard to read.

## Pills

**Build every pill as a chip or a badge.** Other design systems use the word "pill" for either a chip or a badge. Recursica uses the words chip and badge.

- When "pill" means a chip, use a chip.
- When "pill" means a badge, use a badge.

Every rule in this skill applies to the chip or the badge without change.

## Status and selection

**Do not show a status as a chip the persona can act on.** The persona never turns a status on or off. A status changes through an action in a different place, such as a "Mark as shipped" button. The badge then shows the new status.

**Use selectable chips for choices, not for reporting a state.** Use selectable chips to choose filters, to pick variables, and to turn several options on and off.

## Dismissible chips

**Make a chip dismissible only when the persona added the chip.** Chips the persona can act on follow two patterns. Neither pattern applies to badges.

1. **Added chip.** The persona searches, usually with an autocomplete, and picks an item. A chip appears that was not on the screen before. Clicking the chip's close icon removes the chip from the screen.
2. **Toggled chip.** The chip is on the screen before the persona acts. The persona turns the chip on or off, exactly like checking a checkbox.

**NEVER make a badge dismissible.**

## Placement in table rows

**Give a status a separate column only when most table rows have a status.** Before adding a status column, check how many table rows have a status.

- `recursica-skill-tables` rejects a column that is empty for most table rows. A rare exception therefore never gets a column.
- Show a rare exception as an icon beside the value that identifies the object, inside the same table cell. For example, put a warning icon beside the order number.

The rules below in this section apply to a status that the whole table has.

**Put the status near the left edge of the table, in the second or third column.** People read left to right. A persona scanning a table looks at the left edge first.

- **If the table has a bulk-selection checkbox, keep the first column for the checkbox.** A bulk-selection checkbox selects a table row for an action on several rows at once.
- Place the status **right before or right after the information that identifies the object.** If the identifying information is in the first column, put the status in the second column. If the identifying information is in the second column, the status can come first.

The status must sit where a persona sees at once which object the status belongs to. `recursica-skill-tables` sets the rules for column order and column widths.

## Placement beside the object

**Put the badge right after the object the badge describes, on the same line.**

- On a tab, put the badge after the tab label.
- On a heading, put the badge right after the H1 or H2 text.

**Show the object first, then the object's status.** The object and the badge must sit close together, side by side. The pair then forms a sentence: _the heading has the status of `<badge>`_.

**NEVER stack a badge above or below the badge's object.** Stack a badge only for a real lack of space, as on mobile or in a similarly compact layout. A stacked badge makes the eye scan in a different pattern. The persona can then no longer tell which object the badge belongs to.

**Do not put a badge above a heading and a chip below the heading.** The layout is an anti-pattern called competing status. The badge and the chip compete to be the object's main status. The persona cannot tell which one is the main status.

## Placement in cards

**Do not invent a different position for a badge on a card.** The card component puts the badge in the upper-right corner of the card, across from the heading.

**Put chips on a card in the card's content area.**

## Sidebar navigation

**Use a badge to label a navigation item.** A badge on a navigation item shows read-only metadata, such as "Active". Almost never use a chip in sidebar navigation. The persona does not select items in sidebar navigation the way a persona selects a chip.

## How many chips

**Keep a chip group to 7 ± 2 chips, the same limit as a checkbox group.** Adjust the limit for cognitive load:

- Allow up to nine chips when the chips are similar and easy to understand.
- Allow as few as five chips when the chips differ from each other or are hard to grasp.

A filter bar is a chip group. `recursica-skill-working-memory` gives the reasoning for the limit and says where the limit stops applying.

## Error states

**Never use a chip to show an error.**

**A badge for an error is an exception at best.** Badges show extra metadata, not problems. A persona easily mistakes a badge that says "Error" for a positive marker.

**Prefer a stronger treatment designed to show an error**, such as an icon or another visual treatment that draws attention. If a design needs an error state on an object, design the error state instead of using a badge.

## Data density

**In dense views, prefer the badge.** A dense view packs content tightly together, such as a table with many columns. A badge is small on purpose, with very small type, to mark a status in little space.

**Chips work poorly in dense data views.** A chip is larger than a badge and needs more padding and spacing. A chip may also hold an icon or a dismiss button. The padding, the spacing, the icon and the dismiss button do not shrink well.

## Keyboard behavior

The Recursica badge and chip components provide the keyboard behavior below. Both components include the hover and focus states.

- **A static badge cannot receive focus and cannot be reached with the keyboard.** A static badge is not a tab stop (a place the Tab key lands). A static badge is text for the persona to read.
- **A chip the persona can act on can receive focus** and can be turned on and off. When the chip has a dismiss control, the persona reaches the dismiss control as a separate step.

## Status updates

**When a status changes, swap the badge to the new value, with no transition and no animation.** For example, "Processing" changes straight to "Shipped". Animating a small status badge is too much. Nobody watches a status badge that closely, and a persona who caused the change expects the change.

## Open questions

**Confirm with the user instead of choosing.** No house rule covers the following questions yet. See the never-guess rule in `recursica-skill-design-router`. Do not stretch a rule in this skill to fit an open question.

- **How counts are written inside a badge.** No rule says whether counts stop at a maximum, such as `99+`, or at what number.
- **Whether a badge may hold an icon.** If a badge gets an icon, `recursica-skill-icon-semantics` decides which symbol the badge may use. `recursica-skill-icon-semantics` also sets a chip's dismiss control as an X, never a trash can. A trash can cannot be understood at chip size.
- **What a filter bar does when the filter bar has more than 7 ± 2 items.** Other rules forbid overflow and scrolling, and this skill sets no alternative.

## Out of scope

- **All color, visual design, and styling**, including badge and chip sizing, type, and focus states. The Recursica badge and chip components handle color, visual design, and styling.
- **Choosing between form controls** — a checkbox, a radio button, a switch, or a dropdown. `recursica-skill-selection-controls` covers that choice. Selectable chips follow the rules in `recursica-skill-selection-controls` for how many options to show and when a choice takes effect.
- **Card content layout, beyond where badges and chips go.**

## Pre-flight checklist

Check every item below before treating status and metadata as done.

- [ ] Every badge on the screen shows a main status. The persona's next decision depends on the status, and an icon would not be enough.
- [ ] No rare exception, no role or type that is a field value, and no count is shown as a badge.
- [ ] Every icon that replaces a badge sits beside the value that identifies the object. No such icon is alone in a cell or in a column that is empty for most table rows.
- [ ] No badge is interactive, selectable, or dismissible.
- [ ] Each object has at most one badge. When an object has more than one value, the values are chips.
- [ ] No status is shown as a chip the persona can act on.
- [ ] Tags are chips, not badges.
- [ ] Every "pill" in the spec is built as a chip or a badge.
- [ ] Only chips the persona added can be dismissed, and toggled chips behave like checkboxes.
- [ ] A status column exists only where most table rows have a status.
- [ ] In a table, the status column is the second or third column, beside the information that identifies the object.
- [ ] In a table, the first column is left for bulk selection.
- [ ] Each badge sits right after the badge's object, on the same line. No badge is stacked, except where space is too tight to fit the badge beside the object.
- [ ] No object has competing status elements above and below the object. For example, no heading has a badge above and a chip below.
- [ ] Each badge on a card uses the card component's upper-right position.
- [ ] Chips on a card sit in the card's content area.
- [ ] Labels on sidebar navigation items are badges, not chips.
- [ ] Chip groups hold 7 ± 2 chips, adjusted for cognitive load.
- [ ] No chip shows an error state. No badge shows an error state without an explicit exception.
- [ ] Dense data views use badges, not chips.
- [ ] Badges cannot receive focus. Chips the persona can act on can receive focus.
- [ ] When a status updates, the badge is swapped with no animation.
- [ ] Open questions were asked about, not decided: count limits, icons in badges, and a filter bar with more than 7 ± 2 items.
