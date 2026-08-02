# AGENT.md - AI Agent Entry Point

Welcome! This repository holds the central skills and component documentation for the Recursica Design System.

## 🚦 Read this first: what is knowledge and what is not

**This repository contains more than the agent knowledge base.** Only the `SKILL.md` files are guidance for building a UI. Everything else is website content, tooling, or notes for the humans maintaining the repo.

**Knowledge — use these:**

| Path                   | What it is                                                                      |
| ---------------------- | ------------------------------------------------------------------------------- |
| `skills/meta/`         | The design router. **Load it first, before any other Recursica skill.**         |
| `skills/design-rules/` | House rules for composition, recorded from the team. Authoritative.             |
| `skills/psychology/`   | The research basis and limits behind those rules.                               |
| `skills/components/`   | One skill per component: what exists, how to use it, how to make it accessible. |

**Not knowledge — never use these as a source when building:**

| Path                                                          | Why not                                                                                                                                                                                                                        |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `docs/components/*/DOCS.md`                                   | The design-system **website's** published pages. Written for humans browsing a site, partly out of date, and in places contradicting the skills. Everything an agent needs has been distilled into the component's `SKILL.md`. |
| `docs/` otherwise, including `docs/open-questions.md`         | Contribution guides and maintainer records                                                                                                                                                                                     |
| `template/`, `scripts/`, `spec/`, `scratch/`, `n8n/`, `dist/` | Packaging, tooling, and workflow configuration                                                                                                                                                                                 |
| `buzz-agents/`                                                | Versioned definitions of the Buzz agents themselves — system prompts and settings, kept so they can be branched and rebuilt in a new Buzz community. Configuration, not design guidance. See [buzz-agents/README.md](buzz-agents/README.md). |

**Do not read a `DOCS.md` to answer a build question, and do not cite one.** Skill packages in `dist/` deliberately contain the `SKILL.md` and nothing else.

**Load the family, not a single file.** A component skill says what a component is; a design-rules skill says whether it belongs on the screen. One without the other reliably produces something individually correct and collectively wrong.

**When two skills disagree**, `skills/meta/recursica-skill-design-router/SKILL.md` states the precedence. The short version: a design-rules skill beats a component skill on composition; the component skill wins only on which variants and states actually exist.

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
- **Frontmatter must parse as YAML.** An unquoted `description` containing a colon followed by a space breaks the document and the skill fails to install. Use an em dash instead of a colon, or quote the whole value.

### The shape of a component skill

Every skill in `skills/components/` follows one structure, and a new one must match it. Its only job is to help an agent use the component correctly — nothing goes in that does not serve that:

`## Use it when` · `## Do not use it when` (a table naming the alternative) · `## What exists` (the variant and state inventory from the token file) · `## Rules for using it` · `## Accessibility` (with `### Screen readers` and `### Keyboard and non-mouse navigation`) · `## Not your decision` (token-owned properties) · `## Load these too` · `## Uncovered — ask, do not invent` · `## Pre-flight checklist`

Anatomy diagrams, spec imagery, external documentation links, and generic best practices belong to the website, not the skill.

---

## 🛠️ Adding Component Documentation

If you are asked to add or update documentation for UI components:

- **Refer to [CONTRIBUTING.md](CONTRIBUTING.md)** for component folder creation, required markdown file templates, and registration rules.
- **Component specifications** reside inside the [docs/components/](docs/components/) directory, one folder per component containing a `DOCS.md`. **These feed the website, not the agents.**
- A `DOCS.md` has two parts: YAML frontmatter that the website renders (title, description, spec sections and their imagery, anatomy), and a body of exactly three sections — `When to use`, `When to avoid`, `Specifications` — whose `###` headings match the frontmatter's spec section names plus `Anatomy`. The heading bodies stay empty; the site fills them from the frontmatter.
- Each file also retains its pre-2026 body verbatim inside a single HTML comment marked `LEGACY`, so nothing from the earlier site is lost. Leave it in place.
- **Do not symlink a `DOCS.md` into a skill folder.** Skill packages ship the `SKILL.md` alone so that no agent can pick up website copy as guidance.
- When the website and a skill disagree about a component, the skill wins and the discrepancy belongs in [docs/open-questions.md](docs/open-questions.md).

---
