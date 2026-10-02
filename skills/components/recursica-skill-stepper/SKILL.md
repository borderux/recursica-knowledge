---
name: recursica-skill-stepper
description: Rules for the Recursica stepper — when a form becomes multi-step instead of tabbed, sizes and orientation, step labels, Next and Back as actions, saving across steps, and announcing the step and moving focus. Use for wizards, multi-step forms, and checkout flows. Not for sections of one whole — see recursica-skill-tabs; not for past events — see recursica-skill-timeline.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Stepper

A stepper walks the user through one process that has several parts, and shows where they are in it.

## When to use a stepper

- **A form has several parts** — `recursica-skill-forms` sets the test: stages the user thinks of as separate, a very large number of fields, or an answer that makes a _later_ step clearly different.
- **A form would otherwise be split across tabs.** Splitting a form across tabs is forbidden, and the stepper replaces it.
- **A first-time setup or onboarding flow** has to be worked through in order.
- **The status of a step-by-step workflow is being shown** — Processing, Shipped, Delivered — where the stages are fixed and in order.

## When not to use a stepper

| Instead of a stepper                                          | Use                                                                                                    |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| The steps can be done in any order                            | One page. No checklist component exists — if tasks get marked done, that is `recursica-skill-checkbox` |
| A short form that fits on one page                            | One page, in a single column — `recursica-skill-forms`                                                 |
| An answer only changes a field right below it                 | Progressive disclosure on one page — `recursica-skill-forms`                                           |
| Parts of one body of material that the user flips between     | `recursica-skill-tabs`, each tab with its own route                                                    |
| Primary or secondary navigation for the application           | `recursica-skill-navigation` — a stepper is not navigation                                             |
| A record of events that already happened, with timestamps     | `recursica-skill-timeline`                                                                             |
| Progress of a single operation, with no known end             | `recursica-skill-loader`, or the submit button's in-flight state                                       |
| Splitting a long form into steps only to make it feel shorter | Nothing. Fix the form — see `recursica-skill-system-conventions`                                       |

**The stepper exists because a form must never be spread across tabs.** `recursica-skill-navigation` states that ban, and names the stepper as the replacement. When form fields would go in tabs, use a stepper instead.

## Variants

Taken from the UI kit (the token file, `recursica_ui-kit.json`, that says which variants and states each component has) → `ui-kit.components.stepper`. **Do not pass a variant, size, or state that is not listed here.**

**Look up each variant's name in code before using the variant.** The names in this skill are the names in Figma and the UI kit. The code can use a different name for the same variant. A wrong name in code has no effect and shows no error. The Recursica MCP server's `recursica_get_component_doc` tool gives the name to use in code.

| Variants      | Options                  |
| ------------- | ------------------------ |
| `sizes`       | `large`, `small`         |
| `orientation` | `horizontal`, `vertical` |

**A step may have a second line.** `description-text` exists beside `label-text`, so a step has a name and an optional short description. Never put a paragraph in it.

**The connector (the line between steps) tells finished steps from upcoming steps.** `completed-connector-size` and `upcoming-connector-size` differ. The display of progress depends on a line's thickness and a color. That is a single visual channel (color, shape, position or text, each a separate signal), and progress must not rely on it alone. See the accessibility section and `recursica-skill-system-conventions`.

**There is no state variant on the component.** "Done, Current, & Upcoming" behavior is shown only on the design-system website, but the UI kit defines no `states`. A step's status is data the application supplies, not a variant. State it in what assistive technology reads.

**There is no error, warning, skipped, or optional step state.** The component cannot show that a step failed validation. The step's text must state it.

**There is no token for what goes inside the indicator.** A step number and a checkmark are shown only on the design-system website, but the UI kit defines neither. See the open questions.

## Rules

**Every step must be a stage the user recognizes.** Cutting a form into random thirds adds clicks without making it any easier. If the steps do not match something in the user's mental model (what a person expects from the tools and work they already know), put the form on one page.

**Label each step with the name of the stage**, and use `description-text` only for a short fragment that clarifies it. `recursica-skill-forms` bans sentences in microcopy. Use the shortest text that gives the information.

**Next and Back are buttons, not links.** They act on the process, not on a location. `recursica-skill-buttons-links` and `recursica-skill-button` both state this rule. A Back button that changes the URL is navigation, not a step.

**Next is the primary `solid` button at the bottom right, with Back as the secondary right to its left.** The last step's primary action is the submit. It changes to a disabled look with an animated icon, as `recursica-skill-button` describes, and never to a blocking spinner or overlay.

**Keep each step's primary action disabled until that step is complete and valid.** `recursica-skill-forms` forbids an enabled button that dumps validation errors when clicked, and that rule applies to each step.

**The stepper does not add a second save mode.** The application either saves field by field everywhere, or saves everything together everywhere. Saving everything together is the default: nothing is saved until the final submit. In that mode, show no status message and no indicator of unsaved changes. The enabled primary button is the only signal. If the system saves field by field instead, show a save status that stays on the page. Never mix the two save modes across steps.

**Each step's content follows the form rules without change** — a single column, one field per row, and no custom spacing.

**Label placement is one decision for the whole form — not one per step, and never one per field.** `recursica-skill-forms` allows labels side by side or stacked, and forbids both at the same breakpoint. The container-width test is applied once, to the form, and the answer governs every field in it. The container the test measures is the step's container. If a label and its field do not fit side by side there, stack every field in every step, including the short fields that would have fit. Never use side by side in one step and stacked in another.

**Never put the step's content, or any part of the form, inside a card.** See `recursica-skill-card`.

**If a horizontal stepper does not fit, cut down the steps or switch to vertical.** Do not switch to `small` to fit more steps, and do not make it scroll horizontally. `recursica-skill-system-conventions` forbids working around a structural problem this way.

**Keep the step count in the label text accurate.** "Step 3 of 5" must be true. When an answer adds or removes steps partway through, tell the user the step count changed.

## Accessibility

This component also follows the accessibility baseline in `recursica-skill-system-conventions`, including the focus ring. Only the rules specific to this component are listed here.

The stepper shows position and progress visually, with an indicator, a color, and the thickness of a connector. **None of that reaches a screen reader.** State everything a sighted user sees at a glance in what assistive technology reads. The step change is the moment a screen reader user is most likely to lose their place.

### Screen readers

- **"Step 2 of 5" must exist in what assistive technology reads.** Provide the current step's position and the total, as text or as a value set on the stepper in code. With only a visual indicator, a screen reader user cannot tell how many steps remain.
- **Each step's status must be announced in words** — complete, current, or upcoming. Never let the connector or a color be the only sign of completion. `completed-connector-size` versus `upcoming-connector-size` is one channel, and screen reader users, who most need the information, cannot perceive it.
- **Each step is an item in an ordered list of steps**, announced in order. The user hears every step in the process, in sequence.
- **`description-text` must be connected to its step**, not shown as a separate line beside it. Text that is not connected is announced out of context, or not at all.
- **Step labels must make sense on their own.** A screen reader user hears "Payment details" with no layout around it to explain it.
- **When the step changes, the new step must be perceivable.** Announce the new position and the new step's heading. A change on the screen announces nothing by itself.
- **If users can move between steps, each step is a real control, with a name and a state** — current, completed, or disabled. If they cannot, the steps must be plain text that cannot be operated, and must not be announced as buttons.
- **A step with an error must say so in text.** The component has no error state. The step's own content must state the failure. If the step indicator is a control, its accessible name (the name a screen reader reads out for a control) or its state must state it too.

### Keyboard and non-mouse navigation

- **When the step changes, move focus on purpose to the start of the new step's content** — its heading or its first field. Do not leave focus on the Next button. If focus stays on Next, the keyboard user's next Tab lands in an unexpected place, and the screen reader user cannot tell the page changed.
- **Never move ahead automatically.** Finishing the last field of a step does not move the user forward. The user presses Next. `recursica-skill-forms` forbids moving focus for the user.
- **Step indicators that cannot be used to move between steps are not tab stops** (places the Tab key lands). They have no `tabindex`, no click handler, and no styling that makes them look focusable.
- **Step indicators that can be used to move between steps are real buttons**, reachable by Tab in visual order and activated by Enter and Space. Do not add a custom roving tabindex (where the arrow keys move between items that share one tab stop) on top of them.
- **The tab order within a step follows the visual order** — the step's fields from top to bottom, then Back and Next in the footer. The single-column form layout is what keeps this true.
- **Back must not lose the user's place.** Going back to a step puts focus at the start of that step's content, with the values they entered still there.
- **Nothing needed may appear only on hover** — not a step's description.

## Styling set by tokens

Do not set or override any of these. The component sets them for every size and orientation:

- `colors`, including the per-status indicator colors.
- `completed-connector-size` and `upcoming-connector-size`.
- `label-text` and `description-text` type treatment.
- Indicator size, spacing between steps, and the connector's placement.

## Related skills

- `recursica-skill-forms` — the single-page vs. multi-step test, layout and labels within each step, validation timing, submit behavior, and the one-save-mode rule.
- `recursica-skill-navigation` — the prohibition on spreading a form across tabs, and what counts as a location with a route.
- `recursica-skill-buttons-links` — Next and Back as actions, label copy, and footer placement.
- `recursica-skill-system-conventions` — never carry meaning in a single channel; fix the structure instead of shrinking to fit.

### Only if used on the same screen

- `recursica-skill-tabs` — the structure a stepper replaces, and what tabs are legitimately for.
- `recursica-skill-card` — why no step's content is wrapped in a card.

## Open questions

- **When `small` is the correct size**, and which surfaces use it. No rule assigns it.
- **When to use horizontal, and when vertical.** Both orientations exist, but nothing says which to use where, or whether the choice may change with the container's width.
- **The maximum number of steps.** No number is stated.
- **Whether users can move between steps at all** — whether a user may click back to a finished step, and whether upcoming steps can ever be reached.
- **Whether each step gets a route and a browser history entry.** `recursica-skill-navigation` rules on views and tabs, not on steps, and what the browser's Back button should do here is not stated.
- **Validation across steps.** Whether a step validates when the user leaves it, and what going back does to the data entered — named as an open question in `recursica-skill-forms`.
- **Whether a step may be optional or skipped**, and how that shows in the count.
- **What a step with an error looks like.** The component has no error state.
- **Whether the indicator shows a number or a checkmark.** Both are shown only on the design-system website, with no token behind either. Do not rely on this without asking.
- **Where the stepper sits relative to the step's content**, and whether it stays in view while the step scrolls.

## Pre-flight checklist

- [ ] The form passed the multi-step test — separate stages, a large number of fields, or later branching — instead of being cut up at random.
- [ ] No form is spread across tabs; any that was became a stepper.
- [ ] The steps are in order and must be done in order. A task that can be done in any order did not become a stepper.
- [ ] Every size, orientation, and state comes from the inventory above, with no invented error or skipped state.
- [ ] Each step's label names the stage, and `description-text` is a short fragment, not a sentence.
- [ ] Next and Back are buttons, and neither one exists to change the URL.
- [ ] Next is the solid primary button at the bottom right, with Back as the secondary beside it. The final submit uses the button's disabled look with an animated icon, and no blocking overlay.
- [ ] The primary action stays disabled until the step is complete and valid.
- [ ] One save mode runs across the whole flow — saving everything together by default, with no status message and no unsaved-changes indicator. It saves field by field only if the whole system does, and then with a save status that stays on the page.
- [ ] Each step's content is in a single column, and not inside a card.
- [ ] One label placement runs across the whole form at a given breakpoint — every field side by side, or every field stacked — decided once, not for each step, and not for each field.
- [ ] "Step N of M" exists in what assistive technology reads, not only visually.
- [ ] Each step's status is announced in words, and completion is never shown by the connector or color alone.
- [ ] `description-text` is connected to its step, and step labels make sense on their own.
- [ ] When the step changes, the new position and heading are announced, and focus moves to the start of the new content — never left on Next.
- [ ] Steps that can be used to move around are real controls with names and states. Steps that cannot are not able to receive focus.
- [ ] Nothing moves ahead automatically. Back restores the step with its values, and puts focus at its start.
- [ ] Colors, connector sizes, and type styling come from the component.
- [ ] Open questions were asked about, not decided: the `small` size, horizontal or vertical orientation, the maximum number of steps, moving between steps, a route per step, validation across steps, optional or skipped steps, what an error step looks like, number or checkmark indicators, where the stepper sits.
