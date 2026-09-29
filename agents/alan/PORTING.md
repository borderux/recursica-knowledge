# Porting Alan

Alan turns feedback about the design system — designers' snipper reports and Barb's review
findings — into pull requests against the knowledge repository. He needs less than most agents
here — no dataset, no Drive folder, no client fence — and the one thing he does need is the thing
a prompt cannot carry.

## Read this before you port anything else from this repo

**A prompt does not carry a data fence.** Alan is safe to lift because he touches no client data
at all. The research agents in this repository are not in that position: their isolation — one
client per Google service account, read-only and read-write credentials kept separate, an IAM
boundary the agent cannot cross — is enforced by the service accounts and the query proxy,
**not by a single word in any prompt**. Port Alan freely. Do not port the research pipeline
without rebuilding the fence.

## What he needs

| | |
|---|---|
| A checkout he may write to | A clone of the knowledge repository, separate from any checkout something else reads. `{{WORKSPACE_ROOT}}` and `{{KNOWLEDGE_REPO_NAME}}` name it. |
| A forge credential | Scoped to that one repository, with contents and pull requests. Nothing else — no merge, no admin. |
| Somewhere to report the link | Whatever surface handed him the feedback. |

## What you get

| File | For |
|---|---|
| `portable/claude-code/agents/alan.md` | Claude Code — drop into `.claude/agents/` |
| `portable/opencode/agents/alan.md` | opencode — drop into `.opencode/agents/` |
| `portable/circlechat/agents/alan/SOUL.md` | CircleChat on the Hermes runtime |
| `agents/alan/runtime/claude-code.json` | model and tool allowlist |
| `agents/alan/runtime/opencode.json` | merge the `agent` block into your `opencode.json` |

Every prompt file is generated from `agents/alan/SKILL.md` by `node scripts/build-agents.mjs`.
Edit the source, not the artifact — the build overwrites it, and `--check` will tell you if they
have diverged.

## The tokens you must fill in

| Token | What to put there |
|---|---|
| `{{KNOWLEDGE_REPO_NAME}}` | the design-system knowledge repository he proposes changes to |
| `{{WORKSPACE_ROOT}}` | where you keep checkouts, e.g. `~/src` |

Every token in an artifact is declared in `buzz-agents/placeholders.json`; the build fails on one
that is not, so this table cannot silently fall behind.

## What a prompt does not carry

**The absence of a merge.** His prompt says he never merges, and that sentence is worth exactly
as much as the credential behind it. A token with merge rights makes him an agent that has been
asked nicely not to merge. Scope the credential and the property is real; rely on the prompt and
it is a preference.

The same is true of the repository boundary. "Work only in the proposals checkout" holds because
his credential reaches one repository — not because the sentence is in his prompt. And his
proposals checkout has to be a different directory from the one builders and reviewers read, or a
rule still under review reaches them before anyone has agreed it.

## What is not settled yet

**The snipper report format.** The snipper tool is being redesigned, so his prompt reads reports
for four general things rather than a fixed structure. That section of `SKILL.md` is marked for
replacement once the format settles.

## What he does not have

No data access of any kind. No building — that is Betty. No review duty — he acts on findings
rather than producing them, and giving him both would make him a reviewer who can rewrite the rule
he just enforced. That split between him and Barb is the point of having two agents rather than
one.

## What changes between platforms

Only the surface. Three passages differ — who he is introduced as, where his checkout lives, and
where the pull request link goes. You can see them in `agents/alan/platform/`.
