#!/bin/sh
# Which running agent processes actually carry their fence?
# Usage: check-agent-fence-live.sh ["<agent name substring>"]
#
# Saving an agent's config in Buzz Desktop restarts that agent ONLY on the community you
# are in. The same identity keeps running on every other joined community with the OLD
# environment, so a per-agent fence can be live on one community and absent on three.
# Read the process environment, not the config file.
set -u
FILTER=${1:-}
REG="$HOME/Library/Application Support/xyz.block.buzz.app/agents"
python3 - "$REG" "$FILTER" <<'PY'
import json,glob,os,subprocess,sys
reg,filt=sys.argv[1],sys.argv[2]
names={r['pubkey']:r['name'] for r in json.load(open(f'{reg}/managed-agents.json')) if r['pubkey']}
rows=[]
for p in glob.glob(f'{reg}/agent-pids/*.json'):
    d=json.load(open(p)); k=d['key']; nm=names.get(k['pubkey'],'<unknown>')
    if filt and filt.lower() not in nm.lower(): continue
    pid=d['pid']
    alive=subprocess.run(['ps','-p',str(pid)],capture_output=True).returncode==0
    if not alive: continue
    env=subprocess.run(['ps','eww','-p',str(pid)],capture_output=True,text=True).stdout
    cfg=next((t.split('=',1)[1] for t in env.split() if t.startswith('CLAUDE_CONFIG_DIR=')),None)
    relay=k['relayUrl'].replace('wss://','').replace('.communities.buzz.xyz','')
    rows.append((nm,relay,pid,cfg))
if not rows: print('no running processes matched'); raise SystemExit(2)
for nm,relay,pid,cfg in sorted(rows):
    print(f"{'FENCED ' if cfg else 'UNFENCED'}  {nm:22s} {relay:16s} pid={pid:<7} {cfg or '(no CLAUDE_CONFIG_DIR)'}")
n=sum(1 for r in rows if not r[3])
print(f"\nRESULT: {len(rows)-n} fenced, {n} UNFENCED")
PY
