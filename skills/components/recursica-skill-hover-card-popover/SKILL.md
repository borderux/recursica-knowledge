---
name: recursica-skill-hover-card-popover
description: Rules for the Recursica hover card and popover — richer content beside a target, choosing a read-only hover card or a click-opened interactive popover, and the accessibility each needs. Use for preview cards, profile previews, and popovers. Not for a short label — see recursica-skill-tooltip; not for a list of actions — see recursica-skill-menu.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Hover card and popover

A hover card or a popover shows richer content beside the element that opens the hover card or popover. That element is the trigger.

## When to use a hover card or popover

- **A preview saves the user from opening the full content.** Examples are a mini profile from an avatar or a username, a product summary from a product name, and a page preview from a link.
- **The content is richer than a phrase.** The content runs to more than one line, holds an image, or lists a few structured details.
- **Every piece of content in the hover card or popover is optional.** A user who never opens the hover card or popover loses nothing.

## When not to use a hover card or popover

| Situation                                                        | Use instead                                                                                        |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| A short text label for an icon-only control                      | A tooltip. See `recursica-skill-tooltip`.                                                          |
| The user needs the content to finish the task                    | The page. Put the content in view on the page.                                                     |
| The content is a list of actions or options                      | A menu. See `recursica-skill-menu`.                                                                |
| The user must make a decision before continuing                  | A modal. See `recursica-skill-modal`.                                                              |
| The user needs the content while working in the page             | A panel, or a region on the page. See `recursica-skill-panel`.                                     |
| The content is a form, or any form control                       | A page or a modal. See `recursica-skill-forms`.                                                    |
| The screen needs a place for a primary action                    | A button in view, outside the hover card or popover. See `recursica-skill-buttons-links`.          |
| The hover card or popover would be the only place a value exists | The page shows the value. A hover card or popover may also show the value, as an optional preview. |

**The most common mistake with this component is content or a control that only a pointer can reach.** A card that appears on hover and holds a button, a link, or a value found nowhere else cannot be reached by keyboard, and cannot be used on a touch screen. `recursica-skill-discoverability` forbids hiding any content or control the user would want to reach. Hiding the content or control behind hover is the worst case.

## Variants

**Use only the hover card and popover variants and options that the Recursica MCP server lists for the project.** A designer can add variants and options in Theme Forge, so each project can differ. Get the list with the server's `recursica_get_component_doc` tool, and use the names the code uses. Never invent a variant or an option.

The rules below describe each part and option by role, such as "the beak". The names in the standard UI kit (the unchanged UI kit in the official Recursica release) are examples only.

- **A hover card or popover has two parts:** a content area and a beak. The beak is the pointer that connects the card to the trigger. Tokens set the beak's size.
- **Placement.** If the project has a placement option, use the project's option. Otherwise, never set a position. Never position the beak by hand. See the open questions.
- **Width.** Tokens set a minimum width and a maximum width. If the project has a size variant, use the project's size variant. Content that does not fit inside the width limits belongs on the page.
- **Content type.** If the project has a content-type variant, use the project's variant. Ask before showing custom content when the project has no custom content type. See the open questions.
- **Hover card or popover.** If the project has a variant for the hover card or the popover, use the project's variant. The house rules treat a hover card and a popover as two different components. The behavior decides which of the two a build is, and the choice sets every accessibility requirement below.

The table compares the hover card and the popover.

|                      | **Hover card**                                         | **Popover**                                                                                               |
| -------------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| Opens on             | The pointer entering the trigger                       | A click or a tap, always                                                                                  |
| May contain controls | **No**                                                 | **Yes** — buttons and links, never a form control                                                         |
| Closes when          | The pointer leaves both the trigger and the hover card | A click outside the popover, a second click on the trigger, or Escape                                     |
| Focus                | Never moves                                            | Moves to the first control when the popover opens, and **returns to the trigger** when the popover closes |
| On a touch device    | Not available, because a touch screen has no hover     | The pattern that replaces a hover card                                                                    |

**A popover is a non-modal dialog** (a window that leaves the rest of the page usable). A popover does not block the page, and a popover does not trap focus. The popover is the hover card's partner that opens on a click. Of the two, only the popover may hold a control the user can operate.

## Rules

**Before building, decide and state whether the build is a hover card or a popover.** Exactly two choices are valid, and the requirements of the two differ:

- **Hover card.** A hover card opens when the pointer hovers over the trigger. A hover card contains no control (a button, a link, a form control, or any other element the user can operate) and holds no content the user needs. A hover card is a read-only preview and nothing else.
- **Popover.** A real trigger opens a popover on a click, Enter, or Space. A popover may contain controls. A keyboard user can use every part of a popover, and focus returns to the trigger.

A card that opens on hover and holds a control is not a third option. A card that opens on hover and holds a control is a failed build.

**Any control in the card makes the card a popover.** One link inside is enough. Build the card as a popover, with a real button as the trigger. The popover opens from the keyboard. Focus moves into the popover when the popover opens, and back to the trigger when the popover closes. Only a pointer user can reach a button inside a hover card.

**A hover card holds no content the user needs.** A hover card never holds the only copy of a value. A hover card never holds an action. A hover card never holds an explanation the user needs to move forward. Required content belongs on the page.

**Never make a hover card or popover the only place a piece of information exists.** `recursica-skill-system-conventions` forbids meaning that depends on a single channel (color, shape, position or text, each a separate signal). A card that appears only on hover is the narrowest channel of all.

**Do not put a form, a form section, or a single form control inside a hover card or popover.** `recursica-skill-forms` forbids all three in a hover card or popover, with no exception.

**Do not wrap the content in a card.** The hover card or popover is already the container. See `recursica-skill-card`.

**A short delay before a hover card or popover shows stops the card from opening by accident.** Without the delay, the card opens when the pointer crosses the trigger on the way to a different place on the screen. See the open questions.

**Closing a hover card or popover must be possible and obvious.** A popover closes on Escape, on a click outside the popover, and on a second click of the trigger. A hover card closes when the pointer leaves both the trigger and the hover card.

**On a touch device, a hover card has no trigger at all.** Where the content matters on a touch screen, build a popover, not a hover card that also opens on tap.

**Keep the primary action out of a hover card or popover.** Use one primary action per page, panel, modal, table row, or other container, in view in that container. See `recursica-skill-buttons-links`.

**Choose between a tooltip and a hover card or popover by the content, not by the look.** The standard UI kit has two different components, `tooltip` and `hover-card-popover`, with almost identical tokens, so the two look almost the same. A tooltip is a short text label for a control with no visible label. A hover card or popover holds richer content. Neither component may hold content the user needs to finish a task. Neither component may be the only place a piece of information exists.

## Accessibility

The rules below add to the accessibility baseline in `recursica-skill-system-conventions`, including the focus ring, which every Recursica component follows.

**Name whether the build is a hover card or a popover, then meet every requirement for that one.** The hover card and the popover have different requirements, and no build halfway between the two is safe. A build that meets half the requirements of each leaves content that only a pointer can reach.

### Screen readers

- **A popover's trigger must announce that the trigger opens a popover, and whether the popover is open now.** Without the open state, pressing the trigger seems to do nothing.
- **A popover needs an accessible name** (the name a screen reader reads out for a control). Use the popover's heading, or the name of the trigger that opened the popover. The accessible name tells a user who lands in the popover which popover the user is in.
- **Connect a hover card's content to the trigger as a description**, if the content carries any meaning at all. A screen reader reads content that sits next to a trigger with no connection as unrelated text, or does not read the content at all.
- **A hover card's content may go unread, and the design must accept unread content.** Because the content may go unread, a hover card may hold no content the user needs. Content the user must read belongs in a popover.
- **Every control in a popover needs a real accessible name**, exactly as on the page.
- **Never put meaning in a hover card or popover that exists nowhere else.** `recursica-skill-system-conventions` requires a second channel for any meaning the user must receive.
- **Do not announce a hover card or popover as an alert.** The card shows content the user asked for, and does not interrupt the user.
- **An image in a hover card or popover needs alternative text**, or must be marked as decorative. Otherwise, a profile preview made only of an avatar tells a screen reader user nothing.

### Keyboard and non-mouse navigation

- **A popover must open from the keyboard.** The popover's trigger is a real button in the tab order, and Enter or Space opens the popover. If a popover opens only on hover, a keyboard user cannot reach any control in the popover.
- **Focus moves into the popover when the popover opens, and returns to the trigger when the popover closes.** Every way of closing the popover returns focus to the trigger, such as Escape, using a control in the popover, or clicking outside the popover.
- **Escape closes the popover**, and returns focus to the trigger.
- **Every control in a popover is a tab stop (a place the Tab key lands), in visual order.** No control may sit in a card that only a pointer can reach.
- **Do not trap focus.** A popover does not block the page. A modal blocks the page, and a modal is the only component that traps focus. See `recursica-skill-modal`.
- **A hover card must contain no tab stops at all.** A hover card has none of the focus handling above. Content that needs a tab stop belongs in a popover.
- **A hover card must also appear when the trigger receives keyboard focus**, if the trigger can receive focus. The hover card must close with Escape without moving focus.
- **A hover card must stay open while the pointer moves from the trigger into the hover card.** A user cannot read a hover card that disappears in the gap between the trigger and the hover card. A user with unsteady pointer control can never read the hover card.
- **A hover card never takes focus.** Hovering never moves the user's focus.
- **No content, control or action the user needs may appear only on hover.** The whole component depends on this one rule.

## Styling set by tokens

**Do not set or override the properties below.** The hover card and popover tokens set each property:

- `colors`, `content-text`.
- `border-radius`, `border-size`.
- `horizontal-padding`, `vertical-padding`.
- `min-width`, `max-width`.
- `beak-size`, `elevation`.

**The beak is part of the hover card or popover.** Do not draw a separate beak, and do not move the beak the hover card or popover already shows.

## Related skills

- `recursica-skill-discoverability` — progressive disclosure, the three cases where hiding content is not safe, and the rule that progressive disclosure never defends a dark pattern.
- `recursica-skill-system-conventions` — never show meaning in a single channel, and a hidden affordance must stay reachable by keyboard and by assistive technology.

### Only if used on the same screen

- `recursica-skill-tooltip` — the tooltip, for a short text label on a control with no visible label, and why a tooltip and a hover card or popover are not interchangeable despite matching tokens.
- `recursica-skill-menu` — where a list of actions or options goes, and the menu's rules for returning focus.
- `recursica-skill-panel` — the panel, for content the user needs while working in the page.

## Open questions

- **Whether the single set of tokens should become two sets.** The standard UI kit uses one set of tokens for both a hover card and a popover. The behavior of each is settled and written down separately. Ask before assuming a hover card and a popover can look different. Ask only when the project has no separate hover card and popover styles.
- **Placement.** The design-system website shows four positions (top, left, right and bottom) and three beak alignments (start, middle and end). Do not rely on a position or a beak alignment without asking. Ask about a position or a beak alignment only when the project has no placement option. With or without a placement option, no rule covers what happens at the edge of the viewport.
- **The delay before showing, the delay before hiding, and the grace period** while the pointer crosses from the trigger to the card. No rule sets any of the three.
- **Custom content.** The design-system website shows two content types, text and custom. Do not rely on custom content without asking. Ask only when the project has no custom content type.
- **Behavior on touch.** A touch screen has no hover, and no rule sets a different pattern for touch.
- **Whether a popover may open from inside a menu, a modal, or another popover.** `recursica-skill-modal` forbids stacking modals, but no rule covers a popover.

## Pre-flight checklist

- [ ] The build is stated to be a hover card or a popover.
- [ ] The content is richer than a phrase, and every short label uses `recursica-skill-tooltip` instead.
- [ ] No content in the hover card or popover is needed to finish a task, and no content exists only in the hover card or popover.
- [ ] No form, form control, primary action, or list of actions is in the hover card or popover.
- [ ] No card wraps the content.
- [ ] **Hover card:** the hover card holds no control and no tab stops. The hover card appears when a trigger that can take focus receives focus, stays open as the pointer crosses the gap between the trigger and the hover card, closes with Escape, and never takes focus.
- [ ] **Popover:** the trigger is a real button in the tab order that announces what the trigger opens and whether the popover is open. Enter or Space opens the popover, and the popover has an accessible name.
- [ ] **Popover:** focus moves into the popover when the popover opens, and returns to the trigger on every way of closing the popover. Escape closes the popover, and focus is not trapped.
- [ ] Every control in a popover is a tab stop, in visual order, with a real accessible name.
- [ ] Any hover card content that carries meaning is connected to the trigger as a description, and the hover card is acceptable to leave unread.
- [ ] Every image in a hover card or popover has alternative text, or is marked as decorative.
- [ ] No content, control or action the user needs appears only on hover, and the focus ring is intact everywhere.
- [ ] Every variant and option is one the Recursica MCP server lists for the project, and no placement, size, or content variant is invented.
- [ ] Padding, width, color, elevation, and beak styling come from the component.
- [ ] Open questions were asked about, not decided: whether the single set of tokens should become two sets, placement, the show and hide delays and the grace period, custom content, behavior on touch, and a popover opened from a menu, a modal, or another popover.
