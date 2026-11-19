#!/usr/bin/env bash
# Check how one agent behaves on a RecursicaChat 2.0 server. Run it by hand, on the computer that
# runs the server, as the computer's owner. It asks for sudo once, for the server's CLI. Safe to
# rerun. The four checks are in kit/rc-agent-check.mjs.
# Usage: rc-check-agent.sh <handle>
#
# What it needs, from the environment:
#   RC_CHECK_EMAIL  the check's own RecursicaChat account: a member or a builder, never an owner or
#                   an admin (the server's CLI refuses those)
#   RC_URL          the server (http://127.0.0.1:3100)
#   RC_APP          the server's app folder (/opt/recursicachat/app)
#   RC_DATA         the server's data folder, CIRCLECHAT_DATA (/opt/recursicachat/data)
#   RC_NODE         the Node that runs the server's CLI: one the owner's account can run, such as
#                   the owner's own (the node on PATH). Never the server's own Node, which only the
#                   server's account can run.
#   RC_VAULT_KEY_FILE  the server's vault key file, when the key sits outside the data folder, such
#                   as /etc/recursicachat/master.key (kit/rc-cli.sh). Unset: the CLI reads
#                   <data>/master.key.
#   CHECK_*         the check's settings, in kit/rc-agent-check.mjs
#
# The session: the server's CLI, run as root, gives the account a session of at most an hour and
# prints only its token. The token goes straight from the CLI into the check through a pipe: no
# argument, no environment variable, no file and no output holds it. On every way out, a failed
# check, an error or Ctrl-C included, the CLI ends every session of the account.
set -euo pipefail

HANDLE="${1:?usage: rc-check-agent.sh <handle>}"
HERE="$(cd "$(dirname "$0")" && pwd)"
: "${RC_CHECK_EMAIL:?Set RC_CHECK_EMAIL to the account the check signs in as, a member or a builder.}"
RC_URL="${RC_URL:-http://127.0.0.1:3100}"
RC_APP="${RC_APP:-/opt/recursicachat/app}"
RC_DATA="${RC_DATA:-/opt/recursicachat/data}"
RC_NODE="${RC_NODE:-$(command -v node || true)}"
CHECK_NODE="${CHECK_NODE:-node}"
case "$RC_NODE" in "$(dirname "$RC_APP")"/*) echo "RC_NODE is inside the server's folder. Use a Node the owner's account can run."; exit 2 ;; esac
[ -n "$RC_NODE" ] && [ -x "$RC_NODE" ] || { echo "RC_NODE is not a Node this account can run. Set RC_NODE to one."; exit 2; }

# The server's CLI, as root (kit/rc-cli.sh). It switches to the data folder's owner itself.
. "$HERE/kit/rc-cli.sh"
cli() { rc_cli "$@"; }

# Ended on every way out. A failure to end the sessions is said loudly and fails the run.
ENDED=false
end_sessions() {
  [ "$ENDED" = true ] && return 0
  ENDED=true
  cli end-sessions "$RC_CHECK_EMAIL" >/dev/null || { echo "The check's sessions could NOT be ended. Run: sudo env CIRCLECHAT_DATA=$RC_DATA <node> $RC_APP/server/src/cli.ts end-sessions <email>"; return 1; }
}
on_exit() {
  local code=$?
  end_sessions || code=3
  exit "$code"
}
# A signal stops the check at once and ends the sessions: bash runs a trap only after the command
# in front finishes, so the check runs in the background and the shell waits for it.
CHILD=""
stop_check() { [ -z "$CHILD" ] || kill "$CHILD" 2>/dev/null || true; }
trap on_exit EXIT
trap 'stop_check; exit 130' INT
trap 'stop_check; exit 143' TERM HUP

# sudo asks for the password here, before the pipe, so its prompt never mixes with the check's output.
sudo -v

{ cli session "$RC_CHECK_EMAIL" --minutes 60 | RC_URL="$RC_URL" "$CHECK_NODE" "$HERE/kit/rc-agent-check.mjs" "$HANDLE"; } &
CHILD=$!
wait "$CHILD"
