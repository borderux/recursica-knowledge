# AGENT.md - AI Agent Entry Point

Welcome! This repository holds the central skills and component documentation for the Recursica Design System.

## 📖 Project Overview

For detailed information on what this project is, what it does, and how it is structured, please read **[README.md](README.md)**.

---

## 🧠 Adding or Modifying Agent Skills

If you (the AI assistant) are tasked with creating, editing, or registering custom Claude Agent Skills:

- **Do not invent your own directories or manifests.**
- **Refer to [CONTRIBUTING.md](CONTRIBUTING.md)** for the step-by-step developer guidelines on copying the template, configuring metadata, registering in the marketplace, and using Changesets for versioning.
- **Start with [`recursica-skill-design-router`](skills/meta/recursica-skill-design-router/SKILL.md)** for any screen-level UI work. It sequences the decisions, routes each one to its owning skill, resolves conflicts between rules, and requires asking the user rather than guessing.
- **Skills live in category folders** under [skills/](skills/):
  - [skills/meta/](skills/meta/) — how to use the rest of the family. No design rules of its own.
  - [skills/components/](skills/components/) — one skill per UI component.
  - [skills/design-rules/](skills/design-rules/) — one skill per design topic, carrying the team's house rules for composition. Load these alongside the relevant component skills when building a screen.
  - [skills/psychology/](skills/psychology/) — the cognitive-science basis behind those rules, with citations. Load when a decision turns on how much to put in front of a user, or when a rule needs justifying.
- **Frontmatter**: where a skill has a `package.json`, that file is the source of truth for name, version, description, license, and author, and [sync-skill-versions.js](scripts/sync-skill-versions.js) copies them into `SKILL.md`. Skills without a `package.json` keep those fields in the `SKILL.md` frontmatter directly. The `name` must match the skill's directory name, and `description` must be 1024 characters or fewer.

---

## 🛠️ Adding Component Documentation

If you are asked to add or update documentation for UI components:

- **Refer to [CONTRIBUTING.md](CONTRIBUTING.md)** for component folder creation, required markdown file templates, and registration rules.
- **Component specifications** reside inside the [docs/components/](docs/components/) directory, one folder per component containing a `DOCS.md`.
- Each component skill links its specification through a `DOCS.md` symlink, e.g. `skills/components/recursica-skill-button/DOCS.md -> ../../../docs/components/Button/DOCS.md`. Create that symlink when you add a new component spec.

---
