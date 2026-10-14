---
name: recursica-skill-discoverability
description: The research behind Recursica's rule that rarely needed settings get a real but unpromoted entry point — the paradox of the active user, satisficing (settling for the first method that is good enough), and progressive disclosure, with citations. Use when deciding whether to hide, promote, or build a configuration or customization feature, or to justify that choice. Not for item counts — see recursica-skill-working-memory.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Discoverability and the cost of configuration

Read this skill before adding a configuration feature. Examples of a configuration feature are arranging a dashboard and choosing which table columns show.

Cite this skill when someone argues that hiding a control is unfriendly to personas. The skill gives the research behind two Recursica house positions:

- Configuration that few personas need stays in the product, but the product does not advertise the configuration.
- A good default is better than a preference the persona sets. For example, a well-chosen default dashboard is better than asking each persona to arrange the dashboard.

## The house rule

**A feature that few personas need gets a real entry point, and no promotion.** An example of an entry point is a gear icon on a table. Examples of promotion are a tour and a banner.

Other Recursica skills state the rule for one part of the interface each. For example:

- `recursica-skill-system-conventions` states the full rule, with the rule's three conditions.
- `recursica-skill-dashboards` applies the rule to dashboard configuration.
- `recursica-skill-tables` applies the rule to showing, hiding and reordering table columns, and to sorting by several columns.

This skill explains why the rules work, and where the rules stop working.

## What the research says

**Personas do not put effort into learning, even when the effort would pay off quickly.** Carroll and Rosson named the habit the paradox of the active user. A persona keeps the method the persona knows instead of spending a few minutes finding a faster method. For example, a persona copies table rows by hand every week instead of learning the export.

- The persona wants to finish the task at hand, not become an expert in the tool.
- The habit makes sense in the moment but costs the persona over time.
- The habit is very hard to change. Decades of new tools have not changed the habit.

**The paradox of the active user predicts that most personas never set up configuration.** A customization feature works only if the persona takes three steps:

1. The persona stops working.
2. The persona figures out how the interface could serve the persona better.
3. The persona goes to set up the change.

The paradox says most personas will not take the three steps. Building a configuration system and expecting personas to use the system is designing for a persona who hardly exists.

**The paradox also explains why teaching configuration up front fails.** A persona new to the product has not used the product yet. The new persona has no basis for arranging a workspace in the product. A tour that explains configuration arrives before the persona has any preference to set.

For that reason, a first-run element in `recursica-skill-dashboards` must be one the persona can dismiss. An example is a "Get started" checklist. The first-run element focuses on the persona's _first tasks_, not on customization.

**Progressive disclosure is the second research finding behind the house rules.** Nielsen defines progressive disclosure as two steps:

- Show the few options most people need.
- Move the other options to a second screen that fewer people will go to.

For example, a table shows the columns most personas need. A gear icon on the table opens the settings for showing more columns. Moving a feature few personas want out of the main view is the standard, documented practice, not an unusual one.

**The entry point should be easy to recognize.** A persona who goes looking should _recognize_ the control on sight. An example is a gear or settings icon in a sensible place, such as on the table the setting changes. The persona should not have to remember a gesture. See `recursica-skill-working-memory` on recognizing versus remembering.

"Not advertised" means not promoted. "Not advertised" does not mean unlabeled.

## When hiding is safe

**Hiding a feature that few personas need is safe.** Hiding is safe because the personas who need the feature find the feature with no prompt from the product. A persona with a real need behaves differently from the average persona. The persona with a real need explores, asks a coworker and searches the settings.

Personas with a real need are a different group from the personas the paradox describes. Personas with a real need are also a small group.

**Finding a feature also has a real benefit.**

- A persona who discovers a feature feels that the tool belongs to the persona.
- A persona whose coworker shows the persona the feature feels the same.
- A persona told about the feature on the first day does not get the feeling of owning the tool.

**Hiding is not safe in three cases.** The house rule states three conditions because of the three cases below:

1. **A task cannot be finished without the control.** A control that a task needs is core function, not configuration. The control must be visible. The paradox predicts that personas will fail rather than search for the control.
2. **Hiding stands in for research.** Some teams offer configuration because nobody found out what personas need. For example, a team lets each persona arrange the dashboard because nobody decided which numbers matter. `recursica-skill-dashboards` calls offering configuration in place of research three failures that build on each other. This skill justifies _not promoting_ a well-thought-out option for the persona to override the default. This skill never justifies skipping the decision.
3. **Hidden means impossible to reach.** Sometimes a long-press or a drag is the only way to reach a control. Such a control shuts out personas using a keyboard and personas using assistive technology. Moving a feature out of the main view decides how prominent the feature looks. Moving a feature out of the main view never decides whether the feature is accessible.

## Common misapplications

**Do not cite this skill when the reason for hiding is a crowded screen.** A crowded screen is a problem with the structure of the screen. See the rule in `recursica-skill-system-conventions` to fix the structure of the screen. This skill is about features few personas want, not about screen space.

**Do not cite this skill to avoid making a decision.** The reasoning in this skill argues against the answer "We will make it configurable". The reasoning never argues for that answer.

**Do not claim that personas cannot find hidden parts of the interface.** The research makes a narrower and more accurate claim. Personas will not go looking _unprompted, for a benefit the personas have not felt yet_. Once personas feel the benefit, personas look.

For example, a persona who never needed to hide a table column does not look for the column settings. A persona tired of scrolling past an unused column does look.

**Do not use this skill to defend a dark pattern.** Hiding a control the persona would want to use is a different act from hiding a feature few personas need. The two acts have different motives. This skill gives no support for hiding a control the persona would want to use, such as:

- an unsubscribe
- an export
- a way to turn off any feature or setting

## References

- Carroll, J. M., & Rosson, M. B. (1987). "Paradox of the Active User." In J. M. Carroll (Ed.), _Interfacing Thought: Cognitive Aspects of Human-Computer Interaction_. MIT Press. — Personas keep a familiar method, even a worse one, instead of learning a better method.
- Nielsen, J. (2006). "Progressive Disclosure." Nielsen Norman Group. <https://www.nngroup.com/articles/progressive-disclosure/> — Show the few options most people need. Move the other options to a secondary place, such as a page, panel or menu.

## Out of scope

- **Item counts and the limits of memory.** `recursica-skill-working-memory` covers item counts and the limits of memory.
- **The house rules.** `recursica-skill-system-conventions`, `recursica-skill-dashboards`, and `recursica-skill-tables` state the house rules.
- **Onboarding design beyond the first-run element the persona can dismiss.** `recursica-skill-dashboards` adds the first-run element only when the requirements call for one.

## Pre-flight checklist

When a decision about configuration or customization comes up, check each item below.

- [ ] A well-thought-out default exists. The hidden control lets the persona override the default. The hidden control does not replace deciding.
- [ ] The persona can finish every task without finding the hidden control.
- [ ] The entry point is easy to recognize on sight: a settings or gear control in a sensible place.
- [ ] The entry point is not a gesture the persona must remember.
- [ ] The hidden control can be reached by keyboard and by assistive technology. Any drag or long-press has another way to reach the control.
- [ ] Nothing is hidden because the screen is crowded.
- [ ] Nothing the persona would want to reach was hidden using this skill's reasoning. Examples include export, opting out and canceling.
- [ ] Any claim about the research is accurate. Personas will not look for a benefit the personas have not felt. Not looking for a benefit is different from being unable to find hidden parts of the interface.
