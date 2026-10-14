---
name: recursica-skill-live-regions
description: House rules for announcing changes to screen readers — what gets announced, what components announce for themselves, what the application must cover, toasts, and changes the persona did not cause. Use when content changes without a page reload, a result count updates, or content or a control appears or disappears. Not for a component's own name or keyboard behavior.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Live regions

The house rules in this skill say when to tell assistive technology that the page has changed. A screen reader is one kind of assistive technology. One way to tell assistive technology is a live region (an area of the page that a screen reader announces automatically when the area's content changes). Treat each house rule as a constraint. The house rules are opinions, not neutral best practices.

The house rules assume **complex enterprise web applications**, built on a component library. Each component in the library handles the component's own accessibility. The components leave two tasks to the application:

- Make each announcement that no component makes.
- Give each component the information the component needs to announce correctly, such as a message or a count.

## The three governing principles

1. **Announce new content and new interactive elements, not a change in appearance.** A change that is only visual is not announced. For example, announce new search results, and do not announce a hover effect. This principle is the main house rule in this skill.
2. **Follow established accessibility practice on how to announce.** The house made no decision on four questions. Established accessibility practice has settled each of the four questions:

   - announcement priority
   - debouncing (waiting until a burst of updates stops before announcing)
   - combining messages
   - how much announcing is too much

   Live regions are the one topic in the Recursica skills where established practice is openly the authority. Follow established practice on live regions without confirming the practice with the user.

3. **Each announcement must be right from the start.** Screen-reader announcements are not routinely tested. No test will catch a missing announcement.

## Changes to announce

Check every change that happens without a page reload against the following table.

| What changed                                                                                | Announce? |
| ------------------------------------------------------------------------------------------- | --------- |
| **New content appeared** on the screen                                                      | **Yes**   |
| **New interactive elements appeared** on the screen, such as a new button or field          | **Yes**   |
| A change the persona did not cause                                                          | **Yes**   |
| **Only the appearance changed**, such as a visual state, a style or a decorative transition | **No**    |

**Use only the table above to decide whether to announce a change.**

- Announce the change when either of the first two table rows is true.
- Do not announce the change when the change touches neither the content text nor an interactive element.

**Announce a change the persona did not start**, such as a table that updates by itself. The persona has no reason to expect the change. The persona needs to know that a significant change happened.

## Announcements by components and by the application

**Every component is responsible for announcing the component's own changes.** A component's announcement is the default. The default holds for the great majority of changes.

**Give each component every piece of information a screen reader needs from the component.** A component can pass on only the information the component receives. The information includes:

- the correct ARIA attributes
- an accessible name (the name a screen reader reads out for a control)
- a message
- a count

Each component sets what the component must be given, and each component skill lists that information.

**If no component announces a change, add a live region that announces the change.** If a component already announces the change to screen readers, add nothing.

The clearest case is a form that submits successfully, goes to a new page, and shows nothing. No component makes any announcement in that case. The screen must add a live region with a message.

**A toast always announces, with no exception.** The toast text is the announcement. No other announcement needs to repeat the toast text.

## Priority

An announcement has one of two priority levels:

- An assertive announcement interrupts the screen reader in the middle of the text the screen reader is reading.
- A polite announcement waits until the screen reader reaches a natural pause.

**Keep the assertive priority for errors and for conditions the persona must know about right away.** Make every other announcement polite. Polite is the default for the great majority of changes. This rule follows established practice.

**Use the assertive priority only for a message that cannot wait.** An assertive announcement interrupts by design. An assertive confirmation, result count or status update interrupts the text the persona was reading or typing. The interruption is the reason the assertive priority is kept for rare cases.

## Specific cases

**Announce a filtered result count when the filter takes effect**, not on every keystroke while the persona types. For example, announce "24 orders" once, not after each letter typed in a search filter. See `recursica-skill-filters`.

**Announce content that arrives after the page has loaded**, such as a table that finishes loading. Content that arrives late is new content.

**When one region of the page reloads without a full page reload, announce the new content.** Two examples:

- A table moves to another page of results.
- A panel replaces the panel's contents.

**Do not announce a change that is only decorative.** A hover effect, a color shift, and an animation with no real change behind the animation are decorative changes.

## Too many announcements

**Not every change has to be announced.** Established practice decides which changes are announced:

- Debounce rapid updates. Announce a run of rapid updates once, not twenty times.
- Combine repeated messages into one message.
- Hold back an announcement that would only add noise.

**Follow established practice for how many announcements are too many.** No house number has been set.

**Cutting noise is not the same as leaving out new content or new interactive elements.** Combining five identical updates into one announcement is good practice. Deciding that a truly new piece of content needs no announcement is a mistake. This skill exists to prevent that mistake.

## Testing

**Write each announcement correctly when the announcement is built.** Screen-reader announcements are not routinely tested today. No later step will catch a missing announcement.

**Treat announcements as a minimum standard, not as a feature that a reviewer will check.** The person or agent who builds the screen is responsible for meeting the standard.

## Set by the theme or the component

- **Each component decides how the component makes the component's own announcements.** Give the component the information the component needs.
- **The code library the components are built on decides how a live region is built.**
- **Each component skill covers focus management.** Focus management is a separate task from announcing.

## Out of scope

- **Each component skill covers the component's accessible name, keyboard behavior and focus handling.**
- **Whether a message shows as a toast, a banner or an inline message.** See `recursica-skill-feedback-messaging`.
- **Semantic markup, headings and reading order.** See `recursica-skill-typography-semantics`.
- **Showing the change on screen.** An announcement adds to the visible change and never replaces the visible change. See `recursica-skill-design-system-conventions` on never relying on a single channel (color, shape, position or text, each a separate signal) for meaning.

## Open questions

- **How many announcements in a short time become noise.** The question was deliberately left to established practice. No house number exists, and none is wanted.
- **Which components announce for themselves, and which components need the application to make the announcements.** The principle is settled: every component is responsible for announcing the component's own changes. No audit says which components comply today.
- **What each component must be given to announce correctly.** Each component skill names what the component needs. No single list collects every component's needs.
- **Whether a long-running background process announces the process's progress**, and how often.
- **Whether announcements are translated for other languages**, and what happens when a message is built from separate parts.
- **Any exception to the rule of announcing new content.** An exception was asked about directly and turned down. The rule was stated as having no exception.

## Pre-flight checklist

- [ ] Every change that happens without a page reload is announced if the change adds new content or new interactive elements.
- [ ] A change that is only visual, such as a hover effect, is not announced.
- [ ] Every change the persona did not cause is announced.
- [ ] Each component announces for itself, and each component is given the information the component needs to announce.
- [ ] The application announces every change that no component announces.
- [ ] A flow that succeeds, shows no message and goes to another page is announced by the application.
- [ ] Every toast makes the toast's own announcement, and no other announcement repeats the toast text.
- [ ] The assertive priority is used only for errors and for conditions that cannot wait. Every other announcement is polite.
- [ ] A filtered result count is announced when the filter applies, not on each keystroke.
- [ ] Rapid updates are debounced and combined into fewer announcements, following established practice.
- [ ] Every truly new piece of content is announced.
- [ ] Each announcement is correct as built, not left for testing to catch.
- [ ] Open questions were asked about, not decided: how many announcements become noise, which components announce for themselves, what each component must be given, background progress, translated announcements, and exceptions to announcing new content.
