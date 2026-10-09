---
name: recursica-skill-accordion
description: Rules for the Recursica accordion — when collapsing content is justified, collapsed by default, nested only with a project option, what each part does, and expand and collapse accessibility. Use for accordions, expandable sections, and FAQ lists. Not for multi-level hierarchy — see recursica-skill-tree; not for switching views — see recursica-skill-tabs.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Accordion

An accordion collapses sections of content that are at the same level and of the same kind. The persona opens only the section the persona needs.

## When to use an accordion

- **The page has more sections than the persona needs at once.** The persona also reads the sections one at a time.
- **The sections are of the same kind and sit at one level, with no nesting.**
- **A navigation group with no landing page must show the group's sub-items in place.** `recursica-skill-navigation` specifies the accordion behavior for the navigation group.
- **A table row has extra detail.** `recursica-skill-tables` requires a single level of expand and collapse on that table row.

## When not to use an accordion

| Situation                                                                                                                           | Use instead                                                                                                                  |
| ----------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| The content has more than one level of nesting                                                                                      | A tree. See `recursica-skill-tree`.                                                                                          |
| The persona needs the content often                                                                                                 | The content shown on the page. Content in a collapsed section takes an extra click every time the persona needs the content. |
| The page has little content even with every section open                                                                            | No collapsing. Collapsing a short page only makes the page feel empty.                                                       |
| The sections are parts of one whole that the persona switches between                                                               | Tabs. See `recursica-skill-tabs`.                                                                                            |
| The content is a form, or fields from one form                                                                                      | A page, or a stepper for a form with several parts. See `recursica-skill-forms`.                                             |
| The content is on the critical path (the steps the persona must take to finish the task). The persona must read the content to act. | The page, with the content not collapsed.                                                                                    |
| The content is a short text label for an icon-only control                                                                          | A tooltip. See `recursica-skill-tooltip`.                                                                                    |
| The content is too complex or too deep for the available space                                                                      | A page or a panel. An accordion's content panel is narrow and shallow.                                                       |
| The page has more sections than the page has room for                                                                               | Fewer sections, not smaller sections. See `recursica-skill-system-conventions`.                                              |

**Progressive disclosure is for rarely needed content, never for content the persona would want to reach.** Progressive disclosure means showing rarely needed content only when the persona asks for the content. `recursica-skill-discoverability` sets the limit on progressive disclosure. A crowded screen never justifies progressive disclosure. Putting required information inside an accordion misuses progressive disclosure.

## Variants

**Use only the accordion variants and options that the Recursica MCP server lists for the project.** A designer can add variants and options in Theme Forge, so each project can differ. Get the list with the server's `recursica_get_component_doc` tool, and use the names the code uses. Never invent a variant or an option.

The rules below describe each part and option by role, such as "the open look". The names in the standard UI kit (the unchanged UI kit in the official Recursica release) are examples only.

- **An accordion has four parts:** the outer container, the items, the headers and the content panels. In the standard UI kit, the four parts are `accordion`, `accordion-item`, `accordion-header` and `accordion-content`.
- **The outer container** is the accordion itself, a list of items.
- **An item** is one section that opens and closes. Each item has one header and one content panel.
- **A header** is the clickable bar at the top of an item. The header shows the open or closed look, a leading icon, a trailing icon, and the title text.
- **A content panel** is the area below the header. Clicking the header shows or hides the content panel.
- **A header has an open look and a closed look.** The standard UI kit calls the variant `appearance`, with the options `open` and `closed`.

## Rules

**Start every item closed when the page loads.** The only exception is the navigation group that holds the persona's current page, in a navigation accordion. `recursica-skill-navigation` sets the collapsed-by-default rule.

**Never nest an accordion inside an accordion unless the project has a nesting option.** `recursica-skill-navigation` sets the rule against nesting. Without a nesting option, an accordion has one level only.

**Use a tree for a real hierarchy, and an accordion for sections at a single level.** The choice between a tree and an accordion is settled. Use a tree when an item's meaning depends on the item's parent, or when the number of levels varies. See `recursica-skill-tree`. Never use an accordion for a real hierarchy. Never nest accordions to show a hierarchy. Both rules hold even when the project has a nesting option. Use an accordion when the sections are of the same kind and at one level. A tree would indent sections that have no parent.

**Header labels must be specific enough that the persona can choose a section while every section is closed.** If the persona has to open a section to learn what the section holds, the label is wrong. Rewrite the label instead of opening the section by default.

**Never split a form across accordion items.** Data entry is not content divided into sections. For the same reason, never split a form across tabs. Use a stepper for a form with several parts. See `recursica-skill-forms`.

**Never close an item automatically after the persona opens the item.** Do not close the item when the persona scrolls, saves or opens a second item. The one exception is an explicit team decision that only one item opens at a time. A single-open option in the project counts as that decision. Closing an item the persona is reading loses the persona's place on the page. If focus was inside the item's content panel, focus is lost too.

**Nothing on the critical path goes inside a content panel.** Never collapse content the persona must read to move forward.

**Do not wrap a content panel's content in a card, and do not wrap the accordion in a card.** The accordion item shows where the item's content starts and ends. See `recursica-skill-card`.

**Keep the list of headers easy to scan.** Above about nine headers, the persona can no longer take in the list at a glance. `recursica-skill-working-memory` explains what the limit of about nine means and does not mean.

**Use the chevron in each accordion header.** A chevron is the small arrow in each header that turns when the item opens or closes. Do not add any other open-or-closed indicator. The chevron must not be the only sign that an item is open or closed.

## Accessibility

The rules below add to the accessibility baseline in `recursica-skill-system-conventions`, including the focus ring, which every Recursica component follows.

The app that uses the accordion does two jobs:

- Make each header a real button.
- Hide a closed item's content from the keyboard and from screen readers.

The accordion shows the header and the chevron. Apps get the two jobs wrong more often than any other accordion rule.

### Screen readers

- **The header must be a real button**, never a `div`, a `span`, or a bare heading with a click handler. Only a real button is announced as a button and responds to Enter and Space automatically. Any other element needs custom code to be announced as a button and to respond to Enter and Space.
- **Each header must announce whether the header's item is expanded or collapsed.** The announcement must change the moment the item opens or closes. A header that always announces "collapsed" is worse than a header that announces nothing.
- **Each header must be connected in code to the header's content panel.** A persona who hears "expanded" can then get to the open content panel.
- **Never show the open or closed state with the chevron alone.** A rotating chevron is a single visual channel (color, shape, position or text, each a separate signal). `recursica-skill-system-conventions` forbids a single channel for any meaning the persona must receive.
- **The header's accessible name (the name a screen reader reads out for a control) is the section title.** The section title must make sense without the other headers. A screen reader announces the accessible name with no neighboring headers for context.
- **If the header sits inside a heading, wrap the button in the heading**, not the other way around. A button wrapped around a heading loses the heading level. The heading then disappears from a screen reader's list of headings.
- **Content inside a closed item must be unreachable, not only invisible.** Zero height, zero opacity, or moving the content off the screen leaves the text in the accessibility tree (the version of the page that assistive technology reads). A persona using a screen reader then reads a section that a sighted persona cannot see. Remove a closed item's content from the accessibility tree.
- **A leading or trailing icon that shows information needs an accessible name.** A decorative icon must be silent. A screen reader must not announce a decorative icon as an unlabeled graphic.

### Keyboard and non-mouse navigation

- **Enter and Space both open and close an item.** Do not intercept, remap, or block either key.
- **Each header is a separate tab stop** (a place the Tab key lands). The accordion is not one tab stop shared by all the headers. Every header must be reachable with Tab.
- **The tab order runs from a header to that header's content when the item is open, then the next header.** Do not put all the headers first and all the content panels after the headers in the page's code. The tab order must match the visual order.
- **A closed item's content is completely out of the tab order.** The rule matches the screen reader rule that a closed item's content must be unreachable. Tabbing into invisible content is the most common accordion failure.
- **Do not move focus when an item opens or closes.** Keep focus on the header the persona activated. Do not move focus into the content panel.
- **Never close an item whose content has focus.** If a single-open accordion closes an item the persona is working in, focus is lost. The persona using a keyboard then starts again from the top of the page.
- **Never open an item on hover.** No content the persona needs inside a content panel may appear only on hover.

## Styling set by tokens

**Never set or override the accordion's styling.** The theme sets every visual property of the accordion, such as size, spacing, borders, colors and animation. Do not add extra containers or spacers to change the accordion's look, including the chevron and the chevron's turn. If the design needs a look the theme does not give, report the missing look as a design-system gap. See `recursica-skill-design-router`.

## Related skills

- `recursica-skill-navigation` — five navigation topics:
  - the rule against nesting
  - items collapsed by default
  - sub-navigation that opens on click rather than hover
  - permissions
  - why a top-level item with no children stays a link
- `recursica-skill-discoverability` — progressive disclosure, and the three cases where hiding content is not safe.
- `recursica-skill-working-memory` — 7 ± 2 as the most items a persona can scan at a glance, and what the 7 ± 2 limit does not claim.
- `recursica-skill-system-conventions` — two conventions:
  - never show a meaning in a single channel
  - fix the structure instead of collapsing content to work around the structure

### Only if used on the same screen

- `recursica-skill-tree` — the component for a real hierarchy, and for any content that is not one level of same-kind sections.
- `recursica-skill-tabs` — parts of one whole, and why no form is split across sections.

## Open questions

- **Whether opening one item closes the other items.** No rule states the behavior. If the project has a single-open or multi-open option, use that option. Otherwise, confirm with the user.
- **Whether the divider between items can be hidden.** Only the design-system website mentions hiding the divider. The website says the divider "can be hidden if accordion is the last child in a list or accordion group". If the project has an option to hide the divider, use the option. Otherwise, do not hide the divider without confirming with the user.
- **How to show an item the persona cannot open right now.** `recursica-skill-navigation` says to disable an item the persona can unlock. If the project has a disabled look for the header, use the disabled look. Otherwise, confirm with the user.
- **Animation for opening and closing an item.** No duration or easing is defined.
- **Whether an item can be linked to directly**, so that a shared URL opens a specific item.
- **Whether an accordion may sit inside a table row**, given the single-level expand and collapse that `recursica-skill-tables` asks for.

## Pre-flight checklist

- [ ] Collapsing the content is justified. The persona does not need the content often, and the page is not sparse.
- [ ] The accordion is one level deep unless the project has a nesting option, and every real hierarchy uses `recursica-skill-tree` instead.
- [ ] No form, and no part of one form, is split across accordion items.
- [ ] Nothing on the critical path is inside a content panel. No content the persona needs exists only inside a content panel.
- [ ] Every item loads collapsed, except the group that holds the current page in a navigation accordion.
- [ ] Each header label is specific enough to choose a section while every section is closed.
- [ ] No item the persona opened closes automatically, and no item whose content has focus is ever closed.
- [ ] The list of headers is easy to scan, and no card wraps the accordion or the accordion's content.
- [ ] Every header is a real button and announces whether the item is expanded or collapsed. Every header is connected to the header's content panel.
- [ ] The open or closed state is shown by more than the chevron. Every icon that shows information has an accessible name, and every decorative icon is silent.
- [ ] Enter and Space both open and close an item, and each header is a tab stop.
- [ ] The tab order runs from a header, to the open item's content, to the next header. The tab order matches the visual order.
- [ ] A closed item's content is removed from the accessibility tree and the tab order, not only hidden.
- [ ] Focus never moves when an item opens or closes, nothing opens on hover, and the focus ring is intact.
- [ ] Every variant, size, and state is one the Recursica MCP server lists for the project. No header has an invented disabled look.
- [ ] No styling is set or overridden on the accordion. No container or spacer is added to change the accordion's look.
- [ ] Open questions were asked about, not decided: whether opening one item closes the other items, whether the divider can be hidden, an item the persona cannot open, animation for opening and closing an item, linking directly to an item, and an accordion inside a table row.
