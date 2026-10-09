---
name: recursica-skill-live-regions
description: House rules for announcing changes to screen readers — what gets announced, what components announce for themselves, what the application must cover, toasts, and changes the persona did not cause. Use when content changes without a page reload, a result count updates, or content or a control appears or disappears. Not for a component's own name or keyboard behavior.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Live regions

This skill holds the house rules for telling assistive technology that the page has changed. One way to tell assistive technology is a live region (an area of the page that a screen reader announces automatically when the area's content changes). Treat each house rule as a constraint. The house rules are opinions, not neutral best practices.

The house rules assume **complex enterprise web applications**, built on a component library that handles the accessibility of each component. The components leave two tasks to the application. First, the application makes each announcement that no component makes. Second, the application gives each component the information the component needs to announce correctly.

## The three governing principles

1. **Announce new content and new interactive elements, not a change in appearance.** Do not announce a change that is only visual. This principle is the house rule that this skill exists to state.
2. **Follow established accessibility practice on how to announce.** Four questions are not house decisions. Established accessibility practice has settled each of the four questions:

   - announcement priority
   - debouncing (waiting until a burst of updates stops before announcing)
   - combining messages
   - how much announcing is too much

   Live regions are the one topic in the Recursica skills where established practice is openly the authority. Follow established practice on live regions without confirming the practice with the user.

3. **Each announcement must be right from the start.** Testing will not catch a missing announcement. Screen-reader announcements are not routinely tested.

## Changes to announce

Apply the following test to every change that happens without a page reload.

| What changed                                                                                | Announce? |
| ------------------------------------------------------------------------------------------- | --------- |
| **New content appeared** on the screen                                                      | **Yes**   |
| **New interactive elements appeared** on the screen                                         | **Yes**   |
| A change the persona did not cause                                                          | **Yes**   |
| **Only the appearance changed**, such as a visual state, a style or a decorative transition | **No**    |

**Use only the table above to decide whether to announce a change.** If either of the first two table rows is true, announce the change. If the change is to neither content text nor an interactive element, do not announce the change.

**Announce a change the persona did not start.** The persona has no reason to expect a change the persona did not start. The persona needs to know that a significant change happened.

## Announcements by components and by the application

**Every component is responsible for announcing the component's own changes.** Component announcements are the default, and the default holds for the great majority of changes.

**Give each component every piece of information the component needs to comply.** Each component sets what the component must be given. A component that announces for itself can announce only the information the component receives. Examples of that information are an accessible name (the name a screen reader reads out for a control), a message or a count. Each component skill states what the component needs.

**If no component announces a change, add a live region that announces the change.** If a component already announces the change to screen readers, add nothing. The clearest live-region case is a form that submits successfully, goes to a new page, and shows nothing. No component makes any announcement in that case. The screen must add a live region with a message.

**A toast always announces, with no exception.** A toast never appears without an announcement. No other announcement needs to repeat the toast text, because the toast text is the announcement.

## Priority

An announcement has one of two priority levels. An assertive announcement interrupts the text the screen reader is reading now. A polite announcement waits until the screen reader reaches a natural pause.

**Keep the assertive priority for errors and for conditions the persona must know about right away.** Make every other announcement polite. The polite priority is the default for the great majority of changes. This rule follows established practice.

**Use the assertive priority only for a message that cannot wait.** An assertive announcement interrupts by design. An assertive confirmation, result count or status update interrupts the text the persona was reading or typing. The interruption is the reason the assertive priority is kept for rare cases.

## Specific cases

**Announce a filtered result count when the filter takes effect**, not on every keystroke while the persona types. See `recursica-skill-filters`.

**Announce content that arrives after the page has loaded.** Content that arrives late is new content.

**If a region of the page reloads in place, announce the new content.** A table that moves to another page of results reloads in place. A panel that swaps the panel's contents also reloads in place.

**Do not announce a change that is only decorative.** A hover effect, a color shift, and an animation with no real change behind the animation are decorative changes.

## Too many announcements

**Not every change has to be announced.** Established practice decides which changes are announced. Debounce rapid updates. Combine repeated messages into one message. Hold back an announcement that would only add noise. Announce a run of rapid updates once, not twenty times.

**Follow established practice for how many announcements are too many.** No house number has been set.

**Cutting noise is not the same as leaving out new content or new interactive elements.** Combining five identical updates into one announcement is good practice. Deciding that a truly new piece of content needs no announcement is a mistake. This skill exists to prevent that mistake.

## Testing

**Write each announcement correctly when the announcement is built.** Screen-reader announcements are not routinely tested in current practice. No later step will catch a missing announcement.

**Treat announcements as a minimum standard, not as a feature that a reviewer will check.** Whoever builds the screen is responsible for meeting the standard.

## Set by the theme or the component

- **Each component decides how the component makes the component's own announcements.** Give the component the information the component needs.
- **The library under the components decides how a live region is built.**
- **Each component skill covers focus management.** Focus management is a separate task from announcing.

## Out of scope

- **Each component skill covers the component's accessible name, keyboard behavior and focus handling.**
- **Whether a message shows as a toast, a banner or an inline message.** See `recursica-skill-feedback-messaging`.
- **Semantic markup, headings and reading order.** See `recursica-skill-typography-semantics`.
- **Showing the change on screen.** An announcement adds to the visible change and never replaces the visible change. See `recursica-skill-system-conventions` on never relying on a single channel (color, shape, position or text, each a separate signal) for meaning.

## Open questions

- **How many announcements in a short time become noise.** The question was deliberately left to established practice. No house number exists, and none is wanted.
- **Which components announce for themselves, and which components need the application to make the announcements.** The principle is settled: every component is responsible for announcing the component's own changes. No audit says which components comply today.
- **What each component must be given to announce correctly.** Each component skill names what the component needs. No single list collects every component's needs.
- **Whether a long-running background process announces the process's progress**, and how often.
- **Whether announcements are translated for other languages**, and what happens when a message is built from separate parts.
- **Any exception to the rule of announcing new content.** An exception was asked about directly and turned down. The rule was stated as having no exception.

## Pre-flight checklist

- [ ] Every change that happens without a page reload is announced if the change adds new content or new interactive elements. A change that is only visual is not announced.
- [ ] Every change the persona did not cause is announced.
- [ ] Each component announces for itself, and each component is given the information the component needs to announce.
- [ ] The application announces every change that no component announces, including a flow that succeeds silently and goes to another page.
- [ ] Every toast makes the toast's own announcement, and no other announcement repeats the toast text.
- [ ] The assertive priority is used only for errors and for conditions that cannot wait. Every other announcement is polite.
- [ ] A filtered result count is announced when the filter applies, not on each keystroke.
- [ ] Rapid updates are debounced and combined into fewer announcements, following established practice. Every truly new piece of content is announced.
- [ ] Each announcement is correct as built, not left for testing to catch.
- [ ] Open questions were asked about, not decided: how many announcements become noise, which components announce for themselves, what each component must be given, background progress, translated announcements, and exceptions to announcing new content.
