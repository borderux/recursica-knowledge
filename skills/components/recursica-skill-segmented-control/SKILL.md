---
name: recursica-skill-segmented-control
description: Rules for the Recursica segmented control, the horizontal single-select — when it beats radios, a dropdown, tabs, or chips, orientation and fill width, the 2 to 5 option limit, and radio-group accessibility. Use for view switchers, inline filters, and mode toggles. Not for multi-select — see recursica-skill-chip; not for parts of one whole — see recursica-skill-tabs.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Segmented control

A segmented control is a horizontal radio group: exactly one of a few options, all visible at once.

## When to use a segmented control

- **The layout calls for a horizontal single-select.** A segmented control is the house component for it. Never lay radio buttons out in a horizontal row.
- **A toggle is needed outside a form.** A switch belongs only in a form, so any two-state control in application chrome (the header, navigation and footer around the content), a filter bar, or a toolbar is a segmented control. In chrome, it shows icons rather than text labels — a light/dark theme control is the standard example. See `recursica-skill-screen-scaffolding` for where chrome sits.
- **The set is small: 2 to 5 options**, with short labels.
- **The choice switches a view or a mode** — list or grid, daily or weekly — where the options are closely tied to what is on screen.
- **The user filters content in place**, and a dropdown or a modal would be more than the filter needs.

## When not to use a segmented control

| Instead of a segmented control                                | Use                                                                |
| ------------------------------------------------------------- | ------------------------------------------------------------------ |
| More than five options                                        | A vertical radio group — or a dropdown, if it also goes over 7 ± 2 |
| The user may choose more than one                             | Selectable chips horizontally, a checkbox group vertically         |
| The labels are long or complex                                | A vertical radio group. Long labels break the compact layout       |
| The options are parts of one whole, each with its own content | `recursica-skill-tabs` — which have routes                         |
| Switching triggers a heavy reload or changes data             | A control with an explicit submit, and feedback                    |
| The choice is on or off                                       | A switch or a checkbox — see `recursica-skill-selection-controls`  |

**Never fall back to tabs when the set grows past five.** Tabs hold parts of one whole; a segmented control holds the values of a single-select field. Neither replaces the other. When the set grows past five, use a vertical radio group or a dropdown.

## Segmented control orientations and states

Taken from the UI kit (the token file, `recursica_ui-kit.json`, that says which variants and states each component has) → `ui-kit.components.segmented-control` and `segmented-control-item`. **Pass only the variants listed here.**

| Axis               | Options                  | On                       |
| ------------------ | ------------------------ | ------------------------ |
| `orientation`      | `horizontal`, `vertical` | `segmented-control`      |
| `fill-width`       | `false`, `true`          | `segmented-control`      |
| `selection-states` | `selected`, `unselected` | `segmented-control-item` |

**`fill-width: true` stretches the control to fill its container**, with the segments sharing the width equally. The default is `false`.

**A `vertical` orientation exists in the UI kit, but it is not the house pattern.** Use `horizontal` — see the rule below.

**An item may have a leading icon.** Only the design-system website shows it, as part of the item.

**There is no size axis (a property a component varies on, such as size or style; Figma calls it a variant property), no style axis, and no disabled state** on either the control or the item.

## Rules for segmented controls

**This control's limit is 2–5, and it overrides the general one.** The house limit on options is 7 ± 2, but a segmented control is horizontal and compact, so the tighter limit wins. Owned by `recursica-skill-selection-controls`.

**Use `horizontal`. The vertical orientation is not the house pattern.** A segmented control is the house answer for a _horizontal_ single-select, and nothing else. `recursica-skill-selection-controls` names the **radio group** as the vertical single-select, stacked one option per row. The `vertical` orientation exists in the UI kit, but a vertical single-select is a radio group — so do not use the `vertical` orientation.

**Labels are one or two words.** If a label needs more than two words, use a different control.

**Something is always selected.** A segmented control has no empty state — it is a single-select field with a default. Choose the default by the pre-selection rules in `recursica-skill-selection-controls`.

**This control saves changes in the same mode as the rest of the system.** If the application saves selection changes immediately, this control does too. If the application saves everything together, so does this control. Never give this control a save mode of its own — see `recursica-skill-system-conventions`.

**Switching must be quick and must not destroy anything.** If the change is slow or destructive, use a control with an explicit submit and feedback instead.

**A segmented control used as a toggle keeps every rule on this page** — two to five options, something always selected, and quick, non-destructive switching. A two-option segmented control is still a segmented control, not a switch.

**Segments that are only icons still need names.** An icon carries no meaning on its own; see the accessibility section.

**Never use `fill-width: true` as an excuse for more options.** Stretching the control does not raise the limit.

## Accessibility

This component also follows the accessibility baseline in `recursica-skill-system-conventions`, including the focus ring. Only what is specific to it is listed here.

A segmented control is a radio group, and it must be built as one. The most common mistake is a row of buttons where only color marks the selected one. A screen reader does not announce that color, and keyboard users have to tab through every segment.

### Screen readers

- **It must be announced as a group of radio options** with exactly one selected — not as a set of buttons.
- **The group needs an accessible name** (the name a screen reader reads out for a control) — what is being chosen. "View", "Date range". Without it, a screen reader user hears the options but not what they choose.
- **Each segment announces its label, and whether it is selected.** Selection must be available in code. `recursica-skill-system-conventions` forbids showing it by color alone.
- **A segment that is only an icon must have an explicit name.** The icon is not announced.
- **A leading icon beside a label is decorative, and must be silent.**
- **If changing the selection changes the content on screen, that change must be perceivable.** A screen reader user who activates a segment and hears nothing has no way to know that the view behind it updated.

### Keyboard and non-mouse navigation

- **The group is a single tab stop** (a place the Tab key lands). Tab moves into the control and then out of it — it does not step through every segment. Do not add a tabindex to individual segments.
- **The arrow keys move the selection** within the group, following the orientation: left and right when horizontal, up and down when vertical. Home and End jump to the ends.
- **Because the arrow keys select as they move, keep each change quick and non-destructive.** For the same reason, a slow or destructive switch belongs on a different control.
- **Focus lands on the selected segment** when the user tabs in — not on the first segment.
- **Focus and selection must look different** — a user can have focus on the group while a different segment is selected, and both need to be visible.

## Styling the segmented control sets itself

Do not set or override any of these. The component sets them:

- `colors`, `elevation`, `border-size`, `border-radius`.
- `padding-horizontal`, `padding-vertical`, `item-gap`, `divider-size`.
- Item styling per selection state, including hover and focus.
- Equal-width distribution when `fill-width` is `true`.

## Skills to read with this one

- `recursica-skill-selection-controls` — when a segmented control is the right control, the rules it inherits from radio groups, pre-selection, and commit timing.
- `recursica-skill-working-memory` — the basis for option-count limits.
- `recursica-skill-system-conventions` — one behavioral mode per system; never carry meaning in a single channel.
- `recursica-skill-forms` — label placement and validation when the control is a form field.

## Open questions: ask, do not decide

- **When `fill-width: true` applies** — no rule says which surfaces get a stretched control.
- **Whether a single segment may be disabled**, and how that is shown.
- **Whether this control may be used as a labeled form field** instead of a view switcher, and if so, where its label goes.
- **Behavior below desktop size**, where five short labels may not fit. Named as having no owner in `recursica-skill-design-router`.

## Pre-flight checklist

- [ ] Exactly one option can be chosen, and something is always selected.
- [ ] There are between 2 and 5 options, with labels of one or two words.
- [ ] A set larger than five uses a vertical radio group or a dropdown, not tabs.
- [ ] Changes save in the same mode as the rest of the system.
- [ ] Switching is quick, and selecting an option triggers no slow reload or destructive change.
- [ ] The group is announced as a radio group with an accessible name, with one option selected.
- [ ] The selected state is available in code, not shown by color alone, and icon-only segments have explicit names.
- [ ] The group is one tab stop. The arrow keys move the selection, and no segment has its own tabindex.
- [ ] Focus lands on the selected segment when the user tabs in.
- [ ] Content changes caused by switching are perceivable to a screen reader user.
- [ ] The control uses no size or style axis. The orientation is `horizontal`, and any vertical single-select is a radio group.
- [ ] Styling comes from the component.
- [ ] Open questions were asked about, not decided: when `fill-width: true` applies, whether a single segment may be disabled, use as a labeled form field, and behavior below desktop size.
