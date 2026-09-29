---
name: recursica-skill-link
description: How to use the Recursica link correctly — when navigation is a link and when it is really a button, what the component provides, label copy that names the destination, external and download links, new-tab behavior, why a link is never disabled, and the screen-reader and keyboard requirements. Use whenever adding, reviewing, or refactoring anything the user clicks to end up somewhere else — inline links in prose, standalone links, links out of a table row, footer and menu links, breadcrumb trails, or an external reference. Trigger on "link", "hyperlink", "anchor", "href", "navigate to", "inline link", "external link", "open in new tab", "click here", "screen reader", "tab order", or a request to send the user to another page or resource. Do NOT use for actions that change data or state — that is recursica-skill-button. Do NOT use for app-shell structure, routing, or breadcrumbs — that is recursica-skill-navigation.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Link

A link takes the user somewhere. It never changes data.

## Use it when

- **Using it changes the location** — another page, a section of this page, an outside website, or a file to download.
- **The navigation sits inside a sentence** — a source, a definition, or a related object mentioned in text.
- **The navigation stands on its own** — a menu, a footer, or a "view all" beside a heading.
- **Leaving a table row for a related object.** A link is quieter than a button, which is what a dense table needs.

## Do not use it when

| Instead of a link                                | Use                                                          |
| ------------------------------------------------ | ------------------------------------------------------------ |
| Using it changes data or state                   | `recursica-skill-button`                                     |
| The action must simply look lightweight          | A button in the `text` style — not a link                    |
| Opening a modal on the same page                 | A button. A modal is not a location                          |
| The destination is unavailable right now         | Leave the link out, or explain why in text. Never disable it |
| Switching between parts of one whole on one page | `recursica-skill-tabs` — which have their own routes         |

**A link that changes state is the misuse to watch for.** Save, Delete, Close, and Apply are buttons, even when a link would look better.

## What exists

Taken from `recursica_ui-kit.json` → `ui-kit.components.link`.

| Axis     | Options   |
| -------- | --------- |
| `states` | `visited` |

**`visited` is the only state variant.** There is no size axis, no style axis, and no disabled state — the browser and the component own everything else.

**Properties defined here:** `text`, `icon-size`, `icon-text-gap`, and `colors`. An icon may sit before or after the label; both positions are documented outside the token inventory.

**Behavior documented outside the token inventory:** a link that navigates within the product, and an external link, which is marked as leaving the product.

## Rules for using it

**Always render a real `href`.** Not a click handler on text. A real `href` is what gives the user right-click, middle-click, opening in a new tab, copying the link address, and the browser's own preview of where the link goes — and it is what makes the link announce itself as a link.

**The label names the destination, with no verb.** "Billing settings" — not "Go to billing settings", and never "Click here" or "Learn more". What the user does once they arrive is up to them.

**The label must be unique, and make sense on its own.** Screen reader users bring up lists of links out of context; three links reading "View" tell them nothing.

**Never open a new tab automatically**, unless that is clearly the only possible behavior. The user chooses, with their own context menu or a modifier key.

**Mark an external link as external** — a behavior documented outside the token inventory — so the user knows they are leaving before they click. Which icon or wording shows this is not settled; see the uncovered list.

**Never disable a link.** Going to a related object is always possible. If the destination should not exist for this user, do not show the link at all; see `recursica-skill-navigation`.

**Do not use a link as a primary call to action (CTA — the main button or link that prompts the user's next step).** A prominent CTA that navigates is still a link, but its prominence comes from the layout — not from restyling the link to look like a button.

## Accessibility

This component also follows the accessibility baseline in `recursica-skill-system-conventions`. Only what is specific to it is listed here.

The component owns the underline, the color, and the focus ring (the outline that shows which element has keyboard focus). The meaning in the markup is up to you, and a link built from the wrong element fails every kind of assistive technology (tools such as screen readers that help people with disabilities use a computer) at once.

### Screen readers

- **It must be a real anchor (the HTML element for a link) with an `href`.** A `div` or `span` with a click handler is not announced as a link, does not appear in a screen reader's list of links, and cannot be reached by keyboard.
- **The accessible name (the name a screen reader reads out for a control) must name the destination**, and must make sense when read completely out of context. This is why "Click here" is forbidden: in a list of links, it cannot be used.
- **Two links with the same name must go to the same place.** Different destinations that share a label — "View" in every row — must be told apart, either in the name itself or through the row's context.
- **An icon on the link is decorative and must be silent**, unless the icon is the only content — in that case, it must carry the name.
- **If the link opens in a new tab or downloads a file, say so in the name or in text right next to it.** An unannounced switch of context is confusing for a screen reader user, who has no visual sign that the window changed.
- **Never show "external" by color or icon alone** — `recursica-skill-system-conventions` requires a second channel (a way of carrying meaning, such as color, shape, position, or text).

### Keyboard and non-mouse navigation

- **Every link is a tab stop (a place the Tab key lands) because it has an `href`.** Do not remove it from the tab order, and never add a tabindex to force an order.
- **Enter activates a link. Space does not** — that is how browsers work, and it is correct. If you find yourself adding a Space handler, you have built a button.
- **Do not intercept the modifier keys.** Ctrl, Cmd, Shift, and middle-click must reach the browser, so the user stays in control of where the destination opens.
- **A link that appears only on hover cannot be reached** by keyboard or by touch. Links inside text and in rows must stay visible.
- **Focus must be visible on the link itself**, not just implied by the underline. Never hide the focus ring.
- **After navigating, focus belongs at the start of the new content**, not left behind on the old page.

## Not your decision

Do not implement, override, or tune any of these — the component owns them:

- Text styling, including the underline and its behavior on hover.
- `colors` per layer and per state, including `visited`.
- `icon-size` and `icon-text-gap`.
- The focus ring.

## Load these too

- `recursica-skill-buttons-links` — link vs. button semantics, label copy, table row usage, new-tab behavior, modal triggers.
- `recursica-skill-navigation` — routing, browser history, permissions, and where links belong in the app shell.
- `recursica-skill-system-conventions` — never carry meaning in a single channel.

## Uncovered — ask, do not invent

- **Which icon marks an external link**, and whether it is required or optional. `recursica-skill-icon-semantics` owns what icons mean, but names no symbol for this one.
- **Download links** — whether the file type and size are shown, and where.
- **Whether a link may have a size or emphasis style.** No axis exists for either.
- **Links inside a paragraph in a table cell**, where a dense table and running text meet.

## Pre-flight checklist

- [ ] Nothing that changes data or state is built as a link.
- [ ] Every link is a real anchor with a real `href`.
- [ ] Every label names its destination, has no verb, and makes sense out of context.
- [ ] No two links share a name while going to different places.
- [ ] Nothing opens in a new tab automatically, and the modifier keys are not intercepted.
- [ ] External and download links say so, and not by icon or color alone.
- [ ] No link is disabled. Destinations that are unavailable are left out, or explained in text.
- [ ] No link depends on hover to be visible, and the focus ring is intact.
- [ ] Focus lands at the start of the new content after navigating.
- [ ] You passed no variant or state other than `visited`, and overrode no styling that the component owns.
- [ ] You invented nothing from the uncovered list.
