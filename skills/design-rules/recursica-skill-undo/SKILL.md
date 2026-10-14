---
name: recursica-skill-undo
description: House rules for undo — when an action gets an undo instead of a confirmation, where the undo goes (on the page, in place, or in a toast), when a toast is needed at all, and the Undo button's accessible name. Use whenever an action can be reversed, or when choosing between an undo and a confirmation. Not for the confirmation modal itself — see recursica-skill-buttons-links.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Undo

The house rules in this skill say when an action gets an undo, and where the undo goes. Treat each house rule as a constraint.

## The governing principles

1. **Do the action right away and offer an undo, instead of asking for a confirmation.** For example, the persona deletes one comment, the comment goes, and `Undo` appears. A fast action that costs the persona little is the right experience.
2. **Put the undo where the persona will look for the undo.** The right place depends on what the action did.
3. **Show a toast only when the persona needs to know that the action worked.**

## Undo or confirmation

**Do not confirm an action that can easily be undone.** Perform the action immediately, and offer an undo.

**Confirm only when the action is massively destructive, hard to recreate, and cannot be undone.** For that action, show a confirmation modal after the click. `recursica-skill-buttons-links` sets the confirmation rules.

**When the persona destroys a whole object, use a confirmation instead of an undo.** An undo is no longer useful after a loss that large. A persona destroys a whole object in any of three ways:

- saving over the whole object
- deleting the whole object
- destroying a whole form of data

## Where the undo goes

**Pick the undo's place by what the action did:**

- **A frequent, minor change gets an undo button on the page, and no toast.** For example, the persona picks a new color. A toast after every small change would annoy the persona.
- **A deleted item that stays in view gets an undo in place.** `Undo` appears where `Delete` was. For example, after the persona deletes one comment, `Undo` replaces `Delete` on that comment.
- **A destructive action that removes the object from view gets a toast with an Undo button.** The persona can no longer select the object, so the toast confirms that the action worked. For example, "Project archived" with an Undo button.

**Rarely put an undo in both a toast and on the page.**

## An Undo button in a toast

**Put one action at most in a toast.** An Undo button is that one action. `recursica-skill-toast` sets the toast's text, styles, timing and announcements.

**Give the Undo button an accessible name (the name a screen reader reads out for a control) that includes the item.** For example, name the button "Undo delete of invoice 1043", not "Undo". By the time the persona reaches the button, the context around the button is gone.

**Use the code library's timing and behavior for a toast with an Undo button.** The code library behind the toast sets how long the toast stays and how the toast behaves. Change either only when the user asks.

## Timing

**Use the code library's default for how long an undo stays available, unless the user asks for a change.** The code library behind the adapter sets that time.

## Out of scope

- **The confirmation modal**: `recursica-skill-buttons-links` and `recursica-skill-modal`.
- **The toast component and toast timing**: `recursica-skill-toast` and `recursica-skill-feedback-messaging`.
- **Undo inside a table row waiting for a decision**: `recursica-skill-tables`.
- **A control with two outcomes, which no undo can reverse**: `recursica-skill-system-conventions`.

## Open questions

No open questions remain.

## Pre-flight checklist

- [ ] Every action that can easily be undone happens right away and offers an undo, with no confirmation.
- [ ] A confirmation appears only for an action that is massively destructive, hard to recreate and cannot be undone.
- [ ] A frequent, minor change has an undo on the page and shows no toast.
- [ ] A deleted item that stays in view shows `Undo` where `Delete` was.
- [ ] A destructive action that removes the object from view shows a toast with an Undo button.
- [ ] An undo appears in both a toast and on the page only rarely.
- [ ] The Undo button's accessible name includes the item the undo affects.
- [ ] The undo time is the code library's default, unless the user asked for a change.
