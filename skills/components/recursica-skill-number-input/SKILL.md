---
name: recursica-skill-number-input
description: How to use the Recursica number input correctly — when a value is a quantity and when it is a digit string or a slider instead, which states and layouts exist, right alignment and fixed precision, units and currency symbols as in-field affixes, stating minimums and maximums up front, and the screen-reader and keyboard requirements for a numeric field and any in-field controls. Use whenever adding, reviewing, or refactoring a numeric field, a quantity, or an amount. Trigger on "number input", "numeric field", "quantity", "amount", "decimal", "min", "max", "stepper", "increment", "currency field", "screen reader", "tab order", or a request to let a user enter a number. Do NOT use for free-form text — that is recursica-skill-text-field. Do NOT use for the formatting rules themselves — that is recursica-skill-dates-and-currency. Do NOT use for form layout, validation timing, or save behavior — that is recursica-skill-forms.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Number input

A number input captures a quantity the user types.

## Use it when

- **The value is a quantity** — a count, an amount, a rate, a measurement. Something you could do arithmetic on.
- **The range is open or wide enough that a list would be wrong**, and the user knows the number they want.
- **Precision matters.** The user needs the exact value, not an approximate one.

## Do not use it when

Each of these has a different component. Switch to it rather than adapting a number input:

| Instead of a number input                         | Use                                                                                     |
| ------------------------------------------------- | --------------------------------------------------------------------------------------- |
| The number comes from a small predefined set      | A radio group or a dropdown — see `recursica-skill-selection-controls`                  |
| The exact value is arbitrary across a large range | `recursica-skill-slider` — the user is choosing a position, not entering a number       |
| The digits are an identifier, not a quantity      | `recursica-skill-text-field`. Phone numbers, zips, account and card numbers are strings |
| The value is a length of time                     | One field per unit, formatted `3h 20m` — see `recursica-skill-dates-and-currency`       |
| The value is a date or a time                     | `recursica-skill-date-picker` or `recursica-skill-time-picker`                          |
| The value is never editable here                  | `recursica-skill-read-only-field` — renders label and text, no input                    |

**A leading zero, a fixed digit count, or a check digit means it is not a number.** Anything where `007` and `7` differ is a text field.

**A disabled number input is not a way to display a value.** If nobody can ever edit it here, it is not a form control.

## What exists

Taken from `recursica_ui-kit.json` → `ui-kit.components.number-input`. **Do not pass a variant or state that is not listed here** — other design systems have sizes, warning and success states, and content variants that this component does not.

| Axis      | Options                   |
| --------- | ------------------------- |
| `layouts` | `stacked`, `side-by-side` |
| `states`  | `error`, `disabled`       |

**`layouts` is the label placement axis.** `side-by-side` — label beside the field — is the house default; `stacked` is the fallback when the container is too narrow to fit both. The trigger is container width, not viewport. See `recursica-skill-forms`.

**Focus and placeholder are not variants.** The component handles them: `placeholder-opacity` here, and the focused border via `globals.form.field.colors.border-selected`. Do not build them as states.

**There is no size axis.** `min-height` is a fixed property, and `globals.form.field.size` supplies the field sizing.

**The kit defines no stepper or increment control.** There are no tokens for increment and decrement buttons, no `collapsed` or `expanded` state, and no content axis. **Do not claim increment buttons exist, and do not build them out of buttons placed beside the field** — see the uncovered list.

**There is no read-only state.** Read-only is a separate component — `read-only-field`, with the same `layouts` axis and no input.

## Rules for using it

**Always pass a visible label.** Name the object and, where the unit is not obvious from the object, name the unit too — "Weight (kg)", not "Weight". A screen reader user hears the label alone.

**Label placement is one decision per form, not per field.** This field's `layouts` value is not an independent choice — it matches every other field in the same form. The container-width test is applied once, to the form as a whole, and its answer governs every field in it, including short ones like this that would have fitted side by side. A whole form may switch placement between breakpoints, but never mixes the two at one breakpoint, and a section never gets its own placement. Owned by `recursica-skill-forms`.

**Right-align the value.** Every numeric value is right-aligned, currency or not, so that alignment is uniform. The only override is an explicit human instruction.

**Hold one precision.** Currency always shows two decimals — `0.00`, `0.01`, `0.99`. Any set of numeric values shown together holds the same precision: `4.5` and `7.0`, never `4.5` and `7`. Fixed precision is what makes right alignment work.

**Alignment must not vary between read-only and editable values on the same screen.** Left-aligning a read-only value beside a right-aligned editable one reads as two different systems.

**A currency symbol or a unit is an in-field affix, not part of the label copy and not concatenated into the value.** The symbol leads, the unit trails. Where several amounts sit in a column, the symbol belongs in the column header instead — see `recursica-skill-dates-and-currency`.

**State the minimum, the maximum, and the step in help text**, before the user can break the rule. Prevention beats validation.

**Zero is a value; empty is not zero.** Do not pre-fill `0` to avoid an empty field — a submitted zero is a claim.

**Do not pre-fill a number the user would have to reason about, look up, or verify.** An unverifiable default gets submitted unchecked, which is worse than an empty field.

**On error, replace the help text; do not add to it.** Swapping keeps the field height stable so the form below does not shift. The message must restate the rule: "Invalid number" is not an error message; "Enter a whole number between 1 and 99" is.

**Pair the error state with a non-color indicator** — an icon or the message itself. Required by `recursica-skill-system-conventions`.

**Never silently correct or clamp what the user typed.** Rewriting a value on blur destroys their input without telling them; show the error and let them fix it.

**Disabled and read-only are different components, not two styles of one.**

- **Disabled number input** — still a field, still visibly an input, not currently operable. Use it when the user could make it operable by doing something else first.
- **Read-only field** — a different component. Label and text, no input. Use it when this user never edits this value here.

## Accessibility

The component wires the label to the input and provides the focus ring. The unit, the limits, and any in-field control are yours.

### Screen readers

- **Pass a real label.** Never let placeholder text be the accessible name — it is not announced as a label, and it disappears on input. A field with no label has no accessible name.
- **Pass help text and error text through the component**, never as a loose element rendered beside the field. Only the component can associate them with the input, and unassociated text is invisible to a user who tabs straight into the field.
- **Convey required state programmatically, not with an asterisk alone.** The asterisk is a visual convention, not an accessible name for "required".
- **State the unit in text** — in the label or the help text. A visual prefix or suffix may not be announced with the value, and a currency symbol sitting in a column header is not associated with the field at all. "1000" announced with no unit is not an answer.
- **State the expected format, the minimum, and the maximum in the help text.** Thousands separators, decimal places, and whether negatives are allowed have to be in words; a mask or a right-aligned two-decimal display communicates nothing to a screen reader.
- **Name every interactive in-field icon** — a clear control, a stepper button if one is ever added. Decorative icons must be silent, never announced as unlabeled graphics.
- **Expose the current value and its limits programmatically** where the field constrains a range, so a screen reader user is not guessing at the ceiling.
- **The error message is the announced text.** Because it replaces the help text, it is the only thing that will be read — so it has to carry the rule and the limits.

### Keyboard and non-mouse navigation

- **Never remove the field from the tab order**, and never make reaching it depend on a pointer.
- **Tab order follows visual order.** The single-column form rule in `recursica-skill-forms` is what keeps this true.
- **Typing is always a complete path to the value.** If any adjustment control exists, it is an accelerator — a user must be able to reach the value by typing alone, and never have to press a button forty times.
- **Every in-field control is its own tab stop** and operable with Enter or Space, not a click-only handler.
- **Do not move focus for the user.** No auto-advancing when the value reaches its digit count, and no focus jump on keystroke — both strand a user mid-entry.
- **Never let a scroll wheel or a stray arrow key change a committed value** while the field has focus but the user is reading, and never trap arrow keys that the user needs to move the caret.
- **A disabled field is skipped by tab**, so anything conveyed only by the disabled state is unreachable. Put the reason in text.
- **Nothing needed to complete the field may appear only on hover** — not the limits, not the unit, not an adjustment control.
- **Never suppress the focus ring**, and never rely on the caret alone to show where focus is.

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

- [`recursica-skill-dates-and-currency`](../../design-rules/recursica-skill-dates-and-currency/SKILL.md) — right alignment, two-decimal currency, precision consistency, the symbol in the column header, accounting parentheses, ranges, rounding, and abbreviation.
- [`recursica-skill-forms`](../../design-rules/recursica-skill-forms/SKILL.md) — label placement and one placement per form, validation timing, pre-fill and defaults, save mode, and the rule that no form control goes inside a card.
- [`recursica-skill-label`](../recursica-skill-label/SKILL.md) — the label component, its placement axis, and required vs. optional marking.
- [`recursica-skill-assistive-element`](../recursica-skill-assistive-element/SKILL.md) — the help and error text below the field, and why the error replaces the help.
- [`recursica-skill-slider`](../recursica-skill-slider/SKILL.md) — the control for an approximate value across a range.
- [`recursica-skill-text-field`](../recursica-skill-text-field/SKILL.md) — the control for digit strings that are not quantities.
- [`recursica-skill-system-conventions`](../../design-rules/recursica-skill-system-conventions/SKILL.md) — never carry meaning in a single channel.

## Uncovered — ask, do not invent

- **Increment and decrement controls are documented outside the token inventory, with no token behind them.** The kit defines no stepper tokens at all — no increment button, no decrement button, no step. **Increment controls must not be built out of buttons placed beside the field**, and nothing in this system promises a stepper. Whether this component ever gets one, and what its step would be, must be settled by a human. Do not rely on this without asking.
- **A `collapsed` and an `expanded` state are documented outside the token inventory.** Neither is an axis in the kit. They appear to describe stepper visibility; do not implement either, and do not rely on them without asking.
- **A content axis** — `unvalued`, `unvalued with placeholder`, `valued` — **is documented outside the token inventory, with no token behind it.** Not an axis in the kit, and nothing states whether a placeholder is wanted on a numeric field at all. Do not rely on it without asking.
- **Whether the field masks or formats as the user types** — thousands separators appearing during entry, or only on blur.
- **Negative values.** Whether accounting parentheses from `recursica-skill-dates-and-currency` are ever used inside an input, or only in display.
- **Unit selection.** A value with a switchable unit — kg or lb — has no stated pattern.

## Pre-flight checklist

- [ ] The value is a quantity, not an identifier, a duration, or a position on a range.
- [ ] A visible label is passed, names the object, and names the unit where it is not obvious.
- [ ] Label placement is side-by-side unless the container is too narrow.
- [ ] `layouts` matches every other field in the same form — one placement per form at any given breakpoint, with no mixing between fields or sections.
- [ ] The value is right-aligned, and alignment matches the read-only values on the same screen.
- [ ] Precision is fixed and identical across every value shown together; currency carries two decimals.
- [ ] Any currency symbol or unit is an in-field affix, and its meaning is also in the label or help text.
- [ ] The minimum, maximum, step, and expected format are stated in help text.
- [ ] No `0` was pre-filled to avoid an empty field, and no high-comprehension default was pre-filled.
- [ ] Help and error text are passed through the component; the error replaces the help and restates the rule with its limits.
- [ ] The error state carries a non-color indicator, and no value is silently clamped or rewritten.
- [ ] Required state is conveyed programmatically, not by an asterisk alone.
- [ ] Every interactive in-field icon has an accessible name; decorative icons are silent.
- [ ] Typing alone reaches any valid value; any adjustment control is an accelerator with its own tab stop.
- [ ] The field is in the tab order, tab order matches visual order, and focus is never moved for the user.
- [ ] Arrow keys and the scroll wheel do not change the value unexpectedly.
- [ ] A disabled field's reason is in text; nothing needed requires hover; the focus ring is intact.
- [ ] No variant, size, or state outside the inventory above was passed, and no stepper was invented.
- [ ] No component-owned styling was overridden, and no unfocused field reads as disabled.
- [ ] Non-editable numbers use the read-only component, not a disabled input.
- [ ] Nothing in the uncovered list was invented.
