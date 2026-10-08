---
name: recursica-skill-read-only-field
description: Rules for the Recursica read-only field — a label and value with no input, why a read-only field is not a disabled field, value formatting, and accessibility for a value that a screen reader announces and a user can copy, with no tab stop. Use for view modes, summaries, and system-set values in a form. Not for an editable field — see recursica-skill-text-field.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Read-only field

A read-only field shows a label and a value inside a form. A read-only field shows no input.

## When to use a read-only field

- **A form shows a value that the current user cannot edit on this screen**, such as a profile page or a settings page in view mode.
- **A confirmation step sums up the values the user entered**, so the user can review the values before submitting.
- **The system created the value**, such as an account ID, a created date or a calculated total.
- **The value belongs to the object the form is about**, and the value needs the same label-and-value layout as the fields around the value.

## When not to use a read-only field

Each case in the table below needs a different component. Use the component in the table instead of adapting a read-only field.

| Situation                                               | Use instead                                                                                         |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| The user can edit the value on this screen              | The matching input, such as `recursica-skill-text-field` or `recursica-skill-number-input`          |
| The user cannot edit the value now, but could later     | The disabled state of the component that edits the value. See `recursica-skill-selection-controls`. |
| Nobody ever edits the data                              | Plain text. The frame of a form control suggests that the data is part of a form.                   |
| The content is not a pair of a label and a value        | Standard text elements, such as headings and body text                                              |
| Several repeating objects each have the same properties | A table. Each table row is one object, and each column is one field. See `recursica-skill-tables`.  |

**Use a read-only field, not a disabled input, when the value cannot be edited.** A disabled input is still clearly an input. A disabled input tells the user that the input cannot be used now. A disabled input also tells the user that the user could reasonably make the input usable with another action first. A read-only field does not suggest that the value can become editable.

**Never fake a read-only field by disabling an input or by removing an input's borders.** `recursica-skill-forms` sets the rule against faking a read-only field.

## Variants

**Use only the read-only field variants and options that the Recursica MCP server lists for the project.** A designer can add variants and options in Theme Forge, so each project can differ. Get the list with the server's `recursica_get_component_doc` tool, and use the names the code uses. The code can use a different name from the name in Figma and the UI kit. A wrong name in code has no effect and shows no error. Never invent a variant or an option.

The rules below describe each option by role, such as "the label above the field". The names in the standard UI kit (the unchanged UI kit in the official Recursica release) are examples only.

- **Do not set a state on a read-only field, and do not fake a state.** A read-only field is not a control. A read-only field never has an error state, a disabled state, a focus state or a hover state. No part of a read-only field can be invalid or unusable.
- **If the project has a size variant or a `rows` option, use that variant or option.** Otherwise, no rule says how a long value is shown. The question is listed under "Open questions".
- **Keep the read-only background that the read-only field's tokens set.** Do not choose another background style for a read-only field.

**Label placement is a variant.** A field's label sits beside the field or above the field. In the standard UI kit, the variant is `layouts`, with the options `side-by-side` and `stacked`. The label beside the field is the house default. The label above the field is the fallback when the form's container is too narrow for both side by side. The container's width decides, not the viewport's width. See `recursica-skill-forms`. Every field has the same label-placement variant. Set the read-only field's label placement to match the fields around the read-only field. A read-only field among stacked fields is stacked too.

**Set label placement explicitly on every field.** The house rule puts the label beside the input. The code library under an adapter may put the label above the input by default, at every container width. Set the label beside the input on every field, using the names the code uses for the variant and the option.

## Rules

**Always pass a visible label to the read-only field**, and let the read-only field connect the label to the value. In the label, name the object clearly, use sentence capitalization, and leave off any colon at the end. The rules in `recursica-skill-label` apply without change.

**Label placement is one decision per form, not per field.** This field uses the same label placement as every other field in the form, editable or not. Apply the container-width test once, to the whole form. The result sets the placement of every field in the form, including short fields that would fit side by side. A form may change placement at a breakpoint, but a form never mixes placements at one breakpoint, and a form section never gets a separate placement. `recursica-skill-forms` sets this rule.

**Make a read-only field look clearly different from an input.** A user must see at a glance whether a field is read-only, disabled or editable. The most common mistake is a light gray background on editable fields. The light gray background makes a whole form look read-only. Keep the look that the read-only field's tokens set. Do not restyle read-only fields or editable fields to look like each other.

**Format the value by the rules for showing values, not the rules for entering values.** A read-only date always uses the format `Jan 7, 2026`, never `01/07/2026`. The numeric date format appears only inside an input that has focus. Numbers are right-aligned with a fixed number of decimal places (fixed precision). Currency has two decimal places. Durations use unit labels. `recursica-skill-dates-and-currency` sets the rules for showing values.

**Align read-only values the same way as the editable values on the same screen.** Read-only values aligned left to sit near the labels make one screen look like two different design systems when the editable values beside the read-only values are aligned right.

**Put the time zone and the unit in the value's text.** A user who copies the value or hears the value read aloud then gets the time zone and the unit with the value.

**If the user can edit the value through another flow, open the other flow from a named control that stays visible.** Never use a control that appears on hover. See "Open questions" before adding an edit control.

**A read-only field holds one label and one value.** If the value is several items, use a list or a table, not a read-only field with the items separated by commas.

## Accessibility

The rules below add to the accessibility baseline in `recursica-skill-system-conventions`, including the focus ring, which every Recursica component follows.

**A read-only field must be announced as a labeled value, not as a control.** The label must still be connected to the value in code, and the user must be able to copy the value. A read-only field follows different accessibility rules from every editable field.

### Screen readers

- **A read-only field must not be announced as an input.** Do not build a read-only field as an `input` or a `textarea`: not a disabled `input`, not an `input` with a `readonly` attribute, and not an element with a textbox role. A user who hears "edit text" tries to type into the field.
- **The label must still be connected to the value in code.** Pass the label to the read-only field. A label shown as separate text beside a value is paired with the value only visually. A screen reader user moving through the page hears the value with nothing to say what the value is.
- **The value must be real text in the page**, never an image, a canvas, a background image, or content that a style sheet adds. A screen reader cannot announce text inside an image, a canvas or a style sheet.
- **Do not mark a read-only field required or optional.** A read-only field has nothing to require. A required marker on a value the user cannot enter is a false instruction.
- **Do not apply a disabled look or `aria-disabled` to a read-only field.** A read-only field is not disabled. Announcing a read-only field as disabled tells the user that a condition could make the field editable, but the read-only state is permanent.
- **Never leave an empty value silent.** A screen reader announces the label and then nothing. The user cannot tell the empty value from a bug. Show readable text in place of the missing value.
- **Format the value so a screen reader says the value correctly**, with a spelled-out month, a stated unit and a stated time zone. A screen reader reading `01/07/2026` aloud is as unclear as `01/07/2026` on screen.
- **If an edit control is present, the edit control's name must say what the control edits**, as in "Edit email address", not "Edit". A screen reader user hears the edit control without the label and value beside the control.

### Keyboard and non-mouse navigation

- **A read-only field is not a tab stop** (a place the Tab key lands). Do not add a `tabindex`. Do not make a read-only field able to receive focus only to give the field a focus ring. A keyboard user tabs from the field above the read-only field straight to the field below. Skipping the read-only field is correct.
- **The value must be text the user can select and copy.** Never block selection. An account number or an ID that cannot be copied forces the user to type the number out by hand. Copying is the most common action on a read-only value.
- **No part of a read-only field may depend on hover or focus.** A read-only field never receives focus. Every piece of information in a read-only field is text that shows without hover or focus. The information includes the value, the unit, the time zone and any note about why the value cannot be edited.
- **Any edit control is a control.** The edit control is a separate tab stop, works with Enter or Space, has a separate accessible name (the name a screen reader reads out for a control), and is visible without hover. Keyboard users and touch users cannot reach an edit icon that appears on hover.
- **A read-only field must not interrupt the tab order** of the fields around the read-only field. Placing a read-only field between two inputs changes what a user reads, never the order the user tabs through.

## Styling set by tokens

**Never set or override the read-only field's styling.** The theme sets every visual property of the read-only field, such as size, spacing, borders, colors and animation. Do not add extra containers or spacers to change the read-only field's look. If the design needs a look the theme does not give, report the missing look as a gap in the design system. See `recursica-skill-design-router`.

Never set or override the connection between the label and the value. The read-only field makes the connection.

## Related skills

- `recursica-skill-forms` — label placement, the container-width test, one placement per form, the rule that a read-only field is a separate component rather than an input restyled to look read-only, and the rule that no form control goes inside a card.
- `recursica-skill-dates-and-currency` — the read-only date format, right alignment, precision, durations, and the rule that the format follows focus, which gives the read-only field the display format.
- `recursica-skill-label` — the label component, the label's placement variant, and the room a label makes for an edit icon.
- `recursica-skill-selection-controls` — disabled versus read-only, and when a value should not be a form control at all.
- `recursica-skill-tables` — the table to use instead for read-only values that repeat for several objects.
- `recursica-skill-system-conventions` — the accessibility baseline every component follows.

### Only if used on the same screen

- `recursica-skill-text-field` — the editable field, and why a disabled field is never used to show a value.

## Open questions

- **No rule settles the editable read-only field.** Only the design-system website shows an "Is editable" behavior, with an edit icon that appears on hover and sends the user to another flow. `recursica-skill-label` makes room for an edit icon on a label without saying what the edit icon does. A control that appears only on hover also conflicts with the accessibility rules above. Ask before settling the question or relying on the behavior.
- **A source outside the UI kit describes required and optional markers on a read-only field.** The source describes turning on an optional label or a required asterisk on a read-only field. The description contradicts the fact that a read-only field has no input to require. Do not rely on the markers without asking.
- **No rule says what a read-only field shows for an empty or null value.** `recursica-skill-tables` has a rule for null table cells, but no rule extends the table rule to a read-only field.
- **No rule says whether a long value, or a value on several lines, wraps, scrolls or is truncated.** Ask only when the project has no size variant and no `rows` option.
- **No rule says whether help text or assistive text may sit under a read-only field.**
- **No rule says whether a read-only field can be part of a compound control**, such as one half of a date-and-time row.

## Pre-flight checklist

- [ ] The value cannot be edited on this screen, and the value is shown with a read-only field, not a disabled input.
- [ ] Data that nobody ever edits, outside a form, is plain text instead of a read-only field.
- [ ] A visible label is passed to the read-only field, and the label makes sense when read alone.
- [ ] Label placement matches every other field in the same form, with one placement per form at each breakpoint and no mixing between fields or form sections — and is side by side unless the form's container is too narrow.
- [ ] No state is set or faked on the read-only field: no error, no disabled and no focus styling.
- [ ] The value uses the display format: dates with a spelled-out month, a fixed number of decimal places, and unit labels for durations.
- [ ] The read-only values are aligned the same way as the editable values on the same screen.
- [ ] The time zone and the unit are in the value's text.
- [ ] The read-only field shows no input, and a screen reader does not announce the read-only field as an input.
- [ ] The label is connected to the value in code, not only visually.
- [ ] The value is real text that can be selected and copied, never an image.
- [ ] The read-only field has no required or optional marker, no disabled look and no `aria-disabled`.
- [ ] An empty value is never left silent.
- [ ] The read-only field is not a tab stop, has no `tabindex`, and does not interrupt the tab order around the read-only field.
- [ ] No part of the read-only field depends on hover or focus.
- [ ] Any edit control stays visible, is a separate tab stop, has an accessible name that says what the control edits, and keeps the focus ring.
- [ ] Every variant and option is one the Recursica MCP server lists for the project, and no variant or option is invented.
- [ ] No styling is set or overridden on the read-only field, and no container or spacer is added to change the read-only field's look.
- [ ] Read-only fields and editable fields keep different looks.
- [ ] Open questions were asked about, not decided: the edit control that appears on hover, required and optional markers, empty and null values, long values, help text, and use in a compound control.
