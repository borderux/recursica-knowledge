---
name: recursica-skill-buttons-links
description: House rules for clickable controls — button versus link, table row actions, icon-only buttons and their tooltips, disabled states, bulk actions, primary and secondary hierarchy, labels, destructive-action confirmation, undo, and toolbar overflow. Use when placing, labeling, or reviewing any button or link. Not for the form submit flow — see recursica-skill-forms.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Buttons and links

Treat the house rules for clickable controls as constraints. The house rules are opinions, not neutral best practices. The house rules decide three questions:

- whether a control is a button or a link
- how to label the control
- how several controls rank against each other on one page, panel, modal, or other region that holds content

The rules assume **complex enterprise web applications, designed for desktop first**, built on the Recursica design system.

**Write a button label as a verb plus an object, as in `Save form`. Write a navigation label as the object alone, as in `Forms`.** The verb is the only difference in wording between the two kinds of label. `recursica-skill-naming-terminology` owns the naming side of the split between button labels and navigation labels.

**A control's label must name what happens.** For example, a control labeled `View` that opens editable content is mislabeled. `View` promises reading, but the control gives the persona editing.

- If the content the control opens can change data, the label must say so, as in `Edit` or `Manage`.
- To check a label, open the content the control opens. Confirm that the label describes the content.

**Use a button to open a panel or a modal. Do not use a link to open a panel or a modal.** Opening a panel or a modal is an action. Use a button for an action, even where a link would look lighter. Use a link to go to a different location, such as another page, another object, or a different URL.

**Give each control one outcome.** A control that opens a panel, a modal, or another region that holds content does not also:

- switch a tab
- change the route
- change a filter

See convention 6 in `recursica-skill-system-conventions`.

## Governing principles

1. **Choose the component by what the component does, not by how the component looks.** A link goes to a different location, such as another page, another object, or a different URL. A button performs an action on an object. When an action needs less visual weight, use a button in the least prominent style, never a link. In the standard UI kit (the unchanged UI kit in the official Recursica release), the least prominent style is `text`. The look of a control can be adjusted. The meaning of a control cannot.
2. **Use one primary action per page, panel, modal, or other region that holds content.** The primary action is the main action the region asks the persona to take. For example, `Save` is the primary action of a form that edits a record.

   - Choose a single primary action in a row, a panel, a page, or a dialog.
   - Move every other action into a menu of secondary actions.

   A region with no single primary action holds too many tasks.

3. **Leave the browser under the persona's control.** The persona decides how to move around.

   - Give every link a real `href`.
   - Never open a new tab automatically.
   - Never disable a link.

   The link component keeps the browser features that let the persona decide.

## Button or link

- **Use a link to move to another page or object.** Always use a link when the persona is navigating.
- **Use a button to act on an object.** A button acts on the current page. A button does not take the persona to a different location.

**MUST NOT use a button to navigate.**

**When a page change needs less visual weight, use a link.** Never use a button in the least prominent style for a page change. In the standard UI kit, the least prominent style is `text`.

**MUST NOT use a link to trigger a server-side action.** A link that triggers a server-side action breaks what a link means. The rule is not a judgment call. A link that triggers a server-side action should have been a button. For example, a link that deletes a record should have been a `Delete` button.

**When an action must not look like a button, use a button in the least prominent style.** In the standard UI kit, the least prominent style is `text`. The least prominent style exists for an action that must not look like a button.

**Every link MUST render a real `href` in the HTML.** A real `href` keeps three browser features working:

- the right-click menu
- opening the link in a new tab
- copying the link address

A control that navigates without an `href` takes the three browser features away from the persona.

## New tabs

**MUST NOT open a link in a new tab automatically.** The one exception is a control whose only and main possible result is very clearly a new tab.

Let the persona choose to open a new tab in any of three ways:

- by right-clicking
- by using the context menu
- by using the keyboard

Do not decide for the persona.

A link may show an icon that marks the destination as external or as opening in a new window.

## Labels

**Write a button label as a verb plus an object**, as in "Save page", "Copy element" or "Duplicate form". Aim for a two-word label, a verb and an object, whenever the button performs an action.

**Drop the object only where the button can only possibly mean one action.** In that very narrow context, a label of "Save" alone is acceptable.

**Write a link label as the object alone, with no verb.** For example, a link to the Orders page reads `Orders`, not `View orders`. The link opens the object, and the persona decides what to do next. An action word in a link label promises an action the link does not perform.

### Tooltips

- **Every icon-only button MUST have a tooltip.** The rule has no exceptions. The team answered "never" when asked where the rule stops applying. See `recursica-skill-icon-semantics`.
- **On a control with an icon and a label, write a label that is clear without a tooltip.** A tooltip on that control is optional. Add a tooltip only for extra information about an unusual function that a new persona might not recognize. Never use a tooltip to make up for a weak label.

**Give a generic icon on a specific function a label, not a tooltip.** If an icon could have different meanings for different people, label the control. Use an icon and a label, or a label with no icon. `recursica-skill-icon-semantics` owns the rule for generic icons. The icon-semantics skill also sets which icon stands for which meaning:

- an X for close
- a trash can for delete
- a horizontal ellipsis, not a vertical kebab, for "more"

## Button hierarchy

**Give the primary function a button in the primary style. Give secondary and tertiary functions a button in a less prominent style.** In the standard UI kit, the primary style is `solid`, and the less prominent styles are `outline` and `text`. If the theme (the design a designer sets in Theme Forge: the token values, and each component's variants, states and sizes) names or adds styles, use the theme's styles. Buttons rank in the same order as the functions the buttons perform, by definition.

**Aim for exactly one primary action per page, panel, modal, or other region that holds content.**

**When several actions are close in importance, rank the actions by which action gets a text label.** The rule applies when every one of the actions would otherwise get the primary style.

- Give the slightly more important action a text label.
- Make the other actions icon-only.

For example, `Share` matters slightly more than `Print`. `Share` keeps a text label, and `Print` becomes an icon-only button.

**Never use the smaller button size to fit more buttons side by side.**

## Placement

**Put affirmative actions (save, submit, confirm) at the bottom right.**

**Put a true alternative to the primary action right beside the primary action.** Cancel is the main example of a true alternative. Keep cancel and save close together, because cancel and save are two outcomes of one decision.

**Put a rarely used extra function at the bottom left**, far from the primary action on purpose. The distance keeps personas from mistaking the extra function for an alternative. Give the extra function a button in a less prominent style, such as `outline` or `text` in the standard UI kit.

Before placing a second control, decide which kind of control the second control is:

- A true alternative to the primary action. Keep a true alternative beside the primary action.
- An extra function that only happens to sit near the primary action. Keep an extra function apart from the primary action.

## Table rows

**In a table row, use a link to navigate out of the table row. Use a button to act on the table row's object.**

- A link to another object's detail page is a link, such as a customer name that opens the customer's page.
- A delete action in the same table row is a button.

A link also has less visual weight than a button, and less visual weight matters in a dense table.

**MUST NOT disable a link in a table row.** Going to a related object is always possible. Only actions get disabled.

**Show an unavailable action as a plain disabled button.** If the current state of the table row's object makes an action unavailable, disable the button. A plain disabled button is enough. For example, `Cancel order` is disabled in the table row of an order that has shipped.

**Give each table row one primary action.**

- Put every other action for the table row in a menu of secondary actions.
- Do not crowd many actions onto a table row, especially actions that change from one object to the next.
- If a table row holds any interactive element, the table row itself cannot be clickable. See `recursica-skill-tables`.

### Icon-only or text buttons in table rows

Choose an icon-only button or a text button by whether the button label is the same on every table row.

| Which table rows have the action                        | Button to use                                                                                          | Example                        |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------ |
| Every table row has the same action on the row's object | An icon-only button with a tooltip                                                                     | Delete                         |
| Every table row has more than one such action           | One menu button, shown as an ellipsis or "more". The menu lists the actions on the table row's object. | Delete and Edit name in a menu |
| Only some table rows have the action                    | A button with a text label in the table row                                                            | Update status                  |

**A label that never changes can become an icon. A label that changes must stay as text.**

## Bulk actions

**Show bulk actions according to how many bulk actions the screen has.**

- **One bulk action:** show the bulk action once the persona selects at least one row. A single disabled control that is always visible teaches almost nothing. The disabled control also permanently takes up part of the layout.
- **Several bulk actions:** show every bulk action all the time, disabled until the persona selects at least one row. With several bulk actions, the visible disabled bulk actions are a useful affordance (a visible cue that a control can be used, such as the underline on a link). The persona learns which actions work in bulk before selecting any row.

**Before adding bulk actions, ask whether the screen needs bulk actions at all.** Build bulk actions where personas do the work in batches. For example, a persona who approves many expense reports in one sitting works in batches.

- Do not build a bulk control without naming the batch task the bulk control serves. See `recursica-skill-design-router`.
- Where personas handle records one at a time, a bulk control is a guess about how the persona works. The guess costs layout space and the persona's attention on every visit.

**Show the number of selected items in parentheses in a bulk action's label.** For example, `Apply status` becomes `Apply status (1)`, then `Apply status (102)`.

- The label shows no number until the persona selects at least one row.
- The label words never change. Only the number in parentheses appears and disappears.
- Show the count in parentheses on the button, not in a phrase built around the count. A label such as `Apply to 0 selected` is unnecessary.
- Put the spelled-out phrase in the accessible name (the name a screen reader reads out for a control) instead. For example, a screen reader announces "Apply status to 102 items" while the button shows `Apply status (102)`. See `recursica-skill-button`.

**Never put bulk controls inside a filter bar.** Bulk controls act on the data, not on which data is shown. See `recursica-skill-filters`.

**Put only controls in the bulk action area.** The bulk action area is the place on the screen where the bulk actions sit.

**NEVER repeat the selection inside the bulk action area.** For example, never list the names of the selected records in the bulk action area. The selection already shows in two places:

- The checkboxes in the selected rows show which rows are selected.
- The number in parentheses shows how many rows are selected.

A list of names repeats the selection a third time, in the weakest of the three forms. A list of names also makes the height of the bulk action area change with the selection. The table then slides down the page, so the rows move while the persona is still selecting rows.

**Do not add a clear or deselect-all control.** The checkbox in the table header clears the selection, as `recursica-skill-selection-controls` says. A second control for the same job, in a different place, is one more control to read. The second control is also a second way to do one task.

**Do not add a "nothing selected" placeholder.** An empty bulk action area is the right way to show an empty selection.

- With one bulk action, the bulk action area stays empty until the persona selects a row.
- With several bulk actions, the bulk actions are visible and disabled.

A sentence saying no item is selected takes the space the bulk controls will need. The sentence also repeats what the row checkboxes show.

**Never put an action on a single record in the bulk action area.** For example, the bulk action area never shows `Edit` for the one selected row. Selecting rows only sets which rows a bulk action acts on. Start editing one record from the record itself. See `recursica-skill-tables`.

## Destructive actions and confirmation

A destructive action deletes an object, a value, or any other data, or cannot easily be undone.

**Do not design a page defensively against accidental clicks.** Accidental clicks are rare. Keep the page simple. Use a confirmation as the safeguard, not a clever layout.

**Confirm only when the action is massively destructive, hard to recreate, and cannot be undone.** For that action, show a confirmation modal after the click.

**Do not confirm an action that can easily be undone.** Perform the action immediately. A fast action that costs the persona little is the right experience.

**Use a button for a destructive action**, with or without a confirmation. Being destructive does not change the component.

**In a confirmation modal, give the primary action the primary button style. Always give cancel the secondary button style.** In the standard UI kit, the primary style is `solid`, and the secondary style for cancel is `outline` or `text`.

## Undo

**When the persona deletes one row item, or one of many objects, replace the delete control with an undo button.** The undo button appears where the delete control was. For example, after the persona deletes one comment, `Undo` appears where `Delete` was.

**When the persona destroys a whole object, use a confirmation modal instead.** Ask for confirmation before the action. A persona destroys a whole object in any of three ways:

- saving over the whole object
- deleting the whole object
- destroying a whole form of data

An undo is no longer useful after a loss that large.

**Show a global undo notification as a toast.**

## Toggle actions

**Use a button for a toggle, never a link.**

**Label a toggle with the positive state the toggle reaches, not with the negative action.** After the click, "Follow" becomes "Following" or "Followed", not "Unfollow".

Apply the positive label as a deliberate house preference, not as a neutral best practice.

- A label of "Unfollow" puts a negative action in front of the persona and invites the persona to take the action.
- A label that names the state the persona reached reinforces the persona's choice.
- The positive label hides the way to turn the toggle off behind a second click. The hiding is intentional.

The house rule admits the positive label is slightly a dark pattern.

## Toolbars

**Place a toolbar function by how often personas use the function.** Show the function directly, or put the function in an overflow menu. Put a function that must exist but is rarely used in an ellipsis or "more" menu.

**Follow established conventions for standard sets of functions.** Use the standard set of functions instead of inventing a new set. For example, a text formatting toolbar has expected contents: bold, italic, underline and alignment.

## Modal triggers

**Use a button to open a modal, unless the modal is designed on purpose to be linked to.** The persona opens the modal and does not navigate to the modal.

**A link may open a modal only when the modal is designed on purpose to be linked to.** A linked modal is the only exception, and a linked modal is rare.

- A linked modal has a URL of the modal's own.
- A persona can copy the URL from the browser and send the URL to another person. The modal then opens for the other person.
- Give a linked modal a route and a link that opens the modal together, both on purpose.

Without a real URL that can be shared, the modal has no route. Use a button to open a modal with no route.

## Open questions

**Confirm with the user instead of choosing.** No house rule covers the topics below yet. See the never-guess rule in `recursica-skill-design-router`. Do not stretch a rule in this skill to fit one of the topics.

- **Split buttons.** No rule says whether split buttons are allowed at all.
- **Loading and pending states on actions other than submit.** `recursica-skill-forms` covers the submit button. No skill owns the loading state for `Export` and `Recalculate`.
- **The point at which actions move into an overflow menu.** The toolbar rule says "rarely used", but gives no count.
- **Keyboard shortcuts for frequent actions.**

## Out of scope

- **All color, visual design, and styling.** The Recursica components set color, visual design, and styling. Color, visual design, and styling include these topics:
  - focus states for buttons and links
  - how the external-link icon looks
  - the HTML that makes a link styled as a button work for assistive technology
- **The order of steps in submitting a form, and when validation happens.** `recursica-skill-forms` covers the order of steps and the timing of validation. This skill decides what a control _is_ and how the control is labeled. The forms skill decides when a form may be submitted.
- **Navigation structure, tabs, and route design.** `recursica-skill-navigation` covers navigation structure, tabs, and route design.

## Pre-flight checklist

Before treating a set of buttons and links as done, check each item:

- [ ] Every control that navigates is a link, and every control that performs an action is a button.
- [ ] No button navigates, and no link triggers a server-side action.
- [ ] Actions that need less visual weight use a button in the least prominent style, not a link. In the standard UI kit, the least prominent style is `text`.
- [ ] Page changes that need less visual weight use a link, not a button in the least prominent style.
- [ ] Every link renders a real `href` in the HTML.
- [ ] No control opens a new tab automatically, unless a new tab is clearly the only result the control could have.
- [ ] Every button label is a verb plus an object. A button label is shortened to the verb alone only where the meaning is completely clear.
- [ ] Every link label names the object, with no verb.
- [ ] Every icon-only button has a tooltip, and no tooltip makes up for a weak label.
- [ ] Each page, panel, modal, or other region that holds content has exactly one primary action. The other actions are secondary or in a menu.
- [ ] The primary action uses the primary style. Secondary and tertiary actions use a less prominent style, such as `outline` or `text` in the standard UI kit.
- [ ] No button uses the smaller size to fit more buttons side by side.
- [ ] The affirmative action is at the bottom right, with true alternatives right beside the affirmative action. Rarely used extra functions are at the bottom left.
- [ ] No link in a table row is disabled.
- [ ] Table row actions that are unavailable are plain disabled buttons.
- [ ] Each table row has one primary action, and any other table row actions are in an ellipsis menu.
- [ ] Table row actions whose label is the same on every table row are icon-only with tooltips. Table row actions whose label changes are text.
- [ ] A single bulk action appears on the first selection. Several bulk actions are always visible, and disabled until a row is selected.
- [ ] The bulk action area holds only controls. The bulk action area has no list of the selected records. No clear or deselect-all control competes with the checkbox in the table header. The bulk action area has no "nothing selected" placeholder and no action on a single record.
- [ ] Confirmation modals appear only for destruction that cannot be undone and is hard to recreate. Every action that can be undone happens immediately.
- [ ] Cancel in a confirmation modal is the secondary button.
- [ ] Deleting a single item swaps the delete control for an undo button. Destroying a whole object asks for confirmation first instead.
- [ ] A global undo appears as a toast.
- [ ] Toggles are buttons, labeled with the positive state reached, never with a negative like "Unfollow".
- [ ] Rarely used toolbar functions sit in an overflow menu, and standard sets of functions follow convention.
- [ ] Controls that open a modal are buttons, unless the modal has a real URL that can be shared.
- [ ] Open questions were asked about, not decided: split buttons, loading states on actions other than submit, when to move actions into an overflow menu, and keyboard shortcuts.
