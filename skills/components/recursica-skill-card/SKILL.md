---
name: recursica-skill-card
description: How to use the Recursica card correctly — the five tests a card set must pass, the narrow aesthetic exception, why high plurality is a table and a single object is not a card, the absolute prohibition on putting a form or form control in a card, what the component provides (header, sections, footer, slot), using spacing instead of a drawn container, and the screen-reader and keyboard requirements for a card set. Use whenever adding, reviewing, or refactoring a card, deciding whether a region needs a visible container, or converting a wall of cards into something with hierarchy. Trigger on "card", "cards", "tile", "wrap this in a card", "container", "box", "panel around", "card grid", "screen reader", "tab order", or any layout where content is about to be given a border. Do NOT use for tabular sets — that is recursica-skill-tables. Do NOT use for the general convention that a container must be earned — that is recursica-skill-system-conventions.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Card

A card separates one repeating object from its peers. It is not a container for whatever needs grouping.

**Overuse is the default failure.** Generated screens turn into nested boxes because a card looks like a safe way to group things. It is not. Grouping is done with space; a drawn boundary has to be earned.

## The five tests — all must pass

Before using a card, confirm all five:

1. **Plurality.** There is more than one instance on the screen. A single object is never a card.
2. **Finite and small.** The set is bounded and short. **High plurality is a table.**
3. **Repetition.** Every instance carries the same information types, in the same arrangement.
4. **A graphical element.** Each instance contains something visual — a chart, an image, a photograph. **A set of purely textual and numeric data is a table.**
5. **Segregation with unity.** The instances need to read as visually distinct objects while still reading as one group of the same kind of thing.

**If any test fails, do not use a card.** Depending on which one failed, use a table or use spacing.

**Test 4 has one exception, below. Tests 1, 2, 3, and 5 have none.**

## The aesthetic exception

**Occasionally a small, finite, repeating set simply looks better as cards, with no graphical element in it.** That is a legitimate reason, and it is the only aesthetic override in this skill.

It is narrow:

- **It waives test 4 only.** High plurality is still a table. A single object is still not a card. A form is still never a card.
- **It is occasional.** If most card sets in an application are riding on this exception, the exception has become the rule and the reasoning has gone wrong.
- **Say when you are using it.** State that it is an aesthetic call rather than presenting the card set as the default reading, so the choice stays visible and stays rare.

## Use it when

- **A set of repeating objects of the same type** — several products, several records, several search results — each built from the same information types.
- **Peer objects that would otherwise blur together**, where the boundary between one and the next is genuinely at risk of being misread.
- **Each instance carries a chart or an image** that a table row could not hold legibly.

## Do not use it when

| Instead of a card                                | Use                                                                 |
| ------------------------------------------------ | ------------------------------------------------------------------- |
| High plurality, unbounded, or growing            | **A table** — no exception. See `recursica-skill-tables`            |
| Purely data: text and numbers, no graphic        | **A table**, unless the aesthetic exception is invoked deliberately |
| One object's properties                          | A detail view or a form                                             |
| A form, a form section, or a single form control | Nothing. **Never a card** — see below                               |
| A region of a page that needs to read as a unit  | White space and type hierarchy. No box                              |
| Wrapping a chart or a table "to contain it"      | Nothing. The chart or table is already an object                    |
| A homogeneous list of names or files             | A list                                                              |
| An object too complex to summarize               | A dedicated page, not a taller card                                 |

**Never nest a card inside a card, and never build a whole screen out of cards.** A dashboard is a static layout with hierarchy, into which cards may be placed — not a grid of equal-weight boxes. See `recursica-skill-dashboards`.

## Never put a form in a card

**A form, a form section, or any individual form control MUST NOT be placed inside a card. There is no exception.**

This follows from the tests: a form is one object's properties, not a set of repeating peers, so the boundary has nothing to separate it from. Form layout is governed by [`recursica-skill-forms`](../../design-rules/recursica-skill-forms/SKILL.md), and the spacing it specifies is already built into the field components.

## Use spacing instead

When the tests fail and grouping is still needed, reach for these in order:

1. **White space.** Distance is the primary grouping mechanism. Related things sit closer together than unrelated things.
2. **Type hierarchy.** A heading establishes a group and its rank without drawing anything.
3. **Layout structure.** The design system's layouts, grids, and gutters position regions relative to each other.

## What exists

Taken from `recursica_ui-kit.json` → `ui-kit.components.card`. **The kit defines no variant axes on the card** — everything is a property. Two further choices are documented outside the token inventory.

| Choice | Options            | Source                      |
| ------ | ------------------ | --------------------------- |
| Style  | Elevation, Outline | Outside the token inventory |
| Slot   | Top, Bottom, None  | Outside the token inventory |

**The slot is where the graphical element goes** — the image or chart that earns the card, above the content or below it. `None` means no slot, which is the configuration the aesthetic exception rides on.

**What the component provides:** a header with an optional button, a content area, sections separated by a divider, and a footer. `section-gap`, `vertical-gutter`, and `divider-size` are token-defined.

**There is no size axis.** `min-width` and `max-width` are fixed properties. Do not build a wide card and a narrow card as variants.

**There is no interactive, selected, or hover state** defined on the card. A card is not a control; see the accessibility section for what that means when the card links somewhere.

**Do not choose Elevation and Outline arbitrarily** — which one a surface uses is not stated. See the uncovered list.

**A card sits on a layer; it is not an alternative to one.** The card carries its own colour set for each of the four layer levels, so the layer it is placed on changes how it renders. A layer is a surface and a token scope; a card is an object boundary for repeating peers. See `recursica-skill-layers`.

## Rules for using it

**Every card in a set is the same shape.** The same fields, in the same order, in the same slots. A set whose cards differ is a sign the objects are not really peers.

**The card's header names the object.** Not the category, not the field label — the instance.

**At most one action region.** The header button and the footer both exist; a card with actions in three places is doing too much.

**Do not put a table inside a card**, and do not put a card inside a table cell.

**Never use the card's padding as layout.** If the goal is to move content off an edge, that is the page layout's job.

**A badge on a card sits in the upper right.** Owned by `recursica-skill-badges-chips`.

## Accessibility

A card set is a list of objects, and it must be announced as one. The two failures that matter: a set that reads as an undifferentiated run of text with no boundaries, and a "clickable card" that a keyboard user cannot activate or that swallows the controls inside it.

### Screen readers

- **Announce the set as a list, with its length.** A card set's whole purpose is that the instances are peers — a screen reader user needs to know there are six of them and which one they are in.
- **Every card starts with a heading**, at a consistent level across the set. The heading is what lets the user jump between cards instead of reading everything.
- **Reading order must match visual order.** If the slot is on top visually, it comes first in the reading order too.
- **An image in the slot needs alternative text, or must be explicitly marked decorative.** An unlabeled image announced as "graphic" in every card is noise; an unmarked meaningful image is lost information.
- **A chart in the slot is not accessible on its own.** `recursica-skill-data-visualization` requires an accompanying data table — that requirement is what makes a chart card usable here.
- **Do not rely on the card's border or elevation to communicate the boundary.** Visually it separates the objects; programmatically the list structure and the headings must do it.
- **Repeated controls must name their object.** "Edit" in every card is five identical announcements — the name must carry which instance, or the card must provide that context programmatically.

### Keyboard and non-mouse navigation

- **A card that is not interactive is not a tab stop.** Do not give a static card a tabindex or a click handler.
- **If the whole card is a link, it must be the only interactive thing in it.** Nesting a button inside a clickable card gives the keyboard user overlapping targets and an ambiguous activation — the same reasoning `recursica-skill-tables` applies to clickable rows.
- **Prefer making the card's heading the link** over making the whole card one. The heading gives the link a real name; a card-sized link is announced as the entire contents of the card.
- **Nothing may appear on hover.** Actions revealed by hovering over a card are unreachable by keyboard and by touch — a card's actions are persistently visible or they are in a menu that is itself reachable.
- **Tab order runs card by card**, following visual order, not column by column against the layout.
- **Never suppress the focus ring** on an interactive card or on any control inside it, and never let the hover style double as the focus style.

## Not your decision

Do not implement, override, or tune any of these — the component owns them:

- `padding`, `header-padding`, `footer-padding`, `section-gap`, `vertical-gutter`.
- `borders`, `elevations`, `divider-size`, `colors`.
- `min-width`, `max-width`.
- `header-style` and `content-style` type treatment.
- Corner radius, and any hover or focus treatment.

## Load these too

- [`recursica-skill-system-conventions`](../../design-rules/recursica-skill-system-conventions/SKILL.md) — the general convention that a visible container must be earned.
- [`recursica-skill-tables`](../../design-rules/recursica-skill-tables/SKILL.md) — the alternative whenever plurality is high or the content is purely data, and the clickable-row rule.
- [`recursica-skill-dashboards`](../../design-rules/recursica-skill-dashboards/SKILL.md) — why a wall of equal-weight cards has no hierarchy, and what to build instead.
- [`recursica-skill-forms`](../../design-rules/recursica-skill-forms/SKILL.md) — form layout and the spacing already built into the field components.
- [`recursica-skill-badges-chips`](../../design-rules/recursica-skill-badges-chips/SKILL.md) — badge and chip placement within a card.
- [`recursica-skill-data-visualization`](../../design-rules/recursica-skill-data-visualization/SKILL.md) — the chart in the slot, and its required data table.

## Uncovered — ask, do not invent

- **When Elevation applies and when Outline does.** Both are documented outside the token inventory, which carries no variant axis for either, and no rule assigns them to surfaces. Do not rely on this without asking.
- **How many cards make a set "small and finite."** The boundary is stated as a judgment, not a number.
- **Card layout across breakpoints** — how many across, and what happens below desktop. Named as unowned in `recursica-skill-design-router`.
- **Whether a card may be selectable** as part of a multi-select, and what the selected state looks like. No such state exists.
- **The empty state of a card set** — one card, or none.
- **Whether the header button and the footer may both be used** in the same card.

## Pre-flight checklist

- [ ] All five tests pass, or the aesthetic exception was invoked deliberately and stated.
- [ ] High plurality went to a table; a single object did not become a card.
- [ ] No form, form section, or form control is inside a card.
- [ ] No card is nested in a card; the screen is not built out of cards.
- [ ] No region was boxed for grouping that white space and type hierarchy could handle.
- [ ] Every card in the set has the same shape, and its header names the instance.
- [ ] The set is announced as a list with its length; each card starts with a heading at a consistent level.
- [ ] Reading order matches visual order; slot images have alt text or are marked decorative.
- [ ] Any chart in a slot has its accompanying data table.
- [ ] Repeated controls name their object.
- [ ] Static cards are not tab stops; a clickable card contains no other interactive element.
- [ ] Nothing is revealed on hover; the focus ring is intact.
- [ ] No size variant was invented; no component-owned padding, border, or elevation was overridden.
- [ ] Nothing in the uncovered list was invented.
