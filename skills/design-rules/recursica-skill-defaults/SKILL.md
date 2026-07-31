---
name: recursica-skill-defaults
description: House rules for defaults and initial state in enterprise web applications — that a default is a starting value the user can always move off, which tab opens first and why reading order decides it, why a filter should arrive unapplied and what to do when one obvious filter must be on, pre-populating a form that edits an existing object, the 90 percent likelihood test for pre-selecting an option, the veto on pre-selecting anything with downstream consequences, why a pre-selected radio is the costliest default, remembering the user's place and data rather than resetting, and who picks a default when no safe one exists. Use when deciding what a screen shows before the user touches it. Trigger on "default", "initial state", "pre-selected", "pre-filled", "pre-applied", "which tab opens", or "remember state". Do NOT use for which control a field gets — that is recursica-skill-selection-controls. Do NOT use for default sort order or rows per page — that is recursica-skill-tables.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Defaults and initial state

House rules for what a screen shows before the user has touched it. These are opinions, not neutral best practices — apply them as constraints.

Context these rules assume: **complex enterprise web applications** where the same people return to the same screens daily, and where a default that goes unnoticed is silently answering on their behalf every time.

## The three governing principles

1. **A default is a convenience, never an answer given on the user's behalf.** Where one option is not near-certain, the user makes the choice. Everything in the pre-selection section derives from this.
2. **A default the user cannot see is a lie about the data.** The pre-applied filter is the archetype: the user reads a narrowed collection as a complete one and concludes information is missing.
3. **Never make the user supply again what they have already given.** Editing starts from the object's current values, and a refresh, an error, or a sign-out must not cost someone their place or their work.

## What a default is

**A default is a starting value, and the user can always move off it.** Asked whether a default may be one the user cannot change, the answer was that this would make it not a default.

**A value the user cannot change is not a default — it is a fixed value**, and it must be presented as one: a read-only field, or not a control at all. Do not ship an interactive control whose value cannot actually be altered. See `recursica-skill-read-only-field`.

**What the user does not get to change is the system default itself.** The default is the system's setting; what the user changes is their own value on this occasion. Do not build an affordance for redefining the application's defaults unless it has been asked for.

## Which tab opens

**The first tab in reading order opens by default — the leftmost one.**

**The reason is reading direction, and it is the whole reason.** In a left-to-right society people start at the left, so the leftmost tab is where the eye already is.

**The one boundary is locale.** In a right-to-left locale, the first tab in that reading order is the default instead. Nothing else waives it — not importance, not frequency, not what a stakeholder considers the highlight.

**This is separate from restoring a tab.** Which tab opens _first_ is this rule; returning a user to the tab they were on is a routing outcome, not remembered state — see `recursica-skill-navigation`.

**Collapsible navigation groups start collapsed**, except the one containing the user's current page. Also `recursica-skill-navigation`.

## Filters arrive unapplied

**Avoid a pre-applied filter.** The cost is specific and severe: **the user may not realize a filter is applied and conclude the data is missing.** They are looking at a partial collection believing it is the whole one.

**Filters are additive.** The model is that the user adds narrowing, starting from everything.

**The narrow exception:** an option so obviously right that it must be the default view, and that the user would likely never remove.

**Even then, do not filter the data itself — set a default filter.** The distinction is the entire point:

- **A default filter** is a filter control arriving in a non-neutral state, visible as such, removable like any other.
- **A default on the data** silently narrows the collection with nothing on screen saying so. **NEVER do this.**

This is what `recursica-skill-filters` means by "a default that filters must be visible as a filter," and this skill is the answer to the question that skill left open about which defaults are appropriate.

## Pre-populating a form

**A form that edits an existing object arrives populated with that object's current values. This never stops applying.**

**The reason is that you are editing the object.** Starting over from empty fields is not editing.

**Populate the fields you want edited**, not every field the object happens to have.

**Pre-filling a form that creates something new is a different question**, gated on comprehension risk in `recursica-skill-forms` — pre-fill only values the user does not have to reason about, look up, or verify.

## Pre-selecting an option

Two gates, and a value must clear both.

**Gate 1 — the 90 percent test.** Pre-select only where **the likelihood of that one option being chosen is roughly 90 percent or higher**. It has to be easy or common, with a usual answer. Below that, **the user is made to choose**; leave it unselected. Asked where the threshold stops applying, the answer was that it does not.

**Gate 2 — the downstream veto.** **NEVER pre-select an option that carries major implications later in the workflow**, however likely it is. A default is a decision the user may not notice making, and a decision with consequences downstream is not one to make silently for them.

**A pre-selected radio is the costliest default in the system**, and it is the one worth being most careful about. Three failure modes, all of them quiet:

1. **The user does not know how to deselect it** — a radio is genuinely hard to clear.
2. **The user does not realize a different choice was available.**
3. **The choice carries downstream consequences** they never made deliberately.

`recursica-skill-selection-controls` carries this from the control's side, including the rule that checkbox groups may be pre-checked freely.

## Remembering state

**Prefer remembering over resetting.** The goal is that the user does not lose their place or their data.

**The named failure: a long form losing everything.** An error, a refresh, or a sign-out mid-form and the entered data is gone. That is the outcome to design against, and `recursica-skill-forms` states the mechanism — where the technology supports draft persistence, always persist.

**Beyond that, it depends on the screen and what the user is trying to do.** There is no blanket rule, and a screen where resetting is right is a legitimate outcome.

**Tab and layout state is not remembered state.** A tab that is a route is restored by its URL and the back button. Do not store it as UI preference — `recursica-skill-navigation`.

**Which remembered state should survive across sessions was explicitly not known.** Ask; see below.

## When there is no obviously safe default

**A stakeholder sets it, as part of defining the user flow.** This is not the agent's call and not the designer's call. Raise it — see `recursica-skill-design-router`.

## Serving the majority at the minority's expense

**Whether a default that suits most users justifies inconveniencing the rest is not a binary question**, and it is not answered by the majority being a majority.

**The factor is how much of an inconvenience it is to the minority.**

**There is no rule for measuring it.** Stated outright. So this is never resolved by an agent's own judgment: where a default meaningfully costs a minority of users, surface the trade-off and let the human decide.

## Not your decision

- **Which default applies where no safe one exists.** A stakeholder's, as part of the user flow.
- **Whether the majority-serving default is worth the minority's cost.** No measure exists; escalate.
- **Default sort order and rows per page on a table** — settled in `recursica-skill-tables`.
- **Whether draft persistence is technically available.** Where it is, it is used.

## Out of scope

- **Which control a field gets, and whether a checkbox may be pre-checked** — `recursica-skill-selection-controls`.
- **Form layout, validation timing, save mode, and comprehension-risk pre-fill** — `recursica-skill-forms`.
- **The neutral-state convention across a filter bar and how applied filters are shown** — `recursica-skill-filters`.
- **Routing, history, and tab restoration** — `recursica-skill-navigation`.
- **Default sort, default column set, and rows per page** — `recursica-skill-tables`.
- **What an empty screen shows when there is genuinely no data.** Still unowned across the family.

## Uncovered — ask, do not invent

- **Which remembered states should persist across sessions and which should not.** Asked directly; the answer was "I don't know." Do not decide it by inference.
- **How to weigh a minority's inconvenience against a majority's benefit.** Stated as having no rule. Escalate every instance.
- **Anti-patterns specific to initial state.** Asked directly and none were offered beyond the pre-selected radio, so do not assume a common one is prohibited here.
- **Defaults on surfaces not named** — which accordion section is open, which dashboard date range is selected, which value a stepper starts on.
- **Whether a default may be per-user, learned, or role-dependent** rather than a single system value.
- **The house set of relative date ranges and which is the default** — recorded as open in `recursica-skill-filters`.

## Pre-flight checklist

- [ ] Every default on the screen is one the user can move off; anything genuinely fixed is presented as a fixed value, not as a control.
- [ ] The first tab in reading order is the one that opens.
- [ ] No collection arrives silently narrowed. Any filtering in effect on load is visible in its own control and removable.
- [ ] No filter is baked into the data as a default.
- [ ] A form that edits an existing object arrives populated with that object's values.
- [ ] Nothing is pre-selected unless one option is roughly 90 percent likely to be chosen.
- [ ] Nothing with downstream workflow consequences is pre-selected, regardless of likelihood.
- [ ] Every pre-selected radio was checked against all three failure modes, and the alternative of leaving it unselected was considered first.
- [ ] The screen does not throw away the user's place or entered data on error, refresh, or sign-out.
- [ ] No tab or layout state is stored as a remembered preference in place of a route.
- [ ] Where no safe default existed, it was raised to a stakeholder rather than chosen.
- [ ] Where a default costs a minority of users, the trade-off was surfaced rather than judged.
- [ ] Nothing in the uncovered list was invented.
