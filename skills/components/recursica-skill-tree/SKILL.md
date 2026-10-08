---
name: recursica-skill-tree
description: Rules for the Recursica tree — when data is a real hierarchy, collapsed by default, depth limits, why indentation alone is not enough, and tree keyboard and screen-reader behavior. Use for folder structures, category trees, and nested lists. Not for flat records — see recursica-skill-table; not for single-level sections — see recursica-skill-accordion.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Tree

A tree shows data as parent items and child items. The persona opens a parent item to see the parent item's children, and opens only the parent items the persona needs.

## When to use a tree

- **The data is a true hierarchy.** The meaning of a node (one item in the tree) depends on the node's parent, such as a folder inside a folder or a category inside a category.
- **The depth of the hierarchy varies**, and the persona needs to see where an item sits in the hierarchy, not only that the item exists.
- **The persona is exploring, not comparing.** A tree helps the persona find one item. A table helps the persona compare many items.
- **Content must show and hide at more than one level.** `recursica-skill-navigation` states that an accordion has one level unless the project has a nesting option. When the content has several levels, use a tree.

## When not to use a tree

| Situation                                                                                                         | Use instead                                                                                                                                                    |
| ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The records are peers (objects of the same kind, such as rows in a list), with no parent records or child records | A table. See `recursica-skill-table`.                                                                                                                          |
| Sections of content are stacked at one level                                                                      | An accordion. An accordion shows and hides sections at one level. See `recursica-skill-accordion`.                                                             |
| The persona moves between areas of the application                                                                | Navigation. See `recursica-skill-navigation`.                                                                                                                  |
| The persona chooses one value from a hierarchy in a form                                                          | A dropdown or an autocomplete, unless the hierarchy itself is the point of the choice. Confirm with the user whether the hierarchy is the point of the choice. |
| The hierarchy is only two levels deep                                                                             | A grouped list, or navigation with sub-items.                                                                                                                  |
| The persona moves items between two sets                                                                          | A transfer list. See `recursica-skill-transfer-list`.                                                                                                          |

**Flat data in a tree is a list with indentation that means nothing.** When no item has children, the data is not a tree.

## Variants

**Use only the tree variants and options that the Recursica MCP server lists for the project.** A designer can add variants and options in Theme Forge, so each project can differ. Get the list with the server's `recursica_get_component_doc` tool, and use the names the code uses. Never invent a variant or an option.

The rules below describe each variant and option by role, such as "the selected option". The names in the standard UI kit (the unchanged UI kit in the official Recursica release) are examples only.

- **A node is selected or not selected.** In the standard UI kit, the variant is `selection-states`, with the options `unselected` and `selected`.
- **A node's expand control is separate from the node's label.** The expand control opens and closes the node. Because the expand control is separate, selecting a node and expanding a node are different actions, with a mouse and with the keyboard.
- **If the project has an expanded state or a collapsed state, use the project's state.** Otherwise, do not invent a rotation or a second icon token (a named design value, such as a color or a size, set by the design system) to show an open node. See "Open questions".

## Rules

**Show every node collapsed by default.** Open only the nodes the persona needs for the current task. `recursica-skill-navigation` sets this rule for trees and accordions. Opening every node adds no value, because the parent node labels then have no reason to exist.

**Keep the number of visible nodes at each level within 7 ± 2.** A tree is built for many levels. But every visible node at one level adds to the load on working memory (how much a person can hold in mind at once). See `recursica-skill-working-memory`.

**Label a node with what the node is, not where the node sits.** Do not label a node "Level 2". Do not add numbers that repeat the node's place in the nesting.

**A node label must be clear enough to choose the node while the node's children are hidden.** If the persona has to expand a node to learn what the node holds, rewrite the label.

**Use a tree for a real hierarchy, and an accordion for showing and hiding sections at one level.** `recursica-skill-navigation` states that an accordion has one level unless the project has a nesting option, and that content with several levels uses a tree. Never nest an accordion to look like a tree, and never put a tree inside an accordion panel. If the sections are peers at one level, use an accordion. See `recursica-skill-accordion`. The choice between a tree and an accordion is settled, and every case is one or the other.

**Do not put a form, a table, or a card inside a tree node.** A node is a label, not a container.

**Do not calculate indentation by hand.** The theme sets how far each level of the tree is indented.

**Never show depth with indentation alone.** Indentation is one visual channel (color, shape, position or text, each a separate signal). `recursica-skill-system-conventions` requires a second channel. In a tree, the second channel is each node's level, set in the code.

**In a tree used for navigation, every node is a link with a real URL.** The tree follows `recursica-skill-navigation`, including the rule that a sub-level opens on click, never on hover.

## Accessibility

The rules below add to the accessibility baseline in `recursica-skill-system-conventions`, including the focus ring, which every Recursica component follows.

A tree has the most specific keyboard rules of any component. The tree's keyboard rules are also the keyboard rules most often ignored. A persona using a keyboard or a screen reader cannot use a tree built from nested `div` elements that respond to clicks. A tree built that way has no level, no expand state, and no keyboard access.

### Screen readers

- **A screen reader must announce the tree as a tree, and each node as a tree item.** The nesting must be real structure in the code, not only indentation on screen.
- **Each node must report the node's level, and the node's position among the nodes at the same level**, as in "level 3, 2 of 7". A persona using a screen reader cannot see indentation. Without the level and the position, a persona using a screen reader cannot tell where the current node sits in the tree.
- **A node with children must report whether the node is expanded or collapsed.** A node with no children must not report that the node can expand.
- **The selected state must be set in code**, never shown only by the fill or the color of the selected node.
- **An expand control that is separate from the node needs a separate accessible name** (the name a screen reader reads out for a control). The expand control's accessible name must include the node's label, as in "Expand Marketing", not "Expand".
- **Announce the change when a node expands.** Announce how many child nodes appeared, or at least announce that the node is expanded.
- **A node's icon is decorative and must be hidden from screen readers.** The expand state tells a persona using a screen reader that a node has children. A folder icon does not tell a persona using a screen reader that a node has children.
- **The tree needs an accessible name** that says which hierarchy the tree shows.

### Keyboard and non-mouse navigation

- **The tree is a single tab stop** (a place the Tab key lands). Tab moves focus into the tree, and then out of the tree. Do not make every node a tab stop, and do not add tabindex to nodes.
- **The Up Arrow and Down Arrow keys move focus between the visible nodes, across levels.** Which nodes are visible depends on which nodes are expanded.
- **The Right Arrow key expands a collapsed node, then moves focus into the node. The Left Arrow key collapses an expanded node, then moves focus to the node's parent.** Personas expect the Right Arrow and Left Arrow keys to work this way, from trees in other tools. Do not change what the arrow keys do.
- **Home moves focus to the first visible node, and End moves focus to the last visible node.**
- **Enter activates the focused node.** Enter selects the node, or opens the link when the node is a link. The persona must be able to tell expanding a node apart from activating a node, because the expand control and the node are separate controls.
- **Never move focus automatically** when a node expands. Focus stays on the node the persona acted on.
- **Never show a node's actions or the node's expand control only on hover.**

## Styling set by tokens

**Never set or override the tree's styling.** The theme sets every visual property of the tree, such as size, spacing, borders, colors and animation. Do not add extra containers or spacers to change the tree's look. If the design needs a look the theme does not give, report the missing look as a gap in the design system. See `recursica-skill-design-router`.

## Related skills

- `recursica-skill-navigation` — nodes collapsed by default, sub-levels that open on click and not on hover, the rule that an accordion has one level unless the project has a nesting option and that content with several levels uses a tree, routing when the tree is navigation, and permissions.
- `recursica-skill-working-memory` — the reason for the limit on visible nodes at each level.
- `recursica-skill-system-conventions` — never show meaning in only one channel.

### Only if used on the same screen

- `recursica-skill-accordion` — the alternative for sections at one level, and when to use an accordion instead of a tree.
- `recursica-skill-table` — the alternative when the data turns out to be flat.

## Open questions

- **The look of an expanded node compared with a collapsed node.** The look of an expanded node is the biggest open question about the tree. Ask only when the project has no expanded state.
- **Choosing several items in a tree**, with or without checkboxes. The design rules do not cover choosing several items in a hierarchy. Ask only when the project has no option for choosing several items.
- **A maximum depth.** No rule sets a maximum number of levels. A tree with no limit on levels is a real usability problem.
- **Selecting a parent node.** No rule says whether a parent node can be selected, or only a node with no children.
- **Loading children only when a node opens**, and what the node shows while the children load. When the project has a loading state, ask only about loading children when a node opens.
- **Dragging to reorder nodes or move a node to a new parent.** If dragging is allowed, `recursica-skill-system-conventions` also requires a way to reorder and move nodes without dragging.
- **The empty state of the tree**, and what an expanded node with no children shows.
- **Treat every open question above as a question nobody has answered.** Never treat an open question as a decision that someone forgot to write down. The design-system website adds nothing about the tree. Unlike most component skills, the tree skill has the UI kit (the token file, `recursica_ui-kit.json`, that says which variants and states each component has) as the only source.

## Pre-flight checklist

- [ ] The data is a true hierarchy. No flat list is shown indented as a tree.
- [ ] Nodes are collapsed by default, and only the nodes the persona needs for the current task are open.
- [ ] The number of visible nodes at each level is within 7 ± 2.
- [ ] Each node label names what the node is, and is clear enough to choose the node while the node is collapsed.
- [ ] A real hierarchy uses a tree, and sections at one level use an accordion, as in `recursica-skill-accordion`. No accordion is nested to look like a tree, and no form, table, or card is inside a node.
- [ ] A screen reader announces the tree as a tree, with an accessible name. Each node reports the node's level, position, and expanded state.
- [ ] A node with no children does not report that the node can expand.
- [ ] The selected state is set in code, not shown only by color. The expand control's accessible name includes the node's label.
- [ ] The tree is a single tab stop. Up Arrow and Down Arrow move focus, Right Arrow expands, Left Arrow collapses, Home and End move to the first and last visible nodes, and Enter activates the node.
- [ ] Focus stays on a node when the node expands. The focus ring is visible, and looks different from the selected state.
- [ ] No part of the tree appears only on hover. Sub-levels open on click.
- [ ] No styling is set or overridden on the tree, and no container or spacer is added to change the tree's look.
- [ ] Indentation comes from the theme, and no expanded state or icon was invented.
- [ ] Every variant, option, and state is one the Recursica MCP server lists for the project, and no variant or option is invented.
- [ ] Open questions were asked about, not decided: the look of an expanded node, choosing several items, a maximum depth, selecting a parent node, loading children when a node opens, dragging to reorder or move a node, and the empty state.
