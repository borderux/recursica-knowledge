---
"@recursica/knowledge": minor
---

## v0.9.0

This release rewrites every skill a second time in plain language. It adds an undo skill and eight reference layout templates, and renames five skills. It also settles about 50 house rules that two skills used to state differently. The library now has 66 skills.

### Breaking: renamed skills

Five skills are renamed so that each name says what the skill is about. Anything that loads a skill by name must use the new name. Examples are an agent prompt and a project's own notes.

- `recursica-skill-defaults` → `recursica-skill-screen-starting-state`
- `recursica-skill-responsive-behavior` → `recursica-skill-responsive-layout`
- `recursica-skill-naming-terminology` → `recursica-skill-names-and-terms`
- `recursica-skill-system-conventions` → `recursica-skill-design-system-conventions`
- `recursica-skill-screen-scaffolding` → `recursica-skill-layouts-and-templates`

### New

- **`recursica-skill-undo`** holds every undo rule in one place. The skill says when an action gets an undo instead of a confirmation, and where the undo goes. The rules used to be spread across seven skills.
- **Layout templates.** `recursica-skill-layouts-and-templates` has eight reference layouts, each as four images: desktop, a tablet held sideways, a tablet held upright, and a phone. The templates are references, not requirements, and every region in a template still follows the region's own rules.
- **Missing components.** The design router says what to do when the theme lacks a component. Check other names, use the code's own version, and file a defect on Theme Forge. Never build the missing component.
- **Images from the knowledge MCP.** A served skill lists the skill's images, and a new `skill_image` tool returns one image.

### Writing

- Every sentence in a skill is 20 words or fewer, and the writing check enforces the limit. `node scripts/check-writing.mjs --long <file>` lists each long sentence. Agent instructions are exempt.
- Each rule reads the way the rule would be explained out loud: an example, then a short list.
- Words mean one thing each. "The theme" is what a designer sets in Theme Forge, and "the code" is what the application installs. "The persona" is anyone using the software. "The user" is the person the agent works with, and stands in for the team and any approver.
- The theme sets the breakpoint widths, the layout grid, the maximum content width and the icon set. No skill states numbers for those values.

### House rules settled in this release

**Layout and navigation**

- At the tablet breakpoint or wider, sidebars and side columns stay. Below the tablet breakpoint, navigation moves into a hamburger menu and side columns stack. A table stays only if every column fits.
- The agent confirms with the user which devices, screen sizes and orientations the application supports.
- A top bar holds about three or four items that will not grow. More items, or items expected to grow, get a sidebar.
- Breadcrumbs follow the depth of the application. A shallow application has none, and a top-level page never has one.
- Every page, panel, modal and tab gets an address whenever possible. Opening a panel or a modal adds no history entry. A confirmation gets no address.
- The navigation drawer is not a panel.
- A layer is a style applied to a container, and a card is a component that sits on a layer. KPI tiles and dashboard items sit in a container with a layer, not in cards.
- Each tab may hold the tab's own complete form. One form never spreads across tabs. Switching away from a tab with unsaved changes asks first.

**Saving, messages and undo**

- A control outside a form saves right away. Forms keep one save mode for the whole application. Drafts save when lost work would cost real rework.
- A toast confirms success only when the result is out of view. Different events may stack briefly, and duplicates combine.
- The button that starts any action shows the loading state. A loading button is disabled.
- A delete that can be undone gets an undo instead of a confirmation.

**Controls and content**

- A field that could hold several values shows chips, one type of value per group. A value that is only ever single is a badge. A badge never shows an error.
- Every icon-only button gets a tooltip, including the hamburger button and a chip's remove control.
- A checkbox starts checked only when about 90 percent of personas would choose the option. The option must also have no major later effects.
- A switch belongs in the page's content. Chrome, filter bars and toolbars use a segmented control.
- A field that only exists for one answer is hidden until that answer is picked. A field the persona should know about is disabled until the enabling step.
- Every field error shows below the field and replaces the help text.
- A date or time range is one control when both ends are required. An optional end makes the range two fields.
- A date shows a short month, the day and a four-digit year, in the order of the persona's locale.
- A placeholder shows a format example only when the format is required. A label has at most three words.
- An explanation never sits on the page. The explanation goes behind a tooltip, a popover or a link to help.

**Tables and charts**

- Table cells are not editable, except for a small edit to one cell where a mistake costs little. An editable cell saves right away.
- Only inset tables paginate. A full-size table loads more rows as the persona scrolls. The rows may scroll inside a table fixed in place.
- A chart always comes from a charting library, never from components. The chart's colors come from a palette in the theme.
- 7 ± 2 is a guideline, not a hard limit. Going well past the guideline suggests a different pattern.

### Upgrading

```bash
git pull
npm run agents:install
```

Update any prompt or note that loads a renamed skill by the old name. On a CircleChat host, also run `circlechat/sync-skills.sh`.

**Full changelog:** https://github.com/borderux/recursica-knowledge/compare/@recursica/knowledge@0.8.0...main
