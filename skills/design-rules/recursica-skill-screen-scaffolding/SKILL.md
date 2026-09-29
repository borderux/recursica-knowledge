---
name: recursica-skill-screen-scaffolding
description: House rules for composing a page — header, left rail, and footer, top navigation versus rail, page title and breadcrumb, summary figures, the primary action, filter placement, dividing regions with space, maximum content width, loading, and when a region needs a container. Use when laying out a page or its chrome. Not for whether a card is right — see recursica-skill-card.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Screen scaffolding

These are the house rules for how a page is put together, and what each region sits on. They are opinions, not neutral best practices — treat them as constraints.

## The three governing principles

1. **Space does the grouping.** Things are grouped by gutters (the gaps between columns and regions) and white space, not by drawn boundaries. Reaching for a container is nearly always a sign that the spacing was not done.
2. **Nothing is mandatory, but the pieces follow convention.** There is no fixed list of elements every page must have — the application's layout decides. What is fixed is what each piece is for, once you use it.
3. **Never fill space just because it is there.** Extra width is not a problem to solve. Stretching content to fill a wide viewport (the visible area of the browser window) is the clearest sign that a screen was assembled rather than designed.

## The shell

**Nothing is absolutely mandatory.** The application's layout decides. What follows is the usual shape, not a checklist.

**A header, and it is global.** It carries the primary navigation when the navigation is horizontal, and it usually holds access to the profile and menus.

**Or a left rail, instead of the header or alongside it.** A rail is a narrow vertical strip on the left. It may sit below a header, or there may be no header at all. Inside a rail, the primary navigation goes toward the top, and the profile and settings go toward the bottom — the same items a header would have carried, moved around.

**A footer on every page.** It may be as simple as a copyright notice, or more. It can be fixed at the bottom or reached by scrolling; both are acceptable.

**Page titles, sections, and any high-level summary content sit below the header**, in the page.

**The header, the navigation, and the main content all sit on layer 0, unless one of them needs containing.** (A layer is a numbered level that sets which colors the components inside it use; layer 0 is the page itself.) Where one does, that region is raised to layer 1 — the navigation or the main content, not both — and the direction is decided once for the whole application. Layer 0 is declared once, on the root element, and never declared again. Owned by `recursica-skill-layers`.

### Choosing between a top nav and a left rail

**The number of navigation items decides.**

- **Few items → a top nav.**
- **More than about three or four → a left rail**, which gives room to stack them. Desktop viewports are wider than they are tall, so vertical space for navigation is the scarcer resource. A rail spends horizontal space to buy it.

**Three or four is a default, not a hard limit.** It can be changed to fit the product's needs. Where the choice is not obvious, ask the user which they prefer, instead of quietly picking one — see `recursica-skill-design-router`.

## Titles and breadcrumbs

**The page title sits within the page**, not in the header.

**It may repeat the navigation label, and that is fine.** Identical text is not a defect here. How far the two may differ is owned by `recursica-skill-naming-terminology`.

**A breadcrumb (a trail of links showing where the page sits) appears once the user is below the top level of the hierarchy.** Landing pages and dashboards do not need one. The sub-sections reached from them do, and it appears on all of them.

**Its job is to give a sense of place** — showing where the user came from and how to get back up. It matters most on a deep link (a link that opens a page deep inside the application), where someone arrives several layers down from a dashboard with no idea where they are.

## The line under a heading

**A page title and a section heading each have a slot beneath them, and by default that slot is empty.** A well-named heading has already said what the region is. A line that says it again is not context — it is the heading a second time in smaller type, and every reader pays for it on every visit.

**The slot is for what the heading cannot carry**: an order, a limit, a consequence, or a state the reader would otherwise get wrong. `Newest first. Append-only: nothing here is ever rewritten.` under Changes earns its place — the sort order and the fact that nothing is rewritten cannot be worked out from the word. `The closed vocabulary the tagging rests on.` under Tags does not; it just defines the heading.

**The test is subtraction, and it takes one reading.** Delete the line. If the only thing lost is a restatement of the heading, it was noise, and it stays deleted. If a reader would now get something wrong, keep it — and cut it back to only that.

**A slot in the component is not a brief to fill it.** A `lede` or `note` prop exists because some headings need one. A prop that accepts a string is the single most common reason an explanation gets written that nobody asked for. So passing nothing is the normal case, not the unfinished one.

**This rule loses to the prop unless the prop goes.** It has been stated, read, and then broken across a dozen call sites in one application. That happened because writing a sentence into an available string prop is the easiest path every single time, and remembering a rule is not. So when you find this defect, delete the prop, not just the strings. A page or section heading component that takes no optional prose cannot grow it back next week; one that takes it will. Where a real exception appears later, add the slot back for that case, and let it be the deliberate act the rule always intended.

**The same reasoning applies to any slot for optional prose** — a field description, a card subtitle, a paragraph in an empty state. If the component offers somewhere to explain, something will get explained there.

**If the heading cannot stand without its explanation, the heading is wrong.** Fixing it is owned by `recursica-skill-naming-terminology`, whose rule against defining a term right next to itself covers page titles and section headings, not only field labels.

## The primary action

**The page's primary action goes at the bottom right.** This is a starting position rather than a law — start there, and let the user move it.

**The reason is tension.** With the header at the upper left and the action at the lower right, the two anchors pull against each other, and the content being acted on sits balanced between them. A screen with everything crowded into one corner has no such balance.

## Filters and search

**Position them by the width of the content they act on, not by a breakpoint.**

- **A wide table with many columns → filters above the content.** There is no room beside it.
- **A narrow table, form, or list → filters in a left rail on the page.** This rail is a region of the page, and it is not the navigation rail. Do not confuse the two, or merge them.

**There is no pixel threshold for this.** It depends on what is on the screen, not on a viewport width. Anyone asking for the exact breakpoint has misunderstood the rule.

The filter controls themselves are owned by `recursica-skill-filters`.

## Dividing a page into regions

**Use space first, and usually only space.** Gutter tokens and vertical gutter tokens (named design values, such as colors or sizes, set by the design system) create both the connection between things that belong together and the separation between things that do not.

**A heading with plenty of space above it is the main divider.** The space above a heading is what makes it own what follows.

**A horizontal rule may separate sections** where space alone is not enough.

**Form groups with a subheading break a long form** into readable chunks. Owned by `recursica-skill-forms`.

**NEVER divide regions with cards.** A card is for a plurality of objects (several of the same kind) and for showing visual information. There is no such thing as a single card, and form fields never go inside a card — that is a hard rule with no exceptions. Owned by `recursica-skill-card`.

## Maximum width

**Content at the page level has a maximum width, and it comes from the design system's layout rule.** It is not yours to set. The house default is 1200, and it applies to the main content area only. Headers, footers, and other sticky chrome (the frame around the content) are not limited by it, and may stretch across the full viewport. Owned by `recursica-skill-responsive-behavior`, which also has the tablet and small-device breakpoints.

**Space beyond it stays empty.** That is the correct result, not a gap to fill.

**MUST centre the main content horizontally.** Empty space on the right is not the same as empty space on both sides. A maximum width with no alignment leaves the content stuck wherever the layout happens to start it — against the left rail. So on a wide display, every screen sits in the top-left corner with a third of the monitor blank beside it. That looks like a window that failed to resize, not like deliberate restraint. What it is centred within is a choice, made once — see below.

**This is the rule most often half done**, because a maximum width alone looks correct at the viewport it was built on, and only goes wrong on a larger one. Check it at a viewport well beyond the maximum, not just at the one on your desk.

**Chrome is not limited by the maximum width** — a left rail or a header stretches across the full viewport as before; see above.

**Two ways of centring are both correct, and it is one decision per application:**

- **Centre the main content in the space left over beside the chrome.** The rail keeps the left edge, and the content is centred in what remains.
- **Centre the main content in the whole viewport, ignoring the rail.** The content lands on the true centre of the display, and the rail overlaps the space to its left.

**Pick one and use it on every page.** Neither is a compromise, and neither needs justifying. What does need justifying is two screens in one application doing it differently — see convention 1 in `recursica-skill-system-conventions`.

**Expect a gap between the rail and the content on a very wide display**, whichever you choose. That is the maximum width working, not a layout failure, and it is not a reason to stretch the content.

**Stretching content to fill the viewport is the anti-pattern.** It shows a fear of white space and a misunderstanding of how people read: lines that are too long are harder to scan, and having space is not a reason to fill it. See the line-length calculation in `recursica-skill-typography-semantics`.

**A wide table is the exception that proves the rule.** A list view with many columns may properly use the full viewport width. Clicking into a single record's page goes back to the normal layout structure and its maximum width.

## Loading

**A page that is loading shows nothing. Then it shows the content.** No spinner, no placeholders, no partial furniture.

**NEVER use skeletons (gray placeholder shapes shown while content loads) or ghost text.** Gray bars standing in where text will be are a spinner in another costume. They add mental work to decode and give nothing back. They are not used in these applications.

**Past about three seconds, a page-level spinner may be called for**, to show that something is happening. Understand what it buys you: nothing about what is slow, or how long is left. Owned by `recursica-skill-feedback-messaging`.

**The one place a spinner really earns its place is a partly loaded page.** Where most of the page can be shown right away and a few regions lag behind — dashboard widgets loading at different speeds — show the fast content and let the slow parts spin, instead of making the user wait for everything.

**For ordinary page content, load the whole page at once.**

## Layering: when a region needs a surface

**Space first — see above.** Most regions need no surface (a region that holds content, such as a page, panel, or modal) at all.

**The page canvas is layer 0**, declared on the root element. Nothing else has to paint it.

**A region that seems to blur into the one beside it needs one.** When neighboring regions have no separation, and the reader cannot tell where one ends and the next begins, the spacing has failed, and the region needs its own layer.

**There are three levels of containment, and one cannot stand in for another:**

| Level            | What it is for                                                         | Owner                                      |
| ---------------- | ---------------------------------------------------------------------- | ------------------------------------------ |
| **No container** | The default. Space and type hierarchy do the grouping                  | `recursica-skill-layers`, and this skill   |
| **A layer**      | A region that needs its own surface but is not one of a set of peers   | `recursica-skill-layers`                   |
| **A card**       | A small, finite set of repeating peer objects, each carrying a graphic | `recursica-skill-card`, and its five tests |

A peer is an object of the same kind as the ones around it, such as a row in a list.

**A layer is the middle option, and it is the one most often missed.** An agent that knows only "card or nothing" will box everything, or box nothing. A region that deserves separation but has no peers — a chart and its labels, a group of summary figures — gets a layer.

**A layer does not excuse something from the card tests.** Needing a surface does not make something a peer.

**Layers are their own system, and `recursica-skill-layers` owns it.** There are four levels, 0 to 3. **The root element is always layer 0. Every component takes its colours from the layer it sits on. And every layer property — surface, border, radius, padding, shadow — comes from the Forge theme, and you never set it.** Read that skill before opening a layer.

**Layers 0 and 1 do nearly all the work.** Layer 2 needs a stated reason, and layer 3 is almost always a sign that the structure is wrong.

**How the adapter offers a layer is still not confirmed.** The token contract and the `data-recursica-layer` attribute are real, but a `Layer` component is mentioned in the component documentation without being exported. Do not paint a surface with raw CSS variables or the underlying library's tokens; raise it instead. See `recursica-skill-design-router`.

## Application chrome

**A control that belongs to the application rather than to the content goes in the header** — usually the upper right, or toward the bottom of a left rail beside the profile and settings.

**A theme control is chrome.** Light and dark mode is a property of the application, not of the page, so it never sits in the content area above a page title.

**It is a segmented control with icons (a row of joined buttons, one of which is selected), not a switch with a label.** A switch belongs in a form — see `recursica-skill-selection-controls`.

**Chrome does not scroll away with the content**, and it does not change from page to page.

**The top-left position holds the brand.** Almost always, that is the client's logo — one variation puts the logo in the upper right and the profile information in the upper left. See `recursica-skill-screen-priority`.

**The application has one scrollbar.** Sticky regions stay in place while the page scrolls beneath them, and no inner scrolling region is ever built. Beyond a sticky header, a sticky footer, and a permanent navigation rail, there is at most one more sticky element. Owned by `recursica-skill-screen-priority`.

**One scrollbar also means it does not appear when the content fits.** A page whose content is shorter than the viewport must not scroll at all. A few dozen pixels of movement on an otherwise empty page is the same defect as a scrolling region — and it is more likely, because it comes from arithmetic rather than from a decision.

### Never size a region to the viewport from inside a layer

**A full-height shell, rail, or panel MUST NOT be given a bare viewport height** — `100vh` and its variations — when it sits inside a declared layer.

**A layer carries padding from the theme**, and `recursica-skill-layers` puts that padding out of your reach on purpose. So a region set to the full viewport height inside one comes out as the viewport _plus_ that padding, at the top and the bottom, and the page scrolls by exactly that much on every screen. The navigation rail is where this shows up first, because a rail is the region most likely to be told to fill the height.

**Subtract the layer's own padding by reading its token, and never by measuring the value on screen.** A number read off the screen today is wrong after the theme changes. Hardcoding one is what `recursica-skill-layers` forbids — reading the token is what it expects.

**This is easy to miss in review and easy to catch by measuring.** On a page with little content, compare the document's scroll height against the viewport height: any positive difference is this bug. It can also appear without any code change, the moment the design system starts declaring a layer that used to be the caller's job — which is how it appeared here.

## Summary figures

### First: does the screen need them at all?

**A group of figures is not free furniture at the top of a page.** It takes the strongest region of the screen — above the content, first in reading order — so it has to be worth more than whatever it pushed aside. Most pages do not need one.

**There are three tests, and it needs all three:**

1. **The dataset is large enough that its shape cannot be seen.** A count earns its place by telling the reader something the content cannot. With eleven rows in a table below it, the table has already said it — the reader can see eleven. Ask what the realistic maximum is, not the theoretical one: if the answer is dozens, the table is enough.
2. **The number changes.** A figure exists to be read again on the next visit and found different. One that reports the same value every time is a label pretending to be data.
3. **It guides the next action.** Because of it, the reader should be able to do something differently.

**NEVER show a figure that is always zero by its nature.** A count of a state that nothing ever reaches is not a reassuring zero. It is a permanent hole in the layout that the reader learns to skip — and once they have learned to skip it, they skip the box beside it too. A zero that will one day be more than zero belongs in the content, where its arrival can be seen in context.

**Two or three figures that pass are a better screen than six where three are always zero.** The problem is not the number of boxes. It is that padding out the row teaches the reader that the whole row is decoration.

**A count that only ever repeats a row count is the most common case.** `Speaker records: 11` above a table of eleven speakers is just the table's own length in a box. Delete it — the subtraction test under "The line under a heading" applies here without change.

### Then: how they are built

**A group of summary figures is a set of peers**, and every figure in it gets the same treatment.

**Each is named by a noun phrase saying what is counted** — `Pending requests`, not `Total pending requests`; `Overdue requests`, not `Overdue`. See `recursica-skill-naming-terminology`.

**Figures shown together must agree with each other.** Two counts side by side invite the reader to compare them, so a subset must clearly look like a subset. A screen that reports something mathematically impossible loses the reader's trust in every number on it.

**Do not define a term right next to itself.** A figure with a caption explaining its own label is a label that failed. Fix the label.

## What tells you a page was assembled rather than designed

The number one sign, and then the rest, in order:

1. **Uneven white space between elements**, with no visual grouping of what belongs together versus what does not. Things just stack, with no thought for how a person groups a page by eye.
2. **Not enough white space above headings and subheadings**, so nothing owns what follows it.
3. **No layout grid underneath.** It is obvious when elements do not line up to an eight- or twelve-column grid, and when the gutters vary.
4. **Lines that are long for no reason.**
5. **Explanatory text standing in for a good heading or label** — most often a line under a page title or section heading that only repeats it.

## Not your decision

- **The spacing and gutter token values, the maximum content width, and the layout grid.** All of these come from the design system.
- **How the surface of any layer or card looks** — elevation, border, padding.
- **Type styles and capitalization** — `recursica-skill-typography-semantics`.

## Out of scope

- **What earns the strongest position, how much a screen may hold, and what to cut** — `recursica-skill-screen-priority`.
- **The layout grid itself**, how many columns it has, and how it behaves. A separate skill.
- **Whether a task belongs on this page** — `recursica-skill-panels-modals`.
- **Navigation structure and routes** — `recursica-skill-navigation`.
- **The filter controls** — `recursica-skill-filters`.

## Uncovered — ask, do not invent

- **The layout grid.** An eight- or twelve-column grid is mentioned as the thing pages should line up to, and it is openly left to its own skill. Until then, lining things up is a stated requirement with no stated system.
- **Empty states where data exists but is zero.** Named as not covered.
- **Where global notifications or alerts sit in the page structure.** Named as not covered, and the banner component does not exist yet — see `recursica-skill-feedback-messaging`.
- **What may go in a footer** beyond a copyright notice, and when it is fixed in place rather than reached by scrolling.
- **Whether summary figures sit on layers or in cards.**

## Pre-flight checklist

- [ ] You chose the shell on purpose: a top nav for few items, and a left rail beyond about three or four. You asked the user where the choice was not obvious.
- [ ] A left rail puts navigation at the top, and the profile and settings at the bottom.
- [ ] Every page has a footer, or you said why it does not.
- [ ] The page title sits in the page, and you did not treat repeating the navigation label as a defect.
- [ ] Every line under a page title or section heading survived being deleted — it carries an order, limit, consequence, or state that the heading cannot. No `lede` or `note` is filled in just because the prop exists. Where you found the defect across several call sites, you removed the prop itself, not only its strings.
- [ ] A breadcrumb appears on every page below the top level, and nowhere above it.
- [ ] The primary action sits at the bottom right, unless the user moved it.
- [ ] Filters are placed by the width of the content they act on, not by a breakpoint, and no filter rail is merged with the navigation rail.
- [ ] Regions are divided by space and headings, with a rule only where space was not enough — and never by cards.
- [ ] No form field is inside a card.
- [ ] Content stays within the system's maximum width and is centred — either in the space beside the chrome or in the whole viewport, as one choice for the whole application. Leftover space is left empty, not filled. You checked this at a viewport well beyond the maximum, not only at the one it was built on.
- [ ] No region is sized to a bare viewport height inside a declared layer. You subtracted the layer's padding by reading its token, and you measured a page with little content to confirm the document does not scroll at all.
- [ ] A loading page shows nothing — no skeleton, no ghost text — and a spinner appears only past about three seconds, or for slow regions of an otherwise loaded page.
- [ ] Layer 0 is declared once on the root and never declared again. You tried every region with space first, added a surface only where regions really blurred together, and gave a region without peers a layer instead of a card.
- [ ] No surface is painted with raw CSS or the library's tokens, and you raised any missing `Layer`.
- [ ] Application chrome sits in the header or the rail, never in the content area.
- [ ] Every summary figure passed all three tests: the dataset is large enough that the content does not already show its shape, the number changes, and it guides an action. None is always zero by its nature, and none just repeats the row count of a table below it. Where none passed, there is no group of figures.
- [ ] The summary figures share one treatment, are named as noun phrases, and agree with each other.
- [ ] White space is even, headings have room above them, and elements line up to a grid.
- [ ] You invented nothing from the uncovered list.
