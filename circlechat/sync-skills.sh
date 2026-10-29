#!/usr/bin/env bash
# After merging a knowledge PR: pull, then refresh every agent's skills and persona.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
# The hourly sync runs as root. The kit checkout must sit outside the agents' workspace.
bash "$HERE/kit/check-kit.sh" "$HERE/.." "${OWNER:-}" "${OWNER_HOME:-$HOME}" || exit 1
if [ -n "${TENANT:-}" ]; then
  CC_DIR="${CC_DIR:-$HOME/tenants/$TENANT/circlechat}"
  WS="${WS:-$HOME/tenants/$TENANT/workspace}"
fi
CC_DIR="${CC_DIR:-$HOME/circlechat}"
WS="${WS:-$HOME/circlechat-workspace}"
K="$WS/recursica-knowledge"

# With upgrade.auto, the upgrade job checks out each release, so this script does not pull.
[ "${NO_PULL:-}" = 1 ] || git -C "$K" pull --ff-only
if [ -d "$WS/kev" ] && [ -d "$K/tools/kev" ]; then
  cp -r "$K/tools/kev/." "$WS/kev/"
fi

for h in "$CC_DIR"/hermes-homes/.hermes-*; do
  handle="${h##*/.hermes-}"
  if [ -f "$K/portable/circlechat/agents/$handle/SOUL.md" ]; then
    "$HERE/setup-agent.sh" "$handle"
  else
    sudo cp -r "$K"/skills/*/* "$h/skills/"
    echo "synced skills for $handle (persona not managed here)"
  fi
done
