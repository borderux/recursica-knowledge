---
name: recursica-skill-autocomplete
description: How to use the Recursica autocomplete, the type-to-filter field for a large but familiar set — values from a defined set, placeholder rules, an unclipped list, and combobox accessibility including result counts. Use for typeahead fields and fields that search while the user types. Not for small sets — see recursica-skill-dropdown; not for free text — see recursica-skill-text-field.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Autocomplete

An autocomplete is a text field whose value comes from a defined set. The user types to narrow the set down, then picks from it.

## Use it when

- **The set is too large to scan comfortably in a dropdown**, so opening it and reading down the list is worse than typing.
- **The user knows the options well** and can start typing a value they already have in mind. Typing relies on recall (remembering the answer); if the user needs to recognize the answer from what is shown, they need a visible set instead.
- **The value must still come from the set.** The typing is a filter, not free entry.

## Do not use it when

| Instead of an autocomplete                                   | Use                                                                            |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| The set is small enough to show at once                      | `recursica-skill-radio-button`, or `recursica-skill-checkbox` for zero to many |
| The set is large, but the user does not know the values well | `recursica-skill-dropdown`, so the options can be read instead of recalled     |
| The value is unpredictable free-form text                    | `recursica-skill-text-field`                                                   |
| The list is a set of actions rather than values              | `recursica-skill-menu`                                                         |
| The value is binary, with a known opposite                   | `recursica-skill-switch`                                                       |
| This user can never edit the value                           | `recursica-skill-read-only-field` — shows the label and text, with no input    |

**Do not use a disabled autocomplete to show a value.** If nobody can ever change it here, it is not a form control.

## What exists

Taken from the UI kit (the token file, `recursica_ui-kit.json`, that says which variants and states each component has) → `ui-kit.components.autocomplete`. **Do not pass a variant, size, or state that is not listed here.**

**The third column is the React prop that sets each axis.** An axis (a property a component varies on, such as size or style; Figma calls it a variant property) is named in the UI kit. Its name is not a prop, and React ignores it without an error if it is passed as one. A blank cell means no single prop sets that axis — it is set by CSS state or by separate props, and the rules below say which.

| Axis      | Options                   | React prop   |
| --------- | ------------------------- | ------------ |
| `states`  | `error`, `disabled`       |              |
| `layouts` | `stacked`, `side-by-side` | `formLayout` |

**`layouts` is the label-placement axis, set by the `formLayout` prop.** `side-by-side` — the label beside the field — is the house default. `stacked` is the fallback when the container is too narrow to fit both. What decides this is the container's width, not the viewport's. See `recursica-skill-forms`.

**`formLayout` defaults to `stacked`, which puts the label above the input.** A field without the prop shows its label above the input at any container width, which breaks the house rule. `layouts` is the UI kit's name for this variant, not a prop: React ignores `layouts="side-by-side"` without an error and leaves the label above the input. Set `formLayout="side-by-side"` to put the label beside the input.

**Placeholder is not a variant.** It is `placeholder-opacity` on this component, the same as on a text field.

**Focused is not a state.** It comes from `globals.form.field.colors.border-selected`.

**There is no size axis.** `height` is a fixed property, and `globals.form.field.size.single-line-input-height` sets the height for every single-line field.

**There is no multi-select axis, no chip or token display for chosen values, and no loading state** — see the uncovered list.

**The UI kit defines the closed field only.** `icon-size` and `icon-text-gap` cover a leading icon and the trailing indicator. The filtered list, its option rows, and anything shown when there are no results are not in this component's inventory.

**Read-only is a separate component** — `read-only-field`, which shows text instead of an input.

**Shown only on the design-system website**, under the component's former name, "Search":

| Section    | Options                  |
| ---------- | ------------------------ |
| `State`    | Default, Focused, Valued |
| `Behavior` | Suggestions (optional)   |

Those states are not kit axes and must not be passed as variants — `Focused` and `Valued` are conditions the component works out for itself. They do show the component's parts: a **leading icon**, and a clear control that appears once there is text in the field. Suggestions are described as an optional extra, not the default.

## Rules for using it

**The set, not the field, decides whether this is the right control.** A large set the user recognizes items from belongs in a dropdown; a large set the user recalls items from belongs here. Length alone does not decide it — see `recursica-skill-working-memory` on recognition versus recall.

**Never below the dropdown floor.** If a dropdown would be wrong because there are fewer than four options, an autocomplete is wrong for the same reason. Small sets go on the page.

**The value must match an option in the set.** Text the user typed that matches nothing is not a value; do not quietly accept it.

**Put the rule in assistive text** — what the field searches, whether partial matches count, any limits — through `recursica-skill-assistive-element`. The placeholder is not the place for it, because it disappears on the first keystroke and never carries required information.

**Provide a sensible default only where one is correct** for nearly everyone. Never pre-fill a value the user would have to think about, look up, or check — a default the user cannot check gets submitted without being checked.

**Label placement is one decision per form, not per field.** This field's `layouts` value is not a separate choice — it matches every other field in the same form. The container-width test is applied once, to the whole form, and its answer governs every field in it, including short ones that would have fitted side by side. A whole form may switch placement between breakpoints, but it never mixes the two at one breakpoint, and a section never gets its own placement. Owned by `recursica-skill-forms`.

**On error, the assistive text is replaced, not added to.** The message must restate the rule that was broken, and the error state must have a signal that is not color, as well as the color change.

**The filtered list must not be cut off by the viewport, or by any scrolling ancestor** (a container further up the page that scrolls). Check it near the bottom of the page, inside a panel, and inside a modal.

**Never save on selection in a form that saves everything together.** Either every field in the system saves when it changes, or every field saves on submit.

**Choosing an autocomplete option may reveal more fields**, kept right below it and appearing immediately. The form still submits everything together.

**Disabled and read-only are different components, not two styles of one.**

- **Disabled autocomplete** — still a field, still clearly an input, but not usable right now. Use it when the user could make it usable by doing something else first.
- **Read-only field** — a different component entirely, with no input. Use it when this user never changes this value here.

**Never disable the field as the only explanation.** The keyboard skips a disabled field, so the reason must be in text nearby.

**The clear control appears only when the field has a value.** Clearing returns the field to empty and the collection to unfiltered. It does not blank out the text while leaving a filter applied.

**Where the field filters a collection instead of setting a form value, it saves nothing** — so it does not use the form's save mode. See `recursica-skill-forms`.

**The placeholder names what is being searched** — "Search invoices" — so the reader knows what is being narrowed. It never replaces the label.

**Never make this field the only way to reach the content.** A reader who does not know the right word must still be able to get there.

## Accessibility

This component also follows the accessibility baseline in `recursica-skill-system-conventions`. Only what is specific to it is listed here.

The component connects the label to the input, provides the focus ring, and owns the filter-and-select interaction. The application decides what that interaction announces, and this is the hardest part of any control in this system to get right. The list changes under the user on every keystroke, and none of that reaches a screen reader unless it is announced.

### Screen readers

- **Pass a real label.** It is the accessible name (the name a screen reader reads out for a control), and it must make sense on its own. Never let the placeholder be the name — it is not announced as a label, and it disappears on the first keystroke.
- **The field must be announced as a text input with a list attached** (a combobox: a text field paired with a list of options), not as a plain text field. The user has to know that typing will produce options, and that there is somewhere to go with the arrow keys.
- **Whether the list is expanded or collapsed must be available in code.** The user must hear that the results have opened, and hear that they closed.
- **The number of filtered results must be announced after each filter**, politely, without interrupting the typing — "8 results", then "2 results", then "no results". This is the requirement missed most often: a sighted user watches the list shrink, and a screen reader user gets nothing.
- **Announce "no results" clearly.** Silence after typing cannot be told apart from a broken field.
- **The active option must be announced as the user moves through the list**, including its position and whether it is selected.
- **Do not announce every keystroke, and do not announce the list on every character when the count has not changed.** Announcing too much makes the field as unusable as silence does.
- **Selection must be available in code, never shown by a highlight or a checkmark alone.** Required by `recursica-skill-system-conventions`.
- **The chosen value must be readable in the field after it is selected**, and announced as the field's value — not left only as text drawn on the screen.
- **On error, the message is the only text announced**, because it has replaced the assistive text — so it has to state the rule. "Invalid input" is not an error message.
- **Give the trailing indicator no separate announcement.** It is part of the field, not a second control.
- **The clear control is a real control and needs its own accessible name**, and clearing must announce that the field is empty and the full set is back. The leading icon, by contrast, is decorative and must be silent.
- **A disabled field is announced as disabled, but Tab skips it**, so any explanation carried only by how it looks cannot be reached. Put the reason in text.

### Keyboard and non-mouse navigation

- **The clear control is its own tab stop** (a place the Tab key lands), works with Enter or Space, and is never revealed only on hover.
- **The field is one tab stop, whether open or closed.** Tab must never step through the results. While the list is open, Tab either closes it or moves past the whole field.
- **Arrow Down and Up move the active option, Enter selects it, and Escape closes the list without changing the value**, returning focus to the input. Focus must never drop to the top of the page or to the body.
- **Home and End belong to the caret in the input.** Do not repurpose them to jump to the first or last result — the user is in a text field, and expects them to move within what they typed.
- **The library owns the key behavior inside the control**, including which key opens the list, wrapping around at the ends, and any inline completion. Do not attach custom key listeners, and do not rebuild the filtering or moving.
- **Do not move focus into the list.** The input keeps focus and points to the active option. Moving real focus into the list stops the user from typing and from getting back to the input.
- **Do not move focus for the user after a selection.** No jumping ahead to the next field because a value now exists, and no focus jump when the filter narrows down to exactly one result.
- **Everything reachable by mouse must be reachable by key.** Nothing about filtering, moving through results, or choosing may depend on a pointer, and nothing needed may appear only on hover.

## Set by the component

Do not set or override any of these. The component sets them:

- `border-radius`, `height`, `horizontal-padding`, `vertical-padding`, `border-size`.
- `icon-size` and `icon-text-gap`.
- `text` styling, `placeholder-opacity`, and `colors`, per layer and per state.
- Field width and height — `globals.form.field.size` supplies `min-width`, `max-width`, and `single-line-input-height`; `globals.form.field` also supplies `border-radius`, the paddings, and `border-selected`.
- The disabled treatment from `globals.states.disabled`.
- The label-to-field gaps and the spacing between fields — `globals.form.properties.label-field-gap-horizontal`, `label-field-gap-vertical`, `vertical-item-gap`.
- The label-to-input association, the filtering and matching behavior, hover and active styling, the focus ring, and the keyboard behavior inside the field.

Never style an unfocused field so that it looks disabled. An editable field must look editable at rest.

## Load these too

- `recursica-skill-selection-controls` — which control a field gets, option counts, the dropdown affordance test, pre-selection, disabled vs. read-only, and commit timing.
- `recursica-skill-forms` — single-column layout, label placement, its container-width trigger, and one placement per form, required vs. optional marking, validation timing, pre-fill limits, and save mode.
- `recursica-skill-label` — label copy that names the object and stands alone, and the required and optional markers.
- `recursica-skill-assistive-element` — the help and error text below the field, and why the error replaces rather than joins it.
- `recursica-skill-working-memory` — recognition versus recall, which is what separates this control from a dropdown.
- `recursica-skill-system-conventions` — never carry meaning in a single channel.
- `recursica-skill-live-regions` — announcing the result count as the list filters, and when the application must cover it.

### Only if the screen also uses it

- `recursica-skill-dropdown` — the control this one replaces, its four-option floor, and the affordance test.
- `recursica-skill-text-field` — the control for free-form values, and the placeholder rules this field shares.

## Uncovered — ask, do not invent

- **When an autocomplete replaces a dropdown.** `recursica-skill-selection-controls` records this as an open question; the dropdown's own guidance only says to consider a typeahead where the list is long and the user knows the values. No count or threshold exists. Ask.
- **Whether free text that is not in the set may be submitted**, and whether the user may create a new option from what they typed.
- **How many characters must be typed before results appear**, and whether the full set shows on focus with nothing typed.
- **How matches are found and ordered** — matching the start versus anywhere in the text, fuzzy matching, and whether the matched characters are highlighted in the option.
- **What happens when nothing matches.** What the field shows, and whether it offers a next step.
- **Feedback while results are loading.** This component has no loading, pending, or failed-to-load state.
- **Multi-select.** No axis supports it, and there is no chip or token display for several chosen values.
- **The filtered list itself** — the height of each option row, hover and active styling, grouping, and the maximum height before it scrolls.

## Pre-flight checklist

- [ ] The set is too large to scan, and the user knows the values well enough to type one.
- [ ] The set is above the dropdown floor; small sets are shown on the page instead.
- [ ] The submitted value matches an option in the set, and text that matches nothing is not accepted as a value.
- [ ] A real label is passed, it makes sense on its own, and the placeholder is not used as the label.
- [ ] Label placement is side by side, unless the container is too narrow.
- [ ] `layouts` matches every other field in the same form — one placement per form at any given breakpoint, with no mixing between fields or sections.
- [ ] No required information lives in the placeholder; the rule is in the assistive text.
- [ ] Any default is correct for nearly everyone.
- [ ] On error, the assistive text is replaced by a message that restates the rule, with a signal that is not color.
- [ ] The filtered list is not cut off by the viewport, a panel, a modal, or any scrolling ancestor.
- [ ] The expanded state, the filtered result count after each change, "no results", the active option, and the chosen value are all announced — and nothing is announced too much.
- [ ] The field is one tab stop. The arrows move, Enter selects, and Escape closes the list and returns focus to the input.
- [ ] Home and End still move the caret in the input.
- [ ] The control's own key handling and filtering are left unchanged, and real focus never moves into the list.
- [ ] Focus is never moved for the user, including when the filter narrows down to one result.
- [ ] Nothing needed requires hover or a pointer. The focus ring is intact, and looks different from the active and selected option styles.
- [ ] Disabled is used only for fields that are unavailable for now, with the reason in text. Values that can never be edited use the read-only field.
- [ ] Every variant, size, and state passed is in the inventory above, no property the component owns is overridden, and no field without focus looks disabled.
- [ ] The field saves with the form, in the same save mode as everything else in the system.
- [ ] Uncovered items were asked about, not decided: the replacement threshold, free text, how many characters to type, match order, no results, loading, multi-select, and list details.
