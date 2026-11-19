#!/usr/bin/env bash
# Keep a member session fresh for each program outside the stack's RecursicaChat 2.0 server that
# uses the server's API, from site.json's recursicachat.sessions (circlechat/README.md, "A session
# for a program outside the server"). setup-host.sh installs the job, which runs as root.
# Usage: rc-session.sh [--once]      --once makes each session once, then stops
#
# The server's API has no token for a program. Its root-only CLI makes a session for a member
# account, at most 60 minutes long, and refuses one for an owner or an admin (cli.ts session). So
# every RC_SESSION_EVERY seconds (2700, 45 minutes, by default) this job makes a 60-minute session
# for each entry and writes it to the entry's file:
#   - The file's folder must belong to root, and no other account may change it. The program's
#     account cannot swap the file or the folder for a link, so root never writes through one.
#   - The token goes from the CLI straight into a new file in that folder, never into an argument,
#     a variable or an output line. The file then belongs to the entry's account, mode 400, and
#     takes the old file's place in one step: the program reads the old session or the new one,
#     never half of one.
#   - A failure keeps the old file, says why, and the job tries again after RC_SESSION_RETRY
#     seconds (60). The old session lasts at most 60 minutes.
# RC_SESSION_ROOT_OWNER is for the tests: the account a folder must belong to (root).
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ONCE=""
[ "${1:-}" = --once ] && ONCE=1
CC_DIR="${CC_DIR:-$HOME/circlechat}"
SITE="${SITE:-$CC_DIR/site.json}"
EVERY="${RC_SESSION_EVERY:-2700}"
RETRY="${RC_SESSION_RETRY:-60}"
ROOT_OWNER="${RC_SESSION_ROOT_OWNER:-root}"
KIT_NODE="${KIT_NODE:-$(command -v node || true)}"
[ -n "$KIT_NODE" ] && [ -x "$KIT_NODE" ] || { echo "No Node to read site.json. Set KIT_NODE."; exit 2; }
[[ "$EVERY" =~ ^[0-9]+$ && "$EVERY" -ge 60 && "$EVERY" -le 3000 ]] || { echo "RC_SESSION_EVERY must be 60 to 3000 seconds: a session lasts 60 minutes."; exit 2; }

# The kit reads site.json as the owner, never as root.
if [ "$(id -u)" = 0 ]; then
  [ -n "${OWNER:-}" ] && [ "$OWNER" != root ] || { echo "As root, set OWNER to the account that owns the stacks."; exit 2; }
  as_owner() { sudo -u "$OWNER" -H "$@"; }
else
  as_owner() { "$@"; }
fi
kit() { as_owner "$KIT_NODE" "$HERE/kit/rc-sync.mjs" "$@"; }

SETTINGS="$(kit settings "$SITE")" || { echo "$SETTINGS"; exit 2; }
RC_APP="" RC_DATA="" RC_VAULT_KEY_FILE="" RC_NODE=""
{ IFS= read -r RC_APP || true; IFS= read -r RC_DATA || true; IFS= read -r RC_VAULT_KEY_FILE || true; IFS= read -r RC_NODE || true; } <<<"$SETTINGS"
[ -n "$RC_APP" ] || { echo "site.json has no recursicachat block: no sessions to make."; exit 0; }
RC_NODE="${RC_NODE:-$KIT_NODE}"
export RC_APP RC_DATA RC_VAULT_KEY_FILE RC_NODE
SESSIONS="$(kit sessions "$SITE")" || { echo "$SESSIONS"; exit 2; }
[ -n "$SESSIONS" ] || { echo "site.json lists no recursicachat.sessions: no sessions to make."; exit 0; }
. "$HERE/kit/rc-cli.sh"

say() { echo "$(date -u +%FT%TZ) $1"; }
# A file's owner and mode bits: BSD stat on a Mac, GNU stat on Linux.
stat_owner_mode() { if [ "$(uname -s)" = Darwin ]; then stat -f '%Su %Lp' "$1"; else stat -c '%U %a' "$1"; fi; }

# Makes one session into its file. Returns 1, with a line that says why, and keeps the old file.
one() {
  local email="$1" account="$2" file="$3" dir tmp owner mode
  id -u "$account" >/dev/null 2>&1 || { say "$email: there is no account $account"; return 1; }
  dir="$(dirname "$file")"
  [ -d "$dir" ] && [ ! -L "$dir" ] || { say "$email: the folder $dir is missing"; return 1; }
  read -r owner mode <<<"$(stat_owner_mode "$dir")"
  # Only the folder's owner may change it: no write bit for the group or for others.
  [ "$owner" = "$ROOT_OWNER" ] && [ $((8#$mode & 8#022)) = 0 ] || { say "$email: $dir must belong to $ROOT_OWNER, with no write for the group or others"; return 1; }
  tmp="$(mktemp "$dir/.session.XXXXXX")"
  if ! rc_cli session "$email" --minutes 60 > "$tmp" 2>/dev/null || ! grep -qE '^[A-Za-z0-9_-]{20,}$' "$tmp"; then
    rm -f "$tmp"
    say "$email: the server made no session (a member account, not an owner or an admin, that is not deactivated)"
    return 1
  fi
  chown -h "$account" "$tmp" && chmod 400 "$tmp" && mv -f "$tmp" "$file" || { rm -f "$tmp"; say "$email: could not hand $file to $account"; return 1; }
  say "$email: a new session in $file, for 60 minutes"
}

while :; do
  failed=0
  while IFS=$'\t' read -r email account file; do
    [ -n "$email" ] || continue
    one "$email" "$account" "$file" || failed=1
  done <<<"$SESSIONS"
  if [ -n "$ONCE" ]; then exit "$failed"; fi
  if [ "$failed" = 1 ]; then sleep "$RETRY"; else sleep "$EVERY"; fi
done
