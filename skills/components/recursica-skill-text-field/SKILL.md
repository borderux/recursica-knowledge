---
name: recursica-skill-text-field
description: Rules for the Recursica text field — when free text is right, states and label placement, labels, placeholders, and help text, error copy, prefixes and suffixes, and disabled versus read-only. Use for any single-line text input. Not for multi-line text — see recursica-skill-textarea; not for quantities — see recursica-skill-number-input.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Text field

A text field records free-form text on a single line.

## When to use a text field

- **The value is unpredictable**, such as a name, an address, a description or a reference. No fixed list of options could cover every value.
- **Typing is faster than choosing.** The user knows the value well, and can type the value faster than pick the value from a list or another control.
- **The text is short and fits on one line.**

## When not to use a text field

Use the component in the right column instead of adapting a text field.

| Situation                                                                          | Use instead                                                                               |
| ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| The value comes from a known list of options                                       | A dropdown, a radio group, or an autocomplete. See `recursica-skill-selection-controls`.  |
| The answer is yes or no                                                            | A switch or a checkbox                                                                    |
| The content runs to several lines                                                  | `recursica-skill-textarea`                                                                |
| The value is a quantity the user types — a count, an amount, a rate, a measurement | `recursica-skill-number-input`. Free-form entry is wrong for a value used in calculations |
| The current user can never edit the value                                          | A read-only field, a separate component that shows text with no input                     |

**Never use a disabled text field to show a value.** A value does not belong in a form control when nobody can ever edit the value where the value is shown.

## Variants

**Use only the text field variants, options and states that the Recursica MCP server lists for the project.** A designer can add variants and options in Theme Forge, so each project can differ. Get the list with the server's `recursica_get_component_doc` tool, and use the names the code uses. The code can use a different name from the name in Figma and the UI kit. A wrong name in code has no effect and shows no error. Never invent a variant or an option.

The rules below describe each option by role, such as "the label beside the field". The names in the standard UI kit (the unchanged UI kit in the official Recursica release) are examples only.

- **A text field has an error state and a disabled state.** The standard UI kit calls the two states `error` and `disabled`.
- **Read-only is a separate component, the read-only field.** The standard UI kit calls the read-only field `read-only-field`. A read-only field has the same label-placement variant as a text field, and shows text instead of an input.

**Label placement is a variant.** A field's label sits beside the field or above the field. In the standard UI kit, the variant is `layouts`, with the options `side-by-side` and `stacked`. The label beside the field is the house default. The label above the field is the fallback when the form's container is too narrow for both side by side. The container's width decides, not the viewport's width. See `recursica-skill-forms`.

**Set label placement explicitly on every field.** The house rule puts the label beside the input. The code library under an adapter may put the label above the input by default, at every container width. Set the label beside the input on every field, using the names the code uses for the variant and the option.

**Never build a focus state or a placeholder state.** Every Recursica field already shows the focus border and the placeholder text.

## Rules

**Always give the text field a visible label.** In the label, name exactly what the field holds. A screen reader user hears the label without the context around the field. Write the label in sentence case, with no colon at the end. Keep the label short enough to fit on one line.

**Never put required information in the placeholder.** The placeholder disappears when the user types the first character. Use the placeholder only to show the format of the expected value.

**Put the rule for the field's value in the assistive text** (the help text below the field). The rule can be a format, a character requirement or a minimum. The user then sees the rule before entering a value that breaks the rule.

**Label placement is one decision per form, not per field.** This field uses the same label placement as every other field in the form. Apply the container-width test once, to the whole form. The result sets the placement of every field in the form, including short fields that would fit side by side. A form may change placement at a breakpoint, but a form never mixes placements at one breakpoint, and a form section never gets a separate placement. `recursica-skill-forms` sets this rule.

**On error, replace the assistive text with the error message.** Do not add the error message to the assistive text. Replacing the assistive text keeps the field the same height, and the form below the field does not move. The error message must restate the rule that the value broke. "Invalid input" is not an error message.

**Show the error state with an icon or the message text, as well as color.** `recursica-skill-system-conventions` requires more than color to show an error.

**Put a prefix or a suffix inside the field, not in the label and not joined to the value.** A prefix or a suffix is text fixed to the start or the end of the field. A currency symbol goes before an amount. A unit or an email domain goes after the value.

**A disabled text field and a read-only field are different components, not two styles of one component.**

- **A disabled text field** still looks like an input, but the user cannot use the field at the moment. Use a disabled text field when the user can make the field usable by first taking another action. A disabled field cannot be edited, but a disabled field is not a read-only field.
- **A read-only field** is a separate component. A read-only field shows a label and text, with no input. Use a read-only field when the current user never edits the value where the value is shown.

Never use a disabled text field to show a value.

**When values are often longer than the field, use a textarea or a detail view instead.** A value longer than the field scrolls sideways, past the right edge of the field. The user cannot read a long value in full.

**Some values, such as a date, change format when the field has focus.** When the field does not have focus, a date shows in a readable format. While the field has focus, the date switches to a masked number format (a pattern that guides what the user types). See `recursica-skill-dates-and-currency`.

## Accessibility

The rules below add to the accessibility baseline in `recursica-skill-system-conventions`, which every Recursica component follows.

A text field connects the label to the input, shows the focus ring and responds to keys pressed inside the field. The app must add the behavior in the two lists below. Apps most often miss the behavior in the two lists.

### Screen readers

- **Give the text field a real label.** Never let the placeholder text be the accessible name (the name a screen reader reads out for a control). A screen reader does not announce placeholder text as a label, and the placeholder text disappears when the user types. A field with no label has no accessible name.
- **The error message must be the text a screen reader announces.** The error message replaces the assistive text, and a screen reader reads only the error message. The error message must state the rule, not "Invalid input".
- **Give every clickable icon inside the field an accessible name**, such as the icon that clears the field or the icon that opens a calendar. Hide every decorative icon from screen readers. A screen reader then never announces a decorative icon as an unlabeled graphic.
- **When a prefix or a suffix changes what the value means, such as a currency symbol or a unit, state the meaning in the label or the assistive text.** A screen reader may not announce a visual prefix or suffix with the value.
- **When a value's format changes on focus**, state the expected format in the assistive text. The masked format is visual only, and a screen reader does not announce the masked format.

### Keyboard and non-mouse navigation

- **Never remove the field from the tab order.** Never make a pointer the only way to reach the field.
- **The tab order follows the visual order.** The single-column form rule in `recursica-skill-forms` keeps the two orders the same. Change the on-screen order and the DOM order (the order in the page's code) together.
- **Every control inside the field is a separate tab stop** (a place the Tab key lands). Every control inside the field responds to Enter or Space as well as to clicks.
- **Do not move focus for the user.** Do not move focus to the next field when a value looks complete. Do not move focus on a keystroke. A jump in focus sends the next keystrokes of a keyboard or screen reader user into a different field partway through typing.

## Styling set by tokens

**Never set or override the text field's styling.** The theme sets every visual property of the text field, such as size, spacing, borders, colors and animation. Do not add extra containers or spacers to change the text field's look. If the design needs a look the theme does not give, report the missing look as a gap in the design system. See `recursica-skill-design-router`.

Every single-line field has the same fixed height.

A text field connects the label to the input and sets how keys work inside the field. Never set or override how the label connects to the input or how keys work inside the field.

**Never style an unfocused field to look disabled.** An editable field must look editable when the field does not have focus.

## Related skills

- `recursica-skill-forms` — label placement and alignment, one placement per form, single-column layout, required versus optional marking, validation timing, error presentation, save mode, and the rule that no form control goes inside a card.
- `recursica-skill-selection-controls` — when a control with fixed options replaces free-form entry, and disabled versus read-only.
- `recursica-skill-dates-and-currency` — date, time, currency, and numeric formatting inside the field.
- `recursica-skill-system-conventions` — never show meaning in only one way.
- `recursica-skill-label` — label copy that names the object and makes sense without the context around the field, and the required and optional markers.
- `recursica-skill-assistive-element` — the help text and error text below the field, and why the error message replaces the help text instead of joining the help text.

## Open questions

- **Character or word counters.** No rule says whether the text field supports a character or word counter, or what happens when the user reaches the limit. Ask only when the project has no counter option.
- **A clear or reset control inside the field.** No rule says whether the text field has a control that clears or resets the value. Ask only when the project has no clear or reset option.
- **Password fields.** `recursica-skill-forms` allows a toggle that shows the password. No rule says whether a password variant of the text field exists. Ask only when the project has no password variant.

## Pre-flight checklist

- [ ] The value cannot come from a fixed list of options.
- [ ] The text field has a visible label, and the label makes sense without the context around the field.
- [ ] Label placement is side by side, unless the form's container is too narrow.
- [ ] Label placement is set explicitly to the side-by-side option, unless the form's container is too narrow, and matches every other field in the same form. There is one placement per form at each breakpoint, with no mixing between fields or form sections. A field with no label placement set shows the label above the field, not the house default. The setting uses the name the code uses, not the UI kit name `layouts`.
- [ ] The placeholder text holds no required information.
- [ ] The assistive text states the field's rule. On error, an error message that restates the rule replaces the assistive text.
- [ ] The error state shows an icon or the message text, as well as color.
- [ ] Every clickable icon inside the field has an accessible name, and every decorative icon is hidden from screen readers.
- [ ] Every label placement, state and size is one the project's UI kit lists, and no variant or option is invented. No size is set unless the project's UI kit lists a size variant.
- [ ] No styling is set or overridden on the text field, and no container or spacer is added to change the text field's look.
- [ ] Every unfocused field looks editable.
- [ ] A value nobody can edit uses the read-only field, multi-line text uses a textarea, and a quantity uses a number input.
- [ ] Open questions were asked about, not decided: character or word counters, a clear or reset control inside the field, and password fields.
