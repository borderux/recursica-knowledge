#!/usr/bin/env bash
# Load the guard's nftables rules and keep the addresses in the blocked and allowed sets. The rules
# delete the agentguard table and make the table again, which empties blocked4, blocked6, allowed4
# and allowed6. So the script reads each set's addresses first, and adds the addresses back in the
# same nft transaction as the rules: no packet ever meets an empty set. Run as root, by
# install-cluster.sh and the agentguard-firewall start-up job:
#
#   nft-load.sh [rules file]   the rules file is /etc/agentguard.nft unless named
set -euo pipefail
RULES="${1:-/etc/agentguard.nft}"
[ -f "$RULES" ] || { echo "nft-load.sh: no rules file $RULES" >&2; exit 1; }

# A set's addresses, comma-separated, as nft list set prints them, or nothing when the table or the
# set doesn't exist yet. nft splits a long list over several lines.
addresses() {
  local text
  text="$(nft list set inet agentguard "$1" 2>/dev/null || true)"
  tr '\n' ' ' <<<"$text" | sed -n 's/.*elements = {\([^}]*\)}.*/\1/p' | tr -s ' \t' ' ' | sed 's/^ //; s/ $//'
}

tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT
{
  cat "$RULES"
  echo
  for set in blocked4 blocked6 allowed4 allowed6; do
    # Only a set the new rules still make: an element for a missing set would fail the whole load.
    grep -Eq "^[[:space:]]*set $set \{" "$RULES" || continue
    a="$(addresses "$set")"
    [ -z "$a" ] || printf 'add element inet agentguard %s { %s }\n' "$set" "$a"
  done
} >"$tmp"
nft -f "$tmp"
