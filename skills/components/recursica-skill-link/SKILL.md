---
name: recursica-skill-link
description: Rules for the Recursica link — link versus button, labels that name the destination, external and download links, new tabs, never disabled, and link accessibility. Use for any text or control the user clicks to go to a different location. Not for actions that change data — see recursica-skill-button.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Link

A link takes the user to a different location. A link never changes data.

## When to use a link

- **The link goes to a different location.** The new location is another page, a section of the same page, an outside website, or a file to download.
- **The link sits inside a sentence**, as a link to a source, a definition, or a related object the text mentions.
- **The link stands apart from any sentence**, as in a menu, a footer, or a "view all" link beside a heading.
- **The user goes from a table row to a related object.** A link has less visual weight than a button, and a dense table needs less visual weight in each table row.

## When not to use a link

| Situation                                                     | Use instead                                                                                                                                               |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A control changes data or state                               | A button. See `recursica-skill-button`.                                                                                                                   |
| A control that changes data or state needs less visual weight | A button in the least prominent button style, such as `text` in the standard UI kit (the unchanged UI kit in the official Recursica release). Not a link. |
| A control opens a modal on the same page                      | A button. A modal is not a location.                                                                                                                      |
| A link's destination is unavailable right now                 | Leave the link out, or explain in text why the destination is unavailable. Never disable the link.                                                        |
| The user switches between parts of one whole on one page      | Tabs. Tabs have separate routes. See `recursica-skill-tabs`.                                                                                              |

**A link that changes state is the misuse to watch for.** Save, Delete, Close, and Apply are buttons, even when a link would look better.

## Variants

**Use only the link variants and options that the Recursica MCP server lists for the project.** A designer can add variants and options in Theme Forge, so each project can differ. Get the list with the server's `recursica_get_component_doc` tool, and use the names the code uses. Never invent a variant or an option.

The rules below describe each option by role. The names in the standard UI kit are examples only.

- **A visited state.** The standard UI kit calls the visited state `visited`.
- **Disabled state.** Never disable a link, even when the project adds a disabled state in Theme Forge. The user can always go to a related object. See the rules below.
- **The browser and the link component set every other part of the link's look and behavior.** In the standard UI kit, the link component sets the text style, the icon size, the gap between an icon and the link's label, and the colors.
- **An icon may sit before or after the link's label.** Only the design-system website shows the two icon positions.
- **Two link behaviors appear only on the design-system website.** One link goes to a location within the product. The other is an external link, marked as leaving the product.

## Rules

**Always give a link a real `href`, never a click handler on text.** A real `href` lets the user right-click, middle-click, open the link in a new tab, copy the link address, and see the browser's preview of the link's destination. A real `href` also makes the link announce itself as a link.

**Write the label as the name of the destination, with no verb.** Write "Billing settings", not "Go to billing settings". Never write "Click here" or "Learn more". The user decides what to do after arriving at the destination.

**Give each link a unique label that makes sense without the text around the link.** Screen reader users bring up lists of links without the text around each link. Three links that all say "View" tell a screen reader user nothing.

**Never open a new tab automatically**, unless a new tab is clearly the only possible behavior. The user chooses a new tab with the browser's context menu or a modifier key.

**Mark an external link as external.** Only the design-system website shows the external link behavior. The mark tells the user, before clicking, that the link leaves the product. The icon or wording for the mark is not settled. See the open questions.

**Never disable a link.** The user can always go to a related object. If the destination should not exist for the current user, do not show the link at all. See `recursica-skill-navigation`.

**Do not use a link as a primary call to action (CTA, the main button or link that prompts the user's next step).** A prominent CTA that goes to a new location is still a link. The CTA's prominence comes from the layout, not from restyling the link to look like a button.

## Accessibility

The rules below add to the accessibility baseline in `recursica-skill-system-conventions`, which every Recursica component follows.

Every Recursica link already shows the underline, the color, and the focus ring. The app's code writes the HTML markup for each link. A link built from the wrong HTML element fails every kind of assistive technology at once.

### Screen readers

- **Every link must be a real anchor (the HTML element for a link) with an `href`.** A `div` or `span` with a click handler is not announced as a link, does not appear in a screen reader's list of links, and cannot be reached by keyboard.
- **The accessible name (the name a screen reader reads out for a control) must name the destination**, and must make sense when read completely out of context. "Click here" is forbidden for that reason. In a list of links, a screen reader user cannot use a link named "Click here".
- **Two links with the same name must go to the same destination.** Links to different destinations that share a label, such as "View" in every table row, must be told apart in the accessible name or through the row's context.
- **An icon on a link is decorative and must be silent**, unless the icon is the link's only content. An icon that is the link's only content must have the accessible name.
- **If a link opens in a new tab or downloads a file, say so in the accessible name or in text right next to the link.** A new tab or a download that nobody announces confuses a screen reader user. A screen reader user has no visual sign that the window changed.
- **Never mark an external link by color or icon alone.** `recursica-skill-system-conventions` requires a second channel (color, shape, position or text, each a separate signal).

### Keyboard and non-mouse navigation

- **Every link is a tab stop (a place the Tab key lands) because every link has an `href`.** Do not remove a link from the tab order. Never add a tabindex to force an order.
- **Enter activates a link. Space does not.** Browsers activate a link with Enter only, and the browser behavior is correct. A link that needs a Space handler is a button.
- **Do not intercept the modifier keys.** Ctrl, Cmd, Shift, and middle-click must reach the browser. The user then decides where the destination opens.
- **A link that appears only on hover cannot be reached** by keyboard or by touch. Links inside text and in rows, such as table rows, must stay visible.
- **Focus must be visible on the link**, not only implied by the underline. Never hide the focus ring.
- **After navigation, focus belongs at the start of the new content**, not on the old page.

## Styling set by tokens

**Do not set or override the link properties below.** The link component sets each property.

- Text styling (`text`), including the underline and the underline's behavior on hover.
- `colors` per layer (a numbered background level, 0 to 3, that sets the colors of the components on that level) and per state, including `visited`.
- `icon-size` and `icon-text-gap`.
- The focus ring.

## Related skills

- `recursica-skill-buttons-links` — link versus button, label wording, links in table rows, opening a link in a new tab, and buttons that open a modal.
- `recursica-skill-navigation` — routes, browser history, permissions, and where links go in the app shell.
- `recursica-skill-system-conventions` — never show a meaning in only one way.

## Open questions

- **The icon for an external link.** No rule says which icon marks an external link, or whether the icon is required or optional. `recursica-skill-icon-semantics` sets what icons mean, but names no icon for an external link.
- **Download links.** No rule says whether a download link shows the file type and size, or where.
- **A size or emphasis style for links.** No rule says whether a link may have a size variant or an emphasis style. Ask about a size variant only when the project has no size variant. Ask about an emphasis style only when the project has no emphasis style.
- **Links inside a paragraph in a table cell.** No rule covers a link in running text inside a dense table.

## Pre-flight checklist

- [ ] No action that changes data or state is built as a link.
- [ ] Every link is a real anchor with a real `href`.
- [ ] Every link label names the destination, has no verb, and makes sense out of context.
- [ ] No two links share a name while going to different destinations.
- [ ] No new tab opens automatically, and the modifier keys are not intercepted.
- [ ] Every external link and every download link says so, and not by icon or color alone.
- [ ] No link is disabled. Links to unavailable destinations are left out, or the text explains why the destination is unavailable.
- [ ] No link appears only on hover, and the focus ring is intact.
- [ ] After navigation, focus lands at the start of the new content.
- [ ] Every variant and state is one the Recursica MCP server lists for the project, under the name the code uses, and no variant or option is invented.
- [ ] The styling the link component sets comes from the link component.
- [ ] Open questions were asked about, not decided: the icon for an external link, download links, a size or emphasis style for links, and links inside a paragraph in a table cell.
