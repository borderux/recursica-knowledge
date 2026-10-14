---
"@recursica/knowledge": minor
---

Every skill is rewritten in plain language, with every sentence 20 words or fewer, and a concrete example after each abstract rule.

- New skill: `recursica-skill-undo` holds every undo rule: when an action gets an undo instead of a confirmation, and where the undo goes.
- Renamed skills, so that each name says what the skill is about:
  - `recursica-skill-defaults` is now `recursica-skill-screen-starting-state`. The skill covers what a screen shows when the screen first opens.
  - `recursica-skill-responsive-behavior` is now `recursica-skill-responsive-layout`.
  - `recursica-skill-naming-terminology` is now `recursica-skill-names-and-terms`.
  - `recursica-skill-system-conventions` is now `recursica-skill-design-system-conventions`. The conventions apply across the whole Recursica design system.
  - `recursica-skill-screen-scaffolding` is now `recursica-skill-layouts-and-templates`.
- `recursica-skill-layouts-and-templates` has eight reference layout templates, each as four images: desktop, a tablet held sideways, a tablet held upright, and a phone. The templates are references, not requirements.
- The theme sets the breakpoint widths, the layout grid and the maximum content width, so the skills no longer state numbers for them. At the tablet breakpoint or wider, sidebars stay. Below it, navigation moves into a hamburger menu, and a table stays only if all of its columns fit.
- The design router has a new "Missing components" section: what to do when the theme has no component a screen needs.
- The skills say "the theme" for what a designer sets in Theme Forge, and "the code" for what the application installs.
