#!/bin/bash
# rc-clear: empties the RecursicaChat 2.0 server's work, for a fresh start while agents are built.
# install.sh installs it as /opt/recursicachat/bin/rc-clear.sh, root:wheel 755, linked as
# /usr/local/bin/rc-clear, with rc-clear.mjs beside it for the database work. Run it as root:
#
#   sudo rc-clear
#
# It prints one summary line; every step's output goes to /var/log/recursicachat/rc-clear.log.
#
# The work is every chat with its members and read marks, messages, tasks and plans, files and the
# text read from them, deliveries, service requests, approvals, engine sessions and chat memories.
# People and their profiles, agents, the vault, apps and access, service accounts, the tool log and
# the cost totals stay. rc-clear.mjs lists the tables. No table is ever dropped.
#
# 1. Check, before anything changes. rc-clear refuses when a trigger, a bridge or a chat grant
#    points at a chat, and when the database has a table rc-clear.mjs does not list.
# 2. Stop each program that drives an agent, then the server.
# 3. Copy the database, the stored files and each program's state to /var/root/rc-work-<time>/.
#    Then delete the copies older than 7 days.
# 4. Delete the work's rows, children first, in one transaction. The transaction also checks that
#    every kept table has the rows it had, and undoes itself otherwise.
# 5. Remove the stored files, and clear each program's state.
# 6. Start the server, wait for /healthz, then start each program.
# A failure before step 4 ends deletes no work: the server and the programs start again.
#
# The programs come from site.json's recursicachat.services, through install.sh. Each entry with a
# "job" is stopped and started as that launchd job. Its "state" folder, when set, is copied and
# cleared. The server's account does all the work inside the data folder, and each program's
# account inside its state folder. Root writes only in /var/root and the log.
set -uo pipefail
umask 077

BASE=/opt/recursicachat
ACCOUNT=_recursicachat
NODE=/opt/recursicachat/node/v24.22.3/bin/node
LABEL=io.recursica.recursicachat
DAEMONS=/Library/LaunchDaemons
COPIES=/var/root
LOG=/var/log/recursicachat/rc-clear.log
URL=http://127.0.0.1:3100
# One "<name>:<launchd job>:<account>:<state folder>" for each program, with a space between two.
PROGRAMS="@PROGRAMS@"
KEEP_DAYS=7
STOP_WAIT=30
HEALTH_WAIT=180
if [ -n "${RC_CLEAR_TEST:-}" ]; then
  # The kit's tests, as any account, with stand-ins for launchctl and curl: never the real server's
  # job, port or folders, even if a stand-in is missing. sudo hands a command none of the caller's
  # settings, so sudo rc-clear never takes this branch.
  BASE="$RC_CLEAR_BASE" NODE="$RC_CLEAR_NODE" TOOL="$RC_CLEAR_TOOL" LABEL=test.rc-clear URL=http://127.0.0.1:9
  DAEMONS="$RC_CLEAR_BASE/daemons" COPIES="$RC_CLEAR_BASE/copies" LOG="$RC_CLEAR_BASE/rc-clear.log"
  PROGRAMS="${RC_CLEAR_PROGRAMS:-}" STOP_WAIT="${RC_CLEAR_STOP_WAIT:-3}" HEALTH_WAIT="${RC_CLEAR_HEALTH_WAIT:-4}"
  as() { shift; "$@"; }
elif [ "$(id -u)" = 0 ]; then
  export PATH=/usr/bin:/bin:/usr/sbin:/sbin
  TOOL="$BASE/bin/rc-clear.mjs"
  # Runs a command as an account: as <account> <command> [args...]
  as() { local who="$1"; shift; sudo -u "$who" -H "$@"; }
  mkdir -p "$(dirname "$LOG")"
else
  echo "rc-clear: run it with sudo"
  exit 2
fi
DATA="$BASE/data"
DB="$DATA/circlechat.db"
# The folders this command makes in $COPIES, and no other folder: rc-work-<date>-<time>.
COPY_NAME='rc-work-[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]-[0-9][0-9][0-9][0-9][0-9][0-9]'
SAVE="" TMPDB=""
# An account must be able to read the folder its commands start in.
cd / || exit 2
log() { echo "$(date -u +%FT%TZ) $1" >> "$LOG"; }

LOCK="$BASE/.rc-clear.lock"
[ ! -e "$BASE/.rc-deploy.lock" ] || { echo "rc-clear: rc-deploy is running. Nothing changed."; exit 1; }
mkdir "$LOCK" 2>/dev/null || { echo "rc-clear: another rc-clear is running (or $LOCK was left behind: remove it if not)"; exit 1; }
trap 'rmdir "$LOCK" 2>/dev/null' EXIT

# One program's values, from its entry in $PROGRAMS.
program() { IFS=: read -r name job account state <<<"$1"; }
loaded() { launchctl print "system/$1" >/dev/null 2>&1; }
answers() { [ "$(curl -fsS -m 2 "$URL/healthz" 2>/dev/null)" = ok ]; }
# A program's state folder: a real folder, not a link, that belongs to the program's account.
state_ok() { as "$1" test -d "$2" && ! as "$1" test -L "$2" && as "$1" test -O "$2"; }
# How many files a folder holds, counted by the account that owns the folder.
files_in() { as "$1" find "$2" -type f 2>/dev/null | wc -l | tr -d ' '; }

# Before anything changes.
before() {
  log "FAILED at $1: $2"
  echo "rc-clear: FAILED at $1: $2. Nothing changed. Log: $LOG"
  exit 1
}

# 1. Check.
[ -f "$DB" ] || before "start" "no database at $DB"
[ -x "$NODE" ] || before "start" "no Node at $NODE"
[ -f "$TOOL" ] || before "start" "no $TOOL"
[ -f "$DAEMONS/$LABEL.plist" ] || before "start" "no $DAEMONS/$LABEL.plist"
for p in $PROGRAMS; do
  program "$p"
  [ -f "$DAEMONS/$job.plist" ] || before "start" "$name has no $DAEMONS/$job.plist"
  [ -z "$state" ] || state_ok "$account" "$state" || before "start" "$name's state folder $state is missing, is a link, or does not belong to $account"
done
found="$(as "$ACCOUNT" "$NODE" "$TOOL" check "$DB" 2>> "$LOG")"
case $? in
  0) ;;
  3)
    log "REFUSED. $found"
    echo "rc-clear: REFUSED. $found Nothing changed."
    exit 1
    ;;
  *) before "check" "could not read the database (the log says why)" ;;
esac
log "rc-clear: the work is $(sed -n 's/^work //p' <<<"$found"); to keep: $(sed -n 's/^kept //p' <<<"$found")"

# Stops one job, and waits until launchd no longer has it.
stop() {
  local i
  launchctl bootout "system/$1" >> "$LOG" 2>&1 || log "$1 was not running, or is still stopping"
  for ((i = 0; i < STOP_WAIT; i++)); do
    loaded "$1" || return 0
    sleep 1
  done
  return 1
}
# Starts one job, unless launchd has it.
start() { loaded "$1" || launchctl bootstrap system "$DAEMONS/$1.plist" >> "$LOG" 2>&1; }
# Starts the server, waits for /healthz, then starts each program. Prints why it failed.
start_all() {
  local i p
  start "$LABEL" || { echo "launchd did not start the server"; return 1; }
  for ((i = 0; i < HEALTH_WAIT; i += 2)); do
    answers && break
    sleep 2
  done
  answers || { echo "/healthz did not answer ok within ${HEALTH_WAIT}s"; return 1; }
  for p in $PROGRAMS; do
    program "$p"
    start "$job" || { echo "launchd did not start $name"; return 1; }
  done
}

# After the stop, and before the work's rows are deleted: starts everything again, and reports.
back() {
  local why="$1: $2" up
  log "FAILED at $why; no work was deleted"
  [ -z "$TMPDB" ] || as "$ACCOUNT" rm -f "$TMPDB" >> "$LOG" 2>&1
  [ -z "$SAVE" ] || rm -rf "$SAVE"
  if up="$(start_all)"; then
    log "the server and the programs were started again"
    echo "rc-clear: FAILED at $why. No work was deleted; the server and the programs were started again. Log: $LOG"
    exit 1
  fi
  log "the restart failed too: $up"
  echo "rc-clear: FAILED at $why. No work was deleted, and the restart failed too ($up). Log: $LOG"
  exit 3
}

# 2. Stop each program, then the server.
log "stopping the programs, then the server"
for p in $PROGRAMS; do
  program "$p"
  stop "$job" || back "stop" "$name did not stop within ${STOP_WAIT}s"
done
stop "$LABEL" || back "stop" "the server did not stop within ${STOP_WAIT}s"
! answers || back "stop" "the server still answers"

# 3. Copy aside. Each account writes a stream, and root saves the stream in a folder only root opens.
STAMP="$(date +%Y%m%d-%H%M%S)"
mkdir -m 700 "$COPIES/rc-work-$STAMP" 2>> "$LOG" || back "copy" "could not make $COPIES/rc-work-$STAMP"
SAVE="$COPIES/rc-work-$STAMP"
TMPDB="$DATA/.rc-clear-$STAMP.db"
size="$(as "$ACCOUNT" "$NODE" "$TOOL" copy "$DB" "$TMPDB" 2>> "$LOG")" || back "copy" "could not copy the database (the log says why)"
as "$ACCOUNT" cat "$TMPDB" > "$SAVE/circlechat.db" 2>> "$LOG" || back "copy" "could not save the database's copy"
[ "$(wc -c < "$SAVE/circlechat.db" | tr -d ' ')" = "$size" ] || back "copy" "the database's copy is not whole"
as "$ACCOUNT" rm -f "$TMPDB" >> "$LOG" 2>&1
TMPDB=""
stored=0
if as "$ACCOUNT" test -d "$DATA/files"; then
  as "$ACCOUNT" tar -C "$DATA" -cf - files 2>> "$LOG" | tar -C "$SAVE" -xf - 2>> "$LOG" || back "copy" "could not copy the stored files"
  stored="$(files_in "$ACCOUNT" "$DATA/files")"
  [ "$(find "$SAVE/files" -type f | wc -l | tr -d ' ')" = "$stored" ] || back "copy" "the stored files' copy is not whole"
fi
for p in $PROGRAMS; do
  program "$p"
  [ -n "$state" ] || continue
  mkdir -m 700 "$SAVE/state-$name" 2>> "$LOG" || back "copy" "could not make a folder for $name's state"
  as "$account" tar -C "$state" -cf - . 2>> "$LOG" | tar -C "$SAVE/state-$name" -xf - 2>> "$LOG" || back "copy" "could not copy $name's state"
  [ "$(find "$SAVE/state-$name" -type f | wc -l | tr -d ' ')" = "$(files_in "$account" "$state")" ] || back "copy" "the copy of $name's state is not whole"
done
log "copied the database ($size bytes), $stored stored files and the programs' state to $SAVE"
# The new copy is whole, so the copies older than $KEEP_DAYS days go.
pruned=0
while IFS= read -r old; do
  [ -n "$old" ] && [ "$old" != "$SAVE" ] || continue
  rm -rf "$old" && pruned=$((pruned + 1)) && log "deleted the copy $old, older than $KEEP_DAYS days"
done < <(find "$COPIES" -maxdepth 1 -type d -name "$COPY_NAME" -mmin "+$((KEEP_DAYS * 1440))" 2>> "$LOG")

# 4. Delete the work's rows, in one transaction.
cleared="$(as "$ACCOUNT" "$NODE" "$TOOL" clear "$DB" 2>> "$LOG")"
case $? in
  0) ;;
  3) back "delete" "${cleared%.}" ;;
  *) back "delete" "the delete failed and was undone (the log says why)" ;;
esac
emptied="$(sed -n 's/^emptied //p' <<<"$cleared")"
kept="$(sed -n 's/^kept //p' <<<"$cleared")"
log "emptied $emptied; kept $kept"

# The rows are gone, so every step from here runs, and a failure is reported at the end.
problems=""
problem() {
  log "FAILED after the delete: $1"
  problems="${problems:+$problems; }$1"
}

# 5. Remove the stored files (the folder stays), and clear each program's state.
if as "$ACCOUNT" test -d "$DATA/files"; then
  as "$ACCOUNT" find "$DATA/files" -type f -name 'f_*' -delete >> "$LOG" 2>&1 || problem "could not remove every stored file"
fi
started=""
for p in $PROGRAMS; do
  program "$p"
  started="${started:+$started, }$name"
  [ -n "$state" ] || continue
  as "$account" find "$state" -mindepth 1 -delete >> "$LOG" 2>&1 || problem "could not clear $name's state"
done

# 6. Start the server, then each program.
up="$(start_all)" || problem "$up"

line="rc-clear: emptied $emptied; kept $kept."
if [ -z "$problems" ]; then
  line="$line The server answers ok${started:+; started $started}."
else
  line="$line FAILED after the delete: $problems. Log: $LOG."
fi
line="$line The copy is $SAVE."
[ "$pruned" = 0 ] || line="$line Copies older than $KEEP_DAYS days deleted: $pruned."
log "$line"
echo "$line"
[ -z "$problems" ]
