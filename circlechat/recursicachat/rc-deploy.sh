#!/bin/bash
# rc-deploy: puts the latest commit of the RecursicaChat 2.0 server's branch into service, and puts
# the previous one back on any failure. install.sh installs it as /opt/recursicachat/bin/rc-deploy.sh,
# root:wheel 755, linked as /usr/local/bin/rc-deploy. Run it from the owner's account:
#
#   sudo rc-deploy
#
# It prints one summary line; every step's output goes to /var/log/recursicachat/rc-deploy.log.
#
# 1. Build, as the owner, never as root: a fresh clone of the branch and repository the running app's
#    REVISION names; npm ci --ignore-scripts, so no dependency's install script runs; both type
#    checks; the web build; npm prune --omit=dev. The stage is the commit's files, the web bundle,
#    node_modules and a new REVISION, with a SHA-256 manifest of every file. The branch's own tests
#    ran in its pull requests' checks. A stage with an absolute link is refused.
#    The same commit as the running one changes nothing.
# 2. Swap: stop the server; the running app becomes app.prev (replacing an older app.prev); the stage
#    is copied in, root-owned, with no write for the group or others.
# 3. Check the copy file by file against the manifest, and that nothing in it is writable by others.
# 4. Start the server; /healthz must answer ok within 3 minutes; the new start must print the same
#    sign-in and tools lines the previous start printed, within a minute.
# Any failure after the server stopped puts app.prev back, starts it and checks /healthz again.
# No backup is made first.
set -uo pipefail
umask 022

BASE=/opt/recursicachat
LABEL=io.recursica.recursicachat
PLIST="/Library/LaunchDaemons/$LABEL.plist"
SERVER_LOG="$BASE/home/logs/server.log"
LOG=/var/log/recursicachat/rc-deploy.log
URL=http://127.0.0.1:3100
BUILD_NODE=@BUILD_NODE@
APP_OWNER=root:wheel
HEALTH_WAIT=180
LINES_WAIT=60
if [ "$(id -u)" = 0 ]; then
  OWNER="${SUDO_USER:-}"
  [ -n "$OWNER" ] && [ "$OWNER" != root ] || { echo "rc-deploy: run it with sudo from the owner's account"; exit 2; }
  as_owner() { sudo -u "$OWNER" -H "$@"; }
  mkdir -p "$(dirname "$LOG")"
else
  # Only the kit's tests run it without root, with stand-ins for launchctl and curl.
  [ -n "${RC_DEPLOY_TEST:-}" ] || { echo "rc-deploy: run it with sudo"; exit 2; }
  # never the real server's job or port, even if a stand-in is missing
  BASE="$RC_DEPLOY_BASE" PLIST="$RC_DEPLOY_BASE/server.plist" SERVER_LOG="$RC_DEPLOY_BASE/server.log" LOG="$RC_DEPLOY_BASE/rc-deploy.log"
  LABEL=test.rc-deploy URL=http://127.0.0.1:9
  BUILD_NODE="$RC_DEPLOY_NODE" APP_OWNER="$(id -un):$(id -gn)" HEALTH_WAIT="${RC_DEPLOY_HEALTH_WAIT:-5}" LINES_WAIT="${RC_DEPLOY_LINES_WAIT:-3}"
  as_owner() { "$@"; }
fi
APP="$BASE/app"
PREV="$BASE/app.prev"
START=$(date +%s)
log() { echo "$(date -u +%FT%TZ) $1" >> "$LOG"; }
short() { printf '%s' "${1:0:7}"; }

LOCK="$BASE/.rc-deploy.lock"
mkdir "$LOCK" 2>/dev/null || { echo "rc-deploy: another rc-deploy is running (or $LOCK was left behind: remove it if not)"; exit 1; }
WORK=""
cleanup() { rmdir "$LOCK" 2>/dev/null; [ -z "$WORK" ] || rm -rf "$WORK"; }
trap cleanup EXIT

# Before anything changes.
before() {
  log "FAILED at $1: $2"
  echo "rc-deploy: FAILED at $1: $2. Nothing changed. Log: $LOG"
  exit 1
}

# The running app: its commit, branch and repository.
[ -f "$APP/REVISION" ] || before "start" "no $APP/REVISION"
OLD="$(sed -n 's/^commit //p' "$APP/REVISION")"
BRANCH="$(sed -n 's/^branch //p' "$APP/REVISION")"
REPO="$(sed -n 's/^repo //p' "$APP/REVISION")"
[[ "$OLD" =~ ^[0-9a-f]{40}$ ]] || before "start" "the running app's REVISION names no commit"
[[ "$BRANCH" =~ ^[A-Za-z0-9._/-]+$ ]] || before "start" "the running app's REVISION names no branch"
[[ "$REPO" =~ ^(https://[A-Za-z0-9.-]+/[A-Za-z0-9._/-]+|/[A-Za-z0-9._/-]+)$ ]] || before "start" "the running app's REVISION names no repository"
[ -x "$BUILD_NODE" ] || before "start" "no Node at $BUILD_NODE"
log "rc-deploy: running $(short "$OLD"), building the latest $BRANCH of $REPO"

# 1. Build, as the owner.
WORK="$(as_owner mktemp -d "${TMPDIR:-/tmp}/rc-deploy.XXXXXX")" || before "build" "could not make a build folder"
if ! as_owner env PATH="$(dirname "$BUILD_NODE"):/usr/bin:/bin:/usr/sbin:/sbin" \
  bash -s -- "$WORK" "$REPO" "$BRANCH" "$OLD" >> "$LOG" 2>&1 <<'BUILD'; then
set -euo pipefail
W="$1" REPO="$2" BRANCH="$3" RUNNING="$4"
git clone -q --depth 1 --branch "$BRANCH" "$REPO" "$W/src"
cd "$W/src"
git rev-parse HEAD > "$W/commit"
# the same commit as the running one: nothing to build
if [ "$(cat "$W/commit")" = "$RUNNING" ]; then exit 0; fi
npm ci --ignore-scripts --no-audit --no-fund
npx tsc -p server --noEmit
npx tsc -p web --noEmit
npm run build
npm prune --omit=dev --no-audit --no-fund
mkdir "$W/stage"
git archive HEAD | tar -x -C "$W/stage"
cp -R web/dist "$W/stage/web/dist"
cp -R node_modules "$W/stage/node_modules"
printf 'commit %s\nbranch %s\nrepo %s\nnode %s\nbuilt %s by %s with npm ci --ignore-scripts, npm run build, npm prune --omit=dev (rc-deploy)\n' \
  "$(cat "$W/commit")" "$BRANCH" "$REPO" "$(node -v)" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$(id -un)" > "$W/stage/REVISION"
cd "$W/stage"
if find . -type l -exec readlink {} \; | grep -q '^/'; then echo "the stage holds an absolute link"; exit 1; fi
find . -type f -print0 | LC_ALL=C sort -z | xargs -0 shasum -a 256 > "$W/manifest"
BUILD
  before "build" "the build failed (the log says where)"
fi
NEW="$(cat "$WORK/commit" 2>/dev/null)"
[[ "$NEW" =~ ^[0-9a-f]{40}$ ]] || before "build" "the clone named no commit"
if [ "$NEW" = "$OLD" ]; then
  log "already at $(short "$NEW")"
  echo "rc-deploy: already at $(short "$NEW") ($BRANCH). Nothing to do."
  exit 0
fi
[ -f "$WORK/manifest" ] && [ -f "$WORK/stage/REVISION" ] || before "build" "the build made no stage"
log "built $(short "$NEW"): $(wc -l < "$WORK/manifest" | tr -d ' ') files"

# The sign-in and tools lines the previous start printed, to compare with the new start's.
want_lines() { grep -E '^(Sign-in with Google:|Tools: )' "$1" 2>/dev/null | awk '{ k = $1 " " $2; last[k] = $0 } END { for (k in last) print last[k] }' | sort; }
WANT="$(want_lines "$SERVER_LOG")"
[ -n "$WANT" ] || WANT="$(printf 'Sign-in with Google:')"

# Starts the server and checks it: /healthz, then the lines. Prints why it failed.
start_and_check() {
  local from i got
  from=$(($(wc -c < "$SERVER_LOG" 2>/dev/null || echo 0) + 1))
  launchctl bootstrap system "$PLIST" >> "$LOG" 2>&1 || { echo "launchd did not start the server"; return 1; }
  for ((i = 0; i < HEALTH_WAIT; i += 2)); do
    [ "$(curl -fsS -m 2 "$URL/healthz" 2>/dev/null)" = ok ] && break
    sleep 2
  done
  [ "$(curl -fsS -m 2 "$URL/healthz" 2>/dev/null)" = ok ] || { echo "/healthz did not answer ok within ${HEALTH_WAIT}s"; return 1; }
  [ "${1:-}" = health-only ] && return 0
  for ((i = 0; i <= LINES_WAIT; i += 2)); do
    got="$(tail -c "+$from" "$SERVER_LOG" 2>/dev/null > "$WORK/new.log"; want_lines "$WORK/new.log")"
    [ "$(comm -23 <(printf '%s\n' "$WANT") <(printf '%s\n' "$got") | grep -c .)" = 0 ] && return 0
    sleep 2
  done
  echo "the new start didn't print the same sign-in and tools lines as the last one"
  return 1
}

# After the server stopped: puts the previous app back, starts it, and reports.
after() {
  local why="$1: $2" up
  log "FAILED at $why; rolling back to $(short "$OLD")"
  launchctl bootout "system/$LABEL" >> "$LOG" 2>&1
  if [ -d "$PREV" ]; then
    rm -rf "$BASE/app.bad"
    [ ! -e "$APP" ] || mv "$APP" "$BASE/app.bad"
    mv "$PREV" "$APP"
  fi
  if up="$(start_and_check health-only)"; then
    log "rolled back to $(short "$OLD"); /healthz ok"
    echo "rc-deploy: FAILED at $why. Rolled back to $(short "$OLD"), /healthz ok; the failed copy is app.bad. Log: $LOG"
    exit 1
  fi
  log "the rollback failed too: $up"
  echo "rc-deploy: FAILED at $why, and the rollback to $(short "$OLD") failed too ($up). Log: $LOG"
  exit 3
}

# 2. Swap.
log "stopping the server"
launchctl bootout "system/$LABEL" >> "$LOG" 2>&1 || log "the server was not running"
rm -rf "$PREV" || after "swap" "could not remove the older app.prev"
mv "$APP" "$PREV" || after "swap" "could not move the running app aside"
install -d -m 755 "$APP" && cp -R "$WORK/stage/." "$APP/" || after "swap" "could not copy the stage in"
chown -R -h "$APP_OWNER" "$APP" && chmod -R go-w "$APP" || after "swap" "could not make the app root-owned and read-only"

# 3. Check, file by file.
(cd "$APP" && find . -type f -print0 | LC_ALL=C sort -z | xargs -0 shasum -a 256) > "$WORK/installed" || after "check" "could not read the app"
cmp -s "$WORK/installed" "$WORK/manifest" || after "check" "the app doesn't match the build file by file"
[ -z "$(find "$APP" \( ! -user "${APP_OWNER%%:*}" -o -perm -g+w -o -perm -o+w \) -print | head -1)" ] || after "check" "something in the app isn't root-owned, or others can write it"
[ "$(sed -n 's/^commit //p' "$APP/REVISION")" = "$NEW" ] || after "check" "the app's REVISION doesn't name the built commit"

# 4. Start and check.
log "starting $(short "$NEW")"
why="$(start_and_check)" || after "start" "$why"
log "deployed $(short "$NEW"); /healthz ok; sign-in and tools lines as before"
echo "rc-deploy: $(short "$OLD") -> $(short "$NEW") ($BRANCH) deployed and checked: file by file, /healthz, sign-in and tools lines, in $(($(date +%s) - START))s. The previous app is app.prev."
