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

| Path                                                          | Why not                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/components/*/DOCS.md`                                   | The design-system **website's** published pages. Written for humans browsing a site, partly out of date, and in places contradicting the skills. Everything an agent needs has been distilled into the component's `SKILL.md`.                                                                                                                                                                                                                                                                                                                                   |
| `docs/` otherwise, including `docs/open-questions.md`         | Contribution guides and maintainer records                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `template/`, `scripts/`, `spec/`, `scratch/`, `n8n/`, `dist/` | Packaging, tooling, and workflow configuration                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `buzz-agents/`                                                | Versioned definitions of the Buzz agents themselves — system prompts, settings, avatars, and, for an agent that runs one, its application source under `agents/<name>/app/`. Kept so they can be branched and rebuilt in a new Buzz community. Configuration and tooling, not design guidance. See [buzz-agents/README.md](buzz-agents/README.md), [buzz-agents/INSTALL.md](buzz-agents/INSTALL.md) to set them up on a machine, or [buzz-agents/ONBOARD_AN_OPERATOR.md](buzz-agents/ONBOARD_AN_OPERATOR.md) for the owner's side of handing them to a teammate. |
| `nest/`                                                       | The other half of those agents: the scripts, fenced MCP servers, and runtime guides that get installed into `~/.buzz` by `scripts/bootstrap-nest.mjs`. Operational tooling, not design guidance. Contents are described by `nest/nest-manifest.json`.                                                                                                                                                                                                                                                                                                            |

**Do not read a `DOCS.md` to answer a build question, and do not cite one.** Skill packages in `dist/` deliberately contain the `SKILL.md` and nothing else.

**Load the family, not a single file.** A component skill says what a component is; a design-rules skill says whether it belongs on the screen. One without the other reliably produces something individually correct and collectively wrong.

**When two skills disagree**, `skills/meta/recursica-skill-design-router/SKILL.md` states the precedence. The short version: a design-rules skill beats a component skill on composition; the component skill wins only on which variants and states actually exist.

## 🔒 Before you commit, branch, or open a PR: this repo is public

Anything you write into git or GitHub is published and permanent. A commit message cannot be
edited after a push, and force-pushing moves the branch ref **without deleting the objects** —
they stay fetchable by SHA, and old PR heads stay pinned. So the check happens before the
write. There is no cleanup afterwards that fully works.

**Never write into a commit message, branch name, PR or issue title or body, or review
comment:** a client name or slug; a dataset or service-account name built from one
(`research_<slug>`, `claire-<slug>-service-user`); a research participant's name, anything they
said, or a detail that identifies them; a cloud project id; a Drive folder or sheet id; a
channel UUID; a pubkey; any part of a key file.

Write structurally instead — "the client", "a client dataset", "a participant" — or use the
`{{TOKEN}}`. Examples use `acme`. A sentence that seems to need a real name almost never does.

**Run the checker on the text, not just the diff:**

```bash
node buzz-agents/scripts/check-text-for-names.mjs <file>   # or pipe on stdin
git log -1 --format=%B | npm run -s check:names            # what you just committed
```

Exit 2 means stop and rewrite. It prints labels, never the matched string — keep it that way
if you quote it.

`.husky/commit-msg` runs it on every commit. **Check that the hook is actually wired before
you trust it:**

```bash
git config core.hooksPath        # must print .husky — empty means no hook has ever run
git config core.hooksPath .husky # what `npm install` does; safe to run by hand
```

That setting is shared by every linked worktree, so setting it once in the main checkout
covers them all. The check itself needs nothing installed, and it reads the name rules from
the main worktree when a linked one has no copy of its own.

### The things git has no hook for

A PR title and body, an issue, a release note, a branch name and a tag are all published
and none of them pass through `commit-msg`. The original incident here put the client name
in the PR body as well as the commit, and only the commit half was ever catchable.

So a `PreToolUse` hook checks the command **before it runs** — `.claude/settings.json` in
this checkout, and `nest/.claude/settings.json` for the agents, whose working directory is
the nest rather than this repository. Both call
`buzz-agents/scripts/hook-guard-published-text.mjs`, which reads the message-bearing
arguments (`-m`, `--title`, `--body`, `-F <file>`, `curl -d @<file>`, a new branch or tag
name) and denies the command if one of them names something it should not.

Two things about it are deliberate and worth not "fixing":

- **It reads the arguments, not the whole command line.** A command routinely contains a
  path under the operator's home directory, and the operator-name rules match that.
  Checking the raw string would deny every correct commit — the same mistake that left
  `commit-msg` switched off for months.
- **Text piped in on stdin (`git commit -F -`, a heredoc) is warned about, not blocked.**
  The guard cannot see it. Refusing a legitimate pipe would push people to `--no-verify`,
  and a guard that gets switched off protects nothing. When you see that warning, run the
  checker on the text yourself.

**A bare client slug is only caught if your local rules name it.** It is an ordinary word —
no shape distinguishes one from any other short lowercase word, which is why the composed
forms (`research_<slug>`, `claire-<slug>-service-user`) are the ones matched structurally. Every
client you can reach needs a `manual` entry in `local-redactions.json` for the bare slug in
each casing. One was missing here, and a branch named after that client passed clean.

**The prose is where this leaks, not the diff.** Diffs get read closely; the paragraph
explaining which client hit the bug does not, and it is the one carrying the name. Both real
incidents in this repo went out that way.

If something already pushed names a client or a participant, say so immediately, scrub what
can still be scrubbed, and state plainly what cannot be undone.

## 🧳 Portable agents

`agents/<name>/` is the source of truth for an agent. `SKILL.md` holds everything portable;
`platform/*.md` holds only the passages where the surface differs; `runtime/*.json` holds
settings that never belong in a prompt. Nothing under `buzz-agents/agents/*/SYSTEM_PROMPT.md`
or `portable/` is edited by hand — those are build outputs.

```bash
npm run agents:build:check   # report drift, write nothing
npm run agents:build         # write
```

Three rules the build enforces so you do not have to remember them:

- **The Buzz prompt must not change.** It is asserted byte-identical to what is committed
  unless you pass `--accept`. A refactor that alters the shipped prompt is not a refactor.
- **Every `{{TOKEN}}` reaching an artifact must be declared** in
  `buzz-agents/placeholders.json`. Portable artifacts keep their tokens on purpose — they are
  per-installation — but an undeclared one is unanswerable for whoever is porting.
- **Every artifact is name-checked before it is written.** Generated files in a public repo
  are the category that gets read least closely.

Not every agent ports. `agents/<name>/PORTING.md` says what one needs and what it cannot
carry — above all that **a prompt does not carry a data fence**.

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
