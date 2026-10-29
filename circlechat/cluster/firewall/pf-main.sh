#!/usr/bin/env bash
# Print macOS's main pf rules (/etc/pf.conf, on stdin) with the two lines the cluster needs:
#   - "set skip on lo0" first, so pf never filters loopback. Loading rules then never drops a
#     connection open on loopback, such as Colima's ssh link from the Mac into the VM.
#   - The "agentguard" anchor last, where install-cluster.sh loads pf-base.conf or pf-lockdown.conf.
# pf takes an option, such as "set skip", only in the main rules, never inside an anchor.
#
#   pf-main.sh < /etc/pf.conf > new-pf.conf
set -euo pipefail
rules="$(cat)"
grep -qx 'set skip on lo0' <<<"$rules" || echo 'set skip on lo0'
printf '%s\n' "$rules"
grep -qx 'anchor "agentguard"' <<<"$rules" || echo 'anchor "agentguard"'
