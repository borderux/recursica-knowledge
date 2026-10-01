---
name: recursica-skill-loader
description: How to use the Recursica loader, the only loading indicator, a spinner — when a wait needs one, sizes, the text that must go with it, and announcing start and finish. Use for loading states, pending regions, and in-flight actions. There is no progress bar. Not for the outcome — see recursica-skill-toast.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Loader

A loader says that something is in flight — still in progress. It cannot say how much is done, or how long is left.

## Use it when

- **The wait is real, and its length is unknown** — a data fetch, a submit, a recalculation.
- **One region of an otherwise loaded page is lagging.** This is where a spinner really earns its place: show the fast content, and let the slow parts spin, instead of holding up the whole page. Dashboard widgets loading at different speeds are the common case.
- **The wait is long enough to notice.** `recursica-skill-feedback-messaging` sets the threshold: show a loading indicator when the operation will take more than about 3 seconds. Below that, a spinner flashes and looks like a glitch.
- **One region is loading**, and the loader can be limited to that region — a card, a panel, a modal — instead of covering the whole screen.

## Do not use it when

| Instead of a loader                            | Use                                                                                                                  |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| The work has a known amount or percentage      | Nothing. There is no determinate variant and no progress component in this system — raise it, see the uncovered list |
| The operation finishes in well under a second  | No indicator at all. A flash is more distracting than the wait                                                       |
| The wait is over, and the result needs stating | Text where the result belongs, or `recursica-skill-toast` for a global one                                           |
| There is no data, and there never was          | A filled-in empty state — and never on a dashboard, see `recursica-skill-dashboards`                                 |
| You want the page's shape drawn in gray first  | **Nothing. Skeletons and ghost text are forbidden outright** — see below                                             |
| The operation failed                           | An error message. Stop the spinner and say what happened                                                             |

**A loader is not an empty state, and not an error state.** A spinner that keeps turning after a request failed tells the user the system is still trying. It is not.

## What exists

Taken from the UI kit (the token file, `recursica_ui-kit.json`, that says which variants and states each component has) → `ui-kit.components.loader`. **Do not pass a variant, type, or state that is not listed here.**

| Axis    | Options                     |
| ------- | --------------------------- |
| `sizes` | `small`, `default`, `large` |

**The UI kit gives you an indeterminate spinner and nothing else. This is the most important fact about this component.** An indeterminate spinner shows that work is happening, but not how much of it is done. The only property is `indicator-color`.

**There is no determinate variant (one that shows how much is done), no percentage, and no track that fills up.** So a loader cannot show how far along the work is, and you must not pretend otherwise — no "45%", and no estimated time left. A wait of known length has no alternative component in this system either, so do not send the reader to one. A spinner cannot show how long something will take, and nothing here can. Raise it as a gap; see the uncovered list.

**There is no slot for a label or text.** Any words that go with the spinner are a separate element you place yourself.

**There is no skeleton, no shimmer, no progress bar, and no type axis (a property a component varies on, such as size or style; Figma calls it a variant property) — and skeletons are not just missing; they are forbidden.** Gray bars standing in where text will be are a spinner in another costume: they add mental work to decode and give nothing back. `recursica-skill-screen-scaffolding` settles it — a loading page shows nothing until it shows content.

**Three loader types have no tokens behind them, but both adapters do build them.** Oval, Bars, and Dots are missing from the UI kit — the UI kit defines only `indicator-color` and the three sizes — yet both adapters offer them as a real `variant` prop, and style each one. So they are available. They are just not backed by tokens, which means how they look comes from the adapter, not the UI kit, and it may differ between Mantine and MUI. `oval` is the default in both. Prefer the default unless you have a reason, and do not treat a type as a signal that means something.

**The sizes are `small`, `default`, and `large`.** Sizes named xs, sm, and md are shown only on the design-system website, and both adapters also accept `sm`, `md`, and `lg` as other names for the three kit sizes. Write the UI kit names — a nickname that works today is still not the vocabulary this system is specified in.

**A track showing total progress, and an indicator showing the percentage done**, are shown only on the design-system website too, but no determinate variant exists to support either one. See the uncovered list.

## Rules for using it

**Always pair the loader with text that says what is happening.** The component has no label slot, so place the text beside it or beneath it: "Loading invoices", not "Loading". The text is what carries the meaning; the spinner only shows that a wait is underway.

**Limit the loader to the region that is actually loading.** Fetching one card's data does not justify covering the screen. A loader across the whole screen is for a wait that affects the whole screen.

**Do not show a loader for a wait under about 3 seconds.** Delay it, or leave it out. A spinner that appears and disappears is noise, and it makes a fast operation feel slower than it was. The threshold is owned by `recursica-skill-feedback-messaging`. An earlier figure of 300ms in this skill was not a recorded house rule, and it has been corrected.

**Never let the spinning motion be the only signal.** `recursica-skill-system-conventions` forbids meaning in a single channel (color, shape, position or text, each a separate signal), and animation is the most fragile channel there is. A screen reader cannot see it, it disappears under reduced motion, and it is gone in a screenshot. The text beside it is the second channel.

**Respect the operating system's reduced-motion setting** (a setting that asks for less animation). Where motion is reduced or removed, the text and the announcement must still tell the user about the wait on their own.

**Keep the space the content will fill.** A loader smaller than the content it stands in for makes the layout jump when the content arrives, and throws away the user's place in their reading.

**One loader per loading region.** Do not nest or stack them, and do not run a loader for a region inside a loader for the page.

**Do not leave a control usable behind a loader.** If a submit is in flight, the control that started it must not accept a second click.

**Do not use a spinner to suggest that the data is live.** Where a dashboard's components refresh on different schedules, `recursica-skill-dashboards` requires how up to date the data is to be stated in text, for each component.

## Accessibility

This component also follows the accessibility baseline in `recursica-skill-system-conventions`, including the focus ring. Only what is specific to it is listed here.

A spinner is pure animation. That means that to a screen reader user, it is nothing at all unless you announce it. The typical failure is not a control that cannot be reached — it is a wait that starts and ends in complete silence, leaving the user with no idea that anything happened.

### Screen readers

- **Announce that loading has started, and announce that the content has arrived.** Both halves are required, and the second is the one that gets skipped. A spinner that appears and disappears silently leaves the user unaware that there was ever a wait, or a result.
- **Say what is loading, and what arrived.** "Loading invoices", then "24 invoices loaded". Not "Loading", and not "Loader".
- **The announcement must be polite, never assertive** — it waits for a pause instead of interrupting. A wait starting or finishing is not something the user must know right away, so it must not interrupt what they are reading or typing. See `recursica-skill-live-regions`.
- **The region that makes the announcement must already exist on the page before the loader appears.** A live region (an area a screen reader announces automatically when its content changes) added at the same moment as its message is often never announced at all.
- **Never announce progress you do not have.** With no determinate variant, there is no percentage, no step count, and no time estimate to report. Do not make one up.
- **The spinning motion tells assistive technology nothing.** It is a single visual channel, and `recursica-skill-system-conventions` requires a second one — the text and the announcement.
- **Do not narrate every check, retry, or refresh.** A region that reloads on a schedule must not announce each cycle. Announce only changes that matter.
- **If the load fails, say so in the announcement.** A spinner that simply disappears sounds like success.

### Keyboard and non-mouse navigation

- **Never put focus on a loader.** It is not a control. No tabindex, no click handler, and no focus call — an element that has focus and then disappears strands the user.
- **Never leave focus on a control that has disappeared behind the loader.** When the control the user activated is removed or covered, focus falls to the page body, and the user loses their place entirely. Move focus on purpose to an element that will stay put first.
- **When a region is replaced, keep the user's place.** If focus was inside the region, put it on the region's heading or its first interactive element once the content arrives — never at the top of the document.
- **Do not trap the keyboard behind a loader.** Content that is covered, or not there yet, must not stay behind the spinner as a set of silent, invisible tab stops.
- **Nothing needed may appear only on hover** — least of all the text explaining what is loading, which must stay visible.

## Decided elsewhere

Do not implement, override, or tune any of these — the component owns them for every size:

- `indicator-color`.
- Diameter, stroke weight, and every dimension per size.
- The animation itself — its speed, easing, and direction.

## Load these too

- `recursica-skill-system-conventions` — never carry meaning in a single channel, and one behavioral mode per system.
- `recursica-skill-dashboards` — disclosing how current the data is, per component where intervals differ, and the prohibition on shipping an empty dashboard.
- `recursica-skill-tables` — which lists loading and error states for a table as unowned, including partial failure.
- `recursica-skill-buttons-links` — which lists pending state on non-submit actions as unowned; the button component has no loading state.
- `recursica-skill-live-regions` — announcing that loading started and finished, and what the application must cover beyond the loader's own announcement.

### Only if the screen also uses it

- `recursica-skill-toast` — stating an outcome once the wait is over.

## Uncovered — ask, do not invent

- **Showing progress.** There is no determinate variant, no percentage, and no track that fills — and no separate progress component exists anywhere in this system. So a wait of known length has nothing to show it. This is a gap for a person to close — not a surface to put together, and not a component to name as if it were available. If progress must be shown, ask — do not build one.
- **Whether the loader may have a label.** There is no text slot, so the text beside it is yours to place, and where it goes relative to the spinner is not set.
- **Whether the three adapter loader types are approved.** Oval, Bars, and Dots exist as a `variant` prop in both adapters, with no tokens behind them, so nothing in the UI kit decides how they look or when each is used. A progress track is shown only on the design-system website as well, with no determinate variant to support it. Ask before relying on a type other than the default.
- **When a spinner for the whole page is called for, instead of an empty page.** About three seconds is the threshold, and a lagging region of an otherwise loaded page is the clearest case — but where "a region" ends and "the page" begins is a judgment call.
- **Loading and error states for a table**, including partial failure — listed as having no owner in `recursica-skill-tables`.
- **A pending state on an action other than submit** — listed as having no owner in `recursica-skill-buttons-links`.
- **Whether the loader itself is delayed.** 3 seconds is the threshold for whether a wait calls for a loader at all. Whether the spinner is also held back that long, or appears at once for an operation expected to take longer, is not stated.
- **Which size belongs on which surface**, and whether a wait across the whole screen uses `large` or something else entirely.

## Pre-flight checklist

- [ ] The wait is real, of unknown length, and longer than about 3 seconds. Nothing shorter shows a loader.
- [ ] The loader is limited to the region that is loading, and there is only one of them.
- [ ] Text beside the loader says what is happening, and names the thing being loaded.
- [ ] No progress, percentage, or time estimate is claimed anywhere, and you did not name a progress component that does not exist as the alternative for a wait of known length.
- [ ] The spinning motion is not the only signal, and reduced-motion settings are respected.
- [ ] Space is kept, so the layout does not jump when content arrives.
- [ ] The start and the end of loading are both announced, politely, from a live region that already existed.
- [ ] A failure stops the spinner and is announced as a failure, not left as silence.
- [ ] Checks and retries do not narrate every cycle.
- [ ] Focus is never put on the loader, and never left on a control that disappeared behind it.
- [ ] After a region is replaced, focus lands in the new content, not at the top of the document.
- [ ] Covered or missing content is not left as invisible tab stops.
- [ ] The explanatory text does not appear only on hover, and the focus ring is intact on the controls around it.
- [ ] You passed no size other than `small`, `default`, and `large`, and invented no type, label, track, skeleton, or determinate variant.
- [ ] You overrode no styling or animation that the component owns.
- [ ] You invented nothing from the uncovered list.
