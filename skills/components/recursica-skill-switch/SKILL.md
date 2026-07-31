---
name: recursica-skill-switch
description: How to use the Recursica switch correctly — switch, switch-item, and switch-group as one three-part control, the binary-inverse and label tests that must pass before a switch is allowed, how commit timing follows the application's single save mode, why switches stay out of table rows and away from high-consequence settings, disabled vs. read-only, and the screen-reader and keyboard requirements. Use whenever adding, reviewing, or refactoring a switch, a toggle, or an on/off setting. Trigger on "switch", "toggle", "on off", "enable disable setting", "instant save", "settings toggle", "screen reader", "tab order", or a request to let a user turn something on or off. Do NOT use for zero-to-many selection or a value that commits on Save — that is recursica-skill-checkbox. Do NOT use for one of several values against one label — recursica-skill-radio-button. Do NOT use for which control a field gets or commit timing across a system — that is recursica-skill-selection-controls.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Switch

A switch turns one thing on or off. The label says what is controlled; the state is simply true or false.

## Use it when

- **The binary-inverse test passes.** The inverse of the value must be binary, known, and unique — true/false, yes/no, on/off. "Black" fails, because _not black_ could be gray, or pink, or anything.
- **The label test passes.** The label alone names what is being controlled, with no competing values. A radio group is one label with several values; a switch is one label whose value is implied.
- **Its commit timing matches every other switch in the system.** A switch may commit immediately or commit with the form — immediate reads slightly more naturally — but the choice is made once for the whole application. If this one control would have to behave differently from the system's other switches, it is not a switch.
- **The state must be readable at a glance**, including on touch, where the switch's larger target and clearer on/off reading are an advantage.
- **It is the one lone binary field in a form.** A single checkbox with no peers looks odd; a switch usually reads better. This is the one case where appearance may decide, because the two are functionally interchangeable here.

**A switch only appears inside a form.** Outside one — in chrome, a filter bar, a toolbar, a header — the control is a `recursica-skill-segmented-control`, whatever the value looks like. Owned by `recursica-skill-selection-controls`.

## Do not use it when

| Instead of a switch                                                         | Use                                                                                |
| --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| The inverse of the value is not binary, known, and unique                   | `recursica-skill-checkbox`                                                         |
| This control alone must commit differently from the system's other switches | `recursica-skill-checkbox`. Mixing commit modes across switches is the prohibition |
| One label carries several possible values                                   | `recursica-skill-radio-button`                                                     |
| Several independent flags are set together                                  | `recursica-skill-checkbox` — checkboxes work in groups, switches do not            |
| The control sits in a table row                                             | A checkbox. A switch is bulky and wastes space at row density                      |
| Toggling it could have serious consequences                                 | A checkbox plus a confirmation — see `recursica-skill-buttons-links`               |
| The user is performing an action rather than setting a state                | `recursica-skill-button`                                                           |
| The value is never editable by this user                                    | `recursica-skill-read-only-field` — renders label and text, no input               |

**A switch has a deliberately narrow use.** Reach for a checkbox unless both tests above pass. A switch must be understood instantly — if the user has to work out what "off" means, it is the wrong control.

## What exists

Taken from `recursica_ui-kit.json` → `ui-kit.components.switch`, `switch-group`, and `switch-item`. **Do not pass a variant, size, or state that is not listed here.**

| Component      | Axis               | Options                   |
| -------------- | ------------------ | ------------------------- |
| `switch`       | `selection-states` | `selected`, `unselected`  |
| `switch-group` | `layouts`          | `stacked`, `side-by-side` |
| `switch-item`  | `states`           | `disabled`                |

**Three components, one form field.** The group owns the layout and the spacing between items. The item owns one switch's label. The switch owns the track and the thumb and its state. Compose all three rather than placing a bare `switch` beside some text.

**The axes sit on different parts, and that is deliberate.** `layouts` belongs to the **group** — one decision for the whole field. `disabled` belongs to the **item** — so a single switch can be unavailable while its neighbours stay operable. There is no disabled state on the group; `globals.states.disabled` supplies the treatment.

**`layouts` is the label-placement axis, the same axis every field carries.** `side-by-side` puts the group's label beside the switches; `stacked` puts it above.

**The thumb can carry an icon** — `thumb-icon-size` exists — and that icon is a second visual channel for the state alongside the thumb's position and the track's colour.

**There is no size axis**, no error state on any of the three, and no required axis. `Enabled Selected`, `Disabled Selected`, `Enabled Unselected`, and `Disabled Unselected` are documented outside the token inventory; those are the item's `disabled` combined with the switch's selection state, not four selection states.

**There is no label-side axis** — see the uncovered list, because one is documented outside the token inventory.

**Read-only is a separate component** — `read-only-field`, which renders text rather than a control.

## Rules for using it

**Both tests are gates, not guidance.** Run the binary-inverse test and the label test before choosing this control. If either fails, it is a checkbox.

**The label names what is controlled, not the state it would move to.** "Email notifications", not "Turn on email notifications" and not "Off". The switch's own state carries on/off; the label must not duplicate or contradict it, and it must not change when the switch is flipped.

**Do not use a switch for anything with serious consequences if flipped by accident.** Where a setting is destructive, irreversible, or high-risk, use a checkbox with a confirmation or another safeguard instead.

**The switch's commit timing follows the application's single mode.** `recursica-skill-selection-controls` allows a switch to commit immediately or to commit on submit with the rest of the form — immediate is slightly more natural for a switch — and that choice is made once, for the whole system. A switch in a batch-save form is correct, provided every switch in the system also waits for Save. **The prohibition is mixing the two:** an application must never hold some switches that write the instant they are flipped and others that wait for a Save. Needing a Save is not by itself a reason to reach for a checkbox.

**If the system's switches commit immediately, the page must show a persistent save status.** Field-level commit carries that requirement; batch save carries the opposite — no status and no dirty indicator. See the save-mode table in `recursica-skill-forms`.

**Never mix instant writes with batch submit.** Either everything commits on change or everything commits on submit, across the system and not just within one form.

**Put the rule or consequence in assistive text**, below the switch, through `recursica-skill-assistive-element`. If flipping it changes something the user cannot see, say so there.

**A switch may reveal further fields**, kept immediately below and appearing in real time.

**Stack switches vertically** in a group, one per row, like every other form field.

**Label placement is one decision per form, not per field.** This group's `layouts` value is not an independent choice — it matches every other field in the same form. The container-width test is applied once, to the form as a whole, and its answer governs every field in it, including short ones that would have fitted side by side. A whole form may switch placement between breakpoints, but never mixes the two at one breakpoint, and a section never gets its own placement. Owned by `recursica-skill-forms`.

**Disabled and read-only are different components, not two styles of one.**

- **Disabled item** — still a switch, still visibly a control, just not currently operable. Use it when the user could make it operable by doing something else first.
- **Read-only field** — a different component entirely, no control at all. Use it when this user never changes this value here.

**Never disable a switch as the only explanation.** A disabled control is skipped by the keyboard, so the reason must be in text nearby.

## Accessibility

The component pairs the switch with its item label, exposes on/off, and provides the focus ring. Everything below is yours, and a switch is unusually easy to get wrong because its whole meaning lives in a position and a colour.

### Screen readers

- **Every switch needs a real label passed to `switch-item`.** That label is the accessible name. Text merely rendered beside the track is not a label, and a switch with no name is announced as an unlabelled control.
- **The label must state what is controlled and read correctly alone**, out of context, because that is how it is announced. "Notifications" beside a track tells a screen reader user nothing about what turning it off does.
- **On/off state must be exposed programmatically**, never by the thumb's position or the track's colour alone. The user must hear "on" or "off" — required by `recursica-skill-system-conventions`.
- **The thumb icon is decorative and must be silent.** It is the second visual channel; the exposed state carries the meaning.
- **Never carry the state in the visible label.** A label that reads "On" is announced as the name, so the user hears "On, off" and cannot tell which is the name and which is the state.
- **A group of switches needs a group label passed to `switch-group`**, announced when focus enters the group.
- **If flipping the switch commits immediately, that result must be announced** — a status message the user can perceive, not a silent write. A visual-only confirmation is a silent failure.
- **Do not announce a change the user did not make.** A switch whose state is altered by another control needs its new state discoverable, not shouted.
- **A disabled switch is announced as disabled but skipped by Tab**, so any explanation carried only by its appearance is unreachable. Put the reason in text.
- **When a switch discloses further fields, say so before it is flipped** — in the label or the assistive text.

### Keyboard and non-mouse navigation

- **Space toggles a switch.** That is the expected key. Do not remap it, do not require a drag, and do not swallow it.
- **A switch must never require a drag or swipe gesture.** The thumb slides as a visual affordance only; the control is operated by a click or a key press.
- **The library owns key handling inside the control.** Do not attach your own key listeners and do not re-implement toggling.
- **Each switch is its own tab stop.** A group of switches is a group of tab stops, unlike a radio group. Do not implement roving focus or arrow-key navigation between switches, and do not repurpose Home and End.
- **Clicking or tapping the item label toggles the switch.** That comes free from a real associated label and is a genuine target-size benefit.
- **Do not move focus for the user.** Focus stays on the switch after it is flipped, including when the flip discloses fields below, so the user can flip it straight back.
- **Nothing needed may be hover-only** — not the consequence, not a tooltip explaining what off means.
- **Never suppress the focus ring, and never let it be confused with the on state.** A switch that is on and a switch that is focused must be distinguishable at a glance; the ring must not read as part of the track.

## Not your decision

Do not implement, override, or tune any of these — the components own them:

- On `switch`: `thumb-height`, `thumb-width`, `track-inner-padding`, `thumb-border-radius`, `track-border-radius`, `thumb-icon-size`, `track-width`, `thumb-elevation`, `track-elevation`.
- On `switch-group`: `item-gap`, `padding`.
- On `switch-item`: `label-gap`, `label-max-width`, `text`, `colors`.
- Field colours and sizes from `globals.form.field`, and the disabled treatment from `globals.states.disabled`.
- The label-to-field gaps and the spacing between items in a form — `globals.form.properties.label-field-gap-horizontal`, `label-field-gap-vertical`, `vertical-item-gap`.
- The thumb's travel and any animation, hover and active styling, and the focus ring.

Do not add margins or spacer elements between switches or around the group; the components carry the spacing.

## Load these too

- [`recursica-skill-selection-controls`](../../design-rules/recursica-skill-selection-controls/SKILL.md) — the binary-inverse and label tests, switch vs. checkbox, the lone binary field, no switches in table rows, and system-wide commit timing.
- [`recursica-skill-forms`](../../design-rules/recursica-skill-forms/SKILL.md) — the save-mode table and its status-message requirement, single-column layout, label placement and one placement per form, and progressive disclosure.
- [`recursica-skill-label`](../recursica-skill-label/SKILL.md) — label copy that names the object and stands alone, and the required and optional markers.
- [`recursica-skill-assistive-element`](../recursica-skill-assistive-element/SKILL.md) — the help and error text below the switch, and the copy rules for both.
- [`recursica-skill-checkbox`](../recursica-skill-checkbox/SKILL.md) — the control a switch becomes whenever either test fails.
- [`recursica-skill-buttons-links`](../../design-rules/recursica-skill-buttons-links/SKILL.md) — confirmation for high-consequence changes, and undo.
- [`recursica-skill-system-conventions`](../../design-rules/recursica-skill-system-conventions/SKILL.md) — one behavioural mode per system, and never carry meaning in a single channel.

## Uncovered — ask, do not invent

- **An orientation axis for which side of the label the switch sits on is documented outside the token inventory, with no token behind it.** `On Left` and `On Right` appear there; the kit defines no such axis on `switch`, `switch-item`, or `switch-group`. Do not build one, and do not rely on this without asking.
- **How a switch shows an error.** The kit gives `dropdown` and `autocomplete` an `error` state and gives the switch none.
- **What a switch does while its change is in flight**, and what happens if the immediate write fails. No pending, loading, or failure state exists.
- **Whether a `switch-group` may hold more than a handful of switches**, and whether the 7 ± 2 ceiling applies to switches at all — the ceiling is stated for radio and checkbox groups only.

## Pre-flight checklist

- [ ] The switch is inside a form; nothing in chrome, a toolbar, or a filter bar uses one.
- [ ] The binary-inverse test passes — the opposite state is known, unique, and binary.
- [ ] The label test passes — the label alone names what is controlled, with no competing values.
- [ ] The label states what is controlled, never the state, and does not change when the switch is flipped.
- [ ] Nothing high-consequence, destructive, or irreversible is behind a bare switch.
- [ ] No switch sits in a table row.
- [ ] Commit timing matches every other switch in the system, and instant commit is paired with a persistent save status.
- [ ] Nothing mixes switches that write on flip with switches that wait for Save.
- [ ] `switch`, `switch-item`, and `switch-group` are composed together; groups are stacked vertically.
- [ ] `layouts` matches every other field in the same form — one placement per form at any given breakpoint, with no mixing between fields or sections.
- [ ] Consequences and rules are in assistive text passed through the component.
- [ ] On/off state is exposed programmatically, never by thumb position or track colour alone; the thumb icon is silent.
- [ ] A group of switches has a group label, announced when focus enters.
- [ ] Space toggles, no drag or swipe is required, and no key handling was overridden.
- [ ] Each switch is its own tab stop; no arrow-key or roving focus was added.
- [ ] Clicking the item label toggles the switch.
- [ ] Focus is never moved for the user, including when a flip discloses fields below.
- [ ] Nothing needed requires hover; the focus ring is intact and distinguishable from the on state.
- [ ] Disabled is used only for temporarily unavailable switches, with the reason in text; never-editable values use the read-only field.
- [ ] No variant, size, or state outside the inventory above was passed, and no component-owned property was overridden.
- [ ] Nothing in the uncovered list — label side, error state, in-flight state, group size — was invented.
