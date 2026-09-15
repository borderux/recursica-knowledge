# Porting Betty

Betty is portable for the same reason ALAN is: **she needs no client data and no data fence.**
She reads two repositories, runs `npm` and `git`, dispatches one subagent, and opens a pull
request. That is the whole surface.

## The absence that makes her portable

Betty has no BigQuery access and no Drive access, and she must not be given any.

Where research exists, it reaches her through Claire — who holds one client's fence — as
findings she quotes by id. That indirection is not a convenience. It is what lets a **single**
Betty serve every client without ever being inside more than one client's data, and it is the
reason she does not need the per-client instancing the research pipeline requires.

**If you "simplify" this by giving Betty her own credentials, you have built the thing the
fence exists to prevent**, and nothing will warn you. Port her freely. Do not give her a data
grant to save a message.

## What you get

| File | For |
| --- | --- |
| `portable/claude-code/agents/betty.md` | Claude Code — drop into `.claude/agents/` |
| `portable/claude-code/agents/{barb,checker,feisty}.md` | Barb, who reviews what Betty builds — same directory, all three |
| `agents/betty/runtime/claude-code.json` | model, tool allowlist, and why each absence is deliberate |
| `buzz-agents/agents/betty/SYSTEM_PROMPT.md` | the Buzz prompt |

Both prompt files are generated from `agents/betty/SKILL.md` by
`node scripts/build-agents.mjs`. Edit the source, not the artifact — the build overwrites it,
and `--check` will tell you if they have diverged.

**Barb is not optional decoration.** Betty's review tiers assume she exists. Installing Betty
without `barb`, `checker` and `feisty` leaves her with a prompt that describes a review she
cannot run, which reads to a user exactly like a review that found nothing.

## The tokens you must fill in

The artifacts deliberately still contain `{{TOKEN}}` markers. They are per-installation values
and guessing them would be wrong.

| Token | What to put there |
| --- | --- |
| `KNOWLEDGE_REPO_NAME` | Bare name of this repository's checkout — where `skills/`, `scripts/screen-skill-manifest.mjs` and the name checker live. |
| `WORKSPACE_ROOT` | The directory your checkouts sit under. Session targets only; the Buzz prompt hard-codes `~/.buzz/REPOS`. |

## What she is not given, on purpose

- **No write access to this repository.** Betty builds against the standard; she never edits
  it. A builder that can soften the rule it broke is measuring nothing. Rule gaps go to the
  design-findings pipeline, where a human reviews them.
- **No merge.** She opens a pull request and stops. Enforce it with branch protection rather
  than with the prompt — a prompt rule is not a fence.
- **No repository creation.** A human creates the fork and hands her the URL.

## Before you point her at a public repository

She writes commit messages, pull request bodies and issue bodies, and the repositories she
files design-system gaps into are public even when the prototype fork is private. Her prompt
requires `buzz-agents/scripts/check-text-for-names.mjs` on every one of those before it is
posted. That script reads a gitignored per-machine rules file, so **a pass on one machine does
not prove the text is clean on another.** Treat it as a floor.
