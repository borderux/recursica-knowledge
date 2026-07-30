---
name: recursica-skill-hover-card-popover
description: How to use the Recursica hover card and popover correctly — when richer content beside a target is justified, the required decision between a hover-opened read-only card and a click-opened interactive popover, why the component has no placement or size axis, the prohibition on holding anything the user needs, and the screen-reader and keyboard requirements that differ between the two varieties. Use whenever adding, reviewing, or refactoring a hover card, popover, preview card, profile preview, or link preview. Trigger on "hover card", "popover", "preview on hover", "profile card", "link preview", "beak", "hover-only", "escape to close", "screen reader", "tab order", or a request to reveal detail beside an element. Do NOT use for a short text label on an icon-only control — that is recursica-skill-tooltip. Do NOT use for a list of actions or options — that is recursica-skill-menu. Do NOT use for a surface that blocks the page — that is recursica-skill-modal.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Hover card and popover

A hover card or popover reveals richer content beside the element that triggers it.

## Use it when

- **A preview saves the user a trip** — a mini profile from an avatar or username, a product summary from a product name, a page preview from a link.
- **The content is richer than a phrase** — more than one line, an image, a small set of structured detail.
- **Everything inside is genuinely optional.** If the user never opens it, they lose nothing.

## Do not use it when

| Instead of a hover card or popover                   | Use                                                       |
| ---------------------------------------------------- | --------------------------------------------------------- |
| A short text label for an icon-only control          | `recursica-skill-tooltip`                                 |
| The content is needed to complete the task           | The page. Put it in view                                  |
| It is a list of actions or options                   | `recursica-skill-menu`                                    |
| A decision must be made before the user continues    | `recursica-skill-modal`                                   |
| The user needs the content while working in the page | `recursica-skill-panel`, or an inline region              |
| The content is a form or any form control            | A page or a modal — `recursica-skill-forms`               |
| A primary action needs somewhere to live             | A button on the surface — `recursica-skill-buttons-links` |
| The content is the only place a value exists         | The page, plus this if you still want the preview         |

**The pointer-only path is the failure this component is most often built into.** A hover-revealed surface containing a button, a link, or a value that exists nowhere else is unreachable by keyboard and unusable on touch. `recursica-skill-discoverability` is explicit that it does not license hiding something the user would want to reach, and hiding it behind hover is the worst version of that.

## What exists

Taken from `recursica_ui-kit.json` → `ui-kit.components.hover-card-popover`. **The component has no variant axes at all** — no placement axis, no size axis, no content-type axis, and nothing that distinguishes a hover card from a popover. One spec, one set of fixed properties.

**What the component provides:** a content area and a **beak** — the pointer connecting the card to its target. `beak-size` is set by tokens; unlike the tooltip, there is no `beak-inset`.

**You cannot set placement.** There is no top, left, right, or bottom option. Do not pass a position prop and do not hand-position the beak.

**There is no size axis.** `min-width` and `max-width` are fixed. Content that does not fit inside them is page content.

**There is no content-type axis.** `content-text` is the only content property in the kit; a custom content type is documented outside the token inventory — see Uncovered.

**Nothing in the kit distinguishes hover behavior from click behavior — but the house does, and the two are different components.** One token spec backs both; the behavior you build decides which one you have made, and it determines every accessibility requirement below. **State which one you are building.**

|                                 | **Hover card**                             | **Popover**                                                                             |
| ------------------------------- | ------------------------------------------ | --------------------------------------------------------------------------------------- |
| Opens on                        | Pointer entering the target                | A click or a tap, always                                                                |
| May contain interactive content | **No**                                     | **Yes** — buttons, links, simple form controls                                          |
| Closes when                     | The pointer leaves the target and the card | A click outside, a second click on the trigger, or Escape                               |
| Focus                           | Never moves                                | Moves to the first interactive element on open, and **returns to the trigger** on close |
| On a touch device               | Unavailable — there is no hover            | The pattern that replaces a hover card                                                  |

**A popover is a non-modal dialog.** It does not block the page and it does not trap focus. It is the click-triggered counterpart to the hover card, and the only one of the two that may hold anything operable.

**There is no placement axis on either**, even though four positions and three beak alignments are documented outside the token inventory. See the uncovered list.

**`tooltip` and `hover-card-popover` are two different components with almost identical tokens.** Do not choose between them on styling, because the styling is effectively the same. Choose on content: a tooltip is a short text label for a control with no visible one; this component holds richer content. Neither may hold anything the user needs in order to complete a task, and neither may be the only place a piece of information exists.

## Rules for using it

**Decide, and state, which of the two you are building before you build it.** There are exactly two valid shapes, and their requirements diverge:

- **Hover card** — opens on pointer hover, contains **nothing interactive**, and holds **nothing the user needs**. A read-only preview and nothing else.
- **Popover** — opened by a real trigger with click, Enter, or Space. May contain interactive content, and is fully keyboard-operable, including focus return.

A hover-opened surface with a control in it is not a third option; it is the failure mode.

**If it contains anything interactive, it is a popover.** One link inside is enough to move it across the line, and that means a real button trigger, keyboard opening, and focus management.

**A hover card holds nothing the user needs.** Not the only copy of a value, not an action, not an explanation required to proceed. If the content is required, it belongs on the page.

**Never the only place a piece of information exists.** `recursica-skill-system-conventions` forbids single-channel meaning, and a hover-revealed surface is the narrowest channel there is.

**Do not put a form, a form section, or a single form control inside it.** `recursica-skill-forms` forbids that with no exception.

**Do not wrap the content in a card.** The popover is already the boundary — see `recursica-skill-card`.

**A short delay before showing prevents accidental triggers** when the pointer crosses the target on its way somewhere else. The duration is not defined by a token — see Uncovered.

**Dismissal must be possible and obvious.** A popover closes on Escape, on a click outside it, and on a second click of its trigger. A hover card closes when the pointer leaves the target and the card.

**Anything interactive means it is a popover, so build it as one** — a real button as the trigger, keyboard-openable, focus moving in on open and back to the trigger on close. A hover card with a button inside it is unreachable for anyone not using a pointer.

**On a touch device a hover card has no trigger at all.** Where the content matters on touch, the answer is a popover, not a hover card with a tap fallback bolted on.

**It is not where a primary action goes.** One primary action per surface, exposed — `recursica-skill-buttons-links`.

## Accessibility

The two varieties have genuinely different requirements, and there is no safe middle. Name which one you are building, then satisfy that column completely — a build that half-satisfies both is the pointer trap this section exists to prevent.

### Screen readers

- **A popover's trigger must announce that it opens something, and whether it is currently open.** Without the open state, activation appears to do nothing.
- **A popover needs an accessible name** — its heading, or the name of the trigger that opened it — so a user who lands in it knows what they are in.
- **A hover card's content must be associated with its target as a description** if it carries any meaning at all. Content that appears next to a target and is associated with nothing is announced as unrelated text or not announced at all.
- **A hover card's content may go unread, and that must be acceptable.** This is the whole reason a hover card may hold nothing that is needed. If you cannot accept it going unread, you are building a popover.
- **Anything interactive inside a popover needs a real accessible name**, exactly as it would on the page.
- **Never put meaning here that exists nowhere else.** `recursica-skill-system-conventions` requires a second channel for any meaning the user must receive.
- **Do not announce the card as an alert.** It is content revealed on demand, not something that interrupts.
- **An image inside needs alternative text**, or must be marked decorative — a profile preview built entirely of an avatar conveys nothing otherwise.

### Keyboard and non-mouse navigation

- **A popover must be openable from the keyboard.** Its trigger is a real button in the tab order, opened with Enter or Space. Hover-only opening makes everything inside unreachable.
- **Focus moves into the popover on open and returns to the trigger on close.** Every close path — Escape, activating something inside, clicking away — returns focus to the trigger.
- **Escape closes the popover** and returns focus to the trigger.
- **Every control inside a popover is a tab stop, in visual order.** Nothing interactive may live in a surface reachable only with a pointer.
- **Do not trap focus.** A popover does not block the page; `recursica-skill-modal` is the component that does, and it is the only one that traps.
- **A hover card must contain no tab stops at all.** It has none of the machinery above. The moment you need a tab stop, you are building a popover.
- **A hover card must also appear when its target receives keyboard focus**, if the target is focusable, and must be dismissible with Escape without moving focus.
- **A hover card must survive the pointer travelling from the target into the card.** One that vanishes in the gap cannot be read, and cannot be read at all by anyone with imprecise pointer control.
- **A hover card never takes focus.** Focus is never moved for the user by something they merely hovered over.
- **Nothing needed may be hover-only.** This is the single rule the whole component turns on.
- **Never suppress the focus ring** on the trigger or on anything inside.

## Not your decision

Do not implement, override, or tune any of these — the component owns them:

- `colors`, `content-text`.
- `border-radius`, `border-size`.
- `horizontal-padding`, `vertical-padding`.
- `min-width`, `max-width`.
- `beak-size`, `elevation`.

The beak is part of the component. Do not draw your own, and do not reposition the one provided.

## Load these too

- [`recursica-skill-tooltip`](../recursica-skill-tooltip/SKILL.md) — the sibling component for a short text label on an unlabeled control, and why the two are not interchangeable despite matching tokens.
- [`recursica-skill-menu`](../recursica-skill-menu/SKILL.md) — where a list of actions or options goes, and its focus-return requirements.
- [`recursica-skill-discoverability`](../../psychology/recursica-skill-discoverability/SKILL.md) — progressive disclosure, the three cases where hiding is not safe, and the rule that it never defends a dark pattern.
- [`recursica-skill-system-conventions`](../../design-rules/recursica-skill-system-conventions/SKILL.md) — never carry meaning in a single channel; a hidden affordance must stay keyboard and assistive-technology reachable.
- [`recursica-skill-panel`](../recursica-skill-panel/SKILL.md) — the surface for content the user needs while working in the page.

## Uncovered — ask, do not invent

- **Whether the single token spec should become two.** The behaviors are settled and documented separately, but one spec backs both, so nothing in the inventory tells you which set of properties a popover uses versus a hover card. Ask before assuming they can diverge visually.
- **Placement.** Four positions — top, left, right, bottom — and three beak alignments — start, middle, end — are documented outside the token inventory, with no tokens behind them. Do not rely on them without asking, and no rule covers what happens at a viewport edge.
- **Show delay, hide delay, and the grace period** while the pointer crosses from target to card. No token or rule defines any of them.
- **Custom content.** Content types of text and custom are documented outside the token inventory; the kit exposes only `content-text`. Do not rely on this without asking.
- **Touch behavior.** Hover does not exist on touch, and no alternative pattern is specified.
- **Whether a popover may be opened from inside a menu, a modal, or another popover.** `recursica-skill-modal` forbids stacking modals; nothing states the rule here.
- **Whether a popover may be dismissed by clicking the page behind it**, which `recursica-skill-modal` also leaves open.

## Pre-flight checklist

- [ ] Which of the two is being built — hover card or popover — is an explicit, stated decision.
- [ ] The content is richer than a phrase; a short label went to `recursica-skill-tooltip` instead.
- [ ] Nothing inside is needed to complete a task, and nothing inside exists nowhere else.
- [ ] No form, form control, primary action, or list of actions is inside it.
- [ ] No card wraps the content.
- [ ] **Hover card:** contains nothing interactive, contains no tab stops, appears on focus of a focusable target, survives the pointer crossing the gap, dismisses with Escape, and never takes focus.
- [ ] **Popover:** its trigger is a real button in the tab order that announces what it opens and whether it is open; it opens with Enter or Space; it has an accessible name.
- [ ] **Popover:** focus moves in on open and returns to the trigger on every close path; Escape closes it; focus is not trapped.
- [ ] Every control inside a popover is a tab stop in visual order, with a real accessible name.
- [ ] A hover card's meaning is associated with its target as a description, and going unread is acceptable.
- [ ] Images inside have alternative text or are marked decorative.
- [ ] Nothing needed is hover-only; the focus ring is intact everywhere.
- [ ] No placement, size, or content variant was passed — none exists.
- [ ] No component-owned padding, width, color, elevation, or beak treatment was overridden.
- [ ] Nothing in the uncovered list was invented.
