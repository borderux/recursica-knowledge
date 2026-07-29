---
name: recursica-skill-discoverability
description: The cognitive-science basis for Recursica's unadvertised-affordance rule, with citations — the paradox of the active user, satisficing over learning, progressive disclosure, and why strong defaults outperform configurability. Use whenever deciding whether to promote, hide, or build a customization or configuration feature: dashboard configuration, table column visibility, multi-sort, saved views, or any control a minority of users need. Also use when asked to justify hiding an affordance, when someone proposes a tour or onboarding to teach a feature, or when configurability is offered as the answer to not knowing what users need. Trigger on "should this be discoverable", "hidden affordance", "progressive disclosure", "paradox of the active user", "will users customize", "power user feature", "add a settings option", or "why not surface this". Do NOT use for item counts — that is recursica-skill-working-memory. This skill supplies reasoning; the rules live in the topic skills.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Discoverability and the cost of configuration

The reasoning behind the house position that rarely-needed configuration is present but unadvertised, and that a good default beats a preference. Sibling skills state the rule for their surface; this skill explains why it works and where it stops.

Read this before adding a configuration feature, and cite it when someone argues that hiding a control is user-hostile.

## The house rule this supports

**Functionality few users need is given a real entry point and no promotion.** Stated in full, with its three preconditions, in `recursica-skill-system-conventions`. Applied concretely to dashboard configuration in `recursica-skill-dashboards`, and to column visibility, reordering, and multi-sort in `recursica-skill-tables`.

## What the research says

**Users do not invest in learning, even when it would pay off quickly.** Carroll and Rosson named this the **paradox of the active user**: people stay with the method they already know rather than spending a few minutes to find a faster one, because they are motivated to complete the task in front of them, not to become expert in the tool. The behavior is rational in the moment and costly over time, and it is remarkably persistent — decades of tooling has not changed it.

**The consequence for configuration is direct.** A customization feature depends on the user doing exactly what this paradox says they will not do: stop working, form a theory about how the interface could serve them better, and go configure it. Most never will. Building a configuration system and expecting adoption is designing for a user who does not exist in quantity.

**This is also why teaching it up front fails.** A new user has no basis for arranging a workspace in a product they have not used. A tour explaining configuration lands before they have any preference to express, which is why `recursica-skill-dashboards` requires a dismissible onboarding element focused on _initial tasks_ rather than on customization.

**Progressive disclosure is the counterpart.** Nielsen's formulation: show the few options most users need, and defer the rest to a secondary screen a smaller number will reach for. Deferral is the standard move for a feature with a long tail of demand — hiding it is not an unusual act, it is the documented one.

**Recognition still governs the entry point.** The user who does go looking should be able to _recognize_ the control when they see it — a gear or settings icon in a plausible location — rather than recall a gesture. See `recursica-skill-working-memory` on recognition versus recall. Unadvertised means unpromoted, not unlabeled.

## Why hiding is safe here — and where it is not

**Safe, because the people who need the function are self-selecting.** A user with a genuine need behaves differently from the average user: they explore, they ask a colleague, they search settings. That is a different population from the one the paradox describes, and it is small.

**There is also a real benefit to discovery.** Finding a capability, or being shown it by a peer, produces ownership of the tool in a way that being told on day one does not.

**Not safe in three cases**, which is why the convention states them as preconditions:

1. **When a task cannot be completed without the control.** Then it is not configuration, it is functionality, and it must be visible. The paradox predicts users will fail rather than hunt.
2. **When hiding substitutes for research.** Configurability offered because nobody established what users need is the failure `recursica-skill-dashboards` calls three compounding failures. This skill justifies _not promoting_ a considered escape hatch. It never justifies skipping the decision.
3. **When hidden means unreachable.** A long-press or drag with no alternative excludes keyboard and assistive-technology users. Deferral is a visual-prominence decision, never an accessibility one.

## Common misapplications

**Do not cite this to hide something because the screen is crowded.** Crowding is a structural problem — see the fix-the-structure convention in `recursica-skill-system-conventions`. This is about long-tail demand, not about space.

**Do not cite this to avoid deciding.** "We will make it configurable" is the position this reasoning argues against, not for.

**Do not claim users cannot find hidden things.** The claim is narrower and more accurate: users will not go looking _unprompted, for a benefit they have not yet felt_. Once they feel it, they look.

**Do not use it to defend a dark pattern.** Hiding a control the user would want to use — an unsubscribe, an export, a way to turn something off — is a different act with a different motive, and nothing here supports it.

## References

- Carroll, J. M., & Rosson, M. B. (1987). "Paradox of the Active User." In J. M. Carroll (Ed.), _Interfacing Thought: Cognitive Aspects of Human-Computer Interaction_. MIT Press. — Users persist with known-but-suboptimal methods rather than investing in learning better ones.
- Nielsen, J. (2006). "Progressive Disclosure." Nielsen Norman Group. <https://www.nngroup.com/articles/progressive-disclosure/> — Show the common few, defer the rest to a secondary surface.

## Out of scope

- **Item counts and cognitive limits.** Covered by `recursica-skill-working-memory`.
- **The rules themselves.** Stated in `recursica-skill-system-conventions`, `recursica-skill-dashboards`, and `recursica-skill-tables`.
- **Onboarding design beyond the dismissible first-run element** the dashboards skill requires.

## Pre-flight checklist

When a configuration or customization decision is in play, verify:

- [ ] A considered default exists, and the hidden control is an escape hatch from it rather than a replacement for deciding.
- [ ] No task requires finding the control to complete it.
- [ ] The entry point is recognizable when encountered — a settings or gear affordance in a plausible place, not a gesture the user must recall.
- [ ] The control is keyboard and assistive-technology reachable, with an alternative to any drag or long-press.
- [ ] Nothing is hidden merely because the screen is crowded.
- [ ] Nothing the user would want to reach — export, opt-out, cancellation — was hidden under this reasoning.
- [ ] Any claim made about the research is accurate: users will not seek a benefit they have not felt, which is not the same as being unable to find things.
