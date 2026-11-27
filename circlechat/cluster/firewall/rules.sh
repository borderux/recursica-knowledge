# What install-cluster.sh and pf-apply-tailnet.sh fill into the firewall rules. Sourced, never run,
# with the path of site.json:
#
#   . firewall/rules.sh <site.json>
#
# CANARY_PORTS: the decoys' ports (OpenCanary, set up in install-cluster.sh).
# NFT_DIRECT and PF_DIRECT: empty, or the rules that refuse RustDesk's direct-address ports, 21118 and
# 21119, from everywhere once every computer reaches the others through the cluster's RustDesk server
# (remote_access.direct_ip false).
# pf_rules base|lockdown: print pf-base.conf or pf-lockdown.conf with both placeholders filled in, as
# /var/lib/agent-cluster holds the file.
# shellcheck shell=bash disable=SC2034
CANARY_PORTS="2222, 2121, 8088"
DIRECT_IP="$(node -e 'const s = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")); process.stdout.write(s.remote_access?.direct_ip === false ? "off" : "on")' "$1")"
NFT_DIRECT=""; PF_DIRECT=""
if [ "$DIRECT_IP" = off ]; then
  # Two rules: GNU sed turns \n into a line break.
  NFT_DIRECT='    tcp dport { 21118, 21119 } drop comment "rustdesk direct"\n    udp dport { 21118, 21119 } drop comment "rustdesk direct"'
  PF_DIRECT='block in quick proto { tcp udp } to port { 21118 21119 }'
fi
FIREWALL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
pf_rules() {
  sed "s/@CANARY_PORTS@/${CANARY_PORTS//,/}/; s/^@RUSTDESK_DIRECT@\$/$PF_DIRECT/" "$FIREWALL_DIR/pf-$1.conf"
}
