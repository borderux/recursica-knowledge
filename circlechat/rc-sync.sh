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
# Each agent's model key, first, as root: the agent's own gateway handle, rc-<handle>, never a 1.x
# agent's handle, and the agent's own provider on the server, gw-<handle>. When the provider's stored
# key is the key the gateway records for rc-<handle>, the step only refreshes the provider's address
# and models. Otherwise the step issues a new key, checks the key on the gateway, and pipes the key
# into the server's CLI (kit/rc-gateway-key.mjs, cli.ts set-provider). No argument, environment
# variable, file, clipboard or output line ever holds the key.
#
# As root (the hourly job), the script runs only the server's CLI and the key step as root. The sync
# itself, and the read of site.json, run as OWNER, the account that owns the stacks.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
CHECK=""
[ "${1:-}" = --check ] && CHECK=--check
CC_DIR="${CC_DIR:-$HOME/circlechat}"
GW_STATE="${GW_STATE:-$CC_DIR/gateway-state}"
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
RC_ACCOUNT="" RC_URL="" RC_APP="" RC_DATA="" RC_VAULT_KEY_FILE="" RC_NODE="" GW_URL=""
{ IFS= read -r RC_ACCOUNT || true; IFS= read -r RC_URL || true; IFS= read -r RC_APP || true
  IFS= read -r RC_DATA || true; IFS= read -r RC_VAULT_KEY_FILE || true; IFS= read -r RC_NODE || true
  IFS= read -r GW_URL || true; } <<<"$SETTINGS"
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

# The key step, as root: kit/rc-gateway-key.mjs reads and writes the gateway's key records.
as_root() { if [ "$(id -u)" = 0 ]; then "$@"; else sudo "$@"; fi; }
gw_key() { as_root "$KIT_NODE" "$HERE/kit/rc-gateway-key.mjs" "$@"; }
AGENTS="$(as_owner "$KIT_NODE" "$HERE/kit/rc-sync.mjs" agents "$SITE")" || { echo "$AGENTS"; exit 2; }
KEY_FAILED=0
# The list comes in on descriptor 3, so no command in the loop can read the list's next lines.
while IFS=$'\t' read -r -u 3 h gw provider model routes; do
  [ -n "$h" ] || continue
  stored="$(rc_cli provider-key-hash "$provider")" || { echo "$h: FAILED: the server's CLI could not read $provider."; KEY_FAILED=1; continue; }
  recorded="$(gw_key hash "$GW_STATE" "$gw")" || { echo "$h: FAILED: the gateway's key records could not be read."; KEY_FAILED=1; continue; }
  if [ -n "$stored" ] && [ "$stored" = "$recorded" ]; then
    if [ -n "$CHECK" ]; then echo "$h: the gateway key in $provider is current"; continue; fi
    # Empty stdin keeps the stored key, and refreshes the address and the models.
    rc_cli set-provider "$provider" --base-url "$GW_URL" --models "$routes" </dev/null 2>/dev/null \
      || { echo "$h: FAILED: $provider could not be refreshed."; KEY_FAILED=1; }
    continue
  fi
  if [ -n "$CHECK" ]; then echo "$h: would issue a new gateway key for $gw, and set it in $provider"; continue; fi
  if gw_key issue "$GW_STATE" "$gw" "$GW_URL" "$model" "$routes" | rc_cli set-provider "$provider" --base-url "$GW_URL" --models "$routes"; then
    echo "$h: issued a new gateway key for $gw, and set it in $provider"
  else
    echo "$h: FAILED: no new key reached $provider (the lines above say why)."; KEY_FAILED=1
  fi
done 3<<<"$AGENTS"

{ rc_cli session "$RC_ACCOUNT" --minutes 5 | as_owner env RC_URL="$RC_URL" "$KIT_NODE" "$HERE/kit/rc-sync.mjs" sync $CHECK "$SITE"; } &
CHILD=$!
wait "$CHILD" || exit $?
exit "$KEY_FAILED"
