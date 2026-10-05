---
name: recursica-skill-autocomplete
description: Rules for the Recursica autocomplete, a text field that filters a long list of options the user knows well — a value that must match an option, placeholder rules, a filtered list that is never cut off, and combobox accessibility, including result counts. Use for typeahead fields and fields that search while the user types. Not for short lists of options — see recursica-skill-dropdown. Not for free text — see recursica-skill-text-field.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Autocomplete

An autocomplete is a text field whose value comes from a defined list of options. The user types to filter the list of options, then picks from the filtered list.

## When to use an autocomplete

- **The list of options is too long to scan comfortably in a dropdown.** Opening a dropdown and reading down the whole list is worse than typing.
- **The user knows the options well** and can start typing a value the user already has in mind. Typing relies on recall (remembering the answer). When the user needs to recognize the answer among the options shown, the user needs a control that shows the options instead.
- **The value must still come from the list of options.** The typed text filters the list. The typed text is not a free-text entry.

## When not to use an autocomplete

| Situation                                                                     | Use instead                                                                                                                       |
| ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| The list of options is short enough to show all at once                       | Radio buttons, or checkboxes when the user picks zero to many. See `recursica-skill-radio-button` and `recursica-skill-checkbox`. |
| The list of options is long, but the user does not know the values well       | A dropdown, so the user can read the options instead of recalling the options. See `recursica-skill-dropdown`.                    |
| The value is unpredictable free-form text                                     | A text field. See `recursica-skill-text-field`.                                                                                   |
| The list holds actions, not values                                            | A menu. See `recursica-skill-menu`.                                                                                               |
| The value has two options, and each option is the known opposite of the other | A switch. See `recursica-skill-switch`.                                                                                           |
| The current user can never edit the value                                     | A read-only field, which shows the label and the text with no input. See `recursica-skill-read-only-field`.                       |

**Do not use a disabled autocomplete to show a value.** When nobody can ever change the value here, a disabled autocomplete is not a form control.

## Variants

**Use only the autocomplete variants and options that the Recursica MCP server lists for the project.** A designer can add variants and options in Theme Forge, so each project can differ. Get the list with the server's `recursica_get_component_doc` tool, and use the names the code uses. The same tool gives the name of each variant in code. The code can use a different name from the name in Figma and the UI kit. A wrong name in code has no effect and shows no error. Never invent a variant or an option.

The rules below describe each option by role, such as "the error state". The names in the standard UI kit (the unchanged UI kit in the official Recursica release) are examples only.

- **An error state and a disabled state.** The standard UI kit calls the state variant `states`, with the two options `error` and `disabled`.
- **The placeholder is not a variant.** `placeholder-opacity` sets the placeholder.
- **Never build a focus state.** The component draws the focus border.
- **No size variant in the standard UI kit.** If the project adds a size variant in Theme Forge, use the project's variant. Otherwise, the autocomplete has a fixed height, the same height as every other single-line field.
- **No multi-select variant in the standard UI kit.** The standard UI kit also has no chips or tokens that show the chosen values. If the project adds a multi-select variant or chips in Theme Forge, use the project's version. Otherwise, see the open questions.
- **No loading state in the standard UI kit.** If the project adds a loading state in Theme Forge, use the project's state. Otherwise, see the open questions.
- **The standard UI kit defines the closed field only.** The icon size and the gap between the icon and the text cover a leading icon and the trailing indicator. The filtered list, the option rows in the filtered list, and the content shown when no option matches are not in the autocomplete's inventory in the standard UI kit. If the project adds styles for the filtered list in Theme Forge, use the project's styles.
- **Read-only is a separate component.** The read-only field, `read-only-field` in the UI kit, shows text instead of an input.

**Label placement is a variant.** The label sits beside the field or above the field. In the standard UI kit, the variant is `layouts`, with the options `side-by-side` and `stacked`. The label beside the field is the house default. The label above the field is the fallback when the form's container is too narrow for both side by side. The container's width decides, not the viewport's width. See `recursica-skill-forms`.

**Set label placement explicitly on every field.** An adapter's default may put the label above the input at every container width, which breaks the house rule. Set the label beside the input on every field, using the names the code uses for the variant and the option.

The design-system website shows the autocomplete under the component's former name, "Search", with the sections below. The website is the only place these sections appear.

| Section    | Options                  |
| ---------- | ------------------------ |
| `State`    | Default, Focused, Valued |
| `Behavior` | Suggestions (optional)   |

**The website's states are not UI kit variants and must not be set as variants.** The component sets `Focused` and `Valued` by itself, from what the user does. The website's states do show the parts of the autocomplete: a leading icon, and a clear control that appears once the field holds text. The website describes Suggestions as an optional extra, not the default.

## Rules

**The list of options, not the field, decides whether an autocomplete is the right control.** Use a dropdown for a long list when the user recognizes the options on sight. Use an autocomplete for a long list when the user recalls the options from memory. The length of the list alone does not decide. See `recursica-skill-working-memory` on recognition versus recall.

**Never use an autocomplete below the dropdown floor.** A dropdown is wrong for fewer than four options, and an autocomplete is wrong for fewer than four options for the same reason. Show a short list of options on the page instead.

**The value must match an option in the list.** Typed text that matches no option is not a value. Do not quietly accept typed text that matches no option.

**Put the field's rules in the assistive text**: what the field searches, whether partial matches count, and any limits. See `recursica-skill-assistive-element`. Do not put the field's rules in the placeholder. The placeholder disappears on the first keystroke, and the placeholder never holds required information.

**Set a default value only when the default is correct for nearly everyone.** Never pre-fill a value the user would have to think about, look up, or check. A default the user cannot check gets submitted without being checked.

**Label placement is one decision per form, not per field.** This field uses the same label placement as every other field in the form. Apply the container-width test once, to the whole form. The result sets the placement of every field in the form, including short fields that would fit side by side. A form may change placement at a breakpoint, but a form never mixes placements at one breakpoint, and a form section never gets a separate placement. `recursica-skill-forms` sets this rule.

**On error, the error message replaces the assistive text.** The error message is not added to the assistive text. The error message must restate the rule the user broke. The error state must have a signal that is not color, as well as the color change.

**The filtered list must not be cut off by the viewport, or by any scrolling ancestor** (a container further up the page that scrolls). Check the filtered list near the bottom of the page, inside a panel, and inside a modal.

**Never save when the user selects an option in a form that saves every field together.** Across the whole system, either every field saves when the field changes, or every field saves on submit.

**Choosing an autocomplete option may show more fields.** Put the new fields right below the autocomplete, and show the new fields immediately. The form still submits every field together.

**A disabled autocomplete and a read-only field are different components, not two styles of one component.**

- **Disabled autocomplete.** A disabled autocomplete is still a field and still clearly an input, but the user cannot use the field right now. Use a disabled autocomplete when the user could make the field usable by taking a different action first.
- **Read-only field.** A read-only field is a different component, with no input. Use a read-only field when the current user never changes the value here.

**The clear control appears only when the field has a value.** Clearing empties the field and returns the filtered collection to unfiltered. Clearing never empties the text while a filter stays applied.

**An autocomplete that filters a collection, instead of setting a form value, saves nothing.** An autocomplete that filters a collection does not use the form's save mode. See `recursica-skill-forms`.

**The placeholder names what the field searches**, as in "Search invoices". The placeholder tells the user which items the typed text narrows. The placeholder never replaces the label.

**Never make an autocomplete the only way to reach the content the autocomplete searches.** A user who does not know the right word must still be able to reach the content.

## Accessibility

The rules below add to the accessibility baseline in `recursica-skill-system-conventions`, which every Recursica component follows.

The autocomplete component connects the label to the input and provides the focus ring. The autocomplete component also handles filtering the list and selecting an option. The app decides what a screen reader announces during filtering and selecting. Getting the announcements right is the hardest part of any control in the design system. The filtered list changes on every keystroke, and a screen reader user hears none of the changes unless the app announces the changes.

### Screen readers

- **Give the autocomplete a real label.** The label is the accessible name (the name a screen reader reads out for a control). The label must make sense without the text around the field. Never let the placeholder be the accessible name. A screen reader does not announce the placeholder as a label, and the placeholder disappears on the first keystroke.
- **A screen reader must announce the field as a combobox** (a text field paired with a list of options), not as a plain text field. The user has to know that typing shows options, and that the arrow keys move through the options.
- **The code must expose whether the filtered list is expanded or collapsed.** The user must hear that the results opened, and hear that the results closed.
- **The app must announce the number of filtered results after each filter**, politely, without interrupting the typing: "8 results", then "2 results", then "no results". The result count is the requirement missed most often. A sighted user watches the list shrink, and a screen reader user gets no news of the change.
- **Announce "no results" clearly.** A user cannot tell silence after typing apart from a broken field.
- **The active option must be announced as the user moves through the list**, with the option's position in the list and whether the option is selected.
- **Do not announce every keystroke.** Do not announce the list on every typed character when the count has not changed. Too many announcements make the field as unusable as silence does.
- **The selected option must be marked in code, never shown by a highlight or a checkmark alone.** `recursica-skill-system-conventions` sets this rule.
- **The chosen value must be readable in the field after the user selects the value**, and announced as the field's value. Never leave the chosen value only as text drawn on the screen.
- **On error, the error message is the only text announced**, because the error message has replaced the assistive text. The error message must state the rule. "Invalid input" is not an error message.
- **Give the trailing indicator no separate announcement.** The trailing indicator is part of the field, not a second control.
- **The clear control is a real control and needs a separate accessible name.** After clearing, a screen reader must announce that the field is empty and the full list of options is back. The leading icon is decorative and must be silent.

### Keyboard and non-mouse navigation

- **The clear control is a separate tab stop** (a place the Tab key lands). The clear control works with Enter or Space, and never appears only on hover.
- **The field is one tab stop, whether the list is open or closed.** Tab must never step through the results. While the list is open, Tab either closes the list or moves past the whole field.
- **Arrow Down and Arrow Up move the active option.** Enter selects the active option. Escape closes the list without changing the value and returns focus to the input. Focus must never drop to the top of the page or to the `body` element.
- **Home and End move the caret in the input.** Do not change Home and End to jump to the first or last result. The user is in a text field and expects Home and End to move the caret within the typed text.
- **The autocomplete component handles the keys inside the field**, including which key opens the list, wrapping around at the ends of the list, and any inline completion. Do not attach custom key listeners, and do not rebuild the filtering or the movement through the list.
- **Do not move focus into the list.** The input keeps focus and points to the active option. Moving real focus into the list stops the user from typing and from getting back to the input.
- **Do not move focus for the user after a selection.** Do not jump focus to the next field because the field now has a value. Do not jump focus when the filter narrows the list to exactly one result.
- **Every element and action a mouse can reach must also be reachable by keyboard.** Filtering, moving through results, and choosing an option must never depend on a pointer. Nothing the user needs may appear only on hover.

## Styling set by tokens

**Do not set or override the autocomplete properties below.** The autocomplete component sets each property.

- `border-radius`, `height`, `horizontal-padding`, `vertical-padding`, `border-size`.
- `icon-size` and `icon-text-gap`.
- `text` styling, `placeholder-opacity`, and `colors`, per layer (a numbered background level, 0 to 3, that sets the colors of the components on that level) and per state.
- Field width and height. `globals.form.field.size` supplies `min-width`, `max-width`, and `single-line-input-height`. `globals.form.field.size.single-line-input-height` sets the height of every single-line field. `globals.form.field` also supplies `border-radius`, the paddings, and `border-selected`. `globals.form.field.colors.border-selected` sets the focus border.
- The disabled look, from `globals.states.disabled`.
- The gaps between the label and the field, and the spacing between fields, from `globals.form.properties.label-field-gap-horizontal`, `label-field-gap-vertical`, and `vertical-item-gap`.
- The connection between the label and the input, the filtering and matching behavior, hover and active styling, the focus ring, and the keyboard behavior inside the field.

**Never style an unfocused field so that the field looks disabled.** An editable field must look editable when the user is not interacting with the field.

## Related skills

- `recursica-skill-selection-controls` — which control a field gets, option counts, the dropdown affordance test, pre-selection, disabled versus read-only, and when a selection is saved.
- `recursica-skill-forms` — single-column layout, label placement and the container width that switches label placement, one placement per form, required and optional markers, when validation runs, limits on pre-filled values, and the form's save mode.
- `recursica-skill-label` — label text that names the object and makes sense without the text around the label, and the required and optional markers.
- `recursica-skill-assistive-element` — the help text and error text below the field, and why the error text replaces the help text instead of joining the help text.
- `recursica-skill-working-memory` — recognition versus recall, the difference that decides between an autocomplete and a dropdown.
- `recursica-skill-system-conventions` — never showing meaning in only one way.
- `recursica-skill-live-regions` — announcing the result count as the list filters, and when the app must make the announcement.

### Only if used on the same screen

- `recursica-skill-dropdown` — the control an autocomplete replaces, the four-option floor for a dropdown, and the affordance test.
- `recursica-skill-text-field` — the control for free-form values, and the placeholder rules that also apply to an autocomplete.

## Open questions

- **When an autocomplete replaces a dropdown.** `recursica-skill-selection-controls` lists the switch from a dropdown to an autocomplete as an open question. The dropdown guidance says only to consider a typeahead when the list is long and the user knows the values. No count or threshold exists. Ask.
- **Free text.** Whether the user may submit free text that matches no option, and whether the user may create a new option from the typed text.
- **How many characters to type.** How many characters the user must type before results appear, and whether the full list of options shows when the field gets focus with no text typed.
- **Match order.** How the field finds and orders matches: matching the start of the text versus any position in the text, fuzzy matching, and whether the option highlights the matched characters.
- **No results.** What the field shows when no option matches the typed text, and whether the field offers a next step.
- **Loading.** What the field shows while results are loading. The standard UI kit has no loading, pending, or failed-to-load state.
- **Multi-select.** No variant in the standard UI kit supports multi-select, and the standard UI kit has no chips or tokens that show several chosen values.
- **List details.** The height of each option row in the filtered list, hover and active styling, grouping, and the maximum height of the filtered list before the list scrolls.

## Pre-flight checklist

- [ ] The list of options is too long to scan, and the user knows the values well enough to type one value.
- [ ] The list has at least four options, the dropdown floor. A short list of options is shown on the page instead.
- [ ] The submitted value matches an option in the list, and typed text that matches no option is not accepted as a value.
- [ ] The field has a real label that makes sense without the text around the field, and the placeholder is not used as the label.
- [ ] Label placement is side by side, unless the container is too narrow.
- [ ] Label placement matches every other field in the same form, with one placement per form at each breakpoint and no mixing between fields or form sections.
- [ ] No required information is in the placeholder. The field's rules are in the assistive text.
- [ ] Any default is correct for nearly everyone.
- [ ] On error, an error message that restates the rule replaces the assistive text, with a signal that is not color.
- [ ] The filtered list is not cut off by the viewport, a panel, a modal, or any scrolling ancestor.
- [ ] A screen reader announces the expanded state, the filtered result count after each change, "no results", the active option, and the chosen value. Nothing is announced too much.
- [ ] The field is one tab stop. The arrow keys move the active option, Enter selects, and Escape closes the list and returns focus to the input.
- [ ] Home and End still move the caret in the input.
- [ ] The autocomplete's built-in key handling and filtering are unchanged, and real focus never moves into the list.
- [ ] Focus is never moved for the user, including when the filter narrows the list to one result.
- [ ] Nothing the user needs requires hover or a pointer. The focus ring is intact, and looks different from the active option style and the selected option style.
- [ ] Disabled is used only for fields that are unavailable for now. Values that can never be edited use the read-only field.
- [ ] Every variant, size, and state is one the project's UI kit lists. Every property the component sets comes from the component. Every field without focus looks editable, not disabled.
- [ ] The field saves with the form, in the same save mode as every other field in the system.
- [ ] Open questions were asked about, not decided: the replacement threshold, free text, how many characters to type, match order, no results, loading, multi-select, and list details.
