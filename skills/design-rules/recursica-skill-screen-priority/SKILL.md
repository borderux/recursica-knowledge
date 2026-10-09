---
name: recursica-skill-screen-priority
description: House rules for ranking what matters on a screen and turning the ranking into a layout — no cap on information, the inverted triangle, the top-left position, workflow then physicality then simplicity, the removal test, hierarchy without color, sticky regions, and no inner scrolling. Use when deciding what goes where or what to cut. Not for page structure — see recursica-skill-screen-scaffolding.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Prioritizing a screen

The rules in this skill are house rules. The house rules are opinions, not neutral best practices. Treat every house rule as a constraint.

The rules assume **complex enterprise web applications**, where the persona does real work instead of glancing at information. Most of the rules below follow from the enterprise assumption. The enterprise assumption matters more here than in any other Recursica skill.

## The three governing principles

1. **Set no limit on how much information competes for attention on a screen.** An enterprise screen correctly holds dozens or hundreds of pieces of information. Prioritizing sets the order of the information, not the amount. A rule that starts by capping the amount of information misunderstands the product.
2. **Rank the persona's workflow above every factor that can be changed.** The workflow wins over stakeholders, business units and taste. Legal limits, compliance limits and hard technical limits win over the workflow.
3. **Simplify last, never first.** Understand the workflow first. Then connect the elements, pages and screens. Only then remove the content the persona does not need.

## No limit on the amount of information

**Do not set a limit on the number of separate pieces of information on a screen.** An order number, a status and a total are three pieces of information. Dozens or hundreds of pieces of information on one screen are acceptable, and often correct.

**"Primary attention" is not a useful idea for an enterprise screen.** Primary attention means the one element that grabs attention first. The idea belongs to websites, where a visitor glances at information. In an enterprise application, the persona is working. Asking which single element grabs attention produces the wrong screen.

**Set no number for how many elements may compete for attention, such as "at most five".** The right number depends entirely on the situation and the workflow. An agent that wants a number is asking the wrong question.

### The overload test

**Test a screen for overload by asking whether the screen supports what the persona is trying to do.** Use the overload test especially on a dashboard or a landing page. The screen supports two kinds of work:

- the investigations that fit the persona's task, such as finding out why an order is late
- the actions that fit the persona's task, such as reassigning the late order

**A weaker sign of overload is a persona who cannot tell what to do next.** The sign is vague, but worth noticing.

**When the overload test gives no clear answer, confirm with the user.** Do not invent a threshold, such as a maximum number of fields. Enterprise layout is hard partly because no single rule decides when a screen is overloaded. See `recursica-skill-design-router`.

## The inverted triangle

**Put the broadest content at the top of the page and the most specific content at the bottom.** For example, an Orders page shows the totals every persona checks at the top. A report only the finance team reads sits at the bottom.

- **Put the content that applies to every persona arriving at the page at the top.** The top content is the broadest and most widely useful. Show the top content largest.
- **Make content more detailed and more specific further down the page.**
- **The bottom of the page may hold content for one role.** Role-specific content is useful only to some of the personas who reach the page.

**Show priority with two tools: position and size.** Content higher up the page, or larger, has higher priority.

## The top-left position

**Put the client's logo in the top-left corner of the screen in almost every case.** The logo shows and reinforces the brand of the product being built. The top-left corner is therefore not available for content.

**The logo may instead sit in the top-right corner, with the profile information in the top-left corner.**

**A screen with no logo is a rare exception.** A client who does not care about reinforcing the brand may hide the logo.

## Ranking competing requirements

**Put the persona's actual workflow ahead of any stakeholder.** For example, a stakeholder wants a promotion banner above the order table. The order table the persona works in comes first.

**A stakeholder may still overrule the designer, even where the stakeholder's decision harms the workflow.** A stakeholder's override is a real outcome, not a failure of the rule. Still argue from the persona's point of view, as good user-centered design requires.

**Treat the requirements of different business units as parts that fit together.** Business units rarely have competing requirements, only different requirements. For example, finance needs the invoice total and shipping needs the delivery date. One order screen can show both fields.

- Resolve the requirements by understanding the workflow.
- Resolve the requirements by matching the persona's mental model (what a person expects, based on the tools and work the person already knows).
- Do not resolve the requirements by judging between departments.

**Let a legal limit, a compliance limit or a hard technical limit override the persona's mental model.** For example, a regulation may require a second approval before a payment goes out. A legal, compliance or hard technical limit cannot be worked around. The persona's mental model has to change to fit the limit. Legal, compliance and hard technical limits are the only requirements that outrank the persona.

**If stakeholders want every item on the screen, stack-rank the items.**

- Put every item in strict order, from most important to least important.
- Find the most important item, and make the most important item clear.
- Give the most important item visual priority: place the item higher up, or make the item larger.

## Density

Density is how tightly content is packed together.

**Choose density by what the persona comes to do every day, not by a preference.**

- **A screen for reviewing information and exploring the information in detail can handle more density.** An example is a dashboard a persona opens every morning.
- **Use less density on a screen for starting a flow,** such as the first screen of a return request. The persona arrives at the screen to do a task.

Base density on the use case, not on a threshold.

## The three tenets and the finished screen

**Apply the three tenets in order: workflow, then physicality, then simplicity.** Simplicity depends on workflow and physicality being done first.

1. **Workflow.** Understand what the persona is trying to do. Build the screen, or the screens, so the persona can do the task efficiently.
2. **Physicality.** Create connections between elements, pages and screens. For example, a customer name in an order table links to the customer's page. Make moving between elements, pages and screens feel connected, not like data scattered at random.
3. **Simplicity.** Remove the content that is not needed. Doing workflow and physicality well makes simplicity both possible and necessary.

### The removal test

**For every piece of information, ask whether removing the piece of information harms the persona's workflow.** For example, ask whether removing the order date from a table of orders stops the persona from spotting late orders.

- **Yes** → keep the piece of information.
- **No** → remove the piece of information.
- **Possibly, or maybe** → do not remove the piece of information. Reduce the piece of information instead, in any of the following ways:
  - Shorten the piece of information.
  - Lower the priority of the piece of information.
  - Move the piece of information down the inverted triangle.

**A decorative icon is the one stated exception to the removal test.** A decorative icon changes nothing about how the interface is used. A decorative icon may still sit beside a heading on pages whose layouts are otherwise almost the same. For example, an icon beside each heading helps the persona tell the Orders and Returns pages apart. The icon gives the eye a point to find. `recursica-skill-icon-semantics` states the rule for the decorative-icon exception. Remove every other piece of information that gets a "no."

### A finished screen

**A screen is complete when the screen meets the persona's needs and the third tenet, simplicity, is done.** Judge the persona's needs against the persona's workflow and mental model. The simplicity tenet has two parts:

- Remove the content that is not needed.
- Make the phrasing and wording of labels as short as possible.

**Simplify the screen as the last step.** Then check that the screen still meets the persona's needs. The screen is then finished.

## Hierarchy without color

**Do not use color to show hierarchy.** Meaning never depends on color alone, as `recursica-skill-system-conventions` says. For example, a section title stands out as a larger heading, not as blue text. Show hierarchy with the following tools:

- **Typography**, meaning the correct heading levels and type sizes. See `recursica-skill-typography-semantics`.
- **The balance of the layout.**
- **White space**, placed on purpose to draw attention to the most important content.
- **Maximum widths.**
- **Images**, where the content supports images.
- **Position**, following the inverted triangle above.

**Scan patterns help set hierarchy, but only up to a point.** The F-pattern is the way people tend to scan text in the shape of the letter F. The F-pattern applies to long blocks of text, such as a help article. The F-pattern does not reliably apply to tables, or to visual areas such as a dashboard. Do not lay out a dense data screen as though the persona were reading prose.

**Never add playful or decorative content.** Cat pictures and similar content never appear in a Recursica business application.

## Permanent space for frequent tasks

**Rank content by how often the persona needs the content, not by how much the content matters.** An occasional task can matter a lot when the persona needs the task. The task can still go without a permanent region on the screen. For example, a monthly export gets a button, not a region of the page. Importance is a reason to make the task easy to find. A well-placed trigger makes the task easy to find.

**A rarely used form MUST NOT be kept permanently on the screen.** Three kinds of form are each occasional and each large:

- a form that adds a record
- a form for importing
- a form for configuring

A form for adding a record, importing or configuring takes up space on every visit. Almost no visit needs the form's task.

- Keep the trigger for the form visible, such as an "Add customer" button.
- Open the form in a modal or a panel when the persona asks for the form. See `recursica-skill-panels-modals`.

**A screen breaks the frequency ranking when the frequent task has to share space with a rare task.** For example, a form that adds a customer sits permanently below the Customers table the persona came for. The form gives the rare task the same permanent space as the common task.

**Ranking by frequency is not the same as the removal test** in the three tenets above. The removal test asks whether a piece of information is needed at all. Ranking by frequency applies to content that is needed. Ranking by frequency asks only whether the content is needed _now_, on arrival, every time.

**Personas miss any content placed below a region of changing length, such as a table or a list.** The bottom of a table with an unknown number of rows sits at an unpredictable position on the page. A persona who does not know about the content has no reason to scroll to the end of the list. Put the content in one of two places instead:

- above the region of changing length, such as order totals above the Orders table
- in a region that holds content and opens over the region of changing length

A page, a panel and a modal are examples of a region that opens over the region of changing length.

`recursica-skill-tables` states the same rule about regions of changing length.

## Progressive disclosure

Progressive disclosure shows only the content the persona needs now. The remaining content appears when the persona asks for the content.

**Choosing which content appears right away and which content appears later is a real design tool.** Recursica has the following components for progressive disclosure:

- accordions
- trees
- tabs
- steppers
- content and controls that a choice in a form reveals, such as a "Company name" field that appears after "Business account" is picked

**Confirm the progressive-disclosure component with the user.** The right component depends on two factors:

- how the information divides into parts
- which component makes the whole design fit together most cleanly

Each component has separate rules. See `recursica-skill-accordion`, `recursica-skill-tree`, `recursica-skill-tabs`, `recursica-skill-stepper`, and `recursica-skill-forms`.

### A long form versus a stepper

**Branching requires a stepper.** If an answer changes a later step, break the form into steps. For example, picking "Ship to a store" shows a store step instead of an address step.

**Prefer one long form when the information refers back and forth.** A stepper becomes actively annoying when filling in one form section depends on remembering or checking another section. Moving forward and back to re-read is worse than scrolling up.

Usability testing on a long credit-card application found that the single long form did better than the stepper. The long form did better for the reason above. A participant in the test wanted to confirm at once that the whole form was correct and complete.

**Choose between a stepper and one long form by how much information has to stay in view.** Do not choose by how long the form is. `recursica-skill-forms` states the same rule.

## Keeping information in view

**A sticky region may hold information that must stay visible.** A sticky region stays in place while the page scrolls. Examples:

- a running total
- a status
- a summary of the choices made across a screen, when all the choices relate to one object

**Beyond a sticky header, a sticky footer and a permanent left navigation rail, add only one more sticky element.** Every sticky region shrinks the space left for content. Keep sticky regions to a minimum.

### No inner scrolling

**The application has one scrollbar.** The persona scrolls the browser with the pointer at any point on the page. The sticky regions stay in place.

**NEVER build an inner scrolling region.** An inner scrolling region forces the persona to point inside one area before the scroll wheel moves the content. For example, a list that scrolls inside a card moves only while the pointer is over the card. The one-scrollbar rule prevents the failure. See convention 4 in `recursica-skill-system-conventions`. `recursica-skill-dashboards` also forbids inner scrolling on dashboards.

**The one possible exception is a table that fills the full width and height of the viewport.** Even the full-viewport table is only a "maybe." In general, build no inner scrolling of any kind.

## Empty states and error states

**Always tell an empty state apart from an error state, with different messages.**

- **No rows returned.** The data loaded, and there are no rows to show. Say clearly that there are no rows, such as "No orders match the filters."
- **The rows could not be returned.** Loading the data failed. Use a different message, such as "Orders could not load."

With one message for both states, the persona cannot tell whether to change the filters or try again later.

## Alignment across the application

**Separate sections must call the same concept by the same name, and must work the same way.** For example, if the Orders section says "Customer", the Billing section says "Customer" too, not "Client". Two sections with completely separate content can still use two names for one concept. The two sections can also work in two different ways.

**Look for two kinds of mismatch:**

1. **The same concept called by two different names** in two places. See `recursica-skill-naming-terminology`.
2. **Different workflows for the same kind of task.** For example, one section submits a form with one submit button. Another section saves each change inline, as the persona makes the change. See `recursica-skill-system-conventions` on one behavioral mode per system.

**Run alignment as a review pass, after the design is otherwise complete.** Do not check alignment all the time while building.

**Raise every mismatch with the user. Never fix a mismatch without telling the user.** The user decides how the mismatch is resolved, such as whether "Customer" or "Client" stays. Then apply the user's decision across the whole application.

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

- **How to judge "done" versus "overloaded" in terms of cognitive load.** The topic is named as not covered. The overload test above, which asks whether the screen supports the persona's workflow, is the only test so far.
- **Where the inverted triangle stops applying.** The question was asked directly and passed over. No limit was given.
- **Research on scan patterns.** Research on scan patterns is marked as belonging in the psychology skills, with citations, and is not gathered yet. See `recursica-skill-working-memory` for the form a psychology skill on scan patterns would take.
- **Alignment as a separate skill.** Alignment is named as a design rule the skill family still needs, possibly run by a dedicated review agent. This skill gives the criteria for a mismatch, not the review process.
- **How empty and error states are laid out**, beyond the requirement that empty and error states have different messages. No skill owns the wider topic of empty and error states yet.
- **What makes an image appropriate** on an enterprise screen, given that playful content is ruled out completely.

## Pre-flight checklist

- [ ] No limit caps how much information the screen shows, and the idea of "primary attention" did not shape the layout.
- [ ] The screen supports the investigations and actions the persona came to do.
- [ ] Content runs from broadest and largest at the top, to most specific and role-dependent at the bottom.
- [ ] The top-left corner holds the brand, unless the client has a reason otherwise.
- [ ] The persona's workflow outranked every stakeholder request. Only a legal, compliance, or hard technical limit overrode the persona's workflow.
- [ ] Density matches what the persona comes to do every day.
- [ ] The three tenets were applied in order: workflow, then physicality, then simplicity.
- [ ] Every element passed the removal test, and every element with an uncertain answer is reduced instead of cut.
- [ ] Labels and phrasing are as short as possible, simplified as the final step.
- [ ] Hierarchy is shown by typography, position, white space, and width, never by color alone.
- [ ] The screen has no playful or decorative content.
- [ ] No rarely used element holds permanent space on the screen.
- [ ] Occasional forms for creating, importing and configuring open from a visible trigger into a modal or a panel.
- [ ] No content the persona must find sits below a region of changing length, such as a table or a list.
- [ ] Progressive disclosure uses an existing component, and a long form replaces a stepper where the information refers back and forth.
- [ ] Beyond the header, footer, and navigation rail, the screen has at most one sticky element.
- [ ] The application has one scrollbar, and no inner scrolling region.
- [ ] Empty and error states have different messages.
- [ ] An alignment pass against the other sections is complete.
- [ ] Every mismatch went to the user to decide, and no mismatch was resolved without telling the user.
- [ ] Open questions were asked about, not decided: judging done versus overloaded by cognitive load, where the inverted triangle stops applying, research on scan patterns, alignment as a separate skill, how empty and error states are laid out, and what makes an image appropriate.
