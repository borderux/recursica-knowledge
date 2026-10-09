---
name: recursica-skill-stepper
description: Rules for the Recursica stepper — when a form becomes multi-step instead of tabbed, sizes and orientation, step labels, Next and Back as actions, saving across steps, and announcing the step and moving focus. Use for wizards, multi-step forms, and checkout flows. Not for sections of one whole — see recursica-skill-tabs; not for past events — see recursica-skill-timeline.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Stepper

A stepper leads the persona through one process that has several steps. For example, a checkout has Shipping, Payment and Review steps. The stepper shows which step the persona is on.

## When to use a stepper

- **A form has several parts.** `recursica-skill-forms` sets the test for splitting a form into steps. A form passes the test when any one of the following is true:
  - The persona thinks of the parts as separate stages, such as Shipping and Payment.
  - The form has a very large number of fields.
  - An answer makes a _later_ step clearly different. For example, choosing "Pick up in store" changes the Delivery step.
- **A form would otherwise be split across tabs.** Never split a form across tabs. Use a stepper in place of the tabs. The stepper exists because of the ban on forms in tabs. `recursica-skill-navigation` sets the ban, and names the stepper as the replacement.
- **A setup flow for first-time use, or an onboarding flow, must be done in order.**
- **The screen shows the status of a step-by-step workflow with fixed stages in order**, such as Processing, Shipped, Delivered.

## When not to use a stepper

| Situation                                                           | Use instead                                                                                         |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| The steps can be done in any order                                  | One page. When the persona marks tasks done, use a checkbox group. See `recursica-skill-checkbox`.  |
| A short form that fits on one page                                  | One page, in a single column. See `recursica-skill-forms`.                                          |
| An answer changes only the field right below the answer             | Progressive disclosure on one page. See `recursica-skill-forms`.                                    |
| Sections of one whole that the persona switches between             | Tabs, each tab with its own route. See `recursica-skill-tabs`.                                      |
| Primary or secondary navigation for the application                 | Navigation. A stepper is not navigation. See `recursica-skill-navigation`.                          |
| A record of events that already happened, with timestamps           | A timeline. See `recursica-skill-timeline`.                                                         |
| Progress of a single operation, with no known end                   | A loader, or the submit button's loading look. See `recursica-skill-loader`.                        |
| Splitting a long form into steps only to make the form feel shorter | Nothing. Fix the form, and confirm the fix with the user. See `recursica-skill-system-conventions`. |

## Variants

**Use only the stepper variants and options that the Recursica MCP server lists for the theme (the design a designer sets in Theme Forge: the token values, and each component's variants, states and sizes).** A designer can add variants and options in Theme Forge, so each theme can differ. Get the list with the server's `recursica_get_component_doc` tool, and use the names the code uses. Never invent a variant or an option.

Each option below is described by role, such as "the smaller size". A name from the standard UI kit (the unchanged UI kit in the official Recursica release) is only an example.

- **The stepper has two sizes, a larger size and a smaller size.** In the standard UI kit, the size variant is `sizes`, with the options `large` and `small`.
- **The stepper has two orientations, horizontal and vertical.** In the standard UI kit, the orientation variant is `orientation`, with the options `horizontal` and `vertical`.
- **Each step has a step label, and may have a step description.** The step label is the step's name, such as "Payment". The step description is a second line of short text, such as "Card or bank transfer". Never put a paragraph in the step description.
- **A connector (the line between two steps) shows which steps are finished and which steps are upcoming.** A finished step's connector and an upcoming step's connector differ in thickness, and the stepper also uses color. A line's thickness and a color are a single visual channel (color, shape, position or text, each a separate signal). Progress must not rely on the connector's thickness and color alone. See "Accessibility" and `recursica-skill-system-conventions`.
- **The design-system website shows three step statuses: done, current and upcoming.** If the theme has a step-status variant, use the theme's step-status variant. Otherwise, the application supplies each step's status as data, not as a variant. In both cases, put each step's status into what assistive technology reads, such as "Shipping, complete".
- **If the theme has an error, warning, skipped or optional step state, use the theme's step state.** When a step fails validation, the step's text must say that the step failed validation. The step's text says so with or without one of the four step states.
- **A step indicator is the mark for one step on the stepper.** The design-system website shows a step number and a checkmark inside the step indicator. If the theme has a step number or a checkmark inside the step indicator, use the theme's version. See the open questions.

## Rules

**Make every step a stage the persona recognizes**, such as Shipping, Payment and Review in a checkout. If the steps do not match the stages in the persona's mental model (what a person expects, based on the tools and work the person already knows), put the form on one page. Cutting a form into random thirds adds clicks and does not make the form any easier.

**Label each step with the name of the stage**, such as "Shipping". Use the step description only for a short fragment that clarifies the step label, such as "Address and delivery date". `recursica-skill-forms` bans sentences in microcopy. Use the shortest text that gives the information.

**Make Next and Back buttons, not links.** Next and Back act on the process, not on a page or URL. `recursica-skill-buttons-links` and `recursica-skill-button` both state the rule that Next and Back are buttons. A Back button that changes the URL is navigation, not a step.

**Make Next the primary button at the bottom right, and put Back in the secondary style directly left of Next.** The primary button uses the primary style, `solid` in the standard UI kit. On the last step, the primary button is the submit button. The submit button changes to the disabled look with an animated icon, as `recursica-skill-button` describes. The submit button never changes to a blocking spinner or a blocking overlay.

**Keep each step's primary action disabled until the step is complete and valid.** For example, Next on the Shipping step stays disabled until the address is complete and valid. `recursica-skill-forms` forbids an enabled button that shows validation errors when clicked. The forms rule applies to each step.

**Do not add a second save mode for the stepper.** The application uses one of two save modes everywhere in the application:

- **Save all fields together.** Saving all fields together is the default. Nothing is saved until the final submit. Show no status message and no indicator of unsaved changes. The only signal to the persona is the primary button becoming enabled.
- **Save field by field.** If the application saves field by field instead, show a save status that stays on the page, such as "All changes saved".

Never mix the two save modes across steps. For example, never save the Shipping step field by field and the Payment step on submit.

**Lay out each step's content by the form rules, with no exceptions.** Use a single column, one field per line, and no custom spacing.

**Choose label placement once for the whole form, not once per step, and never once per field.** `recursica-skill-forms` allows two label placements:

- the label side by side with the field
- the label stacked above the field

`recursica-skill-forms` forbids both label placements at the same breakpoint. Apply the container-width test once, to the form:

- The test measures the step's container.
- If a label beside the label's field does not fit in the step's container, stack every field in every step.
- Stack the short fields that would have fit side by side too.
- The result sets the label placement of every field in the form.

Never put labels side by side in one step and stacked in another step.

**Never put the step's content, or any part of the form, inside a card.** See `recursica-skill-card`.

**If a horizontal stepper does not fit, use fewer steps or switch to the vertical orientation.** Do not switch to the smaller size to fit more steps. Do not make the stepper scroll horizontally. `recursica-skill-system-conventions` forbids working around a structural problem with a smaller size or a horizontal scroll.

**Keep the step count in the label text accurate.** "Step 3 of 5" must be true. When an answer adds or removes steps partway through the process, tell the persona that the step count changed. For example, an answer that adds a step changes "Step 2 of 4" to "Step 2 of 5".

## Accessibility

The rules below add to the accessibility baseline in `recursica-skill-system-conventions`, including the focus ring, which every Recursica component follows.

**Put every fact a sighted persona sees on the stepper at a glance into what assistive technology reads.** The stepper shows the current step and the progress with the step indicator, color, and the thickness of the connector. A screen reader reads none of the step indicator, the color, or the connector's thickness. A persona using a screen reader is most likely to lose track of the current step when the step changes.

### Screen readers

- **"Step 2 of 5" must be in what assistive technology reads.** Provide the current step's position and the total number of steps. Provide the position and the total as text, or as a value set on the stepper in code. With only a visual indicator, a persona using a screen reader cannot tell how many steps remain.
- **Announce each step's status in words: complete, current, or upcoming.** Never let the connector or a color be the only sign that a step is complete. The difference in connector thickness is one channel. A persona using a screen reader needs the step's status most, and cannot perceive the connector's thickness.
- **Make each step an item in an ordered list of steps**, announced in order. The persona hears every step in the process, in sequence.
- **Connect each step description to the step in code.** Never show the step description as a separate, unconnected line beside the step. A screen reader announces an unconnected step description out of context, or not at all.
- **Each step label must make sense without the layout around the step label.** A persona using a screen reader hears "Payment details" with no layout around the words to explain the words.
- **When the step changes, the new step must be perceivable.** Announce the new position and the new step's heading, such as "Step 3 of 5, Payment". A screen reader announces nothing when the screen changes, unless the change is announced on purpose.
- **When the persona can move between steps, make each step a real control with a name and a state.** The state is current, completed, or disabled. When the persona cannot move between steps, the steps must be plain text that cannot be operated. The plain-text steps must not be announced as buttons.
- **A step with an error must state the error in text.** The step's content must state the failure. If the step indicator is a control, the step indicator's accessible name (the name a screen reader reads out for a control) or state must state the failure too.

### Keyboard and non-mouse navigation

- **When the step changes, move focus on purpose to the start of the new step's content.** The start is the new step's heading or the new step's first field. Do not leave focus on the Next button. Focus left on Next causes two problems:
  - The next Tab from a persona using a keyboard lands in an unexpected place.
  - A persona using a screen reader cannot tell that the page changed.
- **Never move ahead automatically.** Finishing the last field of a step does not move the persona to the next step. The persona presses Next. `recursica-skill-forms` forbids moving focus for the persona.
- **A step indicator the persona cannot use to move between steps is not a tab stop** (a place the Tab key lands). The step indicator has no `tabindex`, no click handler, and no styling that makes the step indicator look focusable.
- **A step indicator the persona can use to move between steps is a real button.** The button is reachable by Tab in visual order, and Enter and Space press the button. Do not add a custom roving tabindex (where the arrow keys move between items that share one tab stop) to the step indicators.
- **The tab order within a step follows the visual order.** The order is the step's fields from top to bottom, then Back and Next in the footer. The single-column form layout keeps the tab order and the visual order the same.
- **Back must not lose the persona's place.** Going back to a step puts focus at the start of the step's content. The values the persona entered stay in the step's fields.
- **No content or control the persona needs may appear only on hover**, including a step's description.

## Styling set by tokens

**Never set or override the stepper's styling.** The theme sets every visual property of the stepper, such as size, spacing, borders, colors and animation. Do not add extra containers or spacers to change the stepper's look. If the design needs a look the theme does not give, report the missing look as a design-system gap. See `recursica-skill-design-router`.

## Related skills

- `recursica-skill-forms` — the form rules:
  - the test for a single page versus several steps
  - layout and labels within each step
  - when to validate
  - submit behavior
  - the rule of one save mode
- `recursica-skill-navigation` — the ban on spreading a form across tabs, and what counts as a location with a route.
- `recursica-skill-buttons-links` — Next and Back as actions, label wording, and placement in the footer.
- `recursica-skill-system-conventions` — never show meaning in only one channel, and fix the screen's structure instead of shrinking controls to fit.

### Only if used on the same screen

- `recursica-skill-tabs` — the tabs a stepper replaces in a form, and when to use tabs.
- `recursica-skill-card` — the reason a step's content never goes inside a card.

## Open questions

- **When to use the smaller size**, and which pages, panels, modals or other regions use the smaller size. No rule says.
- **When to use horizontal, and when vertical.** Both orientations exist. No rule says which orientation to use where, or whether the orientation may change with the container's width.
- **The maximum number of steps.** No number is stated.
- **Whether the persona can move between steps at all.** No rule says whether a persona may click back to a finished step. No rule says whether the persona can ever reach an upcoming step directly.
- **Whether each step gets a route and a browser history entry.** `recursica-skill-navigation` rules on views and tabs, not on steps. No rule says what the browser's Back button does in a stepper.
- **Validation across steps.** No rule says whether a step validates when the persona leaves the step. No rule says what going back does to the data the persona entered. `recursica-skill-forms` names this question as open too.
- **Whether a step may be optional or skipped**, and how an optional or skipped step shows in the step count.
- **What a step with an error looks like.** Confirm with the user only when the theme has no error state.
- **Whether the step indicator shows a number or a checkmark.** The design-system website shows both. Do not rely on a number or a checkmark without confirming with the user. Confirm with the user only when the theme has no number or checkmark in the step indicator.
- **Where the stepper sits relative to the step's content.** No rule says whether the stepper stays in view while the step's content scrolls.

## Pre-flight checklist

- [ ] The form passed the multi-step test, and was not cut up at random. The test passes on separate stages, a large number of fields, or an answer that changes a later step.
- [ ] No form is spread across tabs. A form that was spread across tabs became a stepper.
- [ ] The steps are in order and must be done in order. A task that can be done in any order did not become a stepper.
- [ ] Every size, orientation, and state is one the theme's UI kit lists. No error state, skipped state, or other state is invented.
- [ ] Each step label names the stage, and each step description is a short fragment, not a sentence.
- [ ] Next and Back are buttons, and neither button exists to change the URL.
- [ ] Next is the primary button at the bottom right, with Back in the secondary style beside Next. The final submit uses the button's disabled look with an animated icon, and no blocking overlay.
- [ ] The primary action stays disabled until the step is complete and valid.
- [ ] One save mode runs across the whole flow. By default, all fields save together at the final submit, with no status message and no unsaved-changes indicator. The flow saves field by field only if the whole system does. A flow that saves field by field shows a save status that stays on the page.
- [ ] Each step's content is in a single column, and not inside a card.
- [ ] One label placement runs across the whole form at each breakpoint: every field side by side, or every field stacked. The label placement is decided once, not for each step, and not for each field.
- [ ] "Step N of M" is in what assistive technology reads, not only on screen.
- [ ] Each step's status is announced in words, and completion is never shown by the connector or color alone.
- [ ] Each step description is connected to the step. Each step label makes sense without the layout around the step label.
- [ ] When the step changes, the new position and the new heading are announced. Focus moves to the start of the new step's content. Focus is never left on Next.
- [ ] Steps the persona can use to move between steps are real controls with names and states. Steps the persona cannot use to move between steps cannot receive focus.
- [ ] Nothing moves ahead automatically. Back restores the step with the persona's values, and puts focus at the start of the step.
- [ ] No styling is set or overridden on the stepper. No container or spacer is added to change the stepper's look.
- [ ] Open questions were asked about, not decided: the smaller size, horizontal or vertical orientation, the maximum number of steps, moving between steps, a route for each step, validation across steps, optional or skipped steps, what a step with an error looks like, a number or a checkmark in the step indicator, and where the stepper sits.
