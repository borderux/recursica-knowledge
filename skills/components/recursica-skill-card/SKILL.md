---
name: recursica-skill-card
description: Trigger this when the developer asks to design, write, or refactor a UI layout containing the card component, or is about to wrap a region of a screen in a card, panel-like box, or bordered container.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Card Skill

**A card represents one of several repeating objects of the same kind. It is not a general-purpose container.** Cards exist to separate peer objects from each other visually while keeping them legible as one group. If there is no plurality and no repetition, there is no card.

## Anatomy & Sub-components

This skill covers the following component specs defined in the UI Kit:

- `card`

---

## The five tests — all must pass

Before using a card, confirm all five:

1. **Plurality.** There is more than one instance on the screen. A single object is never a card.
2. **Finite and small.** The set is bounded and short. **High plurality is a table.**
3. **Repetition.** Every instance carries the same information types, in the same arrangement.
4. **A graphical element.** Each instance contains something visual — a chart, an image, a photograph. **A set of purely textual and numeric data is a table.**
5. **Segregation with unity.** The instances need to read as visually distinct objects while still reading as one group of the same kind of thing.

**If any test fails, do not use a card.** Depending on which one failed, use a table or use spacing.

**Test 4 has one exception, below. Tests 1, 2, 3, and 5 have none.**

---

## The aesthetic exception

**Occasionally a small, finite, repeating set simply looks better as cards, with no graphical element in it.** That is a legitimate reason, and it is the only aesthetic override in this skill.

It is narrow:

- **It waives test 4 only.** High plurality is still a table. A single object is still not a card. A form is still never a card.
- **It is occasional.** If most card sets in an application are riding on this exception, the exception has become the rule and the reasoning has gone wrong.
- **Say when you are using it.** State that it is an aesthetic call rather than presenting the card set as the default reading, so the choice stays visible and stays rare.

---

## Cards or a table?

| The set                                                           | Component                                                         |
| ----------------------------------------------------------------- | ----------------------------------------------------------------- |
| High plurality, unbounded, or growing over time                   | **Table** — no exception                                          |
| Purely data — text and numbers, no graphical element              | **Table**, unless the aesthetic exception is invoked deliberately |
| Small, finite, repeating, each instance carrying a chart or image | **Cards**                                                         |

**The graphical element is what normally earns the card.** A table row cannot hold a photograph or a chart legibly, and that is the reason a card set exists at all. Without one, a table usually shows the same information in less space and lets the reader compare values down a column — which is why the aesthetic exception is occasional rather than routine.

See [`recursica-skill-tables`](../../design-rules/recursica-skill-tables/SKILL.md) for the table rules.

---

## When to Use

- **A set of repeating objects of the same type**: several products, several records, several search results — each instance built from the same information types.
  - **Peer objects that must not blur together**: where the boundary between one object and the next is genuinely at risk of being misread, a card supplies it.
  - **Accessibility & Best Practices**: every card in a set carries the same fields in the same order, so the reader learns the shape once and applies it to all of them.

---

## Never put a form in a card

**A form, a form section, or any individual form control MUST NOT be placed inside a card. There is no exception.**

This follows from the rule above: a form is one object's properties, not a set of repeating peers, so the boundary has nothing to separate it from. Form layout is governed by [`recursica-skill-forms`](../../design-rules/recursica-skill-forms/SKILL.md), and the spacing it specifies is already built into the field components.

---

## When Not to Use

- **As a container.** This is the most common misuse. **Not every container needs to be visible.** Proper spacing and white space are sufficient to position and group information, and a drawn boundary that separates nothing from nothing is noise.
  - **Around a single object.** One object's properties are a detail view or a form, not a card.
  - **Around a section of a page.** A region with a heading and some content does not need a box; the heading and the space around it already group it.
  - **Around a chart or a table.** Wrapping one of these to "contain" it adds a border and a padding decision without adding meaning.
  - **For simple lists**: a homogeneous list of names or files is a list, and a card set makes it heavier for no gain.
  - **Highly detailed content**: if an object is too complex to summarize, it needs a dedicated page, not a taller card.
  - **Anti-patterns**: never nest cards within cards; never build a whole screen out of cards.

---

## Use spacing instead

When the tests fail and grouping is still needed, reach for these in order:

1. **White space.** Distance is the primary grouping mechanism. Related things sit closer together than unrelated things.
2. **Type hierarchy.** A heading establishes a group and its rank without drawing anything.
3. **Layout structure.** The design system's layouts, grids, and gutters position regions relative to each other.

---

## Best Practices

- Follow platform accessibility guidelines.
- Spacing, padding, corner radius, and elevation are owned by the component. Do not tune them.
- Every card in a set is the same shape; a set of cards with differing contents is a sign the objects are not really peers.

---

## House Design Rules

Grouping, containment, and composition are governed by the design-rules skills. Load them alongside this one:

- [`recursica-skill-system-conventions`](../../design-rules/recursica-skill-system-conventions/SKILL.md) — the general convention that a visible container must be earned.
- [`recursica-skill-dashboards`](../../design-rules/recursica-skill-dashboards/SKILL.md) — why a wall of equal-weight cards has no hierarchy, and what to build instead.
- [`recursica-skill-badges-chips`](../../design-rules/recursica-skill-badges-chips/SKILL.md) — badge and chip placement within a card.

---

## Referential Libraries & Documentation

- Carbon Design System: [Carbon Card Documentation](https://carbondesignsystem.com)
- Material UI: [MUI Card Documentation](https://mui.com)
