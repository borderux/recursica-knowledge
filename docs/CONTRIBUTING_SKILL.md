# Contributing Agent Skills

Skills live in category folders under `skills/`:

- `skills/meta/` — skills that govern how the other skills are used (`recursica-skill-design-router`): decision order, which skill owns which decision, rule precedence, and the requirement to ask rather than guess. These contain no design rules of their own.
- `skills/components/` — one skill per UI component (`recursica-skill-button`, `recursica-skill-tabs`, …). These describe a single component's anatomy and when to reach for it.
- `skills/design-rules/` — one skill per design topic (`recursica-skill-forms`, `recursica-skill-navigation`, `recursica-skill-buttons-links`, `recursica-skill-selection-controls`, `recursica-skill-badges-chips`, `recursica-skill-data-visualization`, `recursica-skill-dashboards`). These carry the team's opinions as rules a build agent must follow, and are usually derived from a recorded design interview.
- `skills/psychology/` — the cognitive-science basis behind the design rules (`recursica-skill-working-memory`), with citations to the literature. Design-rules skills state a rule; a psychology skill explains why the number is what it is and where it stops applying. These are the one category where outside sources belong — cite them properly, and be accurate about what the research does and does not support.

Any directory holding a `SKILL.md` is treated as a skill by the build and version-sync scripts, so new category folders work without changing tooling.

To add a new skill to the registry:

1. **Copy the Template Folder**:
   Copy the [template/](../template/) directory to `skills/<category>/recursica-skill-<your-skill-name>`.
2. **Configure metadata**:
   Set `name`, `description`, `license`, and `metadata.author` in the new `SKILL.md` frontmatter. The `name` **must** match the directory name and be prefixed with `recursica-skill-`, and `description` **must** be 1024 characters or fewer — skills over that limit are rejected at install time.
   If the skill also carries a `package.json` (the template includes one), keep those fields in sync there; `package.json` wins whenever [sync-skill-versions.js](../scripts/sync-skill-versions.js) runs.
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

---

## 🔄 Versioning & Changesets

We use **Changesets** to version the repository and each individual skill package.

### How to Create a Version Bump

1. When you make changes to a skill (or root files), create a new changeset by running:
   ```bash
   npx changeset
   ```
2. Follow the interactive CLI prompts:
   - Select which packages (e.g., `recursica-my-new-skill` or the root `@recursica/knowledge`) require a version bump.
   - Choose whether the change is a `patch`, `minor`, or `major` version bump.
   - Write a summary of the change.
3. Commit the generated `.changeset/*.md` file along with your PR.

### How Versions are Applied

When versions are released (by running `npm run version`):

- Changesets will increment the version in the package's `package.json` and generate/append entries to `CHANGELOG.md` in the package's directory.
- An automation script ([sync-skill-versions.js](../scripts/sync-skill-versions.js)) will automatically parse the new `package.json` versions and synchronize them into the YAML frontmatter inside the corresponding `SKILL.md` files.
