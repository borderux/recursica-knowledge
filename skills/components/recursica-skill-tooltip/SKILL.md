---
name: recursica-skill-tooltip
description: Rules for the Recursica tooltip — a short label for a control with no visible label, nothing essential or interactive inside, showing on focus, and closing with Escape. Use for icon-only button labels and cut-off text. Not for rich or interactive content — see recursica-skill-hover-card-popover; not for field help — see recursica-skill-text-field.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Tooltip

A tooltip is a short text label for a control that has no visible label.

## When to use a tooltip

- **A control shows only an icon.** `recursica-skill-buttons-links` requires a tooltip on every icon-only button, with no exceptions.
- **Visible text is cut off with an ellipsis (…).** The tooltip shows the full text.
- **An unusual function needs one short phrase of explanation**, because a new user may not understand the function from the label alone. Add a tooltip only when the label is clear without the tooltip. Never use a tooltip to make up for a weak label.

## When not to use a tooltip

| Situation                                                | Use instead                                                                                                         |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| The user needs the information to complete the task      | The page. Put the information in view on the page.                                                                  |
| The content is richer than a short phrase                | `recursica-skill-hover-card-popover`                                                                                |
| The content holds a link, a button, or any other control | `recursica-skill-hover-card-popover`, built as the interactive kind of hover card or popover                        |
| A button's label is weak                                 | A better label. See `recursica-skill-buttons-links`.                                                                |
| A field needs a format rule, a hint, or an error         | Assistive text, which stays on screen. See `recursica-skill-text-field`.                                            |
| A control needs a name for assistive technology          | A real accessible name (the name a screen reader reads out for a control). A tooltip is a description, never a name |
| The user must give an acknowledgment or make a decision  | `recursica-skill-modal`                                                                                             |
| The explanation is a paragraph long                      | The page, or a panel. See `recursica-skill-panel`.                                                                  |

**A tooltip only adds to the information the page shows.** No information in a tooltip may appear only in the tooltip, because a touch device has no hover and a user on a touch device may never see the tooltip.

## Variants

**Use only the tooltip variants and options that the Recursica MCP server lists for the project.** A designer can add variants and options in Theme Forge, so each project can differ. Get the list with the server's `recursica_get_component_doc` tool, and use the names the code uses. Never invent a variant or an option.

The rules below describe each part and option by role. The names in the standard UI kit (the unchanged UI kit in the official Recursica release) are examples only.

- **Parts.** A tooltip has a text area and a beak. The beak is the small pointer that connects the tooltip to the trigger (the element that shows the tooltip).
- **Placement.** If the project has a placement variant, use the placement variant. Otherwise, do not set a position on the tooltip. Do not position the beak by hand. Placement is an open question.
- **Size.** The theme limits how wide and how tall a tooltip can be. If the project has a size variant, use the size variant. Otherwise, content that does not fit inside the tooltip's size limits is not tooltip content.
- **Content.** If the project has a custom-content variant, use the custom-content variant. Otherwise, a tooltip holds text only.

**The tooltip and the hover card or popover are two different components that look almost the same.** Never choose between the two by look. Choose by content:

- **Tooltip.** A short text label for a control that has no visible label.
- **Hover card or popover.** Richer content shown beside an element on the page. See `recursica-skill-hover-card-popover`.

Neither component may hold content the user needs to complete a task. Neither component may be the only place a piece of information appears.

## Rules

**Write one short phrase that names the control.** Write "Delete invoice", not a sentence. A tooltip is a label, not instructions.

**Never make a tooltip the only place a piece of information appears.** If the information matters, also put the information on the page, in the accessible name, or in assistive text.

**Never put a control or a link inside a tooltip.** To click a control inside a tooltip, the user must move the pointer from the trigger to the tooltip without the tooltip closing on the way. Put a control or a link in a popover instead.

**A tooltip is not a label for a form field.** A form field gets a visible label and assistive text that stays on screen. See `recursica-skill-text-field`.

**A button with both an icon and a label rarely needs a tooltip.** `recursica-skill-buttons-links` makes the tooltip optional on such a button, and only for extra information about an unusual function.

**Do not use a tooltip to show validation or errors.** An error must stay on screen and be connected to the field the error is about. See `recursica-skill-forms`.

**Cutting text off and adding a tooltip does not fix a column that is too narrow.** When text is cut off again and again, change the column widths or the layout. See `recursica-skill-tables` and `recursica-skill-system-conventions`.

**Do not use the browser's `title` attribute as the tooltip.** The `title` attribute does not appear on keyboard focus, cannot be dismissed, and is not reliably read by screen readers. Use the tooltip component.

## Accessibility

The rules below add to the accessibility baseline in `recursica-skill-system-conventions`, including the focus ring, which every Recursica component follows.

The tooltip is the component most often used in place of a missing accessible name. A tooltip cannot replace an accessible name. Make sure the tooltip has every behavior in the two lists below.

### Screen readers

- **Connect the tooltip to the tooltip's control**, so a screen reader announces the tooltip as the control's description. A separate element placed next to the control is announced as unrelated text, or not at all.
- **A tooltip never stands in for the accessible name of a control with no label.** The control needs an accessible name of the control's own. An icon-only button gets both an accessible name and a tooltip. If the button has only one of the two, the button must have the accessible name, not the tooltip.
- **The accessible name should match the tooltip text.** A user who speaks the tooltip text must be able to activate the control by voice.
- **Never put meaning in a tooltip that appears nowhere else.** A tooltip is a single channel (color, shape, position or text, each a separate signal). `recursica-skill-system-conventions` forbids showing any meaning the user must receive in only one channel.
- **No content inside a tooltip is announced as a control**, because a tooltip contains no controls.
- **Text that is cut off must be available in full in the code**, not only in the tooltip. A screen reader user does not see the text being cut off, and must not hear a cut-off value either.
- **The tooltip must not be announced as a live region** (an area of the page that a screen reader announces automatically when the area's content changes). A tooltip is a description, which a screen reader reads when the user reaches the control. A tooltip is not an alert that interrupts the user.

### Keyboard and non-mouse navigation

- **A tooltip must appear on keyboard focus as well as on hover.** A tooltip that appears only on hover is invisible to every keyboard user. Every icon-only button with such a tooltip then has no label for a keyboard user.
- **A tooltip must stay visible long enough to read.** The tooltip must not disappear while the pointer is still on the control, or while focus is still on the control. The tooltip must never hide automatically while the user is reading the tooltip.
- **A tooltip must close with Escape without moving focus.** A tooltip can cover the content underneath the tooltip, and Escape lets the user close the tooltip. Focus stays on the control after the tooltip closes.
- **A tooltip must not contain a control or a link.** A tooltip has no controls, so a tooltip needs no Tab key behavior inside. If the content needs a tab stop (a place the Tab key lands), build a popover instead of a tooltip.
- **Never move focus into the tooltip.** A tooltip cannot take focus, and a tooltip is never a tab stop.
- **The trigger must be able to take focus.** A tooltip attached to an element no one can focus never appears for a keyboard user.
- **No content the user needs may appear only on hover.** For a tooltip, the rule means that no content the user needs may be in the tooltip at all.

## Styling set by tokens

**Never set or override the tooltip's styling.** The theme sets every visual property of the tooltip, such as size, spacing, borders and colors. Do not add extra containers or spacers to change the tooltip's look. If the design needs a look the theme does not give, raise the gap. See `recursica-skill-design-router`.

The beak is part of the tooltip component. Do not draw a separate beak, and do not move the component's beak.

## Related skills

- `recursica-skill-buttons-links` — which controls must have a tooltip, which controls may have a tooltip, and the rule that a tooltip never makes up for a weak label.
- `recursica-skill-system-conventions` — never showing a meaning in only one channel, and changing the screen's structure instead of cutting text off and adding a tooltip.

### Only if used on the same screen

- `recursica-skill-hover-card-popover` — the related component for richer or interactive content, and the rule against showing needed content only on hover, which the hover card and the popover must also follow.
- `recursica-skill-text-field` — visible labels, assistive text, and error text. All three stay on screen, and none of the three is a tooltip.

## Open questions

- **Placement.** Only the design-system website shows a position variant of top, left, right, and bottom, a beak alignment variant of start, middle, and end, and a position setting. Do not rely on placement without asking. Ask only when the project has no placement variant.
- **Custom content.** Only the design-system website shows the content types "text" and "custom". Do not rely on custom content without asking. Ask only when the project has no custom-content variant.
- **Show and hide delays.** No token (a named design value, such as a color or a size, set by the design system) or rule defines the delay before the tooltip shows, the delay before the tooltip hides, or any time after which the tooltip hides automatically.
- **Touch behavior.** Hover does not exist on touch screens. No rule says how a touch-screen user reaches the content of a tooltip.
- **Targets that cannot take focus.** No rule says whether a tooltip may attach to an element the user cannot interact with, such as a table cell with cut-off text or a chart label. A tooltip on an element that cannot take focus never appears for a keyboard user.
- **The viewport edge.** No rule says what happens when a tooltip reaches the edge of the viewport.

## Pre-flight checklist

- [ ] The tooltip content is a short label or phrase, not instructions and not a paragraph.
- [ ] Every icon-only control has a tooltip, and no tooltip makes up for a weak label.
- [ ] No tooltip holds content needed to complete a task, and no information appears only in a tooltip.
- [ ] No control, link, or other element the user can interact with is inside a tooltip.
- [ ] No form field relies on a tooltip for the field's label, hint, format rule, or error.
- [ ] No text is cut off and given a tooltip where the column widths or layout should change instead.
- [ ] The browser's `title` attribute is not used as the tooltip.
- [ ] Each tooltip is connected to the tooltip's control and announced as the control's description.
- [ ] The control has an accessible name of the control's own. The tooltip is not the accessible name.
- [ ] The accessible name and the tooltip text match.
- [ ] Values that are cut off are available in full in the code.
- [ ] The tooltip appears on keyboard focus as well as on hover, and stays visible long enough to read.
- [ ] Escape closes the tooltip without moving focus, and focus never enters the tooltip.
- [ ] The trigger can take focus, and the trigger's focus ring is not hidden.
- [ ] Every variant and option on the tooltip is one the Recursica MCP server lists for the project. No placement, size, or content variant is set unless the project has one, and no variant or option is invented.
- [ ] No styling is set or overridden on the tooltip, and no container or spacer is added to change the tooltip's look.
- [ ] Open questions were asked about, not decided: placement, custom content, show and hide delays, touch behavior, targets that cannot take focus, and the viewport edge.
