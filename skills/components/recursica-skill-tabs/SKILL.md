---
name: recursica-skill-tabs
description: Rules for the Recursica tabs — when content is parts of one whole, styles and orientation, a route per tab, counters, never a form across tabs, and tab accessibility. Use for tab sets and switchable sections of one screen. Not for app navigation — see recursica-skill-navigation; not for a sequence — see recursica-skill-stepper.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Tabs

Tabs switch between the sections of one subject and show one section at a time. A tab is the clickable label for one section. A tab list is the row or column of tabs. A tab panel is the area that shows one tab's section. A tab set is a group of tabs.

## When to use tabs

- **The tab panels are equal parts of one subject.** Every tab is about the same object, and the user could reasonably look at any tab first.
- **The order of the tabs does not matter.** Nothing in the third tab depends on the user having visited the first tab.
- **The user needs to move between the tab panels in one click**, with no step in between.

## When not to use tabs

| Instead of tabs                                         | Use                                                                         |
| ------------------------------------------------------- | --------------------------------------------------------------------------- |
| The steps must be done in order                         | A stepper — see `recursica-skill-forms`                                     |
| A form is too long for one screen                       | A stepper. A tab set that holds a form is an invalid structure              |
| The sections are different areas of the app             | Navigation — see `recursica-skill-navigation`                               |
| The user needs to compare content across sections       | One view that shows the compared content together. Tabs hide the comparison |
| The sections are long reference content                 | An accordion — see `recursica-skill-accordion`                              |
| There are more sections than the available space allows | Fewer sections, or a different structure. Never scroll or wrap tabs         |

**Never spread a form across tabs.** `recursica-skill-navigation` names a form across tabs as a misuse. A half-filled form behind an unselected tab hides both the work left to do and the validation errors. Use a stepper.

## Variants

**Use only the tab variants and options that the Recursica MCP server lists for the project.** A designer can add variants and options in Theme Forge, so each project can differ. Get the list with the server's `recursica_get_component_doc` tool, and use the names the code uses. Never invent a variant or an option.

The rules below describe each option by role, such as "the vertical orientation". The names in the standard UI kit (the unchanged UI kit in the official Recursica release) are examples only.

- **A tab set has two components.** The tab set component holds every tab, and a tab item is one tab. In the standard UI kit, the two components are `tabs` and `tabs-item`.
- **Three styles, on the tab set and on each tab item.** The same three styles exist on both components. In the standard UI kit, the variant is `styles`, with the options `default`, `pills`, and `outline`. Apply one style to the whole tab set, and do not mix styles within one tab set.
- **Two orientations, on the tab set and on each tab item.** A tab set is horizontal or vertical. In the standard UI kit, the variant is `orientation`, with the options `horizontal` and `vertical`. Both orientations are approved, as the rule on vertical tab sets below states. How to set the orientation is an open question.
- **Two selection states on each tab item.** A tab is active or inactive. In the standard UI kit, the variant is `selection-states`, with the options `active` and `inactive`. The selection state is not a variant to set. The tab set sets each tab to active or inactive, from which tab is selected.
- **A leading icon and a counter on a tab item.** A tab item may have a leading icon and a counter. Only the design-system website shows the leading icon and the counter as parts of a tab item. A counter is a badge. See `recursica-skill-badges-chips`.

## Rules

**Give every tab a separate route.** The tab's route is a sub-path under the route of the view that holds the tab set. A tab with a separate route can be linked to, stays open after a page refresh, and works with the browser's back and forward buttons. `recursica-skill-navigation` states the preference for a route per tab directly.

**Open the first tab in reading order by default.** `recursica-skill-defaults` owns this rule.

**Label each tab with a noun that names the tab's content**, not a verb and not a step number. Use labels such as "Overview", "Members" and "Billing", never "Step 2".

**Keep a tab set to 7 ± 2 tabs, and prefer far fewer tabs.** See `recursica-skill-working-memory`.

**Never wrap tabs onto a second line, never make tabs scroll, and never put the tabs that do not fit in a menu.** If the tabs do not fit, the screen's structure is wrong. Switch to a vertical tab set, or shorten the tab labels. `recursica-skill-navigation` owns this rule.

**A vertical tab set is an approved house pattern.** When a horizontal tab set does not fit, the two approved fixes are a vertical tab set and shorter labels. `recursica-skill-navigation` treats tabs that do not fit as a defect in the structure, and names a vertical tab set as the fix. Use a vertical tab set as a normal option, without asking first, instead of wrapping tabs, scrolling tabs, or hiding tabs in a menu. The arrow keys follow the orientation, as described under "Keyboard and non-mouse navigation" below.

**Do not add custom code that responds to key presses inside the tab set.** The tab set responds to key presses on the tabs automatically. Custom code for key presses can break the tab set's built-in keyboard behavior.

**A counter on a tab is information, not a control.** The counter can never be clicked. The counter never animates when the counter changes.

## Accessibility

The rules below add to the accessibility baseline in `recursica-skill-system-conventions`, including the focus ring, which every Recursica component follows.

A tab set is one of the few components where a wrong role or a wrong connection in the markup makes the content unreachable, not only awkward to use. Leave all keyboard behavior to the tab set.

### Screen readers

- **The tab list, each tab, and each tab panel need the correct role for each part.** Each panel must be connected to the tab that controls the panel. Without the connection, a screen reader user cannot tell that the panel content changed, or which tab changed the panel content.
- **Only the selected tab is announced as selected.** Show which tab is selected by more than color or font weight, as `recursica-skill-system-conventions` requires.
- **Each tab's accessible name (the name a screen reader reads out for a control) is the tab's visible label.** If the label is cut off on screen, the full label must still be announced.
- **A counter on a tab must be part of the tab's announcement**, as in "Members, 12". Never leave the number as a separate item that a screen reader reads apart from the tab, or skips.
- **A leading icon on a tab is decorative, and must be hidden from screen readers.** The label gives the meaning.
- **Switching tabs must not replace the page without notice.** If the panel's content fills the whole view, tell the user that the panel changed, not only that a control was activated.

### Keyboard and non-mouse navigation

- **The tab list is a single tab stop** (a place the Tab key lands). The Tab key moves focus into the tab list, and then out of the tab list to the panel. The Tab key does not step through every tab. The tab set sets up the single tab stop automatically. Do not add a `tabindex` to individual tabs, and do not override the tab set's built-in behavior.
- **The arrow keys move between tabs**, following the orientation: left and right for a horizontal tab set, up and down for a vertical tab set. Home moves to the first tab, and End moves to the last tab.
- **The panel's content can be reached from the selected tab right away.** Pressing Tab on the selected tab moves focus into the selected tab's panel, not to another place on the page.
- **Never activate a tab only because the tab receives focus** when activating the tab causes a noticeable delay or navigates. The user must be able to move focus across the tabs and then choose a tab.
- **Enter or Space activates a tab.** A tab never works by click only.

## Styling set by tokens

**Do not set or override the tab properties below.** The tab set sets each property:

- Padding, gaps, the active indicator, and the active indicator's animation.
- Typography, and the font weight of the selected tab.
- All colors, for every style, every layer (a numbered background level, 0 to 3, that sets the colors of the components on that level), and every state.
- Borders and corner radius for the `pills` and `outline` styles.
- Keyboard interaction inside the tab set.

## Related skills

- `recursica-skill-navigation` — what tabs may contain, tab routes and history, the ban on tabs that do not fit, active states, and breadcrumbs.
- `recursica-skill-forms` — the stepper, which is the correct alternative to a form split across tabs.
- `recursica-skill-working-memory` — the reason for the 7 ± 2 limit on tabs.
- `recursica-skill-badges-chips` — the counter on a tab.
- `recursica-skill-system-conventions` — the accessibility baseline every component follows.

## Open questions

- **Whether the three tab styles have different meanings**, or are only a visual choice for the whole house.
- **What a tab shows when the tab's panel has no content**, and whether an empty tab is hidden or disabled.
- **Whether a tab may ever be disabled**, and what would justify a disabled tab.
- **Setting the orientation.** The standard UI kit defines a horizontal and a vertical orientation. Nobody has confirmed that the adapter (the Recursica component library for one framework, such as Mantine or Angular Material) exposes the orientation as a setting. Check the tab set's settings, or ask, before relying on the orientation setting.

## Pre-flight checklist

- [ ] Every tab panel is an equal part of one subject, and the order of the tabs does not matter.
- [ ] No form, and no process with steps in order, is split across tabs.
- [ ] Every tab has a separate sub-route, stays open after a refresh, and works with back and forward.
- [ ] Tab labels are nouns. The tab set is within 7 ± 2 tabs, and the tabs do not wrap, scroll, or overflow.
- [ ] A tab set that did not fit is vertical or has shorter labels, and the fix was chosen without asking.
- [ ] One style applies to the whole tab set. No tab item mixes in another style, and no style is invented.
- [ ] Every style, orientation, and state is one the Recursica MCP server lists for the project.
- [ ] The tab list, each tab, and each tab panel have the correct role for each part, and each panel is connected to the tab that controls the panel.
- [ ] Selection is shown by more than color, and the selected tab is announced as selected.
- [ ] The tab list is one tab stop, the arrow keys move between tabs, and the tab set has no custom code for key presses.
- [ ] Each counter is announced with the counter's tab, cannot be used as a control, and does not animate.
- [ ] Styling comes from the tabs component.
- [ ] Open questions were asked about, not decided: whether the tab styles have different meanings, what an empty tab shows, whether a tab may be disabled, and how the orientation is set.
