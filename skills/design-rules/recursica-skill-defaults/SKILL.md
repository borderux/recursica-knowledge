---
name: recursica-skill-defaults
description: House rules for what a screen shows before the persona touches the screen — which tab opens first, filters arriving unapplied, pre-filling an edit form, the 90 percent test for pre-selecting an option, never pre-selecting an option with consequences, and remembering the persona's place. Use for any default or initial state. Not for which control a field gets — see recursica-skill-selection-controls.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Defaults and initial state

This skill holds the house rules for what a screen shows before the persona touches the screen. The house rules are opinions, not neutral best practices. Treat each house rule as a constraint.

The house rules assume **complex enterprise web applications**. In an enterprise web application, the same people come back to the same screens every day. A default that nobody notices makes the same choice for those people every time.

## The three governing principles

1. **A default is a convenience for the persona, and never answers a question for the persona.** Where no one option is close to certain, the persona makes the choice. Every rule under "Pre-selected options" follows from this principle.
2. **A default the persona cannot see misrepresents the data.** A filter applied before the persona acts is the classic example. The persona takes a narrowed collection for the complete collection, and concludes that information is missing.
3. **Never make the persona re-enter information the persona has already provided.** Editing starts from the object's current values. A refresh, an error, or signing out must not lose any persona's place or work.

## Defaults and fixed values

**A default is a starting value, and the persona can always change the value.** The team was asked whether a default could be a value the persona cannot change. The team answered that such a value would then not be a default.

**A value the persona cannot change is a fixed value, not a default.** A fixed value must be shown as a fixed value: a read-only field, or no control at all. Do not ship a control whose value cannot be changed. See `recursica-skill-read-only-field`.

**The persona does not get to change the system default.** The system default is the value the application sets. The persona changes the persona's own value, for this one time. Do not build an affordance (a visible cue that a control can be used, such as the underline on a link) for changing the application's defaults, unless someone has asked for that affordance.

## Default tab

**The first tab in reading order, the leftmost tab, opens by default.**

**Reading direction is the only reason for the default tab.** People who read left to right look at the leftmost tab first.

**Locale is the only exception.** In a locale that reads right to left, the first tab in right-to-left reading order opens by default instead. No other reason changes the default tab: not importance, not how often personas open a tab, and not which tab a stakeholder considers the highlight.

**Returning the persona to the persona's last tab is a separate question from the default tab.** The default-tab rule covers which tab opens _first_. Returning the persona to the last tab is a result of routing, not of remembered state. See `recursica-skill-navigation`.

**Collapsible navigation groups start collapsed**, except the group that contains the persona's current page. See also `recursica-skill-navigation`.

## Default filters

**Avoid applying a filter before the persona acts.** The cost is serious. The persona may not notice that the filter is on. The persona then takes part of a collection for the complete collection, and concludes that data is missing.

**Filters are additive.** The persona starts from the full collection and adds filters to narrow the collection.

**The only exception is a filter option so obviously right that the option must be the default view, and that the persona would probably never remove.**

**Even for that filter option, do not filter the data itself. Set a default filter instead.** A default filter and a default on the data differ:

- **A default filter** is a filter control that arrives in a non-neutral state. The default filter is visible as a filter, and the persona can remove the default filter like any other filter.
- **A default on the data** narrows the collection quietly, and nothing on the screen says so. NEVER set a default on the data.

A default filter is what `recursica-skill-filters` means by "a default that filters must be visible as a filter." `recursica-skill-filters` leaves open which defaults are appropriate. The defaults skill sets which defaults are appropriate.

## Pre-filled forms

**A form that edits an existing object always arrives filled in with the object's current values. The rule has no exceptions.**

**Editing starts from the object as the object is now.** Starting again from empty fields is not editing.

**Fill in the fields the form edits**, not every field the object has.

**Pre-filling a form that creates a new object is a separate question.** `recursica-skill-forms` decides that question by the risk of the persona misunderstanding. Pre-fill only values the persona does not have to think about, look up, or check.

## Pre-selected options

A value must pass two tests before the value is pre-selected.

**Test 1: the 90 percent test.** Pre-select an option only where about 90 percent or more of personas would choose that one option. The choice has to be easy or common, and have a usual answer. Below about 90 percent, leave the option unselected, and let the persona make the choice. The team was asked where the 90 percent threshold stops applying. The team answered that the threshold does not stop applying.

**Test 2: the later-consequences veto.** NEVER pre-select an option that has major effects later in the workflow, however likely the option is. A default is a decision the persona may not notice making. A decision with later consequences is not a decision to make quietly for the persona.

**A pre-selected radio button is the riskiest default in the system, and the default to be most careful about.** A pre-selected radio button can fail in three ways, and the persona notices none of the three:

1. **The persona does not know how to clear the radio button.** A radio button is hard to clear.
2. **The persona does not realize a different option was available.**
3. **The choice has later consequences** that the persona never chose on purpose.

`recursica-skill-selection-controls` gives the pre-selection rules for each control. One of those rules is that a checkbox group may be pre-checked freely.

## Remembered state

**Prefer remembering over resetting.** The goal is that the persona does not lose the persona's place or the persona's data.

**The failure to avoid is a long form that loses every entry.** An error, a refresh, or signing out halfway through the form erases the data the persona entered. Design against that loss. `recursica-skill-forms` states how. Where saving drafts automatically is technically possible, always save drafts.

**Apart from a long form's entries, whether to remember or reset a screen's state depends on the screen and the persona's task.** No single rule decides. Resetting is the right outcome for some screens.

**Tab and layout state is not remembered state.** A tab that is a route (a tab with its own URL) comes back through that URL and the back button. Do not store tab state or layout state as a UI preference. See `recursica-skill-navigation`.

**Nobody has decided which remembered state should last across sessions.** Ask. See "Open questions" below.

## No safe default

**When no default is obviously safe, a stakeholder sets the default, as part of defining the user flow.** Neither the agent nor the designer decides the default. Raise the question. See `recursica-skill-design-router`.

## Defaults that suit most personas

**Whether a default that suits most personas is worth inconveniencing the other personas is not a yes-or-no question.** The fact that most personas benefit does not settle the question.

**What matters is how large the inconvenience is for the minority of personas.**

**No rule exists for measuring the inconvenience.** The team said so outright. An agent therefore never settles the question by the agent's own judgment. Where a default has a real cost for a minority of personas, point out the trade-off and let a person decide.

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
- **Anti-patterns specific to initial state.** The team was asked directly and named no anti-pattern beyond the pre-selected radio button. Therefore, do not assume that the house rules forbid a common anti-pattern.
- **Defaults on any region of the screen that holds content and that this skill does not name, such as a page, panel or modal:** which accordion section is open, which date range a dashboard selects, and which value a stepper starts on.
- **Whether a default may differ per persona, be learned, or depend on the persona's role**, instead of being one system value.
- **The house set of relative date ranges, and which range is the default.** `recursica-skill-filters` records the question as open.

## Pre-flight checklist

- [ ] The persona can change every default on the screen. A value that cannot change is shown as a fixed value, not as a control.
- [ ] The first tab in reading order opens first.
- [ ] No collection arrives quietly narrowed. Every filter in effect when the screen loads is visible in the filter's own control, and the persona can remove the filter.
- [ ] No filter is built into the data as a default.
- [ ] A form that edits an existing object arrives filled in with the object's values.
- [ ] No option is pre-selected unless the option has about a 90 percent chance of being chosen.
- [ ] No option with later consequences in the workflow is pre-selected, however likely the option is.
- [ ] Each pre-selected radio button was checked against all three ways a pre-selected radio button can fail, after leaving the radio group unselected was ruled out.
- [ ] The screen keeps the persona's place and the data the persona entered after an error, a refresh, or signing out.
- [ ] No tab or layout state is stored as a remembered preference in place of a route.
- [ ] Where no safe default exists, a stakeholder made the choice.
- [ ] Where a default has a cost for a minority of personas, the trade-off went to a person to decide.
- [ ] Open questions were asked about, not decided: which remembered states last across sessions, weighing a minority's inconvenience against a majority's benefit, anti-patterns specific to initial state, defaults on regions of the screen that hold content and that this skill does not name, defaults that vary by persona or role or are learned, and the house set of relative date ranges.
