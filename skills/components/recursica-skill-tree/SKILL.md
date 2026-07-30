---
name: recursica-skill-tree
description: How to use the Recursica tree correctly — when data is a genuine hierarchy that needs a tree rather than a table, an accordion, or navigation, what the component provides (indent, node button, selection states), collapsed-by-default and depth discipline, why indentation alone cannot carry the hierarchy, and the screen-reader and keyboard requirements for a tree including level announcement, expand and collapse keys, and single-tab-stop navigation. Use whenever adding, reviewing, or refactoring a hierarchical list — a folder structure, a category taxonomy, an org chart as a list, or nested nodes the user expands. Trigger on "tree", "tree view", "hierarchy", "nested list", "folder structure", "parent and child nodes", "expand", "collapse", "indent", "screen reader", "arrow keys", or a request to show nested data. Do NOT use for flat repeating records — that is recursica-skill-table. Do NOT use for stacked disclosure sections — that is recursica-skill-accordion.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Tree

A tree shows data whose structure is parent-and-child, and lets the user open only the parts they need.

## Use it when

- **The data is genuinely hierarchical.** A node's meaning depends on its parent — a folder inside a folder, a category inside a category.
- **The depth varies** and the user needs to see where a thing sits, not just that it exists.
- **The user explores rather than compares.** A tree is for finding one thing; a table is for comparing many.
- **Nested disclosure is unavoidable.** `recursica-skill-navigation` states that an accordion is never nested, so when the structure has real depth this is the component.

## Do not use it when

| Instead of a tree                             | Use                                                              |
| --------------------------------------------- | ---------------------------------------------------------------- |
| The records are flat peers                    | `recursica-skill-table`                                          |
| Stacked sections of content at one level      | `recursica-skill-accordion` — single-level disclosure is its job |
| Moving between areas of the application       | Navigation — see `recursica-skill-navigation`                    |
| Choosing one value from a hierarchy in a form | A dropdown or autocomplete, unless the hierarchy is the point    |
| The hierarchy is only two levels deep         | A grouped list, or navigation with sub-items                     |
| Moving items between two sets                 | `recursica-skill-transfer-list`                                  |

**A tree used for flat data is a list with wasted indentation.** If nothing has children, it is not a tree.

## What exists

Taken from `recursica_ui-kit.json` → `ui-kit.components.tree`.

| Axis               | Options                  |
| ------------------ | ------------------------ |
| `selection-states` | `unselected`, `selected` |

**`indent` is a token.** The depth offset is fixed by the component — do not compute your own indentation.

**`button-node-gap` tells you the expand control is separate from the node itself.** The disclosure control and the node label are two things, which matters for both selection and keyboard behavior: selecting a node and expanding it are different acts.

**There is no expanded or collapsed state in the kit** — only selection. How open differs from closed is therefore not settled here; see the uncovered list, and do not invent a rotation or a second icon token.

**There is no disabled state, no hover state, and no size axis.**

**There are no checkboxes in the kit's tree.** A tree with multi-select checkboxes is not a configuration this component provides.

## Rules for using it

**Collapsed is the default.** Open only what the user's context requires — the same rule the accordion follows, and for the same reason. Owned by `recursica-skill-navigation`.

**Keep the visible breadth within 7 ± 2 per level.** Depth is what a tree is for; breadth still costs working memory. See `recursica-skill-working-memory`.

**Label a node with the thing it is**, not its position. No "Level 2", no numbering that the structure already conveys.

**A node label must be specific enough to choose from while its children are hidden.** If the user must expand to find out what is inside, the label has failed.

**The boundary with the accordion is settled, and it is this: real hierarchy is a tree, single-level disclosure is an accordion.** `recursica-skill-navigation` states that accordions are never nested, which is what sends multi-level structures here. So **never nest an accordion to fake a tree**, and never nest a tree inside an accordion panel. If the sections turn out to be peers at one level, the component is `recursica-skill-accordion` instead. There is no third case and nothing to decide here.

**Do not put a form, a table, or a card inside a tree node.** A node is a label, not a container.

**Never rely on indentation alone to convey depth.** It is a single visual channel — `recursica-skill-system-conventions` requires a second one, which here means the level must be exposed programmatically.

**If the tree is navigation, its nodes are links** with real routes, and it follows `recursica-skill-navigation` — including opening sub-levels on click, never on hover.

## Accessibility

A tree is the component where keyboard convention is most specific and most often ignored. Built as nested `div`s with click handlers, it is unusable: no level, no expand state, no way in.

### Screen readers

- **It must be announced as a tree, and each node as a tree item.** Nesting must be real structure, not visual offset.
- **Each node must expose its level, and its position among its siblings** — "level 3, 2 of 7". Without this the user has no idea where they are, because indentation does not exist to them.
- **A node with children must expose whether it is expanded or collapsed**, and a node with no children must not claim to be expandable.
- **Selection must be programmatic**, never carried by the fill or the color of the selected node.
- **The expand control needs its own accessible name** if it is a separate control from the node — and that name must include the node, "Expand Marketing", not "Expand".
- **Announce what changed when a node expands.** How many children appeared, or at minimum that the node is now expanded.
- **A node's icon is decorative and must be silent.** A folder icon does not tell a screen reader user it has children; the expand state does.
- **The tree needs an accessible name** — what hierarchy this is.

### Keyboard and non-mouse navigation

- **The tree is a single tab stop.** Tab moves into it and then out of it. Do not make every node a tab stop, and do not add tabindex to nodes.
- **Up and down arrows move between visible nodes**, across levels, following what is currently expanded.
- **Right arrow expands a collapsed node, then moves into it. Left arrow collapses an expanded node, then moves to its parent.** This is the convention users have; do not remap it.
- **Home and End jump to the first and last visible node.**
- **Enter activates the node** — selects it, or follows it if the node is a link. Expanding and activating must be distinguishable, since `button-node-gap` means they are separate controls.
- **Focus must never be moved for the user** when a node expands; focus stays on the node they acted on.
- **Never require hover to reveal a node's actions or its expand control.**
- **Never suppress the focus ring**, and keep it distinguishable from the selected state — a node can be focused without being selected.

## Not your decision

Do not implement, override, or tune any of these — the component owns them:

- `indent` — the depth offset for every level.
- `item-gap`, `button-node-gap`.
- `vertical-padding`, `horizontal-padding`.
- `border-size`, `border-radius`, `max-width`.
- Selected and unselected styling, including hover and focus.

## Load these too

- [`recursica-skill-navigation`](../../design-rules/recursica-skill-navigation/SKILL.md) — collapsed by default, click not hover for sub-levels, the accordion-never-nested rule that sends you here, routing if the tree is navigation, and permissions.
- [`recursica-skill-accordion`](../recursica-skill-accordion/SKILL.md) — the single-level alternative, and the boundary between them.
- [`recursica-skill-table`](../recursica-skill-table/SKILL.md) — the alternative when the data turns out to be flat.
- [`recursica-skill-working-memory`](../../psychology/recursica-skill-working-memory/SKILL.md) — the basis for the breadth ceiling.
- [`recursica-skill-system-conventions`](../../design-rules/recursica-skill-system-conventions/SKILL.md) — never carry meaning in a single channel.

## Uncovered — ask, do not invent

- **How expanded differs from collapsed.** The kit defines no state and no disclosure icon token for it. This is the largest gap in the component.
- **Whether a tree supports multi-select**, with or without checkboxes. Neither exists in the kit, and the design rules do not cover a hierarchical multi-select.
- **A maximum depth.** No rule states one, and unbounded depth is a real usability problem.
- **Whether a parent node is selectable**, or only a leaf.
- **Loading children on demand**, and what the node shows while they load. No loading state exists.
- **Drag to reorder or reparent**, which would require a non-drag alternative under `recursica-skill-system-conventions`.
- **The empty state**, and what a node with no children shows once expanded.
- **Nothing about this component is documented outside the token inventory.** Unlike most component skills, the token inventory is its only source, so treat every gap above as genuinely unanswered rather than merely unrecorded.

## Pre-flight checklist

- [ ] The data is genuinely hierarchical; nothing flat was given indentation.
- [ ] Collapsed by default, with only the user's context opened.
- [ ] Visible breadth per level is within 7 ± 2.
- [ ] Node labels name the thing and are specific enough to choose from while collapsed.
- [ ] The accordion boundary was applied: real hierarchy here, single-level disclosure in `recursica-skill-accordion`. No accordion nested to fake a tree, and no form, table, or card inside a node.
- [ ] The tree is announced as a tree, with a name; each node exposes its level, position, and expanded state.
- [ ] Nodes with no children do not claim to be expandable.
- [ ] Selection is programmatic, not carried by color; the expand control's name includes its node.
- [ ] The tree is a single tab stop; up and down move, right expands, left collapses, Home and End jump, Enter activates.
- [ ] Focus is not moved on expand; the focus ring is intact and distinct from the selected state.
- [ ] Nothing is revealed on hover; sub-levels open on click.
- [ ] No indentation was computed by hand; no expanded state or icon was invented.
- [ ] Nothing in the uncovered list was invented.
