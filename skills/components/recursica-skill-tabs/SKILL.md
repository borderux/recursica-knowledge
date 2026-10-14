---
name: recursica-skill-tabs
description: Rules for the Recursica tabs — when content is parts of one whole, styles and orientation, a route per tab, counters, never a form across tabs, and tab accessibility. Use for tab sets and switchable sections of one screen. Not for app navigation — see recursica-skill-navigation; not for a sequence — see recursica-skill-stepper.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Tabs

Tabs split the content about one subject into sections, and show one section at a time. For example, an account page has the tabs "Overview", "Members" and "Billing". A tab is the clickable label for one section. A tab list is the row or column of tabs. A tab panel is the area that shows one tab's section. A tab set is a group of tabs.

## When to use tabs

- **The tab panels are equal parts of one subject.** Every tab is about the same object. For example, "Overview", "Members" and "Billing" all describe one account. The persona could reasonably look at any tab first.
- **The order of the tabs does not matter.** Nothing in the third tab depends on the persona having visited the first tab. For example, the persona can open "Billing" without opening "Overview" first.
- **The persona needs to move between the tab panels in one click**, with no step in between.

## When not to use tabs

| Instead of tabs                                        | Use                                                                                                                                                           |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The steps must be done in order                        | A stepper — see `recursica-skill-stepper`                                                                                                                     |
| A form is too long for one screen                      | A stepper. Never spread one form across tabs                                                                                                                  |
| The sections are different areas of the app            | Navigation — see `recursica-skill-navigation`                                                                                                                 |
| The persona needs to compare content across sections   | One view that shows all the content being compared at the same time. Tabs show one section at a time, so the persona cannot see the compared content together |
| The sections are long reference content                | An accordion — see `recursica-skill-accordion`                                                                                                                |
| There are more sections than the tab list has room for | Fewer sections, or a different structure. A vertical tab set needs no confirmation. Confirm any other structure with the user. Never scroll or wrap tabs      |

**Never spread a form across tabs.** Use a stepper instead. Each tab may hold the tab's own complete form, with the form's own save button. A half-filled form behind an unselected tab hides both the work left to do and the validation errors. `recursica-skill-navigation` also lists a form split across tabs as a misuse of tabs.

## Variants

**Use only the tab variants and options that the Recursica MCP server lists for the theme (the design a designer sets in Theme Forge: the token values, the components, and each component's variants, states and sizes).** A designer can add variants and options in Theme Forge, so each theme can differ. Get the list with the server's `recursica_get_component_doc` tool, and use the names the code uses. Never invent a variant or an option.

The rules below describe each option by role, such as "the vertical orientation". The names in the standard UI kit (the unchanged UI kit in the official Recursica release) are examples only.

- **A tab set has two components.** The tab set component holds every tab, and a tab item is one tab. In the standard UI kit, the two components are `tabs` and `tabs-item`.
- **The tab set and each tab item have the same three styles.** In the standard UI kit, the variant is `styles`, with the options `default`, `pills`, and `outline`. Apply one style to the whole tab set. Do not mix styles within one tab set.
- **The tab set and each tab item have an orientation variant, with a horizontal option and a vertical option.** In the standard UI kit, the variant is `orientation`, with the options `horizontal` and `vertical`. Both orientations are approved. The rule on vertical tab sets under "Rules" gives the reason. How to set the orientation is an open question. See "Open questions".
- **Each tab item has a selection state, active or inactive.** In the standard UI kit, the variant is `selection-states`, with the options `active` and `inactive`. Do not set the selection state. The tab set makes the selected tab active and every other tab inactive.
- **A tab item may have a leading icon and a counter.** Only the design-system website shows the leading icon and the counter as parts of a tab item. A counter is a badge. For example, a counter shows the number of members on the "Members" tab. See `recursica-skill-badges-chips`.

## Rules

**Give every tab a separate route.** A tab's route is a sub-path under the route of the view that holds the tab set. For example, the Members tab on the account page has the route `/account/members`. A tab with a separate route:

- can be linked to
- stays open after a page refresh
- works with the browser's back and forward buttons

A tab inside a panel or a modal gets an address under the panel's or the modal's address. `recursica-skill-navigation` states the preference for a route per tab.

**Open the first tab in reading order by default.** For example, in a horizontal tab set in English, open the leftmost tab. `recursica-skill-screen-starting-state` sets this rule.

**Label each tab with a noun that names the tab's content**, not a verb and not a step number. Use labels such as "Overview", "Members" and "Billing", never "Step 2".

**Keep a tab set to 7 ± 2 tabs, and prefer far fewer tabs.** See `recursica-skill-working-memory`.

**Never wrap tabs onto a second line, and never make tabs scroll. Never put the tabs that do not fit in a menu.** Fix tabs that do not fit in one of two ways. For horizontal tabs that do not fit, both fixes are approved.

- Switch to a vertical tab set.
- Shorten the tab labels.

Tabs that do not fit mean the screen is organized wrong.

**Use a vertical tab set as a normal option, without confirming with the user first.** A vertical tab set is an approved house pattern. A vertical tab set is the fix for tabs that do not fit. The arrow keys follow the orientation, as described under "Keyboard and non-mouse navigation" below.

**Never set or override the keyboard behavior inside the tab set.** The tab set responds to key presses on the tabs, such as the arrow keys. Do not add custom code that responds to key presses inside the tab set. Custom code for key presses can break the tab set's keyboard behavior.

**Use a counter on a tab to show information, never as a control.** For example, "Members 12" tells the persona how many members there are. Never make the counter clickable. Never animate the counter when the counter changes.

## Accessibility

The rules below add to the accessibility baseline in `recursica-skill-design-system-conventions`, including the focus ring, which every Recursica component follows.

A wrong role or a wrong connection in the tab set's markup makes the tab set's content impossible to reach. In most other components, the same mistake only makes the content awkward to use.

### Screen readers

- **Give the tab list, each tab, and each tab panel the correct role for each part.** Each tab panel must be connected to the tab that controls the tab panel. Without the connection, a persona using a screen reader cannot tell that the panel content changed. The persona also cannot tell which tab changed the panel content.
- **Announce only the selected tab as selected.** Show which tab is selected by more than color or font weight, as `recursica-skill-design-system-conventions` requires.
- **Each tab's accessible name (the name a screen reader reads out for a control) is the tab's visible label.** If the label is cut off on screen, the full label must still be announced.
- **A counter on a tab must be part of the tab's announcement**, as in "Members, 12". Never leave the number as a separate item that a screen reader reads apart from the tab, or skips.
- **A leading icon on a tab is decorative, and must be hidden from screen readers.** The tab label gives the meaning.
- **Switching tabs must not replace the page without notice.** If the tab panel's content fills the whole view, tell the persona that the tab panel changed. Telling the persona only that a control was activated is not enough.

### Keyboard and non-mouse navigation

- **The tab list is a single tab stop** (a place the Tab key lands). The Tab key moves focus into the tab list. The next press of the Tab key moves focus out of the tab list to the selected tab's panel. The Tab key does not step through every tab. The tab set sets up the single tab stop automatically. Do not add a `tabindex` to individual tabs, and do not override the tab set's built-in behavior.
- **The arrow keys move between tabs**, following the orientation. The left and right arrow keys work in a horizontal tab set. The up and down arrow keys work in a vertical tab set. Home moves to the first tab, and End moves to the last tab.
- **Pressing Tab on the selected tab moves focus into the selected tab's panel**, not to another place on the page. The persona reaches the panel content right away.
- **If activating a tab causes a noticeable delay or navigates, never activate the tab on focus alone.** For example, a slow tab must not open when the arrow keys move focus onto the tab. The persona must be able to move focus across the tabs and then choose a tab.
- **Enter or Space activates a tab.** A tab never works by click only.

## Styling set by tokens

**Never set or override the tabs' styling.** The theme sets every visual property of the tabs, such as size, spacing, borders, colors and animation. Do not add extra containers or spacers to change the tabs' look. If the theme lacks a look the design needs, report the missing look as a gap in the design system. See `recursica-skill-design-router`.

## Related skills

- `recursica-skill-navigation` — what tabs may contain, tab routes and history, active states, and breadcrumbs.
- `recursica-skill-stepper` — the stepper, which is the correct alternative to a form split across tabs.
- `recursica-skill-working-memory` — the reason for the 7 ± 2 guideline on tabs.
- `recursica-skill-badges-chips` — the counter on a tab.
- `recursica-skill-design-system-conventions` — the accessibility baseline every component follows.

## Open questions

- **Whether the three tab styles have different meanings**, or are only a visual choice for the whole house.
- **What a tab shows when the tab's panel has no content**, and whether an empty tab is hidden or disabled.
- **Whether a tab may ever be disabled**, and what would justify a disabled tab.
- **Setting the orientation.** The standard UI kit defines a horizontal and a vertical orientation. Nobody has confirmed that the adapter (the Recursica component library for one framework, such as Mantine or Angular Material) lets the code set the orientation. Check the tab set's settings, or confirm with the user, before relying on the orientation setting.

## Pre-flight checklist

- [ ] Every tab panel is an equal part of one subject, and the order of the tabs does not matter.
- [ ] No form, and no process with steps in order, is split across tabs.
- [ ] Every tab has a separate sub-route, stays open after a refresh, and works with back and forward.
- [ ] Tab labels are nouns. The tab set holds about 7 ± 2 tabs or fewer, and the tabs do not wrap, scroll, or overflow.
- [ ] A tab set that did not fit is vertical or has shorter labels.
- [ ] The fix for a tab set that did not fit was chosen without confirming with the user.
- [ ] One style applies to the whole tab set. No tab item mixes in another style, and no style is invented.
- [ ] Every style, orientation, and state is one the Recursica MCP server lists for the theme.
- [ ] The tab list, each tab, and each tab panel have the correct role for each part.
- [ ] Each tab panel is connected to the tab that controls the panel.
- [ ] Selection is shown by more than color, and the selected tab is announced as selected.
- [ ] The tab list is one tab stop, and the arrow keys move between tabs.
- [ ] The tab set has no custom code for key presses.
- [ ] Each counter is announced with the counter's tab, cannot be used as a control, and does not animate.
- [ ] No styling is set or overridden on the tabs.
- [ ] No container or spacer is added to change the tabs' look.
- [ ] Open questions were asked about, not decided: whether the tab styles have different meanings, what an empty tab shows, whether a tab may be disabled, and how the orientation is set.
