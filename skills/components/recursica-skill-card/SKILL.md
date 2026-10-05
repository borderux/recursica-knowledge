---
name: recursica-skill-card
description: Rules for the Recursica card — the five tests a card set must pass, why many items is a table and one object is not a card, never a form in a card, and using space instead of a container. Use before wrapping content in a card, tile, or box. Not for tabular sets — see recursica-skill-tables.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Card

A card separates one repeating object from the object's peers (objects of the same kind, such as rows in a list). A card is not a container for grouping any content.

**Using too many cards is the most common mistake.** Generated screens end up with boxes inside boxes, because a card looks like a safe way to group content. A card is not a safe way to group content. Group content with space. Draw a boundary only around repeated items.

## Five tests for a card

**Use a card only when all five tests below pass.**

1. **Plurality.** The screen shows more than one object of the same kind. A single object is never a card.
2. **Finite and small.** The list of items has a fixed end, and the list is short. A high plurality (a large number of items of the same kind) is a table.
3. **Repetition.** Every item has the same kinds of information, in the same arrangement.
4. **A graphic.** Each item contains a graphic, such as a chart, an image or a photograph. Data that is only text and numbers is a table.
5. **Separate, but together.** The items need to look clearly separate from each other. The items also need to look like one group of the same kind of object.

**If any test fails, do not use a card.** Use a table or spacing instead, depending on which test failed.

**Test 4 has one exception, described below. Tests 1, 2, 3 and 5 have no exception.**

## The aesthetic exception

**Now and then, a small, finite list of repeating items looks better as cards, even with no graphic.** Looks are a valid reason in that case. The aesthetic exception is the only exception for looks in this skill.

The aesthetic exception is narrow:

- **The aesthetic exception waives test 4 only.** A high plurality is still a table. A single object is still not a card. A form is still never a card.
- **The aesthetic exception is occasional.** If most of the card sets in an application use the aesthetic exception, the exception has become the rule, and the reasoning has gone wrong.
- **State when a card set uses the aesthetic exception.** Say that the card set is a choice made for looks, not the default. Saying so keeps the choice visible and rare.

## When to use a card

- **Several repeating objects of the same type, each with the same kinds of information**, such as several products, several records or several search results.
- **Peer objects that would otherwise be hard to tell apart**, where a user could misread where one object ends and the next object begins.
- **Items that each have a chart or an image** that a table row could not show clearly.

## When not to use a card

| Instead of a card                                                          | Use                                                                   |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| A high plurality of items, a list with no fixed end, or a list that grows  | **A table**, with no exception. See `recursica-skill-tables`.         |
| Only data, meaning text and numbers with no graphic                        | **A table**, or cards chosen on purpose under the aesthetic exception |
| The properties of one object                                               | A detail view or a form                                               |
| A form, a form section, or a single form control                           | No container. **Never a card.** See "Forms in cards" below.           |
| A region of a page that needs to look like one unit                        | White space and type hierarchy, with no box                           |
| A chart or a table, wrapped in a card only "to contain" the chart or table | No container. The chart or the table is an object.                    |
| A list of names or files that are all alike                                | A list                                                                |
| An object too complex to summarize                                         | A separate page for the object, not a taller card                     |

**Never nest a card inside a card, and never build a whole screen out of cards.** A dashboard is a fixed layout with a hierarchy, and cards may be placed in that layout. A dashboard is not a grid of equally weighted boxes. See `recursica-skill-dashboards`.

## Forms in cards

**A form, a form section, or any single form control MUST NOT be placed inside a card. The rule has no exception.**

The rule follows from the five tests. A form shows the properties of one object, not a list of repeating peers. A card boundary around a form has no other object to separate the form from. `recursica-skill-forms` sets the form layout, and the field components include the spacing the form layout calls for.

## Spacing instead of cards

**When the five tests fail and content still needs grouping, use white space, then type hierarchy, then layout structure, in this order:**

1. **White space.** Distance is the main way to group content. Put related items closer together than unrelated items.
2. **Type hierarchy.** A heading starts a group and shows the group's rank, without any drawn element, such as a line or a box.
3. **Layout structure.** The design system's layouts, grids and gutters (the gaps between columns and regions) place regions relative to each other.

## Variants

**Use only the card variants and options that the Recursica MCP server lists for the project.** A designer can add variants and options in Theme Forge, so each project can differ. Get the list with the server's `recursica_get_component_doc` tool, and use the names the code uses. Never invent a variant or an option.

The rules below describe each option by role. The names in the standard UI kit (the unchanged UI kit in the official Recursica release) and on the design-system website are examples only.

- **No variants in the standard UI kit.** The standard UI kit sets every card setting as a fixed property, not a variant.
- **Two choices shown only on the design-system website.** The standard UI kit has neither choice. Use either choice only when the project lists the choice. Otherwise, ask.
  - **A style.** The card has a raised style and an outlined style. The website calls the two styles Elevation and Outline.
  - **A graphic slot.** The slot holds the graphic that test 4 requires, such as an image or a chart. The slot sits above the card content or below the card content, or the card has no slot. The website calls the three options Top, Bottom and None. A card with no slot is the setup the aesthetic exception relies on.
- **Parts of the card.** The card component provides a header with an optional button, a content area, sections separated by a divider, and a footer. Tokens set the gap between sections, the vertical gutter and the divider size.
- **No size variant in the standard UI kit.** The card's minimum width and maximum width are fixed. If the project adds a size variant in Theme Forge, use the project's size variant. Otherwise, do not build a wide card and a narrow card as variants.
- **No state for user actions, no selected state and no hover state in the standard UI kit.** If the project adds one of these states in Theme Forge, use the project's state. A card is not a control. When a card is a link or holds a link, see "Accessibility" for what that means.
- **No rule for choosing a style.** Do not choose between the raised style and the outlined style at random. No rule says where to use each style. See "Open questions".

**A card sits on a layer (a numbered background level, 0 to 3, that sets the colors of the components on that level). A card is not a replacement for a layer.** The card has a separate set of colors for each of the four layers, so the layer under a card changes how the card looks. A layer sets the background and the design values for an area of the screen. A card is the boundary around one object among repeating peers. See `recursica-skill-layers`.

## Rules

**Every card in a card set has the same layout.** Every card shows the same fields, in the same order, in the same slots. When the cards in a card set differ, the objects are probably not peers.

**The card header names the specific item**, not the category and not a field label.

**Put a card's actions in one area at most.** The card component has a header button and a footer, but a card with actions in three places has too many places for actions.

**Do not put a table inside a card**, and do not put a card inside a table cell.

**Never use a card's padding to lay out content.** Use the page layout to move content away from an edge.

**Put a badge on a card in the upper-right corner.** `recursica-skill-badges-chips` sets the badge placement rule.

## Accessibility

The rules below add to the accessibility baseline in `recursica-skill-system-conventions`, including the focus ring, which every Recursica component follows.

**A screen reader must announce a card set as one list of objects.** Two failures matter:

- A screen reader announces the card set as one long run of text, with no boundary between cards.
- A keyboard user cannot activate a clickable card, or the click area of a clickable card blocks the controls inside the card.

### Screen readers

- **Announce a card set as a list, with the number of cards.** The cards in a card set are peers. A screen reader user needs to know how many cards the list holds, such as six, and which card the user is on.
- **Start every card with a heading**, at the same heading level in every card of the card set. The headings let the user jump from card to card instead of reading every word.
- **The reading order must match the visual order.** If the slot is at the top of the card, the slot also comes first in the reading order.
- **Give an image in the slot alternative text, or mark the image clearly as decorative.** An unlabeled image announced as "graphic" in every card is noise. A meaningful image with no alternative text loses information.
- **A chart in the slot is not accessible alone.** `recursica-skill-data-visualization` requires a data table with every chart, and the data table makes a chart card usable.
- **Do not rely on the card's border or elevation to show where a card ends.** The border or the elevation separates the objects visually. In code, the list structure and the headings must separate the objects.
- **Name the object in every repeated control.** "Edit" in every card is five identical announcements. The control's name must say which item, or the card must give the item as context in code.

### Keyboard and non-mouse navigation

- **A card the user cannot act on is not a tab stop** (a place the Tab key lands). Do not give a static card a `tabindex` or a click handler.
- **If the whole card is a link, the link must be the only element in the card the user can act on.** A button inside a clickable card gives the keyboard user two overlapping targets, and the user cannot tell what a press activates. `recursica-skill-tables` applies the same reasoning to clickable table rows.
- **Prefer making the card's heading the link, instead of the whole card.** The heading gives the link a real name. A link the size of the card is announced with every word in the card.
- **Never make any element appear on hover.** Keyboard users and touch users cannot reach an action that appears only when the pointer is over a card. Keep every card action visible, or put the action in a menu the user can reach.
- **The tab order moves card by card**, in the visual order, not column by column against the layout.

## Styling set by tokens

**Do not set or override the card properties below.** The card component sets each property.

- `padding`, `header-padding`, `footer-padding`, `section-gap`, `vertical-gutter`.
- `borders`, `elevations`, `divider-size`, `colors`.
- `min-width`, `max-width`.
- `header-style` and `content-style`, the typography of the header and the content.
- Corner radius, and any hover style or focus style.

## Related skills

- `recursica-skill-system-conventions` — the general convention to group content with space, not with boxes.
- `recursica-skill-tables` — the alternative whenever a list has a high plurality or holds only data, and the rule for clickable table rows.
- `recursica-skill-dashboards` — why a grid of equally weighted cards has no hierarchy, and what to build instead.
- `recursica-skill-forms` — form layout, and the spacing the field components include.
- `recursica-skill-badges-chips` — where a badge or a chip goes on a card.
- `recursica-skill-data-visualization` — the chart in the slot, and the data table every chart requires.

## Open questions

- **When the raised style applies, and when the outlined style applies.** The website calls the two styles Elevation and Outline. Both styles appear only on the design-system website, which has no variant for either style. No rule says where to use either style. Ask before relying on either style.
- **How many cards count as a "small and finite" card set.** The skill states the limit as a judgment, not a number.
- **Card layout across breakpoints**, meaning how many cards fit across the screen, and what happens below desktop size. `recursica-skill-design-router` names card layout across breakpoints as a topic with no owner.
- **Whether a user may select a card** as part of a multi-select, and what the selected state looks like. The standard UI kit has no selected state. Ask only when the project has no selected state.
- **The empty state of a card set.** What a card set shows when the set has one card or no cards.
- **Whether the header button and the footer may both be used** in the same card.

## Pre-flight checklist

- [ ] All five tests pass, or the card set uses the aesthetic exception and is labeled as a choice made for looks.
- [ ] A high plurality went to a table, and a single object did not become a card.
- [ ] No form, form section, or form control is inside a card.
- [ ] No card is nested inside a card, and the screen is not built out of cards.
- [ ] No region has a box around the region where white space and type hierarchy could group the region instead.
- [ ] Every card in the card set has the same layout, and each card header names the specific item.
- [ ] The card set is announced as a list with the number of cards, and each card starts with a heading at the same level.
- [ ] The reading order matches the visual order, and every image in a slot has alternative text or is marked decorative.
- [ ] Every chart in a slot has a data table.
- [ ] Every repeated control names the control's object.
- [ ] No static card is a tab stop, and a clickable card contains no other element the user can act on.
- [ ] Every card variant, option and state is one the project lists, no variant or option is invented, and the card's padding, border, and elevation come from the card component.
- [ ] Open questions were asked about, not decided: the raised style versus the outlined style, how many cards make a small finite card set, card layout across breakpoints, selectable cards, the empty state of a card set, the header button with the footer in one card.
