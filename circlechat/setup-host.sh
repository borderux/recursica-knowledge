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
set -euo pipefail

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
TS_HOST="$(site_get site.public_host)"
PORT="$(site_get site.port)"; PORT="${PORT:-8080}"
KNOWLEDGE_REPO="$(site_get repos.knowledge)"
APP_REPO_URL="$(site_get repos.app)"

cd "$CC_DIR"
[ -f .env ] || cp .env.example .env
set_env() { sedi "/^$1=/d" .env; echo "$1=$2" >> .env; }   # replace or append, never duplicate
env_has() { grep -q "^$1=." .env; }
set_env HERMES_HOMES_DIR "$CC_DIR/hermes-homes"
set_env CC_REPO_HOST_DIR "$CC_DIR"
set_env PUBLIC_BASE_URL "http://localhost:$PORT"
set_env CC_SHARED_WORKSPACE_DIR "$WS"
# Seconds. The api discards a reply that takes longer than this + 60s, and a full Barb review
# does. 480 and 1200 both lost reviews. See agents/barb/runtime/hermes.md.
set_env HERMES_TIMEOUT 4000
env_has LITELLM_MASTER_KEY || set_env LITELLM_MASTER_KEY "sk-$(openssl rand -hex 16)"

# Caddy on $PORT (Tailscale serve, or any reverse proxy, points there)
sedi "s|- \"80:80\"|- \"$PORT:80\"|" compose.yml
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

docker pull nousresearch/hermes-agent:latest
docker compose -f compose.yml -f compose.agents.yml up -d --force-recreate
NET="$(docker network ls --format '{{.Name}}' | grep -m1 '_default$' || true)"

# Always-on dev server for the application (hot-reloads as Betty edits)
docker rm -f betty-proto >/dev/null 2>&1 || true
docker run -d --name betty-proto --restart unless-stopped -p 5173:5173 \
  -v "$WS/$APP_REPO":/app -w /app \
  -e __VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS="$TS_HOST" \
  node:22 sh -c "npm install && npx vite --host 0.0.0.0"

# Model gateway: one address for every model on every node, with fallbacks in route order.
# Agents reach it at http://localhost:4000 (their turns run on the host network).
docker rm -f cc-gateway >/dev/null 2>&1 || true
docker run -d --name cc-gateway --restart unless-stopped -p 127.0.0.1:4000:4000 \
  --add-host host.docker.internal:host-gateway \
  -v "$KIT_OUT/litellm.yaml":/app/config.yaml:ro --env-file .env \
  ghcr.io/berriai/litellm:main-stable --config /app/config.yaml --port 4000

# Slack notifier: task changes, questions to people, rejected agent posts, stalled tasks.
docker rm -f cc-slack-notify >/dev/null 2>&1 || true
if [ "$(site_get notify.slack)" = true ] && env_has SLACK_WEBHOOK_URL && [ -n "$NET" ]; then
  mkdir -p "$CC_DIR/notify" && cp "$HERE/notify/notify.mjs" "$HERE/notify/package.json" "$CC_DIR/notify/"
  PG="$(sed -n 's/^PG_PASSWORD=//p' .env)"; PG="${PG:-circlechat}"
  docker run -d --name cc-slack-notify --restart unless-stopped --network "$NET" \
    -v "$CC_DIR/notify":/app -v cc-notify-state:/state -w /app \
    -e DATABASE_URL="postgres://postgres:$PG@postgres:5432/circlechat" \
    -e SLACK_WEBHOOK_URL="$(sed -n 's/^SLACK_WEBHOOK_URL=//p' .env)" \
    -e CC_URL="https://$TS_HOST" \
    node:22-alpine sh -c "npm install --silent && node notify.mjs"
  echo "Slack notifier running."
else
  echo "Slack notifier off (needs notify.slack in site.json and SLACK_WEBHOOK_URL in .env)."
fi

# Background jobs, the native way for this OS (systemd on Linux, launchd on macOS).
ENVS="CC_DIR=$CC_DIR WS=$WS SITE=$SITE"
install_unit circlechat-boot "cd $CC_DIR && docker compose -f compose.yml -f compose.agents.yml up -d" "$CC_DIR" "$(id -un)" boot
install_unit agents-sync "git config --global --get-all safe.directory | grep -qx $WS/recursica-knowledge || git config --global --add safe.directory $WS/recursica-knowledge; $ENVS $HERE/sync-skills.sh; chown -R $(id -un) $WS/recursica-knowledge/.git $WS/kev" "$CC_DIR" root hourly
if [ -n "$(site_get data.kev_disagreements_branch)" ]; then
  install_unit kev-data-push "$ENVS $HERE/kit/push-data.sh" "$CC_DIR" "$(id -un)" hourly
fi

if grep -qi microsoft /proc/version 2>/dev/null; then
  echo
  echo "This is WSL. WSL stops when no Windows program holds it open, which stops everything above."
  echo "Keep it running from an Administrator PowerShell:"
  echo "  schtasks /create /tn \"WSL keep-alive\" /sc onstart /ru SYSTEM /rl highest /tr \"wsl.exe -d ${WSL_DISTRO_NAME:-Ubuntu} -u $(id -un) --exec sleep infinity\""
fi

cat << MSG

Done. Point https://$TS_HOST at http://127.0.0.1:$PORT (Tailscale: tailscale serve --bg http://127.0.0.1:$PORT)
and https://$TS_HOST:5173 at http://127.0.0.1:5173 for the app preview.
Wait ~30s for the api, then install agents in the UI and run setup-agent.sh for each.
MSG
