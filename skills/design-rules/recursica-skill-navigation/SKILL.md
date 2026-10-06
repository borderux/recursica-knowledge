---
name: recursica-skill-navigation
description: House rules for navigation and tabs — top bar versus sidebar, item counts, sub-levels opening on click, active states, breadcrumbs, collapsible groups, overflow, permissions, routing and browser history, and correct use of tabs. Use for sidebars, top bars, menus, breadcrumbs, tab bars, and routes. Not for forms or steppers — see recursica-skill-forms.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Navigation and tabs

This skill holds the house rules for application navigation: primary and secondary navigation, showing sub-levels, showing the user's location, overflow, routing and tabs. The rules are opinions, not neutral best practices. Treat each rule as a constraint.

The rules assume **complex enterprise web applications, designed for desktop first**, built on the Recursica design system. The design system decides the visual design of each component, including selected states, hover styling, spacing and color. This skill decides the structure, the interaction, and how routes behave.

**A control never moves the user to a new location and also does a second action in the same click.** Moving the user, applying a filter, opening a surface (a region that holds content, such as a page, panel, or modal), and switching a tab are separate outcomes. When one click bundles two outcomes, the control's label can honestly describe only one of the outcomes. Where a destination must open already filtered, the filtered view is a different destination with a separate route, not a link that applies a filter on the way. See convention 6 in `recursica-skill-system-conventions`.

**Navigation labels name objects, not actions.** Write `Forms`, never `View forms`. `recursica-skill-naming-terminology` decides what each item is called, whether a name is singular or plural, and how much a term may be shortened.

## Governing principles

1. **A location is a route.** A place the user navigates to has its own URL and an entry in the browser history. A modal, a panel, or any other element that a trigger opens has neither. This test is the most important rule in this skill, because designs break this test most often.
2. **Fix the information architecture instead of working around the information architecture.** Information architecture is how the application's content is organized and labeled. `recursica-skill-information-architecture` sets the rules for information architecture. Navigation that overflows, wraps or scrolls is a symptom of a mistake in the structure. Forms spread across tabs are a symptom of the same kind of mistake. Change the structure. Do not add a workaround to cope with the mistake.
3. **The page itself must show where the user is**, not only the navigation. A selected state alone is not enough. Headings, breadcrumbs, or both show the location.

## Routing and browser history

**MUST give every view the user can navigate to its own route, reachable by the view's URL.** Moving between views MUST add an entry to the browser history, so that the back and forward buttons work correctly. Designs break this rule constantly. A missing route or history entry is a serious failure, not a finishing touch.

**MUST NOT create history entries for modals or panels.** A trigger opens a modal or a panel. The user does not navigate to a modal or a panel. A history entry for a modal or a panel erases the difference between "a place in the application" and "a temporary state". The browser history should record exactly that difference.

**The only exception is a modal or panel deliberately built to be linked to.** A person can copy the URL of such a modal or panel, share the URL, and someone else can reopen the URL. A modal or panel built this way is a location. The modal or panel gets a route and a link trigger together, on purpose. Real cases exist for sending someone a URL that opens a view with the modal or panel already open. A linked modal or panel is rare, and must be an explicit decision. The default stays the same: modals and panels have no route, and a button opens each modal or panel. See `recursica-skill-panels-modals`.

The routing and history rules apply equally to moving through primary navigation, secondary navigation, and tabs.

**Each tab gets a separate route.** Give each tab a sub-path under the route of the view that holds the tabs. A tab can then be linked to, restored, and reached with back and forward like any other location.

**Routing restores a layout, not a remembered preference.** Do not build "remember which tab was open" as stored UI state. When each tab is a route, going back to a tab's URL restores the tab, and the back button works. Any approach beyond routing is a question of how the code is built, not a design decision.

**Navigation sits on layer 0 beside the main content, unless the navigation or the main content needs containing.** A layer is a numbered background level, 0 to 3, that sets the colors of the components on that level. Layer 0 is the page itself. Where containment is wanted, raise either the navigation or the main content to layer 1, not both. Keep the same choice across the whole application. `recursica-skill-layers` sets the layer rules.

## Horizontal top bar vs. vertical sidebar

**No universal rule decides between a top bar and a sidebar, but a test does.** Answer the two questions below, in this order:

1. **Does the layout need to work below desktop size?** An application used only on desktop can use either a top bar or a sidebar. A responsive target (tablet, mobile) limits the choice.
2. **How many top-level items are there, and will the number grow?** With a known, fixed set of top-level items, the choice is a matter of preference. Either pattern works. Pick one. If the number of items is expected to grow over time, a horizontal top bar becomes a problem. Prefer a vertical sidebar.

Do not treat horizontal versus vertical as a matter of taste when growth is expected. Expected growth is the one case where the rule decides the answer.

## Global tools

**Keep search, notifications, and the user or account menu out of primary navigation.** Search, notifications and the account menu are tools used everywhere, not destinations in the information architecture. Put the global tools elsewhere in the application chrome (the header, navigation and footer around the content). Global tools in the primary navigation raise the number of items. Global tools also blur which destinations the navigation lists.

## Number of navigation items

**Aim for 7 ± 2 items per level, adjusted for how complex the subject matter is.** See `recursica-skill-working-memory` for the reasoning, the research, and the limits of this rule:

- **Complex subject matter → about 5 items.**
- **Simple subject matter → up to 9 items.**

The 7 ± 2 limit makes the overflow rules possible to enforce. A horizontal navigation that runs out of room has almost always gone past 7 ± 2 items first. Treat the item count as the real defect, and the overflow as the symptom.

**Hiding items based on permissions changes the item count for each user.** Check the actual number of items for each role, not only the full list.

## Exposing sub-levels

**MUST reveal sub-navigation on click, not on hover.** Clicking a primary navigation item has one of two results. The result depends on whether the top-level item has a landing page:

- **No landing page:** the navigation expands in place to show the sub-navigation, like an accordion.
- **Has a landing page:** the click goes to the landing page, and the sub-navigation also expands.

**Avoid navigation that opens on hover for complex navigation.** There are two reasons. Users clearly struggle to steer a mouse across menus that appear on hover. Accessible hover sub-navigation is also much harder to build correctly. Hover is sometimes unavoidable. A large number of items may force a mega menu (a large panel that shows many links at once). Treat hover in that case as a failure of the item count, not as a design option. Prefer a click plus an update to the screen.

## Choosing the sub-nav component

**An accordion has one level only, unless the project has a nesting option. Without a nesting option, NEVER nest an accordion inside an accordion.** If the structure has several levels, use a tree instead.

**Use the simplest structure the content allows.** A plain list of links is a valid answer, and often the right answer. Use an accordion or a tree only when the content has a real hierarchy.

**MUST use semantic HTML** (HTML elements chosen by role, such as a button element for a button). Navigation is a list, ordered or unordered, and must be marked up as a list.

**A top-level item with no children MUST stay directly navigable.** A dashboard with no sub-navigation is a link, not an accordion header that does nothing. Navigation often mixes items the user can go to directly with groups that expand. Both kinds of item must work in the same navigation.

## Default state of collapsible groups

**Every collapsible group MUST start collapsed when the page first loads.** The only group that starts expanded is the group that contains the user's current page.

Expanding every group removes the reason to have top-level labels at all. Expanding every group adds no value.

**Group labels must be clear enough that the user knows which group to expand without opening the group.** Starting every group collapsed brings this wording rule. If the group labels are not clear enough, fix the labels instead of expanding the group.

## Indicating location

A screen shows the user's location in three ways, and a screen needs more than the first way:

1. **A selected state** on the active item. Tree and navigation components provide a selected state. Use the component's selected state. Do not invent a custom selected state.
2. **Clear page titles that show the hierarchy** through heading levels (H1, H2, and so on).
3. **Breadcrumbs**, using the breadcrumb component, where the depth of the page calls for breadcrumbs.

**Whether or not the navigation is visible, information on the page itself MUST show the location**, through headings, breadcrumbs, or both. Never rely on the navigation being on screen as the only answer to "where am I?"

## Hiding navigation

**Hiding navigation entirely, behind a hamburger menu or a similar control, is acceptable when the user uses the navigation rarely and the screen space is needed.** Hidden navigation is not a compromise. For navigation the user rarely touches, hiding the navigation is correct.

**If the user moves back and forth between sections, keep the navigation visible at all times.** How often the user uses the navigation decides whether to hide the navigation, not the size of the screen.

**NEVER collapse a vertical navigation into a rail of icons only** (a narrow strip showing icons without labels). A rail of icons has no real benefit. When space is needed, hide the navigation behind a hamburger menu that opens with the text labels still in place. A fully hidden navigation with clear labels when opened is better than an always-visible navigation that the user has to decode.

**NEVER use icon-only primary navigation**, in any form. A narrow viewport is not an exception. The ban holds at every width, and a rail of icons is not an alternative for mobile or tablet. Beyond a handful of icons, nobody remembers what each icon means. Without a hover state, an icon also has no affordance (a visible cue that a control can be used, such as the underline on a link). A published design system shows the real-world extreme: a rail of fifteen icons, whose collapsed state shrinks the icons down to bare dots. The user must hover over each dot to identify the dot. See `recursica-skill-responsive-behavior` and `recursica-skill-icon-semantics`.

**Below desktop size, global navigation collapses into a hamburger menu.** The navigation that slides in shows both the icon and the text of each item.

**NEVER use a bottom navigation bar.** A bottom navigation bar is not a house pattern at any width. Below desktop size, a hamburger menu is the answer.

**A drawer is a panel.** A drawer is the navigation area that slides in: a panel holding navigation. A drawer is no different in kind from a hamburger menu. A sidebar is the permanent navigation: the desktop alternative to a top navigation, down the left side. **An application uses a drawer or a sidebar for its navigation, never both at the same time.** Both are valid. Do not add an option to pin the drawer open as a sidebar. Show the navigation or hide the navigation, and keep the choice that simple. See `recursica-skill-panels-modals`.

**Ask whether the application will be used on a tablet or a phone before choosing the navigation pattern.** Do not add room for tablet or phone use to the navigation afterward. `recursica-skill-responsive-behavior` sets this rule.

## Overflow

**NEVER handle overflow in a horizontal navigation. Change the design instead.** Overflow means the design is wrong. The fixes change the structure:

- Switch to a vertical navigation.
- Shorten the labels and make the labels more specific. Long, vague labels are a common root cause.

Navigation has the following hard bans:

- **NEVER wrap horizontal navigation onto a second row.**
- **NEVER scroll navigation horizontally.** Horizontal navigation must be fully visible at all times. Avoid horizontal scrolling in any part of an enterprise application at almost any cost. In navigation, horizontal scrolling has no reason at all.
- **NEVER put navigation in a separate scrolling area.** Vertical navigation that scrolls _with the page_ is fine. A separate scrolling `div` only for the navigation is not fine.

**The only exception is customization the user owns.** An ellipsis or "more" control that hides top-level items is acceptable only when the user can customize the navigation, and the user chose what to hide. Without that explicit choice by the user, no overflow state is acceptable in a horizontal navigation.

## Permissions and unavailable items

**MUST hide any navigation item the user does not have permission to use.** No permission means no entry in the navigation. Do not show the item disabled. Do not show the item and then fail when the user clicks the item.

**Disable a navigation item, rather than hide the item, when the user can make the item work themselves.** An item may be unavailable because of a condition the user is able to change, such as a setup step not done yet, or a missing prerequisite the user controls. Show that item disabled, and enable the item once the user makes the change. The difference is whether the user has the power to fix the cause. Hide an item the user can never reach, and disable an item the user can unlock.

## Tabs

**Tabs show parts of one whole.** The user switches between tabs while looking at the same material. Use tabs only when the content is parts of one whole.

**The first tab in reading order opens by default.** In a locale that reads left to right, the first tab is the leftmost tab, because the eye starts there. `recursica-skill-defaults` sets this rule.

**MUST NOT spread a form across tabs.** Tabs divide content into sections. Tabs never break up data entry. A form with several parts uses a stepper component (which walks the user through numbered steps), not tabs. Do not put several forms, or the fields of one form, on separate tabs.

**The code library under the Recursica tab component decides keyboard interaction inside a set of tabs.** That code library decides whether the arrow keys or the Tab key move focus between tabs. Use the tab component and keep the component's behavior. Do not add custom key handling.

**If forms on several tabs cannot be avoided, the screen MUST ask the user about unsaved changes**, most likely with a modal when the user clicks a tab. The prompt combines choosing a tab and handling unsaved changes into one interaction. That combination is the clearest sign that tabs were the wrong container. Treat the prompt as a last resort, not as a supported pattern.

## Open questions

No house rule covers the topics below yet. **Ask the person instead of choosing.** See the never-guess rule in `recursica-skill-design-router`. Do not stretch a rule in this skill to fit these topics.

- **The order of items within a level.** No rule says whether to order items by how often the items are used, alphabetically, or by workflow order.
- **Maximum depth.** The 7 ± 2 rule governs the number of items in each level, not how many levels are acceptable.
- **Whether a dashboard or overview screen gets its own navigation item, and where.**

## Out of scope

- **All color, visual design, and styling.** The Recursica components handle color, visual design and styling.
- **Keyboard interaction inside a component**: tab sets, trees and menus. The code library under each Recursica component decides the keyboard interaction.
- **Where global tools go and how global tools behave.** The global tools are search, notifications and the account menu. This skill rules only that global tools stay out of primary navigation.
- **Form layout, validation, saving, and steppers.** `recursica-skill-forms` covers these topics. This skill decides _that_ a form with several parts uses a stepper. `recursica-skill-forms` decides how the stepper behaves.
- **Storing navigation state as a user preference.** Routing covers what needs covering. Any approach beyond routing is a question of how the code is built.

## Pre-flight checklist

Check every item below before treating the navigation as done.

- [ ] The application uses a drawer or a sidebar for navigation, not both at once, and has no option to pin the drawer open.
- [ ] Every view the user can navigate to has its own route, reachable by URL.
- [ ] Navigation adds entries to the browser history, and back and forward work correctly.
- [ ] No modal or panel creates a history entry, except a modal or panel deliberately built to be linked to, with a URL that can be shared.
- [ ] No tab state is kept as remembered UI state in place of a route.
- [ ] Each tab has its own sub-path under the parent view's route.
- [ ] The navigation is horizontal or vertical based on the responsive target and on whether top-level items will grow. The navigation is vertical where top-level items will grow.
- [ ] Each level holds 7 ± 2 items: closer to 5 for complex subjects, up to 9 for simple subjects. The count holds for each role, after permissions hide items.
- [ ] Search, notifications, and the account menu are outside primary navigation.
- [ ] Sub-navigation opens on click, not on hover.
- [ ] Clicking a primary item that has a landing page goes to the landing page and expands the item's sub-navigation. Clicking a primary item without a landing page expands the item in place.
- [ ] No accordion is nested inside another accordion unless the project has a nesting option, and structures with several levels use a tree.
- [ ] Navigation is marked up as a semantic ordered or unordered list.
- [ ] Top-level items with no children are links the user can go to directly.
- [ ] Collapsible groups load collapsed, except the group containing the current page.
- [ ] Group labels are specific enough to choose between while the groups are collapsed.
- [ ] The active item uses the component's selected state.
- [ ] The page itself shows the location through the page's heading hierarchy, breadcrumbs, or both.
- [ ] Navigation is hidden only where the navigation is used rarely, and stays visible where users move between sections.
- [ ] There is no icon-only rail and no icon-only primary navigation. Hidden navigation opens with text labels.
- [ ] Items the user has no permission for are missing, not disabled.
- [ ] Items blocked by a condition the user controls are disabled, and become enabled once the condition is fixed.
- [ ] Horizontal navigation does not wrap, does not scroll, and does not sit in a separate scrolling area.
- [ ] There is no overflow control, unless the user can customize the navigation and chose to hide items.
- [ ] Tabs hold parts of one whole, with no form fields and no forms spread across tabs.
- [ ] Tab sets have no custom keyboard handling.
- [ ] Forms with several parts use a stepper.
- [ ] Where forms on tabs cannot be avoided, switching tabs asks about unsaved changes.
- [ ] Open questions were asked about, not decided: the order of items, the maximum depth, and where a dashboard goes.
