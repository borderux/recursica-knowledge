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

- **Activating it changes the location** — another page, a section of this page, an external site, or a downloadable resource.
- **The navigation sits inside prose** — a source, a definition, a related object mentioned in a sentence.
- **The navigation stands on its own** — a menu, a footer, a "view all" beside a heading.
- **Leaving a table row for a related object.** A link is quieter than a button, which is what table density needs.

## Do not use it when

| Instead of a link                                | Use                                                   |
| ------------------------------------------------ | ----------------------------------------------------- |
| Activating it changes data or state              | `recursica-skill-button`                              |
| The action must simply look lightweight          | A button in the `text` style — not a link             |
| Opening a modal on the same page                 | A button. A modal is not a location                   |
| The destination is currently unavailable         | Omit the link, or state why in text. Never disable it |
| Switching between parts of one whole on one page | `recursica-skill-tabs` — which carry their own routes |

**A link that mutates state is the misuse to watch for.** Save, Delete, Close, and Apply are buttons even when a link would look better.

## What exists

Taken from `recursica_ui-kit.json` → `ui-kit.components.link`.

| Axis     | Options   |
| -------- | --------- |
| `states` | `visited` |

**`visited` is the only state variant.** There is no size axis, no style axis, and no disabled state — the browser and the component own the rest.

**Properties defined here:** `text`, `icon-size`, `icon-text-gap`, and `colors`. An icon may sit before or after the label; both positions are documented outside the token inventory.

**Behavior documented outside the token inventory:** a link that navigates within the product, and an external link, which is marked as leaving the product.

## Rules for using it

**Always render a real `href`.** Not a click handler on text. A real `href` is what gives the user right-click, middle-click, open in a new tab, copy link address, and the browser's own status preview — and it is what makes the link announce as a link.

**The label names the destination, with no verb.** "Billing settings", not "Go to billing settings" and never "Click here" or "Learn more". What the user does once they arrive is their business.

**The label must be unique and self-sufficient.** Screen reader users list links out of context; three links reading "View" tell them nothing.

**Never open a new tab automatically** unless it is unmistakably the only possible behavior. The user chooses, via their own context menu or modifier key.

**Mark an external link as external** — a behavior documented outside the token inventory — so the user knows they are leaving before they commit. Which icon or wording carries the marking is not settled; see the uncovered list.

**Never disable a link.** Navigation to a related object is always available. If the destination should not exist for this user, do not render it; see `recursica-skill-navigation`.

**Do not use a link as a primary call to action.** A prominent CTA that navigates is still a link, but the prominence belongs to layout, not to restyling the link into a button.

## Accessibility

The component owns the underline, color, and focus ring. The semantics are yours, and a link built out of the wrong element fails every assistive technology at once.

### Screen readers

- **It must be a real anchor with an `href`.** A `div` or `span` with a click handler is not announced as a link, does not appear in a screen reader's link list, and is not reachable by keyboard.
- **The accessible name must name the destination** and must make sense read entirely out of context. This is the reason "Click here" is prohibited: in a list of links it is unusable.
- **Two links with the same name must go to the same place.** Different destinations sharing a label — "View" in every row — must be disambiguated, either in the name itself or by the row context.
- **An icon on the link is decorative and must be silent**, unless the icon is the only content, in which case it must carry the name.
- **If the link opens in a new tab or downloads a file, say so in the name or adjacent text.** An unannounced context switch is disorienting for a screen reader user, who has no visual cue that the window changed.
- **Never signal "external" by color or icon alone** — `recursica-skill-system-conventions` requires a second channel.

### Keyboard and non-mouse navigation

- **Every link is a tab stop by virtue of having an `href`.** Do not remove it from the tab order, and never add a tabindex to force an order.
- **Enter activates a link. Space does not** — that is browser behavior, and correct. If you find yourself adding a Space handler, you have built a button.
- **Do not intercept the modifier keys.** Ctrl, Cmd, Shift, and middle-click must reach the browser so the user keeps control of where the destination opens.
- **A link revealed only on hover is unreachable** by keyboard and by touch. Inline and row links must be persistently visible.
- **Focus must be visible on the link itself**, not implied by the underline. Never suppress the focus ring.
- **After navigation, focus belongs at the start of the new content**, not left behind on the old page.

## Not your decision

Do not implement, override, or tune any of these — the component owns them:

- Text styling, including the underline and its behavior on hover.
- `colors` per layer and per state, including `visited`.
- `icon-size` and `icon-text-gap`.
- The focus ring.

## Load these too

- [`recursica-skill-buttons-links`](../../design-rules/recursica-skill-buttons-links/SKILL.md) — link vs. button semantics, label copy, table row usage, new-tab behavior, modal triggers.
- [`recursica-skill-navigation`](../../design-rules/recursica-skill-navigation/SKILL.md) — routing, browser history, permissions, and where links belong in the app shell.
- [`recursica-skill-system-conventions`](../../design-rules/recursica-skill-system-conventions/SKILL.md) — never carry meaning in a single channel.

## Uncovered — ask, do not invent

- **Which icon marks an external link**, and whether it is required or optional. Icon semantics have no owning skill.
- **Download links** — whether file type and size are shown, and where.
- **Whether a link may carry a size or emphasis treatment.** No axis exists for either.
- **Links inside a paragraph of a table cell**, where density and prose collide.

## Pre-flight checklist

- [ ] Nothing that changes data or state was built as a link.
- [ ] Every link is a real anchor with a real `href`.
- [ ] Every label names its destination, carries no verb, and reads correctly out of context.
- [ ] No two links share a name while going to different places.
- [ ] Nothing opens in a new tab automatically; modifier keys are not intercepted.
- [ ] External and download links announce that fact, not by icon or color alone.
- [ ] No link is disabled; unavailable destinations are absent or explained in text.
- [ ] No link depends on hover to be visible; the focus ring is intact.
- [ ] Focus lands at the start of the new content after navigation.
- [ ] No variant or state outside `visited` was passed, and no component-owned styling was overridden.
- [ ] Nothing in the uncovered list was invented.
