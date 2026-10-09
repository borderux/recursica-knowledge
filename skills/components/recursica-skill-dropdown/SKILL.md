---
name: recursica-skill-dropdown
description: Rules for the Recursica dropdown — when to hide a list of options instead of showing the options, the option counts that decide the control, placeholder versus value, defaults, a menu that is never cut off, and listbox accessibility. Use for select fields that pick one value. Not for fewer than four options — see recursica-skill-radio-button. Not for typing to filter — see recursica-skill-autocomplete.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Dropdown

A dropdown is a form field that hides a list of options until the persona opens the dropdown. The persona picks one value from the list, such as a US state. The open menu is the list of options the persona sees after opening the dropdown.

## When to use a dropdown

- **The answer comes from a specific, finite list of options**, such as the US states. The persona picks the answer from the list instead of typing the answer.
- **The list has more than 7 ± 2 options.** More than 7 ± 2 options is too many for a visible group of options, such as a radio group.
- **The form has little space.** A dropdown takes little space. In a long form, a dropdown can replace a checkbox group or a radio group. The visible options would add too much scrolling to a long form.
- **The persona knows which options the dropdown holds before opening the dropdown.** For example, the persona knows a "State" dropdown holds the US states. See the affordance test under Rules.

## When not to use a dropdown

| Situation                                                                         | Use instead                                                                                                                          |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| The list has fewer than four options                                              | Radio buttons. Never use a dropdown for fewer than four options. See `recursica-skill-radio-button`.                                 |
| The options must stay visible while the persona decides                           | Radio buttons, or checkboxes when the persona picks zero to many. See `recursica-skill-radio-button` and `recursica-skill-checkbox`. |
| The list of options is long, and the persona knows the values well enough to type | An autocomplete. See `recursica-skill-autocomplete`.                                                                                 |
| The persona does not know which options the list holds                            | Fewer options, grouped options, or better-named options. The list has failed the affordance test.                                    |
| The list holds actions, such as "Edit" and "Delete", not values                   | A menu. See `recursica-skill-menu`.                                                                                                  |
| The value is unpredictable free-form text, such as a person's name                | A text field. See `recursica-skill-text-field`.                                                                                      |
| The persona picks one of two to five options laid out in a horizontal row         | A segmented control. See `recursica-skill-segmented-control`.                                                                        |
| The value has two options, and each option is the known opposite of the other     | A switch. See `recursica-skill-switch`.                                                                                              |
| The persona viewing the field can never edit the value                            | A read-only field, which shows the label and the text with no input. See `recursica-skill-read-only-field`.                          |

**Never use a disabled dropdown to show a value.** A value that nobody can ever change where the value is shown does not belong in a form control.

## Variants

**Use only the dropdown variants and options that the Recursica MCP server lists for the theme (the design a designer sets in Theme Forge: the token values, and each component's variants, states and sizes).** A designer can add variants and options in Theme Forge, so each theme can differ. Get the list with the server's `recursica_get_component_doc` tool, and use the names the code uses. The code can use a different name from the name in Figma and the UI kit. A wrong name in code has no effect and shows no error. Never invent a variant or an option.

The rules below describe each option by role, such as "the error state". The names in the standard UI kit (the unchanged UI kit in the official Recursica release) are examples only.

- **A dropdown has an error state and a disabled state.** The standard UI kit calls the state variant `states`, with the two options `error` and `disabled`.
- **The placeholder and the chosen value are not variants.** In the UI kit, the placeholder and the chosen value are the same `text` property with different content. The design-system website shows the placeholder and the chosen value only as examples of content.
- **Never build a focus state**, even where a source outside the UI kit lists a focused state. The dropdown already shows the focus border.
- **A dropdown can show a leading icon** before the value, such as a flag before a country name.
- **If the theme has a size variant, use the theme's size variant.** Otherwise, the dropdown has a fixed height, the same height as every other single-line field.
- **If the theme has one of the following variants, use the theme's variant.** Otherwise, see the open questions.
  - a multi-select variant
  - a variant that groups options into sections
  - a searchable variant
- **A read-only field is a separate component.** The read-only field, `read-only-field` in the UI kit, shows text instead of an input.

**Label placement is a variant.** A field's label sits beside the field or above the field. In the standard UI kit, the variant is `layouts`, with the options `side-by-side` and `stacked`. The label beside the field is the house default. The label above the field is the fallback when the form's container is too narrow for both side by side. The container's width decides, not the viewport's width. See `recursica-skill-forms`.

**Set label placement explicitly on every field.** The house rule puts the label beside the input. The code library under an adapter may put the label above the input by default, at every container width. Set the label beside the input on every field. Use the names the code uses for the variant and the option.

## Rules

**Run the affordance test before choosing a dropdown.** The test asks one question: does the persona know which options the dropdown holds before clicking the dropdown? A closed dropdown hides the options. Nothing on the closed dropdown is an affordance (a visible cue that a control can be used, such as the underline on a link) for the options inside. The list of options must be predictable.

- **Good:** US states. The list of states is fixed and in alphabetical order. Everyone has a rough idea of how many states the list holds.
- **Bad:** fifty unrelated values with nothing in common. The persona has to read and compare every option to pick one option.

**Use a dropdown only for four or more options.** Show three or fewer options on the page as radio buttons. Hiding three options in a dropdown gains nothing.

**A long list of options is fine when the persona recognizes a value, and not when the persona compares choices.** For example, a persona finds "Ohio" in a list of fifty US states by recognizing the name. A list of fifty options the persona must read and weigh against each other is not fine. See `recursica-skill-working-memory`.

**If one value is correct for nearly everyone, set the value as a sensible default.** For example, a store that ships only to the United States sets the "Country" dropdown to "United States".

- Never pre-select a value the persona would have to think about, look up, or check.
- A default the persona cannot check is worse than an empty field. The default gets submitted without being checked.

**If no sensible default exists, show placeholder text in the dropdown**, such as "Select a state".

- Never put required information in the placeholder.
- Never use the placeholder in place of the label.

**Label placement is one decision per form, not per field.** This field uses the same label placement as every other field in the form. Apply the container-width test once, to the whole form. The result sets the placement of every field in the form. Short fields that would fit side by side follow the result too. A form may change placement at a breakpoint. A form never mixes placements at one breakpoint. A form section never gets a separate placement. `recursica-skill-forms` sets this rule.

**The open menu must not be cut off by the viewport, or by any scrolling ancestor** (a container further up the page that scrolls). A cut-off open menu is the failure a dropdown is most likely to have. Check the open menu in three places:

- near the bottom of the page
- inside a panel
- inside a modal

**Put the selection rule in the assistive text, the help text below the dropdown.** See `recursica-skill-assistive-element`. A selection rule can be any of the following:

- a sentence such as "You can only select one option"
- a minimum
- a limit

Do not put the selection rule in a validation message. The persona sees a validation message only after breaking the selection rule.

**If the dropdown shows an error, replace the assistive text with the error message.**

- Do not add the error message to the assistive text.
- The error message must restate the rule the persona broke.
- The error state must have a signal that is not color, as well as the color change.

**Choosing a dropdown option may show more fields.** For example, choosing "Other" may show a text field for the persona's answer.

- Put the new fields right below the dropdown.
- Show the new fields immediately.
- The form still submits every field together.

**In a form that saves every field together, never save when the persona selects an option.** Every field in the whole system uses one save mode. Either every field saves when the field changes, or every field saves on submit.

**Do not use a dropdown to shorten a long form by hiding options the persona needs to compare.** Moving a group of options into a dropdown to save space is fine. Moving the group so the persona cannot see the options the persona is choosing between is not fine.

**A disabled dropdown and a read-only field are different components, not two styles of one component.**

- **Use a disabled dropdown when the persona could make the dropdown usable by taking a different action first.** For example, a "Delivery time" dropdown stays disabled until the persona checks "Schedule delivery". A disabled dropdown is still a field and still clearly an input. The persona cannot use the disabled dropdown right now.
- **Use a read-only field when the persona viewing the field never changes the value where the value is shown.** For example, an order number on an order's details page goes in a read-only field. A read-only field is a different component, with no input.

## Accessibility

The rules below add to the accessibility baseline in `recursica-skill-system-conventions`, which every Recursica component follows.

**Make each app meet every item in the two lists below.** The items include what a screen reader announces when the persona opens the list and selects an option. The dropdown component links the label to the field and shows the focus ring. The dropdown component also opens the list of options and selects the option the persona picks. A dropdown is the control most likely to work with a mouse and fail with a keyboard or screen reader.

### Screen readers

- **Give the dropdown a real label.** The label is the accessible name (the name a screen reader reads out for a control). The label must make sense without the text around the dropdown. For example, write "Shipping state", not "Choose one".
- **Never let the placeholder be the accessible name.** A screen reader does not announce the placeholder as a label. The placeholder disappears once the persona chooses a value.
- **A screen reader must announce the dropdown as a control for picking a value, with the dropdown's current value.** The persona then hears the selected value without opening the list.
- **The code must tell assistive technology whether the list is expanded or collapsed.** A rotating chevron is only a visual cue. The persona must hear that the list opened, and hear that the list closed.
- **When the list opens, the code must tell assistive technology how many options the list holds.** The announcement can be "5 of 40" or a similar phrase. The persona then knows how long the list is. The open list is a listbox (a list the persona picks one or more options from).
- **As the persona moves through the open list, a screen reader must announce the active option (the highlighted option).** The announcement must include the option's position in the list and whether the option is selected. A highlight that moves with no announcement makes the list unusable without sight.
- **The selected option must be marked in code, never shown by a checkmark or a highlight alone.** `recursica-skill-system-conventions` sets this rule.
- **When the dropdown shows an error, the error message is the only text announced.** The error message has replaced the assistive text. The error message must state the rule. "Invalid input" is not an error message.
- **Give the expand indicator (the arrow at the end of the closed field) no separate announcement.** The expand indicator is part of the field, not a second control. A screen reader must never find the expand indicator as an unlabeled graphic or as a separate button.
- **When choosing an option shows more fields, say that more fields will appear.** Put the notice in the label or in the assistive text, before the persona chooses an option.

### Keyboard and non-mouse navigation

- **The dropdown is one tab stop (a place the Tab key lands), whether the list is open or closed.** Tab must never move through the options. While the list is open, Tab either closes the list or moves past the whole field.
- **Enter, Space, and the Down Arrow key open the list.** The Up Arrow and Down Arrow keys move the active option. Home and End jump to the first option and the last option. Enter selects the active option and closes the list.
- **Escape must close the list without changing the value, and must return focus to the field.** Focus must never drop to the top of the page or to the page body.
- **Do not add extra code that listens for key presses.** The dropdown component handles every key press inside the dropdown. Do not rebuild moving through the options or selecting an option. The dropdown component also handles the following:
  - type-ahead (typing a letter jumps to an option that starts with the letter)
  - any wrapping from one end of the list to the other
- **Do not move focus into the list.** The field keeps focus and points to the active option. If real focus moves into a popup, such as the open list, focus can be lost when the popup closes. Focus then does not return to the field.
- **Do not move focus for the persona after a selection.** When the dropdown gets a value, do not move focus to the next field.
- **Every part of the dropdown a mouse can reach must be reachable by keyboard.** Opening the list, moving through the options, and choosing an option must never depend on a pointer. Nothing the persona needs may appear only on hover.

## Styling set by tokens

**Never set or override the dropdown's styling.** The theme sets every visual property of the dropdown, such as size, spacing, borders, colors and animation. Do not add extra containers or spacers to change the dropdown's look. If the theme does not give a look the design needs, report the missing look as a design-system gap. See `recursica-skill-design-router`.

Do not set or override the following spacing:

- the gap between the dropdown's label and the field
- the spacing between the dropdown and the fields around the dropdown

Do not set or override the parts the dropdown component provides:

- the connection between the label and the field
- the expand indicator
- the hover and active styling
- the focus ring
- the disabled look
- the keyboard behavior for opening the list and selecting an option

**Never style a dropdown without focus so that the dropdown looks disabled.** An editable field must look editable when the persona is not using the field.

## Related skills

- `recursica-skill-selection-controls` — when a dropdown replaces a visible group of options, the affordance test, and option counts. The skill also covers pre-selected values, disabled versus read-only, and when a choice is saved.
- `recursica-skill-forms` — the form rules:
  - single-column layout
  - label placement, and the container width that decides label placement
  - one placement per form
  - required and optional markers
  - when validation runs
  - limits on pre-filled values
  - the form's save mode
  - the rule that no form control goes inside a card
- `recursica-skill-label` — label text that names the object and makes sense without the text around the label. The skill also covers the required and optional markers.
- `recursica-skill-assistive-element` — the help text and error text below the field. The skill also explains why the error text replaces the help text instead of joining the help text.
- `recursica-skill-working-memory` — the basis for 7 ± 2, and the difference between recognizing and comparing that decides when a long list is acceptable.
- `recursica-skill-system-conventions` — never showing meaning in only one way. The skill also covers fixing a screen's structure instead of adding a mechanism to work around a bad structure.

### Only if used on the same screen

- `recursica-skill-autocomplete` — the typeahead control for lists of options too long to scan.

## Open questions

- **Multi-select.** `recursica-skill-selection-controls` requires a multi-select dropdown in two places. The dropdown in the shipped adapter (the Recursica component library for one framework, such as Mantine or Angular Material) selects a single value. A missing multi-select variant is no reason to build a multi-select dropdown out of other parts. Do not put a checkbox group inside a dropdown. Do not substitute a transfer list without confirming with the user. When the persona must filter by several values, one build test used separate single-value filters that AND together (a row appears only if the row matches every filter). The workaround succeeded. Confirm with the user only when the theme has no multi-select variant.
- **The open menu.** Confirm with the user before showing group headers, or icons or descriptions inside an option.
- **The autocomplete threshold.** The dropdown skill says to consider an autocomplete for a long list of options that the persona knows well. `recursica-skill-selection-controls` records the threshold as not set. Do not pick a number.
- **Clearing.** No rule says whether the persona may clear a dropdown back to no value after choosing a value. No rule says whether an explicit "None" option is allowed.
- **Grouped options and dependent dropdowns.** No rule covers options grouped into sections, or dependent dropdowns. With dependent dropdowns, the value chosen in one dropdown filters the options in another dropdown. For example, the "Country" dropdown sets which states the "State" dropdown lists. Confirm grouped options with the user only when the theme has no variant that groups options.
- **An empty list of options.** No rule says what a dropdown with no options shows.

## Pre-flight checklist

- [ ] The list of options passes the affordance test: the persona knows which options the dropdown holds before opening the dropdown.
- [ ] The dropdown has at least four options. A list of three or fewer options uses radio buttons.
- [ ] The options are too many for a visible group, or the space saved in a long form justifies a dropdown.
- [ ] Any default is correct for nearly everyone, and no value the persona would have to check is pre-selected.
- [ ] Where no default exists, the dropdown shows placeholder text, and the placeholder holds no required information.
- [ ] The dropdown has a real label that makes sense without the text around the dropdown. The placeholder is not used as the label.
- [ ] Label placement is side by side, unless the form's container is too narrow.
- [ ] Label placement matches every other field in the same form. Each form has one placement at each breakpoint, with no mixing between fields or form sections. Label placement is set explicitly on the field, to `side-by-side` unless the form's container is too narrow. A field with no label placement set shows the label above the field (`stacked`), which breaks the house rule. The name of the label placement setting in code is not `layouts`.
- [ ] The open menu is not cut off by the viewport, a panel, a modal, or any scrolling ancestor.
- [ ] Selection rules are in the assistive text. On error, an error message that restates the rule replaces the assistive text, with a signal that is not color.
- [ ] A screen reader announces the expanded state, the number of options, the active option, and the selected value.
- [ ] The dropdown is one tab stop. Enter, Space, and the Down Arrow key open the list. The arrow keys, Home, and End move the active option. Enter selects, and Escape closes the list and returns focus to the field.
- [ ] Key handling inside the dropdown comes from the dropdown component, and real focus never moves into the list.
- [ ] Focus is never moved for the persona after a selection.
- [ ] Nothing the persona needs requires hover or a pointer. The focus ring is intact, and looks different from the active option style and the selected option style.
- [ ] A disabled dropdown is used only for a field that is unavailable for now. A value that can never be edited is in a read-only field.
- [ ] Every variant, size, and state is one the theme's UI kit lists. No field without focus looks disabled.
- [ ] No styling is set or overridden on the dropdown. No container or spacer is added to change the dropdown's look.
- [ ] The dropdown saves with the form, in the same save mode as every other field in the system.
- [ ] Open questions were asked about, not decided: multi-select, the open menu, the autocomplete threshold, clearing, grouped options, and an empty list of options.
