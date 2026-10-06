---
name: recursica-skill-live-regions
description: House rules for announcing changes to screen readers — what gets announced, what components announce for themselves, what the application must cover, toasts, and changes the user did not cause. Use when content changes without a page reload, a result count updates, or content or a control appears or disappears. Not for a component's own name or keyboard behavior.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Live regions

This skill holds the house rules for telling assistive technology that the page has changed, such as through a live region (an area of the page that a screen reader announces automatically when the area's content changes). The house rules are opinions, not neutral best practices. Treat each house rule as a constraint.

The house rules assume **complex enterprise web applications**, built on a component library that handles the accessibility of each component. The application has two tasks left. The application makes each announcement that no component makes. The application also gives each component the information the component needs to announce correctly.

## The three governing principles

1. **Announce new content and new interactive elements, not a change in appearance.** A change that is only visual is not announced. This principle is the house rule. This skill exists to state the house rule.
2. **Established accessibility practice decides how to announce.** Announcement priority, debouncing (waiting until a burst of updates stops before announcing), combining messages, and how much announcing is too much are not house decisions. Accessibility practice has settled each of these questions. Live regions are the one topic in the Recursica skills where outside practice is openly the authority, rather than a question to ask about.
3. **Testing will not catch a missing announcement.** Screen-reader announcements are not routinely tested. Each announcement must be right from the start. No later step will find a missing announcement.

## Changes to announce

Apply the following test to every change that happens without a page reload.

| What changed                                                                                | Announce? |
| ------------------------------------------------------------------------------------------- | --------- |
| **New content appeared** on the screen                                                      | **Yes**   |
| **New interactive elements appeared** on the screen                                         | **Yes**   |
| A change the user did not cause                                                             | **Yes**   |
| **Only the appearance changed**, such as a visual state, a style or a decorative transition | **No**    |

**The table above is the whole test.** If either of the first two rows is true, announce the change. If the change is to neither content text nor an interactive element, do not announce the change.

**A change the user did not start is still announced.** The user did not start the change, so the user has no reason to expect the change. The user needs to know that a significant change happened.

## Announcements by components and by the application

**Every component is responsible for announcing the component's own changes.** Component announcements are the default. The default holds in the great majority of cases.

**Each component sets what the component must be given.** A component that announces for itself can announce only the information the component receives, such as an accessible name (the name a screen reader reads out for a control), a message or a count. Where a component needs that information to comply, providing the information is required. Each component skill states what the component needs.

**When no component announces a change, add a live region that announces the change.** The clearest case is a form that submits successfully, goes to a new page, and shows nothing. No component makes any announcement in that case. The screen's code must add a live region with the message.

**A toast always announces, with no exception.** A toast never appears without an announcement. Because the toast text is the announcement, no other announcement needs to repeat the toast text.

**Rule of thumb:** if a component already announces the change to screen readers, add nothing. If no component announces the change, add a live region with the message.

## Priority

An announcement has one of two priority levels. An **assertive** announcement interrupts the text the screen reader is reading now. A polite announcement waits until the screen reader reaches a natural pause.

**Follow established practice. Keep the assertive priority for errors and for conditions the user must know about right away. Make every other announcement polite.**

**An assertive announcement interrupts by design.** The interruption is the reason the assertive priority is kept for rare cases. A confirmation, a result count or a status update announced as assertive cuts across the text the user was reading or typing. Use the assertive priority only for a message that cannot wait.

**A polite announcement waits for a natural break.** The polite priority is the default for the great majority of changes.

## Specific cases

**A filtered result count is announced when the filter is applied.** Announce the count at the moment the filter takes effect, not on every keystroke while the user types. See `recursica-skill-filters`.

**Content that arrives after the page has loaded is new content**, and the new content is announced.

**A region that reloads in place has produced new content**, and the new content is announced. A table that moves to another page of results reloads in place. A panel that swaps the panel's contents also reloads in place.

**A change that is only decorative is not announced.** A hover effect, a color shift, and an animation with no real change behind the animation are decorative changes.

## Too many announcements

**Not every change has to be announced, and established practice decides which changes are announced.** Debounce rapid updates. Combine repeated messages into one message. Hold back an announcement that would only add noise. A run of rapid updates is one announcement, not twenty.

**No house number has been set** for how many announcements are too many. Follow established practice. This skill has no number to look up.

**Cutting noise is not the same as leaving out new content or new interactive elements.** Combining five identical updates into one announcement is good practice. Deciding that a truly new piece of content needs no announcement at all is the mistake this skill exists to prevent.

## Testing

**Screen-reader announcements are not routinely tested.** Not testing announcements is current practice. No later step will catch a missing announcement. Write each announcement correctly when the announcement is built, instead of relying on a check afterward.

**Treat announcements as a minimum standard, not as a feature that a reviewer will check.** Whoever builds the screen is responsible for meeting the standard.

## Set by the theme or the component

- **How a component makes the component's own announcements.** The component owns the announcements. Give the component the information the component needs.
- **How the library under the components builds a live region.**
- **Focus management.** Managing focus is a separate concern from announcing. The individual component skills own focus management.

## Out of scope

- **A component's accessible name, keyboard behavior and focus handling.** Each component skill covers these topics for the component.
- **Whether a message shows as a toast, a banner or an inline message.** See `recursica-skill-feedback-messaging`.
- **Semantic markup, headings and reading order.** See `recursica-skill-typography-semantics`.
- **Showing the same change on screen.** An announcement adds to the visible change and never replaces the visible change. See `recursica-skill-system-conventions` on never relying on a single channel (color, shape, position or text, each a separate signal) for meaning.

## Open questions

- **How many announcements in a short time become noise.** The question was deliberately left to established practice. No house number exists, and none is wanted.
- **Which components announce for themselves, and which components need the application to make the announcements.** The principle is settled: every component is responsible for announcing the component's own changes. No audit says which components comply today.
- **What each component must be given to announce correctly.** Each component skill names what the component needs. No single list collects every component's needs.
- **Whether a long-running background process announces the process's progress**, and how often.
- **Whether announcements are translated for other languages**, and what happens when a message is built from separate parts.
- **Any exception to the rule of announcing new content.** An exception was asked about directly and turned down. The rule was stated as having no exception.

## Pre-flight checklist

- [ ] Every change that happens without a page reload is announced if the change adds new content or new interactive elements. A change that is only visual is not announced.
- [ ] Every change the user did not cause is announced.
- [ ] Each component announces for itself, and each component is given the information the component needs to announce.
- [ ] The application announces every change that no component announces, including a flow that succeeds silently and goes to another page.
- [ ] Every toast makes the toast's own announcement, and no other announcement repeats the toast text.
- [ ] The assertive priority is used only for errors and for conditions that cannot wait. Every other announcement is polite.
- [ ] A filtered result count is announced when the filter applies, not on each keystroke.
- [ ] Rapid updates are debounced and combined into fewer announcements, following established practice. Every truly new piece of content is announced.
- [ ] Each announcement is correct as built, not left for testing to catch.
- [ ] Open questions were asked about, not decided: how many announcements become noise, which components announce for themselves, what each component must be given, background progress, translated announcements, and exceptions to announcing new content.
