---
name: recursica-skill-assistive-element
description: How to use the Recursica assistive element correctly — the single component that renders both help text and error text below a form field, with types help and error. Covers writing help text that states the rule before the user breaks it, error copy that restates the rule rather than saying "invalid", why the error replaces the help text instead of joining it, the non-color indicator requirement, and the screen-reader requirements for announcing help and errors. Use whenever adding, reviewing, or refactoring the text below a field, an error message, a validation message, or field-level guidance. Trigger on "help text", "helper text", "assistive text", "hint text", "error message", "validation message", "field error", "invalid input", "screen reader", or a question about what to put under a field. Do NOT use for the field's name — that is recursica-skill-label. Do NOT use for validation timing, submit behavior, or where errors appear across a whole form — that is recursica-skill-forms.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Assistive element

One component renders both the help text and the error text below a field. The type decides which.

## Use it when

- **A field has a rule the user needs before they type** — a format, a minimum, a character requirement.
- **A field has failed validation** and the user needs to know what to fix.

## Do not use it when

| Instead of an assistive element                | Use                                                         |
| ---------------------------------------------- | ----------------------------------------------------------- |
| Naming the field                               | `recursica-skill-label`                                     |
| Showing the shape of a value inside the field  | The field's placeholder                                     |
| Reporting a whole-form or server-level failure | Form-level error presentation — see `recursica-skill-forms` |
| Confirming that something succeeded            | `recursica-skill-toast`                                     |
| Explaining a whole section                     | Section-level copy — see `recursica-skill-forms`            |

## What exists

Taken from `recursica_ui-kit.json` → `ui-kit.components.assistive-element`.

| Axis    | Options         |
| ------- | --------------- |
| `types` | `help`, `error` |

**Two types, one slot.** This is the mechanism behind the house rule: the error does not appear alongside the help text, it replaces it. Swapping types keeps the field's height stable so the form below does not shift.

**There is no warning type, no success type, and no info type.** Do not invent a third state for a field.

**An icon is part of the component** — it defines an `icon-size` and an `icon-text-gap`. That icon is what satisfies the non-color requirement on an error.

**There is no size axis.** `top-margin` and `max-width` are fixed properties.

## Rules for using it

**Help text states the rule before the user breaks it.** Formats, minimums, character requirements — the things that stop an error from happening. Prevention beats validation.

**Break a multi-rule constraint apart.** A password rule with a length minimum and a special-character requirement becomes comma-separated fragments or bullets, scannable as discrete rules — never a paragraph to parse.

**Error copy restates the rule that was broken.** "Invalid input" is not an error message. "Enter a date in the past" is.

**Never show help and error at the same time.** One slot, one type. If the rule still needs saying, it belongs in the error message.

**The error text is the message, so it carries the whole meaning.** Because the help text is gone while the error shows, anything the user still needs must be in the error.

**Pair the error with a non-color indicator** — the component's icon, or the message itself. Required by `recursica-skill-system-conventions`.

**Keep it under the field it belongs to.** An assistive element floating between two fields belongs to neither.

**Its position follows the field's label placement, so it inherits the form's single placement decision.** `recursica-skill-forms` requires **one label placement per form — side-by-side or stacked, never both at the same breakpoint** — with the container-width test applied once, to the form, governing every field in it. This element has no placement axis of its own: wherever the field's label sits, this element's position follows from it. So it is never positioned independently, and it never differs from field to field inside one form. A whole form may switch across breakpoints; a section never gets its own.

**Do not use it for marketing, reassurance, or padding.** Every line here is read on every pass through the form.

## Accessibility

This component only works if the field it belongs to knows about it. Text rendered near a field but not associated with it is invisible to a screen reader user who tabs straight into the input — which is the normal way of moving through a form.

### Screen readers

- **Pass the help and error text through the field component**, never as a loose element you place beside or below it. Only the field can associate them with the input.
- **The help text is announced as part of reaching the field.** Write it to be heard in that position, not as a caption read afterward.
- **When an error appears, it must be announced** — a visual-only error is a silent failure. The field being marked invalid and the message being associated are both required.
- **The error message must be self-sufficient**, because it has replaced the help text. Restating the rule is not redundancy; it is the only channel left.
- **The component's icon is decorative and must be silent.** It is the second visual channel; the words carry the meaning.
- **Do not announce the same text twice.** If the message is associated with the field, do not also put it in a live region that repeats it.
- **Do not use it to announce anything the user did not do.** Unprompted messages under a field are disorienting when read in sequence.

### Keyboard and non-mouse navigation

- **It is not a tab stop**, and must not contain a control. Text only.
- **Never require hover or focus to reveal it.** Help text is persistent — a rule that only appears on focus is unavailable to someone reading the form before filling it in, and a tooltip is not a substitute.
- **Do not move focus when an error appears.** The user is mid-entry; yanking focus to the message loses their place. Focus management on submit belongs to `recursica-skill-forms`.
- **A field with an error must remain reachable in place** — never reorder fields to group errors.

## Not your decision

Do not implement, override, or tune any of these — the component owns them:

- `text` styling per type.
- `icon-size`, `icon-text-gap`, and the icon itself.
- `top-margin` and `max-width`.
- Error and help colors, which come from the field's tokens.

## Load these too

- [`recursica-skill-forms`](../../design-rules/recursica-skill-forms/SKILL.md) — validation timing, error presentation across a form, microcopy, the prevention-first order, and the one-label-placement-per-form rule this element's position inherits.
- [`recursica-skill-label`](../recursica-skill-label/SKILL.md) — the field's name, and what belongs there rather than here.
- [`recursica-skill-system-conventions`](../../design-rules/recursica-skill-system-conventions/SKILL.md) — never carry meaning in a single channel.

## Uncovered — ask, do not invent

- **Character and word counters.** Whether they live in this component or elsewhere.
- **Success confirmation on a field** — no success type exists, so a validated-good field has no stated treatment.
- **Whether help text may contain a link**, given that it must not contain a control.
- **Multiple simultaneous errors on one field** — whether they combine into one message or the first wins.

## Pre-flight checklist

- [ ] Every rule the user needs is stated in `help` before they can break it.
- [ ] Multi-rule constraints are broken into fragments or bullets, not a paragraph.
- [ ] Error copy restates the rule broken; no "Invalid input".
- [ ] The error replaces the help text; the two never show together.
- [ ] The error carries a non-color indicator.
- [ ] Both are passed through the field component, not rendered loose beside it.
- [ ] Its position follows the field's label placement, which is the one placement used by every field in that form — per `recursica-skill-forms`.
- [ ] The error is announced when it appears, and not announced twice.
- [ ] The icon is silent; the words carry the meaning.
- [ ] Nothing here is a control, a tab stop, or hover-revealed.
- [ ] Focus is not moved when an error appears.
- [ ] No third type was invented; no styling, margin, or width was overridden.
- [ ] Nothing in the uncovered list was invented.
