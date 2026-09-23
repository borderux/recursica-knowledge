#!/usr/bin/env bash
# Run AFTER installing the agent through the CircleChat UI.
# Usage: setup-agent.sh <handle>      (GITHUB_TOKEN=... for norm)
set -euo pipefail

HANDLE="${1:?usage: setup-agent.sh <handle>}"
HERE="$(cd "$(dirname "$0")" && pwd)"
CC_DIR="${CC_DIR:-$HOME/circlechat}"
WS="${WS:-$HOME/circlechat-workspace}"
K="$WS/recursica-knowledge"
H="$CC_DIR/hermes-homes/.hermes-$HANDLE"
MARK="<!-- recursica-circlechat -->"

sudo test -d "$H" || { echo "No $H — install $HANDLE in the CircleChat UI first."; exit 1; }

case "$HANDLE" in
  betty) EFFORT=low ;;
  *)     EFFORT=medium ;;
esac

# Skills (flattened) + Barb's subagents
sudo cp -r "$K"/skills/*/* "$H/skills/"
if [ "$HANDLE" = barb ]; then
  sudo cp -r "$K/agents/barb/subagents/checker" "$K/agents/barb/subagents/feisty" "$H/skills/"
fi

# Model + speed
sudo sed -i \
  -e 's/^\(  default:\).*/\1 claude-haiku-4-5/' \
  -e "s/reasoning_effort: .*/reasoning_effort: $EFFORT/" \
  -e 's/summary_model: .*/summary_model: claude-haiku-4-5/' \
  "$H/config.yaml"

# GitHub token (norm only)
if [ "$HANDLE" = norm ]; then
  : "${GITHUB_TOKEN:?norm needs GITHUB_TOKEN=... (fine-grained, recursica-knowledge only, Contents + Pull requests)}"
  sudo sed -i '/^GITHUB_TOKEN=/d' "$H/.env"
  echo "GITHUB_TOKEN=$GITHUB_TOKEN" | sudo tee -a "$H/.env" >/dev/null
fi

# Soul: replace our section, keep CircleChat's
# (first run on a hand-edited Betty: drop the sections added by hand)
if ! sudo grep -q "^$MARK\$" "$H/SOUL.md" && sudo grep -q "^## How you work\$" "$H/SOUL.md"; then
  sudo sed -i '/^## How you work$/,$d' "$H/SOUL.md"
fi
sudo sed -i "/^$MARK\$/,\$d" "$H/SOUL.md"
{
  echo "$MARK"
  # Any agent defined in the knowledge repo gets its definition composed in ahead of its soul,
  # so agents/<handle>/ stays the source of truth and souls/ holds only what is true here.
  #
  # Read the BUILT artifact, never agents/<handle>/SKILL.md. The source still carries its
  # unsubstituted <!-- platform:NAME --> markers, so pasting it drops whole passages: Barb was
  # losing her identity line, her intake paragraph and her write fence exactly that way.
  BUILT="$K/portable/claude-code/agents/$HANDLE.md"
  if [ -f "$BUILT" ]; then
    awk 'BEGIN{n=0} /^---$/ && n<2 {n++; next} n>=2' "$BUILT"
  fi
  cat "$HERE/souls/$HANDLE.md"
} | sudo tee -a "$H/SOUL.md" >/dev/null

sudo chmod -R 777 "$H"
echo "$HANDLE set up. Changes apply on the next message."
