---
name: recursica-skill-hover-card-popover
description: Rules for the Recursica hover card and popover — richer content beside a target, choosing a read-only hover card or a click-opened interactive popover, and the accessibility each needs. Use for preview cards, profile previews, and popovers. Not for a short label — see recursica-skill-tooltip; not for a list of actions — see recursica-skill-menu.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Hover card and popover

A hover card or a popover reveals richer content beside the element that triggers it.

## When to use a hover card or popover

- **A preview saves the user a trip** — a mini profile from an avatar or a username, a product summary from a product name, a page preview from a link.
- **The content is richer than a phrase** — more than one line, an image, or a small set of structured details.
- **Everything inside is optional.** If the user never opens it, they lose nothing.

## When not to use a hover card or popover

| Instead of a hover card or popover                   | Use                                                       |
| ---------------------------------------------------- | --------------------------------------------------------- |
| A short text label for an icon-only control          | `recursica-skill-tooltip`                                 |
| The content is needed to finish the task             | The page. Put it in view                                  |
| It is a list of actions or options                   | `recursica-skill-menu`                                    |
| A decision must be made before the user continues    | `recursica-skill-modal`                                   |
| The user needs the content while working in the page | `recursica-skill-panel`, or a region on the page itself   |
| The content is a form, or any form control           | A page or a modal — `recursica-skill-forms`               |
| A primary action needs somewhere to live             | A button on the surface — `recursica-skill-buttons-links` |
| The content is the only place a value exists         | The page, plus this as an optional preview                |

**A path that only a pointer can follow is the failure most often built into this component.** A surface revealed on hover that contains a button, a link, or a value found nowhere else cannot be reached by keyboard, and cannot be used on touch. `recursica-skill-discoverability` forbids hiding anything the user would want to reach, and hiding it behind hover is the worst case.

## Variants

Taken from the UI kit (the token file, `recursica_ui-kit.json`, that says which variants and states each component has) → `ui-kit.components.hover-card-popover`. **The component has no variant properties at all** — no placement variant property, no size variant property, no content-type variant property, and nothing that tells a hover card apart from a popover. One spec, one set of fixed properties.

**What the component provides:** a content area and a beak — the pointer connecting the card to its target. `beak-size` is set by tokens; unlike the tooltip, there is no `beak-inset`.

**There is no placement option.** There is no top, left, right, or bottom option. Do not pass a position setting, and do not position the beak by hand.

**There is no size variant property.** `min-width` and `max-width` are fixed. Content that does not fit inside them is page content.

**There is no content-type variant property.** `content-text` is the only content property in the UI kit. A custom content type is shown only on the design-system website — see the open questions.

**Nothing in the UI kit tells hover behavior apart from click behavior — but the house does, and the two are different components.** One token spec is behind both. Its behavior decides which of the two it is, and that decides every accessibility requirement below. Before building, state whether it is a hover card or a popover.

|                                 | **Hover card**                                  | **Popover**                                                                                         |
| ------------------------------- | ----------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Opens on                        | The pointer entering the target                 | A click or a tap, always                                                                            |
| May contain interactive content | **No**                                          | **Yes** — buttons, links, simple form controls                                                      |
| Closes when                     | The pointer leaves both the target and the card | A click outside it, a second click on the trigger, or Escape                                        |
| Focus                           | Never moves                                     | Moves to the first interactive element when it opens, and **returns to the trigger** when it closes |
| On a touch device               | Not available — there is no hover               | The pattern that replaces a hover card                                                              |

**A popover is a non-modal dialog** (a window that leaves the rest of the page usable). It does not block the page, and it does not trap focus. It is the click-triggered partner of the hover card, and the only one of the two that may hold anything the user can operate.

**Neither has a placement variant property**, even though four positions and three beak alignments are shown only on the design-system website. See the open questions.

**`tooltip` and `hover-card-popover` are two different components with almost identical tokens.** Do not choose between them on styling, because the styling is effectively the same. Choose on content: a tooltip is a short text label for a control with no visible label, and this component holds richer content. Neither may hold anything the user needs in order to finish a task, and neither may be the only place a piece of information exists.

## Rules

**Before building, decide and state which of the two it is.** There are exactly two valid choices, and their requirements differ:

- **Hover card** — opens on pointer hover, contains nothing interactive, and holds nothing the user needs. A read-only preview, and nothing else.
- **Popover** — opened by a real trigger with a click, Enter, or Space. May contain interactive content, and can be fully used by keyboard, including returning focus.

A surface that opens on hover and has a control in it is not a third option; it is the failure.

**If it contains anything interactive, it is a popover.** One link inside is enough to make it a popover — and that means a real button trigger, opening from the keyboard, and managing focus.

**A hover card holds nothing the user needs.** Not the only copy of a value, not an action, and not an explanation needed to move forward. If the content is required, it belongs on the page.

**Never the only place a piece of information exists.** `recursica-skill-system-conventions` forbids meaning that depends on a single channel (color, shape, position or text, each a separate signal), and a surface revealed on hover is the narrowest channel there is.

**Do not put a form, a form section, or a single form control inside it.** `recursica-skill-forms` forbids that, with no exception.

**Do not wrap the content in a card.** The popover is the boundary — see `recursica-skill-card`.

**A short delay before it shows prevents it opening by accident** when the pointer crosses the target on its way somewhere else. The length of the delay is not set by a token — see the open questions.

**It must be possible, and obvious, to close it.** A popover closes on Escape, on a click outside it, and on a second click of its trigger. A hover card closes when the pointer leaves both the target and the card.

**Anything interactive means it is a popover, so build it as one** — with a real button as the trigger, the ability to open from the keyboard, and focus moving in when it opens and back to the trigger when it closes. A hover card with a button inside it cannot be reached by anyone not using a pointer.

**On a touch device, a hover card has no trigger at all.** Where the content matters on touch, build a popover — not a hover card that also opens on tap.

**It is not where a primary action goes.** One primary action per surface, out in the open — `recursica-skill-buttons-links`.

## Accessibility

This component also follows the accessibility baseline in `recursica-skill-system-conventions`, including the focus ring. Only the rules specific to this component are listed here.

The two kinds have different requirements, and no build between them is safe. Name the kind, then meet every requirement in its column. A build that meets half of each leaves content that only a pointer can reach, which is what this section prevents.

### Screen readers

- **A popover's trigger must announce that it opens something, and whether it is open right now.** Without the open state, activating it seems to do nothing.
- **A popover needs an accessible name** (the name a screen reader reads out for a control) — its heading, or the name of the trigger that opened it — so a user who lands in it knows what they are in.
- **A hover card's content must be connected to its target as a description**, if it carries any meaning at all. Content that appears next to a target but is connected to nothing is announced as unrelated text, or not announced at all.
- **A hover card's content may go unread, and that must be acceptable.** This is the whole reason a hover card may hold nothing that is needed. Content that must be read belongs in a popover.
- **Anything interactive inside a popover needs a real accessible name**, exactly as it would on the page.
- **Never put meaning here that exists nowhere else.** `recursica-skill-system-conventions` requires a second channel for any meaning the user must receive.
- **Do not announce the card as an alert.** It is content revealed when asked for, not something that interrupts.
- **An image inside needs alternative text**, or must be marked as decorative. Otherwise, a profile preview made entirely of an avatar tells the user nothing.

### Keyboard and non-mouse navigation

- **A popover must open from the keyboard.** Its trigger is a real button in the tab order, opened with Enter or Space. If it opens only on hover, nothing inside can be reached by keyboard.
- **Focus moves into the popover when it opens, and returns to the trigger when it closes.** Every way of closing it — Escape, activating something inside, clicking away — returns focus to the trigger.
- **Escape closes the popover**, and returns focus to the trigger.
- **Every control inside a popover is a tab stop (a place the Tab key lands), in visual order.** Nothing interactive may live in a surface that only a pointer can reach.
- **Do not trap focus.** A popover does not block the page. `recursica-skill-modal` is the component that does, and it is the only one that traps focus.
- **A hover card must contain no tab stops at all.** It has none of the machinery above. Content that needs a tab stop belongs in a popover.
- **A hover card must also appear when its target receives keyboard focus**, if the target can receive focus, and it must close with Escape without moving focus.
- **A hover card must stay open while the pointer travels from the target into the card.** One that disappears in the gap cannot be read — and cannot be read at all by anyone with unsteady pointer control.
- **A hover card never takes focus.** Focus is never moved for the user by something they only hovered over.
- **Nothing needed may appear only on hover.** This is the single rule the whole component depends on.

## Styling set by tokens

Do not set or override any of these. The component sets them:

- `colors`, `content-text`.
- `border-radius`, `border-size`.
- `horizontal-padding`, `vertical-padding`.
- `min-width`, `max-width`.
- `beak-size`, `elevation`.

The beak is part of the component. Do not draw a separate beak, and do not reposition the one provided.

## Related skills

- `recursica-skill-discoverability` — progressive disclosure, the three cases where hiding is not safe, and the rule that it never defends a dark pattern.
- `recursica-skill-system-conventions` — never carry meaning in a single channel; a hidden affordance must stay keyboard and assistive-technology reachable.

### Only if used on the same screen

- `recursica-skill-tooltip` — the sibling component for a short text label on an unlabeled control, and why the two are not interchangeable despite matching tokens.
- `recursica-skill-menu` — where a list of actions or options goes, and its focus-return requirements.
- `recursica-skill-panel` — the surface for content the user needs while working in the page.

## Open questions

- **Whether the single token spec should become two.** The behaviors are settled and documented separately, but one spec is behind both, so the inventory does not say which properties a popover uses and which a hover card uses. Ask before assuming they can look different.
- **Placement.** Four positions — top, left, right, bottom — and three beak alignments — start, middle, end — are shown only on the design-system website, with no tokens behind them. Do not rely on them without asking, and no rule covers what happens at the edge of the viewport.
- **The delay before showing, the delay before hiding, and the grace period** while the pointer crosses from the target to the card. No token or rule defines any of them.
- **Custom content.** Content types of text and custom are shown only on the design-system website, but the UI kit only offers `content-text`. Do not rely on this without asking.
- **Behavior on touch.** Hover does not exist on touch, and no alternative pattern is specified.
- **Whether a popover may be opened from inside a menu, a modal, or another popover.** `recursica-skill-modal` forbids stacking modals, but nothing states the rule here.
- **Whether a popover may be closed by clicking the page behind it**, which `recursica-skill-modal` also leaves open.

## Pre-flight checklist

- [ ] Whether it is a hover card or a popover is decided and stated.
- [ ] The content is richer than a phrase, and any short label uses `recursica-skill-tooltip` instead.
- [ ] Nothing inside is needed to finish a task, and nothing inside exists only here.
- [ ] No form, form control, primary action, or list of actions is inside it.
- [ ] No card wraps the content.
- [ ] **Hover card:** it contains nothing interactive and no tab stops, appears when a focusable target receives focus, stays open as the pointer crosses the gap, closes with Escape, and never takes focus.
- [ ] **Popover:** its trigger is a real button in the tab order that announces what it opens and whether it is open. It opens with Enter or Space, and it has an accessible name.
- [ ] **Popover:** focus moves in when it opens and returns to the trigger on every way of closing it. Escape closes it, and focus is not trapped.
- [ ] Every control inside a popover is a tab stop, in visual order, with a real accessible name.
- [ ] A hover card's meaning is connected to its target as a description, and it is acceptable for it to go unread.
- [ ] Images inside have alternative text, or are marked as decorative.
- [ ] Nothing needed appears only on hover, and the focus ring is intact everywhere.
- [ ] No placement, size, or content variant is set on it — none exists.
- [ ] Padding, width, color, elevation, and beak styling come from the component.
- [ ] Open questions were asked about, not decided: whether the single token spec should become two, placement, the show and hide delays and the grace period, custom content, behavior on touch, a popover opened from a menu, a modal, or another popover, and closing a popover by clicking the page behind it.
