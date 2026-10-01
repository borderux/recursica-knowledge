---
name: recursica-skill-icon-semantics
description: House rules for icons — one icon set, when an icon needs a text label, tooltips on icon-only buttons, fixed meanings such as X for close and a trash can for delete, one meaning per icon, decorative icons, and status icons. Use when choosing an icon or deciding whether it needs a label. Not for tooltip behavior — see recursica-skill-tooltip.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Icon semantics

These are the house rules for which icon carries which meaning, and when an icon may stand on its own. They are opinions, not neutral best practices — treat them as constraints.

These rules assume **complex enterprise web applications** built on a configured icon set. Which set that is, and how its icons are drawn, are not your decisions. What each icon means, and whether it appears alone, are.

## The three governing principles

1. **Inconsistency is the giveaway.** Two things reveal a screen that was not designed with care, and both are failures of consistency: mixed icon styles on one screen, and the same function drawn with different icons. Nothing else in this skill is as reliable a sign.
2. **Unclear meaning is fixed with words, never with a better icon.** Where a function's meaning is not obvious from its icon, the fix is a text label or a tooltip. Hunting for a cleverer glyph (the drawn symbol itself) is the wrong move.
3. **An icon is tied to an action, not to a place.** A pencil means edit wherever editing happens. Keeping meaning consistent is what makes an icon readable at all.

## One icon set, one style

**Pick one icon set for the whole system, and use only that set.**

**NEVER mix icon styles on the same screen.** Icon libraries ship several styles of the same glyph — filled or solid, outline, thin, and versions with different corner roundness and line thickness. Mixing them is the single clearest sign that a screen was assembled rather than designed.

**There is no exception within a screen**, and usually none within the system either.

**Do not bring in an icon from outside the configured set** to fill a gap. A missing icon is a gap to raise, not to patch — see `recursica-skill-design-router`.

## When an icon may stand alone

**Icon-only buttons are valid and common.** They are correct when:

- **The function is not the primary action** on the screen.
- **There are many functions available**, and labeling all of them would cost much more space than it would gain in clarity.

**Where they usually appear:** toolbars, table rows with several actions, and the ellipsis or "more" button that signals more functions are hidden behind a menu.

**Every icon-only button MUST have a tooltip.** When asked where that rule stops applying, the answer was "never." No context, no argument about space, and no argument about established patterns makes an exception. Tooltip content and behavior are owned by `recursica-skill-tooltip`. Whether a control needs one at all is owned by `recursica-skill-buttons-links`, which states the same rule from its side.

## When a text label is required

There are two tests. If either one applies, the control gets **an icon plus a label, or a text-only label**.

1. **There is a clear primary action, and everything else is clearly secondary.** The primary action gets a label. Icon-only is for the secondary actions.
2. **The icon is generic, and the function is specific.** An icon can be pleasant, helpful, and visually distinct while still not saying what it does — or while meaning different things to different people. Where there is any doubt about what the function means, it gets a label.

**A tooltip does not replace a label in either case.** The tooltip requirement above is the minimum for icon-only controls. It is not a way to make an unclear icon acceptable.

**Specialized business concepts cannot be drawn.** Common, general actions — edit, home, close — are easy to remember because the same glyph means the same thing everywhere. An icon invented for a function that exists in only one application is very hard to make memorable. In enterprise software, the concepts are often too abstract for any symbol to carry: there is no shared understanding of what such symbols mean. Where a concept is specialized, the label does the icon's job, not the other way round. This is why an icon-only rail fails worst in business systems — see `recursica-skill-navigation` and `recursica-skill-working-memory`.

## Icons inside established components

**An icon may carry meaning on its own when the control it belongs to is a well-known pattern.** People already know what a dropdown's indicator, an accordion's indicator, and a navigation toggle mean, so the icon a component comes with needs no tooltip.

**A close icon on a modal or panel still gets a tooltip anyway.** The pattern is well known, but adding one does no harm.

**This does not allow a bare icon anywhere else.** The exemption belongs to icons that come built into a component, not to icons you place yourself.

**Where a component's own indicator shows a state** — open or closed — that state must still be made available in code, not carried by the icon alone. Owned by `recursica-skill-system-conventions` and the individual component skills.

## Fixed meanings

**These pairings must not be swapped for anything else.**

| Meaning            | Icon                                 | Note                                                                      |
| ------------------ | ------------------------------------ | ------------------------------------------------------------------------- |
| **Close**          | An X                                 | Never a trash can                                                         |
| **Delete**         | A trash can                          | Never an X. The difference between close and delete is a big one          |
| **Dismiss a chip** | Always an X                          | An exception for size: at chip size, a trash can cannot be understood     |
| **Menu**           | A hamburger — horizontal lines       | The number of lines may vary; the shape does not                          |
| **More/overflow**  | An ellipsis — **horizontal** dots    | **NEVER the vertical kebab** (three dots stacked up and down)             |
| **Edit**           | A pencil, everywhere editing happens | Editing a form and editing a page share it, because they share the action |

## One icon, one meaning

**The same icon does not mean different things in different places.** It must always mean the same thing — or at least share the same basic action.

**Tie icons to the action wherever you can.** An edit-form control and an edit-page control may both use a pencil. The action is edit in both cases, so reusing the icon is correct, not a clash.

**The opposite mistake is the more common one:** the same function drawn with a different icon in two places. That is one of the two main giveaways in the governing principles, and the alignment review pass in `recursica-skill-screen-priority` catches it.

## Decorative icons are allowed

**Apply the removal test:** take the icon away. Does anything change about how the user would use the interface? If nothing changes, the icon is decorative.

**Decorative does not mean forbidden.** An icon may exist purely to break up a page visually and give the eye something to settle on.

**The allowed case: an icon beside an H2 or H3 for landmarking** — helping the user recognize where they are. This helps most where several pages share an almost identical layout, and little else signals that the user is in the right place. The icon makes each page look different and gives a sense of place.

**This is a stated exception to the general removal test** in `recursica-skill-screen-priority`, which removes whatever the workflow does not need. Icons used for landmarking may be kept even though they fail that test. Nothing else about the test changes.

**A decorative icon is silent to assistive technology**. It carries no meaning, so it must not be announced.

## Status as an icon

**A status may be shown as an icon instead of as text**, and it is often shown with both an icon and a color.

**The reason is scanning.** On a dense screen where nearly everything is text, reading even more text to find a status is hard work. An icon is faster to spot — most of all when the icon and the text appear together.

**Color never carries the status by itself.** Two visual channels are still only visual. `recursica-skill-system-conventions` requires that any meaning the user must receive survives when one channel (color, shape, position or text, each a separate signal) fails. So a status icon needs an accessible name (the name a screen reader reads out for a control) that says what the status is.

**In a table cell, a status icon comes with text** — see below.

## Icons in tables

**An icon alone in a table cell is only ever an icon-only button.**

**NEVER place a non-interactive icon alone in a cell with no other information.** When asked for the limit or the exception, the answer was that it does not exist. A status column pairs the icon with its text.

How icons line up in a cell, and which columns exist at all, are owned by `recursica-skill-tables`.

## Decided elsewhere

- **Which icon set the system uses.** There is always a default set, and the designer's chosen set is configured in the development tools. Use what is configured.
- **How icons are drawn** — line thickness, corner roundness, fill, size, and color. All of this is inherited.
- **The icon that comes with a component**, such as a dropdown's or an accordion's indicator. Do not add your own on top of it.

## Out of scope

- **Whether a control is a button or a link, and where it sits** — `recursica-skill-buttons-links`, which also decides between icon-only and text in table rows.
- **Tooltip content, placement, and behavior** — `recursica-skill-tooltip`.
- **Navigation made only of icons**, which is forbidden outright — `recursica-skill-navigation`.
- **What a status is called** — `recursica-skill-naming-terminology`.
- **Whether a badge may carry an icon** — `recursica-skill-badges-chips`, where it is listed as uncovered.
- **Motion.** Whether an icon may animate has no owner anywhere in the family.

## Uncovered — ask, do not invent

- **The specific glyph for anything not in the fixed-meanings table.** Only close, delete, chip dismiss, menu, more, and edit were named. Everything else is a choice to raise, not to make.
- **Whether a system may ever have more than one icon set.** It was stated as "typically" one, with no example given of when two would be right.
- **Which icon marks an external link**, and whether one is required — still open, as `recursica-skill-link` notes.
- **A status icon plus color outside a table.** Text is required in a cell, but whether a status may be icon-only anywhere else was not settled.
- **How many decorative icons are too many**, and whether heading icons should go on every heading of a level, or only some.
- **Icon size, and when a larger or smaller icon is called for.** Not discussed; the components decide.

## Pre-flight checklist

- [ ] Every icon on the screen comes from one set and one style — no mixing of filled, outline, thin, or different corner roundness and line thickness.
- [ ] You brought in no icon from outside the configured set. You raised any missing icon instead.
- [ ] Every icon-only button has a tooltip, and you claimed no exceptions.
- [ ] The screen's clear primary action has a text label, and icon-only is used only for secondary functions.
- [ ] No generic icon stands alone for a specific function, and no tooltip is standing in for a missing label.
- [ ] An X means close, a trash can means delete, dismissing a chip is an X, more is a horizontal ellipsis and never a vertical kebab, and edit is a pencil.
- [ ] No icon means two different things, and every reused icon shares the same basic action.
- [ ] No function is drawn with two different icons anywhere in the application.
- [ ] Decorative icons are silent to assistive technology, and any icon kept after failing the removal test is a landmarking icon beside a heading.
- [ ] A status shown as an icon has an accessible name, and it never depends on color alone.
- [ ] No non-interactive icon sits alone in a table cell.
- [ ] You invented nothing from the uncovered list.
