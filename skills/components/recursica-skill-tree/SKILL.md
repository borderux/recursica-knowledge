---
name: recursica-skill-tree
description: Rules for the Recursica tree — when data is a real hierarchy, collapsed by default, depth limits, why indentation alone is not enough, and tree keyboard and screen-reader behavior. Use for folder structures, category trees, and nested lists. Not for flat records — see recursica-skill-table; not for single-level sections — see recursica-skill-accordion.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Tree

A tree shows data arranged as parents and children, and lets the user open only the parts they need.

## When to use a tree

- **The data is a true hierarchy.** What a node (one item in the tree) means depends on its parent — a folder inside a folder, a category inside a category.
- **The depth varies**, and the user needs to see where an item sits in the hierarchy, not only that it exists.
- **The user is exploring, not comparing.** A tree is for finding one thing; a table is for comparing many.
- **Nested disclosure cannot be avoided.** Disclosure is showing and hiding content on demand. `recursica-skill-navigation` states that an accordion is never nested. When the structure has real depth, use a tree.

## When not to use a tree

| Instead of a tree                             | Use                                                              |
| --------------------------------------------- | ---------------------------------------------------------------- |
| The records are flat peers                    | `recursica-skill-table`                                          |
| Stacked sections of content at one level      | `recursica-skill-accordion` — single-level disclosure is its job |
| Moving between areas of the application       | Navigation — see `recursica-skill-navigation`                    |
| Choosing one value from a hierarchy in a form | A dropdown or autocomplete, unless the hierarchy is the point    |
| The hierarchy is only two levels deep         | A grouped list, or navigation with sub-items                     |
| Moving items between two sets                 | `recursica-skill-transfer-list`                                  |

"Flat peers" are objects of the same kind, such as rows in a list, with no parents or children.

**A tree used for flat data is a list with wasted indentation.** If no item has children, the data is not a tree.

## Variants

Taken from the UI kit (the token file, `recursica_ui-kit.json`, that says which variants and states each component has) → `ui-kit.components.tree`.

| Variants           | Options                  |
| ------------------ | ------------------------ |
| `selection-states` | `unselected`, `selected` |

**`indent` is a token** (a named design value, such as a color or a size, set by the design system). The component sets how far each level is indented. Do not calculate indentation by hand.

**`button-node-gap` shows that the expand control is separate from the node.** The control that opens and closes the node and the node's label are two separate elements. Selecting a node and expanding it are therefore different actions, both with a mouse and with the keyboard.

**The UI kit has no expanded or collapsed state, only selection.** It does not define how an open node looks different from a closed one. That difference is among the open questions. Do not invent a rotation or a second icon token for it.

**There is no disabled state, no hover state, and no size variant.**

**There are no checkboxes in the UI kit's tree.** This component does not provide a tree with checkboxes for choosing several items.

## Rules

**Collapsed is the default.** Open only the nodes the user needs for the current task. The accordion follows the same rule, for the same reason. `recursica-skill-navigation` owns this rule.

**Keep the number of visible items at each level within 7 ± 2.** A tree is built for depth, but every item showing at one level adds to the load on working memory (how much a person can hold in mind at once). See `recursica-skill-working-memory`.

**Label a node with what it is**, not where it sits. Do not label a node "Level 2", and do not add numbers that repeat what the nesting shows.

**A node label must be clear enough to choose from while its children are hidden.** If the user has to expand a node to find out what is inside, rewrite the label.

**Use a tree for real hierarchy and an accordion for disclosure at one level.** `recursica-skill-navigation` states that accordions are never nested. Structures with several levels therefore use a tree. Never nest an accordion to imitate a tree, and never nest a tree inside an accordion panel. If the sections are peers at one level, use `recursica-skill-accordion` instead. This boundary is settled, and there is no third case.

**Do not put a form, a table, or a card inside a tree node.** A node is a label, not a container.

**Never rely on indentation alone to show depth.** Indentation is a single visual channel (color, shape, position or text, each a separate signal). `recursica-skill-system-conventions` requires a second one. For a tree, the second channel is the level, set in the code.

**If the tree is navigation, its nodes are links** with real routes, and it follows `recursica-skill-navigation` — including opening sub-levels on click, never on hover.

## Accessibility

This component also follows the accessibility baseline in `recursica-skill-system-conventions`, including the focus ring. Only the rules specific to this component are listed here.

A tree has the most specific keyboard rules of any component, and they are the ones most often ignored. A tree built as nested `div`s with click handlers cannot be used with a keyboard or a screen reader. It has no level, no expand state, and no way to reach it with the keyboard.

### Screen readers

- **It must be announced as a tree, and each node as a tree item.** Nesting must be real structure in the code, not only a visual offset.
- **Each node must report its level, and its position among the nodes at the same level** — "level 3, 2 of 7". A screen reader user cannot see indentation. Without the level and position, they cannot tell where they are in the tree.
- **A node with children must report whether it is expanded or collapsed**, and a node with no children must not claim it can expand.
- **The selected state must be set in code**, never shown only by the fill or color of the selected node.
- **The expand control needs its own accessible name** (the name a screen reader reads out for a control) if it is separate from the node. That name must include the node's label: "Expand Marketing", not "Expand".
- **Announce what changed when a node expands.** Say how many children appeared, or at least that the node is now expanded.
- **A node's icon is decorative and must be hidden from screen readers.** The expand state tells a screen reader user that a node has children. A folder icon does not.
- **The tree needs an accessible name** that says which hierarchy it shows.

### Keyboard and non-mouse navigation

- **The tree is a single tab stop** (a place the Tab key lands). Tab moves into it, and then out of it. Do not make every node a tab stop, and do not add tabindex to nodes.
- **The up and down arrows move between the nodes that are showing**, across levels, following whichever nodes are open at the moment.
- **The right arrow expands a collapsed node, then moves into it. The left arrow collapses an expanded node, then moves to its parent.** Users expect this pattern from trees in other tools. Do not change it.
- **Home and End jump to the first and last nodes that are showing.**
- **Enter activates the node** — selects it, or follows it if the node is a link. Expanding and activating must be distinguishable, because `button-node-gap` makes them separate controls.
- **Never move focus automatically** when a node expands. Focus stays on the node the user acted on.
- **Never require hover to show a node's actions or its expand control.**

## Styling set by tokens

Do not set or override any of these. The component sets them:

- `indent` — the depth offset for every level.
- `item-gap`, `button-node-gap`.
- `vertical-padding`, `horizontal-padding`.
- `border-size`, `border-radius`, `max-width`.
- Selected and unselected styling, including hover and focus.

## Related skills

- `recursica-skill-navigation` — collapsed by default, click not hover for sub-levels, the accordion-never-nested rule that sends structures with several levels to a tree, routing if the tree is navigation, and permissions.
- `recursica-skill-working-memory` — the basis for the breadth ceiling.
- `recursica-skill-system-conventions` — never carry meaning in a single channel.

### Only if used on the same screen

- `recursica-skill-accordion` — the single-level alternative, and the boundary between them.
- `recursica-skill-table` — the alternative when the data turns out to be flat.

## Open questions

- **The look of an expanded node compared with a collapsed one.** The UI kit defines no state for it, and no icon token for showing it. This is the biggest gap in the component.
- **Choosing several items in a tree**, with or without checkboxes. Neither exists in the UI kit, and the design rules do not cover choosing several items in a hierarchy.
- **A maximum depth.** No rule states one, and depth with no limit is a real usability problem.
- **Selecting a parent node.** No rule says whether a parent node can be selected, or only a node with no children.
- **Loading children only when a node opens**, and what the node shows while they load. The UI kit has no loading state.
- **Dragging to reorder nodes or move a node to a new parent.** Under `recursica-skill-system-conventions`, dragging would also require a way to reorder and move nodes without dragging.
- **The empty state of the tree**, and what a node with no children shows once expanded.
- **Nothing about this component is shown only on the design-system website.** Unlike most component skills, this one has the UI kit as its only source. Treat every gap above as unanswered, not as unrecorded.

## Pre-flight checklist

- [ ] The data is a true hierarchy. No flat list is shown indented as a tree.
- [ ] Nodes are collapsed by default, and only the nodes the user needs for the current task are open.
- [ ] The number of visible items at each level is within 7 ± 2.
- [ ] Node labels name what each node is, and are clear enough to choose from while collapsed.
- [ ] Real hierarchy uses a tree, and disclosure at one level uses `recursica-skill-accordion`. No accordion is nested to imitate a tree, and no form, table, or card is inside a node.
- [ ] The tree is announced as a tree, with a name. Each node reports its level, position, and expanded state.
- [ ] Nodes with no children do not claim they can expand.
- [ ] The selected state is set in code, not shown only by color. The expand control's name includes its node.
- [ ] The tree is a single tab stop. Up and down move, right expands, left collapses, Home and End jump, and Enter activates.
- [ ] Focus stays on the node when it expands. The focus ring is visible, and looks different from the selected state.
- [ ] Nothing appears only on hover. Sub-levels open on click.
- [ ] Indentation comes from the `indent` token, and no expanded state or icon was invented.
- [ ] Open questions were asked about, not decided: the look of an expanded node, choosing several items, a maximum depth, selecting a parent node, loading children when a node opens, dragging to reorder or move a node, and the empty state.
