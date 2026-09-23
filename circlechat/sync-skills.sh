#!/usr/bin/env bash
# After merging a knowledge PR: pull and push the skills to every agent.
set -euo pipefail
CC_DIR="${CC_DIR:-$HOME/circlechat}"
WS="${WS:-$HOME/circlechat-workspace}"
git -C "$WS/recursica-knowledge" pull --ff-only
for h in "$CC_DIR"/hermes-homes/.hermes-*; do
  sudo cp -r "$WS"/recursica-knowledge/skills/*/* "$h/skills/"
  echo "synced $(basename "$h")"
done
