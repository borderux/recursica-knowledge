---
name: recursica-skill-tabs
description: How to use the Recursica tabs component correctly — when content is parts of one whole and belongs in tabs versus a stepper, separate pages, or an accordion, which tab styles and orientations exist, giving each tab its own route, counters on tabs, why a form is never split across tabs, and the screen-reader and keyboard requirements. Use whenever adding, reviewing, or refactoring a tab set, deciding what goes in each tab, or converting tabbed content to something else. Trigger on "tabs", "tab set", "tabbed", "tab bar", "switch views", "pills", "tab styles", "vertical tabs", "tab panel", "screen reader", "tab order", "arrow keys", or a request to divide one screen's content into switchable sections. Do NOT use for moving between areas of the app — that is recursica-skill-navigation. Do NOT use for a sequential process — that is a stepper, see recursica-skill-forms.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Tabs

Tabs switch between parts of one whole — folders in a single file drawer.

## Use it when

- **The panels are peers of one subject.** Every tab is about the same object, and the user could reasonably look at any of them first.
- **Order does not matter.** Nothing in tab three depends on tab one having been visited.
- **The user needs to get between them in one click**, with no intermediate step.

## Do not use it when

| Instead of tabs                                     | Use                                                                 |
| --------------------------------------------------- | ------------------------------------------------------------------- | ---------- |
| The steps must be completed in order                | A stepper — see `recursica-skill-forms`                             |
| A form is too long for one screen                   | A stepper. Tabs holding a form is an invalid structure              |
| The sections are different areas of the application | Navigation — see `recursica-skill-navigation`                       |
| The user needs to compare content across sections   | One view showing both. Tabs hide what is being compared             |
| The sections are long-form reference content        | An accordion — see `recursica-skill-accordion`                      |
| There are more sections than the space allows       | Fewer sections, or a different structure. Never scroll or wrap tabs |

**Never spread a form across tabs.** This is the misuse the house names explicitly: a partially filled form behind an unselected tab hides both the remaining work and the validation errors. Use a stepper.

## What exists

Taken from `recursica_ui-kit.json` → `ui-kit.components.tabs` and `tabs-item`.

**The third column is the React prop that sets the axis.** The axis name is the token inventory's; it is not a prop, and passing it as one is dropped silently by React. A blank cell means no single prop carries that axis — it is set by CSS state or by separate props, and the rules below say which.

| Axis     | Options                       | React prop |
| -------- | ----------------------------- | ---------- |
| `styles` | `default`, `pills`, `outline` | `variant` |
**The same three styles exist on `tabs` and on `tabs-item`** — they are one choice applied to the set, not mixed within it.

**Orientation.** The kit defines no orientation axis, but horizontal and vertical tab sets are documented outside the token inventory. Both are sanctioned — see the vertical rule below.

**Selected and unselected are not variants you pass.** They are documented outside the token inventory as states; the component derives them from which tab is active.

**A tab item may carry a leading icon and a counter** — both documented outside the token inventory as parts of the item. A counter is a badge; see `recursica-skill-badges-chips`.

## Rules for using it

**Every tab gets its own route.** A sub-path under the parent route, so the tab is linkable, survives a refresh, and works with back and forward. This is a house preference stated outright.

**The default tab is the first one** unless a rule says otherwise — and which tab opens by default on any given screen is not settled; see the uncovered list.

**Label each tab with the noun it contains**, not a verb and not a sequence number. "Overview", "Members", "Billing" — never "Step 2".

**Keep the set within 7 ± 2, and prefer far fewer.** See `recursica-skill-working-memory`.

**Never wrap tabs onto a second line, never scroll them, and never put the overflow in a menu.** If they do not fit, the structure is wrong — go vertical or shorten the labels. Owned by `recursica-skill-navigation`.

**A vertical tab set is a legitimate house pattern.** It is one of the two sanctioned answers when a horizontal set does not fit, the other being shorter labels — `recursica-skill-navigation` treats overflow as a structural defect and names moving to a vertical arrangement as the fix. So do not treat vertical as exotic or as something to ask about: reach for it rather than wrapping, scrolling, or hiding tabs in a menu. Arrow keys follow the orientation; see the accessibility section.

**Do not add custom key handling inside the tab set.** The underlying library owns it; your job is to not break it.

**A counter on a tab is metadata, not a control.** It is never clickable, and it never animates on change.

## Accessibility

A tab set is one of the few components where getting the semantics wrong makes the content unreachable rather than merely awkward. The library owns the key handling — you must let it.

### Screen readers

- **The tab list, each tab, and each panel need their real roles**, and each panel must be associated with the tab that controls it. Without that association a screen reader user cannot tell that the content below changed, or which tab produced it.
- **Only the selected tab is announced as selected.** Do not convey selection with color or weight alone — required by `recursica-skill-system-conventions`.
- **Each tab's accessible name is its visible label.** If the label is truncated visually, the full name must still be announced.
- **A counter on a tab must be part of that tab's announcement** — "Members, 12" — not a floating number a screen reader user encounters separately or not at all.
- **A leading icon on a tab is decorative and must be silent.** The label carries the meaning.
- **Switching a tab must not silently replace the page.** If the panel's content is the whole view, the user needs to know the panel changed, not just that a control was activated.

### Keyboard and non-mouse navigation

- **The tab list is a single tab stop.** Tab moves into the set and then out of it to the panel — it does not step through every tab. This is the library's behavior; do not add tabindex to individual tabs and do not override it.
- **Arrow keys move between tabs**, following the orientation: left and right for a horizontal set, up and down for a vertical one. Home and End jump to the first and last.
- **The panel's content is reachable from the tab immediately.** Tabbing off the selected tab lands in its panel, not somewhere else on the page.
- **Never activate a tab on focus alone** where activation is expensive or navigates — the user must be able to move across the set and choose.
- **Never require hover to see which tab is selected**, and never suppress the focus ring on the focused tab.
- **A tab is activated with Enter or Space**, never by click only.

## Not your decision

Do not implement, override, or tune any of these — the component owns them:

- Padding, gaps, the active indicator, and its animation.
- Type styling and selected-state weight.
- All colors per style, per layer, and per state.
- Borders and radii for `pills` and `outline`.
- Keyboard interaction inside the tab set.

## Load these too

- [`recursica-skill-navigation`](../../design-rules/recursica-skill-navigation/SKILL.md) — what tabs may contain, tab routes and history, the prohibition on overflow, active states, breadcrumbs.
- [`recursica-skill-forms`](../../design-rules/recursica-skill-forms/SKILL.md) — the stepper, which is the correct alternative to a tabbed form.
- [`recursica-skill-working-memory`](../../psychology/recursica-skill-working-memory/SKILL.md) — the basis for the item-count ceiling.
- [`recursica-skill-badges-chips`](../../design-rules/recursica-skill-badges-chips/SKILL.md) — the counter on a tab.

## Uncovered — ask, do not invent

- **Which tab opens by default** on a screen where the first is not the obvious answer. Named as unowned in `recursica-skill-design-router`.
- **Whether the three styles carry different meaning** or are purely a house-wide visual choice.
- **What a tab shows when its panel has no content**, and whether an empty tab is hidden or disabled.
- **Whether a tab may ever be disabled**, and what would justify it.

## Pre-flight checklist

- [ ] Every panel is a peer part of one subject, and order genuinely does not matter.
- [ ] No form, and no sequential process, is split across tabs.
- [ ] Every tab has its own sub-route and survives a refresh, back, and forward.
- [ ] Labels are nouns; the set is within 7 ± 2 and does not wrap, scroll, or overflow.
- [ ] A set that did not fit went vertical or got shorter labels — both are sanctioned, and neither needed asking about.
- [ ] One style applied to the whole set; no per-item mixing; no invented style.
- [ ] Tabs, the tab list, and panels carry their real roles, and each panel is associated with its tab.
- [ ] Selection is conveyed by more than color; the selected tab is announced as selected.
- [ ] The tab list is one tab stop; arrow keys move between tabs; no custom key handling was added.
- [ ] Counters are announced with their tab, are not interactive, and do not animate.
- [ ] Focus ring intact; nothing depends on hover.
- [ ] No component-owned styling was overridden.
- [ ] Nothing in the uncovered list was invented.
