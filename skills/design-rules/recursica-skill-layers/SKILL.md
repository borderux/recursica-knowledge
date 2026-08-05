---
name: recursica-skill-layers
description: House rules for Recursica layers — the four stacking levels 0 to 3, layer 0 declared exactly once on the root element and never re-declared, containment as the only reason a region leaves layer 0, why the header and nav and main content may all sit on layer 0, raising either the nav or the main content to layer 1 when one of them needs containing, the depth budget that makes 0 and 1 ordinary and 3 almost never right, a layer being a token scope from which every component resolves its colors, and every layer property coming from the Forge theme rather than the build agent. Use when nesting containers, setting up an application shell, or deciding whether a region needs its own surface. Trigger on "layer", "layer-0", "data-recursica-layer", "nested container", "surface", "background", or "does this need its own layer". Do NOT use for whether repeating objects belong in cards — that is recursica-skill-card. Do NOT use for page composition — that is recursica-skill-screen-scaffolding.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Layers

House rules for Recursica's layer system — the mechanism for stacking containers. These are opinions, not neutral best practices — apply them as constraints.

Context these rules assume: **complex enterprise web applications** built on a Recursica theme. The layer contract is defined in the theme, at `https://forge.recursica.com/theme/layers`. **What a layer looks like is the theme's business. Which layer a region sits on is yours** — and that is the only thing this skill decides.

## The three governing principles

1. **Everything is already on a layer.** Layer 0 is the page. Being on a layer is not a choice — **opening a new one is.** An agent that thinks of layers as optional boxes has the model backwards.
2. **A layer is a token scope, not a decoration.** Declaring it is what makes every component inside resolve the correct colors. Failing to declare one is not a neutral omission; it hands components the wrong palette silently.
3. **Nest as little as the design needs.** Layers 0 and 1 do nearly all the work. Reaching for a deeper level is a decision that needs a reason, not a reflex when markup nests.

## Layer 0 is declared once, on the root

**The root element carries layer 0. Declare it on `html` or `body`, and nowhere else.**

**MUST NOT declare layer 0 a second time.** Layer 0 appears exactly once in the document. Everything that has not been raised to a deeper level is already on it, so re-declaring it on a header, a nav, a main region, or a section adds nothing and signals that the model was misunderstood. **A second `layer-0` declaration anywhere is a defect** — including in applications that currently do it.

**One consequence worth stating: you cannot return to layer 0 inside a deeper layer.** Layers go down, never back up.

**MUST NOT start an application at layer 1**, and MUST NOT leave the root undeclared. A page whose root has no layer has no base palette, and every component inside it is resolving colors against nothing.

**Layer 0 is the page canvas.** Nothing else has to paint the background a layer sits against.

## Containment is the only reason to leave layer 0

**Layer 0 is the default for everything on the page** — the header, the navigation, and the main content included. **A region moves to layer 1 only when it needs to be contained**: held as its own surface, visibly distinct from what surrounds it.

**Header, nav, and main content all on layer 0 is correct** when nothing there needs containing. That is not an omission and not a missed opportunity — it is the outcome of applying "space first."

**Where containment is needed, the typical pattern is one of the two, not both:**

- **Navigation raised to layer 1, main content left on layer 0**, or
- **Main content raised to layer 1, navigation left on layer 0.**

**Either direction is correct, and it is one decision per application, not per screen.** Whichever way it goes, every page does it the same way — see convention 1 in `recursica-skill-system-conventions`, one behavioral mode per system.

**Do not raise both the nav and the main content to layer 1.** If everything is contained, nothing is distinguished, and you have spent a level to no effect.

The shell's structure — header, rail, footer, titles — is owned by `recursica-skill-screen-scaffolding`.

## The four levels, and how deep to go

**There are exactly four: 0, 1, 2, 3.** No layer 4 exists.

**The depth budget:**

| Level | How often it is right                                                                             |
| ----- | ------------------------------------------------------------------------------------------------- |
| **0** | The base. Always present                                                                          |
| **1** | **Ordinary.** Any region that genuinely needs containing, including the nav-or-content split      |
| **2** | **Rare.** Needs a stated reason — a container nested inside a layer-1 region that still needs one |
| **3** | **Almost never.** Treat wanting it as evidence the structure is wrong                             |

**Space first, always.** Most regions need no layer of their own. Grouping is expressed with white space and type hierarchy — see `recursica-skill-screen-scaffolding`, and convention 5 in `recursica-skill-system-conventions`: a visible container must be earned.

**Open a new layer when adjacent regions genuinely blur into each other** and spacing has already failed to separate them.

**Do not step down a level for every visual nesting in the markup.** A layer is a semantic surface, not a `div`. Nesting three layers because the components happen to be three levels deep is the failure this budget exists to prevent.

**Wanting a fifth level means the nesting is too deep.** Restructure — see convention 4 in `recursica-skill-system-conventions`, fix the structure rather than engineering around the symptom.

## Every layer property comes from the theme

**MUST NOT set any layer property.** Not on a layer, and not on anything imitating one:

- **surface or background color**
- **border size and border color**
- **corner radius**
- **padding**
- **shadow or elevation**

**All of them are authored in the Forge theme and consumed from it.** They are configurable — by whoever authors the theme, in Forge — and every one of them has a token. **The build agent reads those tokens and never writes them.**

**Declaring the layer is how you get them.** A correctly declared layer already carries its surface, border, radius, and padding. Setting any of them by hand means either the layer was not declared or you are overriding the theme.

**Never hardcode a value read from the theme.** A color read in light mode is wrong in dark mode; a radius read today is wrong after a re-theme. That is the entire point of the token.

**Never hand-paint a layer.** A background color and a border drawn with raw CSS to imitate a layer does not re-theme, does not switch between light and dark, and gives the components inside it no layer scope at all. If the layer you need cannot be declared, that is a gap to raise — see `recursica-skill-design-router`.

## The token contract

**Every layer exposes the same tokens at all four levels**, which is what makes moving a region between levels safe.

**`properties_*` describe the layer itself** — `surface`, `border-color`, `border-size`, `border-radius`, `padding`. **Read only**, per the section above.

**`elements_*` describe what sits on the layer:**

| Group           | Tokens                                                                                                                                                                                                         |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Text**        | `text-color`, `text-high-emphasis`, `text-low-emphasis`, `text-alert`, `text-warning`, `text-success`                                                                                                          |
| **Interactive** | `interactive-color`, `interactive-high-emphasis`, `interactive-tone`, `interactive-tone-hover`, `interactive-on-tone`, `interactive-on-tone-hover`, `interactive-default-on-tone`, `interactive-hover-on-tone` |

**High and low emphasis are opacities, not colors.** They are numeric multipliers applied to `text-color`. Do not reach for a second grey to de-emphasise text — use the low-emphasis token.

**Alert, warning, and success are per-layer.** The same semantic red does not appear on every layer; take it from the layer you are on. Which channels carry the meaning is still governed by `recursica-skill-system-conventions` — color alone is never enough.

**There is no per-layer disabled token.** The theme shows a disabled interactive treatment on each layer, but disabled resolves from the global state token. Do not look for a `layer_N` disabled color.

## How a layer is declared

**The layer is declared in the DOM as `data-recursica-layer`, with a value of 0 to 3**, alongside `data-recursica-theme` carrying `light` or `dark`.

**The scope covers the element carrying the attribute and everything inside it.** That is what makes a layer a scope rather than a style: descendants resolve their colors from the nearest declared layer.

## Every component resolves its colors from its layer

**Forty-nine component entries carry a distinct color set per layer** — `layer-0` through `layer-3` — covering background, border, text, and icon colors. That includes button, table, panel, modal, card, and every form control.

**So the layer is not cosmetic context; it is an input to every component on it.** A component placed inside an undeclared region, or inside a region declared at the wrong level, is not slightly off — it is reading a palette meant for a different surface.

**When you open a new layer, everything inside it changes palette.** Check the contents, not just the container.

## A layer is not a card

**They are different mechanisms, and they are not interchangeable.**

|                  | **Layer**                           | **Card**                                                               |
| ---------------- | ----------------------------------- | ---------------------------------------------------------------------- |
| **What it is**   | A surface and token scope           | A component                                                            |
| **When**         | A region that needs its own surface | A small, finite set of repeating peer objects, each carrying a graphic |
| **Plurality**    | A layer is a single region          | **There is no such thing as a single card**                            |
| **Relationship** | Everything is on a layer            | **A card sits on a layer** and has its own color set for each level    |

**A card is placed on a layer, not instead of one.** The two are stacked, not alternatives.

**Needing a surface is not evidence of peer-hood.** A region that deserves separation but has no peers takes a layer. The card tests in `recursica-skill-card` are not waived by having reached for a container.

**NEVER use a layer to divide a page into regions** any more than a card may be. The prohibition in `recursica-skill-screen-scaffolding` on dividing regions with containers applies to layers too — space and headings divide a page.

**Form fields never go inside a card. They may sit on a layer**, because a layer is a surface rather than an object boundary.

## Layers carry no meaning

**A layer level is not a rank, a status, or an importance signal.** It says how deeply a surface is nested and nothing else.

**MUST NOT encode hierarchy or state in a layer level.** Priority is carried by position, size, typography, and white space — `recursica-skill-screen-priority`. Status is carried by its own components and never by a container's shade.

## Theme is orthogonal

**Light and dark are a separate axis from layer.** Each of the four layers has a full token set in each theme, and the layer index does not change when the theme does.

**A design must not depend on how any two layers happen to differ in the current theme.** Two adjacent levels may share a surface color, or differ in border rather than fill, and that is the theme author's decision. If a separation matters, it has to survive a re-theme.

**The theme control is application chrome**, not page content — `recursica-skill-screen-scaffolding`.

## Not your decision

- **Every value in the layer tokens** — surfaces, borders, radii, padding, shadows, emphasis opacities, semantic colors. All theme-owned, authored in Forge.
- **The number of levels.** Four.
- **A component's per-layer palette.** The component resolves it; you choose the layer it sits on.
- **Elevation.** The theme carries elevation tokens separately; a layer does not imply a shadow, and you do not add one.

## Out of scope

- **Whether repeating objects belong in cards** — `recursica-skill-card`.
- **Page composition, chrome placement, and the max content width** — `recursica-skill-screen-scaffolding`.
- **Whether a task belongs in a panel, a modal, or a page** — `recursica-skill-panels-modals`.
- **What earns the strongest position on a screen** — `recursica-skill-screen-priority`.
- **Type styles and heading levels** — `recursica-skill-typography-semantics`.
- **Authoring a theme.** That is done in Forge, not in application code.

## Uncovered — ask, do not invent

- **How the adapter exposes a layer.** The token contract and the `data-recursica-layer` attribute are confirmed from the theme, but whether the React adapter ships a `Layer` component, a prop, or expects the attribute directly is not. `recursica-skill-screen-scaffolding` records the component as referenced but not exported. **Confirm before building, and do not hand-roll a substitute.**
- **Which surfaces sit at which level by default.** Nothing states the layer of a panel, a modal, a table, or a dashboard widget — only that each has per-layer colors.
- **Whether a modal or panel opens a new layer scope** or inherits the layer beneath it.
- **Whether summary figures sit on layers or in cards.** Still open in `recursica-skill-screen-scaffolding`.
- **What a layer does below the tablet breakpoint** — see `recursica-skill-responsive-behavior`.

## Pre-flight checklist

- [ ] The root element declares layer 0; no application starts at a deeper level and the root is not left undeclared.
- [ ] Layer 0 is declared exactly once. No header, nav, main region, or section re-declares it, and nothing returns to layer 0 inside a deeper layer.
- [ ] Every region left on layer 0 was left there because it did not need containing — including, where that is the case, the header, nav, and main content together.
- [ ] Where containment was needed, one of the nav or the main content was raised to layer 1, not both.
- [ ] That direction is the same on every page in the application.
- [ ] Only levels 0 to 3 are used; layer 2 has a stated reason, layer 3 was treated as a structural warning, and nothing needed a fourth.
- [ ] Every region was tried with space and type hierarchy first; a layer was opened only where regions genuinely blurred.
- [ ] No layer level was opened merely because the markup nested.
- [ ] No surface, background, border, radius, padding, shadow, or elevation was set on a layer or on anything imitating one.
- [ ] No theme value is hardcoded anywhere; every one comes from a token.
- [ ] No layer was hand-painted with raw CSS; a layer that could not be declared was raised as a gap.
- [ ] No separation depends on how two levels happen to differ in the current theme.
- [ ] De-emphasised text uses the low-emphasis token, not a second grey.
- [ ] Alert, warning, and success colors were taken from the layer the element sits on.
- [ ] No layer level encodes rank, status, importance, or any other meaning.
- [ ] No layer divides a page into regions, and no card was replaced by a layer or vice versa.
- [ ] The contents of every newly opened layer were checked, not just the container.
- [ ] Nothing in the uncovered list was invented.
