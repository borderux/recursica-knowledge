# Porting ALAN

ALAN is the first agent here to be portable, because it is the only one that needs **no MCP
server and no client data**. It reads a repository, runs `npm`, and writes four markdown
files. That is the whole surface.

## Read this before you port anything else from this repo

**A prompt does not carry a data fence.** ALAN is safe to lift because it touches no client
data at all. The other agents in this repository are not in that position: their isolation —
one client per Google service account, read-only and read-write credentials kept separate, an
IAM boundary the agent cannot cross — is enforced by the service accounts and the query proxy,
**not by a single word in any prompt**.

So copying a prompt gets you the behaviour and none of the protection. If you wire an agent
from this repo to one broad credential because that was easier, you get an agent that will
happily read every client you have, and nothing will warn you. Port ALAN freely. Do not port
the research pipeline without rebuilding the fence.

## What you get

| File | For |
|---|---|
| `portable/claude-code/agents/alan.md` | Claude Code — drop into `.claude/agents/` |
| `portable/opencode/agents/alan.md` | opencode — drop into `.opencode/agents/` |
| `agents/alan/runtime/claude-code.json` | model and tool allowlist |
| `agents/alan/runtime/opencode.json` | merge the `agent` block into your `opencode.json` |

Both prompt files are generated from `agents/alan/SKILL.md` by
`node scripts/build-agents.mjs`. Edit the source, not the artifact — the build overwrites it,
and `--check` will tell you if they have diverged.

## The tokens you must fill in

The artifacts deliberately still contain `{{TOKEN}}` markers. They are per-installation
values, and guessing them for you would be wrong:

| Token | What to put there |
|---|---|
| `{{BUILDER_REPO}}` | `owner/name` of the repository ALAN builds prototypes in |
| `{{BUILDER_REPO_NAME}}` | the bare repository name from the above |
| `{{KNOWLEDGE_REPO_NAME}}` | the design-system repository ALAN must **not** edit |
| `{{WORKSPACE_ROOT}}` | where you keep checkouts, e.g. `~/src` |

Every token in an artifact is declared in `buzz-agents/placeholders.json`; the build fails on
one that is not, so this table cannot silently fall behind.

## What does not come with it

- **The `run-design-test` skill and its references.** ALAN's Stage 2 and 3 read
  `.agents/skills/run-design-test/` **in the builder repository**, not here. Without it ALAN
  can still interview and capture findings, but the build and evaluation stages have nothing
  to follow.
- **The design-system skills.** ALAN builds "exclusively from Recursica components and
  tokens". Point it at your own system's skills, or that instruction means nothing.
- **`promote-findings`.** The handoff target is a separate workflow that does not exist
  outside this setup. On a plain session ALAN stops after writing the two files, which is the
  correct place to stop anyway.

## What changes between the Buzz version and this one

Only the surface. Five passages differ — where to interview, where to post the dev-server
URL, how to ask for feedback, how to hand off, and where the checkout lives. Everything else
— the six interview sections, the build rules, the self-evaluation, the findings format, the
hard prohibitions — is byte-for-byte the same text, from one source.

You can see exactly which five in `agents/alan/platform/`.
