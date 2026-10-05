---
name: recursica-skill-defaults
description: House rules for what a screen shows before the user touches the screen — which tab opens first, filters arriving unapplied, pre-filling an edit form, the 90 percent test for pre-selecting an option, never pre-selecting an option with consequences, and remembering the user's place. Use for any default or initial state. Not for which control a field gets — see recursica-skill-selection-controls.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Defaults and initial state

This skill holds the house rules for what a screen shows before the user touches the screen. The house rules are opinions, not neutral best practices. Treat each house rule as a constraint.

The house rules assume **complex enterprise web applications**. In an enterprise web application, the same people come back to the same screens every day. A default that nobody notices makes the same choice for those people every time.

## The three governing principles

1. **A default is a convenience, never an answer given for the user.** Where no one option is close to certain, the user makes the choice. Every rule in the section on pre-selected options follows from this principle.
2. **A default the user cannot see misrepresents the data.** A filter applied in advance is the classic example. The user takes a narrowed collection for the complete collection, and concludes that information is missing.
3. **Never make the user re-enter information the user has already provided.** Editing starts from the object's current values. A refresh, an error, or signing out must not lose any user's place or work.

## Defaults and fixed values

**A default is a starting value, and the user can always change the value.** The team was asked whether a default could be a value the user cannot change. The answer was that such a value would then not be a default.

**A value the user cannot change is not a default. The value is a fixed value**, and the value must be shown as a fixed value: a read-only field, or no control at all. Do not ship a control whose value cannot be changed. See `recursica-skill-read-only-field`.

**The user does not get to change the system default itself.** The system default is the application's setting. The user changes the user's own value, for this one time. Do not build an affordance (a visible cue that a control can be used, such as the underline on a link) for changing the application's defaults, unless someone has asked for that affordance.

## Default tab

**The first tab in reading order, the leftmost tab, opens by default.**

**Reading direction is the only reason for the default tab.** People who read left to right start at the left. The eye is already on the leftmost tab.

**Locale is the only exception.** In a locale that reads right to left, the first tab in right-to-left reading order opens by default instead. No other reason changes the default tab: not importance, not how often users open a tab, and not which tab a stakeholder considers the highlight.

**Restoring a tab is separate from the default tab.** The default-tab rule covers which tab opens _first_. Returning a user to the tab the user was on is a result of routing, not of remembered state. See `recursica-skill-navigation`.

**Collapsible navigation groups start collapsed**, except the group that contains the user's current page. See also `recursica-skill-navigation`.

## Default filters

**Avoid applying a filter in advance.** The cost is specific and serious. The user may not notice that a filter is on, and conclude that data is missing. The user looks at part of a collection and believes the part is the complete collection.

**Filters are additive.** The user starts from the full collection and adds filters to narrow the collection.

**The only exception is a filter option so obviously right that the option must be the default view, and that the user would probably never remove.**

**Even for that filter option, do not filter the data itself. Set a default filter instead.** A default filter and a default on the data differ:

- **A default filter** is a filter control that arrives in a non-neutral state. The default filter is visible as a filter, and the user can remove the default filter like any other filter.
- **A default on the data** narrows the collection quietly, and nothing on the screen says so. NEVER set a default on the data.

A default filter is what `recursica-skill-filters` means by "a default that filters must be visible as a filter." `recursica-skill-filters` left open which defaults are appropriate. The defaults skill answers that question.

## Pre-filled forms

**A form that edits an existing object arrives filled in with the object's current values. The rule never stops applying.**

**Editing starts from the object as the object is now.** Starting again from empty fields is not editing.

**Fill in the fields the form edits**, not every field the object has.

**Pre-filling a form that creates a new object is a separate question.** `recursica-skill-forms` decides the question by the risk of the user misunderstanding. Pre-fill only values the user does not have to think about, look up, or check.

## Pre-selected options

A value must pass two tests before the value is pre-selected.

**Test 1: the 90 percent test.** Pre-select an option only where the chance of users choosing that one option is about 90 percent or higher. The choice has to be easy or common, with a usual answer. Below about 90 percent, leave that option unselected. The user makes the choice. The team was asked where the 90 percent threshold stops applying. The answer was that the threshold does not stop applying.

**Test 2: the later-consequences veto.** NEVER pre-select an option that has major effects later in the workflow, however likely the option is. A default is a decision the user may not notice making. A decision with later consequences is not a decision to make quietly for the user.

**A pre-selected radio button is the riskiest default in the system**, and the default to be most careful about. A pre-selected radio button can fail in three ways, each without any notice:

1. **The user does not know how to deselect the radio button.** A radio button is hard to clear.
2. **The user does not realize a different choice was available.**
3. **The choice has later consequences** that the user never chose on purpose.

`recursica-skill-selection-controls` covers pre-selection from the side of each control, including the rule that a checkbox group may be pre-checked freely.

## Remembered state

**Prefer remembering over resetting.** The goal is that the user does not lose the user's place or the user's data.

**The failure to avoid is a long form losing every entry.** An error, a refresh, or signing out halfway through a form erases the data the user entered. Design against that loss. `recursica-skill-forms` states how: where the technology can save drafts automatically, always save drafts.

**Beyond that failure, whether to remember or reset depends on the screen and the user's task.** No single rule decides. Resetting is the right outcome for some screens.

**Tab and layout state is not remembered state.** A tab that is a route is restored by its URL and the back button. Do not store it as a UI preference — see `recursica-skill-navigation`.

**Nobody has decided which remembered state should last across sessions.** Ask. See the open questions below.

## No safe default

**When no default is obviously safe, a stakeholder sets the default, as part of defining the user flow.** Neither the agent nor the designer decides the default. Raise the question. See `recursica-skill-design-router`.

## Defaults that suit most users

**Whether a default that suits most users is worth inconveniencing the other users is not a yes-or-no question.** A majority being the majority does not settle the question.

**What matters is how large the inconvenience is for the minority.**

**No rule exists for measuring the inconvenience.** The team said so outright. An agent therefore never settles the question by the agent's own judgment. Where a default has a real cost for a minority of users, point out the trade-off and let a person decide.

## Set by the theme or the component

- **Which default applies where no safe default exists.** A stakeholder decides, as part of the user flow.
- **Whether a default that serves the majority is worth the cost to the minority.** No way exists to measure the cost. Escalate the question.
- **The default sort order and rows per page on a table.** `recursica-skill-tables` settles both.
- **Whether saving drafts automatically is technically possible.** Where saving drafts automatically is possible, the app saves drafts automatically.

## Out of scope

- **Which control a field gets, and whether a checkbox may be pre-checked** — `recursica-skill-selection-controls`.
- **Form layout, when validation happens, how saving works, and pre-filling based on the risk of misunderstanding** — `recursica-skill-forms`.
- **The neutral-state convention across a filter bar, and how applied filters are shown** — `recursica-skill-filters`.
- **Routing, history, and restoring tabs** — `recursica-skill-navigation`.
- **The default sort, the default set of columns, and rows per page** — `recursica-skill-tables`.
- **What an empty screen shows when there is no data.** No skill in the Recursica family owns the empty screen yet.

## Open questions

- **Which remembered states should last across sessions, and which should not.** The team was asked directly and answered "I don't know." Do not decide by guessing.
- **How to weigh a minority's inconvenience against a majority's benefit.** The team stated that no rule exists. Escalate every case.
- **Anti-patterns specific to initial state.** The team was asked directly and named no anti-pattern beyond the pre-selected radio button. Therefore, do not assume that a common anti-pattern is forbidden here.
- **Defaults on surfaces not named here:** which accordion section is open, which date range a dashboard selects, and which value a stepper starts on.
- **Whether a default may differ per user, be learned, or depend on the user's role**, instead of being one system value.
- **The house set of relative date ranges, and which range is the default.** `recursica-skill-filters` records the question as open.

## Pre-flight checklist

- [ ] The user can change every default on the screen. A value that cannot change is shown as a fixed value, not as a control.
- [ ] The first tab in reading order opens first.
- [ ] No collection arrives quietly narrowed. Every filter in effect when the screen loads is visible in the filter's own control, and the user can remove the filter.
- [ ] No filter is built into the data as a default.
- [ ] A form that edits an existing object arrives filled in with the object's values.
- [ ] No option is pre-selected unless the option has about a 90 percent chance of being chosen.
- [ ] No option with later consequences in the workflow is pre-selected, however likely the option is.
- [ ] Each pre-selected radio button was checked against all three ways a pre-selected radio button can fail, after leaving the radio group unselected was ruled out.
- [ ] The screen keeps the user's place and the data the user entered after an error, a refresh, or signing out.
- [ ] No tab or layout state is stored as a remembered preference in place of a route.
- [ ] Where no safe default exists, a stakeholder made the choice.
- [ ] Where a default has a cost for a minority of users, the trade-off went to a person to decide.
- [ ] Open questions were asked about, not decided: which remembered states last across sessions, weighing a minority's inconvenience against a majority's benefit, anti-patterns specific to initial state, defaults on surfaces not named here, defaults that vary by user or role or are learned, and the house set of relative date ranges.
