---
name: recursica-skill-buttons-links
description: House rules for choosing between buttons and links in enterprise web applications — action vs. navigation semantics, table row actions, icon-only vs. text buttons, tooltips, disabled states, bulk actions, primary/secondary/tertiary hierarchy, button and link label copy, destructive-action confirmation, undo, toggle buttons, toolbar overflow, and modal triggers. Use whenever placing, labeling, reviewing, or refactoring any clickable trigger — buttons, links, icon buttons, ellipsis/more menus, row actions, toolbar controls, or dialog buttons. Trigger on "button or link", "call to action", "row action", "icon button", "ellipsis menu", "disabled button", "undo", "confirm dialog", "button label", or any question about what a click should do. Do NOT use for form submit sequencing, validation timing, or steppers — that is recursica-skill-forms. Do NOT use for nav structure, tabs, or route design — that is recursica-skill-navigation.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Buttons and links

House rules for deciding whether a trigger is a button or a link, how it is labeled, and how multiple triggers on one surface rank against each other. These are opinions, not neutral best practices. Apply them as constraints.

Context these rules assume: **complex enterprise web applications, desktop-first**, built on the Recursica design system. Button and link visual treatment, focus states, external-link icon styling, and the markup that makes a link-styled-as-button accessible are all inherited from the components. Your decisions are which component, which label, and which action ranks first.

**A button label is verb plus object — `Save form`. A navigation label is the object alone — `Forms`.** That split is the whole difference in copy terms, and it is governed on the naming side by `recursica-skill-naming-terminology`.

**The label must name what actually happens.** A control labelled `View` that opens an editable surface is mislabelled — the user was promised reading and given writing. If the surface it opens can change data, the label says so: `Edit`, or `Manage`. The check is simple: open the thing, and see whether its label described it.

**A button opens a panel or a modal; a link does not.** Opening a surface is an action, so it takes a button even where a link would look lighter. A link is for going somewhere.

**One control, one outcome.** A trigger that opens a surface does not also change tab, route, or filter — see convention 6 in `recursica-skill-system-conventions`.

## Governing principles

1. **The component follows the intent, not the appearance.** A link goes somewhere. A button does something to an object. If you want an action that doesn't look heavy, use a text button — never a link. Appearance is adjustable; semantics are not.
2. **One primary action per surface.** Row, panel, page, or dialog: narrow it to a single primary action and push the rest into a secondary menu. If you cannot narrow it, the surface is carrying too much.
3. **Preserve the user's browser agency.** Real hrefs, no automatic new tabs, never a disabled link. How the user travels is their decision, and the link component is what protects it.

## The core distinction

**A link is navigation. A button is a function performed on an object.**

- **Moving to another page or object → link.** Always. Use links wherever navigation is what's happening.
- **Acting on the object → button.** Buttons are local to the page you are on. They do not move the user.

**MUST NOT use a button to navigate.**

**MUST NOT use a link to trigger a server-side action.** This is a semantic violation, not a judgment call. If a link component fires a server-side action, it should have been a button. **If you don't want it to look like a button, use a text button** — that is what the text variant exists for.

**Links MUST render a real `href`.** The whole point is that the browser's own capabilities work: right-click context menu, open in new tab, copy link address. A trigger that navigates without an href takes those away from the user.

## New tabs

**MUST NOT open links in a new tab automatically**, unless it is abundantly clear that opening a new tab is the only and primary behavior the trigger could have.

Let the user choose — right-click, context menu, or keyboard. Deciding for them is the failure mode here.

Links may carry an icon to signal that the destination is external or will open a new window. The icon's visual treatment is the design system's business, not yours.

## Labels

**Button label: verb + object.** "Save page." "Copy element." "Duplicate form." Aim for the two-word pairing whenever the button invokes an action.

- **Drop the object only in a very narrow context** where the button can only possibly mean one thing — then "Save" alone is acceptable.

**Link label: the object itself.** No verb. The link opens the object; what the user then does with it is up to them, so naming an action in a link label misstates the contract.

**Tooltips:**

- **Icon-only button → MUST have a tooltip.** No exceptions. Asked where the rule stops applying, the answer was "never" — see `recursica-skill-icon-semantics`.
- **Icon + label → the label must be good enough on its own.** A tooltip here is optional, and only for ancillary information about an unusual function that new users may not recognize. Never use a tooltip to rescue a weak label.

**A generic icon on a specific function takes a label, not a tooltip.** Where the glyph could mean different things to different people, the control gets icon + label or a text-only label. Owned by `recursica-skill-icon-semantics`, which also fixes which icon carries which meaning — X for close, a trash can for delete, a horizontal ellipsis rather than a vertical kebab for "more".

## Button hierarchy

**Primary function → primary (solid) button. Secondary and tertiary functions → outline or text button.** The mapping is definitional: the hierarchy of the buttons is the hierarchy of the functions.

**Aim for exactly one primary action per surface.**

**When several actions are genuinely close in importance** and all would otherwise be solid buttons, create hierarchy through label treatment instead: **give the slightly more important action a text label and render the others icon-only.**

## Placement

**Affirmative actions — save, submit, confirm — go bottom right.**

**A true alternative to the primary action sits immediately beside it.** Cancel is the model case: cancel and save are two outcomes of one decision, so keep them in close proximity.

**A rarely used ancillary function goes bottom left**, deliberately far from the primary action, so it is not mistaken for an alternative. Render it as an outline or text button.

The test is whether the second trigger is a genuine alternative to the first or merely adjacent to it. Alternatives cluster; ancillary functions separate.

## Table rows

**Navigation out of a row → link. Action on the row's object → button.** A link to another object's detail page is a link; a delete on that row is a button. Links are also visually quieter, which matters at table density.

**MUST NOT disable a link in a row.** Navigating to a related object is always available. Only actions get disabled.

**Disabled actions are simply disabled buttons.** When an action is unavailable because of the object's current state, disable the button. Nothing more elaborate is needed.

**One primary action per row.** Everything else belongs in a secondary actions menu. Note that any interactive element in a row means the row itself cannot be clickable — see `recursica-skill-tables`. Do not stack many actions onto a row, especially actions that vary from object to object.

### Icon-only vs. text buttons in rows

Decide by whether the label is constant across every row:

1. **Same action on every row, consistent, object-level (e.g. delete) → icon-only button** with a tooltip.
2. **More than one such consistent action → collapse them into an ellipsis / "more" menu button** listing the object-level options (Delete, Edit name, and so on).
3. **Action that is unique to some rows and not others (e.g. Update status) → text-label button** on the row.

The rule underneath: **a constant label can become an icon; a varying label must stay text.**

## Bulk actions

**How bulk actions appear depends on how many there are.**

- **One bulk action** — reveal it once at least one row is selected. A single disabled control sitting there permanently teaches almost nothing and costs a permanent piece of the layout.
- **Several bulk actions** — show them at all times, disabled until at least one row is selected. Here the affordance earns its keep: the user learns what is possible in bulk before selecting anything.

**Before either, ask whether bulk action belongs on this screen at all.** Bulk operations are worth building where the work is genuinely done in batches. Where records are handled one at a time, a bulk control is a guess about the user's workflow, and a guess that costs layout and attention on every visit. **If you cannot name the batch task it serves, do not build it** — see `recursica-skill-design-router`.

**A bulk action's label carries the selected count in parentheses** — `Apply status`, `Apply status (1)`, `Apply status (102)` — with no count shown until at least one row is selected. The label never changes; only the parenthetical appears and disappears. This is also what makes `Apply to 0 selected` unnecessary: the count belongs in the button, not in a phrase built around it. **The spelled-out phrase belongs in the accessible name instead** — announced as "Apply status to 102 items" while the button visibly reads `Apply status (102)`. See `recursica-skill-button`.

**Bulk controls never sit inside the filter bar.** They act on the data, not on what is shown. See `recursica-skill-filters`.

**The bulk region holds controls and nothing else.**

**NEVER report the selection back inside it.** The ticked checkboxes already say which rows are selected and the parenthetical already carries how many, so a list of the selected records' names is the same fact a third time, in the weakest form of the three. It also makes the region's height depend on the selection, so the table slides down the page as the reader works — and the thing they are selecting from moves while they select.

**Do not add a clear or deselect-all control.** The header checkbox is that affordance, per `recursica-skill-selection-controls`. A second control doing the same job in a different place is one more thing to read and a second answer to the same question.

**No "nothing selected" placeholder either.** An empty region is the correct rendering of an empty selection: with one bulk action there is nothing there yet, and with several they are present and disabled. A sentence explaining that nothing is selected occupies the space the controls will need and tells the reader what the checkboxes already told them.

**A single-record action never lives here.** Selection feeds bulk operations only; editing one record is invoked from that record. See `recursica-skill-tables`.

## Destructive actions and confirmation

**Do not design the page defensively against accidental clicks.** Keep the page simple; accidental triggers are rare. Confirmation is the mechanism, not layout gymnastics.

**Confirm only when the action is massively destructive, hard to recreate, and cannot be undone.** Then show a confirmation modal after the click.

**If the action is easily undone, do not confirm.** Let it happen immediately — fast and cheap is the correct experience.

**The trigger is still a button** either way. Destructiveness does not change the component.

**In a confirmation modal:** the primary action is the solid primary button; **cancel is always the secondary button** — outline or text.

## Undo

**Deleting one row item or one of many objects → replace the delete affordance with an undo button in place.** The reversal lives where the action was.

**Whole-object destruction — saving, deleting, or destroying an entire form's worth of data → use a confirmation modal instead.** At that size there is nothing meaningful to undo afterward, so the check has to come first.

**A global undo notification is a toast.**

## Toggle actions

**A toggle is a button. Never a link.**

**Label the toggle with the affirmative state, not the negative action.** "Follow" becomes "Following" or "Followed" after the click — not "Unfollow."

The reasoning, stated plainly: labeling the button "Unfollow" puts a negative action in front of the user and invites it. Naming the achieved state instead reinforces the choice they made. This leaves the un-toggle affordance hidden behind a second click, which is intentional and is acknowledged to be **slightly a dark pattern** — apply it as a deliberate house preference, not as neutral best practice.

## Toolbars

**Decide direct display vs. overflow menu by frequency of use.** A function that must exist but is rarely used belongs in an ellipsis / "more" menu.

**Follow established conventions for standard function sets.** Text formatting toolbars — bold, italic, underline, alignment — have expected contents; use the standard set rather than reinventing it.

## Modal triggers

**A trigger that opens a modal is a button.** This is true in the vast majority of cases, because the modal is invoked, not navigated to.

**Single exception — the deliberately deep-linkable modal.** If the modal has a dedicated URL the user could copy from the browser, send to someone else, and have open for them, it may be triggered by a link. This is a rare, explicitly designed case: the modal gets a route _and_ a link trigger together, both on purpose. Absent a real shareable URL, the modal is unrouted and the trigger is a button.

## Uncovered — ask, do not invent

No house rule covers these yet. **Ask the human rather than choosing** — see the never-guess rule in `recursica-skill-design-router`. Do not pattern-match them to a rule above.

- **Split buttons.** Whether they are permitted at all.
- **Loading and pending state on non-submit actions.** The forms skill covers submit; `Export` and `Recalculate` are unowned.
- **The threshold for moving actions into an overflow menu.** "Rare" is stated; no count is.
- **Keyboard shortcuts for frequent actions.**

## Out of scope

- **All color, visual design, and styling**, including focus states for buttons and links, external-link icon treatment, and the markup that makes a link-styled-as-button behave for assistive technology. Handled by Recursica components.
- **Form submit sequencing and validation timing.** Covered by `recursica-skill-forms`. This skill decides what a trigger _is_ and how it is labeled; that skill decides when a form may be submitted.
- **Navigation structure, tabs, and route design.** Covered by `recursica-skill-navigation`.

## Pre-flight checklist

Before considering a set of triggers done, verify:

- [ ] Every navigation trigger is a link; every action trigger is a button.
- [ ] No button navigates, and no link fires a server-side action.
- [ ] Actions that must look lightweight use a text button, not a link.
- [ ] Every link renders a real `href`.
- [ ] Nothing opens in a new tab automatically unless that is unmistakably the only behavior.
- [ ] Button labels are verb + object, shortened to the verb alone only where meaning is unambiguous.
- [ ] Link labels name the object, with no verb.
- [ ] Every icon-only button has a tooltip; no tooltip is compensating for a weak label.
- [ ] Exactly one primary action per surface; the rest are secondary or in a menu.
- [ ] Primary action is the solid button; secondary and tertiary are outline or text.
- [ ] Affirmative action bottom right; true alternatives immediately beside it; rare ancillary functions bottom left.
- [ ] No link in a table row is disabled.
- [ ] Unavailable row actions are plain disabled buttons.
- [ ] One primary action per row; additional row actions live in an ellipsis menu.
- [ ] Row actions with a constant label are icon-only with tooltips; varying labels are text.
- [ ] Bulk actions are visible-but-disabled until a row is selected, or revealed on first selection where space is tight.
- [ ] The bulk region holds only controls: no list of the selected records, no clear or deselect-all
      competing with the header checkbox, no "nothing selected" placeholder, and no single-record action.
- [ ] Confirmation modals appear only for irreversible, hard-to-recreate destruction — everything reversible executes immediately.
- [ ] Cancel in a confirmation modal is the secondary button.
- [ ] Single-item deletes swap the delete affordance for an undo button; whole-object destruction confirms up front instead.
- [ ] Global undo is delivered as a toast.
- [ ] Toggles are buttons labeled with the affirmative state, never "Unfollow"-style negatives.
- [ ] Rarely used toolbar functions sit in an overflow menu; standard function sets follow convention.
- [ ] Modal triggers are buttons unless the modal has a genuinely shareable URL.
- [ ] Nothing in the uncovered list — split buttons, non-submit loading states, overflow thresholds, shortcuts — was decided without asking.
