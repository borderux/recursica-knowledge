---
name: recursica-skill-menu
description: Rules for the Recursica menu — a temporary list of actions or choices, never opened on hover, menu item labels and states, why a long menu that scrolls needs a new structure, and focus returning to the trigger. Use for ellipsis, more, row-action, column, and account menus. Not for a field's value — see recursica-skill-dropdown.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Menu

A menu is a temporary list of choices or actions. A trigger is the button that opens a menu. A menu closes when the user dismisses the menu.

## When to use a menu

- **Use a menu when one object has several actions.** An example is the ellipsis or "more" menu. `recursica-skill-buttons-links` requires an ellipsis menu once a row, such as a table row or a list row, has more than one action that every row shares.
- **Use a menu when a control needs a list of options.** A dropdown or an autocomplete opens a menu. The field holds the chosen value, and the menu holds the list of options.
- **Use a menu for a settings control that the screen deliberately keeps less prominent.** An example is the gear button on a table that opens the column-visibility menu, as `recursica-skill-tables` describes.
- **Use a menu for a list of actions that is available on every page.** An example is the account menu. `recursica-skill-navigation` keeps the account menu out of primary navigation.

## When not to use a menu

| Situation                                                                                                   | Use instead                                                                                                                                |
| ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| The menu would hold only one action                                                                         | A button. See `recursica-skill-button`.                                                                                                    |
| The action is the primary action on a page, panel, or modal, or in a row, such as a table row or a list row | A visible button. Each page, panel, or modal has one primary action, shown in view, outside any menu. See `recursica-skill-buttons-links`. |
| Primary or secondary navigation                                                                             | Navigation that stays on screen. See `recursica-skill-navigation`.                                                                         |
| The navigation items do not fit the space                                                                   | Fewer, shorter navigation items. **Never use an overflow menu to make the navigation fit.** See `recursica-skill-navigation`.              |
| The menu has grown too long to show every menu item                                                         | Fewer menu items, or a different structure. See `recursica-skill-system-conventions`.                                                      |
| The content is a form or a multi-step flow                                                                  | A modal or a panel. See `recursica-skill-modal` or `recursica-skill-panel`.                                                                |
| The value must stay visible in a field                                                                      | A dropdown. See `recursica-skill-dropdown`.                                                                                                |
| The content is rich detail that the user cannot act on                                                      | A hover card or a popover. See `recursica-skill-hover-card-popover`.                                                                       |
| The content is a short text label for an icon-only control                                                  | A tooltip. See `recursica-skill-tooltip`.                                                                                                  |

**Do not hide a primary action in a menu.** Show the primary action as a button. A menu holds the secondary and tertiary actions.

## Variants

**Use only the menu variants and options that the Recursica MCP server lists for the project.** A designer can add variants and options in Theme Forge, so each project can differ. Get the list with the server's `recursica_get_component_doc` tool, and use the names the code uses. Never invent a variant or an option.

The rules below describe each option by role, such as "the selected option". The names in the standard UI kit (the unchanged UI kit in the official Recursica release) are examples only.

- **A menu has two parts: the menu container and the menu items.** In the standard UI kit, the two parts are `menu` and `menu-item`.
- **The menu container holds the menu items and any dividers between the menu items.**
- **A menu item is one entry in the menu.** A menu item has a leading icon, a trailing icon, a label, and supporting text.
- **A menu item has a selection variant, with an unselected option and a selected option.** The selected option marks the chosen value in a list of options. Use the selection variant only for selection, never for other states. In the standard UI kit, the selection variant is `selection-states`, with the options `unselected` and `selected`.
- **A menu item has a disabled state, for a menu item the user can unlock.** See the permissions rule under "Rules". How to turn on the disabled state is an open question. In the standard UI kit, the state variant is `states`, with the option `disabled`.
- **A menu item may show a second line of supporting text.** A menu item may show a label and one line of description. Use the supporting text where the label alone is unclear. Keep the supporting text to one line, not a paragraph.
- **The menu and each menu item come with a hover state, a focus state, and an active state.**
- **A menu has a maximum height, so a long menu scrolls.** See the rule on long menus under "Rules".
- **If the project has a destructive item or a danger item, use the project's version.** Otherwise, never invent a destructive item.
- **If the project has a submenu, use the project's submenu. Otherwise, do not build a submenu.** A submenu is a menu item with a trailing chevron that opens a nested menu. Only the design-system website shows a submenu, and the website says the submenu opens "on hover or click". A house rule forbids opening a menu on hover. See "Open questions".
- **If the project has a placement variant, use the placement variant. Otherwise, never set a position for the menu.**

## Rules

**A menu never opens on hover.** A menu opens when the user clicks the trigger, activates the trigger, or presses a key. `recursica-skill-navigation` sets this house rule. Users clearly struggle to steer a pointer across a menu that appears on hover. A hover menu is also much harder to make accessible. The keyboard rules under "Accessibility" also forbid opening a menu on hover, for accessibility.

**Build the trigger as a button, not a link.** Opening a menu does not go to a different page or URL, and opening a menu adds no entry to the browser history. See `recursica-skill-buttons-links`.

**Give an icon-only trigger a tooltip and, separately, an accessible name** (the name a screen reader reads out for a control). The ellipsis trigger is the most common icon-only trigger. See `recursica-skill-tooltip`.

**Write menu item labels by the wording rules for buttons and links.** Label an action item with a verb and an object, as in "Delete invoice". Label a navigation item with the object alone, with no verb. `recursica-skill-buttons-links` sets the wording rules.

**Use dividers to group menu items, never to decorate the menu.** Put a divider between two groups of related menu items. A divider between every menu item groups nothing. A divider with no content on one side of the divider is a mistake.

**A destructive item states the consequence in the destructive item's label.** If the project has no destructive item state, the label is the only channel (color, shape, position or text, each a separate signal) that shows the consequence. `recursica-skill-modal` covers confirming a destructive action.

**Hide a menu item the user can never use. Disable a menu item the user can unlock.** `recursica-skill-navigation` sets this permissions rule. When the user has no permission for an action, the menu shows no menu item for the action. The menu never puts a disabled menu item, or a menu item that fails when used, in place of the hidden menu item.

**A long menu is a sign that the structure of the menu is wrong.** A scrolling menu hides the length of the menu, so the user cannot see how many options exist. Keyboard navigation then has to scroll the menu to follow focus. `recursica-skill-system-conventions` requires fixing the structure instead of adding a workaround. A scrolling list is a workaround. Group the menu items, or cut the number of menu items. Above about nine items, a user can no longer scan a list easily. See `recursica-skill-working-memory` for what the limit of about nine items claims.

**A menu never holds the only way to finish a task.** A gear button that opens a column-visibility menu is a valid unadvertised affordance (a control that works but is not shown in the main interface, such as a keyboard shortcut). A menu that hides the only way to finish a task is not valid. See `recursica-skill-discoverability`.

**A row that has a menu is not a clickable row.** The rule covers a table row, a list row, and every other kind of row. With two click targets in one row, the user cannot predict what a click will do. See `recursica-skill-tables`.

## Accessibility

The rules below add to the accessibility baseline in `recursica-skill-system-conventions`, including the focus ring, which every Recursica component follows.

Most menu accessibility rules are about where keyboard focus goes. The list of menu items is easy to build. Menus usually fail in three places: announcing whether the menu is open, moving between menu items with the arrow keys, and returning focus to the trigger when the menu closes. A menu that opens on hover fails in all three places at once.

### Screen readers

- **The trigger must announce that the trigger opens a menu, and whether the menu is open.** Without the open state, the user cannot tell whether pressing the trigger opened the menu.
- **Give the trigger a real accessible name.** A screen reader reads nothing for an icon-only ellipsis trigger with no accessible name. In a table, the trigger's accessible name must name the object in the table row, as in "More actions for invoice 1043". Otherwise, the user hears the same announcement on every table row.
- **A screen reader announces the menu as a menu, and each menu item as an item of the menu.** The user then learns how many menu items the menu holds before moving through the menu items.
- **The selected menu item's state must be available in code.** A checkmark or a filled background alone shows the selected state in one visual channel. `recursica-skill-system-conventions` forbids showing a meaning in one channel only.
- **Give an icon-only menu item a real accessible name.** A screen reader has nothing to read out for an icon alone.
- **An unavailable menu item must stay perceivable on screen and to assistive technology, or the menu must not show the menu item at all.** A disabled menu item stays in the accessibility tree (the version of the page that assistive technology reads), and a screen reader announces the menu item as disabled. If the user can never use a menu item, do not show the menu item. Never show a menu item on screen while hiding the menu item from assistive technology.
- **Make the supporting text part of the menu item's announcement**, not a separate element placed beside the label. A screen reader skips a second line that is not linked to the menu item.
- **A divider is decoration to a screen reader. A screen reader must not announce a divider as a menu item.**

### Keyboard and non-mouse navigation

- **A menu must never open on hover.** A keyboard user cannot open a hover menu, and a touch user cannot open a hover menu. A hover menu closes the moment the pointer strays off the path to the menu. The ban on hover menus is both the house rule and the hard minimum for accessibility.
- **The trigger is a tab stop (a place the Tab key lands), and Enter or Space opens the menu.** Never build a trigger that responds only to clicks.
- **When the menu opens, focus moves into the menu.** Focus moves onto the first menu item. In a list of options, focus moves onto the selected menu item.
- **When the menu closes, focus returns to the trigger and to no other place.** The menu closes when the user presses Escape, activates a menu item, or clicks outside the menu. Focus never goes to the top of the page, and never into the content that the chosen action changed. Returning focus to the trigger is the step most often skipped. Skipping the step drops the user at the top of the page.
- **The arrow keys move between menu items. Escape closes the menu. Enter and Space activate the focused menu item. Home and End jump to the first menu item and the last menu item.** Support every one of these keys.
- **The whole menu is one tab stop, not a series of tab stops.** The Tab key does not move from one menu item to the next. The arrow keys move between menu items. The Tab key leaves the menu.
- **A menu that scrolls must scroll to follow keyboard focus.** When the user presses an arrow key to reach a menu item below the fold (the part of the page visible only after scrolling), the menu item must scroll into view.
- **Never show a needed control only on hover.** A keyboard user or a touch user cannot reach a row-action menu whose trigger appears only when the pointer is over the row. If a row has row actions, show the trigger of the row-action menu.

## Styling set by tokens

**Never set or override the menu's styling.** The theme sets every visual property of the menu, such as size, spacing, borders, colors and animation. Do not add extra containers or spacers to change the menu's look. If the design needs a look the theme does not give, raise the gap. See `recursica-skill-design-router`.

**Do not restyle the selected menu item.** The selection variant sets the look of the selected menu item.

## Related skills

- `recursica-skill-buttons-links` — when row actions, such as table row actions or list row actions, move into an ellipsis menu, icon-only triggers versus text triggers, label wording, tooltips on icon-only triggers, and moving toolbar functions into an overflow menu by how often the functions are used.
- `recursica-skill-navigation` — sub-navigation that opens on click and never on hover, never using an overflow menu to make the navigation fit, the number of navigation items, and permissions.
- `recursica-skill-tables` — the row-action menu, the column-visibility gear button, and why a table row with a menu cannot be clickable.
- `recursica-skill-system-conventions` — fixing the structure instead of scrolling a long list, never showing a meaning in one channel only, unadvertised affordances, and the keyboard requirement for an unadvertised affordance.
- `recursica-skill-working-memory` — 7 ± 2 as the upper limit on how many items a user can scan, and why a menu lets the user recognize an option instead of recalling the option.

## Open questions

- **Submenus.** Only the design-system website shows a submenu: a menu item with a trailing chevron that opens a nested submenu "on hover or click". Opening on hover contradicts the house rule in `recursica-skill-navigation`. Nobody has decided whether a submenu exists, or how the user opens a submenu. If the project has no submenu, ask before relying on a submenu.
- **Menus with multi-select.** Only the design-system website shows a type variant with the options single select, multi-select, and custom content. If the project has no multi-select variant, ask before relying on multi-select.
- **Custom content inside a menu item.** Only the design-system website shows custom content inside a menu item. If the project has no custom content option, ask before relying on custom content.
- **How the disabled state is set.** The standard UI kit defines a disabled state on the menu item. Nobody has confirmed that the adapter (the Recursica component library for one framework, such as Mantine or Angular Material) exposes the disabled state as a setting. Check the menu item component's settings, or ask, before relying on the disabled state.
- **The number of items at which a menu is too long.** A menu has a maximum height, so a long menu scrolls, but no rule states the number of menu items. `recursica-skill-buttons-links` also leaves open the number of actions at which the actions move into an overflow menu.
- **Where the menu appears relative to the trigger, and how the menu behaves near the edge of the viewport.** Ask about where the menu appears only when the project has no placement variant. Ask about the edge of the viewport in every project.
- **Right-click context menus.** Nobody has decided whether right-click context menus are supported at all, or what happens to the browser's built-in right-click menu.
- **Whether a menu item may be a link.** Nobody has decided whether a menu item that goes to a different page or URL may be built as a link, given that a link must have a real `href`.

## Pre-flight checklist

- [ ] The menu holds more than one action, and no primary action is hidden in the menu.
- [ ] The menu is not used as navigation, and no navigation item that does not fit the space is moved into a menu.
- [ ] The list of menu items is short enough to scan, and a long list is regrouped or cut instead of left to scroll.
- [ ] The trigger is a button. An icon-only trigger has both a tooltip and an accessible name that names the object.
- [ ] An action item's label is a verb and an object. A navigation item's label is the object alone.
- [ ] Supporting text appears only where the label is unclear, and sits in the menu item's supporting text, not in a separate element.
- [ ] Each divider separates two groups of related menu items, and no divider is decorative.
- [ ] Every destructive item states the consequence in words.
- [ ] Menu items the user has no permission for are hidden, not disabled.
- [ ] The trigger announces that the trigger opens a menu, and whether the menu is open.
- [ ] The selected menu item's state is available in code, not shown by a mark alone. Icon-only menu items have accessible names, and dividers are not announced.
- [ ] Every unavailable menu item is perceivable and announced as disabled, or is not shown.
- [ ] **The menu does not open on hover.** The menu opens on a click, Enter, or Space.
- [ ] Focus moves into the menu when the menu opens, and focus returns to the trigger on every way of closing the menu.
- [ ] The arrow keys, Escape, Enter, Space, Home, and End all work, and the whole menu is one tab stop, not many.
- [ ] In a long menu, the focused menu item scrolls into view.
- [ ] No trigger appears only on hover, and the focus ring is intact.
- [ ] Every variant, size, placement, and state is one the project's UI kit lists, and no variant or option is invented. No submenu is built unless the project has a submenu.
- [ ] No styling is set or overridden on the menu, and no container or spacer is added to change the menu's look.
- [ ] Open questions were asked about, not decided: submenus, menus with multi-select, custom content inside a menu item, how the disabled state is set, the number of items at which a menu is too long, where the menu appears relative to the trigger, right-click context menus, and whether a menu item may be a link.
