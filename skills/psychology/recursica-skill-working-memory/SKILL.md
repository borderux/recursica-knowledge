---
name: recursica-skill-working-memory
description: The research behind Recursica's item-count limits, with citations — Miller's 7 ± 2, Cowan's 4, chunking, and recognition versus recall. Use when a decision turns on how many options, navigation items, or chips to show at once, or to justify or challenge a count. Not for choosing a control — see recursica-skill-selection-controls.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Working memory and item counts

Read this skill before overriding a count limit, such as the limit on options in a radio group. When asked where a count limit came from, cite this skill.

Every limit on item counts in the Recursica design rules rests on research about working memory (how much a person can hold in mind at once). This skill explains where the number in each limit comes from, and when the limit does not apply. The cases where the limit does not apply matter as much as the number.

## The house rule

**Aim for 7 ± 2 items, adjusted for the cognitive load of the content.**

- If the items are similar, easy to tell apart and familiar, allow the high end of the range, up to 9. For example, navigation links named Orders, Customers and Invoices.
- If the items differ from each other, are hard to think about or need expert knowledge, use fewer items. Aim closer to 5.

Today the house rule applies to the three parts of the interface in the table below. The skill named in each table row owns that rule and states the rule.

| Part of the interface                | Rule                                                                          | Skill that owns the rule             |
| ------------------------------------ | ----------------------------------------------------------------------------- | ------------------------------------ |
| Navigation items per level           | 7 ± 2; nearer 5 for complex subject matter, up to 9 for simple subject matter | `recursica-skill-navigation`         |
| Options in a radio or checkbox group | 7 ± 2 scaled by cognitive load; above the limit, convert to a dropdown        | `recursica-skill-selection-controls` |
| Chips in a group or filter bar       | 7 ± 2 scaled by cognitive load, as a checkbox group                           | `recursica-skill-badges-chips`       |

**No house limit has been set for table columns, toolbar actions or steps in a flow.** Treat each of those three counts as an open question.

- Do not invent a limit for those three counts by comparison with the table rows above. For example, do not cap a table at 7 ± 2 columns because navigation has that limit.
- Do not apply 7 ± 2 to a count the team has not agreed on.

## What the research says

**Miller (1956)** is the source of 7 ± 2. Miller found that short-term memory tends to hold about seven simple items. Miller's finding covers simple items that vary in only one way, such as digits, tones or single-feature items.

Miller also named _chunking_. Chunking is grouping information into larger units, so a person can get around the limit of about seven.

**Miller's number is not a design law, and Miller did not present the number as one.** Miller was describing how many items people can recall from memory. Miller was not describing how many options a person can choose from on a screen.

**Cowan (2001)** reviewed the evidence again. Cowan put the true capacity of working memory closer to four chunks, plus or minus one. Cowan's figure counts only what people hold without two aids:

- repeating the items to oneself
- help from long-term memory

An honest summary of the research says the real capacity is _lower_ than seven, not higher.

**The house rule uses 7 ± 2 as a limit on scanning and comparing, not as a claim about memory capacity.** Past about nine items, a persona can no longer take in a list at a glance. A list that long starts to need a careful search. The house rule is designed to prevent that careful search.

The number 7 ± 2 is a useful, widely understood convention, and the number falls in the right place for scanning. The number is not evidence that personas can hold nine items in mind.

**Chunking is the method for showing more items, not a limit.** Chunking groups items under headings, or by the object the items belong to. Grouping lets a screen hold far more than nine items without going over the limit at any one level. For example, a settings page can hold 20 settings in four groups: Account, Notifications, Privacy and Billing.

Prefer reorganizing items into groups over cutting items.

## Recognition versus recall

**The limit applies to a set of options the persona must compare or hold in mind.** The limit does not apply to a visible, well-ordered list where the persona only has to recognize the answer.

A long list does not always break the limit.

- **A dropdown of US states is fine at 50 items.** The list of states is fixed, in alphabetical order, and known to everyone. The persona already knows the answer and only has to find the answer in the list. The persona is not weighing up fifty choices.
- **A dropdown of fifty unrelated values is not fine.** The persona has to read and weigh each value. Reading and weighing each value is comparing, and the limit applies.

**This skill uses the same predictability test that `recursica-skill-selection-controls` applies to dropdowns.** The test asks whether the persona knows what is in the list before opening the dropdown.

- If yes, as with US states, a long list costs the persona little effort.
- If no, a long list costs the persona a lot of effort.

**Do not justify a navigation count limit by claiming personas cannot remember the options.** Personas recognize menu items and navigation items, and do not have to remember navigation options. The navigation limit exists so the persona can scan the navigation easily, not because personas must memorize navigation items.

## Common misapplications

**Do not cite 7 ± 2 to limit a list where the persona only recognizes the item the persona wants.** Reference data in alphabetical order, search results, and table rows are not bound by the 7 ± 2 limit. For example, a list of countries in alphabetical order is not bound by the limit.

**Do not treat nine as a target.** Nine is the far end of the range, and the range gets smaller as the content gets harder. Most enterprise subject matter is harder than average, so most counts should be below seven.

**Do not use the 7 ± 2 limit to justify hiding items behind a "more" control.** When a count is over the limit, group the items or use a different control. For example, use a dropdown instead of a radio group. Hiding items is not the fix. See the overflow rules in `recursica-skill-navigation`.

**Do not claim that 7 ± 2 is settled science.** When 7 ± 2 is challenged, give the accurate position in three points:

- Miller's span is about recalling simple items that vary in one way.
- Cowan's review puts capacity closer to four.
- Recursica uses 7 ± 2 on purpose, as a convention for easy scanning.

## References

- Miller, G. A. (1956). "The Magical Number Seven, Plus or Minus Two: Some Limits on Our Capacity for Processing Information." _Psychological Review_, 63(2), 81–97.
- Cowan, N. (2001). "The magical number 4 in short-term memory: A reconsideration of mental storage capacity." _Behavioral and Brain Sciences_, 24(1), 87–114.
- Nielsen, J. (2009). "Short-Term Memory and Web Usability." Nielsen Norman Group. <https://www.nngroup.com/articles/short-term-memory-and-web-usability/> — calls a seven-item limit on menus a mistaken belief. People recognize menu items and do not have to recall menu items.

## Out of scope

- **Choosing a control type.** See `recursica-skill-selection-controls`.
- **Whether a feature should be easy to find or promoted.** See `recursica-skill-discoverability`, the other psychology skill.
- **Navigation structure, grouping, and what happens when there are too many items.** See `recursica-skill-navigation`.
- **Any count limit not listed in the table above.** No house rule exists yet for a count outside the table. Say that no rule exists, instead of inventing a limit.

## Pre-flight checklist

Check each item below whenever a decision about how many items to show comes up.

- [ ] Each level of a set holds 7 ± 2 items, leaning below seven for unfamiliar or hard-to-tell-apart content.
- [ ] Sets over the limit were reorganized into groups or moved to a different control, not hidden behind a "more" control.
- [ ] The limit was applied only to sets the persona compares.
- [ ] The limit was not applied to lists the persona recognizes items from, such as reference data in alphabetical order.
- [ ] Every list left long passes the predictability test: the persona knows what is in the list before opening the list.
- [ ] No count limit was invented for a part of the interface the table above does not cover.
- [ ] Every claim about the research is accurate: 7 ± 2 is a convention for easy scanning, not a finding about memory capacity.
