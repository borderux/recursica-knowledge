---
name: recursica-skill-layers
description: House rules for Recursica layers, the numbered levels 0 to 3 that set component colors — layer 0 declared once, containment as the only reason to raise a region, the depth budget, and layer properties coming from the theme. Use when nesting containers, building an app shell, or deciding whether a region needs a separate surface. Not for cards — see recursica-skill-card.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Layers

This skill holds the house rules for Recursica layers. A layer (a numbered background level, 0 to 3, that sets the colors of the components on that level) is how Recursica stacks containers. Layer 0 is the page itself. The house rules are opinions, not neutral best practices. Treat each house rule as a constraint.

The house rules assume **complex enterprise web applications** built on a Recursica theme. The theme defines the tokens each layer offers, at `https://forge.recursica.com/theme/layers`. The theme decides how each layer looks. This skill decides only which layer a region sits on.

## The three governing principles

1. **Every element on the page is already on a layer.** Layer 0 is the page. Being on a layer is not a choice. Opening a new layer is the choice. A layer is not an optional box added around content.
2. **A layer is a token scope, not a decoration.** A token scope is the area where one set of tokens (named design values, such as colors or sizes, set by the design system) applies. Declaring a layer makes every component inside the layer pick up the correct colors. Leaving a layer undeclared is not a harmless omission. A missing layer declaration quietly gives the components the wrong palette.
3. **Nest as little as the design needs.** Nearly every region needs only layer 0 or layer 1. A deeper level needs a reason. Nested markup is not a reason.

## Layer 0 on the root element

**The page's root element, the outermost element in the page's markup, carries layer 0. Declare layer 0 on the `html` element or the `body` element, and nowhere else.**

**MUST NOT declare layer 0 a second time.** Layer 0 appears exactly once in the page's markup. Every element not raised to a deeper level is already on layer 0. A second layer 0 declaration on a header, a navigation, a main region or a section adds nothing. A second declaration also shows that the layer system was misunderstood. **A second layer 0 declaration on any element is a defect**, including in applications that declare layer 0 twice today.

**No element inside a deeper layer can go back to layer 0.** Nesting goes down to deeper levels, never back up to shallower levels.

**MUST NOT start an application at layer 1**, and MUST NOT leave the root element undeclared. A page whose root element has no layer has no base palette. Every component on that page then looks up colors from a layer that does not exist.

**Layer 0 is the page's background.** No other element has to paint the background behind a layer.

## Containment, the only reason to leave layer 0

**Layer 0 is the default for every region on the page**, including the header, the navigation and the main content. A region moves to layer 1 only when the region needs to be contained. A contained region is held as a separate surface (a region that holds content, such as a page, panel, or modal), clearly apart from the regions around the contained region.

**Putting the header, the navigation and the main content all on layer 0 is correct** when none of the three regions needs containing. All three regions on layer 0 is not an omission and not a missed opportunity. All three regions on layer 0 is the result of applying the "space first" rule, explained under the four levels below.

**When a region needs containing, an application usually uses one of the following two patterns, not both:**

- **The navigation raised to layer 1, with the main content left on layer 0**, or
- **The main content raised to layer 1, with the navigation left on layer 0.**

**Either pattern is correct, and the choice is one decision for the whole application, not one per screen.** Every page uses the same pattern. See convention 1, "One behavioral mode per system", in `recursica-skill-system-conventions`.

**Do not raise both the navigation and the main content to layer 1.** When every region is contained, no region stands out. The extra level then separates no region from another region.

`recursica-skill-screen-scaffolding` owns the structure of the application shell. The application shell is the header, the rail, the footer and the titles.

## The four levels and nesting depth

**There are exactly four layer levels: 0, 1, 2 and 3.** There is no layer 4.

**Choose how deep to nest from the table below.**

| Level | How often the level is right                                                                             |
| ----- | -------------------------------------------------------------------------------------------------------- |
| **0** | The base. Always present                                                                                 |
| **1** | **Ordinary.** Any region that needs containing, including the navigation or the main content on layer 1  |
| **2** | **Rare.** Needs a stated reason: a container nested inside a layer 1 region that still needs a container |
| **3** | **Almost never.** Treat a need for layer 3 as a sign that the screen's structure is wrong                |

**Space first, always.** Most regions need no separate layer. Show grouping with white space and type hierarchy. See `recursica-skill-screen-scaffolding`, and convention 5, "Group with space, not boxes", in `recursica-skill-system-conventions`.

**Open a new layer when spacing has failed to separate neighboring regions, and the regions still blur into each other.**

**Do not go down a level every time the markup nests one container inside another on screen.** A layer is a surface with a meaning, not a generic wrapper element. The depth limit in the table above exists to prevent one mistake: nesting three layers only because the components happen to sit three levels deep.

**A need for a fifth level means the nesting is too deep.** Change the structure of the screen. See convention 4, "Fix the structure, do not engineer around the symptom", in `recursica-skill-system-conventions`.

## Layer properties from the theme

**MUST NOT set any layer property, on a layer or on any element imitating a layer.** The layer properties are:

- **surface or background color**
- **border size and border color**
- **corner radius**
- **padding**
- **shadow or elevation** (the shadow that makes a surface look raised)

**The theme sets every layer property, and the application reads each layer property from the theme.** The theme author can configure each layer property in Theme Forge (the Recursica tool where themes are written). Every layer property has a token. The agent building the screen reads the layer tokens and never writes the layer tokens.

**Declare a layer to get the layer properties.** A correctly declared layer already has the layer's surface, border, radius and padding. A layer property set by hand means one of two errors: the layer was not declared, or the code overrides the theme.

**Never hardcode a value read from the theme.** A color read in light mode is wrong in dark mode. A radius read today is wrong after the theme changes. Tokens exist to keep each value correct when the mode or the theme changes.

**No element inside a layer may be sized to a bare viewport height, because a layer's padding has an effect outside the layer.** A region set to the full viewport height inside a padded layer comes out taller than the viewport by the layer's padding, at the top and at the bottom. The page then scrolls by exactly the amount of the padding. Subtract the padding by reading the layer's padding token. `recursica-skill-screen-scaffolding` gives the rule and the reason, under application chrome (the header, navigation and footer around the content) and the single scrollbar.

**Never hand-paint a layer.** A fake layer is a background color and a border drawn with style values written into the code. A fake layer does not change when the theme changes. A fake layer does not switch between light and dark. A fake layer gives the components inside no layer scope at all. When a needed layer cannot be declared, report the missing layer as a gap. See `recursica-skill-design-router`.

## Layer tokens

**Every layer offers the same tokens at all four levels.** A region can move safely from one level to another because every level has the same tokens.

The layer tokens come in two groups, `properties_*` and `elements_*`.

**The `properties_*` tokens describe the layer itself:** `surface`, `border-color`, `border-size`, `border-radius` and `padding`. **The `properties_*` tokens are read only**, as the section on layer properties says.

**The `elements_*` tokens describe the elements that sit on the layer:**

| Group           | Tokens                                                                                                                                                                                                         |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Text**        | `text-color`, `text-high-emphasis`, `text-low-emphasis`, `text-alert`, `text-warning`, `text-success`                                                                                                          |
| **Interactive** | `interactive-color`, `interactive-high-emphasis`, `interactive-tone`, `interactive-tone-hover`, `interactive-on-tone`, `interactive-on-tone-hover`, `interactive-default-on-tone`, `interactive-hover-on-tone` |

**High and low emphasis are levels of transparency, not colors.** Each emphasis level is a number multiplied against `text-color`. Do not use a second gray to make text less prominent. Use the low-emphasis token.

**Each layer has separate alert, warning and success colors.** The same red does not appear on every layer. Take each alert, warning or success color from the layer under the element that uses the color. `recursica-skill-system-conventions` still sets which signals carry the meaning. Color alone is never enough.

**No layer has a separate disabled token.** The theme shows a disabled look for interactive elements on each layer, but the disabled color comes from the global state token. Do not look for a `layer_N` disabled color.

## Layer declaration

The page's markup uses two Recursica attributes: the layer attribute, `data-recursica-layer`, and the theme attribute, `data-recursica-theme`.

**Declare a layer with the layer attribute, set to a level from 0 to 3**, alongside the theme attribute, set to `light` or `dark`.

**A layer's scope covers the element that carries the layer attribute, and every element inside that element.** A layer is a scope rather than a style, because every nested element takes colors from the nearest declared layer.

## Component colors on each layer

**Forty-nine component entries have a separate set of colors for each layer**, `layer-0` through `layer-3`, covering background, border, text and icon colors. The 49 entries include the button, the table, the panel, the modal, the card and every form control.

**A layer is not decoration around the content. A layer is an input to every component on the layer.** A component inside an undeclared region, or inside a region declared at the wrong level, is not slightly off. The component reads a palette meant for a different surface.

**Opening a new layer changes the palette of every element inside the new layer.** Check the contents of the new layer, not only the container.

## Layers and cards

**A layer and a card are different mechanisms, and neither one can stand in for the other.**

|                  | **Layer**                              | **Card**                                                                    |
| ---------------- | -------------------------------------- | --------------------------------------------------------------------------- |
| **Kind**         | A surface and token scope              | A component                                                                 |
| **When**         | A region that needs a separate surface | A small, finite set of repeating peer objects, each carrying a graphic      |
| **Plurality**    | A layer is a single region             | **A single card never exists**                                              |
| **Relationship** | Every element is on a layer            | **A card sits on a layer**, and has a separate set of colors for each level |

In the table, plurality (the number of items) means how many layers or cards appear together. A peer is one of a set of repeating objects of the same kind.

**A card is placed on a layer, not instead of a layer.** A card and a layer stack. A card and a layer are not alternatives.

**A region does not become a peer by needing a surface.** A region that needs separating but has no peers gets a layer. A region that needs a container still has to pass the card tests that `recursica-skill-card` sets to become a card.

**NEVER use a layer to divide a page into regions**, in the same way that a card may never divide a page. The ban in `recursica-skill-screen-scaffolding` on dividing regions with containers applies to layers too. Space and headings divide a page.

**Form fields never go inside a card. Form fields may sit on a layer**, because a layer is a surface, not the boundary of an object.

## No meaning in a layer level

**A layer level is not a rank, a status, or a sign of importance.** A layer level says how deeply a surface is nested, and nothing else.

**MUST NOT use a layer level to show hierarchy or state.** Show priority with position, size, type and white space. See `recursica-skill-screen-priority`. Show status with the components made for status, and never with the shade of a container.

## Light and dark themes

**Light and dark are a setting separate from the layer, and the two settings are independent of each other.** Each of the four layers has a full set of tokens in each theme. The layer number does not change when the theme changes.

**A design must not depend on how any two layers happen to differ in the current theme.** Two neighboring levels may share a surface color. Two neighboring levels may also differ in the border rather than the fill. The theme author decides how the levels differ. A separation that matters has to stay visible when the theme changes.

**A theme control is part of the application chrome, not of the page content.** See `recursica-skill-screen-scaffolding`.

## Set by the theme or the component

- **Every value in the layer tokens:** surfaces, borders, radii, padding, shadows, emphasis transparencies, and meaning-based colors. The theme owns every layer token value, and each value is written in Theme Forge.
- **The number of levels.** There are four levels.
- **A component's palette on each layer.** The component works out the palette. Choose only the layer the component sits on.
- **Elevation.** The theme has separate elevation tokens. A layer does not come with a shadow. Do not add a shadow to a layer.

## Out of scope

- **Whether repeating objects belong in cards** — `recursica-skill-card`.
- **How a page is put together, where the application chrome goes, and the maximum content width** — `recursica-skill-screen-scaffolding`.
- **Whether a task belongs in a panel, a modal, or a page** — `recursica-skill-panels-modals`.
- **Which content takes the strongest position on a screen** — `recursica-skill-screen-priority`.
- **Type styles and heading levels** — `recursica-skill-typography-semantics`.
- **Writing a theme.** A theme is written in Theme Forge, not in application code.

## Open questions

- **How the adapter offers a layer.** The layer tokens and the layer attribute are confirmed from the theme. No source confirms whether each adapter (the Recursica component library for one framework, such as Mantine or Angular Material) ships a layer component, offers a setting, or expects the layer attribute directly. `recursica-skill-screen-scaffolding` records the layer component as mentioned but not exported. Confirm before building, and do not hand-build a substitute.
- **Which surfaces sit at which level by default.** No source states the layer of a panel, a modal, a table or a dashboard widget. The available sources state only that each of those components has colors for each layer.
- **Whether a modal or panel opens a new layer scope**, or takes on the layer beneath the modal or panel.
- **Whether KPI tiles sit on layers or in cards.** Still open in `recursica-skill-screen-scaffolding`.
- **What a layer does below the tablet breakpoint** — see `recursica-skill-responsive-behavior`.

## Pre-flight checklist

- [ ] The root element declares layer 0. No application starts at a deeper level, and the root element is not left undeclared.
- [ ] Layer 0 is declared exactly once. No header, navigation, main region or section declares layer 0 again. No element inside a deeper layer goes back to layer 0.
- [ ] Every region on layer 0 stays on layer 0 because the region does not need containing. The header, the navigation and the main content are all on layer 0 when none of the three regions needs containing.
- [ ] Where a region needs containing, either the navigation or the main content is on layer 1, not both.
- [ ] The choice of the navigation or the main content on layer 1 is the same on every page in the application.
- [ ] Only levels 0 to 3 are used. Layer 2 has a stated reason, every use of layer 3 was questioned as a sign of a structural problem, and no region needed a fourth level.
- [ ] Every region was tried with space and type hierarchy first. A layer appears only where regions still blurred together.
- [ ] No layer is opened only because the markup nests.
- [ ] No surface, background, border, radius, padding, shadow, or elevation is set on a layer, or on any element imitating a layer.
- [ ] No theme value is hardcoded in any part of the application. Every theme value comes from a token.
- [ ] No layer is hand-painted with style values written into the code. Any layer that could not be declared is reported as a gap.
- [ ] No separation depends on how two levels happen to differ in the current theme.
- [ ] Less prominent text uses the low-emphasis token, not a second gray.
- [ ] Alert, warning, and success colors come from the layer the element sits on.
- [ ] No layer level stands for rank, status, importance, or any other meaning.
- [ ] No layer divides a page into regions, and no card has been swapped for a layer, or a layer for a card.
- [ ] The contents of every newly opened layer have been checked, not only the container.
- [ ] Open questions were asked about, not decided: how the adapter offers a layer, which surfaces sit at which level by default, whether a modal or panel opens a new layer scope, whether KPI tiles sit on layers or in cards, and what a layer does below the tablet breakpoint.
