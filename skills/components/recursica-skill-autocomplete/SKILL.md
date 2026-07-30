---
name: recursica-skill-autocomplete
description: How to use the Recursica autocomplete correctly — the typeahead field for a set too large to scan but familiar enough to type, why the value still comes from a defined set, placeholder rules, sensible defaults, keeping the filtered list unclipped, disabled vs. read-only, and the screen-reader and keyboard requirements for a combobox, including announcing filtered result counts and the active option. Use when adding, reviewing, or refactoring an autocomplete, typeahead, or search-as-you-type field. Trigger on "autocomplete", "typeahead", "search", "search field", "combobox", "filter as you type", "suggestions", "screen reader", or a request to let a user type to narrow a list of options. Do NOT use for a set small enough to show at once — that is recursica-skill-dropdown or recursica-skill-radio-button. Do NOT use for unconstrained free text — recursica-skill-text-field. Do NOT use for a list of actions — recursica-skill-menu.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Autocomplete

An autocomplete is a text field whose value comes from a defined set. The user types to narrow the set, then picks from it.

## Use it when

- **The set is too large to scan comfortably in a dropdown**, so opening it and reading down the list is worse than typing.
- **The user is familiar with the options** and can start typing a value they already have in mind. Typing is recall; if the user needs to recognise the answer from what is shown, they need a visible set instead.
- **The value must still come from the set.** The typing is a filter, not free entry.

## Do not use it when

| Instead of an autocomplete                                    | Use                                                                            |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| The set is small enough to show at once                       | `recursica-skill-radio-button`, or `recursica-skill-checkbox` for zero-to-many |
| The set is large but the user is not familiar with the values | `recursica-skill-dropdown`, so the options can be read rather than recalled    |
| The value is unpredictable free-form text                     | `recursica-skill-text-field`                                                   |
| The list is a set of actions rather than values               | `recursica-skill-menu`                                                         |
| The value is binary with a known inverse                      | `recursica-skill-switch`                                                       |
| The value is never editable by this user                      | `recursica-skill-read-only-field` — renders label and text, no input           |

**A disabled autocomplete is not a way to display a value.** If nobody can ever change it here, it is not a form control.

## What exists

Taken from `recursica_ui-kit.json` → `ui-kit.components.autocomplete`. **Do not pass a variant, size, or state that is not listed here.**

| Axis      | Options                   |
| --------- | ------------------------- |
| `states`  | `error`, `disabled`       |
| `layouts` | `stacked`, `side-by-side` |

**`layouts` is the label-placement axis.** `side-by-side` — label beside the field — is the house default; `stacked` is the fallback when the container is too narrow to fit both. The trigger is container width, not viewport. See `recursica-skill-forms`.

**Placeholder is not a variant.** It is `placeholder-opacity` on this component, the same as on a text field.

**Focused is not a state.** It comes from `globals.form.field.colors.border-selected`.

**There is no size axis.** `height` is a fixed property, and `globals.form.field.size.single-line-input-height` sets the height for every single-line field.

**There is no multi-select axis, no chip or token display for chosen values, and no loading state** — see the uncovered list.

**The kit defines the closed field only.** `icon-size` and `icon-text-gap` cover a lead icon and the trailing indicator; the filtered list, its option rows, and any empty-result treatment are not in this component's inventory.

**Read-only is a separate component** — `read-only-field`, which renders text rather than an input.

**Documented outside the token inventory**, under the component's former name "Search":

| Section    | Options                  |
| ---------- | ------------------------ |
| `State`    | Default, Focused, Valued |
| `Behavior` | Suggestions (optional)   |

Those states are not kit axes and must not be passed as variants — `Focused` and `Valued` are conditions the component derives. What they do tell you is the shape of the component: a **leading icon**, and a **clear control that appears once there is text in the field**. Suggestions are described as an optional enhancement rather than the default.

## Rules for using it

**The set, not the field, decides whether this is the right control.** A large set the user recognises from belongs in a dropdown; a large set the user recalls from belongs here. Length alone is not the trigger — see `recursica-skill-working-memory` on recognition versus recall.

**Never below the dropdown floor.** If a dropdown would be wrong because there are fewer than four options, an autocomplete is wrong for the same reason. Small sets go on the page.

**The value must resolve to an option in the set.** Text the user typed that matches nothing is not a value; do not silently accept it.

**Put the rule in assistive text** — what the field searches, whether partial matches count, any constraint — through `recursica-skill-assistive-element`. The placeholder is not the place for it, because it disappears on the first keystroke and never carries required information.

**Provide a sensible default only where one is genuinely correct** for nearly everyone. Never pre-fill a value the user would have to reason about, look up, or verify — an unverifiable default gets submitted unchecked.

**Label placement is one decision per form, not per field.** This field's `layouts` value is not an independent choice — it matches every other field in the same form. The container-width test is applied once, to the form as a whole, and its answer governs every field in it, including short ones that would have fitted side by side. A whole form may switch placement between breakpoints, but never mixes the two at one breakpoint, and a section never gets its own placement. Owned by `recursica-skill-forms`.

**On error, the assistive text is replaced, not joined.** The message must restate the rule that was broken, and the error state must carry a non-color indicator as well as the colour change.

**The filtered list must not be clipped by the viewport or by any scrolling ancestor.** Check it near the bottom of the page, inside a panel, and inside a modal.

**Never commit on selection in a batch-save form.** Either every field in the system writes on change or every field writes on submit.

**An autocomplete selection may reveal further fields**, kept immediately below and appearing in real time. The form still submits as one batch.

**Disabled and read-only are different components, not two styles of one.**

- **Disabled autocomplete** — still a field, still visibly an input, just not currently operable. Use it when the user could make it operable by doing something else first.
- **Read-only field** — a different component entirely, with no input. Use it when this user never changes this value here.

**Never disable the field as the only explanation.** A disabled field is skipped by the keyboard, so the reason must be in text nearby.

**The clear control appears only when the field has a value**, and clearing returns the field to empty and the collection to unfiltered. It does not merely blank the text while leaving a filter applied.

**Where the field filters a collection rather than setting a form value, it commits nothing** — so it does not engage the form's save mode. See `recursica-skill-forms`.

**The placeholder names the scope** — "Search invoices" — so the reader knows what is being narrowed. It never replaces the label.

**Never make this field the only route to the content.** A reader who does not know the right word must still be able to get there.

## Accessibility

The component wires the label to the input, provides the focus ring, and owns the filter-and-select interaction. What that interaction announces is yours, and it is the hardest part of any control in this system to get right: the list changes under the user on every keystroke, and none of that reaches a screen reader unless it is announced.

### Screen readers

- **Pass a real label.** It is the accessible name, and it must read correctly alone. Never let the placeholder be the name — it is not announced as a label and it disappears on the first keystroke.
- **The field must be announced as a text input with a list attached**, not as a plain text field. The user has to know that typing will produce options and that there is somewhere to go with the arrow keys.
- **Expanded and collapsed state must be exposed programmatically.** The user must hear that results have opened, and hear that they closed.
- **The number of filtered results must be announced after each filter**, politely, without interrupting typing — "8 results", then "2 results", then "no results". This is the single requirement most often missed: a sighted user watches the list shrink, and a screen reader user gets nothing.
- **Announce no-results explicitly.** Silence after typing is indistinguishable from a broken field.
- **The active option must be announced as the user moves through the list**, including its position and whether it is selected.
- **Do not announce every keystroke, and do not announce the list on every character when the count has not changed.** Over-announcing makes the field unusable just as surely as silence.
- **Selection must be exposed programmatically, never by a highlight or checkmark alone.** Required by `recursica-skill-system-conventions`.
- **The chosen value must be readable in the field after selection**, and announced as the field's value, not left only as visually rendered text.
- **Assistive text and error text must be passed through the component**, never rendered as loose elements beside it. Unassociated text is invisible to someone who tabs straight into the field.
- **On error, the message is the only announced text**, because it has replaced the assistive text — so it has to carry the rule. "Invalid input" is not an error message.
- **Required state must be programmatic**, not carried by an asterisk alone.
- **Give the trailing indicator no separate announcement.** It is part of the field, not a second control.
- **The clear control is a real control and needs its own accessible name**, and clearing must announce that the field is empty and the full set is back. The leading icon, by contrast, is decorative and must be silent.
- **A disabled field is announced as disabled but skipped by Tab**, so any explanation carried only by its appearance is unreachable. Put the reason in text.

### Keyboard and non-mouse navigation

- **The clear control is its own tab stop**, operable with Enter or Space, and never revealed only on hover.

- **The field is one tab stop, open or closed.** Tab must never step through the results; while the list is open, Tab either closes it or moves past the whole field.
- **Arrow Down and Up move the active option, Enter selects it, and Escape closes the list without changing the value**, returning focus to the input. Focus must never be dropped to the top of the page or to the body.
- **Home and End belong to the caret in the text input.** Do not repurpose them to jump to the first or last result — the user is in a text field and expects them to move within their typing.
- **The library owns key handling inside the control**, including which key opens the list, wrapping at the ends, and any inline completion. Do not attach your own key listeners and do not re-implement filtering or moving.
- **Do not move focus into the list.** The input keeps focus and points at the active option; moving real focus into a popup breaks the return path and stops the user typing.
- **Do not move focus for the user after a selection.** No auto-advance to the next field because a value now exists, and no focus jump when the filter narrows to exactly one result.
- **Everything reachable by mouse must be reachable by key.** Nothing about filtering, moving through results, or choosing may depend on a pointer, and nothing needed may be hover-only.
- **Never suppress the focus ring, and never let it be confused with the active option's highlight or the selected option's treatment.** The focused field, the active option, and the selected option are three different things.
- **Tab order follows visual order**, which the single-column form rule makes trivial.

## Not your decision

Do not implement, override, or tune any of these — the component owns them:

- `border-radius`, `height`, `horizontal-padding`, `vertical-padding`, `border-size`.
- `icon-size` and `icon-text-gap`.
- `text` styling, `placeholder-opacity`, and `colors`, per layer and per state.
- Field width and height — `globals.form.field.size` supplies `min-width`, `max-width`, and `single-line-input-height`; `globals.form.field` also supplies `border-radius`, the paddings, and `border-selected`.
- The disabled treatment from `globals.states.disabled`.
- The label-to-field gaps and the spacing between fields — `globals.form.properties.label-field-gap-horizontal`, `label-field-gap-vertical`, `vertical-item-gap`.
- The label-to-input association, the filtering and matching behaviour, hover and active styling, the focus ring, and the keyboard behaviour inside the field.

Never style an unfocused field so that it reads as disabled. An editable field must look editable at rest.

## Load these too

- [`recursica-skill-selection-controls`](../../design-rules/recursica-skill-selection-controls/SKILL.md) — which control a field gets, option counts, the dropdown affordance test, pre-selection, disabled vs. read-only, and commit timing.
- [`recursica-skill-forms`](../../design-rules/recursica-skill-forms/SKILL.md) — single-column layout, label placement, its container-width trigger, and one placement per form, required vs. optional marking, validation timing, pre-fill limits, and save mode.
- [`recursica-skill-dropdown`](../recursica-skill-dropdown/SKILL.md) — the control this one replaces, its four-option floor, and the affordance test.
- [`recursica-skill-label`](../recursica-skill-label/SKILL.md) — label copy that names the object and stands alone, and the required and optional markers.
- [`recursica-skill-assistive-element`](../recursica-skill-assistive-element/SKILL.md) — the help and error text below the field, and why the error replaces rather than joins it.
- [`recursica-skill-text-field`](../recursica-skill-text-field/SKILL.md) — the control for genuinely free-form values, and the placeholder rules this field shares.
- [`recursica-skill-working-memory`](../../psychology/recursica-skill-working-memory/SKILL.md) — recognition versus recall, which is what separates this control from a dropdown.
- [`recursica-skill-system-conventions`](../../design-rules/recursica-skill-system-conventions/SKILL.md) — never carry meaning in a single channel.

## Uncovered — ask, do not invent

- **When an autocomplete replaces a dropdown.** `recursica-skill-selection-controls` records this as an open question; the dropdown's own guidance says only to consider a typeahead where the list is long and the user is familiar with the values. No count or threshold exists. Ask.
- **Whether free text not in the set may be submitted**, and whether the user may create a new option from what they typed.
- **How many characters must be typed before results appear**, and whether the full set shows on focus with nothing typed.
- **How matches are found and ordered** — prefix versus substring, fuzzy matching, whether the matched characters are emphasised in the option.
- **The empty-result treatment.** What the field shows when nothing matches, and whether it offers a next step.
- **Feedback while results are being fetched.** No loading, pending, or error-fetching state exists on this component.
- **Multi-select.** No axis supports it, and there is no chip or token display for several chosen values.
- **The filtered list itself** — option row height, hover and active treatment, grouping, and maximum height before it scrolls.

## Pre-flight checklist

- [ ] The set is genuinely too large to scan, and the user knows the values well enough to type one.
- [ ] The set is above the dropdown floor; small sets were put on the page instead.
- [ ] The submitted value resolves to an option in the set; unmatched text is not accepted as a value.
- [ ] A real label is passed, it reads correctly alone, and the placeholder is not doing its job.
- [ ] Label placement is side-by-side unless the container is too narrow.
- [ ] `layouts` matches every other field in the same form — one placement per form at any given breakpoint, with no mixing between fields or sections.
- [ ] No required information lives in the placeholder; the rule is in assistive text.
- [ ] Any default is genuinely correct for nearly everyone.
- [ ] On error the assistive text is replaced by a message restating the rule, with a non-color indicator.
- [ ] Assistive text and error text are passed through the component, not rendered beside it.
- [ ] Required state is programmatic, not an asterisk alone.
- [ ] The filtered list is not clipped by the viewport, a panel, a modal, or any scrolling ancestor.
- [ ] Expanded state, the filtered result count after each change, no-results, the active option, and the chosen value are all announced — and nothing is over-announced.
- [ ] The field is one tab stop; arrows move, Enter selects, Escape closes and returns focus to the input.
- [ ] Home and End still move the caret in the input.
- [ ] No key handling or filtering inside the control was overridden, and real focus never moves into the list.
- [ ] Focus is never moved for the user, including when the filter narrows to one result.
- [ ] Nothing needed requires hover or a pointer; the focus ring is intact and distinct from the active and selected option treatments.
- [ ] Disabled is used only for temporarily unavailable fields, with the reason in text; never-editable values use the read-only field.
- [ ] No variant, size, or state outside the inventory above was passed, no component-owned property was overridden, and no unfocused field reads as disabled.
- [ ] The field commits with the form, in the same save mode as everything else in the system.
- [ ] Nothing in the uncovered list — the replacement threshold, free text, character minimums, match ordering, empty results, loading, multi-select, list internals, clearing — was invented.
