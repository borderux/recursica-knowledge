---
name: recursica-skill-radio-button
description: How to use the Recursica radio button correctly — radio-button, radio-button-item, and radio-button-group as one three-part control, when an exclusive choice belongs to a radio group and when a dropdown or segmented control replaces it, the option-count ceiling, the caution against pre-selecting a value, disabled vs. read-only, and the screen-reader and keyboard requirements including the single tab stop and arrow-key selection. Use whenever adding, reviewing, or refactoring a radio button or a radio group. Trigger on "radio button", "radio group", "radio", "single select", "one of", "mutually exclusive", "pre-selected", "default option", "screen reader", "tab order", or a request to let a user choose exactly one option. Do NOT use for zero-to-many selection — that is recursica-skill-checkbox. Do NOT use for a horizontal single-select row — recursica-skill-segmented-control. Do NOT use for which control a field gets or option counts — that is recursica-skill-selection-controls.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Radio button

A radio group is one label with several values, of which exactly one may be selected.

## Use it when

- **The options are mutually exclusive and exactly one must be chosen.** Radio buttons are the only correct control for this.
- **The user should see every option at once**, stacked and scannable, rather than opening something to find out what is available.
- **The set is small enough to compare in place** — within the count ceiling below.
- **The change commits with the form**, on submit.

## Do not use it when

| Instead of a radio group                                     | Use                                                                             |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| Zero through N options may be selected                       | `recursica-skill-checkbox`                                                      |
| The value is binary and its inverse is known and unique      | `recursica-skill-switch` — see the binary-inverse test in the design rules      |
| There are more options than the count ceiling                | `recursica-skill-dropdown` (single select)                                      |
| The user must type to find the value in a large familiar set | `recursica-skill-autocomplete`                                                  |
| The options must sit in a row                                | `recursica-skill-segmented-control`. Never rotate a radio group, never use tabs |
| Nothing has to be chosen at all                              | Question whether the choice is really exclusive — see the design rules          |
| The user is choosing an action rather than setting a value   | `recursica-skill-button`                                                        |
| The value is never editable by this user                     | `recursica-skill-read-only-field` — renders label and text, no input            |

**Using checkboxes for a mutually exclusive choice is a misstatement of the data.** A checkbox means "select as many as apply" by definition. There is no exception.

## What exists

Taken from `recursica_ui-kit.json` → `ui-kit.components.radio-button`, `radio-button-group`, and `radio-button-item`. **Do not pass a variant, size, or state that is not listed here.**

| Component            | Axis               | Options                   |
| -------------------- | ------------------ | ------------------------- |
| `radio-button`       | `selection-states` | `selected`, `unselected`  |
| `radio-button-group` | `layouts`          | `stacked`, `side-by-side` |
| `radio-button-item`  | `states`           | `disabled`                |

**Three components, one form field.** The group owns the layout and the spacing between items. The item owns one option's label and pairs it with a control. The radio button owns the circle itself and its selection state. Compose all three; never place bare `radio-button` instances in a form and call it a group.

**The axes sit on different parts, and that is deliberate.** `layouts` belongs to the **group** — one decision for the whole field. `disabled` belongs to the **item** — so a single option can be unavailable while the rest of the choice stays operable. There is no disabled state on the group; `globals.states.disabled` supplies the treatment.

**`layouts` is the label-placement axis, the same axis every field carries.** `side-by-side` puts the group's label beside the stack of options; `stacked` puts it above. **It is not an item-orientation axis.** Options are always stacked vertically — `recursica-skill-selection-controls` forbids a horizontal radio group outright, so `side-by-side` must never be read as "put the radios in a row."

**There is no indeterminate state**, because a radio group has no partial condition. There is no error state on any of the three, and no required axis.

**There is no size axis.** `size` and `icon-size` are fixed properties of the radio button.

**Read-only is a separate component** — `read-only-field`, which renders text rather than inputs.

## Rules for using it

**A radio group holds at least two items.** A single radio button is not a choice, and cannot be deselected once selected.

**Keep the group within 7 ± 2 options.** That is the ceiling — one rule, one number, the same one `recursica-skill-working-memory` and `recursica-skill-selection-controls` state. Bias lower where the options are dissimilar, cognitively demanding, or need domain expertise. Above the ceiling, convert to a dropdown.

**Be very cautious about pre-selecting a value.** Most users do not know how to deselect a radio button, and a radio cannot be deselected once it is set, so a default silently becomes their answer. Pre-select only when the default is genuinely correct for nearly everyone. This is the rule in `recursica-skill-selection-controls`, and it governs: there is no house guidance that the top option should be selected.

**Traditionally a radio group requires an answer**, and the user cannot progress until one option is selected. A group with nothing selected and no requirement to select is unusual and confusing — treat it as a smell and ask whether the choice is really exclusive.

**A radio group used for progressive disclosure may legitimately start with nothing selected**, so that the content it reveals appears only once the user has actually chosen. That is compatible with the caution above rather than an exception to it — nothing is pre-selected, and nothing is revealed until the user decides.

**Stack options vertically. Never horizontally.** A row of radios makes it hard to tell which control belongs to which label, and the pairing between control and value stops being discrete. If the layout demands a row, change the control to a segmented control — which caps at 2–5 options. Never fall back to tabs.

**Label placement is one decision per form, not per field.** This group's `layouts` value is not an independent choice — it matches every other field in the same form. The container-width test is applied once, to the form as a whole, and its answer governs every field in it, including short ones that would have fitted side by side. A whole form may switch placement between breakpoints, but never mixes the two at one breakpoint, and a section never gets its own placement. Owned by `recursica-skill-forms`.

**Put the selection rule in assistive text** rather than a validation message the user only sees after failing. Pass it through `recursica-skill-assistive-element`.

**A radio option may reveal further fields, and that does not change the commit model.** Keep the revealed content immediately below the group that triggered it, appearing in real time, so the user can see the causal link. The whole form still submits as one batch.

**Never mix instant commit with batch commit.** A radio group in a form that submits on a button must not write on change.

**Disabled and read-only are different components, not two styles of one.**

- **Disabled item** — still a radio button, still visibly a control, just not currently selectable. Use it when the user could make it selectable by doing something else first.
- **Read-only field** — a different component entirely, with no input. Use it when this user never changes this value here.

**Never disable an option as the only explanation.** A disabled control is skipped by the keyboard, so the reason must be in text nearby.

## Accessibility

The component pairs each control with its item label, manages focus within the group, and provides the focus ring. The group name, the exposed state, and everything below are yours.

### Screen readers

- **Every option needs a real label passed to `radio-button-item`.** That label is the accessible name. Text merely rendered beside a control is not a label.
- **The group needs its own label passed to `radio-button-group`**, and it must be announced when focus enters the group — not merely sit above it in reading order. Without it the user hears values with no question attached, which is the single worst failure mode for this control.
- **The group must be announced as a group**, with a position within it — "option 2 of 5". That is what tells the user the options are alternatives rather than independent fields.
- **Selected state must be exposed programmatically**, never by fill colour or a dot alone. A user who cannot see the control must still hear "selected" or "not selected". Required by `recursica-skill-system-conventions`.
- **A pre-selected value is announced as the current answer.** This is exactly why the pre-selection caution exists: the default is heard as a decision already made.
- **Pass the group's assistive text and any error text through the component**, so they are associated with the group. Text floating beside the options is invisible to someone who tabs straight into the group.
- **Required state belongs to the group and must be programmatic**, not carried by an asterisk alone.
- **A disabled option is announced as disabled but skipped by arrow navigation**, so any explanation carried only by its appearance is unreachable. Put the reason in text.
- **When an option discloses further fields, say so before it is chosen** — in the item label or the group's assistive text.

### Keyboard and non-mouse navigation

- **The whole group is one tab stop.** Tab moves to the group and then out of it; it does not step through the options. Do not make each option its own tab stop — that is checkbox behaviour, not radio behaviour.
- **Arrow keys move between options within the group, and moving selects.** Up and Left move to the previous option, Down and Right to the next, wrapping at the ends. Home and End move to the first and last option.
- **Space selects the focused option** where it is not already selected. Do not remap it and do not require Enter.
- **The library owns key handling and the roving focus inside the group.** Do not attach your own key listeners, do not manage tabindex yourself, and do not re-implement wrapping — you will break behaviour that already works.
- **Clicking or tapping the item label selects its option.** That comes free from a real associated label and is a genuine target-size benefit. Do not break it by rendering the label as loose text.
- **Do not move focus for the user.** When an option reveals fields below, focus stays in the group; the user reaches the new fields with the next Tab. Never auto-advance because a choice looks made.
- **Nothing needed may be hover-only.** A rule or a consequence that appears only on hover is unavailable to keyboard and touch users alike.
- **Never suppress the focus ring, and never let it be confused with the selected state.** Because arrow keys move focus and selection together, the two treatments sit next to each other constantly and must remain distinguishable — a selected option that is not focused and a focused option must not look alike.
- **Tab order follows visual order**, which the vertical-only rule makes trivial.

## Not your decision

Do not implement, override, or tune any of these — the components own them:

- On `radio-button`: `border-radius`, `border-size`, `size`, `icon-size`.
- On `radio-button-group`: `item-gap`, `padding`.
- On `radio-button-item`: `label-gap`, `max-width`, `text`, `colors`.
- Field colours and sizes from `globals.form.field`, and the disabled treatment from `globals.states.disabled`.
- The label-to-field gaps and the spacing between items in a form — `globals.form.properties.label-field-gap-horizontal`, `label-field-gap-vertical`, `vertical-item-gap`.
- The selected dot, hover and active styling, the focus ring, and roving focus within the group.

Do not add margins or spacer elements between options or around the group; the components carry the spacing.

## Load these too

- [`recursica-skill-selection-controls`](../../design-rules/recursica-skill-selection-controls/SKILL.md) — radio vs. checkbox vs. switch vs. dropdown, option counts, the pre-selection caution, vertical-only layout, the horizontal alternatives, and commit timing.
- [`recursica-skill-forms`](../../design-rules/recursica-skill-forms/SKILL.md) — single-column layout, label placement, its container-width trigger, and one placement per form, required vs. optional marking, validation timing, progressive disclosure, and save mode.
- [`recursica-skill-label`](../recursica-skill-label/SKILL.md) — the group label and the item labels, copy that stands alone, and the required and optional markers.
- [`recursica-skill-assistive-element`](../recursica-skill-assistive-element/SKILL.md) — the help and error text below the group, and the copy rules for both.
- [`recursica-skill-working-memory`](../../psychology/recursica-skill-working-memory/SKILL.md) — the 7 ± 2 basis and the recognition-versus-comparison boundary.
- [`recursica-skill-segmented-control`](../recursica-skill-segmented-control/SKILL.md) — the horizontal single-select control that replaces a rotated radio group.
- [`recursica-skill-system-conventions`](../../design-rules/recursica-skill-system-conventions/SKILL.md) — never carry meaning in a single channel.

## Uncovered — ask, do not invent

- **How a radio group shows an error.** The kit gives `dropdown` and `autocomplete` an `error` state and gives the radio button none, yet a required group can fail validation. The error treatment is unstated.
- **Whether any affordance ever clears a radio group.** The design rules treat a set radio as not deselectable, which is why the pre-selection caution exists; whether a group may offer an explicit clear, or a "None" option, is unstated.
- **Radio buttons inside a table row.** Mentioned in passing in the design rules as an alternative to a switch; not established as a pattern.

## Pre-flight checklist

- [ ] The options are genuinely mutually exclusive, and nothing exclusive was built as checkboxes.
- [ ] The group holds at least two options, within 7 ± 2, biased lower for hard-to-distinguish options.
- [ ] Options are stacked vertically; no horizontal group, and `side-by-side` was used only as label placement.
- [ ] `layouts` matches every other field in the same form — one placement per form at any given breakpoint, with no mixing between fields or sections.
- [ ] `radio-button`, `radio-button-item`, and `radio-button-group` are composed together.
- [ ] No value is pre-selected unless the default is right for nearly everyone.
- [ ] The group has a real label, every option has a real label, and neither is doing the other's job.
- [ ] The group is announced as a group, its label is announced when focus enters, and position within the set is available.
- [ ] Selected state is exposed programmatically, never by fill or dot alone.
- [ ] Selection rules are in assistive text passed through the component; required state is programmatic.
- [ ] The group is a single tab stop; arrow keys move and select, Home and End reach the ends, Space selects.
- [ ] No key handling, tabindex, or wrapping behaviour inside the group was overridden.
- [ ] Clicking the item label selects the option.
- [ ] Focus is never moved for the user, including when an option discloses fields below.
- [ ] Nothing needed requires hover; the focus ring is intact and distinguishable from the selected state.
- [ ] Disabled is used only for temporarily unavailable options, with the reason in text; never-editable values use the read-only field.
- [ ] No variant, size, or state outside the inventory above was passed, and no component-owned property was overridden.
- [ ] The group commits with the form, in the same save mode as everything else in the system.
- [ ] Nothing in the uncovered list — group error state, clearing a group, radios in table rows — was invented.
