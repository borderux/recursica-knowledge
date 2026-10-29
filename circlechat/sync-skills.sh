#!/usr/bin/env bash
# Refresh every agent's skills and persona, and Kev's files in the workspace. The hourly sync job
# runs this as the account that owns the stacks (setup-host.sh), and so does the upgrade job after
# a release (cluster/root-steps.mjs). Never run it as root.
#
# Agents can change the shared workspace and their own homes, the workspace's checkout of this repo
# included. So every file this script copies comes from the kit's own checkout, outside the
# workspace, and every write goes through kit/safe-files.mjs, which never follows a symlink
# (setup-agent.sh --sync). The script never runs git in the workspace: agents can change each
# checkout there, and the agents update their own checkouts from inside their containers.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
[ "$(id -u)" != 0 ] || { echo "Run sync-skills.sh as the account that owns the stacks, never as root."; exit 1; }
# The kit checkout must sit outside the agents' workspace.
bash "$HERE/kit/check-kit.sh" "$HERE/.." "${OWNER:-}" "${OWNER_HOME:-$HOME}" || exit 1
if [ -n "${TENANT:-}" ]; then
  CC_DIR="${CC_DIR:-$HOME/tenants/$TENANT/circlechat}"
  WS="${WS:-$HOME/tenants/$TENANT/workspace}"
fi
CC_DIR="${CC_DIR:-$HOME/circlechat}"
WS="${WS:-$HOME/circlechat-workspace}"
export CC_DIR WS
KIT_ROOT="$(cd "$HERE/.." && pwd)"

# Kev, Barb's quick first pass, from the kit's checkout.
if [ -d "$WS/kev" ] && [ -d "$KIT_ROOT/tools/kev" ]; then
  node "$HERE/kit/safe-files.mjs" copy "$WS" "$WS/kev" "$KIT_ROOT/tools/kev/."
fi

# Each agent's skills, and the persona of each agent this repo builds one for.
failed=0
for h in "$CC_DIR"/hermes-homes/.hermes-*; do
  [ -e "$h" ] || [ -L "$h" ] || continue
  "$HERE/setup-agent.sh" --sync "${h##*/.hermes-}" || failed=1
done
exit "$failed"
