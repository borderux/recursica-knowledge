---
name: recursica-skill-icon-semantics
description: House rules for icons — one icon set, when an icon needs a text label, tooltips on icon-only buttons, fixed meanings such as X for close and a trash can for delete, one meaning per icon, decorative icons, and status icons. Use when choosing an icon or deciding whether the icon needs a label. Not for tooltip behavior — see recursica-skill-tooltip.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Icon semantics

The house rules below decide which icon stands for which meaning, and when an icon may appear alone, with no text label. The rules are the team's opinions, not neutral best practices. Treat every rule as a constraint.

The rules assume **complex enterprise web applications** built on a configured icon set. The icon-semantics skill does not decide which icon set the system uses or how the icons are drawn. The icon-semantics skill decides what each icon means and whether an icon appears alone.

## The three governing principles

1. **Inconsistent icons are the clearest sign of a careless screen.** Two mistakes show that a screen was not designed with care, and both mistakes are failures of consistency. The first mistake is mixed icon styles on one screen. The second mistake is one function shown with different icons. No other mistake in the icon-semantics skill shows a careless screen as reliably.
2. **Fix an unclear meaning with words, never with a better icon.** When an icon does not make a function's meaning obvious, add a text label or a tooltip. Searching for a cleverer symbol is the wrong fix.
3. **An icon belongs to an action, not to a place.** A pencil means edit wherever editing happens. A user understands an icon only when the icon keeps one meaning everywhere.

## One icon set, one style

**Pick one icon set for the whole system, and use only icons from that set.**

**NEVER mix icon styles on the same screen.** An icon library offers several styles of the same icon: filled or solid, outline, thin, and versions with different corner roundness and line thickness. Mixed styles are the clearest sign that a screen was put together from parts rather than designed.

**The one-style rule has no exception within a screen, and usually no exception within the system.**

**Do not bring in an icon from outside the configured icon set when the set has no icon for a meaning.** Raise the missing icon as a gap, and leave the gap unfilled. See `recursica-skill-design-router`.

## When an icon may stand alone

**Icon-only buttons are valid and common.** An icon-only button is correct when:

- **The button's function is not the primary action** on the screen.
- **Many functions are available**, and a label on every function would take much more space than the labels would add in clarity.

**Icon-only buttons usually appear in toolbars, in table rows with several actions, and as the ellipsis or "more" button.** The "more" button opens a menu that holds more functions.

**Every icon-only button MUST have a tooltip.** The team said the tooltip rule never stops applying. No context, no argument about space, and no argument about established patterns makes an exception. `recursica-skill-tooltip` owns tooltip content and behavior. `recursica-skill-buttons-links` owns whether a control needs a tooltip at all, and states the same rule for buttons.

## When a text label is required

**Give a control an icon and a text label, or a text label with no icon, when either test below applies.**

1. **The screen has a clear primary action, and every other action is clearly secondary.** The primary action gets a label. Icon-only controls are for the secondary actions.
2. **The icon is generic, and the function is specific.** An icon can be pleasant, helpful and visually distinct, and still not say what the function does. Different people can also take different meanings from one icon. When there is any doubt about what a function means, the function gets a label.

**A tooltip does not replace a label in either case.** The tooltip rule above is the minimum for icon-only controls. A tooltip does not make an unclear icon acceptable.

**A specialized business concept cannot be drawn as an icon.** Common, general actions, such as edit, home and close, are easy to remember, because the same icon means the same action everywhere. An icon invented for a function that exists in only one application is very hard to remember. In enterprise software, business concepts are often too abstract for any symbol to show. Users do not agree on what an icon for such a concept means. For a specialized concept, the text label gives the meaning, not the icon. For the same reason, a navigation rail made only of icons fails worst in business systems. See `recursica-skill-navigation` and `recursica-skill-working-memory`.

## Icons inside established components

**An icon may stand alone, with no label, when the icon belongs to a well-known control.** People already know what the indicator on a dropdown or an accordion means, and what a navigation toggle means. The icon that comes built into a component therefore needs no tooltip.

**A close icon on a modal or panel still gets a tooltip.** The close pattern is well known, but a tooltip on the close icon does no harm.

**The exemption allows an icon with no label and no tooltip only when the icon comes built into a component.** An icon placed separately on a screen gets no exemption.

**When a component's built-in indicator shows a state, such as open or closed, the state must also be available in code, not shown by the icon alone.** `recursica-skill-system-conventions` and each component skill own this rule.

## Fixed meanings

**Each meaning in the table below must use the icon the table names, and each icon in the table must keep the meaning the table gives the icon.**

| Meaning            | Icon                                 | Note                                                                              |
| ------------------ | ------------------------------------ | --------------------------------------------------------------------------------- |
| **Close**          | An X                                 | Never a trash can                                                                 |
| **Delete**         | A trash can                          | Never an X. Close and delete are very different actions                           |
| **Dismiss a chip** | Always an X                          | An exception because of size. At chip size, a trash can cannot be understood      |
| **Menu**           | A hamburger icon: horizontal lines   | The number of lines may vary. The shape does not                                  |
| **More/overflow**  | An ellipsis: **horizontal** dots     | **NEVER the vertical kebab** (three dots stacked up and down)                     |
| **Edit**           | A pencil, everywhere editing happens | Editing a form and editing a page both use the pencil, because the action is edit |

## One icon, one meaning

**An icon keeps one meaning in every place.** An icon must always have the same meaning, or at least share the same basic action.

**Tie each icon to the icon's action wherever possible.** An edit-form control and an edit-page control may both use a pencil. Both controls do the same action, edit. Reusing the pencil is correct, not a clash.

**The opposite mistake is more common: one function shown with a different icon in two places.** Different icons for one function are one of the two main signs of a careless screen, as the governing principles above say. The alignment review in `recursica-skill-screen-priority` catches the mistake.

## Decorative icons

**Apply the removal test to an icon: take the icon away.** If removing the icon changes nothing about how the user would use the interface, the icon is decorative.

**Decorative does not mean forbidden.** An icon may exist only to break up a page visually and give the eye a point to settle on.

**The allowed decorative icon is a landmarking icon: an icon beside an H2 or H3 heading that helps the user recognize where the user is.** A landmarking icon helps most where several pages share an almost identical layout, and little else shows the user is in the right place. A landmarking icon makes each page look different and shows the user where the user is.

**A landmarking icon is a stated exception to the general removal test** in `recursica-skill-screen-priority`. The removal test removes every element on the screen that the workflow does not need. A landmarking icon may stay even though the icon fails the removal test. No other part of the removal test changes.

**Assistive technology must not announce a decorative icon.** A decorative icon has no meaning for assistive technology to announce.

## Status as an icon

**A status may be shown as an icon instead of as text.** A status is often shown with both an icon and a color.

**Status icons help users scan.** On a dense screen made almost entirely of text, reading even more text to find a status is hard work. An icon is faster to spot than text, most of all when the icon and the text appear together.

**Color never shows the status by itself.** `recursica-skill-system-conventions` requires that any meaning the user must receive survives when one channel (color, shape, position or text, each a separate signal) fails. An icon and a color are two channels, but both channels are still only visual. A status icon therefore needs an accessible name (the name a screen reader reads out for a control) that says what the status is.

**In a table cell, a status icon comes with text.** See "Icons in tables" below.

## Icons in tables

**An icon alone in a table cell is only ever an icon-only button.**

**NEVER place an icon the user cannot interact with alone in a table cell with no other information.** The team said the rule has no limit and no exception. A status column pairs each status icon with the status text.

`recursica-skill-tables` owns how icons line up in a table cell, and which columns a table has at all.

## Set by the theme or the component

- **Which icon set the system uses.** The system always has a default icon set, and the designer's chosen icon set is configured in the development tools. Use the configured icon set.
- **How icons are drawn.** Every icon inherits the line thickness, corner roundness, fill, size and color.
- **The icon that comes with a component**, such as the indicator on a dropdown or an accordion. Do not add another icon on top of a built-in icon.

## Out of scope

- **Whether a control is a button or a link, and where the control sits** — `recursica-skill-buttons-links`, which also decides between icon-only and text controls in table rows.
- **Tooltip content, placement, and behavior** — `recursica-skill-tooltip`.
- **Navigation made only of icons**, which is forbidden outright — `recursica-skill-navigation`.
- **What a status is called** — `recursica-skill-naming-terminology`.
- **Whether a badge may hold an icon** — `recursica-skill-badges-chips`, which lists the question as open.
- **Motion.** No Recursica skill decides whether an icon may animate.

## Open questions

- **The icon for each meaning outside the fixed-meanings table.** The team named icons only for close, delete, chip dismiss, menu, more, and edit. Raise the icon for every other meaning as a question, and do not choose the icon.
- **Whether a system may ever have more than one icon set.** The rule was stated as "typically" one icon set, with no example of when two icon sets would be right.
- **Which icon marks an external link**, and whether an external-link icon is required. The question is still open, as `recursica-skill-link` notes.
- **A status icon plus color outside a table.** A table cell requires text with a status icon. No decision says whether a status may be shown as an icon alone outside a table.
- **How many decorative icons are too many**, and whether heading icons go on every heading of a level, or only on some headings.
- **Icon size, and when a larger or smaller icon is called for.** Icon size was not discussed. The components decide icon size.

## Pre-flight checklist

- [ ] Every icon on the screen comes from one icon set and one style. The screen does not mix filled, outline and thin icon styles, or icons with different corner roundness and line thickness.
- [ ] No icon comes from outside the configured icon set. A missing icon is raised as a gap, not filled from another icon set.
- [ ] Every icon-only button has a tooltip, with no exceptions.
- [ ] The screen's clear primary action has a text label, and icon-only controls are used only for secondary functions.
- [ ] No generic icon stands alone for a specific function, and no tooltip stands in for a missing label.
- [ ] An X means close, a trash can means delete, dismissing a chip is an X, more is a horizontal ellipsis and never a vertical kebab, and edit is a pencil.
- [ ] No icon has two different meanings, and every reused icon shares the same basic action.
- [ ] No function is shown with two different icons in any part of the application.
- [ ] Assistive technology announces no decorative icon, and every icon kept after failing the removal test is a landmarking icon beside a heading.
- [ ] Every status shown as an icon has an accessible name, and the status never depends on color alone.
- [ ] No icon the user cannot interact with sits alone in a table cell.
- [ ] Open questions were asked about, not decided: icons for meanings outside the fixed-meanings table, more than one icon set, the external-link icon, status icons outside a table, how many decorative icons, and icon size.
