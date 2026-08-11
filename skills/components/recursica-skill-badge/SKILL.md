---
name: recursica-skill-badge
description: How to use the Recursica badge correctly — when a value is a badge and when it is a chip, an icon, or plain text, which styles exist, the rule that a badge is singular and never interactive, why an error condition is not a badge, where a badge sits relative to the thing it describes, counts and their units, and the screen-reader and keyboard requirements. Use whenever adding, reviewing, or refactoring a status indicator, a count, a tag on a tab or nav item, or read-only metadata on an object. Trigger on "badge", "status", "count", "counter", "pill", "label on a tab", "notification count", "unread count", "screen reader", "tab order", or a request to show a single piece of state alongside something. Do NOT use for anything the user selects, toggles, or dismisses — that is recursica-skill-chip. Do NOT use for badge-vs-chip policy, cardinality, or placement rules — that is recursica-skill-badges-chips.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Badge

A badge is one piece of read-only metadata attached to something else. The system sets it; the user never touches it.

## Use it when

- **One value describes the object** — a status the system owns, a count, a single short attribute.
- **It sits on something else** — a row, a heading, a tab, a nav item, a card. A badge never stands alone.
- **Space is tight.** A badge is small with a tight type treatment, which is what dense views need.

## Do not use it when

| Instead of a badge                          | Use                                                                                   |
| ------------------------------------------- | ------------------------------------------------------------------------------------- | ---------- |
| The user selects, toggles, or dismisses it  | `recursica-skill-chip`                                                                |
| The object carries several values           | Chips. A badge is singular                                                            |
| The value is an error or failure condition  | An icon or a purpose-built treatment — see the rule below                             |
| The text is long, or a phrase               | Plain text. A badge is not a container for a sentence                                 |
| It labels the page or section itself        | A heading. A badge modifies an object, not a view                                     |
| It titles a region, group, or panel section | A heading. **Never a badge** — a badge is metadata about a thing, not the name of one |

**A badge is never interactive.** There is no selectable badge and no dismissible badge in this system. If the user must operate it, you have a chip.

## What exists

Taken from `recursica_ui-kit.json` → `ui-kit.components.badge`. **Do not pass a variant that is not listed here.**

**The third column is the React prop that sets the axis.** The axis name is the token inventory's; it is not a prop, and passing it as one is dropped silently by React. A blank cell means no single prop carries that axis — it is set by CSS state or by separate props, and the rules below say which.

| Axis     | Options                                        | React prop |
| -------- | ---------------------------------------------- | ---------- |
| `styles` | `primary-color`, `warning`, `success`, `alert` | `variant` |
**There is no size axis and no content axis in the kit**, though both are documented outside the token inventory. See the uncovered list before relying on either — that mismatch has not been resolved.

**No disabled state, no interactive state, no hover treatment.** A badge has no states because it is not a control.

**Four intents is a closed set, and most domains have more statuses than that.** A provisioning workflow with Pending, Approved, Ordered, Shipped, Delivered, Blocked, and Cancelled has seven statuses and four styles to express them, so **styles necessarily repeat** — two different statuses will look identical.

**The style must agree with the sentiment of the value.** A positive state never wears the negative treatment. `alert` reads as something wrong, so an approved, complete, or successful value must never carry it — that is a badge actively contradicting its own text, and the colour wins the first read. Where the exact status-to-intent map is undecided, see the uncovered list; what is settled is that **the intent must never fight the word.**

**That is safe only because the badge's text always carries the distinction.** Map several statuses to one intent deliberately, keep the label as the thing that identifies the status, and never let the color be what tells Ordered from Shipped. Required by `recursica-skill-system-conventions`. **Do not invent a fifth intent.** There is no prop for one, so producing one means going around the component — and a fifth colour is not a missing token to report, it is a colour the system has deliberately not given you. See `recursica-skill-design-router` on the escape hatch.

## Rules for using it

**One badge per object.** Two values side by side means the information is plural, and plural is chips.

**Never use a badge to communicate an error.** Badges read as affirmative metadata; "Error" in a badge reads like an accomplishment. Use an icon or a stronger purpose-built treatment. This holds even though `warning` and `alert` styles exist — what those styles are for is an open question, listed below.

**The badge sits immediately after the thing it describes, on the same line.** Never stacked above or below it.

**A count needs its unit somewhere.** "12" alone is only meaningful because of what it is attached to — make sure that attachment is real, not visual proximity.

**Keep the value to one or two words, or a number.** If it does not fit the tight type treatment, it is not badge content.

**On a status change, swap the badge to its new value with no animation.** No pulse, no flash, no transition.

**A badge on a tab or nav item is metadata about that destination**, not a second control. It is never separately clickable, even when the tab it sits on is.

## Accessibility

A badge is text, not a control — which makes the risk the opposite of most components: not that it is unreachable, but that it is read as a floating fragment with no owner, or not read at all.

### Screen readers

- **The badge must be announced as part of the thing it describes**, not as a separate item. "Members, 12" and "Invoice 1043, overdue" are useful; a "12" encountered on its own is not.
- **A count must carry its unit in the announcement** — "3 unread messages", not "3". The visual context that makes the number obvious does not exist in a linear reading.
- **Never let the style carry the meaning.** `success` and `alert` are colors; a screen reader user gets only the text. The word in the badge must be the whole meaning — required by `recursica-skill-system-conventions`.
- **Do not use an icon-only badge.** With no text there is nothing to announce.
- **A badge that changes while the user is on the page needs care.** Either announce the change politely or not at all — a count that updates frequently must never interrupt, and must never announce on every increment.
- **Do not duplicate the badge's text elsewhere for screen readers** and leave both in the reading order; the user hears it twice.

### Keyboard and non-mouse navigation

- **A badge is not focusable and is skipped in the tab order.** Never give it a tabindex, a click handler, or a role that implies interaction.
- **If a badge appears to need focus, it is the wrong component** — that requirement means chip.
- **A badge inside an interactive element** — a tab, a nav item, a row link — is part of that element's name, not a separate stop within it.
- **Never place a badge where hover reveals it.** Its whole purpose is being visible at a glance.

## Not your decision

Do not implement, override, or tune any of these — the component owns them:

- `text` styling, including size and weight.
- `padding-horizontal`, `padding-vertical`.
- `border-size`, `border-radius`, `elevation`.
- All colors per style.

## Load these too

- [`recursica-skill-badges-chips`](../../design-rules/recursica-skill-badges-chips/SKILL.md) — when a badge is the right component, how many are allowed, and placement in tables, cards, tabs, headings, and navigation.
- [`recursica-skill-system-conventions`](../../design-rules/recursica-skill-system-conventions/SKILL.md) — never carry meaning in a single channel.

## Uncovered — ask, do not invent

- **The status-to-intent map.** The principle is settled — the intent agrees with the sentiment, and `alert` never carries a positive value — but which intent each domain status takes has not been decided, and with four intents against more statuses the mapping needs stating rather than improvising.
- **What `warning` and `alert` are for**, given that a badge must not communicate an error. Until this is answered, do not reach for either.
- **A size axis (default and large) and a content axis (message and counter) are documented outside the token inventory, with no token behind either.** Do not assume they are available, and do not rely on this without asking.
- **A cap on counts** — whether a large number is truncated, and how.
- **Whether a badge may carry an icon alongside its text.**
- **Zero.** Whether a count badge is hidden at zero or shown.

## Pre-flight checklist

- [ ] The value is read-only, system-set, and singular.
- [ ] Nothing about the badge is interactive, focusable, or dismissible.
- [ ] No badge communicates an error condition; `warning` and `alert` were not guessed at.
- [ ] It sits immediately after its object on the same line, never stacked.
- [ ] The text alone carries the full meaning; no meaning rides on color.
- [ ] No badge titles a region, a group, or a section; headings do that.
- [ ] Every badge's intent agrees with the sentiment of its value; no positive state wears `alert`.
- [ ] Where the domain has more statuses than the four intents, the mapping is deliberate and the label is what distinguishes them; no fifth intent was invented.
- [ ] A count includes its unit in what gets announced.
- [ ] The badge is announced as part of its object, not as a stray fragment.
- [ ] It has no tabindex, no click handler, and no interactive role.
- [ ] Status changes swap with no animation, and any live update is polite or silent.
- [ ] No style outside the four in the inventory was passed; no size or content axis was assumed.
- [ ] No component-owned styling was overridden.
- [ ] Nothing in the uncovered list was invented.
