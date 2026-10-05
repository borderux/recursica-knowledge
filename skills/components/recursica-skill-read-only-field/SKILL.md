---
name: recursica-skill-read-only-field
description: Rules for the Recursica read-only field — a label and value with no input, why it is not a disabled field, value formatting, and readable, copyable accessibility with no tab stop. Use for view modes, summaries, and system-set values in a form. Not for an editable field — see recursica-skill-text-field.
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
| The value is unavailable now, but could become usable   | The disabled state of the component that edits the value. See `recursica-skill-selection-controls`. |
| The data is never edited                                | Plain text. The frame of a form control suggests that the data is part of a form.                   |
| The content is not a pair of a label and a value        | Standard text elements, such as headings and body text                                              |
| Several repeating objects each have the same properties | A table. Each table row is one object, and each column is one field. See `recursica-skill-tables`.  |

**Use a read-only field, not a disabled input, when the value cannot be edited.** A disabled input is still clearly an input. A disabled input tells the user that the input is unusable right now, and that the user could reasonably make the input usable with another action first. A read-only field does not suggest that the value can become editable.

**Never fake a read-only field by disabling an input or by removing an input's borders.** `recursica-skill-forms` sets this rule.

## Variants

**Use only the read-only field variants and options that the Recursica MCP server lists for the project.** A designer can add variants and options in Theme Forge, so each project can differ. Get the list with the server's `recursica_get_component_doc` tool, and use the names the code uses. The code can use a different name from the name in Figma and the UI kit. A wrong name in code has no effect and shows no error. Never invent a variant or an option.

The rules below describe each option by role, such as "the label above the field". The names in the standard UI kit (the unchanged UI kit in the official Recursica release) are examples only.

- **No states.** The standard UI kit gives the read-only field no error state, no disabled state, no focus state and no hover state. A read-only field is not a control, so no part of a read-only field can be invalid or unusable. Do not pass a state, and do not fake a state.
- **No placeholder and no input.** In the standard UI kit, the read-only field sets only the text style, the colors and the minimum height.
- **No size variant and no `rows` option in the standard UI kit.** If the project adds a size variant or a `rows` option in Theme Forge, use the project's variant or option. Otherwise, no rule says how a long value is shown. See the open questions.
- **One read-only background.** The component sets the read-only background. Do not choose another background style for a read-only field.

**Label placement is a variant.** The label sits beside the field or above the field. In the standard UI kit, the variant is `layouts`, with the options `side-by-side` and `stacked`. The label beside the field is the house default. The label above the field is the fallback when the form's container is too narrow for both side by side. The container's width decides, not the viewport's width. See `recursica-skill-forms`. Every field has the same label-placement variant. Set the read-only field's label placement to match the fields around the read-only field. A read-only field among stacked fields is stacked too.

**Set label placement explicitly on every field.** An adapter's default may put the label above the input at every container width, which breaks the house rule. Set the label beside the input on every field, using the names the code uses for the variant and the option.

## Rules

**Always pass a visible label to the read-only field**, and let the component pair the label with the value. In the label, name the object clearly, use sentence capitalization, and leave off any colon at the end. The rules in `recursica-skill-label` apply without change.

**Label placement is one decision per form, not per field.** This field uses the same label placement as every other field in the form, editable or not. Apply the container-width test once, to the whole form. The result sets the placement of every field in the form, including short fields that would fit side by side. A form may change placement at a breakpoint, but a form never mixes placements at one breakpoint, and a form section never gets a separate placement. `recursica-skill-forms` sets this rule.

**Make a read-only field look clearly different from an input.** A user must see at a glance whether a field is read-only, disabled or editable. The most common failure is the reverse: a light gray background on editable fields makes a whole form look read-only. Keep the look that the read-only field's tokens set. Do not restyle read-only fields or editable fields to look like each other.

**Format the value by the rules for showing values, not the rules for entering values.** A read-only date is always `Jan 7, 2026`, never `01/07/2026`. The numeric date format exists only inside an input that has focus. Numbers are right-aligned with fixed precision. Currency has two decimal places. Durations use unit labels. `recursica-skill-dates-and-currency` sets the rules for showing values.

**Align read-only values the same way as the editable values on the same screen.** Read-only values aligned left to sit near the labels, beside editable values aligned right, make one screen look like two different design systems.

**Put the time zone and the unit in the value's text.** The read-only field has no slot for help text and no placeholder, so no other part of the read-only field can show the time zone or the unit.

**If the user can edit the value through another flow, open the other flow from a named control that stays visible.** Never use a control that appears on hover. See the open questions before adding an edit control.

**A read-only field holds one label and one value.** If the value is several items, use a list or a table, not a read-only field with the items separated by commas.

## Accessibility

The rules below add to the accessibility baseline in `recursica-skill-system-conventions`, including the focus ring, which every Recursica component follows.

**A read-only field must be announced as a labeled value, not as a control.** The label must still be connected to the value in code, and the user must be able to copy the value. The accessibility rules for a read-only field differ from the rules for every editable field.

### Screen readers

- **A read-only field must not be announced as an input.** Do not build a read-only field as an `input` or a `textarea`: not a disabled `input`, not an `input` with a `readonly` attribute, and not an element with a textbox role. A user who hears "edit text" tries to type into the field.
- **The label must still be connected to the value in code.** Pass the label to the component. A label shown as loose text beside a value is paired with the value only visually. A screen reader user moving through the page hears the value with nothing to say what the value is.
- **The value must be real text in the page**, never an image, a canvas, a background image, or content that a style sheet adds. A screen reader cannot announce text inside an image, a canvas or a style sheet.
- **Do not mark a read-only field required or optional.** A read-only field has nothing to require. A required marker on a value the user cannot enter is a false instruction.
- **Do not apply a disabled look or `aria-disabled` to a read-only field.** A read-only field is not disabled. Announcing a read-only field as disabled tells the user that a condition could make the field editable, but the read-only state is permanent.
- **Never leave an empty value silent.** A screen reader announces a label followed by no value as a name with no value, and the user cannot tell the empty value from a bug. Show readable text in place of the missing value.
- **Format the value so a screen reader says the value correctly**, with a spelled-out month, a stated unit and a stated time zone. Read aloud, `01/07/2026` is as unclear as on screen.
- **If an edit control is present, the edit control must name the control's object**, as in "Edit email address", not "Edit". A screen reader user hears the edit control without the label and value beside the control.

### Keyboard and non-mouse navigation

- **A read-only field is not a tab stop** (a place the Tab key lands). Do not add a `tabindex`. Do not make a read-only field able to receive focus only to give the field a focus ring. A keyboard user tabs from the field above the read-only field straight to the field below, and skipping the read-only field is correct.
- **The value must be text the user can select and copy.** Never block selection. An account number or an ID that cannot be copied forces the user to type the number out by hand. Copying is the most common action on a read-only value.
- **A read-only field never receives focus, so no part of a read-only field may depend on hover or focus.** Every part of the meaning, including the value, the unit, the time zone and any note about why the value cannot be edited, is in text that shows without hover or focus.
- **Any edit control is a control.** The edit control is a separate tab stop, works with Enter or Space, has a separate accessible name (the name a screen reader reads out for a control), and is visible without hover. Keyboard users and touch users cannot reach an edit icon that appears on hover.
- **A read-only field must not interrupt the tab order** of the fields around the read-only field. Placing a read-only field between two inputs changes what a user reads, never the order the user tabs through.

## Styling set by tokens

**Do not set or override the read-only field properties below.** The read-only field component sets each property.

- `min-height`.
- `text` styling.
- `colors`, including the read-only background from `globals.form.field.colors.background-color-read-only`.
- Field width and sizing from `globals.form.field.size`.
- The label-field gaps and `vertical-item-gap` from `globals.form.properties`.
- The label-to-value association.

## Related skills

- `recursica-skill-forms` — label placement, the container-width test, one placement per form, the rule that a read-only field is a separate component rather than a styled-down input, and the rule that no form control goes inside a card.
- `recursica-skill-dates-and-currency` — the read-only date format, right alignment, precision, durations, and the rule that the format follows focus, which gives the read-only field the display format.
- `recursica-skill-label` — the label component, the label's placement variant, and the gap set aside for an edit icon.
- `recursica-skill-selection-controls` — disabled versus read-only, and when a value should not be a form control at all.
- `recursica-skill-tables` — where repeating read-only values go instead.
- `recursica-skill-system-conventions` — the accessibility baseline every component follows.

### Only if used on the same screen

- `recursica-skill-text-field` — the editable field, and why a disabled field is never used to show a value.

## Open questions

- **The editable read-only field.** Only the design-system website shows an "Is editable" behavior, with an edit icon that appears on hover and sends the user to another flow. No token is behind the behavior. The UI kit defines no edit control on the read-only field, and `recursica-skill-label` sets aside an `edit-icon-gap` without saying what the gap triggers. A control that appears only on hover also conflicts with the accessibility rules above. Ask before settling the question or relying on the behavior.
- **Required and optional markers.** A source outside the UI kit describes turning on an optional label or a required asterisk on a read-only field. The description contradicts the fact that a read-only field has no input to require. Do not rely on the markers without asking.
- **Empty and null values.** No rule says what a read-only field shows when the value is missing. `recursica-skill-tables` has a rule for null table cells, but no rule extends the table rule to a field.
- **Long values, or values on several lines.** The standard UI kit sets only a minimum height. No rule says whether a long value wraps, scrolls or is truncated. Ask only when the project has no size variant and no `rows` option.
- **Help or assistive text.** The read-only field has no error state and no slot for assistive text. No rule settles whether a note may sit under a read-only field.
- **A read-only field in a compound control.** No rule says whether a read-only field can be part of a compound control, such as one half of a date-and-time row.

## Pre-flight checklist

- [ ] The value cannot be edited on this screen, and the value is shown with a read-only field, not a disabled input.
- [ ] Data that nobody ever edits, outside a form, is plain text instead of a read-only field.
- [ ] A visible label is passed to the read-only field, and the label makes sense when read alone.
- [ ] Label placement matches every other field in the same form, with one placement per form at each breakpoint and no mixing between fields or form sections — and is side by side unless the container is too narrow.
- [ ] No state is passed or faked: no error, no disabled and no focus styling.
- [ ] The value uses the display format: dates with a spelled-out month, fixed precision, and unit labels for durations.
- [ ] The alignment matches the editable values on the same screen.
- [ ] The time zone and the unit are in the value's text.
- [ ] The read-only field shows no input, and a screen reader does not announce the read-only field as an input.
- [ ] The label is connected to the value in code, not only visually.
- [ ] The value is real text that can be selected and copied, never an image.
- [ ] The read-only field has no required or optional marker, no disabled look and no `aria-disabled`.
- [ ] An empty value is never left silent.
- [ ] The read-only field is not a tab stop, has no `tabindex`, and does not interrupt the tab order around the read-only field.
- [ ] No part of the read-only field depends on hover or focus.
- [ ] Any edit control stays visible, is a separate tab stop, has an accessible name that names the control's object, and keeps the focus ring.
- [ ] Every variant and option is one the Recursica MCP server lists for the project, and no variant or option is invented.
- [ ] Styling comes from the read-only field component, and read-only fields and editable fields keep different looks.
- [ ] Open questions were asked about, not decided: the edit control that appears on hover, required and optional markers, empty and null values, long values, help text, and use in a compound control.
