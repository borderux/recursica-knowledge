---
name: recursica-skill-menu
description: How to use the Recursica menu correctly — when a temporary list of choices or actions is right, what menu and menu-item own including supporting text, why a menu never opens on hover, what a scrolling menu signals, item labels, selected and unavailable items, permissions, and the screen-reader and keyboard requirements including focus return to the trigger. Use whenever adding, reviewing, or refactoring a menu, an ellipsis or "more" menu, a row-action menu, a table's column-visibility menu, an account menu, or the option list a control opens. Trigger on "menu", "menu item", "ellipsis menu", "more menu", "context menu", "overflow menu", "submenu", "arrow keys", "escape to close", "screen reader", "tab order". Do NOT use for the field that holds the chosen value — that is recursica-skill-dropdown. Do NOT use for nav structure or overflow policy — that is recursica-skill-navigation. Do NOT use for whether a trigger is a button or a link — that is recursica-skill-buttons-links.
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

**Do not hide a primary action in a menu.** Put it in the open. A menu is where the secondary and tertiary actions go, once the primary one has been named.

## What exists

Taken from `recursica_ui-kit.json`. Two specs, with one axis between them.

| Spec        | Axis               | Options                  |
| ----------- | ------------------ | ------------------------ |
| `menu`      | (none)             | —                        |
| `menu-item` | `selection-states` | `unselected`, `selected` |

**Which one owns what:** `menu` is the container — its width limits, padding, `max-height`, the gap between items, and the dividers. `menu-item` is one row: a leading icon, a trailing icon, a label, and **supporting text**.

**A menu item can have a second line.** `supporting-text` and `text-gap` exist, so an item may be a label plus one line of description. Use it where the label alone is unclear. It is a line, not a paragraph.

**`selection-states` is an axis for selection, not for state.** `selected` marks a chosen value in a list of options. There is no disabled item, no destructive item, and no danger item. Hover, focus, and active come from the component.

**The menu has a `max-height`, which means a long menu scrolls.** There are two consequences. First, a menu that scrolls hides its own length — the user cannot see how many options exist, and keyboard navigation has to scroll the list to follow focus. Second, and more important: **a long menu is a sign that the structure is wrong.** `recursica-skill-system-conventions` requires fixing the structure instead of adding a workaround to cope with it — and the scrolling area is that workaround. Group the items, or cut them down. Above about nine items, a list can no longer be scanned easily — see `recursica-skill-working-memory` for what that limit actually claims.

**There is no submenu construct.** A trailing chevron for a nested submenu that opens "on hover or click" is documented outside the token inventory. The kit defines no nested menu, and a house rule forbids opening on hover. Do not build one — see Uncovered.

**There is no placement, size, density, or multi-select axis.** Do not pass a position.

## Rules for using it

**A menu never opens on hover.** It opens on a click, on activation, or on a key press. This is a house rule in `recursica-skill-navigation`: users clearly struggle to steer a pointer across menus that appear on hover, and an accessible hover menu is much harder to build correctly. It is also the accessibility requirement below.

**The trigger is a button, not a link.** The menu is opened, not navigated to, and it creates no history entry. See `recursica-skill-buttons-links`.

**An icon-only trigger needs a tooltip and, separately, an accessible name** (the name a screen reader reads out for a control). The ellipsis trigger is the classic case. See `recursica-skill-tooltip`.

**Item labels follow the wording rules for buttons and links.** An action item is a verb plus its object — "Delete invoice". A navigation item names the object, with no verb. Owned by `recursica-skill-buttons-links`.

**Dividers group items; they do not decorate.** Use a divider to separate different sets of related items. A divider between every item is noise, and a divider with nothing on one side of it is a mistake.

**A destructive item states the consequence in its words.** There is no destructive item state, so the label is the only channel (way of carrying meaning), and confirmation is handled by `recursica-skill-modal`.

**Hide what the user can never do; disable what the user can unlock.** This is the permissions rule from `recursica-skill-navigation`. No permission means no item — not a disabled item, and not an item that fails when used.

**A menu never holds something the user has to find to finish a task.** A gear that opens a column-visibility menu is a valid unadvertised affordance (a control that is deliberately not promoted). A menu that hides the only way to finish the work is not. See `recursica-skill-discoverability`.

**A row that has a menu is not a clickable row.** Two competing click targets in one row mean the user cannot predict what a click will do — `recursica-skill-tables`.

## Accessibility

A menu is a component about managing focus. The list itself is easy. The trigger's state, the arrow keys, and returning focus when it closes are where menus fail — and a menu that opens on hover fails all three at once.

### Screen readers

- **The trigger must announce that it opens a menu, and whether the menu is open right now.** Without the open state, the user has no way to know that activating it did anything.
- **The trigger needs a real accessible name.** An icon-only ellipsis with no name is announced as nothing. In a table, the name must identify the row's object — "More actions for invoice 1043" — or the user hears the same announcement on every row.
- **The menu is announced as a menu, and its items as its items**, so the user learns how long the list is before going through it.
- **A selected item's state must be available in code.** A checkmark or a filled background is a single visual channel, which `recursica-skill-system-conventions` forbids.
- **An icon-only item needs a real name.** The icon tells the user nothing.
- **An unavailable item must still be perceivable, or must not be shown at all.** If it is disabled, it stays in the accessibility tree (the version of the page that assistive technology reads), is announced as disabled, and its reason is available in text. If the user can never use it, do not show it. There is no third option where it is visible on screen but invisible to assistive technology.
- **Supporting text must be part of the item's announcement**, not a separate element placed beside the label. A second line that is not connected exists only on screen.
- **A divider is decoration, and must not be announced as an item.**

### Keyboard and non-mouse navigation

- **A menu must never open on hover.** A menu that opens on hover cannot be opened by keyboard, cannot be opened on touch, and closes the moment the pointer strays off the path. This is both the house rule and the hard minimum for accessibility.
- **The trigger is a tab stop (a place the Tab key lands), and it opens with Enter or Space.** Never a handler that only responds to clicks.
- **Focus moves into the menu when it opens** — onto the first item, or onto the selected item in a list of options.
- **Focus returns to the trigger when the menu closes** — on Escape, on activating an item, or on clicking away. This is the step most often skipped, and skipping it drops the user at the top of the document.
- **The arrow keys move between items. Escape closes. Enter and Space activate. Home and End jump to the first and last item.** Connect all of them.
- **The menu is a single tab-stop group, not a series of tab stops.** Tab does not step from item to item; the arrow keys do that. Tab leaves the menu.
- **A menu that scrolls must scroll to follow keyboard focus.** Moving with the arrows to an item below the fold (the part you only see after scrolling) has to bring it into view.
- **Do not move focus anywhere except back to the trigger.** Not to the top of the page, and not into the content the action affected.
- **Nothing needed may appear only on hover.** A row-action menu whose trigger only appears when the row is hovered cannot be reached by keyboard or by touch. If the action exists, its trigger is visible.
- **Never hide the focus ring** (the outline that shows which element has keyboard focus), on the trigger or on the focused item, and never let the hover style double as the focus style.

## Not your decision

Do not implement, override, or tune any of these — the components own them:

- **`menu`**: `border-size`, `border-radius`, `min-width`, `max-width`, `padding`, `item-gap`, `max-height`, `elevation`, `divider-height`, `divider-opacity`, `colors`.
- **`menu-item`**: `border-radius`, `vertical-padding`, `horizontal-padding`, `icon-text-gap`, `icon-leading-size`, `icon-trailing-size`, `text`, `supporting-text`, `text-gap`.

The selected item's visual treatment comes with `selection-states`. Do not restyle it, and do not add wrappers or spacers to adjust spacing above.

## Load these too

- [`recursica-skill-buttons-links`](../../design-rules/recursica-skill-buttons-links/SKILL.md) — when row actions collapse into an ellipsis menu, icon-only versus text triggers, label copy, tooltips on icon-only triggers, and toolbar overflow by frequency.
- [`recursica-skill-navigation`](../../design-rules/recursica-skill-navigation/SKILL.md) — sub-navigation opens on click and never on hover, no overflow menu to make a nav fit, item counts, and permissions.
- [`recursica-skill-tables`](../../design-rules/recursica-skill-tables/SKILL.md) — the row-action menu, the column-visibility gear, and why a row with a menu cannot be clickable.
- [`recursica-skill-system-conventions`](../../design-rules/recursica-skill-system-conventions/SKILL.md) — fix the structure rather than scrolling a long list; never carry meaning in a single channel; the unadvertised affordance and its keyboard requirement.
- [`recursica-skill-working-memory`](../../psychology/recursica-skill-working-memory/SKILL.md) — 7 ± 2 as a scannability ceiling, and why a menu is a recognition surface rather than a recall test.

## Uncovered — ask, do not invent

- **Submenus.** A trailing chevron that opens a nested submenu "on hover or click" is documented outside the token inventory. The kit defines no submenu, and opening on hover contradicts the navigation rule. Both whether it exists and how it is triggered need a decision — do not rely on this without asking.
- **Menus with multi-select.** A type axis of single select, multi-select, and custom content is documented outside the token inventory. The kit defines only `unselected` and `selected` on `menu-item`. Do not rely on this without asking.
- **Custom content inside a menu item.** Documented outside the token inventory, and nothing in the kit supports it. Do not rely on this without asking.
- **How an unavailable item is shown.** `menu-item` has no disabled state, yet the permissions rule requires disabling what the user can unlock.
- **The number of items at which a menu is too long.** `max-height` implies scrolling, but no threshold is stated. `recursica-skill-buttons-links` leaves the overflow threshold open too.
- **Where the menu appears relative to its trigger**, and how it behaves near the edge of the viewport. There is no placement axis.
- **Right-click context menus.** Whether they are supported at all, and what happens to the browser's own menu.
- **Whether a menu item may be a link** when it navigates, given that links must render a real `href`.

## Pre-flight checklist

- [ ] The menu holds more than one action, and no primary action is hidden inside it.
- [ ] It is not standing in for navigation, and no navigation overflow was solved with a menu.
- [ ] The list is short enough to scan, and no scrolling area is covering for a problem with the structure.
- [ ] The trigger is a button. An icon-only trigger has both a tooltip and an accessible name that identifies its object.
- [ ] Item labels are a verb plus an object for actions, and the object alone for navigation.
- [ ] Supporting text is used only where the label is unclear, and is passed through the component.
- [ ] Dividers separate real groups, and none is decorative.
- [ ] Destructive items state the consequence in words.
- [ ] Items the user has no permission for are missing, not disabled.
- [ ] The trigger announces that it opens a menu, and whether it is open.
- [ ] A selected item's state is available in code, not shown by a mark alone. Icon-only items have names, and dividers are not announced.
- [ ] Any unavailable item is perceivable and announced as disabled, or is not shown.
- [ ] **The menu does not open on hover** — it opens on a click, Enter, or Space.
- [ ] Focus moves into the menu when it opens, and returns to the trigger on every way of closing it.
- [ ] The arrow keys, Escape, Enter, Space, Home, and End all work, and the menu is one tab-stop group, not many.
- [ ] Keyboard focus scrolls into view in a long menu.
- [ ] No trigger appears only on hover, and the focus ring is intact.
- [ ] You passed no variant, size, placement, or state outside the two specs above, and invented no submenu.
- [ ] You overrode no padding, gap, divider, or selected styling that the component owns.
- [ ] You invented nothing from the uncovered list.
