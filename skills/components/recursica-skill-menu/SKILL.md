---
name: recursica-skill-menu
description: How to use the Recursica menu correctly — when a temporary list of choices or actions is right, what menu and menu-item own including supporting text, why a menu never opens on hover, what a scrolling menu signals, item labels, selected and unavailable items, permissions, and the screen-reader and keyboard requirements including focus return to the trigger. Use whenever adding, reviewing, or refactoring a menu, an ellipsis or "more" menu, a row-action menu, a table's column-visibility menu, an account menu, or the option list a control opens. Trigger on "menu", "menu item", "ellipsis menu", "more menu", "context menu", "overflow menu", "submenu", "arrow keys", "escape to close", "screen reader", "tab order". Do NOT use for the field that holds the chosen value — that is recursica-skill-dropdown. Do NOT use for nav structure or overflow policy — that is recursica-skill-navigation. Do NOT use for whether a trigger is a button or a link — that is recursica-skill-buttons-links.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Menu

A menu is a temporary list of choices or actions that a trigger opens and dismissal closes.

## Use it when

- **One object has several actions on it** — the ellipsis or "more" menu that `recursica-skill-buttons-links` requires once a row has more than one consistent action.
- **A control needs an option list.** The menu is what a dropdown or autocomplete opens; the field owns the value, the menu owns the list.
- **An unadvertised configuration entry point needs somewhere to open** — the column-visibility gear on a table, per `recursica-skill-tables`.
- **A global utility needs its actions** — the account menu, which `recursica-skill-navigation` keeps out of primary navigation.

## Do not use it when

| Instead of a menu                              | Use                                                                                               |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| There is only one action                       | A button — `recursica-skill-button`                                                               |
| It is the primary action on a surface or a row | A visible button. One primary action per surface, exposed — `recursica-skill-buttons-links`       |
| Primary or secondary navigation                | Persistent navigation — `recursica-skill-navigation`                                              |
| Navigation items do not fit the space          | Fewer, shorter items. **Never an overflow menu to make a nav fit** — `recursica-skill-navigation` |
| The list has outgrown what fits                | Fewer items or a different structure — `recursica-skill-system-conventions`                       |
| The content is a form or a multi-step flow     | `recursica-skill-modal` or `recursica-skill-panel`                                                |
| The value must persist visibly in a field      | `recursica-skill-dropdown`                                                                        |
| The content is rich, non-actionable detail     | `recursica-skill-hover-card-popover`                                                              |
| A short text label for an icon-only control    | `recursica-skill-tooltip`                                                                         |

**Do not hide a primary action in a menu.** Expose it. A menu is where the secondary and tertiary actions go once the primary one has been named.

## What exists

Taken from `recursica_ui-kit.json`. Two specs, one axis between them.

| Spec        | Axis               | Options                  |
| ----------- | ------------------ | ------------------------ |
| `menu`      | (none)             | —                        |
| `menu-item` | `selection-states` | `unselected`, `selected` |

**Which one owns what:** `menu` is the container — its width bounds, padding, `max-height`, the gap between items, and the dividers. `menu-item` is one row: a leading icon, a trailing icon, a label, and **supporting text**.

**A menu item can carry a second line.** `supporting-text` and `text-gap` exist, so an item may be a label plus one line of description. Use it where the label alone is ambiguous. It is a line, not a paragraph.

**`selection-states` is a selection axis, not a state axis.** `selected` marks a chosen value in an option list. There is no disabled item, no destructive item, and no danger item; hover, focus, and active come from the component.

**The menu has a `max-height`, which means a long menu scrolls.** Two consequences. First, a scrolling menu conceals its own length — the user cannot see how many options exist, and keyboard navigation has to scroll the list to follow focus. Second, and more important: **a long menu is a signal that the structure is wrong.** `recursica-skill-system-conventions` requires fixing the structure rather than adding a mechanism to cope with it, and the scroll region is that mechanism. Group the items, or reduce them. Above roughly nine items a list stops being scannable — see `recursica-skill-working-memory` for what that ceiling actually claims.

**There is no submenu construct.** A trailing chevron for a nested submenu that opens "on hover or click" is documented outside the token inventory; the kit defines no nested menu, and hover opening is forbidden by house rule. Do not build one — see Uncovered.

**There is no placement, size, density, or multi-select axis.** Do not pass a position.

## Rules for using it

**A menu never opens on hover.** It opens on click, on activation, or on a keypress. This is a house rule in `recursica-skill-navigation` — users demonstrably struggle to steer a pointer across hover-revealed menus, and an accessible hover menu is markedly harder to build correctly. It is also the accessibility requirement below.

**The trigger is a button, not a link.** The menu is invoked, not navigated to, and it creates no history entry. See `recursica-skill-buttons-links`.

**An icon-only trigger needs a tooltip and, separately, an accessible name.** The ellipsis trigger is the canonical case. See `recursica-skill-tooltip`.

**Item labels follow button and link copy rules.** An action item is a verb plus its object — "Delete invoice". A navigation item names the object with no verb. Owned by `recursica-skill-buttons-links`.

**Dividers group, they do not decorate.** Use a divider to separate distinct sets of related items. A divider between every item is noise, and a divider with nothing on one side of it is a mistake.

**A destructive item carries the consequence in its words.** No destructive item state exists, so the label is the only channel, and confirmation is handled by `recursica-skill-modal`.

**Hide what the user can never do; disable what the user can unlock.** The permissions rule from `recursica-skill-navigation`. No permission means no item — not a disabled item, and not an item that fails on activation.

**A menu never holds something a task requires the user to find.** A gear that opens a column-visibility menu is a legitimate unadvertised affordance; a menu that hides the only path to completing the work is not. See `recursica-skill-discoverability`.

**A row that has a menu is not a clickable row.** Two competing click targets in one row means the user cannot predict a click — `recursica-skill-tables`.

## Accessibility

A menu is a focus-management component. The list itself is easy; the trigger's state, the arrow keys, and returning focus on close are where menus fail, and a hover-opened menu fails all three at once.

### Screen readers

- **The trigger must announce that it opens a menu, and whether the menu is currently open.** Without the open state the user has no way to know their activation did anything.
- **The trigger needs a real accessible name.** An icon-only ellipsis with no name is announced as nothing. In a table, the name must identify the row's object — "More actions for invoice 1043" — or the user hears the same announcement on every row.
- **The menu is announced as a menu and its items as its items**, so the user learns how long the list is before working through it.
- **A selected item's state must be programmatic.** A checkmark glyph or a filled background is a single visual channel, which `recursica-skill-system-conventions` forbids.
- **An icon-only item needs a real name.** The icon conveys nothing.
- **An unavailable item must still be perceivable, or must not be rendered at all.** If it is disabled, it stays in the accessibility tree, announces as disabled, and the reason is available in text. If the user can never use it, do not render it. There is no third option where it is visible but invisible to assistive technology.
- **Supporting text must be part of the item's announcement**, not a loose element rendered beside the label. Unassociated second lines exist only visually.
- **A divider is decoration and must not be announced as an item.**

### Keyboard and non-mouse navigation

- **A menu must never open on hover.** A hover-opened menu cannot be opened by keyboard, cannot be opened on touch, and closes the moment the pointer strays off the path. This is both the house rule and the hard accessibility floor.
- **The trigger is a tab stop and opens with Enter or Space.** Never a click-only handler.
- **Focus moves into the menu when it opens** — onto the first item, or onto the selected item in an option list.
- **Focus returns to the trigger when the menu closes** — on Escape, on activating an item, on clicking away. This is the step most often skipped, and skipping it drops the user at the top of the document.
- **Arrow keys move between items. Escape closes. Enter and Space activate. Home and End jump to the first and last item.** Wire all of them.
- **The menu is a single tab stop group, not a series of tab stops.** Tab does not walk item by item; the arrow keys do that. Tab leaves the menu.
- **A scrolling menu must scroll to follow keyboard focus.** Arrowing to an item below the fold has to bring it into view.
- **Do not move focus anywhere except back to the trigger.** Not to the top of the page, not into the content the action affected.
- **Nothing needed may be hover-only.** A row-action menu whose trigger only appears when the row is hovered is unreachable by keyboard and by touch — if the action exists, its trigger is visible.
- **Never suppress the focus ring**, on the trigger or on the focused item, and never let the hover style double as the focus style.

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

- **Submenus.** A trailing chevron opening a nested submenu "on hover or click" is documented outside the token inventory. The kit defines no submenu, and hover opening contradicts the navigation rule. Both the existence and the trigger need a decision — do not rely on this without asking.
- **Multi-select menus.** A type axis of single select, multi select, and custom content is documented outside the token inventory. The kit defines only `unselected` and `selected` on `menu-item`. Do not rely on this without asking.
- **Custom content inside a menu item.** Documented outside the token inventory; nothing in the kit supports it. Do not rely on this without asking.
- **How an unavailable item is rendered.** `menu-item` has no disabled state, yet the permissions rule requires disabling what the user can unlock.
- **The item count at which a menu is too long.** `max-height` implies scrolling; no threshold is stated. `recursica-skill-buttons-links` leaves the overflow threshold open too.
- **Placement relative to the trigger**, and behavior near a viewport edge. No placement axis exists.
- **Right-click context menus.** Whether they are supported at all, and what happens to the browser's own menu.
- **Whether a menu item may be a link** when it navigates, given that links must render a real `href`.

## Pre-flight checklist

- [ ] The menu holds more than one action, and no primary action is hidden inside it.
- [ ] It is not standing in for navigation, and no nav overflow was solved with a menu.
- [ ] The list is short enough to scan; no scroll region is compensating for a structural problem.
- [ ] The trigger is a button; an icon-only trigger has both a tooltip and an accessible name that identifies its object.
- [ ] Item labels are verb plus object for actions, object alone for navigation.
- [ ] Supporting text is used only where the label is ambiguous, and is passed through the component.
- [ ] Dividers separate genuine groups; none is decorative.
- [ ] Destructive items state the consequence in words.
- [ ] Items the user has no permission for are absent, not disabled.
- [ ] The trigger announces that it opens a menu and whether it is open.
- [ ] A selected item's state is programmatic, not a glyph alone; icon-only items have names; dividers are not announced.
- [ ] Any unavailable item is perceivable and announced as disabled, or is not rendered.
- [ ] **The menu does not open on hover** — it opens on click, Enter, or Space.
- [ ] Focus moves into the menu on open and returns to the trigger on every close path.
- [ ] Arrow keys, Escape, Enter, Space, Home, and End all work; the menu is one tab stop group, not many.
- [ ] Keyboard focus scrolls into view in a long menu.
- [ ] No trigger appears only on hover; the focus ring is intact.
- [ ] No variant, size, placement, or state outside the two specs above was passed; no submenu was invented.
- [ ] No component-owned padding, gap, divider, or selected styling was overridden.
- [ ] Nothing in the uncovered list was invented.
