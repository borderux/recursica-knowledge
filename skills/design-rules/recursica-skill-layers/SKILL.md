---
name: recursica-skill-layers
description: House rules for Recursica layers, the numbered levels 0 to 3 that set component colors — layer 0 declared once, containment as the only reason to raise a region, the depth budget, and layer properties coming from the theme. Use when nesting containers, building an app shell, or deciding whether a region needs to be contained. Not for cards — see recursica-skill-card.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Layers

This skill holds the house rules for Recursica layers. A layer (a numbered background level, 0 to 3, that sets the colors of the components on that level) is how Recursica stacks containers. Layer 0 is the page itself. Treat each house rule as a constraint. The house rules are opinions, not neutral best practices.

The house rules assume **complex enterprise web applications** built on a Recursica theme. Each layer offers a set of tokens (named design values, such as colors or sizes, set by the design system). The theme defines the layer tokens, at `https://forge.recursica.com/theme/layers`. The theme decides how each layer looks. This skill decides only which layer a region sits on.

## The three governing principles

1. **Every element on the page is on a layer.** Layer 0 is the page. Being on a layer is not a choice. Opening a new layer is the choice. A layer is not an optional box added around content.
2. **A layer is a token scope, not a decoration.** A token scope is the area where one set of tokens applies. Declaring a layer makes every component inside the layer pick up the correct colors. Leaving a layer undeclared is not a harmless omission. A missing layer declaration quietly gives the components inside the region the wrong palette.
3. **Nest as little as the design needs.** Nearly every region needs only layer 0 or layer 1. A deeper level needs a reason. Nested markup is not a reason.

## Layer 0 on the root element

**Declare layer 0 on the page's root element, the `html` element or the `body` element, and nowhere else.** The root element is the outermost element in the page's markup.

**MUST NOT declare layer 0 a second time.** Layer 0 appears exactly once in the page's markup. Every element that is not raised to a deeper level is already on layer 0. A second layer 0 declaration on a header, a navigation, a main region or a section adds nothing. A second declaration also shows a misunderstanding of how layers work. **A second layer 0 declaration on any element is a defect**, including in applications that declare layer 0 twice today.

**Never move an element inside a deeper layer back to layer 0.** Nesting goes down to deeper levels, never back up to shallower levels.

**MUST NOT start an application at layer 1**, and MUST NOT leave the root element undeclared. A page whose root element has no layer has no base palette. Every component on that page then looks up colors from a layer that does not exist.

**Layer 0 is the page's background.** No other element needs to set the background behind a layer.

## Containment, the only reason to leave layer 0

**Layer 0 is the default for every region on the page**, including the header, the navigation and the main content. Move a region to layer 1 only when the region needs to be contained. A contained region sits on a separate layer, clearly apart from the regions around the contained region.

**When the header, the navigation and the main content need no containing, all three on layer 0 is correct.** Three regions on layer 0 are not an omission and not a missed opportunity. Three regions on layer 0 are the result of the "space first" rule, under "The four levels and nesting depth" below.

**When a region needs containing, use one of the following two patterns, not both:**

- **The navigation raised to layer 1, with the main content left on layer 0**, or
- **The main content raised to layer 1, with the navigation left on layer 0.**

**Either pattern is correct. Choose one pattern for the whole application, not one per screen.** Every page uses the same pattern. See convention 1, "One behavioral mode per system", in `recursica-skill-system-conventions`.

**Do not raise both the navigation and the main content to layer 1.** When every region is contained, no region stands out. The extra level then separates no region from another region.

The application shell is the header, the rail, the footer and the titles. `recursica-skill-screen-scaffolding` sets the structure of the application shell.

## The four levels and nesting depth

**Recursica has exactly four layer levels: 0, 1, 2 and 3.** Layer 4 does not exist.

**Choose how deep to nest from the table below.**

| Level | How often the level is right                                                                             |
| ----- | -------------------------------------------------------------------------------------------------------- |
| **0** | The base. Always present                                                                                 |
| **1** | **Ordinary.** Any region that needs containing, including the navigation or the main content on layer 1  |
| **2** | **Rare.** Needs a stated reason: a container nested inside a layer 1 region that still needs a container |
| **3** | **Almost never.** Treat a need for layer 3 as a sign that the screen's structure is wrong                |

**Use space first, always.** Most regions need no separate layer. Show grouping with white space and type hierarchy. See `recursica-skill-screen-scaffolding`, and convention 5, "Group with space, not boxes", in `recursica-skill-system-conventions`.

**Open a new layer when spacing has failed to separate neighboring regions, and the regions still blur into each other.**

**Do not go down a level every time the markup nests one container inside another on screen.** A layer is a region that holds content and has a meaning, not a generic wrapper element. The depth limit in the table above exists to prevent one mistake. The mistake is nesting three layers only because the components happen to sit three levels deep in the markup.

**If a screen seems to need a fifth level, change the structure of the screen.** A need for a fifth level means the nesting is too deep. See convention 4, "Fix the structure, do not engineer around the symptom", in `recursica-skill-system-conventions`.

## Layer properties from the theme

**MUST NOT set any layer property, on a layer or on any element imitating a layer.** The layer properties are:

- **background color** (the `surface` property)
- **border size and border color**
- **corner radius**
- **padding**
- **shadow or elevation** (the shadow that makes a layer, card, menu, popover, panel or modal look raised)

**The theme sets every layer property, and the application reads each layer property from the theme.** The theme author can configure each layer property in Theme Forge (the Recursica tool where themes are written). Every layer property has a token. The agent building the screen reads the layer tokens and never writes the layer tokens.

**Declare a layer to get the layer properties.** A correctly declared layer already has the layer's background color (the `surface` property), border, radius and padding. A layer property set by hand means one of two errors. Either the layer was not declared, or the code overrides the theme.

**Never hardcode a value read from the theme.** A color read in light mode is wrong in dark mode. A radius read today is wrong after the theme changes. Tokens exist to keep each value correct when the mode or the theme changes.

**Never size an element inside a layer to a viewport height with nothing subtracted.** A layer's padding has an effect outside the layer. Inside a padded layer, a region set to the full viewport height comes out too tall. The region is taller than the viewport by the layer's padding, at the top and at the bottom. The page then scrolls by exactly the amount of the padding. Subtract the padding by reading the layer's padding token. `recursica-skill-screen-scaffolding` gives the rule and the reason, under application chrome (the header, navigation and footer around the content) and the single scrollbar.

**Never fake a layer.** A fake layer is a background color and a border set with style values written into the code. A fake layer does not change when the theme changes. A fake layer does not switch between light and dark. A fake layer gives the components inside the fake layer no layer scope at all. If a needed layer cannot be declared, report the missing layer as a gap. See `recursica-skill-design-router`.

## Layer tokens

**Every layer offers the same tokens at all four levels.** A region can move safely from one level to another because every level has the same tokens.

The layer tokens come in two groups, `properties_*` and `elements_*`.

**The `properties_*` tokens describe the layer itself:** `surface`, `border-color`, `border-size`, `border-radius` and `padding`. **The `properties_*` tokens are read only**, as "Layer properties from the theme" says.

**The `elements_*` tokens describe the elements that sit on the layer:**

| Group           | Tokens                                                                                                                                                                                                         |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Text**        | `text-color`, `text-high-emphasis`, `text-low-emphasis`, `text-alert`, `text-warning`, `text-success`                                                                                                          |
| **Interactive** | `interactive-color`, `interactive-high-emphasis`, `interactive-tone`, `interactive-tone-hover`, `interactive-on-tone`, `interactive-on-tone-hover`, `interactive-default-on-tone`, `interactive-hover-on-tone` |

**Make text less prominent with the low-emphasis token, not with a second gray.** High and low emphasis are levels of transparency, not colors. Each emphasis level is a number multiplied against `text-color`.

**Take each alert, warning or success color from the layer under the element that uses the color.** Each layer has separate alert, warning and success colors. The same red does not appear on every layer. `recursica-skill-system-conventions` still sets which signals show an alert, a warning or a success. Color alone is never enough.

**No layer has a separate disabled token.** The theme shows a disabled look for interactive elements on each layer. The disabled color comes from the global state token. Do not look for a `layer_N` disabled color.

## Layer declaration

The page's markup uses two Recursica attributes: the layer attribute, `data-recursica-layer`, and the theme attribute, `data-recursica-theme`.

**Declare a layer on any container with the layer attribute.** A layer is a style applied to a container, not a component. Never wrap content in a component to make a layer.

**Declare a layer with the layer attribute, set to a level from 0 to 3**, alongside the theme attribute, set to `light` or `dark`.

**A layer's scope covers the element that carries the layer attribute, and every element inside that element.** A layer is a scope rather than a style, because every nested element takes colors from the nearest declared layer.

## Component colors on each layer

**Forty-nine component entries have a separate set of colors for each layer**, `layer-0` through `layer-3`. Each set covers background, border, text and icon colors. The 49 entries include the button, the table, the panel, the modal, the card and every form control.

**A layer sets the colors of every component on the layer.** A component inside an undeclared region, or inside a region declared at the wrong level, is not slightly off. The component takes a palette meant for a different layer.

**Check the contents of a newly opened layer, not only the container.** Opening a new layer changes the palette of every element inside the new layer.

## Layers and cards

**A layer and a card are different, and neither one can stand in for the other.**

|                  | **Layer**                                      | **Card**                                                                    |
| ---------------- | ---------------------------------------------- | --------------------------------------------------------------------------- |
| **Kind**         | A region that holds content, and a token scope | A component                                                                 |
| **When**         | A region that needs containing                 | A small, finite set of repeating peer objects, each with a graphic          |
| **Plurality**    | A layer is a single region                     | **A card never appears alone**                                              |
| **Relationship** | Every element is on a layer                    | **A card sits on a layer**, and has a separate set of colors for each level |

In the table, plurality (the number of items) means how many layers or cards appear together. A peer is one of a set of repeating objects of the same kind.

**Place a card on a layer, not instead of a layer.** A card and a layer stack.

**Needing containment does not make a region one of a set of peers.** Put a region that needs separating but has no peers on a layer. Make a region that needs a container into a card only when the region passes the card tests that `recursica-skill-card` sets.

**NEVER use a layer to divide a page into regions.** A card may never divide a page either. The ban in `recursica-skill-screen-scaffolding` on dividing regions with containers applies to layers too. Divide a page with space and headings.

**Never put form fields inside a card. Form fields may sit on a layer.** A layer is a region that holds content, not the container of one object.

## No meaning in a layer level

**A layer level is not a rank, a status, or a sign of importance.** A layer level says how deeply a region that holds content is nested, and nothing else.

**MUST NOT use a layer level to show hierarchy or state.** Show priority with position, size, type and white space. See `recursica-skill-screen-priority`. Show status with the components made for status, and never with the shade of a container.

## Light and dark themes

**The light or dark theme is a setting separate from the layer.** Each of the four layers has a full set of tokens in each theme. The layer number does not change when the theme changes.

**A design must not depend on how any two layers happen to differ in the current theme.** Two neighboring levels may share a background color. Two neighboring levels may also differ in the border rather than the fill. The theme author decides how the levels differ. A separation that matters has to stay visible when the theme changes.

**Put a theme control in the application chrome, not in the page content.** See `recursica-skill-screen-scaffolding`.

## Set by the theme or the component

- **Every value in the layer tokens:** background colors, borders, radii, padding, shadows, emphasis transparencies, and meaning-based colors. The theme owns every layer token value, and each value is written in Theme Forge.
- **The number of levels.** Recursica has four levels.
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

- **Which regions that hold content sit at which level by default.** No source states the layer of a panel, a modal, a table or a dashboard widget. The available sources state only that each of those components has colors for each layer.
- **Whether a modal or panel opens a new layer scope**, or takes on the layer beneath the modal or panel.
- **Whether KPI tiles sit on layers or in cards.** The question is still open in `recursica-skill-screen-scaffolding`.
- **What a layer does below the tablet breakpoint** — see `recursica-skill-responsive-behavior`.

## Pre-flight checklist

- [ ] The root element declares layer 0. No application starts at a deeper level, and the root element is not left undeclared.
- [ ] Layer 0 is declared exactly once. No header, navigation, main region or section declares layer 0 again. No element inside a deeper layer goes back to layer 0.
- [ ] Every region on layer 0 stays on layer 0 because the region does not need containing. The header, the navigation and the main content are all on layer 0 when none of the three regions needs containing.
- [ ] Where a region needs containing, either the navigation or the main content is on layer 1, not both.
- [ ] The choice of the navigation or the main content on layer 1 is the same on every page in the application.
- [ ] Only levels 0 to 3 are used.
- [ ] Layer 2 has a stated reason.
- [ ] Every use of layer 3 was questioned as a sign of a structural problem.
- [ ] No region needed a fourth level.
- [ ] Every region was tried with space and type hierarchy first. A layer appears only where regions still blurred together.
- [ ] No layer is opened only because the markup nests.
- [ ] No background or background color (the `surface` property), border, radius, padding, shadow, or elevation is set on a layer.
- [ ] None of the same properties is set on any element imitating a layer.
- [ ] No theme value is hardcoded in any part of the application. Every theme value comes from a token.
- [ ] No layer is faked with style values written into the code. Any layer that could not be declared is reported as a gap.
- [ ] No separation depends on how two levels happen to differ in the current theme.
- [ ] Less prominent text uses the low-emphasis token, not a second gray.
- [ ] Alert, warning, and success colors come from the layer the element sits on.
- [ ] No layer level stands for rank, status, importance, or any other meaning.
- [ ] No layer divides a page into regions.
- [ ] No card has been swapped for a layer, and no layer has been swapped for a card.
- [ ] The contents of every newly opened layer have been checked, not only the container.
- [ ] Open questions were asked about, not decided: which regions that hold content sit at which level by default, whether a modal or panel opens a new layer scope, whether KPI tiles sit on layers or in cards, and what a layer does below the tablet breakpoint.
