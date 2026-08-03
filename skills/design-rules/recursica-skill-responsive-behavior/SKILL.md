---
name: recursica-skill-responsive-behavior
description: House rules for behavior below desktop in enterprise web applications — the tablet and small-device breakpoints and the 1200 max content width, the difference between responsive reflow and adaptive removal and why adaptive is the forgotten half, context of use as the only thing that decides what may be dropped, the four questions to ask before choosing a navigation pattern, driving adaptation by viewport rather than container, panels and work-bearing modals becoming pages, the ban on importing iOS or Android patterns, horizontal scrolling and the carousel exception, why tables do not appear below tablet, and one primary input method for the whole application. Use when a layout must work below desktop. Trigger on "mobile", "tablet", "breakpoint", "responsive", "adaptive", "small screen", "touch", or "narrow viewport". Do NOT use for panel-versus-modal-versus-page at desktop — that is recursica-skill-panels-modals.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Responsive behavior below desktop

House rules for what happens as a viewport gets narrower than desktop. These are opinions, not neutral best practices — apply them as constraints.

Context these rules assume: **complex enterprise web applications, desktop-first**. Below-desktop work is genuinely rare here — most of what the house builds is desktop-oriented, and often nothing below desktop is designed at all. That rarity is why the rules below lean so hard on asking rather than assuming.

## The three governing principles

1. **Below desktop is a decision, not a consequence.** Desktop is the assumption. Anything narrower is either deliberately designed or explicitly unsupported — never whatever the CSS happens to do.
2. **Responsive reflows; adaptive removes. Both are strategies, and adaptive is the one that gets forgotten.** Most people never ask what could come out.
3. **Context of use governs what changes, not the pixel count.** Who is holding the device, where they are, and what they are trying to do. That means the answer lives in the user's workflow — and where the workflow is not known, it gets asked.

## Ask these before choosing any pattern

**These are opening questions, not review questions.** They change the navigation pattern, so they have to be answered before it is chosen. Retrofitting is the failure this prevents.

1. **How likely is it that this will be a primary interaction point on a tablet or a phone?** Desktop is already assumed. If these other scenarios are real, they get built in from the beginning.
2. **What does "responsive" mean to this client?** There are three different commitments hiding behind the word, and they are not interchangeable:
   - **It merely does not break.** Things reflow; nothing was vetted.
   - **It is a considered, vetted experience** on the smaller tier.
   - **Phones are actively unsupported.**
     Do not assume the middle one because it is the most professional. Find out.
3. **What viewport does this business actually have?** A factory floor of ancient desktops capped at 1024 is a different problem from a guaranteed 1440. The first makes responsiveness about getting narrower; the second about **what happens when it gets wider.**
4. **What is the primary input method?** Mouse and keyboard is the assumption, but touch is possible even on desktop — and the real cases get stranger: capacitive versus resistive touch, gloved hands that cannot be de-gloved, a joystick standing in for a mouse on a factory floor. Each is a different interaction pattern.

## The breakpoints

Three tiers, and only three: **desktop, tablet, small device.**

| Tier             | Default width | What it is                                                                                |
| ---------------- | ------------- | ----------------------------------------------------------------------------------------- |
| **Desktop**      | 1200          | The largest breakpoint, and **the maximum content width of the main content area**        |
| **Tablet**       | 1024          | The threshold below which panels become pages and tables disappear                        |
| **Small device** | 400           | Phone. Set deliberately, superseding the looser 330-to-360 range that gets used elsewhere |

**1200 is a content-area maximum, not a page maximum.** Headers, footers, and other sticky chrome are not bound by it and may span the full viewport. Viewports wider than 1200 are ordinary; the content does not stretch to fill them — see `recursica-skill-screen-scaffolding`.

**These are defaults, and overriding them is very rare.** They are standard enough that an override should be a stated decision, made with the user at design time, rather than a quiet adjustment.

## Responsive and adaptive are two different strategies

**Responsive means the layout reflows.** Components move and rewrap; the same things are present.

**Adaptive means something different happens.** Not reshuffling and not flipped CSS — a **different element is shown**, or a capability is not offered at all.

**Both belong below desktop, and adaptive is the half that gets skipped.** The question "what can we remove?" is the one most teams never ask.

**A narrow layout must be adaptive as well as responsive.** Functionality that is used less frequently in that context of use may legitimately not be there.

## What may be dropped

**Context of use decides, and nothing else does.** Someone on a tablet or a phone is probably not sitting at a desk. App switching is much harder on a phone than on a laptop. Those facts about the situation, not the width, determine what is worth carrying.

**Nothing is hardcoded as droppable, and nothing is protected from being dropped.** Asked whether any type of information is strictly prohibited from being dropped regardless of context, the answer was no.

**So this is always a conversation with the designer.** **MUST NOT decide unilaterally what a narrow screen loses** — raise it, per `recursica-skill-design-router`. An agent that quietly drops a feature at 400px has invented a house rule.

**Sometimes the answer is to hide something completely** because it cannot be rendered effectively at that size. The table is the standing example.

## Viewport, not container

**Drive adaptation by the width of the viewport.** It is the safer signal, and no case was identified where content should adapt to the width of the container it sits in.

**A small viewport on a large machine still counts.** Someone running the application in a windowed browser or a split view on a laptop has hit the breakpoint, and the breakpoint should fire.

## What becomes a page

**A panel becomes a page below tablet.** A panel is a **context overlay** — it exists so the user can work beside the page they came from. On a small device there is no room to overlay context, so the panel has no purpose left. Owned by `recursica-skill-panels-modals`.

**A modal becomes a page below tablet only when work happens in it.** The test is whether the user is doing work:

- **A mini workflow, a form, or editing details in a modal → a page.**
- **A confirmation stays a modal.** "Are you sure you want to delete this?" is not work, and there is no problem with popping that up at any size.

**Anything that exists to sit on top of something loses its reason on a small screen**, because the context underneath is not visible anyway.

## Never import a platform pattern

**MUST NOT adopt iOS or Android interaction patterns.** The iOS sheet is the specific case: it does not exist on Android, and to someone who does not use that platform it is genuinely confusing rather than familiar. It is a learned platform behavior, not established best practice.

**Maintain the same interaction patterns the desktop application uses.** Recursica does not introduce new patterns specific to a small device, an operating system, or the language it is coded in.

**The exception is a mobile-first native product**, which would be a very specific thing to be building. Recursica is focused on web applications, not native apps — so absent an explicit statement otherwise, this exception does not apply.

## Horizontal scrolling

**Avoid horizontal scrolling wherever possible**, at every width.

**The one component with legitimate horizontal movement is a carousel**, which is used far more in a mobile setting than on desktop.

**Where content does extend past the edge, it MUST be hinted.** Show partial elements clipped at the side so the user can see there is more to scroll to. Scent is what makes the interaction discoverable; content that simply stops at the edge is invisible.

**Nothing else was identified as requiring horizontal scrolling.**

## Tables

**A complex data table is not displayed below tablet.** There is simply too much data for the space.

**Which is why the horizontal-scrolling question does not arise for tables** — the table is not there to scroll. Do not solve a narrow table by making it swipeable; solve it by not putting it there. See `recursica-skill-tables`, which forbids horizontal scrolling in a table at any width.

## Touch and input

**The house does not design specifically for touch.** Touch is not a below-desktop property.

**An application has one primary input method, and it applies to the whole application.** If it is designed for touch, it is touch-centric everywhere — including on desktop. Otherwise it is mouse-and-keyboard-centric everywhere. **Never make an application touch-centric at one breakpoint and pointer-centric at another.**

**The components handle touch the same way they handle every other input.** That is built into them and is not your concern.

**Whether touch targets grow on smaller devices is an individual design decision**, not a system rule.

**Hover-dependent interactions must have a non-hover path**, because on a touch device there is no hover at all. This is already absolute in `recursica-skill-system-conventions` — nothing may be reachable by hover alone.

## Navigation below desktop

**Global navigation collapses into a hamburger on a small device.** That is the default and it is what the pattern is for.

**What slides in carries both the icon and the text.** A hidden navigation that reads clearly when opened is the whole point — see `recursica-skill-navigation`, which forbids collapsing a nav to icons alone.

**NEVER use a bottom navigation bar.** It comes up as an alternative to the hamburger for a very simple navigation, and it is not a house pattern. The hamburger is the answer at every narrow width.

**An icon-only rail is not a below-desktop escape hatch.** It remains prohibited at every width. The reasons, agreed across the room: there is no affordance telling the user what the icons mean without a hover state, and past a handful of them nobody remembers. **A rail of fifteen icons whose collapsed state degrades to bare dots requiring hover is the extreme case, and it is real.** If a rail pattern were ever used, the icons would have to carry labels.

**Icons for esoteric business concepts do not work**, which is why the rail fails hardest in enterprise software. See `recursica-skill-icon-semantics`.

**A drawer is a panel.** Drawer and panel are synonyms — a surface that slides in. A navigation drawer is a panel being used to hold navigation, and it is no different in kind from a hamburger menu. **A sidebar is not a drawer:** a sidebar is permanently on screen, the desktop left-nav alternative to a top nav.

**Knowing that mobile use is coming should change the navigation pattern chosen at the start**, not the way it collapses at the end.

## What tells you a narrow layout was designed

Two positive signals, and the absence of both is the tell:

1. **Content areas genuinely reflow.** The classic check: **do cards stack** when the viewport narrows?
2. **The display method changes between tiers.** Cards on desktop becoming a **carousel** on mobile is the clearest evidence of intent — someone decided that this content is presented differently here, rather than letting the same component squeeze.

**The anti-pattern, stated as the worst of them:** a fixed-width layout that does not reflow at all. The user gets a zoomed-out page with tiny text and line lengths far too long, and has to zoom in and scroll around to read anything. Nothing else was named as worse.

## Not your decision

- **What gets dropped on a narrow screen.** A conversation with the designer, every time.
- **Whether the application is touch-centric.** A property of the application, established up front.
- **How a component handles touch.** Built into the component.
- **The breakpoint values**, once set. They are defaults; changing them is a stated decision with the user.
- **The maximum content width** — from the design system's layout rule, defaulting to 1200.

## Out of scope

- **Choosing a panel, a modal, or a page at desktop width** — `recursica-skill-panels-modals`.
- **Navigation structure, item counts, and overflow at desktop** — `recursica-skill-navigation`.
- **Table columns, alignment, and what earns a column** — `recursica-skill-tables`.
- **The page scaffold, chrome placement, and layering** — `recursica-skill-screen-scaffolding`.
- **Which icon means what** — `recursica-skill-icon-semantics`.
- **Native application design.** Recursica targets web applications.
- **The layout grid** and how columns behave across tiers. Still unowned.

## Uncovered — ask, do not invent

- **An icon rail on tablet specifically.** Raised as a middle option and pushed back on; the icon-only prohibition stands, so there is no sanctioned tablet rail.
- **How the layout grid behaves across tiers**, and the column count at tablet and small device.
- **Which components have a defined below-desktop appearance at all.** Only the panel, the table, and the card-to-carousel swap were named.
- **Whether a carousel exists in the component inventory.** It is cited as the sanctioned horizontal component and as the mobile replacement for cards — confirm it exists before planning around it.
- **What tablet behavior looks like between the two thresholds.** Rules are stated for below-tablet and for small-device; tablet itself is mostly undescribed.
- **Whether the tablet and small-device tiers each get their own design** or one narrow design serves both.

## Pre-flight checklist

- [ ] Below-desktop support was established as a decision — which of the three commitments applies — rather than assumed.
- [ ] The likelihood of tablet or phone being a primary interaction point was asked before the navigation pattern was chosen.
- [ ] The business's actual viewport range and primary input method were asked, not assumed.
- [ ] Breakpoints are the house defaults — 1200, 1024, 400 — or an override was stated and agreed.
- [ ] The main content area caps at the maximum content width; chrome may span wider.
- [ ] The narrow layout is adaptive as well as responsive — something was reconsidered, not just rewrapped.
- [ ] Nothing was dropped without raising it; no capability was silently removed at a breakpoint.
- [ ] Adaptation is driven by viewport width, never by container width.
- [ ] Panels open as pages below tablet; work-bearing modals become pages while confirmations stay modals.
- [ ] No iOS or Android pattern was imported, and no interaction pattern exists only below desktop.
- [ ] There is no horizontal scrolling except a carousel, and any off-edge content is hinted with partial elements.
- [ ] No complex data table appears below tablet.
- [ ] One primary input method applies across the whole application, and nothing is reachable by hover alone.
- [ ] Global navigation collapses to a hamburger carrying icon and text; no icon-only rail and no bottom navigation bar at any width.
- [ ] Cards stack or swap to a carousel; no fixed-width content that fails to reflow.
- [ ] Nothing in the uncovered list was invented.
