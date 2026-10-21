#!/usr/bin/env bash
# Back up one stack, encrypted, to the rclone remote in site.json (backup.remote). Runs as root,
# nightly, from the unit setup-host.sh installs: root can read every agent home.
#
#   OWNER_HOME=/home/<user> CC_DIR=... TENANT=<name or empty> ./circlechat/backup/backup.sh
#
# restic encrypts each backup on this computer with the stack's own RESTIC_PASSWORD, from the
# stack's .env, before anything leaves the computer. The backup holds the database, CircleChat's
# file store, the agent homes, the shared workspace and site.json. The backup leaves out .env:
# every secret lives in the stack's GitHub environment.
set -euo pipefail
: "${CC_DIR:?CC_DIR}" "${OWNER_HOME:?OWNER_HOME}"
WS="${WS:-$OWNER_HOME/circlechat-workspace}"
. "$CC_DIR/kit-out/tenant.env"
[ -n "$DOCKER_CONTEXT" ] && export DOCKER_CONTEXT
STACK="${TENANT:-border}"
env_value() { sed -n "s/^$1=//p" "$CC_DIR/.env" | tail -1; }
SLACK="$(env_value SLACK_WEBHOOK_URL)"
say() {
  echo "$1"
  [ -z "$SLACK" ] || curl -fsS -m 20 -X POST -H 'content-type: application/json' \
    --data "$(node -e 'console.log(JSON.stringify({ text: process.argv[1] }))' "$1")" "$SLACK" >/dev/null || true
}
STEP="start"
trap 'say ":warning: Backup of stack $STACK failed on $(hostname -s), at step: $STEP."' ERR

[ -n "$BACKUP_REMOTE" ] || { echo "No backup.remote in site.json. Nothing to back up."; exit 0; }
export RESTIC_PASSWORD; RESTIC_PASSWORD="$(env_value RESTIC_PASSWORD)"
[ -n "$RESTIC_PASSWORD" ] || { STEP="RESTIC_PASSWORD missing from .env"; false; }
export RESTIC_REPOSITORY="rclone:$BACKUP_REMOTE/$STACK"
export RCLONE_CONFIG="${RCLONE_CONFIG:-$OWNER_HOME/.config/rclone/rclone.conf}"

STAGE="$CC_DIR/backup-staging"
rm -rf "$STAGE"; mkdir -p "$STAGE"; chmod 700 "$STAGE"
STEP="database dump"
(cd "$CC_DIR" && docker compose exec -T postgres pg_dump -U postgres circlechat) | gzip > "$STAGE/db.sql.gz"
STEP="file store"
docker run --rm -v "${COMPOSE_PROJECT_NAME}_miniodata:/data:ro" -v "$STAGE:/out" alpine:3.20 \
  tar czf /out/minio.tgz -C /data .
STEP="restic init"
restic cat config >/dev/null 2>&1 || restic init
STEP="restic backup"
restic backup --tag "$STACK" "$STAGE" "$CC_DIR/hermes-homes" "$WS" "$CC_DIR/site.json" \
  --exclude "$WS/**/node_modules" --exclude "$CC_DIR/hermes-homes/**/.env"
STEP="restic forget"
restic forget --tag "$STACK" --keep-daily 7 --keep-weekly 4 --keep-monthly 6 --prune
rm -rf "$STAGE"
echo "Backup of stack $STACK done."
