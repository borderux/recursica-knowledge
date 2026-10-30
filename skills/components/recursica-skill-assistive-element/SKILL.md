---
name: recursica-skill-assistive-element
description: Rules for the Recursica assistive element, the help and error text below a form field — help that states the rule up front, errors that restate the rule, why the error replaces the help, and how both are announced. Use for help text, hints, and validation messages. Not for the field's name — see recursica-skill-label.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.2.0
---

# Assistive element

The assistive element is the text below a form field. One component shows both help text and error text. The assistive element's type decides whether the help text or the error text shows.

## When to use an assistive element

- **A field has a rule the persona needs to know before typing.** Examples are a format, a minimum, or a character requirement.
- **A field has failed validation**, and the persona needs to know what to fix.

## When not to use an assistive element

| Situation                                                | Use instead                                                                       |
| -------------------------------------------------------- | --------------------------------------------------------------------------------- |
| The text names the field                                 | A label. See `recursica-skill-label`.                                             |
| The text shows what a value looks like, inside the field | The field's placeholder                                                           |
| The text reports a failure on the server                 | A toast or a banner. See `recursica-skill-feedback-messaging`.                    |
| The text sums up the errors of the whole form            | No rule yet. See the open question on error summaries in `recursica-skill-forms`. |
| The text confirms a success                              | `recursica-skill-feedback-messaging` decides whether a success gets any message.  |
| The text explains a whole section                        | Section-level copy, not an assistive element.                                     |

## Variants

**Use only the assistive element variants and options that the knowledge MCP server lists for the theme (the design a designer sets in Theme Forge: the token values, the components, and each component's variants, states and sizes).** A designer can add variants and options in Theme Forge, so each theme can differ. Get the list with the server's `component_api` tool, and use the names the code uses. Never invent a variant or an option.

The rules below describe each option by role, such as "the error type". The names in the standard UI kit (the unchanged UI kit in the official Recursica release) are examples only.

- **The assistive element shows help text or error text below the field.** An example of help text is "Use 8 or more characters". An example of error text is "Password is too short". A variant called the type decides which text shows. In the standard UI kit, the variant is `types`, with the options `help` and `error`.
- **The error text replaces the help text in the same place below the field.** The error text never appears beside the help text. The field keeps the same height when the type switches. The form below the field does not move.
- **Do not invent a third state for a field that the theme does not list.** A third state is any state beyond the help type and the error type.
- **The assistive element shows an icon.** The icon gives an error a signal that is not color.
- **If the theme has a size variant, use the theme's size variant.**

## Rules

**State the field's rule in the help text, before the persona breaks the rule.** For example, a Password field shows "Use 8 or more characters" before the persona types. Put these rules in the help text:

- formats, such as a date format
- minimums
- character requirements

A persona who knows the rule before typing does not break the rule. Preventing an error is better than catching an error.

**Split a constraint that has several rules.** For example, a password constraint needs 8 or more characters and one special character.

- Write the rules as short fragments separated by commas, such as "8 or more characters, one special character".
- Or write the rules as bullets.
- Never write the rules as a paragraph.

Split rules let the persona find each rule at a glance.

**Restate the broken rule in the error text.** For example, write "Enter a date in the past". "Invalid input" is not an error message.

**Never show the help text and the error text at the same time.** The assistive element shows one type at a time. While the error text shows, the help text is hidden.

**Make the error text the whole message.** Put every detail the persona still needs in the error text. If the persona still needs the rule from the help text, put the rule in the error text.

**Pair the error with a signal that is not color.** The signal is the assistive element's icon, or the words of the error message. `recursica-skill-design-system-conventions` requires a signal that is not color.

**Place the assistive element under the field the text describes.** Text placed midway between two fields does not show which field the text describes.

**Make the assistive element's position follow the field's label placement.** Never position the assistive element separately from the label. `recursica-skill-forms` requires one label placement per form:

- A form uses one label placement: side by side or stacked. A form never uses both at the same breakpoint.
- Test the width of the form's container once, for the whole form. The result sets the label placement for every field in the form.
- A whole form may switch label placement across breakpoints. A single section of a form never gets a separate label placement.

Every assistive element in a form follows that one label placement. The assistive element's position never differs from field to field in one form.

**Do not use the assistive element for marketing, reassurance, or filler text.** For example, never write "Trusted by 10,000 teams" or "Almost done!" below a field. A persona reads every line of help text and error text each time the persona goes through the form.

**Never show a success message or a success mark on a field.** For example, never show a check mark below a valid email address. `recursica-skill-feedback-messaging` decides whether a success gets any message.

## Accessibility

The rules below add to the accessibility baseline in `recursica-skill-design-system-conventions`, which every Recursica component follows.

The assistive element helps only when the code connects the assistive element to the field. Tabbing from input to input is the usual way to move through a form. A persona using a screen reader who tabs into an input never hears unconnected text near the input.

### Screen readers

- **Set the help text and the error text on the field component, such as a text field.** Never add the help text or the error text as a separate element beside or below the field. Only the field component can connect the help text and the error text to the input.
- **The help text is announced when the persona reaches the field.** Write the help text to be heard as the persona reaches the field. Do not write the help text as a caption read after the field.
- **When an error appears, the error must be announced.** A screen reader never announces an error that only shows on screen. Take both steps:
  - Mark the field as invalid.
  - Connect the error message to the field.
- **The error message must make sense when read alone**, because the error message has replaced the help text. Restating the rule in the error text is not repetition. The error text is the only channel (color, shape, position or text, each a separate signal) left that states the rule.
- **The assistive element's icon is decorative, and a screen reader must not announce the icon.** The icon is a second visual signal, after color. The words of the message give the meaning.
- **Do not announce the same text twice.** If the assistive element's message is connected to the field, do not also repeat the message in a live region (an area of the page that a screen reader announces automatically when the area's content changes).
- **Use the assistive element to announce only the results of the persona's own actions.** For example, show "Email is already in use" after the persona leaves the email field, not when the page loads. A screen reader can read the whole form in order. A message under a field that the persona did not cause then confuses the persona.

### Keyboard and non-mouse navigation

- **The assistive element is not a tab stop** (a place the Tab key lands), and must not contain a control. The assistive element holds text only.
- **Never require hover or focus to show the assistive element.** Help text stays on screen. A persona who reads the form before filling in the form cannot read a rule that appears only on focus. A tooltip does not replace help text.
- **Do not move focus when an error appears.** The persona is in the middle of typing, and moving focus to the error message loses the persona's place. `recursica-skill-forms` sets how focus moves on submit.
- **A field with an error must stay in the same position and stay reachable.** Never reorder fields to group the errors together.

## Styling set by tokens

**Never set or override the assistive element's styling.** The theme sets every visual property of the assistive element, such as size, spacing, borders, colors and animation. Do not add extra containers or spacers to change the assistive element's look. If the design needs a look the theme does not give, report the missing look as a design-system gap. See `recursica-skill-design-router`.

## Related skills

- `recursica-skill-forms` — when to validate, how errors show across a form, and microcopy. The forms skill also puts preventing an error before catching an error. The forms skill also sets one label placement per form, and that label placement sets the assistive element's position.
- `recursica-skill-label` — the field's name, and which text belongs in the label instead of the assistive element.
- `recursica-skill-design-system-conventions` — showing every meaning in more than one channel.

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
- [ ] Every type is one the theme lists, such as the help type and the error type. No third type is invented.
- [ ] No styling is set or overridden on the assistive element. No container or spacer is added to change the assistive element's look.
- [ ] Open questions were asked about, not decided: character and word counters, links in help text, and several errors on one field.
