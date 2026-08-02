# Buzz Agent Definitions

Version-controlled copies of the Buzz agents used with Recursica, so they can be
branched, reviewed, and rebuilt in a new Buzz community.

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
│       └── SYSTEM_PROMPT.md          the prompt, as reviewable markdown
├── placeholders.json                 the tokens, what each one is, where to find it
├── local-values.example.json         copy to local-values.json (gitignored)
├── lib/placeholders.mjs
└── scripts/
    ├── export-agents.mjs             Buzz Desktop → this directory
    └── restore-agents.mjs            this directory → a Buzz community
```

The prompt is a separate `.md` file rather than a string inside `agent.json` on
purpose. A prompt stored as JSON is one long line of escaped `\n`s: no useful diff, no
`git blame`, nothing reviewable in a PR. Branching and versioning prompts is the whole
reason this directory exists, so the prompt is stored as text.

## What is and is not stored

`managed-agents.json` holds two kinds of entry per agent — a **persona** (the
definition) and an **instance** (that persona bound to one community, with its own
keypair and credential). Only the persona is portable.

| Kind              | Fields                                                                                                                                                                                                                                            | Stored here                                   |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| **Portable**      | `name`, `display_name`, `system_prompt`, `runtime`, `provider`, `model`, `respond_to`, `respond_to_allowlist`, `parallelism`, the timeouts, `agent_args`, `agent_command_override`, `acp_command`, `mcp_command`, `backend`, `is_builtin`, `slug` | ✅                                            |
| **Machine-local** | `pubkey`, `relay_url`, `persona_id`, `backend_agent_id`, `runtime_pid`, `provider_binary_path`, `avatar_url`, timestamps, `last_*`, `is_active`                                                                                                   | ❌ regenerated when the agent is instantiated |
| **Secret**        | `auth_tag` — a live relay credential                                                                                                                                                                                                              | ❌ **never commit this**                      |

`export-agents.mjs` copies fields by **allowlist**, not denylist. If a future Buzz
release adds another secret field, an allowlist ignores it by default. Do not invert it.

`avatar_url` is dropped deliberately: it points at the current community's relay, which
means nothing in a different one.

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
- **Agent memory is not covered here.** The `core` engram lives on the relay, not in
  `managed-agents.json`, and each agent can only read its own
  (`buzz mem get core`). A restored agent starts with empty memory.
- MCP servers, skills, and the workspace an agent reads at runtime live in that
  agent's own checkout, not in its Buzz definition.
