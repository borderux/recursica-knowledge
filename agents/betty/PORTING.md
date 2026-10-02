# Porting Betty

Betty is portable for the same reason Barb and Alan are: **she needs no client data and no data fence.**
She reads two repositories, runs `npm` and `git`, dispatches one subagent, and opens a pull
request. That is the whole surface.

## The absence that makes her portable

Betty has no BigQuery access and no Drive access, and she must not be given any.

Where research exists, it reaches her through Claire — who holds one client's fence — as
findings she quotes by id. That indirection is not a convenience. It is what lets a **single**
Betty serve every client without ever being inside more than one client's data. It is also the
reason she does not need the per-client instancing the research pipeline requires.

**Giving Betty her own credentials to "simplify" this builds exactly what the fence exists to
prevent**, and nothing warns about it. Port her freely. Do not give her a data
grant to save a message.

## What is provided

| File | For |
| --- | --- |
| `portable/claude-code/agents/betty.md` | Claude Code — drop into `.claude/agents/` |
| `portable/claude-code/agents/{barb,checker,feisty}.md` | Barb, who reviews what Betty builds — same directory, all three |
| `agents/betty/runtime/claude-code.json` | model, tool allowlist, and why each absence is deliberate |
| `buzz-agents/agents/betty/SYSTEM_PROMPT.md` | the Buzz prompt |

Both prompt files are generated from `agents/betty/SKILL.md` by
`node scripts/build-agents.mjs`. Edit the source, not the artifact. The build overwrites the
artifact, and `--check` reports whether the two have diverged.

**Register the Recursica MCP server.** The skills name every option the way the design system
does. Betty looks up each adapter's name for it with `recursica_get_component_doc` from
`@recursica/mcp`. Register the server as `recursica-mcp`, with `cwd` set to the project she is
building, so it can find the installed adapter. Without it she reads the adapter's API from the
installed package instead.

**Barb is required.** Betty's review tiers assume she exists. Installing Betty
without `barb`, `checker` and `feisty` leaves her with a prompt that describes a review she
cannot run. A user cannot tell that missing review apart from a review that found nothing.

## The tokens that must be filled in

The artifacts deliberately still contain `{{TOKEN}}` markers. They are per-installation values
and guessing them would be wrong.

| Token | What to put there |
| --- | --- |
| `KNOWLEDGE_REPO_NAME` | Bare name of this repository's checkout — where `skills/`, `scripts/screen-skill-manifest.mjs` and the name checker live. |
| `WORKSPACE_ROOT` | The directory the checkouts sit under. Session targets only; the Buzz prompt hard-codes `~/.buzz/REPOS`. |

## What she is not given, on purpose

- **No write access to this repository.** Betty builds against the standard; she never edits
  it. A builder that can soften the rule it broke is measuring nothing. Rule gaps go to the
  design-findings pipeline, where a human reviews them.
- **No merge.** She opens a pull request and stops. Enforce it with branch protection rather
  than with the prompt — a prompt rule is not a fence.
- **No repository creation.** A human creates the fork and hands her the URL.

## Before pointing her at a public repository

She writes commit messages, pull request bodies and issue bodies. The repositories she
files design-system gaps into are public, even when the prototype fork is private. Her prompt
requires `buzz-agents/scripts/check-text-for-names.mjs` on every one of those before it is
posted. That script reads a gitignored rules file that differs per machine. **A pass on one machine
does not prove the text is clean on another.** Treat it as a minimum check.
