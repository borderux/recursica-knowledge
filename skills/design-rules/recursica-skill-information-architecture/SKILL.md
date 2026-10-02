---
name: recursica-skill-information-architecture
description: House rules for an application's structure — which objects it is about and how they relate, the object map approved before building, which objects get a top-level navigation item, where a child object or one with several parents lives, sections that are not objects, and room to grow. Use when planning an app's sections or a multi-screen flow, or deciding where something belongs. Not for navigation patterns — see recursica-skill-navigation.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.2.0
---

# Information architecture

These are the house rules for how an application is structured: which objects it is about, how they relate, and where each one can be reached. They are opinions, not neutral best practices — treat them as constraints.

These rules assume **complex enterprise web applications, designed for desktop first**, built for users who come back every day and already know their own field. This skill decides what exists and what can be reached from where. How any of it is shown on a screen belongs to other skills, named below.

## The three governing principles

1. **Objects first, then screens.** An object is a kind of thing the user works with and would point at and name — an order, a customer, an invoice. Settle which objects the application is about, and how they relate, before deciding any screen. Every screen is a view of one object or of many, and the structure is only as sound as that list.
2. **The user's objects, not the database's.** Objects and their groupings come from how the users' work is already arranged, which is their mental model (what a person expects from the tools and work they already know). That comes from three places: how the work is done outside software, the terms of the users' own field, and products they already use. **NEVER from the team's shorthand or how the database stores the data.** A table in the database is not an object because it exists, and one object can span several tables.
3. **Decide what can be reached from where — not how it looks.** This skill says that an order's line items are reached from the order. Whether they appear in a tab, a section or a table on that page is decided by the skills that own those components.

## What counts as an object

**An object has its own identity, its own properties, and more than one of it exists.** The test is whether a user would point at one and say "that one" — by its name, its number, or its title.

These are not objects, and must not be given a place of their own in the structure:

- **A property of an object.** A status, a date or an owner is a column on the object's table, not a section. See `recursica-skill-tables`.
- **A filtered view of an object.** Overdue orders are orders. One object type is one table, filtered — never a second section. See `recursica-skill-tables`.
- **An action.** Approving, exporting and importing are things done to an object. They are buttons, not places. See `recursica-skill-buttons-links`.

**Find the objects in the request and the interview** — the nouns the request keeps returning to, and the domain model from the interview. Where the users call an object something different from the request, the users' word wins; see `recursica-skill-naming-terminology`. Where it is unclear whether something is an object or a property of one, ask.

**Whether a screen shows one object or many decides what the screen is.** Many of one object type is a list, and a list is a table by default — see `recursica-skill-tables`. One object is its detail view. Where that detail opens — a page of its own or a panel beside the list — is decided by the context test in `recursica-skill-panels-modals`.

## The object map, agreed before any code

**Before anything is built, write an object map and get it approved with the rest of the brief.** A structure nobody agreed gets argued again on every screen, and a structure that changes after screens exist changes every one of them.

The object map says, for each object:

- **what it relates to** — its parent, its children, and any object it belongs to more than one of
- **where it lives** — a top-level navigation item, or under which parent or parents
- **where its list and its detail are reached** — each is a location, so each has a route (see `recursica-skill-navigation`)

It also lists **the sections that are not objects** and where each came from — see below.

A short table is enough:

| Object    | Relates to                       | Lives                           | Reached at                                             |
| --------- | -------------------------------- | ------------------------------- | ------------------------------------------------------ |
| Customer  | has orders                       | top level                       | list; detail                                           |
| Order     | belongs to a customer; has items | top level                       | list; detail                                           |
| Line item | belongs to one order             | under Order                     | from its order's detail                                |
| Document  | belongs to orders and customers  | under Order, and under Customer | from each parent's detail; one detail route of its own |

**The map is what the built application is checked against.** Every object on it is reachable where the map says, and nothing reachable is missing from it.

## Which objects get a top-level navigation item

**Only an object people look for on its own, across every parent it belongs to.** The test: would anyone ask for a list of all of them, whatever they belong to? "Show me all customers" — yes, so Customer is top level.

**An object that only makes sense inside another lives under that parent, and never gets a top-level item.** Nobody asks for every line item across every order; they ask for this order's line items. A top-level Line items section would be a list nobody uses, and it would take a navigation item away from a section people do use.

**When a child object starts being looked for on its own, it becomes top level.** That is a change to the map, and it is agreed the same way the map was.

How the top-level items are arranged, how many there may be and how deep they may nest are owned by `recursica-skill-navigation`. What each is called is owned by `recursica-skill-naming-terminology`.

## An object with several parents

**It is reachable from every parent it belongs to, and it is the same object everywhere.** A document attached to three orders appears under each of them, and each one leads to the same document.

**It has one detail route of its own**, not one per parent. No parent owns it, and a change made from any of them shows under all of them. **NEVER copy it into each parent** — two copies of one object disagree the first time one is edited, and the user cannot tell which is true.

It still gets no top-level item unless people look for it on its own. Belonging to several parents is not the same as being looked for.

## Sections that are not objects

**These follow the request.** An approvals queue, reports, settings — where the product owner describes the work that way, it is a section. Record each one in the object map with where it came from.

**Where the request says nothing, ask.** Do not invent a task section to organize the work, and do not force work the request describes as a task into an object's list.

A section like this is still named with a noun — `Approvals`, never `Approve requests`. See `recursica-skill-naming-terminology`.

## Room to grow

**Every group must have an obvious home for what will be added later.** A structure that only fits today's content is a defect, not something to revisit later. The revisit does not happen, and new additions get filed wherever there is room.

**Test it before the map is agreed.** Ask the product owner what is likely to be added next, and check that the map says where it would go without moving anything that is already there.

## Set by the theme or the component

- **Which sections that are not objects exist.** The product owner's, through the request.
- **What any object or section is called.** The users' words — `recursica-skill-naming-terminology`.

## Out of scope

- **How related objects appear on a detail page** — tabs, sections or tables. See `recursica-skill-tabs`, `recursica-skill-screen-scaffolding` and `recursica-skill-tables`.
- **Whether a detail view is a page or a panel** — `recursica-skill-panels-modals`.
- **The navigation pattern, item counts, nesting depth, overflow, breadcrumbs and routing** — `recursica-skill-navigation`.
- **Page composition and what ranks highest on a screen** — `recursica-skill-screen-scaffolding` and `recursica-skill-screen-priority`.
- **Search, filters and sorting within a list** — `recursica-skill-filters` and `recursica-skill-tables`.
- **Designing the database.** The object map describes what the user works with. How it is stored is not a UI concern.

## Open questions

- **How a parent's related objects appear on its detail page.** No skill decides between tabs, sections and links for this yet.
- **The order of items within a level** — by how often they are used, alphabetically, or in workflow order. Also an open question in `recursica-skill-navigation`.
- **An object that exists only once per account** — the organization's own profile, for example. Whether it is top level, a setting, or somewhere else.
- **How deep objects may nest** — an order's line items' adjustments — before the deepest one needs a place of its own.
- **Whether the structure may differ by persona.** `recursica-skill-naming-terminology` covers different words for different personas; nothing covers different structures.
- **What happens to routes when the map changes after launch** — whether old routes redirect, and what happens to a section that is removed.

## Pre-flight checklist

- [ ] An object map was written and approved with the brief, before any code.
- [ ] Every object on the map has its own identity and more than one instance. No property, filtered view or action is on it as an object.
- [ ] The objects and groupings come from the users' work — their field's terms, how the work is done outside software, products they already use — and not from the database or the team's shorthand.
- [ ] Every object is reachable where the map says, and nothing reachable is missing from the map.
- [ ] Only objects people look for on their own, across all their parents, have a top-level navigation item.
- [ ] No object that only makes sense inside another has a top-level item. It is reached from its parent.
- [ ] An object with several parents is reachable from each of them, has one detail route of its own, and is never copied per parent.
- [ ] Every section that is not an object came from the request, and the map says so. None was invented.
- [ ] The map says where the next likely addition would go, without moving anything already there.
- [ ] Nothing in this skill decided how anything looks — tabs, sections, page or panel were left to their own skills.
- [ ] Open questions were asked about, not decided: how a parent's related objects appear on its detail page, the order of items within a level, an object that exists only once per account, how deep objects may nest, whether the structure may differ by persona, and what happens to routes when the map changes.
