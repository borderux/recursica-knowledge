---
name: recursica-skill-design-router
description: The entry point for building or reviewing any screen with Recursica. Establishes what to decide in what order, which skill owns each decision, how to resolve conflicts between rules, and the hard requirement to ask the user rather than guess whenever requirements compete or no rule covers the case. Load this FIRST, before any other Recursica skill, whenever asked to design, build, lay out, review, or refactor a screen, page, view, panel, or flow. Also load when two rules appear to disagree, when a requirement contradicts a house rule, when no house rule seems to cover the situation, or when deciding whether to ask a clarifying question. Trigger on "design a screen", "build a page", "lay out this view", "which skill applies", "conflicting requirements", "the rules disagree", "is there a rule for", or any UI work whose scope is larger than a single component. This skill routes and arbitrates; it never replaces the owning skill's rules.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Design router

The entry point to the Recursica skill family. This skill contains no design rules of its own. It tells you **what to decide, in what order, which skill owns the decision, what to do when rules collide, and when to stop and ask.**

Load this before you start. Then load the owning skill for each decision as you reach it.

## The three jobs of this skill

1. **Sequence** — decide things in an order where earlier answers constrain later ones.
2. **Arbitrate** — when two rules disagree, resolve it by a stated precedence, not by preference.
3. **Escalate** — when requirements compete or no rule exists, ask. Never guess.

## Never guess — ask instead

**MUST NOT resolve uncertainty by choosing silently.** This is the most important rule in the family, because a silent guess is indistinguishable from a house rule to the next reader.

Stop and ask the user when **any** of these is true:

- **Requirements compete.** The request asks for two things that cannot both hold.
- **A requirement contradicts a house rule.** Do not quietly comply and do not quietly refuse — surface the conflict and let the user decide.
- **Two house rules disagree** and the precedence order below does not settle it.
- **No house rule covers the decision** and the choice is consequential. See the unowned list below.
- **The request is ambiguous** about scope, object, or intent in a way that changes the output.

**How to ask:**

- **Ask before building, not after.** Put the question in the plan, or ask it directly. Do not build on an assumption and disclose it afterward.
- **Ask with options.** Offer the two or three real candidates with their consequences, so the answer is one word rather than an essay.
- **Ask once, in a batch.** Collect the open questions and ask them together rather than interrupting repeatedly.
- **Name the conflict precisely.** Quote the competing rules or requirements. "Your spec asks for a status the user can click; the house rule is that status is never interactive" is actionable. "This is ambiguous" is not.

**What is not uncertainty:** a house rule that states a default. If a skill says batch save is the default, or collapsed is the default, apply it. Defaults exist so you do not have to ask.

**When the user answers, treat the answer as new house knowledge.** Say so, and offer to fold it into the owning skill. Answers that stay in a chat log get re-litigated next time.

## Decision order

Work top to bottom. Each answer constrains the ones below it.

| #   | Decision                                                                                               | Owner                                              |
| --- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------- |
| 1   | What object is this screen about, and is it one object or many?                                        | **No skill yet — ask if unclear**                  |
| 2   | Is this a location? If so it needs a unique route, a URL, and a history entry                          | `recursica-skill-navigation`                       |
| 3   | Where does it sit in the app shell — nav pattern, nav item, breadcrumbs, page heading                  | `recursica-skill-navigation`                       |
| 4   | Content shape: many instances of one object → a table; one object's properties → a detail or form view | `recursica-skill-tables` / `recursica-skill-forms` |
| 5   | If the user enters or edits data: layout, labels, grouping, validation, save mode                      | `recursica-skill-forms`                            |
| 6   | For each field, which control the data shape demands                                                   | `recursica-skill-selection-controls`               |
| 7   | Status, counts, tags, and metadata on objects                                                          | `recursica-skill-badges-chips`                     |
| 8   | Every clickable thing: is it an action or a navigation, how is it labeled, where does it sit           | `recursica-skill-buttons-links`                    |
| 9   | If it is an overview or landing screen: is it a dashboard or a workbench, and what belongs on it       | `recursica-skill-dashboards`                       |
| 10  | Any chart or visual data display                                                                       | `recursica-skill-data-visualization`               |
| 11  | Any count — nav items, options, chips                                                                  | `recursica-skill-working-memory`                   |
| 12  | Empty, loading, error, and partial states                                                              | **No skill yet — ask**                             |

**Two ordering rules worth stating outright:**

- **Decide the object before the components.** Almost every misapplied control traces back to skipping step 1. The data's shape picks the control; you cannot know the shape without knowing the object.
- **Decide routing before layout.** Whether something is a location changes whether it is a page, a tab, a panel, or a modal — and that decision cascades.

## Precedence when rules collide

Apply in order. The first rule that settles the conflict wins.

1. **The design system beats every skill.** Anything the components own — spacing, color, type, focus states, keyboard behavior inside a control — is not a decision. If a rule appears to ask you to style a component, you have misread it.
2. **A prohibition beats a permission.** `NEVER` and `MUST NOT` outrank "may", "is fine", and "acceptable". If one skill forbids what another allows, the prohibition holds.
3. **The more specific surface wins.** A rule about one control beats a general rule about all controls. A segmented control caps at 2–5 even though the general option ceiling is 7 ± 2, because the segmented control's own rule is narrower.
4. **The skill that names the surface owns it.** When two skills both seem to apply, the one whose description names that surface is authoritative; the other is context.
5. **A stated house rule beats an outside convention.** Widely accepted practice from elsewhere does not override a Recursica rule, and is never a reason to relax one. If the house rule looks wrong, say so and ask — do not route around it.
6. **A later clarification beats an earlier general statement** — but only for wording and scope. If the substance genuinely conflicts, ask rather than assuming the newer text won.

**Never average two rules into a compromise.** Picking a midpoint between conflicting constraints produces a design neither rule sanctions.

## What has no owner yet

These come up constantly and no house rule covers them. **Ask rather than inventing an answer**, and expect this list to shrink as topics are recorded.

- **Behavior below desktop.** Four skills defer to "a real space constraint" or "mobile" without defining what happens there. This is the most frequently hit gap. The one exception is charts: `recursica-skill-data-visualization` states that a chart adapts rather than shrinks, keeps the same story, and discloses omitted information.
- **Empty, loading, error, and partial states**, including the difference between "no data yet" and "no results for these filters". Dashboards are the exception: `recursica-skill-dashboards` forbids an empty dashboard and requires a dismissible first-run element.
- **Page scaffold** — the standard composition of a page: title, breadcrumb, primary action, filters, content.
- **Feedback and messaging** — toast vs. inline vs. banner vs. modal, and whether success needs confirming at all. Only undo-toast is specified.
- **Naming and terminology** — object naming, title vs. sentence case, consistency between nav label, page title, and table header.
- **Icon semantics** — when an icon is allowed and which icon carries which meaning.
- **Motion** — beyond "do not animate a badge on status change".
- **Defaults** — which tab opens, and defaults on any surface other than a table. Table sort order and rows per page are settled in `recursica-skill-tables`.

## Reading the rules correctly

**Hedges are not permissions.** The skills use graded language deliberately: `MUST`, `NEVER`, "prefer", "avoid", "typically". "Avoid" means do not do it absent a specific reason you can state. It does not mean the choice is open.

**Absence is not permission either.** A topic the skills do not mention has no rule — it is not implicitly allowed. That is what the unowned list and the ask requirement are for.

**Rationale generalizes; rules do not.** Where a skill gives the reason for a rule, use the reason to extend it to cases the text does not cover. Where it gives no reason, do not extrapolate — ask.

## Pre-flight checklist

Before starting, and again before declaring the work done:

- [ ] This skill was loaded before any other Recursica skill.
- [ ] The object the screen is about was identified before any component was chosen.
- [ ] Routing was decided before layout.
- [ ] Every decision in the table above was either made under its owning skill or raised as a question.
- [ ] The owning skill was actually loaded and read for each decision — not recalled from memory.
- [ ] No conflict between rules was resolved by preference, averaging, or silence.
- [ ] No gap in the rules was filled by invention or outside convention.
- [ ] Every open question was put to the user before building, with options.
- [ ] Any answer the user gave was offered back as an addition to the owning skill.
- [ ] Non-happy states were addressed or explicitly raised as unowned.
