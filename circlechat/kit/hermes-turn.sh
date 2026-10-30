#!/usr/bin/env bash
# One test turn for an agent, run the way CircleChat's bridge runs a turn (api/hermes-multi-bridge.mjs
# in the CircleChat fork): the agent's home at /opt/data, on the agents' network with the outgoing
# filter's settings, in the pinned Hermes image, with `hermes chat -q <prompt> -Q --yolo --source tool`.
# setup-agent.sh runs the turn after each setup, and the weekly image refresh (cluster/images.mjs)
# runs the turn before the Hermes pin moves to a newer version.
#
#   CC_DIR=... hermes-turn.sh <hermes home> [<image>]
#
# The image is CC_HERMES_IMAGE from $CC_DIR/.env unless given, and must be pinned by digest
# (name@sha256:...), so no test turn and no agent turn runs an unpinned :latest. The network and
# proxy settings come from $CC_DIR/.env: CC_AGENT_NETWORK, CC_AGENT_PROXY and CC_AGENT_NO_PROXY.
#
# The turn passes when Hermes opens a session and answers. Otherwise the script prints Hermes's
# message and the refusal detail that `hermes chat` leaves out (kit/hermes-refusal-detail.py), such
# as `invalid_params {'reason': 'invalid_params', 'fields': ['source']}`, and exits 1.
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
[ -f "$HOME_DIR/config.yaml" ] || { echo "$NAME: no config.yaml in $HOME_DIR. Install the agent through CircleChat first."; exit 1; }

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

# The refusal detail, mounted as the image's sitecustomize.py. The image's own sitecustomize.py, if
# the image ships one, stays: the turn then runs with no detail.
hook=()
site="$(docker run --rm --network none --entrypoint sh "$IMAGE" -c 'for d in /opt/hermes/.venv/lib/python3*/site-packages; do [ -d "$d" ] && [ ! -e "$d/sitecustomize.py" ] && echo "$d"; done' 2>/dev/null | head -1)"
[ -n "$site" ] && hook=(-v "$KIT/hermes-refusal-detail.py:$site/sitecustomize.py:ro")

container="cc-turn-check-$NAME-$$"
# The watchdog stops the turn after $TIMEOUT seconds. Stopped itself, the watchdog ends its sleep
# too, and the watchdog keeps no output open, so a caller that reads this script's output never
# waits on the watchdog.
( trap 'kill "$nap" 2>/dev/null; exit 0' TERM; sleep "$TIMEOUT" & nap=$!; wait "$nap"; docker stop -t 5 "$container" ) >/dev/null 2>&1 &
watchdog=$!
out="$(docker run --rm -i --name "$container" "${net[@]}" ${hook[@]+"${hook[@]}"} -v "$HOME_DIR:/opt/data" "$IMAGE" \
  chat -q "Reply with the single word: ready" -Q --yolo --source tool 2>&1 </dev/null)"
status=$?
kill "$watchdog" 2>/dev/null; wait "$watchdog" 2>/dev/null

# Hermes's own lines, without the container's start-up and shut-down lines.
lines="$(printf '%s\n' "$out" | grep -vE '^(s6-rc|cont-init|reconcile|\[supervise-perms\])' | grep -v 'cross-VM filesystem')"
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
detail="$(printf '%s\n' "$lines" | grep '^hermes refusal: ' | head -1)"
if [ -n "$detail" ]; then
  echo "  $detail"
else
  echo "  Hermes gave no refusal detail."
fi
echo "  The last lines Hermes printed:"
printf '%s\n' "$lines" | grep -v -e '^hermes refusal: ' -e '^[[:space:]]*$' -e ' WARNING gateway\.run: Shutdown' | tail -5 | sed 's/^/    /'
exit 1
