---
name: recursica-skill-switch
description: How to use the Recursica switch — the tests a value must pass for a switch, commit timing that follows the app's save mode, no switches in table rows or for high-stakes settings, and disabled versus read-only. Use for on/off settings and toggles. Not for values saved with a form — see recursica-skill-checkbox; control choice lives in recursica-skill-selection-controls.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Switch

A switch turns one thing on or off. The label says what is being controlled; the state is simply true or false.

## Use it when

- **The binary-inverse test passes.** The opposite of the value must be binary, known, and unique — true/false, yes/no, on/off. "Black" fails, because _not black_ could be gray, or pink, or anything.
- **The label test passes.** The label alone names what is being controlled, with no competing values. A radio group is one label with several values; a switch is one label whose value is implied.
- **When it saves matches every other switch in the system.** A switch may save immediately, or save with the form — immediately feels slightly more natural — but that choice is made once for the whole application. If this one control would have to behave differently from the system's other switches, it is not a switch.
- **The state must be readable at a glance**, including on touch, where the switch's larger target and clearer on/off look are an advantage.
- **It is the one lone binary field in a form.** A single checkbox with no others beside it looks odd; a switch usually reads better. This is the one case where appearance may decide, because the two work the same way here.

**A switch appears only inside a form.** Outside one — in chrome (the header, navigation and footer around the content), a filter bar, a toolbar, or a header — the control is a `recursica-skill-segmented-control`, whatever the value looks like. Owned by `recursica-skill-selection-controls`.

## Do not use it when

| Instead of a switch                                                                | Use                                                                                |
| ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| The opposite of the value is not binary, known, and unique                         | `recursica-skill-checkbox`                                                         |
| This control alone must save at a different point from the system's other switches | `recursica-skill-checkbox`. Mixing save modes across switches is what is forbidden |
| One label has several possible values                                              | `recursica-skill-radio-button`                                                     |
| Several independent flags are set together                                         | `recursica-skill-checkbox` — checkboxes work in groups, switches do not            |
| The control sits in a table row                                                    | A checkbox. A switch is bulky, and wastes space in a dense row                     |
| Flipping it could have serious consequences                                        | A checkbox plus a confirmation — see `recursica-skill-buttons-links`               |
| The user is performing an action rather than setting a state                       | `recursica-skill-button`                                                           |
| This user can never edit the value                                                 | `recursica-skill-read-only-field` — shows the label and text, with no input        |

**A switch has a deliberately narrow use.** Reach for a checkbox unless both tests above pass. A switch must be understood instantly — if the user has to work out what "off" means, it is the wrong control.

## What exists

Taken from the UI kit (the token file, `recursica_ui-kit.json`, that says which variants and states each component has) → `ui-kit.components.switch`, `switch-group`, and `switch-item`. **Do not pass a variant, size, or state that is not listed here.**

| Component      | Axis               | Options                   |
| -------------- | ------------------ | ------------------------- |
| `switch`       | `selection-states` | `selected`, `unselected`  |
| `switch-group` | `layouts`          | `stacked`, `side-by-side` |
| `switch-item`  | `states`           | `disabled`                |

**Three components, one form field.** The group owns the layout and the spacing between items. The item owns one switch's label. The switch owns the track (the bar), the thumb (the handle that slides), and its state. Use all three together, instead of placing a bare `switch` beside some text.

**The axes (the properties a component varies on, such as size and style; Figma calls them variant properties) sit on different parts, and that is on purpose.** `layouts` belongs to the group — one decision for the whole field. `disabled` belongs to the item — so a single switch can be unavailable while the ones beside it can still be used. There is no disabled state for the group; `globals.states.disabled` supplies the look.

**`layouts` is the label-placement axis, the same axis every field has.** `side-by-side` puts the group's label beside the switches; `stacked` puts it above.

**The thumb can carry an icon** — `thumb-icon-size` exists — and that icon is a second visual signal of the state, alongside the thumb's position and the track's color.

**There is no size axis**, none of the three has an error state, and there is no required axis. `Enabled Selected`, `Disabled Selected`, `Enabled Unselected`, and `Disabled Unselected` are shown only on the design-system website. Those are the item's `disabled` combined with the switch's selection state — not four selection states.

**There is no axis for which side of the label the switch sits on** — see the uncovered list, because one is shown only on the design-system website.

**Read-only is a separate component** — `read-only-field`, which shows text instead of a control.

## Rules for using it

**Both tests are gates, not guidance.** Run the binary-inverse test and the label test before choosing this control. If either one fails, it is a checkbox.

**The label names what is controlled, not the state it would move to.** "Email notifications" — not "Turn on email notifications", and not "Off". The switch's own state carries on or off. The label must not repeat it or contradict it, and it must not change when the switch is flipped.

**Do not use a switch for anything with serious consequences if it is flipped by accident.** Where a setting is destructive, cannot be undone, or is high-risk, use a checkbox with a confirmation, or another safeguard, instead.

**When the switch saves follows the application's single mode.** `recursica-skill-selection-controls` allows a switch to save immediately, or to save on submit with the rest of the form — immediately feels slightly more natural for a switch — and that choice is made once, for the whole system. A switch in a form that saves everything together is correct, as long as every switch in the system also waits for Save. What is forbidden is mixing the two: an application must never have some switches that save the instant they are flipped and others that wait for a Save. Needing a Save is not, by itself, a reason to reach for a checkbox.

**If the system's switches save immediately, the page must show a save status that stays on the page.** Saving field by field carries that requirement; saving everything together carries the opposite — no status, and no indicator of unsaved changes. See the save-mode table in `recursica-skill-forms`.

**Never mix instant saving with saving everything together.** Either everything saves when it changes, or everything saves on submit — across the whole system, not just within one form.

**Put the rule or the consequence in assistive text**, below the switch, through `recursica-skill-assistive-element`. If flipping it changes something the user cannot see, say so there.

**A switch may reveal more fields**, kept right below it and appearing immediately.

**Stack switches vertically** in a group, one per row, like every other form field.

**Label placement is one decision per form, not per field.** This group's `layouts` value is not a separate choice — it matches every other field in the same form. The container-width test is applied once, to the whole form, and its answer governs every field in it, including short ones that would have fitted side by side. A whole form may switch placement between breakpoints, but it never mixes the two at one breakpoint, and a section never gets its own placement. Owned by `recursica-skill-forms`.

**Disabled and read-only are different components, not two styles of one.**

- **Disabled item** — still a switch, still clearly a control, just not usable right now. Use it when the user could make it usable by doing something else first.
- **Read-only field** — a different component entirely, with no control at all. Use it when this user never changes this value here.

**Never disable a switch as the only explanation.** The keyboard skips a disabled control, so the reason must be in text nearby.

## Accessibility

This component also follows the accessibility baseline in `recursica-skill-system-conventions`. Only what is specific to it is listed here.

The component pairs the switch with its item label, makes on and off available, and provides the focus ring. Everything below is up to you — and a switch is unusually easy to get wrong, because its whole meaning lives in a position and a color.

### Screen readers

- **Every switch needs a real label passed to `switch-item`.** That label is the accessible name (the name a screen reader reads out for a control). Text just drawn beside the track is not a label, and a switch with no name is announced as an unlabeled control.
- **The label must state what is controlled, and make sense on its own**, out of context, because that is how it is announced. "Notifications" beside a track tells a screen reader user nothing about what turning it off does.
- **The on/off state must be available in code**, never shown only by the thumb's position or the track's color. The user must hear "on" or "off" — as `recursica-skill-system-conventions` requires.
- **The thumb icon is decorative, and must be silent.** It is the second visual signal; the state made available in code carries the meaning.
- **Never put the state in the visible label.** A label that reads "On" is announced as the name, so the user hears "On, off", and cannot tell which is the name and which is the state.
- **A group of switches needs a group label passed to `switch-group`**, announced when focus enters the group.
- **If flipping the switch saves immediately, that result must be announced** — as a status message the user can perceive, not a silent save. A confirmation that is only visual is a silent failure.
- **Do not announce a change the user did not make.** When another control changes a switch's state, the new state needs to be findable, not shouted.
- **A disabled switch is announced as disabled, but Tab skips it**, so any explanation carried only by how it looks cannot be reached. Put the reason in text.
- **When a switch reveals more fields, say so before it is flipped** — in the label or in the assistive text.

### Keyboard and non-mouse navigation

- **Space toggles a switch.** That is the expected key. Do not remap it, do not require a drag, and do not swallow it.
- **A switch must never need a drag or a swipe.** The thumb slides only as a visual cue; the control is operated by a click or a key press.
- **The library owns how keys work inside the control.** Do not attach your own key listeners, and do not rebuild the toggling.
- **Each switch is its own tab stop** (a place the Tab key lands). A group of switches is a group of tab stops, unlike a radio group. Do not add roving focus (where the arrow keys move between items that share one tab stop) or arrow-key movement between switches, and do not repurpose Home and End.
- **Clicking or tapping the item label toggles the switch.** That comes free with a real connected label, and it gives the user a bigger target.
- **Do not move focus for the user.** Focus stays on the switch after it is flipped — including when flipping it reveals fields below — so the user can flip it straight back.
- **Nothing needed may appear only on hover** — not the consequence, and not a tooltip explaining what off means.

## Decided elsewhere

Do not implement, override, or tune any of these — the components own them:

- On `switch`: `thumb-height`, `thumb-width`, `track-inner-padding`, `thumb-border-radius`, `track-border-radius`, `thumb-icon-size`, `track-width`, `thumb-elevation`, `track-elevation`.
- On `switch-group`: `item-gap`, `padding`.
- On `switch-item`: `label-gap`, `label-max-width`, `text`, `colors`.
- Field colors and sizes from `globals.form.field`, and the disabled treatment from `globals.states.disabled`.
- The label-to-field gaps and the spacing between items in a form — `globals.form.properties.label-field-gap-horizontal`, `label-field-gap-vertical`, `vertical-item-gap`.
- The thumb's travel and any animation, hover and active styling, and the focus ring.

Do not add margins or spacer elements between switches or around the group; the components carry the spacing.

## Load these too

- `recursica-skill-selection-controls` — the binary-inverse and label tests, switch vs. checkbox, the lone binary field, no switches in table rows, and system-wide commit timing.
- `recursica-skill-forms` — the save-mode table and its status-message requirement, single-column layout, label placement and one placement per form, and progressive disclosure.
- `recursica-skill-label` — label copy that names the object and stands alone, and the required and optional markers.
- `recursica-skill-assistive-element` — the help and error text below the switch, and the copy rules for both.
- `recursica-skill-buttons-links` — confirmation for high-consequence changes, and undo.
- `recursica-skill-system-conventions` — one behavioral mode per system, and never carry meaning in a single channel.

### Only if the screen also uses it

- `recursica-skill-checkbox` — the control a switch becomes whenever either test fails.

## Uncovered — ask, do not invent

- **An axis for which side of the label the switch sits on is shown only on the design-system website, with no token behind it.** `On Left` and `On Right` appear there, but the UI kit defines no such axis on `switch`, `switch-item`, or `switch-group`. Do not build one, and do not rely on this without asking.
- **How a switch shows an error.** The UI kit gives `dropdown` and `autocomplete` an `error` state, and gives the switch none.
- **What a switch does while its change is in flight**, and what happens if the immediate save fails. There is no pending, loading, or failure state.
- **Whether a `switch-group` may hold more than a handful of switches**, and whether the 7 ± 2 limit applies to switches at all — the limit is stated only for radio and checkbox groups.

## Pre-flight checklist

- [ ] The switch is inside a form. Nothing in chrome, a toolbar, or a filter bar uses one.
- [ ] The binary-inverse test passes — the opposite state is known, unique, and binary.
- [ ] The label test passes — the label alone names what is controlled, with no competing values.
- [ ] The label says what is controlled, never the state, and does not change when the switch is flipped.
- [ ] Nothing with serious consequences, nothing destructive, and nothing that cannot be undone sits behind a bare switch.
- [ ] No switch sits in a table row.
- [ ] When it saves matches every other switch in the system, and saving immediately comes with a save status that stays on the page.
- [ ] Nothing mixes switches that save when flipped with switches that wait for Save.
- [ ] `switch`, `switch-item`, and `switch-group` are used together, and groups are stacked vertically.
- [ ] `layouts` matches every other field in the same form — one placement per form at any given breakpoint, with no mixing between fields or sections.
- [ ] Consequences and rules are in assistive text passed through the component.
- [ ] The on/off state is available in code, never shown only by the thumb's position or the track's color, and the thumb icon is silent.
- [ ] A group of switches has a group label, announced when focus enters it.
- [ ] Space toggles, no drag or swipe is needed, and you overrode no key handling.
- [ ] Each switch is its own tab stop, and you added no arrow-key or roving focus.
- [ ] Clicking the item label toggles the switch.
- [ ] Focus is never moved for the user, including when flipping it reveals fields below.
- [ ] Disabled is used only for switches that are unavailable for now, with the reason in text. Values that can never be edited use the read-only field.
- [ ] You passed no variant, size, or state outside the inventory above, and overrode no property the component owns.
- [ ] You invented nothing from the uncovered list: which side of the label, the error state, the in-flight state, and group size.
