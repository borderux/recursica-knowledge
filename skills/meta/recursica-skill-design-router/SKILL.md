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

## What counts as knowledge

**The `SKILL.md` files are the knowledge. Nothing else in the repository is.**

This repository holds more than the skill family — website content, build scripts, packaging templates, workflow configuration, and working notes all live alongside it. None of that is guidance for building a UI.

**Use, always:**

- **`skills/meta/`** — this file. Load it first, before any other Recursica skill.
- **`skills/design-rules/`** — the house rules for composition. These are recorded from the team directly.
- **`skills/psychology/`** — the basis and the limits of those rules.
- **`skills/components/`** — one skill per component: what exists, how to use it, how to make it accessible.

**Never use as a source:**

- **`DOCS.md`, anywhere.** These are the design-system website's published pages — marketing-adjacent copy, spec imagery, and anatomy diagrams written for humans browsing a site. Some of it is out of date, and some of it contradicts the rules in these skills. **Do not read a `DOCS.md` to answer a build question, and do not cite one.** Everything a build agent needs from a component has already been distilled into that component's `SKILL.md`.
- **`docs/` generally**, including contribution guides and the open-questions record. Those are for the humans maintaining this repository.
- **`template/`, `scripts/`, `spec/`, `scratch/`, `n8n/`, `dist/`.** Packaging and tooling.
- **Another design system.** Material, Carbon, Mantine, and the rest are not authorities here. Where a Recursica skill is silent, the answer is to ask — not to import a convention from elsewhere.

**Load the whole family, not one file.** A component skill tells you what the component is and how to make it accessible; it does not tell you whether that component belongs on the screen. That answer is in a design-rules skill. Working from a component skill alone is the most common way to produce something that is individually correct and collectively wrong.

## The styling escape hatch is a gap report, not a permission

The component adapters expose a styling escape hatch. **Its name makes it sound like an override. Treat it as a signal instead**, and run this test before using it:

**Is there a prop or a token for what you are trying to change?**

- **Yes — then you are overriding something the component owns, and that is forbidden.** Every component skill lists these under `Not your decision`. Stop, and use the prop.
- **No — then you are filling in for a missing prop or token.** That is the ordinary reason the hatch gets used, and the important part is what you do next: **the missing prop or token is a gap in the design system, and it must be reported.** Using the hatch quietly and moving on is how a gap becomes permanent and invisible.

**Either way, reaching for it means something is wrong** — either your approach or the system. Say which, and say it in the same breath as the code.

**It is never a way to produce a component that does not exist.** A badge given a forced width to act as a bar in a chart is not a filled-in prop; it is a missing component wearing another component's clothes. See `recursica-skill-data-visualization`.

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
| 11  | Any date, time, currency, or numeric value on screen                                                   | `recursica-skill-dates-and-currency`               |
| 12  | Any count — nav items, options, chips                                                                  | `recursica-skill-working-memory`                   |
| 13  | What the application says back — success, failure, waiting, banner vs. toast                           | `recursica-skill-feedback-messaging`               |
| 15  | Headings, emphasis, abbreviations, and the markup under the visual hierarchy                           | `recursica-skill-typography-semantics`             |
| 16  | Empty, loading, error, and partial states                                                              | **No skill yet — ask**                             |

**Two ordering rules worth stating outright:**

- **Decide the object before the components.** Almost every misapplied control traces back to skipping step 1. The data's shape picks the control; you cannot know the shape without knowing the object.
- **Decide routing before layout.** Whether something is a location changes whether it is a page, a tab, a panel, or a modal — and that decision cascades.

## Precedence when rules collide

Apply in order. The first rule that settles the conflict wins.

1. **The design system beats every skill.** Anything the components own — spacing, color, type, focus states, keyboard behavior inside a control — is not a decision. If a rule appears to ask you to style a component, you have misread it.

   **But a library default is not a house rule, and must never be construed as one.** The components are adapters over Mantine, Material, or whatever library sits underneath. What that library does by default carries no authority here. Where a default disagrees with a house rule, **the house rule wins and the default is a defect to report** — not evidence that the rule is wrong or that the behavior is intended. The panel is the live example: it wraps a drawer that defaults to modal, while the house rule is that a panel is non-modal. Verify behavior in the running application rather than inferring it from what the library usually does.

2. **A prohibition beats a permission.** `NEVER` and `MUST NOT` outrank "may", "is fine", and "acceptable". If one skill forbids what another allows, the prohibition holds.
3. **A design-rules or psychology skill beats a component skill.** This one settles most real conflicts, so apply it before reaching for the rest. The design-rules skills are recorded from the team; the component skills were assembled from the token inventory around them. Where the two disagree about **composition** — whether a component belongs here, how many are allowed, what may contain what, when one control replaces another — the design-rules skill is correct and the component skill has a defect. Follow the design rule, and say that the component skill needs fixing.

   The component skill still wins on exactly one thing: **what variants and states actually exist.** A design rule that implies a capability the component does not have is a gap to raise, not a licence to invent the capability.

4. **The more specific surface wins, within a tier.** A rule about one control beats a general rule about all controls. A segmented control caps at 2–5 even though the general option ceiling is 7 ± 2, because the segmented control's own rule is narrower. This does not promote a component skill over a design rule — that is settled above.
5. **The skill that names the surface owns it.** When two skills both seem to apply, the one whose description names that surface is authoritative; the other is context.
6. **A stated house rule beats an outside convention.** Widely accepted practice from elsewhere does not override a Recursica rule, and is never a reason to relax one. If the house rule looks wrong, say so and ask — do not route around it.
7. **A later clarification beats an earlier general statement** — but only for wording and scope. If the substance genuinely conflicts, ask rather than assuming the newer text won.

**Never average two rules into a compromise.** Picking a midpoint between conflicting constraints produces a design neither rule sanctions.

## Before you ask — check the cross-surface conventions

**`recursica-skill-system-conventions`** carries four conventions generalized from the topic skills: one behavioral mode per system, the unadvertised affordance, never carrying meaning in a single channel, and fixing the structure instead of the symptom. When no topic skill covers a decision, check there before treating it as unowned. It is the house position on novel surfaces.

## What has no owner yet

**Two kinds of gap, in two places.** Each topic skill carries its own `Uncovered — ask, do not invent` section for holes inside a topic it otherwise owns — unsortable column types, badge count caps, chart empty states, and so on. Check the owning skill's list first.

The list below is the other kind: **whole topics with no owning skill at all.** Both kinds get the same treatment — **ask rather than inventing an answer** — and both lists shrink as topics are recorded.

- **Behavior below desktop.** Several skills defer to "a real space constraint" or "mobile" without defining what happens there. This is the most frequently hit gap. Two exceptions: `recursica-skill-data-visualization` states that a chart adapts rather than shrinks, keeps the same story, and discloses omitted information; and `recursica-skill-panels-modals` states that below the tablet breakpoint every panel opens as a page instead. Those two are the only places a below-desktop rule exists.
- **Empty, loading, error, and partial states**, including the difference between "no data yet" and "no results for these filters". Dashboards are the exception: `recursica-skill-dashboards` forbids an empty dashboard and requires a dismissible first-run element.
- **Page scaffold** — the standard composition of a page: title, breadcrumb, primary action, filters, content. Note that `recursica-skill-typography-semantics` requires exactly one H1, present even when hidden.
- **Naming and terminology** — object naming, title vs. sentence case, consistency between nav label, page title, and table header. `recursica-skill-typography-semantics` sets AP style as the copy standard but does not settle case conventions.
- **Live regions** — which dynamic updates are announced to assistive technology and how urgently. Deferred in the typography session and not picked up in the feedback session; individual component skills state their own announcement requirements, but there is no cross-surface policy.
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
- [ ] Every source used was a `SKILL.md`. No `DOCS.md` was read, cited, or treated as guidance, and no convention was imported from another design system.
- [ ] Both layers were loaded for every component placed: the component skill for what it is, and the design-rules skill for whether it belongs.
- [ ] The object the screen is about was identified before any component was chosen.
- [ ] Routing was decided before layout.
- [ ] Every decision in the table above was either made under its owning skill or raised as a question.
- [ ] The owning skill was actually loaded and read for each decision — not recalled from memory.
- [ ] No conflict between rules was resolved by preference, averaging, or silence.
- [ ] No gap in the rules was filled by invention or outside convention; the owning skill's uncovered list and `recursica-skill-system-conventions` were both checked first.
- [ ] Every open question was put to the user before building, with options.
- [ ] Any answer the user gave was offered back as an addition to the owning skill.
- [ ] Non-happy states were addressed or explicitly raised as unowned.
