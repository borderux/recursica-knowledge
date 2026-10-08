---
name: recursica-skill-avatar
description: Rules for the Recursica avatar — when to show an avatar, avatar styles and fallback order, sizes, and when an avatar is a control or decoration. Use for profile pictures, initials, account-menu buttons, and author markers. Not for the menu an avatar opens — see recursica-skill-menu. Not for status — see recursica-skill-badge.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Avatar

An avatar is a small picture that stands for a person or an entity. An avatar helps personas tell people apart.

## When to use an avatar

- **A name already shows in text near the avatar, and a face makes a list faster to scan.** Examples are a comment author, the assignee in a table row or a list row, and a team directory.
- **An avatar is the button that opens the account menu (also called the user menu).** Opening the account menu is the only case where an avatar is a control.
- **A photograph helps personas recognize a person.** Examples are the collaborators on a document and the people active on a page right now.

## When not to use an avatar

| Situation                                                                                      | Use instead                                                                                            |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| The name alone identifies the record, and the layout has little room                           | Plain text. In a dense table, a name column works better than a picture. See `recursica-skill-tables`. |
| The screen must show status, presence, or a count                                              | A badge beside the name. See `recursica-skill-badge`.                                                  |
| Several people must appear as one overlapping group of avatars                                 | The project's avatar group variant, if the project has one. See "Avatar groups" in the open questions. |
| The picture stands for an idea, not a person                                                   | An icon. An avatar shows identity. An avatar is not an ornament.                                       |
| The avatar would be the only way to tell which person or entity a table or list row belongs to | A name in text, with the avatar beside the name.                                                       |

**An avatar alone identifies no one.** A picture can match more than one person, and so can a pair of initials. A persona using a screen reader learns nobody's identity from a picture or from initials. The name in text identifies the person. The avatar helps a persona find the name faster.

## Variants

**Use only the avatar variants and options that the Recursica MCP server lists for the project.** A designer can add variants and options in Theme Forge, so each project can differ. Get the list with the server's `recursica_get_component_doc` tool, and use the names the code uses. Never invent a variant or an option.

The rules below describe each option by role, such as "the photo style". The names in the standard UI kit (the unchanged UI kit in the official Recursica release) are examples only.

- **An avatar has three styles, one for each kind of content.** The photo style shows a photograph. The initials style shows initials. The icon style shows a generic person or placeholder icon. In the standard UI kit, the three styles are `image`, `text`, and `icon`. The rules below rank the three styles.
- **An avatar has three sizes: a smaller size, a default size, and a larger size.** In the standard UI kit, the three sizes are `small`, `default`, and `large`.
- **Three types apply to the initials style and the icon style only.** In the standard UI kit, the three types are `solid`, `outline`, and `ghost`. When to use each type is an open question.
- **If the project has a status dot, presence indicator or avatar badge slot, use the option for status and presence.** Otherwise, keep a badge as a separate component. Do not attach the badge to the avatar.
- **If the project has a group, stack, overlapping-cluster, or shape variant, use that variant.** Otherwise, do not build an avatar group out of several avatars.

**The design-system website shows a different set of styles, a Border variant and avatar groups.** Read the open questions before relying on any style, variant or group from the website.

## Rules

**Always show the name in text beside the avatar.** The rule holds in a table row, a list row, a comment, an assignment, and a list. The name in text identifies the person. Showing the name in text is a hard requirement, not a preference.

**Use the highest-ranked style that the available data supports.** Fall back in this order: the photo style, then the initials style, then the icon style. A photo that fails to load must never leave an empty circle. Fall back to the initials style when the name is known. Fall back to the icon style only when the name is unknown.

**Initials are not a name.** Two people can share the initials "AM". An initials avatar is a visual aid added to a name already on the screen. An initials avatar never replaces the name.

**The icon style shows no identity.** An icon avatar means "a person", without saying which person. Use the icon style for a party who is unknown or unnamed, or as the last fallback. Never use the icon style as the usual picture for a known persona.

**Decide once whether each avatar is a control or decoration.** An avatar that opens the account menu is a real button, with a real accessible name (the name a screen reader reads out for a control) and a tab stop (a place the Tab key lands). Every other avatar is decoration. A decorative avatar has no click handler and no tabindex. A decorative avatar has no element or ARIA role that makes the avatar a control. No avatar is partly a control and partly decoration.

**Keep the account menu out of primary navigation.** The account menu is a tool used on every page, not a place to go. `recursica-skill-navigation` places the account menu in another part of the application chrome (the header, navigation and footer around the content).

**Choose the size by how dense the layout around the avatar is, not by how important the person is.** Use the smaller size in a table row or a comment. Use the larger size in a profile header. Do not use size to rank people.

**Put only initials in an initials avatar, one or two characters.** Do not put a name, a role, or a count in an initials avatar.

## Accessibility

The rules below add to the accessibility baseline in `recursica-skill-system-conventions`, including the focus ring, which every Recursica component follows.

An avatar is either a picture or a control. Each kind of avatar fails a persona using a screen reader in a different way. A screen reader can announce a picture avatar as an unlabeled image. A screen reader can also announce a picture avatar as a repeat of a name the screen reader read before. A control avatar can have no accessible name at all.

### Screen readers

- **If a photo avatar is the only place the name appears, give the photo avatar alternative text.** The alternative text names who or what the avatar stands for. Write the name, such as "Person A", not "avatar" and not "profile photo".
- **When the name is already in text next to the avatar, the avatar is decorative and must be silent.** Give the avatar empty alternative text. Hearing "Person A, image, Person A" is worse than hearing nothing, and the repeat happens in every row of a list.
- **A screen reader must never announce the initials in an initials avatar as a person's identity.** "AM" tells a persona using a screen reader nothing. The initials are decorative. The screen reader reads the name in text.
- **An icon avatar must be silent.** An icon avatar shows no identity, so a screen reader has nothing to announce. A screen reader must not announce an icon avatar as "image" or "graphic".
- **Give a control avatar a real accessible name that says what using the avatar does.** Examples are "Account menu", or the persona's name and what the avatar opens. The picture is not the accessible name. A control with no accessible name is announced only as "button".
- **A control avatar counts as an icon-only control.** Give a control avatar a tooltip for sighted personas using a mouse and, separately, an accessible name. `recursica-skill-buttons-links` requires both.
- **Never make the avatar the only way to tell whose table or list row, comment, or assignment the persona sees.** An avatar alone puts meaning in a single visual channel (color, shape, position or text, each a separate signal). `recursica-skill-system-conventions` forbids meaning in a single channel.
- **Do not add a hidden screen-reader copy of the name while the visible name stays in the reading order.** A persona using a screen reader hears the name twice. The reading order is the order in which a screen reader reads the page.

### Keyboard and non-mouse navigation

- **A decorative avatar never receives focus and is skipped in the tab order.** A decorative avatar has no tabindex, no click handler, and no role that suggests the avatar can be used.
- **A control avatar is a real button or link, is a tab stop, and works from the keyboard.** The control avatar's place in the tab order matches the avatar's place on screen, among the elements around the avatar.
- **When a control avatar opens a menu, focus moves into the menu.** Focus returns to the avatar when the menu closes. See `recursica-skill-menu`.
- **An avatar inside an element the persona can click or select is part of that element's name.** Examples of such an element are a link in a table or list row, and a list item. The avatar is not a separate tab stop inside the element.
- **Nothing about the avatar may depend on hover.** Personas using a keyboard and personas using touch cannot reach a name that appears only in a hover tooltip. The name in text identifies the person, not a hover tooltip.

## Styling set by tokens

**Never set or override the avatar's styling.** The theme sets every visual property of the avatar, such as size, spacing, borders, colors and animation. Do not add extra containers or spacers to change the avatar's look. If the design needs a look the theme does not give, raise the gap. See `recursica-skill-design-router`.

## Related skills

- `recursica-skill-navigation` — keeping the account menu out of primary navigation, what counts as a location, and showing the persona's current location.
- `recursica-skill-buttons-links` — the tooltip and accessible name an icon-only control needs, and when to use a button or a link.
- `recursica-skill-tables` — whether a person column in a dense table shows a picture, and which fields get a column.
- `recursica-skill-system-conventions` — never showing a meaning in a single channel.

### Only if used on the same screen

- `recursica-skill-menu` — the menu a control avatar opens, and where focus goes when the menu opens and closes.
- `recursica-skill-badge` — showing status and counts as read-only information beside the name.

## Open questions

- **Two sets of styles that do not agree.** Only the design-system website shows styles named Image, Primary, Background, and Ghost. Only the design-system website shows a Border variant that is true or false. The UI kit defines the `text`, `icon`, and `image` styles. The UI kit gives the `text` and `icon` styles the `solid`, `outline`, and `ghost` types. Of the website's styles, only Ghost matches the UI kit, as the `ghost` type. Nobody has settled which set of styles is the authority. Confirm with the user before relying on either set of styles.
- **Avatar groups.** Only the design-system website shows overlapping avatars in a group. Unless the project has a group variant, do not build an avatar group. Do not rely on the website's group without confirming with the user.
- **Which size belongs in which layout.** No rule says where the smaller size, the default size, and the larger size each apply.
- **How initials are chosen.** No rule says whether initials use one letter or two, or how to handle a one-word, hyphenated, or non-Latin name.
- **Avatars for an entity that is not a person.** No rule says whether an avatar may stand for an entity that is not a person. Examples are a company, a team, or a system. No rule says which fallback such an avatar uses.
- **Presence and status.** No rule says how to show presence.
- **When to use each type.** The standard UI kit defines the `solid`, `outline`, and `ghost` types for initials avatars and icon avatars. No rule says when to use each type. Nobody has confirmed that the adapter (the Recursica component library for one framework, such as Mantine or Angular Material) exposes the type as a setting. Check the avatar component's settings, or confirm with the user, before relying on the type.

## Pre-flight checklist

- [ ] Every avatar sits beside the name in text. No avatar is the only way to identify a person or record.
- [ ] Each avatar's style matches the available data. The style falls back from the photo style to the initials style to the icon style.
- [ ] A photo that fails to load falls back to initials or the placeholder icon, never to an empty circle.
- [ ] Initials are decoration, never a name, and no known persona gets the icon style.
- [ ] Each avatar is either a control or decoration.
- [ ] A control avatar has a real accessible name and a tab stop.
- [ ] A decorative avatar has no tabindex and no event handler.
- [ ] A decorative avatar has no element or ARIA role that makes the avatar a control.
- [ ] A control avatar has a tooltip and an accessible name. Focus returns to the control avatar when the menu the avatar opened closes.
- [ ] A photo avatar has alternative text naming the person, or is silent with the name in text beside the avatar.
- [ ] Initials avatars and icon avatars are silent, and no avatar is announced as an unlabeled graphic.
- [ ] No name is repeated in a hidden element while the visible name stays in the reading order.
- [ ] Each avatar's size follows how dense the layout around the avatar is, not how important the person is.
- [ ] The account menu sits outside primary navigation.
- [ ] Every style and size is one the project's UI kit lists. No avatar has an invented group, status dot, badge slot, or border variant.
- [ ] No styling is set or overridden on the avatar. No container or spacer is added to change the avatar's look.
- [ ] Open questions were asked about, not decided: the two sets of styles, avatar groups, which size belongs in which layout, how initials are chosen, avatars for an entity that is not a person, presence and status, and when to use each type.
