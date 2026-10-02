---
name: recursica-skill-responsive-behavior
description: House rules below desktop — tablet and small breakpoints, the 1200 content width, responsive reflow versus adaptive removal, what may be dropped, navigation patterns, panels and modals becoming pages, no native mobile patterns, and tables below tablet. Use when a layout must work on tablets, phones, or narrow screens. Not for panel, modal, or page at desktop — see recursica-skill-panels-modals.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Responsive behavior below desktop

These are the house rules for what happens as a viewport gets narrower than desktop size. They are opinions, not neutral best practices — treat them as constraints.

These rules assume **complex enterprise web applications, designed for desktop first**. Work below desktop size is rare here. Most of what the house builds is aimed at desktop, and often nothing below desktop is designed at all. That rarity is why the rules below rely so heavily on asking instead of assuming.

## The three governing principles

1. **Below desktop is a decision, not something that happens by default.** Desktop is assumed. Anything narrower is either designed on purpose or openly unsupported — never whatever the CSS happens to do.
2. **Responsive reflows; adaptive removes. Both are strategies, and adaptive is the one people forget.** To reflow is to rearrange content so it fits the space. Most people never ask what could be taken out.
3. **How the product is used decides what changes, not the number of pixels.** Who is holding the device, where they are, and what they are trying to do. The user's workflow gives the answer. Where the workflow is not known, ask.

## Ask these before choosing any pattern

**These are questions to ask at the start, not during review.** They change the navigation pattern, so they have to be answered before it is chosen. Having to fix it afterward is the failure this prevents.

1. **How likely is it that a tablet or a phone will be a main way people use this?** Desktop is assumed. If these other situations are real, they get built in from the beginning.
2. **What does "responsive" mean to this client?** There are three different promises hiding behind the word, and they cannot be swapped for each other:
   - **It does not break.** Content reflows, but nothing beyond that was checked.
   - **It is a designed, checked experience** on the smaller size.
   - **Phones are actively not supported.**
     Do not assume the middle one because it sounds the most professional. Ask which one applies.
3. **What range of viewports does this business have?** A factory floor of very old desktops limited to 1024 is a different problem from a guaranteed 1440. In the first case, being responsive is about getting narrower; in the second, it is about what happens when it gets wider.
4. **What is the main way people give input?** Mouse and keyboard is assumed, but touch is possible even on desktop — and the real cases get stranger. There are capacitive touchscreens (which sense a bare finger) and resistive ones (which need pressure), gloved hands that cannot take the gloves off, and a joystick standing in for a mouse on a factory floor. Each one is a different interaction pattern.

## The breakpoints

A breakpoint is the screen width at which the layout changes. There are three tiers, and only three: **desktop, tablet, small device.**

| Tier             | Default width | What it is                                                                               |
| ---------------- | ------------- | ---------------------------------------------------------------------------------------- |
| **Desktop**      | 1200          | The largest breakpoint, and **the maximum content width of the main content area**       |
| **Tablet**       | 1024          | The width below which panels become pages and tables disappear                           |
| **Small device** | 400           | Phone. Set on purpose, replacing the looser range of 330 to 360 that gets used elsewhere |

**1200 is a maximum for the content area, not for the page.** Headers, footers, and other sticky chrome (the header, navigation and footer around the content) are not limited by it and may stretch across the full viewport. Viewports wider than 1200 are normal; the content does not stretch to fill them — see `recursica-skill-screen-scaffolding`.

**These are defaults, and changing them is very rare.** They are standard enough that changing one should be a stated decision, made with the user at design time — not a change made without telling the user.

## Responsive and adaptive are two different strategies

**Responsive means the layout reflows.** Components move and rewrap, but the same things are there.

**Adaptive means something different happens.** Not rearranging, and not CSS switched around — a different element is shown, or a feature is not offered at all.

**Both belong below desktop, and adaptive is the half that gets skipped.** The question "what can we take out?" is the one most teams never ask.

**A narrow layout must be adaptive as well as responsive.** Features that are used less often in that setting may properly be left out.

## What may be dropped

**How the product is used decides, and nothing else does.** Someone on a tablet or a phone is probably not sitting at a desk. Switching between apps is much harder on a phone than on a laptop. Those facts about the situation — not the width — decide what is worth keeping.

**Nothing is fixed in advance as something that can be dropped, and nothing is protected from being dropped.** When asked whether any type of information is strictly forbidden from being dropped, no matter the context, the answer was no.

**So this is always a conversation with the designer.** MUST NOT decide alone what a narrow screen loses — raise it, as `recursica-skill-design-router` says. An agent that quietly drops a feature at 400px has invented a house rule.

**Sometimes the answer is to hide something completely**, because it cannot be shown well at that size. The table is the standard example.

## Viewport, not container

**Base the adaptation on the width of the viewport.** It is the safer signal, and no case was found where content should adapt to the width of the container it sits in.

**A small viewport on a large machine still counts.** Someone running the application in a browser window that is not full screen, or in a split view on a laptop, has reached the breakpoint, and the breakpoint should take effect.

## What becomes a page

**A panel becomes a page below tablet size.** A panel is a context overlay — it exists so the user can work beside the page they came from. On a small device there is no room to lay context over anything, so the panel has no purpose left. Owned by `recursica-skill-panels-modals`.

**A modal becomes a page below tablet size only when work is done in it.** The test is whether the user is doing work:

- **A small workflow, a form, or editing details in a modal → a page.**
- **A confirmation stays a modal.** "Are you sure you want to delete this?" is not work, and there is no problem with showing it at any size.

**Anything that exists to sit on top of something else loses its purpose on a small screen**, because the context underneath cannot be seen anyway.

## Never import a platform pattern

**MUST NOT adopt iOS or Android interaction patterns.** The iOS sheet (a panel that slides up from the bottom on iPhones) is the specific case. It does not exist on Android, and to someone who does not use that platform, it is confusing, not familiar. It is a habit learned on one platform, not an established best practice.

**Keep the same interaction patterns the desktop application uses.** Recursica does not introduce new patterns only for a small device, an operating system, or the programming language it is written in.

**The exception is a mobile-first native product**, which would be a very specific thing to be building. Recursica is focused on web applications, not native apps — so unless someone clearly says otherwise, this exception does not apply.

## Horizontal scrolling

**Avoid horizontal scrolling wherever possible**, at every width.

**The one component with a valid reason to scroll horizontally is a carousel** (a row of items the user swipes or clicks through horizontally), which is used far more on mobile than on desktop.

**Where content does run past the edge, it MUST be hinted at.** Show items partly cut off at the side, so the user can see that there is more to scroll to. That kind of hint, sometimes called scent, is what makes the interaction discoverable. If content stops exactly at the edge, the user cannot see that more exists.

**Nothing else was found to need horizontal scrolling.**

## Tables

**A complex data table is not shown below tablet size.** There is too much data for the space.

**That is why the question of horizontal scrolling does not come up for tables** — the table is not there to scroll. Do not solve a narrow table by making it swipeable; solve it by not putting it there. See `recursica-skill-tables`, which forbids sideways scrolling in a table at any width.

## Touch and input

**The house does not design specifically for touch.** Touch is not something that belongs only to sizes below desktop.

**An application has one main input method, and it applies to the whole application.** If it is designed for touch, it is built around touch everywhere — including on desktop. Otherwise, it is built around mouse and keyboard everywhere. Never make an application built for touch at one breakpoint and built for a pointer at another.

**The components handle touch the same way they handle every other kind of input.** That is built into them, and the screen design does not need to handle it.

**Whether touch targets get bigger on smaller devices is a decision for each design**, not a system rule.

**Interactions that depend on hover must have a way to work without hover**, because a touch device has no hover at all. This is absolute in `recursica-skill-system-conventions` — nothing may be reachable by hover alone.

## Navigation below desktop

**On a small device, global navigation collapses into a hamburger menu**. That is the default, and it is what the pattern is for.

**What slides in shows both the icon and the text.** The point of a hidden navigation is that its items are clear once it opens — see `recursica-skill-navigation`, which forbids collapsing a navigation down to icons alone.

**NEVER use a bottom navigation bar.** It comes up as an alternative to the hamburger menu for a very simple navigation, and it is not a house pattern. The hamburger menu is the answer at every narrow width.

**An icon-only rail is not an alternative below desktop.** It is still banned at every width. The reasons, which everyone in the room agreed on: without a hover state, there is no affordance (a visible cue that a control can be used, such as the underline on a link) saying what the icons mean, and beyond a handful of them, nobody remembers. A rail of fifteen icons that collapses to bare dots, each identified only on hover, is the extreme case, and it is real. If a rail pattern were ever used, the icons would have to carry labels.

**Icons for specialized business concepts do not work**, which is why the rail fails worst in enterprise software. See `recursica-skill-icon-semantics`.

**A drawer is a panel.** Drawer and panel mean the same thing — a surface that slides in. A navigation drawer is a panel being used to hold navigation, and it is no different in kind from a hamburger menu. A sidebar is not a drawer: a sidebar is permanently on screen, the desktop alternative to a top navigation, down the left side.

**Knowing that mobile use is coming should change the navigation pattern chosen at the start**, not only how it collapses at the end.

## Signs that a narrow layout was designed

There are two good signs. A narrow layout with neither was not designed:

1. **Content areas reflow.** The classic check: do cards stack when the viewport gets narrower?
2. **The way content is shown changes between tiers.** Cards on desktop becoming a carousel on mobile is the clearest evidence of intent. Someone decided that this content is shown differently here, instead of shrinking the same component to fit.

**The anti-pattern, described as the worst of them all:** a fixed-width layout that does not reflow at all. The user gets a zoomed-out page with tiny text and lines far too long, and has to zoom in and scroll around to read anything. Nothing else was named as worse.

## Set by the theme or the component

- **What gets dropped on a narrow screen.** A conversation with the designer, every time.
- **Whether the application is built around touch.** A property of the application, decided at the start.
- **How a component handles touch.** Built into the component.
- **The breakpoint values**, once set. They are defaults; changing them is a stated decision made with the user.
- **The maximum content width** — from the design system's layout rule, with a default of 1200.

## Out of scope

- **Choosing a panel, a modal, or a page at desktop width** — `recursica-skill-panels-modals`.
- **Navigation structure, item counts, and overflow at desktop** — `recursica-skill-navigation`.
- **Table columns, alignment, and which fields get a column** — `recursica-skill-tables`.
- **The page scaffold, where the chrome goes, and layering** — `recursica-skill-screen-scaffolding`.
- **Which icon means what** — `recursica-skill-icon-semantics`.
- **Designing native applications.** Recursica is aimed at web applications.
- **The layout grid**, and how columns behave across tiers. Still has no owner.

## Uncovered — ask, do not invent

- **An icon rail on tablet specifically.** It was suggested as a middle option and pushed back on. The ban on icon-only navigation stands, so there is no approved tablet rail.
- **How the layout grid behaves across tiers**, and how many columns there are at tablet and small-device sizes.
- **Which components have a defined look below desktop at all.** Only the panel, the table, and the swap from cards to a carousel were named.
- **Whether a carousel exists in the component inventory.** It is named as the approved horizontally scrolling component and as the mobile replacement for cards — confirm it exists before planning around it.
- **What tablet behavior looks like between the two thresholds.** Rules are stated for below tablet and for small devices, but tablet itself is mostly not described.
- **Whether the tablet and small-device tiers each get their own design**, or one narrow design serves both.

## Pre-flight checklist

- [ ] Support below desktop is a decision, not an assumption, and which of the three promises applies is known.
- [ ] The navigation pattern was chosen after asking how likely a tablet or phone is to be a main way of using the product.
- [ ] The business's range of viewports and its main input method come from asking, not assuming.
- [ ] The breakpoints are the house defaults — 1200, 1024, 400 — or the user agreed to a stated change to them.
- [ ] The main content area stops at the maximum content width; the chrome may stretch wider.
- [ ] The narrow layout is adaptive as well as responsive — at least one element is replaced or removed, not only rewrapped.
- [ ] Nothing is dropped without being raised first, and no feature disappears at a breakpoint without notice.
- [ ] Adaptation is based on the viewport width, never on the container width.
- [ ] Panels open as pages below tablet size. Modals where work is done become pages, while confirmations stay modals.
- [ ] There is no iOS or Android pattern, and no interaction pattern exists only below desktop.
- [ ] There is no horizontal scrolling except in a carousel, and any content past the edge is hinted at with items shown partly cut off.
- [ ] No complex data table appears below tablet size.
- [ ] One main input method applies across the whole application, and nothing is reachable by hover alone.
- [ ] Global navigation collapses into a hamburger menu that shows the icon and the text. There is no icon-only rail and no bottom navigation bar at any width.
- [ ] Cards stack or turn into a carousel, and there is no fixed-width content that fails to reflow.
- [ ] Uncovered items were asked about, not decided: an icon rail on tablet, the layout grid across tiers, which components have a defined look below desktop, whether a carousel exists, tablet behavior between the thresholds, separate tablet or small-device designs.
