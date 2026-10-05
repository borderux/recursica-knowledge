---
name: recursica-skill-avatar
description: Rules for the Recursica avatar — when to show an avatar, avatar styles and fallback order, sizes, and when an avatar is a control or decoration. Use for profile pictures, initials, account-menu buttons, and author markers. Not for the menu an avatar opens — see recursica-skill-menu. Not for status — see recursica-skill-badge.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Avatar

An avatar is a small picture that stands for a person or an entity. An avatar helps users tell people apart. An avatar alone never identifies anyone.

## When to use an avatar

- **The name is already in text near the avatar, and a face makes the list faster to scan.** Examples are a comment author, the assignee in a table or list row, and a team directory.
- **The avatar is the button that opens the account menu (also called the user menu).** Opening the account menu is the only case where an avatar is a control.
- **A photograph helps users recognize a person**, such as the collaborators on a document, or the people active on a page right now.

## When not to use an avatar

| Situation                                                                                      | Use instead                                                                                            |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| The name alone identifies the record, and space is tight                                       | Plain text. In a dense table, a name column works better than a picture. See `recursica-skill-tables`. |
| The screen must show status, presence, or a count                                              | A badge beside the name. See `recursica-skill-badge`.                                                  |
| Several people must appear as one overlapping group of avatars                                 | The project's avatar group variant, if the project has one. See the open questions.                    |
| The picture stands for an idea, not a person                                                   | An icon. An avatar shows identity and is not decoration.                                               |
| The avatar would be the only way to tell which person or entity a table or list row belongs to | A name in text, with the avatar beside the name.                                                       |

**An avatar alone identifies no one.** A picture can match more than one person, and so can a pair of initials. When a screen reader reads a picture or initials aloud, the picture or initials identify no one. The name in text identifies the person. The avatar is a shortcut to the name.

## Variants

**Use only the avatar variants and options that the Recursica MCP server lists for the project.** A designer can add variants and options in Theme Forge, so each project can differ. Get the list with the server's `recursica_get_component_doc` tool, and use the names the code uses. Never invent a variant or an option.

The rules below describe each option by role, such as "the photo style". The names in the standard UI kit (the unchanged UI kit in the official Recursica release) are examples only.

- **Three styles, one for each kind of content, ranked in order.** The photo style shows a photograph. The initials style shows initials. The icon style shows a generic person or placeholder icon. The photo style ranks first, then the initials style, then the icon style. Use the highest-ranked style that the available data supports, and fall back down the list. In the standard UI kit, the three styles are `image`, `text`, and `icon`.
- **Three sizes.** An avatar comes in a smaller size, a default size, and a larger size. In the standard UI kit, the three sizes are `small`, `default`, and `large`.
- **Three types, for the initials style and the icon style only.** In the standard UI kit, the three types are `solid`, `outline`, and `ghost`. When to use each type is an open question.
- **Status and presence.** If the project has a status dot, a presence indicator, or a slot for a badge on the avatar, use that option. Otherwise, a badge stays a separate component and does not attach to the avatar.
- **Groups and shapes.** If the project has a group, stack, overlapping-cluster, or shape variant, use that variant. Otherwise, do not build an avatar group out of several avatars.

**The design-system website shows a different set of styles.** Only the website shows styles named Image, Primary, Background, and Ghost, and a Border variant that is true or false. The website also shows overlapping avatars in a group. Of the website's styles, only Ghost matches the UI kit, as the `ghost` type. Read the open questions before relying on any part of the website's set.

## Rules

**Always show the name in text beside the avatar.** The rule holds in a table or list row, a comment, an assignment, and a list. The name identifies the person, and the avatar sits next to the name. The name in text is a hard requirement, not a preference.

**Fall back in this order: the photo style, then the initials style, then the icon style.** A photo that fails to load must never leave an empty circle. Fall back to initials when the name is known. Fall back to the icon style only when the name is unknown.

**Initials are not a name.** Two people can share the initials "AM". An initials avatar is a visual aid added to a name already on the screen. An initials avatar never replaces the name.

**The icon style shows no identity at all.** An icon avatar means "a person", without saying which person. Use the icon style for a party who is unknown or unnamed, or as the last fallback. Never use the icon style as the usual picture for a known user.

**Decide once whether each avatar is a control.** An avatar that opens the account menu is a real button, with a real accessible name (the name a screen reader reads out for a control) and a tab stop (a place the Tab key lands). Every other avatar is decoration, with no click handler, no tabindex, and no element or ARIA role that makes the avatar a control. No avatar is partly a control and partly decoration.

**Keep the account menu out of primary navigation.** The account menu is a tool used on every page, not a place to go. `recursica-skill-navigation` places the account menu in another part of the application chrome (the header, navigation and footer around the content).

**Choose the size by how dense the layout around the avatar is, not by how important the person is.** Use the smaller size in a table row or a comment. Use the larger size in a profile header. Do not use size to rank people.

**Put only initials in an initials avatar, one or two characters.** Do not put a name, a role, or a count in an initials avatar.

## Accessibility

The rules below add to the accessibility baseline in `recursica-skill-system-conventions`, including the focus ring, which every Recursica component follows.

An avatar is either a picture or a control, and each kind fails a screen reader user in a different way. A picture avatar can be announced as an unlabeled image, or as a second copy of a name the screen reader already read. A control avatar can have no accessible name at all.

### Screen readers

- **Give a photo avatar alternative text that names who or what the avatar stands for, whenever the avatar is the only place the name appears.** Write the name, such as "Person A", not "avatar" and not "profile photo".
- **When the name is already in text next to the avatar, the avatar is decorative and must be silent.** Give the avatar empty alternative text. Hearing "Person A, image, Person A" is worse than hearing nothing, and the repeat happens in every row of the list.
- **A screen reader must never announce the initials in an initials avatar as a person's identity.** "AM" tells a screen reader user nothing. The initials are decorative. The screen reader reads the name in text.
- **An icon avatar must be silent.** An icon avatar shows no identity, so a screen reader has nothing to announce. A screen reader must not announce an icon avatar as "image" or "graphic".
- **Give a control avatar a real accessible name that says what using the avatar does**, such as "Account menu", or the user's name and what the avatar opens. The picture is not the accessible name. A control with no accessible name is announced only as "button".
- **A control avatar counts as an icon-only control.** Give a control avatar a tooltip for sighted mouse users and, separately, an accessible name. `recursica-skill-buttons-links` requires both.
- **Never make the avatar the only way to tell whose table or list row, comment, or assignment the user sees.** An avatar alone puts meaning in a single visual channel (color, shape, position or text, each a separate signal). `recursica-skill-system-conventions` forbids meaning in a single channel.
- **Do not add a hidden copy of the name for screen readers while the visible name stays in the reading order (the order in which a screen reader reads the page).** The screen reader user hears the name twice.

### Keyboard and non-mouse navigation

- **A decorative avatar never receives focus and is skipped in the tab order.** A decorative avatar has no tabindex, no click handler, and no role that suggests the avatar can be used.
- **A control avatar is a real button or link, is a tab stop, and works from the keyboard.** The control avatar takes the same place in the tab order as on screen, among the elements around the avatar.
- **When a control avatar opens a menu, focus moves into the menu.** Focus returns to the avatar when the menu closes. See `recursica-skill-menu`.
- **An avatar inside an element the user can click or select, such as a link in a table or list row, or a list item, is part of that element's name.** The avatar is not a separate tab stop inside the element.
- **Nothing about the avatar may depend on hover.** Keyboard users and touch users cannot reach a name that appears only in a hover tooltip. A hover tooltip was never what identified the person.

## Styling set by tokens

**Never set or override the avatar's styling.** The theme sets every visual property of the avatar, such as size, spacing, borders, colors and animation. Do not add extra containers or spacers to change the avatar's look. If the design needs a look the theme does not give, raise the gap. See `recursica-skill-design-router`.

## Related skills

- `recursica-skill-navigation` — keeping the account menu out of primary navigation, what counts as a location, and how the page shows where the user is.
- `recursica-skill-buttons-links` — the tooltip and accessible name an icon-only control needs, and when to use a button or a link.
- `recursica-skill-tables` — whether a person column in a dense table shows a picture, and which fields get a column at all.
- `recursica-skill-system-conventions` — never showing a meaning in a single channel.

### Only if used on the same screen

- `recursica-skill-menu` — the menu a control avatar opens, and where focus goes when the menu opens and closes.
- `recursica-skill-badge` — showing status and counts as read-only information beside the name.

## Open questions

- **Two sets of styles that do not agree.** Only the design-system website shows styles named Image, Primary, Background, and Ghost, and a Border variant that is true or false. The UI kit defines the `text`, `icon`, and `image` styles. The UI kit gives the `text` and `icon` styles the `solid`, `outline`, and `ghost` types. Nobody has settled which set of styles is the authority. Ask before relying on either set of styles.
- **Avatar groups.** Only the design-system website shows overlapping avatars in a group. Unless the project has a group variant, do not build an avatar group. Do not rely on the website's group without asking.
- **Which size belongs in which layout.** No rule says where the smaller size, the default size, and the larger size each apply.
- **How initials are chosen.** No rule says whether initials use one letter or two, or how to handle a one-word, hyphenated, or non-Latin name.
- **Avatars for an entity that is not a person.** No rule says whether an avatar may stand for an entity that is not a person, such as a company, a team, or a system. No rule says which fallback such an avatar uses.
- **Presence and status.** No rule says how to show presence.
- **When to use each type.** The standard UI kit defines the `solid`, `outline`, and `ghost` types for initials avatars and icon avatars. No rule says when to use each type. Nobody has confirmed that the adapter (the Recursica component library for one framework, such as Mantine or Angular Material) exposes the type as a setting. Check the avatar component's settings, or ask, before relying on the type.

## Pre-flight checklist

- [ ] Every avatar sits beside the name in text. No avatar is the only way to identify a person or record.
- [ ] Each avatar's style matches the available data, falling back from the photo style to the initials style to the icon style.
- [ ] A photo that fails to load falls back to initials or the placeholder icon, never to an empty circle.
- [ ] Initials are decoration, never a name, and no known user gets the icon style.
- [ ] Each avatar is either a control, with a real accessible name and a tab stop, or decoration, with no tabindex, event handler, or element or ARIA role that makes the avatar a control.
- [ ] A control avatar has a tooltip and an accessible name. Focus returns to the control avatar when the menu the avatar opened closes.
- [ ] A photo avatar has alternative text naming the person, or is silent because the name is already in text next to the avatar.
- [ ] Initials avatars and icon avatars are silent, and no avatar is announced as an unlabeled graphic.
- [ ] No name is repeated in a hidden element while the visible name stays in the reading order.
- [ ] Each avatar's size follows how dense the layout around the avatar is, not how important the person is.
- [ ] The account menu sits outside primary navigation.
- [ ] Every style and size is one the project's UI kit lists. No avatar has an invented group, status dot, badge slot, or border variant.
- [ ] No styling is set or overridden on the avatar, and no container or spacer is added to change the avatar's look.
- [ ] Open questions were asked about, not decided: the two sets of styles, avatar groups, which size belongs in which layout, how initials are chosen, avatars for an entity that is not a person, presence and status, and when to use each type.
