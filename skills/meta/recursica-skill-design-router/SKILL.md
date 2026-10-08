---
name: recursica-skill-design-router
description: Start here for any Recursica screen work. The router says what to decide in what order, which skill owns each decision, which rule wins when two rules conflict, and when to confirm with the user instead of guessing. Load the router first to design, build, review, or refactor a screen, page, panel, or flow, or when rules seem to disagree or no rule applies. The router routes, and the owning skill holds the rules.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Design router

**Load the design router first, before any other skill in the Recursica skill family.** Load the router before starting work. Then, at each decision, load the skill that owns the decision.

The router holds no design rules. The router says:

- what to decide, and in what order
- which skill owns each decision
- what to do when rules conflict
- when to stop and confirm with the user

## The router's three jobs

1. **Put the decisions in order.** Make decisions in an order where each earlier answer limits the later answers.
2. **Settle conflicts.** If two rules disagree, settle the conflict with the order of precedence below, not with personal preference.
3. **Confirm with the user.** If requirements compete or no rule exists, confirm with the user. Never guess.

## Sources of knowledge

**Treat the `SKILL.md` files as the knowledge. Nothing else in the repository is knowledge.**

The repository also holds website content, build scripts, packaging templates, workflow settings and working notes. None of those other files is guidance for building a UI.

**Always use these folders:**

- **`skills/meta/`** — the design router. Load the router first, before any other Recursica skill.
- **`skills/design-rules/`** — the house rules for how a screen is put together. The house rules come directly from the team.
- **`skills/psychology/`** — the research behind the house rules, and the limits of that research.
- **`skills/components/`** — one skill per component: what exists, how to use the component, and how to make the component accessible.

**Never use these sources:**

- **Every `DOCS.md` file, in any folder.** **Do not read a `DOCS.md` to answer a build question, and do not cite one.** A `DOCS.md` file is a page from the design-system website. The page holds marketing-style copy, spec images and anatomy diagrams, written for people browsing the website. Some `DOCS.md` content is out of date, and some contradicts the rules in the skills. A component's `SKILL.md` holds all the guidance a build agent needs about the component.
- **`docs/` in general**, including the contribution guides and the open-questions record. The `docs/` folder is for the people who maintain the repository.
- **`template/`, `scripts/`, `spec/`, `scratch/`, `n8n/`, `dist/`.** These folders hold packaging and tooling.
- **Another design system.** No other design system has authority in Recursica. If the Recursica skills are silent on a topic, confirm with the user. Do not borrow a convention from outside Recursica.

**Load the whole skill family, not one file.** A component skill says what a component is and how to make the component accessible. A design-rules skill says whether the component belongs on the screen. In some designs, each piece is correct and the whole design is wrong. The most common cause of such a design is working from a component skill alone.

**If the full text fits, read every skill in the family in full.** Use a shorter form only when the whole family does not fit beside the work in progress. A skill's prose explains how to apply each rule. Builders who read the prose apply the rules better than builders who work from the checklists alone. The difference is largest for the accessibility rules. The difference holds even when every rule was in the checklist.

The shorter form of a skill is the skill's pre-flight checklist and open questions. For a component skill, the shorter form also includes three sections:

- the "When not to use" table
- the "Variants" section (the inventory of parts, styles, sizes and states)
- the "Accessibility" section

If working from the shorter form, read any other section of the skill in each of these cases:

- A checklist item is unclear.
- Two checklist items seem to conflict.
- A decision is about to be made that the skill may cover.

Load a skill linked under "Only if used on the same screen" only if the screen uses the component the linked skill covers. The "Only if used on the same screen" heading sits in a skill's "Related skills" list. The links under the heading are alternatives and neighbors. The rule holds for the full text and for the shorter form.

When loading the skills from the Recursica knowledge server, `skill_family` returns the full text by default. `skill_family` with `detail: "contract"` returns the shorter form, without the Accessibility sections. `skill_section` returns any one section.

## Names from other design systems

**Translate every name from another design system to the Recursica component, and build the Recursica component.** Recursica has one name for each component. Other design systems use other names for the same components. A request, a design file or a stakeholder may use another system's name. Never treat another system's name as a component Recursica lacks.

| Name in another design system     | Recursica component                               |
| --------------------------------- | ------------------------------------------------- |
| pill, tag, lozenge                | chip or badge: see `recursica-skill-badges-chips` |
| snackbar                          | toast                                             |
| drawer, side sheet                | panel                                             |
| dialog                            | modal                                             |
| select                            | dropdown                                          |
| combobox, typeahead               | autocomplete                                      |
| spinner                           | loader                                            |
| toggle                            | switch                                            |
| checklist                         | checkbox group                                    |
| button group, toggle button group | segmented control                                 |
| wizard                            | stepper                                           |
| data grid                         | table                                             |
| dual list box                     | transfer list                                     |
| drop zone                         | file upload                                       |

If a name is not in the table, find the Recursica component whose skill describes the same use. If no component fits, confirm with the user.

## Style overrides

**Treat a style override as a gap to report, not as a permission.** A style override is the way an adapter (the Recursica component library for one framework, such as Mantine or Angular Material) offers for code to override a component's styles directly. A style override is also called the styling escape hatch. The name "escape hatch" makes a style override sound like an allowed way to change styles. Treat a style override as a warning sign instead. Before overriding a style, answer one question:

**Is there a setting or a token (a named design value, such as a color or a size, set by the design system) for the property being changed?**

- **Yes: the override changes a property the component controls, and the override is forbidden.** Stop, and use the setting. Every component skill lists the properties the component controls under "Styling set by tokens".
- **No: the override fills in for a missing setting or token.** A missing setting or token is the normal reason for a style override. The missing setting or token is a gap in the design system. The gap must be reported, and reporting the gap is the most important step. A style override made without a report hides the gap from everyone, and the gap becomes permanent.

**Beside every style override in the code, say whether the problem is in the approach or the design system.** In both cases, a style override means a problem exists.

**Never use a style override to make a component that does not exist.** For example, a badge might be forced to a fixed width to act as a bar in a chart. The fixed-width badge does not fill in a missing setting. The fixed-width badge fakes a missing component, the chart bar, with a different component. See `recursica-skill-data-visualization`.

## Extending components

**Never build an extension of a component.** A project extends a component outside the build. Examples are a new variant in Theme Forge, or a component the project's team adds. Use an extension only if the project already has the extension. Never assemble a missing capability from other components.

**Flag every gap between the requirements and the components.** If a requirement needs a capability no project component has, name the requirement, the component and the missing capability. Present the gap as an opportunity to extend the component.

## Asking instead of guessing

**NEVER settle uncertainty by picking an answer without saying so.** The ban on silent guesses is the most important rule in the skill family. The next person to read the work cannot tell a silent guess from a real house rule.

Stop and confirm with the user if **any** of these five cases is true:

- **Requirements compete.** The request asks for two requirements that cannot both be true.
- **A requirement contradicts a house rule.** Point out the conflict, and let the user decide. Do not follow the requirement without saying so, and do not refuse the requirement without saying so.
- **Two house rules disagree**, and the order of precedence below does not settle the disagreement.
- **No house rule covers the decision**, and the choice matters. See "Topics with no owner yet" below.
- **The request is unclear** about scope, object or intent, in a way that would change what gets built.

**Confirm with the user in this way:**

- **Confirm with the user before building, not after.** Put the question in the plan, or put the question to the user directly. Do not build on an assumption and mention the assumption afterward.
- **Ask with options.** Give the two or three real choices, and the result of each choice. The user can then answer in one word instead of writing an essay.
- **Ask once, in a batch.** Gather the open questions and ask all the questions together. Do not interrupt the user again and again.
- **Name the conflict precisely.** Quote the rules or requirements that compete. The user can act on "Your spec asks for a status the persona can click; the house rule is that status is never interactive". The user cannot act on "This is ambiguous".

**If a skill states a default, use the default.** A house rule that states a default is not uncertainty. For example, a skill may say batch save is the default, or collapsed is the default. A default exists so that nobody has to ask.

**When the user answers, treat the answer as new house knowledge.** State that the answer is new house knowledge. Offer to add the answer to the skill that owns the topic. An answer that stays in a chat log gets argued over again the next time.

## Decision order

Make the decisions in the table from top to bottom. Each answer limits the decisions below the answer.

A region that holds content, such as a page, panel or modal, sits on a layer (a numbered background level, 0 to 3, that sets the colors of the components on that level). Layer 0 is the page itself.

| #   | Decision                                                                                                                                                                 | Owner                                              |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------- |
| 1   | The object the screen is about, and whether the screen is about one object or many                                                                                       | `recursica-skill-information-architecture`         |
| 2   | Whether the content being designed is a location. A location needs a unique route, a URL, and a history entry                                                            | `recursica-skill-navigation`                       |
| 3   | Where the screen sits in the app shell: the navigation pattern, the navigation item, breadcrumbs and the page heading                                                    | `recursica-skill-navigation`                       |
| 4   | The page's layout. Whether part of the page needs a separate region that holds content, such as a page, panel or modal                                                   | `recursica-skill-screen-scaffolding`               |
| 5   | Which layer each region that holds content sits on, starting from layer 0 on the root element. Examples of regions are a page, panel and modal                           | `recursica-skill-layers`                           |
| 6   | What matters most on the screen, what to cut, and whether the screen is finished                                                                                         | `recursica-skill-screen-priority`                  |
| 7   | Whether the app supports any screen smaller than desktop, and at which breakpoint tier. Confirm with the user before choosing a navigation pattern                       | `recursica-skill-responsive-behavior`              |
| 8   | The type of content. Many instances of one object go in a table. One object's properties go in a detail view or a form view                                              | `recursica-skill-tables` / `recursica-skill-forms` |
| 9   | Where the task happens: a panel beside the page, a modal over the page, or a separate page                                                                               | `recursica-skill-panels-modals`                    |
| 10  | Narrowing a collection: the filter bar, search and date ranges                                                                                                           | `recursica-skill-filters`                          |
| 11  | When the persona enters or edits data: the form's layout, labels, grouping, validation and save mode                                                                     | `recursica-skill-forms`                            |
| 12  | The control for each field, chosen by the type and structure of the field's data                                                                                         | `recursica-skill-selection-controls`               |
| 13  | What the screen shows before the persona touches the screen. The decision covers the open tab, applied filters, pre-filled and pre-selected values, and remembered state | `recursica-skill-defaults`                         |
| 14  | Status, counts, tags and metadata on objects                                                                                                                             | `recursica-skill-badges-chips`                     |
| 15  | Every element the persona can click. Whether each element is an action or navigation, the element's label, and where the element sits                                    | `recursica-skill-buttons-links`                    |
| 16  | For an overview or landing screen: whether the screen is a dashboard or workbench, and what belongs on the screen                                                        | `recursica-skill-dashboards`                       |
| 17  | Any chart or visual display of data                                                                                                                                      | `recursica-skill-data-visualization`               |
| 18  | Any date, time, currency or numeric value on screen                                                                                                                      | `recursica-skill-dates-and-currency`               |
| 19  | Any count of items, such as navigation items, options and chips                                                                                                          | `recursica-skill-working-memory`                   |
| 20  | What the application tells the persona back: success, failure, waiting, and a banner versus a toast                                                                      | `recursica-skill-feedback-messaging`               |
| 21  | Announcing a change to assistive technology when content updates in place                                                                                                | `recursica-skill-live-regions`                     |
| 22  | What every object, navigation item, title and column is called                                                                                                           | `recursica-skill-naming-terminology`               |
| 23  | Which icon shows which meaning, and whether an icon may appear without a label                                                                                           | `recursica-skill-icon-semantics`                   |
| 24  | Headings, emphasis, abbreviations, and the markup under the visual hierarchy                                                                                             | `recursica-skill-typography-semantics`             |
| 25  | Empty, loading, error and partial states                                                                                                                                 | **No skill yet — ask**                             |

**Follow two ordering rules:**

- **Decide the object before the components.** Almost every wrong choice of control comes from skipping step 1. The type and structure of the data decide which control fits best. The type and structure of the data are unknown until the object is known.
- **Decide routing before layout.** Whether content is a location decides whether the content is a page, a tab, a panel or a modal. The routing decision affects every decision after the routing decision.

## Precedence when rules conflict

Apply the precedence rules below in order. The first precedence rule that settles the conflict wins.

1. **The design system beats every skill.** The design system decides every property the components control. Examples are spacing, color, type, focus states and keyboard behavior inside a control. If a skill's rule seems to ask for styling a component, the rule has been misread.

   **A code library's default is not a house rule, and must never be treated as a house rule.** Each adapter is built on top of a code library. The code library's default behavior has no authority in Recursica. If a code library's default disagrees with a house rule, the house rule wins. Report the default as a defect. The default is not proof that the house rule is wrong, or that the behavior is intended. Check the behavior in question in the running application. Do not assume the behavior from what the code library usually does.

   A panel is a current example. The Recursica panel is built on a code library's drawer, and the drawer is modal by default. The house rule is that a panel is non-modal (the page behind stays usable).

2. **A prohibition beats a permission.** `NEVER` and `MUST NOT` outrank "may", "is fine", and "acceptable". If one skill forbids a choice that another skill allows, the prohibition holds.
3. **A design-rules or psychology skill beats a component skill.** Apply rule 3 before the rules below. Rule 3 settles most real conflicts. If the two kinds of skill disagree about composition, follow the design rule. The design-rules skill is correct, and the component skill has a defect. Say that the component skill needs fixing. The design-rules skills come from the team. The component skills were put together from the token lists for the components.

   Composition covers four questions:

   - whether a component belongs in a place
   - how many of the component are allowed
   - what may contain what
   - when one control should replace another

   The component skill still wins on exactly one question: **which variants and states exist.** Each component skill says to get the project's list of variants and states from the Recursica MCP server. A designer can add variants, options and states in Theme Forge. The project's list therefore wins over the standard UI kit (the unchanged UI kit in the official Recursica release). If a design rule assumes a capability and the project's component lacks the capability, raise the gap. The gap is not permission to invent the capability.

4. **Within the same tier, the rule with the narrower subject wins.** A rule about one control beats a general rule about all controls. For example, a segmented control is capped at 2–5 options, even though the general limit is 7 ± 2. The segmented control's rule wins because the segmented control's rule is narrower. Rule 4 does not raise a component skill above a design rule. Rule 3 settles that case.
5. **The skill that names a subject owns the subject.** If two skills both seem to apply, the skill whose description names the subject is in charge. The other skill is background.
6. **A stated house rule beats an outside convention.** Common practice from outside Recursica does not override a Recursica rule. Outside practice is never a reason to loosen a Recursica rule. If the house rule looks wrong, say so, and confirm with the user. Do not work around the house rule.
7. **A later clarification beats an earlier general statement, but only on wording and scope.** If the substance of the two statements conflicts, confirm with the user instead of assuming the newer text wins.

**Never average two rules into a compromise.** Splitting the difference between two conflicting rules produces a design that neither rule allows.

## Conventions to check before asking

**When no topic skill covers a decision, check `recursica-skill-system-conventions` before treating the decision as unowned.** The system conventions are the house position on a subject nobody has designed before. `recursica-skill-system-conventions` holds six conventions drawn from across the topic skills:

- One behavioral mode per system.
- The unadvertised affordance (a control that works but is not shown in the main interface, such as a keyboard shortcut).
- Never carry meaning in a single channel (color, shape, position or text, each a separate signal).
- Fix the structure instead of the symptom.
- Group with space, not boxes.
- One control, one outcome.

## Topics with no owner yet

**Check the owning skill's open questions first.** Gaps come in two kinds, kept in two places. The first kind is a gap inside a topic that a skill otherwise owns. Examples are column types that cannot be sorted, limits on badge counts, and empty states for charts. Each topic skill lists gaps of the first kind in the skill's "Open questions" section.

**Treat both kinds of gap the same way: confirm with the user instead of inventing an answer.** The second kind is a whole topic that no skill owns yet. The list below names these topics. Both lists get shorter as answers are recorded in the skills.

- **Empty, loading, error and partial states.** Four parts are settled, and the other parts are open. A loading page shows nothing, and skeleton screens are forbidden (`recursica-skill-screen-scaffolding`). A loading table shows the loader by default (`recursica-skill-tables`). "No rows returned" and "could not fetch" get different messages (`recursica-skill-screen-priority`). A filter that returns zero results is a different state from never having had data (`recursica-skill-filters`). The layout, the wording, and whether an empty state may include an action are still open. The open parts include the difference between "no data yet" and "no results for these filters". Dashboards are the exception. `recursica-skill-dashboards` forbids an empty dashboard and requires a first-run element the persona can dismiss.
- **Motion.** No skill owns motion beyond one rule: do not animate a badge when the badge's status changes. `recursica-skill-icon-semantics` also leaves open whether an icon may animate.
- **Alignment across sections.** Alignment means separate areas of an application use the same names for the same concepts, and the same workflows. `recursica-skill-screen-priority` gives the criteria for a breach, and says that alignment is a review pass run after design. The skill family still needs a skill for alignment, possibly run by a dedicated agent.
- **Scan patterns and eye-tracking research.** The research is marked as belonging in `skills/psychology/`, with citations. Nobody has gathered the research yet.
- **The layout grid.** The open parts are eight or twelve columns, the gutters, and what elements line up to. `recursica-skill-screen-scaffolding` requires lining up to a grid, and openly leaves the grid to a skill that does not exist yet. `recursica-skill-layers` owns layers, and layers are settled. The layout grid is not settled.

## Strength of rule words

**A soft rule word is not a permission.** The skills use words of different strength on purpose: `MUST`, `NEVER`, "prefer", "avoid" and "typically". "Avoid" means: do not make the choice without a specific reason that can be stated. "Avoid" does not mean the choice is open. Read the rule words in this way. The reading is the same for every model:

- **`MUST` and `NEVER`** allow no exception unless the skill names the exception.
- **"Prefer", "typically" and "usually"**, in a sentence that says what to do, mean: follow the sentence unless a specific reason can be stated.
- **"Avoid" and "rarely" in a sentence that says what to do.** Each word means: do not do what the sentence names unless a specific reason can be stated.
- **"Often", "most often" and "rarely"**, in a sentence that describes what tends to happen, such as "the step most often skipped", are not rules. The words say where to look hardest.

**Silence is not permission either.** If the skills do not mention a topic, the topic has no rule. Having no rule does not make a choice allowed. The list of topics with no owner and the requirement to confirm with the user exist for an unmentioned topic.

**Extend a rule only through the rule's reason.** A skill may give the reason for a rule. If so, use the reason to apply the rule to cases the skill does not mention. If the skill gives no reason, do not stretch the rule. Confirm with the user instead.

## Pre-flight checklist

Check every item before starting, and again before declaring the work done.

- [ ] The design router was loaded first, before any other Recursica skill.
- [ ] Every source is a `SKILL.md`. No `DOCS.md` was used, and no convention came from another design system.
- [ ] Every name from another design system was translated to the Recursica component.
- [ ] No component was extended in the build. Each requirement that the project's components cannot meet was flagged as an opportunity to extend a component.
- [ ] Every component on the screen has both of the component's skills loaded: the component skill and the design-rules skill.
- [ ] The screen's object was named before any component was chosen.
- [ ] Routing was decided before layout.
- [ ] Each decision in the decision-order table was made with the owning skill or raised as a question with the user.
- [ ] Each decision follows the decision's owning skill, read for the current screen, not recalled from memory.
- [ ] Each conflict between rules was settled by the precedence rules or by the user.
- [ ] A conflict between rules was never settled by preference or by averaging, and no conflict was ignored.
- [ ] No gap was filled by an invented answer or another design system's convention. The owning skill's open questions and `recursica-skill-system-conventions` were checked first.
- [ ] Every open question went to the user before building, with options.
- [ ] Each answer from the user was offered as an addition to the owning skill.
- [ ] Empty, loading, error and partial states are handled, or the user was told no skill covers those states yet.
