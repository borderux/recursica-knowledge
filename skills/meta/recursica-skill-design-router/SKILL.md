---
name: recursica-skill-design-router
description: The entry point for building or reviewing any screen with Recursica. Establishes what to decide in what order, which skill owns each decision, how to resolve conflicts between rules, and the hard requirement to ask the user rather than guess whenever requirements compete or no rule covers the case. Load this FIRST, before any other Recursica skill, whenever asked to design, build, lay out, review, or refactor a screen, page, view, panel, or flow. Also load when two rules appear to disagree, when a requirement contradicts a house rule, when no house rule seems to cover the situation, or when deciding whether to ask a clarifying question. Trigger on "design a screen", "build a page", "lay out this view", "which skill applies", "conflicting requirements", "the rules disagree", "is there a rule for", or any UI work whose scope is larger than a single component. This skill routes and arbitrates; it never replaces the owning skill's rules.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Design router

This is the entry point to the Recursica skill family. It holds no design rules of its own. Instead, it tells you **what to decide, in what order, which skill owns each decision, what to do when rules collide, and when to stop and ask.**

Load this skill before you start. Then, as you reach each decision, load the skill that owns it.

## The three jobs of this skill

1. **Sequence** — make decisions in an order where earlier answers limit later ones.
2. **Arbitrate** — when two rules disagree, settle it with the stated order of precedence, not with personal preference.
3. **Escalate** — when requirements compete or no rule exists, ask. Never guess.

## What counts as knowledge

**The `SKILL.md` files are the knowledge. Nothing else in the repository is.**

This repository holds more than the skills. Website content, build scripts, packaging templates, workflow settings, and working notes all live here too. None of that is guidance for building a UI.

**Use, always:**

- **`skills/meta/`** — this file. Load it first, before any other Recursica skill.
- **`skills/design-rules/`** — the house rules for how a screen is put together. These come directly from the team.
- **`skills/psychology/`** — the research behind those rules, and the limits of that research.
- **`skills/components/`** — one skill per component: what exists, how to use it, and how to make it accessible.

**Never use as a source:**

- **`DOCS.md`, anywhere.** These are pages from the design-system website: marketing-style copy, spec images, and anatomy diagrams written for people browsing a site. Some of it is out of date, and some of it contradicts the rules in these skills. **Do not read a `DOCS.md` to answer a build question, and do not cite one.** Everything a build agent needs about a component is already in that component's `SKILL.md`.
- **`docs/` in general**, including the contribution guides and the open-questions record. Those are for the people who maintain this repository.
- **`template/`, `scripts/`, `spec/`, `scratch/`, `n8n/`, `dist/`.** These are packaging and tooling.
- **Another design system.** Material, Carbon, Mantine, and the rest have no authority here. When a Recursica skill says nothing about something, the answer is to ask — not to borrow a convention from somewhere else.

**Load the whole family, not one file.** A component skill tells you what a component is and how to make it accessible. It does not tell you whether that component belongs on the screen — a design-rules skill does. Working from a component skill alone is the most common way to build something where each piece is correct but the whole is wrong.

## The styling escape hatch is a gap report, not a permission

The component adapters offer a styling escape hatch. **Its name makes it sound like a way to override things. Treat it as a warning sign instead**, and ask this question before you use it:

**Is there a prop or a token (a named design value, such as a color or a size, set by the design system) for what you are trying to change?**

- **Yes — then you are overriding something the component controls, and that is forbidden.** Every component skill lists these under `Not your decision`. Stop, and use the prop.
- **No — then you are filling in for a prop or token that is missing.** That is the normal reason to use the hatch. What matters is what you do next: **the missing prop or token is a gap in the design system, and you must report it.** Using the hatch quietly and moving on is how a gap becomes permanent and invisible.

**Either way, reaching for the hatch means something is wrong** — either your approach or the system. Say which one, and say it right alongside the code.

**It is never a way to make a component that does not exist.** A badge forced to a fixed width so it can act as a bar in a chart is not a missing prop being filled in. It is a missing component dressed up as a different one. See `recursica-skill-data-visualization`.

## Never guess — ask instead

**MUST NOT settle uncertainty by quietly picking an answer.** This is the most important rule in the family. The next person to read your work cannot tell a silent guess apart from a real house rule.

Stop and ask the user when **any** of these is true:

- **Requirements compete.** The request asks for two things that cannot both be true.
- **A requirement contradicts a house rule.** Do not quietly go along with it, and do not quietly refuse it. Point out the conflict and let the user decide.
- **Two house rules disagree**, and the order of precedence below does not settle it.
- **No house rule covers the decision**, and the choice matters. See the list of unowned topics below.
- **The request is unclear** about scope, object, or intent in a way that would change what you build.

**How to ask:**

- **Ask before building, not after.** Put the question in the plan, or ask it directly. Do not build on an assumption and mention it afterward.
- **Ask with options.** Give the two or three real choices and what each one leads to, so the user can answer in one word instead of writing an essay.
- **Ask once, in a batch.** Gather the open questions and ask them together, rather than interrupting again and again.
- **Name the conflict precisely.** Quote the rules or requirements that compete. "Your spec asks for a status the user can click; the house rule is that status is never interactive" is something the user can act on. "This is ambiguous" is not.

**What is not uncertainty:** a house rule that states a default. If a skill says batch save is the default, or collapsed is the default, use it. Defaults exist so that you do not have to ask.

**When the user answers, treat the answer as new house knowledge.** Say so, and offer to add it to the skill that owns the topic. Answers that stay in a chat log get argued over again next time.

## Decision order

Work from top to bottom. Each answer limits the ones below it.

| #   | Decision                                                                                                                           | Owner                                              |
| --- | ---------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| 1   | What object is this screen about, and is it one object or many?                                                                    | **No skill yet — ask if unclear**                  |
| 2   | Is this a location? If so it needs a unique route, a URL, and a history entry                                                      | `recursica-skill-navigation`                       |
| 3   | Where does it sit in the app shell — nav pattern, nav item, breadcrumbs, page heading                                              | `recursica-skill-navigation`                       |
| 4   | The page's layout, and whether a region needs its own surface                                                                      | `recursica-skill-screen-scaffolding`               |
| 5   | Which layer each surface sits on, starting from layer 0 on the root element                                                        | `recursica-skill-layers`                           |
| 6   | What matters most on the screen, what to cut, and whether it is finished                                                           | `recursica-skill-screen-priority`                  |
| 7   | Whether anything smaller than desktop is supported at all, and at which tier — ask before choosing a nav pattern                   | `recursica-skill-responsive-behavior`              |
| 8   | Content shape: many instances of one object → a table; one object's properties → a detail or form view                             | `recursica-skill-tables` / `recursica-skill-forms` |
| 9   | Where the task lives — a panel beside the page, a modal over it, or a page of its own                                              | `recursica-skill-panels-modals`                    |
| 10  | Narrowing a collection — the filter bar, search, date ranges                                                                       | `recursica-skill-filters`                          |
| 11  | If the user enters or edits data: layout, labels, grouping, validation, save mode                                                  | `recursica-skill-forms`                            |
| 12  | For each field, which control the shape of the data calls for                                                                      | `recursica-skill-selection-controls`               |
| 13  | What the screen shows before the user touches it — open tab, applied filters, pre-filled and pre-selected values, remembered state | `recursica-skill-defaults`                         |
| 14  | Status, counts, tags, and metadata on objects                                                                                      | `recursica-skill-badges-chips`                     |
| 15  | Every clickable thing: is it an action or a navigation, how is it labeled, where does it sit                                       | `recursica-skill-buttons-links`                    |
| 16  | If it is an overview or landing screen: is it a dashboard or a workbench, and what belongs on it                                   | `recursica-skill-dashboards`                       |
| 17  | Any chart or visual display of data                                                                                                | `recursica-skill-data-visualization`               |
| 18  | Any date, time, currency, or numeric value on screen                                                                               | `recursica-skill-dates-and-currency`               |
| 19  | Any count — nav items, options, chips                                                                                              | `recursica-skill-working-memory`                   |
| 20  | What the application tells the user back — success, failure, waiting, banner vs. toast                                             | `recursica-skill-feedback-messaging`               |
| 21  | Announcing a change to assistive technology when content updates in place                                                          | `recursica-skill-live-regions`                     |
| 22  | What every object, navigation item, title, and column is called                                                                    | `recursica-skill-naming-terminology`               |
| 23  | Which icon carries which meaning, and whether it may appear without a label                                                        | `recursica-skill-icon-semantics`                   |
| 24  | Headings, emphasis, abbreviations, and the markup under the visual hierarchy                                                       | `recursica-skill-typography-semantics`             |
| 25  | Empty, loading, error, and partial states                                                                                          | **No skill yet — ask**                             |

A few terms from the table, since they come up in every skill below: a **surface** is a region that holds content, such as a page, panel, or modal. A **layer** is a numbered level that sets which colors the components inside it use; layer 0 is the page itself. A **modal** is a window that blocks the rest of the page until the user closes it. A **toast** is a short message that appears briefly and then disappears. **Assistive technology** means tools such as screen readers that help people with disabilities use a computer.

**Two ordering rules worth saying outright:**

- **Decide the object before the components.** Almost every wrong choice of control goes back to skipping step 1. The shape of the data picks the control, and you cannot know the shape without knowing the object.
- **Decide routing before layout.** Whether something is a location decides whether it is a page, a tab, a panel, or a modal — and that decision affects everything after it.

## Precedence when rules collide

Apply these in order. The first one that settles the conflict wins.

1. **The design system beats every skill.** Anything the components control — spacing, color, type, focus states, keyboard behavior inside a control — is not your decision. If a rule seems to ask you to style a component, you have misread it.

   **But a library's default is not a house rule, and you must never treat it as one.** The components are adapters built on top of Mantine, Material, or whatever library sits underneath. What that library does by default has no authority here. When a default disagrees with a house rule, **the house rule wins, and the default is a defect to report** — not proof that the rule is wrong or that the behavior is on purpose. The panel is a live example: it wraps a drawer that is modal by default, while the house rule is that a panel is non-modal (it leaves the rest of the page usable). Check the behavior in the running application instead of assuming it from what the library usually does.

2. **A prohibition beats a permission.** `NEVER` and `MUST NOT` outrank "may", "is fine", and "acceptable". If one skill forbids something another skill allows, the prohibition holds.
3. **A design-rules or psychology skill beats a component skill.** This rule settles most real conflicts, so apply it before the ones below. The design-rules skills come from the team. The component skills were put together from the list of tokens around them. When the two disagree about **composition** — whether a component belongs here, how many are allowed, what may contain what, when one control should replace another — the design-rules skill is correct and the component skill has a defect. Follow the design rule, and say that the component skill needs fixing.

   The component skill still wins on exactly one thing: **which variants (versions of a component, such as solid or outline buttons) and states actually exist.** A design rule that assumes a capability the component does not have is a gap to raise. It is not permission to invent that capability.

4. **The more specific surface wins, within the same tier.** A rule about one control beats a general rule about all controls. For example, a segmented control is capped at 2–5 options even though the general limit is 7 ± 2, because the segmented control's own rule is narrower. This does not raise a component skill above a design rule — rule 3 already settles that.
5. **The skill that names the surface owns it.** When two skills both seem to apply, the one whose description names that surface is in charge; the other is background.
6. **A stated house rule beats an outside convention.** Common practice from elsewhere does not override a Recursica rule, and it is never a reason to loosen one. If the house rule looks wrong, say so and ask — do not work around it.
7. **A later clarification beats an earlier general statement** — but only on wording and scope. If the substance really conflicts, ask instead of assuming the newer text wins.

**Never average two rules into a compromise.** Splitting the difference between two conflicting rules produces a design that neither rule allows.

## Before you ask — check the cross-surface conventions

**`recursica-skill-system-conventions`** holds six conventions drawn from across the topic skills: one behavioral mode per system; the unadvertised affordance (a control that is deliberately not promoted); never carrying meaning in a single channel (a way of carrying meaning, such as color, shape, position, or text); fixing the structure instead of the symptom; a visible container must be earned; and one control, one outcome. When no topic skill covers a decision, check there before treating the decision as unowned. It is the house position on surfaces nobody has designed before.

## What has no owner yet

**There are two kinds of gap, kept in two places.** Each topic skill has its own `Uncovered — ask, do not invent` section for holes inside a topic it otherwise owns — column types that cannot be sorted, limits on badge counts, empty states for charts, and so on. Check the owning skill's list first.

The list below is the other kind: **whole topics that no skill owns yet.** Both kinds get the same treatment — **ask instead of inventing an answer** — and both lists get shorter as topics are recorded.

- **Empty, loading, error, and partial states.** Three parts are settled and the rest is not. A loading page shows nothing, and skeletons are forbidden (`recursica-skill-screen-scaffolding`). "No rows returned" and "could not fetch" get different messages (`recursica-skill-screen-priority`). A filter that returns zero results is different from never having had data (`recursica-skill-filters`). What is still open is the layout, the wording, and whether an empty state (what a screen shows when there is no data yet) may include an action — including the difference between "no data yet" and "no results for these filters". Dashboards are the exception: `recursica-skill-dashboards` forbids an empty dashboard and requires a first-run element the user can dismiss.
- **Motion** — anything beyond "do not animate a badge when its status changes". `recursica-skill-icon-semantics` also leaves open whether an icon may animate.
- **Alignment across sections** — whether separate areas of an application use the same names for things and the same workflows. `recursica-skill-screen-priority` gives the criteria for a breach, and says this is a review pass run after design. The family still needs a skill for it, possibly run by a dedicated agent.
- **Scan patterns and eye-tracking research** — marked as belonging in `skills/psychology/` with citations, and not gathered yet.
- **The layout grid** — eight or twelve columns, the gutters, and what elements line up to. `recursica-skill-screen-scaffolding` requires lining up to a grid, and openly leaves the grid itself to a skill that does not exist yet. Layers are settled and owned by `recursica-skill-layers`; the grid is not.

## Reading the rules correctly

**Hedges are not permissions.** The skills use graded language on purpose: `MUST`, `NEVER`, "prefer", "avoid", "typically". "Avoid" means do not do it unless you have a specific reason you can state. It does not mean the choice is open.

**Silence is not permission either.** A topic the skills do not mention has no rule. That does not mean it is allowed. That is what the unowned list and the requirement to ask are for.

**Reasons extend; rules do not.** When a skill gives the reason for a rule, use that reason to apply the rule to cases the text does not mention. When it gives no reason, do not stretch the rule — ask.

## Pre-flight checklist

Before starting, and again before declaring the work done:

- [ ] You loaded this skill before any other Recursica skill.
- [ ] Every source you used is a `SKILL.md`. You did not read, cite, or follow any `DOCS.md`, and you did not bring in a convention from another design system.
- [ ] For every component on the screen, you loaded both skills: the component skill for what it is, and the design-rules skill for whether it belongs.
- [ ] You named the object the screen is about before you chose any component.
- [ ] You decided routing before layout.
- [ ] Every decision in the table above is either made using its owning skill or raised with the user as a question.
- [ ] For each decision, you loaded and read the owning skill, rather than working from memory.
- [ ] When two rules conflicted, you did not settle it by preference, by averaging them, or by saying nothing.
- [ ] When the rules had a gap, you did not fill it by inventing an answer or borrowing an outside convention. You checked the owning skill's uncovered list and `recursica-skill-system-conventions` first.
- [ ] You asked the user every open question before building, and gave options with each one.
- [ ] For each answer the user gave, you offered to add it to the owning skill.
- [ ] You handled the non-happy states (empty, loading, error, and partial), or told the user that no skill owns them yet.
