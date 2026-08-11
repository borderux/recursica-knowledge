---
name: recursica-skill-label
description: How to use the Recursica label correctly — the label is a real component every form field uses, with side-by-side and stacked placement driven by container width, a required indicator, optional text, and an edit affordance. Covers label copy that names the object and stands alone, marking only the exception rather than both required and optional, why a label is never a heading and never replaced by a placeholder, and the screen-reader and keyboard requirements for label-to-control association. Use whenever adding, reviewing, or refactoring the label on any form control or control group. Trigger on "label", "field label", "label placement", "stacked", "side-by-side", "required indicator", "asterisk", "optional", "aria-label", "screen reader", or a question about what to call a field. Do NOT use for help or error text below a field — that is recursica-skill-assistive-element. Do NOT use for form layout, alignment, or required-vs-optional policy across a whole form — that is recursica-skill-forms.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Label

The label names the field. It is a real component, not text you place beside an input.

## Use it when

- **Any form control needs naming** — every one does, with no exception.
- **A group of controls needs naming** — a checkbox group, a radio group, a switch group.

## Do not use it when

| Instead of a label                      | Use                                                        |
| --------------------------------------- | ---------------------------------------------------------- | ---------- |
| Titling a section or a page             | A heading. A label belongs to a control                    |
| Explaining the rule for a field         | `recursica-skill-assistive-element` with type `help`       |
| Showing the shape of an expected value  | The field's placeholder — which never replaces the label   |
| Displaying a value the user cannot edit | `recursica-skill-read-only-field`, which has its own label |

**A placeholder is never a label.** It is not announced as one and it disappears on the first keystroke.

## What exists

Taken from `recursica_ui-kit.json` → `ui-kit.components.label`.

**The third column is the React prop that sets the axis.** The axis name is the token inventory's; it is not a prop, and passing it as one is dropped silently by React. A blank cell means no single prop carries that axis — it is set by CSS state or by separate props, and the rules below say which.

| Axis      | Options                   | React prop |
| --------- | ------------------------- | ---------- |
| `layouts` | `stacked`, `side-by-side` | `formLayout` |
**`layouts` is the placement axis, set by the `formLayout` prop, and it is the same axis every field carries.** Set it consistently: the label's layout and its field's layout are one decision, not two — and that decision belongs to the form, not to this label. See the placement rule below.

**`formLayout` defaults to `stacked`, so the house rule is the one thing you must pass.** Omit it and you get the fallback on a container of any width, which is the rule inverted. `layouts` is the token axis name and is not a prop — `layouts="side-by-side"` is dropped silently by React and leaves the control stacked with no error. Pass `formLayout="side-by-side"` explicitly.

**The kit provides a required indicator and an optional text**, with their own gaps and an opacity for the optional text. Both mechanisms exist — which one you use is decided by the form, not the field.

**There is an edit-icon gap**, so a label can carry an edit affordance. What that affordance is for is not stated; see the uncovered list.

**There is no size axis and no disabled state.** Label color across states comes from the field's tokens.

## Rules for using it

**Side-by-side is the default.** Label left of the field, on the same row, right-aligned so it sits close to its field. Stack it above only when the container is too narrow to fit both — and the trigger is the width of the form container, not the viewport. Owned by [`recursica-skill-forms`](../../design-rules/recursica-skill-forms/SKILL.md).

**Label placement is one decision per form, and the label owns it.** A single form uses side-by-side labels or stacked labels — **never both at the same breakpoint.**

- **The container-width test is applied once, to the form**, and its answer governs every field in that form. If the form's container cannot fit label and field side by side, **every** label in it stacks, including the short ones that would have fitted.
- **This label's `layouts` value is not an independent choice.** It matches every other label in the same form. There is no per-field judgement call here, and a field's own width, height, or content is not a reason to place its label differently — not a tall textarea, not a two-character number input, not a radio group with eight options.
- **Across breakpoints a whole form may switch** — side-by-side in a wide container, stacked in a narrow drawer. That is still one placement per form, evaluated once per breakpoint. What is prohibited is a mix inside a single breakpoint.
- **Sections do not get their own placement.** A form's sections are parts of one form; a section whose labels stack while the section above sits side by side is the same defect.

Mixing the two placements in one form destroys the single vertical scan down the column of values that the side-by-side rule exists to produce, creates two competing left edges so the user cannot tell whether the next thing they read is a label or a value, and makes the odd field out look like it means something different. Owned by [`recursica-skill-forms`](../../design-rules/recursica-skill-forms/SKILL.md).

**Name the object explicitly.** The label must stand alone: a screen reader user hears it without the surrounding content. If a verb is involved, make it explicit and active — never passive, never a linking verb.

**Sentence capitalization, no trailing colon**, short enough not to wrap.

**Mark the exception, never both.** If most fields are required, mark the few optional ones; if most are optional, mark the few required ones. Never mark both in one form.

**Avoid asterisk clutter.** Where nearly everything is required, use a systemic signal — bold label for required, regular for optional — and state the convention once.

**Declare optionality at the group level** when a whole section may not apply, rather than on every field inside it.

**One label per control.** A compound control that represents one logical value — a date plus a time plus AM/PM — gets one label for the whole thing.

**A group's label is not a field's label.** A checkbox group has a group label, and each item has its own item label. Do not use one to do the other's job.

## Accessibility

The label is where a field becomes usable to a screen reader at all. The association is the whole point of this component existing.

### Screen readers

- **The label must be programmatically associated with its control.** The field components wire this up — your job is to pass a real label so there is something to wire. A field with no label has no accessible name.
- **Never substitute a visual-only label.** Text that merely sits next to an input is not a label; if the field component takes a label, use it.
- **The label must be meaningful read alone**, out of order and out of context. This is the whole reason the copy rule exists.
- **Required state must be programmatic, not just an indicator.** The asterisk or the bold weight is the visual channel; the field must also expose required-ness. `recursica-skill-system-conventions` forbids a single channel.
- **The same is true of an optional marker.** If optionality is carried by a word, that word must be part of the label's announcement, not a floating fragment.
- **Do not hide the label visually.** Sighted keyboard and voice users need it too, and a visible label is a house requirement.
- **A group label must be announced when focus enters the group** — not just before it in reading order — or the user hears options with no question attached.
- **Do not stuff instructions into the label.** Rules go in the assistive element; a long label is announced in full every time the field is reached.

### Keyboard and non-mouse navigation

- **The label is not a tab stop.** It has no focusable behavior of its own.
- **Clicking or tapping the label must move focus to its control.** This comes free from a real associated label and is a genuine target-size benefit — do not break it by rendering the label as unassociated text.
- **If the label carries an edit icon, that icon is a control** and must be its own tab stop with its own accessible name.
- **A stacked label must not change the tab order.** Placement is visual; the sequence is label then field either way.

## Not your decision

Do not implement, override, or tune any of these — the component owns them:

- `label-text` and `optional-text` type styling, and `optional-text-opacity`.
- `required-indicator-gap`, `label-optional-text-gap`, `edit-icon-gap`.
- `colors`, including the error and disabled treatments.
- The gap between label and field — `globals.form.properties.label-field-gap-horizontal` and `label-field-gap-vertical`.

## Load these too

- [`recursica-skill-forms`](../../design-rules/recursica-skill-forms/SKILL.md) — label placement and alignment, the container-width trigger, one placement per form at any given breakpoint, required vs. optional policy, label copy, and group-level optionality.
- [`recursica-skill-assistive-element`](../recursica-skill-assistive-element/SKILL.md) — the help and error text below the field.
- [`recursica-skill-system-conventions`](../../design-rules/recursica-skill-system-conventions/SKILL.md) — never carry meaning in a single channel.

## Uncovered — ask, do not invent

- **The edit affordance on a label.** The kit reserves a gap for an edit icon; what it triggers, and on which fields, is unstated.
- **Which systemic signal marks required** when asterisks are avoided. Bold is given as an example, not a rule.
- **Whether the required indicator and optional text may both appear in one application** on different forms.
- **Label truncation** when the label is longer than the space in side-by-side placement.

## Pre-flight checklist

- [ ] Every control and every control group has a real label passed to the component.
- [ ] `layouts` matches the field's, and side-by-side was used unless the container is too narrow.
- [ ] `layouts` matches every other label in the same form — one placement per form at any given breakpoint, with no mixing between fields or sections, and no field's own width or height was allowed to override it.
- [ ] The label names the object, stands alone, uses active verbs, and carries no trailing colon.
- [ ] Only the exception is marked — required or optional, never both.
- [ ] No asterisk clutter; where the signal is systemic, the convention is stated once.
- [ ] Required and optional state is exposed programmatically, not by the visual marker alone.
- [ ] No label is visually hidden, and no rules or instructions were stuffed into it.
- [ ] A compound control has one label; a group's label is not doing an item's job.
- [ ] Clicking the label focuses its control.
- [ ] Any edit icon on the label is a tab stop with its own name.
- [ ] No layout, gap, or type treatment was overridden.
- [ ] Nothing in the uncovered list was invented.
