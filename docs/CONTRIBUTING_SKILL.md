# Contributing Agent Skills

Skills live in category folders under `skills/`:

- `skills/meta/` — skills that govern how the other skills are used (`recursica-skill-design-router`): decision order, which skill owns which decision, rule precedence, and the requirement to ask rather than guess. These contain no design rules of their own.
- `skills/components/` — one skill per UI component (`recursica-skill-button`, `recursica-skill-tabs`, …). These describe a single component's anatomy and when to reach for it.
- `skills/design-rules/` — one skill per design topic (`recursica-skill-forms`, `recursica-skill-navigation`, `recursica-skill-buttons-links`, `recursica-skill-selection-controls`, `recursica-skill-badges-chips`, `recursica-skill-data-visualization`, `recursica-skill-dashboards`, `recursica-skill-tables`, `recursica-skill-dates-and-currency`, `recursica-skill-design-system-conventions`). These carry the team's opinions as rules a build agent must follow, and are usually derived from a recorded design interview.
- `skills/psychology/` — the cognitive-science basis behind the design rules (`recursica-skill-working-memory`, `recursica-skill-discoverability`), with citations to the literature. Design-rules skills state a rule; a psychology skill explains why the number is what it is and where it stops applying. These are the one category where outside sources belong — cite them properly, and be accurate about what the research does and does not support.

Any directory holding a `SKILL.md` is treated as a skill by the build and version-sync scripts, so new category folders work without changing tooling.

To add a new skill to the registry:

1. **Copy the Template Folder**:
   Copy the [template/](../template/) directory to `skills/<category>/recursica-skill-<your-skill-name>`.
2. **Configure metadata**:
   Set `name`, `description`, `license`, and `metadata.author` in the new `SKILL.md` frontmatter. The `name` **must** match the directory name and be prefixed with `recursica-skill-`, and `description` **must** be 1024 characters or fewer — skills over that limit are rejected at install time.
   Leave `metadata.version` at the template's `0.1.0`. The release sets every later version.
3. **Register in Marketplace**:
   Add the skill path (e.g., `"./skills/<category>/recursica-skill-<your-skill-name>"`) to the `skills` array inside [.claude-plugin/marketplace.json](../.claude-plugin/marketplace.json).
4. **Run Setup**:
   Run `npm install` at the root of the project.
5. **Local Agent Registration (For Testing)**:
   If you want to register and use the skill within this repository (so that local AI assistants like Antigravity or Claude can load and execute it during development), symlink it into the `.agent/skills/` and `.claude/skills/` directories:
   ```bash
   # Run these commands from the repository root:
   ln -s ../../skills/<category>/recursica-skill-<your-skill-name> .agent/skills/recursica-skill-<your-skill-name>
   ln -s ../../skills/<category>/recursica-skill-<your-skill-name> .claude/skills/recursica-skill-<your-skill-name>
   ```

> [!TIP] > **No need to manually edit SKILL.md metadata**:
> The `name`, `version`, `description`, `license`, and `author` fields in the `SKILL.md` frontmatter are automatically generated and synchronized from `package.json` by our build script. Simply edit your `package.json` file, and the changes will be synced during development and release.

### Designing Trigger Descriptions (Crucial)

The `description` field in `package.json` controls **Progressive Disclosure**. At startup, Claude only loads this description to determine if the skill is relevant. Write it carefully so Claude knows exactly when to load the full skill:

- **Good**: `"Trigger this when the developer asks to design, write, or refactor a UI layout containing forms or text input fields."`
- **Bad**: `"Instructions for form components."` (too vague, won't trigger reliably).

### Writing Quality Skill Instructions

When writing the body of your `SKILL.md` file:

- **Keep it concise**: Try to keep instructions under 500 lines. Reference files in `references/` or `components/` for verbose API specs.
- **Use imperative instructions**: Tell the model exactly what actions to take.
- **Define output formats**: Use explicit Markdown structure templates to guide output formats.
- **Explain the "why"**: Explain the reasoning behind your instructions so the AI understands why a specific pattern is important.
- **Add examples**: Include input/output examples of how the skill operates.
- **Define terms where you use them, with the glossary's words**: The first time a design or accessibility term appears in a skill's prose, put its definition in brackets right after it — "a tab stop (a place the Tab key lands)". If the term is in [`skills/meta/GLOSSARY.md`](../skills/meta/GLOSSARY.md), copy that definition word for word. `npm run skills:glossary:check` fails on any that differ, and so does `npm test`. Do not link to the glossary instead: each skill is served alone, so a definition one link away is one the reader never sees.
- **Copy shared paragraphs exactly**: If your skill needs a paragraph other skills already carry — the label-placement rule, the note on the React prop column — take it from [`skills/meta/SHARED-PASSAGES.md`](../skills/meta/SHARED-PASSAGES.md) word for word. Add your skill's own sentences after it, not inside it.
- **Check before you push**: `npm run skills:check` runs every structural and consistency check on the skills. `npm run skills:review` lists the changes in your edit that tend to move a rule — a dropped "must", a lost number — so you can confirm each one was meant. See `AGENT.md` for what each check holds.

---

## 🔄 Versioning & Changesets

**Changesets** versions the package, `@recursica/knowledge`. A script versions each skill.

### The package

1. When a change should appear in the release notes, run `npx changeset` and choose a `patch`, `minor`, or `major` bump for `@recursica/knowledge`.
2. Write a summary of the change. The summary becomes the release notes.
3. Commit the generated `.changeset/*.md` file with the pull request.

### Each skill

1. After changing a skill, run `npm run skills:versions`. The script compares each changed `SKILL.md` with `main` and writes `.changeset/skill-bumps-<branch>.json`, with a bump and a reason for each skill:
   - **major**: the skill was renamed, a checklist item was removed, or the skill has fewer rule words ("must", "never", "only" and the rest). Each can mean a rule was removed or weakened.
   - **minor**: a checklist item was added, the description changed, a heading or table row changed, or a rule word moved or was added.
   - **patch**: wording only.
2. Read each bump and change any that is wrong. The script judges from signals, and a reworded rule can look like a removed one. Running the script again keeps the edits.
3. Commit the file with the pull request. CI fails when a changed skill has no bump.

Never edit a skill's `version` by hand.

### How versions are applied

When the release runs `npm run version`:

- Changesets bumps `package.json` and adds the summary to `CHANGELOG.md`.
- `scripts/skill-versions.mjs apply` takes the largest bump for each skill across every skill-bumps file, writes the new version into the skill's frontmatter, and deletes the files.
