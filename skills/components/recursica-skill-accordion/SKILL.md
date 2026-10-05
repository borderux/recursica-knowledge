---
name: recursica-skill-accordion
description: Rules for the Recursica accordion — when collapsing content is justified, collapsed by default, never nested, what each part owns, and expand and collapse accessibility. Use for accordions, expandable sections, and FAQ lists. Not for multi-level hierarchy — see recursica-skill-tree; not for switching views — see recursica-skill-tabs.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Accordion

An accordion collapses sections of content that are at the same level and of the same kind. The user opens only the section the user needs.

## When to use an accordion

- **The page has more sections than the user needs at once**, and the user reads the sections one at a time.
- **The sections are of the same kind and sit at one level.** The sections have one level, with no nesting.
- **A navigation group with no landing page must show the group's sub-items in place.** `recursica-skill-navigation` specifies the accordion behavior for the navigation group.
- **A table row has extra detail.** `recursica-skill-tables` requires a single level of expand and collapse on that table row.

## When not to use an accordion

| Situation                                                                                                                        | Use instead                                                                                                            |
| -------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| The content has more than one level of nesting                                                                                   | A tree. See `recursica-skill-tree`. **Never nest an accordion inside an accordion.** See `recursica-skill-navigation`. |
| The user needs the content often                                                                                                 | The content shown on the page. Content behind a header takes an extra click every time the user needs the content.     |
| The page has little content before any collapsing                                                                                | No collapsing. Collapsing a short page only makes the page feel empty.                                                 |
| The sections are parts of one whole that the user switches between                                                               | Tabs. See `recursica-skill-tabs`.                                                                                      |
| The content is a form, or fields from one form                                                                                   | A page, or a stepper for a form with several parts. See `recursica-skill-forms`.                                       |
| The content is on the critical path (the steps the user must take to finish the task), and the user must read the content to act | The page, with the content not collapsed.                                                                              |
| The content is a short text label for an icon-only control                                                                       | A tooltip. See `recursica-skill-tooltip`.                                                                              |
| The content is too complex or too deep for the available space                                                                   | A page or a panel. An accordion panel is narrow and shallow.                                                           |
| The page has more sections than the page has room for                                                                            | Fewer sections, not smaller sections. See `recursica-skill-system-conventions`.                                        |

**Progressive disclosure has a limit, stated in `recursica-skill-discoverability`.** `recursica-skill-discoverability` justifies hiding rarely needed content until the user asks for the content. The same skill states that progressive disclosure does not justify hiding content the user would want to reach. Progressive disclosure also does not justify hiding content because the screen is crowded. Putting required information inside an accordion is a misuse of progressive disclosure.

## Variants

**Use only the accordion variants and options that the Recursica MCP server lists for the project.** A designer can add variants and options in Theme Forge, so each project can differ. Get the list with the server's `recursica_get_component_doc` tool, and use the names the code uses. Never invent a variant or an option.

The rules below describe each part and option by role, such as "the open look". The names in the standard UI kit (the unchanged UI kit in the official Recursica release) are examples only.

- **An accordion has four parts:** the accordion, the items, the headers and the content panels. In the standard UI kit, the four parts are `accordion`, `accordion-item`, `accordion-header` and `accordion-content`.
- **The accordion** is the outer container, a list of items. The accordion sets the gap between the items, the minimum and maximum width, and the dividers.
- **An item** is one section that opens and closes. Each item has one header and one content panel.
- **A header** is the clickable bar at the top of an item. The header shows the open or closed look, a leading icon, a trailing icon, and the title text.
- **A content panel** is the area below the header. Clicking the header shows or hides the content panel.
- **One variant, on the header only.** In the standard UI kit, only the header has a variant. The header variant has exactly two options, an open look and a closed look. The standard UI kit calls the variant `appearance`, with the options `open` and `closed`. The standard UI kit has no variant on the accordion, the item or the content panel. If the project adds a variant to one of those parts in Theme Forge, use the project's variant.
- **No disabled header.** The standard UI kit has no disabled option for the header. If the project adds a disabled option in Theme Forge, use the project's disabled option.
- **No nesting option.** The standard UI kit has no option that puts one accordion inside another accordion. Never nest an accordion, even when the project adds a nesting option. An accordion has one level only, and a real hierarchy belongs in a tree.
- **No single-open or multi-open option.** In the standard UI kit, opening one item never closes another item. If the project adds a single-open or multi-open option in Theme Forge, use the project's option. See the open questions.
- **No size, density or emphasis variant.** The standard UI kit has no size, density or emphasis variant on any of the four parts, and no state variant for hover, focus or error. If the project adds one of these variants in Theme Forge, use the project's variant.

## Rules

**Every item loads collapsed.** The only exception is the group that holds the user's current page, in a navigation accordion. `recursica-skill-navigation` sets the collapsed-by-default rule.

**Never nest an accordion inside an accordion.** `recursica-skill-navigation` states the rule directly: an accordion has one level only. The ban on nesting is a hard ban, not a preference.

**Use a tree for a real hierarchy, and an accordion for sections at a single level.** The choice between a tree and an accordion is settled. Use a tree when an item's meaning depends on the item's parent, or when the depth varies. See `recursica-skill-tree`. Do not use an accordion for a real hierarchy, and never nest accordions inside accordions to show a hierarchy. Use an accordion when the sections are of the same kind and at one level. A tree would indent sections that have no parent. No third case exists, and no choice is left to make.

**Header labels must be specific enough that the user can choose a section while every section is closed.** If the user has to open a section to learn what the section holds, the label is wrong. Rewrite the label instead of opening the section by default.

**Never split a form across accordion panels.** Data entry is not content divided into sections. For the same reason, a form is never split across tabs. A form with several parts uses a stepper. See `recursica-skill-forms`.

**Never collapse a panel automatically after the user opens the panel.** Do not collapse the panel when the user scrolls, when the user saves, or when the user opens a second panel, unless one-panel-at-a-time behavior was an explicit decision. A single-open option the project adds in Theme Forge counts as that decision. Closing a panel the user is reading loses the user's place on the page. If focus was inside the panel, focus is lost too.

**Nothing on the critical path goes inside a panel.** Never collapse content the user must read to move forward.

**Do not wrap a panel's content in a card, and do not wrap the accordion in a card.** The accordion item marks the edge of the item's content. See `recursica-skill-card`.

**Keep the list of headers easy to scan.** Above about nine headers, the user can no longer take in the list at a glance. `recursica-skill-working-memory` explains what the limit of about nine means and does not mean.

**The component draws the chevron.** Do not add a custom indicator. Do not let the chevron alone show whether an item is open or closed.

## Accessibility

This component also follows the accessibility baseline in `recursica-skill-system-conventions`, including the focus ring. Only the rules specific to this component are listed here.

The accordion component draws the header and the chevron. The app, not the component, makes the header a real button and makes a collapsed panel's content unreachable. Apps get the real button and the unreachable content wrong more often than any other accordion rule.

### Screen readers

- **The header must be a real button**, never a `div`, a `span`, or a bare heading with a click handler. Only a real button is announced as a button and responds to Enter and Space without extra work.
- **The header must announce whether the header is expanded or collapsed.** The announcement must change the moment the header toggles. A header that always announces "collapsed" is worse than a header that announces nothing.
- **The header must be connected in code to the panel the header controls.** A user who hears "expanded" can then get to the expanded panel.
- **Never show the open or closed state with the chevron alone.** A rotating chevron is a single visual channel (color, shape, position or text, each a separate signal). `recursica-skill-system-conventions` forbids a single channel for any meaning the user must receive.
- **The header's accessible name (the name a screen reader reads out for a control) is the section title.** The section title must make sense without the other headers. A screen reader announces the accessible name with no neighboring headers for context.
- **When the header sits inside a heading, the heading wraps the button**, not the other way around. A button wrapped around a heading loses the heading level, and the heading disappears from a screen reader's list of headings.
- **Content inside a collapsed panel must be unreachable, not only invisible.** Zero height, zero opacity, or moving the content off the screen leaves the text in the accessibility tree (the version of the page that assistive technology reads). A screen reader user then reads a section that a sighted user cannot see. Remove the collapsed panel's content from the accessibility tree.
- **A leading or trailing icon that shows information needs an accessible name.** A decorative icon must be silent. A screen reader must not announce a decorative icon as an unlabeled graphic.

### Keyboard and non-mouse navigation

- **Enter and Space both toggle the header.** Do not intercept, remap, or block either key.
- **Each header is a separate tab stop** (a place the Tab key lands). The accordion is not one tab stop shared by all the headers. Every header must be reachable with Tab.
- **The tab order runs from a header, to that header's panel content when the panel is open, then to the next header.** Do not order the DOM so that all the headers come first and all the panels come after. The tab order must match the visual order.
- **A collapsed panel's content is completely out of the tab order.** The rule is the keyboard half of the screen reader rule that a collapsed panel's content must be unreachable. Tabbing into invisible content is the most common accordion failure.
- **Do not move focus for the user when a header toggles.** Focus stays on the header the user activated and does not move into the panel.
- **Never collapse a panel that contains focus.** If one-panel-at-a-time behavior closes a panel the user is working in, focus is lost. The keyboard user then starts again from the top of the page.
- **The header must never open on hover.** No content the user needs inside a panel may appear only on hover.

## Styling set by tokens

**Do not set or override the accordion properties below.** The four parts set each property for both the open look and the closed look.

- **`accordion`**: `border-size`, `border-radius`, `item-gap`, `padding`, `min-width`, `max-width`, `elevation`, `divider-size`, `colors`.
- **`accordion-item`**: `border-radius`, `border-size`, `margin`, `padding`, `elevation`, `colors`.
- **`accordion-header`**: `horizontal-padding`, `vertical-padding`, `icon-left-size`, `icon-right-size`, `icon-gap`, `text`, `border-size`, `border-radius`, `elevation`.
- **`accordion-content`**: `horizontal-padding`, `top-padding`, `bottom-padding`, `margin`, `border-size`, `border-radius`, `elevation`, `colors`, `text`.

The component draws the chevron, rotates the chevron, and sets the colors for the open look and the closed look. Do not add wrappers or spacer elements to adjust the chevron, the chevron's rotation, those colors, or any property in the list above.

## Related skills

- `recursica-skill-navigation` — the rule against nesting, items collapsed by default, sub-navigation that opens on click rather than hover, permissions, and why a top-level item with no children stays a link.
- `recursica-skill-discoverability` — progressive disclosure, and the three cases where hiding content is not safe.
- `recursica-skill-working-memory` — 7 ± 2 as the most items a user can scan at a glance, and what the 7 ± 2 limit does not claim.
- `recursica-skill-system-conventions` — never show a meaning in a single channel, and fix the structure instead of collapsing content to work around the structure.

### Only if used on the same screen

- `recursica-skill-tree` — the component for a real hierarchy, for any content that is not a single level of sections of the same kind.
- `recursica-skill-tabs` — parts of one whole, and why no form is split across sections.

## Open questions

- **Whether opening one item closes the other items.** No variant in the standard UI kit sets the behavior, and no rule states the behavior. If the project adds a single-open or multi-open option, use the project's option.
- **Whether the divider between items can be hidden.** Only the design-system website shows a divider that "can be hidden if accordion is the last child in a list or accordion group". The UI kit (the token file, `recursica_ui-kit.json`, that says which variants and states each component has) offers only `divider-size` on `accordion`, with no option to turn the divider off. Do not rely on hiding the divider without asking.
- **How to show an item the user cannot open right now.** `recursica-skill-navigation` says to disable an item the user can unlock. The `accordion-header` part in the standard UI kit has no disabled look.
- **Animation for opening and closing.** No duration or easing is defined.
- **Whether a panel can be linked to directly**, so that a shared URL opens a specific section.
- **Whether an accordion may sit inside a table row**, given the single-level expand and collapse that `recursica-skill-tables` asks for.

## Pre-flight checklist

- [ ] Collapsing the content is justified. The user does not need the content often, and the page is not sparse.
- [ ] The accordion is one level deep. No accordion is nested inside another accordion, and every real hierarchy uses `recursica-skill-tree` instead.
- [ ] No form, and no part of one form, is split across panels.
- [ ] Nothing on the critical path is inside a panel, and no content the user needs exists only inside a panel.
- [ ] Every item loads collapsed, except the group that holds the current page in a navigation accordion.
- [ ] Each header label is specific enough to choose a section while every section is closed.
- [ ] No panel the user opened collapses automatically, and no panel that contains focus is ever closed.
- [ ] The list of headers is easy to scan, and no card wraps the accordion or the accordion's content.
- [ ] Every header is a real button, announces whether the header is expanded or collapsed, and is connected to the header's panel.
- [ ] The open or closed state is shown by more than the chevron. Every icon that shows information has an accessible name, and every decorative icon is silent.
- [ ] Enter and Space both toggle the header, and each header is a tab stop.
- [ ] The tab order runs from a header, to the open panel's content, to the next header, and matches the visual order.
- [ ] Collapsed panel content is removed from the accessibility tree and the tab order, not only hidden.
- [ ] Focus never moves when a header toggles, nothing opens on hover, and the focus ring is intact.
- [ ] Every variant, size, and state is one the Recursica MCP server lists for the project, and no header has an invented disabled look.
- [ ] Padding, gaps, dividers, and colors come from the component.
- [ ] Open questions were asked about, not decided: whether opening one item closes the other items, whether the divider can be hidden, an item the user cannot open, animation when a panel opens or closes, linking directly to a panel, and an accordion inside a table row.
