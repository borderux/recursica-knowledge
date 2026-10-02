---
name: recursica-skill-tabs
description: Rules for the Recursica tabs — when content is parts of one whole, styles and orientation, a route per tab, counters, never a form across tabs, and tab accessibility. Use for tab sets and switchable sections of one screen. Not for app navigation — see recursica-skill-navigation; not for a sequence — see recursica-skill-stepper.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Tabs

Tabs switch between the parts of one whole and show one part at a time.

## When to use tabs

- **The panels are equal parts of one subject.** Every tab is about the same object, and the user could reasonably look at any of them first.
- **The order does not matter.** Nothing in tab three depends on tab one having been visited.
- **The user needs to move between them in one click**, with no step in between.

## When not to use tabs

| Instead of tabs                                     | Use                                                                 |
| --------------------------------------------------- | ------------------------------------------------------------------- |
| The steps must be done in order                     | A stepper — see `recursica-skill-forms`                             |
| A form is too long for one screen                   | A stepper. Tabs holding a form is an invalid structure              |
| The sections are different areas of the application | Navigation — see `recursica-skill-navigation`                       |
| The user needs to compare content across sections   | One view showing both. Tabs hide what is being compared             |
| The sections are long reference content             | An accordion — see `recursica-skill-accordion`                      |
| There are more sections than the space allows       | Fewer sections, or a different structure. Never scroll or wrap tabs |

**Never spread a form across tabs.** The house rules name this misuse explicitly. A half-filled form behind an unselected tab hides both the work left to do and the validation errors. Use a stepper.

## Variants

Taken from the UI kit (the token file, `recursica_ui-kit.json`, that says which variants and states each component has) → `ui-kit.components.tabs` and `tabs-item`.

**Look up each variant's name in code before using the variant.** The names in this skill are the names in Figma and the UI kit. The code can use a different name for the same variant. A wrong name in code has no effect and shows no error. The Recursica MCP server's `recursica_get_component_doc` tool gives the name to use in code.

| Variant property   | Options                       | On          |
| ------------------ | ----------------------------- | ----------- |
| `styles`           | `default`, `pills`, `outline` | `tabs`      |
| `orientation`      | `horizontal`, `vertical`      | `tabs`      |
| `selection-states` | `active`, `inactive`          | `tabs-item` |

**The same three styles exist on `tabs` and on `tabs-item`.** Apply one style to the whole set, and do not mix styles within it.

**Orientation is horizontal or vertical**, on the tab set and on each tab. Both are approved, as the vertical rule below states. The open questions asks how orientation is set.

**`active` and `inactive` are states of each tab, not variants to set.** The component sets them from which tab is active.

**A tab item may have a leading icon and a counter.** Both appear as parts of the item only on the design-system website. A counter is a badge; see `recursica-skill-badges-chips`.

## Rules

**Every tab gets its own route.** The route is a sub-path under the parent route. With its own route, a tab can be linked to, survives a refresh, and works with the back and forward buttons. The house rules state this preference directly.

**The first tab in reading order opens by default.** `recursica-skill-defaults` owns this rule.

**Label each tab with a noun that names its content**, not a verb and not a step number. Use labels like "Overview", "Members" and "Billing", never "Step 2".

**Keep the set to 7 ± 2, and prefer far fewer.** See `recursica-skill-working-memory`.

**Never wrap tabs onto a second line, never make them scroll, and never put the overflow in a menu.** If the tabs do not fit, the structure is wrong. Switch to a vertical set, or shorten the labels. `recursica-skill-navigation` owns this rule.

**A vertical tab set is a valid house pattern.** When a horizontal set does not fit, the two approved fixes are a vertical set and shorter labels. `recursica-skill-navigation` treats overflow as a defect in the structure, and names a vertical set as the fix. Use a vertical set as a normal option, without asking first, instead of wrapping tabs, scrolling them, or hiding them in a menu. The arrow keys follow the orientation, as the accessibility section describes.

**Do not add custom key handling inside the tab set.** The underlying library handles the keys, and custom handlers can break that handling.

**A counter on a tab is metadata, not a control.** It can never be clicked, and it never animates when it changes.

## Accessibility

This component also follows the accessibility baseline in `recursica-skill-system-conventions`, including the focus ring. Only the rules specific to this component are listed here.

A tab set is one of the few components where wrong roles or connections in the markup make the content unreachable, not only awkward to use. Leave all key handling to the library.

### Screen readers

- **The tab list, each tab, and each panel need their real roles**, and each panel must be connected to the tab that controls it. Without that connection, a screen reader user cannot tell that the content below changed, or which tab changed it.
- **Only the selected tab is announced as selected.** Show selection by more than color or weight, as `recursica-skill-system-conventions` requires.
- **Each tab's accessible name (the name a screen reader reads out for a control) is its visible label.** If the label is truncated on screen, the full name must still be announced.
- **A counter on a tab must be part of that tab's announcement**, as in "Members, 12". Never leave the number as a separate item that a screen reader reads apart from the tab, or skips.
- **A leading icon on a tab is decorative, and must be hidden from screen readers.** The label carries the meaning.
- **Switching tabs must not quietly replace the page.** If the panel's content is the whole view, tell the user that the panel changed, not only that a control was activated.

### Keyboard and non-mouse navigation

- **The tab list is a single tab stop** (a place the Tab key lands). Tab moves into the set, and then out of it to the panel — it does not step through every tab. The library sets this up. Do not add a tabindex to individual tabs, and do not override the library's behavior.
- **The arrow keys move between tabs**, following the orientation: left and right for a horizontal set, up and down for a vertical one. Home and End jump to the first and last.
- **The panel's content can be reached from the tab right away.** Tabbing off the selected tab lands in its panel, not somewhere else on the page.
- **Never activate a tab only because it receives focus** where activating it causes a noticeable delay or navigates. The user must be able to move across the set and then choose a tab.
- **A tab is activated with Enter or Space**, never by click only.

## Styling set by tokens

Do not set or override any of these. The component sets them:

- Padding, gaps, the active indicator, and its animation.
- Type styling and selected-state weight.
- All colors per style, per layer, and per state.
- Borders and radii for `pills` and `outline`.
- Keyboard interaction inside the tab set.

## Related skills

- `recursica-skill-navigation` — what tabs may contain, tab routes and history, the prohibition on overflow, active states, breadcrumbs.
- `recursica-skill-forms` — the stepper, which is the correct alternative to a tabbed form.
- `recursica-skill-working-memory` — the basis for the item-count ceiling.
- `recursica-skill-badges-chips` — the counter on a tab.
- `recursica-skill-system-conventions` — the accessibility baseline every component follows.

## Open questions

- **Whether the three styles mean different things**, or are purely a visual choice for the whole house.
- **What a tab shows when its panel has no content**, and whether an empty tab is hidden or disabled.
- **Whether a tab may ever be disabled**, and what would justify it.
- **How orientation is set.** The UI kit defines `horizontal` and `vertical`. Whether the adapter exposes it as a setting has not been confirmed. Check the component's settings, or ask, before relying on it.

## Pre-flight checklist

- [ ] Every panel is an equal part of one subject, and the order does not matter.
- [ ] No form, and no process with steps in order, is split across tabs.
- [ ] Every tab has its own sub-route, and survives a refresh, back, and forward.
- [ ] Labels are nouns. The set is within 7 ± 2, and does not wrap, scroll, or overflow.
- [ ] A set that did not fit is vertical or has shorter labels, chosen without asking.
- [ ] One style is applied to the whole set. There is no mixing between items, and no invented style.
- [ ] The tabs, the tab list, and the panels have their real roles, and each panel is connected to its tab.
- [ ] Selection is shown by more than color, and the selected tab is announced as selected.
- [ ] The tab list is one tab stop, the arrow keys move between tabs, and the tab set has no custom key handling.
- [ ] Counters are announced with their tab, cannot be used as controls, and do not animate.
- [ ] Styling comes from the component.
- [ ] Open questions were asked about, not decided: whether the styles mean different things, what an empty tab shows, whether a tab may be disabled, and how orientation is set.
