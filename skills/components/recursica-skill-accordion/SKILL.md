---
name: recursica-skill-accordion
description: How to use the Recursica accordion correctly — when collapsing content is justified, why an accordion is never nested, the collapsed-by-default rule, what accordion, accordion-item, accordion-header, and accordion-content each own, the limits on what may be hidden behind a header, and the screen-reader and keyboard requirements for expand and collapse. Use whenever adding, reviewing, or refactoring an accordion, an expand/collapse section, a collapsible navigation group, or an FAQ list. Trigger on "accordion", "expand", "collapse", "disclosure", "show more", "collapsible section", "expanded state", "screen reader", "tab order", or a request to hide sections until the user wants them. Do NOT use for multi-level hierarchy — that needs a tree, not an accordion. Do NOT use for parts of one whole the user flips between — that is recursica-skill-tabs. Do NOT use for navigation structure, item counts, or sub-nav disclosure — that is recursica-skill-navigation.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Accordion

An accordion collapses peer sections of content (sections at the same level, of the same kind), so the user opens only the one they need.

## Use it when

- **The page has more sections than the user needs at once**, and reading one at a time is the natural way through it.
- **The sections are peers at a single level.** One level, with no nesting.
- **A navigation group with no landing page must reveal its sub-items in place** — the accordion behavior that `recursica-skill-navigation` specifies.
- **A table row has extra detail** — a single level of expand and collapse on that row, as `recursica-skill-tables` requires.

## Do not use it when

| Instead of an accordion                                     | Use                                                                                                    |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| The content has more than one level of nesting              | `recursica-skill-tree`. **Never nest an accordion inside an accordion** — `recursica-skill-navigation` |
| The user needs the content often                            | Show it. Content behind a header costs a click every single time                                       |
| There is little content on the page to begin with           | Nothing. Collapsing a short page only makes it feel empty                                              |
| The sections are parts of one whole the user flips between  | `recursica-skill-tabs`                                                                                 |
| The content is a form, or one form's fields                 | A page, or a stepper for a form with several parts — `recursica-skill-forms`                           |
| The content is on the critical path and must be read to act | The page itself, not collapsed                                                                         |
| A short text label for an icon-only control                 | `recursica-skill-tooltip`                                                                              |
| The content is too complex or too deep for the space        | A page or a panel. An accordion panel is a narrow, shallow container                                   |
| Too many sections to fit                                    | Fewer sections, not smaller ones — `recursica-skill-system-conventions`                                |

The critical path is the set of steps needed to finish the task.

**Progressive disclosure has a stated limit.** (Progressive disclosure means showing only what is needed now, with the rest available on request.) `recursica-skill-discoverability` justifies putting off a long tail of rarely needed content. It openly does not justify hiding something the user would want to reach, and it does not justify hiding things because the screen is crowded. An accordion over required information is that misuse.

## What exists

Taken from `recursica_ui-kit.json`. Four specs make up one accordion, and **only one of them has a variant axis at all.**

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

**`appearance` has exactly two values, and neither is disabled.** There is no disabled appearance on `accordion-header`. You cannot show a header that the user is prevented from opening.

**There is no nesting construct.** This matches the house rule: accordions have one level only.

**There is no single-open or multi-open axis.** Nothing in the kit makes opening one item close another — see Uncovered.

**There is no size, density, or emphasis axis** on any of the four, and no state axis for hover, focus, or error.

## Rules for using it

**Every item loads collapsed.** The only exception is the group that contains the user's current page, in a navigation accordion. Owned by `recursica-skill-navigation`.

**Never nest an accordion inside an accordion.** `recursica-skill-navigation` says it outright: accordions have one level only. This is a hard ban, not a preference.

**The line between the accordion and the tree is settled, and it is this: real hierarchy is a tree, and disclosure at a single level is an accordion.** If a node's meaning depends on its parent, or the depth varies, the component is `recursica-skill-tree` — not an accordion, and never an accordion inside an accordion pretending to be one. If the sections are peers at one level, it is an accordion, and a tree would be wasted indentation. There is no third case, and nothing to decide here.

**Header labels must be specific enough to choose between while closed.** If the user has to open a section to learn what is inside it, the label is the defect. Fix the label, instead of opening the section by default.

**Never split a form across accordion panels.** It is the same reason a form is never split across tabs: data entry is not content divided into sections. A form with several parts uses a stepper. See `recursica-skill-forms`.

**Never collapse a panel the user opened, automatically.** Not on scroll, not on save, and not when they open a second panel — unless single-open was an explicit decision. Closing a panel out from under the user destroys their place, and if their focus was inside it, it destroys their focus too.

**Nothing on the critical path goes inside a panel.** If the user must read it to move forward, it is not content that can be collapsed.

**Do not wrap the panel's content in a card**, and do not wrap the accordion in one. The item is already the boundary — see `recursica-skill-card`.

**Keep the set easy to scan.** Above about nine headers, the list can no longer be taken in at a glance; see `recursica-skill-working-memory` for what that limit is and is not.

**The chevron belongs to the component.** Do not add your own indicator, and do not let the chevron be the only thing that shows open or closed.

## Accessibility

This component also follows the accessibility baseline in `recursica-skill-system-conventions`, including the focus ring (the outline that shows which element has keyboard focus). Only what is specific to it is listed here.

The component draws the header and the chevron. Whether the collapsed state is real, and whether the header is a real button, are entirely up to you — and they are the two things most often done wrong.

### Screen readers

- **The header must be a real button.** Never a `div`, a `span`, or a bare heading with a click handler. Only a real button is announced as a button, and responds to Enter and Space without extra work.
- **The header must announce whether it is expanded or collapsed**, and that announcement must change the moment it toggles. A header that always announces "collapsed" is worse than one that announces nothing.
- **The header must be connected in code to the panel it controls**, so a user who hears "expanded" can get to what was expanded.
- **The state must never be shown by the chevron alone.** A rotating chevron is a single visual channel (a way of carrying meaning, such as color, shape, position, or text), which `recursica-skill-system-conventions` forbids for any meaning the user must receive.
- **The header's accessible name (the name a screen reader reads out for a control) is the section title**, and it must make sense on its own — that is how it is announced, with no neighboring headers for context.
- **If the header sits inside a heading, the heading wraps the button**, not the other way round. A button wrapped around a heading loses both the heading level and the name.
- **Content inside a collapsed panel must truly be unreachable, not just invisible.** Zero height, zero opacity, or positioning it off the screen leaves the text in the accessibility tree (the version of the page that assistive technology reads). A screen reader user then reads a section that a sighted user cannot see. Remove it from the tree.
- **A leading or trailing icon that carries meaning needs an accessible name.** Decorative icons must be silent, not announced as unlabeled graphics.

### Keyboard and non-mouse navigation

- **Enter and Space both toggle the header.** Do not intercept, remap, or swallow either one.
- **Each header is its own tab stop** (a place the Tab key lands). An accordion is not a single tab-stop group — every header must be reachable with Tab.
- **The tab order runs header, then that panel's content when it is open, then the next header.** Do not order the DOM (the page's structure in code) so that all the headers come first and all the panels after. The visual order is the required order.
- **A collapsed panel's contents are completely out of the tab order.** This is the keyboard side of the rule above, and tabbing into invisible content is the most common accordion failure there is.
- **Do not move focus for the user when a header toggles.** Focus stays on the header that was activated. Do not throw it into the panel.
- **Never collapse a panel that contains focus.** If single-open behavior closes a panel the user is working in, their focus is destroyed, and they are sent back to the top of the document.
- **The header must never open on hover**, and nothing needed inside a panel may be revealed only by hover.

## Not your decision

Do not implement, override, or tune any of these — the four specs own them for both appearances:

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

- `recursica-skill-tree` — the component for real hierarchy, which is the other side of the boundary this skill sits on.
- `recursica-skill-tabs` — parts of one whole, and why no form is split across sections.

## Uncovered — ask, do not invent

- **Whether opening one item closes the others.** No axis defines it, and no rule states it.
- **Whether the divider between items can be hidden.** A divider that "can be hidden if accordion is the last child in a list or accordion group" is documented outside the token inventory. The kit only offers `divider-size` on `accordion`, with no option to turn it off. Do not rely on this without asking.
- **How to show an item the user cannot open right now.** `recursica-skill-navigation` says to disable what the user can unlock, but `accordion-header` has no disabled appearance.
- **Animation for opening and closing.** No duration or easing is defined.
- **Whether a panel can be linked to directly**, so that a shared URL opens a specific section.
- **Whether an accordion may sit inside a table row**, given the single-level expand and collapse that `recursica-skill-tables` asks for.

## Pre-flight checklist

- [ ] Collapsing is justified — the content is not needed often, and the page is not sparse.
- [ ] The structure is one level deep. No accordion is nested inside another, and you sent any real hierarchy to `recursica-skill-tree` instead.
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
- [ ] Collapsed panel content is removed from the accessibility tree and the tab order, not just hidden.
- [ ] Focus never moves on toggle, nothing opens on hover, and the focus ring is intact.
- [ ] You passed no variant, size, or state outside the four specs above, and invented no disabled header.
- [ ] You overrode no padding, gap, divider, or color that the component owns.
- [ ] You invented nothing from the uncovered list.
