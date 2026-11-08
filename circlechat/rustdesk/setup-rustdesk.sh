#!/usr/bin/env bash
# Start the cluster's RustDesk Server Pro on this computer, from the node's rustdesk block in
# site.json. setup-node.sh runs this script when the node has the block. Safe to rerun.
#
#   ./circlechat/rustdesk/setup-rustdesk.sh <services/<node>.json> <tenant.env>
#
# The script stops before the server starts, or right after, on any of these:
# - In WSL, networking is not mirrored, or the Windows guard has no RustDesk rules yet.
# - The firewall rules on this computer have no RustDesk rule yet (install-cluster.sh).
# - The node's address in site.json is not this computer's Tailscale address.
# - The secret for the server's backup, RUSTDESK_RESTIC_PASSWORD, is not on this computer.
# - A RustDesk port listens anywhere but its one address, or answers on another address.
# - tailscale serve does not pass HTTPS port 443 to the console, or Funnel serves the port.
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
  || { echo "$ADDRESS is not on any network interface here, so Docker cannot open RustDesk's ports on it. In WSL, networking must be mirrored."; exit 1; }

# 2. The guards: the firewall rule here, and on Windows the host and Hyper-V rules.
sudo nft list chain inet agentguard forward 2>/dev/null | grep 'comment "rustdesk"' >/dev/null \
  || { echo "The firewall rules have no RustDesk rule. Run circlechat/cluster/install-cluster.sh first."; exit 1; }
if [ "$WSL" = true ]; then
  n="$(powershell.exe -NoProfile -NonInteractive -Command "(Get-NetFirewallRule -DisplayName 'AgentGuard: RustDesk server*' -ErrorAction SilentlyContinue | Measure-Object).Count" 2>/dev/null | tr -d '\r' || true)"
  [ "${n:-0}" -ge 2 ] || { echo "Windows has no AgentGuard RustDesk rules. Run circlechat/cluster/windows/install-windows-guard.ps1 -RustDeskServer in an Administrator PowerShell, then run this script again."; exit 1; }
  h="$(powershell.exe -NoProfile -NonInteractive -Command "(Get-NetFirewallHyperVRule -Name 'AgentGuard-RustDesk-Server-*' -ErrorAction SilentlyContinue | Measure-Object).Count" 2>/dev/null | tr -d '\r' || true)"
  case "$h" in
    ''|*[!0-9]*) echo "Could not read the Hyper-V firewall rules from WSL. Check in an Administrator PowerShell: Get-NetFirewallHyperVRule -Name 'AgentGuard-RustDesk-Server-*'" ;;
    *) [ "$h" -ge 2 ] || { echo "The Hyper-V firewall has no AgentGuard RustDesk rules. Run install-windows-guard.ps1 -RustDeskServer in an Administrator PowerShell, then run this script again."; exit 1; } ;;
  esac
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

# 5. The ports: each on its one address, and none answering on another address.
problems=""
for _ in $(seq 1 "${RUSTDESK_LISTEN_TRIES:-15}"); do
  problems="$(ss -Hlntu | $RD listen-check "$ADDRESS")"
  [ -z "$problems" ] && break
  sleep 2
done
if [ -n "$problems" ]; then
  echo "$problems"
  docker compose -f "$DIR/compose.json" stop
  echo "Stopped the RustDesk server. Fix the problems above, then run this script again."; exit 1
fi
for a in $(ip -4 -o addr show | awk '{print $4}' | cut -d/ -f1); do
  case "$a" in "$ADDRESS"|127.*|172.1[6-9].*|172.2[0-9].*|172.3[01].*) continue ;; esac
  for p in 21114 21115 21116 21117; do
    if timeout 2 bash -c "</dev/tcp/$a/$p" 2>/dev/null; then
      docker compose -f "$DIR/compose.json" stop
      echo "Port $p answers on $a, an address outside Tailscale. Stopped the RustDesk server."; exit 1
    fi
  done
done

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
