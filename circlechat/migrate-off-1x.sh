#!/usr/bin/env bash
# Move one computer off CircleChat 1.x's names, once. A person runs it in a terminal, as the account
# that owns the stacks, on each computer. Safe to rerun: a step that is done does nothing.
#
#   ./circlechat/migrate-off-1x.sh --dry-run    prints each step, and changes nothing
#   ./circlechat/migrate-off-1x.sh              runs each step
#   TENANT=<name> ./circlechat/migrate-off-1x.sh    the same for a client or demo stack
#
# The kit runs every unattended step with the old names until this script runs (kit/stack-paths.sh,
# setup-host.sh). The moves interrupt running work, so no update job makes them.
#
# On the stack's control computer:
#   1. Refuses while RecursicaChat 2.0 isn't quiet: agent work is queued, or a person is online
#      (cluster/quiet.mjs). The check runs as root.
#   2. Removes the gateway's containers, the app preview and CircleChat 1.x's leftover containers.
#      Model requests stop until step 5 ends.
#   3. Moves the stack's folder, ~/circlechat to ~/recursica-stack, and the agents' workspace,
#      ~/circlechat-workspace to ~/recursica-workspace. A link at each old name points to the new
#      folder, so a job installed before the move keeps working.
#   4. Makes the gateway's own Docker network, gateway-models.
#   5. Runs setup-host.sh. The setup starts the gateway on gateway-models, rewrites each job with the
#      new folders, and removes CircleChat 1.x's jobs.
#   6. Removes CircleChat 1.x's Docker networks: <project>_default, <project>_agents and
#      <project>_models, each one only when no container uses the network.
#   7. On a Mac with a RecursicaChat 2.0 server, runs recursicachat/install.sh, so the server's
#      backup jobs use the new folders.
#   8. Lists CircleChat 1.x's files left in the stack's folder. The script removes none of them.
# On a helper computer: step 3 only. A helper's folder holds only site.json.
set -euo pipefail
DRY=false
case "${1:-}" in
  --dry-run) DRY=true ;;
  "") ;;
  *) echo "usage: migrate-off-1x.sh [--dry-run]"; exit 2 ;;
esac
HERE="$(cd "$(dirname "$0")" && pwd)"
. "$HERE/kit/lib.sh"
require_kit "$HERE/.."
[ "$(id -u)" != 0 ] || { echo "Run it as the account that owns the stacks, not as root."; exit 1; }

T="${TENANT:-}"
if [ -n "$T" ]; then
  OLD="$HOME/tenants/$T/circlechat"; NEW="$HOME/tenants/$T/stack"
  OLD_WS=""; NEW_WS=""
  PREFIX="cc-$T"; SUFFIX="-$T"
else
  OLD="$HOME/circlechat"; NEW="$HOME/recursica-stack"
  OLD_WS="$HOME/circlechat-workspace"; NEW_WS="$HOME/recursica-workspace"
  PREFIX=circlechat; SUFFIX=""
fi
# A real folder at the old name, and nothing at the new name: the folder moves. A real folder at
# both names needs a person to choose.
#   needs_move <old> <new>
needs_move() {
  [ -n "$1" ] && [ -d "$1" ] && [ ! -L "$1" ] || return 1
  if [ -e "$2" ] || [ -L "$2" ]; then echo "Refused: both $1 and $2 exist. Keep one, then run this script again."; exit 1; fi
  return 0
}
MOVE_DIR=false; MOVE_WS=false
needs_move "$OLD" "$NEW" && MOVE_DIR=true
needs_move "$OLD_WS" "$NEW_WS" && MOVE_WS=true

DIR="$(stack_dir "$HOME" "$T")"
SITE="$DIR/site.json"
[ -f "$SITE" ] || { echo "No site.json in $NEW or $OLD. Nothing to move."; exit 1; }
CLUSTER_SITE="$(stack_dir "$HOME")/site.json"

# The control computer: site.json's control node is this computer (/etc/agent-cluster.conf). A
# computer without the cluster's services counts as the control computer when setup-host.sh has
# rendered the stack here.
COMPUTER="$(sed -n 's/^COMPUTER=//p' "${AGENT_CLUSTER_CONF:-/etc/agent-cluster.conf}" 2>/dev/null || true)"
CONTROL_NODE="$(node -e 'const s = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")); process.stdout.write((s.nodes ?? []).find((n) => n.control)?.name ?? "")' "$SITE")"
if [ -n "$COMPUTER" ]; then CONTROL=$([ "$COMPUTER" = "$CONTROL_NODE" ] && echo true || echo false)
else CONTROL=$([ -d "$DIR/kit-out" ] && echo true || echo false); fi

MODEL_NET="gateway-models$SUFFIX"
OLD_NETS=("${PREFIX}_default" "${PREFIX}_agents" "${PREFIX}_models")
has_net() { docker network inspect "$1" >/dev/null 2>&1; }
NEW_NET=false
if [ "$CONTROL" = true ] && ! has_net "$MODEL_NET"; then NEW_NET=true; fi

# run <command>...: runs the command, or with --dry-run prints it.
run() { if [ "$DRY" = true ]; then printf '  would run:'; printf ' %q' "$@"; echo; else "$@"; fi; }

WHICH="the cluster's own stack"; [ -z "$T" ] || WHICH="$T"
echo "Stack: $WHICH. Folder: $DIR. This computer: ${COMPUTER:-unknown}, $([ "$CONTROL" = true ] && echo "the stack's control computer" || echo "a helper computer")."
[ "$DRY" = false ] || echo "Dry run: nothing changes."

if [ "$CONTROL" = false ]; then
  if [ "$MOVE_DIR" = true ]; then
    echo "Move $OLD to $NEW, with a link at $OLD."
    run mv "$OLD" "$NEW"; run ln -s "$NEW" "$OLD"
  else echo "The folder needs no move."; fi
  if [ "$MOVE_WS" = true ]; then
    echo "Move $OLD_WS to $NEW_WS, with a link at $OLD_WS."
    run mv "$OLD_WS" "$NEW_WS"; run ln -s "$NEW_WS" "$OLD_WS"
  fi
  echo "Done. Next, run setup-node.sh and install-cluster.sh with this computer's name, if the update job asked for them."
  exit 0
fi

# 1. RecursicaChat 2.0 must be quiet: the moves stop the gateway.
if [ "$MOVE_DIR" = true ] || [ "$MOVE_WS" = true ] || [ "$NEW_NET" = true ]; then
  echo "Check that RecursicaChat 2.0 is quiet (as root)."
  why="$(sudo "$(command -v node)" --input-type=module -e '
    import fs from "node:fs";
    const { serverQuiet } = await import(process.argv[1]);
    const q = await serverQuiet(JSON.parse(fs.readFileSync(process.argv[2], "utf8")));
    process.stdout.write(q.quiet ? "" : q.why || "busy");
  ' "$HERE/cluster/quiet.mjs" "$CLUSTER_SITE")" || { echo "The quiet check failed, so nothing changed."; exit 1; }
  if [ -n "$why" ]; then
    echo "Refused: RecursicaChat 2.0 is not quiet ($why). Nothing changed. Run the script again when no agent work is queued and no one is online."
    exit 1
  fi
  echo "RecursicaChat 2.0 is quiet."

  # 2. The containers that mount the folders, and CircleChat 1.x's leftover containers.
  for c in "cc-gateway$SUFFIX" "cc-litellm$SUFFIX" "cc-presidio-analyzer$SUFFIX" "cc-presidio-anonymizer$SUFFIX" "betty-proto$SUFFIX" \
    "cc-egress$SUFFIX" "cc-slack-notify$SUFFIX" "cc-cloud-requests$SUFFIX"; do
    docker container inspect "$c" >/dev/null 2>&1 || continue
    echo "Remove the container $c. setup-host.sh starts it again, except CircleChat 1.x's."
    run docker rm -f "$c"
  done

  # 3. The folders.
  if [ "$MOVE_DIR" = true ]; then
    echo "Move $OLD to $NEW, with a link at $OLD."
    run mv "$OLD" "$NEW"; run ln -s "$NEW" "$OLD"
  fi
  if [ "$MOVE_WS" = true ]; then
    echo "Move $OLD_WS to $NEW_WS, with a link at $OLD_WS."
    run mv "$OLD_WS" "$NEW_WS"; run ln -s "$NEW_WS" "$OLD_WS"
  fi

  # 4. The gateway's own network.
  if [ "$NEW_NET" = true ]; then
    echo "Make the gateway's Docker network $MODEL_NET."
    run docker network create "$MODEL_NET"
  fi

  # 5. The setup, by hand, with no hold: the gateway starts again on the new network.
  echo "Run setup-host.sh${T:+ for stack $T}. The gateway starts again on $MODEL_NET, and CircleChat 1.x's jobs go."
  if [ -n "$T" ]; then run env TENANT="$T" CC_DIR="$NEW" SITE="$NEW/site.json" bash "$HERE/setup-host.sh"
  else run env CC_DIR="$NEW" WS="$NEW_WS" SITE="$NEW/site.json" bash "$HERE/setup-host.sh"; fi \
    || { echo "setup-host.sh failed, and the gateway may be down. Fix the problem the lines above name, then run setup-host.sh again."; exit 1; }
else
  echo "The folders and the gateway's network need no move."
fi

# 6. CircleChat 1.x's networks, once no container uses them.
for n in "${OLD_NETS[@]}"; do
  has_net "$n" || continue
  if [ "$DRY" = true ]; then echo "Remove CircleChat 1.x's Docker network $n, once no container uses it."; continue; fi
  if [ "$(docker network inspect -f '{{len .Containers}}' "$n" 2>/dev/null)" != 0 ]; then
    echo "Kept the network $n: a container still uses it. See docker network inspect $n."
    continue
  fi
  echo "Remove CircleChat 1.x's Docker network $n."
  docker network rm "$n" >/dev/null || echo "Could not remove $n. See docker network inspect $n."
done

# 7. The RecursicaChat 2.0 server's jobs on a Mac, with the new folders.
if [ -z "$T" ] && [ "$OS" = Darwin ] && [ -n "$(site_get recursicachat)" ]; then
  echo "Install the RecursicaChat 2.0 server's jobs again (recursicachat/install.sh, as root), so the backups use the new folders."
  run sudo "$HERE/recursicachat/install.sh"
fi

# 8. CircleChat 1.x's files left in the stack's folder.
left=()
for f in .git api web docs Caddyfile LICENSE README.md .env.example compose.yml compose.agents.yml compose.images.yml \
  compose.workspace.yml compose.egress.yml compose.privacy.yml compose.cloud-approvals.yml compose.storage.yml hermes-homes \
  notify notify-state cloud-requests cloud-approvals egress-logs agent-check.env kit-out/watches.json \
  gateway-state/db-password gateway-state/db.url; do
  if [ -e "$NEW/$f" ] || [ -e "$OLD/$f" ]; then left+=("$f"); fi
done
if [ "${#left[@]}" -gt 0 ]; then
  echo "CircleChat 1.x's files are still in the stack's folder: ${left[*]}."
  echo "Nothing reads them now. Keep a copy if one is wanted, then remove them, as in: cd $NEW && sudo rm -rf ${left[*]}"
fi
echo "CircleChat 1.x's tailscale serve rule, if one is left, stays until a person removes it: tailscale serve --https=443 off"
echo "Done."
