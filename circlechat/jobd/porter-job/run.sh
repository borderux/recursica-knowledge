#!/usr/bin/env bash
# One porter job: clone the target adapter, run the porter-adapter on the reference package, leave
# the report in /work/report.md. The job runner (jobd) starts this with the target repository, the
# report path and the gateway's settings; /work holds package.md.
set -uo pipefail
cd /work || exit 1

: "${TARGET_REPO:?}" "${ANTHROPIC_BASE_URL:?}" "${ANTHROPIC_AUTH_TOKEN:?}" "${PORTER_REPORT:=/work/report.md}"
# Claude Code sends its model requests to the stack's gateway, with the gateway key for the job's
# task. The gateway picks the model from the task's "Cloud models" setting; the job holds no cloud key.
export CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1

# GitHub: Porter's GitHub App token for the job's repo, from the stack's token service, with the
# job's task key (GITHUB_TOKEN_URL, github/token-service.mjs). A token is valid for at most one
# hour, so each git and gh call asks for a fresh token once the token is 45 minutes old. Commits
# use the app's bot identity. Without GITHUB_TOKEN_URL, the stack has no GitHub Apps, and the job
# has no push access.
if [ -n "${GITHUB_TOKEN_URL:-}" ]; then
  mkdir -p "$HOME/bin" "$HOME/.cache"
  cat > "$HOME/bin/github-token" <<'TOKEN'
#!/usr/bin/env bash
# Prints the job's GitHub token, and asks the token service for a new one after 45 minutes.
set -euo pipefail
f="$HOME/.cache/github-token.json"
if [ ! -s "$f" ] || [ $(( $(date +%s) - $(stat -c %Y "$f") )) -ge 2700 ]; then
  curl -fsS -X POST -H "Authorization: Bearer $ANTHROPIC_AUTH_TOKEN" -H "content-type: application/json" \
    -d "$(jq -n --arg r "$TARGET_REPO" '{repo: $r}')" "$GITHUB_TOKEN_URL/token" > "$f.new"
  chmod 600 "$f.new"; mv -f "$f.new" "$f"
fi
jq -r "${1:-.token}" "$f"
TOKEN
  # gh gets the token on each call. git gets the token from a credential helper.
  cat > "$HOME/bin/gh" <<'GH'
#!/usr/bin/env bash
GH_TOKEN="$(github-token)" exec /usr/bin/gh "$@"
GH
  chmod 700 "$HOME/bin/github-token" "$HOME/bin/gh"
  export PATH="$HOME/bin:$PATH"
  github-token >/dev/null || { echo "Porter job: the token service gave no GitHub token for $TARGET_REPO" > "$PORTER_REPORT"; exit 1; }
  git config --global credential.helper '!f() { [ "$1" = get ] || exit 0; echo username=x-access-token; echo "password=$(github-token)"; }; f'
  git config --global user.name "$(github-token .name)"
  git config --global user.email "$(github-token .email)"
else
  echo "Porter job: this stack has no GitHub App for Porter, so the job can clone a public repo but cannot push." >&2
fi

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
