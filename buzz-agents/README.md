# Buzz Agent Definitions

Version-controlled copies of the Buzz agents used with Recursica, so they can be
branched, reviewed, and rebuilt in a new Buzz community.

> **Setting the agents up on your own Mac? Read [INSTALL.md](INSTALL.md).** It is the
> step-by-step path and it is the only document you need. This file explains how the
> storage format works, which matters when you are changing it rather than using it.
>
> The agent definitions here are half of what an agent needs; the scripts, fenced MCP
> servers and runtime guides are the other half and live in [`../nest/`](../nest/),
> installed by `scripts/bootstrap-nest.mjs`. An agent without the nest starts and then
> finds none of its tools.

Buzz Desktop keeps agents in a single local file:

```
~/Library/Application Support/xyz.block.buzz.app/agents/managed-agents.json
```

That file is the only copy. It is not backed up, not versioned, and it lives on one
laptop. This directory is the durable record of it.

## Why this is not a skill

Everything under [`skills/`](../skills/) is a Claude Agent Skill — progressive-disclosure
instructions that get zipped by `npm run build` and published through
[`.claude-plugin/marketplace.json`](../.claude-plugin/marketplace.json) for consumers of
the Recursica design system.

These are not that. They are configuration for the Buzz agents themselves: nothing
loads them at runtime, and nobody installing the Recursica plugin wants them. Putting a
`SKILL.md` here would get the directory swept into `dist/` by
[`scripts/build-skills.js`](../scripts/build-skills.js), which treats any folder
containing a `SKILL.md` as a publishable skill. `buzz-agents/` sits outside `skills/`
precisely so that never happens.

## Layout

```
buzz-agents/
├── agents/
│   └── <name>/
│       ├── agent.json                portable settings
│       ├── SYSTEM_PROMPT.md          the prompt, as reviewable markdown
│       ├── avatar.png                the agent's picture
│       └── app/                      only where an agent ships one — see below
├── placeholders.json                 the tokens, what each one is, where to find it
├── local-values.example.json         copy to local-values.json (gitignored)
├── local-redactions.example.json     shape of local-redactions.json (gitignored, generated)
├── lib/
│   ├── placeholders.mjs
│   ├── avatars.mjs
│   └── version-stamp.mjs             which commit an agent is running
└── scripts/
    ├── export-agents.mjs             Buzz Desktop → this directory
    ├── restore-agents.mjs            this directory → a Buzz community
    ├── refresh-local-redactions.mjs  participant names from the live dataset
    └── sync-prompts.mjs              am I on the committed version?
```

The prompt is a separate `.md` file rather than a string inside `agent.json` on
purpose. A prompt stored as JSON is one long line of escaped `\n`s: no useful diff, no
`git blame`, nothing reviewable in a PR. Branching and versioning prompts is the whole
reason this directory exists, so the prompt is stored as text.

### When an agent ships an application

An agent whose job is to run a program keeps that program in `agents/<name>/app/`, beside
the prompt that describes it. Today that is only
[`agents/stu/app/`](agents/stu/app/README.md) — the traceability explorer Stu launches.
The alternative was `nest/`, with the rest of the runtime tooling; the prompt and the thing
the prompt talks about drifting apart in review is the failure worth avoiding, so they sit
together.

`nest/` still owns the launcher. [`nest/bin/stu`](../nest/bin/stu) is what `bootstrap-nest.mjs`
installs into `~/.buzz/bin`, and it expects the app at `~/.buzz/REPOS/stu-explorer`; nothing
here is installed by the bootstrap. An `app/` directory is source, not configuration — the
export and restore scripts read `agent.json`, `SYSTEM_PROMPT.md` and `avatar.png` by name and
ignore everything else, so adding one does not change what they do. `export-agents.mjs` does
scan it for redaction patterns, which is a feature: a client's slug or a participant's id
committed into application source gets caught on the next export.

Anything an app needs that names a real client — project id, channel uuid, slug, keys — stays
out, the same rule as the prompts. `agents/stu/app/stu.env.example` is the pattern.

## What is and is not stored

`managed-agents.json` holds two kinds of entry per agent — a **persona** (the
definition) and an **instance** (that persona bound to one community, with its own
keypair and credential). Only the persona is portable.

| Kind              | Fields                                                                                                                                                                                                                                    | Stored here                                   |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| **Portable**      | `name`, `display_name`, `system_prompt`, `runtime`, `provider`, `model`, `respond_to`, `respond_to_allowlist`, `parallelism`, the timeouts, `agent_args`, `agent_command_override`, `acp_command`, `mcp_command`, `backend`, `is_builtin` | ✅                                            |
| **Machine-local** | `pubkey`, `relay_url`, `persona_id`, `backend_agent_id`, `runtime_pid`, `provider_binary_path`, `avatar_url`, timestamps, `last_*`, `is_active`                                                                                           | ❌ regenerated when the agent is instantiated |
| **Secret**        | `auth_tag` — a live relay credential                                                                                                                                                                                                      | ❌ **never commit this**                      |

`export-agents.mjs` copies fields by **allowlist**, not denylist. If a future Buzz
release adds another secret field, an allowlist ignores it by default. Do not invert it.

`avatar_url` is dropped deliberately: it points at the current community's relay, which
means nothing in a different one. The picture it points at _is_ stored — see below.

## Avatars

An agent's picture is part of its identity, and a restored agent with a blank face is
not the same agent to the people talking to it. But Buzz Desktop stores only an
`avatar_url`; the image itself lives on the relay and nowhere else. So the export pulls
the bytes down and commits them as `avatar.png`.

The URL is not stored. `https://<community>.communities.buzz.xyz/media/<sha256>.png`
names the installation, which is the same reason prompts carry `{{TOKEN}}` markers.

What is stored alongside it is `avatar_source_sha256`. Relay media is
content-addressed — the filename in the URL _is_ the sha256 of the bytes — so drift
detection costs nothing: compare the hash in the live URL against the recorded one and
you know whether the avatar changed, without downloading anything. Downloads happen
only when it did.

Stored avatars are downscaled to 512px wide. The originals are ~1856x2304 and ~6.5 MB
each; at full size they would take this repository from 1.1 MB to tens of megabytes, and
it is cloned by everyone installing the Recursica plugin. The full-resolution original
stays on the relay, identified by the recorded hash.

> Because the stored file is re-encoded, `--check` compares the **source** hash and
> never the stored file's own. A future `sips` that encodes the same pixels
> differently would otherwise show up as drift on every run.

Downloading needs the `buzz` CLI on PATH with credentials for the relay holding the
image — Blossom GETs are authenticated. Without it the export still writes the prompt
and settings, says which avatar it could not fetch, and records no avatar rather than
naming a file that is not there.

## Only our own agents are stored

Buzz ships built-in agents with every community. Those are not ours to version — every
community already has them, storing them would imply we maintain them, and a Buzz upgrade
would land here as an unexplained diff. `export-agents.mjs` filters on the `is_builtin`
flag rather than a list of names, so a new agent of ours is picked up automatically and a
built-in never is.

## Identifiers are not stored — they are supplied at install

A prompt that names a cloud project or a repository is describing **one** installation.
Storing those values here would publish infrastructure inventory in a public repository
and would hand the next community a prompt pointing at somebody else's resources. So
they are not stored. Prompts keep a `{{TOKEN}}` where the value goes, and the value is
supplied when the agent is installed.

[`placeholders.json`](placeholders.json) is the registry: every token, what it is, and
where to find its value. The values for the machine you are on go in
`local-values.json`, which is gitignored — copy
[`local-values.example.json`](local-values.example.json) and fill it in.

```bash
cp buzz-agents/local-values.example.json buzz-agents/local-values.json
```

Both directions fail closed:

- **Export** refuses to write if `local-values.json` is missing, and refuses again if
  any configured value somehow survives tokenization. It cannot silently commit a real
  identifier.
- **Restore** refuses to send a prompt that still contains an unresolved token, and
  prints exactly which values are missing and where to find each one. An agent whose
  instructions literally read `{{BQ_PROJECT}}` would go looking for a project by that
  name.

`placeholders.json` also carries **redactions** — one-way scrubs for text that should
never be stored at all, such as a former maintainer's home directory. Unlike tokens,
these are not reinstated on restore.

### Participant names are redacted from a generated file, not from this one

Redactions in `placeholders.json` are regexes so that a rule never has to spell out the
text it removes. Research participant names break that: there is no expression matching
"the people in this client's interviews" and nothing else, and the names are not knowable
until the transcripts are ingested. Writing them here to protect them would publish them.

So they live in **`local-redactions.json`**, which is gitignored and **generated**:

```bash
node buzz-agents/scripts/refresh-local-redactions.mjs \
  --key ~/.buzz/.secrets/claire-<slug>-service-user.json \
  --dataset research_<slug>            # repeatable; --dry-run to look first
```

It reads `participants.participant_name` and `conversations.document_name`, so the list
derives from the data rather than from whoever last noticed a leak. **Re-run it after
ingesting new transcripts** — the guard only covers names it has seen, and export says so
out loud when the file is missing rather than reporting clean.

Two details that came out of the first dataset it ran against:

- It also derives the **name-bearing tail of each filename**. A transcript stored as
  `<Cohort> Interview Transcript - <Name>.docx` gets written in reports as
  `<Name>.docx`, which a whole-string redaction misses. That derivation is also what
  caught a person who appeared only in a filename and never in `participants`.
- It does **not** split participant names into single words unless you pass
  `--split-names`. Splitting turned an ordinary English word that happened to be
  somebody's surname into a redaction, which then rewrote that word in an unrelated code
  comment. A redaction that corrupts prose is one somebody switches off.

> This covers names reaching **this repository**. It does nothing about a name pasted
> into an issue, a chat message, or a commit body — those never run the export. Treat the
> generated file as the answer to "what must not be published", not as a filter that
> catches everything on its way out.

> Tokens cover identifiers, not judgement. A system prompt still documents how the team
> works, and this repository is public. Read a prompt before adding it here.

## Export — Buzz Desktop into git

```bash
node buzz-agents/scripts/export-agents.mjs

# CI / pre-flight: non-zero exit if the running agents have drifted from the repo
node buzz-agents/scripts/export-agents.mjs --check
```

Re-runnable and idempotent. Edit prompts in Buzz Desktop, re-run the export, and
review the diff — or edit the markdown here, land it through a PR, and push it back
out with `restore-agents.mjs`.

`buzz-agents/agents/` is listed in [`.prettierignore`](../.prettierignore). The
pre-commit hook runs `prettier --write` over staged markdown, and prettier reflows
blockquote indentation and inserts blank lines — on a prompt file that is not
formatting, it is an unreviewed edit to an agent's instructions. Keep the ignore rule.

## Restore — git into a new community

```bash
# fill in this community's values first
cp buzz-agents/local-values.example.json buzz-agents/local-values.json

# print the commands
node buzz-agents/scripts/restore-agents.mjs --channel <uuid>

# execute them
node buzz-agents/scripts/restore-agents.mjs --channel <uuid> --run
```

Prompts with their tokens filled in are written to `buzz-agents/.resolved/`, also
gitignored, so the printed commands are runnable exactly as shown.

### Restored agents carry their owner's name

An agent created from this repository is named `Claire (Alex)`, not `Claire`. A community
ends up with one Claire per operator — each a separate keypair, all legitimate — and three
agents called `Claire` in one channel cannot be told apart, addressed, or `@mention`ed with
any certainty about which one answers.

The **stored** name stays canonical, because the definition is nobody's in particular:

| Where                                     | Name            | Why                                  |
| ----------------------------------------- | --------------- | ------------------------------------ |
| `agents/claire/agent.json`                | `Claire`        | The definition is not one operator's |
| Buzz Desktop, the relay, a channel header | `Claire (Alex)` | Two Claires must be distinguishable  |

The suffix is applied by `restore-agents.mjs` and stripped again by `export-agents.mjs`.
Without the stripping, the first export from a second operator's Mac would fork the tree —
`agents/claire-alex/` beside `agents/claire/`, holding the same prompt — and put one
person's name into everybody else's agent. Note the redaction that scrubs a personal name
would not have caught it: redactions apply to prompt text, and this is the name field.

`--owner` sets the name; the default is the first word of this checkout's
`git config user.name`, which this repository already treats as the human operator's
identity. `--no-owner` opts out, and is only right for a community that will hold exactly one
set of agents forever.

The owner is a display convention and nothing keys off it. Ownership is the keypair and the
`respond_to` setting, neither of which a rename touches. `sync-prompts.mjs` matches through
the suffix, and reports `more than one match on this Mac` rather than guessing when two
personas answer to one definition — see `lib/agent-names.mjs`.

Needs the `buzz` CLI with `BUZZ_RELAY_URL`, `BUZZ_PRIVATE_KEY` and `BUZZ_AUTH_TAG` set
for the target community. Every command opens a prefilled form in the owner's Buzz
Desktop that they must review and save — an agent definition arriving from a git
branch should be looked at before it starts answering people.

Every agent stored here is restored. There is no skip list, because Buzz's own built-in
agents are never exported in the first place.

### Known limits

- `draft-create` accepts only channel, display name, and prompt. `draft-update` adds
  runtime, provider, model, and `respond_to`. **Parallelism, timeouts, `agent_args`,
  and command overrides have no CLI flag** — the restore script prints them as a
  `MANUAL` block to set in Buzz Desktop rather than dropping them silently.
- **The avatar has no CLI flag either**, and it has to exist on the target relay before
  it can be pointed at. The `MANUAL` block carries the `buzz upload file` command for
  each agent; the returned URL is what goes in Buzz Desktop.
- **Agent memory is not covered here.** The `core` engram lives on the relay, not in
  `managed-agents.json`, and each agent can only read its own
  (`buzz mem get core`). A restored agent starts with empty memory.
- MCP servers, skills, and the workspace an agent reads at runtime live in that
  agent's own checkout, not in its Buzz definition.
- **`draft-update` does not check that the agent exists.** A name matching nothing still
  returns `accepted: true` and opens a draft that updates nothing. Verified 2026-08-04.
  Take the name from `managed-agents.json`, never from a guess — `sync-prompts.mjs` does.
- **A prompt over 20,000 characters is rejected**: `system prompt is too long (max 20000
characters)`. Claire's resolved prompt currently sits under 100 characters below that,
  so it is a live constraint rather than a theoretical one.

## Sync — is my agent on the committed version?

Export and restore each assume they know the answer. After a `git pull`, an operator does
not:

```bash
# report only — needs no credentials, no channel, sends nothing
node buzz-agents/scripts/sync-prompts.mjs

# see the change before deciding
node buzz-agents/scripts/sync-prompts.mjs --diff

# print the draft-update commands, then send them
node buzz-agents/scripts/sync-prompts.mjs --channel <uuid>
node buzz-agents/scripts/sync-prompts.mjs --channel <uuid> --run

# CI / pre-flight: non-zero exit if anything anywhere differs; writes nothing at all
node buzz-agents/scripts/sync-prompts.mjs --check
```

### It compares versions, not prompts

Each agent carries a **version stamp**: an env var in Buzz's global agent config whose value
is `<commit>@<fingerprint>` — the commit that last changed that agent's `SYSTEM_PROMPT.md`,
and a short digest of the prompt that was installed at the time.

```
AGENT_PROMPT_VERSION_CLAIRE=<40-char commit sha>@<12-char digest>
```

The everyday check is then two string comparisons. Is the stamped commit the newest commit
touching this prompt? Is the prompt still the one that was fingerprinted? Two yeses is "in
sync", and no prompt is compared against the repository at all.

The two halves answer different questions and both are needed:

| Half            | Answers                                      | Why the other half cannot                                                                   |
| --------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------- |
| **commit sha**  | Has the branch moved past what I installed?  | A fingerprint says something changed, never whether the repo or the agent is the newer side |
| **fingerprint** | Is the agent still running what I installed? | A sha records a past act; an edit made in Buzz Desktop afterwards leaves it untouched       |

Drop the fingerprint and an agent edited in Buzz Desktop reads as up to date, hiding the one
copy of that prompt nobody else has. Drop the sha and you are back to guessing direction from
content.

The fingerprint is **not** the agent's `updated_at`, which was the first thing tried. That
only works if the Desktop reliably bumps the field on every save, and if it ever does not,
the check fails by reporting "unchanged" — silently, in the exact case it exists to catch.

### Why a stamp beats comparing the prompts

The obvious implementation — fill in the tokens and compare against the live prompt — is
wrong in a way that looks like it works. **Redactions are one-way** by design: text scrubbed
on export is never reinstated. So a resolved comparison reports drift on every redacted
agent, on every run, forever, with no edit that could ever clear it. ALAN is redacted today,
and that is exactly what happened to him.

Neither half of a stamp has that problem. A sha is the same string on both sides or it is
not, and a fingerprint compares a live prompt against itself at an earlier moment — same
space, so there is no token or redaction boundary to reason about and no direction to get
backwards.

### What happens when the two disagree

Only then is a prompt read, and only to decide which of three things is true. The comparison
is a single equality against the stored file — in stored form, not resolved, for the reason
above — never a history walk.

| Live prompt is…           | State                        | Action                                                                                     |
| ------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------ |
| the committed one         | `in sync`                    | The stamp was missing or stale; it is written, and that is the only time it is written     |
| the one it was stamped at | `BEHIND the branch`          | The branch moved on. Offers the `draft-update`                                             |
| neither                   | `has local edits not in git` | Unversioned work. No apply command without `--force-apply`; the fix is `export-agents.mjs` |

A stamp is only ever written for a state that has been **observed**. `draft-update` opens a
form the owner may never save, so stamping at send time would record an intention as a fact
and an agent whose draft was discarded would report itself up to date forever. Applying an
update therefore takes two runs: one to send the draft, and the next one, after the save, to
record what landed.

A prompt with no commit has no version to stamp, so `--check` calls it out rather than
inventing a sha that no clone could resolve.

### Where the stamp lives, and why not on the agent

Buzz has env vars in two places. `AgentDefinition` carries a per-agent `env_vars` map, but it
belongs to the persona definition published to the relay: it is absent from the local
`managed-agents.json` (0 of 14 entries carry it) and no `buzz` subcommand writes it —
`draft-update` offers six flags and none is `--env`. So a script cannot reach it.

What is reachable is `agents/global-agent-config.json`, whose `env_vars` map Buzz injects
into every managed agent it launches. It is one namespace shared by all agents, so the agent
name goes in the key.

The file is written directly rather than through the Desktop's own
`set_global_agent_config`, which restarts every affected agent on change — a bad trade for
writing a record that changes no behaviour. Writes are atomic and touch only
`AGENT_PROMPT_VERSION_*` keys; the provider, model and preferred runtime sitting in the same
file are read and written back untouched, and the writer refuses any key outside that prefix.
Constraints come from the Buzz binary rather than guesswork: keys must match
`[A-Za-z_][A-Za-z0-9_]*`, values cannot contain NUL, and `BUZZ_*` is reserved.

If the Desktop ever overwrites that file and drops the stamps, the failure is safe: a missing
stamp reads as unknown, which sends the check down the slow path, re-derives the truth from
the prompt, and writes the stamp again.

### What it refuses to do

- Send a prompt with an unresolved `{{TOKEN}}` — same fail-closed rule as restore.
- Print a command whose prompt exceeds the 20,000-character limit. It names the agent and
  the overage instead; the fix is to move a section out to a `GUIDES/*.md` the agent is told
  to read, not to shave prose.
- Emit a flag for a setting it cannot actually set. The flags only ever assign a value, so a
  repo value of `null` against a live value of something is real drift that no
  `draft-update` can express. It is reported as a Buzz Desktop step instead of becoming
  `--model null`.

`--diff` output is in stored form, so it carries no project ids, folder ids or home
directories and is safe to paste into a channel.

`--check` writes nothing, including no stamps: an operator running it in CI, or before
deciding anything, has not agreed to a write. `--no-stamp` reads stamps without ever writing
one.
