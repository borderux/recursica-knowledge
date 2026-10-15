---
name: recursica-skill-screen-starting-state
description: House rules for what a screen shows when the screen first opens, before the persona acts — which tab is open, whether any filter is on, which form fields are filled in, which options are already selected, and what the screen remembers from the last visit. Use when deciding how a screen, form or filter bar first looks. Not for which control a field gets — see recursica-skill-selection-controls.
license: MIT
metadata:
  author: hi@borderux.com
  version: 1.0.0
---

# Screen starting state

Treat each house rule below as a constraint. The house rules set what a screen shows before the persona touches the screen. The house rules are the team's opinions, not neutral best practices.

The house rules assume **complex enterprise web applications**. In an enterprise web application, the same personas come back to the same screens every day. A default that nobody notices makes the same choice for those personas every time.

## The three governing principles

1. **A default saves the persona effort, and never answers a question for the persona.** When no single option is close to certain, the persona chooses. Every rule under "Pre-selected options" follows from this principle.
2. **A default the persona cannot see gives the persona a false picture of the data.** The classic example is a filter that is on before the persona acts. The persona takes part of a collection, such as a table or a list, for the full collection. The persona then concludes that information is missing.
3. **Never make the persona enter information the persona has already given.**
   - Editing starts from the object's current values, such as an order's current shipping address.
   - A refresh, an error or signing out must not lose any persona's place or work.

## Defaults and fixed values

**A default is a starting value, and the persona can always change the value.** The team was asked whether a default could be a value the persona cannot change. The team confirmed this definition.

**A value the persona cannot change is a fixed value, not a default.** A fixed value must be shown as a fixed value, in one of two ways:

- a read-only field
- no control at all

Do not ship a control, such as a menu, whose value cannot be changed. See `recursica-skill-read-only-field`.

**Do not build an affordance (a visible cue that a control can be used, such as the underline on a link) for changing the application's defaults, unless someone has asked for that affordance.** For example, do not add a "Make this my default" link next to a field.

- The application sets the default. The persona does not get to change the application's default.
- The persona changes the persona's own value, for this one time.

## Default tab

**Open the first tab in reading order by default.** In a language that reads left to right, open the leftmost tab. People who read left to right look at the leftmost tab first.

**Choose the default tab by reading direction alone.** For example, an order page has the tabs Details, Shipping and History. Open Details, even when personas open History most often.

**Locale is the only exception.** In a locale that reads right to left, open the rightmost tab instead. The rightmost tab is the first tab in right-to-left reading order. No other reason changes the default tab. The default tab does not change for:

- a tab's importance
- how often personas open a tab
- which tab the user considers the highlight

**Reopening the tab the persona last used is a separate question from the default tab.** The default-tab rule covers which tab opens _first_. Returning the persona to the last tab comes from routing, such as the tab's URL and the back button. Returning the persona to the last tab does not come from remembered state. See `recursica-skill-navigation`.

**Start each collapsible navigation group collapsed, except the group that holds the persona's current page.** For example, on the Orders page, expand only the navigation group that holds Orders. See also `recursica-skill-navigation`.

## Default filters

**Avoid turning on a filter before the persona acts.** Make filters additive. The persona starts from the full collection, such as every row of a table. The persona then adds filters to narrow the collection.

A filter that is on before the persona acts has a serious cost:

- The persona may not notice that the filter is on.
- The persona then takes part of the collection for the full collection.
- The persona concludes that data is missing.

**Only one exception is allowed.** A filter option may be on before the persona acts only when both conditions are true:

- The filter option is so obviously right that the option must be the default view.
- The persona would probably never remove the filter option.

For example, "Open orders only" may start on when open orders are obviously the right default view. The persona must also be unlikely to ever remove the filter.

**Even for that exception, set a default filter. Do not filter the data itself.**

- **A default filter** is a filter control that starts in a non-neutral state. A neutral state is the state of a filter that narrows nothing. For example, a default filter might set the Status filter to "Open" when the page loads. The default filter is visible as a filter. The persona can remove the default filter like any other filter.
- **A default on the data** narrows the collection quietly, and nothing on the screen shows the narrowing. NEVER set a default on the data.

`recursica-skill-filters` says "a default that filters must be visible as a filter." A default filter is what that rule means. `recursica-skill-filters` leaves open which defaults are appropriate. This skill sets which defaults are appropriate.

## Pre-filled forms

**Always open a form that edits an existing object filled in with the object's current values. The rule has no exceptions.** For example, an Edit order form shows the order's current shipping address.

**Editing starts from the object as the object is now.** A form that starts again from empty fields is not editing.

**Fill in the fields the form edits, not every field the object has.** For example, a Change address form fills in the current address, not the order's notes.

**Pre-filling a form that creates a new object is a separate question.** An example is a New order form. `recursica-skill-forms` decides that question by the risk that the persona misunderstands. Pre-fill only values the persona does not have to think about, look up or check.

## Pre-selected options

A value must pass two tests before the value is pre-selected.

**Test 1: the 90 percent test.** Pre-select an option only where about 90 percent or more of personas would choose that one option. For example, pre-select "Email" as the contact method only if about 9 in 10 personas choose email.

- The choice has to be easy or common, and have a usual answer.
- Below about 90 percent, leave the option unselected, and let the persona choose.
- The team was asked where the 90 percent threshold stops applying. The team answered that the threshold does not stop applying.

**Test 2: the later-consequences veto.** NEVER pre-select an option that has major effects later in the workflow, however likely the option is. For example, never pre-select a billing plan when the plan sets what the account pays later. The persona may not notice that a default made a choice. A decision with later consequences is not a decision to make quietly for the persona.

**Take the most care with a pre-selected radio button.** A pre-selected radio button is the riskiest default in an application. A pre-selected radio button can fail in three ways, and the persona notices none of the three:

1. **The persona does not know how to clear the radio button.** A radio button is hard to clear.
2. **The persona does not realize that a different option was available.**
3. **The choice has later consequences** that the persona never chose on purpose.

**Apply both tests to every option, including a checkbox.** `recursica-skill-selection-controls` applies the tests to each control.

## Remembered state

**Prefer remembering the persona's state over resetting the state.** Remembering keeps the persona from losing the persona's place or data.

**Avoid a long form that loses every entry.** An error, a refresh or signing out halfway through the form erases the persona's entries.

- Design the form so the persona's entries survive. `recursica-skill-forms` states how.
- Save drafts when losing the entered data would cost the persona real rework, as `recursica-skill-forms` says.

**For state other than a long form's entries, the screen and the persona's task decide whether to remember or reset.** No single rule decides. Resetting is the right outcome for some screens.

**Do not store tab state or layout state, such as which tab is open, as a UI preference.** Tab state and layout state are not remembered state. A tab can be a route (a tab with the tab's own URL). The tab's URL and the back button bring back a tab that is a route. See `recursica-skill-navigation`.

**Confirm with the user which remembered state should last across sessions.** For example, confirm whether a table's sort order stays after the persona signs out and back in. Nobody has decided the question. See "Open questions" below.

## No safe default

**If no default is obviously safe, confirm the default with the user as part of defining the user flow.** For example, a new account's alert setting must start on or off, and neither value may be obviously safe. The agent never decides the default alone. See `recursica-skill-design-router`.

## Defaults that suit most personas

**Where a default has a real cost for a minority of personas, point out the trade-off.** Let the user decide. The agent never settles the trade-off by the agent's own judgment, because no rule exists for measuring the inconvenience. The team said so outright.

The trade-off is not a yes-or-no question. The fact that most personas benefit does not settle the trade-off. What matters is how large the inconvenience is for the minority of personas.

## Set by the theme or the component

- **The default sort order and rows per page on a table.** `recursica-skill-tables` settles both.

## Out of scope

- **Which control a field gets, and whether a checkbox may be pre-checked** — `recursica-skill-selection-controls`.
- **Form layout, when validation happens, how saving works, and pre-filling based on the risk of misunderstanding** — `recursica-skill-forms`.
- **The neutral-state convention across a filter bar, and how applied filters are shown** — `recursica-skill-filters`.
- **Routing, history, and restoring tabs** — `recursica-skill-navigation`.
- **The default sort, the default set of columns, and rows per page** — `recursica-skill-tables`.
- **What an empty screen shows when there is no data.** No skill in the Recursica family owns the empty screen yet.

## Open questions

- **Which remembered states should last across sessions, and which should not.** The team was asked directly and answered "I don't know." Do not decide by guessing.
- **How to weigh a minority's inconvenience against a majority's benefit.** The team stated that no rule exists. Confirm every case with the user.
- **Anti-patterns specific to initial state, meaning what a screen shows before the persona acts.** The team was asked directly and named no anti-pattern beyond the pre-selected radio button. Do not assume that the house rules forbid a common anti-pattern.
- **Defaults on any region of the screen that holds content and that this skill does not name.** A page, a panel and a modal are such regions. The undecided defaults include:
  - which accordion section starts open
  - a stepper's starting value
- **Whether a default may differ per persona, be learned, or depend on the persona's role.** The other option is one application value for every persona.
- **The house set of relative date ranges, and which range is the default.** `recursica-skill-filters` records the question as open.

## Pre-flight checklist

- [ ] The persona can change every default on the screen. A value that cannot change is shown as a fixed value, not as a control.
- [ ] The first tab in reading order opens first.
- [ ] No collection, such as a table or a list, arrives quietly narrowed. Every filter in effect when the screen loads is visible in the filter's own control.
- [ ] The persona can remove every filter in effect when the screen loads.
- [ ] No filter is built into the data as a default.
- [ ] A form that edits an existing object opens filled in with the object's values.
- [ ] No option is pre-selected unless the option has about a 90 percent chance of being chosen.
- [ ] No option with later consequences in the workflow is pre-selected, however likely the option is.
- [ ] For each pre-selected radio button, leaving the radio group unselected was ruled out first.
- [ ] Each pre-selected radio button was then checked against all three ways a pre-selected radio button can fail.
- [ ] The screen keeps the persona's place and the data the persona entered after an error, a refresh, or signing out.
- [ ] No tab or layout state is stored as a remembered preference in place of a route.
- [ ] Where no safe default exists, the user made the choice.
- [ ] Where a default has a cost for a minority of personas, the trade-off went to the user to decide.
- [ ] Open questions were asked about, not decided: which remembered states last across sessions, weighing a minority's inconvenience against a majority's benefit, anti-patterns specific to initial state, defaults on regions of the screen that hold content and that this skill does not name, defaults that vary by persona or role or are learned, and the house set of relative date ranges.
