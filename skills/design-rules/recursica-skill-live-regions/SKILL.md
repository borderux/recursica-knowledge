---
name: recursica-skill-live-regions
description: House rules for announcing changes to assistive technology in enterprise web applications — the test for what gets announced, that new content and new interactive elements always do while a purely visual state change never does, that components announce for themselves while the application covers what falls between them, that a toast always carries its own announcement, that changes the user did not cause are announced too, and where established accessibility practice governs rather than a house rule. Use when content changes without a page reload, when a filter or search updates a result count, when something appears or disappears, or when deciding whether an update needs announcing. Trigger on "announce", "screen reader", "live region", "aria-live", "assistive technology", "polite or assertive", or content changing in place. Do NOT use for a component's own accessible name or keyboard behavior — each component skill covers its own.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Live regions

House rules for telling assistive technology that something on the page changed. These are opinions, not neutral best practices — apply them as constraints.

Context these rules assume: **complex enterprise web applications**, built on a component library that carries its own accessibility. What remains for you is the announcements that fall between components, and supplying the components with what they need to announce correctly.

## The three governing principles

1. **Announce changes in substance, not changes in appearance.** New content and new interactive elements are announced. A purely visual state change is not. This is the house rule, and it is the one this skill exists to state.
2. **How to announce follows established accessibility practice.** Priority, debouncing, coalescing, and how much is too much are not house decisions — they are solved problems, and this is the one topic in the family where outside practice is explicitly the authority rather than something to ask about.
3. **This is not caught by testing.** These announcements are not routinely tested, so they must be right by construction. Nothing downstream will find the omission for you.

## The test: what gets announced

Apply this to every change that happens without a page reload:

| What changed                                                                       | Announce? |
| ---------------------------------------------------------------------------------- | --------- |
| **New content appeared** on the screen                                             | **Yes**   |
| **New interactive elements appeared** on the screen                                | **Yes**   |
| A change the user did not cause                                                    | **Yes**   |
| **Only the appearance changed** — a visual state, styling, a decorative transition | **No**    |

**That is the whole test.** If either of the first two holds, it is announced. If what changed is neither content text nor an interactive element, it is not.

**A change the user did not initiate is still announced.** The reason is exactly that they did not initiate it: they have no reason to expect it, and they need to know something significant changed.

## Who announces: the component or the application

**Every component is responsible for announcing itself.** That is the default, and it holds for the great majority of cases.

**Components also mandate what you must supply.** A component that announces on your behalf can only announce what it was given — an accessible name, a message, a count. **Where a component requires that information to be compliant, providing it is not optional**, and each component skill states what it needs.

**The application covers what falls between components.** Where a change happens with no component to speak for it, the application announces. The clearest case: **a flow that succeeds silently** — a submission that navigates to a new page and shows nothing. Nothing there announces on its own, so the application must.

**If there is a toast, the toast announces — always.** There is no case where a toast appears without an announcement. Whatever statement the toast is making is the announcement, so nothing else needs to duplicate it.

**The rule of thumb:** if a component is saying it, let the component say it. If nothing is saying it, say it yourself.

## Priority

**Follow established practice: assertive is reserved for errors and for conditions the user must know immediately. Everything else is polite.**

**Assertive interrupts by design**, which is precisely why it is reserved. A confirmation, a result count, or a status update announced assertively cuts across whatever the user was reading or typing, and that cost is only worth paying for something that cannot wait.

**A polite announcement waits for a natural break.** That is the default for the great majority of changes.

## Specific cases

**A filtered result count is announced when the filter is applied.** Not on every keystroke while the user types toward it — at the point the filter takes effect. See `recursica-skill-filters`.

**Content arriving after the page has loaded is new content**, and is announced.

**A region that reloads in place** — a table repaginating, a panel swapping its contents — has produced new content, and is announced.

**A purely decorative change is not announced.** A hover treatment, a colour shift, an animation with no change of substance behind it.

## Volume

**Not everything has to be announced, and established practice decides what does.** Debounce, coalesce repeated messages, and suppress announcements that would be noise — a run of rapid updates is one announcement, not twenty.

**No house count has been set** for how many announcements become too many. Follow the practice; there is no number to look up here.

**Suppressing noise is not the same as omitting substance.** Collapsing five identical updates into one is good practice. Deciding a genuinely new piece of content does not need announcing at all is the failure this skill exists to prevent.

## Testing

**These announcements are not routinely tested.** That is the current practice, and it has one direct consequence for how you build: **nothing downstream will catch an omission**, so the announcement has to be correct when it is written rather than verified later.

**Treat it as a compliance floor you are responsible for meeting**, not as a feature that will be reviewed.

## Not your decision

- **A component's internal announcement behavior.** The component owns it; your job is to supply what it needs.
- **How the underlying library implements a live region.**
- **Focus management**, which is a separate concern from announcement and is owned by the individual component skills.

## Out of scope

- **A component's accessible name, keyboard behavior, or focus handling.** Each component skill carries its own.
- **Which channel a message uses — toast, banner, inline** — `recursica-skill-feedback-messaging`.
- **Semantic markup, headings, and reading order** — `recursica-skill-typography-semantics`.
- **Visual indication of the same change.** Announcing is in addition to showing it, never instead — see `recursica-skill-system-conventions` on never carrying meaning in a single channel.

## Uncovered — ask, do not invent

- **How many announcements in a short window become noise.** Deliberately deferred to established practice; no house number exists, and none is wanted.
- **Which components already announce for themselves and which require the application to do it.** The principle is settled — every component is responsible for itself — but there is no audit saying which ones currently comply.
- **What a component must be given in order to announce correctly**, stated per component. Each component skill names what it needs; nothing enumerates this centrally.
- **Whether a long-running background process announces its progress**, and how often.
- **Whether announcements are localized**, and what happens when a message is assembled from parts.
- **Any exception to the announce-new-content rule.** Asked for directly and declined: the rule was stated as having no exception.

## Pre-flight checklist

- [ ] Every change without a page reload was run through the test: new content or new interactive elements are announced; a purely visual change is not.
- [ ] Changes the user did not cause are announced.
- [ ] Components are left to announce for themselves, and each was given the information it needs to do so.
- [ ] Anything falling between components — including a flow that succeeds silently and navigates away — is announced by the application.
- [ ] Every toast carries its own announcement, and nothing duplicates it.
- [ ] Assertive is used only for errors and conditions that cannot wait; everything else is polite.
- [ ] A filtered result count is announced when the filter applies, not on each keystroke.
- [ ] Volume was managed by debouncing and coalescing per established practice, without dropping a genuinely new piece of content.
- [ ] The announcement was written to be correct rather than left for testing to catch.
- [ ] Nothing in the uncovered list was invented.
