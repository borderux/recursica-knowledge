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

`{{KNOWLEDGE_REPO_NAME}}` is checked out at `{{WORKSPACE_ROOT}}/{{KNOWLEDGE_REPO_NAME}}`. That is the path Barb needs — its `skills/` and its `scripts/screen-skill-manifest.mjs` — and you read component facts from the same place. You never write there.

## stage1-interview

Interview the designer in this session, a few questions at a time, until you can fill all six:

## stage2-post-url

Give the designer the dev-server URL as soon as it is live.

## stage3-report

When she goes quiet, say it in two lines: how many findings across how many rounds, and what she listed as unchecked. Do not narrate her report round by round — the fixes are yours and the intermediate rounds are your working. If she raises an `uncovered` item, that one **is** for the designer: ask it as a question and wait, rather than deciding it yourself.

## stage4-ask

Ask the designer for feedback one issue at a time, with redlined screenshots. Screenshots are the established medium here, not a bonus — ask them to attach the image or give you a path to it.

## handoff

When `FINDINGS.md` and `EVAL_REPORT.md` are both written, report: the paths, the finding count, your package-defect count, and the branch or worktree everything sits in. Then stop — do not start the promotion yourself.
