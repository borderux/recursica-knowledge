---
name: recursica-skill-breadcrumb
description: How to use the Recursica breadcrumb — when depth warrants a trail, what goes in it, the current page as plain text, and navigation-region accessibility. Use for breadcrumb trails and hierarchy paths. Not for the app shell — see recursica-skill-navigation; not for steps in a process — see recursica-skill-stepper.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Breadcrumb

A breadcrumb shows where the current page sits in the hierarchy, and gives a way back up it.

## Use it when

- **The structure really is nested**, and the page sits more than one level down. `recursica-skill-navigation` calls for breadcrumbs where the depth calls for them.
- **The page must answer "where am I?" by itself**, without the navigation being on screen. That is a requirement, and headings and breadcrumbs are what meet it.
- **The user moves through several levels or categories**, and needs to keep their bearings across a deep path.

## Do not use it when

| Instead of a breadcrumb                                | Use                                                                                          |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| The application is only one or two levels deep         | Headings. A clear heading hierarchy already shows location — `recursica-skill-navigation`    |
| It would be the only way back to the parent            | Real navigation — a sidebar or a top bar. A breadcrumb is extra wayfinding, not the main way |
| Location is already clear from the heading and the nav | Nothing. A trail that repeats what is already clear is clutter                               |
| The user moves through ordered steps in a process      | `recursica-skill-stepper`                                                                    |
| The user switches between parts of one whole on a page | `recursica-skill-tabs` — which have their own routes                                         |
| The trail would record where the user has been         | The hierarchy. A breadcrumb shows structure; it is not a history log                         |

Wayfinding means knowing where you are and how to get where you want to go.

**A breadcrumb is never the primary navigation.** If removing it would leave a user unable to get out of a section, the navigation is the real problem — see `recursica-skill-navigation`.

## What exists

Taken from the UI kit (the token file, `recursica_ui-kit.json`, that says which variants and states each component has) → `ui-kit.components.breadcrumb`. **Do not pass a variant, state, or content option — there are none.**

| Axis       | Options                                        |
| ---------- | ---------------------------------------------- |
| `variants` | None. The component has no variant axis at all |

**Two properties, and that is the whole component: `padding` and `item-gap`.**

**There is no separator token.** What sits between items — a slash, a chevron, a dot — is not defined in the UI kit. Do not invent one; see the uncovered list.

**There is no collapse, truncation, or overflow behavior.** How a long trail behaves is not defined. Whatever the answer turns out to be, it is not sideways scrolling — `recursica-skill-navigation` forbids that outright.

**There is no current-page state, and no content axis (a variant property, as Figma calls it — one way a component varies, such as its size).** An interactive item and a read-only item for the current page, plus a content axis of Label only, Icon + Label, Icon only, and Mixed, are shown only on the design-system website. The UI kit defines none of it. See the uncovered list.

## Rules for using it

**The trail follows the hierarchy, not the user's history.** Two users who reach the same page from different directions see the same trail. A breadcrumb shows how the platform is structured; it is not a back-stack (the list of pages the user has visited).

**The last item is the current page, and it is not a link.** Mark it clearly and leave it unlinked. A link to the page you are already on does nothing, and it is a dead end for anyone who follows it.

**Every other item is a real link with a real `href`**, to a page that exists. See `recursica-skill-link`.

**Each label is the destination page's own name, with no verb** — and it should match the heading the user will land on, so that arriving confirms the trail instead of contradicting it.

**A breadcrumb is one of three signals of location, never the only one.** `recursica-skill-navigation` requires the nav's selected state, a clear heading hierarchy, and breadcrumbs where the depth calls for them — and it states that the first one alone is not enough.

**Mark up the trail as a semantic list**, ordered or unordered. All navigation is a list.

**Include ancestors only** — the levels above the current page. No siblings, no filters, no search or sort state, and no modal the user happens to have open.

**Never point a crumb at a modal or a panel.** A trigger opens those; the user does not navigate to them, and they get no history entry — `recursica-skill-navigation`.

**Do not build a crumb that is only an icon.** The UI kit defines no content axis, and an icon on its own cannot name a destination. Where an icon really is clear — a home icon at the root — it still needs both a tooltip and an accessible name (the name a screen reader reads out for a control), as `recursica-skill-buttons-links` requires. Until the content axis is settled, use text.

**Never let the trail wrap into a scrolling strip to make it fit.** A trail too long for its space is a depth problem to raise, not a layout problem to cover up — see `recursica-skill-system-conventions`.

## Accessibility

This component also follows the accessibility baseline in `recursica-skill-system-conventions`, including the focus ring (the outline that shows which element has keyboard focus). Only what is specific to it is listed here.

A breadcrumb is a short row of links, and assistive technology (tools such as screen readers that help people with disabilities use a computer) has no way to recognize it as a trail unless you say so. Three failures account for nearly all the problems: a navigation region with no name, a separator read aloud between every item, and a current page that links to itself.

### Screen readers

- **It is a navigation region with a name** — "Breadcrumb". A page with more than one navigation region must name each one, or they cannot be told apart in a landmark list (the list of labeled page regions a screen reader can jump between).
- **The trail is a list, marked up as one**, so the user hears how many levels there are and where the current page sits among them.
- **The current page is the last item, and it must be marked as current in code** — not just styled to look current, and not shown as a link back to itself.
- **Separators are decorative and must be silent.** A slash or chevron announced between every item turns a four-level trail into eight announcements. If the separator is a text character, hide it from assistive technology. If the component creates it, do not add your own on top.
- **Each link's name is the page it goes to**, and it must make sense when read completely out of context — screen reader users bring up lists of links with no text around them.
- **Never rely on position alone to mark the current page.** "Last in the list" is not a state a screen reader reports.
- **Do not add a hidden copy of the trail or the page title for screen readers.** The last crumb and the page's H1 naming the same page is expected; a third copy is noise.
- **If an icon appears beside a label, it is decorative and silent** — the label is the name.

### Keyboard and non-mouse navigation

- **Every crumb link is a tab stop (a place the Tab key lands) because it has an `href`**, in visual order, from left to right. Do not add a tabindex to force an order.
- **The current page cannot receive focus**, because it is not a link.
- **The whole trail must be reachable by keyboard, and it must not be the only way back.** A user who cannot reach it, or does not, must still be able to get to the parent through the navigation.
- **Nothing in the trail may appear only on hover** — not a crumb, and not a collapsed part of one. Levels revealed on hover cannot be reached by keyboard or by touch.
- **Enter activates a crumb; Space does not.** That is correct browser behavior for a link. If you find yourself adding a Space handler, you have built a button.
- **Do not intercept the modifier keys.** Ctrl, Cmd, Shift, and middle-click must reach the browser, so the user stays in control of where the parent page opens.

## Not your decision

Do not implement, override, or tune any of these — the component owns them:

- `padding`.
- `item-gap`.
- Link text styling, colors, and states, which come from the link component.
- The separator's visual treatment, wherever it comes from.
- The focus ring.

## Load these too

- `recursica-skill-navigation` — what counts as a location, routing and browser history, indicating location with selected state plus headings plus breadcrumbs, semantic list markup, and the prohibition on horizontal scrolling.
- `recursica-skill-buttons-links` — link vs. button semantics, link label copy, and the tooltip requirement for an icon-only control.
- `recursica-skill-system-conventions` — never carry meaning in a single channel, and fix the structure rather than adding a mechanism to cope with it.

### Only if the screen also uses it

- `recursica-skill-link` — real `href`s, labels that name the destination, never disabling a link, and modifier-key behavior.
- `recursica-skill-tabs` — switching between parts of one whole on a single page, which is not a trail.

## Uncovered — ask, do not invent

- **The separator.** No token defines it. The character, whether it is an icon, and its spacing are all unset — `item-gap` is the only spacing property.
- **Long trails.** No collapse, truncation, or overflow behavior exists. Whether a deep trail drops its middle levels, shortens its labels, or wraps has not been answered — and sideways scrolling is not an option.
- **A content axis — Label only, Icon + Label, Icon only, Mixed — and separate styles for read-only and interactive items are shown only on the design-system website, with no token behind any of them.** Do not rely on this without asking.
- **The depth at which a breadcrumb becomes required.** `recursica-skill-navigation` says "where depth warrants it", but gives no number. The maximum nesting depth is listed as uncovered there too.
- **Whether the start of the trail is the application's home, or the section's landing page.**
- **How the trail handles a level above it that has no landing page of its own** — a level that exists in the hierarchy but has no route to link to.

## Pre-flight checklist

- [ ] The structure really is nested, and the trail is not the only way back to the parent.
- [ ] Location is also shown by the nav's selected state and the page's heading hierarchy.
- [ ] The trail follows the hierarchy, not the user's click history, and contains only the levels above the current page.
- [ ] The last item is the current page. It is not a link, and it is marked as current in code.
- [ ] Every other item is a real link with a real `href`, to a page that exists.
- [ ] Each label names its destination with no verb, and matches the heading the user will land on.
- [ ] No crumb points to a modal or a panel.
- [ ] The trail is a named navigation region, and is marked up as a semantic list.
- [ ] Separators are hidden from assistive technology, and no separator is announced between items.
- [ ] You built no crumb that is only an icon, and any decorative icon beside a label is silent.
- [ ] You added no hidden copy of the trail or the page title for screen readers.
- [ ] Every crumb is a tab stop, in visual order, and the current page cannot receive focus.
- [ ] Nothing in the trail depends on hover, and the modifier keys are not intercepted.
- [ ] The trail does not scroll sideways, wrap into a strip, or shrink to fit.
- [ ] You invented no variant, state, content option, or separator token outside the inventory above.
- [ ] You overrode no styling that the component owns.
- [ ] You invented nothing from the uncovered list.
