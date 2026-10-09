---
name: recursica-skill-responsive-behavior
description: House rules below desktop — tablet and small breakpoints, the 1200 content width, responsive reflow versus adaptive removal, what may be dropped, navigation patterns, panels and modals becoming pages, no native mobile patterns, and tables below tablet. Use when a layout must work on tablets, phones, or narrow screens. Not for panel, modal, or page at desktop — see recursica-skill-panels-modals.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Responsive behavior below desktop

Treat each house rule as a constraint. The house rules below cover layouts as a viewport gets narrower than desktop size. The house rules are opinions, not neutral best practices.

The house rules assume **complex enterprise web applications, designed for desktop first**. The team rarely designs below desktop size. Most house applications are aimed at desktop, and many have no design below desktop at all. Narrow layouts are rare, so the rules below rely heavily on asking instead of assuming.

## The three governing principles

1. **Treat a layout below desktop size as a decision, not a default.** Desktop is assumed. Either design the narrower layout on purpose, or state openly that the narrower layout is unsupported. A narrower layout is never the accidental result of the code.
2. **A responsive layout rearranges content, and an adaptive layout removes content.** For example, a responsive layout stacks cards in one column. An adaptive layout leaves a table off a phone screen. To reflow is to rearrange content so the content fits the space. Both are strategies, and people forget the adaptive strategy. Most people never ask which parts of the interface could be taken out.
3. **Let how the product is used decide what changes, not the number of pixels.** How the product is used means three facts:

   - who holds the device
   - where the persona is
   - what the persona is trying to do

   The persona's workflow decides what changes. If the workflow is not known, confirm the workflow with the user.

## Questions to ask before choosing any pattern

**Confirm the answer to each question below with the user at the start, not during review.** Get the answers before choosing the navigation pattern. The answers change which navigation pattern fits. Answers that arrive later mean fixing the navigation pattern afterward.

1. **How likely is a tablet or a phone to be a main way people use the product?** Desktop is assumed. If tablet or phone use is real, build tablet or phone support in from the beginning.
2. **What does "responsive" mean to this client?** The word "responsive" hides three different promises. One promise cannot be swapped for another:

   - **The layout does not break.** Content reflows, but nothing beyond the reflow was checked.
   - **The smaller size is a designed, checked experience.**
   - **Phones are actively not supported.**

   Confirm with the user which promise applies. Do not assume the designed, checked experience because that promise sounds the most professional.

3. **What range of viewports does the business have?** For example, a factory floor of very old desktops limited to 1024 pixels differs from screens guaranteed to be 1440 pixels.

   - On the old desktops limited to 1024 pixels, responsive design is about getting narrower.
   - On screens guaranteed to be 1440 pixels, responsive design is about what happens as the viewport gets wider.

4. **What is the main way people give input?** Mouse and keyboard is assumed. Touch is possible even on desktop. Real applications also have stranger input methods than touch:

   - A capacitive touchscreen senses a bare finger.
   - A resistive touchscreen needs pressure.
   - Some personas wear gloves and cannot take the gloves off.
   - On a factory floor, a joystick can stand in for a mouse.

   Each input method leads to a different interaction pattern.

## Breakpoints

A breakpoint is the screen width at which the layout changes. Recursica has three breakpoint tiers, and only three: **desktop, tablet, small device.**

| Tier             | Default width | What the tier is                                                                                  |
| ---------------- | ------------- | ------------------------------------------------------------------------------------------------- |
| **Desktop**      | 1200          | The largest breakpoint, and **the maximum content width of the main content area**                |
| **Tablet**       | 1024          | The width below which panels become pages and tables disappear                                    |
| **Small device** | 400           | A phone. The 400 width is set on purpose, replacing the looser range of 330 to 360 used elsewhere |

**Apply the 1200 maximum to the main content area, not to the whole page.** Viewports wider than 1200 are normal. On a viewport wider than 1200:

- Do not stretch the main content to fill the wider viewport.
- Headers, footers, and other sticky chrome (the header, navigation and footer around the content) are not limited by the 1200 maximum. The chrome may stretch across the full viewport.

See `recursica-skill-screen-scaffolding`.

**The three breakpoint widths are defaults, and changing a default is very rare.** The defaults are standard enough that a change needs a stated decision.

- A change to one default should be a stated decision, made with the user at design time.
- A breakpoint should never change without telling the user.

## Responsive and adaptive layouts

**A responsive layout reflows.** Components move and rewrap, but the same components and content stay on the screen. For example, three cards in a row stack into one column.

**An adaptive layout changes what is on the screen.** An adaptive layout does not rearrange elements or switch styles. An adaptive layout shows a different element, or does not offer a feature at all. For example, cards become a carousel, or a table is left off a phone screen.

**Use both strategies below desktop.** Teams skip the adaptive strategy.

**A narrow layout must be adaptive as well as responsive.** A narrow layout may leave out features that are used less often in the narrow setting.

## Content a narrow layout may drop

**Decide what a narrow layout drops from how the product is used, and from nothing else.** The width does not decide. Facts about the persona's situation decide which parts of the interface are worth keeping. For example:

- A persona on a tablet or a phone is probably not sitting at a desk.
- Switching between apps is much harder on a phone than on a laptop.

**No part of the interface is fixed in advance as droppable or as protected from being dropped.** The team was asked whether any type of information must never be dropped, in any context. The answer was no.

**Always confirm with the user what a narrow screen drops. NEVER decide alone what a narrow screen loses.** For example, confirm with the user before a phone layout leaves out an Export button. Raise each part a narrow screen would drop as a question, as `recursica-skill-design-router` says. An agent that quietly drops a feature at 400px has invented a house rule.

**If an element cannot be shown well at the narrow size, a narrow layout may hide the element completely.** A table is the standard example.

## Viewport, not container

**Base the adaptation on the width of the viewport, not the width of the container the content sits in.** The viewport width is a safer signal than the container width. No case was found where content should adapt to the container's width.

**Treat a small viewport on a large machine as a small viewport.** For example, a persona may run the application in a browser window that is not full screen. A persona may also run the application in a split view on a laptop. When a narrow window reaches a breakpoint, the breakpoint should take effect.

## Panels and modals that become pages

**Show a panel as a page below tablet size.** A panel is an overlay that keeps the page in view. The persona uses a panel to work beside the page the persona came from. A small device has no room to lay a panel over the page. On a small device, the panel no longer lets the persona work beside the page. `recursica-skill-panels-modals` owns the panel rule.

**Below tablet size, show a modal as a page only when the persona does work in the modal.**

- **Show a modal as a page when the modal holds a small workflow, a form, or detail editing.** An example is a modal that edits an order's shipping address.
- **Keep a confirmation as a modal.** "Are you sure you want to delete this?" is not work. A confirmation can show at any size with no problem.

**On a small screen, every element meant to sit on top of other content loses that purpose.** The content underneath the element cannot be seen anyway.

## Platform patterns

**NEVER adopt iOS or Android interaction patterns.** The iOS sheet (a panel that slides up from the bottom on iPhones) is the specific case. Android has no iOS sheet. A persona who does not use iOS finds the iOS sheet confusing, not familiar. The iOS sheet is a habit learned on one platform, not an established best practice.

**Keep the same interaction patterns the desktop application uses.** Do not introduce a new pattern only for:

- a small device
- an operating system
- the programming language the application is written in

**The exception to the platform-pattern rules is a mobile-first native product.** The native-product exception applies only when the user clearly says the product is a mobile-first native product. A mobile-first native product would be a very specific kind of product. Recursica is focused on web applications, not native apps.

## Horizontal scrolling

**Avoid horizontal scrolling wherever possible**, at every width.

**A carousel is the one component with a valid reason to scroll horizontally.** A carousel is a row of items the persona swipes or clicks through horizontally. Carousels are used far more on mobile than on desktop.

**If content runs past the edge, the layout MUST show that more content is hidden.** Show items partly cut off at the side, so the persona can see more items to scroll to. For example, a carousel shows two full cards and part of a third card. The partly cut-off items, sometimes called scent, show the persona that the content scrolls sideways. When content stops exactly at the edge, the persona cannot see that more content exists.

**A table may also scroll horizontally, but only as a last resort, when nothing else works.** See `recursica-skill-tables`. No other case was found to need horizontal scrolling.

## Tables

**Do not show a complex data table below tablet size.** A complex data table has too much data for the space.

**Solve a narrow table by leaving the table off the screen, not by making the table swipeable.** For example, a phone layout of the Orders page leaves out the orders table. The table is not on the screen, so horizontal scrolling never comes up for a table below tablet size. At tablet size and above, `recursica-skill-tables` allows horizontal scrolling in a table only as a last resort, when nothing else works.

## Touch and input

**The team does not design specifically for touch.** Touch does not belong only to sizes below desktop.

**Give an application one main input method, and apply the main input method to the whole application.**

- An application designed for touch is built around touch everywhere, including on desktop.
- Every other application is built around mouse and keyboard everywhere.
- Never build an application for touch at one breakpoint and for a pointer at another.

**Recursica components handle touch the same way Recursica components handle every other kind of input.** Touch handling is built into the components. The screen design does not need to handle touch.

**Decide for each design whether touch targets get bigger on smaller devices.** The touch target decision is not a system rule.

**An interaction that depends on hover must have a way to work without hover.** A touch device has no hover at all. `recursica-skill-system-conventions` makes the hover rule absolute: no part of the interface may be reachable by hover alone.

## Navigation below desktop

**On a small device, collapse global navigation into a hamburger menu.** The hamburger menu is the default. A hamburger menu exists to hold a collapsed global navigation.

**In the navigation that slides in, show both the icon and the text of each navigation item.** For example, show the Orders icon next to the word "Orders". A hidden navigation exists so the navigation items are clear once the navigation opens. See `recursica-skill-navigation`, which forbids collapsing a navigation down to icons alone.

**NEVER use a bottom navigation bar. Use the hamburger menu at every narrow width.** A bottom navigation bar is sometimes suggested instead of a hamburger menu for a very simple navigation. A bottom navigation bar is not a house pattern.

**Do not use an icon-only rail as an alternative below desktop.** An icon-only rail is still banned at every width. Everyone in the discussion agreed on two reasons:

- Without a hover state, no affordance (a visible cue that a control can be used, such as the underline on a link) says what the icons mean.
- Beyond a handful of icons, nobody remembers what the icons mean.

One real case is extreme: a rail of fifteen icons collapses to bare dots. Each dot is identified only on hover. If a rail pattern were ever used, every icon in the rail would need a label.

**Icons for specialized business concepts do not work.** For example, no icon clearly means "Reconciliation" or "Purchase order". Because business-concept icons do not work, an icon rail fails worst in enterprise software. See `recursica-skill-icon-semantics`.

**A drawer is a panel.** The words "drawer" and "panel" name the same component: an area that slides in.

- A navigation drawer is a panel that holds navigation. A navigation drawer is no different in kind from a hamburger menu.
- A sidebar is not a drawer. A sidebar stays on the screen permanently, down the left side. A sidebar is the desktop alternative to a top navigation.

**Knowing that mobile use is coming should change which navigation pattern is chosen at the start.** The knowledge should change not only how the navigation collapses at the end.

## Signs that a narrow layout was designed

A designed narrow layout shows two good signs. A narrow layout with neither sign was not designed:

1. **Content areas reflow.** The classic check is whether cards stack when the viewport gets narrower.
2. **The way content is shown changes between tiers.** For example, cards on desktop become a carousel on mobile. The swap from cards to a carousel is the clearest sign that someone designed the narrow layout. Someone decided to show the content differently on mobile, instead of shrinking the same component to fit.

**A fixed-width layout that does not reflow at all was named the worst anti-pattern of all.** The persona gets a zoomed-out page with tiny text and lines far too long. The persona has to zoom in and scroll around to read the page.

## Set by the theme or the component

- **What gets dropped on a narrow screen.** Confirm each drop with the user, every time.
- **Whether the application is built around touch.** The main input method is set once for the whole application, at the start.
- **How a component handles touch.** Touch handling is built into the component.
- **The breakpoint values**, once set. The breakpoint values are defaults. A change to a breakpoint value is a stated decision made with the user.
- **The maximum content width.** The design system's layout rule sets the maximum content width, with a default of 1200.

## Out of scope

- **Choosing a panel, a modal, or a page at desktop width** — `recursica-skill-panels-modals`.
- **Navigation structure, item counts, and overflow at desktop** — `recursica-skill-navigation`.
- **Table columns, alignment, and which fields get a column** — `recursica-skill-tables`.
- **The page scaffold, where the chrome goes, and layering** — `recursica-skill-screen-scaffolding`.
- **Which icon means what** — `recursica-skill-icon-semantics`.
- **Designing native applications.** Recursica is aimed at web applications.
- **The layout grid**, and how grid columns behave across tiers. No skill owns the layout grid yet.

## Open questions

- **An icon rail on tablet specifically.** An icon rail on tablet was suggested as a middle option, and the team pushed back. The ban on icon-only navigation stands. The team has not approved a tablet rail.
- **How the layout grid behaves across tiers**, and how many columns the layout grid has at tablet and small-device sizes.
- **Which components have a defined look below desktop at all.** Only the panel, the table, and the swap from cards to a carousel were named.
- **Whether a carousel exists in the component inventory.** The carousel is named as the approved horizontally scrolling component, and as the mobile replacement for cards. Confirm the carousel exists before planning around a carousel.
- **What tablet behavior looks like between the two thresholds.** The rules above cover layouts below tablet size and small devices. The tablet tier itself is mostly not described.
- **Whether the tablet and small-device tiers each get a separate design**, or one narrow design serves both.

## Pre-flight checklist

- [ ] Support below desktop is a decision, not an assumption.
- [ ] The team knows which of the three promises of "responsive" applies.
- [ ] The user confirmed how likely a tablet or phone is to be a main way of using the product.
- [ ] The navigation pattern was chosen after the user's answer about tablet and phone use.
- [ ] The business's range of viewports and the business's main input method come from asking, not assuming.
- [ ] The breakpoints are the house defaults — 1200, 1024, 400 — or the user agreed to a stated change to the breakpoints.
- [ ] The main content area stops at the maximum content width. The chrome may stretch wider.
- [ ] The narrow layout is adaptive as well as responsive. At least one element is replaced or removed, not only rewrapped.
- [ ] Every dropped part of the interface was raised first.
- [ ] No feature disappears at a breakpoint without notice.
- [ ] Adaptation is based on the viewport width, never on the container width.
- [ ] Panels open as pages below tablet size.
- [ ] Modals where work is done become pages, and confirmations stay modals.
- [ ] The layout has no iOS or Android pattern, and no interaction pattern exists only below desktop.
- [ ] Horizontal scrolling appears only in a carousel, or in a table as a last resort when nothing else works.
- [ ] Content that runs past the edge shows items partly cut off at the side.
- [ ] No complex data table appears below tablet size.
- [ ] One main input method applies across the whole application.
- [ ] No part of the interface is reachable by hover alone.
- [ ] Global navigation collapses into a hamburger menu that shows the icon and the text of each item.
- [ ] No icon-only rail and no bottom navigation bar appear at any width.
- [ ] Cards stack or turn into a carousel, and no fixed-width content fails to reflow.
- [ ] Open questions were asked about, not decided: an icon rail on tablet, the layout grid across tiers, which components have a defined look below desktop, whether a carousel exists, tablet behavior between the thresholds, separate tablet or small-device designs.
