---
name: recursica-skill-label
description: How to use the Recursica label that every form field uses — side-by-side or stacked placement by container width, the required indicator and optional text it displays, label copy, and label-to-field association. Use for any field or group label. Not for help or error text — see recursica-skill-assistive-element; which fields a form marks, and how, is decided in recursica-skill-forms.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Label

The label names the field. It is a real component — not text you place beside an input.

## Use it when

- **Any form control needs a name** — every one does, with no exception.
- **A group of controls needs a name** — a checkbox group, a radio group, a switch group.

## Do not use it when

| Instead of a label                    | Use                                                        |
| ------------------------------------- | ---------------------------------------------------------- |
| Titling a section or a page           | A heading. A label belongs to a control                    |
| Explaining the rule for a field       | `recursica-skill-assistive-element` with type `help`       |
| Showing the form of an expected value | The field's placeholder — which never replaces the label   |
| Showing a value the user cannot edit  | `recursica-skill-read-only-field`, which has its own label |

**A placeholder is never a label.** It is not announced as one, and it disappears on the first keystroke.

## What exists

Taken from the UI kit (the token file, `recursica_ui-kit.json`, that says which variants and states each component has) → `ui-kit.components.label`.

**The third column is the React prop that sets each axis.** An axis (a property a component varies on, such as size or style; Figma calls it a variant property) is named in the UI kit. Its name is not a prop, and if you pass it as one, React quietly ignores it. A blank cell means no single prop sets that axis — it is set by CSS state or by separate props, and the rules below say which.

| Axis      | Options                   | React prop   |
| --------- | ------------------------- | ------------ |
| `layouts` | `stacked`, `side-by-side` | `formLayout` |
| `sizes`   | `default`, `small`        |              |

**`layouts` is the placement axis, set by the `formLayout` prop, and it is the same axis every field has.** Set it consistently: the label's layout and its field's layout are one decision, not two — and that decision belongs to the form, not to this label. See the placement rule below.

**`formLayout` defaults to `stacked`, so the house rule is the one thing you must pass.** Leave it out, and you get the fallback in a container of any width — the rule turned upside down. `layouts` is the name of the token axis, not a prop: `layouts="side-by-side"` is quietly ignored by React and leaves the control stacked, with no error. Pass `formLayout="side-by-side"` explicitly.

**The UI kit provides a required indicator and an optional text**, each with its own gaps, and a transparency setting for the optional text. Both exist — which one you use is decided by the form, not by the field.

**There is a gap for an edit icon**, so a label can carry an edit control. What that control is for is not stated; see the uncovered list.

**There are two sizes, `default` and `small`, and no disabled state.** The label's color across states comes from the field's tokens. When a label is small is in the uncovered list.

## Rules for using it

**Side by side is the default.** The label sits to the left of the field, on the same row, right-aligned so it sits close to its field. Stack it above only when the container is too narrow to fit both — and what decides this is the width of the form's container, not the viewport. Owned by `recursica-skill-forms`.

**Label placement is one decision per form, and the label owns it.** A single form uses labels side by side, or stacked labels — never both at the same breakpoint.

- **The container-width test is applied once, to the form**, and its answer governs every field in that form. If the form's container cannot fit label and field side by side, every label in it stacks — including the short ones that would have fitted.
- **This label's `layouts` value is not a separate choice.** It matches every other label in the same form. There is no judgment call for each field here. A field's own width, height, or content is not a reason to place its label differently — not a tall textarea, not a two-character number input, and not a radio group with eight options.
- **Across breakpoints, a whole form may switch** — side by side in a wide container, stacked in a narrow drawer. That is still one placement per form, decided once for each breakpoint. What is forbidden is a mix within a single breakpoint.
- **Sections do not get their own placement.** A form's sections are parts of one form. A section whose labels stack while the section above sits side by side is the same defect.

Mixing the two placements in one form causes three problems. It destroys the single scan straight down the column of values that the side-by-side rule exists to create. It creates two competing left edges, so the user cannot tell whether the next thing they read is a label or a value. And it makes the odd field out look as if it means something different. Owned by `recursica-skill-forms`.

**Name the object clearly.** The label must make sense on its own: a screen reader user hears it without the content around it. If a verb is involved, make it clear and active — never passive, and never a linking verb (a verb such as "is" or "seems" that connects words instead of showing an action).

**Use sentence capitalization, with no colon at the end**, and keep it short enough not to wrap.

**Mark the exception, never both.** If most fields are required, mark the few optional ones. If most are optional, mark the few required ones. Never mark both in one form.

**Avoid cluttering the form with asterisks.** Where nearly everything is required, use a signal that applies across the form — a bold label for required, regular weight for optional — and state that convention once.

**Mark a whole group as optional** when an entire section may not apply, instead of marking every field inside it.

**One label per control.** A compound control that makes up one value — a date plus a time plus AM/PM — gets one label for the whole thing.

**A group's label is not a field's label.** A checkbox group has a group label, and each item has its own item label. Do not use one to do the other's job.

## Accessibility

This component also follows the accessibility baseline in `recursica-skill-system-conventions`. Only what is specific to it is listed here.

The label is where a field becomes usable by a screen reader at all. The connection between label and control is the whole reason this component exists.

### Screen readers

- **The label must be connected in code to its control.** The field components set this up — your job is to pass a real label, so there is something to connect. A field with no label has no accessible name (the name a screen reader reads out for a control).
- **Never substitute a label that is only visual.** Text that just sits next to an input is not a label. If the field component takes a label, use it.
- **The label must make sense read on its own**, out of order and out of context. That is the whole reason the wording rule exists.
- **The required state must be available in code, not just shown by an indicator.** The asterisk or the bold weight is the visual channel (color, shape, position or text, each a separate signal); the field must also make it known that it is required. `recursica-skill-system-conventions` forbids relying on a single channel.
- **The same is true of an optional marker.** If optionality is shown by a word, that word must be part of what is announced for the label, not a floating fragment.
- **Do not hide the label visually.** Sighted keyboard users and voice users need it too, and a visible label is a house requirement.
- **A group label must be announced when focus enters the group** — not just placed before it in the reading order — or the user hears options with no question attached.
- **Do not cram instructions into the label.** Rules go in the assistive element. A long label is announced in full every time the field is reached.

### Keyboard and non-mouse navigation

- **The label is not a tab stop** (a place the Tab key lands). It cannot receive focus by itself.
- **Clicking or tapping the label must move focus to its control.** This comes free with a real connected label, and it gives the user a bigger target — do not break it by showing the label as unconnected text.
- **If the label carries an edit icon, that icon is a control**, and it must be its own tab stop with its own accessible name.
- **A stacked label must not change the tab order.** Placement is visual; the order is label, then field, either way.

## Decided elsewhere

Do not implement, override, or tune any of these — the component owns them:

- `label-text` and `optional-text` type styling, and `optional-text-opacity`.
- `required-indicator-gap`, `label-optional-text-gap`, `edit-icon-gap`.
- `colors`, including the error and disabled treatments.
- The gap between label and field — `globals.form.properties.label-field-gap-horizontal` and `label-field-gap-vertical`.

## Load these too

- `recursica-skill-forms` — label placement and alignment, the container-width trigger, one placement per form at any given breakpoint, required vs. optional policy, label copy, and group-level optionality.
- `recursica-skill-assistive-element` — the help and error text below the field.
- `recursica-skill-system-conventions` — never carry meaning in a single channel.

## Uncovered — ask, do not invent

- **The edit control on a label.** The UI kit sets aside a gap for an edit icon, but what it does, and on which fields, is not stated.
- **Which form-wide signal marks required fields** when asterisks are avoided. Bold is given as an example, not a rule.
- **Whether the required indicator and the optional text may both appear in one application**, on different forms.
- **Truncating a label** when it is longer than the space available in side-by-side placement.
- **When a label is `small`.** The UI kit defines `default` and `small`, and no rule says when to use `small`. Whether the adapter exposes it as a prop has not been confirmed. Check the component's props, or ask, before relying on it.

## Pre-flight checklist

- [ ] Every control, and every group of controls, has a real label passed to the component.
- [ ] `layouts` matches the field's, and side by side is used unless the container is too narrow.
- [ ] `layouts` matches every other label in the same form — one placement per form at any given breakpoint, with no mixing between fields or sections — and no field's own width or height overrides it.
- [ ] The label names the object, makes sense on its own, uses active verbs, and has no colon at the end.
- [ ] Only the exception is marked — required or optional, never both.
- [ ] There is no clutter of asterisks. Where the signal applies across the form, the convention is stated once.
- [ ] The required and optional states are available in code, not shown only by the visual marker.
- [ ] No label is visually hidden, and no rules or instructions are crammed into it.
- [ ] A compound control has one label, and a group's label is not doing an item's job.
- [ ] Clicking the label moves focus to its control.
- [ ] Any edit icon on the label is a tab stop with its own name.
- [ ] You overrode no layout, gap, or type styling.
- [ ] You invented nothing from the uncovered list.
