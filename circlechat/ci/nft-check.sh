#!/usr/bin/env bash
# CI only, on kit.yml's Linux runner, as root: the guard's nftables rules with real nftables, in
# network namespaces of their own, so the runner's own rules never change.
#   1. Both renderings of nft-base.nft parse: plain Linux, with the tailscale0 rules, and WSL, without.
#   2. A rerun keeps the sets' addresses: the rules alone empty the sets, and nft-load.sh keeps them.
#   3. A packet that claims a Tailscale address on another interface is dropped, and the same packet
#      on tailscale0 passes. The WSL rendering, without the tailscale0 rules, lets the forged packet
#      in, which shows the drop comes from the rules.
set -euo pipefail
[ "${GITHUB_ACTIONS:-}" = true ] || { echo "nft-check.sh runs on CI only: it makes network namespaces."; exit 1; }
[ "$(id -u)" = 0 ] || { echo "Run as root."; exit 1; }
KIT="$(cd "$(dirname "$0")/../.." && pwd)"
FW="$KIT/circlechat/cluster/firewall"
dir="$(mktemp -d)"
cleanup() { for n in ag-guard ag-lan ag-ts; do ip netns del "$n" 2>/dev/null || true; done; rm -rf "$dir"; }
trap cleanup EXIT

# The two renderings, as install-cluster.sh renders nft-base.nft.
value() { sed -n "s/^  $1='\(.*\)'$/\1/p" "$KIT/circlechat/cluster/install-cluster.sh"; }
tailnet="$(value NFT_TAILNET)"
[ -n "$tailnet" ] || { echo "FAILED: install-cluster.sh has no NFT_TAILNET"; exit 1; }
render() { sed "s/@CANARY_PORTS@/2222, 2121, 8088/; s/^@RUSTDESK_DIRECT@\$//; s|^@TAILNET_IF@\$|$1|" "$FW/nft-base.nft"; }
render "$tailnet" >"$dir/linux.nft"
render "" >"$dir/wsl.nft"
guard() { ip netns exec ag-guard "$@"; }

ip netns add ag-guard
for f in linux wsl; do guard nft -c -f "$dir/$f.nft"; done
echo "1. Both renderings parse."

guard bash "$FW/nft-load.sh" "$dir/linux.nft"
guard nft add element inet agentguard blocked4 '{ 192.0.2.10 }'
guard nft add element inet agentguard blocked6 '{ 2001:db8::10 }'
guard nft add element inet agentguard allowed4 '{ 198.51.100.11 }'
elements() { guard nft list set inet agentguard "$1" | tr '\n' ' ' | sed -n 's/.*elements = { \([^}]*\) }.*/\1/p'; }
guard nft -f "$dir/linux.nft"
[ -z "$(elements blocked4)" ] || { echo "FAILED: the rules alone kept blocked4, so the check proves nothing"; exit 1; }
echo "2a. The rules alone empty the sets, as a rerun did before."
guard nft add element inet agentguard blocked4 '{ 192.0.2.10 }'
guard nft add element inet agentguard blocked6 '{ 2001:db8::10 }'
guard nft add element inet agentguard allowed4 '{ 198.51.100.11 }'
guard bash "$FW/nft-load.sh" "$dir/linux.nft"
got="$(elements blocked4) | $(elements blocked6) | $(elements allowed4)"
[ "$got" = "192.0.2.10 | 2001:db8::10 | 198.51.100.11" ] || { echo "FAILED: after nft-load.sh the sets hold $got"; exit 1; }
echo "2b. nft-load.sh keeps every address: $got"

# The guard's namespace has lan0, toward an office network, and tailscale0, toward Tailscale. Each
# side's namespace pings the guard from 100.100.0.2, a Tailscale address. The guard's route for
# 100.100.0.2 goes back the way each ping came, so a reply shows the ping passed.
ip netns add ag-lan; ip netns add ag-ts
ip link add lan0 netns ag-guard type veth peer name lanp netns ag-lan
ip link add tailscale0 netns ag-guard type veth peer name tsp netns ag-ts
guard ip link set lo up; guard ip link set lan0 up; guard ip link set tailscale0 up
guard ip addr add 192.0.2.1/24 dev lan0
guard ip addr add 100.100.0.1/32 dev tailscale0
guard sysctl -qw net.ipv4.conf.all.rp_filter=0 net.ipv4.conf.lan0.rp_filter=0 net.ipv4.conf.tailscale0.rp_filter=0
for side in lan ts; do
  ns="ag-$side"; ifc="${side}p"
  ip netns exec "$ns" ip link set lo up
  ip netns exec "$ns" ip link set "$ifc" up
  ip netns exec "$ns" ip addr add 100.100.0.2/32 dev "$ifc"
done
ip netns exec ag-lan ip route add 192.0.2.0/24 dev lanp
ip netns exec ag-ts ip route add 100.100.0.1/32 dev tsp
ping_from() {   # $1 lan|ts: 0 when the guard answers a ping from 100.100.0.2
  local target=192.0.2.1
  [ "$1" = ts ] && target=100.100.0.1
  guard ip route replace 100.100.0.2/32 dev "$([ "$1" = lan ] && echo lan0 || echo tailscale0)"
  ip netns exec "ag-$1" ping -c 1 -W 2 -I 100.100.0.2 "$target" >/dev/null 2>&1
}
guard nft -f "$dir/linux.nft"
if ping_from lan; then echo "FAILED: a forged Tailscale source on lan0 passed"; exit 1; fi
ping_from ts || { echo "FAILED: a Tailscale source on tailscale0 was dropped"; exit 1; }
echo "3a. With the tailscale0 rules, a Tailscale source on lan0 is dropped, and on tailscale0 passes."
guard nft -f "$dir/wsl.nft"
ping_from lan || { echo "FAILED: without the tailscale0 rules the forged ping still got no answer, so 3a proves nothing"; exit 1; }
echo "3b. Without the tailscale0 rules (the WSL rendering), the same forged source on lan0 passes."
