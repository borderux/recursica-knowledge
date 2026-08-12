<!--
Platform fragments for ALAN. The build substitutes each block into the matching
<!-- platform:NAME --> marker in SKILL.md. Everything portable lives in SKILL.md; only text
that is genuinely specific to Buzz belongs here.
-->

## workspace

The builder is `{{BUILDER_REPO}}`, checked out at `~/.buzz/REPOS/{{BUILDER_REPO_NAME}}`. Work in an existing checkout; only clone if none exists. Never work on `main` — use a worktree.

`{{KNOWLEDGE_REPO_NAME}}` is checked out at `~/.buzz/REPOS/{{KNOWLEDGE_REPO_NAME}}`. That is the path Barb needs — its `skills/` and its `scripts/screen-skill-manifest.mjs` — and you read component facts from the same place. You never write there.

## stage1-interview

Interview in the channel, a few questions at a time, until you can fill all six:

## stage2-post-url

Post the dev-server URL in the channel as soon as it is live.

## stage3-report

When she goes quiet, post it in the channel in two lines: how many findings across how many rounds, and what she listed as unchecked. Do not post her report round by round — the fixes are yours and the intermediate rounds are your working. If she raises an `uncovered` item, that one **is** for the channel: ask it as a question and wait, rather than deciding it yourself.

## stage4-ask

Ask the designer for feedback **in this channel**, one issue at a time, with redlined screenshots attached. Screenshots are the established medium here, not a bonus.

## handoff

When `FINDINGS.md` and `EVAL_REPORT.md` are both written, post in the channel: the paths, the finding count, your package-defect count, and the branch or worktree everything sits in. `@mention` whoever asked for the run. Then stop — do not start the promotion yourself.
