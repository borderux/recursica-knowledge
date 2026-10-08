---
name: recursica-skill-information-architecture
description: House rules for an application's structure — objects and how objects relate, the object map approved before building, which objects get a top-level navigation item, where a child object or an object with several parents lives, sections that are not objects, and future additions. Use when planning an app's sections or a multi-screen flow, or deciding where any part of an app belongs. Not for navigation patterns — see recursica-skill-navigation.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.2.0
---

# Information architecture

This skill holds the house rules for how an application is structured. The house rules say which objects the application is about, how the objects relate, and where the persona can reach each object. The house rules are opinions, not neutral best practices. Treat each house rule as a constraint.

The house rules assume **complex enterprise web applications, designed for desktop first**, built for personas who come back every day and know their own field. This skill decides what exists in the structure and what the persona can reach from where. Other skills decide how the structure is shown on a screen. The section "Out of scope" names those skills.

## The three governing principles

1. **Settle the objects first, then the screens.** An object is a kind of item the persona works with and would point at and name, such as an order, a customer or an invoice. Settle which objects the application is about, and how the objects relate, before deciding any screen. Every screen is a view of one object or of many objects. A mistake in the list of objects becomes a mistake in the structure.
2. **Use the persona's objects, not the database's objects.** Take the objects and the groupings of objects from how the personas' work is already arranged. That arrangement is the personas' mental model (what a person expects, based on the tools and work the person already knows). The mental model comes from three places: how the work is done outside software, the terms of the personas' own field, and products the personas already use. **NEVER take the objects or the groupings from the team's shorthand or from how the database stores the data.** A database table is not an object merely because the table exists. One object can span several database tables.
3. **Decide what the persona can reach from where, not how the structure looks.** For example, this skill says that the persona reaches an order's line items from the order. The skills that own tabs, page sections and tables decide whether the line items appear in a tab, a section or a table on the order's page.

## What counts as an object

**An object has its own identity and its own properties, and more than one instance of the object exists.** The test is whether a persona would point at one instance and say "that one", by the instance's name, number or title.

Properties, filtered views and actions are not objects. A property, a filtered view or an action must not get a separate place in the structure.

- **A property of an object.** A status, a date or an owner is a column in the object's table, not a section. See `recursica-skill-tables`.
- **A filtered view of an object.** Overdue orders are orders. Show one object type as one table with a filter, never as a second section. See `recursica-skill-tables`.
- **An action.** Approving, exporting and importing are actions the persona takes on an object. An action is a button, not a place in the structure. See `recursica-skill-buttons-links`.

**Find the objects in the request and the interview.** Look for the nouns the request keeps returning to, and for the domain model (the core objects, how the objects relate, and what identifies each object) from the interview. When the personas call an object by a different word than the request uses, the personas' word wins. See `recursica-skill-naming-terminology`. When a concept might be an object or might be a property of an object, ask.

**The number of objects on a screen, one or many, decides the kind of screen.** A screen that shows many objects of one type is a list. A list is a table by default. See `recursica-skill-tables`. A screen that shows one object is the object's detail view. The context test in `recursica-skill-panels-modals` decides where a detail view opens: on a separate page, or in a panel beside the list.

## The object map

**Before any screen or code is built, write an object map. Get the object map approved as part of the brief for the work.** When nobody agreed on the structure, the team argues about the structure again on every screen. When the structure changes after screens exist, every screen has to change.

For each object, the object map names:

- **the objects the object relates to**: the object's parent, or each parent when the object has several parents, and the object's children
- **the place the object lives**: a top-level navigation item, or under which parent or parents
- **the places the persona reaches the object's list and the object's detail view**

The object's list is a location, and the object's detail view is a location. Every location has a route. See `recursica-skill-navigation`.

The object map also lists **every section that is not an object**, and where each section came from. See "Sections that are not objects" below.

A short table is enough for the object map:

| Object    | Relates to                       | Lives                           | Reached at                                                   |
| --------- | -------------------------------- | ------------------------------- | ------------------------------------------------------------ |
| Customer  | has orders                       | top level                       | list; detail                                                 |
| Order     | belongs to a customer; has items | top level                       | list; detail                                                 |
| Line item | belongs to one order             | under Order                     | from the order's detail                                      |
| Document  | belongs to orders and customers  | under Order, and under Customer | from each parent's detail; one detail route for the document |

**Check the built application against the object map.** Every object on the object map is reachable where the object map says. Nothing the persona can reach is missing from the object map.

## Top-level navigation items

**Give a top-level navigation item only to an object that people look for by itself, across every parent the object belongs to.** The test is whether anyone would ask for a list of every instance of the object, no matter which parent each instance belongs to. A persona would ask "Show me all customers". Customer is therefore top level.

**An object that only makes sense inside another object lives under that parent object, and never gets a top-level navigation item.** Nobody asks for every line item across every order. A persona asks for the line items of one order. A top-level Line items section would be a list nobody uses. The Line items section would also take a navigation item away from a section that people do use.

**When people start to look for a child object by itself, the child object becomes top level.** Moving the child object to the top level is a change to the object map. Agree on the change the same way the object map was agreed.

`recursica-skill-navigation` decides how the top-level navigation items are arranged, how many top-level items there may be, and how deep the items may nest. `recursica-skill-naming-terminology` decides the name of each item.

## An object with several parents

**An object with several parents is reachable from every parent the object belongs to, and is the same object under every parent.** A document attached to three orders appears under each of the three orders. Each of the three orders leads to the same document.

**An object with several parents has one detail route of its own**, not one route per parent. No parent owns the object. A change made from any parent shows under every parent. **NEVER copy the object into each parent.** Two copies of one object disagree the first time someone edits one copy, and the persona cannot tell which copy is true.

An object with several parents still gets no top-level navigation item unless people look for the object by itself. Belonging to several parents is not the same as people looking for the object by itself.

## Sections that are not objects

Some sections are not objects, such as an approvals queue, reports or settings.

**A section that is not an object follows the request.** When the product owner describes the work as an approvals queue, reports, settings or a similar section, the work is a section. Record each section that is not an object in the object map, with where the section came from.

**When the request says nothing about a section, ask.** Do not invent a section built around a task to organize the work. Do not force work that the request describes as a task into an object's list.

Name a section that is not an object with a noun, as in `Approvals`, never `Approve requests`. See `recursica-skill-naming-terminology`.

## Future additions

**Every group in the structure must have an obvious place for content added later.** A group is any set of objects or sections that the structure places together. A structure that fits only today's content is a defect, not an item to revisit later. Nobody comes back to fix the structure. New content then goes into any place in the structure that has room.

**Test the structure for future additions before the object map is agreed.** Ask the product owner what is likely to be added next. Check that the object map says where each addition would go, without moving any part of the structure that is already there.

## Set by the theme or the component

- **The sections that are not objects.** The product owner decides which sections exist, through the request.
- **The name of each object and section.** The personas' words decide the names. See `recursica-skill-naming-terminology`.

## Out of scope

- **The display of related objects on a detail page**, as tabs, sections or tables. See `recursica-skill-tabs`, `recursica-skill-screen-scaffolding` and `recursica-skill-tables`.
- **The choice between a page and a panel for a detail view.** See `recursica-skill-panels-modals`.
- **The navigation pattern, item counts, nesting depth, overflow, breadcrumbs and routing.** See `recursica-skill-navigation`.
- **Page composition and the content that ranks highest on a screen.** See `recursica-skill-screen-scaffolding` and `recursica-skill-screen-priority`.
- **Search, filters and sorting within a list.** See `recursica-skill-filters` and `recursica-skill-tables`.
- **Database design.** The object map describes the objects the persona works with. How the database stores the objects is not a UI concern.

## Open questions

- **How a parent's related objects appear on the parent's detail page.** No skill decides yet between tabs, sections and links for the related objects.
- **The order of items within a level.** The order could follow how often people use each item, the alphabet, or the workflow. The order of items is also an open question in `recursica-skill-navigation`.
- **An object that exists only once per account**, such as the organization's own profile. No rule says whether such an object is top level, a setting, or in another place.
- **How deep objects may nest**, as in the adjustments on an order's line items, before the deepest object needs a separate place.
- **Whether the structure may differ by role.** `recursica-skill-naming-terminology` covers different words for different roles. No skill covers different structures for different roles.
- **What happens to routes when the object map changes after launch.** No rule says whether old routes redirect, or what happens to a section that is removed.

## Pre-flight checklist

- [ ] An object map was written and approved with the brief, before any code was written.
- [ ] Every object on the object map has its own identity and more than one instance. No property, filtered view or action is on the object map as an object.
- [ ] The objects and groupings come from the personas' work: the terms of the personas' field, how the work is done outside software, and products the personas already use. The objects and groupings do not come from the database or the team's shorthand.
- [ ] Every object is reachable where the object map says, and nothing the persona can reach is missing from the object map.
- [ ] Only an object that people look for by itself, across all of the object's parents, has a top-level navigation item.
- [ ] No object that only makes sense inside another object has a top-level navigation item. The persona reaches each such object from the object's parent.
- [ ] An object with several parents is reachable from each parent, has one detail route of its own, and is never copied into each parent.
- [ ] Every section that is not an object came from the request, and the object map records where the section came from. No section that is not an object was invented.
- [ ] The object map says where the next likely addition would go, without moving any part of the structure that is already there.
- [ ] No decision made with this skill set how any part of the application looks. The choice of tabs, sections, page or panel was left to the skills that own each choice.
- [ ] Open questions were asked about, not decided: how a parent's related objects appear on the parent's detail page, the order of items within a level, an object that exists only once per account, how deep objects may nest, whether the structure may differ by role, and what happens to routes when the object map changes.
