---
name: recursica-skill-discoverability
description: The research behind Recursica's rule that rarely needed settings get a real but unpromoted entry point — the paradox of the active user, satisficing, and progressive disclosure, with citations. Use when deciding whether to hide, promote, or build a configuration or customization feature, or to justify that choice. Not for item counts — see recursica-skill-working-memory.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Discoverability and the cost of configuration

This skill gives the reasoning behind two house positions: configuration that few people need is present but not advertised, and a good default beats a user preference. The related skills state the rule for their own part of the interface. This skill explains why it works, and where it stops working.

Read this before you add a configuration feature. Cite it when someone argues that hiding a control is unfriendly to users.

## The house rule this supports

**Features few users need get a real way in, and no promotion.** The full rule, with its three conditions, is in `recursica-skill-system-conventions`. It is applied to dashboard configuration in `recursica-skill-dashboards`, and to showing, hiding, and reordering table columns and sorting by several columns in `recursica-skill-tables`.

## What the research says

**Users do not put effort into learning, even when it would pay off quickly.** Carroll and Rosson called this the paradox of the active user: people stick with the method they already know instead of spending a few minutes finding a faster one. They want to finish the task in front of them, not become experts in the tool. This makes sense in the moment but costs them over time, and it is remarkably hard to change — decades of new tools have not changed it.

**This has a direct effect on configuration.** A customization feature depends on the user doing exactly what this paradox says they will not do: stop working, figure out how the interface could serve them better, and go set it up. Most never will. Building a configuration system and expecting people to use it is designing for a user who hardly exists.

**This is also why teaching it up front fails.** A new user has no basis for arranging a workspace in a product they have not used yet. A tour that explains configuration arrives before they have any preference to express. That is why `recursica-skill-dashboards` requires a first-run element the user can dismiss, focused on _initial tasks_ and not on customization.

**Progressive disclosure is the other half.** Progressive disclosure means showing the few options most people need, and moving the rest to a second screen that fewer people will go to. This is Nielsen's version. Moving features back is the standard approach for a feature that only a small number of people want — hiding it is not unusual. It is the documented practice.

**Recognition still decides the way in.** The user who does go looking should be able to _recognize_ the control when they see it — a gear or settings icon in a sensible place — instead of having to remember a gesture. See `recursica-skill-working-memory` on recognizing versus remembering. "Not advertised" means not promoted. It does not mean unlabeled.

## Why hiding is safe here — and where it is not

**It is safe because the people who need the feature find it on their own.** A user with a real need behaves differently from the average user: they explore, they ask a coworker, they search the settings. They are a different group from the one the paradox describes, and a small one.

**Finding a feature also has a real benefit.** Discovering a feature, or being shown it by a coworker, makes people feel the tool is theirs in a way that being told about it on the first day does not.

**It is not safe in three cases**, which is why the rule states them as conditions:

1. **When a task cannot be finished without the control.** Then it is not configuration; it is core function, and it must be visible. The paradox predicts that users will fail rather than search for it.
2. **When hiding stands in for research.** Offering configuration because nobody found out what users need is what `recursica-skill-dashboards` calls three failures that build on each other. This skill justifies _not promoting_ a well-thought-out way out of the default. It never justifies skipping the decision.
3. **When hidden means impossible to reach.** A long-press or a drag with no other option shuts out keyboard users and users of assistive technology (tools such as screen readers that help people with disabilities use a computer). Moving a feature back is a decision about how prominent it looks, never about whether it is accessible.

## Common misapplications

**Do not cite this to hide something because the screen is crowded.** Crowding is a structural problem — see the fix-the-structure rule in `recursica-skill-system-conventions`. This skill is about features few people want, not about space.

**Do not cite this to avoid making a decision.** "We will make it configurable" is the position this reasoning argues against, not for.

**Do not claim that users cannot find hidden things.** The real claim is narrower and more accurate: users will not go looking _on their own, for a benefit they have not felt yet_. Once they feel it, they look.

**Do not use it to defend a dark pattern** (a design that pushes users to act against their own interest). Hiding a control the user would want to use — an unsubscribe, an export, a way to turn something off — is a different act with a different motive, and nothing here supports it.

## References

- Carroll, J. M., & Rosson, M. B. (1987). "Paradox of the Active User." In J. M. Carroll (Ed.), _Interfacing Thought: Cognitive Aspects of Human-Computer Interaction_. MIT Press. — Users persist with known-but-suboptimal methods rather than investing in learning better ones.
- Nielsen, J. (2006). "Progressive Disclosure." Nielsen Norman Group. <https://www.nngroup.com/articles/progressive-disclosure/> — Show the common few, defer the rest to a secondary surface.

## Out of scope

- **Item counts and the limits of memory.** Covered by `recursica-skill-working-memory`.
- **The rules themselves.** Stated in `recursica-skill-system-conventions`, `recursica-skill-dashboards`, and `recursica-skill-tables`.
- **Onboarding design beyond the first-run element the user can dismiss**, which the dashboards skill requires.

## Pre-flight checklist

When a decision about configuration or customization comes up, check:

- [ ] A well-thought-out default exists, and the hidden control is a way out of it — not a replacement for deciding.
- [ ] No task requires finding the control in order to finish it.
- [ ] The way in is easy to recognize when the user comes across it — a settings or gear control in a sensible place, not a gesture the user must remember.
- [ ] The control can be reached by keyboard and by assistive technology, with another option for any drag or long-press.
- [ ] Nothing is hidden just because the screen is crowded.
- [ ] Nothing the user would want to reach — export, opting out, canceling — was hidden using this reasoning.
- [ ] Any claim about the research is accurate: users will not look for a benefit they have not felt, which is not the same as being unable to find things.
