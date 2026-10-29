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
# -E: a failure inside a function, such as own_for_docker, also runs the ERR trap and reports. -E
# also gives the trap to each subshell, so only the main shell reports, and each failure posts once.
set -Eeuo pipefail
: "${CC_DIR:?CC_DIR}" "${OWNER_HOME:?OWNER_HOME}"
WS="${WS:-$OWNER_HOME/circlechat-workspace}"
. "$(dirname "$0")/../kit/lib.sh"
# Runs as root. The kit checkout must sit outside the agents' workspace.
require_kit "$(dirname "$0")/../.." "${OWNER:-}" "$OWNER_HOME"
. "$CC_DIR/kit-out/tenant.env"
[ -n "$DOCKER_CONTEXT" ] && export DOCKER_CONTEXT
# The stack's name: site.tenant, or site.stack_name for the cluster's own stack (kit/render.mjs).
STACK="${STACK_NAME:-${TENANT:-$(node --input-type=module -e 'const { stackName } = await import(process.argv[2]); process.stdout.write(stackName(JSON.parse((await import("node:fs")).readFileSync(process.argv[1], "utf8"))));' "$CC_DIR/site.json" "$(dirname "$0")/../kit/render.mjs")}}"
env_value() { sed -n "s/^$1=//p" "$CC_DIR/.env" | tail -1; }
say() {
  echo "$1"
  CC_DIR="$CC_DIR" node "$(dirname "$0")/../kit/slack.mjs" "$1" >/dev/null 2>&1 || true
}
STEP="start"
trap '[ "$BASH_SUBSHELL" -gt 0 ] || say ":warning: Backup of stack $STACK failed on $(hostname -s), at step: $STEP."' ERR

[ -n "$BACKUP_REMOTE" ] || { echo "No backup.remote in site.json. Nothing to back up."; exit 0; }
export RESTIC_PASSWORD; RESTIC_PASSWORD="$(env_value RESTIC_PASSWORD)"
[ -n "$RESTIC_PASSWORD" ] || { STEP="RESTIC_PASSWORD missing from .env"; false; }
export RESTIC_REPOSITORY="rclone:$BACKUP_REMOTE/$STACK"
export RCLONE_CONFIG="${RCLONE_CONFIG:-$OWNER_HOME/.config/rclone/rclone.conf}"

STEP="staging folder"
STAGE="$CC_DIR/backup-staging"
rm -rf "$STAGE"; mkdir -p "$STAGE"; chmod 700 "$STAGE"
# The file store step writes into the staging folder from a container. On a Mac, the stack's owner
# owns the folder, because Docker's VM reads the Mac's files as the owner. The mode stays 700.
DOCKER_OWNER="$(ls -ld "$OWNER_HOME" | awk '{print $3}')" own_for_docker "$STAGE"
# CircleChat's generated secrets: the file store (MinIO) encrypts its own settings with its root
# password, and the session secret keeps people signed in. A restore needs the same values. The
# backup is encrypted, like every other part.
grep -E '^(SESSION_SECRET|PG_PASSWORD|MINIO_ROOT_USER|MINIO_ROOT_PASSWORD|LITELLM_MASTER_KEY)=' "$CC_DIR/.env" > "$STAGE/generated.env" || true
chmod 600 "$STAGE/generated.env"
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
