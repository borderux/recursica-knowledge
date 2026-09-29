#!/usr/bin/env bash
# One-time (and safe to rerun) host setup for CircleChat + the Recursica agents.
set -euo pipefail

CC_DIR="${CC_DIR:-$HOME/circlechat}"
WS="${WS:-$HOME/circlechat-workspace}"
PORT="${PORT:-8080}"
TS_HOST="${TS_HOST:?set TS_HOST to your Tailscale name, e.g. TS_HOST=my-pc.tailXXXX.ts.net}"
KNOWLEDGE_REPO="${KNOWLEDGE_REPO:-https://github.com/borderux/recursica-knowledge}"
PROTO_REPO="${PROTO_REPO:-https://github.com/borderux/betty-test-proto-repo}"

cd "$CC_DIR"
[ -f .env ] || cp .env.example .env

set_env() { # set_env KEY VALUE — replace or append, never duplicate
  sed -i "/^$1=/d" .env
  echo "$1=$2" >> .env
}
set_env HERMES_HOMES_DIR "$CC_DIR/hermes-homes"
set_env CC_REPO_HOST_DIR "$CC_DIR"
set_env PUBLIC_BASE_URL "http://localhost:$PORT"
set_env CC_SHARED_WORKSPACE_DIR "$WS"
# Seconds. The api discards a reply that takes longer than this + 60s, and a full Barb review
# does. 480 and 1200 both lost reviews. See agents/barb/runtime/hermes.md.
set_env HERMES_TIMEOUT 4000

# Caddy on $PORT (Tailscale serve points there)
sed -i "s|- \"80:80\"|- \"$PORT:80\"|" compose.yml

# Shared /workspace mounted into the api (the bridge already reads CC_SHARED_WORKSPACE_DIR)
grep -q ':/workspace' compose.agents.yml || \
  sed -i 's|^      - /var/run/docker.sock:/var/run/docker.sock$|&\n      - ${CC_SHARED_WORKSPACE_DIR}:/workspace|' compose.agents.yml

mkdir -p hermes-homes "$WS" "$WS/reviews"
# The checkout every agent reads. Nobody writes to it; sync-skills.sh pulls it.
[ -d "$WS/recursica-knowledge" ]   || git clone "$KNOWLEDGE_REPO" "$WS/recursica-knowledge"
# Alan's own clone, for his proposal branches. Kept apart so an unmerged rule never reaches
# the checkout Betty builds from and Barb reviews against.
[ -d "$WS/kb-proposals" ]          || git clone "$KNOWLEDGE_REPO" "$WS/kb-proposals"
# The repository's own hooks, so Alan's commits get the same name, email and phone checks as
# anyone's: commit-msg on the message, pre-commit on the lines he adds. Both need only node.
git -C "$WS/kb-proposals" config core.hooksPath .husky
# Client names are only checked where the operator's gitignored list of them exists. Copy it
# in if you have one; without it the email, phone and structural rules still run.
if [ -n "${LOCAL_REDACTIONS:-}" ] && [ -f "$LOCAL_REDACTIONS" ]; then
  cp "$LOCAL_REDACTIONS" "$WS/kb-proposals/buzz-agents/local-redactions.json"
fi
[ -d "$WS/betty-test-proto-repo" ] || git clone "$PROTO_REPO" "$WS/betty-test-proto-repo"

# Kev, Barb's quick first pass. Copied out of the knowledge checkout so its cache and
# node_modules never land in a repository. It still needs a Kev-engine: see tools/kev/ENGINE.md.
if [ -d "$WS/recursica-knowledge/tools/kev" ]; then
  mkdir -p "$WS/kev"
  cp -r "$WS/recursica-knowledge/tools/kev/." "$WS/kev/"
  docker run --rm -v "$WS/kev":/app -w /app node:22 npm ci --omit=dev --no-audit --no-fund
fi

sudo chmod -R 777 hermes-homes "$WS"

docker pull nousresearch/hermes-agent:latest
docker compose -f compose.yml -f compose.agents.yml up -d --force-recreate

# Always-on dev server for Betty's prototypes (hot-reloads as she edits)
docker rm -f betty-proto >/dev/null 2>&1 || true
docker run -d --name betty-proto --restart unless-stopped -p 5173:5173 \
  -v "$WS/betty-test-proto-repo":/app -w /app \
  -e __VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS="$TS_HOST" \
  node:22 sh -c "npm install && npx vite --host 0.0.0.0"

cat << MSG

Done. Now in Windows PowerShell:
  tailscale serve --bg http://127.0.0.1:$PORT
  tailscale serve --bg --https=5173 http://127.0.0.1:5173

CircleChat:  https://$TS_HOST
Prototypes:  https://$TS_HOST:5173
Wait ~30s for the api before installing agents.
MSG
