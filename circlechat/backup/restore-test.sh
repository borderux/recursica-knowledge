#!/usr/bin/env bash
# Prove a stack's backup restores. Runs as root, on the first day of each month; does the test in
# January, April, July and October, or any time with FORCE=1. Restores the newest backup to a
# scratch folder inside the stack's own folder, checks the database dump, the file store and the
# agent homes, runs the key check (no cloud model key may be in a backup), deletes the scratch
# folder, and posts the result to the stack's Slack channel.
# -E: a failure inside a function also runs the ERR trap. -E also gives the trap to each subshell,
# so only the main shell reports, and each failure posts once.
set -Eeuo pipefail
: "${CC_DIR:?CC_DIR}" "${OWNER_HOME:?OWNER_HOME}"
case "$(date +%m)" in 01|04|07|10) ;; *) [ "${FORCE:-}" = 1 ] || exit 0 ;; esac
. "$CC_DIR/kit-out/tenant.env"
STACK="${TENANT:-border}"
env_value() { sed -n "s/^$1=//p" "$CC_DIR/.env" | tail -1; }
say() {
  echo "$1"
  CC_DIR="$CC_DIR" node "$(dirname "$0")/../kit/slack.mjs" "$1" >/dev/null 2>&1 || true
}
# Each expected failure posts its own reason through fail. The ERR trap posts any other failure,
# with the step.
STEP="start"
trap '[ "$BASH_SUBSHELL" -gt 0 ] || say ":x: Test restore of stack $STACK failed on $(hostname -s), at step: $STEP."' ERR
[ -n "$BACKUP_REMOTE" ] || exit 0
export RESTIC_PASSWORD; RESTIC_PASSWORD="$(env_value RESTIC_PASSWORD)"
export RESTIC_REPOSITORY="rclone:$BACKUP_REMOTE/$STACK"
export RCLONE_CONFIG="${RCLONE_CONFIG:-$OWNER_HOME/.config/rclone/rclone.conf}"
STEP="scratch folder"
SCRATCH="$CC_DIR/.restore-test"
rm -rf "$SCRATCH"; mkdir -p "$SCRATCH"; chmod 700 "$SCRATCH"
trap 'rm -rf "$SCRATCH"' EXIT
fail() { say ":x: Test restore of stack $STACK failed on $(hostname -s): $1"; exit 1; }
STEP="restore"
restic restore latest --tag "$STACK" --target "$SCRATCH" >/dev/null || fail "restic could not restore the newest backup"
STEP="database dump"
db="$(find "$SCRATCH" -name db.sql.gz | head -1)"
[ -n "$db" ] && gzip -t "$db" || fail "the database dump is missing or damaged"
gzip -dc "$db" | grep -q "CREATE TABLE" || fail "the database dump holds no tables"
STEP="file store"
store="$(find "$SCRATCH" -name minio.tgz | head -1)"
[ -n "$store" ] && tar tzf "$store" >/dev/null || fail "the file store archive is missing or damaged"
STEP="agent homes"
[ -d "$(find "$SCRATCH" -type d -name hermes-homes | head -1)" ] || fail "the agent homes are missing"
STEP="generated secrets"
grep -q '^MINIO_ROOT_PASSWORD=' "$(find "$SCRATCH" -name generated.env | head -1)" 2>/dev/null || fail "CircleChat's generated secrets are missing"
STEP="key check"
# The places go to this job's log on the computer, and only their count goes to Slack.
if ! keys="$(node "$(dirname "$0")/../gateway/key-check.mjs" --secrets "$CC_DIR/model-keys.env" "$SCRATCH")"; then
  printf '%s\n' "$keys"
  fail "the key check found a cloud key in the backup, in $(printf '%s\n' "$keys" | grep -c '^  - ') place(s). The restore test's log on the computer lists the places"
fi
STEP="newest backup's time"
when="$(restic snapshots latest --tag "$STACK" --json | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s)[0]?.time?.slice(0,16)??"unknown"))')"
say ":white_check_mark: Test restore of stack $STACK passed on $(hostname -s). Newest backup: $when UTC."
