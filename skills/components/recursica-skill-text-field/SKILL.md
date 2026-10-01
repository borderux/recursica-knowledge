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

- **The value is unpredictable** — names, addresses, descriptions, references. Anything a set list could not cover.
- **Typing beats choosing** — data the user knows well and can type faster than they could pick it from a control.
- **The content is short, and fits on one line.**

## Do not use it when

Each of these has a different component. Switch to it, instead of adapting a text field:

| Instead of a text field                                                            | Use                                                                                       |
| ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| The value comes from a known set of options                                        | A dropdown, a radio group, or an autocomplete — see `recursica-skill-selection-controls`  |
| The answer is yes or no                                                            | A switch or a checkbox                                                                    |
| The content runs to several lines                                                  | `recursica-skill-textarea`                                                                |
| The value is a quantity the user types — a count, an amount, a rate, a measurement | `recursica-skill-number-input`. Free-form entry is wrong for something you can do math on |
| This user can never edit the value                                                 | The read-only field component — shows text, with no input                                 |

**A disabled text field is not a way to show a value.** If nobody can ever edit it here, it is not a form control.

## What exists

Taken from the UI kit (the token file, `recursica_ui-kit.json`, that says which variants and states each component has) → `ui-kit.components.text-field`. **Do not pass a variant or state that is not listed here** — other design systems have field sizes, fluid styles, and warning, success, and loading states that this component does not.

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

**Always pass a visible label.** Name the object clearly; a screen reader user hears the label on its own, without the context around it. Use sentence capitalization, no colon at the end, and keep it short enough not to wrap.

**Never put required information in the placeholder.** It disappears on the first keystroke. Use it only to show the form of the value you expect.

**Put the field's rule in assistive text** — formats, character requirements, minimums — so the user has it before they get it wrong.

**Label placement is one decision per form, not per field.** This field's `layouts` value is not a separate choice — it matches every other field in the same form. The container-width test is applied once, to the whole form, and its answer governs every field in it, including short ones that would have fitted side by side. A whole form may switch placement between breakpoints, but it never mixes the two at one breakpoint, and a section never gets its own placement. Owned by `recursica-skill-forms`.

**On error, replace the assistive text; do not add to it.** Swapping keeps the field's height the same, so the form below does not shift. The error message must restate the rule that was broken: "Invalid input" is not an error message.

**Pair the error state with a signal that is not color** — an icon, or the message itself. Required by `recursica-skill-system-conventions`.

**Prefixes and suffixes go inside the field** — not in the label, and not joined onto the value. A currency symbol goes before an amount; a unit or an email domain goes after it. These are called affixes: text attached to the start or end of a field.

**Disabled and read-only are different components, not two styles of one.**

- **Disabled text field** — still a field, still clearly an input, just not usable right now. Use it when the user could make it usable by doing something else first. A disabled field cannot be edited, but that is not the same as read-only.
- **Read-only field** — a different component entirely. It shows no input: a label and text only. Use it when this user never edits this value here.

Never reach for a disabled text field as a way to show a value.

**A field that often overflows is the wrong component.** The value scrolls sideways past the right edge, which makes long entries unreadable. Move to a textarea or a detail view.

**Some values change format when the field has focus.** A date is readable at rest, and switches to a masked number format (a pattern that guides what the user types) while the field has focus. See `recursica-skill-dates-and-currency`.

## Accessibility

This component also follows the accessibility baseline in `recursica-skill-system-conventions`. Only what is specific to it is listed here.

The component connects the label to the input, provides the focus ring, and handles the keys inside the field. Everything below is up to you to get right — and it is the part most often missed.

### Screen readers

- **Pass a real label.** Never let placeholder text be the accessible name (the name a screen reader reads out for a control) — it is not announced as a label, and it disappears when the user types. A field with no label has no accessible name.
- **The error message must be the text that gets announced.** Because the error replaces the assistive text instead of adding to it, the message is the only thing that will be read — so it has to state the rule, not "Invalid input".
- **Give every icon inside the field that can be used an accessible name** — a clear control, a calendar trigger. Decorative icons must be silent, not announced as unlabeled graphics.
- **If a prefix or suffix changes what the value means** — a currency symbol, a unit — make sure that meaning is in the label or the assistive text. A visual affix on its own may not be announced with the value.
- **When a value's format changes on focus**, state the expected format in the assistive text. The mask is a visual aid, and tells a screen reader nothing.

### Keyboard and non-mouse navigation

- **Never remove the field from the tab order**, and never make reaching it depend on a pointer.
- **The tab order follows the visual order.** The single-column form rule in `recursica-skill-forms` is what keeps this true. Do not reorder fields on screen while leaving the DOM order (the order in the page's code) alone, or the other way round.
- **Every control inside the field is its own tab stop** (a place the Tab key lands), and works from the keyboard — Enter or Space, not handlers that only respond to clicks.
- **Do not move focus for the user.** No jumping ahead to the next field when a value looks complete, and no focus jumps on a keystroke. Both strand keyboard and screen reader users partway through typing.

## Set by the component

Do not set or override any of these. The component sets them:

- `min-height`, `horizontal-padding`, `vertical-padding`, `border-size`, `border-radius`, and every gap.
- Field width — `globals.form.field.size` sets `min-width` and `max-width`.
- `icon-size` and `icon-text-gap`.
- Text styling, and `placeholder-opacity`.
- Per-layer colors, the focused border, hover, and active styling.
- The label-to-input association and keyboard behavior inside the field.

Never style an unfocused field so that it reads as disabled. An editable field must look editable at rest.

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

- [ ] The value really cannot come from a set list of options.
- [ ] A visible label is passed, and it makes sense on its own.
- [ ] Label placement is side by side, unless the container is too narrow.
- [ ] `formLayout` is passed explicitly — `side-by-side`, unless the form's container is too narrow — and matches every other field in the same form. There is one placement per form at any given breakpoint, with no mixing between fields or sections. A missing prop means `stacked`, not the house rule, and `layouts` is not the prop name.
- [ ] No required information lives in placeholder text.
- [ ] Assistive text states the rule. On error, it is replaced by a message that restates that rule.
- [ ] The error state has a signal that is not color.
- [ ] Every icon inside the field that can be used has an accessible name, and decorative icons are silent.
- [ ] You passed no variant, size, or state outside the inventory defined by tokens above.
- [ ] You overrode no styling that the component owns, and no field without focus looks disabled.
- [ ] Values that cannot be edited use the read-only component, text on several lines moved to a textarea, and quantities moved to a number input.
- [ ] You invented nothing from the uncovered list.
