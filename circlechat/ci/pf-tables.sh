#!/usr/bin/env bash
# CI only, on kit.yml's macOS runner: loading rules into a pf anchor keeps the anchor's persist
# tables. The guard's rules define <blocked> and <allowed> with persist, and the start-up job and the
# guard load the rules into the agentguard anchor again and again: the base rules at each start-up
# and at each release, the lockdown rules, which define only <blocked>, at each cut-off. A load that
# emptied the tables would unblock every blocked address. The script fails if a load empties a table.
#
# The script loads a throwaway anchor, agentguard-tables-ci, which the main rules never use, and
# flushes the anchor at the end. The script checks with pf as found, and again with pf enabled when
# the runner has pf disabled, since a cluster computer runs pf enabled. pfctl -E takes a reference
# and pfctl -X gives the reference back, so pf ends as found. No other anchor changes.
set -euo pipefail
[ "${GITHUB_ACTIONS:-}" = true ] || { echo "pf-tables.sh runs on CI only: it loads rules into this computer's pf."; exit 1; }
ANCHOR=agentguard-tables-ci
dir="$(mktemp -d)"
token=""
cleanup() {
  sudo pfctl -a "$ANCHOR" -F all >/dev/null 2>&1 || true
  [ -z "$token" ] || sudo pfctl -X "$token" >/dev/null 2>&1 || true
}
trap cleanup EXIT
pf_status() { sudo pfctl -s info 2>/dev/null | sed -n 's/^Status: \([A-Za-z]*\).*/\1/p'; }
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
load() { sudo pfctl -a "$ANCHOR" -f "$dir/$1.conf" >/dev/null 2>&1; }
show() { sudo pfctl -a "$ANCHOR" -t "$1" -T show 2>/dev/null | awk 'NF { printf "%s%s", s, $1; s = " " }'; }
tables() { printf 'blocked=[%s] allowed=[%s]' "$(show blocked)" "$(show allowed)"; }
want="blocked=[192.0.2.10] allowed=[192.0.2.11]"

check() {
  sudo pfctl -a "$ANCHOR" -F all >/dev/null 2>&1 || true
  load base
  sudo pfctl -a "$ANCHOR" -t blocked -T add 192.0.2.10 >/dev/null 2>&1
  sudo pfctl -a "$ANCHOR" -t allowed -T add 192.0.2.11 >/dev/null 2>&1
  local step got
  for step in "the first load and two adds" base "loading the base rules again" lockdown "loading the lockdown rules, which define only <blocked>" base "loading the base rules once more"; do
    case "$step" in base | lockdown) load "$step"; continue ;; esac
    got="$(tables)"
    echo "pf $(pf_status), after $step: $got"
    [ "$got" = "$want" ] || { echo "FAILED: after $step the tables hold $got, not $want"; exit 1; }
  done
}

before="$(pf_status)"
check
if [ "$before" != Enabled ]; then
  token="$(sudo pfctl -E 2>&1 | sed -n 's/^Token : //p')"
  [ -n "$token" ] || { echo "pfctl -E gave no token"; exit 1; }
  check
  sudo pfctl -X "$token" >/dev/null 2>&1; token=""
fi
[ "$(pf_status)" = "$before" ] || { echo "pf's status changed from $before to $(pf_status)"; exit 1; }
echo "Each load kept both tables. pf is $before, as found."
