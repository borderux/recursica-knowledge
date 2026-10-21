#!/usr/bin/env bash
# Set up the services one machine in site.json runs (a Kev-engine, a model server, ...), as
# start-at-boot services: systemd on Linux, launchd on macOS. Run it on that machine. Safe to rerun.
#
#   SITE=/path/to/site.json ./circlechat/setup-node.sh <node name>
#
# Secrets a service needs (its "secret_env" names, e.g. KEV_API_KEY) are read from
# ~/.recursica-node.env on this machine, never from site.json or the repository.
set -euo pipefail
NODE="${1:?usage: setup-node.sh <node name from site.json>}"
# With TENANT=<name>, the stack's own site.json and secrets file: ~/tenants/<name>/circlechat/site.json
# and ~/tenants/<name>/node.env, both inside the client's encrypted disk image on a Mac. A job
# runner then serves that stack alone, with its job folder and logs inside the image too.
if [ -n "${TENANT:-}" ]; then
  SITE="${SITE:-$HOME/tenants/$TENANT/circlechat/site.json}"
  SECRETS="${SECRETS:-$HOME/tenants/$TENANT/node.env}"
  export UNIT_LOG_DIR="$HOME/tenants/$TENANT/logs"
fi
SITE="${SITE:-$HOME/circlechat/site.json}"
SECRETS="${SECRETS:-$HOME/.recursica-node.env}"
HERE="$(cd "$(dirname "$0")" && pwd)"
. "$HERE/kit/lib.sh"
[ -f "$SITE" ] || { echo "No $SITE. Copy this deployment's site.json here (it holds no secrets)."; exit 1; }

OUT="$(mktemp -d)"; trap 'rm -rf "$OUT"' EXIT
node "$HERE/kit/render.mjs" "$SITE" "$OUT" >/dev/null
SPEC="$OUT/services/$NODE.json"
. "$OUT/tenant.env"
[ "${DOCKER_CONTEXT:-}" ] && export DOCKER_CONTEXT
DCTX="${DOCKER_CONTEXT:+DOCKER_CONTEXT=$DOCKER_CONTEXT }"
[ -f "$SPEC" ] || { echo "No node \"$NODE\" in $SITE."; exit 1; }

want_os="$(node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1])).os)' "$SPEC")"
case "$want_os/$OS" in
  linux/Linux|macos/Darwin) ;;
  windows/*) echo "$NODE is a Windows node: run its services as Windows startup tasks or services; see circlechat/README.md."; exit 0 ;;
  *) echo "$NODE is listed as $want_os, but this machine is $OS."; exit 1 ;;
esac

# One line per service: name<TAB>dir<TAB>command-with-env
node -e '
  const s = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
  for (const v of s.services) {
    const env = Object.entries(v.env ?? {}).map(([k, x]) => `${k}=${JSON.stringify(String(x))}`).join(" ");
    const secrets = (v.secret_env ?? []).length ? `set -a; . "${process.argv[2]}"; set +a; ` : "";
    console.log([v.name, v.dir, `${secrets}${env ? env + " " : ""}${v.command}`].join("\t"));
  }' "$SPEC" "$SECRETS" | while IFS=$'\t' read -r name dir cmd; do
  [ -d "$dir" ] || { echo "$name: $dir does not exist on this machine; install it first."; continue; }
  install_unit "$name" "$cmd" "$dir" "$(id -un)"
done
# A job runner, when the node has a `jobs` block: builds the porter job image and runs jobd, which
# starts each job in a container capped at jobs.memory_gb. Its secrets (JOBD_TOKEN, ANTHROPIC_API_KEY,
# PORTER_GITHUB_PAT, PORTER_GIT_NAME, PORTER_GIT_EMAIL, PORTER_HOOK_URL, PORTER_HOOK_SECRET) come
# from $SECRETS. JOBD_TOKEN must match the one in the control machine's .env.
JOBS="$(node -e 'const s=JSON.parse(require("fs").readFileSync(process.argv[1]));process.stdout.write(s.jobs?JSON.stringify(s.jobs):"")' "$SPEC")"
if [ -n "$JOBS" ]; then
  jget() { node -e 'process.stdout.write(String(JSON.parse(process.argv[1])[process.argv[2]] ?? ""))' "$JOBS" "$1"; }
  [ -f "$SECRETS" ] && grep -q '^JOBD_TOKEN=.' "$SECRETS" || { echo "$NODE runs jobs: put JOBD_TOKEN (from the control machine's .env) and the job secrets in $SECRETS first."; exit 1; }
  ROOT="$(cd "$HERE/.." && pwd)"
  docker build -q -t recursica/porter-job -f "$HERE/jobd/porter-job/Dockerfile" "$ROOT"
  . "$OUT/porter.env" 2>/dev/null || true
  # The port jobs' outgoing filter: a closed network whose only exit is the filter, with the
  # stack's allowlist. A refused site gets a Slack alert; permanent access goes in site.json.
  JOBS_NET_ARGS=""
  if grep -q '^EGRESS=on' "$OUT/tenant.env"; then
    JNET="jobs-egress$SUFFIX"
    docker network inspect "$JNET" >/dev/null 2>&1 || docker network create --internal "$JNET" >/dev/null
    docker build -q -t recursica/egress "$HERE/egress" >/dev/null
    # The rendered files in $OUT go away when this script ends, so the filter gets a copy.
    [ -n "${TENANT:-}" ] && JBASE="$HOME/tenants/$TENANT/jobs-egress" || JBASE="$HOME/.recursica-jobs-egress"
    mkdir -p "$JBASE/conf" "$JBASE/logs" && chmod 777 "$JBASE/logs"
    cp "$OUT/egress/"* "$JBASE/conf/"
    docker rm -f "cc-jobs-egress$SUFFIX" >/dev/null 2>&1 || true
    docker run -d --name "cc-jobs-egress$SUFFIX" --restart unless-stopped --add-host host.docker.internal:host-gateway \
      -v "$JBASE/conf":/etc/egress:ro -v "$JBASE/logs":/var/log/egress recursica/egress >/dev/null
    docker network connect --alias egress "$JNET" "cc-jobs-egress$SUFFIX"
    JOBS_NET_ARGS="JOBD_NETWORK=$JNET JOBD_PROXY=http://egress:3128 "
  fi
  # One job runner per stack: its own unit, port, job folder, secrets and Docker VM.
  if [ -n "${TENANT:-}" ]; then JOBS_DIR="$HOME/tenants/$TENANT/jobs"; else JOBS_DIR="$HOME/.recursica-jobs"; fi
  install_unit "jobd$SUFFIX" "set -a; . \"$SECRETS\"; set +a; ${DCTX}${JOBS_NET_ARGS}JOBD_PORT=$(jget port) JOBD_SLOTS=$(jget slots) JOBD_MEMORY_GB=$(jget memory_gb) JOBD_NODE_NAME=$NODE JOBD_ALLOWED_REPOS=${JOBD_ALLOWED_REPOS:-} JOBD_DIR=$JOBS_DIR node $HERE/jobd/jobd.mjs" "$HOME" "$(id -un)"
fi
echo "$NODE: services installed. Check reachability from the control machine with the addresses in site.json."
