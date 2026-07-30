---
name: recursica-skill-button
description: How to use the Recursica button correctly — when an action needs a button and when it is really a link, which styles, sizes, and content configurations exist, hierarchy and how many primaries per surface, label copy, destructive actions, icon-only rules, and the screen-reader and keyboard requirements. Use whenever adding, reviewing, or refactoring a button, a form's submit and cancel pair, a modal footer, a toolbar, or a table row action. Trigger on "button", "CTA", "call to action", "submit button", "primary button", "icon button", "solid", "outline", "ghost", "button size", "screen reader", "tab order", or a request to let the user do something. Do NOT use for moving the user to another location — that is recursica-skill-link. Do NOT use for choosing one value from a small set — recursica-skill-segmented-control. Do NOT use for cross-screen hierarchy, destructive-action policy, or undo — that is recursica-skill-buttons-links.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Button

A button performs an action. It does not take the user anywhere.

## Use it when

- **Activating it changes something** — saves, submits, deletes, applies, opens a modal.
- **The user stays where they are.** The page they are on is the page they end on.
- **A process moves forward or back** — a stepper's Next and Back act on the process, not on a location.

## Do not use it when

| Instead of a button                               | Use                                                               |
| ------------------------------------------------- | ----------------------------------------------------------------- |
| The user ends up somewhere else                   | `recursica-skill-link` — with a real `href`                       |
| Navigating out of a table row to a related object | A link. Links are quieter, which matters at table density         |
| One value is chosen from a small set              | `recursica-skill-segmented-control`                               |
| An on/off state that persists as data             | A switch or a checkbox — see `recursica-skill-selection-controls` |
| The action is one of many in a row that must fit  | Fewer actions, not smaller buttons — see `recursica-skill-tables` |

**A button that navigates is the single most common misuse.** If activating it changes the URL, it is a link, no matter how it should look. When the navigation must look lightweight, use a link's text treatment — never a button.

## What exists

Taken from `recursica_ui-kit.json` → `ui-kit.components.button`. **Do not pass a variant, size, or state that is not listed here.**

| Axis      | Options                            |
| --------- | ---------------------------------- |
| `styles`  | `solid`, `text`, `outline`         |
| `sizes`   | `default`, `small`                 |
| `content` | `icon-label`, `label`, `icon-only` |

**`text` is the style called "Ghost" outside the token inventory.** One thing, two names.

**`icon-label` is one configuration, not two.** A leading icon, a trailing icon, or both are all `icon-label`; the props do not change between them. Do not look for separate leading and trailing variants.

**There is no destructive or danger style.** A destructive action cannot be signalled by color here — the label must carry it, and irreversibility is handled by confirmation. See `recursica-skill-buttons-links`.

**There is no disabled variant on this component** — disabled comes from `globals.states.disabled`.

**Loading is not a separate state; it is a composition of the axes above.** A button in flight is the `disabled` treatment with `icon-only` or `icon-label` content, where the icon may be animated. Nothing new is needed and nothing may be invented: no spinner placed beside the button, no swapped label, no third state.

**There is no success state.** A completed action is confirmed elsewhere — see `recursica-skill-toast`.

**There is no full-width or fluid axis.** Do not stretch a button to its container.

## Rules for using it

**Label with a verb plus its object.** "Save page", not "OK". "Delete invoice", not "Yes". The label must make sense read alone, out of context, because that is how it is announced.

**One primary action per surface.** The house states that the primary action is the `solid` style. Treat `outline` as the secondary and `text` as the quietest. Everything else on the surface is non-primary.

**Actions sit bottom-right** in a form or modal footer, primary last in reading order. Owned by `recursica-skill-buttons-links`.

**An icon-only button always needs a tooltip** — and separately an accessible name. The tooltip serves sighted mouse users; it is not what a screen reader reads unless it is also the name.

**A toggle button's label names the state it has reached**, not the state it would move to — Follow becomes Following once followed.

**A submit in flight is the disabled treatment plus an icon.** `recursica-skill-forms` requires that on submit the button itself becomes a loading, disabled state; this is how that is built. Use `icon-only` or `icon-label`, apply `disabled`, and let the icon animate. Keep the button in the same position and at the same size — a button that resizes or moves as it starts working pulls the target out from under the pointer.

**Never use `small` to make more buttons fit.** Too many actions in a row is a structural problem; see `recursica-skill-system-conventions`.

**Never disable a button as the only explanation.** If it is disabled, the reason must be in text nearby. If the user has no permission at all, do not render it — see `recursica-skill-navigation`.

## Accessibility

The component provides the focus ring and activation semantics. Everything below is yours.

### Screen readers

- **Every button needs an accessible name**, and for `icon-only` you must supply one explicitly — the icon is not announced. A button with no name is announced as just "button".
- **The accessible name should match the visible label.** Where they differ, the visible label must be contained in the name, or a user speaking the label cannot activate it by voice.
- **A row or list action must name its object.** "Delete" repeated down a table is thirteen identical announcements. Either the name carries the object — "Delete invoice 1043" — or the row provides that context programmatically.
- **When a toggle button's label changes, its accessible name changes with it.** A stale name after activation is worse than no name.
- **It must be a real button element**, never a `div` or `span` with a click handler. Only a real button is announced as one, and only a real button responds to Enter and Space for free.
- **Never rely on the icon to carry the meaning.** An icon-only button conveys nothing to a screen reader beyond its name — required by `recursica-skill-system-conventions`.
- **A button in flight must announce that it is busy**, and the animating icon must be silent. The animation is a visual channel only; without the busy state a screen reader user hears nothing and presses again.
- **Keep the accessible name stable while busy**, or make the change meaningful — "Saving" is useful, a name that vanishes is not.

### Keyboard and non-mouse navigation

- **Enter and Space both activate a button.** Do not intercept, remap, or swallow either.
- **The button is a tab stop, and tab order follows visual order.** The primary action must be reachable by keyboard without passing through the entire page.
- **Nothing needed may appear only on hover.** Row actions revealed by hovering are unreachable by keyboard and by touch. If an action exists, it is visible, or it is in a menu that is itself reachable.
- **When the button opens a modal or menu, focus moves into it — and returns to this button when it closes.** Returning focus to the top of the page strands the user.
- **Do not move focus on activation otherwise.** An in-place action leaves focus on the button so the user can act again.
- **Disabling a button while it works will drop focus** — a disabled control leaves the tab order, and the user who just pressed Enter on it is returned to the top of the document. Keep the button focusable while it is in flight, exposing the disabled state without removing it from the tab order, or move focus deliberately to whatever comes next.
- **The animated loading icon must respect a reduced-motion preference.**
- **Never suppress the focus ring**, and never let the hover style double as the focus style.

## Not your decision

Do not implement, override, or tune any of these — the component owns them for every combination of style, size, and content:

- Height, horizontal and vertical padding, `border-size`, `border-radius`.
- Icon size and the icon-to-label gap.
- Type styling, letter case, and text alignment.
- All colors, per style and per layer, including hover, active, focus, and disabled.
- Elevation.

## Load these too

- [`recursica-skill-buttons-links`](../../design-rules/recursica-skill-buttons-links/SKILL.md) — button vs. link semantics, label copy, hierarchy and placement, destructive confirmation, undo, toggles, row and bulk actions, modal triggers.
- [`recursica-skill-forms`](../../design-rules/recursica-skill-forms/SKILL.md) — submit and cancel behavior, save mode, and where the footer sits.
- [`recursica-skill-system-conventions`](../../design-rules/recursica-skill-system-conventions/SKILL.md) — never carry meaning in a single channel; fix the structure rather than shrinking to fit.

## Uncovered — ask, do not invent

- **When `small` is the correct size.** No rule states which surfaces take it.
- **Whether a full-width button is ever allowed**, and if so where. No axis supports it.
- **Which icon marks a button in flight**, and whether the animation is defined anywhere. The composition is settled; the specific icon is not.
- **Split buttons and button groups.** Neither exists in the kit; do not assemble one.

## Pre-flight checklist

- [ ] Nothing that navigates was built as a button.
- [ ] Every label is a verb plus its object and reads correctly alone.
- [ ] Exactly one `solid` button on the surface.
- [ ] Every `icon-only` button has both a tooltip and an accessible name.
- [ ] Every button is a real button element, in the tab order, activated by Enter and Space.
- [ ] No action is revealed only on hover.
- [ ] Row actions name their object or get it from row context.
- [ ] Focus returns to the trigger when a modal or menu it opened closes.
- [ ] A button in flight is the disabled treatment with an animated icon — no spinner beside it, no swapped label, no invented state — and it neither moves nor resizes.
- [ ] A busy button announces that it is busy, keeps a stable name, stays focusable, and respects reduced motion.
- [ ] No variant, size, or state outside the inventory above was passed; no destructive style was invented.
- [ ] No component-owned styling was overridden, and the focus ring is intact.
- [ ] Any disabled button has its reason in text; unpermitted actions are absent, not disabled.
- [ ] Nothing in the uncovered list was invented.
