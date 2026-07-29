---
name: recursica-skill-working-memory
description: The cognitive-science basis for Recursica's item-count rules, with citations — Miller's 7 ± 2, Cowan's revision to about 4 chunks, chunking, and recognition vs. recall. Use whenever a decision turns on how many things to put in front of a user at once: navigation items per level, options in a radio or checkbox group, or whether a long list belongs in a dropdown instead. Also use when asked to justify, cite, or push back on one of these limits, or when a spec proposes a count that looks too high. Trigger on "7 plus or minus 2", "magic number seven", "working memory", "short-term memory", "cognitive load", "chunking", "how many items", "too many options", or "recognition over recall". Do NOT use to choose a control type — that is recursica-skill-selection-controls. Do NOT use for navigation structure — that is recursica-skill-navigation. This skill supplies the reasoning those skills apply.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Working memory and item counts

The shared reasoning behind every count limit in the Recursica design rules. Sibling skills state the rule for their surface; this skill explains why the number is what it is, and — just as importantly — when it does not apply.

Read this before overriding a count limit, and cite it when someone asks where the number came from.

## The house rule

**Target 7 ± 2 items, scaled by the cognitive load of the material.**

- **Similar, easily distinguished, familiar items** → the upper end of the range is fine.
- **Dissimilar, cognitively demanding, or domain-expertise items** → use fewer, toward 5.

Where it currently applies, as stated by the owning skill:

| Surface                              | Rule                                                            | Owner                                |
| ------------------------------------ | --------------------------------------------------------------- | ------------------------------------ |
| Navigation items per level           | 7 ± 2; nearer 5 for complex subject matter, up to 9 for simple  | `recursica-skill-navigation`         |
| Options in a radio or checkbox group | 7 ± 2 scaled by cognitive load; above it, convert to a dropdown | `recursica-skill-selection-controls` |
| Chips in a group or filter bar       | 7 ± 2 scaled by cognitive load, as a checkbox group             | `recursica-skill-badges-chips`       |

No house ceiling has been set for table columns, toolbar actions, or steps in a flow. Do not invent one by analogy — treat those as open questions rather than applying this number where it has not been established.

## What the research actually says

**Miller (1956)** is the source of "7 ± 2." He observed that immediate memory span for unidimensional stimuli — digits, tones, single-attribute items — clusters around seven items, and coined _chunking_ to describe how people compress information into larger units to work around that limit.

**Miller's number is not a design law, and he did not present it as one.** He was describing recall of items held in mind, not the number of options a person can pick from on a screen.

**Cowan (2001)** revisited the evidence and put pure working-memory capacity at closer to **four chunks**, plus or minus one, once rehearsal and long-term memory support are controlled for. The honest state of the literature is that the true capacity is _lower_ than seven, not higher.

**So why does the house rule say 7 ± 2?** Because it is a **scannability and comparison ceiling**, not a memory-capacity claim. Above roughly nine items a list stops being takeable-in-at-a-glance and starts requiring systematic search — and that is the failure we are designing against. The number is a useful, widely understood convention that lands in the right place for scanning. It is not evidence that users can hold nine things in mind.

**Chunking is the lever, not the limit.** Grouping items under headings, or by parent object, lets a screen carry far more than nine items without exceeding the ceiling at any one level. Prefer restructuring into groups over shaving items.

## Recognition vs. recall — the boundary

**The ceiling applies to sets where the user must compare options or hold them in mind.** It does **not** apply to a visible, well-ordered list the user only has to recognize an answer in.

This is why a long list is not automatically a violation:

- **US states in a dropdown is fine at 50 items.** The set is finite, alphabetized, and universally known, so the user is recognizing a value they already have in mind, not evaluating fifty candidates.
- **Fifty disparate values in a dropdown is not fine.** The user has to read and weigh each one, which is comparison, and the ceiling bites.

**The test is the same one `recursica-skill-selection-controls` applies to dropdowns:** does the user know what is in the set before they open it? If yes, length is cheap. If no, length is expensive.

Menus and navigation are recognition surfaces too — which is why the navigation ceiling exists for scannability, not because users must memorize nav items. Do not justify a nav count limit by claiming users cannot remember the options; they do not have to.

## Common misapplications

**Do not cite 7 ± 2 to cap a list the user only recognizes from.** Alphabetized reference data, search results, and table rows are not bound by it.

**Do not treat nine as a target.** It is the far end of a range that shrinks as material gets harder. Most enterprise subject matter is harder than average, so most counts should sit below seven.

**Do not use the rule to justify hiding things behind a "more" affordance.** Exceeding the ceiling means the structure needs grouping or a different control, not concealment. See the overflow rules in `recursica-skill-navigation`.

**Do not claim the number is settled science.** If challenged, the accurate position is: Miller's span is about recall of unidimensional items, Cowan's reconsideration puts capacity nearer four, and Recursica uses 7 ± 2 as a deliberate scannability convention.

## References

- Miller, G. A. (1956). "The Magical Number Seven, Plus or Minus Two: Some Limits on Our Capacity for Processing Information." _Psychological Review_, 63(2), 81–97.
- Cowan, N. (2001). "The magical number 4 in short-term memory: A reconsideration of mental storage capacity." _Behavioral and Brain Sciences_, 24(1), 87–114.
- Nielsen, J. (2009). "Short-Term Memory and Web Usability." Nielsen Norman Group. <https://www.nngroup.com/articles/short-term-memory-and-web-usability/> — states plainly that limiting menus to seven items is a misconception, because menus rely on recognition rather than recall.

## Out of scope

- **Choosing a control type.** Covered by `recursica-skill-selection-controls`.
- **Whether a feature should be discoverable or promoted.** Covered by `recursica-skill-discoverability`, the sibling psychology skill.
- **Navigation structure, grouping, and overflow behavior.** Covered by `recursica-skill-navigation`.
- **Any count limit not listed in the table above.** No rule exists yet; say so rather than deriving one.

## Pre-flight checklist

When a count decision is in play, verify:

- [ ] Each level of a set holds 7 ± 2 items, biased below seven where the material is unfamiliar or hard to distinguish.
- [ ] Sets that exceed the ceiling were restructured by grouping, or moved to a different control — not hidden behind an overflow affordance.
- [ ] The ceiling was applied only to comparison sets, not to recognition lists like alphabetized reference data.
- [ ] Any long list left long passes the predictability test: the user knows what is in the set before opening it.
- [ ] No count limit was invented for a surface the table above does not cover.
- [ ] Any claim made about the research is accurate — 7 ± 2 is a scannability convention here, not a capacity finding.
