---
name: recursica-skill-timeline
description: Rules for the Recursica timeline — when a timeline fits a record of past events, the timeline and the timeline's decorative bullet, timestamp formatting, and list accessibility. Use for activity feeds, audit trails, and history views. Not for a process in progress — see recursica-skill-stepper; not for sortable records — see recursica-skill-tables.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Timeline

A timeline lists events that already happened, in order. Each event has a timestamp.

## When to use a timeline

- **Use a timeline when the reader must read a record over time as a sequence of events.** Examples are an audit trail, an incident log, the activity on one object, or a release history.
- **Use a timeline when the order and the date of each event matter more than the event's details.** Each timeline entry is a short title, one line of description, and a time.
- **Use a timeline when the screen reports milestones already reached.** The reader wants to know what happened and when.

## When not to use a timeline

| Situation                                                                                        | Use instead                                                                                        |
| ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| The screen guides the persona through a process the persona is doing now                         | A stepper. See `recursica-skill-stepper`.                                                          |
| The order of the entries does not matter                                                         | A list. A timeline shows an order of events, and an order that does not exist misleads the reader. |
| A large number of records, or records the persona will sort, filter, or compare                  | A table. See `recursica-skill-tables`.                                                             |
| Tabular data only, with the same fields in every entry                                           | A table. See `recursica-skill-tables`.                                                             |
| Entries arrive in a stream that updates fast, such as chat messages or live logs                 | A table or an activity view built for a large number of entries, not a timeline.                   |
| Each entry needs long text, media, or controls that belong to the entry                          | An accordion, or a page for each entry. See `recursica-skill-accordion`.                           |
| The events branch, or the events depend on one another                                           | No linear component. A timeline shows only one sequence of events.                                 |
| The dates are unknown or approximate                                                             | A grouped list. A grouped list makes no claim about the order of events.                           |
| The design needs to separate repeating objects of the same kind visually, such as rows in a list | A card, if the objects pass the tests in `recursica-skill-card`, or a table.                       |

**Group a very long history instead of making the timeline longer.** Group the events by month or by quarter, or split the timeline into pages with `recursica-skill-pagination`. Showing a thousand events at once is a problem with the structure of the screen. `recursica-skill-system-conventions` says to fix the structure instead of working around the problem.

## Variants

**Use only the timeline variants and options that the Recursica MCP server lists for the project.** A designer can add variants and options in Theme Forge, so each project can differ. Get the list with the server's `recursica_get_component_doc` tool, and use the names the code uses. Never invent a variant or an option.

The rules below describe each part and option by role, such as "the selected state". The names in the standard UI kit (the unchanged UI kit in the official Recursica release) are examples only.

**This skill covers two components: the timeline and the timeline bullet.** No separate bullet skill exists. The standard UI kit calls the two components `timeline` and `timeline-bullet`.

- **The timeline** is the list of timeline items. A timeline item has three parts: a title, a description, and a timestamp. The timestamp is part of the timeline component. Every timestamp must use the format in `recursica-skill-dates-and-currency`.
- **The timeline bullet** is a mark beside a timeline item. A bullet has four types: a plain mark, an icon, an alternative icon, or an avatar. In the standard UI kit, the variant is `types`, with the options `default`, `icon`, `icon-alternative`, and `avatar`. Pages shown only on the design-system website also call the alternative icon bullet "theme icon". "Alternative icon" and "theme icon" mean the same bullet type, and no rule says when to use each name.
- **The timeline has a selected state and an unselected state.** In the standard UI kit, the variant is `selection-states`, with the options `active` and `inactive`. The two options are selection states, not statuses. Never use the selected state to mean "done".
- **Never use a connecting line to show progress.** A timeline never shows progress, and a process in progress uses a stepper. See `recursica-skill-stepper`.

## Rules

**Put the timeline items in time order, and keep one direction from the first item to the last.** A timeline exists to show the sequence of events. A mixed order, or an order the screen does not state, shows the wrong sequence.

**Group events that happened close together into one timeline item**, instead of showing three almost identical entries a second apart. A timeline makes the sequence of events easy to read, and does not list every log entry.

**Format every timestamp by the rules in `recursica-skill-dates-and-currency`:**

- **Use relative time for recent events**, such as `15 minutes ago` or `yesterday`. Relative time saves the reader from working out how long ago the event happened.
- **After the switchover point (the point where relative time switches to an absolute date), show the absolute date**, such as `Jan 7, 2026`. Never use a date in numbers with slashes or hyphens. The numeric form appears only inside an input that has focus.
- **State the time zone whenever the time is not in the persona's time zone.** Also state the time zone when the persona's time zone is unknown.
- **When the place of the event matters, show the time in the time zone where the event happened.** Label the time zone. Do not convert the time. Give the persona a way to convert the time.
- **Keep one timestamp format across the whole timeline.** All timeline items on the same side of the switchover point use the same format, relative or absolute.

**Use the title to name the event, and the description to give the event's details.** Never put the timestamp in the title. The timestamp has a separate place in the timeline item.

**Treat the bullet as decoration.** An avatar bullet or an icon bullet can help show who or what an entry is about. The title and the description must still say who or what. `recursica-skill-system-conventions` forbids showing a meaning in only one channel (color, shape, position or text, each a separate signal). The bullet is the weakest channel in the timeline. See `recursica-skill-avatar` for the rules an avatar bullet must also follow.

**Use one bullet type in the whole timeline.** Use a different bullet type only where text also states what the difference means. Without that text, the reader has to guess what each icon means.

**Never put the timeline in a card.** Never put a form or a form control inside a timeline item. See `recursica-skill-card`.

**Never create or edit entries inside a timeline.** Creating or changing an entry takes a form, and the form follows the rules for forms.

**Never show an entry as faded or pending.** A timeline never shows progress or future steps. The unselected state does not mean "already happened." Every entry in a log or a history is in the past. Every entry is real. A faded or pending look on a completed event makes a past record look like a plan for the future.

## Accessibility

The rules below add to the accessibility baseline in `recursica-skill-system-conventions`, including the focus ring, which every Recursica component follows.

**Give each visual cue in a timeline a match in code that assistive technology can read.** Nearly all of the cues that make a timeline easy to read are visual. The timeline has four visual cues:

- A vertical line shows the sequence of events.
- A bullet shows the type of entry.
- A color shows the selected item.
- A relative timestamp hides the real date.

### Screen readers

- **Announce the events as a list, with the number of events.** Text with no list structure hides how many events there are and which event the persona is on.
- **Group each timeline item's title, description, and timestamp together as one item.** Without the grouping, a screen reader announces three events as nine unrelated lines. The persona cannot tell which time belongs to which title.
- **Start each timeline item with the title.** When the titles are headings, use the same heading level for every title. The persona can then jump from event to event instead of hearing every line.
- **The reading order must match the visual order.** The sequence must come from the order of the list. A screen reader announces nothing about the connecting line.
- **State the sort direction, such as "Newest first", in text above the timeline.** A list read aloud does not reveal the sort direction.
- **Every relative timestamp must also have the absolute date and time available.** "2 hours ago" is useless to a persona who later works out the sequence of events. Put the full, clear date and time in what the screen reader reads, beside the relative time.
- **Keep the bullet silent, because the bullet is decoration.** A screen reader announces nothing for an icon bullet. An avatar bullet either has alternative text that names the person, or is marked as decoration. If the avatar bullet is marked as decoration, put the person's name in the text of the timeline item. Never let an avatar or an icon alone say who or what the entry is about.
- **Set the selected state in code**, as a current or selected state on the timeline item. **Never show the selected state by color alone.**

### Keyboard and non-mouse navigation

- **A timeline item that only shows information is not a tab stop** (a place the Tab key lands). Give the timeline item no `tabindex` and no click handler.
- **When the persona can select timeline items, make each timeline item a real control.** Each control has an accessible name (the name a screen reader reads out for a control) and a selected state, and sits in the tab order in the visual order.
- **When a timeline item holds a link or a button, the timeline item itself must not also be clickable.** A persona using a keyboard cannot tell what Enter will do when one click target sits inside another click target. `recursica-skill-card` and `recursica-skill-tables` apply the same reason to clickable cards and clickable table rows.
- **Never show the absolute date only in a tooltip on hover.** A relative time with the real timestamp shown only on hover is the most common accessibility failure in a timeline. A persona using a keyboard and a persona using touch cannot reach a tooltip that appears only on hover.
- **Never show an entry's details, an entry's actions, or any other information the persona needs only on hover.**
- **In a long timeline, make the control that changes the page or loads more entries a real button.** Keep the button reachable by keyboard. Adding entries must not move focus or lose focus.

## Styling set by tokens

**Never set or override the timeline's styling.** The theme sets every visual property of the timeline, such as size, spacing, borders, colors and animation. Do not add extra containers or spacers to change the timeline's look. If the design needs a look the theme does not give, report the missing look as a design-system gap. See `recursica-skill-design-router`.

Every rule in this section also applies to the timeline bullet. Never set or override the timeline bullet's styling, for any bullet type.

## Related skills

- `recursica-skill-dates-and-currency` — the format of every timestamp in the timeline:
  - the clear date format
  - relative time versus absolute dates, and the switchover point
  - time zones
  - the format of a duration
- `recursica-skill-tables` — the table to use instead of a timeline when the number of records is large. Also use a table when the persona must sort, filter, or compare the records.
- `recursica-skill-avatar` — the rules an avatar bullet must also follow.
- `recursica-skill-system-conventions` — never showing a meaning in only one channel. The skill also says to fix the screen structure instead of showing a history with no limit on length.

### Only if used on the same screen

- `recursica-skill-stepper` — a process the persona is going through now, instead of a record of what happened.
- `recursica-skill-card` — why the timeline never sits in a card and never holds a form.

## Open questions

- **Alignment.** The design-system website shows timelines aligned left and aligned right. Do not rely on an alignment without confirming with the user. Confirm with the user only when the project has no alignment variant.
- **The connecting line.** The design-system website shows a connecting line with a highlighted state for completed events. A timeline never shows progress, with or without a connecting line. Do not rely on a connecting line without confirming with the user. Confirm the connecting line with the user only when the project has no connecting line.
- **Two-track timelines and timelines that compare two streams of events side by side.** Confirm with the user only when the project has no two-track variant.
- **What the selected state means in house terms.** The selected state could mark the item the persona selected, or the most recent event.
- **Whether a timeline item may be selected, be a link, or have an action.** No rule says how a persona interacts with a timeline item.
- **The default sort direction**, newest first or oldest first.
- **When to group a long history, by what time period, and at how many timeline items.**
- **The switchover point, where relative time switches to an absolute date.** `recursica-skill-dates-and-currency` calls the switchover point a product decision.
- **Whether the alternative icon bullet has a different meaning from the icon bullet**, or only a different look.
- **The empty state of a timeline**, for an object with no events yet.

## Pre-flight checklist

- [ ] No completed or past entry is shown in a faded or pending style.
- [ ] The events are in sequence and in the past. A process happening now uses a stepper.
- [ ] A large number of records, or records to sort or compare, use a table. Entries with no order use a list.
- [ ] A long history is grouped or split into pages, not shown all at once.
- [ ] Every state and bullet type is one the project's UI kit lists. No completed, current, or error state was invented.
- [ ] No alignment, orientation, size, or connecting line variant is used unless the project's UI kit lists one.
- [ ] The timeline items are in time order, in one stated direction, and events that happened close together are grouped.
- [ ] Every timestamp uses the clear format: relative time for recent events, and no dates in numbers with slashes or hyphens.
- [ ] The time zone is stated wherever the time is not in the persona's time zone. An event whose place matters shows the time unconverted, with the time zone labeled.
- [ ] One timestamp format is used across the whole timeline. The timestamp sits in the timestamp's place in the timeline item, not in the title.
- [ ] The title and the description say who and what. No meaning depends on the bullet alone.
- [ ] One bullet type is used in the whole timeline. No timeline sits in a card or holds a form control.
- [ ] The events are announced as a list with the number of events, in visual order.
- [ ] The sort direction is stated in text.
- [ ] Each timeline item's title, description, and timestamp are grouped in code as one item.
- [ ] Every relative timestamp has the absolute date and time in what the screen reader reads. The absolute date and time are not only in a tooltip on hover.
- [ ] A screen reader announces nothing for every bullet except an avatar bullet. An avatar bullet may have alternative text that names the person instead. The person's name also appears in the text of the timeline item.
- [ ] The selected state is set in code, and never shown by color alone.
- [ ] A timeline item that only shows information is not a tab stop. A timeline item the persona can select is a real control with an accessible name. A selectable timeline item holds no second click target.
- [ ] Any control that loads more entries is reachable by keyboard. The control does not move focus, lose focus, or change focus in any other way. The focus ring is not hidden.
- [ ] No styling is set or overridden on the timeline or the timeline bullet. No container or spacer is added to change the timeline's look.
- [ ] Open questions were asked about, not decided: alignment, the connecting line, two-track or comparing timelines, what the selected state means, whether a timeline item may be selected, be a link, or have an action, the default sort direction, when and how to group a long history, the switchover point from relative time to an absolute date, whether the alternative icon bullet differs from the icon bullet, and the empty state.
