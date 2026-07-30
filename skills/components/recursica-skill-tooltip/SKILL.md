---
name: recursica-skill-tooltip
description: How to use the Recursica tooltip correctly — when a short label for an unlabeled control is right and when the content belongs on the page instead, why the tooltip has no placement or size axis, the prohibition on controls, links, and information that exists nowhere else, and the screen-reader and keyboard requirements including appearing on focus and dismissing with Escape. Use whenever adding, reviewing, or refactoring a tooltip, labeling an icon-only button, or revealing truncated text. Trigger on "tooltip", "hover text", "title attribute", "icon button label", "truncated text", "ellipsis text", "beak", "aria-describedby", "screen reader", "tab order", or a request to explain a control on hover. Do NOT use for richer content or anything interactive — that is recursica-skill-hover-card-popover. Do NOT use for a field's format rule or error text — that is recursica-skill-text-field. Do NOT use for whether a control needs a tooltip at all — that is recursica-skill-buttons-links.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Tooltip

A tooltip is a short text label for a control that has no visible one.

## Use it when

- **A control is icon-only.** `recursica-skill-buttons-links` requires a tooltip on every icon-only button, with no exceptions.
- **Visible text has been truncated with an ellipsis** and the tooltip shows it in full.
- **An unusual function needs one clarifying phrase** that a new user may not infer — and only where the label is already good. Never to rescue a weak label.

## Do not use it when

| Instead of a tooltip                                  | Use                                                                    |
| ----------------------------------------------------- | ---------------------------------------------------------------------- |
| The information is needed to complete the task        | The page. Put it in view                                               |
| The content is richer than a short phrase             | `recursica-skill-hover-card-popover`                                   |
| The content contains a link, a button, or any control | `recursica-skill-hover-card-popover`, built as its interactive variety |
| A button's label is weak                              | A better label — `recursica-skill-buttons-links`                       |
| A field needs a format rule, a hint, or an error      | Assistive text, which is persistent — `recursica-skill-text-field`     |
| A control needs a name for assistive technology       | A real accessible name. A tooltip is a description, never a name       |
| The user must acknowledge or decide something         | `recursica-skill-modal`                                                |
| The explanation runs to a paragraph                   | The page, or a panel — `recursica-skill-panel`                         |

**A tooltip is supplementary by definition.** Nothing inside it may be the only copy of a piece of information, because on a touch device there is no hover and the user may never see it at all.

## What exists

Taken from `recursica_ui-kit.json` → `ui-kit.components.tooltip`. **The tooltip has no variant axes whatsoever** — no placement axis, no size axis, no content-type axis. Every listed item is a fixed property.

**What the component provides:** a text area and a **beak** — the small pointer that connects the tooltip to its trigger. `beak-size` and `beak-inset` are set by tokens.

**You cannot set placement.** There is no top, left, right, or bottom option, and no beak-alignment option. Both are documented outside the token inventory; the kit defines neither — see Uncovered. Do not pass a position prop and do not hand-position the beak.

**There is no size axis.** `min-width`, `max-width`, and `min-height` are fixed. If the content does not fit inside them, it is not tooltip content.

**There is no rich-content or custom-content axis.** `text` is the only content property. A tooltip holds text.

**`tooltip` and `hover-card-popover` are two different components with almost identical tokens.** Do not choose between them on styling, because the styling is effectively the same. Choose on content:

- **Tooltip** — a short text label for a control that has no visible one.
- **Hover card / popover** — richer content beside a target. See `recursica-skill-hover-card-popover`.

Neither may hold anything the user needs in order to complete a task, and neither may be the only place a piece of information exists.

## Rules for using it

**One short phrase, naming the control.** "Delete invoice", not a sentence. It is a label, not documentation.

**Never the only place a piece of information lives.** If it matters, it is also on the page, in the accessible name, or in assistive text.

**Never put a control or a link inside a tooltip.** The moment something inside needs to be clicked, the user has to keep the pointer on the trigger while reaching it, which is a pointer trap. That content belongs in a popover.

**A tooltip is not a label for a form field.** Fields get visible labels and persistent assistive text — see `recursica-skill-text-field`.

**A button with both an icon and a label rarely needs one.** `recursica-skill-buttons-links` makes it optional there, and only for ancillary information about an unusual function.

**Not a validation or error mechanism.** An error must be persistent and associated with its field; see `recursica-skill-forms`.

**Truncating text and adding a tooltip is not a fix for a column that is too narrow.** Repeated truncation is a structural problem — see `recursica-skill-tables` and `recursica-skill-system-conventions`.

**Do not use the browser's `title` attribute as the tooltip.** It does not appear on keyboard focus, cannot be dismissed, and is unreliably announced. Use the component.

## Accessibility

A tooltip is the component most often used to paper over a missing accessible name, and it cannot do that job. Everything below is behavior you must ensure.

### Screen readers

- **Associate the tooltip with its control** so it is announced as that control's description. A loose, absolutely positioned element beside the control is announced as unrelated text, or not at all.
- **A tooltip is never the accessible name substitute for an unlabeled control.** The control needs its own name. An icon-only button gets both a name and a tooltip; if only one of the two exists, it must be the name.
- **The name and the tooltip should say the same thing.** A user who speaks the tooltip text must be able to activate the control by voice.
- **Never put meaning in a tooltip that exists nowhere else.** A tooltip is a single channel, and `recursica-skill-system-conventions` forbids that for any meaning the user must receive.
- **Nothing inside a tooltip is announced as interactive**, because nothing inside it is interactive.
- **Truncated text must be available in full programmatically**, not only in the tooltip. A screen reader user does not experience the truncation and must not experience a cut-off value either.
- **The tooltip must not be announced as a live region.** It is a description, read when its control is reached — not an alert that interrupts.

### Keyboard and non-mouse navigation

- **It must appear on keyboard focus as well as on hover.** A hover-only tooltip is invisible to every keyboard user, which means every icon-only button on the surface is unlabeled for them.
- **It must stay visible long enough to read**, and must not vanish while the pointer is still on the control or focus is still on it. No auto-hide that removes it mid-sentence.
- **It must be dismissible with Escape without moving focus.** A tooltip can overlap the content underneath it, so the user needs a way to clear it — and clearing it must not blur the control.
- **It must not contain a control or a link**, which is also why it needs no internal tab handling. If it needs a tab stop, it is a popover.
- **Never move focus into the tooltip.** It is not focusable and is never a tab stop.
- **The trigger must be focusable.** A tooltip attached to something no one can focus can never appear for a keyboard user.
- **Never suppress the focus ring** on the trigger. A tooltip appearing is not a focus indicator.
- **Nothing needed may be hover-only** — which, for this component, means nothing needed may be in it at all.

## Not your decision

Do not implement, override, or tune any of these — the component owns them:

- `elevation`, `border-size`, `border-radius`, `colors`, `text`.
- `vertical-padding`, `horizontal-padding`.
- `min-width`, `max-width`, `min-height`.
- `beak-size`, `beak-inset`.

The beak is part of the component. Do not draw your own, and do not reposition the one provided.

## Load these too

- [`recursica-skill-buttons-links`](../../design-rules/recursica-skill-buttons-links/SKILL.md) — which controls must have a tooltip, which may, and the rule that a tooltip never rescues a weak label.
- [`recursica-skill-hover-card-popover`](../recursica-skill-hover-card-popover/SKILL.md) — the sibling component for richer or interactive content, and the hover-only failure mode it must avoid.
- [`recursica-skill-text-field`](../recursica-skill-text-field/SKILL.md) — visible labels, assistive text, and error text, all of which are persistent and none of which is a tooltip.
- [`recursica-skill-system-conventions`](../../design-rules/recursica-skill-system-conventions/SKILL.md) — never carry meaning in a single channel; fix the structure rather than truncating and annotating.

## Uncovered — ask, do not invent

- **Placement.** A position axis of top, left, right, and bottom, a beak-alignment axis of start, middle, and end, and a `position` prop are all documented outside the token inventory. The kit defines no placement axis at all — only `beak-size` and `beak-inset` as fixed properties. Do not rely on this without asking.
- **Custom content.** Content types of "text" and "custom" are documented outside the token inventory. The kit has only `text`. Do not rely on this without asking.
- **Show delay, hide delay, and any auto-hide duration.** No token or rule defines them.
- **Touch behavior.** Hover does not exist on touch, and no alternative pattern is specified for reaching a tooltip's content there.
- **Whether a tooltip may attach to a non-interactive element** — a truncated table cell, a chart label — given that a non-focusable target can never reveal it from the keyboard.
- **Behavior at a viewport edge**, with no placement axis available to flip it.

## Pre-flight checklist

- [ ] The content is a short label or phrase, not documentation and not a paragraph.
- [ ] Every icon-only control has a tooltip; no tooltip is compensating for a weak label.
- [ ] Nothing in the tooltip is needed to complete a task, and nothing in it exists nowhere else.
- [ ] No control, link, or other interactive element is inside it.
- [ ] No form field relies on a tooltip for its label, hint, format rule, or error.
- [ ] Truncation plus a tooltip is not standing in for a structural fix.
- [ ] The browser `title` attribute is not being used as the tooltip.
- [ ] The tooltip is associated with its control and announced as that control's description.
- [ ] The control has its own accessible name; the tooltip is not serving as the name.
- [ ] The accessible name and the tooltip text agree.
- [ ] Truncated values are available in full programmatically.
- [ ] It appears on keyboard focus as well as hover, and stays visible long enough to read.
- [ ] Escape dismisses it without moving focus; focus never enters it.
- [ ] The trigger is focusable, and its focus ring is intact.
- [ ] No placement, size, or content variant was passed — none exists.
- [ ] No component-owned padding, width, color, or beak treatment was overridden.
- [ ] Nothing in the uncovered list was invented.
