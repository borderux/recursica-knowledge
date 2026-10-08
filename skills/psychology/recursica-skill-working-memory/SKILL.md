---
name: recursica-skill-working-memory
description: The research behind Recursica's item-count limits, with citations — Miller's 7 ± 2, Cowan's 4, chunking, and recognition versus recall. Use when a decision turns on how many options, navigation items, or chips to show at once, or to justify or challenge a count. Not for choosing a control — see recursica-skill-selection-controls.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Working memory and item counts

This skill gives the shared reasoning behind every limit on item counts in the Recursica design rules. The research behind the limits is about working memory (how much a person can hold in mind at once). Each skill in the table below states the count rule for one part of the interface. This skill explains the reason for each limit's number. This skill also explains when the limit does not apply. The cases where the limit does not apply matter as much as the number.

Read this skill before overriding a count limit. Cite this skill when someone asks where a count limit came from.

## The house rule

**Aim for 7 ± 2 items, adjusted for the cognitive load of the content.**

- When the items are similar, easy to tell apart, and familiar, the high end of the range is fine.
- When the items are different from each other, hard to think about, or need expert knowledge, use fewer items, closer to 5.

The house rule applies today to the parts of the interface in the table below. The skill named in each table row owns the rule and states the rule.

| Part of the interface                | Rule                                                                          | Skill that owns the rule             |
| ------------------------------------ | ----------------------------------------------------------------------------- | ------------------------------------ |
| Navigation items per level           | 7 ± 2; nearer 5 for complex subject matter, up to 9 for simple subject matter | `recursica-skill-navigation`         |
| Options in a radio or checkbox group | 7 ± 2 scaled by cognitive load; above the limit, convert to a dropdown        | `recursica-skill-selection-controls` |
| Chips in a group or filter bar       | 7 ± 2 scaled by cognitive load, as a checkbox group                           | `recursica-skill-badges-chips`       |

No house limit has been set for table columns, toolbar actions, or steps in a flow. Do not invent a limit for those three counts by comparison with the table rows above. Treat each of the three counts as an open question. Do not apply 7 ± 2 to a count the team has not agreed on.

## What the research says

**Miller (1956)** is the source of "7 ± 2." Miller found that people's short-term memory tends to hold about seven simple items that vary in only one way, such as digits, tones, or items with a single feature. Miller came up with the term _chunking_ for how people group information into larger units to get around the limit of about seven.

**Miller's number is not a design law, and Miller did not present the number as one.** Miller was describing how many items people can recall from memory. Miller was not describing how many options a person can choose from on a screen.

**Cowan (2001)** looked at the evidence again. Cowan put the true capacity of working memory closer to four chunks, plus or minus one. Cowan's figure holds once two aids are ruled out: repeating the items to oneself, and help from long-term memory. An honest summary of the research says the real capacity is _lower_ than seven, not higher.

**The house rule uses 7 ± 2 as a limit on scanning and comparing, not as a claim about memory capacity.** Past about nine items, a user can no longer take in a list at a glance, and the list starts to need a careful search. The house rule is designed to prevent that careful search. The number 7 ± 2 is a useful, widely understood convention. The number also falls in the right place for scanning. The number is not evidence that users can hold nine items in mind.

**Chunking is the method for showing more items, not a limit.** Grouping items under headings, or by the object the items belong to, lets a screen hold far more than nine items without going over the limit at any one level of grouping. Prefer reorganizing items into groups over cutting items.

## Recognition versus recall

**The limit applies to sets where the user must compare options or hold the options in mind.** The limit does not apply to a visible, well-ordered list where the user only has to recognize the answer.

A long list therefore does not always break the limit. Two dropdowns show the difference:

- **A dropdown of US states is fine at 50 items.** The list of states is fixed, in alphabetical order, and known to everyone. The user recognizes a value the user already has in mind. The user is not weighing up fifty choices.
- **A dropdown of fifty unrelated values is not fine.** The user has to read and weigh each value. Reading and weighing each value is comparing, and the limit applies.

**This skill uses the same predictability test that `recursica-skill-selection-controls` applies to dropdowns.** The predictability test asks whether the user knows what is in the list before opening the dropdown. If yes, a long list costs the user little effort. If no, a long list costs the user a lot of effort.

**Do not justify a navigation count limit by claiming users cannot remember the options.** Users recognize items in menus and in navigation, and users do not have to remember navigation options. The navigation limit exists for easy scanning, not because users must memorize navigation items.

## Common misapplications

**Do not cite 7 ± 2 to limit a list the user only recognizes items from.** Reference data in alphabetical order, search results, and table rows are not bound by the 7 ± 2 limit.

**Do not treat nine as a target.** Nine is the far end of a range. The range gets smaller as the content gets harder. Most enterprise subject matter is harder than average. Most counts should therefore be below seven.

**Do not use the 7 ± 2 limit to justify hiding items behind a "more" control.** A count over the limit means the structure needs grouping, or a different control. Hiding items is not the fix. See the overflow rules in `recursica-skill-navigation`.

**Do not claim the number is settled science.** If someone challenges the number, give the accurate position. Miller's span is about recalling simple items that vary in one way. Cowan's review puts capacity closer to four. Recursica uses 7 ± 2 on purpose, as a convention for easy scanning.

## References

- Miller, G. A. (1956). "The Magical Number Seven, Plus or Minus Two: Some Limits on Our Capacity for Processing Information." _Psychological Review_, 63(2), 81–97.
- Cowan, N. (2001). "The magical number 4 in short-term memory: A reconsideration of mental storage capacity." _Behavioral and Brain Sciences_, 24(1), 87–114.
- Nielsen, J. (2009). "Short-Term Memory and Web Usability." Nielsen Norman Group. <https://www.nngroup.com/articles/short-term-memory-and-web-usability/> — states plainly that limiting menus to seven items is a misconception, because menus rely on recognition rather than recall.

## Out of scope

- **Choosing a control type.** See `recursica-skill-selection-controls`.
- **Whether a feature should be easy to find or promoted.** See `recursica-skill-discoverability`, the other psychology skill.
- **Navigation structure, grouping, and what happens when there are too many items.** See `recursica-skill-navigation`.
- **Any count limit not listed in the table above.** No house rule exists yet for a count outside the table. Say that no rule exists, instead of inventing a limit.

## Pre-flight checklist

Check each item below whenever a decision about how many items to show comes up.

- [ ] Each level of a set of items holds 7 ± 2 items, leaning below seven where the content is unfamiliar or hard to tell apart.
- [ ] Sets that go over the limit were reorganized into groups, or moved to a different control, not hidden behind a "more" control.
- [ ] The limit was applied only to sets the user compares, not to lists the user recognizes items from, such as reference data in alphabetical order.
- [ ] Any long list that was left long passes the predictability test: the user knows what is in the list before opening the list.
- [ ] No count limit was invented for a part of the interface the table above does not cover.
- [ ] Any claim about the research is accurate. The accurate claim is that 7 ± 2 is a convention for easy scanning, not a finding about memory capacity.
