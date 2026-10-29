#!/usr/bin/env bash
# Set up (or update: safe to rerun) the CONTROL machine of a deployment: CircleChat, the agents'
# shared workspace, the model gateway, the Slack notifier, and the background jobs that keep it
# all current. Linux or macOS. Everything specific to the deployment comes from site.json.
#
#   1. Clone CircleChat to $CC_DIR, and put your config at $CC_DIR/site.json
#      (start from circlechat/site.example.json). Secrets go in $CC_DIR/.env.
#   2. ./circlechat/setup-host.sh
#   3. Install each agent in the CircleChat UI, then ./circlechat/setup-agent.sh <handle>.
#   4. On every other machine in site.json: ./circlechat/setup-node.sh <node name>
#
# One computer can hold several stacks, one per client. Give each its own site.json with
# site.tenant set, and run every kit script with TENANT=<name>: the stack then lives in
# ~/tenants/<name>/ and every container, volume, port and job carries its name.
#
# --secrets-only: after a secret changes, recreate only the model gateway and the Slack notifier,
# which read their secrets when they start. CircleChat, the agents and the background jobs keep
# running. The deploy-secrets workflow uses this mode; see circlechat/README.md, "Secrets in GitHub".
#
# Every mode ends with the key check (gateway/key-check.mjs): the setup fails when a cloud model key
# is in CircleChat's database or in an agent's Hermes home.
set -euo pipefail
# --upgrade: the upgrade job's mode, after a new release is checked out. Changes only what needs
# no sudo: the rendered config, the containers, the gateway, the notifier and the filter.
SECRETS_ONLY=false; UPGRADE_ONLY=false
[ "${1:-}" = --secrets-only ] && SECRETS_ONLY=true
[ "${1:-}" = --upgrade ] && { SECRETS_ONLY=true; UPGRADE_ONLY=true; }
# KIT_ROOT_STEPS=1: a root process runs --secrets-only or --upgrade as the owner, who may have no
# password-free sudo. The root process takes each step that needs root before and after this run,
# and passes the database role's password on stdin. This run takes only the Docker steps. The
# secrets helper (deploy/apply-secrets.sh) runs --secrets-only this way, and the upgrade job
# (cluster/root-steps.mjs) runs --upgrade this way. KIT_SECRETS_HELPER=1 is the older name, from a
# secrets helper installed before the upgrade job used the same mode.
HELPER=false
if [ -n "${KIT_ROOT_STEPS:-${KIT_SECRETS_HELPER:-}}" ]; then
  [ "$SECRETS_ONLY" = true ] || { echo "KIT_ROOT_STEPS needs --secrets-only or --upgrade."; exit 1; }
  HELPER=true; IFS= read -r HELPER_DB_PASSWORD || true; exec </dev/null
fi

if [ -n "${TENANT:-}" ]; then
  CC_DIR="${CC_DIR:-$HOME/tenants/$TENANT/circlechat}"
  WS="${WS:-$HOME/tenants/$TENANT/workspace}"
fi

CC_DIR="${CC_DIR:-$HOME/circlechat}"
WS="${WS:-$HOME/circlechat-workspace}"
SITE="${SITE:-$CC_DIR/site.json}"
HERE="$(cd "$(dirname "$0")" && pwd)"
. "$HERE/kit/lib.sh"
# Every mode runs the key check as root, and the full setup installs jobs that root runs from this
# checkout. The checkout must sit outside the agents' workspace.
require_kit "$HERE/.."
# Exact versions of the npm packages the agents run. Move a version up by pull request, 7 days
# or more after the version's release.
RECURSICA_MCP_VERSION=0.8.1

[ -f "$SITE" ] || { echo "No $SITE. Copy circlechat/site.example.json there and fill it in."; exit 1; }
command -v docker >/dev/null || { echo "Docker is not installed (Linux: Docker Engine; macOS: Colima or OrbStack)."; exit 1; }
command -v node >/dev/null   || { echo "Node 20+ is not installed."; exit 1; }

# The control computer's Ollama server from site.json (kit/render.mjs ollamaService): "port", or
# "env" for the server's settings, one NAME=value on each line.
# The mode comes first: render.mjs renders when its own path is the first argument.
ollama_service() { node --input-type=module -e '
  import fs from "node:fs";
  const { ollamaService } = await import(process.argv[2]);
  const o = ollamaService(JSON.parse(fs.readFileSync(process.argv[3], "utf8")));
  if (o) process.stdout.write(process.argv[1] === "port" ? String(o.port) : o.env.join("\n"));
' "$1" "$HERE/kit/render.mjs" "$SITE"; }
# On a Mac, the cluster's own stack runs Colima's VM and Ollama as LaunchDaemons (kit/lib.sh). A
# client stack's VM sits in the client's disk image, and the "Unlock stack" workflow starts the VM.
# The other modes need no sudo, so only the full setup installs the daemons. A LaunchDaemon outside
# the kit that already runs Colima or Ollama stops the setup here, before anything changes.
MAC_SERVICES=false
if [ "$OS" = Darwin ] && [ -z "${TENANT:-}" ] && [ "$SECRETS_ONLY" = false ]; then
  MAC_SERVICES=true
  case "$(docker context show 2>/dev/null)" in
    colima) VM_PROFILE=default ;;
    colima-*) VM_PROFILE="$(docker context show)"; VM_PROFILE="${VM_PROFILE#colima-}" ;;
    *) VM_PROFILE="" ;;
  esac
  # A broken site.json gives no port here, and the render below stops the setup.
  OLLAMA_PORT="$(ollama_service port 2>/dev/null || true)"
  mac_services_check "$VM_PROFILE" "$OLLAMA_PORT" || exit 1
fi

# Validate and render. A broken site.json stops here, before anything changes. A client or demo
# stack's computers are checked against the cluster's own site.json, and each model that does not
# fit the stack's computers is left out, with a line that says so.
KIT_OUT="$CC_DIR/kit-out"
if [ -n "${TENANT:-}" ] && [ -f "$HOME/circlechat/site.json" ]; then export CLUSTER_SITE="$HOME/circlechat/site.json"; fi
node "$HERE/kit/render.mjs" "$SITE" "$KIT_OUT"
. "$KIT_OUT/app.env"
WANT_TENANT="${TENANT:-}"
. "$KIT_OUT/tenant.env"
[ "$WANT_TENANT" = "$TENANT" ] || { echo "TENANT=${WANT_TENANT:-<none>} but $SITE has site.tenant ${TENANT:-<none>}. Run with the stack's own TENANT and site.json."; exit 1; }
# The Mac's Colima and Ollama services (checked above). Ollama runs with the server's settings from
# site.json, which the render above has checked.
if [ "$MAC_SERVICES" = true ]; then
  # shellcheck disable=SC2046  # one word per setting, each NAME=value with no space
  mac_services "$VM_PROFILE" "$OLLAMA_PORT" $(ollama_service env)
fi
# A client stack runs in its own Docker VM. Every docker command below, and every job installed
# below, uses that VM.
if [ -n "$DOCKER_CONTEXT" ]; then
  docker context inspect "$DOCKER_CONTEXT" >/dev/null 2>&1 || { echo "Docker context $DOCKER_CONTEXT does not exist. On a Mac: colima start --profile ${DOCKER_CONTEXT#colima-}"; exit 1; }
  export DOCKER_CONTEXT
  check_vm_limits "$LIMIT_CPUS" "$LIMIT_MEMORY_GB" || exit 1
fi
DCTX="${DOCKER_CONTEXT:+DOCKER_CONTEXT=$DOCKER_CONTEXT }"
# On a Mac whose Docker runs in Colima, tailscale serve gives the other computers the gateway's
# port (gateway_serve). Linux keeps Docker's direct publish on the Tailscale address.
GATEWAY_SERVE=false
if [ "$OS" = Darwin ]; then case "${DOCKER_CONTEXT:-$(docker context show 2>/dev/null)}" in colima*) GATEWAY_SERVE=true ;; esac; fi
JOBS_LOCAL_PORT=$((GATEWAY_PORT + 1))
TS_HOST="$(site_get site.public_host)"
PORT="$(site_get site.port)"; PORT="${PORT:-8080}"
KNOWLEDGE_REPO="$(site_get repos.knowledge)"
APP_REPO_URL="$(site_get repos.app)"

cd "$CC_DIR"
# Add each default from .env.example that .env lacks. The secrets helper can create .env before
# the first setup, and a plain copy would then skip CircleChat's defaults.
touch .env
if [ -f .env.example ]; then
  while IFS= read -r line; do
    case "$line" in ''|\#*) continue ;; esac
    grep -q "^${line%%=*}=" .env || printf '%s\n' "$line" >> .env
  done < .env.example
fi
set_env() { sedi "/^$1=/d" .env; echo "$1=$2" >> .env; }   # replace or append, never duplicate
env_has() { grep -q "^$1=." .env; }
set_env HERMES_HOMES_DIR "$CC_DIR/hermes-homes"
set_env CC_REPO_HOST_DIR "$CC_DIR"
# CircleChat's public address: the HTTPS address people use, which single sign-on (such as Google)
# sends people back to. The api and the bridge reach CircleChat on this computer through
# CC_API_BASE instead, so they never depend on the public address.
if [ -n "$TENANT" ] && [ "$PROXY" = tailscale ]; then PUBLIC_URL="https://$TS_HOST:$PORT"; else PUBLIC_URL="https://$TS_HOST"; fi
set_env PUBLIC_BASE_URL "$PUBLIC_URL"
set_env CC_API_BASE "http://localhost:$PORT/api"
# The stack's own Slack channel, for every post from this stack (the Slack app's bot token comes
# from the secrets helper).
SLACK_CHANNEL_ID="$(site_get site.slack_channel_id)"
if [ -n "$SLACK_CHANNEL_ID" ]; then set_env SLACK_CHANNEL "$SLACK_CHANNEL_ID"; else sedi "/^SLACK_CHANNEL=/d" .env; fi
set_env CC_SHARED_WORKSPACE_DIR "$WS"
# Seconds. The api discards a reply that takes longer than this + 60s, and a full Barb review
# does. 480 and 1200 both lost reviews. See agents/barb/runtime/hermes.md.
set_env HERMES_TIMEOUT 4000
# Docker Compose reads COMPOSE_FILE from .env, so a plain `docker compose up -d` in this folder
# also loads the agents overlay. Without it the api loses Docker access and agents stop installing.
set_env COMPOSE_FILE compose.yml:compose.agents.yml
# Each stack is its own Compose project, so two stacks never share a container, network or volume.
set_env COMPOSE_PROJECT_NAME "$COMPOSE_PROJECT_NAME"
# The outgoing filter. Agent containers run on a closed network (no route out), where the only exit
# is the stack's filter: Squid, with the allowlist from site.json. CircleChat's api and the model
# gateway sit on the closed network too, so agents reach both directly.
AGENT_NET="${COMPOSE_PROJECT_NAME}_agents"
if [ "$EGRESS" = on ]; then
  cat > compose.egress.yml <<YAML
# Written by setup-host.sh: the closed network for agent containers.
networks:
  agents:
    name: $AGENT_NET
    internal: true
services:
  api:
    networks: [default, agents]
YAML
  set_env CC_AGENT_NETWORK "$AGENT_NET"
  set_env CC_AGENT_PROXY http://egress:3128
  set_env CC_AGENT_NO_PROXY api,cc-gateway,localhost,127.0.0.1
  # The api listens on port 3000 inside its container, and serves its routes under /api, as
  # Caddy passes them through.
  set_env CC_AGENT_API_BASE http://api:3000/api
else
  rm -f compose.egress.yml
  for k in CC_AGENT_NETWORK CC_AGENT_PROXY CC_AGENT_NO_PROXY CC_AGENT_API_BASE; do sedi "/^$k=/d" .env; done
fi
# The model gateway's private network. Only the gateway's two containers join it: LiteLLM, which
# holds the cloud keys, and the router in front of LiteLLM, which every agent and job talks to.
MODEL_NET="${COMPOSE_PROJECT_NAME}_models"
docker network inspect "$MODEL_NET" >/dev/null 2>&1 || docker network create "$MODEL_NET" >/dev/null
# Personal information masking: Presidio's analyzer and anonymizer run beside the stack, and the
# model gateway removes personal details from each request before the request reaches a cloud model.
if [ "$MASK_PII" = on ]; then
  cat > compose.privacy.yml <<YAML
# Written by setup-host.sh: the masking services for the model gateway, on the gateway's network.
networks:
  models:
    name: $MODEL_NET
    external: true
services:
  presidio-analyzer:
    image: mcr.microsoft.com/presidio-analyzer:latest
    restart: unless-stopped
    networks: [default, models]
  presidio-anonymizer:
    image: mcr.microsoft.com/presidio-anonymizer:latest
    restart: unless-stopped
    networks: [default, models]
YAML
else
  rm -f compose.privacy.yml
fi
# CircleChat's file store: MinIO no longer publishes the images CircleChat's compose.yml names, so
# each stack runs Chainguard's builds, pinned like every other image. Chainguard's MinIO runs as a
# non-root user by default; the official image ran as root, so root keeps existing volumes writable.
MINIO_IMAGE="$(pin_image cgr.dev/chainguard/minio:latest)"
MC_IMAGE="$(pin_image cgr.dev/chainguard/minio-client:latest-dev)"
# CircleChat's own caddy, postgres and redis run at the digest in images.lock, like every other image
# the kit starts. The tags come from CircleChat's compose.yml. The weekly image job moves each pin.
CC_IMAGES="$(docker compose -f compose.yml config --format json 2>/dev/null | node -e '
  let j = {}; try { j = JSON.parse(require("fs").readFileSync(0, "utf8")); } catch {}
  for (const s of ["caddy", "postgres", "redis"]) {
    const i = j.services?.[s]?.image;
    if (i && !i.includes("@")) console.log(`${s} ${i}`);
    else if (!i) console.error(`CircleChat\u0027s compose.yml names no image for ${s}, so ${s} runs at an unpinned version.`);
  }
')"
rm -f compose.storage.yml
{
  echo "# Written by setup-host.sh: the pinned images of CircleChat's own services and the file store."
  echo "services:"
  while read -r svc tag; do
    [ -n "$svc" ] && printf '  %s:\n    image: %s\n' "$svc" "$(pin_image "$tag")"
  done <<<"$CC_IMAGES"
  printf '  minio:\n    image: %s\n    user: "0:0"\n  minio-setup:\n    image: %s\n' "$MINIO_IMAGE" "$MC_IMAGE"
} > compose.images.yml
CF="compose.yml:compose.agents.yml:compose.images.yml"
[ "$EGRESS" = on ] && CF="$CF:compose.egress.yml"
[ "$MASK_PII" = on ] && CF="$CF:compose.privacy.yml"
set_env COMPOSE_FILE "$CF"
# CircleChat's approval gate: an action at high risk waits for a person's approval. The high-risk
# action, share_files, has CircleChat itself fetch a web address, outside the agents' filter.
set_env APPROVE_RISK_AT high
# The Recursica MCP server for Betty and Barb, started in the default proto repo (the server reads
# the adapter installed there). Projects in other repos fall back to reading the adapter's code.
# The exact version lives in the shared workspace, read at the start of each agent turn: a stack
# with upgrade.auto moves it hourly (kit/upgrade.mjs), every other stack after 7 days
# (cluster/images.mjs).
mkdir -p "$WS"
[ -s "$WS/.recursica-mcp-version" ] || printf '%s\n' "$RECURSICA_MCP_VERSION" > "$WS/.recursica-mcp-version"
cat > "$WS/.recursica-mcp.sh" <<'SH'
#!/bin/sh
# Start the Recursica MCP server in the given project, at the version in .recursica-mcp-version.
cd "$1" && exec npx -y "@recursica/mcp@$(cat /workspace/.recursica-mcp-version)"
SH
chmod 755 "$WS/.recursica-mcp.sh"
RMCP="{\"command\":\"sh\",\"args\":[\"/workspace/.recursica-mcp.sh\",\"/workspace/${APP_REPO:-app}\"],\"enabled\":true,\"timeout\":120}"
set_env CC_AGENT_MCP_SERVERS "{\"betty\":{\"recursica-mcp\":$RMCP},\"barb\":{\"recursica-mcp\":$RMCP}}"
set_env ENFORCE_AGENT_SCOPES true
# Cloud model keys live in one secrets file that only the gateway reads, owned by root. The
# secrets helper writes the file from the stack's GitHub environment (MODEL_KEY_<NAME>). An older
# stack kept its Claude key in .env as ANTHROPIC_API_KEY: that key moves to the secrets file as
# MODEL_KEY_DEFAULT, the default key's secret, and leaves .env.
MODEL_KEYS="$CC_DIR/model-keys.env"
GW_STATE="$CC_DIR/gateway-state"
# With the secrets helper, the helper made the secrets file and the state folder as root.
if [ "$HELPER" = false ]; then
  sudo test -f "$MODEL_KEYS" || sudo install -m 600 /dev/null "$MODEL_KEYS"
  sudo mkdir -p "$GW_STATE" && sudo chmod 700 "$GW_STATE"
  # LiteLLM's master key: only the router uses the key, so the key lives in the gateway's state
  # folder, never in .env. Agents now use their own gateway keys.
  sudo test -s "$GW_STATE/litellm-master.key" || echo "sk-$(openssl rand -hex 24)" | sudo tee "$GW_STATE/litellm-master.key" >/dev/null
  # The password of the router's read-only database role (gateway/gateway-db.sql).
  sudo test -s "$GW_STATE/db-password" || openssl rand -hex 24 | sudo tee "$GW_STATE/db-password" >/dev/null
  # On a Mac, the owner owns both, so the gateway's containers can mount them (kit/lib.sh).
  own_for_docker "$MODEL_KEYS" "$GW_STATE"
fi
sedi '/^LITELLM_MASTER_KEY=/d' .env
# With KIT_ROOT_STEPS, the move needs root: the secrets helper removes ANTHROPIC_API_KEY from .env
# before this run, and after an upgrade the next full setup moves the key.
if [ "$HELPER" = false ] && env_has ANTHROPIC_API_KEY; then
  if ! sudo grep -q '^MODEL_KEY_DEFAULT=.' "$MODEL_KEYS"; then
    sed -n 's/^ANTHROPIC_API_KEY=/MODEL_KEY_DEFAULT=/p' .env | tail -1 | sudo tee -a "$MODEL_KEYS" >/dev/null
  fi
  sedi '/^ANTHROPIC_API_KEY=/d' .env
  echo "Moved ANTHROPIC_API_KEY from .env to the gateway's secrets file, as the default key. In GitHub, rename the secret to MODEL_KEY_DEFAULT."
fi
for k in OPENAI_API_KEY XAI_API_KEY GEMINI_API_KEY AZURE_API_KEY AWS_SECRET_ACCESS_KEY OPENROUTER_API_KEY; do
  env_has "$k" && { echo "$k is in $CC_DIR/.env, which holds no cloud key. Put the key in the stack's GitHub environment as MODEL_KEY_<NAME>, name the key in site.json's model_keys, deploy the secrets, and remove $k from .env."; exit 1; }
done
# CircleChat ships with a default session secret and default passwords. Anyone who knows the
# default session secret can forge a sign-in, so each default becomes a random value. Postgres
# keeps the password the database started with, so PG_PASSWORD changes only before the database
# exists.
env_value() { sed -n "s/^$1=//p" .env | tail -1; }
is_default() { local v; v="$(env_value "$1")"; [ -z "$v" ] || [ "$v" = "$2" ]; }
is_default SESSION_SECRET change-me-at-least-32-chars-long-string && set_env SESSION_SECRET "$(openssl rand -hex 32)"
if is_default MINIO_ROOT_PASSWORD minioadmin; then
  set_env MINIO_ROOT_USER "cc-$(openssl rand -hex 4)"
  set_env MINIO_ROOT_PASSWORD "$(openssl rand -hex 24)"
fi
if is_default PG_PASSWORD circlechat; then
  if docker volume inspect "${COMPOSE_PROJECT_NAME}_pgdata" >/dev/null 2>&1; then
    echo "Warning: the database still uses CircleChat's default password. Change the password inside postgres, then set PG_PASSWORD in .env."
  else
    set_env PG_PASSWORD "$(openssl rand -hex 24)"
  fi
fi
# A local-only client stack never sends data to a cloud model, including CircleChat's own optional
# planner and embeddings, which call the URL in .env.
if [ "$CLOUD_MODELS" = local-only ]; then
  for k in PLANNER_BASE_URL EMBEDDINGS_BASE_URL; do
    u="$(env_value "$k")"
    case "$u" in ""|http://localhost*|http://127.0.0.1*|http://host.docker.internal*|http://host.lima.internal*) ;;
      *) echo "$k points to $u, outside this computer, and stack ${TENANT:-<none>} is local-only. Remove $k from .env, or record the client's permission in site.cloud_models."; exit 1 ;;
    esac
  done
fi
# Shared by Porter and every job runner. Copy it into each job-runner machine's ~/.recursica-node.env.
env_has JOBD_TOKEN || set_env JOBD_TOKEN "$(openssl rand -hex 24)"
NET="${COMPOSE_PROJECT_NAME}_default"

start_egress() {
  [ "$EGRESS" = on ] || { docker rm -f "cc-egress$SUFFIX" >/dev/null 2>&1 || true; return 0; }
  local image; image="$(egress_image)"
  mkdir -p "$CC_DIR/egress-logs" && chmod 777 "$CC_DIR/egress-logs"
  docker rm -f "cc-egress$SUFFIX" >/dev/null 2>&1 || true
  docker run -d --name "cc-egress$SUFFIX" --restart unless-stopped --network "$NET" \
    --add-host host.docker.internal:host-gateway \
    -v "$KIT_OUT/egress":/etc/egress:ro -v "$CC_DIR/egress-logs":/var/log/egress \
    "$image" >/dev/null
  docker network connect --alias egress "$AGENT_NET" "cc-egress$SUFFIX"
  docker network connect --alias cc-gateway "$AGENT_NET" "cc-gateway$SUFFIX" 2>/dev/null || true
  echo "Outgoing filter running: agents reach only the sites in $KIT_OUT/egress/allow.txt."
  # The job runner's filter on this computer, from setup-node.sh, moves to the same image.
  refresh_egress "$image"
}

# The router's database role: it reads only the columns the router needs, and writes nothing
# (gateway/gateway-db.sql). The role's address, with its password, goes in a file in the gateway's
# state folder, so `docker inspect` shows no database password. CircleChat's api makes the tables
# when it starts, so this waits for them.
gateway_db_role() {
  local pw i
  # The secrets helper passes the password, and writes the role's address itself.
  if [ "$HELPER" = true ]; then
    pw="$HELPER_DB_PASSWORD"
    [ -n "$pw" ] || { echo "The secrets helper passed no password for the router's database role."; return 1; }
  else pw="$(sudo cat "$GW_STATE/db-password")"; fi
  for i in $(seq 90); do
    [ "$(docker compose exec -T postgres psql -U postgres -d circlechat -Atc "select to_regclass('public.agent_runs') is not null" 2>/dev/null)" = t ] && break
    [ "$i" = 90 ] && { echo "CircleChat's tables are not there yet, so the gateway cannot read tasks and treats every request as cluster only. Run this script again once CircleChat is up."; return 0; }
    sleep 2
  done
  { printf '\\set password %s\n' "$pw"; cat "$HERE/gateway/gateway-db.sql"; } | docker compose exec -T postgres psql -q -U postgres -d circlechat >/dev/null
  [ "$HELPER" = false ] || return 0
  printf 'postgres://cc_gateway_read:%s@postgres:5432/circlechat\n' "$pw" | sudo tee "$GW_STATE/db.url" >/dev/null
  sudo chmod 600 "$GW_STATE/db.url"
  own_for_docker "$GW_STATE/db.url"
}

# On a Mac with Colima: tailscale serve passes site.gateway_port on the Tailscale address to the
# router's port for port jobs, on 127.0.0.1. The other modes run without a sudo password, so they
# try sudo only where sudo asks for nothing.
# One tailscale serve rule: as the owner, then with sudo where sudo asks for nothing, then, in the
# full setup only, with sudo.
ts_serve() {
  tailscale serve --bg "$@" >/dev/null 2>&1 || sudo -n tailscale serve --bg "$@" >/dev/null 2>&1 \
    || { [ "$SECRETS_ONLY" = false ] && sudo tailscale serve --bg "$@" >/dev/null; }
}
gateway_serve() {
  ts_serve "--tcp=$GATEWAY_PORT" "tcp://127.0.0.1:$JOBS_LOCAL_PORT" \
    || { echo "tailscale serve failed, so port jobs on other computers cannot reach the gateway. Run setup-host.sh in a terminal."; exit 1; }
  gateway_port_check
}

# The checks after tailscale serve, on a Mac with Colima:
#   - tailscale serve passes site.gateway_port to the router's port for port jobs.
#   - That port refuses a request without a task key, /health included.
#   - Neither gateway port answers on the Mac's other addresses, such as the office network.
gateway_port_check() {
  local code="" i a p
  tailscale serve status --json 2>/dev/null | node -e '
    const s = JSON.parse(require("fs").readFileSync(0, "utf8") || "{}");
    process.exit(s.TCP?.[process.argv[1]]?.TCPForward === process.argv[2] ? 0 : 1);
  ' "$GATEWAY_PORT" "127.0.0.1:$JOBS_LOCAL_PORT" \
    || { echo "tailscale serve does not pass port $GATEWAY_PORT to 127.0.0.1:$JOBS_LOCAL_PORT. Run setup-host.sh in a terminal."; exit 1; }
  for i in $(seq 45); do
    code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "http://127.0.0.1:$JOBS_LOCAL_PORT/health" || true)"
    [ "$code" = 401 ] && break
    sleep 2
  done
  [ "$code" = 401 ] || { echo "The gateway's port for port jobs answered $code without a task key, not 401. Port jobs are stopped until the port refuses such a request."; exit 1; }
  # Every IPv4 address of the Mac except 127.0.0.0/8 and Tailscale's 100.64.0.0/10.
  for a in $(ifconfig 2>/dev/null | awk '$1 == "inet" { print $2 }' | grep -vE '^127\.|^100\.(6[4-9]|[7-9][0-9]|1[01][0-9]|12[0-7])\.'); do
    for p in "$GATEWAY_PORT" "$JOBS_LOCAL_PORT"; do
      code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 3 "http://$a:$p/health" || true)"
      [ "${code:-000}" = 000 ] || { echo "The gateway answers on $a:$p, outside Tailscale. Stop cc-gateway$SUFFIX and find what publishes port $p."; exit 1; }
    done
  done
  echo "Gateway for port jobs: Tailscale port $GATEWAY_PORT only, and a task key is required."
}

start_gateway_and_notifier() {
  # The model gateway, in two containers.
  # LiteLLM (cc-litellm): one address for every cluster model, with fallbacks in route order, and
  # one model per cloud key (key/<name>). start-litellm.py reads the keys from the secrets file, so
  # no key is in an environment variable. LiteLLM joins only the gateway's private network.
  docker rm -f "cc-litellm$SUFFIX" >/dev/null 2>&1 || true
  local mask=()
  [ "$MASK_PII" = on ] && mask=(-e PRESIDIO_ANALYZER_API_BASE=http://presidio-analyzer:3000 -e PRESIDIO_ANONYMIZER_API_BASE=http://presidio-anonymizer:3000)
  docker run -d --name "cc-litellm$SUFFIX" --restart unless-stopped --network "$MODEL_NET" ${mask[@]+"${mask[@]}"} \
    --add-host host.docker.internal:host-gateway \
    -v "$KIT_OUT/litellm.yaml":/app/config.yaml:ro -v "$HERE/gateway/start-litellm.py":/kit/start-litellm.py:ro \
    -v "$MODEL_KEYS":/run/secrets/model-keys.env:ro -v "$GW_STATE/litellm-master.key":/run/secrets/litellm-master.key:ro \
    --entrypoint python "$(pin_image ghcr.io/berriai/litellm:main-stable)" \
    /kit/start-litellm.py /app/config.yaml /run/secrets/model-keys.env /run/secrets/litellm-master.key --port 4000
  # The router (cc-gateway): each agent's and each port job's gateway key, the task's "Cloud
  # models" setting from CircleChat's database, and the spend log in gateway-logs/. Agents reach the
  # router on their closed network, on port 4000. Port jobs on other computers reach the router's
  # port 4001 over Tailscale: site.gateway_port on the control computer's Tailscale address only,
  # where every request needs a task key. With the filter off, this computer's agents use
  # site.gateway_port on 127.0.0.1.
  # On Linux, Docker publishes port 4001 on the Tailscale address. On a Mac, Docker runs in Colima's
  # VM, which does not hold the Mac's Tailscale address. Docker then publishes port 4001 on
  # 127.0.0.1:<gateway port + 1>, and tailscale serve passes the Tailscale port to that local port.
  gateway_db_role
  docker rm -f "cc-gateway$SUFFIX" >/dev/null 2>&1 || true
  mkdir -p "$CC_DIR/gateway-app" "$CC_DIR/gateway-logs"
  cp "$HERE"/gateway/*.mjs "$HERE/gateway/package.json" "$CC_DIR/gateway-app/"
  local publish=()
  [ "$EGRESS" = on ] || publish+=(-p "127.0.0.1:$GATEWAY_PORT:4000")
  if [ -n "$TAILNET_ADDRESS" ] && [ "$GATEWAY_SERVE" = true ]; then publish+=(-p "127.0.0.1:$JOBS_LOCAL_PORT:4001")
  elif [ -n "$TAILNET_ADDRESS" ]; then publish+=(-p "$TAILNET_ADDRESS:$GATEWAY_PORT:4001"); fi
  docker run -d --name "cc-gateway$SUFFIX" --restart unless-stopped --network "$NET" ${publish[@]+"${publish[@]}"} \
    -v "$CC_DIR/gateway-app":/app -v "$KIT_OUT/gateway.json":/etc/gateway/gateway.json:ro \
    -v "$GW_STATE":/state -v "$CC_DIR/gateway-logs":/logs -w /app \
    -e LITELLM_URL="http://cc-litellm$SUFFIX:4000" \
    "$(pin_image node:22-alpine)" sh -c "npm install --silent && node router.mjs" >/dev/null
  docker network connect "$MODEL_NET" "cc-gateway$SUFFIX"
  if [ -n "$TAILNET_ADDRESS" ] && [ "$GATEWAY_SERVE" = true ]; then gateway_serve; fi

  # Slack notifier: task changes, questions to people, rejected agent posts, stalled tasks.
  docker rm -f "cc-slack-notify$SUFFIX" >/dev/null 2>&1 || true
  if [ "$(site_get notify.slack)" = true ] && env_has SLACK_BOT_TOKEN && env_has SLACK_CHANNEL && [ -n "$NET" ]; then
    mkdir -p "$CC_DIR/notify" && cp "$HERE/notify/notify.mjs" "$HERE/notify/package.json" "$CC_DIR/notify/"
    PG="$(sed -n 's/^PG_PASSWORD=//p' .env)"; PG="${PG:-circlechat}"
    docker run -d --name "cc-slack-notify$SUFFIX" --restart unless-stopped --network "$NET" \
      -v "$CC_DIR/notify":/app -v "cc-notify-state$SUFFIX":/state -w /app \
      -e DATABASE_URL="postgres://postgres:$PG@postgres:5432/circlechat" \
      -e SLACK_BOT_TOKEN="$(sed -n 's/^SLACK_BOT_TOKEN=//p' .env)" -e SLACK_CHANNEL="$(sed -n 's/^SLACK_CHANNEL=//p' .env)" \
      -e NOTIFY_DETAILS="$NOTIFY_DETAILS" -e STACK_NAME="$STACK_NAME" \
      -e CC_URL="https://$TS_HOST" \
      "$(pin_image node:22-alpine)" sh -c "npm install --silent && node notify.mjs"
    echo "Slack notifier running."
  else
    echo "Slack notifier off (needs notify.slack and site.slack_channel_id in site.json, and SLACK_BOT_TOKEN in .env)."
  fi
}

# Every agent of the stack asks the gateway with the agent's own gateway key, and no agent's home
# holds a cloud key. setup-agent.sh does the same for one agent.
agents_to_gateway() {
  local h
  for h in "$CC_DIR"/hermes-homes/.hermes-*; do
    sudo test -f "$h/config.yaml" || continue
    gateway_access "${h##*/.hermes-}" "$h" || true
  done
}

# The key check: no cloud key in CircleChat's database or in an agent's Hermes home.
key_check() {
  (docker compose exec -T postgres pg_dump -U postgres circlechat 2>/dev/null || true) |
    sudo "$(command -v node)" "$HERE/gateway/key-check.mjs" --secrets "$MODEL_KEYS" --stdin "CircleChat's database" "$CC_DIR/hermes-homes"
}

if [ "$SECRETS_ONLY" = true ]; then
  if [ "$UPGRADE_ONLY" = true ]; then
    docker compose up -d --remove-orphans
  fi
  start_gateway_and_notifier
  [ "$UPGRADE_ONLY" = true ] && start_egress
  [ "$EGRESS" = on ] && docker network connect --alias cc-gateway "$AGENT_NET" "cc-gateway$SUFFIX" 2>/dev/null || true
  # With KIT_ROOT_STEPS, the root process runs the key check after this run. A secrets deploy
  # changes no agent's gateway key. After an upgrade, the root process runs sync-skills.sh, whose
  # setup-agent.sh gives each managed agent its gateway access again.
  if [ "$HELPER" = false ]; then
    agents_to_gateway
    key_check
  fi
  if [ "$UPGRADE_ONLY" = true ]; then what="Upgrade applied"; else what="Secrets applied"; fi
  echo "$what${TENANT:+ (stack: $TENANT)}: gateway and Slack notifier recreated."
  exit 0
fi

# Caddy on $PORT (Tailscale serve, or any reverse proxy, points there)
# Caddy listens on this computer only. Tailscale serve gives each person on the tailnet the HTTPS
# address, and nobody on the office network reaches CircleChat directly.
# The agents' compose file reads CircleChat's address from the public address; point it at
# CC_API_BASE, on this computer.
sedi 's|CC_API_BASE: ${PUBLIC_BASE_URL:-http://localhost:8080}/api|CC_API_BASE: ${CC_API_BASE:-http://localhost:8080/api}|' compose.agents.yml
sedi "s|- \"80:80\"|- \"127.0.0.1:$PORT:80\"|; s|- \"$PORT:80\"|- \"127.0.0.1:$PORT:80\"|" compose.yml
# CircleChat also publishes 443 and MinIO's console (9001). Two stacks on one computer cannot both
# hold those, so a tenant stack drops 443 (Tailscale serve gives it HTTPS) and binds the console
# to a random local port.
if [ -n "$TENANT" ]; then
  sedi '/- "443:443"/d; /- "443:443\/udp"/d; s|- "9001:9001"|- "127.0.0.1::9001"|' compose.yml
fi
# Shared /workspace mounted into the api (the bridge already reads CC_SHARED_WORKSPACE_DIR)
grep -q ':/workspace' compose.agents.yml || \
  sedi 's|^      - /var/run/docker.sock:/var/run/docker.sock$|&\
      - ${CC_SHARED_WORKSPACE_DIR}:/workspace|' compose.agents.yml

mkdir -p hermes-homes "$WS" "$WS/reviews" "$WS/loki"
# The checkout every agent reads. Nobody writes to it; sync-skills.sh pulls it.
[ -d "$WS/recursica-knowledge" ] || git clone "$KNOWLEDGE_REPO" "$WS/recursica-knowledge"
# Alan's own clone, for his proposal branches. Kept apart so an unmerged rule never reaches
# the checkout Betty builds from and Barb reviews against.
[ -d "$WS/kb-proposals" ] || git clone "$KNOWLEDGE_REPO" "$WS/kb-proposals"
git -C "$WS/kb-proposals" config core.hooksPath .husky
if [ -n "${LOCAL_REDACTIONS:-}" ] && [ -f "$LOCAL_REDACTIONS" ]; then
  cp "$LOCAL_REDACTIONS" "$WS/kb-proposals/buzz-agents/local-redactions.json"
fi
# The application Betty builds in and Barb reviews.
[ -d "$WS/$APP_REPO" ] || git clone "$APP_REPO_URL" "$WS/$APP_REPO"

# Kev, Barb's quick first pass. Copied out of the knowledge checkout so its cache and
# node_modules never land in a repository. Its engines are listed in site.json.
if [ -d "$WS/recursica-knowledge/tools/kev" ]; then
  mkdir -p "$WS/kev"
  cp -r "$WS/recursica-knowledge/tools/kev/." "$WS/kev/"
  docker run --rm -v "$WS/kev":/app -w /app "$(pin_image node:22)" npm ci --omit=dev --no-audit --no-fund
fi
sudo chmod -R 777 hermes-homes "$WS"

# A port another stack already uses stops the setup here, before anything restarts.
port_owner() { docker ps --format '{{.Names}} {{.Ports}}' | grep -E "(:|\\])$1->" | awk '{print $1}' | grep -vE "^(${COMPOSE_PROJECT_NAME}[-_]|betty-proto$SUFFIX\$|cc-gateway$SUFFIX\$)" || true; }
for p in "$PORT" "$PREVIEW_PORT" "$GATEWAY_PORT" $([ "$GATEWAY_SERVE" = true ] && echo "$JOBS_LOCAL_PORT"); do
  o="$(port_owner "$p")"
  [ -z "$o" ] || { echo "Port $p is already used by $o. Give this stack other ports in site.json (site.port, site.preview_port, site.gateway_port)."; exit 1; }
done

# The agent image, pinned like every other image. CircleChat reads CC_HERMES_IMAGE from .env.
set_env CC_HERMES_IMAGE "$(pin_image nousresearch/hermes-agent:latest)"
docker compose up -d --force-recreate

# Always-on dev server for the application (hot-reloads as Betty edits)
docker rm -f "betty-proto$SUFFIX" >/dev/null 2>&1 || true
docker run -d --name "betty-proto$SUFFIX" --restart unless-stopped -p "127.0.0.1:$PREVIEW_PORT:5173" \
  -v "$WS/$APP_REPO":/app -w /app \
  -e __VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS="$TS_HOST" \
  "$(pin_image node:22)" sh -c "npm install && npx vite --host 0.0.0.0"

start_gateway_and_notifier
start_egress
agents_to_gateway
key_check

# Background jobs, the native way for this OS (systemd on Linux, launchd on macOS).
ENVS="CC_DIR=$CC_DIR WS=$WS SITE=$SITE OWNER=$(id -un) OWNER_HOME=$HOME"
# A client stack's folder sits inside an encrypted disk image, which the "Unlock stack" workflow
# opens after a restart. Until then the boot job finds no folder and does nothing.
[ -n "$TENANT" ] && export UNIT_LOG_DIR="$HOME/tenants/$TENANT/logs"
install_unit "circlechat-boot$SUFFIX" "[ -d $CC_DIR ] || exit 0; cd $CC_DIR && ${DCTX}docker compose up -d" "$HOME" "$(id -un)" boot
# Nightly encrypted backup of this stack, and a test restore each quarter. Both run as root, which
# can read every agent home. rclone's remote is set up once by hand: see README, "Backups".
if [ -n "$BACKUP_REMOTE" ]; then
  for t in restic rclone; do command -v "$t" >/dev/null || { echo "$t is not installed. Linux: sudo apt install $t. macOS: brew install $t."; exit 1; }; done
  rclone --config "$HOME/.config/rclone/rclone.conf" listremotes 2>/dev/null | grep -qx "${BACKUP_REMOTE%%:*}:" \
    || { echo "rclone has no remote named ${BACKUP_REMOTE%%:*}. Set it up first: see README, \"Backups\"."; exit 1; }
  # Root reads Docker's settings from the owner's ~/.docker: on a Mac, Colima's Docker belongs to
  # the owner, and root has no settings of its own.
  BENV="OWNER=$(id -un) OWNER_HOME=$HOME CC_DIR=$CC_DIR WS=$WS DOCKER_CONFIG=$HOME/.docker PATH=$(dirname "$(command -v node)"):/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin"
  install_unit "backup$SUFFIX" "$BENV $HERE/backup/backup.sh" "$CC_DIR" root "*-*-* $BACKUP_TIME"
  install_unit "restore-test$SUFFIX" "$BENV $HERE/backup/restore-test.sh" "$CC_DIR" root "*-*-01 04:30"
fi
# Earlier versions ran their own image and upgrade jobs; cluster-updater (install-cluster.sh)
# now runs both, hourly.
uninstall_unit "images$SUFFIX" >/dev/null
# Updates of the knowledge repo: with upgrade.auto, each release (same first number) installs on
# its own and a new major version asks in Slack; otherwise the hourly sync pulls main.
uninstall_unit "upgrade$SUFFIX" >/dev/null
if [ "$UPGRADE_AUTO" = on ]; then
  # cluster-updater checks out each release; nothing pulls main.
  uninstall_unit "agents-sync$SUFFIX" >/dev/null
else
  # macOS keeps chown in /usr/sbin, and the job's PATH can leave /usr/sbin out.
  sync_chown="chown"; [ "$OS" != Darwin ] || sync_chown="/usr/sbin/chown"
  install_unit "agents-sync$SUFFIX" "git config --global --get-all safe.directory | grep -qx $WS/recursica-knowledge || git config --global --add safe.directory $WS/recursica-knowledge; $ENVS $HERE/sync-skills.sh; $sync_chown -R $(id -un) $WS/recursica-knowledge/.git $WS/kev" "$CC_DIR" root hourly
fi
if [ -n "$(site_get porter.watch)" ]; then
  # Announces each new release of the watched repository to Porter, through the workflow webhook
  # in .env (PORTER_HOOK_URL, PORTER_HOOK_SECRET). See circlechat/README.md, "Porter".
  install_unit "release-watch$SUFFIX" "set -a; . $CC_DIR/.env; set +a; WATCHES_FILE=$KIT_OUT/watches.json STATE=$KIT_OUT/release-watch.json node $HERE/kit/release-watch.mjs" "$CC_DIR" "$(id -un)" hourly
fi
if [ -n "$(site_get data.kev_disagreements_branch)" ]; then
  install_unit "kev-data-push$SUFFIX" "$ENVS $HERE/kit/push-data.sh" "$CC_DIR" "$(id -un)" hourly
fi

if grep -qi microsoft /proc/version 2>/dev/null; then
  echo
  echo "This is WSL. WSL stops when no Windows program holds it open, which stops everything above."
  echo "Keep it running from an Administrator PowerShell:"
  echo "  schtasks /create /tn \"WSL keep-alive\" /sc onstart /ru SYSTEM /rl highest /tr \"wsl.exe -d ${WSL_DISTRO_NAME:-Ubuntu} -u $(id -un) --exec sleep infinity\""
fi

# CircleChat's address and the app preview's address. Caddy and the preview listen on 127.0.0.1
# only. With site.proxy "tailscale" (the default), tailscale serve gives each one an HTTPS address
# on the tailnet: CircleChat on 443 for the cluster's own stack, or on site.port for a client or
# demo stack, and the preview on site.preview_port. The setup never turns on Funnel, and stops when
# Funnel serves either port, because Funnel opens the port to the internet.
#   site_serve_check <https port>:<local port> ...   prints each rule that is missing or public
site_serve_check() {
  tailscale serve status --json 2>/dev/null | node -e '
    const s = JSON.parse(require("fs").readFileSync(0, "utf8") || "{}");
    for (const pair of process.argv.slice(1)) {
      const [https, local] = pair.split(":");
      const keys = Object.keys(s.Web ?? {}).filter((k) => k.endsWith(`:${https}`));
      const proxy = keys.map((k) => s.Web[k]?.Handlers?.["/"]?.Proxy).find(Boolean);
      if (proxy !== `http://127.0.0.1:${local}`) console.log(`HTTPS port ${https} does not pass to http://127.0.0.1:${local}`);
      else if (keys.some((k) => s.AllowFunnel?.[k])) console.log(`Funnel serves HTTPS port ${https} to the internet. Turn Funnel off: tailscale funnel --https=${https} off`);
    }
  ' "$@"
}
if [ "$PROXY" = other ]; then
  WHERE="https://<your address>"
  ADDRESS="Point an HTTPS reverse proxy on this computer at http://127.0.0.1:$PORT for CircleChat, and at http://127.0.0.1:$PREVIEW_PORT for the app preview."
else
  if [ -z "$TENANT" ]; then CC_HTTPS=443; WHERE="https://$TS_HOST"; else CC_HTTPS="$PORT"; WHERE="https://$TS_HOST:$PORT"; fi
  if ! command -v tailscale >/dev/null; then
    ADDRESS="Tailscale is not installed. Install Tailscale, then run: tailscale serve --bg --https=$CC_HTTPS http://127.0.0.1:$PORT && tailscale serve --bg --https=$PREVIEW_PORT http://127.0.0.1:$PREVIEW_PORT"
  else
    ts_serve "--https=$CC_HTTPS" "http://127.0.0.1:$PORT" && ts_serve "--https=$PREVIEW_PORT" "http://127.0.0.1:$PREVIEW_PORT" \
      || { echo "tailscale serve failed, so the tailnet cannot reach CircleChat or the app preview. Run setup-host.sh in a terminal."; exit 1; }
    problems="$(site_serve_check "$CC_HTTPS:$PORT" "$PREVIEW_PORT:$PREVIEW_PORT")"
    [ -z "$problems" ] || { echo "$problems"; echo "Check tailscale serve status, then run setup-host.sh again."; exit 1; }
    ADDRESS="tailscale serve, tailnet only: $WHERE passes to http://127.0.0.1:$PORT, and https://$TS_HOST:$PREVIEW_PORT to http://127.0.0.1:$PREVIEW_PORT for the app preview."
  fi
fi
cat << MSG

Done${TENANT:+ (stack: $TENANT)}. $ADDRESS
Wait ~30s for the api, then install agents in the UI and run ${TENANT:+TENANT=$TENANT }setup-agent.sh for each.
MSG
