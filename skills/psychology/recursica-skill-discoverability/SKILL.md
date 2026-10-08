---
name: recursica-skill-discoverability
description: The research behind Recursica's rule that rarely needed settings get a real but unpromoted entry point — the paradox of the active user, satisficing (settling for the first method that is good enough), and progressive disclosure, with citations. Use when deciding whether to hide, promote, or build a configuration or customization feature, or to justify that choice. Not for item counts — see recursica-skill-working-memory.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Discoverability and the cost of configuration

This skill gives the research behind two Recursica house positions:

- Configuration that few people need is present but not advertised.
- A good default is better than a preference the persona sets.

Other Recursica skills state each rule for one part of the interface, such as dashboards or tables. This skill explains why the rules work, and where the rules stop working.

Read this skill before adding a configuration feature. Cite this skill when someone argues that hiding a control is unfriendly to personas.

## The house rule

**A feature that few personas need gets a real entry point, and no promotion.** `recursica-skill-system-conventions` states the full rule, with the rule's three conditions. `recursica-skill-dashboards` applies the rule to dashboard configuration. `recursica-skill-tables` applies the rule to showing, hiding, and reordering table columns, and to sorting by several columns.

## What the research says

**Personas do not put effort into learning, even when the effort would pay off quickly.** Carroll and Rosson called this habit the paradox of the active user. A persona keeps the method the persona already knows instead of spending a few minutes finding a faster method. A persona wants to finish the task at hand, not become an expert in the tool. The habit makes sense in the moment but costs people over time. The habit is also very hard to change. Decades of new tools have not changed the habit.

**The paradox of the active user predicts that most personas never set up configuration.** A customization feature works only if the persona stops working, figures out how the interface could serve the persona better, and goes to set up the change. The paradox says most personas will not take those steps. Building a configuration system and expecting people to use the system is designing for a persona who hardly exists.

**The paradox also explains why teaching configuration up front fails.** A persona new to the product has no basis for arranging a workspace in a product the persona has not used yet. A tour that explains configuration arrives before the persona has any preference to set. For that reason, `recursica-skill-dashboards` requires a first-run element that the persona can dismiss and that focuses on _initial tasks_, not on customization.

**Progressive disclosure is the second research finding behind the house rules.** Nielsen defines progressive disclosure as showing the few options most people need, and moving the other options to a second screen that fewer people will go to. Moving a feature out of the main view is the standard approach for a feature that only a small number of people want. Hiding such a feature is not unusual. Hiding such a feature is the documented practice.

**The entry point should be easy to recognize.** A persona who does go looking should be able to _recognize_ the control on sight, such as a gear or settings icon in a sensible place. The persona should not have to remember a gesture. See `recursica-skill-working-memory` on recognizing versus remembering. "Not advertised" means not promoted. "Not advertised" does not mean unlabeled.

## When hiding is safe

**Hiding a feature that few personas need is safe because the people who need the feature find the feature with no prompt from the product.** A persona with a real need behaves differently from the average persona. That persona explores. That persona asks a coworker. That persona searches the settings. Personas with a real need are a different group from the personas the paradox describes. Personas with a real need are also a small group.

**Finding a feature also has a real benefit.** A persona who discovers a feature, or whose coworker shows the persona the feature, feels that the tool belongs to the persona. A persona who is told about the feature on the first day does not get that feeling.

**Hiding is not safe in three cases.** The house rule states three conditions because of the three cases below:

1. **When a task cannot be finished without the control.** A control that a task needs is core function, not configuration. The control must be visible. The paradox predicts that personas will fail rather than search for the control.
2. **When hiding stands in for research.** Some teams offer configuration because nobody found out what personas need. `recursica-skill-dashboards` calls that choice three failures that build on each other. This skill justifies _not promoting_ a well-thought-out option for the persona to override the default. This skill never justifies skipping the decision.
3. **When hidden means impossible to reach.** A control that only a long-press or a drag can reach, with no other option, shuts out personas using a keyboard and personas using assistive technology. Moving a feature out of the main view is a decision about how prominent the feature looks. Moving a feature out of the main view is never a decision about whether the feature is accessible.

## Common misapplications

**Do not cite this skill when the reason for hiding is a crowded screen.** Crowding is a problem with the structure of the screen. See the rule in `recursica-skill-system-conventions` to fix the structure of the screen. This skill is about features few people want, not about screen space.

**Do not cite this skill to avoid making a decision.** The reasoning in this skill argues against the position "We will make it configurable", not for the position.

**Do not claim that personas cannot find hidden parts of the interface.** The research makes a narrower and more accurate claim. Personas will not go looking _unprompted, for a benefit the personas have not felt yet_. Once personas feel the benefit, personas look.

**Do not use this skill to defend a dark pattern.** Hiding a control the persona would want to use is a different act, with a different motive, from hiding a feature few personas need. An unsubscribe, an export, and a way to turn off any feature or setting are examples of a control the persona would want to use. Nothing in this skill supports hiding such a control.

## References

- Carroll, J. M., & Rosson, M. B. (1987). "Paradox of the Active User." In J. M. Carroll (Ed.), _Interfacing Thought: Cognitive Aspects of Human-Computer Interaction_. MIT Press. — Personas keep using a method the personas know, even a worse method, instead of spending effort to learn a better method.
- Nielsen, J. (2006). "Progressive Disclosure." Nielsen Norman Group. <https://www.nngroup.com/articles/progressive-disclosure/> — Show the common few, defer the rest to a secondary surface.

## Out of scope

- **Item counts and the limits of memory.** `recursica-skill-working-memory` covers item counts and the limits of memory.
- **The house rules.** `recursica-skill-system-conventions`, `recursica-skill-dashboards`, and `recursica-skill-tables` state the house rules.
- **Onboarding design beyond the first-run element the persona can dismiss.** `recursica-skill-dashboards` requires the first-run element.

## Pre-flight checklist

Check each item below when a decision about configuration or customization comes up.

- [ ] A well-thought-out default exists. The hidden control is an option for the persona to override the default, not a replacement for deciding.
- [ ] No task requires finding the hidden control in order to finish the task.
- [ ] The entry point is easy to recognize when the persona comes across the entry point: a settings or gear control in a sensible place, not a gesture the persona must remember.
- [ ] The hidden control can be reached by keyboard and by assistive technology, with another option for any drag or long-press.
- [ ] Nothing is hidden because the screen is crowded.
- [ ] Nothing the persona would want to reach, such as export, opting out or canceling, was hidden using the reasoning in this skill.
- [ ] Any claim about the research is accurate. Personas will not look for a benefit the personas have not felt. Not looking for a benefit is different from being unable to find hidden parts of the interface.
