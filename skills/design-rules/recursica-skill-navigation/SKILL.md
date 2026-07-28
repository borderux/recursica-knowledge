---
name: recursica-skill-navigation
description: House rules for navigation and tabs in enterprise web applications — horizontal top bar vs. vertical sidebar, item counts, exposing sub-levels on click, active states, breadcrumbs, collapsible group defaults, accordion vs. tree vs. link list, nav overflow, permissions, routing and browser history, and correct use of tabs. Use whenever generating, reviewing, or refactoring application chrome: sidebars, top bars, menus, submenus, mega menus, hamburger menus, breadcrumbs, tab bars, or the route structure behind them. Trigger on "nav", "sidebar", "menu", "sub-nav", "tabs", "breadcrumb", "active state", "deep nesting", "overflow", "icon-only", "back button", or any request to lay out an app shell. Do NOT use for form layout, validation, or save behavior within a view — that is recursica-skill-forms, which also owns steppers and multi-step form flows. Do NOT use for control-type selection or for the internal structure of data tables.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Navigation and tabs

House rules for application navigation — primary and secondary nav, sub-level disclosure, location indication, overflow, routing, and tabs. These are opinions, not neutral best practices. Apply them as constraints.

Context these rules assume: **complex enterprise web applications, desktop-first**, built on the Recursica design system. Component-level visual design is not your decision — selected states, hover styling, spacing, and color are inherited. Your job is structure, interaction, and route behavior.

## Governing principles

1. **A location is a route.** If something is navigation, it has a unique URL and a browser history entry. If it is invoked by a trigger — a modal, a panel — it is neither. This test is the most important thing in this file, because it is the one most often broken.
2. **Fix the information architecture instead of engineering around it.** Nav that overflows, wraps, or scrolls; forms spread across tabs — these are symptoms of a structural mistake. Change the structure, don't add a mechanism to cope with it.
3. **The user's location must be answerable from the page itself**, not only from the nav. Selected state alone is not enough; headings and/or breadcrumbs carry it.

## Routing and browser history

**MUST give every navigable view a unique route, addressable in the URL.** Navigating between views MUST push to the browser history stack so that back and forward work correctly. This gets broken constantly and it is a significant failure, not a polish item.

**MUST NOT create history entries for modals or panels.** These are invoked by a trigger, not navigated to. Giving them history states destroys the distinction between "a place in the application" and "a transient state," which is exactly the distinction the history stack should encode.

**Single exception — the deliberately deep-linkable modal.** A modal designed so its URL can be copied, shared, and reopened by someone else is a location, and gets a route and a link trigger together, on purpose. This is rare and must be an explicit decision. Default remains: modals are unrouted and button-triggered.

Applies to movement through primary nav, secondary nav, and tabs alike.

**Tabs get their own routes.** Give each tab a sub-path under its parent view's route, so a tab is linkable, restorable, and reachable with back and forward like any other location.

**Layout persistence is a routing outcome, not a remembered preference.** Do not implement "remember which tab was open" as stored UI state. If the tab is a route, returning to that URL restores it and the back button behaves. Anything beyond that is an implementation concern, not a design decision.

## Horizontal top bar vs. vertical sidebar

**There is no universal rule — but there is a test.** Decide on these two inputs, in order:

1. **Does the layout need to work below desktop?** Desktop-exclusive applications can use either. A responsive target (tablet, mobile) constrains the choice.
2. **How many top-level items are there, and will that number grow?** A known, fixed set of top-level items makes this a subjective choice — either pattern works, pick one. **If item count is expected to grow over time, horizontal top nav becomes problematic; prefer a vertical sidebar.**

Do not treat horizontal vs. vertical as a matter of taste when growth is anticipated. That is the one case where the answer is forced.

## What does not belong in primary navigation

**Keep search, notifications, and the user/account menu out of primary navigation.** They are global utilities, not destinations in the information architecture. Place them elsewhere in the app chrome. Mixing them into the primary nav inflates the item count and blurs what the nav is a map of.

## Number of navigation items

**Target 7 ± 2 items per level, scaled by the complexity of the subject matter.** See `recursica-skill-working-memory` for the basis, the citations, and the limits of this rule:

- **Complex subject matter → about 5 items.**
- **Simple subject matter → up to 9 items.**

This is the ceiling that makes the overflow rules enforceable. Horizontal navigation that runs out of room has almost always exceeded 7 ± 2 first — treat the count as the real defect and the overflow as the symptom.

**Permission-based hiding changes the count per user.** Check the effective item count for each role, not just the superset.

## Exposing sub-levels

**MUST expose sub-navigation on click, not hover.** Clicking a primary nav item does one of two things, depending on whether that top-level item has a landing page:

- **No landing page:** the nav itself expands in place to reveal the sub-nav — accordion behavior.
- **Has a landing page:** the click navigates to that landing page, and the sub-nav expands alongside it.

**Avoid hover-triggered navigation for complex navigation.** Two reasons: users demonstrably struggle to control a mouse across hover-revealed menus, and accessible hover sub-navigation is markedly harder to build correctly. Hover is sometimes unavoidable — a large item count may force a mega menu — but treat that as a failure of the item count, not a design option. Prefer click plus a screen update.

## Choosing the sub-nav component

**Accordion is single-layer only. NEVER nest an accordion inside an accordion.** If the structure has multiple levels of nodes, use a tree instead.

**Use the simplest structure the content allows.** A plain list of links is a legitimate answer and often the right one. Reach for accordion or tree only when there is genuine hierarchy.

**MUST use semantic HTML.** Navigation is a list — ordered or unordered — and must be marked up as one.

**A top-level item with no children MUST remain directly navigable.** A dashboard with no sub-nav is a link, not an inert accordion header. Navs routinely mix directly-navigable items and expandable groups; both must work in the same nav.

## Default state of collapsible groups

**MUST default to collapsed on initial page load.** The only group that starts expanded is the one containing the user's current page.

Expanding everything defeats the purpose of having top-level labels at all — there is no value in it. The corollary is a copy requirement: **labels must be clear enough that the user knows which group to expand without opening it.** If they aren't, fix the labels rather than expanding the group.

## Indicating location

Location is communicated by three things, and you need more than the first:

1. **Selected state** on the active item. Tree and nav components already provide this — use the component state, don't invent one.
2. **Clear, unambiguous page titles that express hierarchy** through heading levels (H1, H2, and so on).
3. **Breadcrumbs**, via the breadcrumb component, where depth warrants it.

**Whether or not the nav is visible, in-page supporting information MUST carry location** — headings, breadcrumbs, or both. Never rely on the nav being on screen as the sole answer to "where am I."

## Hiding navigation

**Hiding navigation entirely is acceptable when it is used infrequently and screen real estate is needed** — behind a hamburger or equivalent. This is not a compromise; for a nav the user touches rarely, it is correct.

**If the user bounces between sections, keep navigation present at all times.** Frequency of use is the deciding input, not screen size.

**NEVER collapse a vertical nav into an icon-only rail.** There is no meaningful benefit to it. When space must be reclaimed, hide the nav behind a hamburger that opens **with text labels** intact — a fully hidden nav that reads clearly when opened beats a permanently visible one the user has to decode.

**NEVER use icon-only primary navigation** in any form.

## Overflow

**NEVER handle horizontal nav overflow. Change the design instead.** Overflow means the design is wrong, and the fixes are structural:

- Move to a vertical nav.
- Shorten and sharpen the labels — long, imprecise labels are a common root cause.

**Hard prohibitions:**

- **NEVER wrap horizontal navigation to a second row.**
- **NEVER scroll navigation horizontally.** Horizontal navigation must be fully visible at all times. Avoid horizontal scrolling anywhere in an enterprise application at almost all costs — in navigation there is no reason for it at all.
- **NEVER put navigation in its own inline scrollable area.** Vertical navigation scrolling _with the page_ is fine. A separate scrollable div for the nav is not.

**Single exception — user-owned customization.** An ellipsis or "more" affordance that hides top-level items is acceptable **only when the navigation is user-customizable and the user chose what to hide.** Absent that explicit user choice, there is no acceptable overflow state in a horizontal nav.

## Permissions and unavailable items

**MUST hide any navigation item the user does not have permission to use.** No permission means no entry in the nav. Do not show it disabled, and do not show it and fail on click.

**Disable, rather than hide, when the user can make the item work themselves.** If the function is unavailable because of a condition the user has the ability to change — an unmet setup step, a missing prerequisite they control — render the item disabled, and enable it once they make the change. The distinction is agency: hide what the user can never reach, disable what they can unlock.

## Tabs

**Tabs represent parts of a whole.** The governing metaphor is a file cabinet: the tabs are the folders in one drawer, and the user flips between them looking at the same body of material. Use tabs only when the content genuinely fits that metaphor.

**MUST NOT spread a form across tabs.** Tabs are for sectioning content, not for breaking up data entry. **A multi-part form uses a stepper component, not tabs.** Do not put multiple forms, or one form's fields, on separate tabs.

**Keyboard interaction inside a tab set is not your decision.** Whether tabs move focus by arrow keys or by tab key is owned by the underlying coded library (MUI, Mantine, or whatever the Recursica tab component wraps). Use the component and inherit its behavior — do not add custom key handling.

**If forms on multiple tabs are unavoidable**, you MUST prompt the user on unsaved changes — most likely a modal on tab click. Recognize what this costs: it compounds tab selection with dirty-form handling into one interaction, which is the clearest evidence that tabs were the wrong container. Treat the prompt as damage control, not as a supported pattern.

## Out of scope

- **All color, visual design, and styling.** Handled by Recursica components.
- **Keyboard interaction within a component** — tab sets, trees, menus. Owned by the underlying coded library.
- **Placement and behavior of global utilities** — search, notifications, account menu. This skill only rules that they stay out of primary navigation.
- **Form layout, validation, save behavior, and steppers.** Covered by `recursica-skill-forms`. This skill decides _that_ a multi-part form uses a stepper; that skill decides how the stepper behaves.
- **Storing navigation state as a user preference.** Routing covers what needs covering; anything further is an implementation concern.

## Pre-flight checklist

Before considering navigation done, verify:

- [ ] Every navigable view has a unique, URL-addressable route.
- [ ] Navigation pushes to browser history; back and forward work correctly.
- [ ] No modal or panel creates a history entry, except a deliberately deep-linkable modal with a shareable URL.
- [ ] No tab state is persisted as remembered UI state instead of a route.
- [ ] Each tab has its own sub-path under its parent route.
- [ ] Horizontal vs. vertical was chosen on responsive target and item-count growth — vertical where top-level items will grow.
- [ ] Each level holds 7 ± 2 items — nearer 5 for complex subject matter, up to 9 for simple. Verified per role, after permission filtering.
- [ ] Search, notifications, and the account menu are outside primary navigation.
- [ ] Sub-navigation opens on click, not hover.
- [ ] Clicking a primary item with a landing page navigates there and expands sub-nav; without one, it expands in place.
- [ ] No accordion is nested inside another accordion; multi-level structures use a tree.
- [ ] Navigation is marked up as a semantic ordered or unordered list.
- [ ] Top-level items without children are directly navigable links.
- [ ] Collapsible groups load collapsed, except the group containing the current page.
- [ ] Group labels are specific enough to choose from while collapsed.
- [ ] Active item uses the component's selected state.
- [ ] The page itself states location via heading hierarchy and/or breadcrumbs.
- [ ] Navigation is hidden only where it is infrequently used; persistent where users move between sections.
- [ ] No icon-only rail and no icon-only primary nav — hidden navs open with text labels.
- [ ] Items the user lacks permission for are absent, not disabled.
- [ ] Items blocked by a condition the user controls are disabled, and enable once resolved.
- [ ] Horizontal navigation does not wrap, scroll, or sit in its own scrollable area.
- [ ] No overflow affordance unless the nav is user-customizable and the user chose to hide items.
- [ ] Tabs contain parts of one whole — no form fields, no multiple forms across tabs.
- [ ] No custom keyboard handling added inside tab sets.
- [ ] Multi-part forms use a stepper.
- [ ] Where forms on tabs are unavoidable, tab switching prompts on unsaved changes.
