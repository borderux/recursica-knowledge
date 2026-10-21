#!/usr/bin/env bash
# Collect a support bundle for Border UX, with no access to the client's computers. The bundle
# holds versions, service status, container status, the rendered settings and recent errors.
# Every value that looks like a key, token, password or email address is replaced with
# [removed], and no client data (database, files, agent homes, workspace) is read.
#
#   ./circlechat/kit/diagnostics.sh        writes ~/agent-diagnostics-<date>.tar.gz
#
# Read the bundle before sending it: the script removes secrets by pattern, and a person checks
# the rest.
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
CC_DIR="${CC_DIR:-$HOME/circlechat}"
OUT="$(mktemp -d)/agent-diagnostics"; mkdir -p "$OUT"
redact() {
  sed -E \
    -e 's/(sk-ant-[A-Za-z0-9_-]+|sk-[A-Za-z0-9_-]{16,}|xox[abpr]-[A-Za-z0-9-]+|xapp-[A-Za-z0-9-]+|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|AKIA[0-9A-Z]{16})/[removed]/g' \
    -e 's#hooks\.slack\.com/services/[A-Za-z0-9/]+#hooks.slack.com/services/[removed]#g' \
    -e 's/([A-Za-z0-9_]*(KEY|TOKEN|SECRET|PASSWORD|PAT|PASS)[A-Za-z0-9_]*)=[^[:space:]]+/\1=[removed]/g' \
    -e 's/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/[email removed]/g' \
    -e 's/age1[0-9a-z]{58}/age1[removed]/g'
}
run() { local name="$1"; shift; { echo "\$ $*"; "$@" 2>&1; } | redact > "$OUT/$name.txt"; }

run versions bash -c 'uname -a; (sw_vers 2>/dev/null || cat /etc/os-release 2>/dev/null); node --version; docker --version; docker compose version; git --version; restic version 2>/dev/null; rclone version 2>/dev/null | head -1'
run kit-version bash -c "git -C '$HERE/../..' describe --tags --always; git -C '$HERE/../..' status --short | head -20"
run circlechat-version bash -c "git -C '$CC_DIR' rev-parse --abbrev-ref HEAD; git -C '$CC_DIR' log --oneline -3"
run containers docker ps -a --format '{{.Names}}\t{{.Status}}\t{{.Image}}'
run services bash -c "(systemctl list-units --all --no-pager 2>/dev/null | grep -E 'circlechat|agents-sync|upgrade|release-watch|kev|jobd|cluster|opencanary|agentguard|backup|restore-test|images') || launchctl list | grep io.recursica"
run tenant-settings cat "$CC_DIR/kit-out/tenant.env"
run env-names bash -c "sed 's/=.*//' '$CC_DIR/.env'"
run site bash -c "node -e 'const s=require(process.argv[1]); console.log(JSON.stringify(s,null,2))' '$CC_DIR/site.json'"
run egress-allow cat "$CC_DIR/kit-out/egress/allow.txt"
# The filter's log keeps Squid's default permissions, because it holds the client's web addresses,
# so the owner may need sudo to read it.
EGRESS_LOG="$CC_DIR/egress-logs/access.log"
if [ ! -e "$EGRESS_LOG" ] || [ -r "$EGRESS_LOG" ]; then READ_LOG="cat"
elif sudo -n true 2>/dev/null; then READ_LOG="sudo -n cat"
else READ_LOG=""; echo "Run diagnostics.sh with sudo to include the filter's refusals."
fi
if [ -n "$READ_LOG" ]; then
  run egress-refused bash -c "$READ_LOG '$EGRESS_LOG' 2>/dev/null | grep DENIED | tail -50 | awk '{print \$1, \$3, \$4, \$6}'"
else
  run egress-refused echo "Run diagnostics.sh with sudo to include the filter's refusals."
fi
run recent-errors bash -c "(journalctl --since -24h -p err --no-pager 2>/dev/null | tail -200) || (log show --last 24h --predicate 'eventMessage CONTAINS \"error\"' --style compact 2>/dev/null | tail -200)"
run container-errors bash -c "for c in \$(docker ps -a --format '{{.Names}}'); do echo \"== \$c\"; docker logs --tail 40 \"\$c\" 2>&1 | grep -iE 'error|fail|fatal' | tail -10; done"
run guard bash -c "sudo -n cat /var/lib/agent-cluster/lockdown.json 2>/dev/null || echo 'no access to the guard state without sudo'"
DEST="$HOME/agent-diagnostics-$(date -u +%Y%m%d-%H%M).tar.gz"
tar czf "$DEST" -C "$(dirname "$OUT")" agent-diagnostics
rm -rf "$(dirname "$OUT")"
echo "Wrote $DEST. Read the files inside before sending the bundle to Border UX."
