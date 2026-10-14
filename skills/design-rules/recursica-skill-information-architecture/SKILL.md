---
name: recursica-skill-information-architecture
description: House rules for an application's structure — objects and how objects relate, the object map approved before building, which objects get a top-level navigation item, where a child object or an object with several parents lives, sections that are not objects, and future additions. Use when planning an app's sections or a multi-screen flow, or deciding where any part of an app belongs. Not for navigation patterns — see recursica-skill-navigation.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.2.0
---

# Information architecture

Treat each house rule for an application's structure as a constraint. The house rules are opinions, not neutral best practices. The house rules cover two questions:

- which objects the application is about, and how the objects relate, such as a customer who has orders
- where the persona can reach each object, such as from a top-level navigation item or from an order's detail page

The rules assume **complex enterprise web applications, designed for desktop first**. The personas come back every day and know the field the personas work in. This skill decides what exists in the structure and what the persona can reach from where. The skills listed under "Out of scope" decide how the structure is shown on a screen.

## The three governing principles

1. **Settle the objects first, then the screens.** An object is a kind of item the persona works with, and would point at and name. For example, an order, a customer and an invoice are objects. Before deciding any screen, settle two questions:

   - which objects the application is about
   - how the objects relate, such as "a customer has many orders"

   Every screen shows one object or many objects. A mistake in the list of objects becomes a mistake in the structure.

2. **Use the persona's objects, not the database's objects.** Take the objects, and the way the objects are grouped, from how the personas already arrange the work. That arrangement is the personas' mental model (what a person expects, based on the tools and work the person already knows). The mental model comes from three places:

   - how the work is done outside software
   - the terms of the personas' own field
   - products the personas already use

   **NEVER take the objects or the groupings from the team's shorthand or from how the database stores the data.** A database table is not an object merely because the table exists. One object can span several database tables. For example, the database can store one order in an Orders table and an Order addresses table.

3. **Decide what the persona can reach from where, not how the structure looks.** For example, this skill decides that the persona reaches an order's line items from the order. The order's page can show the line items in a tab, a section or a table. The skills for tabs, page sections and tables make that choice.

## What counts as an object

**An object has a separate identity and separate properties, and more than one instance of the object exists.** An instance is one item of the object's kind, such as order 1042. Test whether a persona would point at one instance and say "that one", by the instance's name, number or title.

A property, a filtered view or an action is not an object. A property, a filtered view or an action must not get a separate place in the structure. A navigation item and a section are examples of places in the structure.

- **A property of an object.** A status, a date or an owner is a column in the object's table, not a section. See `recursica-skill-tables`.
- **A filtered view of an object.** Show one object type as one table with a filter, never as a second section. For example, overdue orders are orders. Show overdue orders with a filter on the Orders table, not in an Overdue orders section. See `recursica-skill-tables`.
- **An action.** Approving, exporting and importing are actions the persona takes on an object. An action is a button, not a place in the structure. See `recursica-skill-buttons-links`.

**Find the objects in the request and the interview.**

- In the request, look for the nouns the request keeps returning to.
- In the interview, look for the domain model (the core objects, how the objects relate, and what identifies each object).
- When the personas call an object by a different word than the request uses, use the personas' word. See `recursica-skill-names-and-terms`.
- When a concept might be an object or might be a property of an object, confirm with the user. For example, a shipping address might be an object or a property of an order.

**Choose the kind of screen by how many objects the screen shows: one or many.**

- A screen that shows many objects of one type is a list, such as the list of orders. A list is a table by default. See `recursica-skill-tables`.
- A screen that shows one object, such as order 1042, is the object's detail view. A detail view opens on a separate page or in a panel beside the list. The context test in `recursica-skill-panels-modals` decides between the page and the panel.

## The object map

**Before any screen or code is built, write an object map. Confirm the object map with the user as part of the brief for the work.** When nobody agreed on the structure, the team argues about the structure again on every screen. When the structure changes after screens exist, every screen has to change.

For each object, the object map names:

- **the related objects**: the object's parent or parents, and the object's children. An order's parent is a customer, and an order's children are line items.
- **where the object lives**: a top-level navigation item, or under which parent or parents
- **where the persona reaches the object's list and the object's detail view**

The object's list is a location, and the object's detail view is a location. Every location has a route. See `recursica-skill-navigation`.

The object map also lists **every section that is not an object**, such as Settings. The object map records where each section came from. See "Sections that are not objects" below.

A short table is enough for the object map:

| Object    | Relates to                       | Lives                           | Reached at                                                   |
| --------- | -------------------------------- | ------------------------------- | ------------------------------------------------------------ |
| Customer  | has orders                       | top level                       | list; detail                                                 |
| Order     | belongs to a customer; has items | top level                       | list; detail                                                 |
| Line item | belongs to one order             | under Order                     | from the order's detail                                      |
| Document  | belongs to orders and customers  | under Order, and under Customer | from each parent's detail; one detail route for the document |

**Check the built application against the object map.**

- The persona can reach every object on the object map where the object map says.
- Nothing the persona can reach is missing from the object map.

## Top-level navigation items

**Give a top-level navigation item only to an object that people look for by itself, across every parent.** Test whether anyone would ask for one list of every instance of the object, across all parents. For example, a persona asks "Show me all customers". Customer is therefore top level.

**Put an object that only makes sense inside a parent object under the parent. Never give the object a top-level navigation item.** For example, a line item only makes sense inside an order. A persona asks for the line items of one order, never for every line item across every order. A top-level Line items section would be a list no persona uses. The Line items section would also take a navigation item away from a section that personas do use.

**If people start to look for a child object by itself, move the child object to the top level.** For example, personas start asking for every document across every order. Moving the child object to the top level is a change to the object map. Confirm the change with the user, the same way as the object map.

`recursica-skill-navigation` makes three choices about the top-level navigation items:

- how the items are arranged
- how many top-level items there may be
- how deep the items may nest

`recursica-skill-names-and-terms` decides the name of each item.

## An object with several parents

**Make an object with several parents reachable from every parent the object belongs to. Show the same object under every parent.** For example, a document attached to three orders appears under each of the three orders. Each of the three orders leads to the same document.

**Give an object with several parents one detail route of the object's own, not one route per parent.** No parent owns the object. A change made from any parent shows under every parent.

**NEVER copy the object into each parent.** Two copies of one object disagree the first time someone edits one copy. The persona then cannot tell which copy is true.

An object with several parents still gets no top-level navigation item unless people look for the object by itself. Belonging to several parents is not the same as people looking for the object by itself. For example, the Document object in the table above lives under Order and under Customer, not at the top level.

## Sections that are not objects

Some sections are not objects, such as an approvals queue, reports or settings.

**Take each section that is not an object from the request.** The product owner may describe the work as an approvals queue, reports, settings or a similar section. In that case, make the work a section. Record each section that is not an object in the object map, with where the section came from.

**If the request says nothing about a section, confirm with the user.**

- Do not invent a section built around a task to organize the work.
- Do not force work that the request describes as a task into an object's list. For example, keep an approvals queue the request describes out of the Invoices table.

Name a section that is not an object with a noun, as in `Approvals`, never `Approve requests`. See `recursica-skill-names-and-terms`.

## Future additions

**Every group in the structure must have an obvious place for content added later.** A group is any set of objects or sections that the structure places together. For example, the top-level navigation items are a group. A structure that fits only today's content is a defect, not an item to revisit later. Nobody comes back to fix the structure. New content then goes into any place in the structure that has room.

**Test the structure for future additions before the object map is confirmed with the user.**

1. Confirm with the user what is likely to be added next.
2. Check that the object map says where each addition would go.
3. Check that each addition fits without moving any part of the structure that is already there.

## Set by the theme or the component

- **The sections that are not objects.** The product owner decides which sections exist, through the request.
- **The name of each object and section.** The personas' words decide the names. See `recursica-skill-names-and-terms`.

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
- **How deep objects may nest** before the deepest object needs a separate place. For example, adjustments sit inside a line item, and the line item sits inside an order.
- **Whether the structure may differ by role.** `recursica-skill-names-and-terms` covers different words for different roles. No skill covers different structures for different roles.
- **What happens to routes when the object map changes after launch.** No rule says whether old routes redirect, or what happens to a section that is removed.

## Pre-flight checklist

- [ ] An object map was written and confirmed with the user as part of the brief, before any code was written.
- [ ] Every object on the object map has a separate identity and more than one instance.
- [ ] No property, filtered view or action is on the object map as an object.
- [ ] The objects and groupings come from the personas' work. The sources are the personas' field terms, how the work is done outside software, and products the personas already use. The objects and groupings do not come from the database or the team's shorthand.
- [ ] Every object is reachable where the object map says. Nothing the persona can reach is missing from the object map.
- [ ] Only an object that people look for by itself, across all of the object's parents, has a top-level navigation item.
- [ ] No object that only makes sense inside another object has a top-level navigation item. The persona reaches each such object from the object's parent.
- [ ] An object with several parents is reachable from each parent and has one detail route of the object's own. The object is never copied into each parent.
- [ ] Every section that is not an object came from the request. The object map records where each section came from. No section that is not an object was invented.
- [ ] The object map says where the next likely addition would go. The addition fits without moving any part of the structure that is already there.
- [ ] No decision made with this skill set how any part of the application looks. The choice of tabs, sections, page or panel was left to the skills that own each choice.
- [ ] Open questions were asked about, not decided: how a parent's related objects appear on the parent's detail page, the order of items within a level, an object that exists only once per account, how deep objects may nest, whether the structure may differ by role, and what happens to routes when the object map changes.
