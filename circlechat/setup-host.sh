#!/usr/bin/env bash
# Set up (or update: safe to rerun) the CONTROL machine of a deployment: the model gateway, the
# agents' shared workspace with Kev and the app preview, and the background jobs that keep it all
# current, the RecursicaChat 2.0 server's jobs included. Linux or macOS. Everything specific to the
# deployment comes from site.json.
#
#   1. Put the config at $CC_DIR/site.json (start from circlechat/site.example.json). $CC_DIR is the
#      stack's folder, ~/recursica-stack (kit/stack-paths.sh). Secrets go in $CC_DIR/.env.
#   2. ./circlechat/setup-host.sh
#   3. On every other machine in site.json: ./circlechat/setup-node.sh <node name>
#
# One computer can hold several stacks, one per client. Give each its own site.json with
# site.tenant set, and run every kit script with TENANT=<name>: the stack then lives in
# ~/tenants/<name>/ and every container, port and job carries its name.
#
# --secrets-only: after a secret changes, recreate only the model gateway, which reads its secrets
# when it starts. The background jobs keep running. The deploy-secrets workflow uses this mode; see
# circlechat/README.md, "Secrets in GitHub".
#
# CircleChat 1.x is gone from the kit. A computer set up while 1.x ran keeps 1.x's names: the folder
# ~/circlechat, the workspace ~/circlechat-workspace, and the gateway's Docker networks
# <project>_default and <project>_models. Every mode uses those names while they exist, and moves
# nothing. A person moves them once with circlechat/migrate-off-1x.sh. Only the full setup removes
# 1.x's jobs, in a held step.
set -euo pipefail
# --upgrade: the upgrade job's mode, after a new release is checked out. Changes only what needs
# no sudo: the rendered config, the gateway and the job filter's image.
SECRETS_ONLY=false; UPGRADE_ONLY=false
[ "${1:-}" = --secrets-only ] && SECRETS_ONLY=true
[ "${1:-}" = --upgrade ] && { SECRETS_ONLY=true; UPGRADE_ONLY=true; }
# KIT_ROOT_STEPS=1: a root process runs --secrets-only or --upgrade as the owner, who may have no
# password-free sudo. The root process takes each step that needs root before this run, and this
# run takes only the Docker steps. The secrets helper (deploy/apply-secrets.sh) runs --secrets-only
# this way, and the upgrade job (cluster/root-steps.mjs) runs --upgrade this way.
# KIT_SECRETS_HELPER=1 is the older name, from a secrets helper installed before the upgrade job
# used the same mode. An older root process passes one line on stdin, the password of CircleChat
# 1.x's database role for the router. The line is read and dropped.
HELPER=false
if [ -n "${KIT_ROOT_STEPS:-${KIT_SECRETS_HELPER:-}}" ]; then
  [ "$SECRETS_ONLY" = true ] || { echo "KIT_ROOT_STEPS needs --secrets-only or --upgrade."; exit 1; }
  HELPER=true; IFS= read -r _ || true; exec </dev/null
fi

HERE="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=circlechat/kit/stack-paths.sh
. "$HERE/kit/stack-paths.sh"
CC_DIR="${CC_DIR:-$(stack_dir "$HOME" "${TENANT:-}")}"
WS="${WS:-$(workspace_dir "$HOME" "${TENANT:-}")}"
SITE="${SITE:-$CC_DIR/site.json}"
. "$HERE/kit/lib.sh"
# Every mode installs jobs that root runs from this checkout. The checkout must sit outside the
# agents' workspace.
require_kit "$HERE/.."

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
  # From the Docker context, or from ~/.colima while the VM is stopped (kit/lib.sh colima_profile).
  VM_PROFILE="$(colima_profile)" || exit 1
  # A broken site.json gives no port here, and the render below stops the setup.
  OLLAMA_PORT="$(ollama_service port 2>/dev/null || true)"
  mac_services_check "$VM_PROFILE" "$OLLAMA_PORT" || exit 1
fi

# Validate and render. A broken site.json stops here, before anything changes. A client or demo
# stack's computers are checked against the cluster's own site.json, and each model that does not
# fit the stack's computers is left out, with a line that says so.
KIT_OUT="$CC_DIR/kit-out"
CLUSTER_SITE_FILE="$(stack_dir "$HOME")/site.json"
if [ -n "${TENANT:-}" ] && [ -f "$CLUSTER_SITE_FILE" ]; then export CLUSTER_SITE="$CLUSTER_SITE_FILE"; fi
node "$HERE/kit/render.mjs" "$SITE" "$KIT_OUT"
load_env_file "$KIT_OUT/app.env"
WANT_TENANT="${TENANT:-}"
load_env_file "$KIT_OUT/tenant.env"
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
# On a Mac whose Docker runs in Colima, tailscale serve gives the other computers the gateway's
# port (gateway_serve). Linux keeps Docker's direct publish on the Tailscale address.
GATEWAY_SERVE=false
if [ "$OS" = Darwin ]; then case "${DOCKER_CONTEXT:-$(docker context show 2>/dev/null)}" in colima*) GATEWAY_SERVE=true ;; esac; fi
JOBS_LOCAL_PORT=$((GATEWAY_PORT + 1))
TS_HOST="$(site_get site.public_host)"
KNOWLEDGE_REPO="$(site_get repos.knowledge)"
APP_REPO_URL="$(site_get repos.app)"

mkdir -p "$CC_DIR"
cd "$CC_DIR"
touch .env
set_env() { sedi "/^$1=/d" .env; echo "$1=$2" >> .env; }   # replace or append, never duplicate
env_has() { grep -q "^$1=." .env; }
# The stack's own Slack channel, for every post from this stack (the Slack app's bot token comes
# from the secrets helper).
SLACK_CHANNEL_ID="$(site_get site.slack_channel_id)"
if [ -n "$SLACK_CHANNEL_ID" ]; then set_env SLACK_CHANNEL "$SLACK_CHANNEL_ID"; else sedi "/^SLACK_CHANNEL=/d" .env; fi

# The model gateway's Docker networks. LiteLLM, which holds the cloud keys, and the router in front
# of LiteLLM share the models' network, gateway-models. Nothing else joins it, except the masking
# services below. The router starts on the models' network and publishes its ports there.
# A computer set up while CircleChat 1.x ran keeps 1.x's networks until a person runs
# circlechat/migrate-off-1x.sh: the router then starts on <project>_default, and both containers
# join <project>_models. A move to new networks interrupts model requests, so no setup moves them.
MODEL_NET="gateway-models$SUFFIX"
OLD_NET="${COMPOSE_PROJECT_NAME}_default"
OLD_MODEL_NET="${COMPOSE_PROJECT_NAME}_models"
if ! docker network inspect "$MODEL_NET" >/dev/null 2>&1 && docker network inspect "$OLD_MODEL_NET" >/dev/null 2>&1; then
  MODEL_NET="$OLD_MODEL_NET"
  NET="$OLD_NET"
  docker network inspect "$NET" >/dev/null 2>&1 || NET="$MODEL_NET"
  echo "The gateway keeps CircleChat 1.x's networks $NET and $MODEL_NET. To move it, run circlechat/migrate-off-1x.sh."
else
  docker network inspect "$MODEL_NET" >/dev/null 2>&1 || docker network create "$MODEL_NET" >/dev/null
  NET="$MODEL_NET"
fi
# The port jobs' closed network on this computer (setup-node.sh), when it exists. The router joins
# it, so this computer's port jobs reach the router as cc-gateway.
JOBS_NET="jobs-egress$SUFFIX"

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
  # folder, never in .env. Agents use their own gateway keys.
  sudo test -s "$GW_STATE/litellm-master.key" || echo "sk-$(openssl rand -hex 24)" | sudo tee "$GW_STATE/litellm-master.key" >/dev/null
  # The key of the RecursicaChat 2.0 server's gateway listener: the gateway asks the server for each
  # task's Model use setting with it (gateway/rc-tasks.mjs). The kit's recursicachat/install.sh
  # copies it into the server's own key file, /etc/recursicachat/gateway.key.
  sudo test -s "$GW_STATE/rc-tasks.key" || echo "rct_$(openssl rand -hex 24)" | sudo tee "$GW_STATE/rc-tasks.key" >/dev/null
  # Kev-engine's key, for a program whose gateway block lists Kev's computers (gateway.kev): the
  # router sends that program's Kev-engine requests with this key (gateway/router.mjs). It is
  # KEV_ENGINE_KEY from .env. The router reads the file at each request; the secrets helper writes
  # it too when the key changes.
  if env_has KEV_ENGINE_KEY; then
    sed -n 's/^KEV_ENGINE_KEY=//p' .env | tail -n 1 | sudo tee "$GW_STATE/kev-engine.key" >/dev/null
    sudo chmod 600 "$GW_STATE/kev-engine.key"
  fi
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
# Shared by Porter and every job runner. Copy it into each job-runner machine's ~/.recursica-node.env.
env_has JOBD_TOKEN || set_env JOBD_TOKEN "$(openssl rand -hex 24)"

# The job filter's image: a new kit version of circlechat/egress moves the job runner's filter on
# this computer (setup-node.sh) to the new image.
refresh_job_filter() { [ "$EGRESS" = on ] || return 0; refresh_egress "$(egress_image)"; }

# On a Mac with Colima: tailscale serve passes site.gateway_port on the Tailscale address to the
# router's port for port jobs, on 127.0.0.1. The other modes run without a sudo password, so they
# try sudo only where sudo asks for nothing.
# One tailscale serve rule: as the owner, then with sudo where sudo asks for nothing, then, in the
# full setup only, with sudo. Each caller starts with network_held (kit/lib.sh).
# network-step begin: tailscale serve for the gateway's port for port jobs
ts_serve() {
  tailscale serve --bg "$@" >/dev/null 2>&1 || sudo -n tailscale serve --bg "$@" >/dev/null 2>&1 \
    || { [ "$SECRETS_ONLY" = false ] && sudo tailscale serve --bg "$@" >/dev/null; }
}
gateway_serve() {
  network_held "tailscale serve for the gateway's port for port jobs" && return 0
  ts_serve "--tcp=$GATEWAY_PORT" "tcp://127.0.0.1:$JOBS_LOCAL_PORT" \
    || { echo "tailscale serve failed, so port jobs on other computers cannot reach the gateway. Run setup-host.sh in a terminal."; exit 1; }
  gateway_port_check
}
# network-step end

# The checks after tailscale serve, on a Mac with Colima:
#   - tailscale serve passes site.gateway_port to the router's port for port jobs.
#   - That port refuses a request without a task key, /health included.
#   - Neither gateway port answers on the Mac's other addresses, such as the office network.
gateway_port_check() {
  local code="" a p
  tailscale serve status --json 2>/dev/null | node -e '
    const s = JSON.parse(require("fs").readFileSync(0, "utf8") || "{}");
    process.exit(s.TCP?.[process.argv[1]]?.TCPForward === process.argv[2] ? 0 : 1);
  ' "$GATEWAY_PORT" "127.0.0.1:$JOBS_LOCAL_PORT" \
    || { echo "tailscale serve does not pass port $GATEWAY_PORT to 127.0.0.1:$JOBS_LOCAL_PORT. Run setup-host.sh in a terminal."; exit 1; }
  for _ in $(seq 45); do
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

# The check of site.gateway_local_port: the port answers /health on 127.0.0.1, refuses a request
# with no gateway key, and answers on no other address of this computer, Tailscale's included.
gateway_local_check() {
  local code="" a
  for _ in $(seq 45); do
    code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "http://127.0.0.1:$GATEWAY_LOCAL_PORT/health" || true)"
    [ "$code" = 200 ] && break
    sleep 2
  done
  [ "$code" = 200 ] || { echo "The gateway's local port $GATEWAY_LOCAL_PORT answered ${code:-nothing} on 127.0.0.1, not 200."; exit 1; }
  code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 -X POST -H 'content-type: application/json' -d '{}' "http://127.0.0.1:$GATEWAY_LOCAL_PORT/v1/chat/completions" || true)"
  [ "$code" = 401 ] || { echo "The gateway's local port $GATEWAY_LOCAL_PORT answered $code to a request with no gateway key, not 401. Stop cc-gateway$SUFFIX."; exit 1; }
  # Every IPv4 address of the computer except 127.0.0.0/8.
  for a in $( { ifconfig 2>/dev/null | awk '$1 == "inet" { print $2 }'; ip -4 -o addr show 2>/dev/null | awk '{ sub(/\/.*/, "", $4); print $4 }'; } | sort -u | grep -vE '^127\.'); do
    code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 3 "http://$a:$GATEWAY_LOCAL_PORT/health" || true)"
    [ "${code:-000}" = 000 ] || { echo "The gateway's local port answers on $a:$GATEWAY_LOCAL_PORT, not only on 127.0.0.1. Stop cc-gateway$SUFFIX and find what publishes port $GATEWAY_LOCAL_PORT."; exit 1; }
  done
  echo "Gateway's local port: 127.0.0.1:$GATEWAY_LOCAL_PORT only, and an agent's gateway key is required."
}

# Personal information masking: Presidio's analyzer and anonymizer run on the models' network, and
# LiteLLM removes personal details from each request before the request reaches a cloud model.
start_masking() {
  local s
  for s in presidio-analyzer presidio-anonymizer; do
    docker rm -f "cc-$s$SUFFIX" >/dev/null 2>&1 || true
    [ "$MASK_PII" = on ] || continue
    docker run -d --name "cc-$s$SUFFIX" --restart unless-stopped --network "$MODEL_NET" --network-alias "$s" \
      "$(pin_image "mcr.microsoft.com/$s:latest")" >/dev/null
  done
}

start_gateway() {
  start_masking
  # The model gateway, in two containers.
  # LiteLLM (cc-litellm): one address for every cluster model, with fallbacks in route order, and
  # one model per cloud key (key/<name>). start-litellm.py reads the keys from the secrets file, so
  # no key is in an environment variable. LiteLLM joins only the models' network.
  docker rm -f "cc-litellm$SUFFIX" >/dev/null 2>&1 || true
  local mask=()
  [ "$MASK_PII" = on ] && mask=(-e PRESIDIO_ANALYZER_API_BASE=http://presidio-analyzer:3000 -e PRESIDIO_ANONYMIZER_API_BASE=http://presidio-anonymizer:3000)
  docker run -d --name "cc-litellm$SUFFIX" --restart unless-stopped --network "$MODEL_NET" ${mask[@]+"${mask[@]}"} \
    --add-host host.docker.internal:host-gateway \
    -v "$KIT_OUT/litellm.yaml":/app/config.yaml:ro -v "$HERE/gateway/start-litellm.py":/kit/start-litellm.py:ro \
    -v "$MODEL_KEYS":/run/secrets/model-keys.env:ro -v "$GW_STATE/litellm-master.key":/run/secrets/litellm-master.key:ro \
    --entrypoint python "$(pin_image ghcr.io/berriai/litellm:main-stable)" \
    /kit/start-litellm.py /app/config.yaml /run/secrets/model-keys.env /run/secrets/litellm-master.key --port 4000
  # The router (cc-gateway): each agent's and each port job's gateway key, and the spend log in
  # gateway-logs/. Port jobs on other computers reach the router's port 4001 over Tailscale:
  # site.gateway_port on the control computer's Tailscale address only, where every request needs
  # a task key. With the filter off, this computer's port jobs use site.gateway_port on 127.0.0.1.
  # On Linux, Docker publishes port 4001 on the Tailscale address. On a Mac, Docker runs in Colima's
  # VM, which does not hold the Mac's Tailscale address. Docker then publishes port 4001 on
  # 127.0.0.1:<gateway port + 1>, and tailscale serve passes the Tailscale port to that local port.
  docker rm -f "cc-gateway$SUFFIX" >/dev/null 2>&1 || true
  mkdir -p "$CC_DIR/gateway-app" "$CC_DIR/gateway-logs"
  cp "$HERE"/gateway/*.mjs "$HERE/gateway/package.json" "$CC_DIR/gateway-app/"
  local publish=()
  [ "$EGRESS" = on ] || publish+=(-p "127.0.0.1:$GATEWAY_PORT:4000")
  # site.gateway_local_port: the agents' port, on 127.0.0.1 only, for a RecursicaChat 2.0 server on
  # this computer, outside Docker. The router's address check admits it: the connection reaches the
  # router from the gateway of the router's own Docker network. An agent's gateway key is needed.
  [ -z "${GATEWAY_LOCAL_PORT:-}" ] || publish+=(-p "127.0.0.1:$GATEWAY_LOCAL_PORT:4000")
  if [ -n "$TAILNET_ADDRESS" ] && [ "$GATEWAY_SERVE" = true ]; then publish+=(-p "127.0.0.1:$JOBS_LOCAL_PORT:4001")
  elif [ -n "$TAILNET_ADDRESS" ]; then publish+=(-p "$TAILNET_ADDRESS:$GATEWAY_PORT:4001"); fi
  # The router asks the RecursicaChat 2.0 server's gateway listener, on this computer's 127.0.0.1, for
  # each task's Model use setting, at host.docker.internal: the way LiteLLM reaches the Mac's Ollama.
  # The router reads its networks when it starts, and allows a key from each one. So every network
  # joins before the start: the models' network, and the port jobs' network when it exists.
  docker create --name "cc-gateway$SUFFIX" --restart unless-stopped --network "$NET" ${publish[@]+"${publish[@]}"} \
    -v "$CC_DIR/gateway-app":/app -v "$KIT_OUT/gateway.json":/etc/gateway/gateway.json:ro \
    -v "$GW_STATE":/state -v "$CC_DIR/gateway-logs":/logs -w /app \
    -e LITELLM_URL="http://cc-litellm$SUFFIX:4000" \
    --add-host host.docker.internal:host-gateway \
    "$(pin_image node:22-alpine)" sh -c "npm install --silent && node router.mjs" >/dev/null
  [ "$NET" = "$MODEL_NET" ] || docker network connect "$MODEL_NET" "cc-gateway$SUFFIX"
  if [ "$EGRESS" = on ] && docker network inspect "$JOBS_NET" >/dev/null 2>&1; then
    docker network connect --alias cc-gateway "$JOBS_NET" "cc-gateway$SUFFIX"
  fi
  docker start "cc-gateway$SUFFIX" >/dev/null
  if [ -n "$TAILNET_ADDRESS" ] && [ "$GATEWAY_SERVE" = true ]; then gateway_serve; fi
  [ -z "${GATEWAY_LOCAL_PORT:-}" ] || gateway_local_check
}

if [ "$SECRETS_ONLY" = true ]; then
  start_gateway
  [ "$UPGRADE_ONLY" = true ] && refresh_job_filter
  if [ "$UPGRADE_ONLY" = true ]; then what="Upgrade applied"; else what="Secrets applied"; fi
  echo "$what${TENANT:+ (stack: $TENANT)}: gateway recreated."
  exit 0
fi

mkdir -p "$WS"
# The workspace's checkouts. The setup clones each one once, when nothing is at its path, and never
# runs git in a checkout after that.
clone_once() { [ -e "$2" ] || [ -L "$2" ] || git clone "${@:3}" "$1" "$2"; }
# The knowledge checkout, which Kev reads.
clone_once "$KNOWLEDGE_REPO" "$WS/recursica-knowledge"
# The application the app preview serves.
clone_once "$APP_REPO_URL" "$WS/$APP_REPO"

# Kev, the quick first pass of a design review. Copied out of the kit's checkout so its cache and
# node_modules never land in a repository. The copy never follows a symlink in the workspace
# (kit/safe-files.mjs). Its engines are listed in site.json.
if [ -d "$HERE/../tools/kev" ]; then
  node "$HERE/kit/safe-files.mjs" mkdir "$WS" "$WS/kev"
  node "$HERE/kit/safe-files.mjs" copy "$WS" "$WS/kev" "$HERE/../tools/kev/."
  docker run --rm -v "$WS/kev":/app -w /app "$(pin_image node:22)" npm ci --omit=dev --no-audit --no-fund
fi

# A port another stack already uses stops the setup here, before anything restarts.
port_owner() { docker ps --format '{{.Names}} {{.Ports}}' | grep -E "(:|\\])$1->" | awk '{print $1}' | grep -vE "^(betty-proto$SUFFIX|cc-gateway$SUFFIX)\$" || true; }
for p in "$PREVIEW_PORT" "$GATEWAY_PORT" $([ "$GATEWAY_SERVE" = true ] && echo "$JOBS_LOCAL_PORT") ${GATEWAY_LOCAL_PORT:-}; do
  o="$(port_owner "$p")"
  [ -z "$o" ] || { echo "Port $p is already used by $o. Give this stack other ports in site.json (site.preview_port, site.gateway_port, site.gateway_local_port)."; exit 1; }
done

# Always-on dev server for the application (hot-reloads on each change)
docker rm -f "betty-proto$SUFFIX" >/dev/null 2>&1 || true
docker run -d --name "betty-proto$SUFFIX" --restart unless-stopped -p "127.0.0.1:$PREVIEW_PORT:5173" \
  -v "$WS/$APP_REPO":/app -w /app \
  -e __VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS="$TS_HOST" \
  "$(pin_image node:22)" sh -c "npm install && npx vite --host 0.0.0.0"

start_gateway
refresh_job_filter

# Background jobs, the native way for this OS (systemd on Linux, launchd on macOS).
ENVS="CC_DIR=$CC_DIR WS=$WS SITE=$SITE OWNER=$(id -un) OWNER_HOME=$HOME"
# A client stack's folder sits inside an encrypted disk image, which the "Unlock stack" workflow
# opens after a restart.
[ -n "$TENANT" ] && export UNIT_LOG_DIR="$HOME/tenants/$TENANT/logs"
# network-step begin: remove CircleChat 1.x's jobs
# CircleChat 1.x's jobs: its boot job, its backup and test restore, its release watcher and the
# hourly sync of its agents' skills. Removing a job can stop work that runs, so the step waits for
# a person. 1.x's last backup stays in the backup remote until someone deletes it.
if ! network_held "removing CircleChat 1.x's jobs (circlechat-boot, backup, restore-test, release-watch, agents-sync), which can stop work that runs"; then
  for u in circlechat-boot backup restore-test release-watch agents-sync; do uninstall_unit "$u$SUFFIX" >/dev/null; done
fi
# network-step end
# Earlier versions ran their own image and upgrade jobs; cluster-updater (install-cluster.sh)
# now runs both, hourly.
uninstall_unit "images$SUFFIX" >/dev/null
uninstall_unit "upgrade$SUFFIX" >/dev/null
# The agents on the stack's RecursicaChat 2.0 server, with a recursicachat block in site.json: each
# agent's instructions, model, autonomy, sandbox and monthly budget, from the kit and site.json
# (rc-sync.sh), through the server's root-only CLI. Now, then hourly. The job runs as root, because
# only root may run the server's CLI. The kit's own steps run as the owner. A failed sync leaves the
# setup going: an agent not yet added on the server fails the sync until the agent is added.
if [ -n "$(site_get recursicachat)" ]; then
  CC_DIR="$CC_DIR" SITE="$SITE" "$HERE/rc-sync.sh" || echo "The RecursicaChat sync failed (the lines above say why). The hourly job tries again."
  install_unit "rc-sync$SUFFIX" "$ENVS KIT_NODE=$(command -v node) $HERE/rc-sync.sh" "$CC_DIR" root hourly
else
  uninstall_unit "rc-sync$SUFFIX" >/dev/null
fi
# A member session for each program outside the server that uses the server's API, from
# recursicachat.sessions in site.json (rc-session.sh): a fresh 60-minute session in each program's
# file every 45 minutes. A long-running job, as root, because only root may run the server's CLI.
if [ "$(site_get recursicachat.sessions)" != "" ] && [ "$(site_get recursicachat.sessions)" != "[]" ]; then
  install_unit "rc-session$SUFFIX" "$ENVS KIT_NODE=$(command -v node) $HERE/rc-session.sh" "$CC_DIR" root
else
  uninstall_unit "rc-session$SUFFIX" >/dev/null
fi
# A service account for each program that drives agents on the server, from recursicachat.services
# (rc-service.sh): the account, the agents it drives, and its token in the program's file. A token
# doesn't expire, so this runs here and when asked, not as a job. As root, because only root may run
# the server's CLI and write the program's file.
if [ "$(site_get recursicachat.services)" != "" ] && [ "$(site_get recursicachat.services)" != "[]" ]; then
  sudo OWNER="$(id -un)" CC_DIR="$CC_DIR" SITE="$SITE" KIT_NODE="$(command -v node)" "$HERE/rc-service.sh" ||
    echo "Setting up a RecursicaChat service failed (the lines above say why). Fix it, then run: sudo OWNER=\$(id -un) $HERE/rc-service.sh"
fi
# Kev's review data, with data.repo in site.json: each hour, Barb's notes go to a new branch of
# that private repo, with a pull request for a person to review. Each night, the reviewed notes
# come from the repo's main branch, for Kev's training. Without data.repo, neither job runs.
if [ -n "$(site_get data.repo)" ]; then
  install_unit "kev-data-push$SUFFIX" "$ENVS $HERE/kit/push-data.sh" "$CC_DIR" "$(id -un)" hourly
  install_unit "kev-notes-pull$SUFFIX" "$ENVS $HERE/kit/pull-kev-notes.sh" "$CC_DIR" "$(id -un)" "*-*-* 01:30"
else
  uninstall_unit "kev-data-push$SUFFIX" >/dev/null
  uninstall_unit "kev-notes-pull$SUFFIX" >/dev/null
fi

# Each agent's GitHub App, with github_apps in site.json, and the Kev notes push's app, with
# data.github_app. The token service runs as root on this control computer and reads each app's
# private key from a root-owned file (circlechat/github/token-service.mjs). The push's token goes to
# $CC_DIR/kev-data.env. A port job on another computer asks the service for a push token over
# Tailscale, so the service listens on loopback and this computer's Tailscale address. Without an
# app, nothing has push access.
if [ "$GITHUB_APPS" = on ]; then
  if [ -n "$TENANT" ]; then GH_ENV="client-$TENANT"; else GH_ENV="$STACK_NAME"; fi
  TOKEN_HOSTS="127.0.0.1"
  a="$( { tailscale ip -4 2>/dev/null || tailscale.exe ip -4 2>/dev/null || true; } | head -1 | tr -d '\r')"
  [ -n "$a" ] && TOKEN_HOSTS="$TOKEN_HOSTS,$a"
  # The service restarts when the kit's version changes, so a new release's code runs.
  UNIT_SETTINGS="$(cd "$HERE/.." && pwd)/package.json" install_unit "github-tokens$SUFFIX" "KIT=$(cd "$HERE/.." && pwd) OWNER=$(id -un) OWNER_HOME=$HOME WS=$WS CC_DIR=$CC_DIR STACK=$GH_ENV TOKEN_HOSTS=$TOKEN_HOSTS TOKEN_PORT=$GITHUB_TOKEN_PORT $(command -v node) $HERE/github/token-service.mjs" "$CC_DIR" root
else
  uninstall_unit "github-tokens$SUFFIX" >/dev/null
fi

if grep -qi microsoft /proc/version 2>/dev/null; then
  echo
  echo "This is WSL. WSL starts only when someone signs in, and stops when idle, which stops everything above."
  echo "To start WSL at boot and keep it running, run this once in an Administrator PowerShell, as this distro's owner:"
  echo "  powershell -ExecutionPolicy Bypass -File \\\\wsl.localhost\\${WSL_DISTRO_NAME:-Ubuntu}$(printf '%s' "$HERE/cluster/windows/install-wsl-boot.ps1" | tr / '\\')"
fi

# The app preview's address. The preview listens on 127.0.0.1 only. With site.proxy "tailscale"
# (the default), tailscale serve gives the preview an HTTPS address on the tailnet, on
# site.preview_port. The setup never turns on Funnel, and stops when Funnel serves the port,
# because Funnel opens the port to the internet. The setup never removes a rule: tailscale serve
# reset would clear every rule, the gateway's too. CircleChat 1.x's old rule stays until a person
# removes it, as in tailscale serve --https=443 off.
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
# network-step begin: tailscale serve for the app preview
if [ "$PROXY" = other ]; then
  ADDRESS="Point an HTTPS reverse proxy on this computer at http://127.0.0.1:$PREVIEW_PORT for the app preview."
elif network_held "tailscale serve for the app preview"; then
  ADDRESS="tailscale serve for the app preview waits for a person: run setup-host.sh by hand."
elif ! command -v tailscale >/dev/null; then
  ADDRESS="Tailscale is not installed. Install Tailscale, then run: tailscale serve --bg --https=$PREVIEW_PORT http://127.0.0.1:$PREVIEW_PORT"
else
  ts_serve "--https=$PREVIEW_PORT" "http://127.0.0.1:$PREVIEW_PORT" \
    || { echo "tailscale serve failed, so the tailnet cannot reach the app preview. Run setup-host.sh in a terminal."; exit 1; }
  problems="$(site_serve_check "$PREVIEW_PORT:$PREVIEW_PORT")"
  [ -z "$problems" ] || { echo "$problems"; echo "Check tailscale serve status, then run setup-host.sh again."; exit 1; }
  ADDRESS="tailscale serve, tailnet only: https://$TS_HOST:$PREVIEW_PORT passes to http://127.0.0.1:$PREVIEW_PORT for the app preview."
fi
# network-step end
network_applied setup-host.sh
cat << MSG

Done${TENANT:+ (stack: $TENANT)}. $ADDRESS
MSG
