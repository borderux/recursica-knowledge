---
name: recursica-skill-defaults
description: House rules for what a screen shows before the user touches it — which tab opens first, filters arriving unapplied, pre-filling an edit form, the 90 percent test for pre-selecting an option, never pre-selecting anything with consequences, and remembering the user's place. Use for any default or initial state. Not for which control a field gets — see recursica-skill-selection-controls.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Defaults and initial state

These are the house rules for what a screen shows before the user has touched it. They are opinions, not neutral best practices — treat them as constraints.

These rules assume **complex enterprise web applications**, where the same people come back to the same screens every day, and where a default nobody notices makes the same choice for them every time.

## The three governing principles

1. **A default is a convenience — never an answer given for the user.** Where one option is not close to certain, the user makes the choice. Everything in the pre-selection section follows from this.
2. **A default the user cannot see misrepresents the data.** A filter applied in advance is the classic example: the user reads a narrowed collection as the complete one, and concludes that information is missing.
3. **Never make the user re-enter information they have already provided.** Editing starts from the object's current values. A refresh, an error, or signing out must not cost anyone their place or their work.

## What a default is

**A default is a starting value, and the user can always move off it.** When asked whether a default could be one the user cannot change, the answer was that it would then not be a default.

**A value the user cannot change is not a default — it is a fixed value**, and it must be shown as one: a read-only field, or not a control at all. Do not ship a control whose value cannot be changed. See `recursica-skill-read-only-field`.

**What the user does not get to change is the system default itself.** The default is the system's setting; what the user changes is their own value, this one time. Do not build an affordance (a visible cue that a control can be used, such as the underline on a link) for changing the application's defaults, unless someone has asked for one.

## Which tab opens

**The first tab in reading order opens by default — the leftmost one.**

**Reading direction is the only reason.** In a culture that reads left to right, people start at the left, so the leftmost tab is where the eye already is.

**The only exception is locale**. In a locale that reads right to left, the first tab in that reading order is the default instead. Nothing else changes this — not importance, not how often a tab is used, and not which tab a stakeholder considers the highlight.

**This is separate from restoring a tab.** This rule covers which tab opens _first_. Returning a user to the tab they were on is a result of routing, not remembered state — see `recursica-skill-navigation`.

**Collapsible navigation groups start collapsed**, except the one that contains the user's current page. Also see `recursica-skill-navigation`.

## Filters arrive unapplied

**Avoid applying a filter in advance.** The cost is specific and serious: the user may not realize a filter is on, and conclude that the data is missing. They are looking at part of a collection while believing it is the complete collection.

**Filters are additive.** The user starts from the full collection and adds filters to narrow it.

**The only exception is an option so obviously right that it must be the default view, and that the user would probably never remove.**

**Even then, do not filter the data itself — set a default filter.** The two are different:

- **A default filter** is a filter control that arrives in a non-neutral state. It is visible as a filter, and the user can remove it like any other.
- **A default on the data** quietly narrows the collection, with nothing on screen saying so. NEVER do this.

This is what `recursica-skill-filters` means by "a default that filters must be visible as a filter." This skill answers the question that skill left open about which defaults are appropriate.

## Pre-populating a form

**A form that edits an existing object arrives filled in with that object's current values. This never stops applying.**

**Editing starts from the object as it is.** Starting again from empty fields is not editing.

**Fill in the fields the form edits**, not every field the object happens to have.

**Pre-filling a form that creates something new is a different question.** `recursica-skill-forms` decides it by the risk of the user misunderstanding: pre-fill only values the user does not have to think about, look up, or check.

## Pre-selecting an option

There are two tests, and a value must pass both.

**Test 1 — the 90 percent test.** Pre-select only where the chance of that one option being chosen is about 90 percent or higher. It has to be easy or common, with a usual answer. Below that, leave it unselected so the user makes the choice. When asked where this threshold stops applying, the answer was that it does not.

**Test 2 — the later-consequences veto.** NEVER pre-select an option that has major effects later in the workflow, no matter how likely it is. A default is a decision the user may not notice making. A decision with consequences later on is not one to make quietly for them.

**A pre-selected radio button is the riskiest default in the system**, and it is the one to be most careful about. It can fail in three ways, all without any notice:

1. **The user does not know how to deselect it** — a radio button is hard to clear.
2. **The user does not realize a different choice was available.**
3. **The choice has later consequences** that the user never chose on purpose.

`recursica-skill-selection-controls` covers this from the control's side, including the rule that checkbox groups may be pre-checked freely.

## Remembering state

**Prefer remembering over resetting.** The goal is that the user does not lose their place or their data.

**The failure to avoid: a long form losing everything.** An error, a refresh, or signing out halfway through a form erases the data the user entered. That is the outcome to design against, and `recursica-skill-forms` states how: where the technology can save drafts automatically, always save them.

**Beyond that, whether to remember or reset depends on the screen and the user's task.** There is no single rule. Resetting is the right outcome for some screens.

**Tab and layout state is not remembered state.** A tab that is a route is restored by its URL and the back button. Do not store it as a UI preference — see `recursica-skill-navigation`.

**Nobody has decided which remembered state should last across sessions.** Ask; see the open questions below.

## When there is no obviously safe default

**A stakeholder sets it, as part of defining the user flow.** Neither the agent nor the designer decides it. Raise it — see `recursica-skill-design-router`.

## Serving the majority at the minority's expense

**Whether a default that suits most users is worth inconveniencing the rest is not a yes-or-no question**, and the majority being the majority does not settle it.

**What matters is how much of an inconvenience it is for the minority.**

**There is no rule for measuring that.** This was said outright. So an agent never settles it by its own judgment: where a default has a real cost for a minority of users, point out the trade-off and let a person decide.

## Set by the theme or the component

- **Which default applies where no safe one exists.** A stakeholder decides this, as part of the user flow.
- **Whether a default that serves the majority is worth what it costs the minority.** There is no way to measure it, so escalate.
- **The default sort order and rows per page on a table** — settled in `recursica-skill-tables`.
- **Whether saving drafts automatically is technically possible.** Where it is, it is used.

## Out of scope

- **Which control a field gets, and whether a checkbox may be pre-checked** — `recursica-skill-selection-controls`.
- **Form layout, when validation happens, how saving works, and pre-filling based on the risk of misunderstanding** — `recursica-skill-forms`.
- **The neutral-state convention across a filter bar, and how applied filters are shown** — `recursica-skill-filters`.
- **Routing, history, and restoring tabs** — `recursica-skill-navigation`.
- **The default sort, the default set of columns, and rows per page** — `recursica-skill-tables`.
- **What an empty screen shows when there is no data.** No skill in the family owns this yet.

## Open questions: ask, do not decide

- **Which remembered states should last across sessions, and which should not.** This was asked directly, and the answer was "I don't know." Do not decide it by guessing.
- **How to weigh a minority's inconvenience against a majority's benefit.** Stated as having no rule. Escalate every case.
- **Anti-patterns specific to initial state.** This was asked directly, and none were given beyond the pre-selected radio button. So do not assume a common one is forbidden here.
- **Defaults on surfaces not named here** — which accordion section is open, which date range a dashboard selects, which value a stepper starts on.
- **Whether a default may differ per user, be learned, or depend on the user's role**, instead of being one system value.
- **The house set of relative date ranges, and which one is the default** — recorded as open in `recursica-skill-filters`.

## Pre-flight checklist

- [ ] The user can change every default on the screen. A value that cannot change is shown as a fixed value, not as a control.
- [ ] The first tab in reading order is the one that opens.
- [ ] No collection arrives quietly narrowed. Any filter in effect when the screen loads is visible in its own control, and can be removed.
- [ ] No filter is built into the data as a default.
- [ ] A form that edits an existing object arrives filled in with that object's values.
- [ ] Nothing is pre-selected unless one option has about a 90 percent chance of being chosen.
- [ ] Nothing with later consequences in the workflow is pre-selected, however likely it is.
- [ ] Each pre-selected radio button was checked against all three ways it can fail, after leaving it unselected was ruled out.
- [ ] The screen does not throw away the user's place or the data they entered after an error, a refresh, or signing out.
- [ ] No tab or layout state is stored as a remembered preference in place of a route.
- [ ] Where no safe default exists, a stakeholder made the choice.
- [ ] Where a default has a cost for a minority of users, the trade-off went to a person to decide.
- [ ] Open questions were asked about, not decided: which remembered states last across sessions, weighing a minority's inconvenience against a majority's benefit, anti-patterns specific to initial state, defaults on surfaces not named here, defaults that vary by user or role or are learned, and the house set of relative date ranges.
