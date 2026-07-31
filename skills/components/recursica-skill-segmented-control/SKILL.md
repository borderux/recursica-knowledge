---
name: recursica-skill-segmented-control
description: How to use the Recursica segmented control correctly — when it is the right single-select control and when radio buttons, a dropdown, tabs, or chips are, the orientation and fill-width axes, the 2–5 option ceiling that overrides the general one, label length, pre-selection, commit timing, and the screen-reader and keyboard requirements for a radio-group-style control. Use whenever adding, reviewing, or refactoring a horizontal single-select — a view switcher, an inline filter, a mode toggle, or a compact set of exclusive options. Trigger on "segmented control", "segmented button", "horizontal radio", "view switcher", "toggle group", "fill width", "screen reader", "arrow keys", or a request to pick exactly one of a few options in a row. Do NOT use for multi-select — that is recursica-skill-chip. Do NOT use for switching between parts of one whole — that is recursica-skill-tabs. Do NOT use for control choice or option-count policy — that is recursica-skill-selection-controls.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Segmented control

A segmented control is a horizontal radio group: exactly one of a few options, all visible at once.

## Use it when

- **The layout calls for a horizontal single-select.** This is how that is done here — radio buttons are never rotated into a row.
- **A toggle is needed outside a form.** A switch is form-only, so any two-state control in application chrome, a filter bar, or a toolbar is a segmented control. In chrome it carries **icons rather than text labels** — a light/dark theme control is the standard example. See `recursica-skill-screen-scaffolding` for where chrome sits.
- **The set is small: 2 to 5 options**, with short labels.
- **The choice switches a view or a mode** — list or grid, daily or weekly — where the options are tightly coupled to what is on screen.
- **Inline filtering** that would be overkill in a dropdown or a modal.

## Do not use it when

| Instead of a segmented control                      | Use                                                               |
| --------------------------------------------------- | ----------------------------------------------------------------- |
| More than five options                              | A vertical radio group; a dropdown if it also exceeds 7 ± 2       |
| The user may choose more than one                   | Selectable chips horizontally, a checkbox group vertically        |
| The labels are long or complex                      | A vertical radio group. Long labels break the compact layout      |
| The options are parts of one whole with own content | `recursica-skill-tabs` — which carry routes                       |
| Switching triggers a heavy reload or a mutation     | A control with explicit submission, and feedback                  |
| The choice is on or off                             | A switch or a checkbox — see `recursica-skill-selection-controls` |

**Never fall back to tabs when the set outgrows five.** Tabs hold parts of one whole; a segmented control holds the values of a single-select field. They are not interchangeable, and the fallback is a vertical radio group or a dropdown.

## What exists

Taken from `recursica_ui-kit.json` → `ui-kit.components.segmented-control` and `segmented-control-item`. **Do not pass a variant that is not listed here.**

| Axis               | Options                  | On                       |
| ------------------ | ------------------------ | ------------------------ |
| `orientation`      | `horizontal`, `vertical` | `segmented-control`      |
| `fill-width`       | `false`, `true`          | `segmented-control`      |
| `selection-states` | `selected`, `unselected` | `segmented-control-item` |

**`fill-width: true` stretches the control to the container**, with the segments sharing equal width. Default is `false`.

**A `vertical` orientation exists in the kit, but it is not the house pattern.** Use `horizontal` — see the rule below.

**An item may carry a leading icon** — documented outside the token inventory as part of the item.

**There is no size axis, no style axis, and no disabled state** on either the control or the item.

## Rules for using it

**This control's ceiling is 2–5, and it overrides the general one.** The house option ceiling is 7 ± 2, but a segmented control is horizontal and compact, so the tighter limit wins. Owned by `recursica-skill-selection-controls`.

**Use `horizontal`. The vertical orientation is not the house pattern.** A segmented control is the house answer for a _horizontal_ single-select and nothing else: `recursica-skill-selection-controls` designates the **radio group** as the vertical single-select, stacked one option per row. The `vertical` orientation exists in the token inventory, but a vertical single-select is a radio group — so do not reach for it.

**Labels are one or two words.** If a label needs more, the control is wrong, not the label.

**Something is always selected.** A segmented control has no empty state — it is a single-select field with a default. Which default is a real decision; see `recursica-skill-selection-controls` on pre-selection.

**Commit timing follows the system's one mode.** If the application commits selection changes immediately, this does too; if it batches, this batches. Never a second mode for this control alone — see `recursica-skill-system-conventions`.

**Switching must be cheap.** If the change is slow or destructive, the user needs explicit submission and feedback instead.

**A segmented control standing in for a toggle keeps every rule on this page** — two to five options, something always selected, cheap switching. A two-option segmented control is still a segmented control, not a switch wearing different clothes.

**Icon-only segments still need names.** An icon carries nothing on its own; see the accessibility section.

**Never use `fill-width: true` to justify more options.** Stretching the control does not raise the ceiling.

## Accessibility

Semantically this is a radio group, and it must be built as one. The frequent failure is a row of buttons where the selected one is merely a different color — which tells a screen reader user nothing and leaves keyboard users tabbing through every segment.

### Screen readers

- **It must be announced as a group of radio options** with exactly one selected, not as a set of buttons.
- **The group needs an accessible name** — what is being chosen. "View", "Date range". Without it the user hears three options and no question.
- **Each segment announces its label and its selected state.** Selection must be programmatic; color alone is prohibited by `recursica-skill-system-conventions`.
- **An icon-only segment must carry an explicit name.** The icon is not announced.
- **A leading icon beside a label is decorative and must be silent.**
- **If changing the selection changes the content on screen, that change must be perceivable.** A screen reader user who activates a segment and hears nothing has no way to know the view behind it updated.

### Keyboard and non-mouse navigation

- **The group is a single tab stop.** Tab moves into the control and then out of it — it does not step through every segment. Do not add tabindex to individual segments.
- **Arrow keys move the selection** within the group, following the orientation: left and right when horizontal, up and down when vertical. Home and End jump to the ends.
- **Because arrow keys select as they move, keep the change cheap.** This is the same reason a slow or destructive switch belongs on a different control.
- **The selected segment is the one focus lands on** when tabbing in — not the first segment.
- **Never require hover to tell which segment is selected**, and never suppress the focus ring.
- **Focus and selection must be visually distinguishable** — a user can have focus on the group with a different segment selected, and both need to be visible.

## Not your decision

Do not implement, override, or tune any of these — the component owns them:

- `colors`, `elevation`, `border-size`, `border-radius`.
- `padding-horizontal`, `padding-vertical`, `item-gap`, `divider-size`.
- Item styling per selection state, including hover and focus.
- Equal-width distribution when `fill-width` is `true`.

## Load these too

- [`recursica-skill-selection-controls`](../../design-rules/recursica-skill-selection-controls/SKILL.md) — when a segmented control is the right control, the rules it inherits from radio groups, pre-selection, and commit timing.
- [`recursica-skill-working-memory`](../../psychology/recursica-skill-working-memory/SKILL.md) — the basis for option-count limits.
- [`recursica-skill-system-conventions`](../../design-rules/recursica-skill-system-conventions/SKILL.md) — one behavioral mode per system; never carry meaning in a single channel.
- [`recursica-skill-forms`](../../design-rules/recursica-skill-forms/SKILL.md) — label placement and validation when the control is a form field.

## Uncovered — ask, do not invent

- **When `fill-width: true` applies** — no rule states which surfaces take a stretched control.
- **Whether an individual segment may be disabled**, and how that is conveyed.
- **Whether this control may serve as a labelled form field** rather than a view switcher, and if so where its label sits.
- **Behavior below desktop**, where five short labels may not fit. Named as unowned in `recursica-skill-design-router`.

## Pre-flight checklist

- [ ] Exactly one option can be chosen, and something is always selected.
- [ ] Between 2 and 5 options, with one- or two-word labels.
- [ ] Tabs were not used as the fallback when the set grew; a vertical radio group or dropdown was.
- [ ] Commit timing matches the system's single mode.
- [ ] Switching is cheap; nothing heavy or destructive fires on selection.
- [ ] The group is announced as a radio group with an accessible name, one option selected.
- [ ] Selected state is programmatic, not color alone; icon-only segments have explicit names.
- [ ] The group is one tab stop; arrow keys move selection; no per-segment tabindex.
- [ ] Focus lands on the selected segment when tabbing in.
- [ ] Focus and selection are visually distinguishable; the focus ring is intact.
- [ ] Content changes caused by switching are perceivable, not silent.
- [ ] No size or style axis was assumed; the orientation is `horizontal`, and any vertical single-select became a radio group.
- [ ] No component-owned styling was overridden.
- [ ] Nothing in the uncovered list was invented.
