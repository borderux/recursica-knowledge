#!/usr/bin/env bash
# CI only, on kit.yml's macOS runner: whether loading rules into a pf anchor empties the anchor's
# persist tables. The guard's rules define <blocked> and <allowed> with persist, and the start-up job
# and the guard load the rules into the agentguard anchor again and again. This script loads a
# throwaway anchor, agentguard-tables-ci, which the main rules never use, and flushes the anchor at
# the end. The script never enables or disables pf, and never touches another anchor.
set -euo pipefail
[ "${GITHUB_ACTIONS:-}" = true ] || { echo "pf-tables.sh runs on CI only: it loads rules into this computer's pf."; exit 1; }
ANCHOR=agentguard-tables-ci
dir="$(mktemp -d)"
trap 'sudo pfctl -a "$ANCHOR" -F all >/dev/null 2>&1 || true' EXIT
status_before="$(sudo pfctl -s info 2>/dev/null | sed -n 's/^Status: \([A-Za-z]*\).*/\1/p')"
cat >"$dir/base.conf" <<'RULES'
table <blocked> persist
table <allowed> persist
block in quick from <blocked>
pass in quick from <allowed>
RULES
cat >"$dir/lockdown.conf" <<'RULES'
table <blocked> persist
block in quick from <blocked>
block out all
RULES
load() { sudo pfctl -a "$ANCHOR" -f "$dir/$1.conf" 2>&1 | sed '/ALTQ/d'; }
tables() { printf 'blocked=[%s] allowed=[%s]' "$(sudo pfctl -a "$ANCHOR" -t blocked -T show 2>/dev/null | awk 'NF { printf "%s%s", s, $1; s = " " }')" "$(sudo pfctl -a "$ANCHOR" -t allowed -T show 2>/dev/null | awk 'NF { printf "%s%s", s, $1; s = " " }')"; }

load base
sudo pfctl -a "$ANCHOR" -t blocked -T add 192.0.2.10 2>&1 | sed '/ALTQ/d'
sudo pfctl -a "$ANCHOR" -t allowed -T add 192.0.2.11 2>&1 | sed '/ALTQ/d'
echo "pf is ${status_before:-unknown}."
echo "after the first load and two adds: $(tables)"
load base
echo "after loading the base rules again: $(tables)"
load lockdown
echo "after loading the lockdown rules, which define only <blocked>: $(tables)"
load base
echo "after loading the base rules once more: $(tables)"
status_after="$(sudo pfctl -s info 2>/dev/null | sed -n 's/^Status: \([A-Za-z]*\).*/\1/p')"
[ "$status_after" = "$status_before" ] || { echo "pf's status changed from $status_before to $status_after"; exit 1; }
