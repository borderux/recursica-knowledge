---
name: recursica-skill-avatar
description: How to use the Recursica avatar correctly — when a visual identity marker earns its place, which of the three styles applies and the order they fall back in, the three sizes, when an avatar is a control and when it is decoration, and the screen-reader and keyboard requirements. Use whenever adding, reviewing, or refactoring a profile picture, a user menu trigger, an author marker on a comment, or a person column in a list. Trigger on "avatar", "profile picture", "profile photo", "user image", "initials", "monogram", "user menu", "account menu", "who posted this", "screen reader", "tab order", or a request to show who someone is. Do NOT use for the menu an avatar trigger opens — that is recursica-skill-menu. Do NOT use for status, presence, or a count attached to a person — that is recursica-skill-badge. Do NOT use for where the account menu belongs in the app shell — that is recursica-skill-navigation.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Avatar

An avatar is a small visual stand-in for a person or entity. It supports identification; it never supplies it alone.

## Use it when

- **The person is already named in text nearby** and a face makes the list faster to scan — a comment author, a row's assignee, a team directory.
- **The avatar is the account menu's trigger.** That is the one case where it is a control.
- **A photograph adds real recognition value** — collaborators on a document, who is currently active on a page.

## Do not use it when

| Instead of an avatar                                    | Use                                                                                       |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ---------- |
| The name alone identifies the record and space is tight | Plain text. At table density a name column beats a picture — see `recursica-skill-tables` |
| Status, presence, or a count must be shown              | `recursica-skill-badge`, beside the name. This component has no status dot                |
| Several people must read as one overlapping cluster     | Nothing — the kit defines no avatar group. See the uncovered list                         |
| The graphic represents a concept, not a person          | An icon. An avatar is identity, not decoration                                            |
| It would be the only way to tell whose row this is      | A name in text, with the avatar beside it                                                 |

**An avatar identifies nothing by itself.** A picture and a pair of initials are both ambiguous, and neither survives being read aloud. The name in text is what identifies; the avatar is the shortcut to it.

## What exists

Taken from `recursica_ui-kit.json` → `ui-kit.components.avatar`. **Do not pass a style or size that is not listed here.**

**The third column is the React prop that sets the axis.** The axis name is the token inventory's; it is not a prop, and passing it as one is dropped silently by React. A blank cell means no single prop carries that axis — it is set by CSS state or by separate props, and the rules below say which.

| Axis     | Options                     | React prop |
| -------- | --------------------------- | ---------- |
| `styles` | `text`, `icon`, `image`     |            |
| `sizes` | `small`, `default`, `large` | `size` |
**The three styles are three sources of content, and they rank.** `image` is a photograph, `text` is initials, `icon` is a generic person or placeholder. Pick the highest one you actually have data for, and fall back down the list.

**There is no status dot, no presence indicator, and no badge slot.** A badge is a separate component and does not attach to this one.

**There is no group, stack, or overlapping-cluster variant**, and no shape axis. Do not assemble an avatar group out of several avatars.

**A different taxonomy is documented outside the token inventory** — styles named Image, Primary, Background, and Ghost, plus a Border true/false axis — along with separating overlapping avatars in a group. None of that exists in the kit, whose only property is `elevation`. See the uncovered list before relying on any of it.

## Rules for using it

**Always pair the avatar with the name in text.** In a row, a comment, an assignment, a list — the name is the identification and the avatar sits next to it. This is a hard requirement, not a preference.

**Fall back in order: `image`, then `text`, then `icon`.** An image that fails to load must never leave an empty circle. Resolve to initials when a name is known, and to `icon` only when it is not.

**Initials are not a name.** Two people share "AM". A `text` avatar is a visual convenience on top of a name that is already present, never a substitute for it.

**The `icon` style carries no identity at all.** It means "some person". Use it for a genuinely unknown or unnamed party, or as the last fallback — never as the standing representation of a known user.

**Decide once whether this avatar is a control.** A user menu trigger is a real button with a real accessible name and a tab stop. Everything else is decoration: no click handler, no tabindex, no interactive role. There is no middle state.

**Keep the account menu out of primary navigation.** It is a global utility, not a destination — `recursica-skill-navigation` places it elsewhere in the app chrome.

**Size follows the density of the surface, not the importance of the person.** `small` in a table row or a comment, `large` on a profile header. Do not use size to rank people.

**Put nothing but initials in a `text` avatar** — one or two characters. It is not a container for a name, a role, or a count.

## Accessibility

An avatar is either a picture or a control, and the two fail differently. As a picture the risk is being announced as an unlabeled graphic or as a redundant second copy of a name already read. As a control the risk is having no name at all.

### Screen readers

- **An `image` avatar needs alternative text naming the person or thing** whenever the avatar is the only place that name appears. "Jane Doe", not "avatar" and not "profile photo".
- **When the name is already adjacent in text, the avatar is decorative and must be silent.** Give it empty alternative text. "Jane Doe, image, Jane Doe" is worse than saying nothing, and it happens in every row of the list.
- **A `text` avatar's initials must never be announced as an identity.** "AM" tells a screen reader user nothing. The initials are decorative; the name in text is what gets read.
- **An `icon` avatar must be silent.** It carries no identity, so there is nothing to announce — and it must not surface as "image" or "graphic".
- **An avatar that is a control needs a real accessible name that says what activating it does** — "Account menu", or the user's name plus what it opens. The image is not the name, and an unnamed control is announced as just "button".
- **A control avatar is icon-only in effect**, so it needs a tooltip for sighted mouse users and, separately, an accessible name — required by `recursica-skill-buttons-links`.
- **Never let the avatar be the only way to tell whose row, comment, or assignment this is.** That is meaning in a single visual channel, prohibited by `recursica-skill-system-conventions`.
- **Do not add a hidden copy of the name for screen readers** while the visible name stays in the reading order. The user hears it twice.

### Keyboard and non-mouse navigation

- **A decorative avatar is not focusable and is skipped in the tab order.** No tabindex, no click handler, no role that implies interaction.
- **A control avatar is a real button or link, a tab stop, and activated from the keyboard**, in visual order with everything around it.
- **When a control avatar opens a menu, focus moves into the menu and returns to the avatar when it closes.** See `recursica-skill-menu`.
- **An avatar inside an interactive element** — a row link, a list item — is part of that element's name, not a separate stop within it.
- **Nothing about the avatar may depend on hover.** A name that appears only in a hover tooltip is unavailable to keyboard and touch users, and it was never the identification anyway.
- **Never suppress the focus ring** on an interactive avatar, and never let a hover treatment stand in as the focus state.

## Not your decision

Do not implement, override, or tune any of these — the component owns them for every combination of style and size:

- `elevation`.
- Diameter and every dimension per size.
- Border radius and shape.
- Initials type styling, and the placeholder icon's size.
- All colors per style and per layer, including hover, active, and focus.
- The focus ring on an interactive avatar.

## Load these too

- [`recursica-skill-navigation`](../../design-rules/recursica-skill-navigation/SKILL.md) — that the user and account menu stay out of primary navigation, what counts as a location, and how the page states where the user is.
- [`recursica-skill-menu`](../recursica-skill-menu/SKILL.md) — the menu an avatar trigger opens, and focus handling on open and close.
- [`recursica-skill-badge`](../recursica-skill-badge/SKILL.md) — status and counts as read-only metadata beside the name, since this component has no status dot.
- [`recursica-skill-buttons-links`](../../design-rules/recursica-skill-buttons-links/SKILL.md) — the tooltip and naming requirements for an icon-only control, and button vs. link semantics.
- [`recursica-skill-tables`](../../design-rules/recursica-skill-tables/SKILL.md) — whether a person column earns a picture at table density, and what earns a column at all.
- [`recursica-skill-system-conventions`](../../design-rules/recursica-skill-system-conventions/SKILL.md) — never carry meaning in a single channel.

## Uncovered — ask, do not invent

- **Two incompatible style taxonomies.** Styles named Image, Primary, Background, and Ghost, plus a Border true/false axis, are documented outside the token inventory; the kit defines `text`, `icon`, and `image`, with `elevation` as its only property. Which is authoritative has not been resolved — do not rely on this without asking.
- **Avatar groups.** Overlapping avatars in a group are documented outside the token inventory; no group or stack exists in the kit. Do not assemble one, and do not rely on this without asking.
- **Which size belongs on which surface.** No rule states where `small`, `default`, and `large` each apply.
- **How initials are derived** — one letter or two, and what happens with a single-word, hyphenated, or non-Latin name.
- **Whether an avatar may represent a non-person entity** — a company, a team, a system actor — and what its fallback is.
- **Presence and status.** No status dot exists, and no rule says how presence is shown.

## Pre-flight checklist

- [ ] Every avatar sits beside the name in text; none is the sole identification of a person or record.
- [ ] The style was chosen by what data exists, falling back `image` → `text` → `icon`.
- [ ] A failed image resolves to initials or the placeholder icon, never to an empty circle.
- [ ] Initials are treated as decoration, never as a name; the `icon` style is not used for a known user.
- [ ] Each avatar is either a control with a real accessible name and a tab stop, or decoration with no tabindex, handler, or interactive role.
- [ ] A control avatar has a tooltip as well as an accessible name, and focus returns to it when the menu it opened closes.
- [ ] An `image` avatar has alternative text naming the person, or is silent because the name is already adjacent.
- [ ] `text` and `icon` avatars are silent; no avatar announces as an unlabeled graphic.
- [ ] No name is duplicated in a hidden element while the visible one remains in the reading order.
- [ ] Size follows surface density, not the importance of the person.
- [ ] The account menu sits outside primary navigation.
- [ ] Nothing about the avatar depends on hover, and the focus ring is intact on anything interactive.
- [ ] No style or size outside the inventory above was passed; no group, status dot, badge slot, or border axis was invented.
- [ ] No component-owned styling was overridden.
- [ ] Nothing in the uncovered list was invented.
