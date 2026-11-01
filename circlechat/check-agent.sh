#!/usr/bin/env bash
# Check how one agent behaves on a running CircleChat, as a person would see it. Run it after
# setup-agent.sh, as its own command; setup-agent.sh never runs it. Safe to rerun.
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
#   - A person's account in the agent's workspace, ideally an admin, who can see each run's error:
#     CHECK_SESSION (the cc_session cookie's value), or CHECK_EMAIL and CHECK_PASSWORD. Each comes
#     from the environment, else from $CC_DIR/.env, else, in a terminal, from a prompt. The values
#     reach the check in its environment only, never an argument or the output.
set -euo pipefail

HANDLE="${1:?usage: check-agent.sh <handle>}"
if [ -n "${TENANT:-}" ]; then CC_DIR="${CC_DIR:-$HOME/tenants/$TENANT/circlechat}"; fi
CC_DIR="${CC_DIR:-$HOME/circlechat}"
HERE="$(cd "$(dirname "$0")" && pwd)"

# One value from $CC_DIR/.env, or nothing.
from_env_file() { { sed -n "s/^$1=//p" "$CC_DIR/.env" 2>/dev/null || true; } | tail -1; }

CC_API_BASE="${CC_API_BASE:-$(from_env_file CC_API_BASE)}"
[ -n "$CC_API_BASE" ] || { echo "No CC_API_BASE in the environment or in $CC_DIR/.env. Run setup-host.sh first, or set CC_API_BASE."; exit 2; }
CHECK_SESSION="${CHECK_SESSION:-$(from_env_file CHECK_SESSION)}"
if [ -z "$CHECK_SESSION" ]; then
  CHECK_EMAIL="${CHECK_EMAIL:-$(from_env_file CHECK_EMAIL)}"
  CHECK_PASSWORD="${CHECK_PASSWORD:-$(from_env_file CHECK_PASSWORD)}"
  if { [ -z "$CHECK_EMAIL" ] || [ -z "$CHECK_PASSWORD" ]; } && [ -t 0 ]; then
    [ -n "$CHECK_EMAIL" ] || read -r -p "CircleChat email of a person in @$HANDLE's workspace: " CHECK_EMAIL
    [ -n "$CHECK_PASSWORD" ] || { read -r -s -p "Password: " CHECK_PASSWORD; echo; }
  fi
  [ -n "$CHECK_EMAIL" ] && [ -n "$CHECK_PASSWORD" ] || { echo "No person to check as: set CHECK_SESSION, or CHECK_EMAIL and CHECK_PASSWORD."; exit 2; }
fi

CC_API_BASE="$CC_API_BASE" CHECK_SESSION="${CHECK_SESSION:-}" CHECK_EMAIL="${CHECK_EMAIL:-}" CHECK_PASSWORD="${CHECK_PASSWORD:-}" \
  exec node "$HERE/kit/agent-check.mjs" "$HANDLE"
