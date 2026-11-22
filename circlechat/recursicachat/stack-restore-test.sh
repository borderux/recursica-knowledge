#!/bin/bash
# Monthly proof that the backup of the stack's own files restores. install.sh renders it from
# site.json and installs it as /opt/recursicachat/bin/stack-restore-test.sh, root:wheel 755. Root runs
# it on the first of each month from io.recursica.stack-restore-test, or by hand at any time.
#
# Restores the newest snapshot of stack-backup.sh into a folder only root can open, then checks:
#   - every file the snapshot lists came back, and the snapshot holds site.json and the workspace;
#   - site.json passes the kit's own site check (kit/render.mjs);
#   - the workspace has Kev's code and the app the agents build in, each with its files;
#   - no .env file and no file named like a key, and neither the vault key nor the restic password
#     in any file.
# Deletes the folder, and posts the result to the stack's Slack channel, pass or fail.
set -Eeuo pipefail
umask 077

KEY_FILE=/etc/recursicachat/master.key
PW_FILE=/etc/recursicachat/restic.password
WORK=/var/tmp/stack-restore-test
TAG=stack-files  # the restic repository and tag stack-backup.sh writes
OWNER_HOME=@OWNER_HOME@
KIT=@KIT@
CC_DIR=@CC_DIR@
WS="$OWNER_HOME/circlechat-workspace"
SITE="$CC_DIR/site.json"
export PATH=/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin
HOST="$(hostname -s)"

say() {
  echo "$(date -u +%FT%TZ) $1"
  CC_DIR="$CC_DIR" node "$KIT/kit/slack.mjs" "$1" >/dev/null 2>&1 || true
}
fail() { say ":x: Test restore of the stack's files failed on $HOST: $1"; exit 1; }
STEP="start"
trap '[ "$BASH_SUBSHELL" -gt 0 ] || say ":x: Test restore of the stack'"'"'s files failed on $HOST, at step: $STEP."' ERR
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
OUT="$WORK/restored"

STEP="restore"
restic restore --tag "$TAG" latest --target "$OUT" >/dev/null || fail "restic could not restore the newest snapshot"
# restic restores each path under its full path: $OUT/<the stack's folder>/site.json, $OUT/<workspace>.
R_SITE="$OUT$SITE"
R_WS="$OUT$WS"

STEP="whole"
want="$(restic ls --tag "$TAG" latest --json | /opt/recursicachat/node/v24.22.3/bin/node -e 'let n=0,b="";process.stdin.on("data",d=>b+=d).on("end",()=>{for(const l of b.split("\n")){if(!l.trim())continue;const e=JSON.parse(l);if(e.struct_type==="node"&&e.type==="file")n++}console.log(n)})')"
got="$(find "$OUT" -type f | wc -l | tr -d ' ')"
[ "$got" = "$want" ] || fail "$got of the snapshot's $want files came back"
[ -f "$R_SITE" ] || fail "the snapshot holds no site.json"
[ -d "$R_WS" ] || fail "the snapshot holds no workspace"

STEP="site.json"
# The kit's site check, on the restored copy, into a folder of the test's own.
node "$KIT/kit/render.mjs" "$R_SITE" "$WORK/site-check" >/dev/null 2>&1 || fail "the restored site.json fails the kit's site check"

STEP="workspace"
[ -f "$R_WS/kev/package.json" ] || fail "the workspace has no Kev"
app="$(/opt/recursicachat/node/v24.22.3/bin/node -e 'const s=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));process.stdout.write(String(s.repos?.app_dir??""))' "$R_SITE")"
if [ -n "$app" ]; then
  [ -d "$R_WS/$app" ] && [ -n "$(find "$R_WS/$app" -type f -not -path '*/.git/*' | head -1)" ] || fail "the workspace has no files of the app, $app"
fi

STEP="secrets"
named="$(find "$OUT" \( -name .env -o -name '.env.*' -o -name master.key -o -name '*.key' -o -name seed.json \) -print)"
[ -z "$named" ] || fail "the snapshot holds a .env file or a file named like a key"
for secret in "$KEY_FILE" "$PW_FILE"; do
  n="$(grep -r -a -l -F -f "$secret" "$OUT" | wc -l | tr -d ' ' || true)"
  [ "$n" = 0 ] || fail "$n restored file(s) hold the value of $secret"
done

STEP="newest backup's time"
when="$(restic snapshots --tag "$TAG" --latest 1 --json | /opt/recursicachat/node/v24.22.3/bin/node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const t=JSON.parse(s).at(-1)?.time;const d=t?new Date(t):null;console.log(d&&!isNaN(d)?d.toISOString().slice(0,16).replace("T"," "):"unknown")})')"
say ":white_check_mark: Test restore of the stack's files passed on $HOST. Newest backup: $when UTC. $got files, site.json passes the site check, Kev and the app are there, and no secret is in it."
