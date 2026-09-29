---
name: recursica-skill-tabs
description: How to use the Recursica tabs component correctly — when content is parts of one whole and belongs in tabs versus a stepper, separate pages, or an accordion, which tab styles and orientations exist, giving each tab its own route, counters on tabs, why a form is never split across tabs, and the screen-reader and keyboard requirements. Use whenever adding, reviewing, or refactoring a tab set, deciding what goes in each tab, or converting tabbed content to something else. Trigger on "tabs", "tab set", "tabbed", "tab bar", "switch views", "pills", "tab styles", "vertical tabs", "tab panel", "screen reader", "tab order", "arrow keys", or a request to divide one screen's content into switchable sections. Do NOT use for moving between areas of the app — that is recursica-skill-navigation. Do NOT use for a sequential process — that is a stepper, see recursica-skill-forms.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Tabs

Tabs switch between parts of one whole — like the folders in a single file drawer.

## Use it when

- **The panels are peers of one subject** (equal parts of the same thing). Every tab is about the same object, and the user could reasonably look at any of them first.
- **The order does not matter.** Nothing in tab three depends on tab one having been visited.
- **The user needs to move between them in one click**, with no step in between.

## Do not use it when

| Instead of tabs                                     | Use                                                                 |
| --------------------------------------------------- | ------------------------------------------------------------------- |
| The steps must be done in order                     | A stepper — see `recursica-skill-forms`                             |
| A form is too long for one screen                   | A stepper. Tabs holding a form is an invalid structure              |
| The sections are different areas of the application | Navigation — see `recursica-skill-navigation`                       |
| The user needs to compare content across sections   | One view showing both. Tabs hide what is being compared             |
| The sections are long reference content             | An accordion — see `recursica-skill-accordion`                      |
| There are more sections than the space allows       | Fewer sections, or a different structure. Never scroll or wrap tabs |

**Never spread a form across tabs.** This is the misuse the house names explicitly: a half-filled form behind a tab that is not selected hides both the work left to do and the validation errors. Use a stepper.

## What exists

Taken from `recursica_ui-kit.json` → `ui-kit.components.tabs` and `tabs-item`.

**The third column is the React prop that sets each axis.** The axis name comes from the token inventory. It is not a prop, and if you pass it as one, React quietly ignores it. A blank cell means no single prop sets that axis — it is set by CSS state or by separate props, and the rules below say which.

| Axis     | Options                       | React prop |
| -------- | ----------------------------- | ---------- |
| `styles` | `default`, `pills`, `outline` | `variant`  |

**The same three styles exist on `tabs` and on `tabs-item`** — they are one choice applied to the whole set, not mixed within it.

**Orientation.** The kit defines no orientation axis, but horizontal and vertical tab sets are documented outside the token inventory. Both are approved — see the vertical rule below.

**Selected and unselected are not variants you pass.** They are documented outside the token inventory as states; the component works them out from which tab is active.

**A tab item may have a leading icon and a counter** — both documented outside the token inventory as parts of the item. A counter is a badge; see `recursica-skill-badges-chips`.

## Rules for using it

**Every tab gets its own route.** A sub-path under the parent route, so the tab can be linked to, survives a refresh, and works with back and forward. This is a house preference, stated outright.

**The default tab is the first one**, unless a rule says otherwise — and which tab opens by default on any given screen is not settled; see the uncovered list.

**Label each tab with the noun it contains** — not a verb, and not a step number. "Overview", "Members", "Billing" — never "Step 2".

**Keep the set to 7 ± 2, and prefer far fewer.** See `recursica-skill-working-memory`.

**Never wrap tabs onto a second line, never make them scroll, and never put the overflow in a menu.** If they do not fit, the structure is wrong — switch to vertical, or shorten the labels. Owned by `recursica-skill-navigation`.

**A vertical tab set is a valid house pattern.** It is one of the two approved answers when a horizontal set does not fit — the other being shorter labels. `recursica-skill-navigation` treats overflow as a defect in the structure, and names moving to a vertical arrangement as the fix. So do not treat vertical as unusual, or as something to ask about: reach for it, instead of wrapping, scrolling, or hiding tabs in a menu. The arrow keys follow the orientation; see the accessibility section.

**Do not add your own key handling inside the tab set.** The underlying library owns it; your job is not to break it.

**A counter on a tab is metadata, not a control.** It can never be clicked, and it never animates when it changes.

## Accessibility

A tab set is one of the few components where getting the meaning in the markup wrong makes the content unreachable, rather than just awkward. The library owns how the keys work — you must let it.

### Screen readers

- **The tab list, each tab, and each panel need their real roles**, and each panel must be connected to the tab that controls it. Without that connection, a screen reader (software that reads the screen aloud) user cannot tell that the content below changed, or which tab changed it.
- **Only the selected tab is announced as selected.** Do not show selection by color or weight alone — as `recursica-skill-system-conventions` requires.
- **Each tab's accessible name (the name a screen reader reads out for a control) is its visible label.** If the label is cut short on screen, the full name must still be announced.
- **A counter on a tab must be part of that tab's announcement** — "Members, 12" — not a floating number that a screen reader user comes across separately, or not at all.
- **A leading icon on a tab is decorative, and must be silent.** The label carries the meaning.
- **Switching tabs must not quietly replace the page.** If the panel's content is the whole view, the user needs to know the panel changed — not just that a control was activated.

### Keyboard and non-mouse navigation

- **The tab list is a single tab stop** (a place the Tab key lands). Tab moves into the set, and then out of it to the panel — it does not step through every tab. This is how the library works; do not add a tabindex to individual tabs, and do not override it.
- **The arrow keys move between tabs**, following the orientation: left and right for a horizontal set, up and down for a vertical one. Home and End jump to the first and last.
- **The panel's content can be reached from the tab right away.** Tabbing off the selected tab lands in its panel, not somewhere else on the page.
- **Never activate a tab just because it receives focus** where activating it is costly or navigates — the user must be able to move across the set and then choose.
- **Never require hover to see which tab is selected**, and never hide the focus ring (the outline that shows which element has keyboard focus) on the focused tab.
- **A tab is activated with Enter or Space**, never by click only.

## Not your decision

Do not implement, override, or tune any of these — the component owns them:

- Padding, gaps, the active indicator, and its animation.
- Type styling and selected-state weight.
- All colors per style, per layer, and per state.
- Borders and radii for `pills` and `outline`.
- Keyboard interaction inside the tab set.

## Load these too

- `recursica-skill-navigation` — what tabs may contain, tab routes and history, the prohibition on overflow, active states, breadcrumbs.
- `recursica-skill-forms` — the stepper, which is the correct alternative to a tabbed form.
- `recursica-skill-working-memory` — the basis for the item-count ceiling.
- `recursica-skill-badges-chips` — the counter on a tab.

## Uncovered — ask, do not invent

- **Which tab opens by default** on a screen where the first one is not the obvious answer. Named as having no owner in `recursica-skill-design-router`.
- **Whether the three styles mean different things**, or are purely a visual choice for the whole house.
- **What a tab shows when its panel has no content**, and whether an empty tab is hidden or disabled.
- **Whether a tab may ever be disabled**, and what would justify it.

## Pre-flight checklist

- [ ] Every panel is an equal part of one subject, and the order really does not matter.
- [ ] No form, and no process with steps in order, is split across tabs.
- [ ] Every tab has its own sub-route, and survives a refresh, back, and forward.
- [ ] Labels are nouns. The set is within 7 ± 2, and does not wrap, scroll, or overflow.
- [ ] A set that did not fit went vertical, or got shorter labels — both are approved, and neither needed asking about.
- [ ] One style is applied to the whole set. There is no mixing between items, and no invented style.
- [ ] The tabs, the tab list, and the panels have their real roles, and each panel is connected to its tab.
- [ ] Selection is shown by more than color, and the selected tab is announced as selected.
- [ ] The tab list is one tab stop, the arrow keys move between tabs, and you added no custom key handling.
- [ ] Counters are announced with their tab, cannot be used as controls, and do not animate.
- [ ] The focus ring is intact, and nothing depends on hover.
- [ ] You overrode no styling that the component owns.
- [ ] You invented nothing from the uncovered list.
