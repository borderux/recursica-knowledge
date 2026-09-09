---
name: recursica-skill-information-architecture
description: House rules for the structure beneath an enterprise web application — what wayfinding requires, resolving the structure before the layout, a taxonomy that absorbs content added later, naming a concept the user has no model for, why standard labels beat creative ones, the signals that say the structure is wrong rather than the labels, and open versus closed card sorting. Use when organising unstructured content, deciding a product's sections, judging whether a structure will scale, or diagnosing why users cannot find things. Trigger on "IA", "information architecture", "site map", "taxonomy", "how should this be organised", "where does this belong", "users can't find it", or "card sort". Do NOT use for navigation patterns, item counts, nesting depth, or breadcrumbs — that is recursica-skill-navigation. Do NOT use for what things are called — that is recursica-skill-naming-terminology. Do NOT use for page composition — that is recursica-skill-screen-scaffolding.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Information architecture

House rules for how a product's content is divided, grouped, and made findable — the structure that every navigation pattern, page, and label is then built on top of. These are opinions, not neutral best practices. Apply them as constraints.

Context these rules assume: **complex enterprise web applications, desktop-first**, built on the Recursica design system. This skill decides how the information is organised. It does not decide how that organisation is rendered — nearly every mechanism named below has its own skill, and this file points at it rather than restating it.

## The three governing principles

1. **Wayfinding is what the architecture is for.** At any point a user must be able to answer four questions without hunting: where am I, where did I come from, what is this application for, and what is the primary action here. A structure that cannot answer all four has failed, however defensible its categories are.
2. **The structure comes from the user's world, not the product's.** Groupings and names come from the world the user already works in. A structure they recognise costs nothing to learn, and one they do not costs them every visit. What that model is made of, and where it comes from, is the next section.
3. **Change the structure; do not add a mechanism to cope with it.** When a core feature goes undiscovered, when a navigation level overflows, when a label needs a tooltip to make sense — change the grouping. Reach for the mechanism that would paper over it, and the fault stays where it is with one more thing to maintain on top. This is convention 4 in `recursica-skill-system-conventions` applied to structure; `recursica-skill-navigation` states it as its own second principle.

## What this skill owns, and where it stops

**Information architecture defines relationships, categories, labels, navigation paths, and structural priority.**

**Visual design defines affordance, aesthetic hierarchy, and brand.** These are different jobs, and the boundary matters in one direction especially: **a structural problem is never solved by a visual one.** Emphasis, colour, and a larger heading do not repair a category that is in the wrong place. See `recursica-skill-screen-priority` on establishing hierarchy without colour.

## What the user's model is, and where it comes from

**A mental model here means the way the user already expects this kind of thing to be arranged, before they ever open the product.** It is not a guess about them, and it is not the structure that seems most logical to the team. It has three sources:

1. **How the thing works outside software.** The real-world arrangement is the default for a concept the product introduces — the same source the UI components are named from.
2. **The conventions of the users' domain.** In a niche product the domain's own terms are the users' everyday terms, so a domain model is a user model. Do not translate the domain out on the grounds that an outsider would not follow it. `recursica-skill-naming-terminology` owns the wording that results.
3. **Established patterns from comparable products.** What the user has already learned elsewhere arrives pre-loaded, concepts and rules together, which is why a standard structure beats a better one nobody recognises.

**NEVER the product's internal model.** Team shorthand, project jargon, and the shape of the data are the one source that does not count, however obvious they look from the inside. They are the model of the people who built the thing, not the people using it.

**Where the model is not known, learn it before drawing the structure.** It is not inferable from the content — the content is what the team already has, arranged the way the team already thinks. An open card sort is how it is learned; see **Validating the structure** below, and `recursica-skill-design-router` on asking rather than assuming.

## Resolving the structure

**Given an unstructured pile of content, answer these in order. Each answer constrains the next:**

1. **How does the user move through this, and how do they know where they are?** The navigation comes first because it is the map everything else hangs off.
2. **What is this page, and what is the primary thing to do on it?** The page title as `H1`, and the primary contextual actions.
3. **What is the content, and what are its own contextual actions?**

**This is the order the questions get answered in, not a layout.** Where each region physically sits, how wide it is, and what surface it takes are `recursica-skill-screen-scaffolding`. What ranks highest once the structure exists is `recursica-skill-screen-priority`.

## Taxonomy

**Group along a model the user already recognises**, so they find things by pattern rather than by memory. The value of a taxonomy is that the user can predict where an unfamiliar item lives without being told.

**Build for extension.** Establish the groups from patterns broad enough that content added later has an obvious home. **A taxonomy that only fits today's content is a defect**, not a structure that will be revisited — the revisit does not happen, and new items get filed wherever there is room.

**Grouping works because recognition is cheaper than recall.** A user scanning categories should recognise where an item lives rather than remember where it was put. See `recursica-skill-working-memory` for the basis and the boundary.

**Do not justify a category count with 7 ± 2.** That ceiling governs sets the user has to hold in mind and compare; a category listing is a recognition surface, where the item-per-level ceiling exists for scannability rather than memory. The count rule that does apply is `recursica-skill-navigation`'s, and its basis and its limits are in `recursica-skill-working-memory`.

**A category that will not compress to two or three words is usually two categories.** `recursica-skill-naming-terminology` makes this point about labels — one that will not compress is usually two labels. At the structural level the same symptom means the group bundles two ideas, and the fix is to split it rather than to accept a longer name for it.

**What groups a navigation level in particular — object type first, then task, then frequency of use — is owned by `recursica-skill-navigation`.** Apply it there; this section governs the categories themselves.

**How deep the resulting structure may go is owned by `recursica-skill-navigation`.** Do not set a depth here.

## Naming a concept the user does not have

**Name a new concept from a real-world mental model**, the same way the UI components are named. Do not coin a term and expect the label to teach it — a name the user has to be taught is a name they will not recognise on the second visit either.

**Descriptive, industry-standard labels beat creative or catchy ones.** They align with what the user already expects, and the familiarity is the whole benefit: the concepts and their rules come pre-loaded. Cleverness in a structural label is a cost the user pays and the product does not recover. The mechanism is recognition rather than memory — see `recursica-skill-working-memory`.

**A label that does not say what action is about to be taken is a blocking defect.** Send the work back. **Do not resolve it by attaching a tooltip** — a tooltip gives context about the system, most often on an icon-only control, and never carries what a user needs in order to operate something. See `recursica-skill-tooltip` and `recursica-skill-icon-semantics`.

**Everything else about names is `recursica-skill-naming-terminology`** — whose vocabulary wins, singular versus plural, how far a term may be shortened, acronyms, and reconciling terms across personas.

## Wayfinding in practice

**The requirement is this skill's. The mechanisms are not.** Location is carried by the selected state in the navigation, by breadcrumbs, and by the page's own heading hierarchy — all owned by `recursica-skill-navigation`, `recursica-skill-screen-scaffolding`, and `recursica-skill-breadcrumb`.

**Where the user is must be answerable from the page itself**, not only from a highlighted item in the navigation — see governing principle 3 of `recursica-skill-navigation`. Test it by covering the nav: if the page no longer says where it sits, the H1 and the breadcrumb are not carrying their share.

## Signals the architecture is wrong

Any of these is evidence of a structural fault, not a copy or visual one:

- **Low discovery rates for core features.**
- **Users searching for items that sit in the top-level navigation.** They are routing around the structure rather than using it.
- **Poor discoverability generally** — users needing to be shown where things are.
- **Labels that do not make sense to the user.**

**Do not propose onboarding, a tour, or training as the fix.** Users do not invest in learning a structure — they satisfice with the method they already have, however costly. See `recursica-skill-discoverability` for the paradox of the active user and where it does not apply. A tour laid over a structure users cannot navigate leaves the structure in place.

**Rewriting labels is a legitimate fix only when labels are the only failure.** Where discovery is low across the board, renaming is a symptom-level change and the grouping is the thing to revisit.

## Validating the structure

**An open card sort learns the users' mental model** — how they group information, before a structure exists. Use it early, while the categories are still open questions.

**A closed card sort validates a structure that already exists.** It tests whether an established website or application organisation matches how users expect to find things.

## Not your decision

- **Affordance, aesthetic hierarchy, and brand.** Visual design's territory.
- **Sentence case versus title case, and any other type treatment.** Token-owned, and must not be modified — `recursica-skill-typography-semantics`.
- **What an object, navigation item, page title, or column is called** — `recursica-skill-naming-terminology`.
- **The navigation pattern, item counts per level, nesting depth, overflow, and selected state** — `recursica-skill-navigation`.

## Out of scope

- **Page composition, region placement, and maximum widths** — `recursica-skill-screen-scaffolding`.
- **What ranks highest on a screen and what to cut** — `recursica-skill-screen-priority`, which also owns progressive disclosure, with `recursica-skill-discoverability` behind it.
- **Whether a task lives on a page, in a panel, or in a modal, and what gets a route** — `recursica-skill-panels-modals` and `recursica-skill-navigation`.
- **Search, filter, and sort controls, and when a collection earns a search field** — `recursica-skill-filters` and `recursica-skill-tables`.
- **Content authoring and editorial strategy.** Not a UI concern.

## Uncovered — ask, do not invent

- **When validation is required.** Both card sort methods are defined, but nothing states at what point a structure must be tested before it is built, or who runs it.
- **What counts as a low discovery rate.** The signal is named; no threshold or measurement method is given.
- **Ordering of items within a level** — frequency, alphabetical, workflow sequence. Listed as uncovered in `recursica-skill-navigation` too.
- **How many top-level sections a product should have before it is really two products.** 7 ± 2 governs items per level, not whether one architecture is being asked to cover too much.
- **Which source of the user's model wins when two disagree** — a domain convention pointing one way and a widespread pattern from comparable products pointing another. Each is a legitimate source; nothing ranks them against each other.
- **Whether the architecture may differ per persona.** `recursica-skill-naming-terminology` covers per-persona wording; nothing covers per-persona structure.
- **Whether the number of categories at a level is bounded by anything beyond the navigation item ceiling.** `recursica-skill-working-memory` sets no house ceiling outside the surfaces it lists, and a taxonomy is not one of them.
- **How a structure migrates when categories change** — whether existing URLs redirect, and what happens to a section that is dissolved.

## Pre-flight checklist

Before considering a structure done, verify:

- [ ] A user at any point can answer where they are, where they came from, what the application is for, and what the primary action is.
- [ ] Those four answers come from the page itself, not only from the navigation being visible.
- [ ] The structure was resolved in order: movement and location, then page identity and primary action, then content.
- [ ] Categories follow a model the user already recognises, not one the product invented.
- [ ] That model came from the real world, the users' domain, or an established pattern — never from team shorthand or the shape of the data.
- [ ] Where the model was unknown, it was learned rather than inferred from the content.
- [ ] Content added later has an obvious home in the existing groups.
- [ ] Any new concept is named from a real-world mental model, in standard descriptive terms rather than creative ones.
- [ ] No label is ambiguous about the action it takes, and no tooltip is patching one.
- [ ] Any category that would not compress to two or three words was split rather than given a longer name.
- [ ] No category count was justified by working-memory limits on a surface where the user only has to recognise.
- [ ] No tour, onboarding, or training was proposed as the fix for a structure users cannot navigate.
- [ ] No structural problem was answered with emphasis, colour, or a bigger heading.
- [ ] Where discovery is failing broadly, the grouping was revisited rather than only the labels.
- [ ] Nothing in the uncovered list — validation timing, discovery thresholds, item ordering, conflicting model sources, per-persona structure, migration — was decided without asking.
