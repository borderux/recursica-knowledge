---
name: recursica-skill-working-memory
description: The research behind Recursica's item-count limits, with citations — Miller's 7 ± 2, Cowan's 4, chunking, and recognition versus recall. Use when a decision turns on how many options, navigation items, or chips to show at once, or to justify or challenge a count. Not for choosing a control — see recursica-skill-selection-controls.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Working memory and item counts

This skill gives the shared reasoning behind every limit on item counts in the Recursica design rules. Working memory is how much a person can hold in mind at once. The related skills state the rule for their own part of the interface. This skill explains why the number is what it is — and, just as important, when it does not apply.

Read this before you override a count limit. Cite it when someone asks where the number came from.

## The house rule

**Aim for 7 ± 2 items, adjusted for the cognitive load** of the content.

- **Items that are similar, easy to tell apart, and familiar** → the high end of the range is fine.
- **Items that are different from each other, hard to think about, or need expert knowledge** → use fewer, closer to 5.

Where it applies today, as stated by the skill that owns each rule:

| Surface                              | Rule                                                            | Owner                                |
| ------------------------------------ | --------------------------------------------------------------- | ------------------------------------ |
| Navigation items per level           | 7 ± 2; nearer 5 for complex subject matter, up to 9 for simple  | `recursica-skill-navigation`         |
| Options in a radio or checkbox group | 7 ± 2 scaled by cognitive load; above it, convert to a dropdown | `recursica-skill-selection-controls` |
| Chips in a group or filter bar       | 7 ± 2 scaled by cognitive load, as a checkbox group             | `recursica-skill-badges-chips`       |

No house limit has been set for table columns, toolbar actions, or steps in a flow. Do not invent one by comparison with these — treat those as open questions, instead of applying this number where it has not been agreed.

## What the research actually says

**Miller (1956)** is the source of "7 ± 2." He found that people's short-term memory for simple items that vary in only one way — digits, tones, items with a single feature — tends to hold about seven. He came up with the term _chunking_ for how people group information into larger units to get around that limit.

**Miller's number is not a design law, and he did not present it as one.** He was describing how many items people can recall from memory, not how many options a person can choose from on a screen.

**Cowan (2001)** looked at the evidence again, and put the true capacity of working memory closer to four chunks, plus or minus one, once repeating things to yourself and help from long-term memory are ruled out. The honest summary of the research is that the real capacity is _lower_ than seven, not higher.

**So why does the house rule say 7 ± 2?** Because it is a limit on scanning and comparing, not a claim about memory capacity. Past about nine items, a list can no longer be taken in at a glance, and starts to need a careful search — and that is the failure we are designing against. The number is a useful, widely understood convention that falls in the right place for scanning. It is not evidence that users can hold nine things in mind.

**Chunking is the tool, not the limit.** Grouping items under headings, or by the object they belong to, lets a screen hold far more than nine items without going over the limit at any one level. Prefer reorganizing items into groups over cutting items.

## Recognition vs. recall — the boundary

**The limit applies to sets where the user must compare options or hold them in mind.** It does not apply to a visible, well-ordered list where the user only has to recognize the answer.

This is why a long list is not automatically a violation:

- **US states in a dropdown is fine at 50 items.** The set is fixed, in alphabetical order, and known to everyone, so the user is recognizing a value they already have in mind — not weighing up fifty choices.
- **Fifty unrelated values in a dropdown is not fine.** The user has to read and weigh each one. That is comparing, and the limit applies.

**The test is the same one `recursica-skill-selection-controls` applies to dropdowns:** does the user know what is in the set before they open it? If yes, length costs little. If no, length costs a lot.

Menus and navigation are also places where users recognize — which is why the navigation limit exists for easy scanning, not because users must memorize navigation items. Do not justify a navigation count limit by claiming users cannot remember the options; they do not have to.

## Common misapplications

**Do not cite 7 ± 2 to limit a list the user only recognizes items from.** Reference data in alphabetical order, search results, and table rows are not bound by it.

**Do not treat nine as a target.** It is the far end of a range that gets smaller as the content gets harder. Most enterprise subject matter is harder than average, so most counts should be below seven.

**Do not use the rule to justify hiding things behind a "more" control.** Going over the limit means the structure needs grouping, or a different control — not hiding. See the overflow rules in `recursica-skill-navigation`.

**Do not claim the number is settled science.** If challenged, the accurate position is this: Miller's span is about recalling simple items that vary in one way, Cowan's review puts capacity closer to four, and Recursica uses 7 ± 2 on purpose as a convention for easy scanning.

## References

- Miller, G. A. (1956). "The Magical Number Seven, Plus or Minus Two: Some Limits on Our Capacity for Processing Information." _Psychological Review_, 63(2), 81–97.
- Cowan, N. (2001). "The magical number 4 in short-term memory: A reconsideration of mental storage capacity." _Behavioral and Brain Sciences_, 24(1), 87–114.
- Nielsen, J. (2009). "Short-Term Memory and Web Usability." Nielsen Norman Group. <https://www.nngroup.com/articles/short-term-memory-and-web-usability/> — states plainly that limiting menus to seven items is a misconception, because menus rely on recognition rather than recall.

## Out of scope

- **Choosing a control type.** Covered by `recursica-skill-selection-controls`.
- **Whether a feature should be easy to find or promoted.** Covered by `recursica-skill-discoverability`, the other psychology skill.
- **Navigation structure, grouping, and what happens when there are too many items.** Covered by `recursica-skill-navigation`.
- **Any count limit not listed in the table above.** No rule exists yet. Say so, instead of working one out yourself.

## Pre-flight checklist

When a decision about how many items to show comes up, check:

- [ ] Each level of a set holds 7 ± 2 items, leaning below seven where the content is unfamiliar or hard to tell apart.
- [ ] Sets that go over the limit were reorganized into groups, or moved to a different control — not hidden behind a "more" control.
- [ ] The limit was applied only to sets the user compares, not to lists the user recognizes from, like reference data in alphabetical order.
- [ ] Any long list that was left long passes the predictability test: the user knows what is in the set before opening it.
- [ ] No count limit was invented for a part of the interface the table above does not cover.
- [ ] Any claim about the research is accurate — here, 7 ± 2 is a convention for easy scanning, not a finding about memory capacity.
