#!/usr/bin/env bash
# CI only, on kit.yml's macOS and Linux runners: the start-up job's load of the guard's lists
# (circlechat/cluster/lists.mjs) works with the runner's real pf or nftables. The script writes a
# blocked list with an IPv4 address, an IPv6 address and an entry that isn't an address, and an
# allowed list with one address, loads both, and checks the firewall's lists. A throwaway anchor (pf)
# or table (nftables), agentguard-lists-ci, holds the lists: nothing uses it, and the script deletes
# it at the end. The script never enables or disables pf and adds no nftables chain, so no packet
# meets the throwaway lists.
set -euo pipefail
[ "${GITHUB_ACTIONS:-}" = true ] || { echo "lists-load.sh runs on CI only: it changes this computer's firewall."; exit 1; }
NAME=agentguard-lists-ci
HERE="$(cd "$(dirname "$0")" && pwd)"
dir="$(mktemp -d)"
printf '[\n  "192.0.2.10",\n  "not-an-address",\n  "2001:db8::10"\n]\n' >"$dir/blocked-sources.json"
printf '[\n  "198.51.100.11"\n]\n' >"$dir/allowed-sources.json"

if [ "$(uname -s)" = Darwin ]; then
  trap 'sudo pfctl -a "$NAME" -F all >/dev/null 2>&1 || true' EXIT
  printf 'table <blocked> persist\ntable <allowed> persist\nblock in quick from <blocked>\npass in quick from <allowed>\n' >"$dir/rules.conf"
  sudo pfctl -a "$NAME" -f "$dir/rules.conf" >/dev/null 2>&1
  show() { sudo pfctl -a "$NAME" -t "$1" -T show 2>/dev/null | awk 'NF { printf "%s%s", s, $1; s = " " }'; }
else
  trap 'sudo nft delete table inet "$NAME" >/dev/null 2>&1 || true' EXIT
  sudo nft add table inet "$NAME"
  for s in blocked4:ipv4_addr blocked6:ipv6_addr allowed4:ipv4_addr allowed6:ipv6_addr; do
    sudo nft add set inet "$NAME" "${s%%:*}" "{ type ${s#*:}; }"
  done
  show() {
    local s out=""
    for s in "${1}4" "${1}6"; do
      out="$out $(sudo nft list set inet "$NAME" "$s" | sed -n 's/.*elements = { \(.*\) }.*/\1/p' | tr -d ',')"
    done
    echo "$out" | xargs
  }
fi

# The start-up job runs a root-owned copy of lists.mjs, alone in /var/lib/agent-cluster
# (install-cluster.sh), so the load runs a copy alone in a folder of its own too.
mkdir "$dir/copy"
cp "$HERE/../cluster/lists.mjs" "$dir/copy/lists.mjs"
out="$(sudo "$(command -v node)" "$dir/copy/lists.mjs" load "$dir" "$NAME")"
echo "$out"
sorted() { tr ' ' '\n' | sort | xargs; }
blocked="$(show blocked | sorted)"; allowed="$(show allowed | sorted)"
echo "blocked=[$blocked] allowed=[$allowed]"
[ "$blocked" = "192.0.2.10 2001:db8::10" ] || { echo "FAILED: the blocked list holds [$blocked]"; exit 1; }
[ "$allowed" = "198.51.100.11" ] || { echo "FAILED: the allowed list holds [$allowed]"; exit 1; }
grep -q 'skipped "not-an-address", not an address' <<<"$out" || { echo "FAILED: no log line for the skipped entry"; exit 1; }
echo "The start-up job's list load works with the real firewall, and skips the entry that isn't an address."
