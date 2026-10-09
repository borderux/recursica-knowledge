---
name: recursica-skill-hover-card-popover
description: Rules for the Recursica hover card and popover — richer content beside a target, choosing a read-only hover card or a click-opened interactive popover, and the accessibility each needs. Use for preview cards, profile previews, and popovers. Not for a short label — see recursica-skill-tooltip; not for a list of actions — see recursica-skill-menu.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Hover card and popover

A hover card or a popover shows richer content in a box beside a trigger. A trigger is the element that opens the hover card or popover, such as an avatar or a link.

## When to use a hover card or popover

- **A preview saves the persona from opening the full content.** One example is a mini profile from an avatar or a username. Other examples are a product summary from a product name and a page preview from a link.
- **The content is richer than a phrase.** The content runs to more than one line, holds an image, or lists a few structured details.
- **Every piece of content in the hover card or popover is optional.** A persona who never opens the hover card or popover loses nothing.

## When not to use a hover card or popover

| Situation                                                        | Use instead                                                                                        |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| A short text label for an icon-only control                      | A tooltip. See `recursica-skill-tooltip`.                                                          |
| The persona needs the content to finish the task                 | The page. Put the content in view on the page.                                                     |
| The content is a list of actions or options                      | A menu. See `recursica-skill-menu`.                                                                |
| The persona must make a decision before continuing               | A modal. See `recursica-skill-modal`.                                                              |
| The persona needs the content while working in the page          | A panel, or a region on the page. See `recursica-skill-panel`.                                     |
| The content is a form, or any form control                       | A page or a modal. See `recursica-skill-forms`.                                                    |
| The screen needs a place for a primary action                    | A button in view, outside the hover card or popover. See `recursica-skill-buttons-links`.          |
| The hover card or popover would be the only place a value exists | The page shows the value. A hover card or popover may also show the value, as an optional preview. |

**The most common hover card or popover mistake is content or a control that only a pointer can reach.** For example, a card opens on hover and holds a button, a link, or a value found nowhere else.

- A persona using the keyboard cannot reach the button, link or value.
- A persona on a touch screen cannot use the button, link or value.

`recursica-skill-discoverability` forbids hiding any content or control the persona would want to reach. Hiding the content or control behind hover is the worst case.

## Variants

**Use only the hover card and popover variants and options that the Recursica MCP server lists for the theme (the design a designer sets in Theme Forge: the token values, and each component's variants, states and sizes).** A designer can add variants and options in Theme Forge, so each theme can differ. Get the list with the server's `recursica_get_component_doc` tool, and use the names the code uses. Never invent a variant or an option.

The rules below name each part and option by role, such as "the beak". The names in the standard UI kit (the unchanged UI kit in the official Recursica release) are examples only.

- **A hover card or popover has two parts:** a content area and a beak. The beak is the pointed tip that connects the hover card or popover to the trigger.
- **If the theme has a placement option, use the placement option.** Otherwise, never set a position for the hover card or popover. Never position the beak by hand. See the open questions.
- **Put content that does not fit inside the width limits of a hover card or popover on the page.** The theme sets a minimum width and a maximum width for a hover card or popover. If the theme has a size variant, use the size variant.
- **If the theme has a content-type variant, use the content-type variant.** If the theme has no custom content type, confirm with the user before showing custom content. See the open questions.
- **If the theme has a variant for the hover card or the popover, use that variant.** The house rules treat a hover card and a popover as two different components. The build's behavior decides whether the build is a hover card or a popover. The choice between a hover card and a popover sets every accessibility requirement below.

|                      | **Hover card**                                         | **Popover**                                                                                               |
| -------------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| Opens on             | The pointer entering the trigger                       | A click or a tap, always                                                                                  |
| May contain controls | **No**                                                 | **Yes** — buttons and links, never a form control                                                         |
| Closes when          | The pointer leaves both the trigger and the hover card | A click outside the popover, a second click on the trigger, or Escape                                     |
| Focus                | Never moves                                            | Moves to the first control when the popover opens, and **returns to the trigger** when the popover closes |
| On a touch device    | Not available, because a touch screen has no hover     | The pattern that replaces a hover card                                                                    |

**A popover is a non-modal dialog** (a window that leaves the page behind the window usable). A popover does not block the page, and a popover does not trap focus.

## Rules

**Before building, decide whether the build is a hover card or a popover, and state the choice.** Only two choices are valid. A hover card and a popover have different requirements:

- **Hover card.** A hover card opens when the pointer hovers over the trigger. A hover card is a read-only preview and nothing else, such as a mini profile. A hover card contains no control. A control is a button, a link, a form control, or any other element the persona can operate. A hover card holds no content the persona needs.
- **Popover.** A popover opens when the persona clicks a real trigger, or presses Enter or Space on the trigger. A popover may contain controls, such as buttons and links. A persona using a keyboard can use every part of a popover. Focus returns to the trigger when the popover closes.

A card that opens on hover and holds a control is a failed build, not a third option.

**Any control in the card makes the card a popover.** One link inside the card is enough. Build the card as a popover:

- Use a real button as the trigger.
- Make the popover open from the keyboard.
- Move focus into the popover when the popover opens.
- Move focus back to the trigger when the popover closes.

Only a persona using a pointer can reach a button inside a hover card.

**Keep content the persona needs out of a hover card. Put required content on the page.** A hover card never holds:

- the only copy of a value
- an action
- an explanation the persona needs to move forward

**Never make a hover card or popover the only place a piece of information exists.** For example, when a hover card shows a customer's email address, the page shows the email address too. `recursica-skill-system-conventions` forbids meaning that depends on a single channel (color, shape, position or text, each a separate signal). A card that appears only on hover is the narrowest channel of all.

**Do not put a form, a form section, or a single form control inside a hover card or popover.** `recursica-skill-forms` forbids all three in a hover card or popover, with no exception.

**Do not wrap the content of a hover card or popover in a card.** The hover card or popover is the container. See `recursica-skill-card`.

**A short delay before a hover card or popover shows stops the hover card or popover from opening by accident.** Without the delay, a pointer crossing the trigger toward another part of the screen opens the hover card or popover. See the open questions.

**Closing a hover card or popover must be possible and obvious.**

- A popover closes on Escape, on a click outside the popover, and on a second click of the trigger.
- A hover card closes when the pointer leaves both the trigger and the hover card.

**A hover card cannot open on a touch device, because a touch screen has no hover.** If the content matters on a touch screen, build a popover, not a hover card that also opens on tap.

**Keep the primary action out of a hover card or popover.** Use one primary action per page, panel, modal, table row, or other container, in view in that container. See `recursica-skill-buttons-links`.

**Choose between a tooltip and a hover card or popover by the content, not by the look.** The standard UI kit has two different components, `tooltip` and `hover-card-popover`, and the two look almost the same.

- A tooltip is a short text label for a control with no visible label. For example, the tooltip on a trash-can icon button says "Delete".
- A hover card or popover holds richer content, such as a mini profile.
- Neither component may hold content the persona needs to finish a task.
- Neither component may be the only place a piece of information exists.

## Accessibility

The rules below add to the accessibility baseline in `recursica-skill-system-conventions`, including the focus ring, which every Recursica component follows.

**Name whether the build is a hover card or a popover, then meet every requirement for the named component.** No build halfway between the two is safe. A build that meets half the requirements of each leaves content that only a pointer can reach.

### Screen readers

- **A popover's trigger must announce that the trigger opens a popover, and whether the popover is open now.** Without the open state, pressing the trigger seems to do nothing.
- **A popover needs an accessible name** (the name a screen reader reads out for a control). Use the popover's heading, or the name of the trigger that opened the popover. The accessible name tells a persona who lands in the popover which popover the persona is in.
- **If a hover card's content has any meaning at all, connect the content to the trigger as a description.** A screen reader reads unconnected content beside a trigger as unrelated text, or does not read the content at all.
- **The design must still work when a hover card's content goes unread.** A hover card's content might go unread, so a hover card may hold no content the persona needs. Put content the persona must read in a popover.
- **Every control in a popover needs a real accessible name**, exactly as on the page.
- **Never put meaning in a hover card or popover that exists nowhere else.** `recursica-skill-system-conventions` requires a second channel for any meaning the persona must receive.
- **Do not announce a hover card or popover as an alert.** The card shows content the persona asked for, and does not interrupt the persona.
- **An image in a hover card or popover needs alternative text**, or must be marked as decorative. Otherwise, a profile preview made only of an avatar tells a persona using a screen reader nothing.

### Keyboard and non-mouse navigation

- **A popover must open from the keyboard.** The popover's trigger is a real button in the tab order, and Enter or Space opens the popover. If a popover opens only on hover, a persona using a keyboard cannot reach any control in the popover.
- **Focus moves into the popover when the popover opens, and returns to the trigger when the popover closes.** Every way of closing the popover returns focus to the trigger. Ways of closing include Escape, using a control in the popover, and clicking outside the popover.
- **Escape closes the popover**, and returns focus to the trigger.
- **Every control in a popover is a tab stop (a place the Tab key lands), in visual order.** No control may sit in a card that only a pointer can reach.
- **Do not trap focus.** A popover does not block the page. A modal blocks the page, and a modal is the only component that traps focus. See `recursica-skill-modal`.
- **A hover card must contain no tab stops at all.** A hover card has none of the popover focus behavior above. Put content that needs a tab stop in a popover.
- **If the trigger can receive focus, a hover card must also appear when the trigger receives keyboard focus.** For example, tabbing to a username link opens the username's hover card. The hover card must close with Escape without moving focus.
- **A hover card must stay open while the pointer moves from the trigger into the hover card.** A persona cannot read a hover card that disappears in the gap between the trigger and the hover card. A persona with unsteady pointer control can never read the hover card.
- **A hover card never takes focus.** Hovering never moves the persona's focus.
- **No content, control or action the persona needs may appear only on hover.** The whole hover card or popover component depends on this one rule.

## Styling set by tokens

**Never set or override the hover card or popover's styling.** The theme sets every visual property of the hover card or popover, such as size, spacing, borders, colors and animation. Do not add extra containers or spacers to change the hover card or popover's look. If the theme does not give a look the design needs, report the missing look as a design-system gap. See `recursica-skill-design-router`.

**The beak is part of the hover card or popover.** Do not draw a separate beak, and do not move the beak on the hover card or popover.

## Related skills

- `recursica-skill-discoverability` — progressive disclosure, and the three cases where hiding content is not safe. `recursica-skill-discoverability` also says progressive disclosure never justifies a dark pattern.
- `recursica-skill-system-conventions` — never show meaning in a single channel, and a hidden affordance must stay reachable by keyboard and by assistive technology.

### Only if used on the same screen

- `recursica-skill-tooltip` — the tooltip, for a short text label on a control with no visible label. `recursica-skill-tooltip` also explains why a tooltip and a hover card or popover are not interchangeable. The two components look almost the same.
- `recursica-skill-menu` — where a list of actions or options goes, and the menu's rules for returning focus.
- `recursica-skill-panel` — the panel, for content the persona needs while working in the page.

## Open questions

- **Placement.** The design-system website shows four positions (top, left, right and bottom) and three beak alignments (start, middle and end). Do not rely on a position or a beak alignment without confirming with the user. Confirm a position or a beak alignment with the user only when the theme has no placement option. With or without a placement option, no rule covers what happens at the edge of the viewport.
- **Delays and the grace period.** No rule sets the delay before showing or the delay before hiding. No rule sets the grace period while the pointer crosses from the trigger to the card.
- **Custom content.** The design-system website shows two content types, text and custom. Do not rely on custom content without confirming with the user. Confirm with the user only when the theme has no custom content type.
- **Behavior on touch.** A touch screen has no hover, and no rule sets a different pattern for touch.
- **Whether a popover may open from inside a menu, a modal, or another popover.** `recursica-skill-modal` forbids stacking modals, but no rule covers a popover.

## Pre-flight checklist

- [ ] The build is named as either a hover card or a popover.
- [ ] The content is richer than a phrase, and every short label uses `recursica-skill-tooltip` instead.
- [ ] No content in the hover card or popover is needed to finish a task.
- [ ] No content exists only in the hover card or popover.
- [ ] No form, form control, primary action, or list of actions is in the hover card or popover.
- [ ] No card wraps the content.
- [ ] **Hover card:** the hover card holds no control and no tab stops, and never takes focus.
- [ ] **Hover card:** the hover card appears when a trigger that can take focus receives focus, and closes with Escape.
- [ ] **Hover card:** the hover card stays open as the pointer crosses the gap between the trigger and the hover card.
- [ ] **Popover:** the trigger is a real button in the tab order, and Enter or Space opens the popover.
- [ ] **Popover:** the trigger announces what the trigger opens and whether the popover is open.
- [ ] **Popover:** the popover has an accessible name.
- [ ] **Popover:** focus moves into the popover on opening, and returns to the trigger on every way of closing.
- [ ] **Popover:** Escape closes the popover, and focus is not trapped.
- [ ] Every control in a popover is a tab stop, in visual order, with a real accessible name.
- [ ] Any hover card content that has any meaning at all is connected to the trigger as a description.
- [ ] The hover card is acceptable to leave unread.
- [ ] Every image in a hover card or popover has alternative text, or is marked as decorative.
- [ ] No content, control or action the persona needs appears only on hover, and the focus ring is intact everywhere.
- [ ] Every variant and option is one the Recursica MCP server lists for the theme.
- [ ] No placement, size, or content variant is invented.
- [ ] No styling is set or overridden on the hover card or popover.
- [ ] No container or spacer is added to change the hover card or popover's look.
- [ ] Open questions were asked about, not decided: placement, the show and hide delays and the grace period, custom content, behavior on touch, and a popover opened from a menu, a modal, or another popover.
