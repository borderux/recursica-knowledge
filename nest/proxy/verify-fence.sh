#!/bin/sh
# Check the launcher's side of the per-community fence: is every community mapped, and is
# every fence logged in and exposing only the servers you meant it to.
#
# It deliberately does NOT check the running processes. bin/check-agent-fence-live.sh
# already reads CLAUDE_CONFIG_DIR out of every live agent process and names the agent and
# community — run that one after arming, and this one before.
#
# Exit 0 means every community Buzz has spawned has a map entry and every fence is logged
# in. Anything else is a finding.
set -u
DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PIDS_DIR="$HOME/Library/Application Support/xyz.block.buzz.app/agents/agent-pids"
rc=0

# Buzz writes one file per (pubkey, relayUrl) it has spawned, so this is the complete list
# of communities an agent runs in. `ps` and launcher.log are not: a community whose agent is
# asleep right now appears in neither, and a community missing from communities.map does not
# error — it silently gets the empty registry.
printf '=== communities with no map entry ===\n'
if [ ! -d "$PIDS_DIR" ]; then
  echo "  cannot tell — Buzz Desktop has not started an agent on this machine"
else
  missing=0
  for p in "$PIDS_DIR"/*.json; do
    [ -f "$p" ] || continue
    relay=$(python3 -c "import json,sys;print(json.load(open(sys.argv[1]))['key']['relayUrl'])" "$p")
    host=$(printf '%s' "$relay" | sed -e 's|^[a-z]*://||' -e 's|[:/].*$||')
    [ -n "$host" ] || continue
    if ! grep -q "^$host	" "$DIR/communities.map" 2>/dev/null; then
      printf '  %s -> falls through to the deny-all _unknown fence\n' "$host"
      missing=1
      rc=1
    fi
  done
  [ "$missing" -eq 0 ] && echo "  none"
fi

for d in "$DIR"/fences/*/; do
  f=$(basename "$d")
  printf '\n=== fence: %s ===\n' "$f"
  # loggedIn:false is the single most common reason a freshly armed fence produces an agent
  # that answers "Authentication required" to everything, on every community at once.
  CLAUDE_CONFIG_DIR="$d" claude auth status 2>&1 | grep -E '"loggedIn"|"authMethod"' || rc=1
  echo "servers:"
  # `claude mcp list` starts every server to report its health, so a fence naming a server
  # that hangs would hang this script. Bound it.
  CLAUDE_CONFIG_DIR="$d" perl -e 'alarm 90; exec @ARGV or die' -- claude mcp list 2>&1 \
    | grep -vE '^Checking|^$' | sed 's/^/  /'
done

printf '\n%s\n' "$( [ $rc -eq 0 ] \
  && echo 'OK — now run bin/check-agent-fence-live.sh to see which processes carry it' \
  || echo 'ATTENTION: a community is unmapped or a fence is signed out' )"
exit $rc
