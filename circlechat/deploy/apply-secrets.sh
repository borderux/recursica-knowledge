#!/usr/bin/env bash
# Write one stack's secrets on this computer, then restart what reads them. Root runs this script:
# install-secrets-helper.sh copies it to /usr/local/bin/agent-stacks-apply, owned by root, and lets
# the GitHub runner's user run that copy through sudo and nothing else.
#
#   <KEY=value lines on stdin> | agent-stacks-apply <stack> <computer> <restart: true|false>
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
case "${1:-}" in --unlock) MODE=unlock; shift ;; --lock) MODE=lock; shift ;; esac
STACK="${1:?usage: agent-stacks-apply <stack> <computer> <restart>}"
COMPUTER="${2:?usage: agent-stacks-apply <stack> <computer> <restart>}"
RESTART="${3:-false}"
SLUG='^[a-z0-9][a-z0-9-]*$'
case "$STACK" in
  client-*) TENANT="${STACK#client-}" ;;
  *)
    # The cluster's own stack. The JSON is read in place, so root runs no kit file here
    # (kit/render.mjs, clusterStackName, holds the same rule).
    CLUSTER_STACK="$("$NODE_BIN" -e '
      let s = {}; try { s = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")); } catch {}
      process.stdout.write(s.site?.stack_name || "cluster");
    ' "$OWNER_HOME/circlechat/site.json")"
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
  CC_DIR="$OWNER_HOME/circlechat"; NODE_ENV="$OWNER_HOME/.recursica-node.env"; SUFFIX=""
else
  # A client's secrets file sits inside the client's encrypted disk image.
  CC_DIR="$OWNER_HOME/tenants/$TENANT/circlechat"; NODE_ENV="$OWNER_HOME/tenants/$TENANT/node.env"; SUFFIX="-$TENANT"
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
KNOWN='^(MODEL_KEY_[A-Z0-9_]+|AWS_ACCESS_KEY_ID|AWS_SECRET_ACCESS_KEY|AWS_REGION_NAME|VERTEXAI_PROJECT|VERTEXAI_LOCATION|AZURE_API_KEY|AZURE_API_BASE|AZURE_API_VERSION|GIT_TOKEN|SLACK_APP_TOKEN|SLACK_BOT_TOKEN|SLACK_CHANNEL_ID|CLUSTER_TOKEN|APPROVERS|TOTP_SECRET_[A-Z0-9_]+|ANTHROPIC_API_KEY|RESTIC_PASSWORD|KEV_ENGINE_KEY|KEV_API_KEY|JOBD_TOKEN|PORTER_HOOK_URL|PORTER_HOOK_SECRET|PORTER_ANTHROPIC_API_KEY|PORTER_GIT_NAME|PORTER_GIT_EMAIL|KEV_DATA_GITHUB_PAT|CC_CHECK_PASSWORD|APP_KEY_[A-Z0-9_]+|ALAN_GITHUB_PAT|BETTY_GITHUB_PAT|PORTER_GITHUB_PAT)$'
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
  console.log(r.join(" ") || "none");
' "$SITE" "$COMPUTER")"
[ "$ROLES" != none ] || { echo "Computer $COMPUTER runs nothing for stack $STACK in $SITE."; exit 1; }

# A client or demo stack without a recorded permission runs local models only, so no cloud
# key may reach the stack. The helper refuses the whole run before writing anything.
CLOUD="$("$NODE_BIN" -e '
  const s = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
  const local = ["client", "demo"].includes(s.site?.kind) && s.site?.cloud_models?.allowed !== true;
  console.log(local ? "local-only" : "allowed");
' "$SITE")"
# Each agent that pushes to GitHub has a GitHub App now (circlechat/github/apps.mjs). The agents'
# personal access tokens are retired: the helper writes none, and removes each one it finds.
RETIRED="ALAN_GITHUB_PAT BETTY_GITHUB_PAT PORTER_GITHUB_PAT"
for k in $RETIRED; do has "$k" && echo "  $k is retired: each agent gets a token from the agent's GitHub App. Delete the secret from the GitHub environment."; done
# The agents with a GitHub App in site.json. Alan's app on a client stack that uses the public
# knowledge repo is refused by the config check, so no client detail reaches a public PR.
APP_AGENTS="$("$NODE_BIN" -e '
  const s = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
  process.stdout.write(Object.keys(s.github_apps ?? {}).filter((a) => /^[a-z0-9][a-z0-9._-]{0,39}$/.test(a)).join(" "));
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
# The same for the Kev data jobs' token file.
if [[ " $ROLES " == *" control "* ]] && has KEV_DATA_GITHUB_PAT && { [ -L "$CC_DIR/kev-data.env" ] || [ -n "$(find "$CC_DIR/kev-data.env" -links +1 2>/dev/null)" ]; }; then
  echo "Refused: $CC_DIR/kev-data.env is a symlink or has a second hard link. Replace the file with a plain file. Nothing was written."; exit 1
fi
# The same for the agent check's password file.
if [[ " $ROLES " == *" control "* ]] && has CC_CHECK_PASSWORD && { [ -L "$CC_DIR/agent-check.env" ] || [ -n "$(find "$CC_DIR/agent-check.env" -links +1 2>/dev/null)" ]; }; then
  echo "Refused: $CC_DIR/agent-check.env is a symlink or has a second hard link. Replace the file with a plain file. Nothing was written."; exit 1
fi

# Replace or add one KEY=value line, keeping every other line and the file's owner.
set_kv() {
  local f="$1" k="$2" v="$3" tmp
  [ -f "$f" ] || { install -m 600 -o "$OWNER" /dev/null "$f"; }
  tmp="$(mktemp)"
  awk -v k="$k" 'index($0, k "=") != 1' "$f" > "$tmp"
  printf '%s=%s\n' "$k" "$v" >> "$tmp"
  cat "$tmp" > "$f"; rm -f "$tmp"
  # New files are created 600. An existing file keeps its mode: an agent's container reads its .env.
  echo "  $k -> $f"
}

# Remove one KEY=value line from a file, when the file has the line.
drop_kv() {
  local f="$1" k="$2" tmp
  [ -f "$f" ] && grep -q "^$k=" "$f" || return 0
  tmp="$(mktemp)"; awk -v k="$k" 'index($0, k "=") != 1' "$f" > "$tmp"; cat "$tmp" > "$f"; rm -f "$tmp"
  echo "  $k removed from $f"
}

WROTE_CONTROL=false
WROTE_APPS=false
WROTE_CHECK=false
if [[ " $ROLES " == *" control "* ]]; then
  echo "Control computer of stack $STACK:"
  for k in SLACK_BOT_TOKEN RESTIC_PASSWORD KEV_ENGINE_KEY JOBD_TOKEN PORTER_HOOK_URL PORTER_HOOK_SECRET; do
    has "$k" && { set_kv "$CC_DIR/.env" "$k" "$(val "$k")"; WROTE_CONTROL=true; }
  done
  # Cloud keys go to the gateway's secrets file, which root owns and only the gateway reads.
  KEYS_FILE="$CC_DIR/model-keys.env"
  for k in $NAMES; do
    case "$k" in MODEL_KEY_*) name="$k" ;; ANTHROPIC_API_KEY) name=MODEL_KEY_DEFAULT ;; *) continue ;; esac
    [ "$k" = ANTHROPIC_API_KEY ] && has MODEL_KEY_DEFAULT && continue
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
  # A retired token leaves each agent's .env.
  for home in "$CC_DIR"/hermes-homes/.hermes-*; do
    [ -d "$home" ] && [ ! -L "$home" ] && [ ! -L "$home/.env" ] || continue
    for k in $RETIRED; do drop_kv "$home/.env" "$k"; done
  done
  # Each GitHub App's private key goes to a root-owned file, outside the stack's folder: no agent,
  # container, .env file or backup holds the key. Only the token service reads the file
  # (circlechat/github/token-service.mjs). GitHub keeps the key's line breaks in the secret, and the
  # workflow passes each one as the two characters \n.
  APP_KEYS="${AGENT_STACKS_APP_KEYS:-/var/lib/agent-stacks/github-apps}/$STACK"
  for k in $NAMES; do
    case "$k" in APP_KEY_*) ;; *) continue ;; esac
    # The secret's name for each agent: APP_KEY_<AGENT>, as github/apps.mjs keySecretName.
    match=""; for a in $APP_AGENTS; do [ "APP_KEY_$(printf '%s' "$a" | tr 'a-z.-' 'A-Z__')" = "$k" ] && match="$a"; done
    [ -n "$match" ] || { echo "  $k skipped: site.json's github_apps has no agent for the key"; continue; }
    pem="$(val "$k")"; pem="${pem//\\n/$'\n'}"
    while [ "${pem%$'\n'}" != "$pem" ]; do pem="${pem%$'\n'}"; done
    case "$pem" in "-----BEGIN "*"PRIVATE KEY-----"*"-----END "*"PRIVATE KEY-----") ;; *) echo "  $k skipped: the value is not a private key in PEM form"; continue ;; esac
    mkdir -p "$APP_KEYS"; chmod 700 "${APP_KEYS%/*}" "$APP_KEYS"
    [ ! -L "$APP_KEYS/$match.pem" ] || rm -f "$APP_KEYS/$match.pem"
    tmp="$(mktemp "$APP_KEYS/.new.XXXXXX")"; printf '%s\n' "$pem" > "$tmp"; chmod 600 "$tmp"; mv -f "$tmp" "$APP_KEYS/$match.pem"
    echo "  $k -> $APP_KEYS/$match.pem"; WROTE_APPS=true
  done
  # The Kev data jobs' own token (kit/push-data.sh) goes in a file of its own, which no agent and no
  # container reads. Only a stack whose site.json names a private repo in data.repo gets the token.
  if has KEV_DATA_GITHUB_PAT; then
    KEV_ENV="$CC_DIR/kev-data.env"
    if [ -z "$("$NODE_BIN" -e 'const s = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")); process.stdout.write(s.data?.repo ?? "")' "$SITE")" ]; then
      echo "  KEV_DATA_GITHUB_PAT skipped: site.json sets no data.repo, so the Kev data push is off"
    else
      set_kv "$KEV_ENV" KEV_DATA_GITHUB_PAT "$(val KEV_DATA_GITHUB_PAT)"; chmod 600 "$KEV_ENV"; "$CHOWN" -h "$OWNER" "$KEV_ENV"
    fi
  fi
  # The agent check's password (kit/check-account.mjs, kit/agent-check.mjs) goes in a file of its
  # own, which the owner reads and no agent and no container reads. The check signs in to
  # CircleChat with the password, as an account that is a member and never an admin.
  if has CC_CHECK_PASSWORD; then
    CHECK_ENV="$CC_DIR/agent-check.env"
    set_kv "$CHECK_ENV" CC_CHECK_PASSWORD "$(val CC_CHECK_PASSWORD)"; chmod 600 "$CHECK_ENV"; "$CHOWN" -h "$OWNER" "$CHECK_ENV"
    WROTE_CHECK=true
  fi
fi

# The cluster's own secrets: the Slack app, the cluster token and the approvers' authenticator
# secrets. They belong to the cluster's own stack, and go to every computer that stack deploys to.
CLUSTER_ENV="${AGENT_CLUSTER_ENV:-/etc/agent-cluster.env}"
WROTE_CLUSTER=false
if [ -z "$TENANT" ]; then
  for k in $NAMES; do
    case "$k" in SLACK_APP_TOKEN|SLACK_BOT_TOKEN|SLACK_CHANNEL_ID|CLUSTER_TOKEN|APPROVERS|TOTP_SECRET_*)
      [ -f "$CLUSTER_ENV" ] || install -m 600 /dev/null "$CLUSTER_ENV"
      tmp="$(mktemp)"; awk -v k="$k" 'index($0, k "=") != 1' "$CLUSTER_ENV" > "$tmp"
      printf '%s=%s\n' "$k" "$(val "$k")" >> "$tmp"; cat "$tmp" > "$CLUSTER_ENV"; rm -f "$tmp"
      echo "  $k -> $CLUSTER_ENV"; WROTE_CLUSTER=true ;;
    esac
  done
fi

WROTE_NODE=false
if [[ " $ROLES " == *" jobs "* || " $ROLES " == *" service:"* ]]; then
  echo "Services of stack $STACK on $COMPUTER:"
  for k in KEV_API_KEY JOBD_TOKEN PORTER_GIT_NAME PORTER_GIT_EMAIL PORTER_HOOK_URL PORTER_HOOK_SECRET; do
    has "$k" && { set_kv "$NODE_ENV" "$k" "$(val "$k")"; WROTE_NODE=true; }
  done
  # Port jobs reach cloud models through the gateway, with a key for each task. The node secrets
  # file holds no cloud key.
  has PORTER_ANTHROPIC_API_KEY && echo "  PORTER_ANTHROPIC_API_KEY skipped: port jobs use the gateway. Rename the secret to MODEL_KEY_PORTER, and name porter in that key's agents in site.json."
  drop_kv "$NODE_ENV" ANTHROPIC_API_KEY
  # A port job gets Porter's token from the token service, with the job's task key.
  drop_kv "$NODE_ENV" PORTER_GITHUB_PAT
  "$CHOWN" "$OWNER" "$NODE_ENV" 2>/dev/null || true
fi

if [ "$RESTART" != true ]; then
  echo "Secrets written. Nothing restarted."
  [ "$WROTE_CHECK" = false ] || echo "The agent check's account keeps the old password until a deploy with restart."
  exit 0
fi

restart_unit() {
  if [ "$(uname -s)" = Darwin ]; then launchctl kickstart -k "system/io.recursica.$1"
  else systemctl restart "$1"; fi
  echo "  restarted $1"
}
if [ "$WROTE_NODE" = true ]; then
  [[ " $ROLES " == *" jobs "* ]] && restart_unit "jobd$SUFFIX"
  for r in $ROLES; do case "$r" in service:*) restart_unit "${r#service:}" ;; esac; done
fi
# The token service reads each app's private key when the service starts.
if [ "$WROTE_APPS" = true ]; then restart_unit "github-tokens$SUFFIX" 2>/dev/null || echo "  github-tokens$SUFFIX is not installed yet: run setup-host.sh once"; fi
# The cluster agent and the Slack app read the cluster's secrets when they start.
if [ "$WROTE_CLUSTER" = true ]; then
  for u in cluster-agent cluster-bot; do restart_unit "$u" 2>/dev/null || true; done
fi
if [ "$WROTE_CONTROL" = true ]; then
  # The gateway reads the secrets file and the notifier reads .env when they start, so the kit
  # recreates both. Agents read their own .env at the start of each turn and need no restart.
  # The owner needs no sudo for this: the helper takes each step that needs root, and the owner
  # takes only the Docker steps (setup-host.sh with KIT_ROOT_STEPS=1).
  #   1. Root: the gateway's state folder, LiteLLM's master key, and the database role's password
  #      and address (setup-host.sh does the same in the full setup). On a Mac, the owner owns each
  #      one, so the gateway's containers can mount them. The owner can change the stack's folder:
  #      the helper refuses a symlinked state folder, writes each file as a new file that replaces
  #      the old one, and gives the owner only the files the helper writes.
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
  # A password the kit made is 48 hex digits. Anything else, such as a file the owner swapped in,
  # is replaced, so the helper never copies another file's text into the database address.
  DB_PASSWORD="$(cat "$GW_STATE/db-password" 2>/dev/null || true)"
  if [ -L "$GW_STATE/db-password" ] || ! [[ "$DB_PASSWORD" =~ ^[0-9a-f]{48}$ ]]; then
    DB_PASSWORD="$(openssl rand -hex 24)"; printf '%s\n' "$DB_PASSWORD" | put_state db-password
  fi
  printf 'postgres://cc_gateway_read:%s@postgres:5432/circlechat\n' "$DB_PASSWORD" | put_state db.url
  if [ ! -f "$KEYS_FILE" ]; then install -m 600 /dev/null "$KEYS_FILE"; [ "$MAC" = false ] || "$CHOWN" -h "$OWNER" "$KEYS_FILE"; fi
  #   2. The owner: the gateway and the notifier, in Docker. The database role's password goes on
  #      stdin, never on a command line, which every account can read in ps.
  printf '%s\n' "$DB_PASSWORD" | sudo -u "$OWNER" -H env KIT_ROOT_STEPS=1 TENANT="$TENANT" CC_DIR="$CC_DIR" SITE="$SITE" \
    PATH="$(dirname "$NODE_BIN"):$PATH" bash "$KIT/circlechat/setup-host.sh" --secrets-only
  #   3. Root: the key check (gateway/key-check.mjs), as in every mode of setup-host.sh. The owner
  #      dumps CircleChat's database from Docker, and root reads the secrets file and the agent
  #      homes. The kit passed the kit check above.
  DCTX="$(sed -n 's/^DOCKER_CONTEXT=//p' "$CC_DIR/kit-out/tenant.env" 2>/dev/null || true)"
  (sudo -u "$OWNER" -H env ${DCTX:+DOCKER_CONTEXT="$DCTX"} PATH="$(dirname "$NODE_BIN"):$PATH" \
    bash -c 'cd "$1" && docker compose exec -T postgres pg_dump -U postgres circlechat' _ "$CC_DIR" 2>/dev/null || true) |
    "$NODE_BIN" "$KIT/circlechat/gateway/key-check.mjs" --secrets "$KEYS_FILE" --private-keys "${AGENT_STACKS_APP_KEYS:-/var/lib/agent-stacks/github-apps}/$STACK" --stdin "CircleChat's database" "$CC_DIR/hermes-homes"
fi
# The agent check's account: made when missing, with the delivered password, and kept a member of
# the agents' workspace. The owner runs the step, in Docker; the password stays in the file, and
# reaches CircleChat's api container on stdin.
if [ "$WROTE_CHECK" = true ]; then
  sudo -u "$OWNER" -H env TENANT="$TENANT" CC_DIR="$CC_DIR" SITE="$SITE" PATH="$(dirname "$NODE_BIN"):$PATH" \
    "$NODE_BIN" "$KIT/circlechat/kit/check-account.mjs" </dev/null || { echo "The check's password is written, and the check's account is not ready: see the line above."; exit 1; }
fi
echo "Secrets written and applied for stack $STACK on $COMPUTER."
