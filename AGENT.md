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
channel UUID; a pubkey; any part of a key file; **the client's domain vocabulary** — the
population, segment or role words that name who they serve and what they do. A handful of
those words identifies a client as surely as the slug does, and unlike the slug they are
ordinary English, so nothing structural will ever catch them.

Write structurally instead — "the client", "a client dataset", "a participant" — or use the
`{{TOKEN}}`. Examples use `acme`. A sentence that seems to need a real name almost never does.

**Never enumerate the strings you searched for. State the result.** "Grepped the diff for
`<slug>`/`<role>`/`<segment>` — zero hits" publishes, in the sentence claiming the text is
clean, exactly what the search was protecting. This is the rule to reach for when in doubt,
because it is the only one here that needs no judgement about what is sensitive: you can
follow it without knowing, which is precisely the case where the category list above fails
you. Write "the checker passes on every changed file" — the exit code is the evidence, and
it already knows the terms so the reader does not need them.

The pattern generalises past grep. Any sentence whose job is to prove a check ran is under
pressure to quote the thing checked — a rejected value, a matched line, a filename, a table
row that "looks wrong." Prove it with the tool's output, never with the input.

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

**Three flags in — verify by kind, not by counting lines:**

```bash
git log -1 --format='%(trailers)' | grep -ciE '^Co-authored-by:'  # must print 2
git log -1 --format='%(trailers)' | grep -ciE '^Signed-off-by:'   # must print 1
git log -1 --format='%(trailers:key=Co-authored-by,valueonly=true)'  # operator, then model
```

**`-ciE`, not `-cE`.** Git treats trailer keys case-insensitively and grep does not, so a
lowercase `co-authored-by:` is a real trailer that an exact-case count misses — reading 1 on a
commit that is correct. Fail-safe, but it stops good work.

**The third command is not redundant.** `2` and `1` also passes when both `Co-authored-by`
lines name the same party — two model lines and no operator, or the reverse. That is exactly
the composition the paragraph above is about, and no count can see it. The counts catch a
missing line; the identities catch a wrong pair.

**Not `git log --oneline -1`** — that prints hash and subject only, so it structurally cannot
show a trailer and will pass on a commit that has none. That is exactly how one of the two
misses got through a verification step that did run.

**And not a line count, which this file used to prescribe.** `%(trailers)` emits a trailing
blank line on some commits and not others, and any body line shaped like `Key: value` in the
final paragraph is parsed as a genuine trailer — `%(trailers:only=true)` does not filter it,
because it *is* valid trailer syntax. Measured across three commits in this repo, the same
`wc -l` returned 3, 4 and 5 while all three carried exactly the right trailers. So the
line count was an unreliable instrument in both directions the whole time it was the
instruction, and the note below about a check that read back two and stopped is a case of the
same instrument.

**Two counts rather than one**, because a single `grep -cE '^(Co-authored-by|Signed-off-by):'`
prints 3 for three `Co-authored-by` lines and no sign-off. The failure this verifies against
is a wrong *composition*, so a recipe that cannot see composition verifies nothing.

**Keep an example trailer out of a commit message's final paragraph.** Git decides trailers
from the last paragraph, so a bare `Co-authored-by: EXAMPLE <x@x>` line there is a genuine
trailer and the count reads 3 where 2 is required. The same line one paragraph earlier is
correctly ignored. No recipe can distinguish them, which makes this a writing rule — and the
commits most likely to contain such a line are the commits about trailers.

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

### The fourth hook: enumerating the operator's credential store

`nest/bin/guard-credential-store.mjs` denies `security dump-keychain` and
`security find-*-password`, and denies reading `~/.netrc` or anything under `~/.ssh/`.
Retrieving one credential through `git credential-<helper> get` is untouched — that is the
sanctioned interface and the deny message points at it.

`AGENTS.md` has said all of this for months, in a `## Credentials` section naming all three
subcommands individually. **On 2026-08-12 two agents ran them anyway, four minutes apart, and
one was the reviewer whose own checklist makes it a guardrail breach.** Neither had ignored the
rule; neither had read it. That is the same argument the stale-checkout guard already rests
on — `AGENTS.md` binds when a session starts, and Buzz sessions are pooled and long-lived.

Two things about it differ from its siblings on purpose:

- **It is registered with no `if` key.** Every other hook in `nest/.claude/settings.json`
  carries one, and on the day this was written `Bash(git *)` denied a command with `git` not
  leading while `Bash(curl *)` failed to deny one with `curl` leading — verified four ways by
  two agents independently and explained by neither. A guardrail behind a mechanism nobody can
  explain is not a guardrail. The one hook that fires reliably is the one with no `if`.
- **`security` has too many spellings for a leading-command glob anyway.**
  `/usr/bin/security`, `FOO=1 security`, `sudo security`, `cd … && security` all reach the same
  syscall. The per-segment test inside the script sees them; a glob sees none of them.

`nest/bin/lib/shell-command.mjs` holds the heredoc stripping, statement splitting and verb
extraction both guards need. It was extracted from `guard-stale-checkout.mjs` rather than
copied, and that guard's 26 tests passing unchanged is the evidence the extraction is
behaviour-preserving. A hand-copied second version of this logic is exactly the second source
of truth this repo keeps being bitten by.

**It is not total, and the tests say so.** `cp ~/.ssh/id_rsa /tmp/k && cat /tmp/k` launders
through an unremarkable path and no verb-and-path list catches it; only one level of `sh -c` is
unwrapped; `SECRET_PATHS` is the app stores that exist on this machine rather than a theory of
where secrets live. Each of those has a test asserting the gap, because a guard believed to be
total is worse than one known to be partial. It also over-denies in one direction — `$(…)` is
opened regardless of quoting, so a single-quoted `'$(security …)'` in a message body is denied
though bash would not run it. A heredoc body is stripped, so the usual incident-report shape is
unaffected.

**Installing the script does not register it.** `.claude/settings.json` is `ifAbsent` in the
manifest, so `bootstrap-nest.mjs` reports a diff and leaves the operator's copy alone. Both
hook entries have to be added to `~/.buzz/.claude/settings.json` by hand, and until they are
the guard is present and never invoked.

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

**The claude-code artifact carries `model:` and `tools:`, derived from `runtime/claude-code.json`
rather than written a second time.** A file in `.claude/agents/` is a dispatchable agent and its
front matter is the only place a tool allowlist can live — without one it inherits the session's
tools. That was a documentation gap for four of these agents and a broken guarantee for Barb,
whose entire property is the absence of `Write` and `Edit`. `scripts/build-agents.test.mjs`
asserts both, because the failure is silent in every direction.

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

**Subagents take `targets:` too**, and it is stripped from the artifact rather than shipped in it —
a subagent's front matter *is* the artifact, so a build instruction has no business in the file a
runtime reads. Claire's subagents build to the nest template the deploy renders per client; Barb's
do not, because a design reviewer touches no client data and writing hers into the per-client
deploy would hand every client two agents that have nothing to do with them.

**Barb is the design reviewer, and she is the one agent here that touches no client data.** She
reads `skills/` and an application and reports which rules the screens violate, with a file and line
per claim. She writes nothing — no `Write`, no `Edit` — and that is the whole property rather than a
precaution: a reviewer that can edit the code under review can make a finding vanish, and one that
can edit `skills/` can resolve a violation by softening the rule. See
[agents/barb/PORTING.md](agents/barb/PORTING.md), and note the two leaks it names even on Claude
Code — `Bash` is a write path, and per-subagent `tools:` lines only hold if the platform honours them.

**She is built for Buzz as well**, so `restore-agents.mjs` deploys her with the others and any agent
building a Recursica app can ask her for a review in a channel. A Buzz agent has no `tools:` line at
all, though, so that property arrives as prose and the two mechanisms that look like they would fix
it — `agent_args`, a per-agent `CLAUDE_CODE_EXECUTABLE` — are both recorded failures. Her PORTING.md
has the one that works, what it is worth, and what it costs.

Which skills apply to a screen is **computed, not judged**:

```bash
npm run skills:manifest -- <screen file>    # the applicable skill set
npm run skills:manifest:check               # the map against the skills on disk
```

That script exists because of a real gap: all 39 component skills cross-link upward to the
design-rules skills, no design-rules skill links back down, and the router's decision table names
20 of 20 design-rules skills and **0 of 39 component skills**. So descending the router never yields
a component skill name — but an `import { … } from '@recursica/mantine-adapter'` line is exactly that
list, and it fires on the import rather than on anybody's sense of what counts as "placed".

**Component names are matched, not tabulated.** A component and its skill are the same word with
different punctuation, so the script strips the punctuation and compares — which resolves `TextArea`
→ `recursica-skill-textarea` (no hyphen; a kebab-case guess yields a path that does not exist),
`Radio` → `radio-button`, and both `HoverCard` and `Popover` → `hover-card-popover`, with no alias
entry for any of them. Do not add one: a hand-written alias list is a second source of truth that
goes stale silently when a skill is renamed. What *is* written down is `ROUTES` — the eleven
components with no skill of their own, where the question "which design rules govern this" is a
judgment no string comparison can make. A name matching more than one skill with no route is an
error rather than a guess. Run `skills:manifest:check` after an adapter upgrade.

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
