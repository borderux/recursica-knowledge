---
name: recursica-skill-screen-scaffolding
description: House rules for composing a page — header, left rail, and footer, top navigation versus rail, page title and breadcrumb, KPI tiles, the primary action, filter placement, dividing regions with space, maximum content width, loading, and when a region needs a container. Use when laying out a page or the header, navigation and footer around the page. Not for whether a card is right — see recursica-skill-card.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Screen scaffolding

Treat every rule below as a constraint. The rules are house opinions, not neutral best practices. The rules cover how a page is put together. The rules also cover the container, if any, that each region of the page sits on.

## The three governing principles

1. **Group elements with gutters (the gaps between columns and regions) and white space, not with drawn boundaries.** Borders and boxes around a region are examples of drawn boundaries. Adding a container is nearly always a sign that the spacing was not done.
2. **Let the application's layout decide which elements a page has.** No page element is mandatory, and no fixed list of elements applies to every page. Once a page uses an element, the element follows convention, and the purpose of the element is fixed. For example, most pages do not need KPI tiles. A page that shows KPI tiles uses the tiles the usual way, for counts and totals.
3. **Never fill space only because the space is there.** Extra width is not a problem to solve. Stretching content to fill a wide viewport is the clearest sign that a screen was assembled rather than designed.

## App shell

An app shell is the header, the left rail and the footer around the page content.

**Let the application's layout decide which parts of the app shell appear.** No part of the app shell is absolutely mandatory. The rules below describe the usual layout, not a checklist.

**An application can have a header. Make the header global.** Put the primary navigation in the header when the navigation runs horizontally. For example, Orders, Customers and Reports sit in a row. In most applications, the header also holds the controls that open the persona's profile and menus.

**A left rail can replace the header or appear alongside the header.** A left rail is a narrow vertical strip down the left side of the page. A left rail can sit below a header, or the application can have no header at all. A left rail holds the same items a header would hold, in different positions. In a left rail, put:

- the primary navigation toward the top
- the profile and settings toward the bottom

**Put a footer on every page.** A footer can be as simple as a copyright notice, or hold more content. Both footer positions are acceptable:

- fixed at the bottom of the screen
- shown when the persona scrolls down

**Put page titles, page sections and any high-level summary content below the header, inside the page.**

**Put the header, the navigation and the main content on one layer (a numbered background level, 0 to 3, that sets the colors of the components on that level), layer 0.** Layer 0 is the page itself. Keep all three regions on layer 0 unless one of the three regions needs a container.

- When one region needs a container, raise that region to layer 1.
- Raise the navigation or the main content, not both.
- Decide once, for the whole application, which of the two regions is raised.

For example, a left rail with a separate background sits on layer 1, and the main content stays on layer 0.

**Declare layer 0 once, on the root element (the outermost element of the page), and never declare layer 0 again.** `recursica-skill-layers` sets the layer rules.

### Top navigation or left rail

**Choose between a top navigation bar and a left rail by the number of navigation items.**

- **A few navigation items → a top navigation bar.** For example, Home, Orders and Reports fit a top navigation bar.
- **More than about three or four navigation items → a left rail.** A left rail has room to stack the items. A desktop viewport is wider than the viewport is tall, so vertical space for navigation is the scarcer resource. A left rail gives up horizontal width to get more vertical room.

**Treat three or four items as a default, not a hard limit.** The default can change to fit the product's needs. If the choice is not obvious, confirm the choice with the user before picking either option. See `recursica-skill-design-router`.

## Titles and breadcrumbs

**Put the page title in the page, not in the header.**

**Let the page title repeat the navigation label.** For example, the Orders link in the navigation opens a page titled Orders. A page title that matches the navigation label is not a defect. `recursica-skill-naming-terminology` decides how far the page title and the navigation label may differ.

**Show a breadcrumb once the persona is below the top level of the application's page hierarchy.** Landing pages and dashboards do not need a breadcrumb. Every sub-section reached from a landing page or a dashboard needs a breadcrumb.

**A breadcrumb shows the persona where the persona is in the application.** The breadcrumb also shows where the persona came from and how to get back up the page hierarchy. A breadcrumb matters most after a deep link (a link that opens a page deep inside the application). A link in an email is one example. A persona who follows a deep link lands several levels below a dashboard. The persona then has no idea where the page sits in the application.

## The line under a heading

**Leave the line under a page title or a section heading empty by default.** A page title and a section heading each have room for a line of text below the heading. A well-named heading already says what the region is. A line that repeats the heading is the heading again in smaller type. The repeated line adds no context, and every persona spends time on the repeated line on every visit.

**Use the line under a heading only for information the heading cannot hold:**

- an order
- a limit
- a consequence
- a state the persona would otherwise get wrong

For example, keep the line `Newest first. Append-only: nothing here is ever rewritten.` under a heading named Changes. The word Changes gives neither the sort order nor the fact that no entry is ever rewritten. Delete the line `The closed vocabulary the tagging rests on.` under a heading named Tags. The Tags line only defines the word Tags.

**Check each line under a heading with the subtraction test.** The subtraction test takes one reading:

1. Delete the line.
2. If the line only restated the heading, the line added nothing. Leave the line deleted.
3. If a persona would now make a mistake, put the line back. Then cut the restored line down to only the information that prevents the mistake.

**Do not treat a component's setting for optional text as an instruction to fill the setting.** For example, a heading component has an optional text setting because some headings need a line of text. An available text setting is the single most common reason someone writes an explanation nobody asked for. Leaving the setting empty is the normal case, not the unfinished one.

**If an optional text setting holds an explanation nobody asked for, delete the setting.** Deleting only the text in the setting is not enough. The rule against filling an optional text setting fails unless the setting is removed. A heading component that keeps the setting will get the text back. A page or section heading component with no setting for optional text cannot have the text added back next week. Writing a sentence into an available text setting is always easier than remembering a rule. In one application, the rule was stated and read, then broken in a dozen places. When a real exception appears later, add the setting back for the exception. Adding the setting back is then the deliberate act the rule always intended.

**Apply the reasoning about a heading's optional text to every setting for optional text.** Examples include a field description, a card subtitle and a paragraph in an empty state. When a component offers a place for an explanation, someone will write an explanation there.

**Fix a heading that cannot be understood without an explanation.** A heading that needs an explanation is the wrong heading. `recursica-skill-naming-terminology` says how to fix the heading. The naming skill has a rule against defining a term right next to the term. The naming rule covers page titles and section headings, not only field labels.

## The primary action

**Put the page's primary action at the bottom right.** For example, a Save button goes at the bottom right of a page for editing an order. Treat the bottom right as a starting position, not a fixed rule. Let the user move the primary action.

**The bottom-right position balances the page.** The header sits at the upper left, and the primary action sits at the lower right. The content the action works on sits between the header and the action. A screen with every element crowded into one corner is unbalanced.

## Filters and search

**Place filters and search by the width of the content the filters act on, not by a breakpoint.**

- **A wide table with many columns → filters above the content.** A wide table leaves no room beside the table.
- **A narrow table, form, or list → filters in a left rail on the page.** The filter rail is a region of the page. The filter rail is not the navigation rail, the left rail that holds the primary navigation. Do not confuse the filter rail with the navigation rail, and do not merge the two rails.

**Do not use a pixel threshold to decide where filters go.** The content on the screen decides, not a viewport width. A request for the exact breakpoint misunderstands the rule.

`recursica-skill-filters` sets the rules for the filter controls.

## Dividing a page into regions

**Divide regions with space first.** In most cases, use only space. Gutter tokens and vertical gutter tokens (named design values, such as colors or sizes, set by the design system) both connect elements that belong together and separate elements that do not.

**Use a heading with plenty of space above the heading as the main divider.** The space above a heading groups the content that follows under that heading.

**A horizontal rule may separate sections where space alone is not enough.**

**Form groups, each with a subheading, break a long form into sections that are easier to read.** `recursica-skill-forms` sets the rules for form groups.

**NEVER divide regions with cards.** A card is for several objects of the same kind, and for showing visual information. Two card rules have no exceptions:

- A card never appears alone.
- Form fields never go inside a card.

`recursica-skill-card` sets the card rules.

## Maximum width

**Keep content at the page level within the maximum width that the design system's layout rule sets.** Do not set a different maximum width. The house default is 1200. `recursica-skill-responsive-behavior` sets the maximum width. The same skill also sets the tablet and small-device breakpoints.

**The maximum width applies to the main content area only, not to the chrome (the header, navigation and footer around the content).** Headers, footers and other sticky chrome may stretch across the full viewport. A left rail or a header stretches across the full viewport.

**Leave the space beyond the maximum width empty.** Empty space beyond the maximum width is the correct result, not a gap to fill.

**The main content MUST be centered horizontally.** A maximum width with no centering leaves the content wherever the layout starts the content, against the left rail. On a wide display, every screen then sits in the top-left corner. A third of the monitor stays blank beside the content. Empty space on the right is not the same as empty space on both sides. The screen looks like a window that failed to resize, not like deliberate restraint.

**Check the centering at a viewport well beyond the maximum width.** Do not check only at the viewport the screen was built on. Centering is the rule most often left out when a maximum width is set. A maximum width with no centering looks correct at the viewport the screen was built on. The missing centering shows only on a larger viewport.

**Two ways of centering are both correct:**

- **Center the main content in the space left over beside the chrome.** The left rail keeps the left edge. The main content is centered in the remaining width.
- **Center the main content in the whole viewport, ignoring the left rail.** The main content lands on the true center of the display. The left rail overlaps the empty space to the left of the content.

**Pick one way of centering for the whole application, and use the same way on every page.** Neither way is a compromise, and neither way needs a reason. Two screens in one application that center the content differently do need a reason. See convention 1 in `recursica-skill-system-conventions`.

**Expect a gap between the left rail and the content on a very wide display, with either way of centering.** The gap means the maximum width is working, not that the layout failed. The gap is not a reason to stretch the content.

**Do not stretch content to fill the viewport.** Stretching content to fill the viewport is the anti-pattern. Stretched content shows a fear of white space and a misunderstanding of how people read. Lines that are too long are harder to scan. See the line-length calculation in `recursica-skill-typography-semantics`.

**A wide table is the one exception to the maximum width.** A list view with many columns, such as an Orders table, may use the full viewport width. A single record's page, opened from the list view, goes back to the normal layout and the normal maximum width.

## Loading

**While a page loads, show nothing. Then show the content.** A loading page shows no spinner, no placeholders, and no partly loaded layout.

**NEVER use skeleton screens.** A skeleton screen, also called a skeleton loader or ghost elements, shows gray placeholder shapes where content will appear. The persona has to work out what the gray shapes are. The gray shapes tell the persona nothing about the content.

**After about three seconds of loading, a page may need a page-level spinner.** A spinner tells the persona only that the page is still working. A spinner says nothing about what is slow, or how long the wait will be. `recursica-skill-feedback-messaging` sets the spinner rules.

**A spinner is clearly right in one place: a partly loaded page.** On a partly loaded page, most of the page is ready right away, and a few regions load later. For example, the widgets on a dashboard may load at different speeds.

- Show the content that is ready.
- Show a spinner in each slow region.
- Do not make the persona wait for the whole of a partly loaded page.

**For ordinary page content, load the whole page at once.**

## Containers and layers

**Separate regions with space first, as described under "Dividing a page into regions".** Most regions need no separate background at all.

**Declare the page canvas, the background of the whole page, as layer 0 on the root element.** No other element has to paint the page canvas.

**Give a region a separate background when the persona cannot tell the region apart from the neighboring region.** When neighboring regions have no separation, and the persona cannot see the boundary between the regions, the spacing has failed. The region then needs a separate layer.

**A region has three container options, and no option can replace another.** A peer is an object of the same kind as the objects around the peer. A row in a list is one example of a peer.

| Option           | Use                                                                | Owner                                             |
| ---------------- | ------------------------------------------------------------------ | ------------------------------------------------- |
| **No container** | The default. Space and type hierarchy group the content            | `recursica-skill-layers`, and this skill          |
| **A layer**      | A region that needs a separate background but has no peers         | `recursica-skill-layers`                          |
| **A card**       | A small, finite set of repeating peer objects, each with a graphic | `recursica-skill-card`, and the card's five tests |

**A layer is the middle option, and the option most often missed.** An agent that knows only "a card or nothing" puts every region in a container, or puts no region in a container. Give a layer to a region that needs separation but has no peers. A chart with the chart's labels, or a row of KPI tiles, is a region of that kind.

**A layer does not excuse a region from the card tests.** Needing a separate background does not make a region a peer.

**Read `recursica-skill-layers` before adding a layer.** Layers are a separate system, and `recursica-skill-layers` sets the layer rules. Layers have four levels, 0 to 3.

**Every component takes the component's colors from the layer the component sits on.**

**Never set a layer property.** Every layer property comes from the theme in Theme Forge. Background color (the `surface` property), border, radius, padding and shadow are all layer properties.

**Layers 0 and 1 cover nearly every region.** Layer 2 needs a stated reason. Layer 3 is almost always a sign that the page structure is wrong.

**Declare a layer with the layer attribute, `data-recursica-layer`, on the container.** A layer is a style applied to a container, not a component. The theme defines the tokens for every layer. Do not paint the background of the page, or of any page region, with either kind of value:

- style variables used directly
- the tokens of the code library under the adapter (the Recursica component library for one framework, such as Mantine or Angular Material)

See `recursica-skill-layers`.

## Application chrome

**Put a control that belongs to the application, not to the page content, in the header.** The usual place is the upper right of the header. In a left rail, the usual place is toward the bottom, beside the profile and settings.

**Treat a theme control (the control that switches between light and dark mode) as chrome.** Light and dark mode belongs to the application, not to the page. Never put a theme control in the content area above a page title.

**Use a segmented control with icons for a theme control, not a switch with a label.** A switch belongs in a form. See `recursica-skill-selection-controls`.

**Keep chrome in place when the content scrolls, and keep chrome the same on every page.**

**Put the brand at the top left.** The brand is almost always the client's logo. One variation puts the logo in the upper right and the profile information in the upper left. See `recursica-skill-screen-priority`.

**Give the application one scrollbar.** Sticky regions stay in place while the page scrolls beneath the sticky regions.

- Never build a region that scrolls inside the page.
- Besides a sticky header, a sticky footer and a permanent navigation rail, allow at most one more sticky element.

`recursica-skill-screen-priority` sets the scrollbar and sticky-element rules.

**Do not let a page scroll when the content fits.** A page whose content is shorter than the viewport must not scroll at all. A small scroll of a few dozen pixels on a page with almost no content is a defect. The small scroll is the same defect as a region that scrolls inside the page. The small scroll is more likely than a region that scrolls inside the page. A sizing calculation causes the small scroll, not a decision.

### Full-height regions inside a layer

**Inside a declared layer, a full-height app shell, rail, or panel MUST NOT be set to the bare viewport height.** The bare viewport height is the viewport height with nothing subtracted. The rule covers the bare viewport height in any form.

**A layer has padding set by the theme.** `recursica-skill-layers` keeps the layer padding out of the application's control on purpose. A region set to the full viewport height inside a layer ends up taller than the viewport. The region's height is the viewport height _plus_ the layer padding, at the top and the bottom. The page then scrolls by exactly the padding on every screen. The extra scroll shows up first in the navigation rail, the region most often set to fill the height.

**Subtract the layer padding by reading the layer's padding token, and never by measuring the padding on screen.** A number measured on screen today is wrong after the theme changes. `recursica-skill-layers` forbids hardcoding a measured number, and expects the code to read the padding token.

**On a page with little content, compare the full scrolling height of the page with the viewport height.** Any positive difference is the extra scroll from the layer padding. The extra scroll is easy to miss in review and easy to catch by measuring. The extra scroll can also appear without any change to the application's code. The extra scroll appears as soon as the design system starts declaring a layer that the application used to declare. The rule against a bare viewport height came from one case. In that case, a new layer declaration in the design system caused the extra scroll.

## KPI tiles

### When to show KPI tiles

**Most pages do not need KPI tiles.** KPI tiles are the counts and totals shown at the top of a page, such as `Open orders: 12`. KPI tiles take the top of the page and push the content down. KPI tiles sit above the content and are read first.

**Add KPI tiles only when the tiles pass all three tests:**

1. **The dataset is too large to take in at a glance.** A count belongs on the page only when the count tells the persona a fact the page content cannot. Above a table of eleven rows, the table has already given the count, because the persona can see eleven rows. Confirm with the user the realistic maximum number of records, not the theoretical maximum. If the realistic maximum is dozens, the table is enough.
2. **The number changes.** A KPI tile exists to be read again on the next visit and found different. A KPI tile that reports the same value every time is a label, not data.
3. **The tile guides the next action.** After reading the tile, the persona should be able to act differently. For example, `Overdue requests: 4` tells the persona to follow up on four requests.

**NEVER show a KPI tile that is always zero by nature.** A count of a state that no item ever reaches is not a reassuring zero. A KPI tile that is always zero is a permanently empty tile that the persona learns to skip. Once the persona skips that tile, the persona skips the box beside that tile too. Put a zero that will one day be more than zero in the page content. In the page content, the persona can see the change in context.

**Two or three tiles that pass are a better screen than six tiles where three are always zero.** The problem is not the number of tiles. Extra tiles added only to fill the row teach the persona that the whole row is decoration.

**Delete a KPI tile that only repeats a table's row count.** A tile that repeats the row count is the most common failing tile. For example, `Speaker records: 11` above a table of eleven speakers only repeats the table's row count in a box. Apply the subtraction test from "The line under a heading" to KPI tiles without change.

### How to build KPI tiles

**Give every tile in a row of KPI tiles the same treatment.** A row of KPI tiles is a set of peers (objects of the same kind, such as rows in a list).

**Name each KPI tile with a noun phrase that says what the tile counts.** Write `Pending requests`, not `Total pending requests`. Write `Overdue requests`, not `Overdue`. See `recursica-skill-naming-terminology`.

**KPI tiles shown together must agree with each other.** The persona compares two counts shown side by side. A tile that counts a subset must clearly look like a subset. A screen that reports a mathematically impossible result loses the persona's trust in every number on the screen. For example, `Overdue requests: 14` beside `Open requests: 9` is impossible when only an open request can be overdue.

**Do not define a term right next to the term.** A KPI tile with a caption that explains the tile's own label has the wrong label. Fix the label.

## Signs a page was assembled rather than designed

The list runs in order, from the strongest sign to the weakest.

1. **Uneven white space between elements.** The spacing shows no grouping of the elements that belong together and the elements that do not. Elements stack one after another, with no thought for how a person groups a page by eye.
2. **Not enough white space above headings and subheadings.** No heading groups the content that follows the heading.
3. **No layout grid under the page.** Elements that do not line up to an eight- or twelve-column grid are obvious, and so are gutters that vary.
4. **Lines of text that are long for no reason.**
5. **Explanatory text in place of a good heading or label.** The most common case is a line that only repeats the page title or section heading above the line.

## Set by the theme or the component

- **The spacing and gutter token values, the maximum content width, and the layout grid.** All three come from the design system.
- **The look of the background of every layer or card**: elevation, border and padding.
- **Type styles and capitalization** — `recursica-skill-typography-semantics`.

## Out of scope

- **What gets the strongest position, how much a screen may hold, and what to cut** — `recursica-skill-screen-priority`.
- **The layout grid**, the number of columns in the grid, and how the grid behaves. The layout grid is left to a separate skill.
- **Whether a task belongs on this page** — `recursica-skill-panels-modals`.
- **Navigation structure and routes** — `recursica-skill-navigation`.
- **The filter controls** — `recursica-skill-filters`.

## Open questions

- **The layout grid.** This skill names an eight- or twelve-column grid as the grid pages should line up to. This skill leaves the grid to a separate skill. Until a layout-grid skill exists, lining up elements is a stated requirement with no stated grid.
- **Empty states where data exists but is zero.** This skill does not cover the case.
- **Where global notifications or alerts sit in the page structure.** This skill does not cover the case. See `recursica-skill-feedback-messaging`.
- **What may go in a footer** beyond a copyright notice. The footer question also covers when a footer stays fixed in place instead of appearing when the persona scrolls down.
- **Whether KPI tiles sit on layers or in cards.**

## Pre-flight checklist

- [ ] The app shell matches the number of navigation items. A few items get a top navigation bar. More than about three or four items get a left rail. Where the choice was not obvious, the user chose.
- [ ] A left rail puts navigation at the top, and the profile and settings at the bottom.
- [ ] Every page has a footer, or a reason for leaving the footer out is provided.
- [ ] The page title sits in the page. A page title that repeats the navigation label is left unchanged.
- [ ] Every line under a page title or section heading passes the subtraction test. Each line gives an order, a limit, a consequence, or a state that the heading cannot. No optional text under a heading is filled in only because the setting exists. If the defect appeared in several places in the code, the setting itself is removed. Removing only the text in the setting is not enough.
- [ ] A breadcrumb appears on every page below the top level, and on no page at the top level.
- [ ] The primary action sits at the bottom right, unless the user moved the primary action.
- [ ] Filters are placed by the width of the content the filters act on, not by a breakpoint. No filter rail is merged with the navigation rail.
- [ ] Regions are divided by space and headings, with a horizontal rule only where space was not enough. No region is divided by cards.
- [ ] No form field is inside a card.
- [ ] Content stays within the design system's maximum width. The content is centered, either in the space beside the chrome or in the whole viewport. The whole application uses one way of centering. Leftover space is left empty, not filled. The centering holds at the viewport the screen was built on and at a viewport well beyond the maximum width.
- [ ] No region is sized to a bare viewport height inside a declared layer. Every full-height region subtracts the layer padding by reading the layer's padding token. A page with little content does not scroll at all when measured.
- [ ] A loading page shows nothing, with no skeleton screen. A spinner appears only past about three seconds, or for slow regions of an otherwise loaded page.
- [ ] Layer 0 is declared once, on the root element, and never declared again. Every region uses space first. A separate background appears only where regions could not be told apart. A region without peers has a layer instead of a card.
- [ ] No background of the page, or of any region of the page, is painted with stylesheet rules written by hand. No page or region background is painted with the tokens of the code library under the adapter. Every layer is declared with the layer attribute.
- [ ] Application chrome sits in the header or the rail, never in the content area.
- [ ] Every KPI tile passed all three tests. The dataset is too large to take in at a glance, the number changes, and the tile guides an action. No KPI tile is always zero by nature. No KPI tile only repeats the row count of a table below the tile. Where no KPI tile passed, the page has no row of KPI tiles.
- [ ] The KPI tiles share one treatment, are named as noun phrases, and agree with each other.
- [ ] White space is even, every heading has room above the heading, and elements line up to a grid.
- [ ] Open questions were asked about, not decided: the layout grid, empty states where data exists but is zero, where global notifications or alerts sit, what may go in a footer, and whether KPI tiles sit on layers or in cards.
