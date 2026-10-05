---
name: recursica-skill-stepper
description: Rules for the Recursica stepper — when a form becomes multi-step instead of tabbed, sizes and orientation, step labels, Next and Back as actions, saving across steps, and announcing the step and moving focus. Use for wizards, multi-step forms, and checkout flows. Not for sections of one whole — see recursica-skill-tabs; not for past events — see recursica-skill-timeline.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Stepper

A stepper leads the user through one process that has several steps. The stepper shows which step of the process the user is on.

## When to use a stepper

- **A form has several parts.** `recursica-skill-forms` sets the test for splitting a form into steps: stages the user thinks of as separate, a very large number of fields, or an answer that makes a _later_ step clearly different.
- **A form would otherwise be split across tabs.** Splitting a form across tabs is forbidden, and the stepper replaces the tabs.
- **A first-time setup flow or an onboarding flow** must be worked through in order.
- **The screen shows the status of a step-by-step workflow**, such as Processing, Shipped, Delivered, where the stages are fixed and in order.

## When not to use a stepper

| Situation                                                           | Use instead                                                                                                              |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| The steps can be done in any order                                  | One page. No checklist component exists. When the user marks tasks done, use checkboxes. See `recursica-skill-checkbox`. |
| A short form that fits on one page                                  | One page, in a single column. See `recursica-skill-forms`.                                                               |
| An answer changes only the field right below the answer             | Progressive disclosure on one page. See `recursica-skill-forms`.                                                         |
| Sections of one whole that the user switches between                | Tabs, each tab with its own route. See `recursica-skill-tabs`.                                                           |
| Primary or secondary navigation for the application                 | Navigation. A stepper is not navigation. See `recursica-skill-navigation`.                                               |
| A record of events that already happened, with timestamps           | A timeline. See `recursica-skill-timeline`.                                                                              |
| Progress of a single operation, with no known end                   | A loader, or the submit button's loading look. See `recursica-skill-loader`.                                             |
| Splitting a long form into steps only to make the form feel shorter | Nothing. Fix the form. See `recursica-skill-system-conventions`.                                                         |

**Never spread a form across tabs.** The stepper exists because a form must never be spread across tabs. `recursica-skill-navigation` sets the ban, and names the stepper as the replacement. When form fields would go in tabs, use a stepper instead.

## Variants

**Use only the stepper variants and options that the Recursica MCP server lists for the project.** A designer can add variants and options in Theme Forge, so each project can differ. Get the list with the server's `recursica_get_component_doc` tool, and use the names the code uses. Never invent a variant or an option.

The rules below describe each option by role, such as "the smaller size". The names in the standard UI kit (the unchanged UI kit in the official Recursica release) are examples only.

- **Two sizes, a larger size and a smaller size.** In the standard UI kit, the size variant is `sizes`, with the options `large` and `small`.
- **Two orientations, horizontal and vertical.** In the standard UI kit, the orientation variant is `orientation`, with the options `horizontal` and `vertical`.
- **A step label and an optional step description.** Each step has a name, the step label. A step may also have a second line, the step description, for a short description. Never put a paragraph in the step description.
- **A connector (the line between steps) that shows finished steps apart from upcoming steps.** The connector of a finished step and the connector of an upcoming step differ in thickness, and the stepper also uses color. A line's thickness and a color are a single visual channel (color, shape, position or text, each a separate signal). Progress must not rely on the connector's thickness and color alone. See the accessibility section and `recursica-skill-system-conventions`.
- **Step status.** The design-system website shows done, current and upcoming steps. If the project has a step-status variant, use the project's step-status variant. Otherwise, a step's status is data the application supplies, not a variant. In both cases, state each step's status in what assistive technology reads.
- **Error, warning, skipped and optional steps.** If the project has an error, warning, skipped or optional step state, use the project's step state. Whether or not the project has one of the four step states, the step's text must say that the step failed validation.
- **Step number or checkmark.** A step indicator is the mark for one step on the stepper. The design-system website shows a step number and a checkmark inside the step indicator. If the project has a step number or a checkmark inside the step indicator, use the project's version. See the open questions.

## Rules

**Make every step a stage the user recognizes.** Cutting a form into random thirds adds clicks and does not make the form any easier. If the steps do not match the stages in the user's mental model (what a person expects, based on the tools and work the person already knows), put the form on one page.

**Label each step with the name of the stage.** Use the step description only for a short fragment that clarifies the step label. `recursica-skill-forms` bans sentences in microcopy. Use the shortest text that gives the information.

**Next and Back are buttons, not links.** Next and Back act on the process, not on a page or URL. `recursica-skill-buttons-links` and `recursica-skill-button` both state this rule. A Back button that changes the URL is navigation, not a step.

**Next is the primary button at the bottom right, with Back in the secondary style directly to the left of Next.** The primary button uses the primary style, `solid` in the standard UI kit. On the last step, the primary action is the submit. The submit button changes to the disabled look with an animated icon, as `recursica-skill-button` describes. The submit button never changes to a blocking spinner or a blocking overlay.

**Keep each step's primary action disabled until the step is complete and valid.** `recursica-skill-forms` forbids an enabled button that shows validation errors when clicked. The forms rule applies to each step.

**The stepper does not add a second save mode.** The application either saves field by field everywhere in the application, or saves all fields together everywhere in the application. Saving all fields together is the default. In the default mode, nothing is saved until the final submit. In the default mode, show no status message and no indicator of unsaved changes. The enabled primary button is the only signal to the user. If the system saves field by field instead, show a save status that stays on the page. Never mix the two save modes across steps.

**Lay out each step's content by the form rules, with no exceptions.** Use a single column, one field per line, and no custom spacing.

**Choose label placement once for the whole form, not once per step, and never once per field.** `recursica-skill-forms` allows labels side by side with the field or stacked above the field, and forbids both at the same breakpoint. Apply the container-width test once, to the form. The result sets the label placement of every field in the form. The test measures the step's container. If a label and the label's field do not fit side by side in the step's container, stack every field in every step, including the short fields that would have fit side by side. Never put labels side by side in one step and stacked in another step.

**Never put the step's content, or any part of the form, inside a card.** See `recursica-skill-card`.

**If a horizontal stepper does not fit, use fewer steps or switch to the vertical orientation.** Do not switch to the smaller size to fit more steps. Do not make the stepper scroll horizontally. `recursica-skill-system-conventions` forbids working around a structural problem with a smaller size or a horizontal scroll.

**Keep the step count in the label text accurate.** "Step 3 of 5" must be true. When an answer adds or removes steps partway through the process, tell the user the step count changed.

## Accessibility

The rules below add to the accessibility baseline in `recursica-skill-system-conventions`, including the focus ring, which every Recursica component follows.

**State in what assistive technology reads every fact a sighted user sees on the stepper at a glance.** The stepper shows the current step and the progress with the step indicator, color, and the thickness of the connector. A screen reader reads none of the indicator, the color, or the thickness. A screen reader user is most likely to lose track of the current step when the step changes.

### Screen readers

- **"Step 2 of 5" must be in what assistive technology reads.** Provide the current step's position and the total number of steps, as text or as a value set on the stepper in code. With only a visual indicator, a screen reader user cannot tell how many steps remain.
- **Announce each step's status in words: complete, current, or upcoming.** Never let the connector or a color be the only sign that a step is complete. The difference in connector thickness is one channel. Screen reader users most need the step's status, and cannot perceive the connector's thickness.
- **Each step is an item in an ordered list of steps**, announced in order. The user hears every step in the process, in sequence.
- **Connect each step description to the step in code.** Never show the step description as a separate, unconnected line beside the step. A screen reader announces an unconnected step description out of context, or not at all.
- **Each step label must make sense without the layout around the step label.** A screen reader user hears "Payment details" with no layout around the words to explain the words.
- **When the step changes, the new step must be perceivable.** Announce the new position and the new step's heading. A screen reader announces nothing when the screen changes, unless the change is announced on purpose.
- **When the user can move between steps, each step is a real control, with a name and a state:** current, completed, or disabled. When the user cannot move between steps, the steps must be plain text that cannot be operated, and must not be announced as buttons.
- **A step with an error must say so in text.** The step's content must state the failure. If the step indicator is a control, the step indicator's accessible name (the name a screen reader reads out for a control) or state must state the failure too.

### Keyboard and non-mouse navigation

- **When the step changes, move focus on purpose to the start of the new step's content**, either the new step's heading or the new step's first field. Do not leave focus on the Next button. If focus stays on Next, the keyboard user's next Tab lands in an unexpected place, and the screen reader user cannot tell the page changed.
- **Never move ahead automatically.** Finishing the last field of a step does not move the user to the next step. The user presses Next. `recursica-skill-forms` forbids moving focus for the user.
- **A step indicator the user cannot use to move between steps is not a tab stop** (a place the Tab key lands). The step indicator has no `tabindex`, no click handler, and no styling that makes the step indicator look focusable.
- **A step indicator the user can use to move between steps is a real button**, reachable by Tab in visual order and pressed with Enter and Space. Do not add a custom roving tabindex (where the arrow keys move between items that share one tab stop) to the step indicators.
- **The tab order within a step follows the visual order:** the step's fields from top to bottom, then Back and Next in the footer. The single-column form layout keeps the tab order and the visual order the same.
- **Back must not lose the user's place.** Going back to a step puts focus at the start of the step's content, with the values the user entered still in the fields.
- **No content or control the user needs may appear only on hover**, including a step's description.

## Styling set by tokens

**Never set or override the stepper's styling.** The theme sets every visual property of the stepper, such as size, spacing, borders, colors and animation. Do not add extra containers or spacers to change the stepper's look. If the design needs a look the theme does not give, raise the gap. See `recursica-skill-design-router`.

## Related skills

- `recursica-skill-forms` — the test for a single page versus several steps, layout and labels within each step, when to validate, submit behavior, and the rule of one save mode.
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
- **Whether the user can move between steps at all.** No rule says whether a user may click back to a finished step, or whether the user can ever reach an upcoming step directly.
- **Whether each step gets a route and a browser history entry.** `recursica-skill-navigation` rules on views and tabs, not on steps. No rule says what the browser's Back button does in a stepper.
- **Validation across steps.** No rule says whether a step validates when the user leaves the step, or what going back does to the data the user entered. `recursica-skill-forms` names this question as open too.
- **Whether a step may be optional or skipped**, and how an optional or skipped step shows in the step count.
- **What a step with an error looks like.** Ask only when the project has no error state.
- **Whether the step indicator shows a number or a checkmark.** The design-system website shows both. Do not rely on a number or a checkmark without asking. Ask only when the project has no number or checkmark in the step indicator.
- **Where the stepper sits relative to the step's content**, and whether the stepper stays in view while the step's content scrolls.

## Pre-flight checklist

- [ ] The form passed the multi-step test (separate stages, a large number of fields, or an answer that changes a later step), and was not cut up at random.
- [ ] No form is spread across tabs. A form that was spread across tabs became a stepper.
- [ ] The steps are in order and must be done in order. A task that can be done in any order did not become a stepper.
- [ ] Every size, orientation, and state is one the project's UI kit lists, and no error state, skipped state, or other state is invented.
- [ ] Each step label names the stage, and each step description is a short fragment, not a sentence.
- [ ] Next and Back are buttons, and neither button exists to change the URL.
- [ ] Next is the primary button at the bottom right, with Back in the secondary style beside Next. The final submit uses the button's disabled look with an animated icon, and no blocking overlay.
- [ ] The primary action stays disabled until the step is complete and valid.
- [ ] One save mode runs across the whole flow. By default, all fields save together at the final submit, with no status message and no unsaved-changes indicator. The flow saves field by field only if the whole system does, and then shows a save status that stays on the page.
- [ ] Each step's content is in a single column, and not inside a card.
- [ ] One label placement runs across the whole form at each breakpoint: every field side by side, or every field stacked. The label placement is decided once, not for each step, and not for each field.
- [ ] "Step N of M" is in what assistive technology reads, not only on screen.
- [ ] Each step's status is announced in words, and completion is never shown by the connector or color alone.
- [ ] Each step description is connected to the step, and each step label makes sense without the layout around the step label.
- [ ] When the step changes, the new position and heading are announced, and focus moves to the start of the new step's content. Focus is never left on Next.
- [ ] Steps the user can use to move between steps are real controls with names and states. Steps the user cannot use to move between steps cannot receive focus.
- [ ] Nothing moves ahead automatically. Back restores the step with the user's values, and puts focus at the start of the step.
- [ ] No styling is set or overridden on the stepper, and no container or spacer is added to change the stepper's look.
- [ ] Open questions were asked about, not decided: the smaller size, horizontal or vertical orientation, the maximum number of steps, moving between steps, a route for each step, validation across steps, optional or skipped steps, what a step with an error looks like, a number or a checkmark in the step indicator, and where the stepper sits.
