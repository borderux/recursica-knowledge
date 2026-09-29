---
name: recursica-skill-screen-priority
description: House rules for deciding what matters most on an enterprise screen and how that ranking becomes layout — why there is no cap on how much information a screen may carry, the inverted triangle from broadest at the top to persona-specific at the bottom, what earns the top-left position, the three tenets of workflow then physicality then simplicity, the removal test, ranking the user's workflow above every stakeholder, establishing hierarchy without color, keeping information in view with sticky regions, and the prohibition on inner scrolling. Use when deciding what goes where on a screen, what to cut, whether a screen is finished, or how to rank competing requests. Trigger on "what matters most", "hierarchy", "priority", "too much on this screen", "overloaded", "density", "what should we cut", "sticky", "inner scroll", "is this screen done". Do NOT use for the page's structural composition — that is recursica-skill-screen-scaffolding.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Prioritizing a screen

These are the house rules for deciding what matters most on a screen, and turning that ranking into a layout. They are opinions, not neutral best practices — treat them as constraints.

These rules assume **complex enterprise web applications**, where people are doing real work, not glancing at information. That starting point matters more here than anywhere else in the family, and most of the rules below follow from it.

## The three governing principles

1. **There is no attention budget to ration out.** These screens properly carry dozens or hundreds of pieces of information. Prioritizing is about **order**, not about how much — and any rule that starts by limiting the count has misunderstood the product.
2. **The user's workflow outranks everything that can be changed.** Stakeholders, business units, and taste all lose to it. Legal, compliance, and hard technical limits do not.
3. **Simplifying is the last step, never the first.** Understand the workflow, connect the pieces, and only then remove what is not needed.

## There is no limit on how much a screen may hold

**Do not set a limit on the number of separate pieces of information.** Dozens, or hundreds, on one screen is acceptable, and often correct.

**"Primary attention" is not a useful way to think about it here.** That idea belongs to websites, where someone glances at information. In an enterprise application, people are working, and asking which single element grabs attention produces the wrong screen.

**So there is no rule for how many things may compete.** It depends entirely on the situation and the workflow, and an agent that wants a number is asking the wrong question.

### The real overload test

**Does the screen support the investigations and the actions that fit what the user is trying to do?** That is the test — especially on a dashboard or a landing page.

**The weaker sign:** the user cannot tell what they should do next. That is a symptom worth noticing, though admittedly a vague one.

**There is no single rule here, and that is part of what makes enterprise layout hard.** Where the answer really is unclear, ask instead of inventing a threshold — see `recursica-skill-design-router`.

## The inverted triangle

**Broadest at the top, most specific at the bottom.**

- **The top carries what applies to every persona** (a profile that represents one type of user) arriving at the page — the broadest, most widely useful content, shown largest.
- **Moving down, content becomes more detailed and more specific.**
- **The bottom may be specific to one persona**, useful only to some of the people who reach the page.

**Priority is shown by position or by size** — higher up the page, or larger. Those are the two tools.

## What earns the top left

**Almost always the client's logo — the brand of the product being built.** The reason is reinforcing the brand, and it is why this position is not available for content.

**There is one variation:** the logo in the upper right, with profile information in the upper left.

**The exception is rare.** A client who does not care about reinforcing the brand may hide it, but a logo appears somewhere in nearly every case.

## Ranking competing requirements

**The user's actual workflow wins over any stakeholder.** If the user needs it, it comes first.

**A stakeholder may overrule you anyway**, even where it harms the workflow. That is a real outcome, not a failure of the rule — good user-centred design still means arguing from the user's point of view.

**Business units rarely have competing requirements — they have different ones.** Treat them as fitting together, and resolve them by understanding the workflow and matching the user's mental model (a person's picture of how something works), rather than by judging between departments.

**A legal, compliance, or hard technical limit overrides the user's mental model.** Some things cannot be worked around, and the mental model has to change to fit them. This is the one thing that outranks the user.

**When stakeholders want everything on the screen**, stack-rank it: put every item in strict order, from most to least important. Find what matters most, make it clear, and give it visual priority — higher up, or larger.

## Density

Density is how tightly content is packed together.

**Density is decided by what the user comes to do every day, not by a preference.**

- **Reviewing information and digging into it** — a dashboard someone opens every morning — can handle more density.
- **Starting a flow** — arriving to do a task — calls for less.

There is no threshold; it follows the use case.

## The three tenets, and when a screen is finished

Work through them in order. The third depends on the first two being done.

1. **Workflow.** Understand what the user is trying to do, and build the screen — or the screens — so they can do it efficiently.
2. **Physicality.** Create connections between elements, pages, and screens, so that moving through them feels connected, rather than like data scattered at random.
3. **Simplicity.** Remove what is not needed. Doing the first two well makes this both possible and necessary.

### The removal test

For every piece of information, ask: **is the user's workflow harmed if I remove this?**

- **Yes** → keep it.
- **No** → remove it.
- **Possibly, or maybe** → do not remove it; **reduce it.** Shorten it, lower its priority, or move it down the triangle.

**One stated exception: a decorative icon.** An icon that changes nothing about how the interface is used may still be kept as a visual anchor — beside a heading, on pages whose layouts are otherwise almost the same. Owned by `recursica-skill-icon-semantics`. Nothing else survives a "no."

### A screen is complete when

**It meets the user's needs, judged against their workflow and mental model, and the simplifying pass is done** — content that is not needed has been removed, and the phrasing and wording of labels have been made as short as possible.

**Simplifying is the last step.** Simplify, confirm that the user's needs are still met, and it is finished.

## Hierarchy without color

Color is not available as a way to show hierarchy — meaning never depends on it alone, as `recursica-skill-system-conventions` says. What is left:

- **Typography** — the correct heading levels and type sizes. See `recursica-skill-typography-semantics`.
- **The balance of the layout.**
- **White space**, placed on purpose so that attention lands on what matters most.
- **Maximum widths.**
- **Images**, where the content supports them.
- **Position**, following the inverted triangle above.

**Scan patterns inform this, but only up to a point.** The F-pattern — the way people tend to scan text in the shape of an F — applies to substantial blocks of text. It does **not** reliably apply to tables or to visual surfaces such as a dashboard. So do not lay out a dense data screen as though someone were reading prose.

**No playful or decorative content.** Cat pictures and the like will never appear in a business application here.

## Frequency decides what holds permanent space

**Rank by how often the reader needs something, not by how much it matters when they do.** An occasional task can be important and still not deserve a permanent region. Importance is an argument for making it easy to find — which is what a well-placed trigger does.

**A form that is rarely used MUST NOT be kept permanently on the screen.** Creating a record, importing, configuring: each is occasional, each is large, and each takes up space all the time for something that almost every visit does not need. **The trigger stays visible; the form opens when asked for**, in a modal or a panel — see `recursica-skill-panels-modals`.

**The giveaway is a screen where the frequent thing has to share space with the rare one.** A table the reader came for, with a create form permanently beneath it, has given the rare task the same standing as the common one.

**This is not the same as the removal test** in the tenets above, which asks whether something is needed at all. Here, it is needed — the only question is whether it is needed _now_, on arrival, every time.

**Anything below a region of changing length is effectively not on the screen.** The bottom of a table with an unknown number of rows is at an unpredictable position. A reader who does not already know something is down there has no reason to scroll to the end of a list looking for it. Put it above the region, or in a surface that opens over it. Owned together with `recursica-skill-tables`.

## Progressive disclosure

Progressive disclosure is showing only what is needed now, with the rest available on request.

**What appears right away versus what is revealed later is a real tool**, and the system has components for it: accordions, trees, tabs, steppers, and revealing features based on a choice in a form. All of these exist.

**Which one to use depends on how cleanly the design comes together and how the information really divides up.** Each has its own rules — see `recursica-skill-accordion`, `recursica-skill-tree`, `recursica-skill-tabs`, `recursica-skill-stepper`, and `recursica-skill-forms`.

### A long form can beat a stepper

**Branching requires a stepper.** Where an answer changes a later step, break the form up.

**But information that refers back and forth favors one long form.** Where filling in one section depends on remembering or checking another, a stepper (a component that walks the user through numbered steps) becomes actively annoying. Moving forward and back to re-read is worse than scrolling up. Usability testing on a long credit-card application found that the single long form did better than the stepper for exactly this reason: the user wanted to confirm that the whole thing was correct and complete at once.

**So the question is how much has to stay in view**, not how long the form is. Owned jointly with `recursica-skill-forms`.

## Keeping information in view

**Sticky regions are valid** for information that must stay visible. (A sticky region stays in place while the rest of the page scrolls.) Examples are a running total, a status, or a summary of choices made across a screen that all relate to one object.

**The limit: beyond a sticky header, a sticky footer, and a permanent left navigation rail, only one more sticky element.** Every sticky region shrinks the space that actual content can use, so keep them to a minimum.

### Never use inner scrolling

**The application has one scrollbar.** The user scrolls the browser, from anywhere on the page, and the sticky regions stay in place.

**NEVER build an inner scrolling region.** Forcing someone to put the cursor inside a particular area before the scroll wheel does anything is the failure this prevents — see convention 4 in `recursica-skill-system-conventions`, and `recursica-skill-dashboards`, which forbids it there too.

**The one possible exception:** a table that fills the full width and height of the viewport. Even that is only a "maybe" — in general, no inner scrolling of any kind.

## Empty is not error

**Always tell them apart, with different messages.**

- **No rows returned** — the data loaded, and there is nothing to show. Say that clearly.
- **The rows could not be returned** — loading the data failed. Use a different message.

Treating the two as one leaves the user unable to tell whether to change their filters or try again later.

## Alignment across the application

**Separate sections must call the same things by the same names, and work the same way.** Different areas of an application can hold completely separate content and still be out of line with each other.

**There are two breaches to look for:**

1. **The same thing called by two different names** in two places. See `recursica-skill-naming-terminology`.
2. **Different workflows for the same kind of task** — a form submitted with one submit button in one section, and inline saving in another. See `recursica-skill-system-conventions` on one behavioral mode per system.

**Alignment is a review pass, run after the design is otherwise complete.** It is not something to check all the time while building.

**When you find a breach, raise it instead of quietly fixing it.** Bring it to the user, let them decide which way it should go, and then apply that decision across the whole application.

## Not your decision

- **Type styles, spacing tokens, and the layout grid.** These come from the design system.
- **The page's structure** — header, rail, footer, title, breadcrumb. `recursica-skill-screen-scaffolding`.
- **Whether a stakeholder's override is accepted.** Argue from the user's point of view; the decision is theirs.

## Out of scope

- **The page scaffold and layering** — `recursica-skill-screen-scaffolding`.
- **Which component a piece of content uses.** Each component skill decides.
- **Limits specific to dashboards** — how many charts and cards, and the workbench distinction — `recursica-skill-dashboards`.
- **Table columns, sorting, and pinning** — `recursica-skill-tables`.
- **Working-memory limits on how many options to show** — `recursica-skill-working-memory`. Those govern controls, not how much information a screen may show.

## Uncovered — ask, do not invent

- **How to judge "done" versus "overloaded" in terms of cognitive load** (the mental effort a task demands). Named as not covered. The workflow-support test above is what exists.
- **Where the inverted triangle stops applying.** This was asked directly and passed over; no limit was given.
- **Research on scan patterns.** Marked as belonging in the psychology skills, with citations, and not gathered yet — see `recursica-skill-working-memory` for the form it would take.
- **Alignment as its own skill.** Named as a design rule the family still needs, possibly run by a dedicated review agent. What is here are the criteria, not the process.
- **How empty and error states are laid out**, beyond the requirement that their messages differ. The wider topic of empty and error states still has no owner.
- **What makes an image appropriate** on an enterprise screen, given that playful content is ruled out completely.

## Pre-flight checklist

- [ ] You set no limit on how much information the screen carries, and no "primary attention" idea shaped the layout.
- [ ] You tested the screen against whether it supports the investigations and actions the user came to do.
- [ ] Content runs from broadest and largest at the top, to most specific and persona-dependent at the bottom.
- [ ] The top-left position holds the brand, unless the client has a reason otherwise.
- [ ] The user's workflow outranked every stakeholder request. Only a legal, compliance, or hard technical limit overrode it.
- [ ] Density matches what the user comes to do every day.
- [ ] You worked through all three tenets in order, with simplifying last.
- [ ] Every element passed the removal test, and you reduced anything uncertain instead of cutting it.
- [ ] You simplified the labels and phrasing as the final step.
- [ ] Hierarchy is carried by typography, position, white space, and width — never by color alone.
- [ ] There is no playful or decorative content.
- [ ] Nothing rarely used holds permanent space on the screen. Occasional forms — create, import, configure — open from a visible trigger into a modal or panel, instead of sitting permanently on the page.
- [ ] Nothing the reader must find sits below a region of changing length.
- [ ] Progressive disclosure uses an existing component, and you chose a long form over a stepper where the information refers back and forth.
- [ ] Beyond the header, footer, and navigation rail, there is at most one sticky element.
- [ ] There is one scrollbar, and you built no inner scrolling region.
- [ ] Empty and error states have different messages.
- [ ] You ran an alignment pass against the other sections, and raised any breach with the user instead of quietly resolving it.
- [ ] You invented nothing from the uncovered list.
