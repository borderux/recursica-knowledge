#!/usr/bin/env bash
# The service accounts of programs that drive agents on the stack's RecursicaChat 2.0 server, from
# site.json's recursicachat.services (circlechat/README.md, "A program that drives an agent").
# setup-host.sh runs it as root. Run it again by hand the same way:
#
#   sudo OWNER=$(id -un) circlechat/rc-service.sh                  make what is missing
#   sudo OWNER=$(id -un) circlechat/rc-service.sh --rotate <name>  also a new token for <name>
#
# For each entry, through the server's root-only CLI (cli.ts service-*):
#   - the service account exists;
#   - it drives exactly the agents listed: each listed agent is driven, and an agent it drove that
#     is no longer listed answers for itself again;
#   - its token is in the entry's file, which belongs to the entry's account, mode 400. A token
#     doesn't expire, so a new one is made only when the file is missing or empty, when the server
#     has no token for the service (revoked, or never made), or with --rotate. The token goes from
#     the CLI straight into a new file, in a folder that belongs to root, that then takes the old
#     file's place in one step: never into an argument, a variable or an output line.
# A failure for one entry says why and goes on to the next; the script then exits 1.
# RC_SERVICE_ROOT_OWNER is for the tests: the account a folder must belong to (root).
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROTATE=""
if [ "${1:-}" = --rotate ]; then
  ROTATE="${2:?usage: rc-service.sh [--rotate <name>]}"
elif [ -n "${1:-}" ]; then
  echo "usage: rc-service.sh [--rotate <name>]"
  exit 2
fi
CC_DIR="${CC_DIR:-$HOME/circlechat}"
SITE="${SITE:-$CC_DIR/site.json}"
ROOT_OWNER="${RC_SERVICE_ROOT_OWNER:-root}"
KIT_NODE="${KIT_NODE:-$(command -v node || true)}"
[ -n "$KIT_NODE" ] && [ -x "$KIT_NODE" ] || { echo "No Node to read site.json. Set KIT_NODE."; exit 2; }

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
[ -n "$RC_APP" ] || { echo "site.json has no recursicachat block: no services to set up."; exit 0; }
RC_NODE="${RC_NODE:-$KIT_NODE}"
export RC_APP RC_DATA RC_VAULT_KEY_FILE RC_NODE
SERVICES="$(kit services "$SITE")" || { echo "$SERVICES"; exit 2; }
[ -n "$SERVICES" ] || { echo "site.json lists no recursicachat.services: no services to set up."; exit 0; }
. "$HERE/kit/rc-cli.sh"

say() { echo "$(date -u +%FT%TZ) $1"; }
# A file's owner and mode bits: BSD stat on a Mac, GNU stat on Linux.
stat_owner_mode() { if [ "$(uname -s)" = Darwin ]; then stat -f '%Su %Lp' "$1"; else stat -c '%U %a' "$1"; fi; }
# The service's line in service-list, such as "name  token: yes  agents: @a @b  made: ...".
list_line() { rc_cli service-list 2>/dev/null | awk -v n="$1" '$1 == n { print; exit }'; }

# Sets up one service. Returns 1, with a line that says why.
one() {
  local name="$1" account="$2" file="$3" agents="$4" dir tmp owner mode line err a have need=""
  id -u "$account" >/dev/null 2>&1 || { say "$name: there is no account $account"; return 1; }
  dir="$(dirname "$file")"
  [ -d "$dir" ] && [ ! -L "$dir" ] || { say "$name: the folder $dir is missing"; return 1; }
  read -r owner mode <<<"$(stat_owner_mode "$dir")"
  # Only the folder's owner may change it: no write bit for the group or for others.
  [ "$owner" = "$ROOT_OWNER" ] && [ $((8#$mode & 8#022)) = 0 ] || { say "$name: $dir must belong to $ROOT_OWNER, with no write for the group or others"; return 1; }

  line="$(list_line "$name")"
  if [ -z "$line" ]; then
    err="$(rc_cli service-create "$name" 2>&1 >/dev/null)" || { say "$name: the server made no service: $err"; return 1; }
    say "$name: made the service"
    line="$(list_line "$name")"
  fi
  # the agents it drives: each one listed, and none other
  for a in ${agents//,/ }; do
    case " $(sed -n 's/.*agents: \(.*\)  made:.*/\1/p' <<<"$line") " in
      *" @$a "*) ;;
      *)
        err="$(rc_cli service-drive "$name" "$a" 2>&1 >/dev/null)" || { say "$name: could not drive @$a: $err"; return 1; }
        say "$name: drives @$a"
        ;;
    esac
  done
  for have in $(sed -n 's/.*agents: \(.*\)  made:.*/\1/p' <<<"$line"); do
    [ "$have" = none ] && continue
    case ",$agents," in
      *",${have#@},"*) ;;
      *)
        rc_cli service-undrive "${have#@}" >/dev/null 2>&1 || { say "$name: could not stop driving $have"; return 1; }
        say "$name: no longer drives $have"
        ;;
    esac
  done

  [ "$ROTATE" = "$name" ] && need="a new token, as asked"
  [ -s "$file" ] || need="${need:-no token file yet}"
  case "$line" in *"token: yes"*) ;; *) need="${need:-the server has no token for it}" ;; esac
  if [ -z "$need" ]; then
    say "$name: up to date"
    return 0
  fi
  tmp="$(mktemp "$dir/.token.XXXXXX")"
  if ! rc_cli service-token "$name" > "$tmp" 2>/dev/null || ! grep -qE '^ccsvc_[A-Za-z0-9_-]{40,}$' "$tmp"; then
    rm -f "$tmp"
    say "$name: the server made no token"
    return 1
  fi
  chown -h "$account" "$tmp" && chmod 400 "$tmp" && mv -f "$tmp" "$file" || { rm -f "$tmp"; say "$name: could not hand $file to $account"; return 1; }
  say "$name: a new token in $file ($need); the old one no longer works"
}

failed=0
while IFS=$'\t' read -r name account file agents; do
  [ -n "$name" ] || continue
  one "$name" "$account" "$file" "$agents" || failed=1
done <<<"$SERVICES"
[ -z "$ROTATE" ] || grep -q "^$ROTATE	" <<<"$SERVICES" || { say "$ROTATE: no such service in site.json"; failed=1; }
exit "$failed"
