---
name: recursica-skill-screen-scaffolding
description: House rules for composing a page in enterprise web applications — the header, left rail, and footer, how the number of navigation items decides between a top nav and a rail, where the page title and breadcrumb sit, the bottom-right primary action, positioning filters by content width rather than by breakpoint, dividing regions with space rather than containers, maximum content width and centring the main content within it, never sizing a region to a bare viewport height inside a layer, what a page shows while loading, and the layering ladder. Use when laying out a page, deciding where a region begins and ends, placing application chrome, or deciding whether something needs a container. Trigger on "page layout", "scaffolding", "header", "left rail", "footer", "breadcrumb", "max width", "centered", "wide screen", "100vh", "full height", "unwanted scrollbar", "skeleton", "loading state", "layer", or "container". Do NOT use for whether a card is right — that is recursica-skill-card.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Screen scaffolding

House rules for how a page is composed and what each region sits on. These are opinions, not neutral best practices — apply them as constraints.

## The three governing principles

1. **Space does the grouping.** Association is built from gutters and white space, not from drawn boundaries. Reaching for a container is nearly always a sign that the spacing was not done.
2. **Nothing is mandatory, but the pieces are conventional.** There is no fixed list of elements every page must have — the layout of the application decides. What is fixed is what each piece is for once you use it.
3. **Never fill space just because it is there.** Extra width is not a problem to solve. Stretching content to fill a wide viewport is the clearest sign a screen was assembled rather than designed.

## The shell

**Nothing is absolutely mandatory.** The application's layout decides. What follows is the conventional shape, not a checklist.

**A header, and it is global.** It carries the primary navigation when the nav is horizontal, and it typically holds profile and menu access.

**Or a left rail, instead of or alongside the header.** A rail sits on the left. It may sit below a header, or there may be no header at all. **Inside a rail, primary navigation goes toward the top and the profile and settings toward the bottom** — the same items a header would have carried, redistributed.

**A footer on every page.** It may be as simple as a copyright notice, or more. Fixed at the bottom or reached by scrolling; both are acceptable.

**Page titles, sections, and any high-level summary content sit below the header**, in the page.

**The header, the navigation, and the main content all sit on layer 0 unless one of them needs containing.** Where it does, that region is raised to layer 1 — the nav or the main content, not both — and the direction is decided once for the application. **Layer 0 is declared once, on the root element, and never re-declared.** Owned by `recursica-skill-layers`.

### Choosing between a top nav and a left rail

**The number of navigation items decides.**

- **Few items → a top nav.**
- **More than about three or four → a left rail**, which gives room to stack them. Desktop viewports are wider than they are tall, so vertical space for navigation is the scarcer resource and a rail spends horizontal space to buy it.

**Three or four is a default, not a hard limit.** It can be overridden for the product's needs. **Where the choice is not obvious, ask the user which they prefer** rather than picking silently — see `recursica-skill-design-router`.

## Titles and breadcrumbs

**The page title sits within the page**, not in the header.

**It may repeat the navigation label, and that is fine.** Identical strings are not a defect here. How far the two may diverge is owned by `recursica-skill-naming-terminology`.

**A breadcrumb appears once the user is below the top level of the hierarchy.** Landing pages and dashboards do not need one; the sub-sections reached from them do, and it appears on all of them.

**Its job is scent** — showing where the user came from and how to get back up. **It matters most on a deep link**, where someone arrives several layers down from a dashboard with no idea where they are.

## The primary action

**The page's primary action goes bottom right.** This is a starting position rather than a law — begin there, and let the user move it.

**The reason is tension.** With the header at the upper left and the action at the lower right, the two anchors pull against each other and the content being acted on sits balanced between them. A screen with everything crowded into one corner has no such balance.

## Filters and search

**Position them by the width of the content they act on, not by a breakpoint.**

- **A wide table with many columns → filters above the content.** There is no room beside it.
- **A narrow table, form, or list → filters in a left rail on the page.** This rail is a page-level region and is **not** the navigation rail; do not confuse the two or merge them.

**There is no pixel threshold for this.** It depends on the content of the screen, not on a viewport width. Anyone asking for the exact breakpoint has misunderstood the rule.

The filter controls themselves are owned by `recursica-skill-filters`.

## Dividing a page into regions

**Use space first, and usually only space.** Gutter tokens and vertical gutter tokens create the association between things that belong together and the separation between things that do not.

**A heading with ample space above it is the primary divider.** The space above a heading is what makes it own what follows.

**A horizontal rule may separate sections** where space alone is not enough.

**Form groups with a subheader chunk a long form** into readable buckets. Owned by `recursica-skill-forms`.

**NEVER divide regions with cards.** A card is for a plurality of objects and for presenting visual information. There is no such thing as a single card, and **form fields never go inside a card — that is a hard rule with no exceptions.** Owned by `recursica-skill-card`.

## Maximum width

**Page-level content has a maximum width, and it comes from the design system's layout rule.** It is not yours to set. **The house default is 1200**, and it applies to the **main content area only** — headers, footers, and other sticky chrome are not bound by it and may span the full viewport. Owned by `recursica-skill-responsive-behavior`, which also carries the tablet and small-device breakpoints.

**Space beyond it stays empty.** That is the correct outcome, not a gap to fill.

**MUST centre the main content horizontally.** Empty space to the right is not the same thing as empty space on both sides. A maximum width with no alignment leaves the content pinned wherever the layout happens to start it — against the left rail — so on a wide display every screen sits in the top-left corner with a third of the monitor blank beside it. That reads as a window that failed to resize, not as deliberate restraint. **What it is centred within is a choice, made once — see below.**

**This is the rule most often half-implemented**, because a maximum width alone looks correct at the viewport it was built on and only goes wrong on a larger one. **Check it at a viewport well beyond the maximum**, not at the one on your desk.

**Chrome is not bound by the maximum width** — a left rail or a header spans the full viewport as before, see above.

**Two centrings are both correct, and it is one decision per application:**

- **Centre the main content in the region left over beside the chrome.** The rail keeps the left edge and the content is centred in what remains.
- **Centre the main content in the whole viewport, ignoring the rail.** The content lands on the display's true centre and the rail overlaps the space to its left.

**Pick one and apply it to every page.** Neither is a compromise and neither needs justifying; what does need justifying is two screens in one application doing it differently — see convention 1 in `recursica-skill-system-conventions`.

**Expect a gap between the rail and the content on a very wide display**, whichever is chosen. That is the maximum width working, not a layout failure, and it is not a reason to stretch the content.

**Stretching content to fill the viewport is the anti-pattern.** It signals a fear of white space and a misunderstanding of how people read: over-long line lengths reduce scannability, and occupying space is not a reason to occupy space. See the line-length calculation in `recursica-skill-typography-semantics`.

**A wide table is the exception that proves it.** A list view with many columns may legitimately use the full viewport width; drilling into a single record's page returns to the normal layout structure and its max width.

## Loading

**A page that is loading shows nothing. Then it shows the content.** No spinner, no placeholder, no partial furniture.

**NEVER use skeletons or ghost text.** Grey bars standing in for text where text will be are a spinner in another costume — they add cognitive work to decode and deliver nothing in return. **They are not used in these applications.**

**Over roughly three seconds, a page-level spinner may be warranted** to show that something is happening. Understand what it buys: nothing about what is slow or how long remains. Owned by `recursica-skill-feedback-messaging`.

**The one place a spinner genuinely earns its place is a partially loaded page.** Where most of the page can be delivered immediately and a few regions lag — dashboard widgets loading at different speeds — show the fast content and let the stragglers spin, rather than making the user wait for everything.

**For ordinary page content, load the whole page at once.**

## Layering: when a region needs a surface

**Space first — see above.** Most regions need no surface at all.

**The page canvas is layer 0**, declared on the root element. Nothing else has to paint it.

**A region that reads as blurring into the one beside it needs one.** When adjacent regions have no separation and the reader cannot tell where one ends and the next begins, spacing has failed and the region needs its own layer.

**Three levels of containment, and they are not interchangeable:**

| Level            | What it is for                                                         | Owner                                      |
| ---------------- | ---------------------------------------------------------------------- | ------------------------------------------ |
| **No container** | The default. Space and type hierarchy do the grouping                  | `recursica-skill-layers`, and this skill   |
| **A layer**      | A region that needs its own surface but is not one of a set of peers   | `recursica-skill-layers`                   |
| **A card**       | A small, finite set of repeating peer objects, each carrying a graphic | `recursica-skill-card`, and its five tests |

**A layer is the middle option, and it is the one most often missed.** An agent that knows only "card or nothing" will box everything or box nothing. A region that deserves separation but has no peers — a chart and its labels, a group of summary figures — takes a layer.

**A layer does not waive the card tests.** Needing a surface is not evidence of peer-hood.

**Layers are their own system, and `recursica-skill-layers` owns it.** There are four levels, 0 to 3; **the root element is always layer 0**; every component resolves its colours from the layer it sits on; and **every layer property — surface, border, radius, padding, shadow — comes from the Forge theme and is never set by you.** Read that skill before opening a layer.

**Layers 0 and 1 do nearly all the work.** Layer 2 needs a stated reason and layer 3 is almost always a sign the structure is wrong.

**How the adapter exposes a layer is still unconfirmed** — the token contract and the `data-recursica-layer` attribute are real, but a `Layer` component is referenced in the component documentation without being exported. **Do not paint a surface with raw CSS variables or the underlying library's tokens**; raise it. See `recursica-skill-design-router`.

## Application chrome

**A control belonging to the application rather than the content goes in the header** — typically the upper right, or toward the bottom of a left rail alongside profile and settings.

**A theme control is chrome.** Light and dark mode is a property of the application, not of the page, so it never sits in the content area above a page title.

**It is a segmented control with icons, not a switch with a label.** A switch belongs in a form; see `recursica-skill-selection-controls`.

**Chrome does not scroll away with the content**, and it does not change from page to page.

**The top-left position holds the brand.** Almost always the client's logo — a variant puts the logo upper right and profile information upper left. See `recursica-skill-screen-priority`.

**The application has one scrollbar.** Sticky regions stay put while the page scrolls beneath them, and **no inner scrolling region is ever built.** Beyond a sticky header, sticky footer, and persistent nav rail, at most one further sticky element. Owned by `recursica-skill-screen-priority`.

**One scrollbar also means it does not appear when the content fits.** A page whose content is shorter than the viewport must not scroll at all. A few dozen pixels of travel on an otherwise-empty page is the same defect as a scrolling region, and it is more likely, because it comes from arithmetic rather than from a decision.

### Never size a region to the viewport from inside a layer

**A full-height shell, rail, or panel MUST NOT be given a bare viewport height** — `100vh` and its variants — **when it sits inside a declared layer.**

**A layer carries padding from the theme**, and `recursica-skill-layers` puts that padding beyond your reach on purpose. So a region asserting the full viewport height inside one comes out as the viewport *plus* that padding, top and bottom, and the page scrolls by exactly that much on every screen. The nav rail is where this shows up first, because a rail is the region most likely to be told to fill the height.

**Subtract the layer's own padding by reading its token, and never by measuring the rendered value.** A number read off the screen today is wrong after a re-theme, and hardcoding one is what `recursica-skill-layers` forbids — reading the token is what it expects.

**This is easy to miss in review and easy to catch by measurement.** Compare the document's scroll height against the viewport height on a page with little content: any positive difference is this bug. It also arrives without a code change, the moment the design system starts declaring a layer that was previously the caller's job — which is how it appeared here.

## Summary figures

**A group of summary figures is a set of peers** and gets one consistent treatment across all of them.

**Each is named by a noun phrase saying what is counted** — `Pending requests`, not `Total pending requests`; `Overdue requests`, not `Overdue`. See `recursica-skill-naming-terminology`.

**Figures shown together must reconcile.** Two counts side by side invite the reader to relate them, so a subset must be visibly a subset. A screen reporting something arithmetically impossible loses the reader's trust in every number on it.

**Do not define a term next to itself.** A figure captioned to explain its own label is a label that failed. Fix the label.

## What tells you a page was assembled rather than designed

The number one indicator, and the rest in order:

1. **Inconsistent white space between elements**, with no visual chunking of what belongs together against what does not. Things simply stack, with no consideration of how a person groups a page by eye.
2. **No ample white space above headings and subheadings**, so nothing owns what follows it.
3. **No layout grid underneath.** It is obvious when elements do not align to an eight- or twelve-column grid, and when gutters vary.
4. **Line lengths long for no reason.**
5. **Explanatory text standing in for a good label.**

## Not your decision

- **Spacing and gutter token values, the maximum content width, and the layout grid.** All from the design system.
- **Surface treatment of any layer or card** — elevation, border, padding.
- **Type styles and case** — `recursica-skill-typography-semantics`.

## Out of scope

- **What earns the strongest position, how much a screen may hold, and what to cut** — `recursica-skill-screen-priority`.
- **The layout grid itself**, its column count and behavior. A separate skill.
- **Whether a task belongs on this page** — `recursica-skill-panels-modals`.
- **Navigation structure and routes** — `recursica-skill-navigation`.
- **The filter controls** — `recursica-skill-filters`.

## Uncovered — ask, do not invent

- **The layout grid.** Eight or twelve columns is mentioned as the thing pages should align to, and it is explicitly deferred to its own skill. Until then, alignment is a stated requirement with no stated system.
- **Empty states where data exists but is zero.** Named as not covered.
- **Where global notifications or alerts sit in the page structure.** Named as not covered, and the banner component does not exist yet — see `recursica-skill-feedback-messaging`.
- **What may go in a footer** beyond a copyright notice, and when it is fixed rather than scrolled to.
- **Whether summary figures sit on layers or in cards.**

## Pre-flight checklist

- [ ] The shell was chosen deliberately: top nav for few items, left rail beyond about three or four, and the user was asked where the choice was not obvious.
- [ ] A left rail puts navigation at the top and profile and settings at the bottom.
- [ ] Every page has a footer.
- [ ] The page title sits in the page; repeating the navigation label was not treated as a defect.
- [ ] A breadcrumb appears on every page below the top level, and nowhere above it.
- [ ] The primary action sits bottom right unless the user moved it.
- [ ] Filters are positioned by the width of the content they act on, not by a breakpoint, and a filter rail is not merged with the navigation rail.
- [ ] Regions are divided by space and headings, with a rule only where space was not enough — and never by cards.
- [ ] No form field is inside a card.
- [ ] Content respects the system's maximum width, is centred — in the region beside the chrome or in the whole viewport, one choice for the application — and leftover space was
      left empty rather than filled — checked at a viewport well beyond the maximum, not only at the one it was built on.
- [ ] No region is sized to a bare viewport height inside a declared layer; the layer's padding was subtracted by
      reading its token, and a low-content page was measured to confirm the document does not scroll at all.
- [ ] A loading page shows nothing — no skeleton, no ghost text, and a spinner only past roughly three seconds or for lagging regions of an otherwise-loaded page.
- [ ] Layer 0 is declared once on the root and never re-declared; every region was tried with space first; a surface was added only where regions genuinely blurred, and a region without peers took a layer rather than a card.
- [ ] No surface was painted with raw CSS or the library's tokens; a missing `Layer` was raised.
- [ ] Application chrome sits in the header or rail, never in the content area.
- [ ] Summary figures share one treatment, are named as noun phrases, and reconcile with each other.
- [ ] White space is consistent, headings have room above them, and elements align to a grid.
- [ ] Nothing in the uncovered list was invented.
