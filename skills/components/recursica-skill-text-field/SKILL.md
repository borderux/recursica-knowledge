---
name: recursica-skill-text-field
description: How to use the Recursica text field correctly — when free-form entry is the right control and when another control replaces it, which variants and states exist, label and placeholder and assistive-text rules, error copy, prefixes and suffixes, read-only vs. disabled, and the screen-reader and keyboard requirements. Use whenever adding, reviewing, or refactoring a single-line text input, or deciding between free-form entry and a control with predefined options. Trigger on "text field", "text input", "input", "textbox", "placeholder", "helper text", "assistive text", "prefix", "suffix", "aria-describedby", "screen reader", "tab order", or a request to let a user type a value. Do NOT use for multi-line entry — that is recursica-skill-textarea. Do NOT use for a quantity you can do arithmetic on — recursica-skill-number-input. Do NOT use for form layout, validation timing, or save behavior — that is recursica-skill-forms.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Text field

A text field captures free-form text on a single line.

## Use it when

- **The value is unpredictable** — names, addresses, descriptions, references. Anything a preset list could not enumerate.
- **Typing beats choosing** — memorable data the user enters faster by hand than by navigating a control.
- **The content is short and fits one line.**

## Do not use it when

Each of these has a different component. Switch to it rather than adapting a text field:

| Instead of a text field                                                            | Use                                                                                             |
| ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| The value comes from a known set of options                                        | A dropdown, radio group, or autocomplete — see `recursica-skill-selection-controls`             |
| The answer is yes or no                                                            | A switch or a checkbox                                                                          |
| The content runs to multiple lines                                                 | `recursica-skill-textarea`                                                                      |
| The value is a quantity the user types — a count, an amount, a rate, a measurement | `recursica-skill-number-input`. Free-form entry is wrong for something you can do arithmetic on |
| The value is never editable by this user                                           | The read-only field component — renders text, no input                                          |

**A disabled text field is not a way to display a value.** If nobody can ever edit it here, it is not a form control.

## What exists

Taken from `recursica_ui-kit.json` → `ui-kit.components.text-field`. **Do not pass a variant or state that is not listed here** — other design systems have field sizes, fluid styles, warning states, success states, and loading states that this component does not.

| Axis      | Options                   |
| --------- | ------------------------- |
| `layouts` | `stacked`, `side-by-side` |
| `states`  | `error`, `disabled`       |

**`layouts` is the label placement axis.** `side-by-side` — label beside the field — is the house default; `stacked` is the fallback when the container is too narrow to fit both. The trigger is container width, not viewport. See `recursica-skill-forms`.

**Focus and placeholder are not variants.** They are handled by the component: `placeholder-opacity` on this component, and the focused border via `globals.form.field.colors.border-selected`. Do not build them as states.

**There is no size axis.** `min-height` is a fixed property, and `globals.form.field.size.single-line-input-height` sets the height for every single-line field.

**Read-only is a separate component** — `read-only-field`, which has the same `layouts` axis and renders text rather than an input.

## Rules for using it

**Always pass a visible label.** Name the object explicitly; a screen reader user hears the label alone, without surrounding context. Sentence capitalization, no trailing colon, short enough not to wrap.

**Never put required information in the placeholder.** It disappears on the first keystroke. Use it only to show the shape of an expected value.

**Put the input's rule in assistive text** — formats, character requirements, minimums — so the user has it before they get it wrong.

**Label placement is one decision per form, not per field.** This field's `layouts` value is not an independent choice — it matches every other field in the same form. The container-width test is applied once, to the form as a whole, and its answer governs every field in it, including short ones that would have fitted side by side. A whole form may switch placement between breakpoints, but never mixes the two at one breakpoint, and a section never gets its own placement. Owned by `recursica-skill-forms`.

**On error, replace the assistive text; do not add to it.** Swapping keeps the field height stable so the form below does not shift. The error message must restate the rule that was broken: "Invalid input" is not an error message.

**Pair the error state with a non-color indicator** — an icon or the message itself. Required by `recursica-skill-system-conventions`.

**Prefixes and suffixes go in the field**, not in the label and not concatenated into the value — a currency symbol before an amount, a unit or email domain after it.

**Disabled and read-only are different components, not two styles of one.**

- **Disabled text field** — still a field, still visibly an input, just not currently operable. Use it when the user could make it operable by doing something else first. A disabled field is uneditable, but that is not the same as read-only.
- **Read-only field** — a different component entirely. It renders no input: label and text only. Use it when this user never edits this value here.

Never reach for a disabled text field as a way to display a value.

**A field that routinely overflows is the wrong component.** The value scrolls sideways past the right edge, which makes long entries unreadable — move to a textarea or a detail view.

**Some values change format on focus.** A date shows readable at rest and switches to a masked numeric format while focused. See `recursica-skill-dates-and-currency`.

## Accessibility

The component wires the label to the input, provides the focus ring, and handles keys inside the field. Everything below is yours to get right, and it is the part most often missed.

### Screen readers

- **Pass a real label.** Never let placeholder text be the accessible name — it is not announced as a label, and it disappears on input. A field with no label has no accessible name.
- **Pass assistive text and error text through the component**, never as a loose element rendered beside the field. Only the component can associate them with the input, and unassociated text is invisible to a screen reader user who tabs straight into the field.
- **The error message must be the announced text.** Because the error replaces the assistive text rather than joining it, the message is the only thing that will be read — so it has to carry the rule, not "Invalid input".
- **Convey required state programmatically, not with an asterisk alone.** The asterisk is a visual convention; it is not an accessible name for "required".
- **Give every interactive in-field icon an accessible name** — a clear control, a calendar trigger. Decorative icons must be silent, not announced as unlabeled graphics.
- **If a prefix or suffix changes the meaning of the value** — a currency symbol, a unit — make sure that meaning is in the label or the assistive text. A visual affix on its own may not be announced with the value.
- **When a value's format changes on focus**, state the expected format in the assistive text. The mask is a visual affordance and communicates nothing to a screen reader.

### Keyboard and non-mouse navigation

- **Never remove the field from the tab order**, and never make reaching it depend on a pointer.
- **Tab order follows visual order.** The single-column form rule in `recursica-skill-forms` is what makes this hold — do not reorder fields visually and leave the DOM order alone, or the reverse.
- **Every in-field control is its own tab stop** and operable from the keyboard — Enter or Space, not click-only handlers.
- **Do not move focus for the user.** No auto-advancing to the next field when a value looks complete, and no focus jumps on keystroke; both strand keyboard and screen reader users mid-entry.
- **A disabled field is skipped by tab**, so any information conveyed only by its disabled state is unreachable by keyboard. Put the reason in text.
- **Nothing needed to complete the field may require hover to appear.** Assistive text is persistent; a hover-only hint is unavailable to keyboard and touch users alike.
- **Never suppress the focus ring**, and never rely on the caret alone to show where focus is.

## Not your decision

Do not implement, override, or tune any of these — the component owns them:

- `min-height`, `horizontal-padding`, `vertical-padding`, `border-size`, `border-radius`, and every gap.
- Field width — `globals.form.field.size` sets `min-width` and `max-width`.
- `icon-size` and `icon-text-gap`.
- Text styling, and `placeholder-opacity`.
- Per-layer colors, the focused border, hover, and active styling.
- The label-to-input association and keyboard behavior inside the field.

Never style an unfocused field so that it reads as disabled. An editable field must look editable at rest.

## Load these too

- [`recursica-skill-forms`](../../design-rules/recursica-skill-forms/SKILL.md) — label placement and alignment, one placement per form, single-column layout, required vs. optional marking, validation timing, error presentation, save mode, and the rule that no form control goes inside a card.
- [`recursica-skill-selection-controls`](../../design-rules/recursica-skill-selection-controls/SKILL.md) — when a predefined-option control replaces free-form entry, and disabled vs. read-only.
- [`recursica-skill-dates-and-currency`](../../design-rules/recursica-skill-dates-and-currency/SKILL.md) — date, time, currency, and numeric formatting inside the field.
- [`recursica-skill-system-conventions`](../../design-rules/recursica-skill-system-conventions/SKILL.md) — never carry meaning in a single channel.

## Uncovered — ask, do not invent

- **Character or word counters.** Whether the field supports one, and what happens at the limit.
- **A clear or reset affordance inside the field.**
- **Password fields.** `recursica-skill-forms` forbids a visibility toggle, but whether a password variant exists here is unstated.

## Pre-flight checklist

- [ ] The value genuinely cannot come from a predefined set of options.
- [ ] A visible label is passed, and it reads correctly on its own.
- [ ] Label placement is side-by-side unless the container is too narrow.
- [ ] `layouts` matches every other field in the same form — one placement per form at any given breakpoint, with no mixing between fields or sections.
- [ ] No required information lives in placeholder text.
- [ ] Assistive text states the rule; on error it is replaced by a message restating that rule.
- [ ] The error state carries a non-color indicator.
- [ ] Assistive text and error text are passed through the component, not rendered beside it.
- [ ] Required state is conveyed programmatically, not by an asterisk alone.
- [ ] Every interactive in-field icon has an accessible name; decorative icons are silent.
- [ ] The field is in the tab order, tab order matches visual order, and focus is never moved for the user.
- [ ] Nothing needed to complete the field requires hover, and the focus ring is not suppressed.
- [ ] No variant, size, or state outside the token-defined inventory above was passed.
- [ ] No component-owned styling was overridden, and no unfocused field reads as disabled.
- [ ] Non-editable values use the read-only component; multi-line moved to a textarea; quantities moved to a number input.
- [ ] Nothing in the uncovered list was invented.
