---
name: recursica-skill-menu
description: Rules for the Recursica menu — a temporary list of actions or choices, never opened on hover, menu item labels and states, why a long menu that scrolls needs a new structure, and focus returning to the trigger. Use for ellipsis, more, row-action, column, and account menus. Not for a field's value — see recursica-skill-dropdown.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Menu

A menu is a temporary list of choices or actions. The trigger is the button that opens the menu. For example, the "…" button on a table row is a trigger. The menu closes when the persona dismisses the menu.

## When to use a menu

- **Use a menu when one object has several actions.** An example is the ellipsis or "more" menu. `recursica-skill-buttons-links` requires an ellipsis menu when every row shares more than one action. For example, every invoice row has "Duplicate invoice" and "Delete invoice", so each invoice row gets a "…" menu. The rule covers the rows of a table, a list or another set of rows.
- **Use a menu when a control needs a list of options.** A dropdown or an autocomplete opens a menu. The field holds the chosen value, and the menu holds the list of options.
- **Use a menu for a settings control that the screen deliberately keeps less prominent.** For example, a gear button on a table opens the column-visibility menu, which shows and hides table columns. `recursica-skill-tables` describes the gear button.
- **Use a menu for a list of actions that is available on every page.** An example is the account menu. `recursica-skill-navigation` keeps the account menu out of primary navigation.

## When not to use a menu

| Situation                                                                                                          | Use instead                                                                                                                                |
| ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| The menu would hold only one action                                                                                | A button. See `recursica-skill-button`.                                                                                                    |
| The action is the primary action on a page, panel, modal or row. Examples of a row are a table row and a list row. | A visible button. Each page, panel, or modal has one primary action, shown in view, outside any menu. See `recursica-skill-buttons-links`. |
| Primary or secondary navigation                                                                                    | Navigation that stays on screen. See `recursica-skill-navigation`.                                                                         |
| The navigation items do not fit the space                                                                          | Fewer, shorter navigation items. **Never use an overflow menu to make the navigation fit.** See `recursica-skill-navigation`.              |
| The menu has grown too long to show every menu item                                                                | Fewer menu items, or a different structure. See `recursica-skill-system-conventions`.                                                      |
| The content is a form or a multi-step flow                                                                         | A modal or a panel. See `recursica-skill-modal` or `recursica-skill-panel`.                                                                |
| The value must stay visible in a field                                                                             | A dropdown. See `recursica-skill-dropdown`.                                                                                                |
| The content is rich detail that the persona cannot act on                                                          | A hover card or a popover. See `recursica-skill-hover-card-popover`.                                                                       |
| The content is a short text label for an icon-only control                                                         | A tooltip. See `recursica-skill-tooltip`.                                                                                                  |

**Do not hide a primary action in a menu.** Show the primary action as a button. A menu holds the secondary and tertiary actions. For example, an invoice page shows "Send invoice" as a button and puts "Duplicate invoice" in the menu.

## Variants

**Use only the menu variants and options that the Recursica MCP server lists for the theme (the design a designer sets in Theme Forge: the token values, and each component's variants, states and sizes).** A designer can add variants and options in Theme Forge, so each theme can differ. Get the list with the server's `recursica_get_component_doc` tool, and use the names the code uses. Never invent a variant or an option.

The rules below describe each option by role, such as "the selected option". The names in the standard UI kit (the unchanged UI kit in the official Recursica release) are examples only.

- **A menu has two parts: the menu container and the menu items.** In the standard UI kit, the two parts are `menu` and `menu-item`.
- **The menu container holds the menu items and any dividers between the menu items.**
- **A menu item is one entry in the menu, such as "Delete invoice".** A menu item has a leading icon, a trailing icon, a label, and supporting text.
- **A menu item has a selection variant, with an unselected option and a selected option.** The selected option marks the chosen value in a list of options. For example, in a Country dropdown, the selected option marks "Canada" as the chosen country. Use the selection variant only for selection, never for other states. In the standard UI kit, the selection variant is `selection-states`, with the options `unselected` and `selected`.
- **A menu item has a disabled state, for a menu item the persona can unlock.** See the permissions rule under "Rules". How to turn on the disabled state is an open question. In the standard UI kit, the state variant is `states`, with the option `disabled`.
- **A menu item may show a second line of supporting text.** Use the supporting text where the label alone is unclear. Keep the supporting text to one line, not a paragraph. For example, "Archive invoice" can add the line "Hidden from the list, not deleted".
- **The menu and each menu item come with a hover state, a focus state, and an active state.**
- **A menu has a maximum height, so a long menu scrolls.** See the rule on long menus under "Rules".
- **If the theme has a destructive item or a danger item, use the theme's version.** Otherwise, never invent a destructive item.
- **If the theme has a submenu, use the theme's submenu. Otherwise, do not build a submenu.** A submenu is a menu item with a trailing chevron that opens a nested menu. Only the design-system website shows a submenu. The website says the submenu opens "on hover or click". A house rule forbids opening a menu on hover. See "Open questions".
- **If the theme has a placement variant, use the placement variant. Otherwise, never set a position for the menu.** A placement variant sets where the menu opens, such as below the trigger.

## Rules

**Never open a menu on hover.** Open the menu when the persona clicks or activates the trigger. Also open the menu when the persona presses a key on the trigger, such as Enter or Space. `recursica-skill-navigation` sets this house rule.

- Personas clearly struggle to steer a pointer across a menu that appears on hover.
- A hover menu is also much harder to make accessible.

The keyboard rules under "Accessibility" also forbid opening a menu on hover, for accessibility.

**Build the trigger as a button, not a link.** Opening a menu does not go to a different page or URL. Opening a menu adds no entry to the browser history. See `recursica-skill-buttons-links`.

**Give an icon-only trigger a tooltip and, separately, an accessible name** (the name a screen reader reads out for a control). The ellipsis trigger, "…", is the most common icon-only trigger. See `recursica-skill-tooltip`.

**Word menu item labels by the same rules as button labels and link labels.** `recursica-skill-buttons-links` sets the wording rules.

- Label an action item with a verb and an object, as in "Delete invoice".
- Label a navigation item with the object alone, with no verb, as in "Settings".

**Use dividers to group menu items, never to decorate the menu.** Put a divider between two groups of related menu items. For example, put a divider between the editing actions and "Delete invoice".

- A divider between every pair of menu items groups nothing.
- A divider with no content on one side is a mistake. An example is a divider at the end of the menu.

**State the consequence in a destructive item's label.** For example, "Delete invoice and payments" says that the payments are deleted too. If the theme has no destructive item state, the label is the only channel (color, shape, position or text, each a separate signal) that shows the consequence. `recursica-skill-modal` covers confirming a destructive action.

**Hide a menu item the persona can never use. Disable a menu item the persona can unlock.** For example, the persona can unlock a menu item by finishing a setup step. `recursica-skill-navigation` sets this permissions rule.

- If the persona has no permission for an action, show no menu item for the action.
- Never show a disabled menu item in place of the hidden menu item.
- Never show, in place of the hidden menu item, a menu item that fails when used.

**A long menu is a sign that the structure of the menu is wrong.** Group the menu items, or cut the number of menu items. `recursica-skill-system-conventions` requires fixing the structure instead of adding a workaround. A scrolling list is a workaround. A scrolling menu causes two problems:

- The scrolling menu hides the length of the menu, so the persona cannot see how many options exist.
- Keyboard navigation has to scroll the menu to follow focus.

Above about nine items, a persona can no longer scan a list easily. See `recursica-skill-working-memory` for what the limit of about nine items claims.

**Never put the only way to finish a task in a menu.** A gear button that opens the column-visibility menu is a valid unadvertised affordance (a control that works but is not shown in the main interface, such as a keyboard shortcut). See `recursica-skill-discoverability`.

**Never make a row clickable when the row has a menu.** The rule covers a table row, a list row, and every other kind of row. For example, clicking an invoice row with a "…" menu must not open the invoice. With two click targets in one row, the persona cannot predict what a click will do. See `recursica-skill-tables`.

## Accessibility

The rules below add to the accessibility baseline in `recursica-skill-system-conventions`, including the focus ring, which every Recursica component follows.

**Most menu accessibility rules are about where keyboard focus goes.** The list of menu items is easy to build. Menus fail most often in three places:

- announcing whether the menu is open
- moving between menu items with the arrow keys
- returning focus to the trigger when the menu closes

A menu that opens on hover fails in all three places at once.

### Screen readers

- **The trigger must announce that the trigger opens a menu, and whether the menu is open.** Without the open state, the persona cannot tell whether pressing the trigger opened the menu.
- **Give the trigger a real accessible name.** A screen reader reads nothing for an icon-only ellipsis trigger with no accessible name. In a table, the trigger's accessible name must name the object in the table row, as in "More actions for invoice 1043". Otherwise, the persona hears the same announcement on every table row.
- **A screen reader announces the menu as a menu, and each menu item as an item of the menu.** The persona then learns how many menu items the menu holds before moving through the menu items.
- **The code must mark which menu item is selected.** A checkmark or a filled background alone shows the selected state in one visual channel. `recursica-skill-system-conventions` forbids showing a meaning in one channel only.
- **Give an icon-only menu item a real accessible name.** A screen reader has nothing to read out for an icon alone.
- **An unavailable menu item must stay perceivable on screen and to assistive technology. Otherwise, the menu must not show the menu item at all.** A disabled menu item stays in the accessibility tree (the version of the page that assistive technology reads). A screen reader announces the disabled menu item as disabled. If the persona can never use a menu item, do not show the menu item. Never show a menu item on screen while hiding the menu item from assistive technology.
- **Make the supporting text part of what a screen reader reads for the menu item.** Do not put the supporting text in a separate element beside the label. A screen reader skips a second line that is not linked to the menu item.
- **A screen reader must not announce a divider as a menu item.** A divider is decoration to a screen reader.

### Keyboard and non-mouse navigation

- **A menu must never open on hover.** A persona using a keyboard cannot open a hover menu, and a persona using touch cannot open a hover menu. A hover menu closes the moment the pointer strays off the path to the menu. The ban on hover menus is both the house rule and the hard minimum for accessibility.
- **The trigger is a tab stop (a place the Tab key lands), and Enter or Space opens the menu.** Never build a trigger that responds only to clicks.
- **When the menu opens, move focus into the menu.** Move focus onto the first menu item. In a list of options, such as a dropdown's list, move focus onto the selected menu item.
- **When the menu closes, return focus to the trigger and to no other place.** The menu closes in three ways. The persona:

  - presses Escape
  - activates a menu item
  - clicks outside the menu

  Never move focus to the top of the page. Never move focus into the content that the chosen action changed. For example, after "Duplicate invoice", focus goes back to the "…" trigger, not to the new invoice row. Returning focus to the trigger is the step most often skipped. A skipped step drops the persona at the top of the page.

- **Support every key in the list below.**
  - The arrow keys move between menu items.
  - Escape closes the menu.
  - Enter and Space activate the focused menu item.
  - Home and End jump to the first menu item and the last menu item.
- **Make the whole menu one tab stop, not a series of tab stops.** The Tab key does not move from one menu item to the next. The Tab key leaves the menu.
- **A menu that scrolls must scroll to follow keyboard focus.** When an arrow key moves focus to a menu item below the fold (the part of the page visible only after scrolling), the menu item must scroll into view.
- **Never show a needed control only on hover.** For example, a row-action menu's trigger must not appear only when the pointer is over the row. A persona using a keyboard cannot reach that row-action menu. A persona using touch cannot reach that row-action menu either. If a row has row actions, show the trigger of the row-action menu.

## Styling set by tokens

**Never set or override the menu's styling.** The theme sets every visual property of the menu, such as size, spacing, borders, colors and animation. Do not add extra containers or spacers to change the menu's look. If the design needs a look the theme does not give, report the missing look as a design-system gap. See `recursica-skill-design-router`.

**Do not restyle the selected menu item.** The selection variant sets the look of the selected menu item.

## Related skills

- `recursica-skill-buttons-links` — the following topics:
  - when row actions, such as table row actions or list row actions, move into an ellipsis menu
  - icon-only triggers versus text triggers
  - label wording
  - tooltips on icon-only triggers
  - moving toolbar functions into an overflow menu by how often the functions are used
- `recursica-skill-navigation` — the navigation rules:
  - sub-navigation that opens on click and never on hover
  - never using an overflow menu to make the navigation fit
  - the number of navigation items
  - permissions
- `recursica-skill-tables` — the row-action menu, the column-visibility gear button, and why a table row with a menu cannot be clickable.
- `recursica-skill-system-conventions` — the system-wide rules:
  - fixing the structure instead of scrolling a long list
  - never showing a meaning in one channel only
  - unadvertised affordances, and the keyboard requirement for an unadvertised affordance
- `recursica-skill-working-memory` — 7 ± 2 as the upper limit on how many items a persona can scan. The working-memory skill also explains why a menu lets the persona recognize an option instead of recalling the option.

## Open questions

- **Submenus.** Only the design-system website shows a submenu: a menu item with a trailing chevron that opens a nested submenu "on hover or click". Opening on hover contradicts the house rule in `recursica-skill-navigation`. Nobody has decided whether a submenu exists, or how the persona opens a submenu. If the theme has no submenu, confirm with the user before relying on a submenu.
- **Menus with multi-select.** Only the design-system website shows a type variant with the options single select, multi-select, and custom content. If the theme has no multi-select variant, confirm with the user before relying on multi-select.
- **Custom content inside a menu item.** Only the design-system website shows custom content inside a menu item. If the theme has no custom content option, confirm with the user before relying on custom content.
- **How the disabled state is set.** The standard UI kit defines a disabled state on the menu item. Nobody has confirmed that the adapter (the Recursica component library for one framework, such as Mantine or Angular Material) exposes the disabled state as a setting. Check the menu item's settings in the code, or confirm with the user, before relying on the disabled state.
- **The number of items at which a menu is too long.** A menu has a maximum height, so a long menu scrolls, but no rule states the number of menu items. `recursica-skill-buttons-links` also leaves open the number of actions at which the actions move into an overflow menu.
- **Where the menu appears relative to the trigger, and how the menu behaves near the edge of the viewport.** Confirm with the user where the menu appears only when the theme has no placement variant. Always confirm with the user how the menu behaves at the edge of the viewport.
- **Right-click context menus.** Nobody has decided whether right-click context menus are supported at all, or what happens to the browser's built-in right-click menu.
- **Whether a menu item may be a link.** Nobody has decided whether a menu item that goes to a different page or URL may be a link. The question matters because a link must have a real `href`.

## Pre-flight checklist

- [ ] The menu holds more than one action, and no primary action is hidden in the menu.
- [ ] The menu is not used as navigation.
- [ ] No navigation item that does not fit the space is moved into a menu.
- [ ] The list of menu items is short enough to scan.
- [ ] A long list of menu items is regrouped or cut instead of left to scroll.
- [ ] The trigger is a button. An icon-only trigger has both a tooltip and an accessible name that names the object.
- [ ] An action item's label is a verb and an object. A navigation item's label is the object alone.
- [ ] Supporting text appears only where the label is unclear.
- [ ] Supporting text sits in the menu item's supporting text, not in a separate element.
- [ ] Each divider separates two groups of related menu items, and no divider is decorative.
- [ ] Every destructive item states the consequence in words.
- [ ] Menu items the persona has no permission for are hidden, not disabled.
- [ ] The trigger announces that the trigger opens a menu, and whether the menu is open.
- [ ] The code marks the selected menu item as selected, not only a visual mark such as a checkmark.
- [ ] Icon-only menu items have accessible names, and dividers are not announced.
- [ ] Every unavailable menu item is perceivable and announced as disabled, or is not shown.
- [ ] **The menu does not open on hover.** The menu opens on a click, Enter, or Space.
- [ ] Focus moves into the menu when the menu opens.
- [ ] Focus returns to the trigger on every way of closing the menu.
- [ ] The arrow keys, Escape, Enter, Space, Home, and End all work.
- [ ] The whole menu is one tab stop, not many.
- [ ] In a long menu, the focused menu item scrolls into view.
- [ ] No trigger appears only on hover, and the focus ring is intact.
- [ ] Every variant, size, placement, and state is one the theme's UI kit lists, and no variant or option is invented.
- [ ] No submenu is built unless the theme has a submenu.
- [ ] No styling is set or overridden on the menu.
- [ ] No container or spacer is added to change the menu's look.
- [ ] Open questions were asked about, not decided: submenus, menus with multi-select, custom content inside a menu item, how the disabled state is set, the number of items at which a menu is too long, where the menu appears relative to the trigger, right-click context menus, and whether a menu item may be a link.
