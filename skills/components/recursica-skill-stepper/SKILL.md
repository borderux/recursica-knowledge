---
name: recursica-skill-stepper
description: How to use the Recursica stepper correctly — when a form becomes multi-step and why a stepper is the house replacement for a form split across tabs, which sizes and orientations exist, step labels and descriptions, Next and Back as actions rather than navigation, save mode across steps, and the screen-reader and keyboard requirements including announcing "Step 2 of 5" and moving focus when the step changes. Use whenever adding, reviewing, or refactoring a stepper, wizard, multi-step form, or checkout flow. Trigger on "stepper", "wizard", "multi-step", "step indicator", "next and back", "progress steps", "checkout flow", "onboarding flow", "screen reader", "tab order", or a request to break a long form into stages. Do NOT use for form layout, validation timing, or save behavior — that is recursica-skill-forms. Do NOT use for sections of one body of content — that is recursica-skill-tabs. Do NOT use for a record of past events — that is recursica-skill-timeline.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Stepper

A stepper walks the user through one process that has several parts, and shows where they are in it.

## Use it when

- **A form really does have several parts** — `recursica-skill-forms` sets the test: separate stages the user already thinks of as separate, a very large number of fields, or an answer that makes a _later_ step clearly different.
- **A form would otherwise be split across tabs.** The stepper is the house replacement for that structure, which is forbidden.
- **A first-time setup or onboarding flow** has to be worked through in order.
- **The status of a step-by-step workflow is being shown** — Processing, Shipped, Delivered — where the stages are fixed and in order.

## Do not use it when

| Instead of a stepper                                       | Use                                                                                                    |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| The steps can be done in any order                         | One page. No checklist component exists — if tasks get marked done, that is `recursica-skill-checkbox` |
| A short form that fits on one page                         | One page, in a single column — `recursica-skill-forms`                                                 |
| An answer only changes a field right below it              | Progressive disclosure on one page — `recursica-skill-forms`                                           |
| Parts of one body of material that the user flips between  | `recursica-skill-tabs`, each tab with its own route                                                    |
| Primary or secondary navigation for the application        | `recursica-skill-navigation` — a stepper is not navigation                                             |
| A record of events that already happened, with timestamps  | `recursica-skill-timeline`                                                                             |
| Progress of a single operation, with no known end          | `recursica-skill-loader`, or the submit button's in-flight state                                       |
| Making a long form feel shorter without changing its shape | Nothing. Fix the form — see `recursica-skill-system-conventions`                                       |

Progressive disclosure means showing only what is needed now, with the rest available on request.

**The stepper exists because a form must never be spread across tabs.** `recursica-skill-navigation` states that ban, and names the stepper as the replacement. If someone reaches for tabs to hold form fields, this component is the answer.

## What exists

Taken from `recursica_ui-kit.json` → `ui-kit.components.stepper`. **Do not pass a variant, size, or state that is not listed here.**

**The third column is the React prop that sets each axis.** The axis name comes from the token inventory. It is not a prop, and if you pass it as one, React quietly ignores it. A blank cell means no single prop sets that axis — it is set by CSS state or by separate props, and the rules below say which.

| Axis          | Options                  | React prop |
| ------------- | ------------------------ | ---------- |
| `sizes`       | `large`, `small`         | `size`     |
| `orientation` | `horizontal`, `vertical` |            |

**A step may have a second line.** `description-text` exists beside `label-text`, so a step has a name and an optional short description. It is not a place for a paragraph.

**Finished steps and upcoming steps are told apart by the connector** (the line between them). `completed-connector-size` and `upcoming-connector-size` differ — which means progress depends on the thickness of a line and a color. **That is a single visual channel (a way of carrying meaning, such as color, shape, position, or text), and you must not rely on it alone**; see the accessibility section and `recursica-skill-system-conventions`.

**There is no state axis on the component.** "Done, Current, & Upcoming" behavior is documented outside the token inventory, but the kit defines no `states`. A step's status is data you supply, and you must express it in what assistive technology reads — it is not a variant you select.

**There is no error, warning, skipped, or optional step state.** The component cannot show that a step failed validation; the words have to carry it.

**There is no token for what goes inside the indicator.** A step number and a checkmark are documented outside the token inventory, but the kit defines neither. See the uncovered list.

## Rules for using it

**Every step must be a stage the user recognizes.** Cutting a form into random thirds adds clicks without making it any easier. If the steps do not match something in the user's mental model (a person's picture of how something works), the form belongs on one page.

**Label each step with the name of the stage**, and use `description-text` only for a short fragment that clarifies it. `recursica-skill-forms` bans sentences in microcopy (the short text in an interface) — the shortest string that carries the information wins.

**Next and Back are buttons, not links.** They act on the process, not on a location. `recursica-skill-buttons-links` and `recursica-skill-button` both say this; a Back that changes the URL is navigation, not a step.

**Next is the primary `solid` button at the bottom right, with Back as the secondary right to its left.** The last step's primary action is the submit, and it changes to a disabled look with an animated icon, as `recursica-skill-button` describes — never a blocking spinner or overlay.

**Keep each step's primary action disabled until that step is complete and valid.** `recursica-skill-forms` forbids an enabled button that dumps validation errors when clicked, and that holds for each step.

**The stepper does not add a second save mode.** The application either saves field by field everywhere, or saves everything together everywhere. **Saving everything together is the default: nothing is saved until the final submit.** In that mode, you show no status message and no indicator of unsaved changes — the enabled primary button is the whole signal. If the system saves field by field instead, a save status that stays on the page is required. Never mix them across steps.

**Each step's content follows the form rules without change** — a single column, one field per row, and no custom spacing.

**Label placement is one decision for the whole form — not one per step, and never one per field.** `recursica-skill-forms` allows labels side by side or stacked, and forbids both at the same breakpoint (the screen width at which the layout changes). The container-width test is applied once, to the form, and the answer governs every field in it. A step's container is exactly what triggers stacking — so if the label and field will not sit side by side there, **the whole form stacks in every step, not just the fields that feel cramped**, including the short ones that would have fitted. Never let one step sit side by side while another stacks.

**Never put the step's content, or any part of the form, inside a card.** See `recursica-skill-card`.

**If a horizontal stepper does not fit, cut down the steps or switch to vertical.** Do not shrink to `small` to make more fit, and do not make it scroll sideways — that is working around a problem with the structure, which `recursica-skill-system-conventions` forbids.

**Keep the step count honest in the label text.** "Step 3 of 5" must be true. Do not add or remove steps partway through based on answers, without saying so.

## Accessibility

The stepper's whole job is to show position and progress, and it does that visually — an indicator, a color, and the thickness of a connector. **None of that reaches a screen reader** (software that reads the screen aloud). Everything the sighted user learns at a glance has to be stated in what assistive technology reads, and the riskiest moment is when the step changes.

### Screen readers

- **"Step 2 of 5" must exist in what assistive technology reads.** The current step's position and the total, as text or as a value set on the stepper in code. A visual indicator alone leaves the user with no idea how much is left.
- **Each step's status must be announced in words** — complete, current, or upcoming. **Never let the connector or a color carry completion.** `completed-connector-size` versus `upcoming-connector-size` is one channel, and it is invisible to the users who most need the information.
- **Each step is an item in an ordered list of steps**, announced in order, so the user can hear the whole shape of the process.
- **`description-text` must be connected to its step**, not shown as a separate line beside it. Text that is not connected is announced out of context, or not at all.
- **Step labels must make sense on their own.** A screen reader user hears "Payment details" with no layout around it to explain it.
- **When the step changes, the new step must be perceivable.** Announce the new position and the new step's heading. The screen changing is not an announcement by itself.
- **If users can move between steps, each step is a real control, with a name and a state** — current, completed, or disabled. If they cannot, the steps must be plain text that cannot be operated, and must not be announced as buttons.
- **A step with an error must say so in text.** The component has no error state, so the failure has to be in the step's own content — and, if the step indicator is a control, in its accessible name (the name a screen reader reads out for a control) or its state.

### Keyboard and non-mouse navigation

- **When the step changes, move focus on purpose to the start of the new step's content** — its heading or its first field. **Do not leave focus on the Next button.** Left there, the keyboard user's next Tab lands somewhere random, and the screen reader user has no idea the page changed.
- **Never move ahead automatically.** Finishing the last field of a step does not move the user forward; they press Next. `recursica-skill-forms` already forbids moving focus for the user.
- **Step indicators that cannot be used to move between steps are not tab stops** (places the Tab key lands). No `tabindex`, no click handler, and nothing that looks as if it can receive focus.
- **Step indicators that can be used to move between steps are real buttons**, reachable by Tab in visual order and activated by Enter and Space. Do not build your own roving tabindex (where the arrow keys move between items that share one tab stop) on top of them.
- **The tab order within a step follows the visual order** — the step's fields from top to bottom, then Back and Next in the footer. The single-column form layout is what keeps this true.
- **Back must not lose the user's place.** Going back to a step puts focus at the start of that step's content, with the values they entered still there.
- **Nothing needed may appear only on hover** — not a step's description, and not the reason a step is disabled.
- **Never hide the focus ring** (the outline that shows which element has keyboard focus), on the step indicators or on the footer buttons.

## Not your decision

Do not implement, override, or tune any of these — the component owns them for every size and orientation:

- `colors`, including the per-status indicator colors.
- `completed-connector-size` and `upcoming-connector-size`.
- `label-text` and `description-text` type treatment.
- Indicator size, spacing between steps, and the connector's placement.

## Load these too

- `recursica-skill-forms` — the single-page vs. multi-step test, layout and labels within each step, validation timing, submit behavior, and the one-save-mode rule.
- `recursica-skill-navigation` — the prohibition on spreading a form across tabs, and what counts as a location with a route.
- `recursica-skill-buttons-links` — Next and Back as actions, label copy, and footer placement.
- `recursica-skill-system-conventions` — never carry meaning in a single channel; fix the structure instead of shrinking to fit.

### Only if the screen also uses it

- `recursica-skill-tabs` — the structure a stepper replaces, and what tabs are legitimately for.
- `recursica-skill-card` — why no step's content is wrapped in a card.

## Uncovered — ask, do not invent

- **When `small` is the correct size**, and which surfaces use it. No rule assigns it.
- **When to use horizontal, and when vertical.** Both orientations exist, but nothing says which to use where, or whether the choice may change with the container's width.
- **The maximum number of steps.** No number is stated.
- **Whether users can move between steps at all** — whether a user may click back to a finished step, and whether upcoming steps can ever be reached.
- **Whether each step gets a route and a browser history entry.** `recursica-skill-navigation` rules on views and tabs, not on steps, and what the browser's Back button should do here is not stated.
- **Validation across steps.** Whether a step validates when the user leaves it, and what going back does to the data entered — named as uncovered in `recursica-skill-forms`.
- **Whether a step may be optional or skipped**, and how that shows in the count.
- **What a step with an error looks like.** The component has no error state.
- **Whether the indicator shows a number or a checkmark.** Both are documented outside the token inventory, with no token behind either. Do not rely on this without asking.
- **Where the stepper sits relative to the step's content**, and whether it stays in view while the step scrolls.

## Pre-flight checklist

- [ ] The form really passed the multi-step test — separate stages, a large number of fields, or later branching — instead of being cut up at random.
- [ ] No form is spread across tabs; any that was became a stepper.
- [ ] The steps are in order and must be done in order. A task that can be done in any order did not become a stepper.
- [ ] You passed no size, orientation, or state outside the inventory above, and invented no error or skipped state.
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
- [ ] The tab order matches the visual order, nothing needed appears only on hover, and the focus ring is intact.
- [ ] You overrode no color, connector size, or type styling that the component owns.
- [ ] You invented nothing from the uncovered list.
