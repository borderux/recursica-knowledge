---
name: recursica-skill-timeline
description: How to use the Recursica timeline — when a record of past events is right, the timeline and its decorative bullet, timestamp formatting, and list accessibility. Use for activity feeds, audit trails, and history views. Not for a process in progress — see recursica-skill-stepper; not for sortable records — see recursica-skill-tables.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Timeline

A timeline lists events that already happened, in order, each with a timestamp.

## Use it when

- **A record over time has to be read as a sequence** — an audit trail, an incident log, activity on one object, a release history.
- **The order and the date matter more than a lot of detail.** Each entry is a short title, a line of description, and a time.
- **Milestones already reached** are being reported, and the reader wants to know what happened and when.

## Do not use it when

| Instead of a timeline                                             | Use                                                       |
| ----------------------------------------------------------------- | --------------------------------------------------------- |
| Guiding the user through a process they are performing now        | `recursica-skill-stepper`                                 |
| Order does not matter                                             | A list. Implying chronology where there is none misleads  |
| High plurality, or records the user will sort, filter, or compare | A table — `recursica-skill-tables`                        |
| Purely tabular data with the same fields on every row             | A table — `recursica-skill-tables`                        |
| A rapidly updating stream — chat, live logs                       | A table or activity view built for volume, not a timeline |
| Each entry needs long text, media, or its own controls            | `recursica-skill-accordion`, or a page per entry          |
| Branching or dependent flows                                      | Nothing linear. A timeline asserts one sequence           |
| The dates are unknown or approximate                              | A grouped list, so the ordering claim is not made         |
| Separating repeating peer objects visually                        | `recursica-skill-card` if it earns one, otherwise a table |

"High plurality" means a large number of items of the same kind. A "peer" is an object of the same kind as the ones around it, such as a row in a list.

**A very long history is not a longer timeline.** Group it — by month, by quarter — or split it into pages with `recursica-skill-pagination`. Showing a thousand events at once is the structural failure `recursica-skill-system-conventions` warns about.

## What exists

Taken from the UI kit (the token file, `recursica_ui-kit.json`, that says which variants and states each component has) → `ui-kit.components.timeline` and `ui-kit.components.timeline-bullet`. **This skill covers both; there is no separate bullet skill.** Do not pass a variant or state that is not listed here.

| Component         | Axis               | Options                                         |
| ----------------- | ------------------ | ----------------------------------------------- |
| `timeline`        | `selection-states` | `active`, `inactive`                            |
| `timeline-bullet` | `types`            | `default`, `icon`, `icon-alternative`, `avatar` |

**An item has three parts: a title, a description, and a timestamp.** Each has its own type token (`title-text`, `description-text`, `timestamp-text`). A token is a named design value, such as a color or a size, set by the design system. The timestamp is part of the component, which means `recursica-skill-dates-and-currency` governs how it reads — that formatting is not optional.

**`active` and `inactive` are selection states, not statuses.** A timeline item has no completed, current, upcoming, or error state. Do not reuse `active` to mean "done".

**There is no connector token on the timeline.** A connecting line with a highlighted state for completed events is shown only on the design-system website, but the UI kit defines no such property here. Do not use the line to show progress.

**There is no alignment axis (a property a component varies on, such as size or style; Figma calls it a variant property), no orientation axis, and no size axis.** Left and right alignment are shown only on the design-system website, but the UI kit defines neither, and nothing supports two opposing tracks or a timeline that compares two streams side by side. `max-text-width` is a fixed property.

**`icon-alternative` is also called "theme icon"** in material shown only on the design-system website. It is one thing with two names — and no rule says when each name is used.

## Rules for using it

**Put the items in time order, and keep one direction the whole way through.** If the order is mixed or not stated, the component misrepresents the one thing it exists to show.

**Group events that happened close together into one item**, instead of showing three almost identical entries a second apart. A timeline's value is that the sequence is easy to read, not that the log is complete.

**Format every timestamp by `recursica-skill-dates-and-currency`:**

- **Relative time for recent events** — `15 minutes ago`, `yesterday` — because working backward from now is effort the format should save the reader.
- **Past the switchover point, the absolute date** — `Jan 7, 2026`. Never the numeric slash or hyphen form, which exists only inside an input that has focus.
- **State the time zone whenever the time is not in the user's own**, or the user's time zone is unknown.
- **Where the event's location matters, show the time in the time zone where it happened, labeled, and do not convert it** — and give the user a way to convert it.
- **Keep one format across the whole timeline.** Do not use relative time on some items and absolute dates on others when they fall on the same side of the switchover point.

**The title names the event; the description is the body.** Do not add the timestamp to the title — it has its own slot and its own type token.

**The bullet is decoration.** An avatar or an icon bullet may help show who or what an entry is about, but the title and description must say it. `recursica-skill-system-conventions` forbids carrying meaning in one channel (color, shape, position or text, each a separate signal), and a bullet is the weakest channel in the component. For an avatar bullet's own requirements, see `recursica-skill-avatar`.

**Use one bullet type throughout a timeline**, or vary it only where the text also states what the difference means. A mix of icons the reader has to decode is a legend with no key.

**Do not wrap the timeline in a card**, and do not put a form or a form control inside a timeline item. See `recursica-skill-card`.

**A timeline is not a place to edit.** If entries are being created or changed here, that is a form, and follows the rules for forms.

**`inactive` does not mean "already happened."** Every entry in a log or history is in the past, and all of them are real. Showing completed events in the faded style makes a record of what happened look like a plan for what will happen — the exact opposite of the truth. Keep any faded or pending style for states that are truly in the future or not yet reached. If the timeline is purely a history, **no entry is faded.**

## Accessibility

This component also follows the accessibility baseline in `recursica-skill-system-conventions`, including the focus ring. Only what is specific to it is listed here.

A timeline is a list of events, and almost everything that makes it readable is visual: a vertical line that suggests sequence, a bullet that suggests a type, a color that suggests selection, and a relative timestamp that hides the real date. **All four have to be replaced with something in the code** that assistive technology can read.

### Screen readers

- **Announce the events as a list, with its length.** A run of unstructured text gives the user no sense of how many events there are, or which one they are on.
- **Each item's title, description, and timestamp must be grouped together as one item.** Three separate lines with no grouping read as nine unrelated strings across three events, and the reader cannot tell which time belongs to which title.
- **Each item starts with its title**, at the same heading level every time if headings are used, so the user can jump from event to event instead of reading everything.
- **The reading order must match the visual order**, and the sequence must come from the order of the list — the connecting line tells a screen reader nothing.
- **State the sort direction in text** above the timeline. A list read aloud does not reveal that it is "Newest first".
- **A relative timestamp must also have its absolute value available.** "2 hours ago" is useless to someone piecing together a sequence later. Include the full, clear date and time in what the screen reader reads, alongside it.
- **The bullet is decorative and must be silent.** An icon bullet is announced as nothing. An avatar bullet either has alternative text naming the person, or is marked decorative, with the name in the item's own text. Never let an avatar or an icon be the only thing that identifies who or what an entry is about.
- **`active` must be set in code** — a current or selected state on the item — **never shown by color alone.**

### Keyboard and non-mouse navigation

- **An item that cannot be used is not a tab stop** (a place the Tab key lands). No `tabindex`, and no click handler on an event that just displays.
- **If items can be selected, each is a real control** with an accessible name (the name a screen reader reads out for a control) and a selected state, in the tab order, in visual order.
- **If an item contains a link or a button, the item itself must not also be clickable.** Overlapping targets leave a keyboard user unsure what Enter will do — the same reasoning `recursica-skill-card` and `recursica-skill-tables` apply to clickable cards and rows.
- **The absolute date must not appear only in a tooltip on hover.** This is the most common failure here: a relative time with the real timestamp shown on hover cannot be reached by keyboard or by touch.
- **Nothing else the user needs may appear only on hover** either — not an entry's detail, and not its actions.
- **Where a long timeline pages or loads more, that control is a real button the keyboard can reach**, and adding items must not move or lose focus.

## Set by the component

Do not set or override any of these. The components set them:

- `title-description-gap`, `description-timestamp-gap`, `bullet-content-gap`, `item-gap`.
- `max-text-width`.
- `title-text`, `description-text`, and `timestamp-text` type treatment.
- The bullet's size, shape, and treatment for each of `default`, `icon`, `icon-alternative`, and `avatar`.
- All color, including the `active` and `inactive` treatment.

## Load these too

- `recursica-skill-dates-and-currency` — the disambiguated date format, relative versus absolute time and the switchover, time zones, and duration formatting for every timestamp in the component.
- `recursica-skill-tables` — the alternative whenever volume is high or the records need sorting, filtering, or comparison.
- `recursica-skill-avatar` — what an avatar bullet needs in its own right.
- `recursica-skill-system-conventions` — never carry meaning in a single channel, and fix the structure rather than rendering an unbounded history.

### Only if the screen also uses it

- `recursica-skill-stepper` — the forward-looking process the user is walking through, as opposed to a record of what happened.
- `recursica-skill-card` — why the timeline is not wrapped in a card and holds no form.

## Uncovered — ask, do not invent

- **Alignment.** Left and right alignment are shown only on the design-system website, but the UI kit defines no alignment axis. Do not rely on this without asking.
- **The connecting line.** A connector with a highlighted state for completed events is shown only on the design-system website, but the UI kit defines no connector property on the timeline, so whether progress may be shown at all is not settled. Do not rely on this without asking.
- **Two-track or comparing timelines** — two streams of events compared side by side. Nothing in the UI kit supports it.
- **What `active` means in house terms** — the item the user selected, or the most recent event. Only the two selection states exist.
- **Whether a timeline item may be selected, be a link, or have an action.** No rule for interaction is stated.
- **The default sort direction** — newest first or oldest first.
- **When to group a long history, by what time period, and at how many items.**
- **The point where relative time switches to an absolute date**, which `recursica-skill-dates-and-currency` names as a product decision.
- **Whether `icon-alternative` means something different from `icon`**, or is only a different look.
- **The empty state of a timeline** — an object with no events yet.

## Pre-flight checklist

- [ ] No completed or past entry is shown in a faded or pending style.
- [ ] The events really are in sequence and already happened. A process happening now went to a stepper.
- [ ] High-volume records, or records to sort or compare, went to a table. Content with no order went to a list.
- [ ] A long history is grouped or split into pages, not shown all at once.
- [ ] Only `active`/`inactive` and the four bullet types are used. No completed, current, or error state was invented.
- [ ] No alignment, orientation, size, or connector property was passed — none exist.
- [ ] Items are in time order, in one stated direction, with events that happened close together grouped.
- [ ] Every timestamp uses the clear format: relative time for recent events, and no numeric slash-or-hyphen dates.
- [ ] Time zones are stated where the time is not in the user's own. Events whose location matters are shown unconverted and labeled.
- [ ] One timestamp format is used across the whole timeline, and the timestamp is in its own slot, not in the title.
- [ ] The title and description say who and what. No meaning depends on the bullet alone.
- [ ] One bullet type is used throughout. No timeline is wrapped in a card or holds a form control.
- [ ] The events are announced as a list with its length, in visual order, with the sort direction stated in text.
- [ ] Each item's title, description, and timestamp are grouped in code as one item.
- [ ] Every relative timestamp has its absolute value in what the screen reader reads — not only in a tooltip on hover.
- [ ] Bullets are silent or, for avatars, named — and the name also appears in the item's text.
- [ ] `active` is set in code, never shown by color alone.
- [ ] Items that just display are not tab stops. Items that can be selected are real, named controls, with no second click target inside them.
- [ ] Any load-more control can be reached by keyboard and does not disturb focus. The focus ring is not hidden.
- [ ] You overrode no gap, width, type style, bullet styling, or color that the component owns.
- [ ] You invented nothing from the uncovered list.
