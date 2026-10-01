---
name: recursica-skill-buttons-links
description: House rules for clickable triggers — button versus link, table row actions, icon-only buttons and their tooltips, disabled states, bulk actions, primary and secondary hierarchy, labels, destructive-action confirmation, undo, and toolbar overflow. Use when placing, labeling, or reviewing any button or link. Not for the form submit flow — see recursica-skill-forms.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Buttons and links

These are the house rules for deciding whether a trigger is a button or a link, how to label it, and how several triggers on one surface (a region that holds content, such as a page, panel, or modal) rank against each other. They are opinions, not neutral best practices. Treat them as constraints.

These rules assume **complex enterprise web applications, designed for desktop first**, built on the Recursica design system. The components already handle how buttons and links look, their focus states, how the external-link icon is styled, and the markup that makes a link styled as a button accessible. Your decisions are which component to use, what the label says, and which action ranks first.

**A button label is a verb plus an object — `Save form`. A navigation label is the object alone — `Forms`.** In terms of wording, that split is the whole difference. The naming side of it is owned by `recursica-skill-naming-terminology`.

**The label must name what actually happens.** A control labeled `View` that opens something you can edit is mislabeled — the user was promised reading and given writing. If the surface it opens can change data, the label must say so: `Edit`, or `Manage`. The check is simple: open the thing, and see whether its label described it.

**A button opens a panel or a modal; a link does not.** Opening a surface is an action, so it takes a button, even where a link would look lighter. A link is for going somewhere.

**One control, one outcome.** A trigger that opens a surface does not also change the tab, route, or filter — see convention 6 in `recursica-skill-system-conventions`.

## Governing principles

1. **Choose the component by what it does, not how it looks.** A link goes somewhere. A button does something to an object. If you want an action that does not look heavy, use a text button — never a link. How it looks can be adjusted; what it means cannot.
2. **One primary action per surface.** The primary action is the main thing the surface wants the user to do. On a row, panel, page, or dialog, narrow it down to a single primary action and move the rest into a secondary menu. If you cannot narrow it down, the surface is trying to do too much.
3. **Protect the user's control over their browser.** Use real hrefs, open no new tabs automatically, and never disable a link. How the user moves around is their decision, and the link component is what protects that.

## The core distinction

**A link is navigation. A button is a function performed on an object.**

- **Moving to another page or object → link.** Always. Use links wherever the user is navigating.
- **Acting on the object → button.** Buttons work on the page you are on. They do not move the user.

**MUST NOT use a button to navigate.**

**MUST NOT use a link to trigger a server-side action.** This breaks what a link means; it is not a judgment call. If a link component triggers a server-side action, it should have been a button. If you do not want it to look like a button, use a text button — that is what the text variant is for.

**Links MUST render a real `href`.** The point is that the browser's own features keep working: the right-click menu, opening in a new tab, copying the link address. A trigger that navigates without an href takes those away from the user.

## New tabs

**MUST NOT open links in a new tab automatically**, unless it is very clear that opening a new tab is the only and main thing the trigger could possibly do.

Let the user choose — by right-clicking, using the context menu, or using the keyboard. Deciding for them is the mistake to avoid here.

A link may carry an icon showing that the destination is external or will open in a new window. How that icon looks is the design system's business, not yours.

## Labels

**Button label: a verb plus an object.** "Save page." "Copy element." "Duplicate form." Aim for this two-word pairing whenever the button performs an action.

- **Drop the object only in a very narrow context**, where the button can only possibly mean one thing. Then "Save" alone is acceptable.

**Link label: the object itself.** No verb. The link opens the object, and what the user does next is up to them. Putting an action in a link label promises something the link does not do.

**Tooltips:**

- **An icon-only button MUST have a tooltip.** No exceptions. When asked where this rule stops applying, the answer was "never" — see `recursica-skill-icon-semantics`.
- **An icon with a label → the label must be good enough on its own.** A tooltip here is optional, and only for extra information about an unusual function that new users might not recognize. Never use a tooltip to rescue a weak label.

**A generic icon on a specific function gets a label, not a tooltip.** When a symbol could mean different things to different people, the control gets an icon plus a label, or a text-only label. This is owned by `recursica-skill-icon-semantics`, which also sets which icon carries which meaning — an X for close, a trash can for delete, and a horizontal ellipsis rather than a vertical kebab for "more".

## Button hierarchy

**The primary function gets the primary (solid) button. Secondary and tertiary functions get an outline or text button.** This follows by definition: the ranking of the buttons is the ranking of the functions.

**Aim for exactly one primary action per surface.**

**When several actions really are close in importance**, and all of them would otherwise be solid buttons, create a ranking through their labels instead: give the slightly more important action a text label, and make the others icon-only.

## Placement

**Affirmative actions — save, submit, confirm — go at the bottom right.**

**A true alternative to the primary action sits right beside it.** Cancel is the model case: cancel and save are two outcomes of one decision, so keep them close together.

**A rarely used extra function goes at the bottom left**, deliberately far from the primary action, so nobody mistakes it for an alternative. Make it an outline or text button.

The test is whether the second trigger is a real alternative to the first, or just happens to be near it. Alternatives stay together; extra functions stay apart.

## Table rows

**Navigating out of a row → link. Acting on the row's object → button.** A link to another object's detail page is a link; a delete on that row is a button. Links are also visually quieter, which matters in a dense table.

**MUST NOT disable a link in a row.** Going to a related object is always possible. Only actions get disabled.

**A disabled action is simply a disabled button.** When an action is unavailable because of the object's current state, disable the button. Nothing more elaborate is needed.

**One primary action per row.** Everything else belongs in a menu of secondary actions. Note that if a row contains any interactive element, the row itself cannot be clickable — see `recursica-skill-tables`. Do not pile many actions onto a row, especially actions that change from one object to the next.

### Icon-only vs. text buttons in rows

Decide by whether the label is the same on every row:

1. **The same action on every row, consistent and object-level (for example, delete) → an icon-only button** with a tooltip.
2. **More than one such consistent action → collapse them into an ellipsis or "more" menu button** that lists the object-level options (Delete, Edit name, and so on).
3. **An action that only some rows have (for example, Update status) → a button with a text label** on the row.

The rule underneath: **a label that never changes can become an icon; a label that changes must stay as text.**

## Bulk actions

**How bulk actions appear depends on how many there are.**

- **One bulk action** — show it once at least one row is selected. A single disabled control sitting there all the time teaches almost nothing, and it permanently takes up part of the layout.
- **Several bulk actions** — show them all the time, disabled until at least one row is selected. Here the affordance (a visible cue that a control can be used, such as the underline on a link) pays for itself: the user learns what can be done in bulk before selecting anything.

**Before either, ask whether bulk actions belong on this screen at all.** Bulk operations are worth building where the work really is done in batches. Where records are handled one at a time, a bulk control is a guess about how the user works — and a guess that costs layout space and attention on every visit. If you cannot name the batch task it serves, do not build it — see `recursica-skill-design-router`.

**A bulk action's label shows the number selected in parentheses** — `Apply status`, `Apply status (1)`, `Apply status (102)` — with no number shown until at least one row is selected. The label itself never changes; only the number in parentheses appears and disappears. This is also why `Apply to 0 selected` is unnecessary: the count belongs in the button, not in a phrase built around it. The spelled-out phrase goes in the accessible name instead (the name a screen reader reads out for a control). A screen reader announces "Apply status to 102 items" while the button visibly reads `Apply status (102)`. See `recursica-skill-button`.

**Bulk controls never sit inside the filter bar.** They act on the data, not on what is shown. See `recursica-skill-filters`.

**The bulk region holds controls and nothing else.**

**NEVER repeat the selection inside it.** The ticked checkboxes already show which rows are selected, and the number in parentheses already shows how many. A list of the selected records' names says the same thing a third time, in the weakest of the three forms. It also makes the region's height depend on the selection, so the table slides down the page while the reader works — and the thing they are selecting from moves as they select.

**Do not add a clear or deselect-all control.** The header checkbox already does that job, as `recursica-skill-selection-controls` says. A second control doing the same job in a different place is one more thing to read, and a second answer to the same question.

**No "nothing selected" placeholder either.** An empty region is the right way to show an empty selection. With one bulk action, nothing is there yet; with several, they are there and disabled. A sentence saying nothing is selected takes the space the controls will need, and tells the reader what the checkboxes already told them.

**An action on a single record never goes here.** Selection only feeds bulk operations. Editing one record is started from that record. See `recursica-skill-tables`.

## Destructive actions and confirmation

A destructive action is one that deletes something or cannot easily be undone.

**Do not design the page defensively against accidental clicks.** Keep the page simple; accidental clicks are rare. Confirmation is the safeguard, not clever layout.

**Confirm only when the action is massively destructive, hard to recreate, and cannot be undone.** In that case, show a confirmation modal after the click.

**If the action can easily be undone, do not confirm it.** Let it happen immediately — fast and cheap is the right experience.

**The trigger is still a button** either way. Being destructive does not change the component.

**In a confirmation modal:** the primary action is the solid primary button, and cancel is always the secondary button — outline or text.

## Undo

**Deleting one row item, or one of many objects → replace the delete control with an undo button in the same place.** The way back lives where the action happened.

**Destroying a whole object — saving over, deleting, or destroying an entire form's worth of data → use a confirmation modal instead.** At that size there is nothing useful to undo afterward, so the check has to come first.

**A global undo notification is a toast**.

## Toggle actions

**A toggle is a button. Never a link.**

**Label the toggle with the positive state it reaches, not the negative action.** "Follow" becomes "Following" or "Followed" after the click — not "Unfollow."

Put plainly: labeling the button "Unfollow" puts a negative action in front of the user and invites them to take it. Naming the state they reached instead reinforces the choice they made. This hides the way to un-toggle behind a second click. That is intentional, and it is admitted to be **slightly a dark pattern**. Apply it as a deliberate house preference, not as a neutral best practice.

## Toolbars

**Decide between showing a function directly and putting it in an overflow menu by how often it is used.** A function that must exist but is rarely used belongs in an ellipsis or "more" menu.

**Follow established conventions for standard sets of functions.** Text formatting toolbars — bold, italic, underline, alignment — have expected contents. Use the standard set instead of reinventing it.

## Modal triggers

**A trigger that opens a modal is a button.** This is true in the vast majority of cases, because the modal is opened, not navigated to.

**The only exception — a modal that is deliberately designed to be linked to.** If the modal has its own URL that the user could copy from the browser, send to someone else, and have it open for them, a link may trigger it. This is a rare case that is designed on purpose: the modal gets a route _and_ a link trigger together, both deliberately. Without a real URL that can be shared, the modal has no route and the trigger is a button.

## Uncovered — ask, do not invent

No house rule covers these yet. **Ask the person instead of choosing** — see the never-guess rule in `recursica-skill-design-router`. Do not stretch a rule above to fit them.

- **Split buttons.** Whether they are allowed at all.
- **Loading and pending states on actions other than submit.** The forms skill covers submit; `Export` and `Recalculate` have no owner.
- **The point at which actions move into an overflow menu.** The rule says "rare", but gives no count.
- **Keyboard shortcuts for frequent actions.**

## Out of scope

- **All color, visual design, and styling**, including focus states for buttons and links, how the external-link icon looks, and the markup that makes a link styled as a button work for assistive technology. The Recursica components handle these.
- **The order of steps in submitting a form, and when validation happens.** Covered by `recursica-skill-forms`. This skill decides what a trigger _is_ and how it is labeled; that skill decides when a form may be submitted.
- **Navigation structure, tabs, and route design.** Covered by `recursica-skill-navigation`.

## Pre-flight checklist

Before treating a set of triggers as done, check:

- [ ] Every trigger that navigates is a link, and every trigger that performs an action is a button.
- [ ] No button navigates, and no link triggers a server-side action.
- [ ] Actions that must look lightweight use a text button, not a link.
- [ ] Every link renders a real `href`.
- [ ] Nothing opens in a new tab automatically, unless opening a new tab is clearly the only thing the trigger could do.
- [ ] Every button label is a verb plus an object. It is shortened to the verb alone only where the meaning is completely clear.
- [ ] Every link label names the object, with no verb.
- [ ] Every icon-only button has a tooltip, and no tooltip is making up for a weak label.
- [ ] Each surface has exactly one primary action; the other actions are secondary or in a menu.
- [ ] The primary action is the solid button; secondary and tertiary actions are outline or text buttons.
- [ ] The affirmative action is at the bottom right, true alternatives sit right beside it, and rarely used extra functions are at the bottom left.
- [ ] No link in a table row is disabled.
- [ ] Row actions that are unavailable are plain disabled buttons.
- [ ] Each row has one primary action, and any other row actions are in an ellipsis menu.
- [ ] Row actions whose label is the same on every row are icon-only with tooltips; row actions whose label changes are text.
- [ ] A single bulk action appears on the first selection. Several bulk actions are always visible, and disabled until a row is selected.
- [ ] The bulk region holds only controls. It has no list of the selected records, no clear or deselect-all control competing with the header checkbox, no "nothing selected" placeholder, and no action on a single record.
- [ ] Confirmation modals appear only for destruction that cannot be undone and is hard to recreate. Everything that can be undone happens immediately.
- [ ] Cancel in a confirmation modal is the secondary button.
- [ ] Deleting a single item swaps the delete control for an undo button. Destroying a whole object asks for confirmation first instead.
- [ ] A global undo appears as a toast.
- [ ] Toggles are buttons, labeled with the positive state reached — never with a negative like "Unfollow".
- [ ] Rarely used toolbar functions sit in an overflow menu, and standard sets of functions follow convention.
- [ ] Modal triggers are buttons, unless the modal has a URL that can really be shared.
- [ ] You asked before deciding anything on the uncovered list: split buttons, loading states on actions other than submit, when to move actions into an overflow menu, and keyboard shortcuts.
