---
name: recursica-skill-breadcrumb
description: Rules for the Recursica breadcrumb — when depth warrants a trail, what goes in the trail, the current page as plain text, and navigation-region accessibility. Use for breadcrumb trails and hierarchy paths. Not for the app shell — see recursica-skill-navigation; not for steps in a process — see recursica-skill-stepper.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Breadcrumb

A breadcrumb shows where the current page sits in the page hierarchy. A breadcrumb is a trail of items. An item names one page in the hierarchy. A breadcrumb also links back up to the pages above the current page.

## When to use a breadcrumb

- The application's pages are nested, and the current page is more than one level down. `recursica-skill-navigation` calls for breadcrumbs where the pages are nested deep enough to need breadcrumbs.
- The page must answer "Where am I?" by itself, without the navigation on screen. Headings and breadcrumbs give that answer.
- The persona moves through several levels or categories, and needs to keep track of the current page's place along a deep path.

## When not to use a breadcrumb

| Situation                                                      | Use instead                                                                                                      |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| The application is only one or two levels deep                 | Headings. A clear heading hierarchy shows the persona's location. See `recursica-skill-navigation`.              |
| The breadcrumb would be the only way back to the parent page   | Real navigation: a sidebar or a top bar. A breadcrumb is an extra aid for finding the way, not the main way.     |
| The heading and the navigation already make the location clear | No breadcrumb. A breadcrumb that repeats a location the persona can already see is clutter.                      |
| The persona moves through ordered steps in a process           | A stepper. See `recursica-skill-stepper`.                                                                        |
| The persona switches between parts of one whole on a page      | Tabs. Each tab has its own route. See `recursica-skill-tabs`.                                                    |
| The breadcrumb would record the pages the persona has visited  | A trail built from the page hierarchy. A breadcrumb shows how the pages are structured, not a history of visits. |

**A breadcrumb is never the primary navigation.** If removing the breadcrumb would leave a persona unable to get out of a section, the problem is in the navigation, not in the breadcrumb. See `recursica-skill-navigation`.

## Variants

**Use only the breadcrumb variants and options that the Recursica MCP server lists for the project.** A designer can add variants and options in Theme Forge, so each project can differ. Get the list with the server's `recursica_get_component_doc` tool, and use the names the code uses. Never invent a variant or an option.

Do not set a variant, a state or a content option that the MCP server does not list for the project.

- **Separator.** A separator is the mark between items, such as a slash, a chevron or a dot. If the project has a separator, use the project's separator. Do not invent a separator. Which separator to use is an open question.
- **Long trails.** No rule says how a long trail collapses, truncates or overflows. However that rule is decided, a long trail never scrolls horizontally. `recursica-skill-navigation` forbids horizontal scrolling outright.
- **Item styles and content variant.** If the project has a content variant, or separate styles for a clickable item and a read-only item for the current page, use the project's version. The content variant is an open question.

## Rules

**Build the trail from the page hierarchy, not from the persona's history.** Two personas who reach the same page by different paths see the same trail. A breadcrumb shows how the application's pages are structured. A breadcrumb is not a list of the pages the persona has visited.

**The last item in the trail is the current page, and the current page is not a link.** Mark the current page clearly. A link to the current page does nothing when clicked, and leaves the persona on the same page.

**Every other item in the trail is a real link with a real `href`, to a page that exists.** See `recursica-skill-link`.

**Label each item with the name of the destination page, with no verb.** The label should match the heading on the destination page. When the label and the heading match, the persona who arrives on the page sees that the trail led to the right page.

**A breadcrumb is one of three signals of the persona's location, never the only signal.** `recursica-skill-navigation` requires the selected item in the navigation, a clear heading hierarchy, and breadcrumbs where the page hierarchy is deep enough to need breadcrumbs. `recursica-skill-navigation` also states that the selected navigation item alone is not enough.

**Include the current page and only the levels above the current page.** Leave out sibling pages, filters, search or sort settings, and any modal the persona has open.

**Never point a breadcrumb item at a modal or a panel.** A modal or a panel opens from a control on the page. A modal or a panel is not a page the persona navigates to, and adds no entry to the browser history. See `recursica-skill-navigation`.

**Never build a breadcrumb item that is only an icon, even when the project has an icon-only option.** An icon alone cannot name the destination page. If the project has a content option for an icon with a label, use text or an icon with a label. Otherwise, use text.

**Never put the trail in a scrolling strip to make the trail fit.** A trail too long for the space means the page hierarchy is too deep. Raise the depth of the page hierarchy as a problem, instead of hiding the depth with layout. See `recursica-skill-system-conventions`.

## Accessibility

The rules below add to the accessibility baseline in `recursica-skill-system-conventions`, including the focus ring, which every Recursica component follows.

A breadcrumb is a short line of links. Assistive technology recognizes a breadcrumb as a trail only when the markup identifies the breadcrumb as a trail. Three mistakes cause nearly all breadcrumb problems: a navigation region with no name, a separator read aloud between every item, and a current page that links to the current page.

### Screen readers

- **Mark the breadcrumb as a navigation region named "Breadcrumb".** A page with more than one navigation region must name each region. Without a name on each region, a persona using a screen reader cannot tell the regions apart in the landmark list (the list of labeled page regions a screen reader can jump between).
- **Mark up the trail as a semantic list, ordered or unordered.** All navigation is marked up as a list. The list markup tells a persona using a screen reader how many levels the trail has and where the current page sits among the levels.
- **The current page is the last item, and the current page must be marked as current in code.** Styling the current page to look current is not enough.
- **Separators are decorative and must be silent.** A slash or a chevron announced between every item turns a four-level trail into eight announcements. If the separator is a text character, hide the separator from assistive technology. If the breadcrumb component supplies the separator, do not add a second separator.
- **Name each link after the page the link goes to.** The link name must make sense when read with no text around the link. A persona using a screen reader can open a list of the page's links, and the list shows no text around each link.
- **Never rely on position alone to mark the current page.** "Last in the list" is not a state a screen reader reports.
- **Do not add a hidden copy of the trail or the page title for screen readers.** The last breadcrumb item and the page's H1 are expected to name the same page. A third copy makes a screen reader read the page name a third time.
- **An icon beside a label is decorative and silent.** The label is the link name.

### Keyboard and non-mouse navigation

- **Every breadcrumb link is a tab stop (a place the Tab key lands), in visual order from left to right.** Each breadcrumb link is a tab stop because the link has an `href`. Do not add a `tabindex` to force an order.
- **The current page cannot receive focus, because the current page is not a link.**
- **The whole trail must be reachable by keyboard, and the trail must not be the only way back.** A persona who cannot reach the trail, or does not use the trail, must still be able to get to the parent page through the navigation.
- **No part of the trail may appear only on hover, including a breadcrumb item or a collapsed part of the trail.** A persona using a keyboard and a persona on a touch device cannot reach levels that appear only on hover.
- **Enter follows a breadcrumb link, and Space does not.** Browsers follow a link on Enter and not on Space. A breadcrumb item that responds to Space is a button, not a link.
- **Do not intercept the modifier keys.** Ctrl, Cmd, Shift and middle-click must reach the browser. The persona then chooses where the parent page opens.

## Styling set by tokens

**Never set or override the breadcrumb's styling.** The theme sets every visual property of the breadcrumb, such as size, spacing, borders, colors and animation. Do not add extra containers or spacers to change the breadcrumb's look. If the design needs a look the theme does not give, raise the gap. See `recursica-skill-design-router`.

The breadcrumb's styling includes the separator's look, wherever the separator comes from, and the focus ring.

## Related skills

- `recursica-skill-navigation` — what counts as a location, routing and browser history, showing location with the selected navigation item plus headings plus breadcrumbs, list markup for navigation, and the ban on horizontal scrolling.
- `recursica-skill-buttons-links` — link versus button, link label wording, and the tooltip an icon-only control needs.
- `recursica-skill-system-conventions` — never showing meaning in only one way, and fixing the structure instead of adding a workaround for a structure problem.

### Only if used on the same screen

- `recursica-skill-link` — real `href` values, labels that name the destination page, never disabling a link, and modifier-key behavior.
- `recursica-skill-tabs` — switching between parts of one whole on a single page, which is not a trail.

## Open questions

- **The separator.** No one has decided which character the separator is, or whether the separator is an icon. If the project has a separator, use the project's separator. Otherwise, ask.
- **Long trails.** No one has decided whether a deep trail drops the middle levels, shortens the labels, or wraps. Horizontal scrolling is not an option.
- **The content variant.** Only the design-system website shows a content variant with Label only, Icon + Label, Icon only and Mixed options. Only the website shows separate styles for read-only items and clickable items. If the project has the content variant or the item styles, use the project's version. Otherwise, do not rely on either one without asking.
- **The depth at which a breadcrumb becomes required.** `recursica-skill-navigation` calls for breadcrumbs "where the depth of the page calls for breadcrumbs", but gives no number. `recursica-skill-navigation` also lists the maximum depth of the page hierarchy as an open question.
- **The start of the trail.** No rule says whether the trail starts at the application's home page or at the section's landing page.
- **A level with no landing page.** No rule says how the trail handles a level above the current page that exists in the hierarchy but has no landing page and no route to link to.

## Pre-flight checklist

- [ ] The application's pages are nested, and the trail is not the only way back to the parent page.
- [ ] The selected navigation item and the page's heading hierarchy also show the location.
- [ ] The trail follows the page hierarchy, not the persona's click history, and holds the current page and only the levels above the current page.
- [ ] The last item is the current page. The current page is not a link, and is marked as current in code.
- [ ] Every other item is a real link with a real `href`, to a page that exists.
- [ ] Each label names the destination page with no verb, and matches the heading on the destination page.
- [ ] No breadcrumb item points to a modal or a panel.
- [ ] The trail is a named navigation region, and is marked up as a semantic list.
- [ ] Separators are hidden from assistive technology, and no separator is announced between items.
- [ ] No breadcrumb item is only an icon, and any decorative icon beside a label is silent.
- [ ] No hidden copy of the trail or the page title is added for screen readers.
- [ ] Every breadcrumb link is a tab stop, in visual order, and the current page cannot receive focus.
- [ ] No part of the trail depends on hover, and the modifier keys are not intercepted.
- [ ] The trail does not scroll horizontally, wrap into a strip, or shrink to fit.
- [ ] Every variant, state and content option is one the Recursica MCP server lists for the project, under the name the code uses, and no separator token is invented.
- [ ] No styling is set or overridden on the breadcrumb, and no container or spacer is added to change the breadcrumb's look.
- [ ] Open questions were asked about, not decided: the separator, long trails, the content variant, the depth at which a breadcrumb becomes required, the start of the trail, and a level with no landing page.
