---
name: recursica-skill-dropdown
description: How to use the Recursica dropdown correctly — when a hidden option list beats a visible one, the four-option floor and the count ceiling above which a radio group becomes a dropdown, the affordance test the option set must pass, placeholder vs. valued text, sensible defaults, keeping the menu unclipped, disabled vs. read-only, and the screen-reader and keyboard requirements for a listbox including expanded state, the active option, Escape, and Home and End. Use whenever adding, reviewing, or refactoring a dropdown or select field. Trigger on "dropdown", "select", "select field", "option list", "listbox", "combobox", "expanded", "menu clipped", "screen reader", "tab order", or a request to let a user pick one value from a set. Do NOT use for a small visible set — that is recursica-skill-radio-button. Do NOT use for typing to filter a large set — recursica-skill-autocomplete. Do NOT use for a list of actions — recursica-skill-menu.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Dropdown

A dropdown is a form field that hides its options until it is opened, and returns one value from that set.

## Use it when

- **The set of answers is specific and finite**, and the user picks from it instead of typing.
- **There are more options than the limit for a visible group** — more than 7 ± 2.
- **Space is the constraint.** A dropdown is compact, so it can replace a checklist or a radio group where a long form cannot afford the extra scrolling.
- **The user already knows what is inside before they open it.** See the affordance test below.

## Do not use it when

| Instead of a dropdown                                               | Use                                                                            |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| There are fewer than four options                                   | `recursica-skill-radio-button`. Never a dropdown below four                    |
| The options must stay visible while the user decides                | `recursica-skill-radio-button`, or `recursica-skill-checkbox` for zero to many |
| The set is large, and the user knows the values well enough to type | `recursica-skill-autocomplete`                                                 |
| The user does not know what the set contains                        | Fewer, grouped, or better-named options — the affordance test has failed       |
| The list is a set of actions rather than values                     | `recursica-skill-menu`                                                         |
| The value is unpredictable free-form text                           | `recursica-skill-text-field`                                                   |
| A horizontal single-select of two to five options is wanted         | `recursica-skill-segmented-control`                                            |
| The value is binary, with a known opposite                          | `recursica-skill-switch`                                                       |
| This user can never edit the value                                  | `recursica-skill-read-only-field` — shows the label and text, with no input    |

**A disabled dropdown is not a way to show a value.** If nobody can ever change it here, it is not a form control.

## What exists

Taken from `recursica_ui-kit.json` → `ui-kit.components.dropdown`. **Do not pass a variant, size, or state that is not listed here.**

**The third column is the React prop that sets each axis.** The axis name comes from the token inventory. It is not a prop, and if you pass it as one, React quietly ignores it. A blank cell means no single prop sets that axis — it is set by CSS state or by separate props, and the rules below say which.

| Axis      | Options                   | React prop   |
| --------- | ------------------------- | ------------ |
| `states`  | `error`, `disabled`       |              |
| `layouts` | `stacked`, `side-by-side` | `formLayout` |

**`layouts` is the label-placement axis, set by the `formLayout` prop.** `side-by-side` — the label beside the field — is the house default. `stacked` is the fallback when the container is too narrow to fit both. What decides this is the container's width, not the viewport's (the visible area of the browser window). See `recursica-skill-forms`.

**`formLayout` defaults to `stacked`, so the house rule is the one thing you must pass.** Leave it out, and you get the fallback in a container of any width — the rule turned upside down. `layouts` is the name of the token axis, not a prop: `layouts="side-by-side"` is quietly ignored by React and leaves the control stacked, with no error. Pass `formLayout="side-by-side"` explicitly, on every field.

**Placeholder and valued are not variants.** Both are documented outside the token inventory as content. In the kit, they are the same `text` property with different content, which is why there is no placeholder axis. The field's `colors` cover both.

**Focused is not a state.** It is listed as one outside the token inventory, but the kit handles it through `globals.form.field.colors.border-selected`. Do not build it as a state.

**There is no size axis.** `min-height` is a fixed property, and `globals.form.field.size.single-line-input-height` sets the height for every single-line field.

**There is no multi-select axis**, no axis for grouping options into sections, and no searchable variant — see the uncovered list.

**The kit defines the closed field only.** `icon-size` and `icon-text-gap` cover a leading icon and the expand indicator. The open menu, its options, and their rows are not part of this component's inventory.

**Read-only is a separate component** — `read-only-field`, which shows text instead of an input.

## Rules for using it

**Run the affordance test before choosing this control: does the user know what is in there before they click it?** A dropdown hides its options, so there is no affordance (a visible cue that tells the user they can act on something) for what is inside. The set has to be predictable.

- **Good:** US states. A fixed list, in alphabetical order, and everyone has a rough idea of how many there are.
- **Bad:** fifty unrelated values with nothing in common. Overwhelming, and mentally expensive to pick from.

**Four options is the minimum.** Below four, the options belong on the page as radio buttons; hiding three things gains nothing.

**Length costs little when the user is recognising a value, and a lot when they are comparing choices.** Fifty states is fine; fifty things the user must read and weigh up is not. See `recursica-skill-working-memory`.

**Provide a sensible default where one really is correct** for nearly everyone. Never pre-select a value the user would have to think about, look up, or check. A default the user cannot check is worse than an empty field, because it gets submitted without being checked.

**Where there is no sensible default, the field shows placeholder text.** That placeholder never carries required information, and never stands in for the label.

**Label placement is one decision per form, not per field.** This field's `layouts` value is not a separate choice — it matches every other field in the same form. The container-width test is applied once, to the whole form, and its answer governs every field in it, including short ones that would have fitted side by side. A whole form may switch placement between breakpoints (the screen widths at which the layout changes), but it never mixes the two at one breakpoint, and a section never gets its own placement. Owned by `recursica-skill-forms`.

**The menu must not be cut off by the viewport, or by any scrolling ancestor** (a container further up the page that scrolls). Check it near the bottom of the page, inside a panel, and inside a modal. A list the user cannot see all of is the failure this control is most likely to have.

**Put the selection rule in assistive text** — "You can only select one option", a minimum, a limit — through `recursica-skill-assistive-element`. Do not put it in a validation message the user only sees after they fail.

**On error, the assistive text is replaced, not added to.** The message must restate the rule that was broken, and the error state must have a signal that is not color, as well as the colour change.

**Choosing a dropdown option may reveal more fields**, kept right below it and appearing immediately. The form still submits everything together.

**Never save on selection in a form that saves everything together.** Either every field in the system saves when it changes, or every field saves on submit.

**Do not use a dropdown to shorten a long form by hiding comparisons the user needs to make.** Collapsing a group to save space is fine; collapsing it so the user cannot see what they are choosing between is not.

**Disabled and read-only are different components, not two styles of one.**

- **Disabled dropdown** — still a field, still clearly an input, just not usable right now. Use it when the user could make it usable by doing something else first.
- **Read-only field** — a different component entirely, with no input. Use it when this user never changes this value here.

**Never disable a dropdown as the only explanation.** The keyboard skips a disabled field, so the reason must be in text nearby.

## Accessibility

The accessibility baseline in `recursica-skill-system-conventions` applies here too — the focus ring, hover, tab order, disabled reasons, form text, and icons. This section adds only what is specific to this component.

The component connects the label to the field, provides the focus ring (the outline that shows which element has keyboard focus), and owns the open-and-select interaction. What that interaction announces, and everything below, is up to you. A dropdown is the control where "it works with a mouse" hides the most failures.

### Screen readers

- **Pass a real label.** It is the accessible name (the name a screen reader reads out for a control), and it must make sense on its own. Never let the placeholder be the name — a placeholder is not announced as a label, and it disappears once a value is chosen.
- **The field must be announced as a control for picking a value, along with its current value**, so the user hears what is selected without opening anything.
- **Whether the list is expanded or collapsed must be available in code.** A rotating chevron is only a visual cue. The user must hear that the list is open, and hear that it closed.
- **The number of options must be available when the list opens** — "5 of 40" or something similar — so the user knows how big the list is. (The open list is a listbox: a list the user picks one or more options from.)
- **The active option must be announced as the user moves through the list**, including its position and whether it is selected. Moving the highlight silently makes the list unusable without sight.
- **Selection must be available in code, never shown by a checkmark or a highlight alone.** Required by `recursica-skill-system-conventions`.
- **On error, the message is the only text announced**, because it has replaced the assistive text — so it has to state the rule. "Invalid input" is not an error message.
- **Give the expand indicator no separate announcement.** It is part of the field, not a second control. It must not show up as an unlabelled graphic or as its own button.
- **A disabled dropdown is announced as disabled, but Tab skips it**, so any explanation carried only by how it looks cannot be reached. Put the reason in text.
- **If choosing an option reveals more fields, say so before the choice is made** — in the label or in the assistive text.

### Keyboard and non-mouse navigation

- **The dropdown is one tab stop (a place the Tab key lands), whether open or closed.** Tab must never step through the options. While the list is open, Tab either closes it or moves past the whole field.
- **Enter, Space, and Down open the list.** Arrow Up and Down move the active option, Home and End jump to the first and last option, and Enter selects the active option and closes the list.
- **Escape closes the list without changing the value, and focus returns to the field.** This is not optional, and focus must never drop to the top of the page or to the body.
- **The library owns how keys work inside the control**, including type-ahead on a letter key (typing a letter jumps to an option that starts with it) and any wrapping around at the ends of the list. Do not attach your own key listeners, and do not rebuild moving or selecting.
- **Do not move focus into the list.** The field keeps focus and points to the active option. A dropdown that moves real focus into a popup breaks the way back.
- **Do not move focus for the user after a selection.** No jumping ahead to the next field because a value now exists.
- **Everything reachable by mouse must be reachable by key.** Nothing about opening, moving through, or choosing may depend on a pointer, and nothing needed may appear only on hover.

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

- `recursica-skill-selection-controls` — when a dropdown replaces a visible group, the affordance test, option counts, pre-selection, disabled vs. read-only, and commit timing.
- `recursica-skill-forms` — single-column layout, label placement, its container-width trigger, and one placement per form, required vs. optional marking, validation timing, pre-fill limits, save mode, and the rule that no form control goes inside a card.
- `recursica-skill-label` — label copy that names the object and stands alone, and the required and optional markers.
- `recursica-skill-assistive-element` — the help and error text below the field, and why the error replaces rather than joins it.
- `recursica-skill-working-memory` — the 7 ± 2 basis and the recognition-versus-comparison boundary that decides when a long list is acceptable.
- `recursica-skill-system-conventions` — never carry meaning in a single channel; fix the structure rather than adding a mechanism to cope with it.

### Only if the screen also uses it

- `recursica-skill-autocomplete` — the typeahead control for sets too large to scan.

## Uncovered — ask, do not invent

- **The multi-select dropdown does not exist, and this is now confirmed in the shipped adapter as well as in the token inventory** — the dropdown maps to a single-value select, with no multi-select variant. `recursica-skill-selection-controls` requires one in two places. It is a gap in the component inventory, **not an invitation to build one out of other parts**: do not put a checkbox group inside a dropdown, and do not substitute a transfer list without asking. Where several values must be filtered, a build test used separate single-value filters that AND together (a row appears only if it matches all of them) successfully as the workaround. Ask.
- **The open menu itself.** Option rows, their height, hover and active styling, group headers, dividers, icons or descriptions inside an option, and the maximum height of the menu before it scrolls are all outside the component's token inventory.
- **The point at which a dropdown becomes an autocomplete.** This component's own guidance says to consider a typeahead when the list is long and the user knows the options well. `recursica-skill-selection-controls` records the threshold as not set. Do not pick a number.
- **Whether a dropdown may be cleared** back to no value once a selection is made, and whether an explicit "None" option is allowed.
- **Grouped or sectioned options**, and dependent dropdowns, where one field's selection filters another's set.
- **An empty set of options** — what a dropdown with nothing in it shows.

## Pre-flight checklist

- [ ] The set of options passes the affordance test — the user knows what is inside before opening it.
- [ ] There are at least four options; smaller sets are radio buttons.
- [ ] The set is above the limit for a visible group, or saving space in a long form justified collapsing it.
- [ ] Any default really is correct for nearly everyone, and nothing the user would have to check is pre-selected.
- [ ] Where there is no default, placeholder text is used, and it carries no required information.
- [ ] A real label is passed, it makes sense on its own, and the placeholder is not doing its job.
- [ ] Label placement is side by side, unless the container is too narrow.
- [ ] `formLayout` is passed explicitly — `side-by-side`, unless the form's container is too narrow — and matches every other field in the same form. There is one placement per form at any given breakpoint, with no mixing between fields or sections. A missing prop means `stacked`, not the house rule, and `layouts` is not the prop name.
- [ ] The menu is not cut off by the viewport, a panel, a modal, or any scrolling ancestor.
- [ ] Selection rules are in assistive text. On error, it is replaced by a message that restates the rule, with a signal that is not color.
- [ ] The expanded state, the number of options, the active option, and the selected value are all announced.
- [ ] The field is one tab stop. Enter, Space, and Down open it; the arrows, Home, and End move; Enter selects; and Escape closes it and returns focus to the field.
- [ ] You overrode no key handling inside the control, and real focus never moves into the list.
- [ ] Focus is never moved for the user after a selection.
- [ ] Nothing needed requires hover or a pointer. The focus ring is intact, and looks different from the active and selected option styles.
- [ ] Disabled is used only for fields that are unavailable for now, with the reason in text. Values that can never be edited use the read-only field.
- [ ] You passed no variant, size, or state outside the inventory above, overrode no property the component owns, and no field without focus looks disabled.
- [ ] The field saves with the form, in the same save mode as everything else in the system.
- [ ] You invented nothing from the uncovered list: multi-select, the menu's details, the autocomplete threshold, clearing, grouped options, and empty sets.
