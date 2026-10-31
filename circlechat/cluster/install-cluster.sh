#!/usr/bin/env bash
# Install the cluster's services on one computer: the firewall rules, the decoys (OpenCanary),
# the cluster agent, the hourly update job, and on the control computer the Slack app. Run as the account that owns the stacks, after setup-host.sh or setup-node.sh. Safe to
# rerun.
#
#   ./circlechat/cluster/install-cluster.sh <computer name from site.json>
#
# The cluster's secrets (Slack tokens, the cluster token, the approvers' authenticator secrets)
# reach /etc/agent-cluster.env through the Deploy secrets workflow for the cluster's own stack.
set -euo pipefail
NODE="${1:?usage: install-cluster.sh <computer name>}"
SITE="${SITE:-$HOME/circlechat/site.json}"
HERE="$(cd "$(dirname "$0")" && pwd)"
KIT="$(cd "$HERE/../.." && pwd)"
. "$KIT/circlechat/kit/lib.sh"
# Root runs the cluster's services from this checkout. The checkout must sit outside the agents'
# workspace.
require_kit "$KIT"
NODE_BIN="$(command -v node)"
for t in tcpdump age; do command -v "$t" >/dev/null || { echo "$t is not installed. Linux: sudo apt install $t. macOS: brew install $t."; exit 1; }; done

INFO="$(node -e '
  const s = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
  const me = s.nodes.find((n) => n.name === process.argv[2]);
  if (!me) { console.error(`no computer ${process.argv[2]} in site.json`); process.exit(1); }
  const agents = s.nodes.map((n) => `${n.name}=http://${n.name === me.name ? "127.0.0.1" : n.address}:7500`).join(",");
  // The fields are split on \x1f, not a tab: read collapses empty fields between tabs.
  console.log([me.control ? "control" : "helper", agents, s.security?.evidence_recipient ?? "", s.backup?.remote ?? "", s.site?.timezone ?? "", me.slack_icon ?? "", me.router ?? ""].join("\x1f"));
' "$SITE" "$NODE")"
IFS=$'\x1f' read -r ROLE AGENTS EVIDENCE BACKUP_REMOTE CLUSTER_TZ SLACK_ICON EXPECTED_ROUTER <<<"$INFO"
TSIP="$( { tailscale ip -4 2>/dev/null || tailscale.exe ip -4 2>/dev/null || true; } | head -1 | tr -d '\r')"
[ -n "$TSIP" ] || echo "No Tailscale address found: the cluster agent listens on 127.0.0.1 only, so other computers can't reach this computer's agent."
CANARY_PORTS="2222, 2121, 8088"

sudo mkdir -p /var/lib/agent-cluster && sudo chmod 700 /var/lib/agent-cluster
# DOCKER_CONFIG: the cluster's root services read Docker's settings from the owner's ~/.docker.
# On a Mac, Colima's Docker belongs to the owner, and root has no Docker settings of its own.
sudo tee /etc/agent-cluster.conf >/dev/null <<CONF
COMPUTER=$NODE
OWNER=$(id -un)
OWNER_HOME=$HOME
KIT=$KIT
AGENT_PORT=7500
AGENT_BIND=127.0.0.1${TSIP:+,$TSIP}
AGENTS=$AGENTS
CANARY_LOG=/var/lib/agent-cluster/opencanary.log
EVIDENCE_RECIPIENT=$EVIDENCE
BACKUP_REMOTE=$BACKUP_REMOTE
CLUSTER_TZ=$CLUSTER_TZ
SLACK_ICON=$SLACK_ICON
EXPECTED_ROUTER=$EXPECTED_ROUTER
DOCKER_CONFIG=$HOME/.docker
PATH=$(dirname "$NODE_BIN"):/usr/local/sbin:/usr/local/bin:/opt/homebrew/bin:/usr/sbin:/usr/bin:/sbin:/bin
CONF
[ -f /etc/agent-cluster.env ] || sudo install -m 600 -o root /dev/null /etc/agent-cluster.env

# Firewall rules, loaded now and at every start-up.
if [ "$OS" = Linux ]; then
  sed "s/@CANARY_PORTS@/$CANARY_PORTS/" "$HERE/firewall/nft-base.nft" | sudo tee /etc/agentguard.nft >/dev/null
  sudo nft -f /etc/agentguard.nft
  install_unit agentguard-firewall "nft -f /etc/agentguard.nft" / root boot
  if grep -qi microsoft /proc/version; then
    echo "Windows side: run circlechat/cluster/windows/install-windows-guard.ps1 once in an Administrator PowerShell."
  fi
else
  for f in base lockdown; do
    sed "s/@CANARY_PORTS@/${CANARY_PORTS//,/}/;" "$HERE/firewall/pf-$f.conf" | sudo tee "/var/lib/agent-cluster/pf-$f.conf" >/dev/null
  done
  # The main rules skip loopback and load the agentguard anchor (firewall/pf-main.sh). A backup of
  # macOS's own rules stays in /etc/pf.conf.agentguard-backup.
  PF_MAIN="$(bash "$HERE/firewall/pf-main.sh" < /etc/pf.conf)"
  if [ "$PF_MAIN" != "$(cat /etc/pf.conf)" ]; then
    [ -f /etc/pf.conf.agentguard-backup ] || sudo cp /etc/pf.conf /etc/pf.conf.agentguard-backup
    printf '%s\n' "$PF_MAIN" | sudo tee /etc/pf.conf >/dev/null
  fi
  install_unit agentguard-firewall "pfctl -E -f /etc/pf.conf; pfctl -a agentguard -f /var/lib/agent-cluster/pf-base.conf" / root boot
fi

# Decoys: fake SSH, FTP and web services that nobody legitimate ever touches.
# The Python found before sudo: on a Mac, sudo's own python3 is Apple's install stub.
PY="$(command -v python3)" || { echo "python3 is not installed."; exit 1; }
if [ ! -x /opt/opencanary/bin/opencanaryd ]; then
  sudo "$PY" -m venv /opt/opencanary
  sudo /opt/opencanary/bin/pip install --quiet "opencanary>=0.9,<1"
fi
sudo mkdir -p /etc/opencanaryd
sudo tee /etc/opencanaryd/opencanary.conf >/dev/null <<CANARY
{
  "device.node_id": "$NODE",
  "ip.ignorelist": ["127.0.0.1"],
  "ssh.enabled": true, "ssh.port": 2222, "ssh.version": "SSH-2.0-OpenSSH_9.6p1 Ubuntu-3ubuntu13",
  "ftp.enabled": true, "ftp.port": 2121, "ftp.banner": "FTP server ready",
  "http.enabled": true, "http.port": 8088, "http.banner": "Apache/2.4.58 (Ubuntu)", "http.skin": "nasLogin",
  "logger": { "class": "PyLogger", "kwargs": { "formatters": { "plain": { "format": "%(message)s" } },
    "handlers": { "file": { "class": "logging.FileHandler", "filename": "/var/lib/agent-cluster/opencanary.log" } } } }
}
CANARY
UNIT_SETTINGS=/etc/opencanaryd/opencanary.conf install_unit opencanary "/opt/opencanary/bin/opencanaryd --dev" / root

ENVS="set -a; . /etc/agent-cluster.conf; . /etc/agent-cluster.env; set +a;"
# Each service restarts when the service's settings, secrets or the kit's version change.
CLUSTER_SETTINGS="/etc/agent-cluster.conf /etc/agent-cluster.env $KIT/package.json"
UNIT_SETTINGS="$CLUSTER_SETTINGS" install_unit cluster-agent "$ENVS exec $NODE_BIN $HERE/agent.mjs" / root
# One update job, hourly: Recursica's own software right away (with upgrade.auto), everything else
# after 7 days. Replaces the separate daily, weekly and hourly jobs of earlier versions.
uninstall_unit cluster-updates >/dev/null
install_unit cluster-updater "$ENVS exec $NODE_BIN $HERE/updater.mjs" / root hourly
if [ "$ROLE" = control ]; then
  UNIT_SETTINGS="$CLUSTER_SETTINGS" install_unit cluster-bot "$ENVS exec $NODE_BIN $HERE/bot.mjs" / root
else
  # Only the control computer runs the Slack app; a computer that becomes a helper drops it.
  uninstall_unit cluster-bot >/dev/null
fi
echo "Cluster services installed on $NODE ($ROLE). Deploy the secrets of the cluster's own stack, so the agent and the Slack app can reach Slack."
