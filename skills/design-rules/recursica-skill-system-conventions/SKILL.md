---
name: recursica-skill-system-conventions
description: Conventions that recur across all the Recursica rules, for decisions no topic skill covers — one behavior per system, the unadvertised affordance, never one channel for meaning, fixing structure not symptoms, grouping with space not boxes, one control one outcome — plus the accessibility baseline every component follows. Load it with the owning skill, which always wins.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# System conventions

Six conventions come up again and again across the Recursica design rules. Each one was stated on its own, about a different surface (a region that holds content, such as a page, panel, or modal), in a different recording. That repetition is what makes them conventions rather than one-off rules.

**This skill is derived, not recorded.** Each convention below lists the rules it was drawn from, along with the skill that owns each one. Those original rules are the authority; this file describes the pattern they share.

**Two rules for using this skill:**

1. **A surface-specific rule always wins.** If the owning skill says something different about the surface being designed, follow the owning skill. This file does not replace or extend it.
2. **Its main job is new surfaces.** When a decision comes up that no topic skill covers, these conventions are the house position. Apply them, rather than inventing an answer or borrowing a convention from somewhere else.

## 1. One behavioral mode per system

**A behavioral mode is chosen once for the whole application, not screen by screen.** When a behavior could work in two reasonable ways, and the user cannot tell by looking which way is active, the system picks one way and uses it everywhere.

Examples:

| Behavior                 | The rule                                                | Owner                                |
| ------------------------ | ------------------------------------------------------- | ------------------------------------ |
| Saving                   | Field-level everywhere or batch everywhere, never mixed | `recursica-skill-forms`              |
| When a switch commits    | Immediately or on submit, but the same for every switch | `recursica-skill-selection-controls` |
| Inline editing in tables | Every table supports it, or none does                   | `recursica-skill-tables`             |

**Why it applies generally:** the user builds one mental model (what a person expects from the tools and work they already know) of the whole application, not a separate one for each view. Mixing modes does more than make the model a little less accurate on one screen. It takes away the user's ability to predict anything, because the model can no longer be trusted.

**Applying it to a new surface:** ask whether the behavior is visible on screen. If the user can see which mode they are in, letting it vary by screen might be acceptable. If they cannot — and save timing, edit-on-click, and commit-on-change are all invisible — the mode belongs to the whole system.

**When a requirement calls for a second mode**, that is a conflict to raise with the user, not a variation to build in without telling anyone. See `recursica-skill-design-router`.

## 2. The unadvertised affordance

An affordance is a visible cue that tells the user they can act on something. **A feature that few users need, and that the house has an opinion against, is present but not promoted.** It gets a real entry point — a settings control, a gear icon, a long-press — but no callout, tour, or banner teaching people about it.

Examples:

| Feature                                       | How it is offered                                                                     | Owner                        |
| --------------------------------------------- | ------------------------------------------------------------------------------------- | ---------------------------- |
| Dashboard configuration                       | A settings entry point that does not draw attention; the layout is kept across visits | `recursica-skill-dashboards` |
| Showing, hiding, and reordering table columns | A gear or settings icon on the table, which opens a configuration screen              | `recursica-skill-tables`     |
| Sorting by more than one column               | Long-press on a column header; a plain click still flips the direction                | `recursica-skill-tables`     |

**Why it applies generally:** users who need the feature will look for it, ask a colleague, or find it while exploring — and finding it themselves gives them a sense of ownership. Users who do not need it are not burdened with a control they will never use. See `recursica-skill-discoverability` for the research behind this, and its limits.

**Three conditions must all be true** before a feature is hidden this way:

1. **The house default is a deliberate choice.** The hidden control lets users opt out of a decision that was thought through. It is not a substitute for making the decision.
2. **Only a small minority of users truly need the feature.**
3. **No task requires it.** If a user cannot finish their work without finding the control, it must be visible.

**Unadvertised does not mean inaccessible.** The control MUST stay reachable by keyboard and by assistive technology. Where the interaction is a drag or a long-press, a second way to do it MUST exist — a requirement also stated for reordering columns.

## 3. Never carry meaning in a single channel

**Any meaning the user must receive is shown in at least two ways.** A channel is color, shape, position, or text, each a separate signal. If one channel fails — because of color vision, printing, a screen reader, or a small viewport — the meaning must not be lost with it.

Examples:

| Meaning                              | Required backup                                                                                                           | Owner                                |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| A field's error state                | A visual change **plus** a separate indicator: an icon, a flag, or a message                                              | `recursica-skill-forms`              |
| Which series is which in a chart     | A pattern as well as a color; the chart still works when printed in black and white                                       | `recursica-skill-data-visualization` |
| An empty value versus zero in a cell | An explicit "NA" — not an empty cell, and not a `0` that looks like a real value                                          | `recursica-skill-tables`             |
| An object's status                   | An icon as well as a color, and an accessible name (the name a screen reader reads out for a control) as well as the icon | `recursica-skill-icon-semantics`     |

**Why it applies generally:** these rules were written about unrelated surfaces, but they share one mechanism. Showing meaning through only one channel is a single point of failure for understanding. The color palette is the design system's business; which channels carry the meaning is the screen designer's decision.

**Applying it to a new surface:** name the channel the meaning currently depends on. Then ask what a user who cannot perceive that channel would see. If the answer is "nothing," add a second channel.

## 4. Fix the structure, do not engineer around the symptom

**When a design runs out of room or clarity, the structure is wrong. Change the structure instead of adding a workaround to cope with it.** This is the belief repeated most often across the family.

Examples:

| Symptom                                      | The house response                                                                             | Owner                                |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------ |
| Too many nav items for the space             | Change the design — switch to vertical, or shorten the labels. Never wrap, scroll, or overflow | `recursica-skill-navigation`         |
| A table too wide for the screen              | Fewer columns, drill-down, or stacked text in the cells. Horizontal scrolling is a defeat      | `recursica-skill-tables`             |
| A form spread across tabs                    | Use a stepper. Tabs holding forms is an invalid structure                                      | `recursica-skill-navigation`         |
| Needing select-all across twenty checkboxes  | Reconsider the control before adding the affordance                                            | `recursica-skill-selection-controls` |
| A chart with a large amount of missing data  | Do not visualize it                                                                            | `recursica-skill-data-visualization` |
| Nobody can say what matters on the dashboard | Do not build a dashboard                                                                       | `recursica-skill-dashboards`         |

**Why it applies generally:** a workaround keeps the broken structure and adds more to it. Overflow menus, scroll areas inside the page, and density toggles (switches for how tightly content is packed together) all look like solutions. Each one makes the underlying problem permanent.

**Applying it to a new surface:** before adding anything whose purpose is to make content fit, stop. Name what would have to change for the content to fit without it, and propose that change instead. If the limit comes from outside and cannot be moved — a client requirement, or an amount of data that cannot be reduced — say so plainly. Do not let the workaround pass as a design choice.

## 5. Group with space, not boxes

**By default, show grouping with space. A drawn boundary — a card, a box, a bordered region — is only for separating repeated peer objects from each other.** A peer is one of a set of repeating objects of the same kind, such as rows in a list. Not every container needs to be visible.

Examples:

| Situation                                                                                            | The house response                                                                                                                                                                | Owner                                            |
| ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| A region of a screen that needs to look like one unit                                                | White space and type hierarchy. No box                                                                                                                                            | `recursica-skill-card`                           |
| A small, finite set of repeating objects, each with a chart or an image                              | A card for each one — the one case where a boundary is justified                                                                                                                  | `recursica-skill-card`                           |
| High plurality (a large number of items of the same kind), or repeating objects that are purely data | A table, not cards. High plurality has no exception; sets that are purely data have an occasional, stated aesthetic one                                                           | `recursica-skill-tables`, `recursica-skill-card` |
| How a dashboard is laid out                                                                          | A fixed layout using type hierarchy and white space, with cards placed inside it. Never a screen made of cards                                                                    | `recursica-skill-dashboards`                     |
| Spacing between form fields and sections                                                             | Already built into the components. Do not add wrappers or spacer elements                                                                                                         | `recursica-skill-forms`                          |
| A form, a form section, or a single form control                                                     | **Never inside a card**, with no exception. Group with headings and the components' own spacing                                                                                   | `recursica-skill-forms`, `recursica-skill-card`  |
| A region that needs a surface but has no peers                                                       | A layer (a numbered background level, 0 to 3, that sets the colors of the components on that level), at the shallowest level that works. Never a card, and never hand-written CSS | `recursica-skill-layers`                         |

**Why it applies generally:** a border tells the user that its contents belong together _and are separate from similar items beside them._ With no similar items beside it, the border tells them nothing. It is decoration, and it costs padding, width and hierarchy. A generated screen made of boxes inside boxes is the most common sign of this problem.

**Applying it to a new surface:** before drawing a container, name the peer it separates its contents from. If there is no peer, remove the container and use spacing instead.

## 6. One control, one outcome

**A single interaction does one thing.** When one control both navigates _and_ does something else — opens a surface, applies a filter, changes a mode, switches a tab — the interaction is hyperloaded (doing more than one thing at once), and it must be split.

Examples:

| The control                                        | What it must not also do                                                                 | Owner                                                            |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| A row's detail action                              | Change the tab or route as well as opening the detail. Open it where the user already is | `recursica-skill-buttons-links`, `recursica-skill-panels-modals` |
| A figure or summary that points to a filtered list | Navigate and apply a filter in one click. Pick one                                       | `recursica-skill-navigation`, `recursica-skill-filters`          |
| A button that opens a modal                        | Navigate. The button opens the modal; it does not also move the user                     | `recursica-skill-buttons-links`                                  |

**Why it applies generally:** there are three separate costs, and they add up. The user cannot predict what the control will do, because its label can only honestly describe one of the two things. They cannot undo it, because going back reverses one effect and leaves the other in place. And they cannot describe what happened to a colleague — which is what makes an application feel impossible to learn, not merely awkward.

**Applying it to a new surface:** list every change of state that one use of the control causes — the route, an opened surface, a filter, a selection, a mode, the scroll position. If there is more than one, the control is hyperloaded. Either split it into two controls, or make the second effect something the user clearly asked for, rather than something bundled in.

**What this does not forbid.** A single action with necessary side effects is still one outcome. Submitting a form saves it and closes it. Deleting a row removes it and shows an undo. The test is whether the second effect is _part of_ what the user asked for, or a separate effect added to it.

## Accessibility baseline for every component

**These apply to every component, and no component skill repeats them.** They are not a seventh convention. They are the accessibility rules the component skills each used to state for themselves — the focus ring was in 34 of 39 — gathered here once, so they cannot drift apart. A component skill's own accessibility section adds what is specific to that component, and where it says something more specific, it wins.

- **Never hide the focus ring**. Keep it on whatever has focus, and keep it looking different from the hover style, from the caret alone, and from any selected, checked, active, or on state. Focus and selection are different facts, and a user must be able to tell them apart at a glance.
- **Nothing the user needs appears only on hover** — not a control, an action, a label, a value, or a count. A keyboard user and a touch user never hover.
- **The tab order follows the visual order.**
- **A form control's help, error, and rule text passes through the component** — for a group, through the group — never as a separate element placed beside it. Only the component can connect that text to the control, and text that is not connected is invisible to someone who tabs straight into the field.
- **The required state is set in code**, not shown by an asterisk alone. The asterisk is a visual convention, not an accessible way of saying "required".
- **Never move focus for the user**, except where a component skill says when to — opening a modal, for example.
- **An icon that is a control has an accessible name; a decorative icon is silent.** Each component skill says which of its icons are which.
- **No meaning rests on color alone.** See convention 3.

## When a seventh convention seems to be emerging

**Do not add one.** If a pattern seems to repeat across surfaces but is not listed here, say so, and let a person decide whether it is a convention. On a later read, a convention invented by an agent cannot be told apart from a recorded one — which is exactly what this file exists to prevent.

## Out of scope

- **Any decision an owning topic skill covers.** Load that skill; it wins.
- **The research behind these conventions.** `recursica-skill-discoverability` and `recursica-skill-working-memory` carry the citations.
- **The order of decisions, and which rule wins in a conflict.** Owned by `recursica-skill-design-router`.

## Pre-flight checklist

- [ ] Each behavior works one way across the whole application. A requirement for a second way went to the user and was not built.
- [ ] Settings that few users need have a real entry point that is not promoted, and all three conditions for hiding them hold: the house default is a deliberate choice, only a minority of users need the setting, and no task requires it.
- [ ] Every hidden control can be reached by keyboard and by assistive technology. Where the gesture is a drag or a long-press, there is a second way to do it that is not a drag.
- [ ] No meaning relies on one channel alone. Each meaning has a second channel.
- [ ] Every component meets the accessibility baseline: the focus ring is never hidden and looks different from hover and from any selected state, nothing the user needs appears only on hover, and the tab order follows the visual order.
- [ ] A form control's help, error, and rule text passes through the component, and the required state is set in code, not by an asterisk alone.
- [ ] Focus is never moved for the user except where a component skill says when. Icons that are controls have an accessible name, and decorative icons are silent.
- [ ] No workaround, such as an overflow menu or an inner scroll area, hides a broken structure. Where a limit can't be changed, a reason is provided.
- [ ] Every visible container separates its contents from a peer. Regions with no peer are grouped with space.
- [ ] Repeating objects are a table, unless the set is small, finite and each item has a graphic, or the aesthetic exception is used and a reason is provided.
- [ ] No form, form section, or form control sits inside a card.
- [ ] Where a topic skill covers the decision, its rule is followed, not the general version here.
- [ ] No control both navigates and does something else. Each control causes one change of state when used.
- [ ] No new cross-surface convention was added without a person deciding it.
