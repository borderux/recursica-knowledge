---
name: recursica-skill-system-conventions
description: Cross-surface house conventions that recur throughout the Recursica design rules, generalized so they can be applied where no surface-specific rule exists yet — one behavioral mode per system, the unadvertised affordance for rarely-needed configuration, never carrying meaning in a single channel, fixing the structure instead of engineering around a symptom, and earning a visible container before drawing one. Use when no owning topic skill covers a decision, when a requirement would introduce a second mode of an existing behavior, when deciding whether to hide a configuration entry point, when a design is about to gain a mechanism to cope with a structural problem, or when a region is about to be wrapped in a card or box. Trigger on "is there a convention for", "should this be configurable", "consistent across the app", "no rule covers this", or "wrap this in a card". Load alongside the owning topic skill, never instead of it — a surface-specific rule always wins.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# System conventions

Five conventions appear repeatedly across the Recursica design rules. Each was stated independently, on a different surface, in a different recording — which is what makes them conventions rather than one-off rules.

**This skill is derived, not recorded.** Every convention below lists the instances it generalizes from, with their owning skill. Those instances are authoritative; this file states the pattern they share.

**Two rules about using it:**

1. **A surface-specific rule always wins.** If the owning skill says something different for the surface you are on, follow the owning skill. This file is not a superset.
2. **Its real job is novel surfaces.** When a decision arrives that no topic skill covers, these conventions are the house's position — apply them rather than inventing an answer or importing an outside convention.

## 1. One behavioral mode per system

**A behavioral mode is chosen once for the application, not per screen.** Where a behavior has two plausible modes and the user cannot tell by looking which one is active, the system picks one and holds it everywhere.

Instances:

| Behavior                 | The rule                                                | Owner                                |
| ------------------------ | ------------------------------------------------------- | ------------------------------------ |
| Saving                   | Field-level everywhere or batch everywhere, never mixed | `recursica-skill-forms`              |
| Switch commit timing     | Immediate or on-submit, but the same for every switch   | `recursica-skill-selection-controls` |
| Inline editing in tables | Every table supports it or none does                    | `recursica-skill-tables`             |

**Why it generalizes:** the user builds one predictive model of the application, not one per view. Mixing modes does not cost them a little accuracy on one screen — it removes their ability to predict anything, because they can no longer trust the model they have.

**Applying it to a new surface:** ask whether the behavior is visible in the interface. If a user can see which mode they are in, per-screen variation may be survivable. If they cannot — and save timing, edit-on-click, and commit-on-change are all invisible — the mode belongs to the system.

**When a requirement demands a second mode**, that is a conflict to raise, not a variation to absorb. See `recursica-skill-design-router`.

## 2. The unadvertised affordance

**Functionality that few users need, and that the house has an opinion against, is present but not promoted.** It gets a real entry point — a settings control, a gear icon, a long-press — and no callout, tour, or banner teaching it.

Instances:

| Function                               | How it is exposed                                                                     | Owner                        |
| -------------------------------------- | ------------------------------------------------------------------------------------- | ---------------------------- |
| Dashboard configuration                | A settings entry point, not called attention to; arrangement persists across sessions | `recursica-skill-dashboards` |
| Table column visibility and reordering | A gear or settings icon on the table, opening a configuration UI                      | `recursica-skill-tables`     |
| Multi-sort                             | Long-press on a column header; plain click still just flips direction                 | `recursica-skill-tables`     |

**Why it generalizes:** users who genuinely need the function will look for it, ask a colleague, or find it while exploring — and that discovery produces ownership. Users who do not need it are not taxed with an affordance they will never use. See `recursica-skill-discoverability` for the research basis and its limits.

**Three conditions must all hold** before hiding something this way:

1. **The house default is deliberately opinionated.** The hidden control is an escape hatch from a considered decision, not a substitute for making one.
2. **The function is genuinely a minority need.**
3. **No task requires it.** If a user cannot complete their work without finding the control, it must be visible.

**Unadvertised is not inaccessible.** The control MUST remain reachable by keyboard and assistive technology, and where the interaction is a drag or a long-press, **a second mechanism MUST exist** — that requirement is already explicit for column reordering.

## 3. Never carry meaning in a single channel

**Any meaning the user must receive is encoded at least twice.** One channel failing — color vision, print, a screen reader, a small viewport — must not take the meaning with it.

Instances:

| Meaning                    | Required redundancy                                                                | Owner                                |
| -------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------ |
| Field error state          | A visual state change **plus** a discrete indicator: icon, flag, or message        | `recursica-skill-forms`              |
| Chart series identity      | Pattern in addition to color; the chart survives being rendered in black and white | `recursica-skill-data-visualization` |
| Null versus zero in a cell | An explicit "NA", not an empty cell or a `0` that reads as a real value            | `recursica-skill-tables`             |

**Why it generalizes:** these three were stated about unrelated surfaces and share one mechanism — a single-channel encoding is a single point of failure for comprehension. The palette is the design system's business; **which channels carry the meaning is yours.**

**Applying it to a new surface:** name the channel the meaning currently rides on, then ask what a user who cannot perceive that channel sees. If the answer is "nothing," add a second channel.

## 4. Fix the structure, do not engineer around the symptom

**When a design runs out of room or clarity, the structure is wrong. Change the structure rather than adding a mechanism to cope with it.** This is the most frequently repeated conviction in the family.

Instances:

| Symptom                                      | The house response                                                                  | Owner                                |
| -------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------ |
| Too many nav items for the space             | Change the design — go vertical, or shorten labels. Never wrap, scroll, or overflow | `recursica-skill-navigation`         |
| A table too wide for the screen              | Fewer columns, drill-down, or stacked cell text. Horizontal scrolling is a defeat   | `recursica-skill-tables`             |
| A form spread across tabs                    | Use a stepper. Tabs holding forms is an invalid structure                           | `recursica-skill-navigation`         |
| Needing select-all across twenty checkboxes  | Reconsider the control before adding the affordance                                 | `recursica-skill-selection-controls` |
| Substantially missing data in a chart        | Do not visualize it                                                                 | `recursica-skill-data-visualization` |
| Nobody can say what matters on the dashboard | Do not build a dashboard                                                            | `recursica-skill-dashboards`         |

**Why it generalizes:** a coping mechanism preserves the broken structure and adds surface area to it. Overflow menus, inner scroll regions, and density toggles all read as solutions while making the underlying problem permanent.

**Applying it to a new surface:** when reaching for a mechanism whose purpose is to make something fit, stop and name what would have to change for it to fit without the mechanism. Propose that instead. If the constraint is external and immovable — a client requirement, a data volume that cannot be reduced — say so explicitly rather than letting the mechanism stand in as a design choice.

## 5. A visible container must be earned

**Grouping is expressed with space by default. A drawn boundary — a card, a box, a bordered region — is only for separating repeated peer objects from each other.** Not every container needs to be visible.

Instances:

| Situation                                                                | The house response                                                                                            | Owner                                            |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| A region of a screen that needs to read as a unit                        | White space and type hierarchy. No box                                                                        | `recursica-skill-card`                           |
| A small, finite set of repeating objects, each carrying a chart or image | A card each — the one case a boundary is earned                                                               | `recursica-skill-card`                           |
| High plurality, or repeating objects that are purely data                | A table, not cards. High plurality has no exception; purely-data sets have an occasional stated aesthetic one | `recursica-skill-tables`, `recursica-skill-card` |
| A dashboard's composition                                                | A static layout with type hierarchy and whitespace, cards placed inside it. Never a screen made of cards      | `recursica-skill-dashboards`                     |
| Spacing between form fields and sections                                 | Built into the components. Do not add wrappers or spacer elements                                             | `recursica-skill-forms`                          |
| A form, form section, or single form control                             | **Never inside a card**, with no exception. Group with headings and component spacing                         | `recursica-skill-forms`, `recursica-skill-card`  |

**Why it generalizes:** a boundary is a claim that the things inside it belong together _and are separable from a peer beside them._ With no peer, the claim is empty and the border is decoration that costs padding, width, and hierarchy. A generated screen made of nested boxes is the most common symptom.

**Applying it to a new surface:** before drawing a container, name the peer it is being distinguished from. If there is no peer, remove the container and set the spacing instead.

## When a sixth convention seems to be emerging

**Do not add one.** If a pattern appears to recur across surfaces but is not listed here, say so and let the human decide whether it is a convention. A convention invented by an agent is indistinguishable from a recorded one on a later read, which is exactly what this file exists to prevent.

## Out of scope

- **Any decision an owning topic skill covers.** Load that skill; it wins.
- **The research behind these conventions.** `recursica-skill-discoverability` and `recursica-skill-working-memory` carry the citations.
- **Decision order and conflict precedence.** Owned by `recursica-skill-design-router`.

## Pre-flight checklist

- [ ] No behavior appears in two modes across the application; any requirement for a second mode was raised, not absorbed.
- [ ] Rarely-needed configuration has a real entry point that is not promoted, and all three hiding conditions hold.
- [ ] Every hidden affordance is keyboard and assistive-technology reachable, with a non-drag alternative where the gesture is a drag or long-press.
- [ ] No meaning depends on a single channel; each has a stated second channel.
- [ ] No mechanism was added to make a broken structure fit; where a constraint was immovable, that was stated explicitly.
- [ ] Every visible container has a named peer it separates from; regions without peers are grouped with space instead.
- [ ] Repeating objects are a table unless the set is small, finite, and each instance carries a graphical element — or the aesthetic exception was invoked and stated.
- [ ] No form, form section, or form control sits inside a card.
- [ ] Where a topic skill covered the decision, its rule was followed over the general form here.
- [ ] No new cross-surface convention was added without the human deciding it is one.
