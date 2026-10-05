---
name: recursica-skill-badge
description: Rules for the Recursica badge — when a value is a badge rather than a chip, icon, or text, badge styles, one badge and never interactive, no error badges, placement, and counts. Use for status, counts, and read-only tags. Not for a value the user selects or removes — see recursica-skill-chip.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Badge

A badge shows one read-only value about an object, such as a status or a count. The badge sits on the object. The system sets the value, and the user never acts on the badge.

## When to use a badge

- **One value describes the object.** The value is a status the system owns, a count, or one short attribute.
- **The badge sits on the object the badge describes**, such as a row in a table or a list, a heading, a tab, a navigation item, or a card. A badge never stands alone.
- **The space is tight.** A badge is small and uses small text, which suits a dense screen.

## When not to use a badge

| Situation                                                      | Use instead                                                                                        |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| The user selects, toggles, or dismisses the value              | A chip. See `recursica-skill-chip`.                                                                |
| The object has several values                                  | Chips. A badge holds one value.                                                                    |
| The value is an error or a failure                             | An icon, or a treatment built for errors. See the rule on errors below.                            |
| The text is long, or a phrase                                  | Plain text. A badge never holds a sentence.                                                        |
| The text labels the page or the section                        | A heading. A badge describes an object, not a page, a section, or any other view.                  |
| The text is the title of a region, a group, or a panel section | A heading. **Never a badge.** A badge gives a fact about an object. A badge never names an object. |

**A user can never act on a badge.** No badge can be selected, and no badge can be dismissed. If the user must act on the value, use a chip.

## Variants

**Use only the badge variants and options that the Recursica MCP server lists for the project.** A designer can add variants and options in Theme Forge, so each project can differ. Get the list with the server's `recursica_get_component_doc` tool, and use the names the code uses. Never invent a variant or an option.

The rules below describe each option by role, such as "the problem style" or "the warning style". The names in the standard UI kit (the unchanged UI kit in the official Recursica release) are examples only.

- **One style for each intent.** An intent is the kind of meaning a style shows: positive, a warning, a problem, or neutral. The standard UI kit has four styles: `primary-color`, `warning`, `success`, and `alert`. In the standard UI kit, the problem style is `alert`, the warning style is `warning`, and the success style is `success`.
- **Four intents in the standard UI kit.** The standard UI kit has no fifth intent. If the project adds a style in Theme Forge, use the project's style. Most projects have more statuses than styles. For example, an order process with Pending, Approved, Ordered, Shipped, Delivered, Blocked, and Canceled has seven statuses, and the standard UI kit has only four styles. So two different statuses share a style and look the same.
- **No size variant and no content variant in the standard UI kit.** Only the design-system website shows a size variant and a content variant. If the project adds a size variant or a content variant in Theme Forge, use the project's variant. The mismatch between the website and the standard UI kit is not settled. Read the open questions before relying on a size variant or a content variant that the project does not list.
- **Never give a badge a disabled state, an interactive state, or a hover effect**, even when the project lists one. A badge has no states, because a badge is not a control.

## Rules

**The style must agree with the sentiment of the value**, meaning whether the value is good, bad, or neutral. A positive value never gets the negative style. The problem style means a problem, so an approved, complete, or successful value must never use the problem style. A badge in the wrong style contradicts the badge text, and users notice the color before users read the word. The open questions cover the exact mapping of statuses to intents, which is not decided. The settled rule is that the intent must never contradict the text.

**Repeating a style is safe only because the badge text always shows the difference between statuses.** Map several statuses to one intent on purpose. Let the label name the status. Never use color to tell Ordered apart from Shipped. `recursica-skill-system-conventions` requires this rule. Do not invent a fifth intent. When the project lists no fifth style, no setting exists for a fifth intent, so making one means working around the component. A fifth color is not a missing token to report. The standard UI kit leaves out a fifth color on purpose. See `recursica-skill-design-router` on the styling escape hatch.

**Use one badge per object.** Two values side by side means the object has more than one value, and more than one value means chips.

**Never use a badge to show an error.** A badge looks like positive information about an object, so "Error" in a badge looks like an achievement. Use an icon, or a stronger treatment built for errors. The rule holds even though the warning style and the problem style exist. What the warning style and the problem style are for is an open question, listed below.

**Put the badge right after the object the badge describes, on the same line.** Never stack the badge above or below the object.

**A count needs a unit.** The unit can be in the badge text, in the object, or in another place, such as a column header. A badge that shows "12" has a meaning only because of the object the badge sits on. Make the badge part of that object, not only placed beside the object.

**Keep the value to one or two words, or a number.** A value that does not fit the small text is not badge content.

**When a status changes, swap the badge to the new value with no animation.** Use no pulse, no flash, and no transition.

**A badge on a tab or a navigation item describes the content the tab or item leads to.** The badge is not a second control. The user can never click the badge separately, even when the user can click the tab the badge sits on.

## Accessibility

The rules below add to the accessibility baseline in `recursica-skill-system-conventions`, which every Recursica component follows.

A badge is text, not a control. For most components, the risk is that a user cannot reach the control. For a badge, the risk is the opposite. A screen reader can announce the badge apart from the object the badge describes, or not announce the badge at all.

### Screen readers

- **Announce the badge as part of the object the badge describes**, not as a separate item. "Members, 12" and "Invoice 1043, overdue" are useful. A "12" heard alone is not.
- **Announce a count with the unit**, as in "3 unread messages", not "3". When a screen reader reads the page aloud in order, the user cannot see the object that makes the number clear.
- **Never let the style carry the meaning.** The success style and the problem style are colors, and a screen reader user hears only the text. The word in the badge must hold the whole meaning, as `recursica-skill-system-conventions` requires.
- **Never use a badge that shows only an icon.** A badge with no text gives a screen reader nothing to announce.
- **When a badge changes while the user is on the page, announce the change politely, or do not announce the change.** A count that updates often must never interrupt the user, and must never be announced on every increase.
- **Do not add a second copy of the badge text for screen readers while both copies stay in the reading order.** The user hears the text twice.

### Keyboard and non-mouse navigation

- **A badge cannot receive focus, and the tab order skips the badge.** Never give a badge a `tabindex`, a click handler, or a role that suggests a user can act on the badge.
- **A badge that seems to need focus is the wrong component.** Use a chip instead.
- **A badge inside a control, such as a tab, a navigation item, or a row link, is part of the control's accessible name** (the name a screen reader reads out for a control). The badge is not a separate stop inside the control.
- **Never show a badge only on hover.** The purpose of a badge is to be seen at a glance.

## Styling set by tokens

**Do not set or override the badge properties below.** The badge component sets each property.

- `text` styling, including size and weight.
- `padding-horizontal`, `padding-vertical`.
- `border-size`, `border-radius`, `elevation`.
- All colors, for each style.

## Related skills

- `recursica-skill-badges-chips` — when a badge is the right component, how many badges are allowed, and badge placement in tables, cards, tabs, headings, and navigation.
- `recursica-skill-system-conventions` — showing every meaning in more than one way, such as color and text.

## Open questions

- **The mapping of statuses to intents.** The principle is settled: the intent agrees with the sentiment of the value, and the problem style never shows a positive value. Which intent each status gets is not decided. With more statuses than intents, the mapping must be stated, not invented while building.
- **What the warning style and the problem style are for**, given that a badge must not show an error. Until someone answers the question, use neither style.
- **A size variant, with default and large, and a content variant, with message and counter.** Only the design-system website shows the two variants, and the standard UI kit has no token for either one. Unless the project lists the variant, do not assume either variant is available, and ask before relying on either variant.
- **A limit on counts.** Whether a large number is shortened, and how.
- **An icon in a badge.** Whether a badge may show an icon beside the badge text.
- **A count of zero.** Whether a count badge is hidden at zero, or shown.

## Pre-flight checklist

- [ ] Every badge value is read-only, set by the system, and one value.
- [ ] No user can act on a badge. No badge can receive focus or be dismissed.
- [ ] No badge shows an error, and no badge uses the warning style or the problem style on a guess.
- [ ] Every badge sits right after the badge's object, on the same line, and is never stacked.
- [ ] The badge text alone holds the full meaning, and no meaning depends on color.
- [ ] No badge is the title of a region, a group, or a section. A heading is the title.
- [ ] Every badge's intent agrees with the sentiment of the badge's value, and no positive value uses the problem style.
- [ ] Where a project has more statuses than intents, the mapping of statuses to intents is deliberate, and the label tells the statuses apart. No badge uses an invented intent that the project does not list.
- [ ] Every count includes the unit in what a screen reader announces.
- [ ] A screen reader announces each badge as part of the badge's object, not as a separate fragment.
- [ ] No badge has a `tabindex`, a click handler, or a role that suggests a user can act on the badge.
- [ ] A status change swaps the badge with no animation, and any live update is announced politely or not at all.
- [ ] Every badge uses a style the project lists, and no badge relies on a size variant or a content variant that the project does not list.
- [ ] The badge's text, padding, border, elevation, and colors have no overrides.
- [ ] Open questions were asked about, not decided: the mapping of statuses to intents, what the warning style and the problem style are for, a size variant and a content variant, a limit on counts, an icon beside the badge text, and a count of zero.
