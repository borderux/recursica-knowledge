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
# --secrets-only: after a secret in .env changes, recreate only the model gateway and the Slack
# notifier, which read .env when they start. CircleChat, the agents and the background jobs keep
# running. The deploy-secrets workflow uses this mode; see circlechat/README.md, "Secrets in GitHub".
set -euo pipefail
SECRETS_ONLY=false
[ "${1:-}" = --secrets-only ] && SECRETS_ONLY=true

if [ -n "${TENANT:-}" ]; then
  CC_DIR="${CC_DIR:-$HOME/tenants/$TENANT/circlechat}"
  WS="${WS:-$HOME/tenants/$TENANT/workspace}"
fi

CC_DIR="${CC_DIR:-$HOME/circlechat}"
WS="${WS:-$HOME/circlechat-workspace}"
SITE="${SITE:-$CC_DIR/site.json}"
HERE="$(cd "$(dirname "$0")" && pwd)"
. "$HERE/kit/lib.sh"

[ -f "$SITE" ] || { echo "No $SITE. Copy circlechat/site.example.json there and fill it in."; exit 1; }
command -v docker >/dev/null || { echo "Docker is not installed (Linux: Docker Engine; macOS: Colima or OrbStack)."; exit 1; }
command -v node >/dev/null   || { echo "Node 20+ is not installed."; exit 1; }

# Validate and render. A broken site.json stops here, before anything changes.
KIT_OUT="$CC_DIR/kit-out"
node "$HERE/kit/render.mjs" "$SITE" "$KIT_OUT"
. "$KIT_OUT/app.env"
WANT_TENANT="${TENANT:-}"
. "$KIT_OUT/tenant.env"
[ "$WANT_TENANT" = "$TENANT" ] || { echo "TENANT=${WANT_TENANT:-<none>} but $SITE has site.tenant ${TENANT:-<none>}. Run with the stack's own TENANT and site.json."; exit 1; }
# A client stack runs in its own Docker VM. Every docker command below, and every job installed
# below, uses that VM.
if [ -n "$DOCKER_CONTEXT" ]; then
  docker context inspect "$DOCKER_CONTEXT" >/dev/null 2>&1 || { echo "Docker context $DOCKER_CONTEXT does not exist. On a Mac: colima start --profile ${DOCKER_CONTEXT#colima-}"; exit 1; }
  export DOCKER_CONTEXT
fi
DCTX="${DOCKER_CONTEXT:+DOCKER_CONTEXT=$DOCKER_CONTEXT }"
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
set_env PUBLIC_BASE_URL "http://localhost:$PORT"
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
  set_env COMPOSE_FILE compose.yml:compose.agents.yml:compose.egress.yml
  set_env CC_AGENT_NETWORK "$AGENT_NET"
  set_env CC_AGENT_PROXY http://egress:3128
  set_env CC_AGENT_NO_PROXY api,cc-gateway,localhost,127.0.0.1
  set_env CC_AGENT_API_BASE http://api:3300/api
else
  rm -f compose.egress.yml
  for k in CC_AGENT_NETWORK CC_AGENT_PROXY CC_AGENT_NO_PROXY CC_AGENT_API_BASE; do sedi "/^$k=/d" .env; done
fi
env_has LITELLM_MASTER_KEY || set_env LITELLM_MASTER_KEY "sk-$(openssl rand -hex 16)"
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
  docker build -q -t recursica/egress "$HERE/egress" >/dev/null
  mkdir -p "$CC_DIR/egress-logs" && chmod 777 "$CC_DIR/egress-logs"
  docker rm -f "cc-egress$SUFFIX" >/dev/null 2>&1 || true
  docker run -d --name "cc-egress$SUFFIX" --restart unless-stopped --network "$NET" \
    --add-host host.docker.internal:host-gateway \
    -v "$KIT_OUT/egress":/etc/egress:ro -v "$CC_DIR/egress-logs":/var/log/egress \
    recursica/egress >/dev/null
  docker network connect --alias egress "$AGENT_NET" "cc-egress$SUFFIX"
  docker network connect --alias cc-gateway "$AGENT_NET" "cc-gateway$SUFFIX" 2>/dev/null || true
  echo "Outgoing filter running: agents reach only the sites in $KIT_OUT/egress/allow.txt."
}

start_gateway_and_notifier() {
  # Model gateway: one address for every model on every node, with fallbacks in route order.
  # Agents reach it at http://localhost:$GATEWAY_PORT (their turns run on the host network).
  docker rm -f "cc-gateway$SUFFIX" >/dev/null 2>&1 || true
  docker run -d --name "cc-gateway$SUFFIX" --restart unless-stopped -p "127.0.0.1:$GATEWAY_PORT:4000" \
    --add-host host.docker.internal:host-gateway \
    -v "$KIT_OUT/litellm.yaml":/app/config.yaml:ro --env-file .env \
    ghcr.io/berriai/litellm:main-stable --config /app/config.yaml --port 4000

  # Slack notifier: task changes, questions to people, rejected agent posts, stalled tasks.
  docker rm -f "cc-slack-notify$SUFFIX" >/dev/null 2>&1 || true
  if [ "$(site_get notify.slack)" = true ] && env_has SLACK_WEBHOOK_URL && [ -n "$NET" ]; then
    mkdir -p "$CC_DIR/notify" && cp "$HERE/notify/notify.mjs" "$HERE/notify/package.json" "$CC_DIR/notify/"
    PG="$(sed -n 's/^PG_PASSWORD=//p' .env)"; PG="${PG:-circlechat}"
    docker run -d --name "cc-slack-notify$SUFFIX" --restart unless-stopped --network "$NET" \
      -v "$CC_DIR/notify":/app -v "cc-notify-state$SUFFIX":/state -w /app \
      -e DATABASE_URL="postgres://postgres:$PG@postgres:5432/circlechat" \
      -e SLACK_WEBHOOK_URL="$(sed -n 's/^SLACK_WEBHOOK_URL=//p' .env)" \
      -e CC_URL="https://$TS_HOST" \
      node:22-alpine sh -c "npm install --silent && node notify.mjs"
    echo "Slack notifier running."
  else
    echo "Slack notifier off (needs notify.slack in site.json and SLACK_WEBHOOK_URL in .env)."
  fi
}

if [ "$SECRETS_ONLY" = true ]; then
  start_gateway_and_notifier
  [ "$EGRESS" = on ] && docker network connect --alias cc-gateway "$AGENT_NET" "cc-gateway$SUFFIX" 2>/dev/null || true
  echo "Secrets applied${TENANT:+ (stack: $TENANT)}: gateway and Slack notifier recreated."
  exit 0
fi

# Caddy on $PORT (Tailscale serve, or any reverse proxy, points there)
# Caddy listens on this computer only. Tailscale serve gives each person on the tailnet the HTTPS
# address, and nobody on the office network reaches CircleChat directly.
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
  docker run --rm -v "$WS/kev":/app -w /app node:22 npm ci --omit=dev --no-audit --no-fund
fi
sudo chmod -R 777 hermes-homes "$WS"

# A port another stack already uses stops the setup here, before anything restarts.
port_owner() { docker ps --format '{{.Names}} {{.Ports}}' | grep -E "(:|\\])$1->" | awk '{print $1}' | grep -vE "^(${COMPOSE_PROJECT_NAME}[-_]|betty-proto$SUFFIX\$|cc-gateway$SUFFIX\$)" || true; }
for p in "$PORT" "$PREVIEW_PORT" "$GATEWAY_PORT"; do
  o="$(port_owner "$p")"
  [ -z "$o" ] || { echo "Port $p is already used by $o. Give this stack other ports in site.json (site.port, site.preview_port, site.gateway_port)."; exit 1; }
done

docker pull nousresearch/hermes-agent:latest
docker compose up -d --force-recreate

# Always-on dev server for the application (hot-reloads as Betty edits)
docker rm -f "betty-proto$SUFFIX" >/dev/null 2>&1 || true
docker run -d --name "betty-proto$SUFFIX" --restart unless-stopped -p "127.0.0.1:$PREVIEW_PORT:5173" \
  -v "$WS/$APP_REPO":/app -w /app \
  -e __VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS="$TS_HOST" \
  node:22 sh -c "npm install && npx vite --host 0.0.0.0"

start_gateway_and_notifier
start_egress

# Background jobs, the native way for this OS (systemd on Linux, launchd on macOS).
ENVS="CC_DIR=$CC_DIR WS=$WS SITE=$SITE"
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
  BENV="OWNER_HOME=$HOME CC_DIR=$CC_DIR WS=$WS PATH=$(dirname "$(command -v node)"):/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin"
  install_unit "backup$SUFFIX" "$BENV $HERE/backup/backup.sh" "$CC_DIR" root "*-*-* $BACKUP_TIME"
  install_unit "restore-test$SUFFIX" "$BENV $HERE/backup/restore-test.sh" "$CC_DIR" root "*-*-01 04:30"
fi
# Weekly container refresh: new image versions wait 7 days, and a failed health check rolls the
# stack back. Runs on Sunday at 3 a.m.
install_unit "images$SUFFIX" "CC_DIR=$CC_DIR $(command -v node) $HERE/cluster/images.mjs" "$HOME" "$(id -un)" "Sun *-*-* 03:00"
install_unit "agents-sync$SUFFIX" "git config --global --get-all safe.directory | grep -qx $WS/recursica-knowledge || git config --global --add safe.directory $WS/recursica-knowledge; $ENVS $HERE/sync-skills.sh; chown -R $(id -un) $WS/recursica-knowledge/.git $WS/kev" "$CC_DIR" root hourly
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

if [ -z "$TENANT" ]; then
  SERVE="tailscale serve --bg http://127.0.0.1:$PORT"
  WHERE="https://$TS_HOST"
else
  SERVE="tailscale serve --bg --https=$PORT http://127.0.0.1:$PORT"
  WHERE="https://$TS_HOST:$PORT"
fi
cat << MSG

Done${TENANT:+ (stack: $TENANT)}. Point $WHERE at http://127.0.0.1:$PORT (Tailscale: $SERVE)
and https://$TS_HOST:$PREVIEW_PORT at http://127.0.0.1:$PREVIEW_PORT for the app preview.
Wait ~30s for the api, then install agents in the UI and run ${TENANT:+TENANT=$TENANT }setup-agent.sh for each.
MSG
