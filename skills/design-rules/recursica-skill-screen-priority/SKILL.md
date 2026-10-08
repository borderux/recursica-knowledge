---
name: recursica-skill-screen-priority
description: House rules for ranking what matters on a screen and turning the ranking into a layout — no cap on information, the inverted triangle, the top-left position, workflow then physicality then simplicity, the removal test, hierarchy without color, sticky regions, and no inner scrolling. Use when deciding what goes where or what to cut. Not for page structure — see recursica-skill-screen-scaffolding.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Prioritizing a screen

The house rules below rank what matters most on a screen and turn the ranking into a layout. The house rules are opinions, not neutral best practices. Treat every house rule as a constraint.

The rules assume **complex enterprise web applications**, where people do real work instead of glancing at information. The enterprise assumption matters more in this skill than in any other Recursica skill. Most of the rules below follow from the enterprise assumption.

## The three governing principles

1. **Set no limit on how much information competes for attention on a screen.** An enterprise screen correctly holds dozens or hundreds of pieces of information. Prioritizing sets the order of the information, not the amount. Any rule that starts by limiting the number of pieces of information misunderstands the product.
2. **Rank the persona's workflow above every factor that can be changed.** The persona's workflow wins over stakeholders, business units and taste. Legal limits, compliance limits and hard technical limits win over the persona's workflow.
3. **Simplify last, never first.** Understand the workflow first. Then connect the elements, pages and screens. Only then remove the content the persona does not need.

## No limit on the amount of information

**Do not set a limit on the number of separate pieces of information on a screen.** Dozens or hundreds of pieces of information on one screen are acceptable, and often correct.

**"Primary attention" is not a useful idea for an enterprise screen.** The idea of primary attention belongs to websites, where a visitor glances at information. In an enterprise application, people are working. Asking which single element grabs attention produces the wrong screen.

**Set no number for how many elements may compete for attention.** The number depends entirely on the situation and the workflow. An agent that wants a number is asking the wrong question.

### The overload test

**Ask whether the screen supports the investigations and the actions that fit what the persona is trying to do.** The question is the test for overload, especially on a dashboard or a landing page.

**A weaker sign of overload is a persona who cannot tell what to do next.** The sign is vague, but worth noticing.

**If the overload answer is unclear, confirm with the user instead of inventing a threshold.** No single rule decides when a screen is overloaded. The lack of a single rule is part of why enterprise layout is hard. See `recursica-skill-design-router`.

## The inverted triangle

**Put the broadest content at the top of the page and the most specific content at the bottom.**

- **Put the content that applies to every persona arriving at the page at the top.** The top content is the broadest and most widely useful. Show the top content largest.
- **Make content more detailed and more specific further down the page.**
- **The bottom of the page may hold content specific to one role.** Role-specific content is useful only to some of the personas who reach the page.

**Show priority by position or by size.** Higher up the page, or larger, means higher priority. Position and size are the two tools for priority.

## The top-left position

**Put the client's logo in the top-left position in almost every case.** The logo is the brand of the product being built, and the logo reinforces the brand. The top-left position is therefore not available for content.

**The logo may instead sit in the upper right, with the profile information in the upper left.**

**A screen with no logo is a rare exception.** A client who does not care about reinforcing the brand may hide the logo.

## Ranking competing requirements

**Put the persona's actual workflow ahead of any stakeholder.** The persona's needs come first.

**A stakeholder may still overrule the designer, even where the stakeholder's decision harms the workflow.** A stakeholder's override is a real outcome, not a failure of the rule. Still argue from the persona's point of view, as good user-centered design requires.

**Treat the requirements of different business units as parts that fit together.** Business units rarely have competing requirements. Business units have different requirements. Resolve the requirements by understanding the workflow and by matching the persona's mental model (what a person expects, based on the tools and work the person already knows). Do not resolve the requirements by judging between departments.

**Let a legal limit, a compliance limit or a hard technical limit override the persona's mental model.** Legal, compliance and hard technical limits cannot be worked around. The persona's mental model has to change to fit the limits. Legal, compliance and hard technical limits are the only requirements that outrank the persona.

**If stakeholders want every item on the screen, stack-rank the items.** Put every item in strict order, from most important to least important. Find the most important item, and make that item clear. Give the most important item visual priority: place the item higher up, or make the item larger.

## Density

Density is how tightly content is packed together.

**Choose density by what the persona comes to do every day, not by a preference.**

- **A screen for reviewing information and exploring the information in detail can handle more density.** An example is a dashboard a persona opens every morning.
- **Use less density on a screen for starting a flow.** The persona arrives at the screen to do a task.

Base density on the use case, not on a threshold.

## The three tenets and the finished screen

**Apply the three tenets in order: workflow, then physicality, then simplicity.** Simplicity depends on workflow and physicality being done first.

1. **Workflow.** Understand what the persona is trying to do. Build the screen, or the screens, so the persona can do the task efficiently.
2. **Physicality.** Create connections between elements, pages and screens. Make moving through the elements, pages and screens feel connected, not like data scattered at random.
3. **Simplicity.** Remove the content that is not needed. Doing workflow and physicality well makes simplicity both possible and necessary.

### The removal test

**For every piece of information, ask whether removing the piece of information harms the persona's workflow.**

- **Yes** → keep the piece of information.
- **No** → remove the piece of information.
- **Possibly, or maybe** → do not remove the piece of information. Reduce the piece of information instead, in any of these ways:
  - Shorten the piece of information.
  - Lower the priority of the piece of information.
  - Move the piece of information down the inverted triangle.

**A decorative icon is the one stated exception to the removal test.** A decorative icon changes nothing about how the interface is used. On pages whose layouts are otherwise almost the same, a decorative icon may still sit beside a heading. The icon gives the eye a point to find. `recursica-skill-icon-semantics` states the rule for the decorative-icon exception. Remove every other piece of information that gets a "no."

### A finished screen

**A screen is complete when the screen meets the persona's needs and the third tenet, simplicity, is done.** Judge the persona's needs against the persona's workflow and mental model. In the simplicity tenet, remove the content that is not needed. Also make the phrasing and wording of labels as short as possible.

**Simplify the screen as the last step.** Then confirm that the screen still meets the persona's needs. The screen is then finished.

## Hierarchy without color

**Do not use color to show hierarchy.** Meaning never depends on color alone, as `recursica-skill-system-conventions` says. Show hierarchy with the following tools:

- **Typography**, meaning the correct heading levels and type sizes. See `recursica-skill-typography-semantics`.
- **The balance of the layout.**
- **White space**, placed on purpose to draw attention to the most important content.
- **Maximum widths.**
- **Images**, where the content supports images.
- **Position**, following the inverted triangle above.

**Scan patterns inform hierarchy, but only up to a point.** The F-pattern is the way people tend to scan text in the shape of an F. The F-pattern applies to substantial blocks of text. The F-pattern does not reliably apply to tables or to visual areas such as a dashboard. Do not lay out a dense data screen as though someone were reading prose.

**Never add playful or decorative content.** Cat pictures and similar content never appear in a Recursica business application.

## Permanent space for frequent tasks

**Rank content by how often the reader needs the content.** Do not rank content by how much the content matters when the reader needs the content. An occasional task can be important and still not get a permanent region on the screen. Importance is a reason to make the task easy to find. A well-placed trigger makes the task easy to find.

**A rarely used form MUST NOT be kept permanently on the screen.** Forms for creating a record, importing and configuring are each occasional and each large. A form for creating, importing or configuring takes up space on every visit. Almost no visit needs the form's task. Keep the trigger for the form visible. Open the form in a modal or a panel when the persona asks for the form. See `recursica-skill-panels-modals`.

**A screen breaks the frequency ranking when the frequent task has to share space with a rare task.** For example, a create form sits permanently below the table the reader came for. The create form gives the rare task the same permanent space as the common task.

**Ranking by frequency is not the same as the removal test** in the three tenets above. The removal test asks whether a piece of information is needed at all. Ranking by frequency applies to content that is needed. Ranking by frequency asks only whether the content is needed _now_, on arrival, every time.

**Readers miss any content placed below a region of changing length.** The bottom of a table with an unknown number of rows is at an unpredictable position. A reader unaware of the content below the region has no reason to scroll to the end of a list. Put the content in one of two places instead:

- above the region of changing length
- in a region that holds content and opens over the region of changing length. Examples are a page, a panel and a modal.

This skill and `recursica-skill-tables` share the rule about regions of changing length.

## Progressive disclosure

Progressive disclosure shows only the content needed now. The remaining content is available on request.

**Choosing which content appears right away and which content appears later is a real design tool.** Recursica has the following components for progressive disclosure:

- accordions
- trees
- tabs
- steppers
- content and controls that a choice in a form reveals

**Confirm the progressive-disclosure component with the user.** The right component depends on two factors:

- how the information divides into parts
- which component makes the whole design fit together most cleanly

Each component has separate rules. See `recursica-skill-accordion`, `recursica-skill-tree`, `recursica-skill-tabs`, `recursica-skill-stepper`, and `recursica-skill-forms`.

### A long form versus a stepper

**Branching requires a stepper.** If an answer changes a later step, break the form into steps.

**Prefer one long form when the information refers back and forth.** When filling in one form section depends on remembering or checking another form section, a stepper becomes actively annoying. Moving forward and back to re-read is worse than scrolling up. Usability testing on a long credit-card application found that the single long form did better than the stepper. The long form did better for exactly the reason above. A participant in the test wanted to confirm at once that the whole form was correct and complete.

**Choose between a stepper and one long form by how much information has to stay in view.** Do not choose by how long the form is. This skill and `recursica-skill-forms` share the rule.

## Keeping information in view

**A sticky region may hold information that must stay visible.** A sticky region stays in place while the page scrolls. Examples are a running total and a status. Another example is a summary of choices made across a screen, when all the choices relate to one object.

**Beyond a sticky header, a sticky footer and a permanent left navigation rail, add only one more sticky element.** Every sticky region shrinks the space left for content. Keep sticky regions to a minimum.

### No inner scrolling

**The application has one scrollbar.** The persona scrolls the browser with the pointer at any point on the page. The sticky regions stay in place.

**NEVER build an inner scrolling region.** An inner scrolling region forces the persona to point inside one area before the scroll wheel moves the content. The one-scrollbar rule prevents the failure. See convention 4 in `recursica-skill-system-conventions`. `recursica-skill-dashboards` also forbids inner scrolling on dashboards.

**The one possible exception is a table that fills the full width and height of the viewport.** Even the full-viewport table is only a "maybe." In general, build no inner scrolling of any kind.

## Empty states and error states

**Always tell an empty state apart from an error state, with different messages.**

- **No rows returned.** The data loaded, and there are no rows to show. Say clearly that there are no rows.
- **The rows could not be returned.** Loading the data failed. Use a different message.

With one message for both states, the persona cannot tell whether to change the filters or try again later.

## Alignment across the application

**Separate sections must call the same concept by the same name, and must work the same way.** Two sections with completely separate content can still call one concept by two different names. The two sections can also work in two different ways.

**Look for two kinds of breach:**

1. **The same concept called by two different names** in two places. See `recursica-skill-naming-terminology`.
2. **Different workflows for the same kind of task.** For example, one section submits a form with one submit button, and another section saves inline. See `recursica-skill-system-conventions` on one behavioral mode per system.

**Run alignment as a review pass, after the design is otherwise complete.** Do not run alignment as a check all the time while building.

**If a breach turns up, raise the breach with the user instead of fixing the breach without telling the user.** Let the user decide which way the breach is resolved. Then apply the user's decision across the whole application.

## Set by the theme or the component

- **Type styles, spacing tokens, and the layout grid.** The design system sets the type styles, spacing tokens and layout grid.
- **The page's structure:** the header, navigation rail, footer, title and breadcrumb. `recursica-skill-screen-scaffolding` sets the page's structure.
- **Whether a stakeholder's override is accepted.** Argue from the persona's point of view. The stakeholder makes the decision.

## Out of scope

- **The page structure and layering** — `recursica-skill-screen-scaffolding`.
- **Which component a piece of content uses.** Each component skill decides.
- **Limits specific to dashboards**, such as how many charts and cards a dashboard holds — `recursica-skill-dashboards`.
- **The difference between a dashboard and a workbench** — `recursica-skill-dashboards`.
- **Table columns, sorting, and pinning** — `recursica-skill-tables`.
- **Working-memory limits on how many options to show** — `recursica-skill-working-memory`. Working-memory limits govern controls, not how much information a screen may show.

## Open questions

- **How to judge "done" versus "overloaded" in terms of cognitive load.** This topic is named as not covered. The overload test above, which asks whether the screen supports the persona's workflow, is the only test so far.
- **Where the inverted triangle stops applying.** This question was asked directly and passed over. No limit was given.
- **Research on scan patterns.** Research on scan patterns is marked as belonging in the psychology skills, with citations, and is not gathered yet. See `recursica-skill-working-memory` for the form a psychology skill on scan patterns would take.
- **Alignment as a separate skill.** Alignment is named as a design rule the skill family still needs, possibly run by a dedicated review agent. This skill gives the criteria for a breach, not the review process.
- **How empty and error states are laid out**, beyond the requirement that empty and error states have different messages. No skill owns the wider topic of empty and error states yet.
- **What makes an image appropriate** on an enterprise screen, given that playful content is ruled out completely.

## Pre-flight checklist

- [ ] No limit caps how much information the screen shows, and the idea of "primary attention" did not shape the layout.
- [ ] The screen supports the investigations and actions the persona came to do.
- [ ] Content runs from broadest and largest at the top, to most specific and role-dependent at the bottom.
- [ ] The top-left position holds the brand, unless the client has a reason otherwise.
- [ ] The persona's workflow outranked every stakeholder request. Only a legal, compliance, or hard technical limit overrode the persona's workflow.
- [ ] Density matches what the persona comes to do every day.
- [ ] The three tenets were applied in order: workflow, then physicality, then simplicity.
- [ ] Every element passed the removal test, and every element with an uncertain answer is reduced instead of cut.
- [ ] Labels and phrasing are as short as possible, simplified as the final step.
- [ ] Hierarchy is shown by typography, position, white space, and width, never by color alone.
- [ ] The screen has no playful or decorative content.
- [ ] No rarely used element holds permanent space on the screen.
- [ ] Occasional forms for creating, importing and configuring open from a visible trigger into a modal or a panel.
- [ ] No content the reader must find sits below a region of changing length.
- [ ] Progressive disclosure uses an existing component, and a long form replaces a stepper where the information refers back and forth.
- [ ] Beyond the header, footer, and navigation rail, the screen has at most one sticky element.
- [ ] The application has one scrollbar, and no inner scrolling region.
- [ ] Empty and error states have different messages.
- [ ] An alignment pass against the other sections is complete.
- [ ] Every breach went to the user to decide, and no breach was resolved without telling the user.
- [ ] Open questions were asked about, not decided: judging done versus overloaded by cognitive load, where the inverted triangle stops applying, research on scan patterns, alignment as a separate skill, how empty and error states are laid out, and what makes an image appropriate.
