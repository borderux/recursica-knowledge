---
name: recursica-skill-layers
description: House rules for Recursica layers, the numbered levels 0 to 3 that set component colors — layer 0 declared once, containment as the only reason to raise a region, the depth budget, and layer properties coming from the theme. Use when nesting containers, building an app shell, or deciding whether a region needs its own surface. Not for cards — see recursica-skill-card.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Layers

These are the house rules for Recursica's layer system — the way containers are stacked. A layer is a numbered level that sets which colors the components inside it use; layer 0 is the page itself. These rules are opinions, not neutral best practices — treat them as constraints.

These rules assume **complex enterprise web applications** built on a Recursica theme. The layer contract is defined in the theme, at `https://forge.recursica.com/theme/layers`. What a layer looks like is the theme's business. This skill decides only which layer a region sits on.

## The three governing principles

1. **Everything is already on a layer.** Layer 0 is the page. Being on a layer is not a choice — opening a new one is. Layers are not optional boxes added around content.
2. **A layer is a token scope, not a decoration.** A token is a named design value, such as a color or a spacing size, set by the design system. A token scope is the area in which one set of those values applies. Declaring a layer is what makes every component inside it pick up the correct colors. Leaving one undeclared is not a harmless omission — it silently gives the components the wrong palette.
3. **Nest as little as the design needs.** Layers 0 and 1 do nearly all the work. A deeper level needs a reason, and nested markup is not one.

## Layer 0 is declared once, on the root

**The root element carries layer 0. Declare it on `html` or `body`, and nowhere else.**

**MUST NOT declare layer 0 a second time.** Layer 0 appears exactly once in the document. Everything that has not been raised to a deeper level is already on it. So declaring it again on a header, a nav, a main region, or a section adds nothing, and shows that the idea was misunderstood. **A second `layer-0` declaration anywhere is a defect** — including in applications that do it today.

**Nothing inside a deeper layer can go back to layer 0.** Layers go down, never back up.

**MUST NOT start an application at layer 1**, and MUST NOT leave the root undeclared. A page whose root has no layer has no base palette, and every component inside it is looking up its colors against nothing.

**Layer 0 is the page's canvas.** Nothing else has to paint the background that a layer sits against.

## Containment is the only reason to leave layer 0

**Layer 0 is the default for everything on the page** — including the header, the navigation, and the main content. A region moves to layer 1 only when it needs to be contained: held as its own surface (a region that holds content, such as a page, panel, or modal), clearly separate from what is around it.

**Header, nav, and main content all on layer 0 is correct** when nothing there needs containing. That is not something left out, and not a missed opportunity — it is the result of applying "space first."

**Where containment is needed, the usual pattern is one of these two, not both:**

- **Navigation raised to layer 1, with the main content left on layer 0**, or
- **Main content raised to layer 1, with the navigation left on layer 0.**

**Either direction is correct, and it is one decision for the whole application, not one per screen.** Whichever way it goes, every page does it the same way — see convention 1 in `recursica-skill-system-conventions`, one behavioral mode per system.

**Do not raise both the nav and the main content to layer 1.** If everything is contained, nothing stands out, and the extra level separates nothing.

The structure of the shell — header, rail, footer, titles — is owned by `recursica-skill-screen-scaffolding`.

## The four levels, and how deep to go

**There are exactly four: 0, 1, 2, 3.** There is no layer 4.

**How much depth to use:**

| Level | How often it is right                                                                             |
| ----- | ------------------------------------------------------------------------------------------------- |
| **0** | The base. Always present                                                                          |
| **1** | **Ordinary.** Any region that needs containing, including the nav-or-content split                |
| **2** | **Rare.** Needs a stated reason — a container nested inside a layer-1 region that still needs one |
| **3** | **Almost never.** Treat wanting it as a sign that the structure is wrong                          |

**Space first, always.** Most regions need no layer of their own. Show grouping with white space and type hierarchy — see `recursica-skill-screen-scaffolding`, and convention 5 in `recursica-skill-system-conventions`: group with space, not boxes.

**Open a new layer when neighboring regions still blur into each other after spacing has failed to separate them.**

**Do not go down a level every time the markup nests visually.** A layer is a surface with a meaning, not a `div`. Nesting three layers only because the components happen to be three levels deep is the mistake this limit exists to prevent.

**Wanting a fifth level means the nesting is too deep.** Restructure — see convention 4 in `recursica-skill-system-conventions`: fix the structure instead of working around the symptom.

## Every layer property comes from the theme

**MUST NOT set any layer property.** Not on a layer, and not on anything imitating one:

- **surface or background color**
- **border size and border color**
- **corner radius**
- **padding**
- **shadow or elevation** (the shadow that makes a surface look raised)

**All of them are written in the Forge theme and read from it.** They can be configured — by whoever writes the theme, in Forge — and every one of them has a token. The build agent reads those tokens and never writes them.

**Declare the layer to get them.** A correctly declared layer already carries its surface, border, radius, and padding. Setting any of them by hand means either the layer was not declared, or the code overrides the theme.

**Never hardcode a value read from the theme.** A color read in light mode is wrong in dark mode, and a radius read today is wrong after the theme changes. That is the whole point of the token.

**A layer's padding has an effect outside the layer: nothing inside it may be sized to a bare viewport height**.
A region set to `100vh` inside a padded layer comes out taller than the viewport by that padding, at the top and bottom,
and the page scrolls by exactly that much. Subtract it by reading the padding token — the rule and its reason are in
`recursica-skill-screen-scaffolding`, under application chrome and the single scrollbar.

**Never hand-paint a layer.** A fake layer — a background color and a border drawn with raw CSS — does not change when the theme changes, does not switch between light and dark, and gives the components inside no layer scope at all. When a needed layer cannot be declared, report it as a gap — see `recursica-skill-design-router`.

## The token contract

**Every layer offers the same tokens at all four levels.** That is what makes it safe to move a region from one level to another.

**`properties_*` describe the layer itself** — `surface`, `border-color`, `border-size`, `border-radius`, `padding`. **They are read only**, as the section above says.

**`elements_*` describe what sits on the layer:**

| Group           | Tokens                                                                                                                                                                                                         |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Text**        | `text-color`, `text-high-emphasis`, `text-low-emphasis`, `text-alert`, `text-warning`, `text-success`                                                                                                          |
| **Interactive** | `interactive-color`, `interactive-high-emphasis`, `interactive-tone`, `interactive-tone-hover`, `interactive-on-tone`, `interactive-on-tone-hover`, `interactive-default-on-tone`, `interactive-hover-on-tone` |

**High and low emphasis are levels of transparency, not colors.** They are numbers multiplied against `text-color`. Do not use a second gray to make text less prominent — use the low-emphasis token.

**Alert, warning, and success belong to each layer.** The same red does not appear on every layer. Take it from the layer the element sits on. Which channels carry the meaning is still governed by `recursica-skill-system-conventions` — color alone is never enough.

**There is no disabled token for each layer.** The theme shows a disabled look for interactive elements on each layer, but the disabled color comes from the global state token. Do not look for a `layer_N` disabled color.

## How a layer is declared

**A layer is declared in the page's markup (the DOM) as `data-recursica-layer`, with a value from 0 to 3**, alongside `data-recursica-theme` set to `light` or `dark`.

**The scope covers the element that carries the attribute, and everything inside it.** That is what makes a layer a scope rather than a style: everything nested inside takes its colors from the nearest declared layer.

## Every component resolves its colors from its layer

**Forty-nine component entries have a separate set of colors for each layer** — `layer-0` through `layer-3` — covering background, border, text, and icon colors. That includes the button, table, panel, modal, card, and every form control.

**So the layer is not decoration around the content; it is an input to every component on it.** A component placed inside an undeclared region, or inside a region declared at the wrong level, is not slightly off — it is reading a palette meant for a different surface.

**Opening a new layer changes the palette of everything inside it.** Check the contents, not only the container.

## A layer is not a card

**They are different mechanisms, and one cannot stand in for the other.**

|                  | **Layer**                           | **Card**                                                                 |
| ---------------- | ----------------------------------- | ------------------------------------------------------------------------ |
| **What it is**   | A surface and token scope           | A component                                                              |
| **When**         | A region that needs its own surface | A small, finite set of repeating peer objects, each carrying a graphic   |
| **Plurality**    | A layer is a single region          | **There is no such thing as a single card**                              |
| **Relationship** | Everything is on a layer            | **A card sits on a layer**, and has its own set of colors for each level |

Plurality means how many of something there are. A peer is one of a set of repeating objects of the same kind.

**A card is placed on a layer, not instead of one.** The two stack; they are not alternatives.

**Needing a surface does not make something a peer.** A region that needs separating but has no peers gets a layer. A region that needs a container still has to pass the card tests in `recursica-skill-card` to become a card.

**NEVER use a layer to divide a page into regions**, any more than a card may be used that way. The ban in `recursica-skill-screen-scaffolding` on dividing regions with containers applies to layers too — space and headings divide a page.

**Form fields never go inside a card. They may sit on a layer**, because a layer is a surface, not the boundary of an object.

## Layers carry no meaning

**A layer level is not a rank, a status, or a sign of importance.** It says how deeply a surface is nested, and nothing else.

**MUST NOT use a layer level to show hierarchy or state.** Priority is shown by position, size, type, and white space — `recursica-skill-screen-priority`. Status is shown by its own components, and never by the shade of a container.

## Theme is orthogonal

**Light and dark are a separate setting from the layer** — orthogonal here means independent of each other. Each of the four layers has a full set of tokens in each theme, and the layer number does not change when the theme does.

**A design must not depend on how any two layers happen to differ in the current theme.** Two neighboring levels may share a surface color, or differ in their border rather than their fill — and that is the theme author's decision. A separation that matters has to stay visible when the theme changes.

**The theme control is application chrome** (the header, navigation and footer around the content), not page content — `recursica-skill-screen-scaffolding`.

## Set by the theme or the component

- **Every value in the layer tokens** — surfaces, borders, radii, padding, shadows, emphasis transparencies, and meaning-based colors. All of these belong to the theme and are written in Forge.
- **The number of levels.** Four.
- **A component's palette on each layer.** The component works it out. Choose only the layer it sits on.
- **Elevation.** The theme has separate elevation tokens. A layer does not come with a shadow. Do not add one.

## Out of scope

- **Whether repeating objects belong in cards** — `recursica-skill-card`.
- **How a page is put together, where the chrome goes, and the maximum content width** — `recursica-skill-screen-scaffolding`.
- **Whether a task belongs in a panel, a modal, or a page** — `recursica-skill-panels-modals`.
- **Which content takes the strongest position on a screen** — `recursica-skill-screen-priority`.
- **Type styles and heading levels** — `recursica-skill-typography-semantics`.
- **Writing a theme.** That is done in Forge, not in application code.

## Open questions

- **How the adapter offers a layer.** The token contract and the `data-recursica-layer` attribute are confirmed from the theme. But whether each adapter ships a layer component, a setting, or expects the attribute directly is not. `recursica-skill-screen-scaffolding` records the component as mentioned but not exported. Confirm before building, and do not hand-build a substitute.
- **Which surfaces sit at which level by default.** Nothing states the layer of a panel, a modal, a table, or a dashboard widget — only that each has colors for each layer.
- **Whether a modal or panel opens a new layer scope**, or takes on the layer beneath it.
- **Whether KPI tiles sit on layers or in cards.** Still open in `recursica-skill-screen-scaffolding`.
- **What a layer does below the tablet breakpoint** — see `recursica-skill-responsive-behavior`.

## Pre-flight checklist

- [ ] The root element declares layer 0. No application starts at a deeper level, and the root is not left undeclared.
- [ ] Layer 0 is declared exactly once. No header, nav, main region, or section declares it again, and nothing goes back to layer 0 inside a deeper layer.
- [ ] Every region left on layer 0 stays there because it does not need containing — including, where that is the case, the header, nav, and main content together.
- [ ] Where containment is needed, either the nav or the main content is on layer 1, not both.
- [ ] That direction is the same on every page in the application.
- [ ] Only levels 0 to 3 are used. Layer 2 has a stated reason, every use of layer 3 was questioned as a sign of a structural problem, and nothing needed a fourth level.
- [ ] Every region was tried with space and type hierarchy first. A layer appears only where regions still blurred together.
- [ ] No layer is opened only because the markup nests.
- [ ] No surface, background, border, radius, padding, shadow, or elevation is set on a layer, or on anything imitating one.
- [ ] No theme value is hardcoded anywhere; every one comes from a token.
- [ ] No layer is hand-painted with raw CSS. Any layer that could not be declared is reported as a gap.
- [ ] No separation depends on how two levels happen to differ in the current theme.
- [ ] Less prominent text uses the low-emphasis token, not a second gray.
- [ ] Alert, warning, and success colors come from the layer the element sits on.
- [ ] No layer level stands for rank, status, importance, or any other meaning.
- [ ] No layer divides a page into regions, and no card has been swapped for a layer, or a layer for a card.
- [ ] The contents of every newly opened layer have been checked, not only the container.
- [ ] Open questions were asked about, not decided: how the adapter offers a layer, which surfaces sit at which level by default, whether a modal or panel opens a new layer scope, whether KPI tiles sit on layers or in cards, and what a layer does below the tablet breakpoint.
