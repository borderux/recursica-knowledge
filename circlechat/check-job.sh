#!/usr/bin/env bash
# The check-job drill: tests the whole port-job path to one node's job runner, without touching a
# repository. Run it on the stack's control computer, as the stack's owner, once for each node with
# a jobs block in site.json. Safe to rerun.
# Usage: check-job.sh <node> [--repo <clone URL>] [--minutes <1-240>]
#
# The drill:
#   1. Gets a drill key with sudo (gateway/keys.mjs drill). The gateway's state folder stays
#      root's: the key's files get the folder's owner. A drill key is Porter's key for a check job
#      only, with no real task, and ends after 15 minutes (--minutes, 240 at most).
#   2. Sends a check job to the node's job runner, and prints one PASS or FAIL line per part:
#      jobd, image, gateway and token (kit/check-job.mjs, jobd/porter-job/check.sh).
#   3. Revokes the drill key, also after a failure or Ctrl-C.
# Exits 0 when every part passes, 1 when a part fails, and 2 for a wrong setting.
set -euo pipefail

NODE="${1:?usage: check-job.sh <node> [--repo <clone URL>] [--minutes <1-240>]}"
shift
REPO=""; MINUTES=15
while [ $# -gt 0 ]; do
  case "$1" in
    --repo) REPO="${2:?--repo needs a clone URL}"; shift 2 ;;
    --minutes) MINUTES="${2:?--minutes needs a number}"; shift 2 ;;
    *) echo "usage: check-job.sh <node> [--repo <clone URL>] [--minutes <1-240>]"; exit 2 ;;
  esac
done
if [ -n "${TENANT:-}" ]; then CC_DIR="${CC_DIR:-$HOME/tenants/$TENANT/circlechat}"; fi
CC_DIR="${CC_DIR:-$HOME/circlechat}"
SITE="${SITE:-$CC_DIR/site.json}"
HERE="$(cd "$(dirname "$0")" && pwd)"
GW_STATE="$CC_DIR/gateway-state"
NODE_BIN="$(command -v node)"
SUDO="${SUDO-sudo}"   # empty in the tests

[ -f "$SITE" ] || { echo "No site.json at $SITE. Set CC_DIR or SITE."; exit 2; }
# On Linux only root reads the state folder (setup-host.sh). A Mac's Docker runs in Colima's VM,
# so there the folder is the stack owner's.
# CHECK_JOB_ANY_OWNER skips this check, for the tests.
if [ "$(uname)" = Linux ] && [ -z "${CHECK_JOB_ANY_OWNER:-}" ] && [ -r "$GW_STATE/task-key.secret" ] && [ "$(id -u)" != 0 ]; then
  echo "$GW_STATE is readable without sudo. Rerun setup-host.sh, which makes the folder root's."; exit 2
fi

DRILL="$($SUDO "$NODE_BIN" "$HERE/gateway/keys.mjs" drill "$GW_STATE" porter "$NODE" "$MINUTES")" || exit 2
ID="$(printf '%s' "$DRILL" | "$NODE_BIN" -e 'process.stdout.write(JSON.parse(require("fs").readFileSync(0, "utf8")).id)')"
revoke() {
  $SUDO "$NODE_BIN" "$HERE/gateway/keys.mjs" revoke-key "$GW_STATE" "$ID" 2>/dev/null \
    || echo "Revoke the drill key by hand: sudo node $HERE/gateway/keys.mjs revoke-key $GW_STATE $ID"
}
trap revoke EXIT

status=0
printf '%s' "$DRILL" | SITE="$SITE" CC_DIR="$CC_DIR" "$NODE_BIN" "$HERE/kit/check-job.mjs" "$NODE" ${REPO:+--repo "$REPO"} || status=$?
exit "$status"
