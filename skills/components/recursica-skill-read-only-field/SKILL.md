---
name: recursica-skill-read-only-field
description: Rules for the Recursica read-only field — a label and value with no input, why it is not a disabled field, value formatting, and readable, copyable accessibility with no tab stop. Use for view modes, summaries, and system-set values in a form. Not for an editable field — see recursica-skill-text-field.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Read-only field

A read-only field shows a label and its value inside a form. It shows no input.

## When to use a read-only field

- **A form shows a value this user cannot edit here** — a view mode on a profile or a settings page.
- **A confirmation step sums up what was entered**, for review before submitting.
- **The system created the value** — an account ID, a created date, a calculated total.
- **The value belongs to the form's object**, and needs the same label-and-value layout as the fields around it.

## When not to use a read-only field

Each case below needs a different component. Use that component instead of adapting a read-only field:

| Instead of a read-only field                          | Use                                                                                          |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| The user can edit the value here                      | The matching input — `recursica-skill-text-field`, `recursica-skill-number-input`, and so on |
| The value is unavailable now, but could become usable | A disabled input on the real component — see `recursica-skill-selection-controls`            |
| Nobody edits this data anywhere                       | Plain text. A form control's frame suggests it is part of a form                             |
| The content is not a pair of a label and a value      | Standard text elements — headings and body text                                              |
| Repeating objects each have the same properties       | A table. Rows are objects, and columns are fields — see `recursica-skill-tables`             |

**Use a read-only field, not a disabled input, when the value cannot be edited.** A disabled input is still a field: it is clearly an input, it is not usable right now, and the user could reasonably make it usable by doing something else first. A read-only field does not suggest that the value can become editable.

**Never fake read-only by disabling an input or removing its borders.** Owned by `recursica-skill-forms`.

## Variants

Taken from the UI kit (the token file, `recursica_ui-kit.json`, that says which variants and states each component has) → `ui-kit.components.read-only-field`.

**Look up each variant's name in code before using the variant.** The names in this skill are the names in Figma and the UI kit. The code can use a different name for the same variant. A wrong name in code has no effect and shows no error. The Recursica MCP server's `recursica_get_component_doc` tool gives the name to use in code.

| Variants  | Options                   |
| --------- | ------------------------- |
| `layouts` | `stacked`, `side-by-side` |

**Label placement is a variant.** The label sits beside the field or above the field. In the standard UI kit, the variant is `layouts`, with the options `side-by-side` and `stacked`. The label beside the field is the house default. The label above the field is the fallback when the form's container is too narrow for both side by side. The container's width decides, not the viewport's width. See `recursica-skill-forms`. It is the same variant every field has. Set it to match the fields around it — a read-only field placed among stacked fields stacks too.

**Set label placement explicitly on every field.** An adapter's default may put the label above the input at every container width, which breaks the house rule. Set the label beside the input on every field, using the names the code uses for the variant and the option.

**There are no states.** The component has no `error`, no `disabled`, no focus, and no hover state. It is not a control. Nothing about it can be invalid or unusable. Do not pass a state, and do not fake one.

**There is no placeholder, and no input.** The component's only properties are `text`, `colors`, and `min-height`.

**There is no size variant**, and no `rows`. No rule says how a long value is shown. See the open questions.

**The read-only background comes from `globals.form.field.colors.background-color-read-only`.** Do not choose another style for it.

## Rules

**Always pass a visible label**, and let the component pair it with the value. Name the object clearly, use sentence capitalization, and leave off any colon at the end. The rules in `recursica-skill-label` apply without change.

**Label placement is one decision per form, not per field.** This field uses the same label placement as every other field in the form, editable or not. Apply the container-width test once, to the whole form. The result sets the placement of every field in the form, including short fields that would fit side by side. A form may change placement at a breakpoint, but a form never mixes placements at one breakpoint, and a form section never gets a separate placement. `recursica-skill-forms` sets this rule.

**Make it clearly different from an input.** The difference between read-only, disabled, and editable must be visible at a glance. The most common failure is the reverse: a light gray background on editable fields, which makes a whole form look read-only. Keep the look this component's tokens set, and do not restyle read-only or editable fields to look like each other.

**Format the value by the rules for showing values, not the rules for entering them.** A read-only date is always `Jan 7, 2026` — never `01/07/2026`, because the numeric form exists only inside an input that has focus. Numbers are right-aligned with fixed precision, currency has two decimal places, and durations use unit labels. Owned by `recursica-skill-dates-and-currency`.

**Keep the alignment the same as the editable values on the same screen.** Left-aligning read-only values so they sit near their labels, while editable values are right-aligned, makes one screen look like two systems.

**Put the time zone and the unit in the value's text.** No other part of the component can show them: there is no help text slot and no placeholder here.

**If the value can be edited through another flow, open that flow from a named control that stays visible** — never a control that appears on hover. See the open questions before adding one.

**A read-only field holds one label and one value.** If the value is a set of items, use a list or a table — not a read-only field with commas in it.

## Accessibility

This component also follows the accessibility baseline in `recursica-skill-system-conventions`, including the focus ring. Only the rules specific to this component are listed here.

These rules differ from the rules for every editable field. **A read-only field must be announced as a labeled value, not as a control. Its label must still be connected to the value in code, and the user must be able to copy the value.**

### Screen readers

- **It must not be announced as an input.** Do not build it as an `input` or a `textarea` — not disabled, not with a `readonly` attribute, and not with a textbox role. A user who hears "edit text" will try to type into it.
- **The connection between label and value must still be made in code.** Pass the label to the component. A label shown as loose text beside a value is only paired visually. A screen reader user moving through the page hears the value with nothing to say what it is.
- **The value must be real text in the document** — never an image, a canvas, a background image, or content generated by CSS. A screen reader cannot announce text inside an image, a canvas, or CSS.
- **Do not mark it required or optional.** There is nothing to require. A required marker on a value the user cannot enter is a false instruction.
- **Do not apply a disabled look or `aria-disabled`.** It is not disabled. Announcing it as disabled tells the user that some condition could make it editable, when the read-only state is permanent.
- **Never leave an empty value silent.** A label followed by nothing is announced as a name with no value, which cannot be told apart from a bug. Show readable text in place of the missing value.
- **Format the value so it reads correctly aloud** — a spelled-out month, a stated unit, a stated time zone. `01/07/2026` is as ambiguous read aloud as it is on screen.
- **If an edit control is present, it must name its object** — "Edit email address", not "Edit" — because a screen reader user hears the control without the row it sits in.

### Keyboard and non-mouse navigation

- **It is not a tab stop** (a place the Tab key lands). Do not add a `tabindex`, and do not make it able to receive focus only to give it a focus ring. A keyboard user tabs from the field above it straight to the field below it, and that is correct.
- **The value must be text the user can select and copy.** Never block selection. An account number or an ID that cannot be copied forces the user to type it out by hand. Copying is the most common action on a read-only value.
- **Because it never receives focus, nothing about it may depend on hover or focus.** Every part of the meaning — the value, its unit, its time zone, any note about why it cannot be edited — is in text that is there at rest.
- **Any edit control is a control**, so it is its own tab stop, activated by Enter or Space, with its own accessible name (the name a screen reader reads out for a control) — and it is visible without hovering. Keyboard and touch users cannot reach an edit icon that appears on hover.
- **It must not interrupt the tab order** of the fields around it. Placing it between two inputs changes what a user reads, never the order they tab through.

## Styling set by tokens

Do not set or override any of these. The component sets them:

- `min-height`.
- `text` styling.
- `colors`, including the read-only background from `globals.form.field.colors.background-color-read-only`.
- Field width and sizing from `globals.form.field.size`.
- The label-field gaps and `vertical-item-gap` from `globals.form.properties`.
- The label-to-value association.

## Related skills

- `recursica-skill-forms` — label placement, the container-width trigger, one placement per form, the rule that read-only is a distinct component rather than a styled-down input, and the rule that no form control goes inside a card.
- `recursica-skill-dates-and-currency` — the read-only date format, right alignment, precision, durations, and the format-follows-focus rule, which gives this component the display format.
- `recursica-skill-label` — the label component, its placement variant, and the reserved edit-icon gap.
- `recursica-skill-selection-controls` — disabled vs. read-only, and when a value should not be a form control at all.
- `recursica-skill-tables` — where repeating read-only values belong instead.
- `recursica-skill-system-conventions` — the accessibility baseline every component follows.

### Only if used on the same screen

- `recursica-skill-text-field` — the editable counterpart, and why a disabled field is never used to display a value.

## Open questions

- **The editable read-only field.** An "Is editable" behavior, with an edit icon that appears on hover and sends the user to another flow, is shown only on the design-system website, with no token behind it. The UI kit defines no edit control on this component, and `recursica-skill-label` sets aside an `edit-icon-gap` without saying what it triggers. A control that appears only on hover also conflicts with the accessibility rules above. Ask before settling this or relying on it.
- **Required and optional markers.** Turning on an optional label or a required asterisk on this component is described outside the UI kit — which contradicts the fact that there is no input to require. Do not rely on it without asking.
- **Empty and null values.** No rule says what a read-only field shows when the value is missing. `recursica-skill-tables` has a null-cell rule for cells, but nothing extends it to a field.
- **Long values, or values on several lines.** Only `min-height` exists — whether the value wraps, scrolls, or is truncated is not stated.
- **Help or assistive text.** With no error state and no assistive slot, whether a note may sit under a read-only field is not settled.
- **Whether a read-only field can be part of a compound control**, such as one half of a date-and-time row.

## Pre-flight checklist

- [ ] The value cannot be edited here, and it is shown with this component, not a disabled input.
- [ ] Data that nobody ever edits, outside a form, is plain text instead of this component.
- [ ] A visible label is passed to the component, and it makes sense on its own.
- [ ] Label placement matches every other field in the same form, with one placement per form at each breakpoint and no mixing between fields or form sections — and is side by side unless the container is too narrow.
- [ ] No state is passed or faked — no error, no disabled, and no focus styling.
- [ ] The value uses the display format: dates with a spelled-out month, fixed precision, and unit labels for durations.
- [ ] The alignment matches the editable values on the same screen.
- [ ] The time zone and the unit are in the value's text.
- [ ] It shows no input, and a screen reader does not announce it as one.
- [ ] The connection between label and value is made in code, not only visually.
- [ ] The value is real text that can be selected and copied — never an image.
- [ ] There is no required or optional marker, and no disabled look or `aria-disabled`.
- [ ] An empty value is never left silent.
- [ ] It is not a tab stop, has no `tabindex`, and does not interrupt the tab order around it.
- [ ] Nothing about it depends on hover or focus.
- [ ] Any edit control stays visible, is its own tab stop, is named with its object, and has its focus ring intact.
- [ ] Styling comes from the component, and read-only and editable fields keep distinct looks.
- [ ] Open questions were asked about, not decided: the edit control that appears on hover, required and optional markers, empty and null values, long values, help text, and use in a compound control.
