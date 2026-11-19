# shellcheck shell=bash
# The server's CLI on a RecursicaChat 2.0 server, run as root. rc-check-agent.sh and rc-sync.sh
# source this file. The CLI switches to the data folder's owner itself (cli.ts session).
#
#   rc_cli <command> [args...]
# Needs RC_NODE, RC_APP and RC_DATA. RC_VAULT_KEY_FILE is the server's vault key file when the key
# sits outside the data folder, such as /etc/recursicachat/master.key. Root reads the file and hands
# the key to the CLI in CIRCLECHAT_MASTER_KEY: never in an argument, and never in this shell.
# Without RC_VAULT_KEY_FILE, the CLI reads <data>/master.key.
rc_cli() {
  local root=""
  [ "$(id -u)" = 0 ] || root=sudo
  # $root is unquoted on purpose: empty for root, so nothing is run in its place.
  ( cd / && $root /bin/sh -c "$RC_CLI_SCRIPT" rc-cli "${RC_VAULT_KEY_FILE:-}" "$RC_DATA" "$RC_NODE" "$RC_APP/server/src/cli.ts" "$@" )
}
RC_CLI_SCRIPT='k="$1"; d="$2"; shift 2
if [ -n "$k" ]; then
  [ -r "$k" ] || { echo "The vault key file $k is missing, or root cannot read it." >&2; exit 2; }
  CIRCLECHAT_MASTER_KEY="$(cat "$k")" || exit 2
  export CIRCLECHAT_MASTER_KEY
fi
CIRCLECHAT_DATA="$d"; export CIRCLECHAT_DATA
exec "$@"'
