---
name: recursica-skill-timeline
description: How to use the Recursica timeline correctly — when a chronological record is the right structure and when a table, a list, or a stepper is the answer instead, what the timeline and its timeline-bullet sub-component provide, why the bullet is decorative, how timestamps must be formatted, and the screen-reader and keyboard requirements. Use whenever adding, reviewing, or refactoring a timeline, activity feed, audit trail, or history view. Trigger on "timeline", "timeline bullet", "activity feed", "audit trail", "event history", "chronological", "relative time", "ago", "timestamp", "screen reader", "tab order", or a request to show what happened when. Do NOT use for a process the user is completing now — that is recursica-skill-stepper. Do NOT use for sortable or high-volume records — that is recursica-skill-tables. Do NOT use for date and time formatting rules themselves — that is recursica-skill-dates-and-currency.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Timeline

A timeline lists events that already happened, in order, each with a timestamp.

## Use it when

- **A chronological record has to be read as a sequence** — an audit trail, an incident log, activity on one object, a release history.
- **The order and the date matter more than dense detail.** Each entry is a short title, a line of description, and a time.
- **Milestones already reached** are being reported, where the reader's question is what happened and when.

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

**A very long history is not a longer timeline.** Group it — by month, by quarter — or paginate it with `recursica-skill-pagination`. Rendering a thousand events is the structural failure `recursica-skill-system-conventions` warns about.

## What exists

Taken from `recursica_ui-kit.json` → `ui-kit.components.timeline` and `ui-kit.components.timeline-bullet`. **This skill covers both; there is no separate bullet skill.** Do not pass a variant or state that is not listed here.

| Component         | Axis               | Options                                         |
| ----------------- | ------------------ | ----------------------------------------------- |
| `timeline`        | `selection-states` | `active`, `inactive`                            |
| `timeline-bullet` | `types`            | `default`, `icon`, `icon-alternative`, `avatar` |

**An item is three parts: a title, a description, and a timestamp**, each with its own type token (`title-text`, `description-text`, `timestamp-text`). **The timestamp is part of the component**, which means `recursica-skill-dates-and-currency` governs how it reads — that is not optional formatting.

**`active` and `inactive` are selection states, not statuses.** There is no completed, current, upcoming, or error state on a timeline item. Do not repurpose `active` to mean "done".

**There is no connector token on the timeline.** A connecting line with a highlighted state for completed events is documented outside the token inventory; the kit defines no such property here. Do not encode progress into the line.

**There is no alignment axis, no orientation axis, and no size axis.** Left and right alignment are documented outside the token inventory; the kit defines neither, and nothing supports two opposing tracks or a comparative side-by-side timeline. `max-text-width` is a fixed property.

**`icon-alternative` also goes by "theme icon"** in material documented outside the token inventory. One thing, two names — and no rule distinguishes when each is used.

## Rules for using it

**Order the items chronologically and hold one direction throughout.** Mixed or unstated ordering makes the component lie about the thing it exists to show.

**Group events that happened close together into one item** rather than emitting three near-identical entries a second apart. The timeline's value is legibility of sequence, not completeness of the log.

**Format every timestamp by `recursica-skill-dates-and-currency`:**

- **Relative time for recent events** — `15 minutes ago`, `yesterday` — because making the reader subtract from now is work the format should absorb.
- **Above the switchover threshold, the absolute date** — `Jan 7, 2026`. **Never the numeric slash or hyphen form**, which exists only inside a focused input.
- **State the time zone whenever the time is not in the user's own**, or the user's zone is unknown.
- **Where the location of an event matters, show the time in the zone it occurred, labeled, and do not convert it** — and offer a way to convert.
- **Hold one format across the whole timeline.** Not relative on some items and absolute on others within the same threshold.

**The title names the event; the description is the body.** Do not concatenate the timestamp into the title — it has its own slot and its own type token.

**The bullet is decoration.** An avatar or an icon bullet may reinforce who or what an entry is about, but the title and description must say it. `recursica-skill-system-conventions` forbids carrying meaning in one channel, and a bullet is the weakest channel in the component. For an avatar bullet's own requirements see `recursica-skill-avatar`.

**Use one bullet type consistently within a timeline**, or vary it only where the variation itself is stated in the text. A mix of icon types the reader has to decode is a legend with no key.

**Do not wrap the timeline in a card**, and do not put a form or a form control inside a timeline item. See `recursica-skill-card`.

**A timeline is not an edit surface.** If entries are being created or modified here, that is a form, on its own terms.

## Accessibility

A timeline is a list of events, and almost everything that makes it readable is visual: a vertical line implying sequence, a bullet implying a type, a color implying selection, and a relative timestamp whose real value is nowhere. **All four have to be replaced with something programmatic.**

### Screen readers

- **Announce the events as a list, with its length.** A run of unstructured text gives the user no sense of how many events there are or which one they are in.
- **Each item's title, description, and timestamp must be associated as one item.** Three sibling lines with no grouping read as nine unrelated strings across three events, and the reader cannot tell which time belongs to which title.
- **Each item leads with its title**, at a consistent heading level if headings are used, so the user can move event to event instead of reading everything.
- **Reading order must match visual order**, and the sequence must come from the list order — **the connecting line conveys nothing programmatically.**
- **State the sort direction in text** above the timeline. "Newest first" is not inferable from a list read aloud.
- **A relative timestamp must have its absolute value available too.** "2 hours ago" is useless to someone reconstructing a sequence later; expose the full, disambiguated date and time in the accessible output alongside it.
- **The bullet is decorative and must be silent.** An icon bullet is announced as nothing; an avatar bullet either carries alternative text naming the person or is marked decorative with the name in the item's own text. **Never let an avatar or icon be the only thing identifying who or what an entry is about.**
- **`active` must be programmatic** — a current or selected state on the item — **never color alone.**

### Keyboard and non-mouse navigation

- **A non-interactive item is not a tab stop.** No `tabindex`, no click handler on a static event.
- **If items are selectable, each is a real control** with an accessible name and a selected state, in the tab order in visual order.
- **If an item contains a link or a button, the item itself must not also be clickable.** Overlapping targets give the keyboard user an ambiguous activation — the same reasoning `recursica-skill-card` and `recursica-skill-tables` apply to clickable cards and rows.
- **The absolute date must not live only in a hover tooltip.** That is the most common failure here: a relative time with the real timestamp on hover is unreachable by keyboard and by touch.
- **Nothing else needed may be hover-only** either — not an entry's detail, not its actions.
- **Where a long timeline pages or loads more, that control is a real keyboard-reachable button**, and appending items must not move or destroy focus.
- **Never suppress the focus ring** on a selectable item or on any control inside one.

## Not your decision

Do not implement, override, or tune any of these — the components own them:

- `title-description-gap`, `description-timestamp-gap`, `bullet-content-gap`, `item-gap`.
- `max-text-width`.
- `title-text`, `description-text`, and `timestamp-text` type treatment.
- The bullet's size, shape, and treatment for each of `default`, `icon`, `icon-alternative`, and `avatar`.
- All color, including the `active` and `inactive` treatment.

## Load these too

- [`recursica-skill-dates-and-currency`](../../design-rules/recursica-skill-dates-and-currency/SKILL.md) — the disambiguated date format, relative versus absolute time and the switchover, time zones, and duration formatting for every timestamp in the component.
- [`recursica-skill-stepper`](../recursica-skill-stepper/SKILL.md) — the forward-looking process the user is walking through, as opposed to a record of what happened.
- [`recursica-skill-tables`](../../design-rules/recursica-skill-tables/SKILL.md) — the alternative whenever volume is high or the records need sorting, filtering, or comparison.
- [`recursica-skill-avatar`](../recursica-skill-avatar/SKILL.md) — what an avatar bullet needs in its own right.
- [`recursica-skill-system-conventions`](../../design-rules/recursica-skill-system-conventions/SKILL.md) — never carry meaning in a single channel, and fix the structure rather than rendering an unbounded history.
- [`recursica-skill-card`](../recursica-skill-card/SKILL.md) — why the timeline is not wrapped in a card and holds no form.

## Uncovered — ask, do not invent

- **Alignment.** Left and right alignment are documented outside the token inventory; the kit defines no alignment axis. Do not rely on this without asking.
- **The connecting line.** A connector with a highlighted state for completed events is documented outside the token inventory; the kit defines no connector property on the timeline, so whether progress may be shown at all is unresolved. Do not rely on this without asking.
- **Two-track or comparative timelines** — parallel streams compared side by side. Nothing in the kit supports it.
- **What `active` means in house terms** — the item the user selected, or the most recent event. Only the two selection states exist.
- **Whether a timeline item may be selectable, a link, or carry an action.** No interactive rule is stated.
- **Default sort direction** — newest first or oldest first.
- **When to group a long history, by what period, and at what count.**
- **The relative-to-absolute switchover threshold**, which `recursica-skill-dates-and-currency` names as a product decision.
- **Whether `icon-alternative` has a meaning distinct from `icon`**, or is only a different visual treatment.
- **The empty state of a timeline** — an object with no events yet.

## Pre-flight checklist

- [ ] The events are genuinely sequential and already happened; a current process went to a stepper.
- [ ] High volume, sortable, or comparable records went to a table; unordered content went to a list.
- [ ] A long history is grouped or paginated rather than rendered whole.
- [ ] Only `active`/`inactive` and the four bullet types were used; no completed, current, or error state was invented.
- [ ] No alignment, orientation, size, or connector property was passed — none exist.
- [ ] Items are in chronological order, in one stated direction, with near-simultaneous events grouped.
- [ ] Every timestamp uses the disambiguated format, with relative time for recent events and no numeric slash-or-hyphen dates.
- [ ] Time zones are stated where the value is not the user's own; events whose location matters are shown unconverted and labeled.
- [ ] One timestamp format across the whole timeline; the timestamp is in its own slot, not the title.
- [ ] The title and description carry who and what; no meaning rests on the bullet alone.
- [ ] Bullet type is used consistently, and no timeline is wrapped in a card or holds a form control.
- [ ] The events are announced as a list with its length, in visual order, with sort direction stated in text.
- [ ] Each item's title, description, and timestamp are programmatically associated as one item.
- [ ] Every relative timestamp has its absolute value in the accessible output, and not only in a hover tooltip.
- [ ] Bullets are silent or, for avatars, named — and the name also appears in the item's text.
- [ ] `active` is exposed programmatically, never by color alone.
- [ ] Static items are not tab stops; selectable items are real named controls and contain no competing click target.
- [ ] Any load-more control is keyboard reachable and does not disturb focus; the focus ring is intact.
- [ ] No component-owned gap, width, type treatment, bullet styling, or color was overridden.
- [ ] Nothing in the uncovered list was invented.
