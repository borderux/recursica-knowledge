---
name: recursica-skill-tree
description: How to use the Recursica tree correctly — when data is a genuine hierarchy that needs a tree rather than a table, an accordion, or navigation, what the component provides (indent, node button, selection states), collapsed-by-default and depth discipline, why indentation alone cannot carry the hierarchy, and the screen-reader and keyboard requirements for a tree including level announcement, expand and collapse keys, and single-tab-stop navigation. Use whenever adding, reviewing, or refactoring a hierarchical list — a folder structure, a category taxonomy, an org chart as a list, or nested nodes the user expands. Trigger on "tree", "tree view", "hierarchy", "nested list", "folder structure", "parent and child nodes", "expand", "collapse", "indent", "screen reader", "arrow keys", or a request to show nested data. Do NOT use for flat repeating records — that is recursica-skill-table. Do NOT use for stacked disclosure sections — that is recursica-skill-accordion.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Tree

A tree shows data arranged as parents and children, and lets the user open only the parts they need.

## Use it when

- **The data really is a hierarchy.** What a node (one item in the tree) means depends on its parent — a folder inside a folder, a category inside a category.
- **The depth varies**, and the user needs to see where a thing sits, not just that it exists.
- **The user is exploring, not comparing.** A tree is for finding one thing; a table is for comparing many.
- **Nested disclosure cannot be avoided.** Disclosure is showing and hiding content on demand. `recursica-skill-navigation` states that an accordion is never nested, so when the structure has real depth, this is the component.

## Do not use it when

| Instead of a tree                             | Use                                                              |
| --------------------------------------------- | ---------------------------------------------------------------- |
| The records are flat peers                    | `recursica-skill-table`                                          |
| Stacked sections of content at one level      | `recursica-skill-accordion` — single-level disclosure is its job |
| Moving between areas of the application       | Navigation — see `recursica-skill-navigation`                    |
| Choosing one value from a hierarchy in a form | A dropdown or autocomplete, unless the hierarchy is the point    |
| The hierarchy is only two levels deep         | A grouped list, or navigation with sub-items                     |
| Moving items between two sets                 | `recursica-skill-transfer-list`                                  |

"Flat peers" are objects of the same kind, such as rows in a list, with no parents or children.

**A tree used for flat data is a list with wasted indentation.** If nothing has children, it is not a tree.

## What exists

Taken from `recursica_ui-kit.json` → `ui-kit.components.tree`.

| Axis               | Options                  |
| ------------------ | ------------------------ |
| `selection-states` | `unselected`, `selected` |

**`indent` is a token** (a named design value, such as a color or a size, set by the design system). The component fixes how far each level is indented — do not work out your own indentation.

**`button-node-gap` tells you the expand control is separate from the node itself.** The control that opens and closes the node and the node's label are two things. That matters for both selection and keyboard behavior: selecting a node and expanding it are different actions.

**There is no expanded or collapsed state in the kit** — only selection. So how an open node looks different from a closed one is not settled here. See the uncovered list, and do not invent a rotation or a second icon token.

**There is no disabled state, no hover state, and no size axis.**

**There are no checkboxes in the kit's tree.** A tree with checkboxes for choosing several items is not a setup this component provides.

## Rules for using it

**Collapsed is the default.** Open only what the user's situation calls for — the same rule the accordion follows, for the same reason. Owned by `recursica-skill-navigation`.

**Keep the number of visible items at each level within 7 ± 2.** Depth is what a tree is for, but width still costs working memory (how much a person can hold in mind at once). See `recursica-skill-working-memory`.

**Label a node with what it is**, not where it sits. No "Level 2", and no numbering that the structure already shows.

**A node label must be clear enough to choose from while its children are hidden.** If the user must expand it to find out what is inside, the label has failed.

**The line between a tree and an accordion is settled, and it is this: real hierarchy is a tree, and disclosure at one level is an accordion.** `recursica-skill-navigation` states that accordions are never nested, which is what sends structures with several levels here. So **never nest an accordion to fake a tree**, and never nest a tree inside an accordion panel. If the sections turn out to be peers at one level, the component is `recursica-skill-accordion` instead. There is no third case, and nothing to decide here.

**Do not put a form, a table, or a card inside a tree node.** A node is a label, not a container.

**Never rely on indentation alone to show depth.** It is a single visual channel (a way of carrying meaning, such as color, shape, position, or text) — `recursica-skill-system-conventions` requires a second one, which here means the level must be set in the code.

**If the tree is navigation, its nodes are links** with real routes, and it follows `recursica-skill-navigation` — including opening sub-levels on click, never on hover.

## Accessibility

The accessibility baseline in `recursica-skill-system-conventions` applies here too — the focus ring (the outline that shows which element has keyboard focus), hover, tab order, disabled reasons, form text, and icons. This section adds only what is specific to this component.

A tree is the component where the keyboard rules are the most specific, and the most often ignored. Built as nested `div`s with click handlers, it cannot be used: there is no level, no expand state, and no way in.

### Screen readers

- **It must be announced as a tree, and each node as a tree item.** Nesting must be real structure in the code, not just a visual offset.
- **Each node must report its level, and its position among the nodes at the same level** — "level 3, 2 of 7". Without this, the user has no idea where they are, because to them indentation does not exist.
- **A node with children must report whether it is expanded or collapsed**, and a node with no children must not claim it can expand.
- **The selected state must be set in code**, never shown only by the fill or color of the selected node.
- **The expand control needs its own accessible name** (the name a screen reader reads out for a control) if it is separate from the node — and that name must include the node: "Expand Marketing", not "Expand".
- **Announce what changed when a node expands.** Say how many children appeared, or at least that the node is now expanded.
- **A node's icon is decorative and must be silent.** A folder icon does not tell a screen reader user that the node has children; the expand state does.
- **The tree needs an accessible name** — which hierarchy this is.

### Keyboard and non-mouse navigation

- **The tree is a single tab stop** (a place the Tab key lands). Tab moves into it, and then out of it. Do not make every node a tab stop, and do not add tabindex to nodes.
- **The up and down arrows move between the nodes that are showing**, across levels, following what is open right now.
- **The right arrow expands a collapsed node, then moves into it. The left arrow collapses an expanded node, then moves to its parent.** This is the pattern users already know; do not change it.
- **Home and End jump to the first and last nodes that are showing.**
- **Enter activates the node** — selects it, or follows it if the node is a link. Expanding and activating must be distinguishable, because `button-node-gap` means they are separate controls.
- **Focus must never be moved for the user** when a node expands. Focus stays on the node they acted on.
- **Never require hover to show a node's actions or its expand control.**

## Not your decision

Do not implement, override, or tune any of these — the component owns them:

- `indent` — the depth offset for every level.
- `item-gap`, `button-node-gap`.
- `vertical-padding`, `horizontal-padding`.
- `border-size`, `border-radius`, `max-width`.
- Selected and unselected styling, including hover and focus.

## Load these too

- `recursica-skill-navigation` — collapsed by default, click not hover for sub-levels, the accordion-never-nested rule that sends you here, routing if the tree is navigation, and permissions.
- `recursica-skill-working-memory` — the basis for the breadth ceiling.
- `recursica-skill-system-conventions` — never carry meaning in a single channel.

### Only if the screen also uses it

- `recursica-skill-accordion` — the single-level alternative, and the boundary between them.
- `recursica-skill-table` — the alternative when the data turns out to be flat.

## Uncovered — ask, do not invent

- **How an expanded node looks different from a collapsed one.** The kit defines no state for it, and no icon token for showing it. This is the biggest gap in the component.
- **Whether a tree lets the user choose several items**, with or without checkboxes. Neither exists in the kit, and the design rules do not cover choosing several items in a hierarchy.
- **A maximum depth.** No rule states one, and depth with no limit is a real usability problem.
- **Whether a parent node can be selected**, or only a node with no children.
- **Loading children only when the node is opened**, and what the node shows while they load. No loading state exists.
- **Dragging to reorder or move a node to a new parent**, which would require a way to do it without dragging, under `recursica-skill-system-conventions`.
- **The empty state**, and what a node with no children shows once expanded.
- **Nothing about this component is documented outside the token inventory.** Unlike most component skills, the token inventory is its only source, so treat every gap above as truly unanswered, not just unrecorded.

## Pre-flight checklist

- [ ] The data really is a hierarchy. Nothing flat was given indentation.
- [ ] Nodes are collapsed by default, with only what the user's situation calls for opened.
- [ ] The number of visible items at each level is within 7 ± 2.
- [ ] Node labels name the thing, and are clear enough to choose from while collapsed.
- [ ] The accordion line was applied: real hierarchy here, disclosure at one level in `recursica-skill-accordion`. No accordion was nested to fake a tree, and no form, table, or card is inside a node.
- [ ] The tree is announced as a tree, with a name. Each node reports its level, position, and expanded state.
- [ ] Nodes with no children do not claim they can expand.
- [ ] The selected state is set in code, not shown only by color. The expand control's name includes its node.
- [ ] The tree is a single tab stop. Up and down move, right expands, left collapses, Home and End jump, and Enter activates.
- [ ] Focus is not moved when a node expands. The focus ring is not hidden, and looks different from the selected state.
- [ ] Nothing appears only on hover. Sub-levels open on click.
- [ ] No indentation was worked out by hand, and no expanded state or icon was invented.
- [ ] You invented nothing from the uncovered list.
