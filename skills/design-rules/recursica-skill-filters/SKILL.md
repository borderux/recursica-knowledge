---
name: recursica-skill-filters
description: House rules for filtering a collection — filters understandable before use, noun labels, one convention for unfiltered, relative date ranges, multi-select filters, lone on/off toggles, and showing the applied state of the filters. Use for a filter bar, a search over a list, or a date range. Not for the table itself — see recursica-skill-tables.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Filters

A filter is a control that narrows down a collection, such as a table or a list, to fewer items. The filter rules are the team's house rules and opinions, not neutral best practices. Treat each rule as a constraint.

The rules assume **complex enterprise web applications, designed for desktop first**. In such an application, the same people filter the same collections every day. Filtering is not a form, because filtering saves nothing. The rules for filters differ from the form rules in `recursica-skill-forms`.

## The three governing principles

1. **A filter must be understandable before anyone uses the filter.** If a persona must try a control to learn what the control does, the control is not a filter. Trying a control means using the control and watching the table for the result. The persona using the control is left to guess. The filter's label and the column the label matches must show what the control filters, with no other help.
2. **Every filter uses one convention for "not filtering."** A filter bar is the group of filters for one collection. A neutral state is the state of a filter that narrows nothing. Every filter in a filter bar starts in the same kind of neutral state. When some filters say `All` and other filters are empty, the same unfiltered state looks like two different states.
3. **Filtering saves nothing.** A filter has no save mode, no unsaved-changes state and no confirmation. A filter changes which items are shown, and nothing else. See `recursica-skill-feedback-messaging`.

## Labels

**A filter's label is a noun that names the field the filter narrows.** A field is one piece of data that each collection item holds, such as a name or a status. A filter label is never a verb, and never names the action the persona is taking.

- **`Name`, not `Search`.** The persona is not filtering a field called "search". The persona is filtering by name.
- **`Status`, `Department`, `Requested`.** Each label names the field the way the table names the field.

**A filter's label must match the column the filter narrows.** When the filter label and the column header use different names, the persona cannot tell which field the filter narrows. When the two names differ, one of the two names is wrong. See `recursica-skill-naming-terminology`.

**A placeholder is not a label, and a placeholder never does the label's job.** When the label is a noun that names the field, the placeholder does a separate task. The placeholder shows what kind of value the filter accepts. A filter labeled `Name` with the placeholder `New hire or requester` is clear. A filter labeled `Search` with the same placeholder is not clear.

**Never use text that ends in an ellipsis in place of a label.** A control identified only by the text `Change status to…` inside the control's input has no label at all.

## Defaults and the neutral state

**Pick one convention for "not filtering," and use that convention across the whole filter bar.**

**NEVER mix conventions.** In a mixed filter bar, some filters show `All`, other filters are empty, and both mean unfiltered. The mix tells the persona that the filters behave differently, when the filters behave the same. A mix of conventions is the most common filter-bar defect, and avoiding the mix costs nothing.

**A filter should appear on the screen unapplied.** Filters are additive. The persona starts from the full collection and adds filters to narrow the collection down. A persona may not notice a filter applied in advance, and may conclude that data is missing. `recursica-skill-defaults` owns this rule.

**A default that filters must be visible as a filter.** When the collection loads already narrowed, the filter that narrows the collection must show that the filter is applied. Never show a screen that quietly hides rows while every filter shows the neutral state. Set a default filter. Never filter the data itself.

## Dates

**Prefer one control that offers relative date ranges over a pair of empty date inputs.** A relative date range is a range people work in, such as `This month`, `Last 30 days` or `This quarter`. The relative-range control also offers a Custom option, which opens a modal for entering an exact range.

**Avoid two bare date inputs.** `Start date on/after` and `Start date on/before` are two controls for one range. Both inputs are empty. The screen only implies that the two inputs belong together. The screen never shows the link between the two inputs. The persona has to work out that the two inputs form one range.

**Name a date field for the event the date records.** A column headed `Start date` that holds the date a request was raised has the wrong name. Every filter built on that column repeats the wrong name. `Requested` or `Request date` names the event. See `recursica-skill-naming-terminology`.

## Filter controls

**Make a filter multi-select when the filter's field has a known set of categories.** People filtering a queue want two statuses at once far more often than one status. A single-select filter forces the persona to run the search twice.

**If the project has a multi-select control, use the project's multi-select control.** Otherwise, the missing multi-select control is a known gap. Where a filter needs multi-select, raise the gap. Do not build a multi-select control out of other parts. Until the gap is closed, the working substitute is separate single-value filters that all apply at once. See `recursica-skill-selection-controls` and `recursica-skill-dropdown`.

**A lone on/off toggle is usually a filter with a bad name.** Before adding an on/off toggle, name the field the toggle filters. Then check whether the collection shows that field. When the collection has no column for that field, the persona cannot check what the toggle did. When the toggle repeats information that every row already shows, the toggle does nothing.

**Use a segmented control, not a switch, for any toggle in a filter bar.** A switch belongs in a form. See `recursica-skill-selection-controls`.

## Applied filters

**The persona must be able to tell the current applied state of every filter without opening each filter.** Show applied filters as chips the persona can remove. Removing a chip runs the search again. See `recursica-skill-badges-chips`.

**A filter and the filter's chip share one state.** Removing the chip clears the filter.

**Announce the result of filtering.** Filtering changes the number of rows without moving the focus. A persona using a screen reader hears nothing about the change unless the application announces the change. Announce the result politely and debounced. Politely means the screen reader finishes speaking first. Debounced means the announcement waits until the persona pauses, not on every keystroke. `recursica-skill-autocomplete` sets the same requirement for a typed filter.

**Filtering down to zero results is not an empty collection.** "No results for these filters" and "nothing here yet" are different states, with different next steps.

## Composition

**Place filters above the collection the filters narrow.** The filters narrow that collection only.

**Never mix the filter bar with actions that work on the data.** Bulk actions, exports and controls for creating new items must not sit in the same group as the filters. Those three kinds of control are not filters. A disabled action control among the filters looks like a broken filter. `recursica-skill-buttons-links` owns this rule.

**Filters combine with AND.** Every applied filter narrows the results further. A row appears only if the row matches every applied filter.

**Add a filter only for a field that appears in the collection.**

## Set by the theme or the component

- **The look and spacing of the filter controls, and the wrapping of the filter bar.** The components and the layout set the look, the spacing and the wrapping.
- **The table's columns.** `recursica-skill-tables` sets the columns.
- **The debounce delay, and the choice to run a typed filter while the persona types or on submit.** The debounce delay and the typed-filter behavior follow the rule "One behavioral mode per system" in `recursica-skill-system-conventions`.

## Out of scope

- **The table, the table's columns, sorting and pagination** — `recursica-skill-tables`.
- **Which control a form field gets** — `recursica-skill-selection-controls`. Filtering is not a form.
- **The typed lookup field** — `recursica-skill-autocomplete`.
- **Naming and terminology** — `recursica-skill-naming-terminology`.
- **Building queries, indexing and performance.** Queries, indexing and performance are not interface concerns.

## Open questions

- **The house set of relative date ranges.** The relative-range pattern is settled. The specific ranges, and which range is the default, are not settled.
- **Whether filters are kept** across navigation, sessions or personas, and whether a persona can save or share a filtered view.
- **Where the applied-filter chips sit** relative to the filter bar and the collection, and whether a clear-all control exists.
- **How many filters a filter bar may hold** before the filter bar needs a different structure. Whether rarely used filters may be hidden behind a control is also undecided.
- **Whether a filter may ever be a text search across several fields at once.** How to label a multi-field search filter is also undecided, because a filter label must name one field.
- **The neutral-state convention** — whether the house uses an explicit `All` option or an empty control. Every filter bar must use one convention consistently. The house has not chosen which convention.

## Pre-flight checklist

- [ ] Every filter label is a noun that names the field, never a verb, and matches the column the filter narrows.
- [ ] No placeholder does a label's job, and no control is identified only by ellipsis text inside the control.
- [ ] Every filter in the filter bar uses the same neutral-state convention. The filter bar never mixes `All` with empty filters.
- [ ] Any default that narrows the collection is visible in the filter control that sets the default.
- [ ] Dates use a relative-range control with a Custom option, not a pair of bare date inputs.
- [ ] Every date field is named for the event the date records.
- [ ] Category filters are multi-select. Where the project has no multi-select control, the gap is raised, and no multi-select control is built from other parts.
- [ ] The filter bar holds no switch. Every toggle in the filter bar is a segmented control.
- [ ] Every filter matches data visible in the collection.
- [ ] The applied state of the filters is visible without opening each filter.
- [ ] Each filter and the filter's chip stay in sync.
- [ ] Filtering announces how many results the filters returned. Zero results shows as "filtered down to nothing", not as an empty collection.
- [ ] No bulk action, export, or create control sits in the filter group.
- [ ] Open questions were asked about, not decided: the house set of relative date ranges, whether filters are kept, where the applied-filter chips sit, how many filters a filter bar may hold, a text search across several fields, and the neutral-state convention.
