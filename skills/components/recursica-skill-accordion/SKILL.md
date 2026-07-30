---
name: recursica-skill-accordion
description: How to use the Recursica accordion correctly — when collapsing content is justified, why an accordion is never nested, the collapsed-by-default rule, what accordion, accordion-item, accordion-header, and accordion-content each own, the limits on what may be hidden behind a header, and the screen-reader and keyboard requirements for expand and collapse. Use whenever adding, reviewing, or refactoring an accordion, an expand/collapse section, a collapsible navigation group, or an FAQ list. Trigger on "accordion", "expand", "collapse", "disclosure", "show more", "collapsible section", "expanded state", "screen reader", "tab order", or a request to hide sections until the user wants them. Do NOT use for multi-level hierarchy — that needs a tree, not an accordion. Do NOT use for parts of one whole the user flips between — that is recursica-skill-tabs. Do NOT use for navigation structure, item counts, or sub-nav disclosure — that is recursica-skill-navigation.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Accordion

An accordion collapses peer sections of content so the user opens only the one they need.

## Use it when

- **The page carries more sections than the user needs at once**, and reading one at a time is the natural way through it.
- **The sections are peers at a single level.** One level, no nesting.
- **A navigation group with no landing page must reveal its sub-items in place** — the accordion behavior `recursica-skill-navigation` specifies.
- **A table row has sub-detail** — a single level of expand and collapse on that row, per `recursica-skill-tables`.

## Do not use it when

| Instead of an accordion                                     | Use                                                                                                    |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| The content has more than one level of nesting              | `recursica-skill-tree`. **Never nest an accordion inside an accordion** — `recursica-skill-navigation` |
| The user needs the content frequently                       | Show it. Content behind a header costs a click every single time                                       |
| There is little content on the page to begin with           | Nothing. Collapsing a short page only makes it feel empty                                              |
| The sections are parts of one whole the user flips between  | `recursica-skill-tabs`                                                                                 |
| The content is a form, or one form's fields                 | A page, or a stepper for a multi-part form — `recursica-skill-forms`                                   |
| The content is on the critical path and must be read to act | The page itself, uncollapsed                                                                           |
| A short text label for an icon-only control                 | `recursica-skill-tooltip`                                                                              |
| The content is too complex or too deep for the space        | A page or a panel. An accordion panel is a narrow, shallow container                                   |
| Too many sections to fit                                    | Fewer sections, not smaller ones — `recursica-skill-system-conventions`                                |

**Progressive disclosure has a stated limit.** `recursica-skill-discoverability` justifies deferring a long tail of demand; it explicitly does not justify hiding something the user would want to reach, and it does not justify hiding because the screen is crowded. An accordion over required information is that misuse.

## What exists

Taken from `recursica_ui-kit.json`. Four specs make one accordion, and **only one of them has a variant axis at all.**

| Spec                | Axis         | Options          |
| ------------------- | ------------ | ---------------- |
| `accordion`         | (none)       | —                |
| `accordion-item`    | (none)       | —                |
| `accordion-header`  | `appearance` | `open`, `closed` |
| `accordion-content` | (none)       | —                |

**Which one owns what:**

- **`accordion`** is the set. It holds the items and owns the gap between them, the width bounds, and the dividers.
- **`accordion-item`** is one section — the wrapper around a header and its panel.
- **`accordion-header`** is the clickable row inside the item. It carries the `open` / `closed` appearance, a leading icon, a trailing icon, and the title text.
- **`accordion-content`** is the panel the header reveals.

**`appearance` has exactly two values, and neither is disabled.** There is no disabled appearance on `accordion-header`. You cannot render a header the user is prevented from opening.

**There is no nesting construct.** This matches the house rule: accordions are single-layer only.

**There is no single-open / multi-open axis.** Nothing in the kit makes opening one item close another — see Uncovered.

**There is no size, density, or emphasis axis** on any of the four, and no state axis for hover, focus, or error.

## Rules for using it

**Every item loads collapsed.** The only exception is the group containing the user's current page, in a navigation accordion. Owned by `recursica-skill-navigation`.

**Never nest an accordion inside an accordion.** `recursica-skill-navigation` states it outright: accordions are single-layer only. This is a hard prohibition, not a preference.

**The boundary with the tree is settled, and it is this: real hierarchy is a tree, single-level disclosure is an accordion.** If a node's meaning depends on its parent, or the depth varies, the component is `recursica-skill-tree` — not an accordion, and never an accordion inside an accordion standing in for one. If the sections are peers at one level, it is an accordion and a tree would be wasted indentation. There is no third case and nothing to decide here.

**Header labels must be specific enough to choose from while closed.** If the user has to open a section to learn what is inside it, the label is the defect — fix the label rather than opening the section by default.

**Never split a form across accordion panels.** Same reason a form is never split across tabs: entry is not sectioned content. A multi-part form uses a stepper. See `recursica-skill-forms`.

**Never auto-collapse a panel the user opened.** Not on scroll, not on save, not when they open a second panel unless single-open was an explicit decision. Closing a panel underneath the user destroys their place, and if their focus was inside it, it destroys their focus too.

**Nothing on the critical path goes inside a panel.** If the user must read it to proceed, it is not collapsible content.

**Do not wrap panel content in a card**, and do not wrap the accordion in one. The item is already the boundary — see `recursica-skill-card`.

**Keep the set scannable.** Above roughly nine headers the list stops being takeable in at a glance; see `recursica-skill-working-memory` for what that ceiling is and is not.

**The chevron belongs to the component.** Do not add your own indicator, and do not let the chevron be the only thing that says open or closed.

## Accessibility

The component draws the header and the chevron. Whether the collapsed state is real, and whether the header is a real button, are entirely yours — and they are the two things most often gotten wrong.

### Screen readers

- **The header must be a real button.** Never a `div`, a `span`, or a bare heading with a click handler. Only a real button is announced as one and responds to Enter and Space for free.
- **The header must announce its expanded or collapsed state**, and that announcement must change the moment it toggles. A header that always announces "collapsed" is worse than one that announces nothing.
- **The header must be programmatically associated with the panel it controls**, so a user who hears "expanded" can get to what was expanded.
- **The state must never be conveyed by the chevron alone.** A rotating chevron is a single visual channel, which `recursica-skill-system-conventions` forbids for any meaning the user must receive.
- **The header's accessible name is the section title**, and it must read correctly alone — that is how it is announced, with no neighboring headers for context.
- **If the header sits inside a heading, the heading wraps the button**, not the reverse. A button wrapping a heading loses both the level and the name.
- **Content inside a collapsed panel must be genuinely unreachable, not merely invisible.** Zero height, zero opacity, or off-screen positioning leaves the text in the accessibility tree, so a screen reader user reads a section a sighted user cannot see. Remove it from the tree.
- **A leading or trailing icon that carries meaning needs an accessible name.** Decorative icons must be silent, not announced as unlabeled graphics.

### Keyboard and non-mouse navigation

- **Enter and Space both toggle the header.** Do not intercept, remap, or swallow either.
- **Each header is its own tab stop.** An accordion is not a single tab stop group — every header must be reachable with Tab.
- **Tab order runs header, then that panel's content when it is open, then the next header.** Do not order the DOM so that all headers come first and all panels after; the visual order is the required order.
- **A collapsed panel's contents are out of the tab order entirely.** This is the keyboard face of the rule above, and tabbing into invisible content is the most common accordion failure there is.
- **Do not move focus for the user on toggle.** Focus stays on the header that was activated. Do not throw it into the panel.
- **Never collapse a panel that contains focus.** If single-open behavior closes a panel the user is working in, focus is destroyed and the user is returned to the top of the document.
- **The header must never open on hover**, and nothing needed inside a panel may be revealed only by hover.
- **Never suppress the focus ring** on the header, and never let the hover style stand in for it.

## Not your decision

Do not implement, override, or tune any of these — the four specs own them for both appearances:

- **`accordion`**: `border-size`, `border-radius`, `item-gap`, `padding`, `min-width`, `max-width`, `elevation`, `divider-size`, `colors`.
- **`accordion-item`**: `border-radius`, `border-size`, `margin`, `padding`, `elevation`, `colors`.
- **`accordion-header`**: `horizontal-padding`, `vertical-padding`, `icon-left-size`, `icon-right-size`, `icon-gap`, `text`, `border-size`, `border-radius`, `elevation`.
- **`accordion-content`**: `horizontal-padding`, `top-padding`, `bottom-padding`, `margin`, `border-size`, `border-radius`, `elevation`, `colors`, `text`.

The chevron, its rotation, and the per-appearance colors come with the component. Do not add wrappers or spacer elements to adjust any of the above.

## Load these too

- [`recursica-skill-navigation`](../../design-rules/recursica-skill-navigation/SKILL.md) — the never-nest rule, collapsed-by-default, sub-navigation on click rather than hover, permissions, and why a top-level item with no children stays a link.
- [`recursica-skill-tree`](../recursica-skill-tree/SKILL.md) — the component for real hierarchy, which is the other side of the boundary this skill sits on.
- [`recursica-skill-tabs`](../recursica-skill-tabs/SKILL.md) — parts of one whole, and why no form is split across sections.
- [`recursica-skill-discoverability`](../../psychology/recursica-skill-discoverability/SKILL.md) — progressive disclosure, and the three cases where hiding is not safe.
- [`recursica-skill-working-memory`](../../psychology/recursica-skill-working-memory/SKILL.md) — 7 ± 2 as a scannability ceiling, and what it does not claim.
- [`recursica-skill-system-conventions`](../../design-rules/recursica-skill-system-conventions/SKILL.md) — never carry meaning in a single channel; fix the structure instead of collapsing to cope with it.

## Uncovered — ask, do not invent

- **Whether opening one item closes the others.** No axis defines it and no rule states it.
- **Whether the divider between items can be suppressed.** A divider that "can be hidden if accordion is the last child in a list or accordion group" is documented outside the token inventory; the kit exposes only `divider-size` on `accordion`, with no option to turn it off. Do not rely on this without asking.
- **How an item the user cannot currently open should be rendered.** `recursica-skill-navigation` says to disable what the user can unlock, but `accordion-header` has no disabled appearance.
- **Open and close animation.** No duration or easing is defined.
- **Whether a panel can be deep-linked** so a shared URL opens a specific section.
- **Whether an accordion may sit inside a table row**, given the single-level expand/collapse `recursica-skill-tables` asks for.

## Pre-flight checklist

- [ ] Collapsing is justified — the content is not needed frequently, and the page is not sparse.
- [ ] The structure is one level deep; no accordion is nested inside another, and any real hierarchy went to `recursica-skill-tree` instead.
- [ ] No form, and no part of one form, is split across panels.
- [ ] Nothing on the critical path is inside a panel; nothing needed exists only there.
- [ ] Every item loads collapsed, except the group containing the current page in a navigation accordion.
- [ ] Header labels are specific enough to choose from while closed.
- [ ] No panel the user opened is auto-collapsed, and no panel containing focus is ever closed.
- [ ] Header count is scannable; no card wraps the accordion or its content.
- [ ] Every header is a real button that announces its expanded or collapsed state and is associated with its panel.
- [ ] The state is carried in more than the chevron; meaningful icons are named and decorative ones are silent.
- [ ] Enter and Space both toggle; each header is a tab stop.
- [ ] Tab order runs header, open panel content, next header — matching visual order.
- [ ] Collapsed panel content is removed from the accessibility tree and the tab order, not merely hidden.
- [ ] Focus is never moved on toggle, nothing opens on hover, and the focus ring is intact.
- [ ] No variant, size, or state outside the four specs above was passed; no disabled header was invented.
- [ ] No component-owned padding, gap, divider, or color was overridden.
- [ ] Nothing in the uncovered list was invented.
