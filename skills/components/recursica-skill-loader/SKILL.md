---
name: recursica-skill-loader
description: How to use the Recursica loader correctly — when a wait warrants a spinner and when it does not, the three sizes and the indicator color, the fact that the kit provides an indeterminate spinner and nothing else, the text that must accompany it, and the screen-reader and keyboard requirements for announcing that loading started and that content arrived. Use whenever adding, reviewing, or refactoring a loading state, a pending region, an in-flight submit, or a data fetch. Trigger on "loader", "spinner", "loading", "activity indicator", "pending", "busy", "in flight", "skeleton", "progress", "screen reader", "live region", "reduced motion", or a request to show that something is happening. Do NOT use for a determinate progress bar or a percentage — no such variant exists. Do NOT use for stating an outcome once the wait is over — that is recursica-skill-toast. Do NOT use for a screen with no data — that is recursica-skill-dashboards.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Loader

A loader says that something is in flight. It cannot say how much, or how long.

## Use it when

- **A wait is real and its length is unknown** — a fetch, a submit, a recalculation.
- **A region of an otherwise-loaded page is lagging.** This is where a spinner genuinely earns its place: deliver the fast content, let the stragglers spin, rather than holding the whole page. Dashboard widgets loading at different speeds are the common case.
- **The wait is long enough to notice.** `recursica-skill-feedback-messaging` sets the threshold: show a loading indication when the operation will take more than roughly **3 seconds**. Below that a spinner flashes and reads as a glitch.
- **One region is loading**, and the loader can be scoped to that region — a card, a panel, a modal — rather than the whole screen.

## Do not use it when

| Instead of a loader                           | Use                                                                                                               |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| The work has a known quantity or percentage   | Nothing. No determinate variant and no progress component exist in this system — raise it, see the uncovered list |
| The operation finishes in well under a second | No indicator at all. A flash is more distracting than the wait                                                    |
| The wait is over and the result needs stating | Text where the result belongs, or `recursica-skill-toast` for a global one                                        |
| There is no data and there never was          | A populated empty state — and never on a dashboard, see `recursica-skill-dashboards`                              |
| You want the page's shape drawn in grey first | **Nothing. Skeletons and ghost text are forbidden outright** — see below                                          |
| The operation failed                          | An error message. Stop the spinner and say what happened                                                          |

**A loader is not an empty state and not an error state.** A spinner that keeps turning after a failed request tells the user the system is still trying. It is not.

## What exists

Taken from `recursica_ui-kit.json` → `ui-kit.components.loader`. **Do not pass a variant, type, or state that is not listed here.**

| Axis    | Options                     |
| ------- | --------------------------- |
| `sizes` | `small`, `default`, `large` |

**The kit gives you an indeterminate spinner and nothing else. This is the most important fact about this component.** The only property is `indicator-color`.

**There is no determinate variant, no percentage, and no filling track.** A loader therefore cannot communicate how far along the work is, and you must not pretend otherwise — no "45%", no estimated time remaining. **A known-duration wait has no alternative component in this system either**, so do not send the reader to one: a spinner cannot communicate duration, and nothing here can. Raise it as a gap; see the uncovered list.

**There is no label or text slot.** Any wording that accompanies the spinner is a separate element you place yourself.

**There is no skeleton, no shimmer, no progress bar, and no type axis — and skeletons are not merely absent, they are prohibited.** Grey bars standing in for text are a spinner in another costume: they add cognitive work to decode and return nothing. `recursica-skill-screen-scaffolding` settles it — **a loading page shows nothing until it shows content.**

**Three loader types are documented outside the token inventory, with no tokens behind them** — Oval, Bars, and Dots — along with sizes named xs, sm, and md against the kit's `small`, `default`, `large`. **Do not assume they are available.** A track representing total progress and an indicator showing percentage of completion are documented there too; no determinate variant exists to support either. See the uncovered list.

## Rules for using it

**Always pair the loader with text saying what is happening.** Since the component has no label slot, place the text beside or beneath it: "Loading invoices", not "Loading". The text is what carries the meaning; the spinner only carries that a wait is underway.

**Scope the loader to the region that is actually loading.** A card's fetch does not justify covering the screen. A screen-wide loader is for a screen-wide wait.

**Do not show a loader for a wait under roughly 3 seconds.** Delay it, or omit it. A spinner that appears and vanishes is noise, and it makes a fast operation feel slower than it was. The threshold is owned by `recursica-skill-feedback-messaging`; an earlier 300ms figure in this skill was not a recorded house rule and has been corrected.

**Never let the spinning motion be the only signal.** `recursica-skill-system-conventions` prohibits meaning in a single channel, and animation is the single most fragile channel there is — it is invisible to a screen reader, absent under reduced motion, and gone in a screenshot. The accompanying text is the second channel.

**Honor the operating system's reduced-motion preference.** Where motion is reduced or removed, the text and the announcement must still communicate the wait on their own.

**Reserve the space the content will occupy.** A loader smaller than the content it stands in for makes the layout jump when the content arrives, which throws away the user's reading position.

**One loader per loading region.** Do not nest or stack them, and do not run a region loader inside a page loader.

**Do not leave a control operable behind a loader.** If a submit is in flight, the control that started it must not accept a second activation.

**Do not use a spinner to imply the data is live.** Where a dashboard's components refresh on different intervals, `recursica-skill-dashboards` requires the currency of the data to be stated per component in text.

## Accessibility

A spinner is pure animation, which means that to a screen reader user it is nothing at all unless you announce it. The characteristic failure is not an unreachable control — it is a wait that begins and ends in complete silence, leaving the user with no idea that anything happened.

### Screen readers

- **Announce that loading has started, and announce that the content has arrived.** Both halves are required, and the second is the one that gets skipped. A spinner that appears and vanishes silently leaves the user unaware there was ever a wait or a result.
- **Say what is loading and what arrived.** "Loading invoices", then "24 invoices loaded". Not "Loading", and not "Loader".
- **The announcement must be polite, never assertive.** A wait starting or finishing is not a condition the user must know immediately, so it must not interrupt what they are reading or typing. See `recursica-skill-live-regions`.
- **The announcing region must already exist in the page before the loader appears.** A live region inserted at the same moment as its message is frequently never announced at all.
- **Never announce progress you do not have.** With no determinate variant there is no percentage, no step count, and no time estimate to report. Do not fabricate one.
- **The spinning motion communicates nothing to assistive technology.** It is a single visual channel, and `recursica-skill-system-conventions` requires a second — the text and the announcement.
- **Do not narrate every poll, retry, or refresh.** A region that reloads on an interval must not announce each cycle; announce meaningful change only.
- **If the load fails, say so in the announcement.** A spinner that simply disappears reads as success.

### Keyboard and non-mouse navigation

- **Never put focus on a loader.** It is not a control. No tabindex, no click handler, and no focus call — a focused element that then disappears strands the user.
- **Never leave focus on a control that has disappeared behind the loader.** When the control the user activated is removed or covered, focus falls to the body and the user loses their place entirely. Move focus deliberately to a stable element first.
- **When a region is replaced, keep the user's place.** If focus was inside the region, put it on the region's heading or its first interactive element once the content arrives — never at the top of the document.
- **Do not trap the keyboard behind a loader.** Content that is covered or not yet present must not remain as a set of silent, invisible tab stops behind the spinner.
- **Nothing needed may be revealed on hover** — least of all the text explaining what is loading, which must be persistently visible.
- **Never suppress the focus ring** on anything still interactive around the loader.

## Not your decision

Do not implement, override, or tune any of these — the component owns them for every size:

- `indicator-color`.
- Diameter, stroke weight, and every dimension per size.
- The animation itself — its speed, easing, and direction.

## Load these too

- [`recursica-skill-system-conventions`](../../design-rules/recursica-skill-system-conventions/SKILL.md) — never carry meaning in a single channel, and one behavioral mode per system.
- [`recursica-skill-dashboards`](../../design-rules/recursica-skill-dashboards/SKILL.md) — disclosing how current the data is, per component where intervals differ, and the prohibition on shipping an empty dashboard.
- [`recursica-skill-tables`](../../design-rules/recursica-skill-tables/SKILL.md) — which lists loading and error states for a table as unowned, including partial failure.
- [`recursica-skill-buttons-links`](../../design-rules/recursica-skill-buttons-links/SKILL.md) — which lists pending state on non-submit actions as unowned; the button component has no loading state.
- [`recursica-skill-toast`](../recursica-skill-toast/SKILL.md) — stating an outcome once the wait is over.

## Uncovered — ask, do not invent

- **Progress indication.** There is no determinate variant, no percentage, and no track that fills — **and no separate progress component exists anywhere in this system.** A wait of known duration therefore has nothing to express it. This is a gap for the human to close, not a surface to assemble, and not a component to name as though it were available. If progress must be shown, ask — do not build one.
- **Whether the loader may carry a label.** No text slot exists, so the accompanying text is yours to place, and its position relative to the spinner is unset.
- **Three loader types are documented outside the token inventory, with no tokens behind them.** Oval, Bars, and Dots, plus sizes xs, sm, and md, against a kit that defines only `small`, `default`, `large` with `indicator-color`. A progress track is documented there as well. **Do not assume they are available**, and do not rely on this without asking.
- **When a page-level spinner is warranted rather than an empty page.** Roughly three seconds is the threshold, and a lagging region of an otherwise-loaded page is the clearest case — but the boundary between "a region" and "the page" is a judgment.
- **Loading and error states for a table**, including partial failure — listed as unowned in `recursica-skill-tables`.
- **Pending state on a non-submit action** — listed as unowned in `recursica-skill-buttons-links`.
- **Whether the loader itself is delayed.** 3 seconds is the threshold for whether a wait warrants a loader at all; whether the spinner is also held back for that long, or appears at once for an operation predicted to exceed it, is unstated.
- **Which size belongs on which surface**, and whether a screen-wide wait uses `large` or something else entirely.

## Pre-flight checklist

- [ ] The wait is real, of unknown length, and longer than roughly 3 seconds; nothing shorter shows a loader.
- [ ] The loader is scoped to the region that is loading, and there is only one of them.
- [ ] Text beside the loader says what is happening, naming the thing being loaded.
- [ ] No progress, percentage, or time estimate is claimed anywhere, and no non-existent progress component was named as the alternative for a known-duration wait.
- [ ] The spinning motion is not the only signal, and reduced-motion preferences are honored.
- [ ] Space is reserved so the layout does not jump when content arrives.
- [ ] Loading start and completion are both announced, politely, from a live region that already existed.
- [ ] A failure stops the spinner and is announced as a failure, not left as silence.
- [ ] Polling and retries do not narrate every cycle.
- [ ] Focus is never placed on the loader, and never left on a control that disappeared behind it.
- [ ] After a region is replaced, focus lands in the new content, not at the top of the document.
- [ ] Covered or absent content is not left as invisible tab stops.
- [ ] The explanatory text is not hover-only, and the focus ring is intact on surrounding controls.
- [ ] No size outside `small`, `default`, `large` was passed; no type, label, track, skeleton, or determinate variant was invented.
- [ ] No component-owned styling or animation was overridden.
- [ ] Nothing in the uncovered list was invented.
