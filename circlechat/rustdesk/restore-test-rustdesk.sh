#!/usr/bin/env bash
# Prove that the RustDesk server's backup restores. Runs as root, on the 1st of each month, one hour
# after the nightly backup, from the unit setup-rustdesk.sh installs. Run the test by hand at any time:
#
#   sudo systemctl start rustdesk-restore-test.service && sudo journalctl -u rustdesk-restore-test -n 20
#
# The test restores the newest snapshot of backup-rustdesk.sh into a temp folder only root opens,
# then checks four facts:
#   - The archive holds the server's key pair, id_ed25519 and id_ed25519.pub, and the pair matches.
#   - The archive holds the server's database, a SQLite file.
#   - The restored public key matches the running server's public key. The test compares the two
#     fingerprints and never prints a key.
#   - The newest snapshot is under 2 days old.
# The test posts the result in the cluster's Slack channel, with the snapshot's date, pass or fail.
# The test deletes the temp folder at the end, after a failure too. The test only reads the backup
# repository.
set -Eeuo pipefail
umask 077
: "${OWNER_HOME:?OWNER_HOME}" "${STACK:?STACK}" "${BACKUP_REMOTE:?BACKUP_REMOTE}"
SECRETS="${SECRETS:-$OWNER_HOME/.recursica-node.env}"
HBBS="${RUSTDESK_HBBS:-rustdesk-hbbs}"
MAX_AGE_HOURS=48
RD="node $(cd "$(dirname "$0")" && pwd)/rustdesk.mjs"
HOST="$(hostname -s)"
say() {
  echo "$1"
  [ -n "${KIT:-}" ] || return 0
  ( set -a; . /etc/agent-cluster.env 2>/dev/null; set +a; node "$KIT/circlechat/cluster/post.mjs" info "$1" ) || true
}
when="unknown"
fail() { say ":x: Test restore of the RustDesk server's backup failed on $HOST: $1. Newest snapshot: $when UTC."; exit 1; }
STEP="start"
trap '[ "$BASH_SUBSHELL" -gt 0 ] || say ":x: Test restore of the RustDesk server'"'"'s backup failed on $HOST, at step: $STEP. Newest snapshot: $when UTC."' ERR

STEP="must run as root"
[ "$(id -u)" = 0 ] || fail "the test must run as root"

STEP="secret"
export RESTIC_PASSWORD; RESTIC_PASSWORD="$(sed -n 's/^RUSTDESK_RESTIC_PASSWORD=//p' "$SECRETS" 2>/dev/null | tail -1)"
[ -n "$RESTIC_PASSWORD" ] || fail "RUSTDESK_RESTIC_PASSWORD is missing from $SECRETS"
export RESTIC_REPOSITORY="rclone:$BACKUP_REMOTE/$STACK-rustdesk"
export RCLONE_CONFIG="${RCLONE_CONFIG:-$OWNER_HOME/.config/rclone/rclone.conf}"

STEP="temp folder"
WORK="$(mktemp -d "${RUSTDESK_RESTORE_TMP:-/var/tmp}/rustdesk-restore-test.XXXXXX")"
trap 'rm -rf "$WORK"' EXIT
chmod 700 "$WORK"

STEP="newest snapshot"
snapshots="$(restic snapshots --tag rustdesk --json)" || fail "restic could not list the snapshots"
newest="$($RD newest-snapshot <<<"$snapshots")" || fail "the backup repository holds no snapshot"
read -r id age_hours when <<<"$newest"

STEP="restore"
restic restore "$id" --target "$WORK/restored" >/dev/null || fail "restic could not restore the newest snapshot"
# Each run since the fixed path backs up /var/lib/rustdesk-backup/rustdesk.tgz. An older snapshot
# holds the archive under a temp folder's path.
archive="$(find "$WORK/restored" -type f -name rustdesk.tgz | head -1)"
[ -n "$archive" ] || fail "the newest snapshot holds no rustdesk.tgz"

STEP="archive"
listing="$(tar tzf "$archive")" || fail "rustdesk.tgz is damaged"
for f in ./id_ed25519 ./id_ed25519.pub; do
  grep -qx "$f" <<<"$listing" || fail "rustdesk.tgz holds no ${f#./}"
done
db="$(grep -xE '\./db(_v2)?\.sqlite3' <<<"$listing" | head -1 || true)"
[ -n "$db" ] || fail "rustdesk.tgz holds no database, db.sqlite3 or db_v2.sqlite3"
mkdir "$WORK/data"
tar xzf "$archive" -C "$WORK/data" ./id_ed25519 ./id_ed25519.pub "$db" || fail "rustdesk.tgz could not be unpacked"

STEP="key pair"
problem="$($RD key-pair "$WORK/data/id_ed25519" "$WORK/data/id_ed25519.pub")" || fail "$problem"

STEP="database"
[ "$(head -c 15 "$WORK/data/$db")" = "SQLite format 3" ] || fail "${db#./} in rustdesk.tgz is no SQLite database"

STEP="running server's key"
[ "$(docker inspect -f '{{.State.Running}}' "$HBBS" 2>/dev/null)" = true ] || fail "the server's container, $HBBS, is not running"
restored_fp="$($RD fingerprint < "$WORK/data/id_ed25519.pub")" || fail "id_ed25519.pub in rustdesk.tgz holds no public key"
# The public key goes from the container straight into the fingerprint, and never into a variable.
live_fp="$(docker exec "$HBBS" cat /root/id_ed25519.pub 2>/dev/null | $RD fingerprint)" || fail "the running server's public key could not be read"
[ "$restored_fp" = "$live_fp" ] || fail "the restored public key, $restored_fp, is not the running server's public key, $live_fp"

STEP="snapshot's age"
[ "$age_hours" -lt "$MAX_AGE_HOURS" ] || fail "the newest snapshot is $age_hours hours old, and the limit is $MAX_AGE_HOURS hours"

say ":white_check_mark: Test restore of the RustDesk server's backup passed on $HOST. Newest snapshot: $when UTC. The archive holds the key pair and the database, and the restored public key matches the running server's public key, $live_fp."
