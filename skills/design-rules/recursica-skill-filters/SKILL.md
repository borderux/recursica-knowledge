---
name: recursica-skill-filters
description: House rules for filtering a collection in enterprise web applications — that every filter must be understandable before it is used, why a filter label is a noun naming the field rather than a verb, keeping defaults consistent so one convention means unfiltered, choosing relative date ranges over a pair of empty date fields, when a filter is multi-select, why a lone boolean toggle is usually a badly named filter, and making the applied state visible. Use when adding, reviewing, or refactoring a filter bar, a search field over a list, a date range, or any control that narrows a table or collection. Trigger on "filter", "filter bar", "search field", "date range", "narrow the list", "clear filters", "applied filters", or a control that reduces what a table shows. Do NOT use for the table itself — that is recursica-skill-tables. Do NOT use for which control a form field gets — that is recursica-skill-selection-controls.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Filters

These are the house rules for the controls that narrow down a collection. They are opinions, not neutral best practices — treat them as constraints.

These rules assume **complex enterprise web applications, designed for desktop first**, where the same people filter the same collections every day. Filtering is not a form: nothing is being saved, so the rules here are different from `recursica-skill-forms`.

## The three governing principles

1. **A filter must be understandable before anyone uses it.** If the only way to learn what a control does is to toggle it and watch the table, it is not a filter — it is a guess. The label, and the column it matches, have to carry the meaning on their own.
2. **One convention for "not filtering."** Every filter in a bar arrives in the same kind of neutral state. Mixing controls that say `All` with controls that are simply empty makes the same result look like two different situations.
3. **Filtering saves nothing.** There is no save mode, no unsaved-changes state, and no confirmation. It changes what is shown, and nothing else. See `recursica-skill-feedback-messaging`.

## Labels

**A filter's label is a noun that names the field being filtered.** It is never a verb, and never the action the user is taking.

- **`Name`** — not `Search`. The user is not filtering a thing called "search"; they are filtering by name.
- **`Status`, `Department`, `Requested`** — the field, named the way the table names it.

**The label must match the column it filters.** If the filter says one thing and the column header says another, the user cannot tell what the control works on. Where they disagree, one of the two names is wrong — see `recursica-skill-naming-terminology`.

**The placeholder is not the label**, and it never does the label's job. (A placeholder is the hint text shown inside an empty field.) Once the label is a real noun that names the field, the placeholder is free to do its actual job: show the form an accepted value takes. A field labelled `Name` with the placeholder `New hire or requester` is clear. A field labelled `Search` with the same placeholder is not.

**Never use a trailing ellipsis in place of a label.** A control whose only identification is `Change status to…` inside its own input has no label at all.

## Defaults and the neutral state

**Every filter in a bar uses the same convention for "not filtering."** Pick one, and use it across the whole bar.

**NEVER mix conventions.** A bar where some controls read `All` and others sit empty — both meaning unfiltered — tells the user those controls behave differently, when they do not. This is the most common filter-bar defect, and avoiding it costs nothing.

**A filter should arrive unapplied.** Filters are additive: the user starts from everything and narrows it down. A filter applied in advance risks the user not noticing it, and concluding that the data is missing. Owned by `recursica-skill-defaults`.

**A default that filters must be visible as a filter.** If the collection arrives already narrowed, the control must show that state. Never show a screen that quietly hides rows while every control reads neutral. **Set a default filter; never filter the data itself.**

## Dates

**Prefer a single control of relative ranges over a pair of empty date fields.** `This month`, `Last 30 days`, `This quarter` — the ranges people actually work in — plus a **Custom** option that opens a modal (a window that blocks the rest of the page until the user closes it) for entering an exact range.

**Two bare date fields are the pattern to avoid.** `Start date on/after` and `Start date on/before` are two controls for one idea. Both are empty, and the connection between them is only implied, not shown. The user has to work out that it is a range at all.

**Name the date field for the event it records.** A column headed `Start date` that actually holds the date a request was raised is mislabelled, and every filter built on it inherits the confusion. `Requested` or `Request date` names the event. See `recursica-skill-naming-terminology`.

## Which control a filter gets

**A filter over a known set of categories is multi-select.** People filtering a queue want two statuses at once far more often than one, and a single-select control forces them to run the search twice.

**There is no multi-select control in the component inventory.** This is a known gap — see `recursica-skill-selection-controls` and `recursica-skill-dropdown`. **Do not build one out of other parts.** Where multi-select is really needed, raise it. In the meantime, the working substitute is separate single-value filters that all apply at once.

**A single on/off toggle is usually a badly named filter.** Before you add one, ask what field it filters, and whether that field is visible in the collection. If the matching column does not exist, the user cannot check what the toggle did. If its meaning repeats something already shown in every row, it is doing nothing.

**Any toggle in a filter bar is a segmented control, not a switch.** (A segmented control is a row of joined buttons, one of which is selected.) A switch belongs in a form — see `recursica-skill-selection-controls`.

## Making the filtered state knowable

**The user must be able to tell what is currently applied without opening each control.** The pattern is to show applied filters as chips that can be removed — removing one runs the search again. See `recursica-skill-badges-chips`.

**The control and the chip are one state, not two.** Removing the chip clears the control.

**Announce the result of filtering.** The number of rows changed, and nothing moved the focus, so a screen reader (software that reads the screen aloud) user is told nothing unless you say so. Announce it politely, and debounced — that is, only after the user pauses, not on every keystroke. See `recursica-skill-autocomplete` for the same requirement on a typed filter.

**Filtering down to zero results is not an empty collection.** "No results for these filters" and "nothing here yet" are different states, with different next steps.

## Composition

**Filters sit above the collection they act on**, and they act on that collection only.

**Never mix the filter bar with actions that work on the data.** Bulk actions, exports, and controls for creating things are not filters, and they must not sit in the same group. A disabled action control among a row of filters looks like a broken filter. Owned by `recursica-skill-buttons-links`.

**Filters combine with AND.** Every applied filter narrows the results further: a row appears only if it matches all of them.

**Do not add a filter for a field that is not in the collection.** If it is worth filtering by, it is worth showing.

## Not your decision

- **How the controls look**, their spacing, and how the bar wraps — owned by the components and the layout.
- **Which columns exist in the table** — `recursica-skill-tables`.
- **How long the debounce waits, and whether a typed filter runs live or on submit** — one behavioral mode per system, see `recursica-skill-system-conventions`.

## Out of scope

- **The table, its columns, sorting, and pagination** — `recursica-skill-tables`.
- **Which control a form field gets** — `recursica-skill-selection-controls`. Filtering is not a form.
- **The typed lookup field itself** — `recursica-skill-autocomplete`.
- **What things are called** — `recursica-skill-naming-terminology`.
- **Building queries, indexing, and performance.** These are not UI concerns.

## Uncovered — ask, do not invent

- **The house set of relative date ranges.** The pattern is settled; the specific options, and which one is the default, are not.
- **Whether filters are kept** across navigation, sessions, or users, and whether a filtered view can be saved or shared.
- **Where the applied-filter chips sit** relative to the bar and the collection, and whether there is a clear-all.
- **How many filters a bar may hold** before it needs a different structure, and whether rarely used filters may be hidden behind a control.
- **Whether a filter may ever be a text search across several fields at once**, and how it would be labelled if the label must name one field.
- **The neutral-state convention itself** — whether the house uses an explicit `All` option or an empty control. The rule is that it must be consistent; which one has not been chosen.

## Pre-flight checklist

- [ ] Every filter label is a noun that names the field, never a verb, and it matches the column it filters.
- [ ] No placeholder does a label's job, and no control is identified only by ellipsis text inside itself.
- [ ] Every filter in the bar uses the same neutral-state convention. None of them mixes `All` with empty.
- [ ] Any default that narrows the collection is visible in its control.
- [ ] Dates use a relative-range control with a custom option, not a pair of bare date fields.
- [ ] Every date field is named for the event it records.
- [ ] Category filters are multi-select — or you raised the gap instead of building around it.
- [ ] There is no switch in the filter bar; toggles are segmented controls.
- [ ] Every filter matches something visible in the collection.
- [ ] The applied state is visible without opening each control, and the control and its chip stay in sync.
- [ ] Filtering announces how many results it returned, and zero results reads as "filtered down to nothing" rather than empty.
- [ ] No bulk action, export, or create control sits in the filter group.
- [ ] You invented nothing from the uncovered list.
