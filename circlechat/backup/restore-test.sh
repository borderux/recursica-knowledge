#!/usr/bin/env bash
# Prove a stack's backup restores. Runs as root, on the first day of each month; does the test in
# January, April, July and October, or any time with FORCE=1. Restores the newest backup to a
# scratch folder inside the stack's own folder, checks the database dump, the file store and the
# agent homes, deletes the scratch folder, and posts the result to the stack's Slack channel.
set -euo pipefail
: "${CC_DIR:?CC_DIR}" "${OWNER_HOME:?OWNER_HOME}"
case "$(date +%m)" in 01|04|07|10) ;; *) [ "${FORCE:-}" = 1 ] || exit 0 ;; esac
. "$CC_DIR/kit-out/tenant.env"
STACK="${TENANT:-border}"
env_value() { sed -n "s/^$1=//p" "$CC_DIR/.env" | tail -1; }
say() {
  echo "$1"
  CC_DIR="$CC_DIR" node "$(dirname "$0")/../kit/slack.mjs" "$1" >/dev/null 2>&1 || true
}
[ -n "$BACKUP_REMOTE" ] || exit 0
export RESTIC_PASSWORD; RESTIC_PASSWORD="$(env_value RESTIC_PASSWORD)"
export RESTIC_REPOSITORY="rclone:$BACKUP_REMOTE/$STACK"
export RCLONE_CONFIG="${RCLONE_CONFIG:-$OWNER_HOME/.config/rclone/rclone.conf}"
SCRATCH="$CC_DIR/.restore-test"
rm -rf "$SCRATCH"; mkdir -p "$SCRATCH"; chmod 700 "$SCRATCH"
trap 'rm -rf "$SCRATCH"' EXIT
fail() { say ":x: Test restore of stack $STACK failed on $(hostname -s): $1"; exit 1; }
restic restore latest --tag "$STACK" --target "$SCRATCH" >/dev/null || fail "restic could not restore the newest backup"
db="$(find "$SCRATCH" -name db.sql.gz | head -1)"
[ -n "$db" ] && gzip -t "$db" || fail "the database dump is missing or damaged"
gzip -dc "$db" | grep -q "CREATE TABLE" || fail "the database dump holds no tables"
store="$(find "$SCRATCH" -name minio.tgz | head -1)"
[ -n "$store" ] && tar tzf "$store" >/dev/null || fail "the file store archive is missing or damaged"
[ -d "$(find "$SCRATCH" -type d -name hermes-homes | head -1)" ] || fail "the agent homes are missing"
grep -q '^MINIO_ROOT_PASSWORD=' "$(find "$SCRATCH" -name generated.env | head -1)" 2>/dev/null || fail "CircleChat's generated secrets are missing"
when="$(restic snapshots latest --tag "$STACK" --json | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s)[0]?.time?.slice(0,16)??"unknown"))')"
say ":white_check_mark: Test restore of stack $STACK passed on $(hostname -s). Newest backup: $when UTC."
