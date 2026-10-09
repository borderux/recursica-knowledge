---
name: recursica-skill-assistive-element
description: Rules for the Recursica assistive element, the help and error text below a form field — help that states the rule up front, errors that restate the rule, why the error replaces the help, and how both are announced. Use for help text, hints, and validation messages. Not for the field's name — see recursica-skill-label.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Assistive element

The assistive element is one component that shows both help text and error text below a form field. The assistive element has a type, and the type decides whether the help text or the error text shows.

## When to use an assistive element

- **A field has a rule the persona needs to know before typing.** Example rules include a format, a minimum, or a character requirement.
- **A field has failed validation**, and the persona needs to know what to fix.

## When not to use an assistive element

| Situation                                                  | Use instead                                      |
| ---------------------------------------------------------- | ------------------------------------------------ |
| The text names the field                                   | A label. See `recursica-skill-label`.            |
| The text shows what a value looks like, inside the field   | The field's placeholder                          |
| The text reports a failure of the whole form or the server | A form-level error. See `recursica-skill-forms`. |
| The text confirms a success                                | A toast. See `recursica-skill-toast`.            |
| The text explains a whole section                          | Section-level copy. See `recursica-skill-forms`. |

## Variants

**Use only the assistive element variants and options that the Recursica MCP server lists for the project.** A designer can add variants and options in Theme Forge, so each project can differ. Get the list with the server's `recursica_get_component_doc` tool, and use the names the code uses. Never invent a variant or an option.

The rules below describe each option by role, such as "the error type". The names in the standard UI kit (the unchanged UI kit in the official Recursica release) are examples only.

- **The assistive element shows help text or error text below the field.** An example of help text is "Use 8 or more characters". An example of error text is "Password is too short". A variant called the type decides which text shows. In the standard UI kit, the variant is `types`, with the options `help` and `error`.
- **The error text replaces the help text in the same place below the field.** The error text never appears beside the help text. Switching between the two types keeps the field the same height. The form below the field does not move.
- **Do not invent a third state for a field that the project does not list.** A third state is a state beyond the help type and the error type.
- **The assistive element shows an icon.** The icon gives an error a signal that is not color.
- **If the project has a size variant, use the project's size variant.**

## Rules

**State the field's rule in the help text, before the persona breaks the rule.** Put formats, minimums, and character requirements in the help text. A persona who knows the rule before typing does not break the rule. Preventing an error is better than catching an error.

**Split a constraint that has several rules.** One example is a password constraint with a minimum length and a special-character requirement. Write the rules as short fragments separated by commas, or as bullets. Never write a constraint with several rules as a paragraph. Split rules let the persona find each rule at a glance.

**Restate the broken rule in the error text.** "Invalid input" is not an error message. "Enter a date in the past" is an error message.

**Never show the help text and the error text at the same time.** The assistive element shows one type at a time. The help text is hidden while the error text shows.

**Make the error text the whole message.** Put every detail the persona still needs in the error text. If the persona still needs the rule from the help text, put the rule in the error text.

**Pair the error with a signal that is not color.** The signal is the assistive element's icon, or the words of the error message. `recursica-skill-system-conventions` requires a signal that is not color.

**Keep the assistive element under the field the text belongs to.** An assistive element placed midway between two fields does not show which field the text belongs to.

**Make the assistive element's position follow the field's label placement.** Never position the assistive element separately from the label. `recursica-skill-forms` requires one label placement per form: side by side or stacked, never both at the same breakpoint. Test the width of the form's container once, for the whole form. The result of that test sets the label placement for every field in the form. Every assistive element in a form follows that one label placement. The position of the assistive element never differs from field to field in one form. A whole form may switch label placement across breakpoints. A single section of a form never gets a separate label placement.

**Do not use the assistive element for marketing, reassurance, or filler text.** A persona reads every line of help text and error text each time the persona goes through the form.

**Never show a success message or a success mark on a field.** A success confirmation goes in a toast. See `recursica-skill-toast`.

## Accessibility

The rules below add to the accessibility baseline in `recursica-skill-system-conventions`, which every Recursica component follows.

The assistive element helps only when the code connects the assistive element to the field. When a persona using a screen reader tabs straight into the field's input, the persona never hears unconnected text nearby. Tabbing from input to input is the usual way to move through a form.

### Screen readers

- **Set the help text and the error text on the field component.** Never add the help text or the error text as a separate element beside or below the field. Only the field component can connect the help text and the error text to the input.
- **The help text is announced when the persona reaches the field.** Write the help text to be heard as the persona reaches the field. Do not write the help text as a caption read after the field.
- **When an error appears, the error must be announced.** An error that is only visual is never announced. Mark the field as invalid, and connect the error message to the field. Both steps are required.
- **The error message must make sense when read alone**, because the error message has replaced the help text. Restating the rule in the error text is not repetition. The error text is the only channel (color, shape, position or text, each a separate signal) left that states the rule.
- **The assistive element's icon is decorative, and a screen reader must not announce the icon.** The icon is a second visual signal, after color. The words of the message give the meaning.
- **Do not announce the same text twice.** If the assistive element's message is connected to the field, do not also repeat that message in a live region (an area of the page that a screen reader announces automatically when the area's content changes).
- **Use the assistive element to announce only the results of the persona's own actions.** A screen reader can read the form in order. A message under a field that no action of the persona caused then confuses the persona.

### Keyboard and non-mouse navigation

- **The assistive element is not a tab stop** (a place the Tab key lands), and must not contain a control. The assistive element holds text only.
- **Never require hover or focus to show the assistive element.** Help text stays on screen. A persona who reads the form before filling in the form cannot read a rule that appears only on focus. A tooltip does not replace help text.
- **Do not move focus when an error appears.** The persona is in the middle of typing, and moving focus to the error message loses the persona's place. `recursica-skill-forms` sets how focus moves on submit.
- **A field with an error must stay in the same position and stay reachable.** Never reorder fields to group the errors together.

## Styling set by tokens

**Never set or override the assistive element's styling.** The theme sets every visual property of the assistive element, such as size, spacing, borders, colors and animation. Do not add extra containers or spacers to change the assistive element's look. If the design needs a look the theme does not give, raise the gap. See `recursica-skill-design-router`.

## Related skills

- `recursica-skill-forms` — when to validate, how errors show across a form, and microcopy. The skill also covers the order that puts preventing an error before catching an error. The skill also holds the rule of one label placement per form, which sets the assistive element's position.
- `recursica-skill-label` — the field's name, and which text belongs in the label instead of the assistive element.
- `recursica-skill-system-conventions` — showing every meaning in more than one channel.

## Open questions

- **Character and word counters.** No rule says whether a character counter or a word counter belongs in the assistive element or in another place.
- **Links in help text.** No rule says whether help text may contain a link, given that the assistive element must not contain a control.
- **Several errors on one field at once.** No rule says whether the errors combine into one message, or only the first error shows.

## Pre-flight checklist

- [ ] The help text states every rule the persona needs, before the persona can break the rule.
- [ ] A constraint with several rules is split into fragments or bullets, not written as a paragraph.
- [ ] The error text restates the broken rule. No error text says "Invalid input".
- [ ] The error text replaces the help text. The help text and the error text never show together.
- [ ] The error has a signal that is not color.
- [ ] The help text and the error text are set on the field component. Neither text shows as a separate element beside the field.
- [ ] The assistive element's position follows the field's label placement. Every field in the form uses that one placement, as `recursica-skill-forms` requires.
- [ ] The error is announced when the error appears, and is not announced twice.
- [ ] A screen reader does not announce the icon, and the words of the message give the meaning.
- [ ] The assistive element is not a tab stop, holds no control, and shows no text only on hover.
- [ ] Focus does not move when an error appears.
- [ ] Every type is one the project lists, such as the help type and the error type. No third type is invented.
- [ ] No styling is set or overridden on the assistive element. No container or spacer is added to change the assistive element's look.
- [ ] Open questions were asked about, not decided: character and word counters, links in help text, and several errors on one field.
