---
name: recursica-skill-timeline
description: Rules for the Recursica timeline — when a record of past events is right, the timeline and its decorative bullet, timestamp formatting, and list accessibility. Use for activity feeds, audit trails, and history views. Not for a process in progress — see recursica-skill-stepper; not for sortable records — see recursica-skill-tables.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Timeline

A timeline lists events that already happened, in order. Each event has a timestamp.

## When to use a timeline

- **The reader must read a record over time as a sequence of events**, such as an audit trail, an incident log, the activity on one object, or a release history.
- **The order and the date of each event matter more than detail.** Each timeline entry is a short title, one line of description, and a time.
- **The screen reports milestones already reached.** The reader wants to know what happened and when.

## When not to use a timeline

| Situation                                                                                        | Use instead                                                                                        |
| ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| The screen guides the user through a process the user is doing now                               | A stepper. See `recursica-skill-stepper`.                                                          |
| The order of the entries does not matter                                                         | A list. A timeline shows an order of events, and an order that does not exist misleads the reader. |
| A large number of records, or records the user will sort, filter, or compare                     | A table. See `recursica-skill-tables`.                                                             |
| Tabular data only, with the same fields in every entry                                           | A table. See `recursica-skill-tables`.                                                             |
| Entries arrive in a stream that updates fast, such as chat messages or live logs                 | A table or an activity view built for a large number of entries, not a timeline.                   |
| Each entry needs long text, media, or controls of the entry's own                                | An accordion, or a page for each entry. See `recursica-skill-accordion`.                           |
| The events branch, or the events depend on one another                                           | No linear component. A timeline shows only one sequence of events.                                 |
| The dates are unknown or approximate                                                             | A grouped list. A grouped list makes no claim about the order of events.                           |
| The design needs to separate repeating objects of the same kind visually, such as rows in a list | A card, if the objects pass the tests in `recursica-skill-card`, or a table.                       |

**Group a very long history instead of making the timeline longer.** Group the events by month or by quarter, or split the timeline into pages with `recursica-skill-pagination`. Showing a thousand events at once is a problem with the structure of the screen. `recursica-skill-system-conventions` says to fix the structure instead of working around the problem.

## Variants

**Use only the timeline variants and options that the Recursica MCP server lists for the project.** A designer can add variants and options in Theme Forge, so each project can differ. Get the list with the server's `recursica_get_component_doc` tool, and use the names the code uses. Never invent a variant or an option.

The rules below describe each part and option by role, such as "the selected state". The names in the standard UI kit (the unchanged UI kit in the official Recursica release) are examples only.

**This skill covers the timeline and the timeline bullet.** No separate bullet skill exists. The standard UI kit calls the two components `timeline` and `timeline-bullet`.

- **Three parts in each timeline item: a title, a description, and a timestamp.** Each part has a separate text style, set by a token (a named design value, such as a color or a size, set by the design system). The timestamp is part of the timeline component. The timestamp format follows `recursica-skill-dates-and-currency`, and that format is required.
- **A selected state and an unselected state, on the timeline.** In the standard UI kit, the variant is `selection-states`, with the options `active` and `inactive`. The two options are selection states, not statuses. Never use the selected state to mean "done".
- **Four bullet types.** A bullet is a plain mark, an icon, an alternative icon, or an avatar. In the standard UI kit, the variant is `types`, with the options `default`, `icon`, `icon-alternative`, and `avatar`. Pages shown only on the design-system website also call the alternative icon bullet "theme icon". The two names mean the same bullet type, and no rule says when to use each name.
- **No status states in the standard UI kit.** The standard UI kit has no completed, current, upcoming, or error state on a timeline item. If the project adds a status state in Theme Forge, use the project's state.
- **No connecting line in the standard UI kit.** The design-system website shows a line that connects the timeline items, with a highlighted state for completed events. The standard UI kit defines no such line on the timeline. If the project adds a connecting line in Theme Forge, use the project's connecting line. Never use the connecting line to show progress.
- **No alignment variant in the standard UI kit.** The design-system website shows timelines aligned left and aligned right, and the standard UI kit defines neither. If the project adds an alignment variant in Theme Forge, use the project's variant.
- **No orientation variant and no size variant in the standard UI kit.** If the project adds an orientation variant or a size variant in Theme Forge, use the project's variant. A token fixes the maximum width of the text.
- **No two-track timeline in the standard UI kit.** Nothing in the standard UI kit supports two opposing tracks, or a timeline that compares two streams of events side by side. If the project adds a two-track variant in Theme Forge, use the project's variant.

## Rules

**Put the timeline items in time order, and keep one direction from the first item to the last.** A timeline exists to show the sequence of events. A mixed order, or an order the screen does not state, shows the wrong sequence.

**Group events that happened close together into one timeline item**, instead of showing three almost identical entries a second apart. A timeline makes the sequence of events easy to read, and does not list every log entry.

**Format every timestamp by the rules in `recursica-skill-dates-and-currency`:**

- **Use relative time for recent events**, such as `15 minutes ago` or `yesterday`. Relative time saves the reader from working out how long ago the event happened.
- **After the switchover point (the point where relative time switches to an absolute date), show the absolute date**, such as `Jan 7, 2026`. Never use a date in numbers with slashes or hyphens. The numeric form appears only inside an input that has focus.
- **State the time zone whenever the time is not in the user's time zone**, or when the user's time zone is unknown.
- **When the place of the event matters, show the time in the time zone where the event happened, with the time zone labeled.** Do not convert the time. Give the user a way to convert the time.
- **Keep one timestamp format across the whole timeline.** All timeline items on the same side of the switchover point use the same format, relative or absolute.

**The title names the event, and the description gives the detail.** Never put the timestamp in the title. The timestamp has a separate place in the timeline item and a separate text style.

**The bullet is decoration.** An avatar bullet or an icon bullet can help show who or what an entry is about, but the title and the description must say who or what. `recursica-skill-system-conventions` forbids showing a meaning in only one channel (color, shape, position or text, each a separate signal). The bullet is the weakest channel in the timeline. See `recursica-skill-avatar` for the rules an avatar bullet must also follow.

**Use one bullet type in the whole timeline.** Use a different bullet type only where text also states what the difference means. Without that text, the reader has to guess what each icon means.

**Never put the timeline in a card.** Never put a form or a form control inside a timeline item. See `recursica-skill-card`.

**Never create or edit entries inside a timeline.** Creating or changing an entry takes a form, and the form follows the rules for forms.

**The unselected state does not mean "already happened."** Every entry in a log or a history is in the past, and every entry is real. Completed events in the faded style make a record of what happened look like a plan for what will happen. Use a faded or pending style only for states in the future or states not yet reached. **When the timeline shows only a history, no entry is faded.**

## Accessibility

The rules below add to the accessibility baseline in `recursica-skill-system-conventions`, including the focus ring, which every Recursica component follows.

**Give each visual cue in a timeline a match in code that assistive technology can read.** Nearly all of what makes a timeline easy to read is visual. The timeline has four visual cues:

- A vertical line shows the sequence of events.
- A bullet shows the type of entry.
- A color shows the selected item.
- A relative timestamp hides the real date.

### Screen readers

- **Announce the events as a list, with the number of events.** Text with no list structure gives the user no sense of how many events there are, or which event the user is on.
- **Group each timeline item's title, description, and timestamp together as one item.** Without the grouping, a screen reader announces three events as nine unrelated lines. The user cannot tell which time belongs to which title.
- **Start each timeline item with the title.** When the titles are headings, use the same heading level for every title. The user can then jump from event to event instead of hearing every line.
- **The reading order must match the visual order.** The sequence must come from the order of the list. A screen reader announces nothing about the connecting line.
- **State the sort direction, such as "Newest first", in text above the timeline.** A list read aloud does not reveal the sort direction.
- **Every relative timestamp must also have the absolute date and time available.** "2 hours ago" is useless to a user who later works out the sequence of events. Put the full, clear date and time in what the screen reader reads, beside the relative time.
- **Keep the bullet silent, because the bullet is decoration.** A screen reader announces nothing for an icon bullet. An avatar bullet either has alternative text that names the person, or is marked as decoration, with the person's name in the text of the timeline item. Never let an avatar or an icon be the only part of the entry that says who or what the entry is about.
- **Set the selected state in code**, as a current or selected state on the timeline item. **Never show the selected state by color alone.**

### Keyboard and non-mouse navigation

- **A timeline item that only shows information is not a tab stop** (a place the Tab key lands). Give the timeline item no `tabindex` and no click handler.
- **When the user can select timeline items, make each timeline item a real control.** Each control has an accessible name (the name a screen reader reads out for a control) and a selected state, and sits in the tab order in the visual order.
- **When a timeline item holds a link or a button, the timeline item itself must not also be clickable.** A keyboard user cannot tell what Enter will do when one click target sits inside another. `recursica-skill-card` and `recursica-skill-tables` apply the same reason to clickable cards and clickable table rows.
- **Never show the absolute date only in a tooltip on hover.** A relative time with the real timestamp shown only on hover is the most common accessibility failure in a timeline. A keyboard user and a touch user cannot reach a tooltip that appears only on hover.
- **Never show an entry's detail or an entry's actions only on hover.** The same applies to any other information the user needs.
- **When a long timeline splits into pages or loads more entries, the control that does so is a real button a keyboard user can reach.** Adding entries must not move focus or lose focus.

## Styling set by tokens

**Never set or override the timeline properties below.** The timeline component and the timeline bullet component set each property.

- `title-description-gap`, `description-timestamp-gap`, `bullet-content-gap`, `item-gap`.
- `max-text-width`.
- The text styles `title-text`, `description-text`, and `timestamp-text`.
- The size, shape, and look of the bullet for each bullet type: `default`, `icon`, `icon-alternative`, and `avatar`.
- All colors, including the look of the `active` and `inactive` states.

## Related skills

- `recursica-skill-dates-and-currency` — the clear date format, relative time versus absolute dates and the switchover point, time zones, and the format of a duration, for every timestamp in the timeline.
- `recursica-skill-tables` — the table to use instead of a timeline when the number of records is large, or when the user must sort, filter, or compare the records.
- `recursica-skill-avatar` — the rules an avatar bullet must also follow.
- `recursica-skill-system-conventions` — never showing a meaning in only one channel, and fixing the structure of the screen instead of showing a history with no limit on length.

### Only if used on the same screen

- `recursica-skill-stepper` — a process the user is going through now, instead of a record of what happened.
- `recursica-skill-card` — why the timeline never sits in a card and never holds a form.

## Open questions

- **Alignment.** The design-system website shows timelines aligned left and aligned right, and the standard UI kit defines no alignment variant. Do not rely on an alignment without asking. Ask only when the project has no alignment variant.
- **The connecting line.** The design-system website shows a connecting line with a highlighted state for completed events, and the standard UI kit defines no connecting line on the timeline. A timeline never shows progress, with or without a connecting line. Do not rely on a connecting line without asking. Ask about the connecting line only when the project has no connecting line.
- **Two-track timelines and timelines that compare two streams of events side by side.** Nothing in the standard UI kit supports either one. Ask only when the project has no two-track variant.
- **What the selected state means in house terms.** The selected state could mark the item the user selected, or the most recent event. The standard UI kit has only the two selection states.
- **Whether a timeline item may be selected, be a link, or have an action.** No rule says how a user interacts with a timeline item.
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
- [ ] The time zone is stated wherever the time is not in the user's time zone. An event whose place matters shows the time unconverted, with the time zone labeled.
- [ ] One timestamp format is used across the whole timeline. The timestamp is in the timestamp's own place, not in the title.
- [ ] The title and the description say who and what. No meaning depends on the bullet alone.
- [ ] One bullet type is used in the whole timeline. No timeline sits in a card or holds a form control.
- [ ] The events are announced as a list with the number of events, in visual order, and the sort direction is stated in text.
- [ ] Each timeline item's title, description, and timestamp are grouped in code as one item.
- [ ] Every relative timestamp has the absolute date and time in what the screen reader reads, not only in a tooltip on hover.
- [ ] Every bullet is silent, except an avatar bullet, which may be named instead. The person's name also appears in the text of the timeline item.
- [ ] The selected state is set in code, and never shown by color alone.
- [ ] A timeline item that only shows information is not a tab stop. A timeline item the user can select is a real control with an accessible name, and holds no second click target.
- [ ] Any control that loads more entries is reachable by keyboard, and does not move focus, lose focus, or change focus in any other way. The focus ring is not hidden.
- [ ] Gaps, text width, text styles, bullet styles, and colors come from the timeline component.
- [ ] Open questions were asked about, not decided: alignment, the connecting line, two-track or comparing timelines, what the selected state means, whether a timeline item may be selected, be a link, or have an action, the default sort direction, when and how to group a long history, the switchover point from relative time to an absolute date, whether the alternative icon bullet differs from the icon bullet, and the empty state.
