---
name: recursica-skill-dropdown
description: How to use the Recursica dropdown correctly — when a hidden option list beats a visible one, the four-option floor and the count ceiling above which a radio group becomes a dropdown, the affordance test the option set must pass, placeholder vs. valued text, sensible defaults, keeping the menu unclipped, disabled vs. read-only, and the screen-reader and keyboard requirements for a listbox including expanded state, the active option, Escape, and Home and End. Use whenever adding, reviewing, or refactoring a dropdown or select field. Trigger on "dropdown", "select", "select field", "option list", "listbox", "combobox", "expanded", "menu clipped", "screen reader", "tab order", or a request to let a user pick one value from a set. Do NOT use for a small visible set — that is recursica-skill-radio-button. Do NOT use for typing to filter a large set — recursica-skill-autocomplete. Do NOT use for a list of actions — recursica-skill-menu.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Dropdown

A dropdown is a form field that hides its options until opened, and returns one value from that set.

## Use it when

- **The set of answers is specific and finite**, and the user picks from it rather than typing.
- **The option count is above the ceiling for a visible group** — more than 7 ± 2.
- **Space is the constraint.** A dropdown is compact, so it can replace a checklist or a radio group where a long form cannot afford the vertical scroll.
- **The user already knows what is inside before they open it.** See the affordance test below.

## Do not use it when

| Instead of a dropdown                                              | Use                                                                            |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| There are fewer than four options                                  | `recursica-skill-radio-button`. Never a dropdown below four                    |
| The options must stay visible while the user decides               | `recursica-skill-radio-button`, or `recursica-skill-checkbox` for zero-to-many |
| The set is large and the user knows the values well enough to type | `recursica-skill-autocomplete`                                                 |
| The user does not know what the set contains                       | Fewer, grouped, or better-named options — the affordance test has failed       |
| The list is a set of actions rather than values                    | `recursica-skill-menu`                                                         |
| The value is unpredictable free-form text                          | `recursica-skill-text-field`                                                   |
| A horizontal single-select of two to five options is wanted        | `recursica-skill-segmented-control`                                            |
| The value is binary with a known inverse                           | `recursica-skill-switch`                                                       |
| The value is never editable by this user                           | `recursica-skill-read-only-field` — renders label and text, no input           |

**A disabled dropdown is not a way to display a value.** If nobody can ever change it here, it is not a form control.

## What exists

Taken from `recursica_ui-kit.json` → `ui-kit.components.dropdown`. **Do not pass a variant, size, or state that is not listed here.**

| Axis      | Options                   |
| --------- | ------------------------- |
| `states`  | `error`, `disabled`       |
| `layouts` | `stacked`, `side-by-side` |

**`layouts` is the label-placement axis.** `side-by-side` — label beside the field — is the house default; `stacked` is the fallback when the container is too narrow to fit both. The trigger is container width, not viewport. See `recursica-skill-forms`.

**Placeholder and valued are not variants.** Both are documented outside the token inventory as content; in the kit they are the same `text` property with different content, which is why there is no placeholder axis. The field's `colors` cover both.

**Focused is not a state.** It is listed as one outside the token inventory; the kit handles it through `globals.form.field.colors.border-selected`. Do not build it as a state.

**There is no size axis.** `min-height` is a fixed property, and `globals.form.field.size.single-line-input-height` sets the height for every single-line field.

**There is no multi-select axis**, no option-group or section axis, and no searchable variant — see the uncovered list.

**The kit defines the closed field only.** `icon-size` and `icon-text-gap` cover a lead icon and the expand indicator; the open menu, its options, and their rows are not part of this component's inventory.

**Read-only is a separate component** — `read-only-field`, which renders text rather than an input.

## Rules for using it

**Run the affordance test before choosing this control: does the user know what is in there before they click it?** A dropdown hides its options, so the set has to be predictable.

- **Good:** US states. Finite, alphabetised, and everyone has a rough sense of the quantity.
- **Bad:** fifty disparate values with nothing in common. Overwhelming and cognitively expensive to pick from.

**Four options is the floor.** Below four, the options belong on the page as radio buttons; hiding three things earns nothing.

**Length is cheap when the user is recognising a value and expensive when they are comparing candidates.** Fifty states is fine; fifty things the user must read and weigh is not. See `recursica-skill-working-memory`.

**Provide a sensible default where one is genuinely correct** for nearly everyone. Never pre-select a value the user would have to reason about, look up, or verify — an unverifiable default is worse than an empty field, because it gets submitted unchecked.

**Where there is no sensible default, the field shows placeholder text**, and that placeholder never carries required information and never substitutes for the label.

**Label placement is one decision per form, not per field.** This field's `layouts` value is not an independent choice — it matches every other field in the same form. The container-width test is applied once, to the form as a whole, and its answer governs every field in it, including short ones that would have fitted side by side. A whole form may switch placement between breakpoints, but never mixes the two at one breakpoint, and a section never gets its own placement. Owned by `recursica-skill-forms`.

**The menu must not be clipped by the viewport or by any scrolling ancestor.** Check it near the bottom of the page, inside a panel, and inside a modal. A list the user cannot see all of is the failure this control is most prone to.

**Put the selection rule in assistive text** — "You can only select one option", a minimum, a constraint — through `recursica-skill-assistive-element`, not in a validation message the user only sees after failing.

**On error, the assistive text is replaced, not joined.** The message must restate the rule that was broken, and the error state must carry a non-color indicator as well as the colour change.

**A dropdown selection may reveal further fields**, kept immediately below and appearing in real time. The form still submits as one batch.

**Never commit on selection in a batch-save form.** Either every field in the system writes on change or every field writes on submit.

**Do not use a dropdown to escape a long form by hiding required comparisons.** Collapsing a group for space is legitimate; collapsing it so the user cannot see what they are choosing between is not.

**Disabled and read-only are different components, not two styles of one.**

- **Disabled dropdown** — still a field, still visibly an input, just not currently operable. Use it when the user could make it operable by doing something else first.
- **Read-only field** — a different component entirely, with no input. Use it when this user never changes this value here.

**Never disable a dropdown as the only explanation.** A disabled field is skipped by the keyboard, so the reason must be in text nearby.

## Accessibility

The component wires the label to the field, provides the focus ring, and owns the open-and-select interaction. What the interaction announces, and everything below, is yours. A dropdown is the control where "it works with a mouse" hides the most failures.

### Screen readers

- **Pass a real label.** It is the accessible name, and it must read correctly alone. Never let the placeholder be the name — a placeholder is not announced as a label and it disappears once a value is chosen.
- **The field must be announced as a value-picking control with its current value**, so the user hears what is selected without opening anything.
- **Expanded and collapsed state must be exposed programmatically.** A rotating chevron is a visual cue only; the user must hear that the list is open, and hear that it closed.
- **The number of options must be available on open** — "5 of 40" or an equivalent — so the user knows the size of what they have entered.
- **The active option must be announced as the user moves through the list**, including its position and whether it is selected. Moving the highlight silently makes the list unusable without sight.
- **Selection must be exposed programmatically, never by a checkmark or highlight alone.** Required by `recursica-skill-system-conventions`.
- **The field's assistive text and error text must be passed through the component**, never rendered as loose elements beside it. Unassociated text is invisible to someone who tabs straight into the field.
- **On error, the message is the only announced text**, because it has replaced the assistive text — so it has to carry the rule. "Invalid input" is not an error message.
- **Required state must be programmatic**, not carried by an asterisk alone.
- **Give the expand indicator no separate announcement.** It is part of the field, not a second control, and must not be exposed as an unlabelled graphic or its own button.
- **A disabled dropdown is announced as disabled but skipped by Tab**, so any explanation carried only by its appearance is unreachable. Put the reason in text.
- **If choosing an option discloses further fields, say so before the choice is made** — in the label or the assistive text.

### Keyboard and non-mouse navigation

- **The dropdown is one tab stop, open or closed.** Tab must never step through the options; while the list is open, Tab either closes it or moves past the whole field.
- **Enter, Space, and Down open the list.** Arrow Up and Down move the active option, Home and End jump to the first and last, and Enter selects the active option and closes the list.
- **Escape closes the list without changing the value, and focus returns to the field.** This is not optional, and focus must never be dropped to the top of the page or to the body.
- **The library owns key handling inside the control**, including type-ahead on a letter key and any wrapping at the ends of the list. Do not attach your own key listeners and do not re-implement moving or selecting.
- **Do not move focus into the list.** The field keeps focus and points at the active option; a dropdown that moves real focus into a popup breaks the return path.
- **Do not move focus for the user after a selection.** No auto-advance to the next field because a value now exists.
- **Everything reachable by mouse must be reachable by key.** Nothing about opening, moving through, or choosing may depend on a pointer, and nothing needed may be hover-only.
- **Never suppress the focus ring, and never let it be confused with the selected option's highlight.** The focused field, the active option, and the selected option are three different things and must be visually distinct.
- **Tab order follows visual order**, which the single-column form rule makes trivial.

## Not your decision

Do not implement, override, or tune any of these — the component owns them:

- `border-radius`, `min-height`, `horizontal-padding`, `vertical-padding`, `border-size`.
- `icon-size` and `icon-text-gap`.
- `text` styling and `colors`, per layer and per state.
- Field width and height — `globals.form.field.size` supplies `min-width`, `max-width`, and `single-line-input-height`; `globals.form.field` also supplies `border-radius`, the paddings, and `border-selected`.
- The disabled treatment from `globals.states.disabled`.
- The label-to-field gaps and the spacing between fields — `globals.form.properties.label-field-gap-horizontal`, `label-field-gap-vertical`, `vertical-item-gap`.
- The label-to-field association, the expand indicator, hover and active styling, the focus ring, and the open-and-select keyboard behaviour.

Never style an unfocused dropdown so that it reads as disabled. An editable field must look editable at rest.

## Load these too

- [`recursica-skill-selection-controls`](../../design-rules/recursica-skill-selection-controls/SKILL.md) — when a dropdown replaces a visible group, the affordance test, option counts, pre-selection, disabled vs. read-only, and commit timing.
- [`recursica-skill-forms`](../../design-rules/recursica-skill-forms/SKILL.md) — single-column layout, label placement, its container-width trigger, and one placement per form, required vs. optional marking, validation timing, pre-fill limits, save mode, and the rule that no form control goes inside a card.
- [`recursica-skill-label`](../recursica-skill-label/SKILL.md) — label copy that names the object and stands alone, and the required and optional markers.
- [`recursica-skill-assistive-element`](../recursica-skill-assistive-element/SKILL.md) — the help and error text below the field, and why the error replaces rather than joins it.
- [`recursica-skill-working-memory`](../../psychology/recursica-skill-working-memory/SKILL.md) — the 7 ± 2 basis and the recognition-versus-comparison boundary that decides when a long list is acceptable.
- [`recursica-skill-autocomplete`](../recursica-skill-autocomplete/SKILL.md) — the typeahead control for sets too large to scan.
- [`recursica-skill-system-conventions`](../../design-rules/recursica-skill-system-conventions/SKILL.md) — never carry meaning in a single channel; fix the structure rather than adding a mechanism to cope with it.

## Uncovered — ask, do not invent

- **The multi-select dropdown.** `recursica-skill-selection-controls` requires one — a checkbox group inside a dropdown — and this component defines no multi-select axis. This is a **gap in the component inventory, not an invitation to compose one.** Do not assemble a checkbox group inside a dropdown to satisfy the design rule. Do not rely on this without asking.
- **The open menu itself.** Option rows, their height, hover and active treatment, grouping headers, dividers, icons or descriptions within an option, and maximum menu height before it scrolls are all outside the component's token inventory.
- **The point at which a dropdown becomes an autocomplete.** This component's own guidance says to consider a typeahead when the list is long and the user is familiar with the options; `recursica-skill-selection-controls` records the threshold as unset. Do not pick a number.
- **Whether a dropdown may be cleared** back to no value once a selection is made, and whether an explicit "None" option is allowed.
- **Grouped or sectioned options**, and dependent dropdowns where one field's selection filters another's set.
- **An empty option set** — what a dropdown with nothing in it shows.

## Pre-flight checklist

- [ ] The option set passes the affordance test — the user knows what is inside before opening it.
- [ ] There are at least four options; smaller sets are radio buttons.
- [ ] The set is above the visible-group ceiling, or space in a long form justified collapsing it.
- [ ] Any default is genuinely correct for nearly everyone; nothing the user would have to verify is pre-selected.
- [ ] Where there is no default, placeholder text is used and carries no required information.
- [ ] A real label is passed, it reads correctly alone, and the placeholder is not doing its job.
- [ ] Label placement is side-by-side unless the container is too narrow.
- [ ] `layouts` matches every other field in the same form — one placement per form at any given breakpoint, with no mixing between fields or sections.
- [ ] The menu is not clipped by the viewport, a panel, a modal, or any scrolling ancestor.
- [ ] Selection rules are in assistive text; on error it is replaced by a message restating the rule, with a non-color indicator.
- [ ] Assistive text and error text are passed through the component, not rendered beside it.
- [ ] Required state is programmatic, not an asterisk alone.
- [ ] Expanded state, the option count, the active option, and the selected value are all announced.
- [ ] The field is one tab stop; Enter, Space, and Down open, arrows and Home and End move, Enter selects, Escape closes and returns focus to the field.
- [ ] No key handling inside the control was overridden, and real focus never moves into the list.
- [ ] Focus is never moved for the user after a selection.
- [ ] Nothing needed requires hover or a pointer; the focus ring is intact and distinct from the active and selected option treatments.
- [ ] Disabled is used only for temporarily unavailable fields, with the reason in text; never-editable values use the read-only field.
- [ ] No variant, size, or state outside the inventory above was passed, no component-owned property was overridden, and no unfocused field reads as disabled.
- [ ] The field commits with the form, in the same save mode as everything else in the system.
- [ ] Nothing in the uncovered list — multi-select, menu internals, the autocomplete threshold, clearing, grouped options, empty sets — was invented.
