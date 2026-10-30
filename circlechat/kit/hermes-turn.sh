#!/usr/bin/env bash
# One test turn for an agent, run exactly the way CircleChat's bridge runs a turn (buildHermesSpawn
# in api/hermes-multi-bridge.mjs in the CircleChat fork): the pinned Hermes image with its own
# start-up, which switches to the agent's account; the agents' network with the outgoing filter's
# settings; the bridge's stop grace and s6 settings; the agent's home at /opt/data and the shared
# workspace at /workspace; the agent's CircleChat address and bot token; and
# `hermes chat -q <prompt> -Q --yolo --source tool`. Only the prompt and the container's name differ.
# setup-agent.sh runs the turn after each setup, and the weekly image refresh (cluster/images.mjs)
# runs the turn before the Hermes pin moves to a newer version.
#
#   CC_DIR=... hermes-turn.sh <hermes home> [<image>]
#
# The image is CC_HERMES_IMAGE from $CC_DIR/.env unless given, and must be pinned by digest
# (name@sha256:...), so no test turn and no agent turn runs an unpinned :latest. Every other setting
# comes from $CC_DIR/.env, as compose.agents.yml hands it to the bridge: CC_AGENT_NETWORK,
# CC_AGENT_PROXY, CC_AGENT_NO_PROXY, CC_AGENT_STOP_GRACE_SEC, CC_SHARED_WORKSPACE_DIR,
# CC_AGENT_API_BASE and PUBLIC_BASE_URL. The bot token comes from the bridge's own list,
# hermes-homes/bridge-config.json, read as root, and passes to docker in the environment, never as
# an argument.
#
# The turn passes when Hermes opens a session and answers. Otherwise the script prints Hermes's
# message, runs the turn once more with kit/hermes-refusal-detail.py mounted for the refusal detail
# that `hermes chat` leaves out, such as `invalid_params {'reason': 'invalid_params', 'fields':
# ['source']}`, and exits 1. The hook changes how Python starts, so the turn that decides never has it.
# The turn writes only what an agent turn writes in the agent's home: a session, which the source
# `tool` keeps out of the agent's session lists.
set -uo pipefail
HOME_DIR="${1:?usage: hermes-turn.sh <hermes home> [<image>]}"
: "${CC_DIR:?CC_DIR}"
TIMEOUT="${HERMES_TURN_TIMEOUT:-600}"
KIT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
env_value() { sed -n "s/^$1=//p" "$CC_DIR/.env" 2>/dev/null | tail -1; }
IMAGE="${2:-$(env_value CC_HERMES_IMAGE)}"
NAME="$(basename "$HOME_DIR")"; NAME="${NAME#.hermes-}"

case "$IMAGE" in
  *@sha256:*) ;;
  "") echo "$NAME: CC_HERMES_IMAGE is not set in $CC_DIR/.env, so agent turns would run nousresearch/hermes-agent:latest. Run setup-host.sh, which pins the Hermes image."; exit 1 ;;
  *) echo "$NAME: the Hermes image $IMAGE is not pinned by digest. Run setup-host.sh, which pins the Hermes image in images.lock."; exit 1 ;;
esac
. "$KIT/lib.sh"
# The owner cannot see inside the agent's home, so the agent's account looks (as_agent). Hermes's
# start-up would write a default config.yaml into a home CircleChat never installed.
as_agent "$HOME_DIR" circlechat/kit/safe-files.mjs read "$HOME_DIR" "$HOME_DIR/config.yaml" < /dev/null 2>/dev/null | grep -q . ||
  { echo "$NAME: no config.yaml in $HOME_DIR. Install the agent through CircleChat first."; exit 1; }
# The bot token, from bridge-config.json, which root keeps with mode 600 (lock_bridge_config). The
# file's text goes straight to node, which takes this agent's token and prints nothing else.
CC_BOT_TOKEN="$(read_bridge_config "$(dirname "$HOME_DIR")" 2>/dev/null | node -e 'const h = process.argv[1]; let l = []; try { l = JSON.parse(require("fs").readFileSync(0, "utf8")); } catch {} process.stdout.write((Array.isArray(l) ? l : []).find((a) => a.hermesHome === h)?.token ?? "")' "$HOME_DIR")"
[ -n "$CC_BOT_TOKEN" ] || { echo "$NAME: $HOME_DIR is not in CircleChat's bridge-config.json, so CircleChat runs no turn for it. Install the agent through CircleChat first."; exit 1; }
export CC_BOT_TOKEN

# The agents' network, as the bridge's agentNetworkArgs sets it.
net=(--network=host)
network="$(env_value CC_AGENT_NETWORK)"
if [ -n "$network" ] && [ "$network" != host ]; then
  net=(--network "$network" --dns 127.0.0.1)
  proxy="$(env_value CC_AGENT_PROXY)"; no_proxy="$(env_value CC_AGENT_NO_PROXY)"
  if [ -n "$proxy" ]; then
    for k in HTTP_PROXY HTTPS_PROXY http_proxy https_proxy; do net+=(-e "$k=$proxy"); done
    if [ -n "$no_proxy" ]; then for k in NO_PROXY no_proxy; do net+=(-e "$k=$no_proxy"); done; fi
    net+=(-e NODE_USE_ENV_PROXY=1)
  fi
fi

# The bridge's stop grace (STOP_GRACE_SEC), at least 5 seconds, 45 when unset.
grace="$(env_value CC_AGENT_STOP_GRACE_SEC)"; case "$grace" in ''|*[!0-9]*|0) grace=45 ;; esac
[ "$grace" -ge 5 ] || grace=5
workspace=(); ws="$(env_value CC_SHARED_WORKSPACE_DIR)"; [ -n "$ws" ] && workspace=(-v "$ws:/workspace")
public="$(env_value PUBLIC_BASE_URL)"
api_base="$(env_value CC_AGENT_API_BASE)"; [ -n "$api_base" ] || api_base="${public:-http://localhost:8080}/api"

# turn [<docker option>...]: one turn, as the bridge runs it, with the options before the image.
# The watchdog stops the turn after $TIMEOUT seconds. Stopped itself, the watchdog ends its sleep
# too, and the watchdog keeps no output open, so a caller that reads this script's output never
# waits on the watchdog.
turn() {
  local container="cc-turn-check-$NAME-$$-$RANDOM" watchdog
  ( trap 'kill "$nap" 2>/dev/null; exit 0' TERM; sleep "$TIMEOUT" & nap=$!; wait "$nap"; docker stop -t 5 "$container" ) >/dev/null 2>&1 &
  watchdog=$!
  out="$(docker run --rm -i --name "$container" "${net[@]}" --stop-timeout "$grace" \
    -e "S6_SERVICES_GRACETIME=$((grace * 1000))" -e "S6_KILL_GRACETIME=$((grace * 1000))" -e "S6_KILL_FINISH_MAXTIME=$((grace * 1000))" \
    -v "$HOME_DIR:/opt/data" ${workspace[@]+"${workspace[@]}"} -e "CC_API_BASE=$api_base" -e CC_BOT_TOKEN "$@" "$IMAGE" \
    chat -q "Reply with the single word: ready" -Q --yolo --source tool 2>&1 </dev/null)"
  status=$?
  kill "$watchdog" 2>/dev/null; wait "$watchdog" 2>/dev/null
  # Hermes's own lines, without the container's start-up and shut-down lines.
  lines="$(printf '%s\n' "$out" | grep -vE '^(s6-rc|cont-init|reconcile|\[supervise-perms\]|\[stage2\])' | grep -v 'cross-VM filesystem')"
}
turn
# A session opened (Hermes prints its id on stderr, so the id can follow the reply), and none of
# Hermes's failure lines: "Hermes couldn't start the model connection: ..." for a refused session,
# "Details: ..." under a failed model request (cli.error in Hermes's locales/en.yaml), and
# "Provider said: ..." after the retries of a provider that did not answer.
failed="$(printf '%s\n' "$lines" | grep -E "^Hermes couldn't start the model connection|^Details: |^Provider said: " || true)"
if [ "$status" = 0 ] && printf '%s\n' "$lines" | grep -q '^session_id: ' && [ -z "$failed" ]; then
  echo "$NAME: test turn answered."
  exit 0
fi
echo "$NAME: the test turn failed (docker run exit $status). An agent turn from CircleChat fails the same way."
[ "$status" -lt 128 ] || echo "  The turn was stopped after $TIMEOUT seconds."
echo "  The last lines Hermes printed:"
printf '%s\n' "$lines" | grep -v -e '^[[:space:]]*$' -e ' WARNING gateway\.run: Shutdown' | tail -5 | sed 's/^/    /'
# The refusal detail: the same turn once more, with the hook mounted as the image's
# sitecustomize.py. The image's own sitecustomize.py, if the image ships one, stays: then no detail.
site="$(docker run --rm --network none --entrypoint sh "$IMAGE" -c 'for d in /opt/hermes/.venv/lib/python3*/site-packages; do [ -d "$d" ] && [ ! -e "$d/sitecustomize.py" ] && echo "$d"; done' 2>/dev/null | head -1)"
[ -n "$site" ] && turn -v "$KIT/hermes-refusal-detail.py:$site/sitecustomize.py:ro"
detail="$(printf '%s\n' "$lines" | grep '^hermes refusal: ' | head -1)"
if [ -n "$detail" ]; then
  echo "  $detail"
else
  echo "  Hermes gave no refusal detail."
fi
exit 1
