#!/usr/bin/env bash
# The knowledge MCP server as a service on the control computer, from site.json's knowledge block
# (kit/knowledge.mjs; circlechat/README.md, "The knowledge MCP server"). setup-host.sh runs it as the
# owner, who has sudo. Safe to rerun: what exists is kept.
#
#   1. Two system accounts, with no login shell and no home: the server's, which only reads, and
#      the export account, which writes each export (kit/knowledge.mjs knowledgeAccounts).
#   2. The folders: /opt/recursica-knowledge for the exports, and /var/lib/recursica-knowledge for
#      the keys' hashes and the export account's work folder. Both belong to root.
#   3. The first export, when there is none: cluster/knowledge-export.mjs, as root, as the hourly
#      update job runs it. It needs install-cluster.sh's /etc/agent-cluster.conf, which names the
#      kit's repo; without the file, the first export waits for the update job.
#   4. A key for each caller (kit/knowledge-keys.mjs).
#   5. The service, as the server account, serving /opt/recursica-knowledge/current on 127.0.0.1 at
#      knowledge.port, read-only. Then a check: a request with no key gets 401.
# Without a knowledge block, the service is removed. The accounts, exports and key files stay.
#
#   knowledge-mcp.sh                 make what is missing
#   knowledge-mcp.sh --rotate <name> also a new key for the caller <name>
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROTATE=()
if [ "${1:-}" = --rotate ]; then ROTATE=(--rotate "${2:?usage: knowledge-mcp.sh [--rotate <caller>]}")
elif [ -n "${1:-}" ]; then echo "usage: knowledge-mcp.sh [--rotate <caller>]"; exit 2; fi
# shellcheck source=circlechat/kit/stack-paths.sh
. "$HERE/kit/stack-paths.sh"
CC_DIR="${CC_DIR:-$(stack_dir "$HOME")}"
SITE="${SITE:-$CC_DIR/site.json}"
# shellcheck source=circlechat/kit/lib.sh
. "$HERE/kit/lib.sh"
EXPORTS=/opt/recursica-knowledge
STATE=/var/lib/recursica-knowledge
UNIT=knowledge-mcp

[ "$(id -u)" != 0 ] || { echo "Run knowledge-mcp.sh as the account that owns the stacks, not as root."; exit 2; }
SETTINGS="$(node "$HERE/kit/knowledge.mjs" settings "$SITE")" || { echo "$SETTINGS"; exit 2; }
PORT="" SERVER="" EXPORTER=""
{ IFS= read -r PORT || true; IFS= read -r SERVER || true; IFS= read -r EXPORTER || true; } <<<"$SETTINGS"
if [ -z "$PORT" ]; then
  uninstall_unit "$UNIT" >/dev/null
  echo "site.json has no knowledge block: no knowledge MCP server."
  exit 0
fi

# The Node the service and the export run with. The server account can't read a home folder.
NODE="$(command -v node)"
NODE="$(cd "$(dirname "$NODE")" && pwd -P)/$(basename "$NODE")"
case "$NODE" in /Users/*|/home/*|/root/*) echo "node is $NODE, inside a home folder, which the knowledge server's account can't read. Install Node outside the home folders, such as in /opt/node or /usr/local."; exit 1 ;; esac

# 1. The accounts.
make_account() {
  local name="$1" real="$2" uid=""
  if id -u "$name" >/dev/null 2>&1; then return 0; fi
  if [ "$OS" = Darwin ]; then
    for n in $(seq 401 499); do
      if [ -z "$(dscl . -search /Users UniqueID "$n")" ] && [ -z "$(dscl . -search /Groups PrimaryGroupID "$n")" ]; then uid=$n; break; fi
    done
    [ -n "$uid" ] || { echo "No free id from 401 to 499 for $name."; return 1; }
    sudo dscl . -create "/Groups/$name" PrimaryGroupID "$uid"
    sudo dscl . -create "/Groups/$name" RealName "$real"
    sudo dscl . -create "/Users/$name"
    sudo dscl . -create "/Users/$name" UniqueID "$uid"
    sudo dscl . -create "/Users/$name" PrimaryGroupID "$uid"
    sudo dscl . -create "/Users/$name" UserShell /usr/bin/false
    sudo dscl . -create "/Users/$name" NFSHomeDirectory /var/empty
    sudo dscl . -create "/Users/$name" RealName "$real"
    sudo dscl . -create "/Users/$name" IsHidden 1
    sudo dscl . -create "/Users/$name" Password '*'
  else
    sudo useradd --system --user-group --home-dir /nonexistent --no-create-home --shell /usr/sbin/nologin "$name"
  fi
  echo "made the account $name"
}
make_account "$SERVER" "Recursica knowledge MCP server"
make_account "$EXPORTER" "Recursica knowledge export"

# 2. The folders.
ROOT_GROUP=root; [ "$OS" = Darwin ] && ROOT_GROUP=wheel
sudo install -d -m 755 -o root -g "$ROOT_GROUP" "$EXPORTS" "$STATE"
sudo install -d -m 700 -o "$EXPORTER" -g "$EXPORTER" "$STATE/export-home"

# 3. The first export.
# Every account can read the exports, so the checks need no sudo.
if [ ! -e "$EXPORTS/current" ]; then
  sudo env OWNER="$(id -un)" OWNER_HOME="$HOME" KIT="$(cd "$HERE/.." && pwd)" COMPUTER="$(hostname -s)" PATH="$(dirname "$NODE"):/usr/bin:/bin:/usr/sbin:/sbin" \
    "$NODE" "$HERE/cluster/knowledge-export.mjs" once ||
    echo "The first export of the knowledge repo failed (the lines above say why). The hourly update job tries again."
fi

# 4. The keys.
node "$HERE/kit/knowledge.mjs" callers "$SITE" | sudo "$NODE" "$HERE/kit/knowledge-keys.mjs" --group "$SERVER" ${ROTATE[@]+"${ROTATE[@]}"} ||
  echo "A key for the knowledge MCP server is missing (the lines above say why). Fix it, then run setup-host.sh again."

# 5. The service.
SERVED="$EXPORTS/current/tools/knowledge-mcp/server.mjs"
if [ ! -f "$SERVED" ]; then
  echo "The knowledge MCP server waits for the first export of the knowledge repo. The hourly update job makes it; then run setup-host.sh again."
  exit 0
fi
install_unit "$UNIT" "KNOWLEDGE_ROOT=$EXPORTS/current KNOWLEDGE_MCP_PORT=$PORT KNOWLEDGE_MCP_KEYS=$STATE/keys.json exec $NODE $SERVED --http" "$EXPORTS" "$SERVER"
code=""
for _ in $(seq 15); do
  code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 -X POST -H 'content-type: application/json' -d '{}' "http://127.0.0.1:$PORT/mcp" || true)"
  [ "$code" = 401 ] && break
  sleep 2
done
[ "$code" = 401 ] || { echo "The knowledge MCP server answered ${code:-nothing} on 127.0.0.1:$PORT to a request with no key, not 401. Read ${UNIT_LOG_DIR:-/tmp}/$UNIT.log, or journalctl -u $UNIT."; exit 1; }
echo "Knowledge MCP server: http://127.0.0.1:$PORT/mcp, serving $(basename "$(readlink "$EXPORTS/current")"), and a caller's key is required."
