---
name: recursica-skill-filters
description: House rules for filtering a collection in enterprise web applications — that every filter must be understandable before it is used, why a filter label is a noun naming the field rather than a verb, keeping defaults consistent so one convention means unfiltered, choosing relative date ranges over a pair of empty date fields, when a filter is multi-select, why a lone boolean toggle is usually a badly named filter, and making the applied state visible. Use when adding, reviewing, or refactoring a filter bar, a search field over a list, a date range, or any control that narrows a table or collection. Trigger on "filter", "filter bar", "search field", "date range", "narrow the list", "clear filters", "applied filters", or a control that reduces what a table shows. Do NOT use for the table itself — that is recursica-skill-tables. Do NOT use for which control a form field gets — that is recursica-skill-selection-controls.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Filters

House rules for the controls that narrow a collection. These are opinions, not neutral best practices — apply them as constraints.

Context these rules assume: **complex enterprise web applications, desktop-first**, where the same people filter the same collections every day. Filtering is not a form: nothing is being saved, and the rules here differ from `recursica-skill-forms` accordingly.

## The three governing principles

1. **A filter must be understandable before it is used.** If the only way to learn what a control does is to toggle it and watch the table, it is not a filter — it is a guess. The label, and the column it corresponds to, have to carry the meaning on their own.
2. **One convention for "not filtering."** Every filter in a bar arrives in the same kind of neutral state. Mixing controls that say `All` with controls that are simply empty makes an identical result look like two different situations.
3. **Filtering commits nothing.** No save mode, no dirty state, no confirmation. It changes what is shown and nothing else. See `recursica-skill-feedback-messaging`.

## Labels

**A filter's label is a noun that names the field being filtered.** It is never a verb, and never the action the user is performing.

- **`Name`** — not `Search`. The user is not filtering a thing called "search"; they are filtering by name.
- **`Status`, `Department`, `Requested`** — the field, as the table calls it.

**The label must match the column it filters.** If the filter says one thing and the column header says another, the user cannot tell what the control acts on. Where they disagree, one of the two names is wrong — see `recursica-skill-naming-terminology`.

**The placeholder is not the label**, and it never carries the label's job. Once the label is a proper noun, the placeholder is free to do what it is for: show the shape of an accepted value. A field labelled `Name` with the placeholder `New hire or requester` is clear; a field labelled `Search` with the same placeholder is not.

**Never label a filter with a trailing ellipsis instead of a label** — a control whose only identification is `Change status to…` inside its own input has no label at all.

## Defaults and the neutral state

**Every filter in a bar uses the same convention for "not filtering."** Pick one and apply it across the whole bar.

**NEVER mix conventions.** A bar where some controls read `All` and others sit empty, with both meaning unfiltered, tells the user those controls behave differently when they do not. This is the most common filter-bar defect and it costs nothing to avoid.

**A filter should arrive unapplied.** Filters are additive: the user starts from everything and narrows. A pre-applied filter risks the user not realizing it is there and concluding the data is missing. Owned by `recursica-skill-defaults`.

**A default that filters must be visible as a filter.** If the collection arrives pre-narrowed, the control must show that state — never a screen that silently hides rows while every control reads neutral. **Set a default filter; never filter the data itself.**

## Dates

**Prefer a single relative-range control over a pair of empty date fields.** `This month`, `Last 30 days`, `This quarter` — the ranges people actually work in — with a **Custom** option that opens a modal to enter an explicit range.

**Two bare date fields are the pattern to avoid.** `Start date on/after` and `Start date on/before` are two controls expressing one concept, both empty, with the relationship between them implied rather than shown. The user has to infer that it is a range at all.

**Name the date field for the event it records.** A column headed `Start date` that actually holds the date a request was raised is mislabelled, and every filter built on it inherits the confusion. `Requested` or `Request date` names the event. See `recursica-skill-naming-terminology`.

## Which control a filter gets

**A filter over a known set of categories is multi-select.** People filtering a queue want two statuses at once far more often than one, and a single-select forces them to run the query twice.

**No multi-select control exists in the component inventory.** This is a known gap — see `recursica-skill-selection-controls` and `recursica-skill-dropdown`. **Do not compose one.** Where multi-select is genuinely needed, raise it; independent single-value filters that AND together are the working substitute in the meantime.

**A lone boolean toggle is usually a badly named filter.** Before adding one, ask what field it filters and whether that field is visible in the collection. A toggle whose corresponding column does not exist cannot be verified by the user, and a toggle whose meaning duplicates something already in every row is doing nothing.

**Any toggle in a filter bar is a segmented control, not a switch.** A switch belongs in a form; see `recursica-skill-selection-controls`.

## Making the filtered state knowable

**The user must be able to tell what is currently applied without opening each control.** Applied filters shown as removable chips are the pattern — removing one re-runs the query. See `recursica-skill-badges-chips`.

**The control and the chip are one state, not two.** Removing the chip clears the control.

**Announce the result of filtering.** The row count changed and nothing moved focus, so a screen reader user is told nothing unless you say so — politely, and debounced. See `recursica-skill-autocomplete` for the same requirement on a typed filter.

**Filtering to zero results is not an empty collection.** "No results for these filters" and "nothing here yet" are different states with different next actions.

## Composition

**Filters sit above the collection they act on**, and act on that collection only.

**Never blend the filter bar with actions that operate on the data.** Bulk actions, exports, and creation controls are not filters and must not sit inside the same cluster — a disabled action control amid a row of filters reads as a broken filter. Owned by `recursica-skill-buttons-links`.

**Filters compose with AND.** Every applied filter narrows further.

**Do not add a filter for a field that is not in the collection.** If it is worth filtering by, it is worth showing.

## Not your decision

- **The controls' visual design**, spacing, and how the bar wraps — owned by the components and the layout.
- **Which columns exist in the table** — `recursica-skill-tables`.
- **Debounce timing and whether a typed filter is live or on submit** — one behavioral mode per system, see `recursica-skill-system-conventions`.

## Out of scope

- **The table, its columns, sorting, and pagination** — `recursica-skill-tables`.
- **Which control a form field gets** — `recursica-skill-selection-controls`. Filtering is not a form.
- **The typed lookup field itself** — `recursica-skill-autocomplete`.
- **What things are called** — `recursica-skill-naming-terminology`.
- **Query construction, indexing, and performance.** Not UI concerns.

## Uncovered — ask, do not invent

- **The house set of relative date ranges.** The pattern is settled; the specific options and which is the default are not.
- **Whether filters persist** across navigation, sessions, or users, and whether a filtered view can be saved or shared.
- **Where the applied-filter chips sit** relative to the bar and the collection, and whether a clear-all exists.
- **How many filters a bar may hold** before it needs a different structure, and whether infrequent filters may be hidden behind a control.
- **Whether a filter may ever be a text search across several fields at once**, and how that is labelled if the label must name one field.
- **The neutral-state convention itself** — whether the house uses an explicit `All` option or an empty control. The rule is that it must be consistent; which one has not been chosen.

## Pre-flight checklist

- [ ] Every filter label is a noun naming the field, never a verb, and matches the column it filters.
- [ ] No placeholder is doing a label's job, and no control is identified only by ellipsis text inside itself.
- [ ] Every filter in the bar uses the same neutral-state convention; none mixes `All` with empty.
- [ ] Any default that narrows the collection is visible in its control.
- [ ] Dates use a relative-range control with a custom option, not a pair of bare date fields.
- [ ] Every date field is named for the event it records.
- [ ] Categorical filters are multi-select, or the gap was raised rather than composed around.
- [ ] No switch in the filter bar; toggles are segmented controls.
- [ ] Every filter corresponds to something visible in the collection.
- [ ] The applied state is visible without opening each control, and control and chip stay in sync.
- [ ] Filtering announces its result count, and zero results reads as filtered-to-nothing rather than empty.
- [ ] No bulk action, export, or creation control sits inside the filter cluster.
- [ ] Nothing in the uncovered list was invented.
