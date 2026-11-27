#!/usr/bin/env bash
# Load the guard's new pf rules on a Mac, with an automatic undo. The new rules refuse a Tailscale
# source on a physical interface, then pass Tailscale's addresses with no interface named, so a new
# utun number keeps Tailscale working (pf-base.conf). Run as root, over Tailscale:
#
#   sudo pf-apply-tailnet.sh [--site <site.json>]   load the new rules; undo in 5 minutes
#   sudo pf-apply-tailnet.sh --confirm              keep the new rules, from a NEW session
#   sudo pf-apply-tailnet.sh --undo                 put the old rules back now
#   sudo pf-apply-tailnet.sh --status               show what is pending
#
# The apply renders pf-base.conf and pf-lockdown.conf as install-cluster.sh does (rules.sh), checks
# both with pfctl -n, keeps the installed /var/lib/agent-cluster/pf-base.conf as the undo copy, and
# loads the new base rules into the agentguard anchor. The installed files stay the old ones until
# --confirm, so a restart in the 5 minutes comes back with the old rules.
# The undo is a one-shot launchd job, io.recursica.pf-apply-undo, so the undo runs when the terminal,
# the SSH session or the RustDesk session closes. After 5 minutes with no --confirm, the job loads
# the undo copy back into the anchor, logs the undo and deletes the job's plist.
# The undo and --confirm act only while the anchor still holds the rules the apply loaded. The guard
# loads pf-lockdown.conf at a cut-off and the installed pf-base.conf at a release, and the boot job
# loads the installed pf-base.conf at each start-up. After any of those loads, the undo leaves the
# anchor as it is, and --confirm refuses.
# Each step prints one line and adds the line to /var/lib/agent-cluster/pf-apply.log.
#
# AGENT_CLUSTER_DIR, LAUNCHD_DIR, CLUSTER_CONF and PF_APPLY_WAIT are for the tests. sudo drops them.
set -euo pipefail

CLUSTER_DIR="${AGENT_CLUSTER_DIR:-/var/lib/agent-cluster}"
PLIST_DIR="${LAUNCHD_DIR:-/Library/LaunchDaemons}"
CONF="${CLUSTER_CONF:-/etc/agent-cluster.conf}"
WAIT="${PF_APPLY_WAIT:-300}"
ANCHOR=agentguard
LABEL=io.recursica.pf-apply-undo
PLIST="$PLIST_DIR/$LABEL.plist"
STATE="$CLUSTER_DIR/pf-apply"
LAST="$CLUSTER_DIR/pf-apply.last"
LOCK="$CLUSTER_DIR/pf-apply.lock"
LOG="$CLUSTER_DIR/pf-apply.log"
TIMER_COPY="$CLUSTER_DIR/pf-apply-undo.sh"
INSTALLED_BASE="$CLUSTER_DIR/pf-base.conf"
INSTALLED_LOCKDOWN="$CLUSTER_DIR/pf-lockdown.conf"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SELF="$HERE/$(basename "${BASH_SOURCE[0]}")"
QUIET=""   # the undo job writes only to the log

log() { printf '%s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*" >>"$LOG" 2>/dev/null || true; }
say() { [ -n "$QUIET" ] || printf '%s\n' "$*"; log "$*"; }
die() { printf '%s\n' "$*" >&2; log "refused: $*"; exit 1; }
clock() { date -r "$1" +%H:%M 2>/dev/null || date -d "@$1" +%H:%M; }

take_lock() {
  local i=0 pid
  while ! mkdir "$LOCK" 2>/dev/null; do
    pid="$(cat "$LOCK/pid" 2>/dev/null || true)"
    if [ -n "$pid" ] && ! kill -0 "$pid" 2>/dev/null; then rm -rf "$LOCK"; continue; fi
    i=$((i + 1))
    [ "$i" -lt 30 ] || die "Another run of pf-apply-tailnet.sh holds $LOCK. Try again in a minute."
    sleep 1
  done
  echo $$ >"$LOCK/pid"
  trap 'rm -rf "$LOCK"' EXIT
}

anchor_rules() { pfctl -a "$ANCHOR" -sr 2>/dev/null || true; }
new_rules_loaded() { [ -s "$STATE/loaded.rules" ] && [ "$(anchor_rules)" = "$(cat "$STATE/loaded.rules")" ]; }

# 0 when the address is a Tailscale address: 100.64.0.0/10 or fd7a:115c:a1e0::/48.
tailnet_address() {
  local a second
  a="$(printf '%s' "$1" | tr 'A-F' 'a-f')"
  a="${a#::ffff:}"
  case "$a" in fd7a:115c:a1e0:*) return 0 ;; esac
  case "$a" in 100.*.*.*) ;; *) return 1 ;; esac
  second="${a#100.}"; second="${second%%.*}"
  case "$second" in '' | *[!0-9]*) return 1 ;; esac
  [ "$second" -ge 64 ] && [ "$second" -le 127 ]
}

# The address the session connects from: SSH_CONNECTION's first field, or the host who -m prints.
# Empty for a terminal on the Mac's own screen, such as a RustDesk session's terminal.
session_client() {
  if [ -n "${SSH_CONNECTION:-}" ]; then printf '%s\n' "${SSH_CONNECTION%% *}"; return; fi
  who -m 2>/dev/null | sed -n 's/.*(\([0-9A-Fa-f:.]*\)).*/\1/p' | head -1
}

cancel_timer() {
  launchctl bootout "system/$LABEL" >/dev/null 2>&1 || true
  rm -f "$PLIST"
}

# Moves the apply's files to pf-apply.last, where the undo copy stays for reference.
finish() {
  rm -rf "$LAST"
  mv "$STATE" "$LAST"
  rm -f "$PLIST"
}

# undo_now <reason> [force]: force loads the undo copy even when the anchor's rules can't be compared.
undo_now() {
  if [ -n "${2:-}" ] || new_rules_loaded; then
    if pfctl -a "$ANCHOR" -f "$STATE/old-base.conf" >/dev/null 2>&1; then
      say "Undo ($1): loaded the old rules, $LAST/old-base.conf, back into the $ANCHOR anchor."
    else
      say "Undo ($1) FAILED: pfctl could not load $STATE/old-base.conf. Load the rules by hand: pfctl -a $ANCHOR -f $INSTALLED_BASE"
      return 1
    fi
  else
    say "Undo ($1): the $ANCHOR anchor no longer holds the new rules, so the anchor stays as it is. The guard's lockdown or release, or a restart, loaded other rules."
  fi
  finish
  say "The installed rules, $INSTALLED_BASE, are the old ones. The boot job loads them at each start-up."
}

usage() { sed -n '6,9p' "$SELF" | sed 's/^# \{0,1\}//'; exit 2; }

apply() {
  local site="" tmp old_ssh owner_home
  while [ $# -gt 0 ]; do
    case "$1" in --site) site="${2:?--site needs the path of site.json}"; shift 2 ;; *) usage ;; esac
  done
  take_lock
  [ ! -e "$STATE/pending" ] || die "An apply is pending since $(cat "$STATE/pending"). Confirm it with --confirm or end it with --undo first."
  [ -f "$INSTALLED_BASE" ] || die "No installed rules in $INSTALLED_BASE. Run install-cluster.sh first."
  if [ -f "$CLUSTER_DIR/lockdown.json" ] && ! grep -Eq '"status": *"normal"' "$CLUSTER_DIR/lockdown.json"; then
    die "The guard has a lockdown open ($CLUSTER_DIR/lockdown.json). Release the lockdown first."
  fi
  if grep -Eq '^block( drop| return)? out( .*)? all$' <<<"$(anchor_rules)"; then
    die "The $ANCHOR anchor holds the lockdown rules. Release the lockdown first."
  fi
  # node and site.json, as install-cluster.sh found them: sudo's PATH has no node. site.json is in
  # the owner's ~/recursica-stack, or in ~/circlechat before the move (kit/stack-paths.sh). Sourced
  # here, not at the top: the undo job runs a copy of this script outside the kit checkout.
  if [ -f "$CONF" ]; then
    PATH="$(sed -n 's/^PATH=//p' "$CONF" | tail -1):$PATH"
    owner_home="$(sed -n 's/^OWNER_HOME=//p' "$CONF" | tail -1)"
    if [ -z "$site" ] && [ -n "$owner_home" ]; then
      # shellcheck source=circlechat/kit/stack-paths.sh
      . "$HERE/../../kit/stack-paths.sh"
      site="$(stack_dir "$owner_home")/site.json"
    fi
  fi
  if [ -z "$site" ] || [ ! -f "$site" ]; then die "No site.json at ${site:-a known path}. Pass the path: --site <site.json>."; fi
  command -v node >/dev/null || die "node is not on the PATH, and $CONF names no PATH with node."

  tmp="$CLUSTER_DIR/pf-apply.new"
  rm -rf "$tmp"; mkdir -m 700 "$tmp"
  # shellcheck source=circlechat/cluster/firewall/rules.sh
  . "$HERE/rules.sh" "$site"
  pf_rules base >"$tmp/new-base.conf"
  pf_rules lockdown >"$tmp/new-lockdown.conf"
  say "Rendered the new rules from $HERE with $site."
  if cmp -s "$tmp/new-base.conf" "$INSTALLED_BASE" && cmp -s "$tmp/new-lockdown.conf" "$INSTALLED_LOCKDOWN"; then
    rm -rf "$tmp"
    say "The installed rules are the new rules already. Nothing to apply."
    return 0
  fi
  local f err
  for f in new-base new-lockdown; do
    err="$(pfctl -n -a "$ANCHOR" -f "$tmp/$f.conf" 2>&1)" || { rm -rf "$tmp"; die "pfctl rejects $f.conf, so nothing changed: $err"; }
  done
  say "Checked the new base and lockdown rules with pfctl -n: both parse."
  say "The change to the base rules:"
  diff "$INSTALLED_BASE" "$tmp/new-base.conf" | sed 's/^/  /' || true

  cp "$INSTALLED_BASE" "$tmp/old-base.conf"
  old_ssh="${SSH_CONNECTION:-}"
  printf '%s\n' "$old_ssh" >"$tmp/ssh"
  local deadline
  deadline=$(( $(date +%s) + WAIT ))
  echo "$deadline" >"$tmp/deadline"
  date -u +%Y-%m-%dT%H:%M:%SZ >"$tmp/pending"
  rm -rf "$STATE"; mv "$tmp" "$STATE"
  say "Saved the undo copy: $STATE/old-base.conf."

  # The undo job first, so the undo is armed before the new rules load.
  cp "$SELF" "$TIMER_COPY.new" && chmod 700 "$TIMER_COPY.new" && mv -f "$TIMER_COPY.new" "$TIMER_COPY"
  launchctl bootout "system/$LABEL" >/dev/null 2>&1 || true
  cat >"$PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key><array><string>/bin/bash</string><string>$TIMER_COPY</string><string>--timer</string></array>
  <key>EnvironmentVariables</key><dict><key>AGENT_CLUSTER_DIR</key><string>$CLUSTER_DIR</string><key>LAUNCHD_DIR</key><string>$PLIST_DIR</string><key>PATH</key><string>/usr/sbin:/usr/bin:/sbin:/bin</string></dict>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><dict><key>SuccessfulExit</key><false/></dict>
  <key>StandardOutPath</key><string>/dev/null</string>
  <key>StandardErrorPath</key><string>$LOG</string>
</dict></plist>
PLIST
  if ! launchctl bootstrap system "$PLIST" >/dev/null 2>&1; then
    rm -f "$PLIST"; finish
    die "launchctl could not start the undo job, so no rules changed."
  fi
  say "Armed the undo: the launchd job $LABEL puts the old rules back at $(clock "$deadline")."

  if ! err="$(pfctl -a "$ANCHOR" -f "$STATE/new-base.conf" 2>&1)"; then
    cancel_timer; finish
    die "pfctl could not load the new rules, so the old rules stay: $err"
  fi
  anchor_rules >"$STATE/loaded.rules"
  if [ ! -s "$STATE/loaded.rules" ]; then
    cancel_timer
    undo_now "pfctl -sr could not read the new rules back" force
    exit 1
  fi
  say "Loaded the new rules into the $ANCHOR anchor. The installed rules stay the old ones until --confirm."
  say "Next: open a NEW RustDesk or SSH session over Tailscale, and in that session run: sudo $SELF --confirm"
  say "With no --confirm by $(clock "$deadline"), the old rules come back."
}

confirm() {
  local client
  take_lock
  [ -e "$STATE/pending" ] || die "No apply is pending. Run the apply first."
  client="$(session_client)"
  if [ -n "$client" ]; then
    tailnet_address "$client" || die "This session comes from $client, outside Tailscale (100.64.0.0/10, fd7a:115c:a1e0::/48). Confirm from a session over Tailscale."
    if [ -n "${SSH_CONNECTION:-}" ] && [ "$SSH_CONNECTION" = "$(cat "$STATE/ssh")" ]; then
      die "This is the SSH session that ran the apply. Open a NEW session over Tailscale and confirm there."
    fi
    say "This session comes from $client, a Tailscale address."
  else
    say "This session has no SSH address: a terminal on the Mac's own screen, such as RustDesk's."
  fi
  new_rules_loaded || die "The $ANCHOR anchor no longer holds the new rules: the guard's lockdown or release, or a restart, loaded other rules. Run --undo to end the apply, then apply again."
  cancel_timer
  say "Cancelled the undo job $LABEL."
  local f
  for f in base lockdown; do
    cp "$STATE/new-$f.conf" "$CLUSTER_DIR/pf-$f.conf.new" && chmod 644 "$CLUSTER_DIR/pf-$f.conf.new"
    mv -f "$CLUSTER_DIR/pf-$f.conf.new" "$CLUSTER_DIR/pf-$f.conf"
  done
  say "Installed the new rules as $INSTALLED_BASE and $INSTALLED_LOCKDOWN. The boot job loads the new base rules at each start-up."
  finish
  say "Confirmed. The old rules stay in $LAST/old-base.conf."
}

undo() {
  take_lock
  [ -e "$STATE/pending" ] || die "No apply is pending, so nothing to undo."
  cancel_timer
  say "Cancelled the undo job $LABEL."
  undo_now "asked with --undo"
}

timer() {
  QUIET=1
  while :; do
    [ -e "$STATE/pending" ] || exit 0
    [ "$(date +%s)" -lt "$(cat "$STATE/deadline" 2>/dev/null || echo 0)" ] || break
    sleep 5
  done
  take_lock
  [ -e "$STATE/pending" ] || exit 0
  undo_now "no --confirm by $(clock "$(cat "$STATE/deadline")")"
}

status() {
  if [ ! -e "$STATE/pending" ]; then
    say "No apply is pending."
    if grep -qxF 'pass in quick inet from 100.64.0.0/10' "$INSTALLED_BASE" 2>/dev/null; then
      say "The installed rules, $INSTALLED_BASE, pass Tailscale from any utun number."
    else
      say "The installed rules, $INSTALLED_BASE, pass Tailscale only on named utun interfaces, or are missing."
    fi
    return 0
  fi
  local deadline left
  deadline="$(cat "$STATE/deadline")"; left=$(( deadline - $(date +%s) ))
  [ "$left" -ge 0 ] || left=0
  say "An apply is pending since $(cat "$STATE/pending"). The undo runs at $(clock "$deadline"), in $((left / 60)) min $((left % 60)) s."
  if new_rules_loaded; then say "The $ANCHOR anchor holds the new rules."; else say "The $ANCHOR anchor no longer holds the new rules."; fi
  if launchctl print "system/$LABEL" >/dev/null 2>&1; then say "The undo job $LABEL is loaded."; else say "The undo job $LABEL is NOT loaded: run --undo or --confirm."; fi
  say "The installed rules, $INSTALLED_BASE, are the old ones until --confirm."
}

[ "$(id -u)" -eq 0 ] || die "Run as root: sudo $SELF ${1:-}"
mkdir -p "$CLUSTER_DIR"
case "${1:-}" in
  "" | --site) apply "$@" ;;
  --confirm) confirm ;;
  --undo) undo ;;
  --status) status ;;
  --timer) timer ;;
  *) usage ;;
esac
