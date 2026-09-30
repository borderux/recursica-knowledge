#!/usr/bin/env bash
# After merging a knowledge PR: pull, then refresh every agent's skills and persona.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
CC_DIR="${CC_DIR:-$HOME/circlechat}"
WS="${WS:-$HOME/circlechat-workspace}"
K="$WS/recursica-knowledge"

git -C "$K" pull --ff-only
if [ -d "$WS/kev" ] && [ -d "$K/tools/kev" ]; then
  cp -r "$K/tools/kev/." "$WS/kev/"
fi

for h in "$CC_DIR"/hermes-homes/.hermes-*; do
  handle="${h##*/.hermes-}"
  if [ -f "$K/portable/circlechat/agents/$handle/SOUL.md" ] && [ "$handle" != loki ]; then
    "$HERE/setup-agent.sh" "$handle"
  else
    sudo cp -r "$K"/skills/*/* "$h/skills/"
    echo "synced skills for $handle (persona not managed here)"
  fi
done
