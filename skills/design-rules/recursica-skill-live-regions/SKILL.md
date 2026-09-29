---
name: recursica-skill-live-regions
description: House rules for announcing changes to assistive technology in enterprise web applications — the test for what gets announced, that new content and new interactive elements always do while a purely visual state change never does, that components announce for themselves while the application covers what falls between them, that a toast always carries its own announcement, that changes the user did not cause are announced too, and where established accessibility practice governs rather than a house rule. Use when content changes without a page reload, when a filter or search updates a result count, when something appears or disappears, or when deciding whether an update needs announcing. Trigger on "announce", "screen reader", "live region", "aria-live", "assistive technology", "polite or assertive", or content changing in place. Do NOT use for a component's own accessible name or keyboard behavior — each component skill covers its own.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Live regions

These are the house rules for telling assistive technology (tools such as screen readers that help people with disabilities use a computer) that something on the page has changed. A live region is an area a screen reader announces automatically when its content changes. These rules are opinions, not neutral best practices — treat them as constraints.

These rules assume **complex enterprise web applications**, built on a component library that handles its own accessibility. What is left for you is the announcements that fall between components, and giving the components what they need to announce correctly.

## The three governing principles

1. **Announce changes in substance, not changes in appearance.** New content and new interactive elements are announced. A change that is only visual is not. This is the house rule, and stating it is the reason this skill exists.
2. **How to announce follows established accessibility practice.** Priority, debouncing, combining messages, and how much is too much are not house decisions. They are solved problems, and this is the one topic in the family where outside practice is openly the authority, rather than something to ask about.
3. **Testing will not catch this.** These announcements are not routinely tested, so they must be right from the start. Nothing later on will find the omission for you.

## The test: what gets announced

Apply this to every change that happens without the page reloading:

| What changed                                                                       | Announce? |
| ---------------------------------------------------------------------------------- | --------- |
| **New content appeared** on the screen                                             | **Yes**   |
| **New interactive elements appeared** on the screen                                | **Yes**   |
| A change the user did not cause                                                    | **Yes**   |
| **Only the appearance changed** — a visual state, styling, a decorative transition | **No**    |

**That is the whole test.** If either of the first two is true, announce it. If what changed is neither content text nor an interactive element, do not.

**A change the user did not start is still announced.** The reason is exactly that they did not start it: they have no reason to expect it, and they need to know that something significant changed.

## Who announces: the component or the application

**Every component is responsible for announcing itself.** That is the default, and it holds in the great majority of cases.

**Components also set what you must supply.** A component that announces for you can only announce what it was given — an accessible name (the name a screen reader reads out for a control), a message, a count. Where a component needs that information in order to comply, providing it is not optional, and each component skill states what it needs.

**The application covers whatever falls between components.** Where a change happens with no component to speak for it, the application makes the announcement. The clearest case is a flow that succeeds silently — a submission that goes to a new page and shows nothing. Nothing there announces on its own, so the application must.

**If there is a toast, the toast announces — always.** (A toast is a short message that appears briefly and then disappears.) There is no case where a toast appears without an announcement. Whatever the toast says is the announcement, so nothing else needs to repeat it.

**The rule of thumb:** if a component is saying it, let the component say it. If nothing is saying it, say it yourself.

## Priority

**Follow established practice: assertive is kept for errors and for conditions the user must know about right away. Everything else is polite.**

These are the two priority levels. An **assertive** announcement interrupts whatever the screen reader is currently reading. A polite announcement waits until the screen reader reaches a natural pause.

**Assertive interrupts by design**, which is precisely why it is kept for rare cases. A confirmation, a result count, or a status update announced assertively cuts across whatever the user was reading or typing. That cost is only worth paying for something that cannot wait.

**A polite announcement waits for a natural break.** That is the default for the great majority of changes.

## Specific cases

**A filtered result count is announced when the filter is applied.** Not on every keystroke while the user is typing — at the moment the filter takes effect. See `recursica-skill-filters`.

**Content that arrives after the page has loaded is new content**, and it is announced.

**A region that reloads in place** — a table moving to another page of results, a panel swapping its contents — has produced new content, and it is announced.

**A change that is only decorative is not announced.** A hover effect, a color shift, or an animation with no real change behind it.

## Volume

**Not everything has to be announced, and established practice decides what does.** Debounce (wait until a burst of updates stops before announcing), combine repeated messages into one, and hold back announcements that would only be noise. A run of rapid updates is one announcement, not twenty.

**No house number has been set** for how many announcements become too many. Follow the practice; there is no number to look up here.

**Cutting noise is not the same as leaving out substance.** Combining five identical updates into one is good practice. Deciding that a truly new piece of content does not need announcing at all is the mistake this skill exists to prevent.

## Testing

**These announcements are not routinely tested.** That is how things are done today, and it has one direct effect on how you build: nothing later on will catch an omission. So the announcement has to be correct when it is written, instead of being checked afterward.

**Treat it as a minimum standard you are responsible for meeting**, not as a feature that someone will review.

## Not your decision

- **How a component announces things internally.** The component owns it; your job is to give it what it needs.
- **How the underlying library builds a live region.**
- **Managing focus**, which is a separate concern from announcing, and is owned by the individual component skills.

## Out of scope

- **A component's accessible name, keyboard behavior, or focus handling.** Each component skill has its own.
- **Which channel a message uses — toast, banner, or inline** — `recursica-skill-feedback-messaging`.
- **Semantic markup, headings, and reading order** — `recursica-skill-typography-semantics`.
- **Showing the same change visually.** Announcing is in addition to showing it, never instead of it — see `recursica-skill-system-conventions` on never carrying meaning in a single channel (a way of carrying meaning, such as color, shape, position, or text).

## Uncovered — ask, do not invent

- **How many announcements in a short time become noise.** This was deliberately left to established practice. No house number exists, and none is wanted.
- **Which components already announce for themselves, and which need the application to do it.** The principle is settled — every component is responsible for itself — but there is no audit saying which ones comply today.
- **What each component must be given in order to announce correctly.** Each component skill names what it needs, but nothing lists them all in one place.
- **Whether a long-running background process announces its progress**, and how often.
- **Whether announcements are translated for other languages**, and what happens when a message is built from separate parts.
- **Any exception to the rule of announcing new content.** This was asked about directly and turned down: the rule was stated as having no exception.

## Pre-flight checklist

- [ ] You ran every change that happens without a page reload through the test. New content and new interactive elements are announced; a change that is only visual is not.
- [ ] Changes the user did not cause are announced.
- [ ] Components are left to announce for themselves, and you gave each one the information it needs to do so.
- [ ] Anything that falls between components — including a flow that succeeds silently and goes to another page — is announced by the application.
- [ ] Every toast carries its own announcement, and nothing repeats it.
- [ ] Assertive is used only for errors and for conditions that cannot wait. Everything else is polite.
- [ ] A filtered result count is announced when the filter applies, not on each keystroke.
- [ ] You kept the number of announcements down by debouncing and combining them, following established practice, without dropping any truly new piece of content.
- [ ] You wrote each announcement to be correct, instead of leaving it for testing to catch.
- [ ] You invented nothing from the uncovered list.
