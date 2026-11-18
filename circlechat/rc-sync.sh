#!/usr/bin/env bash
# Keep each agent on the stack's RecursicaChat 2.0 server in step with the kit and site.json: the
# instructions, the model, autonomy, the sandbox and the monthly budget (kit/rc-sync.mjs). Safe to
# rerun. setup-host.sh runs the script once, as the owner, and installs the hourly job, which runs
# the script as root.
# Usage: rc-sync.sh [--check]     --check reports what would change, and changes nothing
#
# The settings come from site.json's recursicachat block (circlechat/README.md, "Agents on
# RecursicaChat 2.0"). Without the block, the script does nothing.
#
# The session: the server's CLI, run as root, gives the sync's own account, a builder, a session of 5
# minutes and prints only the token. The token goes straight from the CLI into the sync through a
# pipe: no argument, environment variable, file or output holds the token. On every way out, a failed
# sync, an error or Ctrl-C included, the CLI ends every session of the account.
#
# As root (the hourly job), the script runs only the server's CLI as root. The sync itself, and the
# read of site.json, run as OWNER, the account that owns the stacks.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
CHECK=""
[ "${1:-}" = --check ] && CHECK=--check
CC_DIR="${CC_DIR:-$HOME/circlechat}"
SITE="${SITE:-$CC_DIR/site.json}"
KIT_NODE="${KIT_NODE:-$(command -v node || true)}"
[ -n "$KIT_NODE" ] && [ -x "$KIT_NODE" ] || { echo "No Node to run the sync. Set KIT_NODE."; exit 2; }

# The sync and the read of site.json run as the owner, never as root.
if [ "$(id -u)" = 0 ]; then
  [ -n "${OWNER:-}" ] && [ "$OWNER" != root ] || { echo "As root, set OWNER to the account that owns the stacks."; exit 2; }
  as_owner() { sudo -u "$OWNER" -H "$@"; }
else
  as_owner() { "$@"; }
fi

SETTINGS="$(as_owner "$KIT_NODE" "$HERE/kit/rc-sync.mjs" settings "$SITE")" || { echo "$SETTINGS"; exit 2; }
# $( ) drops trailing empty lines, so a setting left out at the end reads as empty.
RC_ACCOUNT="" RC_URL="" RC_APP="" RC_DATA="" RC_VAULT_KEY_FILE="" RC_NODE=""
{ IFS= read -r RC_ACCOUNT || true; IFS= read -r RC_URL || true; IFS= read -r RC_APP || true
  IFS= read -r RC_DATA || true; IFS= read -r RC_VAULT_KEY_FILE || true; IFS= read -r RC_NODE || true; } <<<"$SETTINGS"
[ -n "$RC_ACCOUNT" ] || { echo "site.json has no recursicachat block: no RecursicaChat 2.0 server to sync."; exit 0; }
RC_NODE="${RC_NODE:-$KIT_NODE}"
export RC_ACCOUNT RC_URL RC_APP RC_DATA RC_VAULT_KEY_FILE RC_NODE

# The server's CLI needs Node 24 or newer, outside the server's folder: the server's own Node is the
# server account's alone.
case "$RC_NODE" in "$(dirname "$RC_APP")"/*) echo "recursicachat.node is inside the server's folder. Use a Node 24 outside the folder."; exit 2 ;; esac
[ -x "$RC_NODE" ] || { echo "$RC_NODE is not a Node this account can run. Set recursicachat.node in site.json."; exit 2; }
major="$("$RC_NODE" -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"
[ "$major" -ge 24 ] || { echo "The server's CLI needs Node 24 or newer, and $RC_NODE is Node $major. Set recursicachat.node in site.json to a Node 24."; exit 2; }

. "$HERE/kit/rc-cli.sh"

# Ended on every way out. A failure to end the sessions is said loudly and fails the run.
ENDED=false
end_sessions() {
  [ "$ENDED" = true ] && return 0
  ENDED=true
  rc_cli end-sessions "$RC_ACCOUNT" >/dev/null || { echo "The sync's sessions could NOT be ended. Run: sudo env CIRCLECHAT_DATA=$RC_DATA <node 24> $RC_APP/server/src/cli.ts end-sessions <account>"; return 1; }
}
on_exit() {
  local code=$?
  end_sessions || code=3
  exit "$code"
}
CHILD=""
stop_sync() { [ -z "$CHILD" ] || kill "$CHILD" 2>/dev/null || true; }
trap on_exit EXIT
trap 'stop_sync; exit 130' INT
trap 'stop_sync; exit 143' TERM HUP

# Not root: sudo asks for the password here, before the pipe, so the prompt never mixes with the output.
[ "$(id -u)" = 0 ] || sudo -v

{ rc_cli session "$RC_ACCOUNT" --minutes 5 | as_owner env RC_URL="$RC_URL" "$KIT_NODE" "$HERE/kit/rc-sync.mjs" sync $CHECK "$SITE"; } &
CHILD=$!
wait "$CHILD"
