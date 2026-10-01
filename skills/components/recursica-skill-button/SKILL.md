---
name: recursica-skill-button
description: How to use the Recursica button — button versus link, its styles, sizes, and content, how many primaries, labels, destructive actions, icon-only buttons, and accessibility. Use for any button, submit and cancel pair, toolbar, or row action. Not for going somewhere — see recursica-skill-link; hierarchy and undo policy live in recursica-skill-buttons-links.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Button

A button performs an action. It does not take the user anywhere.

## Use it when

- **Using it changes something** — it saves, submits, deletes, applies, or opens a modal.
- **The user stays where they are.** The page they are on is the page they end up on.
- **A process moves forward or back** — a stepper's Next and Back act on the process, not on a location.

## Do not use it when

| Instead of a button                               | Use                                                               |
| ------------------------------------------------- | ----------------------------------------------------------------- |
| The user ends up somewhere else                   | `recursica-skill-link` — with a real `href`                       |
| Navigating out of a table row to a related object | A link. Links are quieter, which matters in a dense table         |
| One value is chosen from a small set              | `recursica-skill-segmented-control`                               |
| An on/off state that is saved as data             | A switch or a checkbox — see `recursica-skill-selection-controls` |
| The action is one of many in a row that must fit  | Fewer actions, not smaller buttons — see `recursica-skill-tables` |

**A button that navigates is the single most common misuse.** If using it changes the URL, it is a link, no matter how it should look. When the navigation must look lightweight, use a link's text style — never a button.

## What exists

Taken from the UI kit (the token file, `recursica_ui-kit.json`, that says which variants and states each component has) → `ui-kit.components.button`. **Do not pass a variant, size, or state that is not listed here.**

**The third column is the React prop that sets each axis.** An axis (a variant property, as Figma calls it — one way a component varies, such as its size) is named in the UI kit. Its name is not a prop, and if you pass it as one, React quietly ignores it. A blank cell means no single prop sets that axis — it is set by CSS state or by separate props, and the rules below say which.

| Axis      | Options                            | React prop |
| --------- | ---------------------------------- | ---------- |
| `styles`  | `solid`, `text`, `outline`         | `variant`  |
| `sizes`   | `default`, `small`                 | `size`     |
| `content` | `icon-label`, `label`, `icon-only` |            |
| `states`  | `disabled`                         |            |

**`text` is the style called "Ghost" outside the UI kit.** One thing, two names.

**`icon-label` is one setup, not two.** A leading icon, a trailing icon, or both are all `icon-label`, and the props do not change between them. Do not look for separate leading and trailing variants.

**There is no destructive or danger style.** A destructive action (one that deletes something or cannot easily be undone) cannot be signaled by color here. The label must carry it, and actions that cannot be undone are handled by confirmation. See `recursica-skill-buttons-links`.

**`disabled` is a state of every style.** The UI kit defines it under `solid`, `text`, and `outline`, and its opacity comes from `globals.states.disabled`. How it is set is in the uncovered list.

**Loading is not a separate state; it is a combination of the axes above.** A button in flight — while its action is still running — is the `disabled` look with `icon-only` or `icon-label` content, where the icon may animate. Nothing new is needed, and nothing may be invented: no spinner placed beside the button, no swapped label, and no third state.

**There is no success state.** A finished action is confirmed somewhere else — see `recursica-skill-toast`.

**There is no full-width or fluid axis.** Do not stretch a button to fill its container.

## Rules for using it

**Label with a verb plus its object.** "Save page", not "OK". "Delete invoice", not "Yes". The label must make sense read alone, out of context, because that is how it is announced.

**One primary action per surface.** The house states that the primary action is the `solid` style. Treat `outline` as the secondary and `text` as the quietest. Everything else on the surface is not primary.

**Actions sit at the bottom right** in a form or modal footer, with the primary last in reading order. Owned by `recursica-skill-buttons-links`.

**An icon-only button always needs a tooltip** — and, separately, an accessible name (the name a screen reader reads out for a control). The tooltip serves sighted mouse users. It is not what a screen reader reads, unless it is also the name.

**A count goes in parentheses after the label, and never replaces it.** `Apply status`, then `Apply status (1)`, then `Apply status (102)`. The label stays fixed; the count is added after it. Never work the number into the wording — no `Apply 102 statuses`, and no label that reads differently for one than for many.

**Below one, show no count at all.** There is no `(0)`. A zero tells the user nothing they cannot already see, and it makes an inactive control look as if it has something in it. The parentheses appear with the first selection, and disappear with the last.

**A toggle button's label names the state it has reached**, not the state it would move to — Follow becomes Following once followed.

**A submit in flight is the disabled look plus an icon.** `recursica-skill-forms` requires that on submit, the button itself becomes a loading, disabled state; this is how that is built. Use `icon-only` or `icon-label`, apply `disabled`, and let the icon animate. Keep the button in the same place and at the same size. A button that resizes or moves as it starts working pulls the target out from under the pointer.

**Never use `small` to make more buttons fit.** Too many actions in a row is a problem with the structure; see `recursica-skill-system-conventions`.

**Never disable a button as the only explanation.** If it is disabled, the reason must be in text nearby. If the user has no permission at all, do not show it — see `recursica-skill-navigation`.

## Accessibility

This component also follows the accessibility baseline in `recursica-skill-system-conventions`. Only what is specific to it is listed here.

The component provides the focus ring (the outline that shows which element has keyboard focus) and the behavior of being activated. Everything below is up to you.

### Screen readers

- **Every button needs an accessible name**, and for `icon-only` you must supply one yourself — the icon is not announced. A button with no name is announced as just "button".
- **The accessible name should match the visible label.** Where they differ, the visible label must be included in the name, or a user who speaks the label cannot activate it by voice.
- **A row or list action must name its object.** "Delete" repeated down a table is thirteen identical announcements. Either the name carries the object — "Delete invoice 1043" — or the row supplies that context in code.
- **When a toggle button's label changes, its accessible name changes with it.** A name that is out of date after activation is worse than no name.
- **The accessible name spells the count out as a phrase; the visible label keeps the number in parentheses.** Visible: `Apply status (102)`. Announced: "Apply status to 102 items." A bare number read after a label — "Apply status 102" — is unclear out loud, because it could be a quantity, an identifier, or part of the name.
- **This is the approved case for the two being different**, and it still follows the rule above, because the visible label is included in the accessible name: someone using voice can still say "Apply status" and be understood.
- **The name updates as the count does**, and with no selection it is simply `Apply status`, with no count in either place. Do not announce every increase while the user is selecting; what matters is that the name is correct when they reach the button.
- **It must be a real button element**, never a `div` or a `span` with a click handler. Only a real button is announced as a button, and only a real button responds to Enter and Space without extra work.
- **Never rely on the icon to carry the meaning.** An icon-only button tells a screen reader (software that reads the screen aloud) nothing beyond its name — as `recursica-skill-system-conventions` requires.
- **A button in flight must announce that it is busy**, and the animating icon must be silent. The animation is only a visual signal. Without the busy state, a screen reader user hears nothing and presses again.
- **Keep the accessible name the same while it is busy**, or make the change meaningful — "Saving" is useful; a name that disappears is not.

### Keyboard and non-mouse navigation

- **Enter and Space both activate a button.** Do not intercept, remap, or swallow either one.
- **The button is a tab stop (a place the Tab key lands), and the tab order follows the visual order.** The primary action must be reachable by keyboard without going through the whole page.
- **Nothing needed may appear only on hover.** Row actions revealed on hover cannot be reached by keyboard or by touch. If an action exists, it is visible, or it is in a menu that can itself be reached.
- **When the button opens a modal or a menu, focus moves into it — and returns to this button when it closes.** Sending focus back to the top of the page strands the user.
- **Otherwise, do not move focus when it is activated.** An action that happens in place leaves focus on the button, so the user can act again.
- **Disabling a button while it works will drop focus.** A disabled control leaves the tab order, and the user who just pressed Enter on it is sent back to the top of the document. Keep the button able to receive focus while it is in flight — show the disabled state without removing it from the tab order — or move focus on purpose to whatever comes next.
- **The animated loading icon must respect a reduced-motion preference** (a setting that asks for less animation).

## Decided elsewhere

Do not implement, override, or tune any of these — the component owns them for every combination of style, size, and content:

- Height, horizontal and vertical padding, `border-size`, `border-radius`.
- Icon size and the icon-to-label gap.
- Type styling, letter case, and text alignment.
- All colors, per style and per layer, including hover, active, focus, and disabled.
- Elevation.

## Load these too

- `recursica-skill-buttons-links` — button vs. link semantics, label copy, hierarchy and placement, destructive confirmation, undo, toggles, row and bulk actions, modal triggers.
- `recursica-skill-forms` — submit and cancel behavior, save mode, and where the footer sits.
- `recursica-skill-system-conventions` — never carry meaning in a single channel; fix the structure rather than shrinking to fit.

## Uncovered — ask, do not invent

- **When `small` is the correct size.** No rule says which surfaces use it.
- **Whether a full-width button is ever allowed**, and if so where. No axis supports it.
- **Which icon marks a button in flight**, and whether the animation is defined anywhere. How it is put together is settled; the specific icon is not.
- **Split buttons and button groups.** Neither exists in the UI kit; do not build one.
- **How the disabled state is set.** The UI kit defines `disabled` under each style. Whether the adapter exposes it as a prop has not been confirmed. Check the component's props, or ask, before relying on it.

## Pre-flight checklist

- [ ] Nothing that navigates is built as a button.
- [ ] Every label is a verb plus its object, and makes sense read alone.
- [ ] Any count sits in parentheses after a label that does not change, and is left out entirely at zero.
- [ ] The accessible name spells the count out as a phrase — "Apply status to 102 items" — while the visible label keeps the number in parentheses.
- [ ] There is exactly one `solid` button on the surface.
- [ ] Every `icon-only` button has both a tooltip and an accessible name.
- [ ] Every button is a real button element, in the tab order, and activated by Enter and Space.
- [ ] No action appears only on hover.
- [ ] Row actions name their object, or get it from the row's context.
- [ ] Focus returns to the trigger when a modal or menu it opened closes.
- [ ] A button in flight is the disabled look with an animated icon — no spinner beside it, no swapped label, no invented state — and it neither moves nor resizes.
- [ ] A busy button announces that it is busy, keeps the same name, can still receive focus, and respects reduced motion.
- [ ] You passed no variant, size, or state outside the inventory above, and invented no destructive style.
- [ ] You overrode no styling that the component owns, and the focus ring is intact.
- [ ] Any disabled button has its reason in text, and actions the user has no permission for are missing, not disabled.
- [ ] You invented nothing from the uncovered list.
