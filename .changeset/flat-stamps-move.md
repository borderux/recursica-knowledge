---
"@recursica/knowledge": patch
---

## Skill versions

Each skill now has a version that follows the skill's changes. Until now every skill stayed at 0.1.0, because changesets versions only the package.

- **Every skill catches up for v0.9.0.** The five renamed skills move to 1.0.0. The other changed skills move up one minor version, such as 0.1.0 to 0.2.0. The new undo skill keeps 0.1.0.
- **From now on, a script versions each skill.** `npm run skills:versions` compares each changed skill with `main` and records a major, minor or patch bump with a reason. A person checks each bump, and the release writes the new versions.
- **Major** means a rename, a removed checklist item, or fewer rule words. **Minor** means an added checklist item, a changed description, or a changed heading, table or rule word. **Patch** means wording only.
- CI fails when a pull request changes a skill and records no bump.

### Upgrading

Anything that checks a skill's version sees the new numbers after this release. Nothing else changes.
