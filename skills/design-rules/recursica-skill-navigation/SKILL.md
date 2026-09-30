---
name: recursica-skill-navigation
description: House rules for navigation and tabs — top bar versus sidebar, item counts, sub-levels opening on click, active states, breadcrumbs, collapsible groups, overflow, permissions, routing and browser history, and correct use of tabs. Use for sidebars, top bars, menus, breadcrumbs, tab bars, and routes. Not for forms or steppers — see recursica-skill-forms.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Navigation and tabs

These are the house rules for application navigation — primary and secondary navigation, revealing lower levels, showing the user where they are, overflow, routing, and tabs. They are opinions, not neutral best practices. Treat them as constraints.

These rules assume **complex enterprise web applications, designed for desktop first**, built on the Recursica design system. The visual design of each component is not your decision — selected states, hover styling, spacing, and color are inherited. Your job is the structure, the interaction, and how routes behave.

**A control never navigates and does something else in the same click.** Moving the user, applying a filter, opening a surface (a region that holds content, such as a page, panel, or modal), and switching a tab are separate outcomes. Bundling them means the label can only honestly describe one of them. Where a destination must arrive already filtered, that is a different destination with its own route — not a link that applies a filter on the way. See convention 6 in `recursica-skill-system-conventions`.

**Navigation labels name objects, not actions** — `Forms`, never `View forms`. What each item is called, whether it is singular or plural, and how much a term may be shortened are governed by `recursica-skill-naming-terminology`.

## Governing principles

1. **A location is a route.** If something is navigation, it has its own URL and an entry in the browser history. If a trigger opens it — a modal, a panel — it has neither. This test is the most important thing in this file, because it is the one broken most often.
2. **Fix the information architecture instead of working around it.** Information architecture is how the application's content is organized and labeled, and `recursica-skill-information-architecture` owns it. Navigation that overflows, wraps, or scrolls, or forms spread across tabs, are symptoms of a mistake in the structure. Change the structure; do not add a workaround to cope with it.
3. **The page itself must answer where the user is**, not only the navigation. A selected state alone is not enough; headings, breadcrumbs, or both carry it.

## Routing and browser history

**MUST give every view the user can navigate to its own route, reachable by its URL.** Moving between views MUST add an entry to the browser history, so that the back and forward buttons work correctly. This gets broken constantly, and it is a serious failure, not a finishing touch.

**MUST NOT create history entries for modals or panels.** A trigger opens them; the user does not navigate to them. Giving them history entries erases the difference between "a place in the application" and "a temporary state" — which is exactly the difference the browser history should record.

**The only exception — a modal or panel that is deliberately built to be linked to.** A modal or panel designed so its URL can be copied, shared, and reopened by someone else is a location. It gets a route and a link trigger together, on purpose. There are real cases for sending someone a URL that opens a view with that surface already open. This is rare, and it must be an explicit decision. The default stays the same: modals and panels have no route, and a button opens them. See `recursica-skill-panels-modals`.

This applies equally to moving through primary navigation, secondary navigation, and tabs.

**Tabs get their own routes.** Give each tab a sub-path under its parent view's route, so that a tab can be linked to, restored, and reached with back and forward like any other location.

**Keeping a layout is a result of routing, not a remembered preference.** Do not build "remember which tab was open" as stored UI state. If the tab is a route, going back to that URL restores it, and the back button works. Anything beyond that is a question of how it is built, not a design decision.

**Navigation sits on layer 0 beside the main content, unless one of them needs containing.** (A layer is a numbered level that sets which colors the components inside it use; layer 0 is the page itself.) Where containment is wanted, raise either the navigation or the main content to layer 1 — not both — and keep that direction across the whole application. Owned by `recursica-skill-layers`.

## Horizontal top bar vs. vertical sidebar

**There is no universal rule — but there is a test.** Decide using these two questions, in this order:

1. **Does the layout need to work below desktop size?** An application used only on desktop can use either. A responsive target (tablet, mobile) limits the choice.
2. **How many top-level items are there, and will that number grow?** With a known, fixed set of top-level items, this is a matter of preference — either pattern works, so pick one. If the number of items is expected to grow over time, a horizontal top bar becomes a problem; prefer a vertical sidebar.

Do not treat horizontal versus vertical as a matter of taste when growth is expected. That is the one case where the answer is decided for you.

## What does not belong in primary navigation

**Keep search, notifications, and the user or account menu out of primary navigation.** They are tools used everywhere, not destinations in the information architecture. Put them elsewhere in the application chrome (the frame around the content). Mixing them into the primary navigation raises the number of items, and blurs what the navigation is a map of.

## Number of navigation items

**Aim for 7 ± 2 items per level, adjusted for how complex the subject matter is.** See `recursica-skill-working-memory` for the reasoning, the research, and the limits of this rule:

- **Complex subject matter → about 5 items.**
- **Simple subject matter → up to 9 items.**

This limit is what makes the overflow rules possible to enforce. Horizontal navigation that runs out of room has almost always gone past 7 ± 2 first. Treat the count as the real defect, and the overflow as the symptom.

**Hiding items based on permissions changes the count for each user.** Check the actual number of items for each role, not just the full list.

## Exposing sub-levels

**MUST reveal sub-navigation on click, not on hover.** Clicking a primary navigation item does one of two things, depending on whether that top-level item has a landing page:

- **No landing page:** the navigation itself expands in place to show the sub-navigation — like an accordion.
- **Has a landing page:** the click goes to that landing page, and the sub-navigation expands alongside it.

**Avoid navigation that opens on hover for complex navigation.** There are two reasons. Users clearly struggle to steer a mouse across menus that appear on hover, and accessible hover sub-navigation is much harder to build correctly. Hover is sometimes unavoidable — a large number of items may force a mega menu (a large panel that shows many links at once) — but treat that as a failure of the item count, not as a design option. Prefer a click plus an update to the screen.

## Choosing the sub-nav component

**An accordion has one level only. NEVER nest an accordion inside an accordion.** If the structure has several levels, use a tree instead.

**Use the simplest structure the content allows.** A plain list of links is a valid answer, and often the right one. Reach for an accordion or a tree only when there is a real hierarchy.

**MUST use semantic HTML** (using each element for what it means, not how it looks). Navigation is a list — ordered or unordered — and it must be marked up as one.

**A top-level item with no children MUST stay directly navigable.** A dashboard with no sub-navigation is a link, not an accordion header that does nothing. Navigation often mixes items you can go to directly with groups that expand, and both must work in the same navigation.

## Default state of collapsible groups

**MUST start collapsed when the page first loads.** The only group that starts expanded is the one that contains the user's current page.

Expanding everything defeats the purpose of having top-level labels at all — there is no value in it. This brings a wording requirement with it: **labels must be clear enough that the user knows which group to expand without opening it.** If they are not, fix the labels instead of expanding the group.

## Indicating location

Location is shown by three things, and you need more than the first one:

1. **A selected state** on the active item. Tree and navigation components already provide this — use the component's state; do not invent your own.
2. **Clear page titles that show the hierarchy** through heading levels (H1, H2, and so on).
3. **Breadcrumbs** (a trail of links showing where the page sits), using the breadcrumb component, where the depth calls for them.

**Whether or not the navigation is visible, information on the page itself MUST show the location** — headings, breadcrumbs, or both. Never rely on the navigation being on screen as the only answer to "where am I?"

## Hiding navigation

**Hiding navigation entirely is acceptable when it is used rarely and the screen space is needed** — behind a hamburger menu (a button with three horizontal lines that opens a menu) or something similar. This is not a compromise. For navigation the user rarely touches, it is correct.

**If the user moves back and forth between sections, keep the navigation visible at all times.** How often it is used is what decides this, not the size of the screen.

**NEVER collapse a vertical navigation into a rail of icons only** (a narrow strip showing icons without labels). There is no real benefit to it. When space must be won back, hide the navigation behind a hamburger menu that opens with its text labels still in place. A fully hidden navigation that reads clearly when opened is better than one that is permanently visible but has to be decoded.

**NEVER use icon-only primary navigation**, in any form. A narrow viewport (the visible area of the browser window) is not an exception — the ban holds at every width, and a rail of icons is not the way out for mobile or tablet. Beyond a handful of icons, nobody remembers what they mean, and without a hover state there is no affordance (a visible cue that tells the user they can act on something). A rail of fifteen icons whose collapsed state shrinks down to bare dots you have to hover over is the real-world extreme — and it is a published design system doing it. See `recursica-skill-responsive-behavior` and `recursica-skill-icon-semantics`.

**Below desktop size, global navigation collapses into a hamburger menu**, and what slides in shows both the icon and the text.

**NEVER a bottom navigation bar.** It is not a house pattern at any width; below desktop, the hamburger menu is the answer.

**A drawer is a panel.** The navigation surface that slides in is a panel holding navigation — no different in kind from a hamburger menu. A sidebar is the permanent one: the desktop alternative to a top navigation, down the left side. Do not treat the two as separate things. See `recursica-skill-panels-modals`.

**You must ask whether the application will be used on a tablet or a phone before choosing the navigation pattern** — not make room for it afterward. Owned by `recursica-skill-responsive-behavior`.

## Overflow

**NEVER handle overflow in a horizontal navigation. Change the design instead.** Overflow means the design is wrong, and the fixes are structural:

- Switch to a vertical navigation.
- Shorten and sharpen the labels — long, vague labels are a common root cause.

**Hard bans:**

- **NEVER wrap horizontal navigation onto a second row.**
- **NEVER scroll navigation sideways.** Horizontal navigation must be fully visible at all times. Avoid sideways scrolling anywhere in an enterprise application at almost any cost — and in navigation, there is no reason for it at all.
- **NEVER put navigation in its own separate scrolling area.** Vertical navigation that scrolls _with the page_ is fine. A separate scrolling `div` just for the navigation is not.

**The only exception — customization the user owns.** An ellipsis or "more" control that hides top-level items is acceptable only when the user can customize the navigation, and the user chose what to hide. Without that explicit choice by the user, no overflow state is acceptable in a horizontal navigation.

## Permissions and unavailable items

**MUST hide any navigation item the user does not have permission to use.** No permission means no entry in the navigation. Do not show it disabled, and do not show it and then fail when it is clicked.

**Disable, rather than hide, when the user can make the item work themselves.** If the function is unavailable because of something the user is able to change — a setup step not done yet, or a missing prerequisite they control — show the item disabled, and enable it once they make the change. The difference is whether the user has the power to fix it: hide what the user can never reach, and disable what they can unlock.

## Tabs

**Tabs show parts of a whole.** The guiding picture is a file cabinet: the tabs are the folders in one drawer, and the user flips between them while looking at the same body of material. Use tabs only when the content really fits that picture.

**The first tab in reading order opens by default** — the leftmost one, in a locale that reads left to right, because that is where the eye starts. Owned by `recursica-skill-defaults`.

**MUST NOT spread a form across tabs.** Tabs are for dividing content into sections, not for breaking up data entry. A form with several parts uses a stepper component (which walks the user through numbered steps), not tabs. Do not put several forms, or the fields of one form, on separate tabs.

**Keyboard interaction inside a set of tabs is not your decision.** Whether tabs move focus with the arrow keys or with the Tab key is owned by the underlying coded library (MUI, Mantine, or whatever the Recursica tab component wraps). Use the component and keep its behavior — do not add your own key handling.

**If forms on several tabs cannot be avoided**, you MUST ask the user about unsaved changes — most likely with a modal when a tab is clicked. Understand what this costs: it combines choosing a tab with handling unsaved changes into one interaction, which is the clearest sign that tabs were the wrong container. Treat the prompt as damage control, not as a supported pattern.

## Uncovered — ask, do not invent

No house rule covers these yet. **Ask the person instead of choosing** — see the never-guess rule in `recursica-skill-design-router`. Do not stretch a rule above to fit them.

- **The order of items within a level.** By how often they are used, alphabetically, or by workflow order — no rule exists.
- **Maximum depth.** 7 ± 2 governs the width of each level, not how many levels are acceptable.
- **Whether a dashboard or overview screen gets its own navigation item, and where.**

## Out of scope

- **All color, visual design, and styling.** The Recursica components handle these.
- **Keyboard interaction inside a component** — tab sets, trees, menus. Owned by the underlying coded library.
- **Where global tools go and how they behave** — search, notifications, the account menu. This skill only rules that they stay out of primary navigation.
- **Form layout, validation, saving, and steppers.** Covered by `recursica-skill-forms`. This skill decides _that_ a form with several parts uses a stepper; that skill decides how the stepper behaves.
- **Storing navigation state as a user preference.** Routing covers what needs covering; anything more is a question of how it is built.

## Pre-flight checklist

Before treating navigation as done, check:

- [ ] Every view the user can navigate to has its own route, reachable by URL.
- [ ] Navigation adds entries to the browser history, and back and forward work correctly.
- [ ] No modal or panel creates a history entry, except one deliberately built to be linked to, with a URL that can be shared.
- [ ] No tab state is kept as remembered UI state in place of a route.
- [ ] Each tab has its own sub-path under its parent route.
- [ ] You chose horizontal or vertical based on the responsive target and whether the top-level items will grow — vertical where they will grow.
- [ ] Each level holds 7 ± 2 items — closer to 5 for complex subject matter, up to 9 for simple. You checked this for each role, after items were hidden by permission.
- [ ] Search, notifications, and the account menu are outside primary navigation.
- [ ] Sub-navigation opens on click, not on hover.
- [ ] Clicking a primary item that has a landing page goes there and expands its sub-navigation. Without a landing page, it expands in place.
- [ ] No accordion is nested inside another accordion, and structures with several levels use a tree.
- [ ] Navigation is marked up as a semantic ordered or unordered list.
- [ ] Top-level items with no children are links the user can go to directly.
- [ ] Collapsible groups load collapsed, except the group containing the current page.
- [ ] Group labels are specific enough to choose between while they are collapsed.
- [ ] The active item uses the component's selected state.
- [ ] The page itself shows the location through its heading hierarchy, breadcrumbs, or both.
- [ ] Navigation is hidden only where it is used rarely, and stays visible where users move between sections.
- [ ] There is no icon-only rail and no icon-only primary navigation. Hidden navigation opens with text labels.
- [ ] Items the user has no permission for are missing, not disabled.
- [ ] Items blocked by something the user controls are disabled, and become enabled once it is fixed.
- [ ] Horizontal navigation does not wrap, does not scroll, and does not sit in its own scrolling area.
- [ ] There is no overflow control, unless the user can customize the navigation and chose to hide items.
- [ ] Tabs hold parts of one whole — no form fields, and no forms spread across tabs.
- [ ] You added no custom keyboard handling inside tab sets.
- [ ] Forms with several parts use a stepper.
- [ ] Where forms on tabs cannot be avoided, switching tabs asks about unsaved changes.
- [ ] You asked before deciding anything on the uncovered list: the order of items, the maximum depth, and where a dashboard goes.
