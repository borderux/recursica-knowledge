---
name: recursica-skill-screen-priority
description: House rules for deciding what matters most on an enterprise screen and how that ranking becomes layout — why there is no cap on how much information a screen may carry, the inverted triangle from broadest at the top to persona-specific at the bottom, what earns the top-left position, the three tenets of workflow then physicality then simplicity, the removal test, ranking the user's workflow above every stakeholder, establishing hierarchy without color, keeping information in view with sticky regions, and the prohibition on inner scrolling. Use when deciding what goes where on a screen, what to cut, whether a screen is finished, or how to rank competing requests. Trigger on "what matters most", "hierarchy", "priority", "too much on this screen", "overloaded", "density", "what should we cut", "sticky", "inner scroll", "is this screen done". Do NOT use for the page's structural composition — that is recursica-skill-screen-scaffolding.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Prioritizing a screen

House rules for deciding what matters most on a screen and turning that ranking into layout. These are opinions, not neutral best practices — apply them as constraints.

Context these rules assume: **complex enterprise web applications** where people are doing real work, not glancing at information. That premise does more work here than anywhere else in the family, and most of the rules below fall out of it.

## The three governing principles

1. **There is no attention budget to ration.** These screens legitimately carry dozens or hundreds of pieces of information. Prioritization is about **order**, not about how much — and any rule that starts by capping the count has misunderstood the product.
2. **The user's workflow outranks everything that can move.** Stakeholders, business units, and taste all lose to it. Legal, compliance, and hard technical constraints do not.
3. **Simplification is the last step, never the first.** Understand the workflow, connect the pieces, and only then remove what is unnecessary.

## There is no limit on how much a screen may hold

**Do not apply a cap on distinct pieces of information.** Dozens, or hundreds, on one screen is acceptable and often correct.

**"Primary attention" is not a useful frame here.** It belongs to websites, where someone glances at information. In an enterprise application people are working, and asking which single element commands attention produces the wrong screen.

**So there is no rule for how many things may compete.** It depends entirely on the scenario and the workflow, and an agent that wants a number is asking the wrong question.

### The real overload test

**Does the screen support the investigations and the actions appropriate to what the user is trying to accomplish?** That is the test — particularly on a dashboard or a landing page.

**The weaker signal:** the user cannot tell what they should do next. That is a symptom worth noticing, and it is admittedly vague.

**There is no single rule here, and that is part of what makes enterprise layout hard.** Where the answer is genuinely unclear, ask rather than invent a threshold — see `recursica-skill-design-router`.

## The inverted triangle

**Broadest at the top, most specific at the bottom.**

- **The top carries what applies to every persona** arriving at the page — the broadest, most widely applicable content, in the largest treatment.
- **Moving down, content becomes more granular and more specific.**
- **The bottom may be persona-specific**, relevant only to some of the people who reach the page.

**Priority is expressed by position or by size** — higher up the page, or larger. Those are the two levers.

## What earns the top left

**Almost always the client's logo — the brand of the product being built.** The reason is brand reinforcement, and it is why this position is not available for content.

**A variant exists:** the logo upper right with profile information upper left.

**The exception is rare.** A client who does not care about reinforcing the brand may hide it, but a logo appears somewhere in nearly every case.

## Ranking competing requirements

**The user's actual workflow wins over any stakeholder.** If the user needs it, it takes priority.

**A stakeholder may overrule you anyway**, even where it damages the workflow. That is a real outcome, not a failure of the rule — good user-centred design still means arguing from the user.

**Business units rarely have competing requirements — they have different ones.** Treat them as complementary and resolve them by understanding the workflow and matching the user's mental model, rather than by adjudicating between departments.

**A legal, compliance, or hard technical constraint overrides the user's mental model.** Some things cannot be worked around, and the mental model has to change to accommodate them. This is the one thing that outranks the user.

**When stakeholders want everything on the screen**, stack-rank it. Find what matters most, make it clear, and give it visual priority — higher or larger.

## Density

**Density is decided by what the user comes to do daily, not by a preference.**

- **Reviewing information and drilling into it** — a dashboard someone opens every morning — tolerates more density.
- **Starting a flow** — arriving to do a task — wants less.

There is no threshold; it follows the use case.

## The three tenets, and when a screen is finished

Work them in order. The third depends on the first two being done.

1. **Workflow.** Understand what the user is trying to do, and build the screen — or the screens — to accomplish it efficiently.
2. **Physicality.** Create connections between elements, pages, and screens, so moving through them feels connected rather than like data scattered haphazardly.
3. **Simplicity.** Remove what is unnecessary. Doing the first two well makes this both possible and necessary.

### The removal test

For every piece of information, ask: **is the user's workflow hindered if I remove this?**

- **Yes** → keep it.
- **No** → remove it.
- **Possibly, or maybe** → do not remove it; **reduce it.** Shorten it, demote it, or move it down the triangle.

**One stated exception: a decorative icon.** An icon that changes nothing about how the interface is used may still be kept for visual anchoring — beside a heading, on pages whose layouts are otherwise near-identical. Owned by `recursica-skill-icon-semantics`. Nothing else survives a "no."

### A screen is complete when

**It meets the user's needs against their workflow and mental model, and the simplification pass has been done** — unnecessary content removed, and the phrasing and wording of labels made as concise as possible.

**Simplification is the last step.** Simplify, confirm the user's needs are still met, and it is finished.

## Hierarchy without color

Color is not available as a hierarchy device — meaning never rides on it alone, per `recursica-skill-system-conventions`. What remains:

- **Typography** — correct heading levels and type size. See `recursica-skill-typography-semantics`.
- **Balance of layout.**
- **White space**, deliberately placed so attention lands on what matters most.
- **Maximum widths.**
- **Imagery**, where the content supports it.
- **Position**, per the inverted triangle above.

**Scan patterns inform this, with a limit.** F-pattern reading applies to substantial copy. It does **not** reliably apply to tables or to visual surfaces like a dashboard, so do not lay out a data-dense screen as though someone were reading prose.

**No whimsical or decorative content.** Cat imagery and the like will never appear in a business application here.

## Progressive disclosure

**What appears immediately versus what is disclosed is a real lever**, and the system has components for it: accordions, trees, tabs, steppers, and revealing functionality based on a form selection. All exist.

**Which one depends on the elegance of the design and how the information genuinely divides.** Each has its own rules — see `recursica-skill-accordion`, `recursica-skill-tree`, `recursica-skill-tabs`, `recursica-skill-stepper`, and `recursica-skill-forms`.

### A long form can beat a stepper

**Branching forces a stepper.** Where an answer changes a later step, break it up.

**But cross-referential information favors one long form.** Where filling in one section depends on remembering or checking another, a stepper becomes actively annoying — moving forward and back to re-read is worse than scrolling up. Usability testing on a long credit-card application found the single long form outperformed the stepper for exactly this reason: the user wanted to confirm the whole thing was correct and complete at once.

**So the question is how much has to stay in context**, not how long the form is. Owned jointly with `recursica-skill-forms`.

## Keeping information in view

**Sticky regions are legitimate** for information that must stay visible — a running total, a status, a summary of selections made across a screen that all pertain to one object.

**The limit: beyond a sticky header, a sticky footer, and a persistent left nav rail, only one more sticky element.** Every sticky region shrinks the space actual content can occupy, so keep them to a minimum.

### Never use inner scrolling

**The application has one scrollbar.** The user scrolls the browser, from anywhere on the page, and the sticky regions stay put.

**NEVER build an inner scrolling region.** Forcing someone to place the cursor inside a particular area before the wheel does anything is the failure this prevents — see convention 4 in `recursica-skill-system-conventions`, and `recursica-skill-dashboards`, which forbids it there too.

**The one possible exception:** a table occupying the full viewport width and height. Even that is "maybe" — generally, no inner scrolling of any kind.

## Empty is not error

**Distinguish them, always, and with different messages.**

- **No rows returned** — the fetch worked and there is nothing to show. Say that clearly.
- **The rows could not be returned** — the fetch failed. A different message.

Collapsing the two leaves the user unable to tell whether to change their filters or try again later.

## Alignment across the application

**Separate sections must call the same things by the same names, and work the same way.** Different areas of an application can hold entirely separate content and still be misaligned.

**Two breaches to look for:**

1. **The same thing called two different names** in two places. See `recursica-skill-naming-terminology`.
2. **Different workflows for the same kind of task** — form-based submission with one submit button in one section, inline saving in another. See `recursica-skill-system-conventions` on one behavioral mode per system.

**Alignment is a review pass, run after the design is otherwise complete.** It is not something to check continuously while building.

**When a breach is found, surface it rather than fixing it silently.** Bring it to the user, let them decide which way it should go, and then apply that decision across the whole application.

## Not your decision

- **Type styles, spacing tokens, and the layout grid.** From the design system.
- **The page's structural composition** — header, rail, footer, title, breadcrumb. `recursica-skill-screen-scaffolding`.
- **Whether a stakeholder's override is accepted.** Argue from the user; the decision is theirs.

## Out of scope

- **The page scaffold and layering** — `recursica-skill-screen-scaffolding`.
- **Which component a piece of content uses.** Each component skill.
- **Dashboard-specific limits** — chart and card counts, the workbench distinction — `recursica-skill-dashboards`.
- **Table columns, sorting, and pinning** — `recursica-skill-tables`.
- **Working-memory limits on option counts** — `recursica-skill-working-memory`. Those govern controls, not how much information a screen may display.

## Uncovered — ask, do not invent

- **How to judge done versus overloaded in terms of cognitive load.** Named as not covered. The workflow-support test above is what exists.
- **Where the inverted triangle stops applying.** Asked directly and passed over; no boundary was given.
- **Scan-pattern research.** Flagged as belonging in the psychology skills with citations, and not yet gathered — see `recursica-skill-working-memory` for the pattern that would follow.
- **Alignment as its own skill.** Named as a design rule the family still needs, possibly run by a dedicated review agent. What is here is the criteria, not the process.
- **How empty and error states are laid out**, beyond the requirement that their messages differ. The wider empty-and-error topic remains unowned.
- **What makes imagery appropriate** in an enterprise screen, given that whimsical content is excluded outright.

## Pre-flight checklist

- [ ] No cap was imposed on how much information the screen carries, and no "primary attention" framing drove the layout.
- [ ] The screen was tested against whether it supports the investigations and actions the user came to perform.
- [ ] Content runs broadest and largest at the top to most specific and persona-dependent at the bottom.
- [ ] The top-left position holds the brand unless the client has a reason otherwise.
- [ ] The user's workflow outranked every stakeholder request; only a legal, compliance, or hard technical constraint overrode it.
- [ ] Density matches what the user comes to do daily.
- [ ] All three tenets were worked in order, with simplification last.
- [ ] Every element passed the removal test; anything uncertain was reduced rather than cut.
- [ ] Labels and phrasing were simplified as the final step.
- [ ] Hierarchy is carried by typography, position, white space, and width — never by color alone.
- [ ] No whimsical or decorative content.
- [ ] Progressive disclosure uses an existing component, and a long form was preferred over a stepper where information is cross-referential.
- [ ] Beyond header, footer, and nav rail, at most one sticky element.
- [ ] There is one scrollbar; no inner scrolling region was built.
- [ ] Empty and error states carry different messages.
- [ ] An alignment pass was run against other sections, and any breach was surfaced to the user rather than resolved silently.
- [ ] Nothing in the uncovered list was invented.
