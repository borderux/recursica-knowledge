---
name: recursica-skill-assistive-element
description: How to use the Recursica assistive element, the help and error text below a form field — help that states the rule up front, errors that restate it, why the error replaces the help, and how both are announced. Use for help text, hints, and validation messages. Not for the field's name — see recursica-skill-label.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Assistive element

One component shows both the help text and the error text below a field. Its type decides which one.

## Use it when

- **A field has a rule the user needs to know before they type** — a format, a minimum, a character requirement.
- **A field has failed validation**, and the user needs to know what to fix.

## Do not use it when

| Instead of an assistive element                     | Use                                                         |
| --------------------------------------------------- | ----------------------------------------------------------- |
| Naming the field                                    | `recursica-skill-label`                                     |
| Showing the form of a value inside the field        | The field's placeholder                                     |
| Reporting a failure of the whole form or the server | Form-level error presentation — see `recursica-skill-forms` |
| Confirming that something succeeded                 | `recursica-skill-toast`                                     |
| Explaining a whole section                          | Section-level copy — see `recursica-skill-forms`            |

## What exists

Taken from the UI kit (the token file, `recursica_ui-kit.json`, that says which variants and states each component has) → `ui-kit.components.assistive-element`.

**The third column is the React prop that sets each axis.** An axis (a property a component varies on, such as size or style; Figma calls it a variant property) is named in the UI kit. Its name is not a prop, and if you pass it as one, React quietly ignores it. A blank cell means no single prop sets that axis — it is set by CSS state or by separate props, and the rules below say which.

| Axis    | Options         | React prop         |
| ------- | --------------- | ------------------ |
| `types` | `help`, `error` | `assistiveVariant` |

**Two types, one slot.** This is how the house rule works: the error does not appear alongside the help text — it replaces it. Swapping types keeps the field's height the same, so the form below does not shift.

**There is no warning type, no success type, and no info type.** Do not invent a third state for a field.

**An icon is part of the component** — it defines an `icon-size` and an `icon-text-gap`. That icon is what meets the requirement for an error to have a signal that is not color.

**There is no size axis.** `top-margin` and `max-width` are fixed properties.

## Rules for using it

**Help text states the rule before the user breaks it.** Formats, minimums, character requirements — the things that stop an error from happening. Preventing an error beats catching it.

**Break apart a constraint that has several rules.** A password rule with a minimum length and a special-character requirement becomes short fragments separated by commas, or bullets — easy to scan as separate rules, never a paragraph to work through.

**The error text restates the rule that was broken.** "Invalid input" is not an error message. "Enter a date in the past" is.

**Never show help and error at the same time.** One slot, one type. If the rule still needs saying, it belongs in the error message.

**The error text is the message, so it carries the whole meaning.** Because the help text is gone while the error shows, anything the user still needs must be in the error.

**Pair the error with a signal that is not color** — the component's icon, or the message itself. Required by `recursica-skill-system-conventions`.

**Keep it under the field it belongs to.** An assistive element floating between two fields belongs to neither one.

**Its position follows the field's label placement, so it takes on the form's single placement decision.** `recursica-skill-forms` requires one label placement per form — side by side or stacked, never both at the same breakpoint. The container-width test is applied once, to the form, and it governs every field in it. This element has no placement axis of its own: wherever the field's label sits, this element's position follows from it. So it is never placed on its own, and it never differs from field to field inside one form. A whole form may switch placement across breakpoints; a single section never gets its own.

**Do not use it for marketing, reassurance, or padding.** Every line here is read on every pass through the form.

## Accessibility

This component also follows the accessibility baseline in `recursica-skill-system-conventions`. Only what is specific to it is listed here.

This component only works if the field it belongs to knows about it. Text shown near a field but not connected to it is invisible to a screen reader user who tabs straight into the input — which is the normal way of moving through a form.

### Screen readers

- **Pass the help and error text through the field component**, never as a separate element you place beside or below it. Only the field can connect them to the input.
- **The help text is announced as part of reaching the field.** Write it to be heard at that moment, not as a caption read afterward.
- **When an error appears, it must be announced** — an error that is only visual is a silent failure. The field being marked invalid and the message being connected to it are both required.
- **The error message must make sense on its own**, because it has replaced the help text. Restating the rule is not repetition; it is the only channel (color, shape, position or text, each a separate signal) left.
- **The component's icon is decorative and must be silent.** It is the second visual signal; the words carry the meaning.
- **Do not announce the same text twice.** If the message is connected to the field, do not also put it in a live region (an area a screen reader announces automatically when its content changes) that repeats it.
- **Do not use it to announce anything the user did not do.** Unprompted messages under a field are confusing when they are read in order.

### Keyboard and non-mouse navigation

- **It is not a tab stop** (a place the Tab key lands), and it must not contain a control. Text only.
- **Never require hover or focus to reveal it.** Help text stays on screen. A rule that appears only on focus cannot be read by someone reading the form before filling it in — and a tooltip is not a substitute.
- **Do not move focus when an error appears.** The user is in the middle of typing, and pulling focus to the message loses their place. Managing focus on submit belongs to `recursica-skill-forms`.
- **A field with an error must stay reachable in its place** — never reorder fields to group the errors together.

## Decided elsewhere

Do not implement, override, or tune any of these — the component owns them:

- `text` styling per type.
- `icon-size`, `icon-text-gap`, and the icon itself.
- `top-margin` and `max-width`.
- Error and help colors, which come from the field's tokens.

## Load these too

- `recursica-skill-forms` — validation timing, error presentation across a form, microcopy, the prevention-first order, and the one-label-placement-per-form rule this element's position inherits.
- `recursica-skill-label` — the field's name, and what belongs there rather than here.
- `recursica-skill-system-conventions` — never carry meaning in a single channel.

## Uncovered — ask, do not invent

- **Character and word counters.** Whether they live in this component or somewhere else.
- **Confirming success on a field** — there is no success type, so a field that validated correctly has no stated treatment.
- **Whether help text may contain a link**, given that it must not contain a control.
- **Several errors on one field at once** — whether they combine into one message, or the first one wins.

## Pre-flight checklist

- [ ] Every rule the user needs is stated in `help` before they can break it.
- [ ] Constraints with several rules are broken into fragments or bullets, not a paragraph.
- [ ] The error text restates the rule that was broken, with no "Invalid input".
- [ ] The error replaces the help text; the two never show together.
- [ ] The error has a signal that is not color.
- [ ] Both are passed through the field component, not shown separately beside it.
- [ ] Its position follows the field's label placement, which is the one placement every field in that form uses — as `recursica-skill-forms` requires.
- [ ] The error is announced when it appears, and is not announced twice.
- [ ] The icon is silent, and the words carry the meaning.
- [ ] Nothing here is a control or a tab stop, and nothing is revealed only on hover.
- [ ] Focus does not move when an error appears.
- [ ] You invented no third type, and overrode no styling, margin, or width.
- [ ] You invented nothing from the uncovered list.
