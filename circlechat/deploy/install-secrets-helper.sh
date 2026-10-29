#!/usr/bin/env bash
# Install the secrets helper on one computer, for the GitHub runner that deploys secrets.
#
#   ./circlechat/deploy/install-secrets-helper.sh <runner user>
#
# Copies apply-secrets.sh to /usr/local/bin/agent-stacks-apply, owned by root so the runner cannot
# change the copy. Lets <runner user> run that one command through sudo, with no password and
# nothing else. Writes /etc/agent-stacks.conf: the account that owns the stacks (the user running
# this script), the runner's account, the kit's folder, and the node binary. Safe to rerun after the
# kit changes. The hourly update job (cluster/updater.mjs) reruns the script as root when the copy
# differs from the kit. As root, the script keeps the owner and the node binary from the first run.
set -euo pipefail
RUNNER="${1:?usage: install-secrets-helper.sh <runner user>}"
HERE="$(cd "$(dirname "$0")" && pwd)"
KIT="$(cd "$HERE/../.." && pwd)"
CONF="${AGENT_STACKS_CONF:-/etc/agent-stacks.conf}"
OWNER="$(id -un)"; OWNER_HOME="$HOME"
# shellcheck disable=SC1090
if [ "$OWNER" = root ]; then
  [ -f "$CONF" ] || { echo "Run this as the account that owns the stacks, not as root."; exit 1; }
  OWNER="$(. "$CONF"; echo "$OWNER")"; OWNER_HOME="$(. "$CONF"; echo "$OWNER_HOME")"; NODE_BIN="$(. "$CONF"; echo "$NODE_BIN")"
fi
[ "$RUNNER" != "$OWNER" ] || { echo "Give the runner its own account, separate from $OWNER."; exit 1; }
id "$RUNNER" >/dev/null 2>&1 || { echo "No account named $RUNNER. Create the runner's account first."; exit 1; }
[ -n "${NODE_BIN:-}" ] || NODE_BIN="$(command -v node)" || { echo "Node is not installed."; exit 1; }

sudo install -m 755 -o root "$HERE/apply-secrets.sh" /usr/local/bin/agent-stacks-apply
printf 'OWNER=%q\nOWNER_HOME=%q\nRUNNER=%q\nKIT=%q\nNODE_BIN=%q\n' "$OWNER" "$OWNER_HOME" "$RUNNER" "$KIT" "$NODE_BIN" \
  | sudo tee "$CONF" >/dev/null
sudo chmod 644 "$CONF"
printf '%s ALL=(root) NOPASSWD: /usr/local/bin/agent-stacks-apply\n' "$RUNNER" \
  | sudo tee /etc/sudoers.d/agent-stacks >/dev/null
sudo chmod 440 /etc/sudoers.d/agent-stacks
sudo visudo -cf /etc/sudoers.d/agent-stacks >/dev/null
echo "Installed /usr/local/bin/agent-stacks-apply. $RUNNER can run it through sudo, and nothing else."
echo "The helper runs the kit in $KIT. Rerun this script after the kit changes."
