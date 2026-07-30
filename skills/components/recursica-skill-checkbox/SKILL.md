---
name: recursica-skill-checkbox
description: How to use the Recursica checkbox correctly — checkbox, checkbox-item, and checkbox-group as one three-part control, when zero-to-many selection is right and when a radio group, switch, or dropdown replaces it, the option-count ceiling, select-all and indeterminate mechanics, table row and header selection, disabled vs. read-only, and the screen-reader and keyboard requirements. Use whenever adding, reviewing, or refactoring a checkbox, a checkbox group, or row selection in a table. Trigger on "checkbox", "checkbox group", "checklist", "select all", "indeterminate", "row selection", "header checkbox", "screen reader", "tab order", or a request to let a user pick any number of options. Do NOT use for one mutually exclusive choice — that is recursica-skill-radio-button. Do NOT use for a setting that applies the instant it is flipped — recursica-skill-switch. Do NOT use for which control a field gets, option counts, or commit timing — that is recursica-skill-selection-controls.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Checkbox

A checkbox flips a true/false flag on one specific value. A group of them lets the user select zero through N.

## Use it when

- **Zero to many options may be selected** — the options are independent and not mutually exclusive.
- **The user should see every option at once**, stacked and scannable, rather than opening something to find out what is available.
- **The options have a parent-child relationship** — a parent checkbox summarising a sub-list, which is what the indeterminate state is for.
- **The change commits with the form**, on submit, not the moment the box is ticked.

## Do not use it when

| Instead of a checkbox                                      | Use                                                                                 |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| The options are mutually exclusive — exactly one of N      | `recursica-skill-radio-button`. Never checkboxes for an exclusive choice            |
| The change must apply the instant it is flipped            | `recursica-skill-switch`                                                            |
| There is one lone binary field with no peers               | A switch usually reads better in a form — `recursica-skill-switch`                  |
| There are more options than the count ceiling              | `recursica-skill-dropdown` — a multi-select dropdown is a checkbox group inside one |
| The options must sit in a row                              | Selectable chips — `recursica-skill-chip`. Never rotate a checkbox group            |
| The user is choosing an action rather than setting a value | `recursica-skill-button`                                                            |
| The value is never editable by this user                   | `recursica-skill-read-only-field` — renders label and text, no input                |

**A disabled checkbox is not a way to display a value.** If nobody can ever change it here, it is not a form control.

## What exists

Taken from `recursica_ui-kit.json` → `ui-kit.components.checkbox`, `checkbox-group`, and `checkbox-item`. **Do not pass a variant, size, or state that is not listed here.**

| Component        | Axis               | Options                                 |
| ---------------- | ------------------ | --------------------------------------- |
| `checkbox`       | `selection-states` | `checked`, `unchecked`, `indeterminate` |
| `checkbox-group` | `layouts`          | `stacked`, `side-by-side`               |
| `checkbox-item`  | `states`           | `disabled`                              |

**Three components, one form field.** The group owns the layout and the spacing between items. The item owns one option's label and pairs it with a box. The checkbox owns the box itself and its selection state. Compose all three; never place bare `checkbox` instances in a form and call it a group.

**The axes sit on different parts, and that is deliberate.** `layouts` belongs to the **group** — it is one decision for the whole field. `disabled` belongs to the **item** — so a single option can be unavailable while its neighbours remain operable. There is no disabled state on the group as a whole; `globals.states.disabled` supplies the treatment.

**`layouts` is the label-placement axis, the same axis every field carries.** `side-by-side` puts the group's label beside the stack of items; `stacked` puts it above. **It is not an item-orientation axis.** Items are always stacked vertically — `recursica-skill-selection-controls` forbids a horizontal checkbox group outright, so `side-by-side` must never be read as "put the checkboxes in a row."

**`indeterminate` is a state of the `checkbox`, not a separate component.** It is what a select-all or a parent checkbox shows when some but not all of its children are checked.

**There is no error state on any of the three**, and no required axis. `Selected-disabled` and `Indeterminate-disabled` are documented outside the token inventory as states; those are the item's `disabled` combined with the checkbox's selection state, not extra selection states.

**"Selected" and "Unselected" are documented outside the token inventory; the kit says `checked` and `unchecked`.** One thing, two names.

**There is no size axis.** `size` and `icon-size` are fixed properties of the checkbox.

**Read-only is a separate component** — `read-only-field`, which renders text rather than inputs.

## Rules for using it

**A checkbox group holds at least two items.** One checkbox alone is not a group; if there is genuinely one binary field, reconsider it as a switch.

**Keep the group within 7 ± 2 options, biased lower** where the options are dissimilar, cognitively demanding, or need domain expertise. Above the ceiling, convert to a multi-select dropdown. See `recursica-skill-working-memory` for why the number is what it is.

**A long form is a legitimate reason to collapse a group into a multi-select dropdown** even below the ceiling. Six easily-read options are normally checkboxes, but avoiding a large vertical scroll is a real trade.

**Stack items vertically. Never horizontally.** A row of checkboxes makes it hard to tell which box belongs to which label. If the layout demands a row, change the control to selectable chips.

**Label placement is one decision per form, not per field.** This group's `layouts` value is not an independent choice — it matches every other field in the same form. The container-width test is applied once, to the form as a whole, and its answer governs every field in it, including short ones that would have fitted side by side. A whole form may switch placement between breakpoints, but never mixes the two at one breakpoint, and a section never gets its own placement. Owned by `recursica-skill-forms`.

**Pre-select freely.** Zero, some, or all pre-checked are all acceptable in a checkbox group — there is no house rule against it. This is the opposite of the radio group rule.

**Put the selection rule in assistive text**, not in a validation message the user only sees after failing. "At least two options required" belongs under the group. Pass it through `recursica-skill-assistive-element`.

**Select all is fine to include, and the group provides the indeterminate state** — select all, deselect one item, and the select-all control moves to indeterminate.

**Treat the need for select all as a signal.** If ticking items one by one would be arduous — twenty checkboxes — the control is wrong. Fix the structure before adding the affordance.

**Table row selection is a checkbox in the leftmost cell, with a checkbox in the table header.** The header checkbox mechanics are fixed:

- Indeterminate plus a click → **always goes to fully checked.** Never to unchecked.
- From fully checked or fully unchecked, a click flips to the other.
- Indeterminate is reachable **only** by selecting or deselecting individual rows. It is never a state the header control is clicked into.

**A checkbox may reveal further fields, and that does not change the commit model.** Checking "Car" may disclose a car-attributes group directly below; the whole form still submits as one batch. Keep the revealed content immediately adjacent to the checkbox that triggered it.

**Never mix instant commit with batch commit.** A checkbox group in a form that submits on a button must not write on change.

**Disabled and read-only are different components, not two styles of one.**

- **Disabled item** — still a checkbox, still visibly a control, just not currently operable. Use it when the user could make it operable by doing something else first.
- **Read-only field** — a different component entirely. No input at all. Use it when this user never changes this value here.

**Never disable a checkbox as the only explanation.** The reason must be in text nearby, because a disabled control is skipped by the keyboard.

## Accessibility

The component pairs each box with its item label and provides the focus ring. The group name, the exposed state, and everything below are yours, and they are the part most often missed.

### Screen readers

- **Every item needs a real label passed to `checkbox-item`.** That label is the accessible name. Text merely rendered beside a box is not a label and leaves the checkbox nameless.
- **The group needs its own label passed to `checkbox-group`**, and it must be announced when focus enters the group — not merely sit above it in reading order. Without it the user hears a list of options with no question attached.
- **The group label and the item labels do different jobs.** Never use one to do the other's work; see `recursica-skill-label`.
- **Checked state must be exposed programmatically**, never by fill colour or a tick glyph alone. A user who cannot see the box must still hear "checked" or "not checked". Required by `recursica-skill-system-conventions`.
- **Indeterminate must be exposed as a mixed state**, not as a dash that only exists visually. "Partially checked" is information; a horizontal bar is not.
- **A select-all control must name what it selects** — "Select all rows", not "Select all" floating in a table header.
- **In a table, each row checkbox must name its row.** Thirteen announcements of "checkbox, unchecked" tell the user nothing. Either the name carries the object or the row supplies it programmatically.
- **Pass the group's assistive text and any selection rule through the component**, so it is associated with the group rather than floating beside it. Unassociated text is invisible to someone who tabs straight to the first option.
- **Required state belongs to the group and must be programmatic**, not carried by an asterisk alone.
- **A disabled item is announced as disabled but skipped by Tab**, so any explanation carried only by its appearance is unreachable. Put the reason in text.
- **When a checkbox discloses further fields, say so before it is toggled** — in the item label or the group's assistive text. Content appearing silently below is easy to miss when read in sequence.

### Keyboard and non-mouse navigation

- **Space toggles a checkbox.** That is the expected key. Do not remap it, do not require Enter instead, and do not swallow it.
- **The library owns key handling inside the control.** Do not attach your own key listeners to the box or re-implement toggling — you will break the behaviour that already works.
- **Every checkbox in a group is its own tab stop.** This is the opposite of a radio group. Do not implement roving focus or arrow-key navigation inside a checkbox group, and do not repurpose Home and End — they belong to the page.
- **Clicking or tapping the item label toggles its checkbox.** That comes free from a real associated label and is a genuine target-size benefit. Do not break it by rendering the label as loose text.
- **Do not move focus for the user.** When a checkbox reveals fields below, focus stays on the checkbox; the user reaches the new fields with the next Tab. Yanking focus into disclosed content strands both keyboard and screen reader users.
- **Nothing needed may be hover-only.** A rule, a count, or a row action that appears only on hover is unavailable to keyboard and touch users alike.
- **Never suppress the focus ring, and never let it be confused with the checked state.** Focus and selection are two different things and must be distinguishable at a glance — a checked-but-unfocused box and a focused-but-unchecked box must not look alike.
- **Tab order follows visual order** down the stack, which the vertical-only rule makes trivial.

## Not your decision

Do not implement, override, or tune any of these — the components own them:

- On `checkbox`: `border-radius`, `border-size`, `size`, `icon-size`.
- On `checkbox-group`: `item-gap`, `padding`.
- On `checkbox-item`: `label-gap`, `max-width`, `text`, `colors`.
- Field colours and sizes from `globals.form.field`, and the disabled treatment from `globals.states.disabled`.
- The label-to-field gaps and the spacing between items in a form — `globals.form.properties.label-field-gap-horizontal`, `label-field-gap-vertical`, `vertical-item-gap`.
- The tick and indeterminate glyphs, hover and active styling, and the focus ring.

Do not add margins or spacer elements between items or between the group and its neighbours; the components carry the spacing.

## Load these too

- [`recursica-skill-selection-controls`](../../design-rules/recursica-skill-selection-controls/SKILL.md) — which control a field gets, checkbox vs. switch vs. radio, option counts, pre-selection, select-all, table selection mechanics, vertical-only layout, and commit timing.
- [`recursica-skill-forms`](../../design-rules/recursica-skill-forms/SKILL.md) — single-column layout, label placement, its container-width trigger, and one placement per form, required vs. optional marking, validation timing, save mode, and the rule that no form control goes inside a card.
- [`recursica-skill-label`](../recursica-skill-label/SKILL.md) — the group label and the item labels, copy that stands alone, and the required and optional markers.
- [`recursica-skill-assistive-element`](../recursica-skill-assistive-element/SKILL.md) — the help and error text below the group, and the copy rules for both.
- [`recursica-skill-working-memory`](../../psychology/recursica-skill-working-memory/SKILL.md) — the 7 ± 2 basis, and the recognition-versus-comparison boundary that decides when a long list is acceptable.
- [`recursica-skill-tables`](../../design-rules/recursica-skill-tables/SKILL.md) — table structure around row and header selection.
- [`recursica-skill-system-conventions`](../../design-rules/recursica-skill-system-conventions/SKILL.md) — never carry meaning in a single channel; fix the structure rather than adding a mechanism to cope with it.

## Uncovered — ask, do not invent

- **How a checkbox group shows an error.** The kit gives `dropdown` and `autocomplete` an `error` state and gives the checkbox none, yet a group can carry a selection rule that fails validation. The error treatment for a group is unstated.
- **The multi-select dropdown does not exist, and this is now confirmed in the shipped adapter as well as the token inventory** — the dropdown maps to a single-value select with no multi-select variant. `recursica-skill-selection-controls` requires one in two places. It is a gap in the component inventory, **not an invitation to compose one**: do not assemble a checkbox group inside a dropdown, and do not substitute a transfer list without asking. Where several values must be filtered, composing independent single-value filters that AND together is the workaround a build test used successfully. Ask.
- **Whether a select-all control is a `checkbox-item` in the group or something outside it**, and how it relates to the group's `item-gap`.
- **Selection maximums.** Whether a user may be limited to _n_ of many.
- **Nesting depth for parent-child checkboxes.** The indeterminate state implies hierarchy; no rule says how deep it may go or how a parent's state is computed beyond one level.

## Pre-flight checklist

- [ ] The options are genuinely non-exclusive; nothing mutually exclusive was built as checkboxes.
- [ ] The group holds at least two items, within 7 ± 2 and lower where the options are hard to distinguish.
- [ ] Items are stacked vertically; no horizontal group, and `side-by-side` was used only as label placement.
- [ ] `layouts` matches every other field in the same form — one placement per form at any given breakpoint, with no mixing between fields or sections.
- [ ] `checkbox`, `checkbox-item`, and `checkbox-group` are composed together, not bare checkboxes in a form.
- [ ] The group has a real label, every item has a real label, and neither is doing the other's job.
- [ ] The group label is announced when focus enters the group.
- [ ] Checked and indeterminate state are exposed programmatically, never by fill or glyph alone.
- [ ] Selection rules are in assistive text passed through the component, and required state is programmatic.
- [ ] Select all appears only where the group is genuinely long, and clicking an indeterminate header checkbox selects all.
- [ ] Table row checkboxes name their row; the header checkbox names what it selects.
- [ ] Space toggles, every checkbox is its own tab stop, no arrow-key or roving focus was added, and no key handling was overridden.
- [ ] Clicking the item label toggles the box.
- [ ] Focus is never moved for the user, including when a checkbox discloses fields below.
- [ ] Nothing needed requires hover; the focus ring is intact and distinguishable from the checked state.
- [ ] Disabled is used only for temporarily unavailable options, with the reason in text; never-editable values use the read-only field.
- [ ] No variant, size, or state outside the inventory above was passed, and no component-owned property was overridden.
- [ ] The group commits with the form, in the same save mode as everything else in the system.
- [ ] Nothing in the uncovered list — group error state, multi-select dropdown, selection maximums, nesting depth — was invented.
