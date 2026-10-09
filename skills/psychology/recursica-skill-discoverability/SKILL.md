---
name: recursica-skill-discoverability
description: The research behind Recursica's rule that rarely needed settings get a real but unpromoted entry point — the paradox of the active user, satisficing (settling for the first method that is good enough), and progressive disclosure, with citations. Use when deciding whether to hide, promote, or build a configuration or customization feature, or to justify that choice. Not for item counts — see recursica-skill-working-memory.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Discoverability and the cost of configuration

Read this skill before adding a configuration feature. Cite this skill when someone argues that hiding a control is unfriendly to personas.

This skill gives the research behind two Recursica house positions:

- Configuration that few personas need is present but not advertised.
- A good default is better than a preference the persona sets.

Other Recursica skills state each rule for one part of the interface, such as dashboards or tables. This skill explains why the rules work, and where the rules stop working.

## The house rule

**A feature that few personas need gets a real entry point, and no promotion.** `recursica-skill-system-conventions` states the full rule, with the rule's three conditions. `recursica-skill-dashboards` applies the rule to dashboard configuration. `recursica-skill-tables` applies the rule to showing, hiding, and reordering table columns, and to sorting by several columns.

## What the research says

**Personas do not put effort into learning, even when the effort would pay off quickly.** Carroll and Rosson named the habit the paradox of the active user. A persona keeps the method the persona knows instead of spending a few minutes finding a faster method. A persona wants to finish the task at hand, not become an expert in the tool. The habit makes sense in the moment but costs personas over time. The habit is also very hard to change. Decades of new tools have not changed the habit.

**The paradox of the active user predicts that most personas never set up configuration.** A customization feature works only if the persona takes three steps:

1. The persona stops working.
2. The persona figures out how the interface could serve the persona better.
3. The persona goes to set up the change.

The paradox says most personas will not take the three steps. Building a configuration system and expecting personas to use the system is designing for a persona who hardly exists.

**The paradox also explains why teaching configuration up front fails.** A persona new to the product has not used the product yet. The new persona has no basis for arranging a workspace in the product. A tour that explains configuration arrives before the persona has any preference to set. `recursica-skill-dashboards` therefore requires a first-run element that the persona can dismiss. The first-run element focuses on _initial tasks_, not on customization.

**Progressive disclosure is the second research finding behind the house rules.** Nielsen defines progressive disclosure as two steps:

- Show the few options most people need.
- Move the other options to a second screen that fewer people will go to.

Moving a feature out of the main view is the standard approach for a feature few personas want. Hiding such a feature is the documented practice, not an unusual one.

**The entry point should be easy to recognize.** A persona who does go looking should _recognize_ the control on sight. An example is a gear or settings icon in a sensible place. The persona should not have to remember a gesture. See `recursica-skill-working-memory` on recognizing versus remembering. "Not advertised" means not promoted. "Not advertised" does not mean unlabeled.

## When hiding is safe

**Hiding a feature that few personas need is safe.** Hiding is safe because the personas who need the feature find the feature with no prompt from the product. A persona with a real need behaves differently from the average persona. The persona with a real need explores, asks a coworker and searches the settings. Personas with a real need are a different group from the personas the paradox describes. Personas with a real need are also a small group.

**Finding a feature also has a real benefit.** A persona who discovers a feature feels that the tool belongs to the persona. A persona whose coworker shows the persona the feature feels the same. A persona told about the feature on the first day does not get the feeling of owning the tool.

**Hiding is not safe in three cases.** The house rule states three conditions because of the three cases below:

1. **A task cannot be finished without the control.** A control that a task needs is core function, not configuration. The control must be visible. The paradox predicts that personas will fail rather than search for the control.
2. **Hiding stands in for research.** Some teams offer configuration because nobody found out what personas need. `recursica-skill-dashboards` calls offering configuration in place of research three failures that build on each other. This skill justifies _not promoting_ a well-thought-out option for the persona to override the default. This skill never justifies skipping the decision.
3. **Hidden means impossible to reach.** A long-press or a drag is sometimes the only way to reach a control. Such a control shuts out personas using a keyboard and personas using assistive technology. Moving a feature out of the main view is a decision about how prominent the feature looks. Moving a feature out of the main view is never a decision about whether the feature is accessible.

## Common misapplications

**Do not cite this skill when the reason for hiding is a crowded screen.** Crowding is a problem with the structure of the screen. See the rule in `recursica-skill-system-conventions` to fix the structure of the screen. This skill is about features few personas want, not about screen space.

**Do not cite this skill to avoid making a decision.** This skill's reasoning argues against the position "We will make it configurable", not for the position.

**Do not claim that personas cannot find hidden parts of the interface.** The research makes a narrower and more accurate claim. Personas will not go looking _unprompted, for a benefit the personas have not felt yet_. Once personas feel the benefit, personas look.

**Do not use this skill to defend a dark pattern.** Hiding a control the persona would want to use is a different act from hiding a feature few personas need. The two acts have different motives. Examples of a control the persona would want to use include an unsubscribe and an export. Another example is a way to turn off any feature or setting. This skill gives no support for hiding such a control.

## References

- Carroll, J. M., & Rosson, M. B. (1987). "Paradox of the Active User." In J. M. Carroll (Ed.), _Interfacing Thought: Cognitive Aspects of Human-Computer Interaction_. MIT Press. — Personas keep a familiar method, even a worse one, instead of spending effort to learn a better method.
- Nielsen, J. (2006). "Progressive Disclosure." Nielsen Norman Group. <https://www.nngroup.com/articles/progressive-disclosure/> — Show the common few, defer the rest to a secondary surface.

## Out of scope

- **Item counts and the limits of memory.** `recursica-skill-working-memory` covers item counts and the limits of memory.
- **The house rules.** `recursica-skill-system-conventions`, `recursica-skill-dashboards`, and `recursica-skill-tables` state the house rules.
- **Onboarding design beyond the first-run element the persona can dismiss.** `recursica-skill-dashboards` requires the first-run element.

## Pre-flight checklist

When a decision about configuration or customization comes up, check each item below.

- [ ] A well-thought-out default exists. The hidden control is an option for the persona to override the default, not a replacement for deciding.
- [ ] No task requires finding the hidden control to finish the task.
- [ ] The entry point is easy to recognize on sight: a settings or gear control in a sensible place.
- [ ] The entry point is not a gesture the persona must remember.
- [ ] The hidden control can be reached by keyboard and by assistive technology, with another option for any drag or long-press.
- [ ] Nothing is hidden because the screen is crowded.
- [ ] Nothing the persona would want to reach was hidden using this skill's reasoning. Examples include export, opting out and canceling.
- [ ] Any claim about the research is accurate. Personas will not look for a benefit the personas have not felt. Not looking for a benefit is different from being unable to find hidden parts of the interface.
