#!/usr/bin/env bash
# One porter job: clone the target adapter, run the porter-adapter on the reference package, leave
# the report in /work/report.md. The job runner (jobd) starts this with the target repository, the
# report path and the secrets passed by name; /work holds package.md.
set -uo pipefail
cd /work || exit 1

: "${TARGET_REPO:?}" "${ANTHROPIC_BASE_URL:?}" "${ANTHROPIC_AUTH_TOKEN:?}" "${PORTER_GITHUB_PAT:?}" "${PORTER_REPORT:=/work/report.md}"
# Claude Code sends its model requests to the stack's gateway, with the gateway key for the job's
# task. The gateway picks the model from the task's "Cloud models" setting; the job holds no cloud key.
export CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1
export GH_TOKEN="$PORTER_GITHUB_PAT"            # gh and git both use the job's own token
git config --global user.name  "${PORTER_GIT_NAME:?set PORTER_GIT_NAME on the job-runner machine}"
git config --global user.email "${PORTER_GIT_EMAIL:?set PORTER_GIT_EMAIL on the job-runner machine}"
gh auth setup-git

git clone --quiet "$TARGET_REPO" repo || { echo "Porter job: could not clone $TARGET_REPO" > "$PORTER_REPORT"; exit 1; }
cd repo || exit 1

# The built porter-adapter prompt, without its front matter (that is for Claude Code's agent list).
PROMPT="$(awk 'BEGIN{f=0} /^---$/{f++; next} f>=2' /porter/porter-adapter.md)"

claude -p "$(cat /work/package.md)" \
  --append-system-prompt "$PROMPT" \
  --model "${PORTER_MODEL:-sonnet}" \
  --dangerously-skip-permissions \
  --max-turns "${PORTER_MAX_TURNS:-400}" \
  --output-format json > /work/result.json 2> /work/claude.log
status=$?

if [ ! -s "$PORTER_REPORT" ]; then
  # The porter-adapter writes the report itself; this is only for a run that ended without one.
  { echo "Porter job ended without a report (exit $status)."; echo; jq -r '.result // empty' /work/result.json 2>/dev/null | tail -c 4000; } > "$PORTER_REPORT"
  [ "$status" -eq 0 ] && status=1
fi
exit "$status"
