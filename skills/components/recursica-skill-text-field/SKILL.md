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

## Use it when

- **The value is unpredictable** — names, addresses, descriptions, references. No set list of options could cover them.
- **Typing is faster than choosing** — the user knows the value well, and can type it faster than pick it from a control.
- **The content is short, and fits on one line.**

## Do not use it when

Each case below has its own component. Use that component instead of adapting a text field:

| Instead of a text field                                                            | Use                                                                                       |
| ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| The value comes from a known set of options                                        | A dropdown, a radio group, or an autocomplete — see `recursica-skill-selection-controls`  |
| The answer is yes or no                                                            | A switch or a checkbox                                                                    |
| The content runs to several lines                                                  | `recursica-skill-textarea`                                                                |
| The value is a quantity the user types — a count, an amount, a rate, a measurement | `recursica-skill-number-input`. Free-form entry is wrong for a value used in calculations |
| This user can never edit the value                                                 | The read-only field component — shows text, with no input                                 |

**Never use a disabled text field to show a value.** A value nobody can ever edit here does not belong in a form control.

## What exists

Taken from the UI kit (the token file, `recursica_ui-kit.json`, that says which variants and states each component has) → `ui-kit.components.text-field`. **Pass only the variants and states listed here.** Other design systems have field sizes, fluid styles, and warning, success, and loading states. This component has none of them.

**The third column is the React prop that sets each axis.** An axis (a property a component varies on, such as size or style; Figma calls it a variant property) is named in the UI kit. Its name is not a prop, and React ignores it without an error if it is passed as one. A blank cell means no single prop sets that axis — it is set by CSS state or by separate props, and the rules below say which.

| Axis      | Options                   | React prop   |
| --------- | ------------------------- | ------------ |
| `layouts` | `stacked`, `side-by-side` | `formLayout` |
| `states`  | `error`, `disabled`       |              |

**`layouts` is the label-placement axis, set by the `formLayout` prop.** `side-by-side` — the label beside the field — is the house default. `stacked` is the fallback when the container is too narrow to fit both. What decides this is the container's width, not the viewport's. See `recursica-skill-forms`.

**`formLayout` defaults to `stacked`, which puts the label above the input.** A field without the prop shows its label above the input at any container width, which breaks the house rule. `layouts` is the UI kit's name for this variant, not a prop: React ignores `layouts="side-by-side"` without an error and leaves the label above the input. Set `formLayout="side-by-side"` on every field to put the label beside the input.

**Focus and placeholder are not variants.** The component handles them: `placeholder-opacity` here, and the focused border through `globals.form.field.colors.border-selected`. Do not build them as states.

**There is no size axis.** `min-height` is a fixed property, and `globals.form.field.size.single-line-input-height` sets the height for every single-line field.

**Read-only is a separate component** — `read-only-field`, which has the same `layouts` axis and shows text instead of an input.

## Rules for using it

**Always pass a visible label.** Name the object clearly in the label. A screen reader user hears the label on its own, without the context around it. Write it in sentence case with no colon at the end, and keep it short enough to fit on one line.

**Never put required information in the placeholder.** It disappears on the first keystroke. Use the placeholder only to show the format of the expected value.

**Put the field's rule in assistive text** — formats, character requirements, minimums — so the user sees the rule before entering a value that breaks it.

**Label placement is one decision per form, not per field.** This field's `layouts` value is not a separate choice — it matches every other field in the same form. The container-width test is applied once, to the whole form, and its answer governs every field in it, including short ones that would have fitted side by side. A whole form may switch placement between breakpoints, but it never mixes the two at one breakpoint, and a section never gets its own placement. Owned by `recursica-skill-forms`.

**On error, replace the assistive text with the error message, instead of adding the message to it.** Replacing the text keeps the field's height the same, and the form below does not move. The error message must restate the rule that was broken. "Invalid input" is not an error message.

**Show the error state with an icon or the message text, as well as color.** `recursica-skill-system-conventions` requires this.

**Prefixes and suffixes go inside the field** — not in the label, and not joined onto the value. A currency symbol goes before an amount. A unit or an email domain goes after the value. Prefixes and suffixes are called affixes: text attached to the start or end of a field.

**Disabled and read-only are different components, not two styles of one.**

- **Disabled text field** — a field that still looks like an input, but the user cannot use it at the moment. Use it when the user can make it usable by doing something else first. A disabled field cannot be edited, but it is not a read-only field.
- **Read-only field** — a separate component. It shows a label and text, with no input. Use it when this user never edits this value here.

Never use a disabled text field to show a value.

**If values often overflow the field, use a textarea or a detail view instead.** A value that overflows scrolls horizontally past the right edge, and the user cannot read a long entry in full.

**Some values change format when the field has focus.** A date shows in a readable format when the field does not have focus, and switches to a masked number format (a pattern that guides what the user types) while the field has focus. See `recursica-skill-dates-and-currency`.

## Accessibility

This component also follows the accessibility baseline in `recursica-skill-system-conventions`. Only what is specific to it is listed here.

The component connects the label to the input, provides the focus ring, and handles the keys inside the field. The application provides everything listed below. These are the parts most often missed.

### Screen readers

- **Pass a real label.** Never let placeholder text be the accessible name (the name a screen reader reads out for a control) — it is not announced as a label, and it disappears when the user types. A field with no label has no accessible name.
- **The error message must be the text the screen reader announces.** The error replaces the assistive text, and a screen reader reads only the error. The message must state the rule, not "Invalid input".
- **Give every clickable icon inside the field an accessible name** — a clear control, a calendar trigger. Hide decorative icons from screen readers, so they are never announced as unlabeled graphics.
- **If a prefix or suffix changes what the value means** — a currency symbol, a unit — state that meaning in the label or the assistive text. A visual affix on its own may not be announced with the value.
- **When a value's format changes on focus**, state the expected format in the assistive text. The mask is visual only, and a screen reader does not announce it.

### Keyboard and non-mouse navigation

- **Never remove the field from the tab order**, and never make reaching it depend on a pointer.
- **The tab order follows the visual order.** The single-column form rule in `recursica-skill-forms` keeps the two orders the same. Change the on-screen order and the DOM order (the order in the page's code) together.
- **Every control inside the field is its own tab stop** (a place the Tab key lands), and responds to Enter or Space as well as to clicks.
- **Do not move focus for the user.** Do not jump to the next field when a value looks complete, and do not move focus on a keystroke. Either jump sends a keyboard or screen reader user's next keystrokes into a different field partway through typing.

## Set by the component

Do not set or override any of these. The component sets them:

- `min-height`, `horizontal-padding`, `vertical-padding`, `border-size`, `border-radius`, and every gap.
- Field width — `globals.form.field.size` sets `min-width` and `max-width`.
- `icon-size` and `icon-text-gap`.
- Text styling, and `placeholder-opacity`.
- Per-layer colors, the focused border, hover, and active styling.
- The label-to-input association and keyboard behavior inside the field.

Never style an unfocused field to look disabled. An editable field must look editable when it does not have focus.

## Load these too

- `recursica-skill-forms` — label placement and alignment, one placement per form, single-column layout, required vs. optional marking, validation timing, error presentation, save mode, and the rule that no form control goes inside a card.
- `recursica-skill-selection-controls` — when a predefined-option control replaces free-form entry, and disabled vs. read-only.
- `recursica-skill-dates-and-currency` — date, time, currency, and numeric formatting inside the field.
- `recursica-skill-system-conventions` — never carry meaning in a single channel.
- `recursica-skill-label` — label copy that names the object and stands alone, and the required and optional markers.
- `recursica-skill-assistive-element` — the help and error text below the field, and why the error replaces rather than joins it.

## Uncovered — ask, do not invent

- **Character or word counters.** Whether the field supports one, and what happens at the limit.
- **A clear or reset control inside the field.**
- **Password fields.** `recursica-skill-forms` forbids a toggle to show the password, but whether a password variant exists here is not stated.

## Pre-flight checklist

- [ ] The value cannot come from a set list of options.
- [ ] A visible label is passed, and it makes sense on its own.
- [ ] Label placement is side by side, unless the container is too narrow.
- [ ] `formLayout` is passed explicitly — `side-by-side`, unless the form's container is too narrow — and matches every other field in the same form. There is one placement per form at any given breakpoint, with no mixing between fields or sections. A missing prop means `stacked`, not the house rule, and `layouts` is not the prop name.
- [ ] Placeholder text holds no required information.
- [ ] Assistive text states the rule. On error, it is replaced by a message that restates that rule.
- [ ] The error state shows an icon or the message text, as well as color.
- [ ] Every clickable icon inside the field has an accessible name, and decorative icons are hidden from screen readers.
- [ ] Only variants and states listed under What exists are passed, and no size is passed.
- [ ] Styling comes from the component, and every unfocused field looks editable.
- [ ] Values nobody can edit use the read-only component, multi-line text uses a textarea, and quantities use a number input.
- [ ] Uncovered items were asked about, not decided: character or word counters, a clear or reset control inside the field, and password fields.
