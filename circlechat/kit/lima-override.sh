#!/usr/bin/env bash
# Installs kit/lima-override.yaml as the Lima override.yaml of the stack's own Colima VM, the VM the
# gateway's containers run in: the VM forwards a port to the Mac only on 127.0.0.1, and never a port
# below 1024. setup-host.sh runs this script on a Mac (kit/lib.sh mac_services). To install the file
# alone, run it as the owner, the account the kit's Colima daemon runs as:
#
#   circlechat/kit/lima-override.sh
#
# The file goes to $COLIMA_HOME/_lima/_config/override.yaml, ~/.colima/_lima/_config/override.yaml by
# default, mode 600. Lima reads it at each start of the VM. This script never starts, stops or
# restarts the VM: it prints the restart command, for a time when no run needs the gateway.
#
# The owner writes the file, never root. The folder belongs to the owner, and a link there could
# lead root's write to one of root's own files. A link, changed text or a wrong mode installs the
# file again, through a new file renamed over the old one, so a link is replaced, never followed.
set -euo pipefail
[ "$(uname -s)" = Darwin ] || { echo "Lima's override is for a Mac's Colima VM. Nothing to do on $(uname -s)."; exit 0; }
[ "$(id -u)" != 0 ] || { echo "Run lima-override.sh as the owner, the account the kit's Colima daemon runs as, not as root."; exit 1; }
SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lima-override.yaml"
DIR="${COLIMA_HOME:-$HOME/.colima}/_lima/_config"
DEST="$DIR/override.yaml"
# The file's mode: GNU stat where the kit's tests run, BSD stat on a Mac (which refuses -c and prints
# nothing). GNU stat reads -f as a file system query, so it goes second.
mode() { stat -c %a "$1" 2>/dev/null || stat -f %Lp "$1"; }
if [ -f "$DEST" ] && [ ! -L "$DEST" ] && cmp -s "$SRC" "$DEST" && [ "$(mode "$DEST")" = 600 ]; then
  echo "lima-override.yaml is unchanged"
  exit 0
fi
umask 077
mkdir -p "$DIR"
TMP="$(mktemp "$DIR/override.yaml.XXXXXX")"
trap 'rm -f "$TMP"' EXIT
cat "$SRC" > "$TMP"
chmod 600 "$TMP"
mv -f "$TMP" "$DEST"
trap - EXIT
echo "lima-override.yaml installed at $DEST. The stack's VM uses it from its next start. Every container"
echo "of the stack, the gateway's included, stops while the VM restarts, so restart it when no run needs"
echo "the gateway: sudo launchctl kickstart -k system/io.recursica.colima"
