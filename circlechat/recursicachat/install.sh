#!/bin/bash
# Installs the RecursicaChat 2.0 server's scripts and launchd jobs on the control Mac, from this kit
# checkout and the stack's site.json. Run it from the owner's account, from root's kit checkout:
#
#   sudo circlechat/recursicachat/install.sh
#
# CC_DIR (the stack's folder), WS (the agents' workspace) and SITE ($CC_DIR/site.json) can be set
# before sudo's command, such as sudo CC_DIR=/path circlechat/recursicachat/install.sh. Without
# them, kit/stack-paths.sh picks each folder: ~/recursica-stack and ~/recursica-workspace, or
# CircleChat 1.x's old names, ~/circlechat and ~/circlechat-workspace, before a person moved them.
#
# render.mjs fills each template with values from site.json. Then this script installs:
#   /opt/recursicachat/bin/   run.sh, backup.sh, restore-test.sh, colima-service.sh,  root:wheel 755
#                             stack-backup.sh and stack-restore-test.sh, the stack's
#                             own files (site.json and the workspace),
#                             rc-deploy.sh, linked as /usr/local/bin/rc-deploy,
#                             rc-clear.sh, linked as /usr/local/bin/rc-clear, with
#                             rc-clear.mjs (644), its database work, and
#                             build-pdftext.sh, which builds the PDF text reader's image
#   /Library/LaunchDaemons/   the four io.recursica.recursicachat*.plist, and         root:wheel 644
#                             io.recursica.stack-backup and -restore-test
# It changes only the files whose text changed. A changed backup or restore-test job is loaded
# again at once. A changed server or Colima job is not restarted: the script prints the command,
# so the restart happens when you choose. A changed script takes effect at its next start.
# It never touches the data, the vault key, the Google secret or the restic password.
set -euo pipefail
umask 022

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KIT="$(cd "$HERE/.." && pwd)"
BIN=/opt/recursicachat/bin
DAEMONS=/Library/LaunchDaemons
NODE=/opt/recursicachat/node/v24.22.3/bin/node

fail() { echo "install.sh: $1" >&2; exit 1; }
[ "$(uname -s)" = Darwin ] || fail "the RecursicaChat 2.0 server runs on a Mac only"
[ "$(id -u)" = 0 ] || fail "run it with sudo"
OWNER="${SUDO_USER:-}"
[ -n "$OWNER" ] && [ "$OWNER" != root ] || fail "run it with sudo from the owner's account"
OWNER_HOME="$(dscl . -read "/Users/$OWNER" NFSHomeDirectory | awk '{ print $2 }')"
[ -d "$OWNER_HOME" ] || fail "no home folder for $OWNER"
# The installed root scripts run from this checkout's slack.mjs and env-file.sh.
bash "$KIT/kit/check-kit.sh" "$KIT" "$OWNER" "$OWNER_HOME" || exit 1
# shellcheck source=circlechat/kit/stack-paths.sh
. "$KIT/kit/stack-paths.sh"
CC_DIR="${CC_DIR:-$(stack_dir "$OWNER_HOME")}"
WS="${WS:-$(workspace_dir "$OWNER_HOME")}"
SITE="${SITE:-$CC_DIR/site.json}"
[ -f "$SITE" ] || fail "no site.json at $SITE"
[ -x "$NODE" ] || fail "no Node at $NODE"

OUT="$(mktemp -d /var/tmp/recursicachat-install.XXXXXX)"
trap 'rm -rf "$OUT"' EXIT
"$NODE" "$HERE/render.mjs" --site "$SITE" --out "$OUT" --owner-home "$OWNER_HOME" --kit "$KIT" --cc-dir "$CC_DIR" --ws "$WS"

# A rendered file must not still hold a token.
if grep -l -E '@[A-Z_]+@' "$OUT"/* >/dev/null; then fail "a rendered file still holds a token"; fi
for f in "$OUT"/*.plist; do plutil -lint -s "$f" || fail "$(basename "$f") is not a valid plist"; done
for f in "$OUT"/*.sh; do bash -n "$f" || fail "$(basename "$f") is not valid bash"; done
for f in "$OUT"/*.mjs; do "$NODE" --check "$f" || fail "$(basename "$f") is not valid JavaScript"; done

mkdir -p "$BIN" && chown root:wheel "$BIN" && chmod 755 "$BIN"
mkdir -p /var/log/recursicachat && chown root:wheel /var/log/recursicachat && chmod 700 /var/log/recursicachat

same() { [ -f "$2" ] && cmp -s "$1" "$2"; }
for f in run.sh backup.sh restore-test.sh stack-backup.sh stack-restore-test.sh colima-service.sh rc-deploy.sh rc-clear.sh rc-clear.mjs build-pdftext.sh; do
  if same "$OUT/$f" "$BIN/$f"; then echo "$f is unchanged"; continue; fi
  # rc-clear.mjs is read by the server's Node, never run as a command.
  mode=755
  case "$f" in *.mjs) mode=644 ;; esac
  install -m "$mode" -o root -g wheel "$OUT/$f" "$BIN/$f"
  echo "$f installed"
done
# sudo rc-deploy and sudo rc-clear: links in /usr/local/bin, only when only root can change that
# folder, so the name sudo runs always leads to the root-owned script.
if [ "$(stat -f '%Su' /usr/local/bin 2>/dev/null)" = root ] && [ $((8#$(stat -f '%Lp' /usr/local/bin) & 8#022)) = 0 ]; then
  for c in rc-deploy rc-clear; do
    if [ "$(readlink "/usr/local/bin/$c" 2>/dev/null)" != "$BIN/$c.sh" ]; then ln -sfn "$BIN/$c.sh" "/usr/local/bin/$c" && echo "linked /usr/local/bin/$c"; fi
  done
else
  echo "/usr/local/bin is missing or others can change it: run rc-deploy as sudo $BIN/rc-deploy.sh, and rc-clear as sudo $BIN/rc-clear.sh"
fi

for f in "$OUT"/*.plist; do
  name="$(basename "$f")" label="$(basename "$f" .plist)" dest="$DAEMONS/$(basename "$f")"
  loaded=""; launchctl print "system/$label" >/dev/null 2>&1 && loaded=1
  if same "$f" "$dest"; then
    [ -n "$loaded" ] || { launchctl bootstrap system "$dest"; echo "$label started"; continue; }
    echo "$label is unchanged"; continue
  fi
  install -m 644 -o root -g wheel "$f" "$dest"
  case "$label" in
    *-backup | *-restore-test)
      [ -z "$loaded" ] || launchctl bootout system "$dest" 2>/dev/null || true
      launchctl bootstrap system "$dest"
      echo "$label installed and loaded" ;;
    *)
      if [ -n "$loaded" ]; then
        echo "$name changed. Restart it when you choose: sudo launchctl bootout system $dest; sudo launchctl bootstrap system $dest"
      else
        launchctl bootstrap system "$dest"
        echo "$label installed and started"
      fi ;;
  esac
done
