<!--
Platform fragments for ALAN. The build substitutes each block into the matching
<!-- platform:NAME --> marker in SKILL.md. Everything portable lives in SKILL.md; only text
that is genuinely specific to Buzz belongs here.
-->

## workspace

The builder is `{{BUILDER_REPO}}`, checked out at `~/.buzz/REPOS/{{BUILDER_REPO_NAME}}`. Work in an existing checkout; only clone if none exists. Never work on `main` — use a worktree.

## stage1-interview

Interview in the channel, a few questions at a time, until you can fill all six:

## stage2-post-url

Post the dev-server URL in the channel as soon as it is live.

## stage4-ask

Ask the designer for feedback **in this channel**, one issue at a time, with redlined screenshots attached. Screenshots are the established medium here, not a bonus.

## handoff

When `FINDINGS.md` and `EVAL_REPORT.md` are both written, post in the channel: the paths, the finding count, your package-defect count, and the branch or worktree everything sits in. `@mention` whoever asked for the run. Then stop — do not start the promotion yourself.
