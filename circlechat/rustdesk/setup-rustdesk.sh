#!/usr/bin/env bash
# Start the cluster's RustDesk Server Pro on this computer, from the node's rustdesk block in
# site.json. setup-node.sh runs this script when the node has the block. Safe to rerun.
#
#   ./circlechat/rustdesk/setup-rustdesk.sh <services/<node>.json> <tenant.env>
#
# hbbs and hbbr run in the host's network, which RustDesk's license needs, so each RustDesk port
# listens on every address of the computer. Three firewalls refuse TCP 21114 to 21119 and UDP 21116
# from every source except Tailscale and loopback: nftables, and in WSL Windows Firewall and the Hyper-V firewall.
#
# The script stops before the server starts, or right after, on any of these:
# - In WSL, networking is not mirrored.
# - One of the three firewalls lacks a RustDesk rule (install-cluster.sh, install-windows-guard.ps1).
# - The node's address in site.json is not this computer's Tailscale address.
# - The secret for the server's backup, RUSTDESK_RESTIC_PASSWORD, is not on this computer.
# - A RustDesk port does not listen, or hbbr runs as a public relay.
# - tailscale serve does not pass HTTPS port 443 to the console, or Funnel serves the port.
# - The console does not answer on 127.0.0.1:21114.
set -euo pipefail
SPEC="${1:?usage: setup-rustdesk.sh <services/<node>.json> <tenant.env>}"
TENANT_ENV="${2:?usage: setup-rustdesk.sh <services/<node>.json> <tenant.env>}"
HERE="$(cd "$(dirname "$0")" && pwd)"
. "$HERE/../kit/lib.sh"
# shellcheck source=/dev/null
. "$TENANT_ENV"
SECRETS="${SECRETS:-$HOME/.recursica-node.env}"
RD="node $HERE/rustdesk.mjs"
spec() { node -e 'process.stdout.write(String(JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")).rustdesk?.[process.argv[2]] ?? ""))' "$SPEC" "$1"; }
ADDRESS="$(spec address)"; CONSOLE_HOST="$(spec console_host)"; HTTPS_PORT="$(spec https_port)"; BACKUP_AT="$(spec backup_time)"
[ -n "$ADDRESS" ] || { echo "$SPEC has no rustdesk block."; exit 1; }
WSL=false; grep -qi microsoft "${PROC_VERSION:-/proc/version}" 2>/dev/null && WSL=true
# Tailscale runs on Windows when this is WSL.
ts() { if command -v tailscale >/dev/null; then tailscale "$@"; else tailscale.exe "$@"; fi; }

# 1. The network: mirrored WSL, and the Tailscale address on this computer.
if [ "$WSL" = true ]; then
  mode="$(wslinfo --networking-mode 2>/dev/null | tr -d '\r' || true)"
  [ -z "$mode" ] || [ "$mode" = mirrored ] || { echo "WSL networking is $mode. Set networkingMode=mirrored under [wsl2] in %UserProfile%\\.wslconfig, run wsl --shutdown, then run this script again."; exit 1; }
fi
tsip="$(ts ip -4 2>/dev/null | head -1 | tr -d '\r' || true)"
[ "$tsip" = "$ADDRESS" ] || { echo "This computer's Tailscale address is ${tsip:-unknown}, and site.json gives $ADDRESS. Correct the node's address in site.json."; exit 1; }
ip -4 -o addr show | awk '{print $4}' | cut -d/ -f1 | grep -x "$ADDRESS" >/dev/null \
  || { echo "$ADDRESS is not on any network interface here, so no client reaches the relay hbbs names, $ADDRESS:21117. In WSL, networking must be mirrored."; exit 1; }

# 2. The guards. In the host's network, each firewall must refuse TCP 21114 to 21119 and UDP 21116
#    from every source except Tailscale and loopback. A rule that is missing, or that WSL cannot read, stops
#    the setup before the server starts.
# A reader that fails prints nothing, and the check then finds every rule missing. A check that
# fails stops the script, before the server starts.
nft_rules="$(sudo nft list chain inet agentguard input 2>/dev/null || true)"
problems="$(printf '%s\n' "$nft_rules" | $RD guard-check nft)"
if [ "$WSL" = true ]; then
  # One line per rule: <protocol>|<local ports>|<action>|<enabled>|<direction>.
  fw_rules="Get-NetFirewallRule -DisplayName 'AgentGuard: RustDesk server*' -ErrorAction SilentlyContinue | ForEach-Object { \$f = \$_ | Get-NetFirewallPortFilter; '{0}|{1}|{2}|{3}|{4}' -f \$f.Protocol, (\$f.LocalPort -join ','), \$_.Action, \$_.Enabled, \$_.Direction }"
  hv_rules="Get-NetFirewallHyperVRule -Name 'AgentGuard-RustDesk-Server-*' -ErrorAction SilentlyContinue | ForEach-Object { '{0}|{1}|{2}|{3}|{4}' -f \$_.Protocol, (\$_.LocalPorts -join ','), \$_.Action, \$_.Enabled, \$_.Direction }"
  fw_rules="$(powershell.exe -NoProfile -NonInteractive -Command "$fw_rules" 2>/dev/null | tr -d '\r' || true)"
  hv_rules="$(powershell.exe -NoProfile -NonInteractive -Command "$hv_rules" 2>/dev/null | tr -d '\r' || true)"
  fw="$(printf '%s\n' "$fw_rules" | $RD guard-check windows)"
  hv="$(printf '%s\n' "$hv_rules" | $RD guard-check hyperv)"
  problems="$(printf '%s\n%s\n%s' "$problems" "$fw" "$hv" | sed '/^$/d')"
fi
if [ -n "$problems" ]; then
  echo "$problems"
  [ "$WSL" = true ] && echo "When the rules exist, WSL could not read the rules. Check in an Administrator PowerShell: Get-NetFirewallRule -DisplayName 'AgentGuard: RustDesk server*', and Get-NetFirewallHyperVRule -Name 'AgentGuard-RustDesk-Server-*'."
  echo "The RustDesk server did not start."; exit 1
fi

# 3. The backup's secret. Without the backup, a lost server key means every client must be set up again.
[ -f "$SECRETS" ] && grep -q '^RUSTDESK_RESTIC_PASSWORD=.' "$SECRETS" \
  || { echo "No RUSTDESK_RESTIC_PASSWORD in $SECRETS. Add the secret to the cluster's GitHub environment and run the Deploy secrets workflow for this computer first."; exit 1; }
[ -n "${BACKUP_REMOTE:-}" ] || { echo "No backup.remote in site.json."; exit 1; }

# 4. The server.
DIR="$HOME/.recursica-rustdesk"
mkdir -p "$DIR" && chmod 700 "$DIR"
$RD compose "$SPEC" > "$DIR/compose.json"
docker compose -f "$DIR/compose.json" pull -q
docker compose -f "$DIR/compose.json" up -d --remove-orphans

# 5. The ports: each RustDesk port listens. In the host's network, the firewalls checked in step 2
#    guard each port.
problems=""
for _ in $(seq 1 "${RUSTDESK_LISTEN_TRIES:-15}"); do
  problems="$(ss -Hlntu | $RD listen-check)"
  [ -z "$problems" ] && break
  sleep 2
done
if [ -n "$problems" ]; then
  echo "$problems"
  docker compose -f "$DIR/compose.json" stop
  echo "Stopped the RustDesk server. Fix the problems above, then run this script again."; exit 1
fi

# 5b. The relay holds the server's key. Without the key, hbbr runs as a public relay that any client
#     reaching port 21117 may use, and hbbr's log says so.
public=""
for _ in $(seq 1 "${RUSTDESK_LISTEN_TRIES:-15}"); do
  relay_log="$(docker logs rustdesk-hbbr 2>&1 || true)"
  if grep 'PUBLIC RELAY MODE' >/dev/null <<<"$relay_log"; then public=yes; break; fi
  grep 'Listening on tcp' >/dev/null <<<"$relay_log" && break
  sleep 2
done
if [ -n "$public" ]; then
  docker compose -f "$DIR/compose.json" stop
  echo "hbbr runs in public relay mode: hbbr found no key in the volume. Stopped the RustDesk server. Run this script again, which starts hbbr after hbbs has made the key."; exit 1
fi

# 6. The console's HTTPS address, tailnet only.
ts serve --bg "--https=$HTTPS_PORT" "http://127.0.0.1:21114" >/dev/null 2>&1 || true
problems="$(ts serve status --json 2>/dev/null | $RD serve-check "$HTTPS_PORT" 21114)"
if [ -n "$problems" ]; then
  echo "$problems"
  echo "Run in an Administrator PowerShell on Windows, or with sudo on Linux: tailscale serve --bg --https=$HTTPS_PORT http://127.0.0.1:21114. Then run this script again."; exit 1
fi

# 7. The console answers on 127.0.0.1:21114, where tailscale serve passes each request. Any HTTP
#    status counts; no answer at all means a firewall or Docker drops the connection.
code=000
for _ in $(seq 1 "${RUSTDESK_LISTEN_TRIES:-15}"); do
  code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 http://127.0.0.1:21114/ || true)"
  [ "${code:-000}" != 000 ] && break
  sleep 2
done
if [ "${code:-000}" = 000 ]; then
  echo "The console does not answer on 127.0.0.1:21114, so tailscale serve answers 502."
  [ "$WSL" = true ] && echo "In WSL with mirrored networking, loopback traffic arrives on loopback0. Run circlechat/cluster/install-cluster.sh again, so the firewall rules accept loopback0, then run this script again."
  exit 1
fi

# 8. The nightly backup of the server's volume, as root.
UNIT_SETTINGS="/etc/agent-cluster.conf $SECRETS" install_unit rustdesk-backup \
  "set -a; . /etc/agent-cluster.conf; set +a; OWNER_HOME=$HOME STACK=$STACK_NAME BACKUP_REMOTE=$BACKUP_REMOTE $HERE/backup-rustdesk.sh" / root "*-*-* $BACKUP_AT"

cat <<MSG
RustDesk server running.
  Console, tailnet only: https://$CONSOLE_HOST (passes to 127.0.0.1:21114)
  ID server: $ADDRESS (21115/tcp, 21116/tcp+udp), relay: $ADDRESS:21117
  Backup: each night at $BACKUP_AT, to $BACKUP_REMOTE/$STACK_NAME-rustdesk
Run the first backup now and check it holds the key:
  sudo systemctl start rustdesk-backup.service && sudo journalctl -u rustdesk-backup -n 20
Then sign in to the console, change the admin password, and follow "RustDesk server" in circlechat/README.md.
MSG
