---
name: recursica-skill-number-input
description: Rules for the Recursica number input — quantity versus digit string, right alignment and fixed precision, units and currency as affixes, stating limits up front, and numeric-field accessibility. Use for quantities and amounts. Not for free text — see recursica-skill-text-field; formatting rules live in recursica-skill-dates-and-currency.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Number input

A number input records a quantity that the persona types.

## When to use a number input

- **Use a number input when the value is a quantity.** A count, an amount, a rate and a measurement are quantities. Adding, subtracting, or averaging the value makes sense.
- **Use a number input when the persona knows the number, and the range is open-ended or too wide to list.**
- **Use a number input when precision matters.** The persona needs the exact value, not a rough value.

## When not to use a number input

**In each situation below, use the component in the right column.** Do not change a number input to fit the situation.

| Situation                                            | Use instead                                                                                                                       |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| The number comes from a short, fixed list of options | A radio group or a dropdown. See `recursica-skill-selection-controls`.                                                            |
| The exact value does not matter across a large range | A slider. The persona chooses a position on the range, not a number. See `recursica-skill-slider`.                                |
| The digits are an identifier, not a quantity         | A text field. Phone numbers, ZIP codes, account numbers and card numbers are text, not numbers. See `recursica-skill-text-field`. |
| The value is a length of time                        | One field for each unit of time, formatted as `3h 20m`. See `recursica-skill-dates-and-currency`.                                 |
| The value is a date or a time                        | A date picker or a time picker. See `recursica-skill-date-picker` or `recursica-skill-time-picker`.                               |
| Nobody can ever edit the value here                  | A read-only field, which shows the label and the text with no input. See `recursica-skill-read-only-field`.                       |

**A value with a leading zero, a fixed number of digits, or a check digit is not a number.** Use a text field for every value where `007` and `7` are different values.

**Do not use a disabled number input to show a value.** When nobody can ever edit the value here, the value does not belong in a form control.

## Variants

**Use only the number input variants and options that the Recursica MCP server lists for the project.** A designer can add variants and options in Theme Forge, so each project can differ. Get the list with the server's `recursica_get_component_doc` tool, and use the names the code uses. Look up the name of each variant in code with the same tool before using the variant. The code can use a different name from the name in Figma and the UI kit. A wrong name in code has no effect and shows no error. Never invent a variant or an option.

The rules below describe each option by role, such as "the error state". The names in the standard UI kit (the unchanged UI kit in the official Recursica release) are examples only.

- **The number input has an error state and a disabled state.** The standard UI kit calls the state variant `states`, with the two options `error` and `disabled`.
- **If the project has a size variant, use the size variant.**
- **If the project has a stepper, use the project's stepper.** If the project has a collapsed or expanded state, use the project's state. If the project has a content variant, use the project's content variant. If the project has none of the three, do not state that the number input has increase and decrease buttons. Do not build increase and decrease buttons from buttons placed beside the field. See the open questions.
- **A read-only field is a separate component, not a state of the number input.** A read-only field shows a label and text, with no input. The standard UI kit calls the read-only field `read-only-field`. A read-only field has the same label-placement variant as the number input.

**Label placement is a variant.** A field's label sits beside the field or above the field. In the standard UI kit, the variant is `layouts`, with the options `side-by-side` and `stacked`. The label beside the field is the house default. The label above the field is the fallback when the form's container is too narrow for both side by side. The container's width decides, not the viewport's width. See `recursica-skill-forms`.

**Set label placement explicitly on every field.** The house rule puts the label beside the input. The code library under an adapter may put the label above the input by default, at every container width. Set the label beside the input on every field. Use the names the code uses for the variant and the option.

**Never build a focus state or a placeholder state.** Every Recursica field already shows the focus border and the placeholder text.

## Rules

**Always give the number input a visible label.** The label names the object. When the object does not make the unit obvious, the label also names the unit: "Weight (kg)", not "Weight". A persona using a screen reader hears the label without the text around the field.

**Label placement is one decision per form, not per field.** This field uses the same label placement as every other field in the form. Apply the container-width test once, to the whole form. The result sets the placement of every field in the form. Short fields like this one that would fit side by side follow the result too. A form may change placement at a breakpoint. A form never mixes placements at one breakpoint. A form section never gets a separate placement. `recursica-skill-forms` sets this rule.

**Right-align the value.** Right-align every number, currency or not. Every number then lines up the same way. Use a different alignment only when the user explicitly asks for a different alignment.

**Keep the number of decimal places fixed.** Currency always shows two decimal places, as in `0.00`, `0.01`, and `0.99`. Numbers shown together keep the same number of decimal places: `4.5` and `7.0`, never `4.5` and `7`. With a fixed number of decimal places, the decimal points of right-aligned numbers line up.

**Read-only values and editable values on the same screen must use the same alignment.** A left-aligned read-only value next to a right-aligned editable value looks like the two values come from two different systems.

**A currency symbol or a unit is an affix (text attached to the start or end of the field).** The currency symbol or unit is not part of the label wording, and is not joined onto the value. Put the currency symbol before the value, and the unit after the value. If several amounts appear in one column, put the currency symbol in the column header instead. See `recursica-skill-dates-and-currency`.

**State the minimum, the maximum, and the step between allowed values in the help text below the field.** Show the limits before the persona can type a value that breaks the limits. Preventing an error is better than catching the error.

**Zero is a value, and an empty field is not zero.** Do not pre-fill `0` to avoid an empty field. A submitted zero states that the value is zero.

**Do not pre-fill a number the persona would have to think about, look up, or check.** A pre-filled number that the persona cannot check gets submitted without a check. A pre-filled number that nobody checked is worse than an empty field.

**On error, the error message replaces the help text.** Do not add the error message to the help text. Replacing the help text keeps the field the same height, and the form below the field does not move. The error message must restate the rule. "Invalid number" is not an error message. "Enter a whole number between 1 and 99" is an error message.

**Pair the error state with a signal that is not color**, either an icon or the error message. `recursica-skill-system-conventions` requires a signal that is not color.

**Never quietly correct the value the persona typed, or force the typed value into the allowed range.** Rewriting a value when the field loses focus destroys the persona's input without telling the persona. Show the error, and let the persona fix the value.

**A disabled number input and a read-only field are different components, not two styles of one component.**

- **Use a disabled number input when the persona could make the field usable by taking a different action first.** A disabled number input is still a field and still clearly an input. The persona cannot use the disabled field right now.
- **Use a read-only field when the persona viewing the field never edits the value here.** A read-only field is a different component, with a label and text and no input.

## Accessibility

The rules below add to the accessibility baseline in `recursica-skill-system-conventions`, which every Recursica component follows.

The number input component connects the label to the input and shows the focus ring. The application provides the unit, the limits, and every control inside the field.

### Screen readers

- **Give the field a real label.** Never let the placeholder text be the accessible name (the name a screen reader reads out for a control). A screen reader does not announce placeholder text as a label, and the placeholder text disappears when the persona types. A field with no label has no accessible name.
- **State the unit in text**, in the label or in the help text. A screen reader may not announce an affix with the value. A currency symbol in a column header is not connected to the field at all. A persona who hears "1000" with no unit does not know what the number means.
- **State the expected format, the minimum, and the maximum in the help text.** Describe in words the thousands separators, the decimal places, and whether negative numbers are allowed. A mask (a pattern that guides what the persona types) tells a screen reader nothing. Right alignment with two decimal places also tells a screen reader nothing.
- **Give an accessible name to every icon inside the field that the persona can use.** Examples are a clear control, and a stepper button if the project ever adds a stepper. Hide every decorative icon from screen readers. A screen reader must never announce a decorative icon as an unlabeled graphic.
- **If the field limits the range, give assistive technology the current value, the minimum, and the maximum.** A persona using a screen reader then knows the maximum.
- **A screen reader announces the error message.** The error message replaces the help text, and a screen reader reads only the error message. The error message must state the rule and the limits.

### Keyboard and non-mouse navigation

- **Never remove the field from the tab order.** Never make a pointer the only way to reach the field.
- **Typing is always enough to enter the value.** Any adjustment control, such as a stepper button, is only a shortcut. A persona must be able to enter the value by typing alone. A persona never has to press a button forty times.
- **Every control inside the field is a separate tab stop** (a place the Tab key lands). Every control inside the field works with Enter or Space, not only with a mouse click.
- **Do not move focus for the persona.** Do not jump focus ahead when the value reaches a set number of digits. Do not jump focus on any keystroke. A focus jump sends the persona's next keystrokes to a different field.
- **Never let either action below change a saved value while the field has focus and the persona is only reading:**

  - a scroll wheel
  - an accidental arrow key press

  Never take over the arrow keys that the persona needs to move the caret.

- **Keep every part the persona needs to complete the field visible without hover.** The parts include the limits, the unit, and any adjustment control.

## Styling set by tokens

**Never set or override the number input's styling.** The theme sets every visual property of the number input, such as size, spacing, borders, colors and animation. Do not add extra containers or spacers to change the number input's look. If the theme does not give a look the design needs, report the missing look as a design-system gap. See `recursica-skill-design-router`.

The number input component connects the label to the input and sets what each key does inside the field. Never set or override the link between the label and the input, or what each key does.

**Never style a number input without focus to look disabled.** An editable number input must look editable when the persona is not using the number input.

## Related skills

- `recursica-skill-dates-and-currency` — the number-formatting rules:
  - right alignment
  - two decimal places for currency
  - the same precision across values
  - the currency symbol in the column header
  - accounting parentheses
  - ranges
  - rounding
  - abbreviation
- `recursica-skill-forms` — the form rules:
  - label placement and one placement per form
  - when validation runs
  - pre-filled values and defaults
  - the form's save mode
  - the rule that no form control goes inside a card
- `recursica-skill-label` — the label component, the label-placement variant, and required and optional markers.
- `recursica-skill-assistive-element` — the help text and error text below the field, and why the error text replaces the help text.
- `recursica-skill-system-conventions` — never showing meaning in only one way.

### Only if used on the same screen

- `recursica-skill-slider` — the control for an approximate value across a range.
- `recursica-skill-text-field` — the control for digits that are not quantities.

## Open questions

- **Increase and decrease controls.** Only the design-system website shows increase and decrease controls. The user must decide whether the number input ever gets a stepper, and what the stepper's step would be. Do not rely on a stepper without confirming with the user. Confirm with the user only when the project has no stepper.
- **Collapsed and expanded states.** Only the design-system website shows a `collapsed` state and an `expanded` state. The two states seem to describe whether a stepper is visible. Do not build either state, and do not rely on either state without confirming with the user. Confirm with the user only when the project has no collapsed and expanded states.
- **A content variant.** Only the design-system website shows a content variant, with the options `unvalued`, `unvalued with placeholder`, and `valued`. No rule says whether a number input should show a placeholder at all. Do not rely on the content variant without confirming with the user. Confirm with the user only when the project has no content variant.
- **Formatting while the persona types.** No rule says whether the field formats the value while the persona types, or only when the field loses focus. Adding thousands separators is one example of formatting.
- **Negative values.** No rule says whether a number input ever uses the accounting parentheses from `recursica-skill-dates-and-currency`. The other choice is to use the parentheses only for a value shown outside an input.
- **Choosing the unit.** No pattern exists for a value whose unit the persona can switch, such as kg or lb.

## Pre-flight checklist

- [ ] The value is a quantity, not an identifier, a length of time, or a position on a range.
- [ ] The field has a visible label. The label names the object, and names the unit when the object does not make the unit obvious.
- [ ] Label placement is side by side, unless the container is too narrow.
- [ ] Label placement is set explicitly on every field, to side by side unless the form's container is too narrow. The setting uses the names the code uses, not `layouts`. A field with no setting gets the label above the field (`stacked`), not the house rule.
- [ ] Label placement matches every other field in the same form. Each form has one placement at each breakpoint, with no mixing between fields or form sections.
- [ ] The value is right-aligned, and the alignment matches the read-only values on the same screen.
- [ ] Precision is fixed, and the same across every value shown together. Currency has two decimal places.
- [ ] Any currency symbol or unit is an affix. The label or the help text also states the currency or the unit.
- [ ] The help text states the minimum, the maximum, the step, and the expected format.
- [ ] The field is not pre-filled with `0` to avoid an empty field. The field holds no default the persona would have to understand to check.
- [ ] Help text and error text are set through the number input component. The error text replaces the help text, and restates the rule and the limits.
- [ ] The error state has a signal that is not color, and no value is quietly forced into range or rewritten.
- [ ] Every icon inside the field that the persona can use has an accessible name. Every decorative icon is hidden from screen readers.
- [ ] Typing alone can enter any valid value. Any adjustment control is only a shortcut, and is a separate tab stop.
- [ ] The arrow keys and the scroll wheel do not change the value unexpectedly.
- [ ] Every variant, size, and state is one the Recursica MCP server lists for the project. No variant or option is invented. No stepper is built unless the Recursica MCP server lists a stepper for the project.
- [ ] No styling is set or overridden on the number input. No container or spacer is added to change the number input's look.
- [ ] A number input without focus looks editable.
- [ ] Numbers that are not editable here use the read-only field, not a disabled number input.
- [ ] Open questions were asked about, not decided: increase and decrease controls, the `collapsed` and `expanded` states, a content variant, formatting as the persona types, negative values, and choosing the unit.
