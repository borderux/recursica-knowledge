<!--
Platform fragments for ALAN on a plain session surface — Claude Code with no Buzz, and
opencode. Both targets map here rather than each getting a copy: the text came out
identical, and two identical files is how drift starts.

The build substitutes each block into the matching <!-- platform:NAME --> marker in
SKILL.md. Everything portable lives in SKILL.md; only text genuinely specific to this
runtime belongs here.

The difference from the Buzz fragments is the *surface*: there is no channel to post into
and nobody to @mention, so the same instructions address the person in the session
directly. The work itself — the six interview sections, the build, the evaluation, the
findings — is identical, which is the point of the split.
-->

## workspace

The builder is `{{BUILDER_REPO}}`, checked out at `{{WORKSPACE_ROOT}}/{{BUILDER_REPO_NAME}}`. Work in an existing checkout; only clone if none exists. Never work on `main` — use a worktree.

## stage1-interview

Interview the designer in this session, a few questions at a time, until you can fill all six:

## stage2-post-url

Give the designer the dev-server URL as soon as it is live.

## stage4-ask

Ask the designer for feedback one issue at a time, with redlined screenshots. Screenshots are the established medium here, not a bonus — ask them to attach the image or give you a path to it.

## handoff

When `FINDINGS.md` and `EVAL_REPORT.md` are both written, report: the paths, the finding count, your package-defect count, and the branch or worktree everything sits in. Then stop — do not start the promotion yourself.
