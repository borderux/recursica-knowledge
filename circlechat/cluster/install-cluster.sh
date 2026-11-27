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
HERE="$(cd "$(dirname "$0")" && pwd)"
KIT="$(cd "$HERE/../.." && pwd)"
. "$KIT/circlechat/kit/lib.sh"
# ~/recursica-stack/site.json, or ~/circlechat/site.json before the move (kit/stack-paths.sh).
SITE="${SITE:-$(stack_dir "$HOME")/site.json}"
# Root runs the cluster's services from this checkout. The checkout must sit outside the agents'
# workspace.
require_kit "$KIT"
NODE_BIN="$(command -v node)"
for t in tcpdump age; do command -v "$t" >/dev/null || { echo "$t is not installed. Linux: sudo apt install $t. macOS: brew install $t."; exit 1; }; done

# AGENTS: each computer's cluster agent, at the computer's Tailscale address (kit/peers.mjs agentPeers).
# KIT_REPO: the kit's GitHub repo, from site.json's repos.knowledge (kit-repo.mjs siteKitRepo).
INFO="$(node --input-type=module -e '
  import fs from "node:fs";
  const { agentPeers } = await import(process.argv[3]);
  const { siteKitRepo } = await import(process.argv[4]);
  const s = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
  const me = s.nodes.find((n) => n.name === process.argv[2]);
  if (!me) { console.error(`no computer ${process.argv[2]} in site.json`); process.exit(1); }
  const agents = Object.entries(agentPeers(s, me.name)).map(([name, url]) => `${name}=${url}`).join(",");
  // The fields are split on \x1f, not a tab: read collapses empty fields between tabs.
  console.log([me.control ? "control" : "helper", agents, s.security?.evidence_recipient ?? "", s.backup?.remote ?? "", s.site?.timezone ?? "", me.slack_icon ?? "", me.router ?? "", siteKitRepo(s)].join("\x1f"));
' "$SITE" "$NODE" "$HERE/../kit/peers.mjs" "$HERE/kit-repo.mjs")"
IFS=$'\x1f' read -r ROLE AGENTS EVIDENCE BACKUP_REMOTE CLUSTER_TZ SLACK_ICON EXPECTED_ROUTER KIT_REPO <<<"$INFO"
[ -n "$KIT_REPO" ] || echo "repos.knowledge in site.json is off GitHub, so GitHub can verify no kit commit. The update job moves the kit checkout to no new commit and replaces no root-owned helper."
TSIP="$( { tailscale ip -4 2>/dev/null || tailscale.exe ip -4 2>/dev/null || true; } | head -1 | tr -d '\r')"
[ -n "$TSIP" ] || echo "No Tailscale address found: the cluster agent listens on 127.0.0.1 only, so other computers can't reach this computer's agent."
# The decoys' ports, and the rules for RustDesk's direct-address ports (remote_access.direct_ip).
# shellcheck source=circlechat/cluster/firewall/rules.sh
. "$HERE/firewall/rules.sh" "$SITE"
# On Linux, Tailscale's addresses pass only from tailscale0, Tailscale's interface: a packet that
# claims a Tailscale address on another interface is refused as a forged source. WSL has no
# tailscale0, because Tailscale runs on Windows, so in WSL the rules check only the address
# (firewall/nft-base.nft).
NFT_TAILNET=""
if [ "$OS" = Linux ] && ! grep -qi microsoft /proc/version; then
  NFT_TAILNET='    iifname != "tailscale0" ip saddr 100.64.0.0/10 drop comment "tailnet only on tailscale0"\n    iifname != "tailscale0" ip6 saddr fd7a:115c:a1e0::/48 drop comment "tailnet only on tailscale0"'
fi

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
KIT_REPO=$KIT_REPO
PATH=$(dirname "$NODE_BIN"):/usr/local/sbin:/usr/local/bin:/opt/homebrew/bin:/usr/sbin:/usr/bin:/sbin:/bin
CONF
[ -f /etc/agent-cluster.env ] || sudo install -m 600 -o root /dev/null /etc/agent-cluster.env

# Firewall rules, loaded now and at every start-up. After the rules, the guard's blocked and allowed
# addresses load from /var/lib/agent-cluster (firewall/lists.mjs): the firewall keeps its lists in memory
# only, so a restart empties them. With KIT_HOLD_NETWORK=1 the rules wait for a person (network_held,
# kit/lib.sh).
# network-step begin: the firewall rules
if network_held "the firewall rules, pf.conf and the agentguard-firewall start-up job"; then :
elif [ "$OS" = Linux ]; then
  sed "s/@CANARY_PORTS@/$CANARY_PORTS/; s/^@RUSTDESK_DIRECT@\$/$NFT_DIRECT/; s|^@TAILNET_IF@\$|$NFT_TAILNET|" "$HERE/firewall/nft-base.nft" | sudo tee /etc/agentguard.nft >/dev/null
  # The guard's lockdown rules (platform.mjs) and the start-up job load from these copies, so a kit
  # update changes them only when a person applies the firewall rules.
  sudo install -m 644 -o root "$HERE/firewall/nft-lockdown.nft" /var/lib/agent-cluster/nft-lockdown.nft
  sudo install -m 755 -o root "$HERE/firewall/nft-load.sh" /var/lib/agent-cluster/nft-load.sh
  sudo install -m 644 -o root "$HERE/firewall/lists.mjs" /var/lib/agent-cluster/lists.mjs
  # The rules delete the agentguard table and make the table again; nft-load.sh keeps the addresses
  # in the blocked and allowed sets, so a rerun of this script unblocks nothing.
  sudo bash /var/lib/agent-cluster/nft-load.sh /etc/agentguard.nft
  sudo "$NODE_BIN" /var/lib/agent-cluster/lists.mjs load
  install_unit agentguard-firewall "bash /var/lib/agent-cluster/nft-load.sh /etc/agentguard.nft; $NODE_BIN /var/lib/agent-cluster/lists.mjs load" / root boot
  if grep -qi microsoft /proc/version; then
    echo "Windows side: run circlechat/cluster/windows/install-windows-guard.ps1 once in an Administrator PowerShell."
    echo "  With the RustDesk server on this computer, add -RustDeskServer. With remote_access.direct_ip false, add -BlockRustDeskDirect."
  fi
else
  for f in base lockdown; do
    pf_rules "$f" | sudo tee "/var/lib/agent-cluster/pf-$f.conf" >/dev/null
  done
  sudo install -m 644 -o root "$HERE/firewall/pf-main.sh" /var/lib/agent-cluster/pf-main.sh
  sudo install -m 644 -o root "$HERE/firewall/lists.mjs" /var/lib/agent-cluster/lists.mjs
  bash "$HERE/firewall/pf-main.sh" < /etc/pf.conf | sudo tee /var/lib/agent-cluster/pf-main.conf >/dev/null
  # The main rules skip loopback and load the agentguard anchor (firewall/pf-main.sh). A backup of
  # macOS's own rules stays in /etc/pf.conf.agentguard-backup.
  PF_MAIN="$(bash "$HERE/firewall/pf-main.sh" < /etc/pf.conf)"
  if [ "$PF_MAIN" != "$(cat /etc/pf.conf)" ]; then
    [ -f /etc/pf.conf.agentguard-backup ] || sudo cp /etc/pf.conf /etc/pf.conf.agentguard-backup
    printf '%s\n' "$PF_MAIN" | sudo tee /etc/pf.conf >/dev/null
  fi
  # At each start-up the main rules are built again from /etc/pf.conf, with the two lines the cluster
  # needs. A macOS update replaces /etc/pf.conf with Apple's own, which has neither, and the
  # agentguard anchor's rules then never apply. The guard alerts each minute it finds them unused.
  PF_BOOT=/var/lib/agent-cluster/pf-main.conf
  install_unit agentguard-firewall "bash /var/lib/agent-cluster/pf-main.sh < /etc/pf.conf > $PF_BOOT.new && mv $PF_BOOT.new $PF_BOOT; pfctl -E -f $PF_BOOT; pfctl -a agentguard -f /var/lib/agent-cluster/pf-base.conf; $NODE_BIN /var/lib/agent-cluster/lists.mjs load" / root boot
  sudo "$NODE_BIN" /var/lib/agent-cluster/lists.mjs load
fi
# network-step end

# Decoys: fake SSH, FTP and web services that nobody legitimate ever touches.
# The Python found before sudo: on a Mac, sudo's own python3 is Apple's install stub.
PY="$(command -v python3)" || { echo "python3 is not installed."; exit 1; }
if [ ! -x /opt/opencanary/bin/opencanaryd ]; then
  sudo "$PY" -m venv /opt/opencanary
  sudo /opt/opencanary/bin/pip install --quiet "opencanary>=0.9,<1"
fi
sudo mkdir -p /etc/opencanaryd
# The fake SSH server's host keys: in a folder only root reads, never OpenCanary's default /var/tmp,
# which every account can write to. canary-keys.sh moves the keys an earlier install left there, so
# the decoy keeps the decoy's fingerprint. OpenCanary runs with umask 077, so a key OpenCanary makes is
# mode 600 too.
CANARY_KEYS=/var/lib/opencanary
sudo bash "$HERE/canary-keys.sh" /var/tmp "$CANARY_KEYS"
sudo tee /etc/opencanaryd/opencanary.conf >/dev/null <<CANARY
{
  "device.node_id": "$NODE",
  "ip.ignorelist": ["127.0.0.1"],
  "ssh.enabled": true, "ssh.port": 2222, "ssh.version": "SSH-2.0-OpenSSH_9.6p1 Ubuntu-3ubuntu13",
  "ssh.key_path": "$CANARY_KEYS",
  "ftp.enabled": true, "ftp.port": 2121, "ftp.banner": "FTP server ready",
  "http.enabled": true, "http.port": 8088, "http.banner": "Apache/2.4.58 (Ubuntu)", "http.skin": "nasLogin",
  "logger": { "class": "PyLogger", "kwargs": { "formatters": { "plain": { "format": "%(message)s" } },
    "handlers": { "file": { "class": "logging.FileHandler", "filename": "/var/lib/agent-cluster/opencanary.log" } } } }
}
CANARY
UNIT_SETTINGS=/etc/opencanaryd/opencanary.conf install_unit opencanary "umask 077; exec /opt/opencanary/bin/opencanaryd --dev" / root

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
network_applied install-cluster.sh
echo "Cluster services installed on $NODE ($ROLE). Deploy the secrets of the cluster's own stack, so the agent and the Slack app can reach Slack."
