#!/usr/bin/env bash
# canary-keys.sh <old folder> <key folder>
#
# OpenCanary's fake SSH server keeps the server's host keys (id_rsa, id_dsa and each .pub) in the
# folder ssh.key_path names, and makes a new pair at its start when a pair is missing. The folder was
# OpenCanary's default, /var/tmp, which every account can write to, and the keys were mode 644.
# install-cluster.sh runs this script as root before OpenCanary starts with the new ssh.key_path:
#
# - The key folder is made, owned by the account that runs the script, mode 700.
# - Each pair in the old folder moves into the key folder, so the decoy keeps the decoy's
#   fingerprint. When the key folder holds the pair already, the old copy is removed.
# - Every key in the key folder is set to mode 600.
#
# In the old folder, only a plain file of the account that runs the script counts as a key. A link,
# or a file of another account, could point at a file the script must not move or change.
set -euo pipefail

[ $# = 2 ] || { echo "usage: canary-keys.sh <old folder> <key folder>" >&2; exit 2; }
OLD="$1" DIR="$2"
ME="$(id -u)"

[ ! -L "$DIR" ] || { echo "canary-keys.sh: $DIR is a link" >&2; exit 1; }
mkdir -p "$DIR"
chmod 700 "$DIR"
[ -n "$(find "$DIR" -maxdepth 0 -type d -user "$ME" -perm 700)" ] || { echo "canary-keys.sh: $DIR is not a folder of this account, mode 700" >&2; exit 1; }

# A plain file of this account, never a link.
mine() { [ -n "$(find "$1" -maxdepth 0 -type f -user "$ME" 2>/dev/null)" ]; }

for key in id_rsa id_dsa; do
  if mine "$OLD/$key" && mine "$OLD/$key.pub" && ! { [ -e "$DIR/$key" ] && [ -e "$DIR/$key.pub" ]; }; then
    mv -f "$OLD/$key" "$DIR/$key"
    mv -f "$OLD/$key.pub" "$DIR/$key.pub"
    echo "moved the decoy's $key pair from $OLD to $DIR"
  else
    # The key folder holds the pair already, or the old folder holds half a pair, which OpenCanary
    # would replace anyway. Either way the old copy goes.
    for f in "$key" "$key.pub"; do
      if mine "$OLD/$f"; then rm -f "$OLD/$f"; echo "removed the decoy's old $f from $OLD"; fi
    done
  fi
done

for f in id_rsa id_rsa.pub id_dsa id_dsa.pub; do
  if mine "$DIR/$f"; then chmod 600 "$DIR/$f"; fi
done
