---
name: recursica-skill-stepper
description: How to use the Recursica stepper correctly — when a form becomes multi-step and why a stepper is the house replacement for a form split across tabs, which sizes and orientations exist, step labels and descriptions, Next and Back as actions rather than navigation, save mode across steps, and the screen-reader and keyboard requirements including announcing "Step 2 of 5" and moving focus when the step changes. Use whenever adding, reviewing, or refactoring a stepper, wizard, multi-step form, or checkout flow. Trigger on "stepper", "wizard", "multi-step", "step indicator", "next and back", "progress steps", "checkout flow", "onboarding flow", "screen reader", "tab order", or a request to break a long form into stages. Do NOT use for form layout, validation timing, or save behavior — that is recursica-skill-forms. Do NOT use for sections of one body of content — that is recursica-skill-tabs. Do NOT use for a record of past events — that is recursica-skill-timeline.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Stepper

A stepper carries the user through one multi-part process and shows where they are in it.

## Use it when

- **A form is genuinely multi-part** — `recursica-skill-forms` sets the test: discrete stages the user already thinks of as separate, sheer volume of fields, or an answer that makes a _later_ step materially different.
- **A form would otherwise be split across tabs.** The stepper is the house replacement for that structure, which is prohibited.
- **An initial setup or onboarding flow** has to be walked through in order.
- **A linear workflow's status is being shown** — Processing, Shipped, Delivered — where the stages are fixed and ordered.

## Do not use it when

| Instead of a stepper                                       | Use                                                                                                    |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| The steps can be completed in any order                    | One page. No checklist component exists — if tasks get marked done, that is `recursica-skill-checkbox` |
| A short form that fits on one page                         | One page, single column — `recursica-skill-forms`                                                      |
| An answer only changes a field just below it               | Progressive disclosure on one page — `recursica-skill-forms`                                           |
| Parts of one body of material the user flips between       | `recursica-skill-tabs`, each tab with its own route                                                    |
| Primary or secondary application navigation                | `recursica-skill-navigation` — a stepper is not a nav                                                  |
| A record of events that already happened, with timestamps  | `recursica-skill-timeline`                                                                             |
| Indeterminate progress of a single operation               | `recursica-skill-loader`, or the in-flight submit button                                               |
| Making a long form feel shorter without changing its shape | Nothing. Fix the form — see `recursica-skill-system-conventions`                                       |

**The stepper exists because a form must never be spread across tabs.** `recursica-skill-navigation` states that prohibition and names the stepper as the replacement. If someone reaches for tabs to hold form fields, this component is the answer.

## What exists

Taken from `recursica_ui-kit.json` → `ui-kit.components.stepper`. **Do not pass a variant, size, or state that is not listed here.**

| Axis          | Options                  |
| ------------- | ------------------------ |
| `sizes`       | `large`, `small`         |
| `orientation` | `horizontal`, `vertical` |

**A step may carry a second line.** `description-text` exists alongside `label-text`, so a step has a name and an optional short descriptor. It is not a paragraph slot.

**Completed and upcoming steps are distinguished by the connector.** `completed-connector-size` and `upcoming-connector-size` differ — which means progress rides on a line thickness and a color. **That is a single visual channel and you must not rely on it alone**; see the accessibility section and `recursica-skill-system-conventions`.

**There is no state axis on the component.** "Done, Current, & Upcoming" behavior is documented outside the token inventory, but the kit defines no `states`. A step's status is data you supply and must express in the accessible output — not a variant you select.

**There is no error, warning, skipped, or optional step state.** A step that failed validation cannot be signalled by the component; the words have to carry it.

**There is no token for the indicator's contents.** A step number and a checkmark are documented outside the token inventory; the kit defines neither. See the uncovered list.

## Rules for using it

**Every step must be a stage the user recognizes.** Chunking a form into arbitrary thirds adds clicks without reducing difficulty. If the steps do not correspond to something in the user's mental model, the form belongs on one page.

**Label each step with the name of the stage**, and use `description-text` only for a short clarifying fragment. `recursica-skill-forms` bans sentences in microcopy — the shortest string that carries the information wins.

**Next and Back are buttons, not links.** They act on the process, not on a location. `recursica-skill-buttons-links` and `recursica-skill-button` both state this; a Back that changes the URL is a navigation, not a step.

**Next is the primary `solid` button, bottom right, with Back as the secondary immediately to its left.** The final step's primary action is the submit, and it converts to an disabled treatment with an animated icon, per `recursica-skill-button` — never a blocking spinner or overlay.

**Keep the step's primary action disabled until that step is complete and valid.** `recursica-skill-forms` forbids an enabled button that dumps validation errors on click; that holds per step.

**The stepper does not introduce a second save mode.** The application is field-level everywhere or batch everywhere. **Batch is the default: nothing commits until the final submit**, and in batch mode you show no status message and no dirty indicator — the enabled primary button is the whole signal. If the system is field-level instead, a persistent status message is required. Never mix them across steps.

**Each step's content follows the form rules unchanged** — single column, one field per row, no custom spacing.

**Label placement is one decision for the whole form, not one per step and never one per field.** `recursica-skill-forms` allows side-by-side labels or stacked labels and forbids both at the same breakpoint: the container-width test is applied once, to the form, and the answer governs every field in it. A step's container is exactly what triggers stacking — so if label and field will not sit side by side there, **the whole form stacks in every step, not just the fields that feel cramped**, including the short ones that would have fit. Never let one step run side-by-side while another stacks.

**Never put the step content, or any part of the form, inside a card.** See `recursica-skill-card`.

**If a horizontal stepper does not fit, reduce the steps or go vertical.** Do not shrink to `small` to make more fit and do not scroll it sideways — that is engineering around a structural problem, which `recursica-skill-system-conventions` prohibits.

**Keep the step count honest in the label copy.** "Step 3 of 5" must be true; do not add or remove steps mid-flow based on answers without saying so.

## Accessibility

The stepper's entire job is to communicate position and progress, and it does that visually — an indicator, a color, and a connector thickness. **None of that reaches a screen reader.** Everything the sighted user learns at a glance has to be stated in the accessible output, and the moment of highest risk is the step change.

### Screen readers

- **"Step 2 of 5" must exist in the accessible output.** The current step's position and the total count, as text or as a programmatic value on the stepper. A visual indicator alone leaves the user with no idea how much is left.
- **Each step's status must be announced in words** — complete, current, or upcoming. **Never let the connector or a color carry completion.** `completed-connector-size` versus `upcoming-connector-size` is one channel, and it is invisible to the users who most need the information.
- **The step is a list item in an ordered list of steps**, announced in order, so the user can hear the whole shape of the process.
- **`description-text` must be associated with its step**, not rendered as a loose line beside it. Unassociated text is announced out of context or not at all.
- **Step labels must stand alone.** A screen reader user hears "Payment details" with no surrounding layout to interpret it.
- **When the step changes, the new step must be perceivable.** Announce the new position and the new step's heading. The change of screen is not itself an announcement.
- **If steps are navigable, each is a real control with a name and a state** — current, completed, disabled. If they are not navigable, they must be inert text and must not be announced as buttons.
- **A step in error must say so in text.** No error state exists on the component, so the failure has to be in the step's own content and, if the step indicator is a control, in its accessible name or state.

### Keyboard and non-mouse navigation

- **When the step changes, move focus deliberately to the start of the new step's content** — its heading or its first field. **Do not leave focus on the Next button.** Left there, the keyboard user's next Tab lands somewhere arbitrary and the screen reader user has no idea the page changed.
- **Never auto-advance.** Completing the last field of a step does not move the user forward; they press Next. `recursica-skill-forms` already forbids moving focus for the user.
- **Non-navigable step indicators are not tab stops.** No `tabindex`, no click handler, nothing that looks focusable.
- **Navigable step indicators are real buttons**, reachable by Tab in visual order and activated by Enter and Space. Do not build a custom roving-tabindex arrow-key model on top of them.
- **Tab order within a step follows visual order** — the step's fields top to bottom, then Back and Next in the footer. The single-column form layout is what makes this hold.
- **Back must not lose the user's place.** Returning to a step puts focus at the start of that step's content, with its entered values intact.
- **Nothing needed may appear only on hover** — not a step's description, not the reason a step is disabled.
- **Never suppress the focus ring**, on the step indicators or on the footer buttons.

## Not your decision

Do not implement, override, or tune any of these — the component owns them for every size and orientation:

- `colors`, including the per-status indicator colors.
- `completed-connector-size` and `upcoming-connector-size`.
- `label-text` and `description-text` type treatment.
- Indicator size, spacing between steps, and the connector's placement.

## Load these too

- [`recursica-skill-forms`](../../design-rules/recursica-skill-forms/SKILL.md) — the single-page vs. multi-step test, layout and labels within each step, validation timing, submit behavior, and the one-save-mode rule.
- [`recursica-skill-navigation`](../../design-rules/recursica-skill-navigation/SKILL.md) — the prohibition on spreading a form across tabs, and what counts as a location with a route.
- [`recursica-skill-buttons-links`](../../design-rules/recursica-skill-buttons-links/SKILL.md) — Next and Back as actions, label copy, and footer placement.
- [`recursica-skill-tabs`](../recursica-skill-tabs/SKILL.md) — the structure a stepper replaces, and what tabs are legitimately for.
- [`recursica-skill-system-conventions`](../../design-rules/recursica-skill-system-conventions/SKILL.md) — never carry meaning in a single channel; fix the structure instead of shrinking to fit.
- [`recursica-skill-card`](../recursica-skill-card/SKILL.md) — why no step's content is wrapped in a card.

## Uncovered — ask, do not invent

- **When `small` is the correct size**, and which surfaces take it. No rule assigns it.
- **When horizontal and when vertical.** Both orientations exist; nothing says which to use where, or whether the choice may change with container width.
- **The maximum number of steps.** No count is stated.
- **Whether steps are navigable at all** — whether a user may click back to a completed step, and whether upcoming steps are ever reachable.
- **Whether each step gets a route and a browser history entry.** `recursica-skill-navigation` rules on views and tabs, not on steps, and what Back in the browser should do here is unstated.
- **Cross-step validation.** Whether a step validates on leaving it, and what backward navigation does to entered data — named as uncovered in `recursica-skill-forms`.
- **Whether a step may be optional or skipped**, and how that reads in the count.
- **What a step in error looks like.** No error state exists on the component.
- **Whether the indicator shows a number or a checkmark.** Both are documented outside the token inventory, with no token behind either. Do not rely on this without asking.
- **Where the stepper sits relative to the step content**, and whether it persists while the step scrolls.

## Pre-flight checklist

- [ ] The form genuinely met the multi-step test — discrete stages, volume, or downstream branching — rather than being chunked arbitrarily.
- [ ] No form was spread across tabs; anything that was became a stepper.
- [ ] Steps are ordered and must be done in order; an any-order task did not become a stepper.
- [ ] No size, orientation, or state outside the inventory above was passed; no error or skipped state was invented.
- [ ] Each step's label names the stage; `description-text` is a short fragment, not a sentence.
- [ ] Next and Back are buttons; neither changes the URL as its purpose.
- [ ] Next is the solid primary bottom right, Back the secondary beside it; the final submit uses the button's disabled-plus-animated-icon treatment with no blocking overlay.
- [ ] The primary action stays disabled until the step is complete and valid.
- [ ] One save mode across the whole flow — batch by default, with no status message and no dirty indicator; field-level only if the whole system is, and then with a persistent status.
- [ ] Each step's content is single-column and is not inside a card.
- [ ] One label placement across the whole form at a given breakpoint — every field side-by-side or every field stacked, decided once, not per step and not per field.
- [ ] "Step N of M" exists in the accessible output, not only visually.
- [ ] Step status is announced in words; completion is never carried by the connector or color alone.
- [ ] `description-text` is associated with its step; step labels read correctly alone.
- [ ] On step change, the new position and heading are announced and focus moves to the start of the new content — never left on Next.
- [ ] Navigable steps are real controls with names and states; non-navigable steps are not focusable.
- [ ] No auto-advance; Back restores the step with its values and puts focus at its start.
- [ ] Tab order matches visual order; nothing needed is hover-only; the focus ring is intact.
- [ ] No component-owned color, connector size, or type treatment was overridden.
- [ ] Nothing in the uncovered list was invented.
