#!/usr/bin/env bash
# Check how one agent behaves on a running CircleChat. Run it on the stack's control computer, by
# hand, after setup-agent.sh; setup-agent.sh never runs it. Safe to rerun.
# Usage: check-agent.sh <handle>
#
# It works in a private throwaway channel, on throwaway tasks, and archives them at the end
# (CHECK_KEEP=1 leaves them). Each check sends the agent a real request, so each one is a model
# turn, and the whole check can take tens of minutes. The four checks, the time limits and their
# settings are in kit/agent-check.mjs. One PASS, FAIL or SKIP line per check; exit 1 on any FAIL.
#
# What it needs:
#   - CircleChat's API: CC_API_BASE from the environment, else from $CC_DIR/.env, where
#     setup-host.sh writes it (http://localhost:<PORT>/api).
#   - The check's own CircleChat account: the email in site.json (site.check_account, or
#     agent-check@<site.public_host>), and CC_CHECK_PASSWORD from the stack's GitHub environment,
#     which the secrets deploy writes to $CC_DIR/agent-check.env. The account is a member of the
#     agents' workspace, never an admin, and locked except while a check runs: kit/check-account.mjs
#     unlocks the account (and makes it, or sets the role back to member), the check runs, and the
#     account is locked again on every way out, a failed check, an error or Ctrl-C included. The
#     password stays in the file: no argument, no environment variable and no output holds it.
set -euo pipefail

HANDLE="${1:?usage: check-agent.sh <handle>}"
if [ -n "${TENANT:-}" ]; then CC_DIR="${CC_DIR:-$HOME/tenants/$TENANT/circlechat}"; fi
CC_DIR="${CC_DIR:-$HOME/circlechat}"
SITE="${SITE:-$CC_DIR/site.json}"
HERE="$(cd "$(dirname "$0")" && pwd)"

CC_API_BASE="${CC_API_BASE:-$({ sed -n 's/^CC_API_BASE=//p' "$CC_DIR/.env" 2>/dev/null || true; } | tail -1)}"
[ -n "$CC_API_BASE" ] || { echo "No CC_API_BASE in the environment or in $CC_DIR/.env. Run setup-host.sh first, or set CC_API_BASE."; exit 2; }

CHECK_NODE="${CHECK_NODE:-node}"
account() { CC_DIR="$CC_DIR" SITE="$SITE" TENANT="${TENANT:-}" "$CHECK_NODE" "$HERE/kit/check-account.mjs" "$1"; }

# Locked again on every way out. A lock that fails is said loudly and fails the run.
LOCKED=false
lock_again() {
  [ "$LOCKED" = true ] && return 0
  LOCKED=true
  account lock || { echo "The check's account could NOT be locked again. Run: CC_DIR=$CC_DIR node $HERE/kit/check-account.mjs lock"; return 1; }
}
on_exit() {
  local code=$?
  lock_again || code=3
  exit "$code"
}
# A signal stops the check at once and locks: bash runs a trap only after the command in front
# finishes, so the check runs in the background and the shell waits for it.
CHILD=""
stop_check() { [ -z "$CHILD" ] || kill "$CHILD" 2>/dev/null || true; }
trap on_exit EXIT
trap 'stop_check; exit 130' INT
trap 'stop_check; exit 143' TERM HUP

# Unlock for this check: the account is made, or kept a member, and gets the delivered password.
# A failure says what is missing, and the account is locked again on the way out.
account unlock || exit 2

CC_API_BASE="$CC_API_BASE" CC_DIR="$CC_DIR" SITE="$SITE" "$CHECK_NODE" "$HERE/kit/agent-check.mjs" "$HANDLE" &
CHILD=$!
wait "$CHILD"
