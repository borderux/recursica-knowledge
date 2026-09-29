---
name: recursica-skill-card
description: How to use the Recursica card correctly — the five tests a card set must pass, the narrow aesthetic exception, why high plurality is a table and a single object is not a card, the absolute prohibition on putting a form or form control in a card, what the component provides (header, sections, footer, slot), using spacing instead of a drawn container, and the screen-reader and keyboard requirements for a card set. Use whenever adding, reviewing, or refactoring a card, deciding whether a region needs a visible container, or converting a wall of cards into something with hierarchy. Trigger on "card", "cards", "tile", "wrap this in a card", "container", "box", "panel around", "card grid", "screen reader", "tab order", or any layout where content is about to be given a border. Do NOT use for tabular sets — that is recursica-skill-tables. Do NOT use for the general convention that a container must be earned — that is recursica-skill-system-conventions.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Card

A card separates one repeating object from its peers (objects of the same kind, such as rows in a list). It is not a container for whatever needs grouping.

**Overuse is the usual failure.** Generated screens turn into boxes inside boxes, because a card looks like a safe way to group things. It is not. Grouping is done with space; a drawn boundary has to be earned.

## The five tests — all must pass

Before using a card, confirm all five:

1. **Plurality.** There is more than one of the object on the screen. A single object is never a card.
2. **Finite and small.** The set has a fixed end, and it is short. **A high plurality (a large number of items of the same kind) is a table.**
3. **Repetition.** Every item carries the same kinds of information, in the same arrangement.
4. **A graphic.** Each item contains something visual — a chart, an image, a photograph. **A set of data that is only text and numbers is a table.**
5. **Separate, but together.** The items need to read as clearly separate objects, while still reading as one group of the same kind of thing.

**If any test fails, do not use a card.** Depending on which test failed, use a table, or use spacing.

**Test 4 has one exception, below. Tests 1, 2, 3, and 5 have none.**

## The aesthetic exception

**Now and then, a small, finite, repeating set simply looks better as cards, even with no graphic in it.** That is a valid reason, and it is the only exception for looks in this skill.

It is narrow:

- **It waives test 4 only.** A high plurality is still a table. A single object is still not a card. A form is still never a card.
- **It is occasional.** If most of the card sets in an application are relying on this exception, the exception has become the rule, and the reasoning has gone wrong.
- **Say when you are using it.** State that it is a choice made for looks, instead of presenting the card set as the default, so the choice stays visible and stays rare.

## Use it when

- **A set of repeating objects of the same type** — several products, several records, several search results — each built from the same kinds of information.
- **Peer objects that would otherwise blur together**, where the boundary between one and the next really is at risk of being misread.
- **Each item carries a chart or an image** that a table row could not show clearly.

## Do not use it when

| Instead of a card                                 | Use                                                            |
| ------------------------------------------------- | -------------------------------------------------------------- |
| High plurality, no fixed end, or growing          | **A table** — no exception. See `recursica-skill-tables`       |
| Only data: text and numbers, with no graphic      | **A table**, unless you use the aesthetic exception on purpose |
| One object's properties                           | A detail view or a form                                        |
| A form, a form section, or a single form control  | Nothing. **Never a card** — see below                          |
| A region of a page that needs to read as one unit | White space and type hierarchy. No box                         |
| Wrapping a chart or a table "to contain it"       | Nothing. The chart or table is already an object               |
| A list of names or files that are all alike       | A list                                                         |
| An object too complex to summarize                | A page of its own, not a taller card                           |

**Never nest a card inside a card, and never build a whole screen out of cards.** A dashboard is a fixed layout with hierarchy, where cards may be placed — not a grid of equally weighted boxes. See `recursica-skill-dashboards`.

## Never put a form in a card

**A form, a form section, or any single form control MUST NOT be placed inside a card. There is no exception.**

This follows from the tests: a form is the properties of one object, not a set of repeating peers, so the boundary has nothing to separate it from. Form layout is governed by `recursica-skill-forms`, and the spacing it calls for is already built into the field components.

## Use spacing instead

When the tests fail and grouping is still needed, reach for these, in this order:

1. **White space.** Distance is the main way to group things. Related things sit closer together than unrelated things.
2. **Type hierarchy.** A heading sets up a group, and its rank, without drawing anything.
3. **Layout structure.** The design system's layouts, grids, and gutters (the gaps between columns and regions) place regions relative to each other.

## What exists

Taken from `recursica_ui-kit.json` → `ui-kit.components.card`. **The kit defines no variant axes on the card** — everything is a property. Two more choices are documented outside the token inventory.

| Choice | Options            | Source                      |
| ------ | ------------------ | --------------------------- |
| Style  | Elevation, Outline | Outside the token inventory |
| Slot   | Top, Bottom, None  | Outside the token inventory |

**The slot is where the graphic goes** — the image or chart that earns the card, above the content or below it. `None` means no slot, which is the setup the aesthetic exception relies on.

**What the component provides:** a header with an optional button, a content area, sections separated by a divider, and a footer. `section-gap`, `vertical-gutter`, and `divider-size` are defined by tokens.

**There is no size axis.** `min-width` and `max-width` are fixed properties. Do not build a wide card and a narrow card as variants.

**The card defines no interactive, selected, or hover state.** A card is not a control; see the accessibility section for what that means when the card links somewhere.

**Do not choose between Elevation and Outline at random** — which one a surface uses is not stated. See the uncovered list.

**A card sits on a layer; it is not an alternative to one.** A layer is a numbered level that sets which colors the components inside it use. The card has its own set of colours for each of the four layer levels, so the layer it is placed on changes how it looks. A layer is a surface and a token scope (the area in which one set of design values applies); a card is the boundary of an object among repeating peers. See `recursica-skill-layers`.

## Rules for using it

**Every card in a set has the same shape.** The same fields, in the same order, in the same slots. A set whose cards differ is a sign that the objects are not really peers.

**The card's header names the object.** Not the category, and not the field label — the specific item.

**At most one area for actions.** The header button and the footer both exist, but a card with actions in three places is doing too much.

**Do not put a table inside a card**, and do not put a card inside a table cell.

**Never use the card's padding as layout.** If the goal is to move content away from an edge, that is the page layout's job.

**A badge on a card sits in the upper right.** Owned by `recursica-skill-badges-chips`.

## Accessibility

This component also follows the accessibility baseline in `recursica-skill-system-conventions`, including the focus ring (the outline that shows which element has keyboard focus). Only what is specific to it is listed here.

A card set is a list of objects, and it must be announced as one. Two failures matter: a set that reads as one long run of text with no boundaries, and a "clickable card" that a keyboard user cannot activate, or that swallows the controls inside it.

### Screen readers

- **Announce the set as a list, with its length.** The whole purpose of a card set is that the items are peers — a screen reader (software that reads the screen aloud) user needs to know there are six of them, and which one they are in.
- **Every card starts with a heading**, at the same level across the whole set. The heading is what lets the user jump between cards instead of reading everything.
- **Reading order must match visual order.** If the slot is on top visually, it comes first in the reading order too.
- **An image in the slot needs alternative text (text read in place of the image), or must be clearly marked as decorative.** An unlabeled image announced as "graphic" in every card is noise; a meaningful image that is not marked is lost information.
- **A chart in the slot is not accessible on its own.** `recursica-skill-data-visualization` requires an accompanying data table — that requirement is what makes a chart card usable here.
- **Do not rely on the card's border or elevation to show the boundary.** Visually, they separate the objects; in code, the list structure and the headings must do it.
- **Repeated controls must name their object.** "Edit" in every card is five identical announcements. The name must say which item, or the card must supply that context in code.

### Keyboard and non-mouse navigation

- **A card that is not interactive is not a tab stop** (a place the Tab key lands). Do not give a static card a tabindex or a click handler.
- **If the whole card is a link, it must be the only interactive thing in it.** Nesting a button inside a clickable card gives the keyboard user overlapping targets, and makes it unclear what activating does — the same reasoning `recursica-skill-tables` applies to clickable rows.
- **Prefer making the card's heading the link**, instead of making the whole card one. The heading gives the link a real name; a link the size of the card is announced as the card's entire contents.
- **Nothing may appear on hover.** Actions revealed by hovering over a card cannot be reached by keyboard or by touch. A card's actions stay visible, or they are in a menu that can itself be reached.
- **The tab order runs card by card**, following the visual order — not column by column against the layout.

## Not your decision

Do not implement, override, or tune any of these — the component owns them:

- `padding`, `header-padding`, `footer-padding`, `section-gap`, `vertical-gutter`.
- `borders`, `elevations`, `divider-size`, `colors`.
- `min-width`, `max-width`.
- `header-style` and `content-style` type treatment.
- Corner radius, and any hover or focus treatment.

## Load these too

- `recursica-skill-system-conventions` — the general convention that a visible container must be earned.
- `recursica-skill-tables` — the alternative whenever plurality is high or the content is purely data, and the clickable-row rule.
- `recursica-skill-dashboards` — why a wall of equal-weight cards has no hierarchy, and what to build instead.
- `recursica-skill-forms` — form layout and the spacing already built into the field components.
- `recursica-skill-badges-chips` — badge and chip placement within a card.
- `recursica-skill-data-visualization` — the chart in the slot, and its required data table.

## Uncovered — ask, do not invent

- **When Elevation applies, and when Outline does.** Both are documented outside the token inventory, which has no variant axis for either, and no rule assigns them to surfaces. Do not rely on this without asking.
- **How many cards count as a "small and finite" set.** The limit is stated as a judgment, not a number.
- **Card layout across breakpoints** — how many go across, and what happens below desktop size. Named as having no owner in `recursica-skill-design-router`.
- **Whether a card may be selectable** as part of a multi-select, and what the selected state looks like. No such state exists.
- **The empty state of a card set** — one card, or none.
- **Whether the header button and the footer may both be used** in the same card.

## Pre-flight checklist

- [ ] All five tests pass, or you used the aesthetic exception on purpose and said so.
- [ ] A high plurality went to a table, and a single object did not become a card.
- [ ] No form, form section, or form control is inside a card.
- [ ] No card is nested inside a card, and the screen is not built out of cards.
- [ ] You boxed no region for grouping that white space and type hierarchy could handle.
- [ ] Every card in the set has the same shape, and its header names the specific item.
- [ ] The set is announced as a list with its length, and each card starts with a heading at the same level.
- [ ] The reading order matches the visual order, and slot images have alt text or are marked decorative.
- [ ] Any chart in a slot has its accompanying data table.
- [ ] Repeated controls name their object.
- [ ] Static cards are not tab stops, and a clickable card contains no other interactive element.
- [ ] You invented no size variant, and overrode no padding, border, or elevation that the component owns.
- [ ] You invented nothing from the uncovered list.
