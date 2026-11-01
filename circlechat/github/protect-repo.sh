#!/usr/bin/env bash
# Sets up each repo named on the command line like the plan repos:
#
#   - The "Protect main" ruleset: no deletion and no force push on the default branch, and each
#     change arrives in a pull request.
#   - The "Only admins merge" ruleset: only a repo admin merges a pull request into the default
#     branch, and nobody pushes to the branch.
#   - Secret scanning, with push protection.
#   - Dependabot alerts and Dependabot security updates.
#   - A read-only workflow token, which can't approve a pull request.
#   - Automatic deletion of a pull request's branch after the merge.
#   - Forking off, for a private repo.
#   - A pull request that adds .github/dependabot.yml, for the package systems in the repo, when
#     the repo has no dependabot.yml yet.
#
# Then the script reads each setting back from GitHub, and prints a table. A ruleset with the same
# name, in any case, is updated in place. The script changes only the repos on the command line:
# each call that changes a setting goes through change(), which refuses any other repo.
#
#   bash circlechat/github/protect-repo.sh <owner>/<repo> [<owner>/<repo> ...]
#
# Run the script in a separate terminal. The script asks for a GitHub token with a one-day
# expiry, and keeps the token only in GH_TOKEN, for the script's gh calls. A fine-grained token needs
# these permissions on each repo: Administration, Contents and Pull requests (read and write), and
# Secret scanning alerts (read). Revoke the token after the run.
set -uo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
HELPER="$HERE/protect-repo.mjs"
BRANCH_NAME=add-dependabot-config

[ $# -gt 0 ] || { echo "usage: protect-repo.sh <owner>/<repo> [<owner>/<repo> ...]"; exit 2; }
REPOS=()
for r in "$@"; do
  [[ "$r" =~ ^[A-Za-z0-9-]+/[A-Za-z0-9._-]+$ ]] || { echo "\"$r\" is not <owner>/<repo>. Nothing was changed."; exit 2; }
  case " ${REPOS[*]-} " in *" $r "*) ;; *) REPOS+=("$r") ;; esac
done
for c in gh node jq base64; do command -v "$c" >/dev/null || { echo "This script needs $c."; exit 1; }; done

# The token: typed with no echo, kept only in GH_TOKEN, and removed when the script exits for any
# reason. gh gets an empty settings folder for the run, so gh never reads or saves this
# computer's gh login.
GH_CONFIG_DIR="$(mktemp -d)"; export GH_CONFIG_DIR
export GH_PROMPT_DISABLED=1
trap 'unset GH_TOKEN TOKEN; rm -rf "$GH_CONFIG_DIR"' EXIT
read -rsp "GitHub token (one-day expiry): " TOKEN; echo
[ -n "$TOKEN" ] || { echo "No token given. Nothing was changed."; exit 1; }
export GH_TOKEN="$TOKEN"; unset TOKEN
ME="$(gh api user --jq .login 2>/dev/null)" || { echo "GitHub refused the token. Nothing was changed."; exit 1; }
echo "Signed in as $ME."

# The one way to change a repo: change <repo> <method> <path in the repo> [gh api arguments].
change() {
  local repo="$1" method="$2" sub="$3"; shift 3
  case " ${REPOS[*]} " in *" $repo "*) ;; *) echo "Refused: $repo is not on the command line." >&2; return 1 ;; esac
  gh api -X "$method" "repos/$repo$sub" "$@"
}
# The last line of a failed call, for the table.
why() { local s="${1//$'\n'/ }"; printf '%s' "${s:0:120}"; }

ROWS=()
row() { ROWS+=("$1|$2|$3|$4"); [ "$4" = ok ] || [ "$4" = "n/a" ] || FAILED=$((FAILED + 1)); }
FAILED=0

for repo in "${REPOS[@]}"; do
  echo
  echo "== $repo"
  if ! info="$(gh api "repos/$repo" 2>&1)"; then
    row "$repo" "repo" "cannot read: $(why "$info")" FAILED; continue
  fi
  branch="$(jq -r .default_branch <<<"$info")"
  private="$(jq -r .private <<<"$info")"

  # The two rulesets: update the one with the same name, in any case, or add one.
  existing="$(gh api "repos/$repo/rulesets?includes_parents=false" --paginate --jq '.[] | "\(.id)\t\(.name)"' 2>/dev/null)"
  for name in "Protect main" "Only admins merge"; do
    id="$(awk -F'\t' -v n="$name" 'tolower($2) == tolower(n) { print $1; exit }' <<<"$existing")"
    if [ -n "$id" ]; then
      out="$(node "$HELPER" ruleset "$name" | change "$repo" PUT "/rulesets/$id" --input - --silent 2>&1)" || echo "   ruleset \"$name\": $(why "$out")"
    else
      out="$(node "$HELPER" ruleset "$name" | change "$repo" POST "/rulesets" --input - --silent 2>&1)" || echo "   ruleset \"$name\": $(why "$out")"
    fi
  done

  # Secret scanning with push protection. Each setting gets a separate call, so one refusal leaves
  # the other settings in place.
  out="$(printf '%s' '{"security_and_analysis":{"secret_scanning":{"status":"enabled"},"secret_scanning_push_protection":{"status":"enabled"}}}' \
    | change "$repo" PATCH "" --input - --silent 2>&1)" || echo "   secret scanning: $(why "$out")"
  out="$(change "$repo" PATCH "" -F delete_branch_on_merge=true --silent 2>&1)" || echo "   branch deletion: $(why "$out")"
  if [ "$private" = true ]; then
    out="$(change "$repo" PATCH "" -F allow_forking=false --silent 2>&1)" || echo "   forking: $(why "$out")"
  fi
  # Security updates need the alerts on first.
  out="$(change "$repo" PUT "/vulnerability-alerts" --silent 2>&1)" || echo "   Dependabot alerts: $(why "$out")"
  out="$(change "$repo" PUT "/automated-security-fixes" --silent 2>&1)" || echo "   security updates: $(why "$out")"
  out="$(change "$repo" PUT "/actions/permissions/workflow" -f default_workflow_permissions=read -F can_approve_pull_request_reviews=false --silent 2>&1)" \
    || echo "   workflow token: $(why "$out")"

  # The dependabot.yml, in a pull request, for the package systems in the default branch's files.
  if gh api "repos/$repo/contents/.github/dependabot.yml?ref=$branch" --silent 2>/dev/null; then
    dependabot="already in the repo"; dstate=ok
  elif pr="$(gh api "repos/$repo/pulls?state=open&head=${repo%%/*}:$BRANCH_NAME" --jq '.[0].html_url // empty' 2>/dev/null)" && [ -n "$pr" ]; then
    dependabot="pull request open: $pr"; dstate=ok
  else
    yaml="$(gh api "repos/$repo/git/trees/$branch?recursive=1" --jq '.tree[] | select(.type == "blob") | .path' 2>/dev/null | node "$HELPER" dependabot)"
    if [ -z "$yaml" ]; then
      dependabot="no package system found"; dstate="n/a"
    else
      systems="$(grep -E '^  - package-ecosystem: ' <<<"$yaml" | awk '{ print $3 }' | paste -sd, - | sed 's/,/, /g')"
      sha="$(gh api "repos/$repo/git/ref/heads/$branch" --jq .object.sha 2>&1)"
      # A branch left from an earlier run is reused.
      change "$repo" POST "/git/refs" -f "ref=refs/heads/$BRANCH_NAME" -f "sha=$sha" --silent >/dev/null 2>&1 || true
      content="$(printf '%s' "$yaml" | base64 | tr -d '\n')"
      if ! out="$(change "$repo" PUT "/contents/.github/dependabot.yml" -f "message=Add dependabot.yml for $systems" \
          -f "content=$content" -f "branch=$BRANCH_NAME" --silent 2>&1)"; then
        dependabot="FAILED: $(why "$out")"; dstate=FAILED
      elif ! pr="$(change "$repo" POST "/pulls" -f "title=Add dependabot.yml for $systems" -f "head=$BRANCH_NAME" -f "base=$branch" \
          -f "body=Dependabot version updates for $systems: daily, with a 7-day cooldown, and one pull request for each package system. Security updates skip the cooldown." \
          --jq .html_url 2>&1)"; then
        dependabot="FAILED: $(why "$pr")"; dstate=FAILED
      else
        dependabot="pull request opened: $pr"; dstate=ok
      fi
    fi
  fi

  # Each setting, read back from GitHub.
  info="$(gh api "repos/$repo" 2>/dev/null || echo '{}')"
  rules="$(gh api "repos/$repo/rulesets?includes_parents=false" --paginate --jq '.[] | "\(.name)\t\(.enforcement)"' 2>/dev/null)"
  for name in "Protect main" "Only admins merge"; do
    v="$(awk -F'\t' -v n="$name" 'tolower($1) == tolower(n) { print $2; exit }' <<<"$rules")"
    row "$repo" "Ruleset \"$name\"" "${v:-missing}" "$([ "$v" = active ] && echo ok || echo FAILED)"
  done
  for k in secret_scanning secret_scanning_push_protection; do
    v="$(jq -r ".security_and_analysis.$k.status // \"unknown\"" <<<"$info")"
    row "$repo" "$([ "$k" = secret_scanning ] && echo "Secret scanning" || echo "Push protection")" "$v" "$([ "$v" = enabled ] && echo ok || echo FAILED)"
  done
  if gh api "repos/$repo/vulnerability-alerts" --silent 2>/dev/null; then v=on; else v=off; fi
  row "$repo" "Dependabot alerts" "$v" "$([ "$v" = on ] && echo ok || echo FAILED)"
  v="$(gh api "repos/$repo/automated-security-fixes" --jq 'if .enabled then "on" else "off" end' 2>/dev/null || echo unknown)"
  row "$repo" "Dependabot security updates" "$v" "$([ "$v" = on ] && echo ok || echo FAILED)"
  v="$(gh api "repos/$repo/actions/permissions/workflow" --jq '"\(.default_workflow_permissions), approves pull requests: \(.can_approve_pull_request_reviews)"' 2>/dev/null || echo unknown)"
  row "$repo" "Workflow token" "$v" "$([ "$v" = "read, approves pull requests: false" ] && echo ok || echo FAILED)"
  v="$(jq -r '.delete_branch_on_merge // "unknown"' <<<"$info")"
  row "$repo" "Delete branch after merge" "$v" "$([ "$v" = true ] && echo ok || echo FAILED)"
  v="$(jq -r 'if .allow_forking == null then "unknown" else (.allow_forking | tostring) end' <<<"$info")"
  if [ "$(jq -r .private <<<"$info")" = true ]; then
    row "$repo" "Forking" "$([ "$v" = false ] && echo off || echo "$v")" "$([ "$v" = false ] && echo ok || echo FAILED)"
  else
    row "$repo" "Forking" "public repo: left as is ($v)" "n/a"
  fi
  row "$repo" "dependabot.yml" "$dependabot" "$dstate"
done

echo
echo "| Repo | Setting | Value from GitHub | Result |"
echo "| --- | --- | --- | --- |"
for r in "${ROWS[@]}"; do
  IFS='|' read -r a b c d <<<"$r"
  echo "| $a | $b | $c | $d |"
done
echo
if [ "$FAILED" -gt 0 ]; then
  echo "$FAILED setting(s) failed. Revoke the token now."
  exit 1
fi
echo "Every setting is in place. Revoke the token now."
