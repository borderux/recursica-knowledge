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
#     agents' workspace, never an admin. First, kit/check-account.mjs makes the account when the
#     account is missing, and sets the role back to member when the role changed. The password
#     stays in the file: no argument, no environment variable and no output holds the password.
set -euo pipefail

HANDLE="${1:?usage: check-agent.sh <handle>}"
if [ -n "${TENANT:-}" ]; then CC_DIR="${CC_DIR:-$HOME/tenants/$TENANT/circlechat}"; fi
CC_DIR="${CC_DIR:-$HOME/circlechat}"
SITE="${SITE:-$CC_DIR/site.json}"
HERE="$(cd "$(dirname "$0")" && pwd)"

CC_API_BASE="${CC_API_BASE:-$({ sed -n 's/^CC_API_BASE=//p' "$CC_DIR/.env" 2>/dev/null || true; } | tail -1)}"
[ -n "$CC_API_BASE" ] || { echo "No CC_API_BASE in the environment or in $CC_DIR/.env. Run setup-host.sh first, or set CC_API_BASE."; exit 2; }

# The account first: made, or kept a member. A failure says what is missing.
CC_DIR="$CC_DIR" SITE="$SITE" TENANT="${TENANT:-}" node "$HERE/kit/check-account.mjs" || exit 2

CC_API_BASE="$CC_API_BASE" CC_DIR="$CC_DIR" SITE="$SITE" exec node "$HERE/kit/agent-check.mjs" "$HANDLE"
