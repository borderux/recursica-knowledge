---
name: recursica-skill-avatar
description: How to use the Recursica avatar correctly — when a visual identity marker earns its place, which of the three styles applies and the order they fall back in, the three sizes, when an avatar is a control and when it is decoration, and the screen-reader and keyboard requirements. Use whenever adding, reviewing, or refactoring a profile picture, a user menu trigger, an author marker on a comment, or a person column in a list. Trigger on "avatar", "profile picture", "profile photo", "user image", "initials", "monogram", "user menu", "account menu", "who posted this", "screen reader", "tab order", or a request to show who someone is. Do NOT use for the menu an avatar trigger opens — that is recursica-skill-menu. Do NOT use for status, presence, or a count attached to a person — that is recursica-skill-badge. Do NOT use for where the account menu belongs in the app shell — that is recursica-skill-navigation.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Avatar

An avatar is a small visual stand-in for a person or entity. It helps people recognize who is who; it never identifies anyone on its own.

## Use it when

- **The person is already named in text nearby**, and a face makes the list faster to scan — a comment author, a row's assignee, a team directory.
- **The avatar is the button that opens the account menu.** That is the one case where it is a control.
- **A photograph really helps people recognize someone** — collaborators on a document, or who is active on a page right now.

## Do not use it when

| Instead of an avatar                                    | Use                                                                                        |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| The name alone identifies the record and space is tight | Plain text. In a dense table, a name column beats a picture — see `recursica-skill-tables` |
| Status, presence, or a count must be shown              | `recursica-skill-badge`, beside the name. This component has no status dot                 |
| Several people must read as one overlapping cluster     | Nothing — the UI kit defines no avatar group. See the uncovered list                       |
| The graphic stands for an idea, not a person            | An icon. An avatar is identity, not decoration                                             |
| It would be the only way to tell whose row this is      | A name in text, with the avatar beside it                                                  |

**An avatar identifies nothing by itself.** A picture and a pair of initials are both ambiguous, and neither survives being read aloud. The name in text is what identifies someone; the avatar is a shortcut to it.

## What exists

Taken from the UI kit (the token file, `recursica_ui-kit.json`, that says which variants and states each component has) → `ui-kit.components.avatar`. **Do not pass a style or size that is not listed here.**

**The third column is the React prop that sets each axis.** An axis (a variant property, as Figma calls it — one way a component varies, such as its size) is named in the UI kit. Its name is not a prop, and if you pass it as one, React quietly ignores it. A blank cell means no single prop sets that axis — it is set by CSS state or by separate props, and the rules below say which.

| Axis     | Options                     | React prop |
| -------- | --------------------------- | ---------- |
| `styles` | `text`, `icon`, `image`     |            |
| `sizes`  | `small`, `default`, `large` | `size`     |

**The three styles are three sources of content, and they are ranked.** `image` is a photograph, `text` is initials, and `icon` is a generic person or placeholder. Pick the highest one you actually have data for, and fall back down the list.

**There is no status dot, no presence indicator, and no slot for a badge.** A badge is a separate component, and it does not attach to this one.

**There is no group, stack, or overlapping-cluster variant**, and no shape axis. Do not build an avatar group out of several avatars.

**A different set of styles is shown only on the design-system website** — styles named Image, Primary, Background, and Ghost, plus a Border true/false axis — along with spacing out overlapping avatars in a group. None of that exists in the UI kit, whose only property is `elevation`. See the uncovered list before relying on any of it.

## Rules for using it

**Always pair the avatar with the name in text.** In a row, a comment, an assignment, or a list, the name is what identifies the person, and the avatar sits next to it. This is a hard requirement, not a preference.

**Fall back in this order: `image`, then `text`, then `icon`.** An image that fails to load must never leave an empty circle. Fall back to initials when a name is known, and to `icon` only when it is not.

**Initials are not a name.** Two people can share "AM". A `text` avatar is a visual convenience on top of a name that is already there — never a replacement for it.

**The `icon` style carries no identity at all.** It means "some person". Use it for a party who really is unknown or unnamed, or as the last fallback — never as the usual picture for a known user.

**Decide once whether this avatar is a control.** A button that opens the user menu is a real button, with a real accessible name (the name a screen reader reads out for a control) and a tab stop (a place the Tab key lands). Everything else is decoration: no click handler, no tabindex, and no interactive role. There is nothing in between.

**Keep the account menu out of primary navigation.** It is a tool used everywhere, not a destination — `recursica-skill-navigation` places it elsewhere in the application chrome (the frame around the content).

**Size follows how dense the surface is, not how important the person is.** Use `small` in a table row or a comment, and `large` on a profile header. Do not use size to rank people.

**Put nothing but initials in a `text` avatar** — one or two characters. It is not a place for a name, a role, or a count.

## Accessibility

This component also follows the accessibility baseline in `recursica-skill-system-conventions`, including the focus ring (the outline that shows which element has keyboard focus). Only what is specific to it is listed here.

An avatar is either a picture or a control, and the two fail in different ways. As a picture, the risk is being announced as an unlabeled graphic, or as a second, repeated copy of a name that was already read. As a control, the risk is having no name at all.

### Screen readers

- **An `image` avatar needs alternative text (text read in place of the image) naming the person or thing**, whenever the avatar is the only place that name appears. "Jane Doe" — not "avatar", and not "profile photo".
- **When the name is already next to it in text, the avatar is decorative and must be silent.** Give it empty alternative text. "Jane Doe, image, Jane Doe" is worse than saying nothing, and it happens in every row of the list.
- **A `text` avatar's initials must never be announced as someone's identity.** "AM" tells a screen reader (software that reads the screen aloud) user nothing. The initials are decorative; the name in text is what gets read.
- **An `icon` avatar must be silent.** It carries no identity, so there is nothing to announce — and it must not come across as "image" or "graphic".
- **An avatar that is a control needs a real accessible name that says what using it does** — "Account menu", or the user's name plus what it opens. The image is not the name, and a control with no name is announced as just "button".
- **A control avatar is in effect icon-only**, so it needs a tooltip for sighted mouse users and, separately, an accessible name — as `recursica-skill-buttons-links` requires.
- **Never let the avatar be the only way to tell whose row, comment, or assignment this is.** That puts meaning in a single visual channel (a way of carrying meaning, such as color, shape, position, or text), which `recursica-skill-system-conventions` forbids.
- **Do not add a hidden copy of the name for screen readers** while the visible name stays in the reading order. The user hears it twice.

### Keyboard and non-mouse navigation

- **A decorative avatar cannot receive focus, and is skipped in the tab order.** No tabindex, no click handler, and no role that suggests it can be used.
- **A control avatar is a real button or link, is a tab stop, and can be used from the keyboard**, in visual order with everything around it.
- **When a control avatar opens a menu, focus moves into the menu, and returns to the avatar when the menu closes.** See `recursica-skill-menu`.
- **An avatar inside an interactive element** — a row link, a list item — is part of that element's name, not a separate stop inside it.
- **Nothing about the avatar may depend on hover.** A name that appears only in a hover tooltip cannot be reached by keyboard and touch users — and it was never what identified the person anyway.

## Not your decision

Do not implement, override, or tune any of these — the component owns them for every combination of style and size:

- `elevation`.
- Diameter and every dimension per size.
- Border radius and shape.
- Initials type styling, and the placeholder icon's size.
- All colors per style and per layer, including hover, active, and focus.
- The focus ring on an interactive avatar.

## Load these too

- `recursica-skill-navigation` — that the user and account menu stay out of primary navigation, what counts as a location, and how the page states where the user is.
- `recursica-skill-buttons-links` — the tooltip and naming requirements for an icon-only control, and button vs. link semantics.
- `recursica-skill-tables` — whether a person column earns a picture at table density, and what earns a column at all.
- `recursica-skill-system-conventions` — never carry meaning in a single channel.

### Only if the screen also uses it

- `recursica-skill-menu` — the menu an avatar trigger opens, and focus handling on open and close.
- `recursica-skill-badge` — status and counts as read-only metadata beside the name, since this component has no status dot.

## Uncovered — ask, do not invent

- **Two sets of styles that do not agree.** Styles named Image, Primary, Background, and Ghost, plus a Border true/false axis, are shown only on the design-system website. The UI kit defines `text`, `icon`, and `image`, with `elevation` as its only property. Which one is the authority has not been settled — do not rely on this without asking.
- **Avatar groups.** Overlapping avatars in a group are shown only on the design-system website, but no group or stack exists in the UI kit. Do not build one, and do not rely on this without asking.
- **Which size belongs on which surface.** No rule says where `small`, `default`, and `large` each apply.
- **How initials are chosen** — one letter or two, and what happens with a one-word, hyphenated, or non-Latin name.
- **Whether an avatar may stand for something that is not a person** — a company, a team, a system — and what its fallback is.
- **Presence and status.** No status dot exists, and no rule says how presence is shown.

## Pre-flight checklist

- [ ] Every avatar sits beside the name in text. None is the only thing identifying a person or record.
- [ ] You chose each style by what data exists, falling back from `image` to `text` to `icon`.
- [ ] An image that fails to load falls back to initials or the placeholder icon, never to an empty circle.
- [ ] Initials are treated as decoration, never as a name, and the `icon` style is not used for a known user.
- [ ] Each avatar is either a control, with a real accessible name and a tab stop, or decoration, with no tabindex, handler, or interactive role.
- [ ] A control avatar has a tooltip as well as an accessible name, and focus returns to it when the menu it opened closes.
- [ ] An `image` avatar has alternative text naming the person, or is silent because the name is already next to it.
- [ ] `text` and `icon` avatars are silent, and no avatar is announced as an unlabeled graphic.
- [ ] No name is repeated in a hidden element while the visible one stays in the reading order.
- [ ] Size follows how dense the surface is, not how important the person is.
- [ ] The account menu sits outside primary navigation.
- [ ] You passed no style or size outside the inventory above, and invented no group, status dot, badge slot, or border axis.
- [ ] You overrode no styling that the component owns.
- [ ] You invented nothing from the uncovered list.
