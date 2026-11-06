#!/usr/bin/env bash
# Back up the RustDesk server's volume, encrypted, to the cluster's backup remote. Runs as root,
# nightly, from the unit setup-rustdesk.sh installs.
#
#   OWNER_HOME=/home/<user> STACK=<stack> BACKUP_REMOTE=<rclone remote> ./backup-rustdesk.sh
#
# The volume holds the server's private key (id_ed25519), its database and its license. restic
# encrypts the backup on this computer with RUSTDESK_RESTIC_PASSWORD, a secret of its own, so this
# computer holds no key to the stack's other backups. The backup goes to <remote>/<stack>-rustdesk.
# The containers pause for the copy, so the database is copied whole. A pause keeps each
# connection open.
set -Eeuo pipefail
: "${OWNER_HOME:?OWNER_HOME}" "${STACK:?STACK}" "${BACKUP_REMOTE:?BACKUP_REMOTE}"
SECRETS="${SECRETS:-$OWNER_HOME/.recursica-node.env}"
VOLUME="${RUSTDESK_VOLUME:-rustdesk_data}"
CONTAINERS="rustdesk-hbbs rustdesk-hbbr"
say() {
  echo "$1"
  [ -n "${KIT:-}" ] || return 0
  ( set -a; . /etc/agent-cluster.env 2>/dev/null; set +a; node "$KIT/circlechat/cluster/post.mjs" info "$1" >/dev/null 2>&1 ) || true
}
STEP="start"
trap '[ "$BASH_SUBSHELL" -gt 0 ] || say ":warning: Backup of the RustDesk server failed on $(hostname -s), at step: $STEP."' ERR

STEP="secret"
export RESTIC_PASSWORD; RESTIC_PASSWORD="$(sed -n 's/^RUSTDESK_RESTIC_PASSWORD=//p' "$SECRETS" | tail -1)"
[ -n "$RESTIC_PASSWORD" ] || { STEP="RUSTDESK_RESTIC_PASSWORD missing from $SECRETS"; false; }
export RESTIC_REPOSITORY="rclone:$BACKUP_REMOTE/$STACK-rustdesk"
export RCLONE_CONFIG="${RCLONE_CONFIG:-$OWNER_HOME/.config/rclone/rclone.conf}"

STEP="copy"
STAGE="$(mktemp -d /var/tmp/rustdesk-backup.XXXXXX)"
chmod 700 "$STAGE"
paused=""
cleanup() { [ -z "$paused" ] || docker unpause $paused >/dev/null 2>&1 || true; rm -rf "$STAGE"; }
trap cleanup EXIT
for c in $CONTAINERS; do docker pause "$c" >/dev/null 2>&1 && paused="$paused $c"; done
docker run --rm -v "$VOLUME:/data:ro" -v "$STAGE:/out" alpine:3.20 tar czf /out/rustdesk.tgz -C /data .
docker unpause $paused >/dev/null 2>&1 || true; paused=""
tar tzf "$STAGE/rustdesk.tgz" | grep -qx './id_ed25519' || { STEP="the volume holds no id_ed25519"; false; }

STEP="restic init"
restic cat config >/dev/null 2>&1 || restic init
STEP="restic backup"
restic backup --tag rustdesk "$STAGE/rustdesk.tgz"
STEP="restic check"
restic ls latest | grep -q '/rustdesk.tgz$' || { STEP="the new snapshot has no rustdesk.tgz"; false; }
STEP="restic forget"
restic forget --tag rustdesk --keep-daily 7 --keep-weekly 4 --keep-monthly 6 --prune
echo "Backup of the RustDesk server done."
