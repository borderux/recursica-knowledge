#!/usr/bin/env bash
# The check job: tests the port-job path without touching a repo. jobd starts this script in the
# port job's image, on the port job's network, with the port job's settings (gateway.env). The
# check has three parts:
#   image    Claude Code starts in the image.
#   gateway  One tiny model request reaches the gateway with the job's task key.
#   token    The token service confirms that the key's agent may get a token for the repo, and
#            makes no token (POST /check on github/token-service.mjs).
# The script never clones, pushes or opens a pull request. The script writes each part's result to
# check.json in the job's folder, and a short report to report.md. The script exits 0 only when
# every part passes.
set -uo pipefail
# WORK is the job's folder: /work in the container, another folder in the tests.
WORK="${WORK:-/work}"
cd "$WORK" || exit 1

: "${TARGET_REPO:?}" "${ANTHROPIC_BASE_URL:?}" "${ANTHROPIC_AUTH_TOKEN:?}" "${PORTER_REPORT:=$WORK/report.md}"
# jobd starts the check with a read-only root file system: /tmp is the only folder to write in.
T="$(mktemp -d)"
export HOME="$T" CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1
# curl reads the key from a file, so the key never shows in the container's process list. Only
# the key file is private: jobd, another user, reads check.json and report.md.
( umask 077; printf 'authorization: Bearer %s\n' "$ANTHROPIC_AUTH_TOKEN" > "$T/auth" )
unset ANTHROPIC_AUTH_TOKEN

part() { jq -n --argjson ok "$2" --arg detail "$3" '{ok: $ok, detail: $detail}' > "$T/part-$1.json"; }

# 1. The image.
if version="$(claude --version 2>/dev/null)" && [ -n "$version" ]; then
  part image true "Claude Code $version"
else
  part image false "Claude Code does not start in the image. Rerun setup-node.sh to build the image again. The error: $(claude --version 2>&1 | head -n 1)"
fi

# 2. The gateway: 16 tokens at most, so a drill key may run the check.
out="$(curl -sS -o "$T/gateway.json" -w '%{http_code} %{time_total}' --max-time 300 -X POST "$ANTHROPIC_BASE_URL/v1/messages" \
  -H "@$T/auth" -H "content-type: application/json" -H "anthropic-version: 2023-06-01" -H "x-recursica-check: 1" \
  -d '{"model": "porter-check", "max_tokens": 16, "messages": [{"role": "user", "content": "Reply with the word ok."}]}' 2>"$T/curl.err")"
code="${out%% *}"
secs="$(printf '%.1f' "${out#* }" 2>/dev/null || echo "?")"
said="$(jq -r '[.content[]? | select(.type == "text") | .text] | join(" ")' "$T/gateway.json" 2>/dev/null)"
if [ "$code" = 200 ] && [ -n "$said" ]; then
  part gateway true "200 in $secs s, model $(jq -r '.model // "unknown"' "$T/gateway.json")"
elif [ "$code" = 000 ]; then
  part gateway false "no answer from $ANTHROPIC_BASE_URL: $(head -n 1 "$T/curl.err")"
else
  part gateway false "$code $(jq -r '"\(.error.type // .error // "") \(.error.message // "")"' "$T/gateway.json" 2>/dev/null)"
fi

# 3. The token service.
if [ -z "${GITHUB_TOKEN_URL:-}" ]; then
  part token false "this stack has no token service (no GitHub Apps in site.json), so a port job cannot push"
else
  out="$(curl -sS -o "$T/token.json" -w '%{http_code}' --max-time 60 -X POST "$GITHUB_TOKEN_URL/check" \
    -H "@$T/auth" -H "content-type: application/json" -d "$(jq -n --arg r "$TARGET_REPO" '{repo: $r}')" 2>"$T/curl.err")"
  if [ "$out" = 200 ] && [ "$(jq -r '.ok' "$T/token.json")" = true ]; then
    part token true "$(jq -r '"\(.agent) may get a token for \(.repo) (installation \(.installation_id), \(.permissions | to_entries | map("\(.key) \(.value)") | join(", ")))"' "$T/token.json")"
  elif [ "$out" = 200 ]; then
    part token false "$(jq -r '.checks | to_entries | map(select(.value | type == "string")) | .[0] | "\(.key): \(.value)"' "$T/token.json")"
  elif [ "$out" = 404 ]; then
    part token false "the token service has no /check: upgrade the control computer (setup-host.sh)"
  elif [ "$out" = 000 ]; then
    part token false "no answer from $GITHUB_TOKEN_URL: $(head -n 1 "$T/curl.err")"
  else
    part token false "$out $(jq -r '"\(.error // "") \(.detail // "")"' "$T/token.json" 2>/dev/null)"
  fi
fi

jq -n --slurpfile i "$T/part-image.json" --slurpfile g "$T/part-gateway.json" --slurpfile t "$T/part-token.json" \
  '{image: $i[0], gateway: $g[0], token: $t[0]}' > "$WORK/check.json"
jq -r --arg repo "$TARGET_REPO" 'to_entries | map("- \(.key): \(if .value.ok then "pass" else "fail" end) (\(.value.detail))") | "Check job for \($repo)\n\n" + join("\n")' "$WORK/check.json" > "$PORTER_REPORT"
[ "$(jq '[.[] | .ok] | all' "$WORK/check.json")" = true ]
