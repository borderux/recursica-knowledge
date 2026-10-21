#!/usr/bin/env bash
# Run the update check (check) or install the held updates (install-held), with the cluster's
# settings. Runs as root.
set -euo pipefail
set -a; . /etc/agent-cluster.conf; [ -f /etc/agent-cluster.env ] && . /etc/agent-cluster.env; set +a
exec node "$(dirname "$0")/updates.mjs" "${1:-check}"
