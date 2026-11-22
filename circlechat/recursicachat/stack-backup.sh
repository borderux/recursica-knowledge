#!/bin/bash
# Nightly backup of the stack's own files: site.json in the stack's folder, and the agents' shared
# workspace (Kev's code, the app the agents build in, the knowledge checkouts). install.sh renders it
# from site.json and installs it as /opt/recursicachat/bin/stack-backup.sh, root:wheel 755. Root runs it
# from io.recursica.stack-backup at 04:00, after the RecursicaChat server's backup at 03:30.
#
# CircleChat 1.x's nightly backup was these files' only backup. With 1.x retired (site.circlechat), it
# no longer runs, and the RecursicaChat server's backup holds only the server's data.
#
# 1. Root lists what goes in, with node_modules folders and .env files left out, and stops when a file
#    is named like a key, or holds the value of the vault key or the restic password.
# 2. restic stores the files themselves in its own repository, stack-files, on the cluster's backup
#    remote, encrypted with the RecursicaChat server's restic password: one password for both. Its
#    own repository keeps its own retention and restore test, and a change to the server's repository
#    never touches it. Then the kit's retention: 7 daily, 4 weekly, 6 monthly.
# restic stores a link as a link and never follows one, so a link an agent leaves in the workspace
# can't pull another folder into the backup. A failure posts to the stack's Slack channel.
set -Eeuo pipefail
umask 077

KEY_FILE=/etc/recursicachat/master.key
PW_FILE=/etc/recursicachat/restic.password
WORK=/var/tmp/stack-backup
TAG=stack-files  # the restic repository and tag
OWNER_HOME=@OWNER_HOME@
KIT=@KIT@
CC_DIR=@CC_DIR@
WS="$OWNER_HOME/circlechat-workspace"
SITE="$CC_DIR/site.json"
export PATH=/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin
HOST="$(hostname -s)"

say() {
  echo "$(date -u +%FT%TZ) $1"
  # the post's result, Slack's error included, goes to this job's log
  CC_DIR="$CC_DIR" node "$KIT/kit/slack.mjs" "$1" || true
}
# This run's result, for the morning summary (kit/job-status.mjs, cluster/daily-summary.mjs).
status() { node "$KIT/kit/job-status.mjs" stack-backup "$1" "$2" || true; }
STEP="start"
trap '[ "$BASH_SUBSHELL" -gt 0 ] || { say ":warning: Backup of the stack'"'"'s files (site.json and the workspace) failed on $HOST, at step: $STEP."; status failed "at step: $STEP"; }' ERR
trap 'rm -rf "$WORK"' EXIT

STEP="must run as root"
[ "$(id -u)" = 0 ]
STEP="restic password file"
[ -f "$PW_FILE" ] && [ ! -L "$PW_FILE" ] && [ "$(stat -f '%Su %Lp' "$PW_FILE")" = "root 400" ]
STEP="the files"
# a real file and a real folder, never a link to somewhere else
[ -f "$SITE" ] && [ ! -L "$SITE" ] && [ -d "$WS" ] && [ ! -L "$WS" ]

STEP="backup remote"
# kit-out/tenant.env holds BACKUP_REMOTE (site.json backup.remote). The kit's loader reads it as
# text and runs nothing in it. Only BACKUP_REMOTE leaves the subshell.
BACKUP_REMOTE="$(
  # shellcheck source=/dev/null
  . "$KIT/kit/env-file.sh"
  load_env_file "$CC_DIR/kit-out/tenant.env"
  printf '%s' "${BACKUP_REMOTE:-}"
)"
[ -n "$BACKUP_REMOTE" ]
export RESTIC_REPOSITORY="rclone:$BACKUP_REMOTE/$TAG"
export RESTIC_PASSWORD_FILE="$PW_FILE"
export RCLONE_CONFIG="$OWNER_HOME/.config/rclone/rclone.conf"

STEP="work folder"
rm -rf "$WORK"
mkdir -m 700 "$WORK"

# What restic leaves out: each node_modules folder, which npm makes again, and each .env file.
EXCLUDES=(--exclude node_modules --exclude .env --exclude '.env.*' --exclude .DS_Store)

STEP="file check"
# The files that go in, listed the way restic will take them: plain files, links not followed.
{ echo "$SITE"; find "$WS" \( -name node_modules -o -name .env -o -name '.env.*' -o -name .DS_Store \) -prune -o -type f -print; } > "$WORK/list"
if grep -E '(^|/)(master\.key|[^/]*\.key|seed\.json)$' "$WORK/list" >/dev/null; then
  STEP="file check: a file named like a key or a seed is in the workspace"; false
fi
# grep -c prints a count, never a match. -s: a file that vanishes mid-read is no error.
for secret in "$KEY_FILE" "$PW_FILE"; do
  n="$(tr '\n' '\0' < "$WORK/list" | xargs -0 grep -a -s -l -F -f "$secret" | wc -l | tr -d ' ' || true)"
  [ "$n" = 0 ] || { STEP="file check: $n file(s) hold the value of $secret"; false; }
done

STEP="restic init"
restic cat config >/dev/null 2>&1 || restic init
STEP="restic backup"
restic backup --tag "$TAG" --host "$HOST" "${EXCLUDES[@]}" "$SITE" "$WS" | tee "$WORK/restic.out"
SNAP="$(sed -n 's/^snapshot \([0-9a-f]*\) saved$/\1/p' "$WORK/restic.out")"
STEP="restic forget"
restic forget --tag "$TAG" --keep-daily 7 --keep-weekly 4 --keep-monthly 6 --prune
N="$(wc -l < "$WORK/list" | tr -d ' ')"
echo "$(date -u +%FT%TZ) Backup of the stack's files done: snapshot ${SNAP:-saved}, $N files."
status ok "snapshot ${SNAP:-saved}, $N files"
