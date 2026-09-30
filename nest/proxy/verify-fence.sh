#!/bin/sh
# Check the launcher's side of the per-agent, per-community fence: is every community
# mapped, does every agent have a directory, and is every fence logged in.
#
# It deliberately does NOT check the running processes. bin/check-agent-fence-live.sh
# already reads CLAUDE_CONFIG_DIR out of every live agent process and names the agent and
# community — run that one after arming, and this one before.
#
# Exit 0 means nothing falls through a fallback unintentionally and every fence is logged
# in. Anything else is a finding.
set -u
DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
REG="$HOME/Library/Application Support/xyz.block.buzz.app/agents"
rc=0

# Buzz writes one file per (pubkey, relayUrl) it has spawned, so between that and the agent
# registry this is the complete list of (agent, community) pairs on this machine. `ps` and
# launcher.log are not: a community whose agent is asleep appears in neither, and neither a
# missing map entry nor a missing agent directory produces an error — the first silently
# gets the empty registry, the second silently gets _default.
printf '=== agent/community pairs Buzz has spawned ===\n'
if [ ! -d "$REG/agent-pids" ]; then
  echo "  cannot tell — Buzz Desktop has not started an agent on this machine"
  rc=1
else
  python3 - "$REG" "$DIR" <<'PY' || rc=1
import json, glob, os, re, sys
reg, proxy = sys.argv[1], sys.argv[2]
names = {r['pubkey']: r['name'] for r in json.load(open(f'{reg}/managed-agents.json')) if r.get('pubkey')}

def slug(s):
    return re.sub(r'-$', '', re.sub(r'^-', '', re.sub(r'[^a-z0-9]+', '-', (s or '').lower()))) or '_default'

fences = {}
for line in open(f'{proxy}/communities.map', encoding='utf-8') if os.path.exists(f'{proxy}/communities.map') else []:
    if line.startswith('#') or not line.strip():
        continue
    parts = line.rstrip('\n').split('\t')
    if len(parts) >= 2:
        fences[parts[0]] = parts[1]

bad = 0
seen = set()
for p in sorted(glob.glob(f'{reg}/agent-pids/*.json')):
    d = json.load(open(p))
    k = d['key']
    host = re.sub(r'[:/].*$', '', re.sub(r'^[a-z]+://', '', k['relayUrl']))
    agent = slug(names.get(k['pubkey'], ''))
    if (agent, host) in seen:
        continue
    seen.add((agent, host))
    fence = fences.get(host)
    if fence is None:
        print(f'  {agent:<14} {host:<38} UNMAPPED COMMUNITY -> deny-all _unknown')
        bad += 1
        continue
    # Same order the launcher uses. Keep the two in step: a checker that resolves
    # differently from the thing it checks is worse than no checker.
    for rel in (f'fences/{fence}/{agent}',
                f'fences/_shared/{agent}',
                f'claude-config-{agent}-{fence}',
                f'claude-config-{agent}'):
        if os.path.isdir(f'{proxy}/{rel}'):
            note = '  (legacy)' if rel.startswith('claude-config-') else ''
            print(f'  {agent:<14} {host:<38} -> {rel}{note}')
            break
    else:
        if os.path.isdir(f'{proxy}/fences/{fence}/_default'):
            print(f'  {agent:<14} {host:<38} NO AGENT DIR -> fences/{fence}/_default')
        else:
            print(f'  {agent:<14} {host:<38} NO AGENT DIR AND NO _default -> agent will not start when armed')
        bad += 1

if not seen:
    print('  none')
# A directory nobody routes to is usually an agent that was renamed in Buzz: the old name
# keeps its tools and the running agent quietly falls back to _default.
routed = {(a, fences.get(h)) for a, h in seen}
agents_seen = {a for a, _ in seen}
for d in sorted(glob.glob(f'{proxy}/fences/*/*/')):
    fence, agent = d.rstrip('/').split(os.sep)[-2:]
    if agent == '_default' or fence == '_unknown':
        continue
    # _shared is keyed on the agent alone, so it is in use if that agent runs anywhere.
    if fence == '_shared':
        if agent not in agents_seen:
            print(f'  (unused)       fences/_shared/{agent} — no running agent has this name. Renamed?')
        continue
    if not any(a == agent and f == fence for a, f in routed):
        print(f'  (unused)       fences/{fence}/{agent} — no running agent resolves to this. Renamed?')
sys.exit(1 if bad else 0)
PY
fi

# Every directory the launcher can land on, including the legacy ones the deploy scripts
# still write. A signed-out fence is a dead agent whichever layout it is in.
for d in "$DIR"/fences/*/*/ "$DIR"/claude-config-*/; do
  [ -d "$d" ] || continue
  printf '\n=== fence: %s ===\n' "$(printf '%s' "${d#"$DIR"/}" | sed -e 's|^fences/||' -e 's|/$||')"
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
  || echo 'ATTENTION: something falls through a fallback, or a fence is signed out' )"
exit $rc
