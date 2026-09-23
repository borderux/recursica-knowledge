# Porting Norm

Norm turns a reviewer's knowledge notes into pull requests against the knowledge repository. He
needs less than the other agents here — no dataset, no Drive folder, no client fence — and the
one thing he does need is the thing a prompt cannot carry.

## What he needs

| | |
|---|---|
| A checkout he may write to | A clone of the knowledge repository, separate from any checkout something else reads. `{{WORKSPACE_ROOT}}` and `{{KNOWLEDGE_REPO_NAME}}` name it. |
| A forge credential | Scoped to that one repository, with contents and pull requests. Nothing else. |
| Somewhere to report the link | Whatever surface handed him the note. |

## What a prompt does not carry

**The absence of a merge.** His prompt says he never merges, and that sentence is worth exactly
as much as the credential behind it. A token with merge rights makes him an agent that has been
asked nicely not to merge. Scope the credential and the property is real; rely on the prompt and
it is a preference.

The same is true of the repository boundary. "Work only in the proposals checkout" holds because
his credential reaches one repository — not because the sentence is in his prompt.

## Where he has actually run

On a self-hosted CircleChat with the Hermes runtime, alongside the designer and the reviewer —
see [circlechat/README.md](../../circlechat/README.md). That surface composes his persona from
this SKILL.md plus `circlechat/souls/norm.md`, which carries the parts that are true only there —
the container paths, the environment variable holding his credential, and posting the link into
the thread rather than to a person in a session.

**He is not built for Buzz.** `targets: claude-code` in the front matter says so. There is no
CircleChat target in the build and inventing one for a single deployment would be a worse lie
than the omission — the session artifact is the honest portable form, and the CircleChat layer
reads this file directly rather than going through the build.

## What he does not have

No data access of any kind. No review duty — he acts on findings rather than producing them, and
giving him both would make him a reviewer who can rewrite the rule he just enforced. That split
between him and the reviewer is the point of having two agents rather than one.
