---
name: recursica-skill-accordion
description: How to use the Recursica accordion — when collapsing content is justified, collapsed by default, never nested, what each part owns, and expand and collapse accessibility. Use for accordions, expandable sections, and FAQ lists. Not for multi-level hierarchy — see recursica-skill-tree; not for switching views — see recursica-skill-tabs.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Accordion

An accordion collapses peer sections of content (sections at the same level, of the same kind), so the user opens only the one they need.

## Use it when

- **The page has more sections than the user needs at once**, and the user reads them one at a time.
- **The sections are peers at a single level.** One level, with no nesting.
- **A navigation group with no landing page must reveal its sub-items in place** — the accordion behavior that `recursica-skill-navigation` specifies.
- **A table row has extra detail** — a single level of expand and collapse on that row, as `recursica-skill-tables` requires.

## Do not use it when

| Instead of an accordion                                     | Use                                                                                                    |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| The content has more than one level of nesting              | `recursica-skill-tree`. **Never nest an accordion inside an accordion** — `recursica-skill-navigation` |
| The user needs the content often                            | Show it. Content behind a header takes an extra click every time it is needed                          |
| There is little content on the page to begin with           | Nothing. Collapsing a short page only makes it feel empty                                              |
| The sections are parts of one whole the user flips between  | `recursica-skill-tabs`                                                                                 |
| The content is a form, or one form's fields                 | A page, or a stepper for a form with several parts — `recursica-skill-forms`                           |
| The content is on the critical path and must be read to act | The page itself, not collapsed                                                                         |
| A short text label for an icon-only control                 | `recursica-skill-tooltip`                                                                              |
| The content is too complex or too deep for the space        | A page or a panel. An accordion panel is a narrow, shallow container                                   |
| Too many sections to fit                                    | Fewer sections, not smaller ones — `recursica-skill-system-conventions`                                |

The critical path is the set of steps needed to finish the task.

**Progressive disclosure has a stated limit.** (Progressive disclosure means showing only what is needed now, with the rest available on request.) `recursica-skill-discoverability` justifies hiding rarely needed content until the user asks for it. That skill states that it does not justify hiding something the user would want to reach. It also does not justify hiding content because the screen is crowded. Putting required information inside an accordion is that misuse.

## What exists

Taken from the UI kit (the token file, `recursica_ui-kit.json`, that says which variants and states each component has). Four specs make up one accordion, and **only one of them has a variant axis (a property a component varies on, such as size or style; Figma calls it a variant property) at all.**

| Spec                | Axis         | Options          |
| ------------------- | ------------ | ---------------- |
| `accordion`         | (none)       | —                |
| `accordion-item`    | (none)       | —                |
| `accordion-header`  | `appearance` | `open`, `closed` |
| `accordion-content` | (none)       | —                |

**Which one owns what:**

- **`accordion`** is the set. It holds the items, and owns the gap between them, the width limits, and the dividers.
- **`accordion-item`** is one section — the wrapper around a header and its panel.
- **`accordion-header`** is the clickable row inside the item. It carries the `open` / `closed` appearance, a leading icon, a trailing icon, and the title text.
- **`accordion-content`** is the panel the header reveals.

**`appearance` has exactly two values, and neither is disabled.** There is no disabled appearance on `accordion-header`. The UI kit has no appearance for a header the user is prevented from opening.

**There is no nesting construct.** This matches the house rule: accordions have one level only.

**There is no single-open or multi-open axis.** Nothing in the UI kit makes opening one item close another — see Uncovered.

**There is no size, density, or emphasis axis** on any of the four, and no state axis for hover, focus, or error.

## Rules for using it

**Every item loads collapsed.** The only exception is the group that contains the user's current page, in a navigation accordion. Owned by `recursica-skill-navigation`.

**Never nest an accordion inside an accordion.** `recursica-skill-navigation` says it outright: accordions have one level only. This is a hard ban, not a preference.

**Real hierarchy is a tree, and disclosure at a single level is an accordion.** This boundary is settled. If a node's meaning depends on its parent, or the depth varies, use `recursica-skill-tree`. Do not use an accordion, and never nest accordions inside accordions to show the hierarchy. If the sections are peers at one level, use an accordion. A tree would indent sections that have no parent. There is no third case, and nothing to decide here.

**Header labels must be specific enough to choose between while closed.** If the user has to open a section to learn what is inside it, the label is wrong. Rewrite the label instead of opening the section by default.

**Never split a form across accordion panels.** Data entry is not content divided into sections, which is also why a form is never split across tabs. A form with several parts uses a stepper. See `recursica-skill-forms`.

**Never collapse a panel the user opened, automatically.** Not on scroll, not on save, and not when they open a second panel — unless single-open was an explicit decision. Closing a panel the user is reading loses their place on the page. If focus was inside the panel, focus is lost too.

**Nothing on the critical path goes inside a panel.** If the user must read it to move forward, it is not content that can be collapsed.

**Do not wrap the panel's content in a card**, and do not wrap the accordion in one. The item already marks the boundary of its content — see `recursica-skill-card`.

**Keep the set easy to scan.** Above about nine headers, the list can no longer be taken in at a glance; see `recursica-skill-working-memory` for what that limit is and is not.

**The chevron belongs to the component.** Do not add a custom indicator, and do not let the chevron alone show whether an item is open or closed.

## Accessibility

This component also follows the accessibility baseline in `recursica-skill-system-conventions`, including the focus ring. Only what is specific to it is listed here.

The component draws the header and the chevron. Making the header a real button, and making a collapsed panel's content unreachable, are left to the implementation. These two are the most often done wrong.

### Screen readers

- **The header must be a real button.** Never a `div`, a `span`, or a bare heading with a click handler. Only a real button is announced as a button, and responds to Enter and Space without extra work.
- **The header must announce whether it is expanded or collapsed**, and that announcement must change the moment it toggles. A header that always announces "collapsed" is worse than one that announces nothing.
- **The header must be connected in code to the panel it controls**, so a user who hears "expanded" can get to what was expanded.
- **The state must never be shown by the chevron alone.** A rotating chevron is a single visual channel (color, shape, position or text, each a separate signal), which `recursica-skill-system-conventions` forbids for any meaning the user must receive.
- **The header's accessible name (the name a screen reader reads out for a control) is the section title**, and it must make sense on its own — that is how it is announced, with no neighboring headers for context.
- **If the header sits inside a heading, the heading wraps the button**, not the other way around. A button wrapped around a heading loses both the heading level and the name.
- **Content inside a collapsed panel must truly be unreachable, not only invisible.** Zero height, zero opacity, or positioning it off the screen leaves the text in the accessibility tree (the version of the page that assistive technology reads). A screen reader user then reads a section that a sighted user cannot see. Remove it from the tree.
- **A leading or trailing icon that carries meaning needs an accessible name.** Decorative icons must be silent, not announced as unlabeled graphics.

### Keyboard and non-mouse navigation

- **Enter and Space both toggle the header.** Do not intercept, remap, or swallow either one.
- **Each header is its own tab stop** (a place the Tab key lands). An accordion is not a single tab-stop group — every header must be reachable with Tab.
- **The tab order runs header, then that panel's content when it is open, then the next header.** Do not order the DOM so that all the headers come first and all the panels after. The visual order is the required order.
- **A collapsed panel's contents are completely out of the tab order.** This is the keyboard side of the rule above, and tabbing into invisible content is the most common accordion failure there is.
- **Do not move focus for the user when a header toggles.** Focus stays on the header that was activated, and does not move into the panel.
- **Never collapse a panel that contains focus.** If single-open behavior closes a panel the user is working in, focus is lost, and the keyboard user starts again from the top of the document.
- **The header must never open on hover**, and nothing needed inside a panel may be revealed only by hover.

## Set by the component

Do not set or override any of these. The four specs set them for both appearances:

- **`accordion`**: `border-size`, `border-radius`, `item-gap`, `padding`, `min-width`, `max-width`, `elevation`, `divider-size`, `colors`.
- **`accordion-item`**: `border-radius`, `border-size`, `margin`, `padding`, `elevation`, `colors`.
- **`accordion-header`**: `horizontal-padding`, `vertical-padding`, `icon-left-size`, `icon-right-size`, `icon-gap`, `text`, `border-size`, `border-radius`, `elevation`.
- **`accordion-content`**: `horizontal-padding`, `top-padding`, `bottom-padding`, `margin`, `border-size`, `border-radius`, `elevation`, `colors`, `text`.

The chevron, its rotation, and the per-appearance colors come with the component. Do not add wrappers or spacer elements to adjust any of the above.

## Load these too

- `recursica-skill-navigation` — the never-nest rule, collapsed-by-default, sub-navigation on click rather than hover, permissions, and why a top-level item with no children stays a link.
- `recursica-skill-discoverability` — progressive disclosure, and the three cases where hiding is not safe.
- `recursica-skill-working-memory` — 7 ± 2 as a scannability ceiling, and what it does not claim.
- `recursica-skill-system-conventions` — never carry meaning in a single channel; fix the structure instead of collapsing to cope with it.

### Only if the screen also uses it

- `recursica-skill-tree` — the component for real hierarchy, used for any content that is not a single level of peer sections.
- `recursica-skill-tabs` — parts of one whole, and why no form is split across sections.

## Uncovered — ask, do not invent

- **Whether opening one item closes the others.** No axis defines it, and no rule states it.
- **Whether the divider between items can be hidden.** A divider that "can be hidden if accordion is the last child in a list or accordion group" is shown only on the design-system website. The UI kit only offers `divider-size` on `accordion`, with no option to turn it off. Do not rely on this without asking.
- **How to show an item the user cannot open right now.** `recursica-skill-navigation` says to disable what the user can unlock, but `accordion-header` has no disabled appearance.
- **Animation for opening and closing.** No duration or easing is defined.
- **Whether a panel can be linked to directly**, so that a shared URL opens a specific section.
- **Whether an accordion may sit inside a table row**, given the single-level expand and collapse that `recursica-skill-tables` asks for.

## Pre-flight checklist

- [ ] Collapsing is justified — the content is not needed often, and the page is not sparse.
- [ ] The structure is one level deep. No accordion is nested inside another, and any real hierarchy uses `recursica-skill-tree` instead.
- [ ] No form, and no part of one form, is split across panels.
- [ ] Nothing on the critical path is inside a panel, and nothing needed exists only there.
- [ ] Every item loads collapsed, except the group containing the current page in a navigation accordion.
- [ ] Header labels are specific enough to choose between while closed.
- [ ] No panel the user opened collapses automatically, and no panel containing focus is ever closed.
- [ ] The number of headers is easy to scan, and no card wraps the accordion or its content.
- [ ] Every header is a real button that announces whether it is expanded or collapsed, and is connected to its panel.
- [ ] The state is shown by more than the chevron. Icons that carry meaning are named, and decorative ones are silent.
- [ ] Enter and Space both toggle, and each header is a tab stop.
- [ ] The tab order runs header, open panel content, then next header — matching the visual order.
- [ ] Collapsed panel content is removed from the accessibility tree and the tab order, not only hidden.
- [ ] Focus never moves on toggle, nothing opens on hover, and the focus ring is intact.
- [ ] Every variant, size, and state comes from the four specs above, and no header has an invented disabled appearance.
- [ ] The padding, gaps, dividers, and colors the component owns are not overridden.
- [ ] Uncovered items were asked about, not decided: whether opening one item closes the others, whether the divider can be hidden, an item the user cannot open, animation when a panel opens or closes, linking directly to a panel, and an accordion inside a table row.
