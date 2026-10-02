---
name: recursica-skill-tooltip
description: Rules for the Recursica tooltip — a short label for a control with no visible one, nothing essential or interactive inside, showing on focus, and closing with Escape. Use for icon-only button labels and cut-off text. Not for rich or interactive content — see recursica-skill-hover-card-popover; not for field help — see recursica-skill-text-field.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Tooltip

A tooltip is a short text label for a control that has no visible one.

## When to use a tooltip

- **A control shows only an icon.** `recursica-skill-buttons-links` requires a tooltip on every icon-only button, with no exceptions.
- **Visible text has been cut off with an ellipsis (…)**, and the tooltip shows it in full.
- **An unusual function needs one short phrase to explain it**, because a new user may not understand it from the label alone. Add one only when the label is clear without it. Never use a tooltip to make up for a weak label.

## When not to use a tooltip

| Instead of a tooltip                                  | Use                                                                                                                 |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| The information is needed to complete the task        | The page. Put it in view                                                                                            |
| The content is richer than a short phrase             | `recursica-skill-hover-card-popover`                                                                                |
| The content contains a link, a button, or any control | `recursica-skill-hover-card-popover`, built as its interactive variety                                              |
| A button's label is weak                              | A better label — `recursica-skill-buttons-links`                                                                    |
| A field needs a format rule, a hint, or an error      | Assistive text, which is persistent — `recursica-skill-text-field`                                                  |
| A control needs a name for assistive technology       | A real accessible name (the name a screen reader reads out for a control). A tooltip is a description, never a name |
| The user must acknowledge or decide something         | `recursica-skill-modal`                                                                                             |
| The explanation runs to a paragraph                   | The page, or a panel — `recursica-skill-panel`                                                                      |

**A tooltip only adds to what the page shows.** Nothing inside it may be the only copy of a piece of information, because a touch device has no hover and the user may never see the tooltip.

## Variants

Taken from the UI kit (the token file, `recursica_ui-kit.json`, that says which variants and states each component has) → `ui-kit.components.tooltip`. **The tooltip has no variant properties at all** — no placement variant property, no size variant property, no content-type variant property. Every listed item is a fixed property.

**Parts of the component:** a text area and a beak — the small pointer that connects the tooltip to its trigger. `beak-size` and `beak-inset` are set by tokens (named design values, such as colors or sizes, set by the design system).

**The tooltip has no placement setting.** It has no top, left, right, or bottom option, and no option for aligning the beak. The design-system website shows both, but the UI kit defines neither — see the open questions. Do not pass a position setting, and do not position the beak by hand.

**There is no size variant property.** `min-width`, `max-width`, and `min-height` are fixed. If the content does not fit inside them, it is not tooltip content.

**There is no variant property for rich or custom content.** `text` is the only content property. A tooltip holds text.

**`tooltip` and `hover-card-popover` are two different components with almost the same tokens.** Do not choose between them by their look, because they look almost the same. Choose by content:

- **Tooltip** — a short text label for a control that has no visible one.
- **Hover card / popover** — richer content beside a target. See `recursica-skill-hover-card-popover`.

Neither may hold anything the user needs to complete a task, and neither may be the only place a piece of information exists.

## Rules

**Write one short phrase that names the control.** Use "Delete invoice", not a sentence. A tooltip is a label, not instructions.

**Never make a tooltip the only place a piece of information appears.** If the information matters, put it on the page, in the accessible name, or in assistive text as well.

**Never put a control or a link inside a tooltip.** To click something inside, the user must move the pointer from the trigger to the tooltip without the tooltip closing on the way. Put that content in a popover.

**A tooltip is not a label for a form field.** Fields get visible labels and assistive text that stays on screen — see `recursica-skill-text-field`.

**A button with both an icon and a label rarely needs one.** `recursica-skill-buttons-links` makes it optional there, and only for extra information about an unusual function.

**Do not use a tooltip to show validation or errors.** An error must stay on screen and be connected to its field. See `recursica-skill-forms`.

**Cutting text off and adding a tooltip does not fix a column that is too narrow.** Text that is cut off again and again means the column widths or the layout need to change — see `recursica-skill-tables` and `recursica-skill-system-conventions`.

**Do not use the browser's `title` attribute as the tooltip.** It does not appear on keyboard focus, cannot be dismissed, and is not reliably read by screen readers. Use the component.

## Accessibility

This component also follows the accessibility baseline in `recursica-skill-system-conventions`, including the focus ring. Only the rules specific to this component are listed here.

A tooltip is the component most often used in place of a missing accessible name, and it cannot replace one. Ensure every behavior below.

### Screen readers

- **Connect the tooltip to its control**, so it is announced as that control's description. A separate element placed next to the control is announced as unrelated text, or not at all.
- **A tooltip never stands in for the accessible name of a control with no label.** The control needs its own name. An icon-only button gets both a name and a tooltip. If only one of the two exists, it must be the name.
- **The name and the tooltip should say the same thing.** A user who speaks the tooltip text must be able to activate the control by voice.
- **Never put meaning in a tooltip that exists nowhere else.** A tooltip is a single channel (color, shape, position or text, each a separate signal), and `recursica-skill-system-conventions` forbids that for any meaning the user must receive.
- **Nothing inside a tooltip is announced as a control**, because a tooltip contains no controls.
- **Text that is cut off must be available in full in the code**, not only in the tooltip. A screen reader user does not see the text being cut off, and must not hear a cut-off value either.
- **The tooltip must not be announced as a live region** (an area a screen reader announces automatically when its content changes). It is a description, read when its control is reached — not an alert that interrupts.

### Keyboard and non-mouse navigation

- **It must appear on keyboard focus as well as on hover.** A tooltip that appears only on hover is invisible to every keyboard user, which means every icon-only button on the surface has no label for them.
- **It must stay visible long enough to read**, and must not disappear while the pointer is still on the control, or focus is still on it. Nothing may hide it automatically in the middle of reading.
- **It must close with Escape without moving focus.** A tooltip can cover the content underneath it, and Escape lets the user clear it. Focus stays on the control after the tooltip closes.
- **It must not contain a control or a link**, which is also why it needs no Tab handling inside it. If it needs a tab stop (a place the Tab key lands), it is a popover.
- **Never move focus into the tooltip.** It cannot take focus, and it is never a tab stop.
- **The trigger must be able to take focus.** A tooltip attached to something no one can focus can never appear for a keyboard user.
- **Nothing the user needs may appear only on hover** — which, for this component, means nothing the user needs may be in it at all.

## Styling set by tokens

Do not set or override any of these. The component sets them:

- `elevation`, `border-size`, `border-radius`, `colors`, `text`.
- `vertical-padding`, `horizontal-padding`.
- `min-width`, `max-width`, `min-height`.
- `beak-size`, `beak-inset`.

The beak is part of the component. Do not draw a separate beak, and do not reposition the component's beak.

## Related skills

- `recursica-skill-buttons-links` — which controls must have a tooltip, which may, and the rule that a tooltip never rescues a weak label.
- `recursica-skill-system-conventions` — never carry meaning in a single channel; fix the structure rather than cutting text off and adding a tooltip.

### Only if used on the same screen

- `recursica-skill-hover-card-popover` — the sibling component for richer or interactive content, and the hover-only failure mode it must avoid.
- `recursica-skill-text-field` — visible labels, assistive text, and error text, all of which are persistent and none of which is a tooltip.

## Open questions

- **Placement.** A position variant property of top, left, right, and bottom, a beak-alignment variant property of start, middle, and end, and a `position` setting are all shown only on the design-system website. The UI kit defines no placement variant property at all — only `beak-size` and `beak-inset` as fixed properties. Do not rely on this without asking.
- **Custom content.** Content types of "text" and "custom" are shown only on the design-system website. The UI kit has only `text`. Do not rely on this without asking.
- **The delay before showing, the delay before hiding, and any time before it hides on its own.** No token or rule defines them.
- **Touch behavior.** Hover does not exist on touch screens, and no other pattern is given for reaching a tooltip's content there.
- **Whether a tooltip may attach to an element the user cannot interact with** — a table cell with cut-off text, a chart label — given that a target that cannot take focus can never show the tooltip from the keyboard.
- **What happens at the edge of the viewport**, with no placement variant property available to flip it.

## Pre-flight checklist

- [ ] The content is a short label or phrase — not instructions, and not a paragraph.
- [ ] Every icon-only control has a tooltip, and no tooltip is making up for a weak label.
- [ ] Nothing in the tooltip is needed to complete a task, and nothing in it appears only there.
- [ ] No control, link, or other element the user can interact with is inside it.
- [ ] No form field relies on a tooltip for its label, hint, format rule, or error.
- [ ] No text is cut off and given a tooltip where the column widths or layout should change instead.
- [ ] The browser's `title` attribute is not being used as the tooltip.
- [ ] The tooltip is connected to its control and announced as that control's description.
- [ ] The control has its own accessible name. The tooltip is not serving as the name.
- [ ] The accessible name and the tooltip text match.
- [ ] Values that are cut off are available in full in the code.
- [ ] It appears on keyboard focus as well as hover, and stays visible long enough to read.
- [ ] Escape closes it without moving focus, and focus never enters it.
- [ ] The trigger can take focus, and its focus ring is not hidden.
- [ ] No placement, size, or content variant was passed — none exists.
- [ ] Padding, width, color, and beak styling come from the component.
- [ ] Open questions were asked about, not decided: placement, custom content, show and hide delays, touch behavior, targets that cannot take focus, and the viewport edge.
