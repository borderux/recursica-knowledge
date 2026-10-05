---
name: recursica-skill-dropdown
description: Rules for the Recursica dropdown — when to hide a list of options instead of showing the options, the option counts that decide the control, placeholder versus value, defaults, a menu that is never cut off, and listbox accessibility. Use for select fields that pick one value. Not for fewer than four options — see recursica-skill-radio-button. Not for typing to filter — see recursica-skill-autocomplete.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Dropdown

A dropdown is a form field that hides the list of options until the user opens the dropdown. The user picks one value from the list. The open menu is the list of options the user sees after opening the dropdown.

## When to use a dropdown

- **The answers form a specific, finite list of options**, and the user picks an answer from the list instead of typing.
- **The list has more options than a visible group of options can hold**, which is more than 7 ± 2 options.
- **The form has little space.** A dropdown takes little space. A dropdown can replace a checkbox group or a radio group in a long form, where the visible options would add too much scrolling.
- **The user knows which options the dropdown holds before opening the dropdown.** See the affordance test under Rules.

## When not to use a dropdown

| Situation                                                                      | Use instead                                                                                                                       |
| ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| The list has fewer than four options                                           | Radio buttons. Never use a dropdown for fewer than four options. See `recursica-skill-radio-button`.                              |
| The options must stay visible while the user decides                           | Radio buttons, or checkboxes when the user picks zero to many. See `recursica-skill-radio-button` and `recursica-skill-checkbox`. |
| The list of options is long, and the user knows the values well enough to type | An autocomplete. See `recursica-skill-autocomplete`.                                                                              |
| The user does not know which options the list holds                            | Fewer options, grouped options, or better-named options. The list has failed the affordance test.                                 |
| The list holds actions, not values                                             | A menu. See `recursica-skill-menu`.                                                                                               |
| The value is unpredictable free-form text                                      | A text field. See `recursica-skill-text-field`.                                                                                   |
| The user picks one of two to five options laid out in a horizontal row         | A segmented control. See `recursica-skill-segmented-control`.                                                                     |
| The value has two options, and each option is the known opposite of the other  | A switch. See `recursica-skill-switch`.                                                                                           |
| The current user can never edit the value                                      | A read-only field, which shows the label and the text with no input. See `recursica-skill-read-only-field`.                       |

**Never use a disabled dropdown to show a value.** When nobody can ever change the value here, the field is not a form control.

## Variants

**Use only the dropdown variants and options that the Recursica MCP server lists for the project.** A designer can add variants and options in Theme Forge, so each project can differ. Get the list with the server's `recursica_get_component_doc` tool, and use the names the code uses. The code can use a different name from the name in Figma and the UI kit. A wrong name in code has no effect and shows no error. Never invent a variant or an option.

The rules below describe each option by role, such as "the error state". The names in the standard UI kit (the unchanged UI kit in the official Recursica release) are examples only.

- **An error state and a disabled state.** The standard UI kit calls the state variant `states`, with the two options `error` and `disabled`.
- **The placeholder and the chosen value are not variants.** The design-system website shows the placeholder and the chosen value only as examples of content. In the UI kit, both are the same `text` property with different content. The field's colors cover both.
- **Never build a focus state**, even where a source outside the UI kit lists a focused state. The dropdown already shows the focus border.
- **Size.** If the project has a size variant, use the project's size variant. Otherwise, the dropdown has a fixed height, the same height as every other single-line field.
- **Multi-select, grouped options and search.** If the project has a multi-select variant, a variant that groups options into sections, or a searchable variant, use the project's variant. Otherwise, see the open questions.
- **Icons.** The icon size and the gap between the icon and the text apply to a leading icon and to an expand indicator (the arrow at the end of the closed field).
- **Read-only is a separate component.** The read-only field, `read-only-field` in the UI kit, shows text instead of an input.

**Label placement is a variant.** The label sits beside the field or above the field. In the standard UI kit, the variant is `layouts`, with the options `side-by-side` and `stacked`. The label beside the field is the house default. The label above the field is the fallback when the form's container is too narrow for both side by side. The container's width decides, not the viewport's width. See `recursica-skill-forms`.

**Set label placement explicitly on every field.** An adapter's default may put the label above the input at every container width, which breaks the house rule. Set the label beside the input on every field, using the names the code uses for the variant and the option.

## Rules

**Run the affordance test before choosing a dropdown: does the user know which options the dropdown holds before clicking the dropdown?** A dropdown hides the options. Nothing on the closed dropdown is an affordance (a visible cue that a control can be used, such as the underline on a link) for the options inside. The list of options must be predictable.

- **Good:** US states. The list is fixed and in alphabetical order, and everyone has a rough idea of how many states there are.
- **Bad:** fifty unrelated values with nothing in common. The user has to read and compare every option to pick one.

**Use a dropdown only for four or more options.** Show three or fewer options on the page as radio buttons. Hiding three options gains nothing.

**A long list of options is acceptable when the user recognizes a value, and not when the user compares choices.** A list of fifty states is fine. A list of fifty options the user must read and weigh against each other is not. See `recursica-skill-working-memory`.

**Set a sensible default where one value is correct for nearly everyone.** Never pre-select a value the user would have to think about, look up, or check. A default the user cannot check is worse than an empty field, because the default gets submitted without being checked.

**When no sensible default exists, the field shows placeholder text.** The placeholder never holds required information, and never replaces the label.

**Label placement is one decision per form, not per field.** This field uses the same label placement as every other field in the form. Apply the container-width test once, to the whole form. The result sets the placement of every field in the form, including short fields that would fit side by side. A form may change placement at a breakpoint, but a form never mixes placements at one breakpoint, and a form section never gets a separate placement. `recursica-skill-forms` sets this rule.

**The open menu must not be cut off by the viewport, or by any scrolling ancestor** (a container further up the page that scrolls). Check the open menu near the bottom of the page, inside a panel, and inside a modal. A menu the user cannot see in full is the failure a dropdown is most likely to have.

**Put the selection rule in the assistive text**, the help text below the field, such as "You can only select one option", a minimum, or a limit. See `recursica-skill-assistive-element`. Do not put the selection rule in a validation message, which the user sees only after breaking the rule.

**On error, the error message replaces the assistive text.** The error message is not added to the assistive text. The error message must restate the rule the user broke. The error state must have a signal that is not color, as well as the color change.

**Choosing a dropdown option may show more fields.** Put the new fields right below the dropdown, and show the new fields immediately. The form still submits every field together.

**Never save when the user selects an option in a form that saves every field together.** Across the whole system, either every field saves when the field changes, or every field saves on submit.

**Do not use a dropdown to shorten a long form by hiding options the user needs to compare.** Collapsing a group of options into a dropdown to save space is fine. Collapsing the group so the user cannot see the options the user is choosing between is not.

**A disabled dropdown and a read-only field are different components, not two styles of one component.**

- **Disabled dropdown.** A disabled dropdown is still a field and still clearly an input, but the user cannot use the field right now. Use a disabled dropdown when the user could make the field usable by taking a different action first.
- **Read-only field.** A read-only field is a different component, with no input. Use a read-only field when the current user never changes the value here.

## Accessibility

The rules below add to the accessibility baseline in `recursica-skill-system-conventions`, which every Recursica component follows.

The dropdown already links the label to the field and shows the focus ring. The dropdown also opens the list and selects the option the user picks. The app is responsible for every item in the two lists below, including what a screen reader announces when the user opens the list and selects an option. Of all controls, a dropdown is the most likely to work with a mouse and fail with a keyboard or a screen reader.

### Screen readers

- **Give the dropdown a real label.** The label is the accessible name (the name a screen reader reads out for a control). The label must make sense without the text around the field. Never let the placeholder be the accessible name. A screen reader does not announce the placeholder as a label, and the placeholder disappears once the user chooses a value.
- **A screen reader must announce the field as a control for picking a value, with the field's current value.** The user then hears the selected value without opening the list.
- **The code must expose whether the list is expanded or collapsed.** A rotating chevron is only a visual cue. The user must hear that the list opened, and hear that the list closed.
- **The code must expose the number of options when the list opens**, as in "5 of 40" or a similar phrase, so the user knows how long the list is. The open list is a listbox (a list the user picks one or more options from).
- **A screen reader must announce the active option (the highlighted option in the open list) as the user moves through the list**, with the option's position in the list and whether the option is selected. A highlight that moves with no announcement makes the list unusable without sight.
- **The selected option must be marked in code, never shown by a checkmark or a highlight alone.** `recursica-skill-system-conventions` sets this rule.
- **On error, the error message is the only text announced**, because the error message has replaced the assistive text. The error message must state the rule. "Invalid input" is not an error message.
- **Give the expand indicator no separate announcement.** The expand indicator is part of the field, not a second control. A screen reader must never find the expand indicator as an unlabeled graphic or as a separate button.
- **When choosing an option shows more fields, say so in the label or in the assistive text before the user chooses.**

### Keyboard and non-mouse navigation

- **The dropdown is one tab stop (a place the Tab key lands), whether the list is open or closed.** Tab must never move through the options. While the list is open, Tab either closes the list or moves past the whole field.
- **Enter, Space, and the Down Arrow key open the list.** The Up Arrow and Down Arrow keys move the active option. Home and End jump to the first option and the last option. Enter selects the active option and closes the list.
- **Escape closes the list without changing the value, and focus returns to the field.** Both behaviors are required. Focus must never drop to the top of the page or to the page body.
- **The dropdown responds to every key press inside the dropdown automatically**, including type-ahead (typing a letter jumps to an option that starts with the letter) and any wrapping from one end of the list to the other. Do not add extra code that listens for key presses, and do not rebuild moving through the options or selecting an option.
- **Do not move focus into the list.** The field keeps focus and points to the active option. If real focus moves into a popup, focus can be lost when the popup closes, instead of returning to the field.
- **Do not move focus for the user after a selection.** Do not move focus to the next field because the dropdown now has a value.
- **Every part of the dropdown a mouse can reach must be reachable by keyboard.** Opening the list, moving through the options, and choosing an option must never depend on a pointer. Nothing the user needs may appear only on hover.

## Styling set by tokens

**Do not set or override the dropdown properties below.** The dropdown component sets each property.

- `border-radius`, `min-height`, `horizontal-padding`, `vertical-padding`, `border-size`.
- `icon-size` and `icon-text-gap`.
- `text` styling and `colors`, for each layer (a numbered background level, 0 to 3, that sets the colors of the components on that level) and each state.
- Field width and height. `globals.form.field.size` supplies `min-width`, `max-width`, and `single-line-input-height`. `globals.form.field` also supplies `border-radius`, the paddings, and `border-selected`.
- The focus border from `globals.form.field.colors.border-selected`.
- The disabled look from `globals.states.disabled`.
- The gaps between the label and the field, and the spacing between fields: `globals.form.properties.label-field-gap-horizontal`, `label-field-gap-vertical`, and `vertical-item-gap`.
- The connection between the label and the field, the expand indicator, hover and active styling, the focus ring, and the keyboard behavior for opening the list and selecting an option.

**Never style a dropdown without focus so that the dropdown looks disabled.** An editable field must look editable when the user is not using the field.

## Related skills

- `recursica-skill-selection-controls` — when a dropdown replaces a visible group of options, the affordance test, option counts, pre-selected values, disabled versus read-only, and when a choice is saved.
- `recursica-skill-forms` — single-column layout, label placement, the container width that decides label placement, one placement per form, required and optional markers, when validation runs, limits on pre-filled values, the form's save mode, and the rule that no form control goes inside a card.
- `recursica-skill-label` — label text that names the object and makes sense without the text around the label, and the required and optional markers.
- `recursica-skill-assistive-element` — the help text and error text below the field, and why the error text replaces the help text instead of joining the help text.
- `recursica-skill-working-memory` — the basis for 7 ± 2, and the difference between recognizing and comparing that decides when a long list is acceptable.
- `recursica-skill-system-conventions` — never showing meaning in only one way, and fixing the structure of a screen instead of adding a mechanism to cope with a bad structure.

### Only if used on the same screen

- `recursica-skill-autocomplete` — the typeahead control for lists of options too long to scan.

## Open questions

- **Multi-select.** `recursica-skill-selection-controls` requires a multi-select dropdown in two places. The dropdown in the shipped adapter (the Recursica component library for one framework, such as Mantine or Angular Material) selects a single value. When the project has no multi-select variant, the missing variant is no reason to build a multi-select dropdown out of other parts. Do not put a checkbox group inside a dropdown, and do not substitute a transfer list without asking. Where the user must filter by several values, a build test used separate single-value filters that AND together (a row appears only if it matches all of them) successfully as the workaround. Ask only when the project has no multi-select variant.
- **The open menu.** Ask about the option rows, the height of an option row, hover and active styling, group headers, dividers, icons or descriptions inside an option, and the maximum height of the open menu before the menu scrolls.
- **The autocomplete threshold.** The dropdown's guidance says to consider a typeahead when the list is long and the user knows the options well. `recursica-skill-selection-controls` records the threshold as not set. Do not pick a number.
- **Clearing.** No rule says whether the user may clear a dropdown back to no value after choosing a value, or whether an explicit "None" option is allowed.
- **Grouped options and dependent dropdowns.** No rule covers options grouped into sections, or dependent dropdowns, where the value chosen in one dropdown filters the options in another dropdown. Ask about grouped options only when the project has no variant that groups options.
- **An empty list of options.** No rule says what a dropdown with no options shows.

## Pre-flight checklist

- [ ] The list of options passes the affordance test: the user knows which options the dropdown holds before opening the dropdown.
- [ ] The dropdown has at least four options. A list of three or fewer options uses radio buttons.
- [ ] The list has more options than a visible group can hold, or the space saved in a long form justifies replacing visible options with a dropdown.
- [ ] Any default is correct for nearly everyone, and no value the user would have to check is pre-selected.
- [ ] Where no default exists, the field shows placeholder text, and the placeholder holds no required information.
- [ ] The dropdown has a real label that makes sense without the text around the field, and the placeholder is not used as the label.
- [ ] Label placement is side by side, unless the container is too narrow.
- [ ] Label placement matches every other field in the same form, with one placement per form at each breakpoint and no mixing between fields or form sections. Label placement is set explicitly on the field, to `side-by-side` unless the form's container is too narrow. A field with no label placement set shows the label above the field (`stacked`), which breaks the house rule. The name of the label placement setting in code is not `layouts`.
- [ ] The open menu is not cut off by the viewport, a panel, a modal, or any scrolling ancestor.
- [ ] Selection rules are in the assistive text. On error, an error message that restates the rule replaces the assistive text, with a signal that is not color.
- [ ] A screen reader announces the expanded state, the number of options, the active option, and the selected value.
- [ ] The field is one tab stop. Enter, Space, and the Down Arrow key open the list. The arrow keys, Home, and End move the active option. Enter selects, and Escape closes the list and returns focus to the field.
- [ ] Key handling inside the dropdown comes from the dropdown component, and real focus never moves into the list.
- [ ] Focus is never moved for the user after a selection.
- [ ] Nothing the user needs requires hover or a pointer. The focus ring is intact, and looks different from the active option style and the selected option style.
- [ ] Disabled is used only for fields that are unavailable for now. Values that can never be edited use the read-only field.
- [ ] Every variant, size, and state is one the project's UI kit lists. Every property the component sets comes from the component. No field without focus looks disabled.
- [ ] The field saves with the form, in the same save mode as every other field in the system.
- [ ] Open questions were asked about, not decided: multi-select, the open menu, the autocomplete threshold, clearing, grouped options, and an empty list of options.
