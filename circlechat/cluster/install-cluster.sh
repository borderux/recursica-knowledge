#!/usr/bin/env bash
# Install the cluster's services on one computer: the firewall rules, the decoys (OpenCanary),
# the cluster agent, the hourly update job, and on the control computer the Slack app. Run as the account that owns the stacks, after setup-host.sh or setup-node.sh. Safe to
# rerun.
#
#   ./circlechat/cluster/install-cluster.sh <computer name from site.json>
#
# The cluster's secrets (Slack tokens, the cluster token, the approvers' authenticator secrets)
# reach /etc/agent-cluster.env through the Deploy secrets workflow for the border stack.
set -euo pipefail
NODE="${1:?usage: install-cluster.sh <computer name>}"
SITE="${SITE:-$HOME/circlechat/site.json}"
HERE="$(cd "$(dirname "$0")" && pwd)"
KIT="$(cd "$HERE/../.." && pwd)"
. "$KIT/circlechat/kit/lib.sh"
NODE_BIN="$(command -v node)"
for t in tcpdump age; do command -v "$t" >/dev/null || { echo "$t is not installed. Linux: sudo apt install $t. macOS: brew install $t."; exit 1; }; done

INFO="$(node -e '
  const s = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
  const me = s.nodes.find((n) => n.name === process.argv[2]);
  if (!me) { console.error(`no computer ${process.argv[2]} in site.json`); process.exit(1); }
  const agents = s.nodes.map((n) => `${n.name}=http://${n.name === me.name ? "127.0.0.1" : n.address}:7500`).join(",");
  console.log([me.control ? "control" : "helper", agents, s.security?.evidence_recipient ?? "", s.backup?.remote ?? ""].join("\t"));
' "$SITE" "$NODE")"
IFS=$'\t' read -r ROLE AGENTS EVIDENCE BACKUP_REMOTE <<<"$INFO"
TSIP="$( (tailscale ip -4 2>/dev/null || tailscale.exe ip -4 2>/dev/null) | head -1 | tr -d '\r')"
CANARY_PORTS="2222, 2121, 8088"

sudo mkdir -p /var/lib/agent-cluster && sudo chmod 700 /var/lib/agent-cluster
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
  if ! grep -q 'anchor "agentguard"' /etc/pf.conf; then
    sudo cp /etc/pf.conf /etc/pf.conf.agentguard-backup
    printf 'anchor "agentguard"\n' | sudo tee -a /etc/pf.conf >/dev/null
  fi
  install_unit agentguard-firewall "pfctl -E -f /etc/pf.conf; pfctl -a agentguard -f /var/lib/agent-cluster/pf-base.conf" / root boot
fi

# Decoys: fake SSH, FTP and web services that nobody legitimate ever touches.
if [ ! -x /opt/opencanary/bin/opencanaryd ]; then
  sudo python3 -m venv /opt/opencanary
  sudo /opt/opencanary/bin/pip install --quiet opencanary
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
install_unit opencanary "/opt/opencanary/bin/opencanaryd --dev" / root

ENVS="set -a; . /etc/agent-cluster.conf; . /etc/agent-cluster.env; set +a;"
install_unit cluster-agent "$ENVS exec $NODE_BIN $HERE/agent.mjs" / root
# One update job, hourly: Border UX's software right away (with upgrade.auto), everything else
# after 7 days. Replaces the separate daily, weekly and hourly jobs of earlier versions.
uninstall_unit cluster-updates >/dev/null
install_unit cluster-updater "$ENVS exec $NODE_BIN $HERE/updater.mjs" / root hourly
if [ "$ROLE" = control ]; then
  install_unit cluster-bot "$ENVS exec $NODE_BIN $HERE/bot.mjs" / root
fi
echo "Cluster services installed on $NODE ($ROLE). Deploy the border stack's secrets, so the agent and the Slack app can reach Slack."
