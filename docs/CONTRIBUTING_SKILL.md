# Contributing Agent Skills

To add a new skill to the registry:

1. **Copy the Template Folder**:
   Copy the [template/](../template/) directory to `skills/recursica-<your-skill-name>`.
2. **Configure package.json**:
   Update the following fields in `skills/recursica-<your-skill-name>/package.json` to customize your skill's metadata:
   - `name`: The kebab-case name of your skill, which **must** be prefixed with `recursica-` (e.g., `recursica-my-new-skill`).
   - `description`: The trigger description that determines when the skill is loaded.
   - `author`: The author name or organization (e.g., `hi@borderux.com`).
   - `license`: The license identifier (e.g., `MIT` or `See LICENSE.txt`).
3. **Register in Marketplace**:
   Add the skill path (e.g., `"./skills/recursica-<your-skill-name>"`) to the `skills` array inside [.claude-plugin/marketplace.json](../.claude-plugin/marketplace.json).
4. **Run Setup**:
   Run `npm install` at the root of the project to register the new skill as an npm workspace.
5. **Local Agent Registration (For Testing)**:
   If you want to register and use the skill within this repository (so that local AI assistants like Antigravity or Claude can load and execute it during development), symlink it into the `.agent/skills/` and `.claude/skills/` directories:
   ```bash
   # Run these commands from the repository root:
   ln -s ../../skills/recursica-<your-skill-name> .agent/skills/recursica-<your-skill-name>
   ln -s ../../skills/recursica-<your-skill-name> .claude/skills/recursica-<your-skill-name>
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
