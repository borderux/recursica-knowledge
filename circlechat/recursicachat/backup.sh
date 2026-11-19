#!/bin/bash
# Nightly backup of the RecursicaChat 2.0 server's data. install.sh renders it from site.json and
# installs it as /opt/recursicachat/bin/backup.sh, root:wheel 755. Root runs it from
# io.recursica.recursicachat-backup.
#
# 1. As _recursicachat, 2.0's own "cli.ts backup" writes a consistent copy of the database
#    (VACUUM INTO) and the agents/ folder as a .tar.gz on stdout. Root saves that stream in a
#    folder only root can open. Root never works inside a folder the server's account controls.
# 2. Root leaves out each agent's engine settings (ENGINE_FILES below). The server writes them again
#    at every engine start, and they hold the agent's model proxy token, which lasts only while the
#    engine runs. A restore loses nothing.
# 3. Root checks what is left: no file named like a key, and neither the vault key nor the restic
#    password anywhere in its contents.
# 4. restic encrypts it with the server's own password and stores it in its own repository,
#    recursicachat-trial, on the cluster's backup remote. Then the kit's retention: 7 daily,
#    4 weekly, 6 monthly.
# A failure posts to the stack's Slack channel through the kit's slack.mjs: no new token.
#
# The vault key is never in a backup. To restore, you need the restic password and the vault key,
# from where the stack keeps its secrets.
set -Eeuo pipefail
umask 077

ACCOUNT=_recursicachat
NODE=/opt/recursicachat/node/v24.22.3/bin/node
APP=/opt/recursicachat/app
DATA=/opt/recursicachat/data
KEY_FILE=/etc/recursicachat/master.key
PW_FILE=/etc/recursicachat/restic.password
WORK=/var/tmp/recursicachat-backup
TAG=recursicachat-trial  # the restic repository and tag the backups already have
# The cluster's kit and stack, read only: the backup remote, its rclone config, and Slack.
OWNER_HOME=@OWNER_HOME@
KIT=@KIT@
CC_DIR=@CC_DIR@
export PATH=/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin
HOST="$(hostname -s)"

say() {
  echo "$(date -u +%FT%TZ) $1"
  CC_DIR="$CC_DIR" node "$KIT/kit/slack.mjs" "$1" >/dev/null 2>&1 || true
}
STEP="start"
trap '[ "$BASH_SUBSHELL" -gt 0 ] || say ":warning: Backup of the RecursicaChat server failed on $HOST, at step: $STEP."' ERR
trap 'rm -rf "$WORK"' EXIT

STEP="must run as root"
[ "$(id -u)" = 0 ]
STEP="restic password file"
[ -f "$PW_FILE" ] && [ ! -L "$PW_FILE" ] && [ "$(stat -f '%Su %Lp' "$PW_FILE")" = "root 400" ]

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
ARCHIVE="$WORK/backup.tar.gz"
TAR="$WORK/backup.tar"

STEP="archive"
# The account reads the key itself and gets it only as an exported variable, never as an
# argument (ps shows any process's arguments to every account). Its working copy goes in its own
# home, not /tmp. Root only receives the stream.
cd /
# shellcheck disable=SC2024  # root, not the account, must own the file the stream lands in
/usr/bin/sudo -u "$ACCOUNT" -H /bin/bash -s -- "$NODE" "$APP" "$DATA" "$KEY_FILE" > "$ARCHIVE" <<'AS_ACCOUNT'
set -euo pipefail
umask 077
node="$1" app="$2" data="$3" key_file="$4"
key="$(cat "$key_file")"
tmp=/opt/recursicachat/home/tmp
mkdir -p -m 700 "$tmp"
for v in $(compgen -e); do unset "$v" 2>/dev/null || true; done
export HOME=/opt/recursicachat/home PATH=/usr/bin:/bin TMPDIR="$tmp"
export CIRCLECHAT_DATA="$data" CIRCLECHAT_MASTER_KEY="$key"
cd "$app"
exec "$node" server/src/cli.ts backup < /dev/null
AS_ACCOUNT

STEP="engine settings"
# Each engine's settings in an agent's home, which the server writes at every engine start with the
# agent's model proxy token (server/src/agents/engines.ts). restore-test.sh checks the same list.
ENGINE_FILES=(
  './agents/*/home/.hermes/.env'
  './agents/*/home/.hermes/config.yaml'
  './agents/*/home/.openclaw/openclaw.json'
  './agents/*/home/.config/opencode/opencode.json'
)
excludes=()
for f in "${ENGINE_FILES[@]}"; do excludes+=(--exclude "$f"); done
# tar reads the whole stream, and writes it again as a plain, uncompressed tar without those files.
# A plain tar dedups well in restic, which compresses and encrypts it anyway. (macOS tar pads its
# gzip output to a 10240-byte block with zeros, which gzip -t would call trailing garbage.)
tar -cf "$TAR" "${excludes[@]}" @"$ARCHIVE"
rm -f "$ARCHIVE"

STEP="archive check"
tar -tf "$TAR" > "$WORK/list"
grep -qx './circlechat.db' "$WORK/list"
if grep -E '(^|/)(master\.key|[^/]*\.key|seed\.json|\.env)$' "$WORK/list" >/dev/null; then
  STEP="archive check: a file named like a key or a seed is in the archive"; false
fi
# grep -c prints a count, never a match.
for secret in "$KEY_FILE" "$PW_FILE"; do
  n="$(grep -a -c -F -f "$secret" "$TAR" || true)"
  [ "$n" = 0 ] || { STEP="archive check: the contents hold the value of $secret"; false; }
done

STEP="restic init"
restic cat config >/dev/null 2>&1 || restic init
STEP="restic backup"
restic backup --tag "$TAG" --host "$HOST" --stdin --stdin-filename recursicachat-trial.tar < "$TAR"
STEP="restic forget"
restic forget --tag "$TAG" --keep-daily 7 --keep-weekly 4 --keep-monthly 6 --prune
echo "$(date -u +%FT%TZ) Backup of the RecursicaChat server done: $(wc -l < "$WORK/list" | tr -d ' ') archive entries."
