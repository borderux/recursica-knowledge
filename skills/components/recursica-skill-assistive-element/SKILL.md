---
name: recursica-skill-assistive-element
description: Rules for the Recursica assistive element, the help and error text below a form field — help that states the rule up front, errors that restate it, why the error replaces the help, and how both are announced. Use for help text, hints, and validation messages. Not for the field's name — see recursica-skill-label.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Assistive element

One component, the assistive element, shows both the help text and the error text below a form field. The assistive element's type decides whether the help text or the error text shows.

## When to use an assistive element

- **A field has a rule the user needs to know before typing**, such as a format, a minimum, or a character requirement.
- **A field has failed validation**, and the user needs to know what to fix.

## When not to use an assistive element

| Situation                                                  | Use instead                                      |
| ---------------------------------------------------------- | ------------------------------------------------ |
| The text names the field                                   | A label. See `recursica-skill-label`.            |
| The text shows the form of a value inside the field        | The field's placeholder                          |
| The text reports a failure of the whole form or the server | A form-level error. See `recursica-skill-forms`. |
| The text confirms a success                                | A toast. See `recursica-skill-toast`.            |
| The text explains a whole section                          | Section-level copy. See `recursica-skill-forms`. |

## Variants

**Use only the assistive element variants and options that the Recursica MCP server lists for the project.** A designer can add variants and options in Theme Forge, so each project can differ. Get the list with the server's `recursica_get_component_doc` tool, and use the names the code uses. Never invent a variant or an option.

The rules below describe each option by role, such as "the error type". The names in the standard UI kit (the unchanged UI kit in the official Recursica release) are examples only.

- **A help type and an error type, in one place below the field.** The help type shows the help text. The error type shows the error text. In the standard UI kit, the variant is `types`, and the two types are `help` and `error`.
- **The error text replaces the help text in the same place.** The error text never appears beside the help text. Switching between the two types keeps the field the same height, so the form below the field does not move.
- **The standard UI kit has no warning type, no success type, and no info type.** If the project adds one of those types in Theme Forge, use the project's type. Do not invent a third state for a field that the project does not list.
- **An icon is part of the component.** The component sets the icon size and the gap between the icon and the text. The icon meets the requirement that an error have a signal that is not color.
- **The standard UI kit has no size variant.** In the standard UI kit, the space above the assistive element and the maximum width of the assistive element are fixed. If the project adds a size variant in Theme Forge, use the project's size variant.

## Rules

**State the field's rule in the help text, before the user breaks the rule.** Put formats, minimums, and character requirements in the help text. A user who knows the rule before typing does not make the error. Preventing an error is better than catching an error.

**Split a constraint that has several rules.** A password constraint with a minimum length and a special-character requirement is one example. Write the rules as short fragments separated by commas, or as bullets, so the user finds each rule at a glance. Never write a constraint with several rules as a paragraph.

**Restate the broken rule in the error text.** "Invalid input" is not an error message. "Enter a date in the past" is an error message.

**Never show the help text and the error text at the same time.** The assistive element shows one type at a time. If the user still needs the rule from the help text, put the rule in the error text.

**The error text is the whole message.** The help text is hidden while the error text shows. Put every detail the user still needs in the error text.

**Pair the error with a signal that is not color.** The signal is the component's icon, or the words of the message. `recursica-skill-system-conventions` requires a signal that is not color.

**Keep the assistive element under the field the text belongs to.** An assistive element placed midway between two fields does not show which field the text belongs to.

**The assistive element's position follows the field's label placement.** Every assistive element in a form uses the one label placement set for the whole form. `recursica-skill-forms` requires one label placement per form: side by side or stacked, never both at the same breakpoint. The container's width is tested once, for the whole form. The result sets the label placement for every field in the form. The standard UI kit has no placement variant for the assistive element. The position comes from where the field's label sits. Never position the assistive element separately from the label. The position of the assistive element never differs from field to field in one form. A whole form may switch label placement across breakpoints. A single section of a form never gets a separate label placement.

**Do not use the assistive element for marketing, reassurance, or filler text.** A user reads every line of help text and error text each time the user goes through the form.

## Accessibility

This component also follows the accessibility baseline in `recursica-skill-system-conventions`. Only the rules specific to this component are listed here.

The assistive element helps only when the code connects the assistive element to the field. A screen reader user who tabs straight into the input never hears text that sits near the field without a connection to the field. Tabbing into the input is the usual way to move through a form.

### Screen readers

- **Pass the help text and the error text through the field component**, never as a separate element beside or below the field. Only the field component can connect the help text and the error text to the input.
- **The help text is announced when the user reaches the field.** Write the help text to be heard at that moment, not as a caption read afterward.
- **When an error appears, the error must be announced.** An error that is only visual fails silently. Mark the field as invalid, and connect the error message to the field. Both steps are required.
- **The error message must make sense when read alone**, because the error message has replaced the help text. Restating the rule is not repetition. The error text is the only channel (color, shape, position or text, each a separate signal) left that states the rule.
- **The component's icon is decorative and must be silent.** The icon is the second visual signal. The words give the meaning.
- **Do not announce the same text twice.** If the message is connected to the field, do not also repeat the message in a live region (an area a screen reader announces automatically when its content changes).
- **Use the assistive element to announce only the results of the user's own actions.** A message under a field that the user did not prompt is confusing when a screen reader reads the form in order.

### Keyboard and non-mouse navigation

- **The assistive element is not a tab stop** (a place the Tab key lands), and must not contain a control. The assistive element holds text only.
- **Never require hover or focus to show the assistive element.** Help text stays on screen. A user who reads the form before filling in the form cannot read a rule that appears only on focus. A tooltip is not a substitute for help text.
- **Do not move focus when an error appears.** The user is in the middle of typing, and moving focus to the error message loses the user's place. `recursica-skill-forms` sets how focus moves on submit.
- **A field with an error must stay reachable in the same position.** Never reorder fields to group the errors together.

## Styling set by tokens

**Do not set or override the assistive element properties below.** The component sets each property.

- `text` styling for each type.
- `icon-size`, `icon-text-gap`, and the icon.
- `top-margin` and `max-width`.
- Error and help colors, which come from the field's tokens.

## Related skills

- `recursica-skill-forms` — when to validate, how errors show across a form, microcopy, the order that puts preventing an error before catching an error, and the rule of one label placement per form, which sets the assistive element's position.
- `recursica-skill-label` — the field's name, and which text belongs in the label instead of the assistive element.
- `recursica-skill-system-conventions` — showing every meaning in more than one channel.

## Open questions

- **Character and word counters.** No rule says whether a character counter or a word counter belongs in the assistive element or in a different place.
- **Confirming success on a field.** The standard UI kit has no success type. No rule says how to show a field that passed validation.
- **Links in help text.** No rule says whether help text may contain a link, given that the assistive element must not contain a control.
- **Several errors on one field at once.** No rule says whether the errors combine into one message, or only the first error shows.

## Pre-flight checklist

- [ ] The help text states every rule the user needs, before the user can break the rule.
- [ ] A constraint with several rules is split into fragments or bullets, not written as a paragraph.
- [ ] The error text restates the broken rule. No error text says "Invalid input".
- [ ] The error text replaces the help text. The help text and the error text never show together.
- [ ] The error has a signal that is not color.
- [ ] The help text and the error text are passed through the field component, not shown as a separate element beside the field.
- [ ] The assistive element's position follows the field's label placement. Every field in the form uses that one placement, as `recursica-skill-forms` requires.
- [ ] The error is announced when the error appears, and is not announced twice.
- [ ] The icon is silent, and the words give the meaning.
- [ ] The assistive element is not a tab stop, holds no control, and shows no text only on hover.
- [ ] Focus does not move when an error appears.
- [ ] Every type is one the project lists, such as the help type and the error type, and no third type is invented. Styling, margins, and width come from the component.
- [ ] Open questions were asked about, not decided: character and word counters, success on a field, links in help text, and several errors on one field.
