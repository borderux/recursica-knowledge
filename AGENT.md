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

**Every line is read, including comments.** A `#` line is only exempt with `--commit-msg`,
which `.husky/commit-msg` passes and nothing else should — a commit message is the one input
where git discards those lines before publication. Everywhere else a comment is prose, and
prose is where this leaks. That exemption used to apply to every input, which meant the
`<file>` form above silently skipped every comment in a shell script, a Dockerfile or a YAML
file. **It also now prints what it did not read**, on every run including a clean one, so
`exit 0` after skipping forty lines no longer looks identical to `exit 0` after reading them.

One tracked file fails this check by design: `buzz-agents/lib/placeholders.test.mjs` contains
a fixture matching the structural `research_<slug>` rule, because that is the rule it tests.
That predates the comment fix and is not a regression from it.

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

### The operator's sign-off

A second `PreToolUse` hook, `buzz-agents/scripts/hook-guard-commit-trailers.mjs`, denies a
`git commit` that would land without the human operator's two trailers. `AGENTS.md` in the
nest has required them for months; they were missed on two consecutive pieces of work, and
before those, 7 of the 12 commits on `main` carried no `Signed-off-by` — the 6 most recent
consecutively. It is not an unclear rule, it is one that has to be remembered at the moment
nobody is thinking about it, so it moved out of prose.

Put all three trailers in the commit command, where they cannot be lost between committing
and pushing:

```bash
git commit -F <file> \
  --trailer "Co-authored-by: $(git config user.name) <$(git config user.email)>" \
  --trailer "Co-authored-by: <your model, per your harness> <noreply@anthropic.com>" \
  --trailer "Signed-off-by: $(git config user.name) <$(git config user.email)>"
```

**All three trailers coexist** — the operator's `Co-authored-by`, the model's, and the
operator's `Signed-off-by`. The instruction to credit the model reads like a substitution
and is not one. GitHub reads `Co-authored-by` for contribution credit and `Signed-off-by`
alone does not grant it, which is why both are required rather than either. Pass the model's
as a `--trailer` flag too rather than leaving it at the end of the message body — that is
what puts it in the right position and what makes it visible in the same place as the other
two.

**Three flags in, three lines out.** Verify with `git log -1 --format='%(trailers)'` and
count the lines. **Not `git log --oneline -1`** — that prints hash and subject only, so it
structurally cannot show a trailer and will pass on a commit that has none. That is exactly
how one of the two misses got through a verification step that did run.

The count is the point. The next failure was not a missed verification — it was a correct
one, run with the right command, that read back two trailers and stopped, because two is
what the block above used to show. Three agents have now shipped commits with the operator's
two and not the model's. **The guard checks only the operator's two and never will check the
model's**, so passing it is evidence about two trailers out of three.

### What it catches, and what it does not

**A guard believed to be total is worse than one known to be partial.** This table was
produced by running the installed guard against each command, not by reading the code:

| Command | | |
|---|---|---|
| `git commit` with no trailers | **deny** | including `-F <file>`, `-m`, and a piped `-F -` |
| `git commit --amend` | **deny** | when the resulting message lacks them — HEAD's own message counts |
| `git -c commit.gpgsign=false commit` | **deny** | global options are walked, not string-matched |
| `git revert` | **deny** | its generated message has none, and it takes no `--trailer` |
| `git rebase --exec 'git commit …'` | **deny** | the exec'd command is inspected, one level deep |
| `git commit --dry-run` | allow | writes nothing |
| `git commit --fixup` / `--squash` | allow | git writes the message; the rebase consumes it |
| `git revert --no-commit`, `--continue`/`--abort`/`--quit` | allow | stages, or finishes what was already gated |
| `git cherry-pick`, `git am` | allow | they carry the source message, so its trailers ride along |
| `git merge` | allow | a merge commit is not authored work — the forge's own squash commits carry no sign-off either |

Two consequences worth stating plainly:

- **A commit made outside a Claude Code Bash call is not seen at all.** This is a
  `PreToolUse` hook, not a git hook. That is the intended blast radius — see the last bullet
  below — but it means the guard is not a guarantee about the repository, only about what
  agents propose.
- **`git filter-branch`, `git fast-import`, and a shell function or script wrapping `git
  commit` all pass through.** Nothing has needed them here; if one starts appearing, the
  boundary moves.

Three things about the guard are deliberate:

- **It denies rather than warns when it cannot read the message.** The name guard beside it
  warns on a piped `-F -`, because nothing the author can do makes a piped message
  inspectable. Here there is: `--trailer` is an argument, so it is visible whatever the
  message does, and `git commit -F - --trailer ... --trailer ...` passes. A pipe is not
  blocked; a pipe with no visible trailers is.
- **It checks the address in the working repository's `git config`, not the commit author.**
  A squash merge is authored by the GitHub account rather than the operator, so a check keyed
  on the landed commit would compare against the wrong address.
- **It is a `PreToolUse` hook, not a `commit-msg` one.** `commit-msg` fires for the
  operator's own commits too, and asking someone to sign off on their own work is friction
  with nothing behind it. `PreToolUse` fires only on commands an agent proposes.

The operator's `Co-authored-by` currently appears on `main` even where the branch commit had
none: GitHub adds one when a squash merge's author differs from the merger. That is a
byproduct of two addresses not matching, it disappears if they ever match, and nobody should
read it as evidence the trailer was written.

### The third hook: reading source from a checkout nothing runs

`nest/bin/guard-stale-checkout.mjs` denies a `Read`, `Grep`, `Glob` or content-reading Bash
command aimed at a directory directly under `REPOS/` that has **no `.git`**. Those are
leftover copies — a pre-move working tree, an unpacked tarball — and they grep and read
exactly like the live one, so an agent orienting itself cites line numbers from code nothing
deploys. Two agents did that against the same directory in one week; the second read past a
literal `fatal: not a git repository` in its own tool output.

Three things about it are deliberate:

- **The signal is git's, not a list.** No inventory of stale directories to maintain, and a
  copy left behind next month is caught the same way.
- **Listing, diffing, moving and removing stay allowed**, and so does a `buzz`/`gh`/`curl`
  command that merely names the path. Reading the content is how the tree gets mistaken for
  the live one; the rest is how someone works out it is stale and removes it — or reports
  it. A guard that blocks its own cleanup, or the message describing it, gets switched off.
- **Quoted data is never commands.** A heredoc body, a `--content` string, a `-c` argument:
  these are text the command carries, not work it does. Both guards in this nest have now
  been caught by the same shape — and the specific victim is the report *about* a guard,
  which quotes the commands it denies. Every finding in this thread was written as
  `cat > report.md <<'EOF'` with a table of denied commands, so segmenting the body as a
  command list denied the message saying the guard was broken. Strip heredoc bodies and
  herestrings before you segment anything. **An unterminated heredoc is not a bypass** —
  the stripper runs to end of input, so a read written after one disappears, but bash
  swallows the rest as body for the same reason and it never executes. That case gets
  constructed by everyone who audits this and it is the one to leave alone.
- **A command line is judged per segment, never as one string.** The first version tested
  the whole line with one regex each way and both leaked: `\bbuzz\b`, meant for
  `buzz messages send`, matched the `.buzz` inside every absolute path in the nest, and
  `git log` anywhere exempted the rest of the line — which is the incident shape exactly.
  The verbatim incident command hit both. Each segment is now decided on its own leading
  verb, and a `cd` into a stale tree carries to the segments after it. This is the same
  mistake the name guard above documents, arrived at independently; if you touch this file,
  keep the per-segment property and keep the absolute-path tests that catch losing it.
- **It is a hook rather than a line in `AGENTS.md`** because that file is read when a
  session starts and Buzz sessions are pooled and long-lived: a rule added today does not
  reach a session begun yesterday. Settings are consulted per tool call.

`node --test 'nest/bin/*.test.mjs'` asserts both directions.

## 🧳 Portable agents

`agents/<name>/` is the source of truth for an agent. `SKILL.md` holds everything portable;
`platform/*.md` holds only the passages where the surface differs; `runtime/*.json` holds
settings that never belong in a prompt. Nothing under `buzz-agents/agents/*/SYSTEM_PROMPT.md`
or `portable/` is edited by hand — those are build outputs.

```bash
npm run agents:build:check   # report drift, write nothing; exits 1 if there is any
npm run agents:build         # write
```

`--check` **used to exit 0 whether or not anything had drifted.** It printed the drift and the
status code said fine, which is invisible while a person reads the output and fatal the moment
anything automated reads it instead. `.github/workflows/checks.yml` runs it on every pull
request, and it would have gone green on exactly the drift it was added to catch.

Three rules the build enforces so you do not have to remember them:

- **The Buzz prompt must not change.** It is asserted byte-identical to what is committed
  unless you pass `--accept`. A refactor that alters the shipped prompt is not a refactor.
- **Every `{{TOKEN}}` reaching an artifact must be declared** in
  `buzz-agents/placeholders.json`. Portable artifacts keep their tokens on purpose — they are
  per-installation — but an undeclared one is unanswerable for whoever is porting.
- **A token marked `portableOnly` must not reach the Buzz prompt.** Those are tokens no
  operator will ever hold a value for, so `export-agents.mjs` leaves them out of its
  unset-value warning; the build enforces the claim that exemption rests on.
- **Every artifact is name-checked before it is written.** Generated files in a public repo
  are the category that gets read least closely.

A fragment header in `platform/*.md` is a bare kebab-case slug, matching the marker name. A
`## ` line that is not one is ordinary content, so a fragment may contain a markdown heading —
Claire's does.

**Subagents live at `agents/<name>/subagents/<sub>/`** and build to two places: the template
the deploy renders per client (`nest/mcp/templates/agents/<sub>.md.tmpl`, pinned byte-identical
like the Buzz prompt) and `portable/claude-code/agents/<sub>.md`. Unlike an agent, a subagent's
front matter **is** part of the artifact — `name`, `description` and `tools` are what make the
file a subagent — so it stays in `SKILL.md` and markers work inside it. `tools:` is the
separation between subagents, not the prose around it; widening one is a real change, not
tidying.

Both templating syntaxes are now checked. `@SLUG@`-style deploy tokens must be declared under
`deployTokens` in `buzz-agents/placeholders.json`, the same way `{{TOKEN}}`s are declared under
`tokens`. **Do not unify the two syntaxes** — a `{{TOKEN}}` value is replaced as a substring
across every prompt on export, so a client slug declared there rewrites unrelated words.

Not every agent ports, and not every one ports to every platform. `targets:` in the front
matter narrows which artifacts get built; absent means all of them. Declare it rather than
shipping an artifact that quietly drops a boundary the platform cannot express — Claire is not
built for opencode, because opencode has no per-tool allowlist to keep her subagents apart.

`agents/<name>/PORTING.md` says what one needs and what it cannot carry — above all that
**a prompt does not carry a data fence**.

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
