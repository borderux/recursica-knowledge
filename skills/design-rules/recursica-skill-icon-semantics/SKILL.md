---
name: recursica-skill-icon-semantics
description: House rules for icons in enterprise web applications — one icon set and one style across the whole system, when an icon may stand alone and when it must carry a text label, the tooltip requirement on every icon-only button, icons inside established components that need no explanation, fixed meanings including X for close and a trash can for delete, horizontal ellipsis rather than a vertical kebab, tying an icon to a verb so one icon never means two things, when a decorative icon is legitimate, status expressed as an icon, and the ban on a lone non-interactive icon in a table cell. Use when choosing an icon, deciding whether it needs a label, or reviewing a screen for icon consistency. Trigger on "icon", "icon set", "icon-only", "which icon", "close or delete", "kebab", "decorative icon", or "status icon". Do NOT use for whether a trigger is a button or a link — that is recursica-skill-buttons-links. Do NOT use for tooltip content and behavior — that is recursica-skill-tooltip.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Icon semantics

House rules for which icon carries which meaning and when an icon is allowed to stand on its own. These are opinions, not neutral best practices — apply them as constraints.

Context these rules assume: **complex enterprise web applications** built on a configured icon set. Which set that is, and how it is drawn, are not yours; what each icon means and whether it appears alone are.

## The three governing principles

1. **Inconsistency is the tell.** Two things reveal a screen that was not designed carefully, and both are consistency failures: **mixed icon styles on one screen**, and **the same function drawn with different icons**. Nothing else in this skill is as reliable a diagnostic.
2. **Ambiguity is resolved with words, never with a better icon.** Where a function's meaning is not obvious from its icon, the fix is a text label or a tooltip. Searching for a cleverer glyph is the wrong move.
3. **An icon is tied to a verb, not to a place.** A pencil means edit wherever edit happens. Consistency of meaning is what makes an icon readable at all.

## One icon set, one style

**Pick one icon set for the whole system and use only that set.**

**NEVER mix icon styles on the same screen.** Libraries ship several styles of the same glyph — filled or solid, outline, thin, and variants with different corner radii and stroke weights. Mixing them is the single clearest indicator that a screen was assembled rather than designed.

**There is no exception within a screen**, and typically none within the system either.

**Do not import an icon from outside the configured set** to fill a gap. A missing icon is a gap to raise, not to patch — see `recursica-skill-design-router`.

## When an icon may stand alone

**Icon-only buttons are legitimate and common.** They are correct when:

- **The function is not the primary action** on the screen.
- **There are many functions available**, and labelling all of them would cost far more density than it buys clarity.

**Typical homes:** toolbars, table rows with several applicable actions, and the ellipsis or "more" button signalling that further functionality sits behind a menu.

**Every icon-only button MUST have a tooltip.** Asked where that rule stops applying, the answer was **"never."** There is no context, no density argument, and no established-pattern argument that waives it. Tooltip content and behavior are owned by `recursica-skill-tooltip`; whether a control needs one at all is owned by `recursica-skill-buttons-links`, which states the same rule from its side.

## When a text label is required

Two tests. If either fires, the control gets **icon + label, or a text-only label**.

1. **There is a distinct primary action and everything else is clearly secondary.** The primary action carries a label. Icon-only is for the secondary ones.
2. **The icon is generic and the function is specific.** An icon can be pleasant, supportive, and visually distinguishing while still not saying what it does — or while meaning different things to different people. Where there is any ambiguity about what the function means, it takes a label.

**A tooltip does not substitute for a label in either case.** The tooltip requirement above is a floor for icon-only controls, not a way to make an ambiguous icon acceptable.

**Esoteric business concepts cannot be drawn.** Common, generic actions — edit, home, close — are memorable because the same glyph means the same thing everywhere. **An icon invented for a function specific to one application is very hard to make memorable**, and in enterprise software the concepts are often too abstract for any symbol to carry: there is no agreed semiotics to draw on. Where a concept is niche, **the label is the icon's job, not the other way round.** This is why an icon-only rail fails hardest in business systems — see `recursica-skill-navigation` and `recursica-skill-working-memory`.

## Icons inside established components

**An icon may be the sole carrier of meaning where the control it belongs to is a well-established pattern.** People already know what a dropdown's indicator, an accordion's indicator, and a navigation toggle mean, so no tooltip is required for the icon a component brings with it.

**A close icon on a modal or panel still gets a tooltip anyway** — the pattern is established, but there is no harm in adding one.

**This does not license a bare icon elsewhere.** The exemption belongs to icons that ship inside a component, not to icons you place yourself.

**Where a component's own indicator carries state** — open versus closed — the state must still be exposed programmatically and not ride on the icon alone. Owned by `recursica-skill-system-conventions` and the individual component skills.

## Fixed meanings

**These pairings must not be substituted.**

| Meaning            | Icon                                 | Note                                                             |
| ------------------ | ------------------------------------ | ---------------------------------------------------------------- |
| **Close**          | An X                                 | Never a trash can                                                |
| **Delete**         | A trash can                          | Never an X. The difference between close and delete is a big one |
| **Dismiss a chip** | Always an X                          | Size exception: at chip scale a trash can is unintelligible      |
| **Menu**           | A hamburger — horizontal lines       | The line count may vary; the form does not                       |
| **More/overflow**  | An ellipsis — **horizontal** dots    | **NEVER the vertical kebab**                                     |
| **Edit**           | A pencil, everywhere editing happens | Edit-a-form and edit-a-page share it because they share the verb |

## One icon, one meaning

**The same icon does not mean different things in different places.** It must always mean the same thing, or at minimum share the same **root action**.

**Tie icons to the verb wherever possible.** An edit-form control and an edit-page control may both use a pencil — the action they represent is edit in both cases, so the reuse is correct rather than a collision.

**The inverse failure is the more common one:** the same function drawn with a different icon in two places. That is one of the two headline giveaways in the governing principles, and it is caught by the alignment review pass in `recursica-skill-screen-priority`.

## Decorative icons are allowed

**Apply the removal test:** take the icon away — does anything change in how the user would use the interface? If nothing changes, the icon is decorative.

**Decorative does not mean forbidden.** An icon may exist purely to break a page up visually and give the eye something to anchor to.

**The sanctioned case: an icon beside an H2 or H3 for landmarking.** This is most useful where several pages share a near-identical layout and there is little else to signal that the user is in the right place. The icon supplies visual differentiation and the affordance of place.

**This is a stated exception to the general removal test** in `recursica-skill-screen-priority`, which removes what the workflow does not need. Icons may be kept for landmarking after failing it. Nothing else in that test changes.

**A decorative icon is silent to assistive technology.** It carries no meaning, so it must not be announced.

## Status as an icon

**A status may be expressed as an icon rather than as text**, and is often carried by **both an icon and a color**.

**The reason is scanning.** In a dense screen where nearly everything is text, reading yet more text to find a status is arduous. An icon is faster to pick out — most of all when icon and text appear together.

**Color never carries the status by itself.** Two visual channels are still only visual; `recursica-skill-system-conventions` requires that any meaning the user must receive survive a channel failing, so a status icon needs an accessible name saying what the status is.

**In a table cell, a status icon is accompanied by text** — see below.

## Icons in tables

**A lone icon in a table cell is only ever an icon-only button.**

**NEVER place a non-interactive icon alone in a cell with no other information.** Asked for the boundary or exception, the answer was that it does not exist. A status column pairs the icon with its text.

Cell alignment for icons, and which columns exist at all, are owned by `recursica-skill-tables`.

## Not your decision

- **Which icon set the system uses.** There is always a default set, and the designer's chosen set is configured into the dev tooling. Consume what is configured.
- **How icons are drawn** — stroke weight, corner radius, fill, size, and color. All inherited.
- **The icon a component ships with**, such as a dropdown's or an accordion's indicator. Do not add your own on top.

## Out of scope

- **Whether a control is a button or a link, and where it sits** — `recursica-skill-buttons-links`, which also owns icon-only-versus-text in table rows.
- **Tooltip content, placement, and behavior** — `recursica-skill-tooltip`.
- **Icon-only navigation**, which is forbidden outright — `recursica-skill-navigation`.
- **What a status is called** — `recursica-skill-naming-terminology`.
- **Whether a badge may carry an icon** — `recursica-skill-badges-chips`, where it is listed as uncovered.
- **Motion.** Whether an icon may animate is unowned across the family.

## Uncovered — ask, do not invent

- **The specific glyph for anything not in the fixed-meanings table.** Only close, delete, chip dismiss, menu, more, and edit were named. Everything else is a choice to raise, not to make.
- **Whether a system may ever hold more than one icon set** — stated as "typically" one, with no case given where two would be right.
- **Which icon marks an external link**, and whether it is required — still open, as `recursica-skill-link` notes.
- **Status icon plus color outside a table.** Whether a status may be icon-only anywhere, given that text is required in a cell, was not settled.
- **How many decorative icons are too many**, and whether heading icons should be applied to every heading of a level or only some.
- **Icon size and when a larger or smaller icon is warranted.** Not discussed; the components decide.

## Pre-flight checklist

- [ ] Every icon on the screen comes from one set and one style — no mixing of filled, outline, thin, or differing corner radii and stroke weights.
- [ ] No icon was imported from outside the configured set; a missing icon was raised instead.
- [ ] Every icon-only button has a tooltip, with no exceptions claimed.
- [ ] The screen's distinct primary action carries a text label; icon-only is reserved for secondary functions.
- [ ] No generic icon stands alone for a specific function, and no tooltip is standing in for a missing label.
- [ ] X means close, a trash can means delete, chip dismiss is an X, more is a horizontal ellipsis and never a vertical kebab, and edit is a pencil.
- [ ] No icon means two different things; every reused icon shares the same root verb.
- [ ] No function is drawn with two different icons anywhere in the application.
- [ ] Decorative icons are silent to assistive technology, and any kept after failing the removal test are landmarking beside a heading.
- [ ] A status carried by an icon has an accessible name, and never rides on color alone.
- [ ] No non-interactive icon sits alone in a table cell.
- [ ] Nothing in the uncovered list was invented.
