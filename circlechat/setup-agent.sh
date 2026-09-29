#!/usr/bin/env bash
# Run AFTER installing the agent through the CircleChat UI. Safe to rerun.
# Usage: setup-agent.sh <handle>
#   alan: GITHUB_TOKEN=... on the first run (fine-grained: Contents + Pull requests on the
#         knowledge repo, Issues on the adapter repos and Theme Forge — no merge rights)
#   barb: KEV_ENGINE_KEY=... if a Kev-engine is running (optional)
set -euo pipefail

HANDLE="${1:?usage: setup-agent.sh <handle>}"
CC_DIR="${CC_DIR:-$HOME/circlechat}"
WS="${WS:-$HOME/circlechat-workspace}"
K="$WS/recursica-knowledge"
H="$CC_DIR/hermes-homes/.hermes-$HANDLE"
SOUL="$K/portable/circlechat/agents/$HANDLE/SOUL.md"
MARK="<!-- recursica-circlechat -->"

if [ "$HANDLE" = loki ]; then
  echo "Loki is not set up by this script. His fence is a Drive sandbox that has to exist before"
  echo "he runs, or he can reach every client folder the key can. See agents/loki/PORTING.md."
  exit 1
fi
sudo test -d "$H" || { echo "No $H — install $HANDLE in the CircleChat UI first."; exit 1; }
[ -f "$SOUL" ] || { echo "No built CircleChat persona for $HANDLE at $SOUL."; exit 1; }

# Skills (flattened) + Barb's subagents, which run as skills here
sudo cp -r "$K"/skills/*/* "$H/skills/"
if [ "$HANDLE" = barb ]; then
  sudo cp -r "$K/agents/barb/subagents/checker" "$K/agents/barb/subagents/feisty" "$H/skills/"
fi

# Model and effort. The model that runs is the one in config.yaml, not the label in the UI.
# MODEL=... overrides; otherwise only Alan's is set, and the others keep what the install chose.
case "$HANDLE" in
  alan) MODEL="${MODEL:-claude-sonnet-5-5}" ;;
  *)    MODEL="${MODEL:-}" ;;
esac
case "$HANDLE" in
  betty) EFFORT=low ;;
  *)     EFFORT=medium ;;
esac
if [ -n "$MODEL" ]; then
  sudo sed -i -e "s/^\(  default:\).*/\1 $MODEL/" "$H/config.yaml"
fi
sudo sed -i \
  -e "s/reasoning_effort: .*/reasoning_effort: $EFFORT/" \
  -e 's/summary_model: .*/summary_model: claude-haiku-4-5/' \
  "$H/config.yaml"

# Barb's delegation limits. Each default made a full review fail; agents/barb/runtime/hermes.md
# says which and why. Appended only when absent, because merging YAML with sed is how a key ends
# up under the wrong parent and silently ignored.
if [ "$HANDLE" = barb ]; then
  if sudo grep -qE '^(delegation|tool_loop_guardrails):' "$H/config.yaml"; then
    echo "Barb's config.yaml already has delegation or tool_loop_guardrails. Check the values"
    echo "against agents/barb/runtime/hermes.md by hand."
  else
    sudo tee -a "$H/config.yaml" >/dev/null << 'YAML'

delegation:
  oneshot_max_children: 0
  max_concurrent_children: 3
  max_iterations: 50

tool_loop_guardrails:
  loop_caps:
    max_subagents: 150
YAML
  fi
fi

# Secrets go in the agent's own .env, never in SOUL.md.
set_secret() { # set_secret NAME VALUE
  sudo sed -i "/^$1=/d" "$H/.env"
  echo "$1=$2" | sudo tee -a "$H/.env" >/dev/null
}
if [ "$HANDLE" = alan ]; then
  if [ -n "${GITHUB_TOKEN:-}" ]; then
    set_secret GITHUB_TOKEN "$GITHUB_TOKEN"
  elif ! sudo grep -q '^GITHUB_TOKEN=' "$H/.env"; then
    echo "alan needs GITHUB_TOKEN=... on the first run (fine-grained: Contents + Pull requests on"
    echo "the knowledge repo, Issues on the adapter repos and Theme Forge). Without merge rights on"
    echo "it, he cannot merge — that is the point."
    exit 1
  fi
fi
if [ "$HANDLE" = barb ] && [ -n "${KEV_ENGINE_KEY:-}" ]; then
  set_secret KEV_ENGINE_KEY "$KEV_ENGINE_KEY"
fi

# Persona: replace our marked section with the built CircleChat persona, keep CircleChat's part.
# The built file already has every platform passage filled in; never paste agents/<handle>/SKILL.md,
# whose unfilled markers silently drop whole passages.
sudo sed -i "/^$MARK\$/,\$d" "$H/SOUL.md"
{ echo "$MARK"; cat "$SOUL"; } | sudo tee -a "$H/SOUL.md" >/dev/null

sudo chmod -R 777 "$H"
echo "$HANDLE set up. Changes apply on the next message."
