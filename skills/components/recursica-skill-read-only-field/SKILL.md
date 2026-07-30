---
name: recursica-skill-read-only-field
description: How to use the Recursica read-only field correctly — the component that shows a label and a value with no input, why it is not a disabled input and not plain text, that it has no states at all, how to format the value, and the screen-reader and keyboard requirements for something that must be readable and copyable without being a control or a tab stop. Use whenever a form shows a value this user cannot edit here — a view mode, a confirmation summary, or a system-generated value. Trigger on "read-only", "read only field", "view mode", "non-editable", "display value", "disabled or read-only", "system generated", "screen reader", "tab order", or a question about showing a value inside a form. Do NOT use for an editable field — see recursica-skill-text-field. Do NOT use for value formatting rules — that is recursica-skill-dates-and-currency. Do NOT use for form layout or save behavior — that is recursica-skill-forms.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Read-only field

A read-only field shows a label and its value inside a form. It renders no input.

## Use it when

- **A form shows a value this user cannot edit here** — a view mode on a profile or a settings page.
- **A confirmation step summarizes what was entered**, for review before submission.
- **The value is system-generated** — an account ID, a created date, a computed total.
- **The value belongs to the form's object** and needs to sit in the same label-and-value rhythm as the fields around it.

## Do not use it when

Each of these is a different thing. Switch to it rather than adapting a read-only field:

| Instead of a read-only field                           | Use                                                                                          |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| The user can edit the value here                       | The matching input — `recursica-skill-text-field`, `recursica-skill-number-input`, and so on |
| The value is unavailable now but could become operable | A disabled input on the real component — see `recursica-skill-selection-controls`            |
| Nobody edits this data in any context                  | Plain text. A form control's shell implies a form's semantics                                |
| The content is not a label-and-value pair              | Standard text elements — headings and body copy                                              |
| Repeating objects each carry the same properties       | A table. Rows are objects, columns are fields — see `recursica-skill-tables`                 |

**This is the correct answer to "the value is not editable", and a disabled input is not.** A disabled input is still a field: still visibly an input, not currently operable, and the user could plausibly make it operable by doing something else first. A read-only field makes no such promise.

**Never approximate read-only by disabling an input or stripping its borders.** Owned by `recursica-skill-forms`.

## What exists

Taken from `recursica_ui-kit.json` → `ui-kit.components.read-only-field`.

| Axis      | Options                   |
| --------- | ------------------------- |
| `layouts` | `stacked`, `side-by-side` |

**`layouts` is the label placement axis, and it is the same axis every field carries.** `side-by-side` is the house default; `stacked` is the fallback when the container is too narrow to fit both. The trigger is container width, not viewport. Set it to match the fields around it — a read-only field placed among stacked fields stacks too.

**There are no states. None.** No `error`, no `disabled`, no focus, no hover. This component is not a control, so it has nothing to be in an invalid or inoperable state about. Do not pass one, and do not simulate one.

**There is no placeholder and no input.** Only `text`, `colors`, and `min-height`.

**There is no size axis**, and no `rows` — a long value has no stated treatment. See the uncovered list.

**The read-only background comes from `globals.form.field.colors.background-color-read-only`**, not from a style you choose.

## Rules for using it

**Always pass a visible label**, and let the component pair it with the value. Name the object explicitly, sentence capitalization, no trailing colon. The rules in `recursica-skill-label` apply unchanged.

**Label placement is one decision per form, not per field.** This field's `layouts` value is not an independent choice — it matches every other field in the same form, editable or not. The container-width test is applied once, to the form as a whole, and its answer governs every field in it, including short ones that would have fitted side by side. A whole form may switch placement between breakpoints, but never mixes the two at one breakpoint, and a section never gets its own placement. Owned by `recursica-skill-forms`.

**Make it unmistakably not an input.** The distinction between read-only, disabled, and editable must be visible at a glance — and the most common failure is the reverse of this one: a light gray background on editable fields that makes a whole form read as read-only. Let this component's tokens do the work and do not restyle either side toward the other.

**Format the value by the display rules, not the entry rules.** A read-only date is always `Jan 7, 2026` — never `01/07/2026`, because the numeric form exists only inside a focused input. Numerics are right-aligned with fixed precision, currency carries two decimals, and durations use unit labels. Owned by `recursica-skill-dates-and-currency`.

**Keep alignment uniform with the editable values on the same screen.** Left-aligning read-only values so they sit near their labels while editable values are right-aligned makes one screen look like two systems.

**State the time zone and the unit in the value's text.** Nothing else is going to carry them: there is no help text slot and no placeholder here.

**If the value is editable through another flow, the way in is a persistent, named control** — never an affordance that appears on hover. See the uncovered list before adding one.

**One label, one value.** If the value is a set of things, it is a list or a table, not a read-only field with commas in it.

## Accessibility

The rules here differ from every editable field, and the difference is the point: **this must read as a labeled value, not as a control, while still being programmatically associated and freely copyable.**

### Screen readers

- **It must not announce as an input.** Do not render it as an `input` or `textarea` — not disabled, not with a `readonly` attribute, not with a textbox role. A user who hears "edit text" will try to type into it.
- **The label-to-value association must still be programmatic.** Pass the label to the component. A label rendered as loose text beside a value is a visual pairing only, and a screen reader user moving through the page gets an orphaned string with no idea what it names.
- **The value must be real text in the document** — never an image, a canvas, a background image, or CSS-generated content. Text that cannot be read cannot be announced.
- **Do not mark it required or optional.** There is nothing to require; a required marker on a value the user cannot enter is a false instruction.
- **Do not apply a disabled treatment or `aria-disabled`.** It is not disabled, and announcing it as such tells the user their access is conditional when it is permanent.
- **Never leave an empty value silent.** A label followed by nothing announces as a name with no value, which is indistinguishable from a bug. Put something readable there.
- **Format the value so it reads correctly aloud** — a spelled month, a stated unit, a stated time zone. `01/07/2026` is ambiguous read aloud in exactly the way it is ambiguous on screen.
- **If an edit control is present, it must name its object** — "Edit email address", not "Edit" — because a screen reader user hears the control without the row it sits in.

### Keyboard and non-mouse navigation

- **It is not a tab stop.** Do not add `tabindex`, and do not make it focusable to give it a focus ring. A keyboard user tabs from the field above it straight to the field below it, and that is correct.
- **The value must be selectable text the user can copy.** Never block selection — an account number or an ID that cannot be copied forces the user to transcribe it by hand, and copying is the main thing anyone does with a read-only value.
- **Because it never receives focus, nothing about it may depend on hover or focus.** Every part of the meaning — the value, its unit, its zone, any note about why it is not editable — is in text that is present at rest.
- **Any edit affordance is a control**, so it is its own tab stop, activated by Enter or Space, with its own accessible name, and it is **visible without hovering.** A hover-revealed edit icon does not exist for keyboard or touch users.
- **It must not interrupt the tab order** of the fields around it. Placing it between two inputs changes what a user reads, never the sequence they tab through.
- **Never suppress the focus ring** on an edit control it carries.

## Not your decision

Do not implement, override, or tune any of these — the component owns them:

- `min-height`.
- `text` styling.
- `colors`, including the read-only background from `globals.form.field.colors.background-color-read-only`.
- Field width and sizing from `globals.form.field.size`.
- The label-field gaps and `vertical-item-gap` from `globals.form.properties`.
- The label-to-value association.

## Load these too

- [`recursica-skill-forms`](../../design-rules/recursica-skill-forms/SKILL.md) — label placement, the container-width trigger, one placement per form, the rule that read-only is a distinct component rather than a styled-down input, and the rule that no form control goes inside a card.
- [`recursica-skill-dates-and-currency`](../../design-rules/recursica-skill-dates-and-currency/SKILL.md) — the read-only date format, right alignment, precision, durations, and the format-follows-focus rule this component sits at one end of.
- [`recursica-skill-label`](../recursica-skill-label/SKILL.md) — the label component, its placement axis, and the reserved edit-icon gap.
- [`recursica-skill-selection-controls`](../../design-rules/recursica-skill-selection-controls/SKILL.md) — disabled vs. read-only, and when a value should not be a form control at all.
- [`recursica-skill-text-field`](../recursica-skill-text-field/SKILL.md) — the editable counterpart, and why a disabled field is never a display mechanism.
- [`recursica-skill-tables`](../../design-rules/recursica-skill-tables/SKILL.md) — where repeating read-only values belong instead.

## Uncovered — ask, do not invent

- **The editable read-only field.** An "Is editable" behavior with an edit icon that **appears on hover** and routes the user to another flow is documented outside the token inventory, with no token behind it; the kit defines no edit affordance on this component, and `recursica-skill-label` reserves an `edit-icon-gap` without saying what it triggers. A hover-only control also conflicts with the accessibility rules above. Do not resolve this yourself, and do not rely on it without asking.
- **Required and optional markers.** Toggling an optional label or a required asterisk on this component is described outside the token inventory, which contradicts there being no input to require. Do not rely on it without asking.
- **Empty and null values.** No rule states what a read-only field shows when the value is missing. `recursica-skill-tables` has a null-cell rule for cells; nothing extends it to a field.
- **Long or multi-line values.** Only `min-height` exists — whether the value wraps, scrolls, or truncates is unstated.
- **Help or assistive text.** With no error state and no assistive slot, whether a note may sit under a read-only field is unsettled.
- **Whether a read-only field participates in a compound control**, such as one half of a date-and-time row.

## Pre-flight checklist

- [ ] The value genuinely cannot be edited here, and a disabled input was not used instead.
- [ ] Data nobody ever edits, outside a form, is plain text rather than this component.
- [ ] A visible label is passed to the component and reads correctly on its own.
- [ ] `layouts` matches every other field in the same form — one placement per form at any given breakpoint, with no mixing between fields or sections; side-by-side unless the container is too narrow.
- [ ] No state was passed or simulated — no error, no disabled, no focus treatment.
- [ ] The value uses the display format: spelled month dates, fixed precision, unit labels for durations.
- [ ] Alignment matches the editable values on the same screen.
- [ ] The time zone and the unit are in the value's text.
- [ ] It does not render an input, and does not announce as one.
- [ ] The label-to-value association is programmatic, not just visual.
- [ ] The value is real text, selectable and copyable, never an image.
- [ ] No required or optional marker, and no disabled treatment or `aria-disabled`.
- [ ] An empty value is never left silent.
- [ ] It is not a tab stop, has no `tabindex`, and does not interrupt the tab order around it.
- [ ] Nothing about it depends on hover or focus.
- [ ] Any edit control is persistently visible, its own tab stop, named with its object, with its focus ring intact.
- [ ] No component-owned styling was overridden, and neither the read-only nor the editable fields were restyled toward each other.
- [ ] Nothing in the uncovered list — the hover edit affordance especially — was invented.
