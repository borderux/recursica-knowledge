---
"@recursica/knowledge": minor
---

## Plain language, layout templates, and clearer house rules

Every skill is rewritten in plain language, the skills gain an undo skill and eight layout templates, five skills are renamed, and the owner settled about 45 rules that two skills stated differently. The library now has 66 skills.

### Breaking: renamed skills

Five skills are renamed so that each name says what the skill is about. Anything that loads a skill by name must use the new name.

- `recursica-skill-defaults` → `recursica-skill-screen-starting-state`
- `recursica-skill-responsive-behavior` → `recursica-skill-responsive-layout`
- `recursica-skill-naming-terminology` → `recursica-skill-names-and-terms`
- `recursica-skill-system-conventions` → `recursica-skill-design-system-conventions`
- `recursica-skill-screen-scaffolding` → `recursica-skill-layouts-and-templates`

### New

- `recursica-skill-undo` holds every undo rule: when an action gets an undo instead of a confirmation, and where the undo goes.
- `recursica-skill-layouts-and-templates` has eight reference layout templates, each as four images: desktop, a tablet held sideways, a tablet held upright, and a phone. The templates are references, not requirements.
- The design router has a "Missing components" section: what to do when the theme has no component a screen needs.
- The knowledge MCP lists each skill's images, and a new `skill_image` tool returns one.

### Writing

- Every sentence in a skill is 20 words or fewer, and the writing check enforces the limit.
- Each rule reads the way it would be explained out loud: an example, then a short list.
- "The theme" is what a designer sets in Theme Forge, and "the code" is what the application installs. "The persona" is anyone using the software, and "the user" is the person the agent works with.

### Rules that changed

- **Layout.** The theme sets the breakpoint widths, the layout grid and the maximum content width, and the skills state no numbers for them. At the tablet breakpoint or wider, sidebars stay. Below it, navigation moves into a hamburger menu, and side columns stack.
- **Saving.** A control outside a form saves right away, and forms keep one save mode. Drafts save when lost work would cost real rework.
- **Messages.** A toast confirms success only when the result is out of view. The button that starts any action shows the loading state, and a loading button is disabled.
- **Undo.** A delete that can be undone gets an undo instead of a confirmation.
- **Badges and chips.** A field that could hold several values shows chips. A value that is only ever single is a badge. A badge never shows an error.
- **Cards and layers.** A layer is a style applied to a container, and a card is a component that sits on a layer. KPI tiles and dashboard items sit in a container with a layer, not in cards.
- **Navigation.** A top bar holds about three or four items that will not grow. Breadcrumbs follow the depth of the application. Every page, panel, modal and tab gets an address whenever possible.
- **Tables.** Only inset tables paginate. Full-size tables load more rows as the persona scrolls. An editable cell is the exception, for a small edit where a mistake costs little.
- **Counts.** 7 ± 2 is a guideline, not a hard limit. Going well past it suggests a different pattern.
- **Explanations.** An explanation never sits on the page. It goes behind a tooltip, a popover or a link to help.
