#!/usr/bin/env bash
# Write one stack's secrets on this computer, then restart what reads them. Root runs this script:
# install-secrets-helper.sh copies it to /usr/local/bin/agent-stacks-apply, owned by root, and lets
# the GitHub runner's user run that copy through sudo and nothing else.
#
#   <KEY=value lines on stdin> | agent-stacks-apply <stack> <computer> <restart: true|false> [<kev_rotation>]
#   STACK_DISK_KEY=<key> on stdin | agent-stacks-apply --unlock <stack> <computer>
#   agent-stacks-apply --lock <stack> <computer>
#
# --unlock opens a client stack's encrypted disk image and starts the stack's Docker VM, and
# --lock does the reverse. The key passes through on stdin and is never written to disk. On Linux
# and WSL, this script opens and closes the LUKS image itself, as root, with agent-stacks-disk.
#
# <stack> is the GitHub environment: the cluster's own stack's name, site.stack_name in the
# cluster's site.json ("cluster" when unset), or "client-<name>" for the client stack with
# site.tenant <name>. <computer> is a node name in that
# stack's site.json. Only the key names below are read; every other line is ignored.
#
# <kev_rotation> comes only from a key rotation (rotate-tokens.sh), and is empty for every other
# deploy. "check" runs the rotation's checks and writes nothing. Any other value is the rotation's
# proof, and lets this run restart kev-engine once (see "A kev-engine key rotation" below).
set -euo pipefail
# The runner starts the helper in the runner's own work folder, which the owner cannot read. Each
# command the helper runs as the owner would then fail to read the current folder, and print
# "getcwd: cannot access parent directories". Every path below is absolute.
cd /
# macOS keeps chown in /usr/sbin, and the runner's PATH can leave /usr/sbin out. The tests set CHOWN
# to a stand-in.
case "$(uname -s)" in Darwin) CHOWN="${CHOWN:-/usr/sbin/chown}" ;; *) CHOWN="${CHOWN:-chown}" ;; esac

CONF="${AGENT_STACKS_CONF:-/etc/agent-stacks.conf}"
# shellcheck disable=SC1090
. "$CONF"   # OWNER, OWNER_HOME, KIT, NODE_BIN
MODE=apply
# The stack's folder: the new name when the new folder exists, else CircleChat 1.x's old name when
# that folder exists, else the new name. kit/stack-paths.sh holds the same rule. Root runs this copy
# of the script, so the rule sits here and root runs no kit file for it.
#   pick_dir <new folder> <old folder>
pick_dir() { if [ -d "$1" ] || [ ! -d "$2" ]; then printf '%s' "$1"; else printf '%s' "$2"; fi; }
case "${1:-}" in --unlock) MODE=unlock; shift ;; --lock) MODE=lock; shift ;; esac
STACK="${1:?usage: agent-stacks-apply <stack> <computer> <restart>}"
COMPUTER="${2:?usage: agent-stacks-apply <stack> <computer> <restart>}"
RESTART="${3:-false}"
KEV_ROTATION="${4:-}"
SLUG='^[a-z0-9][a-z0-9-]*$'
case "$STACK" in
  client-*) TENANT="${STACK#client-}" ;;
  *)
    # The cluster's own stack. The JSON is read in place, so root runs no kit file here
    # (kit/render.mjs, clusterStackName, holds the same rule).
    CLUSTER_STACK="$("$NODE_BIN" -e '
      let s = {}; try { s = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")); } catch {}
      process.stdout.write(s.site?.stack_name || "cluster");
    ' "$(pick_dir "$OWNER_HOME/recursica-stack" "$OWNER_HOME/circlechat")/site.json")"
    [ "$STACK" = "$CLUSTER_STACK" ] || { echo "Stack \"$STACK\" must be $CLUSTER_STACK (site.stack_name in the cluster's site.json) or client-<name>."; exit 1; }
    TENANT="" ;;
esac
[ -z "$TENANT" ] || [[ "$TENANT" =~ $SLUG ]] || { echo "Client name \"$TENANT\" must be a slug."; exit 1; }
[[ "$COMPUTER" =~ $SLUG ]] || { echo "Computer \"$COMPUTER\" must be a slug."; exit 1; }
# The helper runs the kit as the owner, never as root, and the kit must sit outside the agents'
# workspace. The check runs as the owner too, so root never runs a file from an unchecked kit.
if [ "$(id -un)" = "$OWNER" ]; then bash "$KIT/circlechat/kit/check-kit.sh" "$KIT" "$OWNER" "$OWNER_HOME" || exit 1
else sudo -u "$OWNER" -H bash "$KIT/circlechat/kit/check-kit.sh" "$KIT" "$OWNER" "$OWNER_HOME" || exit 1; fi

if [ -z "$TENANT" ]; then
  CC_DIR="$(pick_dir "$OWNER_HOME/recursica-stack" "$OWNER_HOME/circlechat")"; NODE_ENV="$OWNER_HOME/.recursica-node.env"; SUFFIX=""
else
  # A client's secrets file sits inside the client's encrypted disk image.
  CC_DIR="$(pick_dir "$OWNER_HOME/tenants/$TENANT/stack" "$OWNER_HOME/tenants/$TENANT/circlechat")"; NODE_ENV="$OWNER_HOME/tenants/$TENANT/node.env"; SUFFIX="-$TENANT"
fi

if [ "$MODE" != apply ]; then
  [ -n "$TENANT" ] || { echo "Only a client stack has an encrypted disk image."; exit 1; }
  DISK="$KIT/circlechat/tenant/disk-image.sh"
  as_owner() { if [ "$(id -un)" = "$OWNER" ]; then "$@"; else sudo -u "$OWNER" -H "$@"; fi; }
  # Linux and WSL: the image opens as root, then the owner starts the VM inside the open image.
  LUKS=false; [ "$(uname -s)" = Linux ] && LUKS=true
  HELPER="${AGENT_STACKS_DISK:-/usr/local/bin/agent-stacks-disk}"
  luks() { if [ "$(id -u)" = 0 ]; then "$HELPER" "$@"; else sudo -n "$HELPER" "$@"; fi; }
  if [ "$MODE" = unlock ]; then
    KEY=""
    while IFS= read -r line || [ -n "$line" ]; do case "$line" in STACK_DISK_KEY=*) KEY="${line#STACK_DISK_KEY=}" ;; esac; done
    [ -n "$KEY" ] || { echo "No STACK_DISK_KEY in the client's GitHub environment."; exit 1; }
    if [ "$LUKS" = true ]; then
      printf '%s' "$KEY" | luks open "$TENANT"
      as_owner bash "$DISK" unlock "$TENANT" </dev/null
    else
      printf '%s' "$KEY" | as_owner bash "$DISK" unlock "$TENANT"
    fi
  elif [ "$LUKS" = true ]; then
    as_owner bash "$DISK" stop-vm "$TENANT"
    luks close "$TENANT"
    echo "Locked stack $TENANT: Docker VM stopped, image closed."
  else
    as_owner bash "$DISK" lock "$TENANT"
  fi
  exit 0
fi
SITE="$CC_DIR/site.json"
[ -f "$SITE" ] || { echo "No $SITE on this computer. Copy the stack's site.json here first."; exit 1; }

# The secrets, from stdin. A name outside this list, or an empty value, is skipped.
# MODEL_KEY_<NAME> is a cloud model key, named in site.json's model_keys. ANTHROPIC_API_KEY is the
# older name of MODEL_KEY_DEFAULT.
KNOWN='^(MODEL_KEY_[A-Z0-9_]+|AWS_ACCESS_KEY_ID|AWS_SECRET_ACCESS_KEY|AWS_REGION_NAME|VERTEXAI_PROJECT|VERTEXAI_LOCATION|AZURE_API_KEY|AZURE_API_BASE|AZURE_API_VERSION|GIT_TOKEN|SLACK_APP_TOKEN|SLACK_BOT_TOKEN|SLACK_CHANNEL_ID|CLUSTER_TOKEN|APPROVERS|TOTP_SECRET_[A-Z0-9_]+|ANTHROPIC_API_KEY|RESTIC_PASSWORD|KEV_ENGINE_KEY|KEV_API_KEY|JOBD_TOKEN|PORTER_HOOK_URL|PORTER_HOOK_SECRET|PORTER_ANTHROPIC_API_KEY|PORTER_GIT_NAME|PORTER_GIT_EMAIL|KEV_DATA_GITHUB_PAT|CC_CHECK_PASSWORD|RUSTDESK_RESTIC_PASSWORD|APP_KEY_[A-Z0-9_]+|ALAN_GITHUB_PAT|BETTY_GITHUB_PAT|PORTER_GITHUB_PAT)$'
NAMES=""
while IFS= read -r line || [ -n "$line" ]; do
  k="${line%%=*}"; v="${line#*=}"
  [[ "$k" =~ $KNOWN ]] && [ -n "$v" ] || continue
  printf -v "S_$k" '%s' "$v"
  NAMES="$NAMES $k"
done
val() { local n="S_$1"; printf '%s' "${!n:-}"; }
has() { [ -n "$(val "$1")" ]; }

# What this computer runs for the stack, from the stack's site.json.
ROLES="$("$NODE_BIN" -e '
  const s = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
  const n = (s.nodes ?? []).find((x) => x.name === process.argv[2]);
  if (!n) { console.log("none"); process.exit(0); }
  const r = [];
  if (n.control) r.push("control");
  if (n.jobs) r.push("jobs");
  for (const v of n.services ?? []) r.push(`service:${v.name}`);
  if (n.rustdesk) r.push("rustdesk");
  console.log(r.join(" ") || "none");
' "$SITE" "$COMPUTER")"
[ "$ROLES" != none ] || { echo "Computer $COMPUTER runs nothing for stack $STACK in $SITE."; exit 1; }
# Each service of this computer, with the names of the secrets the service reads: "name:A,B".
SERVICE_READS="$("$NODE_BIN" -e '
  const s = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
  const n = (s.nodes ?? []).find((x) => x.name === process.argv[2]);
  console.log((n?.services ?? []).map((v) => `${v.name}:${(v.secret_env ?? []).join(",")}`).join(" "));
' "$SITE" "$COMPUTER")"

# A client or demo stack without a recorded permission runs local models only, so no cloud
# key may reach the stack. The helper refuses the whole run before writing anything.
CLOUD="$("$NODE_BIN" -e '
  const s = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
  const local = ["client", "demo"].includes(s.site?.kind) && s.site?.cloud_models?.allowed !== true;
  console.log(local ? "local-only" : "allowed");
' "$SITE")"
# Each agent that pushes to GitHub has a GitHub App now (circlechat/github/apps.mjs), and so does
# the Kev notes push. The personal access tokens are retired: the helper writes none, and removes
# each one it finds.
RETIRED="ALAN_GITHUB_PAT BETTY_GITHUB_PAT PORTER_GITHUB_PAT"
for k in $RETIRED; do has "$k" && echo "  $k is retired: each agent gets a token from the agent's GitHub App. Delete the secret from the GitHub environment."; done
# The agent check's account belonged to CircleChat 1.x, which is gone. The helper writes no password.
has CC_CHECK_PASSWORD && echo "  CC_CHECK_PASSWORD is retired with CircleChat 1.x. Delete the secret from the GitHub environment."
has KEV_DATA_GITHUB_PAT && echo "  KEV_DATA_GITHUB_PAT is retired: the Kev notes push gets a token from the push's GitHub App (data.github_app). Delete the secret from the GitHub environment, and revoke the token on GitHub."
# The apps in site.json: each agent's app, and kev-data for the Kev notes push's app. Alan's app on
# a client stack that uses the public knowledge repo is refused by the config check, so no client
# detail reaches a public PR.
APP_AGENTS="$("$NODE_BIN" -e '
  const s = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
  const apps = Object.keys(s.github_apps ?? {}).filter((a) => /^[a-z0-9][a-z0-9._-]{0,39}$/.test(a) && a !== "kev-data");
  if (s.data?.github_app && s.data?.repo) apps.push("kev-data");
  process.stdout.write(apps.join(" "));
' "$SITE")"
if [ "$CLOUD" = local-only ]; then
  for k in $NAMES; do case "$k" in ANTHROPIC_API_KEY|PORTER_ANTHROPIC_API_KEY|AWS_ACCESS_KEY_ID|VERTEXAI_PROJECT|AZURE_API_KEY|MODEL_KEY_*)
    echo "Refused: $k is a cloud model key, and stack $STACK has no recorded permission for cloud models. Nothing was written."; exit 1 ;;
  esac; done
fi
# Cloud credentials under a provider's own names went to .env, where every container of the stack
# could read them. A cloud key now goes in MODEL_KEY_<NAME>, which only the gateway reads.
for k in AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY VERTEXAI_PROJECT AZURE_API_KEY; do
  has "$k" && { echo "Refused: $k goes in a MODEL_KEY_<NAME> secret now, named in site.json's model_keys (circlechat/README.md, \"Cloud models\"). Nothing was written."; exit 1; }
done
# The helper runs as root, and the owner can replace model-keys.env with a symlink. Writing the
# cloud keys through a symlink would write them to the file the symlink names.
# A hard link would do the same, and the helper also gives the file to the owner on a Mac.
if [[ " $ROLES " == *" control "* ]] && { [ -L "$CC_DIR/model-keys.env" ] || [ -n "$(find "$CC_DIR/model-keys.env" -links +1 2>/dev/null)" ]; }; then
  echo "Refused: $CC_DIR/model-keys.env is a symlink or has a second hard link. Replace the file with a plain file. Nothing was written."; exit 1
fi

# The value of one KEY=value line in a file, or nothing. Never printed to the log.
cur_val() { [ -f "$1" ] && awk -v k="$2" 'index($0, k "=") == 1 { print substr($0, length(k) + 2); exit }' "$1"; }

# Replace or add one KEY=value line, keeping every other line and the file's owner. Returns 1, and
# changes nothing, when the file holds the same value: a service restarts only for a changed value.
#   set_kv <file> <name> <value> [<owner of a new file>]
set_kv() {
  local f="$1" k="$2" v="$3" owner="${4:-$OWNER}" tmp
  if [ -f "$f" ] && grep -q "^$k=" "$f" && [ "$(cur_val "$f" "$k")" = "$v" ]; then echo "  $k unchanged in $f"; return 1; fi
  # A file of root's is created by root, which runs this script: install needs no -o for root.
  if [ ! -f "$f" ]; then if [ "$owner" = root ]; then install -m 600 /dev/null "$f"; else install -m 600 -o "$owner" /dev/null "$f"; fi; fi
  tmp="$(mktemp)"
  awk -v k="$k" 'index($0, k "=") != 1' "$f" > "$tmp"
  printf '%s=%s\n' "$k" "$v" >> "$tmp"
  cat "$tmp" > "$f"; rm -f "$tmp"
  # New files are created 600. An existing file keeps its mode.
  echo "  $k -> $f"
}

# Remove one KEY=value line from a file, when the file has the line.
drop_kv() {
  local f="$1" k="$2" tmp
  [ -f "$f" ] && grep -q "^$k=" "$f" || return 0
  tmp="$(mktemp)"; awk -v k="$k" 'index($0, k "=") != 1' "$f" > "$tmp"; cat "$tmp" > "$f"; rm -f "$tmp"
  echo "  $k removed from $f"
}

# True when one of the names in $2 (comma or space separated) is in the list $1.
changed_any() { local n; for n in ${2//,/ }; do [[ "$1" == *" $n "* ]] && return 0; done; return 1; }

# A kev-engine key rotation (rotate-tokens.sh). kev-engine stops only for a key rotation, and only
# while Barb isn't running and the engine handles no request. The rotation's run checks both before
# it writes anything. When a check fails, the run writes nothing and fails, so the engine keeps
# running with the key in its secrets file.
#   - Barb: the control computer's cluster agent reads Barb's state from the RecursicaChat server's
#     database (cluster/quiet.mjs agentState). No agent named Barb, or one with no turn and no
#     service request open, passes. A state the agent can't read fails.
#   - The engine: three readings over 10 seconds on this computer. No connection is open to the
#     engine's port at any reading. The engine's GET /v1/models shows nothing queued, and the same
#     count of answered requests at the first reading and the last. The engine counts a request
#     only after the request is answered, so the connection check covers a request in progress.
# The proof is the SHA-256 of "kev-rotation", a line break and the new KEV_API_KEY. Only the
# rotation knows the new key when the rotation starts the run, and the hash shows nothing of the
# key. The run restarts kev-engine only when KEV_API_KEY changed, so a second run of the same
# rotation restarts nothing.
# The engine's address is the --host in the kev-engine service's command in site.json, as the
# engine listens there only. No --host is the engine's own default, 127.0.0.1. An engine on every
# address (0.0.0.0 or ::) answers on 127.0.0.1 or ::1.
read -r KEV_HOST KEV_PORT < <("$NODE_BIN" -e '
  const s = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
  const n = (s.nodes ?? []).find((x) => x.name === process.argv[2]);
  const sv = (n?.services ?? []).find((v) => /^kev-engine(-|$)/.test(v.name));
  const m = /(?:^|\s)--host(?:=|\s+)(\S+)/.exec(sv?.command ?? "");
  const host = { "0.0.0.0": "127.0.0.1", "::": "::1", "[::]": "::1" }[m?.[1]] ?? m?.[1]?.replace(/^\[|\]$/g, "") ?? "127.0.0.1";
  console.log(`${host} ${n?.kev?.port ?? 8009}`);
' "$SITE" "$COMPUTER")
KEV_SERVICES=""
for sv in $SERVICE_READS; do
  name="${sv%%:*}" reads="${sv#*:}"
  case "$name" in kev-engine|kev-engine-*) changed_any " ${reads//,/ } " KEV_API_KEY && KEV_SERVICES="$KEV_SERVICES $name" ;; esac
done
KEV_IDLE_WAIT="${AGENT_STACKS_KEV_IDLE_WAIT:-5}"
KEV_READY_SECONDS="${AGENT_STACKS_KEV_READY_SECONDS:-900}"
CLUSTER_ENV="${AGENT_CLUSTER_ENV:-/etc/agent-cluster.env}"

# The rotation's proof of the value on stdin.
kev_proof() { "$NODE_BIN" -e 'let s = ""; process.stdin.on("data", (d) => (s += d)).on("end", () => process.stdout.write(require("crypto").createHash("sha256").update("kev-rotation\n" + s).digest("hex")));'; }

# Barb's state from the control computer's cluster agent: none, idle, busy: <why> or unknown.
# Prints why when the state can't be read, and returns 1.
barb_state() {
  "$NODE_BIN" -e '
    const fs = require("fs");
    const [envFile, siteFile, self, port] = process.argv.slice(1);
    const env = {};
    try { for (const l of fs.readFileSync(envFile, "utf8").split("\n")) { const i = l.indexOf("="); if (i > 0) env[l.slice(0, i)] = l.slice(i + 1); } } catch {}
    const control = (JSON.parse(fs.readFileSync(siteFile, "utf8")).nodes ?? []).find((n) => n.control);
    if (!control) { console.log("site.json names no control computer"); process.exit(1); }
    // As kit/peers.mjs: this computer at 127.0.0.1, another one at its Tailscale address.
    const host = control.name === self ? "127.0.0.1" : control.tailnet_address || (control.address !== "host.docker.internal" ? control.address : "");
    if (!host) { console.log(`site.json gives no address for ${control.name}`); process.exit(1); }
    if (!env.CLUSTER_TOKEN) { console.log(`${envFile} has no CLUSTER_TOKEN`); process.exit(1); }
    fetch(`http://${host.includes(":") ? `[${host}]` : host}:${port}/status`, { headers: { authorization: `Bearer ${env.CLUSTER_TOKEN}` }, signal: AbortSignal.timeout(15000) })
      .then(async (r) => {
        if (!r.ok) { console.log(`the cluster agent on ${control.name} answered ${r.status}`); process.exit(1); }
        const j = await r.json();
        if (typeof j.barb !== "string") { console.log(`the cluster agent on ${control.name} reports no state for Barb, so it runs an older kit`); process.exit(1); }
        console.log(j.barb);
      })
      .catch((e) => { console.log(`the cluster agent on ${control.name} is unreachable (${e.message})`); process.exit(1); });
  ' "$CLUSTER_ENV" "$SITE" "$COMPUTER" "${AGENT_STACKS_AGENT_PORT:-7500}"
}

# The engine's counts from GET /v1/models, with the key on stdin: "<queued> <answered>". Prints why
# when the counts can't be read, and returns 1.
kev_counts() {
  "$NODE_BIN" -e '
    let key = "";
    process.stdin.on("data", (d) => (key += d)).on("end", async () => {
      const [host, port] = process.argv.slice(1);
      const at = `${host.includes(":") ? `[${host}]` : host}:${port}`;
      try {
        const r = await fetch(`http://${at}/v1/models`, { headers: { authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(10000) });
        if (r.status === 401) { console.log("kev-engine refused the key in the secrets file, so the engine runs with another key"); process.exit(1); }
        if (!r.ok) { console.log(`kev-engine answered ${r.status} at ${at}`); process.exit(1); }
        const b = (await r.json()).models?.[0]?.batches;
        if (typeof b?.queued !== "number" || typeof b?.requests !== "number") { console.log("kev-engine reports no request counts"); process.exit(1); }
        console.log(`${b.queued} ${b.requests}`);
      } catch (e) { console.log(`kev-engine does not answer at ${at} (${e.message})`); process.exit(1); }
    });
  ' "$KEV_HOST" "$KEV_PORT"
}

# The connections open to the engine's port on this computer.
kev_connections() {
  if [ "$(uname -s)" = Darwin ]; then netstat -anp tcp | awk -v p="$KEV_PORT" '$6 == "ESTABLISHED" && $4 ~ ("[.]" p "$")' | wc -l
  else ss -Htn state established "( sport = :$KEV_PORT )" | wc -l; fi | tr -d ' '
}

# Why the engine isn't idle, with the key on stdin. Prints nothing, and returns 0, when it is idle.
kev_busy() {
  local key first last n i c
  key="$(cat)"
  for i in 1 2 3; do
    n="$(kev_connections)"
    [ "$n" = 0 ] || { echo "$n connection(s) open to port $KEV_PORT"; return 1; }
    if [ "$i" != 2 ]; then
      if ! c="$(printf '%s' "$key" | kev_counts)"; then echo "$c"; return 1; fi
      if [ "$i" = 1 ]; then first="$c"; else last="$c"; fi
    fi
    [ "$i" = 3 ] || sleep "$KEV_IDLE_WAIT"
  done
  [ "${first%% *}" = 0 ] && [ "${last%% *}" = 0 ] || { echo "requests are queued"; return 1; }
  [ "${first#* }" = "${last#* }" ] || { echo "it answered $(( ${last#* } - ${first#* } )) request(s) in the last $((2 * KEV_IDLE_WAIT)) seconds"; return 1; }
}

# The rotation's checks, each result on its own line. Returns 1 when kev-engine may not stop now.
kev_checks() {
  local s why name
  if ! s="$(barb_state)"; then echo "  Barb's state can't be read: $s."; return 1; fi
  case "$s" in
    none) echo "  Barb isn't running: RecursicaChat has no agent named Barb." ;;
    idle) echo "  Barb isn't running: Barb has no turn queued or running, and no service request open." ;;
    unknown) echo "  Barb's state is unknown: the RecursicaChat server's database can't be read."; return 1 ;;
    *) echo "  Barb is running (${s#busy: })."; return 1 ;;
  esac
  for name in $KEV_SERVICES; do
    if ! why="$(cur_val "$NODE_ENV" KEV_API_KEY | kev_busy)"; then echo "  $name is not idle: $why."; return 1; fi
    echo "  $name is idle: no connection open, nothing queued, and no request answered in $((2 * KEV_IDLE_WAIT)) seconds."
  done
}

KEV_ROTATE=false KEV_OLD=""
if [ "$KEV_ROTATION" = check ]; then
  echo "Key rotation check for kev-engine on $COMPUTER:"
  [ -n "$KEV_SERVICES" ] || { echo "  No service on $COMPUTER reads KEV_API_KEY. Nothing was written."; exit 0; }
  kev_checks || { echo "kev-engine on $COMPUTER may not stop now. Nothing was written."; exit 1; }
  echo "kev-engine on $COMPUTER may stop for the key rotation. Nothing was written."
  exit 0
elif [ -n "$KEV_ROTATION" ]; then
  [ "$RESTART" = true ] || { echo "Refused: a key rotation needs restart on. Nothing was written."; exit 1; }
  has KEV_API_KEY || { echo "Refused: a key rotation needs KEV_API_KEY in the GitHub environment. Nothing was written."; exit 1; }
  [ "$(val KEV_API_KEY | kev_proof)" = "$KEV_ROTATION" ] || { echo "Refused: kev_rotation doesn't match KEV_API_KEY. Only rotate-tokens.sh starts a key rotation. Nothing was written."; exit 1; }
  KEV_OLD="$(cur_val "$NODE_ENV" KEV_API_KEY || true)"
  if [ -n "$KEV_SERVICES" ] && [ "$KEV_OLD" != "$(val KEV_API_KEY)" ]; then
    echo "Key rotation for kev-engine on $COMPUTER:"
    kev_checks || { echo "kev-engine on $COMPUTER may not stop now. Nothing was written."; exit 1; }
    KEV_ROTATE=true
  fi
fi

# The names of the secrets whose values changed, for each file.
CHANGED_NODE=" " CHANGED_CLUSTER=" "
WROTE_CONTROL=false
WROTE_APPS=false
if [[ " $ROLES " == *" control "* ]]; then
  echo "Control computer of stack $STACK:"
  # Programs read these from .env at each run, and the gateway reads none of them, so a changed
  # value here restarts nothing.
  for k in SLACK_BOT_TOKEN RESTIC_PASSWORD KEV_ENGINE_KEY JOBD_TOKEN PORTER_HOOK_URL PORTER_HOOK_SECRET; do
    if has "$k"; then set_kv "$CC_DIR/.env" "$k" "$(val "$k")" || true; fi
  done
  # The gateway's copy of KEV_ENGINE_KEY, for a program's Kev-engine requests (gateway/router.mjs).
  # The router reads the file at each request, so a new key needs no restart. Only an existing,
  # plain state folder gets the file; setup-host.sh makes the folder and writes the file there too.
  KEV_GW="$CC_DIR/gateway-state"
  if has KEV_ENGINE_KEY && [ -d "$KEV_GW" ] && [ ! -L "$KEV_GW" ]; then
    if [ -f "$KEV_GW/kev-engine.key" ] && [ ! -L "$KEV_GW/kev-engine.key" ] && [ "$(cat "$KEV_GW/kev-engine.key")" = "$(val KEV_ENGINE_KEY)" ]; then
      echo "  KEV_ENGINE_KEY unchanged in $KEV_GW/kev-engine.key"
    else
      tmp="$(mktemp "$KEV_GW/.new.XXXXXX")"; printf '%s\n' "$(val KEV_ENGINE_KEY)" > "$tmp"; chmod 600 "$tmp"
      if [ "$(uname -s)" = Darwin ]; then "$CHOWN" -h "$OWNER" "$tmp"; fi
      mv -f "$tmp" "$KEV_GW/kev-engine.key"
      echo "  KEV_ENGINE_KEY -> $KEV_GW/kev-engine.key"
    fi
  fi
  # Cloud keys go to the gateway's secrets file, which root owns and only the gateway reads.
  KEYS_FILE="$CC_DIR/model-keys.env"
  for k in $NAMES; do
    case "$k" in MODEL_KEY_*) name="$k" ;; ANTHROPIC_API_KEY) name=MODEL_KEY_DEFAULT ;; *) continue ;; esac
    [ "$k" = ANTHROPIC_API_KEY ] && has MODEL_KEY_DEFAULT && continue
    if [ -f "$KEYS_FILE" ] && grep -q "^$name=" "$KEYS_FILE" && [ "$(cur_val "$KEYS_FILE" "$name")" = "$(val "$k")" ]; then echo "  $name unchanged in $KEYS_FILE"; continue; fi
    [ -f "$KEYS_FILE" ] || install -m 600 /dev/null "$KEYS_FILE"
    tmp="$(mktemp)"; awk -v k="$name" 'index($0, k "=") != 1' "$KEYS_FILE" > "$tmp"
    printf '%s=%s\n' "$name" "$(val "$k")" >> "$tmp"; cat "$tmp" > "$KEYS_FILE"; rm -f "$tmp"
    chmod 600 "$KEYS_FILE"
    # On a Mac, the Docker VM reads the Mac's files as the owner, never as root, so the gateway
    # can mount only a file the owner owns. On Linux, root keeps the file.
    if [ "$(uname -s)" = Darwin ]; then "$CHOWN" -h "$OWNER" "$KEYS_FILE"; fi
    echo "  $name -> $KEYS_FILE"; WROTE_CONTROL=true
  done
  drop_kv "$CC_DIR/.env" ANTHROPIC_API_KEY
  # Each GitHub App's private key goes to a root-owned file, outside the stack's folder: no agent,
  # container, .env file or backup holds the key. Only the token service reads the file
  # (circlechat/github/token-service.mjs). GitHub keeps the key's line breaks in the secret, and the
  # workflow passes each one as the two characters \n.
  APP_KEYS="${AGENT_STACKS_APP_KEYS:-/var/lib/agent-stacks/github-apps}/$STACK"
  for k in $NAMES; do
    case "$k" in APP_KEY_*) ;; *) continue ;; esac
    # The secret's name for each agent: APP_KEY_<AGENT>, as github/apps.mjs keySecretName.
    match=""; for a in $APP_AGENTS; do [ "APP_KEY_$(printf '%s' "$a" | tr 'a-z.-' 'A-Z__')" = "$k" ] && match="$a"; done
    [ -n "$match" ] || { echo "  $k skipped: site.json's github_apps has no agent for the key, and data.github_app is not the key's app"; continue; }
    pem="$(val "$k")"; pem="${pem//\\n/$'\n'}"
    while [ "${pem%$'\n'}" != "$pem" ]; do pem="${pem%$'\n'}"; done
    case "$pem" in "-----BEGIN "*"PRIVATE KEY-----"*"-----END "*"PRIVATE KEY-----") ;; *) echo "  $k skipped: the value is not a private key in PEM form"; continue ;; esac
    mkdir -p "$APP_KEYS"; chmod 700 "${APP_KEYS%/*}" "$APP_KEYS"
    if [ -f "$APP_KEYS/$match.pem" ] && [ ! -L "$APP_KEYS/$match.pem" ] && [ "$(cat "$APP_KEYS/$match.pem")" = "$pem" ]; then echo "  $k unchanged in $APP_KEYS/$match.pem"; continue; fi
    [ ! -L "$APP_KEYS/$match.pem" ] || rm -f "$APP_KEYS/$match.pem"
    tmp="$(mktemp "$APP_KEYS/.new.XXXXXX")"; printf '%s\n' "$pem" > "$tmp"; chmod 600 "$tmp"; mv -f "$tmp" "$APP_KEYS/$match.pem"
    echo "  $k -> $APP_KEYS/$match.pem"; WROTE_APPS=true
  done
  # The Kev data jobs' retired token leaves the jobs' file. The token service writes the app's token
  # to the same file. The owner can replace the file with a symlink or a hard link, so the helper
  # changes only a plain file.
  KEV_ENV="$CC_DIR/kev-data.env"
  if [ -L "$KEV_ENV" ] || [ -n "$(find "$KEV_ENV" -links +1 2>/dev/null)" ]; then
    if grep -q '^KEV_DATA_GITHUB_PAT=' "$KEV_ENV" 2>/dev/null; then echo "  KEV_DATA_GITHUB_PAT left in $KEV_ENV: the file is a symlink or has a second hard link. Replace the file with a plain file."; fi
  else
    drop_kv "$KEV_ENV" KEV_DATA_GITHUB_PAT
  fi
fi

# The cluster's own secrets, for the cluster's own stack only, in /etc/agent-cluster.env:
#   - Every computer: SLACK_BOT_TOKEN, SLACK_CHANNEL_ID and CLUSTER_TOKEN. On each computer, the
#     cluster agent (cluster/agent.mjs) and the hourly update job (cluster/updater.mjs) read the
#     three secrets. The RustDesk backup posts to Slack with the first two (cluster/post.mjs).
#   - The control computer only: SLACK_APP_TOKEN, APPROVERS and each TOTP_SECRET_<NAME>. Only the
#     cluster's Slack app reads the secrets (cluster/bot.mjs), and only the control computer runs
#     the Slack app (cluster/install-cluster.sh). With an approver's TOTP secret, root on a helper
#     could make valid approval codes.
# A deploy to a helper writes none of the control computer's secrets, and removes each one that the
# helper's file holds.
CONTROL_ONLY='^(SLACK_APP_TOKEN|APPROVERS|TOTP_SECRET_[A-Z0-9_]+)$'
DROPPED_CLUSTER=false
if [ -z "$TENANT" ]; then
  IS_CONTROL=false; [[ " $ROLES " == *" control "* ]] && IS_CONTROL=true
  for k in $NAMES; do
    case "$k" in SLACK_APP_TOKEN|SLACK_BOT_TOKEN|SLACK_CHANNEL_ID|CLUSTER_TOKEN|APPROVERS|TOTP_SECRET_*)
      if [ "$IS_CONTROL" = false ] && [[ "$k" =~ $CONTROL_ONLY ]]; then
        echo "  $k skipped: only the control computer's Slack app reads $k"; continue
      fi
      if set_kv "$CLUSTER_ENV" "$k" "$(val "$k")" root; then CHANGED_CLUSTER="$CHANGED_CLUSTER$k "; fi ;;
    esac
  done
  if [ "$IS_CONTROL" = false ] && [ -f "$CLUSTER_ENV" ]; then
    for k in $(awk -F= '{ print $1 }' "$CLUSTER_ENV"); do
      [[ "$k" =~ $CONTROL_ONLY ]] || continue
      drop_kv "$CLUSTER_ENV" "$k"; DROPPED_CLUSTER=true
    done
  fi
fi

if [[ " $ROLES " == *" jobs "* || " $ROLES " == *" service:"* || " $ROLES " == *" rustdesk "* ]]; then
  echo "Services of stack $STACK on $COMPUTER:"
  for k in KEV_API_KEY JOBD_TOKEN PORTER_GIT_NAME PORTER_GIT_EMAIL PORTER_HOOK_URL PORTER_HOOK_SECRET; do
    if has "$k" && set_kv "$NODE_ENV" "$k" "$(val "$k")"; then CHANGED_NODE="$CHANGED_NODE$k "; fi
  done
  # The RustDesk server's backup secret, only on the computer that runs the server. The backup
  # reads it at each run, so nothing restarts for it.
  if [[ " $ROLES " == *" rustdesk "* ]] && has RUSTDESK_RESTIC_PASSWORD; then set_kv "$NODE_ENV" RUSTDESK_RESTIC_PASSWORD "$(val RUSTDESK_RESTIC_PASSWORD)" || true; fi
  # Port jobs reach cloud models through the gateway, with a key for each task. The node secrets
  # file holds no cloud key.
  has PORTER_ANTHROPIC_API_KEY && echo "  PORTER_ANTHROPIC_API_KEY skipped: port jobs use the gateway. Rename the secret to MODEL_KEY_PORTER, and name porter in that key's agents in site.json."
  drop_kv "$NODE_ENV" ANTHROPIC_API_KEY
  # A port job gets Porter's token from the token service, with the job's task key.
  drop_kv "$NODE_ENV" PORTER_GITHUB_PAT
  "$CHOWN" "$OWNER" "$NODE_ENV" 2>/dev/null || true
fi

# Post one line in the cluster's channel, with the bot token and the channel in the cluster's file.
# Root reads the file. The token never reaches a command line or the log.
post_cluster() {
  "$NODE_BIN" -e '
    const fs = require("fs");
    const [file, computer, text, api] = process.argv.slice(1);
    const env = {};
    try { for (const l of fs.readFileSync(file, "utf8").split("\n")) { const i = l.indexOf("="); if (i > 0) env[l.slice(0, i)] = l.slice(i + 1); } } catch {}
    if (!env.SLACK_BOT_TOKEN || !env.SLACK_CHANNEL_ID) { console.log(`${file} has no SLACK_BOT_TOKEN or SLACK_CHANNEL_ID`); process.exit(1); }
    fetch(`${api}/chat.postMessage`, { method: "POST", signal: AbortSignal.timeout(15000),
      headers: { authorization: `Bearer ${env.SLACK_BOT_TOKEN}`, "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify({ channel: env.SLACK_CHANNEL_ID, text, username: computer }) })
      .then((r) => r.json()).then((j) => { if (!j.ok) { console.log(`Slack answered ${j.error}`); process.exit(1); } })
      .catch((e) => { console.log(e.message); process.exit(1); });
  ' "$CLUSTER_ENV" "$COMPUTER" "$1" "${AGENT_STACKS_SLACK_API:-https://slack.com/api}"
}

# kev-engine never restarts from a deploy, on any computer: a restart stops the engine's work. When
# a value kev-engine reads changed, the deploy writes the value and asks a person, in the cluster's
# channel, to restart kev-engine. A key rotation's run is the one exception, below.
for sv in $SERVICE_READS; do
  name="${sv%%:*}" reads="${sv#*:}"
  case "$name" in kev-engine|kev-engine-*) ;; *) continue ;; esac
  changed_any "$CHANGED_NODE" "$reads" || continue
  [ "$KEV_ROTATE" = true ] && [[ " $KEV_SERVICES " == *" $name "* ]] && continue
  names=""; for n in ${reads//,/ }; do [[ "$CHANGED_NODE" == *" $n "* ]] && names="$names${names:+, }$n"; done
  echo "  $name not restarted: a deploy never restarts $name. $names changed, so $name needs a restart by a person."
  if why="$(post_cluster ":warning: $name on $COMPUTER needs a restart by a person: the secrets deploy of stack $STACK changed $names. A deploy never restarts $name.")"; then
    echo "  Posted in the cluster's channel: $name needs a restart by a person."
  else
    echo "  The post in the cluster's channel failed ($why). Restart $name by hand when the engine is idle."
  fi
done

if [ "$RESTART" != true ]; then
  # The running cluster agent read the removed secrets at the agent's start.
  if [ "$DROPPED_CLUSTER" = true ]; then echo "  The cluster agent holds the removed secrets until the agent restarts. Run the deploy again with restart, or restart cluster-agent."; fi
  echo "Secrets written. Nothing restarted."
  exit 0
fi

# Restart one service, and print the real result: restarted, not installed, failed to restart, or
# stopped after the restart.
RESTARTED=0 FAILED=""
restart_unit() {
  local u="$1"
  if [ "$(uname -s)" = Darwin ]; then
    if ! launchctl print "system/io.recursica.$u" >/dev/null 2>&1; then echo "  $u is not installed on $COMPUTER: nothing restarted"; return 0; fi
    if launchctl kickstart -k "system/io.recursica.$u" >/dev/null 2>&1; then echo "  restarted $u"; RESTARTED=$((RESTARTED + 1))
    else echo "  $u failed to restart"; FAILED="$FAILED $u"; fi
    return 0
  fi
  if ! systemctl cat "$u.service" >/dev/null 2>&1; then echo "  $u is not installed on $COMPUTER: nothing restarted"; return 0; fi
  if ! systemctl restart "$u.service" >/dev/null 2>&1; then echo "  $u failed to restart"; FAILED="$FAILED $u"; return 0; fi
  if systemctl is-active --quiet "$u.service"; then echo "  restarted $u"; RESTARTED=$((RESTARTED + 1))
  else echo "  $u restarted, then stopped. Read the service's log: journalctl -u $u"; FAILED="$FAILED $u"; fi
}
# Each service restarts only when a value the service reads changed.
#   jobd: JOBD_TOKEN, PORTER_GIT_NAME, PORTER_GIT_EMAIL, PORTER_HOOK_URL and PORTER_HOOK_SECRET
#   each service in site.json: the service's secret_env. kev-engine never restarts (above).
#   the token service: the apps' private keys
#   the cluster agent: SLACK_BOT_TOKEN, SLACK_CHANNEL_ID and CLUSTER_TOKEN, and a removed line,
#     which the running agent still holds
#   the Slack app: every cluster secret
# A key rotation restarts kev-engine once, with the new key, right after the checks passed. A
# connection that opened since then puts the old key back, and fails the run, so the engine keeps
# running with the key in its secrets file.
if [ "$KEV_ROTATE" = true ]; then
  for name in $KEV_SERVICES; do
    n="$(kev_connections)"
    if [ "$n" != 0 ]; then
      set_kv "$NODE_ENV" KEV_API_KEY "$KEV_OLD" >/dev/null || true
      echo "  $name not restarted: $n connection(s) opened to port $KEV_PORT after the checks. The old key is back in $NODE_ENV."
      FAILED="$FAILED $name"; continue
    fi
    before="$FAILED"
    restart_unit "$name"
    [ "$FAILED" = "$before" ] || continue
    t=0
    until val KEV_API_KEY | kev_counts >/dev/null; do
      if [ "$t" -ge "$KEV_READY_SECONDS" ]; then echo "  $name doesn't answer with the new key after $t seconds. Read the service's log."; FAILED="$FAILED $name"; break; fi
      sleep 5; t=$((t + 5))
    done
    [ "$FAILED" != "$before" ] || echo "  $name answers with the new key after about $t seconds."
  done
fi
if [[ " $ROLES " == *" jobs "* ]] && changed_any "$CHANGED_NODE" "JOBD_TOKEN PORTER_GIT_NAME PORTER_GIT_EMAIL PORTER_HOOK_URL PORTER_HOOK_SECRET"; then restart_unit "jobd$SUFFIX"; fi
for sv in $SERVICE_READS; do
  name="${sv%%:*}" reads="${sv#*:}"
  case "$name" in kev-engine|kev-engine-*) continue ;; esac
  if changed_any "$CHANGED_NODE" "$reads"; then restart_unit "$name"; fi
done
if [ "$WROTE_APPS" = true ]; then restart_unit "github-tokens$SUFFIX"; fi
if [ "$DROPPED_CLUSTER" = true ] || changed_any "$CHANGED_CLUSTER" "SLACK_BOT_TOKEN SLACK_CHANNEL_ID CLUSTER_TOKEN"; then restart_unit cluster-agent; fi
if [ "$CHANGED_CLUSTER" != " " ] && [[ " $ROLES " == *" control "* ]]; then restart_unit cluster-bot; fi
if [ "$WROTE_CONTROL" = true ]; then
  # The gateway reads the secrets file when the gateway starts, so the kit recreates the gateway.
  # The owner needs no sudo for this: the helper takes each step that needs root, and the owner
  # takes only the Docker steps (setup-host.sh with KIT_ROOT_STEPS=1).
  #   1. Root: the gateway's state folder and LiteLLM's master key (setup-host.sh does the same in
  #      the full setup). On a Mac, the owner owns each one, so the gateway's containers can mount
  #      them. The owner can change the stack's folder: the helper refuses a symlinked state folder,
  #      writes each file as a new file that replaces the old one, and gives the owner only the files
  #      the helper writes.
  GW_STATE="$CC_DIR/gateway-state"
  [ ! -L "$GW_STATE" ] || { echo "Refused: $GW_STATE is a symlink. Replace the symlink with a folder."; exit 1; }
  mkdir -p "$GW_STATE"; chmod 700 "$GW_STATE"
  MAC=false; [ "$(uname -s)" = Darwin ] && MAC=true
  [ "$MAC" = false ] || "$CHOWN" -h "$OWNER" "$GW_STATE"
  put_state() {
    local tmp; tmp="$(mktemp "$GW_STATE/.new.XXXXXX")"
    cat > "$tmp"; chmod 600 "$tmp"
    [ "$MAC" = false ] || "$CHOWN" -h "$OWNER" "$tmp"
    mv -f "$tmp" "$GW_STATE/$1"
  }
  [ -s "$GW_STATE/litellm-master.key" ] && [ ! -L "$GW_STATE/litellm-master.key" ] || echo "sk-$(openssl rand -hex 24)" | put_state litellm-master.key
  if [ ! -f "$KEYS_FILE" ]; then install -m 600 /dev/null "$KEYS_FILE"; [ "$MAC" = false ] || "$CHOWN" -h "$OWNER" "$KEYS_FILE"; fi
  #   2. The owner: the gateway, in Docker. setup-host.sh reads one line on stdin with
  #      KIT_ROOT_STEPS, for an older caller, and ignores the line.
  sudo -u "$OWNER" -H env KIT_ROOT_STEPS=1 TENANT="$TENANT" CC_DIR="$CC_DIR" SITE="$SITE" \
    PATH="$(dirname "$NODE_BIN"):$PATH" bash "$KIT/circlechat/setup-host.sh" --secrets-only </dev/null
fi
if [ -n "$FAILED" ]; then echo "Secrets written for stack $STACK on $COMPUTER. Failed to restart:$FAILED."; exit 1; fi
if [ "$RESTARTED" = 0 ] && [ "$WROTE_CONTROL" = false ]; then echo "Secrets written for stack $STACK on $COMPUTER. No value a service reads changed, so nothing restarted."; exit 0; fi
echo "Secrets written and applied for stack $STACK on $COMPUTER."
