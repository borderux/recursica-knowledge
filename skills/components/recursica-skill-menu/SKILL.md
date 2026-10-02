---
name: recursica-skill-menu
description: Rules for the Recursica menu — a temporary list of actions or choices, never opened on hover, item labels and states, what a scrolling menu signals, and focus returning to the trigger. Use for ellipsis, more, row-action, column, and account menus. Not for a field's value — see recursica-skill-dropdown.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Menu

A menu is a temporary list of choices or actions. A trigger opens it, and dismissing it closes it.

## Use it when

- **One object has several actions on it** — the ellipsis or "more" menu that `recursica-skill-buttons-links` requires once a row has more than one consistent action.
- **A control needs a list of options.** The menu is what a dropdown or an autocomplete opens. The field owns the value, and the menu owns the list.
- **A configuration entry point that is deliberately not promoted needs somewhere to open** — the column-visibility gear on a table, as `recursica-skill-tables` describes.
- **A tool used everywhere needs its actions** — the account menu, which `recursica-skill-navigation` keeps out of primary navigation.

## Do not use it when

| Instead of a menu                                  | Use                                                                                                 |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| There is only one action                           | A button — `recursica-skill-button`                                                                 |
| It is the primary action on a surface or a row     | A visible button. One primary action per surface, out in the open — `recursica-skill-buttons-links` |
| Primary or secondary navigation                    | Navigation that stays on screen — `recursica-skill-navigation`                                      |
| Navigation items do not fit the space              | Fewer, shorter items. **Never an overflow menu to make a nav fit** — `recursica-skill-navigation`   |
| The list has grown past what fits                  | Fewer items, or a different structure — `recursica-skill-system-conventions`                        |
| The content is a form or a multi-step flow         | `recursica-skill-modal` or `recursica-skill-panel`                                                  |
| The value must stay visible in a field             | `recursica-skill-dropdown`                                                                          |
| The content is rich detail that cannot be acted on | `recursica-skill-hover-card-popover`                                                                |
| A short text label for an icon-only control        | `recursica-skill-tooltip`                                                                           |

**Do not hide a primary action in a menu.** Show it as a button. A menu holds the secondary and tertiary actions.

## What exists

Taken from the UI kit (the token file, `recursica_ui-kit.json`, that says which variants and states each component has). Two specs, with one axis (a property a component varies on, such as size or style; Figma calls it a variant property) between them.

| Spec        | Axis               | Options                  |
| ----------- | ------------------ | ------------------------ |
| `menu`      | (none)             | —                        |
| `menu-item` | `selection-states` | `unselected`, `selected` |
| `menu-item` | `states`           | `disabled`               |

**Which one owns what:** `menu` is the container — its width limits, padding, `max-height`, the gap between items, and the dividers. `menu-item` is one row: a leading icon, a trailing icon, a label, and supporting text.

**A menu item can have a second line.** `supporting-text` and `text-gap` exist, so an item may be a label plus one line of description. Use it where the label alone is unclear. Keep it to one line, not a paragraph.

**`selection-states` is for selection, not for other states.** `selected` marks a chosen value in a list of options. There is no destructive item and no danger item. Hover, focus, and active come from the component.

**`menu-item` has a `disabled` state**, for an item the user can unlock — see the permissions rule below. How it is set is in the uncovered list.

**The menu has a `max-height`, so a long menu scrolls.** A scrolling menu hides its own length, so the user cannot see how many options exist. Keyboard navigation then has to scroll the list to follow focus. More important, **a long menu is a sign that the structure is wrong.** `recursica-skill-system-conventions` requires fixing the structure instead of adding a workaround, and a scrolling list is that workaround. Group the items, or cut them down. Above about nine items, a list can no longer be scanned easily — see `recursica-skill-working-memory` for what that limit claims.

**There is no submenu.** A trailing chevron for a nested submenu that opens "on hover or click" is shown only on the design-system website. The UI kit defines no nested menu, and a house rule forbids opening on hover. Do not build one — see Uncovered.

**There is no placement, size, density, or multi-select axis.** Do not pass a position.

## Rules for using it

**A menu never opens on hover.** It opens on a click, on activation, or on a key press. This is a house rule in `recursica-skill-navigation`: users clearly struggle to steer a pointer across menus that appear on hover, and an accessible hover menu is much harder to build correctly. It is also the accessibility requirement below.

**The trigger is a button, not a link.** The menu is opened, not navigated to, and it creates no history entry. See `recursica-skill-buttons-links`.

**An icon-only trigger needs a tooltip and, separately, an accessible name** (the name a screen reader reads out for a control). The ellipsis trigger is the classic case. See `recursica-skill-tooltip`.

**Item labels follow the wording rules for buttons and links.** An action item is a verb plus its object — "Delete invoice". A navigation item names the object, with no verb. Owned by `recursica-skill-buttons-links`.

**Dividers group items; they do not decorate.** Use a divider to separate different sets of related items. A divider between every item is noise, and a divider with nothing on one side of it is a mistake.

**A destructive item states the consequence in its label.** There is no destructive item state, so the label is the only channel (color, shape, position or text, each a separate signal). `recursica-skill-modal` handles the confirmation.

**Hide what the user can never do; disable what the user can unlock.** This is the permissions rule from `recursica-skill-navigation`. No permission means no item — not a disabled item, and not an item that fails when used.

**A menu never holds the only way to finish a task.** A gear that opens a column-visibility menu is a valid unadvertised affordance (a control that works but is not shown in the main interface, such as a keyboard shortcut). A menu that hides the only way to finish the work is not. See `recursica-skill-discoverability`.

**A row that has a menu is not a clickable row.** Two competing click targets in one row mean the user cannot predict what a click will do — `recursica-skill-tables`.

## Accessibility

This component also follows the accessibility baseline in `recursica-skill-system-conventions`, including the focus ring. Only what is specific to it is listed here.

Menu accessibility is mostly focus management. The list itself is easy to build. Menus fail on the trigger's state, the arrow keys, and returning focus when the menu closes. A menu that opens on hover fails all three at once.

### Screen readers

- **The trigger must announce that it opens a menu, and whether the menu is open right now.** Without the open state, the user has no way to know that activating it did anything.
- **The trigger needs a real accessible name.** An icon-only ellipsis with no name is announced as nothing. In a table, the name must identify the row's object — "More actions for invoice 1043" — or the user hears the same announcement on every row.
- **The menu is announced as a menu, and its items as its items**, so the user learns how long the list is before going through it.
- **A selected item's state must be available in code.** A checkmark or a filled background is a single visual channel, which `recursica-skill-system-conventions` forbids.
- **An icon-only item needs a real name.** An icon alone gives a screen reader nothing to read out.
- **An unavailable item must still be perceivable, or must not be shown at all.** If it is disabled, it stays in the accessibility tree (the version of the page that assistive technology reads), is announced as disabled, and its reason is available in text. If the user can never use it, do not show it. Never show an item on screen while hiding it from assistive technology.
- **Supporting text must be part of the item's announcement**, not a separate element placed beside the label. A screen reader does not read a second line that is not connected to the item.
- **A divider is decoration, and must not be announced as an item.**

### Keyboard and non-mouse navigation

- **A menu must never open on hover.** A menu that opens on hover cannot be opened by keyboard, cannot be opened on touch, and closes the moment the pointer strays off the path. This is both the house rule and the hard minimum for accessibility.
- **The trigger is a tab stop (a place the Tab key lands), and it opens with Enter or Space.** Never use a handler that responds only to clicks.
- **Focus moves into the menu when it opens** — onto the first item, or onto the selected item in a list of options.
- **Focus returns to the trigger when the menu closes** — on Escape, on activating an item, or on clicking away. This is the step most often skipped, and skipping it drops the user at the top of the document.
- **The arrow keys move between items. Escape closes. Enter and Space activate. Home and End jump to the first and last item.** Support all of them.
- **The menu is a single tab-stop group, not a series of tab stops.** Tab does not step from item to item; the arrow keys do that. Tab leaves the menu.
- **A menu that scrolls must scroll to follow keyboard focus.** Moving with the arrows to an item below the fold (the part of the page visible only after scrolling) has to bring it into view.
- **On close, focus goes back to the trigger and nowhere else.** Not to the top of the page, and not into the content the action affected.
- **Never show a needed control only on hover.** A row-action menu whose trigger only appears when the row is hovered cannot be reached by keyboard or by touch. If the action exists, its trigger is visible.

## Set by the component

Do not set or override any of these. The components set them:

- **`menu`**: `border-size`, `border-radius`, `min-width`, `max-width`, `padding`, `item-gap`, `max-height`, `elevation`, `divider-height`, `divider-opacity`, `colors`.
- **`menu-item`**: `border-radius`, `vertical-padding`, `horizontal-padding`, `icon-text-gap`, `icon-leading-size`, `icon-trailing-size`, `text`, `supporting-text`, `text-gap`.

The selected item's visual treatment comes with `selection-states`. Do not restyle it, and do not add wrappers or spacers to change the spacing listed above.

## Load these too

- `recursica-skill-buttons-links` — when row actions collapse into an ellipsis menu, icon-only versus text triggers, label copy, tooltips on icon-only triggers, and toolbar overflow by frequency.
- `recursica-skill-navigation` — sub-navigation opens on click and never on hover, no overflow menu to make a nav fit, item counts, and permissions.
- `recursica-skill-tables` — the row-action menu, the column-visibility gear, and why a row with a menu cannot be clickable.
- `recursica-skill-system-conventions` — fix the structure rather than scrolling a long list; never carry meaning in a single channel; the unadvertised affordance and its keyboard requirement.
- `recursica-skill-working-memory` — 7 ± 2 as a scannability ceiling, and why a menu is a recognition surface rather than a recall test.

## Uncovered — ask, do not invent

- **Submenus.** A trailing chevron that opens a nested submenu "on hover or click" is shown only on the design-system website. The UI kit defines no submenu, and opening on hover contradicts the navigation rule. Both whether it exists and how it is triggered need a decision. Ask before relying on it.
- **Menus with multi-select.** A type axis of single select, multi-select, and custom content is shown only on the design-system website. The UI kit defines only `unselected` and `selected` on `menu-item`. Ask before relying on it.
- **Custom content inside a menu item.** Shown only on the design-system website, and nothing in the UI kit supports it. Ask before relying on it.
- **How the disabled state is set.** The UI kit defines `disabled` on `menu-item`. Whether the adapter exposes it as a prop has not been confirmed. Check the component's props, or ask, before relying on it.
- **The number of items at which a menu is too long.** `max-height` implies scrolling, but no threshold is stated. `recursica-skill-buttons-links` leaves the overflow threshold open too.
- **Where the menu appears relative to its trigger**, and how it behaves near the edge of the viewport. There is no placement axis.
- **Right-click context menus.** Whether they are supported at all, and what happens to the browser's own menu.
- **Whether a menu item may be a link** when it navigates, given that links must render a real `href`.

## Pre-flight checklist

- [ ] The menu holds more than one action, and no primary action is hidden inside it.
- [ ] The menu is not used as navigation, and no navigation overflow is solved with a menu.
- [ ] The list is short enough to scan, and a long list is regrouped or cut rather than left to scroll.
- [ ] The trigger is a button. An icon-only trigger has both a tooltip and an accessible name that identifies its object.
- [ ] Item labels are a verb plus an object for actions, and the object alone for navigation.
- [ ] Supporting text is used only where the label is unclear, and is passed through the component.
- [ ] Dividers separate real groups, and none is decorative.
- [ ] Destructive items state the consequence in words.
- [ ] Items the user has no permission for are hidden, not disabled.
- [ ] The trigger announces that it opens a menu, and whether it is open.
- [ ] A selected item's state is available in code, not shown by a mark alone. Icon-only items have names, and dividers are not announced.
- [ ] Any unavailable item is perceivable and announced as disabled, or is not shown.
- [ ] **The menu does not open on hover** — it opens on a click, Enter, or Space.
- [ ] Focus moves into the menu when it opens, and returns to the trigger on every way of closing it.
- [ ] The arrow keys, Escape, Enter, Space, Home, and End all work, and the menu is one tab-stop group, not many.
- [ ] Keyboard focus scrolls into view in a long menu.
- [ ] No trigger appears only on hover, and the focus ring is intact.
- [ ] Every variant, size, placement, and state passed comes from the two specs above, and there is no submenu.
- [ ] Padding, gaps, dividers, and selected styling come from the component.
- [ ] Uncovered items were asked about, not decided: submenus, menus with multi-select, custom content inside a menu item, how the disabled state is set, the number of items at which a menu is too long, where the menu appears relative to its trigger, right-click context menus, and whether a menu item may be a link.
