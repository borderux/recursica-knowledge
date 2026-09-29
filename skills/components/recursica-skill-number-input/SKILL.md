---
name: recursica-skill-number-input
description: How to use the Recursica number input correctly — when a value is a quantity and when it is a digit string or a slider instead, which states and layouts exist, right alignment and fixed precision, units and currency symbols as in-field affixes, stating minimums and maximums up front, and the screen-reader and keyboard requirements for a numeric field and any in-field controls. Use whenever adding, reviewing, or refactoring a numeric field, a quantity, or an amount. Trigger on "number input", "numeric field", "quantity", "amount", "decimal", "min", "max", "stepper", "increment", "currency field", "screen reader", "tab order", or a request to let a user enter a number. Do NOT use for free-form text — that is recursica-skill-text-field. Do NOT use for the formatting rules themselves — that is recursica-skill-dates-and-currency. Do NOT use for form layout, validation timing, or save behavior — that is recursica-skill-forms.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Number input

A number input records a quantity that the user types.

## Use it when

- **The value is a quantity** — a count, an amount, a rate, a measurement. Something you could do math on.
- **The range is open, or wide enough that a list would be wrong**, and the user knows the number they want.
- **Precision matters.** The user needs the exact value, not a rough one.

## Do not use it when

Each of these has a different component. Switch to it, instead of adapting a number input:

| Instead of a number input                            | Use                                                                                     |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------- |
| The number comes from a small, set list              | A radio group or a dropdown — see `recursica-skill-selection-controls`                  |
| The exact value does not matter across a large range | `recursica-skill-slider` — the user is choosing a position, not entering a number       |
| The digits are an identifier, not a quantity         | `recursica-skill-text-field`. Phone numbers, zips, account and card numbers are strings |
| The value is a length of time                        | One field per unit, formatted `3h 20m` — see `recursica-skill-dates-and-currency`       |
| The value is a date or a time                        | `recursica-skill-date-picker` or `recursica-skill-time-picker`                          |
| The value can never be edited here                   | `recursica-skill-read-only-field` — shows the label and text, with no input             |

**A leading zero, a fixed number of digits, or a check digit means it is not a number.** Anything where `007` and `7` are different is a text field.

**A disabled number input is not a way to show a value.** If nobody can ever edit it here, it is not a form control.

## What exists

Taken from `recursica_ui-kit.json` → `ui-kit.components.number-input`. **Do not pass a variant or state that is not listed here** — other design systems have sizes, warning and success states, and content variants that this component does not.

**The third column is the React prop that sets each axis.** The axis name comes from the token inventory. It is not a prop, and if you pass it as one, React quietly ignores it. A blank cell means no single prop sets that axis — it is set by CSS state or by separate props, and the rules below say which.

| Axis      | Options                   | React prop   |
| --------- | ------------------------- | ------------ |
| `layouts` | `stacked`, `side-by-side` | `formLayout` |
| `states`  | `error`, `disabled`       |              |

**`layouts` is the label-placement axis, set by the `formLayout` prop.** `side-by-side` — the label beside the field — is the house default. `stacked` is the fallback when the container is too narrow to fit both. What decides this is the container's width, not the viewport's (the visible area of the browser window). See `recursica-skill-forms`.

**`formLayout` defaults to `stacked`, so the house rule is the one thing you must pass.** Leave it out, and you get the fallback in a container of any width — the rule turned upside down. `layouts` is the name of the token axis, not a prop: `layouts="side-by-side"` is quietly ignored by React and leaves the control stacked, with no error. Pass `formLayout="side-by-side"` explicitly, on every field.

**Focus and placeholder are not variants.** The component handles them: `placeholder-opacity` here, and the focused border through `globals.form.field.colors.border-selected`. Do not build them as states.

**There is no size axis.** `min-height` is a fixed property, and `globals.form.field.size` supplies the field sizing.

**The kit defines no stepper or increment control.** There are no tokens for increase and decrease buttons, no `collapsed` or `expanded` state, and no content axis. **Do not claim that increment buttons exist, and do not build them out of buttons placed beside the field** — see the uncovered list.

**There is no read-only state.** Read-only is a separate component — `read-only-field`, with the same `layouts` axis and no input.

## Rules for using it

**Always pass a visible label.** Name the object — and, where the unit is not obvious from the object, name the unit too: "Weight (kg)", not "Weight". A screen reader user hears the label on its own.

**Label placement is one decision per form, not per field.** This field's `layouts` value is not a separate choice — it matches every other field in the same form. The container-width test is applied once, to the whole form, and its answer governs every field in it, including short ones like this one that would have fitted side by side. A whole form may switch placement between breakpoints (the screen widths at which the layout changes), but it never mixes the two at one breakpoint, and a section never gets its own placement. Owned by `recursica-skill-forms`.

**Right-align the value.** Every number is right-aligned, currency or not, so the alignment is uniform. The only exception is an explicit instruction from a person.

**Keep one precision.** Currency always shows two decimal places — `0.00`, `0.01`, `0.99`. Any set of numbers shown together keeps the same precision: `4.5` and `7.0`, never `4.5` and `7`. Fixed precision is what makes right alignment work.

**Alignment must not vary between read-only and editable values on the same screen.** Left-aligning a read-only value next to a right-aligned editable one looks like two different systems.

**A currency symbol or a unit is an affix (text attached to the start or end of the field) — not part of the label wording, and not joined onto the value.** The symbol goes first, and the unit goes last. Where several amounts sit in a column, the symbol belongs in the column header instead — see `recursica-skill-dates-and-currency`.

**State the minimum, the maximum, and the step in help text**, before the user can break the rule. Preventing an error beats catching it.

**Zero is a value; empty is not zero.** Do not pre-fill `0` to avoid an empty field — a submitted zero is a claim.

**Do not pre-fill a number the user would have to think about, look up, or check.** A default the user cannot check gets submitted without being checked, which is worse than an empty field.

**On error, replace the help text; do not add to it.** Swapping keeps the field's height the same, so the form below does not shift. The message must restate the rule: "Invalid number" is not an error message; "Enter a whole number between 1 and 99" is.

**Pair the error state with a signal that is not color** — an icon, or the message itself. Required by `recursica-skill-system-conventions`.

**Never quietly correct what the user typed, or force it into the allowed range.** Rewriting a value when the field loses focus destroys their input without telling them. Show the error, and let them fix it.

**Disabled and read-only are different components, not two styles of one.**

- **Disabled number input** — still a field, still clearly an input, but not usable right now. Use it when the user could make it usable by doing something else first.
- **Read-only field** — a different component. A label and text, with no input. Use it when this user never edits this value here.

## Accessibility

This component also follows the accessibility baseline in `recursica-skill-system-conventions`. Only what is specific to it is listed here.

The component connects the label to the input, and provides the focus ring (the outline that shows which element has keyboard focus). The unit, the limits, and any control inside the field are up to you.

### Screen readers

- **Pass a real label.** Never let placeholder text be the accessible name (the name a screen reader reads out for a control) — it is not announced as a label, and it disappears when the user types. A field with no label has no accessible name.
- **State the unit in text** — in the label, or in the help text. A visual prefix or suffix may not be announced with the value, and a currency symbol sitting in a column header is not connected to the field at all. "1000" announced with no unit is not an answer.
- **State the expected format, the minimum, and the maximum in the help text.** Thousands separators, decimal places, and whether negative numbers are allowed have to be put in words. A mask, or a right-aligned display with two decimals, tells a screen reader nothing.
- **Name every icon inside the field that can be used** — a clear control, or a stepper button if one is ever added. Decorative icons must be silent, and never announced as unlabeled graphics.
- **Make the current value and its limits available in code** where the field limits the range, so a screen reader user is not guessing at the maximum.
- **The error message is the text that gets announced.** Because it replaces the help text, it is the only thing that will be read — so it has to state the rule and the limits.

### Keyboard and non-mouse navigation

- **Never remove the field from the tab order**, and never make reaching it depend on a pointer.
- **Typing is always enough to reach the value.** If any adjustment control exists, it is only a shortcut. A user must be able to reach the value by typing alone, and never have to press a button forty times.
- **Every control inside the field is its own tab stop** (a place the Tab key lands), and works with Enter or Space — not with a handler that only responds to clicks.
- **Do not move focus for the user.** No jumping ahead when the value reaches its number of digits, and no focus jump on a keystroke — both strand a user partway through typing.
- **Never let a scroll wheel or a stray arrow key change a saved value** while the field has focus but the user is only reading, and never trap arrow keys that the user needs to move the caret (the text cursor).
- **Nothing needed to complete the field may appear only on hover** — not the limits, not the unit, and not an adjustment control.

## Not your decision

Do not implement, override, or tune any of these — the component owns them:

- `border-radius`, `min-height`, `horizontal-padding`, `vertical-padding`, `border-size`.
- Field width and sizing from `globals.form.field.size`.
- `icon-size` and `icon-text-gap`.
- `text` styling and `placeholder-opacity`.
- `colors` per layer, including the focused border from `globals.form.field.colors.border-selected` and the global disabled treatment from `globals.states.disabled`.
- The label-field gaps and `vertical-item-gap` from `globals.form.properties`.
- The label-to-input association and key handling inside the field.

Never style an unfocused number input so it reads as disabled. An editable field must look editable at rest.

## Load these too

- `recursica-skill-dates-and-currency` — right alignment, two-decimal currency, precision consistency, the symbol in the column header, accounting parentheses, ranges, rounding, and abbreviation.
- `recursica-skill-forms` — label placement and one placement per form, validation timing, pre-fill and defaults, save mode, and the rule that no form control goes inside a card.
- `recursica-skill-label` — the label component, its placement axis, and required vs. optional marking.
- `recursica-skill-assistive-element` — the help and error text below the field, and why the error replaces the help.
- `recursica-skill-system-conventions` — never carry meaning in a single channel.

### Only if the screen also uses it

- `recursica-skill-slider` — the control for an approximate value across a range.
- `recursica-skill-text-field` — the control for digit strings that are not quantities.

## Uncovered — ask, do not invent

- **Increase and decrease controls are documented outside the token inventory, with no token behind them.** The kit defines no stepper tokens at all — no increase button, no decrease button, no step. **Increment controls must not be built out of buttons placed beside the field**, and nothing in this system promises a stepper. Whether this component ever gets one, and what its step would be, must be settled by a person. Do not rely on this without asking.
- **A `collapsed` and an `expanded` state are documented outside the token inventory.** Neither is an axis in the kit. They seem to describe whether a stepper is visible. Do not build either one, and do not rely on them without asking.
- **A content axis** — `unvalued`, `unvalued with placeholder`, `valued` — **is documented outside the token inventory, with no token behind it.** It is not an axis in the kit, and nothing says whether a placeholder is wanted on a number field at all. Do not rely on it without asking.
- **Whether the field formats the value as the user types** — thousands separators appearing while typing, or only when the field loses focus.
- **Negative values.** Whether the accounting parentheses from `recursica-skill-dates-and-currency` are ever used inside an input, or only when showing a value.
- **Choosing the unit.** A value whose unit can be switched — kg or lb — has no stated pattern.

## Pre-flight checklist

- [ ] The value is a quantity — not an identifier, a length of time, or a position on a range.
- [ ] A visible label is passed. It names the object, and names the unit where that is not obvious.
- [ ] Label placement is side by side, unless the container is too narrow.
- [ ] `formLayout` is passed explicitly — `side-by-side`, unless the form's container is too narrow — and matches every other field in the same form. There is one placement per form at any given breakpoint, with no mixing between fields or sections. A missing prop means `stacked`, not the house rule, and `layouts` is not the prop name.
- [ ] The value is right-aligned, and the alignment matches the read-only values on the same screen.
- [ ] Precision is fixed, and the same across every value shown together. Currency has two decimal places.
- [ ] Any currency symbol or unit is an affix, and its meaning is also in the label or the help text.
- [ ] The minimum, maximum, step, and expected format are stated in help text.
- [ ] You did not pre-fill `0` to avoid an empty field, and pre-filled no default the user would have to understand to check.
- [ ] Help and error text are passed through the component. The error replaces the help text, and restates the rule and its limits.
- [ ] The error state has a signal that is not color, and no value is quietly forced into range or rewritten.
- [ ] Every icon inside the field that can be used has an accessible name, and decorative icons are silent.
- [ ] Typing alone reaches any valid value. Any adjustment control is only a shortcut, with its own tab stop.
- [ ] The arrow keys and the scroll wheel do not change the value unexpectedly.
- [ ] You passed no variant, size, or state outside the inventory above, and invented no stepper.
- [ ] You overrode no styling that the component owns, and no field without focus looks disabled.
- [ ] Numbers that are not editable here use the read-only component, not a disabled input.
- [ ] You invented nothing from the uncovered list.
