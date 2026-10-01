---
name: recursica-skill-badge
description: How to use the Recursica badge — when a value is a badge rather than a chip, icon, or text, its styles, one badge and never interactive, no error badges, placement, and counts. Use for status, counts, and read-only tags. Not for anything the user selects or removes — see recursica-skill-chip.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Badge

A badge is one piece of read-only metadata attached to something else. The system sets it; the user never touches it.

## Use it when

- **One value describes the object** — a status the system owns, a count, or a single short attribute.
- **It sits on something else** — a row, a heading, a tab, a nav item, a card. A badge never stands alone.
- **Space is tight.** A badge is small, with small type, which is what dense views need.

## Do not use it when

| Instead of a badge                          | Use                                                                                   |
| ------------------------------------------- | ------------------------------------------------------------------------------------- |
| The user selects, toggles, or dismisses it  | `recursica-skill-chip`                                                                |
| The object carries several values           | Chips. A badge is singular                                                            |
| The value is an error or failure condition  | An icon, or a treatment built for the purpose — see the rule below                    |
| The text is long, or a phrase               | Plain text. A badge is not a container for a sentence                                 |
| It labels the page or section itself        | A heading. A badge describes an object, not a view                                    |
| It titles a region, group, or panel section | A heading. **Never a badge** — a badge is metadata about a thing, not the name of one |

**A badge is never interactive.** There is no selectable badge and no dismissible badge in this system. If the user must operate it, you have a chip.

## What exists

Taken from the UI kit (the token file, `recursica_ui-kit.json`, that says which variants and states each component has) → `ui-kit.components.badge`. **Do not pass a variant that is not listed here.**

**The third column is the React prop that sets each axis.** An axis (a variant property, as Figma calls it — one way a component varies, such as its size) is named in the UI kit. Its name is not a prop, and if you pass it as one, React quietly ignores it. A blank cell means no single prop sets that axis — it is set by CSS state or by separate props, and the rules below say which.

| Axis     | Options                                        | React prop |
| -------- | ---------------------------------------------- | ---------- |
| `styles` | `primary-color`, `warning`, `success`, `alert` | `variant`  |

**There is no size axis and no content axis in the UI kit**, though both are shown only on the design-system website. See the uncovered list before relying on either — that mismatch has not been settled.

**No disabled state, no interactive state, and no hover effect.** A badge has no states, because it is not a control.

**Four intents is a closed set, and most fields of work have more statuses than that.** An intent is the kind of meaning a style carries — positive, a warning, a problem, or neutral. A provisioning workflow with Pending, Approved, Ordered, Shipped, Delivered, Blocked, and Canceled has seven statuses and only four styles to show them. So styles have to repeat — two different statuses will look identical.

**The style must agree with the sentiment of the value** — whether the value is good, bad, or neutral. A positive state never gets the negative treatment. `alert` reads as something wrong, so an approved, complete, or successful value must never carry it. That would be a badge actively contradicting its own text, and the color wins on the first read. Where the exact mapping of statuses to intents has not been decided, see the uncovered list. What is settled is that the intent must never fight the word.

**That is safe only because the badge's text always carries the difference.** Map several statuses to one intent on purpose, keep the label as the thing that identifies the status, and never let the color be what tells Ordered apart from Shipped. Required by `recursica-skill-system-conventions`. Do not invent a fifth intent. There is no prop for one, so making one means working around the component. A fifth color is not a missing token to report — it is a color the system has deliberately not given you. See `recursica-skill-design-router` on the escape hatch.

## Rules for using it

**One badge per object.** Two values side by side means the information is plural, and plural means chips.

**Never use a badge to show an error.** Badges read as positive metadata, so "Error" in a badge reads like an achievement. Use an icon, or a stronger treatment built for the purpose. This holds even though the `warning` and `alert` styles exist — what those styles are for is an open question, listed below.

**The badge sits right after the thing it describes, on the same line.** It is never stacked above or below it.

**A count needs its unit somewhere.** "12" alone only means something because of what it is attached to — make sure that connection is real, not just a matter of sitting close by.

**Keep the value to one or two words, or a number.** If it does not fit the small type, it is not badge content.

**When a status changes, swap the badge to its new value with no animation.** No pulse, no flash, no transition.

**A badge on a tab or a nav item is metadata about that destination**, not a second control. It can never be clicked separately, even when the tab it sits on can.

## Accessibility

This component also follows the accessibility baseline in `recursica-skill-system-conventions`. Only what is specific to it is listed here.

A badge is text, not a control. That makes the risk the opposite of most components: not that it cannot be reached, but that it is read as a floating fragment with no owner, or not read at all.

### Screen readers

- **The badge must be announced as part of the thing it describes**, not as a separate item. "Members, 12" and "Invoice 1043, overdue" are useful; a "12" heard on its own is not.
- **A count must include its unit when it is announced** — "3 unread messages", not "3". The visual context that makes the number obvious does not exist when the page is read aloud in order.
- **Never let the style carry the meaning.** `success` and `alert` are colors; a screen reader (software that reads the screen aloud) user gets only the text. The word in the badge must be the whole meaning — as `recursica-skill-system-conventions` requires.
- **Do not use a badge that is only an icon.** With no text, there is nothing to announce.
- **A badge that changes while the user is on the page needs care.** Either announce the change politely, or not at all. A count that updates often must never interrupt, and must never be announced on every increase.
- **Do not repeat the badge's text somewhere else for screen readers** while leaving both in the reading order; the user hears it twice.

### Keyboard and non-mouse navigation

- **A badge cannot receive focus, and it is skipped in the tab order.** Never give it a tabindex, a click handler, or a role that suggests it can be used.
- **If a badge seems to need focus, it is the wrong component** — that need means a chip.
- **A badge inside an interactive element** — a tab, a nav item, a row link — is part of that element's name, not a separate stop inside it.
- **Never put a badge where it only appears on hover.** Its whole purpose is to be seen at a glance.

## Decided elsewhere

Do not implement, override, or tune any of these — the component owns them:

- `text` styling, including size and weight.
- `padding-horizontal`, `padding-vertical`.
- `border-size`, `border-radius`, `elevation`.
- All colors per style.

## Load these too

- `recursica-skill-badges-chips` — when a badge is the right component, how many are allowed, and placement in tables, cards, tabs, headings, and navigation.
- `recursica-skill-system-conventions` — never carry meaning in a single channel.

## Uncovered — ask, do not invent

- **The mapping of statuses to intents.** The principle is settled — the intent agrees with the sentiment, and `alert` never carries a positive value. But which intent each status takes has not been decided. With four intents and more statuses than that, the mapping needs to be stated, not made up on the spot.
- **What `warning` and `alert` are for**, given that a badge must not show an error. Until this is answered, do not reach for either one.
- **A size axis, with default and large, and a content axis, with message and counter, are shown only on the design-system website, with no token behind either.** Do not assume they are available, and do not rely on this without asking.
- **A limit on counts** — whether a large number is cut short, and how.
- **Whether a badge may carry an icon beside its text.**
- **Zero.** Whether a count badge is hidden at zero, or shown.

## Pre-flight checklist

- [ ] The value is read-only, set by the system, and singular.
- [ ] Nothing about the badge is interactive, can receive focus, or can be dismissed.
- [ ] No badge shows an error condition, and you did not guess at `warning` or `alert`.
- [ ] It sits right after its object on the same line, never stacked.
- [ ] The text alone carries the full meaning; no meaning depends on color.
- [ ] No badge titles a region, a group, or a section; headings do that.
- [ ] Every badge's intent agrees with the sentiment of its value, and no positive state carries `alert`.
- [ ] Where there are more statuses than the four intents, the mapping is deliberate, and the label is what tells them apart. You invented no fifth intent.
- [ ] A count includes its unit in what gets announced.
- [ ] The badge is announced as part of its object, not as a stray fragment.
- [ ] It has no tabindex, no click handler, and no interactive role.
- [ ] Status changes swap with no animation, and any live update is polite or silent.
- [ ] You passed no style outside the four in the inventory, and assumed no size or content axis.
- [ ] You overrode no styling that the component owns.
- [ ] You invented nothing from the uncovered list.
