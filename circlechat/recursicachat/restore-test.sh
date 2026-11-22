#!/bin/bash
# Monthly proof that the RecursicaChat 2.0 server's backup restores. install.sh renders it from
# site.json and installs it as /opt/recursicachat/bin/restore-test.sh, root:wheel 755. Root runs it on
# the first of each month from io.recursica.recursicachat-restore-test, or by hand at any time.
#
# Restores the newest backup into a folder only root can open, then checks:
#   - the archive is whole, and holds the database;
#   - no file named like a key or a seed, no agent's engine settings (backup.sh leaves them out),
#     and neither the vault key nor the restic password in it;
#   - SQLite's integrity check passes, and the workspace has its owner;
#   - the vault key opens every stored secret, so the key and the backup belong together.
# Deletes the folder, and posts the result to the stack's Slack channel, pass or fail.
set -Eeuo pipefail
umask 077

NODE=/opt/recursicachat/node/v24.22.3/bin/node
APP=/opt/recursicachat/app
KEY_FILE=/etc/recursicachat/master.key
PW_FILE=/etc/recursicachat/restic.password
WORK=/var/tmp/recursicachat-restore-test
TAG=recursicachat-trial  # the restic repository and tag the backups already have
OWNER_HOME=@OWNER_HOME@
KIT=@KIT@
CC_DIR=@CC_DIR@
export PATH=/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin
HOST="$(hostname -s)"

say() {
  echo "$(date -u +%FT%TZ) $1"
  # the post's result, Slack's error included, goes to this job's log
  CC_DIR="$CC_DIR" node "$KIT/kit/slack.mjs" "$1" || true
}
# This run's result, for the morning summary (kit/job-status.mjs, cluster/daily-summary.mjs).
status() { node "$KIT/kit/job-status.mjs" recursicachat-restore-test "$1" "$2" || true; }
fail() { say ":x: Test restore of the RecursicaChat server failed on $HOST: $1"; status failed "$1"; exit 1; }
STEP="start"
trap '[ "$BASH_SUBSHELL" -gt 0 ] || { say ":x: Test restore of the RecursicaChat server failed on $HOST, at step: $STEP."; status failed "at step: $STEP"; }' ERR
trap 'rm -rf "$WORK"' EXIT

STEP="must run as root"
[ "$(id -u)" = 0 ]
STEP="restic password file"
[ -f "$PW_FILE" ] && [ ! -L "$PW_FILE" ] && [ "$(stat -f '%Su %Lp' "$PW_FILE")" = "root 400" ]

STEP="backup remote"
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
TAR="$WORK/backup.tar"

STEP="restore"
restic dump --tag "$TAG" latest /recursicachat-trial.tar > "$TAR" || fail "restic could not restore the newest backup"

STEP="archive"
tar -tf "$TAR" > "$WORK/list" || fail "the archive is damaged"
grep -qx './circlechat.db' "$WORK/list" || fail "the archive holds no database"
if grep -E '(^|/)(master\.key|[^/]*\.key|seed\.json|\.env)$' "$WORK/list" >/dev/null; then
  fail "the archive holds a file named like a key or a seed"
fi
# The same list as backup.sh: each engine's settings, with the agent's model proxy token.
ENGINE_FILES=(
  './agents/*/home/.hermes/.env'
  './agents/*/home/.hermes/config.yaml'
  './agents/*/home/.openclaw/openclaw.json'
  './agents/*/home/.config/opencode/opencode.json'
)
while IFS= read -r entry; do
  # shellcheck disable=SC2053  # the right side is a pattern on purpose
  for f in "${ENGINE_FILES[@]}"; do [[ "$entry" != $f ]] || fail "the archive holds an agent's engine settings"; done
done < "$WORK/list"
for secret in "$KEY_FILE" "$PW_FILE"; do
  n="$(grep -a -c -F -f "$secret" "$TAR" || true)"
  [ "$n" = 0 ] || fail "the archive holds the value of $secret"
done

STEP="database"
# Only the database file comes out of the archive, and only if the archive says it is a plain file.
[ "$(tar -tvf "$TAR" ./circlechat.db | cut -c1)" = "-" ] || fail "the database in the archive isn't a plain file"
tar -xf "$TAR" -C "$WORK" ./circlechat.db
DB="$WORK/circlechat.db"
[ "$(/usr/bin/sqlite3 -readonly "$DB" 'PRAGMA integrity_check;')" = ok ] || fail "SQLite's integrity check failed"
owners="$(/usr/bin/sqlite3 -readonly "$DB" "SELECT count(*) FROM users WHERE role = 'owner';")"
[ "$owners" -ge 1 ] || fail "the workspace has no owner"

STEP="vault"
# Opens every stored secret with the vault key and prints only a count. The key is read from its
# file inside Node, never passed as an argument. The code is the installed app's own crypto.ts.
# shellcheck disable=SC2016  # the single quotes keep this JavaScript from the shell
opened="$("$NODE" --input-type=module -e '
  import { readFileSync } from "node:fs";
  import { DatabaseSync } from "node:sqlite";
  const { Vault } = await import(process.argv[1] + "/server/src/crypto.ts");
  const vault = new Vault(readFileSync(process.argv[2], "utf8").trim());
  const db = new DatabaseSync(process.argv[3], { readOnly: true });
  const rows = db.prepare("SELECT iv, tag, data FROM secrets").all();
  let ok = 0;
  for (const r of rows) { try { vault.open(r); ok++; } catch {} }
  process.stdout.write(`${ok} ${rows.length}`);
' "$APP" "$KEY_FILE" "$DB")" || fail "the vault check could not run"
read -r ok total <<< "$opened"
[ "$ok" = "$total" ] || fail "the vault key opened $ok of $total stored secrets"

STEP="newest backup's time"
# restic gives local time with its offset (such as 09:32-08:00). Date turns it into UTC.
when="$(restic snapshots --tag "$TAG" --latest 1 --json | "$NODE" -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const t=JSON.parse(s).at(-1)?.time;const d=t?new Date(t):null;console.log(d&&!isNaN(d)?d.toISOString().slice(0,16).replace("T"," "):"unknown")})')"
say ":white_check_mark: Test restore of the RecursicaChat server passed on $HOST. Newest backup: $when UTC. Database intact, owner present, the vault key opened $total of $total stored secrets."
status ok "newest backup $when UTC restored, the vault key opened $total of $total secrets"
