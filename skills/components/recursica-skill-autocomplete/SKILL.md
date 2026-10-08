---
name: recursica-skill-autocomplete
description: Rules for the Recursica autocomplete, a text field that filters a long list of options the persona knows well — a value that must match an option, placeholder rules, a filtered list that is never cut off, and combobox accessibility, including result counts. Use for typeahead fields and fields that search as the persona types. Not for short lists of options — see recursica-skill-dropdown. Not for free text — see recursica-skill-text-field.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Autocomplete

An autocomplete is a text field whose value comes from a defined list of options. The persona types to filter the list of options, then picks from the filtered list.

## When to use an autocomplete

- **The list of options is too long to scan comfortably in a dropdown.** Opening a dropdown and reading down the whole list is worse than typing.
- **The persona knows the options well** and can start typing a value the persona already has in mind. Typing relies on recall (remembering the answer). When the persona needs to recognize the answer among the options shown, the persona needs a control that shows the options instead.
- **The value must still come from the list of options.** The typed text filters the list. The typed text is not a free-text entry.

## When not to use an autocomplete

| Situation                                                                     | Use instead                                                                                                                          |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| The list of options is short enough to show all at once                       | Radio buttons, or checkboxes when the persona picks zero to many. See `recursica-skill-radio-button` and `recursica-skill-checkbox`. |
| The list of options is long, but the persona does not know the values well    | A dropdown, so the persona can read the options instead of recalling the options. See `recursica-skill-dropdown`.                    |
| The value is unpredictable free-form text                                     | A text field. See `recursica-skill-text-field`.                                                                                      |
| The list of options holds actions, not values                                 | A menu. See `recursica-skill-menu`.                                                                                                  |
| The value has two options, and each option is the known opposite of the other | A switch. See `recursica-skill-switch`.                                                                                              |
| The persona viewing the field can never edit the value                        | A read-only field, which shows the label and the text with no input. See `recursica-skill-read-only-field`.                          |

**Do not use a disabled autocomplete to show a value.** When nobody can ever change the value where the value is shown, a disabled autocomplete is not a form control.

## Variants

**Use only the autocomplete variants and options that the Recursica MCP server lists for the project.** A designer can add variants and options in Theme Forge, so each project can differ. Get the list with the server's `recursica_get_component_doc` tool. The same tool gives the name the code uses for each variant. The name in code can differ from the name in Figma and the UI kit. Use the names in code for every variant and option. A wrong name in code has no effect and shows no error. Never invent a variant or an option.

The rules below describe each option by role, such as "the error state". The names in the standard UI kit (the unchanged UI kit in the official Recursica release) are examples only.

- **The autocomplete has an error state and a disabled state.** In the standard UI kit, the state variant is `states`, with the two options `error` and `disabled`.
- **The placeholder is not a variant.**
- **Never build a focus state.** The autocomplete already shows the focus border.
- **Size.** If the project has a size variant, use the project's size variant. Otherwise, the autocomplete has a fixed height, the same height as every other single-line field.
- **Multi-select.** If the project has a multi-select variant, or chips that show the chosen values, use the project's version. Otherwise, see the open questions.
- **Loading.** If the project has a loading state, use the project's loading state. Otherwise, see the open questions.
- **Icons.** A trailing indicator is the icon at the end of the field.
- **Filtered list.** If the project has styles for the filtered list, use the project's styles.
- **Read-only is a separate component.** The read-only field, `read-only-field` in the UI kit, shows text instead of an input.

**Label placement is a variant.** A field's label sits beside the field or above the field. In the standard UI kit, the variant is `layouts`, with the options `side-by-side` and `stacked`. The label beside the field is the house default. The label above the field is the fallback when the form's container is too narrow for both side by side. The container's width decides, not the viewport's width. See `recursica-skill-forms`.

**Set label placement explicitly on every field.** The house rule puts the label beside the input. The code library under an adapter may put the label above the input by default, at every container width. Set the label beside the input on every field, using the names the code uses for the variant and the option.

The design-system website shows the autocomplete under the component's former name, "Search", with the two sections below. The `State` and `Behavior` sections appear only on the website.

| Section    | Options                  |
| ---------- | ------------------------ |
| `State`    | Default, Focused, Valued |
| `Behavior` | Suggestions (optional)   |

**The website's states are not UI kit variants and must not be set as variants.** The autocomplete shows the `Focused` and `Valued` looks automatically, in response to what the persona does. The website's states do show parts of the autocomplete: a leading icon, and a clear control that appears once the field holds text. The website describes Suggestions as an optional extra, not the default.

## Rules

**The list of options, not the field, decides whether an autocomplete is the right control.** Use a dropdown for a long list when the persona recognizes the options on sight. Use an autocomplete for a long list when the persona recalls the options from memory. The length of the list alone does not decide. See `recursica-skill-working-memory` on recognition versus recall.

**Never use an autocomplete for fewer than four options, the dropdown floor.** A dropdown is wrong for fewer than four options, and an autocomplete is wrong for fewer than four options for the same reason. Show a short list of options on the page instead.

**The value must match an option in the list.** Typed text that matches no option is not a value. Do not quietly accept typed text that matches no option.

**Put the field's rules in the assistive text**: what the field searches, whether partial matches count, and any limits. See `recursica-skill-assistive-element`. Do not put the field's rules in the placeholder. The placeholder disappears on the first keystroke, and the placeholder never holds required information.

**Set a default value only when the default is correct for nearly everyone.** Never pre-fill a value the persona would have to think about, look up, or check. A default the persona cannot check gets submitted without being checked.

**Label placement is one decision per form, not per field.** This field uses the same label placement as every other field in the form. Apply the container-width test once, to the whole form. The result sets the placement of every field in the form, including short fields that would fit side by side. A form may change placement at a breakpoint, but a form never mixes placements at one breakpoint, and a form section never gets a separate placement. `recursica-skill-forms` sets this rule.

**On error, the error message replaces the assistive text.** The error message is not added to the assistive text. The error message must restate the rule the persona broke. The error state must show a signal other than color, in addition to the color change.

**The filtered list must not be cut off by the viewport, or by any scrolling ancestor** (a container further up the page that scrolls). Check the filtered list near the bottom of the page, inside a panel, and inside a modal.

**Never save when the persona selects an option in a form that saves every field together.** Across the whole system, either every field saves when the field changes, or every field saves on submit.

**Choosing an autocomplete option may show more fields.** Put the new fields right below the autocomplete, and show the new fields immediately. The form still submits every field together.

**A disabled autocomplete and a read-only field are different components, not two styles of one component.**

- **Disabled autocomplete.** A disabled autocomplete is still a field and still clearly an input, but the persona cannot use the field right now. Use a disabled autocomplete when the persona could make the field usable by taking a different action first.
- **Read-only field.** A read-only field is a different component, with no input. Use a read-only field when the persona viewing the field never changes the value where the value is shown.

**An autocomplete that filters a collection of items, instead of setting a form value, saves nothing.** An autocomplete that filters a collection of items does not use the form's save mode. See `recursica-skill-forms`.

**The clear control appears only when the field has a value.** Clearing empties the field and removes the filter from the collection, so the collection shows every item again. Clearing never empties the text while a filter stays applied.

**The placeholder names what the field searches**, as in "Search invoices". The placeholder tells the persona which items the typed text narrows. The placeholder never replaces the label.

**Never make an autocomplete the only way to reach the content the autocomplete searches.** A persona who does not know the right word must still be able to reach the content.

## Accessibility

The rules below add to the accessibility baseline in `recursica-skill-system-conventions`, which every Recursica component follows.

The autocomplete already links the label to the input and shows the focus ring. The autocomplete also filters the list and selects the option the persona picks. The app decides what a screen reader announces during filtering and selecting. Getting the announcements right is the hardest part of any control in the design system. The filtered list changes on every keystroke, and a persona using a screen reader hears none of the changes unless the app announces the changes.

### Screen readers

- **Give the autocomplete a real label.** The label is the accessible name (the name a screen reader reads out for a control). The label must make sense without the text around the field. Never let the placeholder be the accessible name. A screen reader does not announce the placeholder as a label, and the placeholder disappears on the first keystroke.
- **A screen reader must announce the field as a combobox** (a text field paired with a list of options), not as a plain text field. The persona has to know that typing shows options, and that the arrow keys move through the options.
- **The code must tell assistive technology whether the filtered list is expanded or collapsed.** The persona must hear that the results opened, and hear that the results closed.
- **The app must announce the number of filtered results after each filter**, politely, without interrupting the typing: "8 results", then "2 results", then "no results". The result count is the requirement missed most often. A sighted persona watches the list shrink. A persona using a screen reader hears nothing about the change.
- **Announce "no results" clearly.** A persona cannot tell silence after typing apart from a broken field.
- **The active option (the option the arrow keys point to) must be announced as the persona moves through the list**, with the option's position in the list and whether the option is selected.
- **Do not announce every keystroke.** Do not announce the list on every typed character when the count has not changed. Too many announcements make the field as unusable as silence does.
- **The selected option must be marked in code, never shown by a highlight or a checkmark alone.** `recursica-skill-system-conventions` sets this rule.
- **The chosen value must be readable in the field after the persona selects the value**, and announced as the field's value. Never show the chosen value only as visible text that is not the field's value.
- **On error, the error message is the only text announced**, because the error message has replaced the assistive text. The error message must state the rule. "Invalid input" is not an error message.
- **Give the trailing indicator no separate announcement.** The trailing indicator is part of the field, not a second control.
- **The clear control is a real control and needs a separate accessible name.** After clearing, a screen reader must announce that the field is empty and that the full list of options shows again. The leading icon is decorative and must be silent.

### Keyboard and non-mouse navigation

- **The clear control is a separate tab stop** (a place the Tab key lands). The clear control works with Enter or Space, and never appears only on hover.
- **The field is one tab stop, whether the list is open or closed.** Tab must never step through the results. While the list is open, Tab either closes the list or moves past the whole field.
- **Arrow Down and Arrow Up move the active option.** Enter selects the active option. Escape closes the list without changing the value and returns focus to the input. Focus must never drop to the top of the page or to the `body` element.
- **Home and End move the caret in the input.** Do not change Home and End to jump to the first or last result. The persona is in a text field and expects Home and End to move the caret within the typed text.
- **The autocomplete responds to the keys inside the field automatically**, including which key opens the list, wrapping around at the ends of the list, and any inline completion (the field fills in the remaining letters of a matching option as the persona types). Do not add custom code that listens for key presses, and do not rebuild the filtering or the movement through the list.
- **Do not move focus into the list.** The input keeps focus and points to the active option. Moving real focus into the list stops the persona from typing and from getting back to the input.
- **Do not move focus for the persona after a selection.** Do not jump focus to the next field because the field now has a value. Do not jump focus when the filter narrows the list to exactly one result.
- **Every element and action a mouse can reach must also be reachable by keyboard.** Filtering, moving through results, and choosing an option must never depend on a pointer. Nothing the persona needs may appear only on hover.

## Styling set by tokens

**Never set or override the autocomplete's styling.** The theme sets every visual property of the autocomplete, such as size, spacing, borders, colors and animation. Do not add extra containers or spacers to change the autocomplete's look. If the design needs a look the theme does not give, raise the gap. See `recursica-skill-design-router`.

**Do not set or override the autocomplete's built-in behavior**: the connection between the label and the input, the filtering and matching, and the keyboard behavior inside the field. Do not change the space between the label and the field, or the space between fields.

**Never style an unfocused field so that the field looks disabled.** An editable field must look editable when the persona is not interacting with the field.

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

- **When an autocomplete replaces a dropdown.** `recursica-skill-selection-controls` lists the switch from a dropdown to an autocomplete as an open question. The dropdown guidance says only to consider a typeahead when the list is long and the persona knows the values. No count or threshold exists. Ask.
- **Free text.** May the persona submit free text that matches no option? May the persona create a new option from the typed text?
- **How many characters to type.** How many characters must the persona type before results appear? Does the full list of options show when the field gets focus with no text typed?
- **Match order.** How does the field find and order matches? The question covers matching the start of the text versus any position in the text, fuzzy matching, and whether the option highlights the matched characters.
- **No results.** What does the field show when no option matches the typed text? Does the field offer a next step?
- **Loading.** What does the field show while results are loading? If the project has a loading, pending, or failed-to-load state, use that state. Otherwise, ask.
- **Multi-select.** If the project has a multi-select variant, or chips that show the chosen values, use the project's version. Otherwise, ask.
- **List details.** Are the options in the filtered list grouped, and how?

## Pre-flight checklist

- [ ] The list of options is too long to scan, and the persona knows the values well enough to type one value.
- [ ] The list has at least four options, the dropdown floor. A short list of options is shown on the page instead.
- [ ] The submitted value matches an option in the list, and typed text that matches no option is not accepted as a value.
- [ ] The field has a real label that makes sense without the text around the field, and the placeholder is not used as the label.
- [ ] Label placement is side by side, unless the container is too narrow.
- [ ] Label placement matches every other field in the same form, with one placement per form at each breakpoint and no mixing between fields or form sections.
- [ ] No required information is in the placeholder. The field's rules are in the assistive text.
- [ ] Any default is correct for nearly everyone.
- [ ] On error, an error message that restates the rule replaces the assistive text, with a signal that is not color.
- [ ] The filtered list is not cut off by the viewport, a panel, a modal, or any scrolling ancestor.
- [ ] A screen reader announces the expanded state, the filtered result count after each change, "no results", the active option, and the chosen value. The screen reader gets no more announcements than the persona needs.
- [ ] The field is one tab stop. The arrow keys move the active option, Enter selects, and Escape closes the list and returns focus to the input.
- [ ] Home and End still move the caret in the input.
- [ ] The autocomplete's built-in key handling and filtering are unchanged, and real focus never moves into the list.
- [ ] Focus is never moved for the persona, including when the filter narrows the list to one result.
- [ ] Nothing the persona needs requires hover or a pointer. The focus ring is intact, and looks different from the active option style and the selected option style.
- [ ] Disabled is used only for fields that are unavailable for now. Values that can never be edited use the read-only field.
- [ ] Every variant, size, and state is one the project's UI kit lists. The built-in connection between the label and the input is unchanged. The space between the label and the field, and the space between fields, are unchanged. Every field without focus looks editable, not disabled.
- [ ] No styling is set or overridden on the autocomplete, and no container or spacer is added to change the autocomplete's look.
- [ ] The field saves with the form, in the same save mode as every other field in the system.
- [ ] Open questions were asked about, not decided: the replacement threshold, free text, how many characters to type, match order, no results, loading, multi-select, and list details.
