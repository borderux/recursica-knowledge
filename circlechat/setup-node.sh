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
SITE="${SITE:-$HOME/circlechat/site.json}"
SECRETS="${SECRETS:-$HOME/.recursica-node.env}"
HERE="$(cd "$(dirname "$0")" && pwd)"
. "$HERE/kit/lib.sh"
[ -f "$SITE" ] || { echo "No $SITE. Copy this deployment's site.json here (it holds no secrets)."; exit 1; }

OUT="$(mktemp -d)"; trap 'rm -rf "$OUT"' EXIT
node "$HERE/kit/render.mjs" "$SITE" "$OUT" >/dev/null
SPEC="$OUT/services/$NODE.json"
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
  install_unit jobd "set -a; . \"$SECRETS\"; set +a; JOBD_PORT=$(jget port) JOBD_SLOTS=$(jget slots) JOBD_MEMORY_GB=$(jget memory_gb) JOBD_NODE_NAME=$NODE JOBD_ALLOWED_REPOS=${JOBD_ALLOWED_REPOS:-} JOBD_DIR=$HOME/.recursica-jobs node $HERE/jobd/jobd.mjs" "$HOME" "$(id -un)"
fi
echo "$NODE: services installed. Check reachability from the control machine with the addresses in site.json."
