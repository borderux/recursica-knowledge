---
name: recursica-skill-filters
description: House rules for filtering a collection — filters understandable before use, noun labels, one convention for unfiltered, relative date ranges, multi-select filters, lone on/off toggles, and showing the applied state of the filters. Use for a filter bar, a search over a list, or a date range. Not for the table itself — see recursica-skill-tables.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Filters

This skill holds the house rules for filters. A filter is a control that narrows down a collection, such as a table or a list, to fewer items. The rules are the team's opinions, not neutral best practices. Treat each rule as a constraint.

The rules assume **complex enterprise web applications, designed for desktop first**, where the same people filter the same collections every day. Filtering is not a form, because filtering saves nothing. The rules for filters differ from the form rules in `recursica-skill-forms`.

## The three governing principles

1. **A filter must be understandable before anyone uses the filter.** A control that a user must try, while watching the table, to learn what the control does is not a filter. The user of such a control is left to guess. The filter's label and the column the label matches must show what the control filters, with no other help.
2. **Every filter uses one convention for "not filtering."** A filter bar is the group of filters for one collection. Every filter in a filter bar starts in the same kind of neutral state (the state of a filter that narrows nothing). When some filters say `All` and other filters are empty, the same result looks like two different situations.
3. **Filtering saves nothing.** A filter has no save mode, no unsaved-changes state and no confirmation. A filter changes which items are shown, and nothing else. See `recursica-skill-feedback-messaging`.

## Labels

**A filter's label is a noun that names the field being filtered.** A field is one piece of data that each item in the collection holds, such as a name or a status. A filter label is never a verb, and never names the action the user is taking.

- **`Name`, not `Search`.** The user is not filtering a field called "search". The user is filtering by name.
- **`Status`, `Department`, `Requested`.** Each label names the field the way the table names the field.

**A filter's label must match the column the filter narrows.** When the filter label and the column header use different names, the user cannot tell which field the filter narrows. When the two names differ, one of the two names is wrong. See `recursica-skill-naming-terminology`.

**A placeholder is not a label, and a placeholder never does the label's job.** When the label is a noun that names the field, the placeholder has a separate job: to show what kind of value the filter accepts. A filter labeled `Name` with the placeholder `New hire or requester` is clear. A filter labeled `Search` with the same placeholder is not clear.

**Never use text that ends in an ellipsis in place of a label.** A control identified only by the text `Change status to…` inside the control's input has no label at all.

## Defaults and the neutral state

**Every filter in a filter bar uses the same convention for "not filtering."** Pick one convention, and use that convention across the whole filter bar.

**NEVER mix conventions.** In a mixed filter bar, some filters show `All` and other filters are empty, and both mean unfiltered. The mix tells the user that the filters behave differently, when the filters behave the same. A mix of conventions is the most common filter-bar defect, and avoiding the mix costs nothing.

**A filter should arrive on the screen unapplied.** Filters are additive. The user starts from the full collection and narrows the collection down. A user may not notice a filter applied in advance, and may conclude that data is missing. `recursica-skill-defaults` owns this rule.

**A default that filters must be visible as a filter.** When the collection loads already narrowed, the filter that narrows the collection must show that the filter is applied. Never show a screen that quietly hides rows while every filter shows the neutral state. Set a default filter. Never filter the data itself.

## Dates

**Prefer one control of relative date ranges over a pair of empty date inputs.** A relative date range is a range people work in, such as `This month`, `Last 30 days` or `This quarter`. The control also offers a Custom option, which opens a modal for entering an exact range.

**Avoid two bare date inputs.** `Start date on/after` and `Start date on/before` are two controls for one range. Both inputs are empty. The screen only implies that the two inputs belong together, and never shows the link. The user has to work out that the two inputs form a range at all.

**Name a date field for the event the date records.** A column headed `Start date` that holds the date a request was raised has the wrong name. Every filter built on that column repeats the confusion. `Requested` or `Request date` names the event. See `recursica-skill-naming-terminology`.

## Filter controls

**A filter over a known set of categories is multi-select.** People filtering a queue want two statuses at once far more often than one status. A single-select filter forces the user to run the search twice.

**The standard UI kit (the unchanged UI kit in the official Recursica release) has no multi-select control.** If the project adds a multi-select control in Theme Forge, use the project's control. Otherwise, the missing multi-select control is a known gap. See `recursica-skill-selection-controls` and `recursica-skill-dropdown`. Do not build a multi-select control out of other parts. Where a filter needs multi-select, raise the gap. Until the gap is closed, the working substitute is separate single-value filters that all apply at once.

**A lone on/off toggle is usually a filter with a bad name.** Before adding an on/off toggle, name the field the toggle filters. Then check whether the collection shows that field. When the matching column does not exist, the user cannot check what the toggle did. When the toggle's meaning repeats information already shown in every row, the toggle does nothing.

**Any toggle in a filter bar is a segmented control, not a switch.** A switch belongs in a form. See `recursica-skill-selection-controls`.

## Applied filters

**The user must be able to tell the current applied state of the filters without opening each filter.** Show applied filters as chips the user can remove. Removing a chip runs the search again. See `recursica-skill-badges-chips`.

**A filter and the filter's chip are one state, not two.** Removing the chip clears the filter.

**Announce the result of filtering.** Filtering changes the number of rows without moving the focus. A screen reader user hears nothing about the change unless the application announces the change. Announce the result politely and debounced, which means only after the user pauses, not on every keystroke. `recursica-skill-autocomplete` sets the same requirement for a typed filter.

**Filtering down to zero results is not an empty collection.** "No results for these filters" and "nothing here yet" are different states, with different next steps.

## Composition

**Filters sit above the collection the filters act on**, and the filters act on that collection only.

**Never mix the filter bar with actions that work on the data.** Bulk actions, exports and controls for creating new items are not filters. Bulk actions, exports and create controls must not sit in the same group as the filters. A disabled action control among a row of filters looks like a broken filter. `recursica-skill-buttons-links` owns this rule.

**Filters combine with AND.** Every applied filter narrows the results further. A row appears only if the row matches every applied filter.

**Do not add a filter for a field that is not in the collection.** Every field the user can filter by also appears in the collection.

## Set by the theme or the component

- **How the filter controls look, the controls' spacing, and how the filter bar wraps.** The components and the layout set the look, the spacing and the wrapping.
- **Which columns the table has.** `recursica-skill-tables` sets the columns.
- **How long the debounce waits, and whether a typed filter runs while the user types or on submit.** The debounce time and the typed-filter behavior follow the rule "One behavioral mode per system" in `recursica-skill-system-conventions`.

## Out of scope

- **The table, the table's columns, sorting and pagination** — `recursica-skill-tables`.
- **Which control a form field gets** — `recursica-skill-selection-controls`. Filtering is not a form.
- **The typed lookup field** — `recursica-skill-autocomplete`.
- **Naming and terminology** — `recursica-skill-naming-terminology`.
- **Building queries, indexing and performance.** Queries, indexing and performance are not interface concerns.

## Open questions

- **The house set of relative date ranges.** The relative-range pattern is settled. The specific ranges, and which range is the default, are not settled.
- **Whether filters are kept** across navigation, sessions or users, and whether a user can save or share a filtered view.
- **Where the applied-filter chips sit** relative to the filter bar and the collection, and whether a clear-all control exists.
- **How many filters a bar may hold** before the filter bar needs a different structure, and whether rarely used filters may be hidden behind a control.
- **Whether a filter may ever be a text search across several fields at once**, and how to label such a filter when a filter label must name one field.
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
- [ ] The applied state of the filters is visible without opening each filter, and each filter and the filter's chip stay in sync.
- [ ] Filtering announces how many results the filters returned. Zero results shows as "filtered down to nothing", not as an empty collection.
- [ ] No bulk action, export, or create control sits in the filter group.
- [ ] Open questions were asked about, not decided: the house set of relative date ranges, whether filters are kept, where the applied-filter chips sit, how many filters a bar may hold, a text search across several fields, and the neutral-state convention.
