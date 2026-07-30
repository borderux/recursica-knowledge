---
name: recursica-skill-breadcrumb
description: How to use the Recursica breadcrumb correctly — when depth warrants a trail, what belongs in it, why the last item is the current page and not a link, that a breadcrumb is supplementary wayfinding and never primary navigation, and the screen-reader and keyboard requirements for a named navigation region, a list, a current page, and silent separators. Use whenever adding, reviewing, or refactoring a breadcrumb trail, a hierarchy path, or the way a deep page states where it is. Trigger on "breadcrumb", "crumb", "trail", "path", "hierarchy", "where am I", "you are here", "back to parent", "separator", "screen reader", "tab order", or a request to show the user's location in a nested structure. Do NOT use for the app shell, sidebars, menus, or tabs — that is recursica-skill-navigation. Do NOT use for an individual crumb's href and label copy — that is recursica-skill-link. Do NOT use for progress through a process — that is recursica-skill-stepper.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Breadcrumb

A breadcrumb states where the current page sits in the hierarchy, and gives a way back up it.

## Use it when

- **The structure is genuinely nested** and the page sits more than one level down. `recursica-skill-navigation` calls for breadcrumbs where depth warrants it.
- **The page must answer "where am I" by itself**, without the navigation being on screen. That is a requirement, and headings and breadcrumbs are what satisfy it.
- **The user traverses several levels or categories** and needs to keep orientation across a deep path.

## Do not use it when

| Instead of a breadcrumb                                | Use                                                                                           |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| The application is only one or two levels deep         | Headings. A clear heading hierarchy already expresses location — `recursica-skill-navigation` |
| It would be the only way back to the parent            | Real navigation — a sidebar or top bar. A breadcrumb is supplementary wayfinding              |
| Location is already unambiguous from heading and nav   | Nothing. A redundant trail is clutter                                                         |
| The user moves through ordered steps in a process      | `recursica-skill-stepper`                                                                     |
| The user switches between parts of one whole on a page | `recursica-skill-tabs` — which carry their own routes                                         |
| The trail would record where the user has been         | The hierarchy. A breadcrumb is structural, not a history log                                  |

**A breadcrumb is never primary navigation.** If removing it would leave a user unable to get out of a section, the navigation is the actual problem — see `recursica-skill-navigation`.

## What exists

Taken from `recursica_ui-kit.json` → `ui-kit.components.breadcrumb`. **Do not pass a variant, state, or content option — there are none.**

| Axis       | Options                                        |
| ---------- | ---------------------------------------------- |
| `variants` | None. The component has no variant axis at all |

**Two properties, and that is the whole component: `padding` and `item-gap`.**

**There is no separator token.** What sits between items — a slash, a chevron, a dot — is not defined in the kit. Do not invent one; see the uncovered list.

**There is no collapse, truncation, or overflow behavior.** How a long trail behaves is undefined. Whatever the answer turns out to be, it is not horizontal scrolling — `recursica-skill-navigation` prohibits that outright.

**There is no current-page state and no content axis.** An interactive item and a read-only item for the current page, plus a content axis of Label only, Icon + Label, Icon only, and Mixed, are documented outside the token inventory. The kit defines none of it. See the uncovered list.

## Rules for using it

**The trail follows the hierarchy, not the user's history.** Two users who arrive at the same page from different directions see the same trail. A breadcrumb shows the platform's structure; it is not a back-stack.

**The last item is the current page, and it is not a link.** Mark it clearly and leave it unlinked — a link to the page you are already on does nothing and is a dead end for anyone who follows it.

**Every other item is a real link with a real `href`** to a page that exists. See `recursica-skill-link`.

**Each label is the destination page's own name, with no verb** — and it should match the heading the user will land on, so arriving confirms the trail rather than contradicting it.

**A breadcrumb is one of three location signals, never the only one.** `recursica-skill-navigation` requires the nav's selected state, a clear heading hierarchy, and breadcrumbs where depth warrants — and states that the first alone is not enough.

**Mark the trail up as a semantic list**, ordered or unordered. All navigation is a list.

**Include ancestors only.** No siblings, no filters, no query or sort state, no modal the user happens to have open.

**Never point a crumb at a modal or a panel.** Those are invoked by a trigger, not navigated to, and get no history entry — `recursica-skill-navigation`.

**Do not build an icon-only crumb.** The kit defines no content axis, and an icon on its own cannot name a destination. Where an icon is genuinely unambiguous — a home icon at the root — it still needs both a tooltip and an accessible name per `recursica-skill-buttons-links`; until the content axis is resolved, use text.

**Never let the trail wrap into a scrolling strip to make it fit.** A trail too long for its space is a depth problem to raise, not a layout problem to absorb — see `recursica-skill-system-conventions`.

## Accessibility

A breadcrumb is a short row of links that assistive technology has no way to recognize as a trail unless you say so. Three failures account for nearly all of them: an unnamed navigation region, a separator read aloud between every item, and a current page that is a link to itself.

### Screen readers

- **It is a navigation region with a name** — "Breadcrumb". A page with more than one navigation region must name each, or they are indistinguishable in a landmark list.
- **The trail is a list, marked up as one**, so the user hears how many levels there are and where the current page sits among them.
- **The current page is the last item and must be marked as current programmatically** — not styled into it, and not rendered as a link back to itself.
- **Separators are decorative and must be silent.** A slash or chevron announced between every item turns a four-level trail into eight announcements. If the separator is a text character, hide it from assistive technology; if the component generates it, do not add your own on top.
- **Each link's name is the page it goes to**, and it must make sense read entirely out of context — screen reader users pull up lists of links with no surrounding text.
- **Never rely on position alone to mark the current page.** "Last in the list" is not a state a screen reader reports.
- **Do not add a hidden copy of the trail or the page title for screen readers.** The last crumb and the page's H1 naming the same page is expected; a third copy is noise.
- **If an icon appears alongside a label, it is decorative and silent** — the label is the name.

### Keyboard and non-mouse navigation

- **Every crumb link is a tab stop by virtue of its `href`**, in visual order, left to right. Do not add a tabindex to force an order.
- **The current page is not focusable**, because it is not a link.
- **The whole trail must be keyboard reachable, and it must not be the only route back.** A user who cannot or does not reach it must still be able to get to the parent from the navigation.
- **Nothing in the trail may appear on hover** — not a crumb, and not a collapsed portion of one. Hover-revealed levels are unreachable by keyboard and by touch.
- **Enter activates a crumb; Space does not.** That is correct browser behavior for a link. If you find yourself adding a Space handler, you have built a button.
- **Do not intercept the modifier keys.** Ctrl, Cmd, Shift, and middle-click must reach the browser so the user keeps control of where the parent opens.
- **Never suppress the focus ring**, and never let a hover underline stand in as the focus state.

## Not your decision

Do not implement, override, or tune any of these — the component owns them:

- `padding`.
- `item-gap`.
- Link text styling, colors, and states, which come from the link component.
- The separator's visual treatment, wherever it comes from.
- The focus ring.

## Load these too

- [`recursica-skill-navigation`](../../design-rules/recursica-skill-navigation/SKILL.md) — what counts as a location, routing and browser history, indicating location with selected state plus headings plus breadcrumbs, semantic list markup, and the prohibition on horizontal scrolling.
- [`recursica-skill-link`](../recursica-skill-link/SKILL.md) — real `href`s, labels that name the destination, never disabling a link, and modifier-key behavior.
- [`recursica-skill-buttons-links`](../../design-rules/recursica-skill-buttons-links/SKILL.md) — link vs. button semantics, link label copy, and the tooltip requirement for an icon-only control.
- [`recursica-skill-tabs`](../recursica-skill-tabs/SKILL.md) — switching between parts of one whole on a single page, which is not a trail.
- [`recursica-skill-system-conventions`](../../design-rules/recursica-skill-system-conventions/SKILL.md) — never carry meaning in a single channel, and fix the structure rather than adding a mechanism to cope with it.

## Uncovered — ask, do not invent

- **The separator.** No token defines it. The character, whether it is an icon, and its spacing are all unset — `item-gap` is the only spacing property.
- **Long trails.** No collapse, truncation, or overflow behavior exists. Whether a deep trail drops its middle levels, shortens labels, or wraps is unanswered — and horizontal scrolling is not an option.
- **A content axis — Label only, Icon + Label, Icon only, Mixed — and read-only versus interactive item treatments are documented outside the token inventory, with no token behind any of them.** Do not rely on this without asking.
- **The depth at which a breadcrumb becomes required.** `recursica-skill-navigation` says "where depth warrants it"; no number is given. Maximum nesting depth is listed as uncovered there too.
- **Whether the root of the trail is the application home or the section's landing page.**
- **How the trail handles an ancestor with no landing page of its own** — a level that exists in the hierarchy but has no route to link to.

## Pre-flight checklist

- [ ] The structure is genuinely nested, and the trail is not the only way back to the parent.
- [ ] Location is also carried by the nav's selected state and the page's heading hierarchy.
- [ ] The trail reflects the hierarchy, not the user's click history, and contains ancestors only.
- [ ] The last item is the current page, unlinked, and marked as current programmatically.
- [ ] Every other item is a real link with a real `href` to a page that exists.
- [ ] Each label names its destination with no verb and matches the heading the user will land on.
- [ ] No crumb points at a modal or a panel.
- [ ] The trail is a named navigation region and is marked up as a semantic list.
- [ ] Separators are hidden from assistive technology; no separator is announced between items.
- [ ] No icon-only crumb was built, and any decorative icon beside a label is silent.
- [ ] No hidden duplicate of the trail or page title was added for screen readers.
- [ ] Every crumb is a tab stop in visual order; the current page is not focusable.
- [ ] Nothing in the trail depends on hover, and modifier keys are not intercepted.
- [ ] The focus ring is intact and is not the hover treatment.
- [ ] The trail does not scroll horizontally, wrap into a strip, or shrink to fit.
- [ ] No variant, state, content option, or separator token outside the inventory above was invented.
- [ ] No component-owned styling was overridden.
- [ ] Nothing in the uncovered list was invented.
