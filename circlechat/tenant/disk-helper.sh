#!/usr/bin/env bash
# The root half of a client's encrypted disk on Linux and WSL: a LUKS image file per client.
# setup-pc.sh copies this script to /usr/local/bin/agent-stacks-disk, owned by root. The secrets
# helper runs the copy as root for the Unlock stack workflow. disk-image.sh runs the copy through
# sudo, which asks for the owner's password.
#
#   agent-stacks-disk create <client> <size, such as 200g>   key on stdin
#   agent-stacks-disk open <client>                          key on stdin
#   agent-stacks-disk close <client>
#   agent-stacks-disk destroy <client>                       erases the key slots, deletes the image
#
# The image is /var/lib/agent-stacks/images/<client>.luks, readable by root only. Other accounts
# can see whether the image exists. The open image is
# mounted at ~/tenants/<client> of the owner named in /etc/agent-stacks-disk.conf. The owner's
# account can change ~/tenants, so the mount point is opened once, checked, and mounted through
# that open handle: a link swapped in afterwards cannot move the mount elsewhere.
set -euo pipefail
[ "$(id -u)" = 0 ] || { echo "agent-stacks-disk runs as root, through sudo."; exit 1; }
CMD="${1:?create|open|close|destroy}"; CLIENT="${2:?client name}"
[[ "$CLIENT" =~ ^[a-z0-9][a-z0-9-]*$ ]] || { echo "Client name \"$CLIENT\" must be a slug."; exit 1; }
# shellcheck disable=SC1091
. /etc/agent-stacks-disk.conf   # OWNER, OWNER_HOME
IMAGES=/var/lib/agent-stacks/images
IMAGE="$IMAGES/$CLIENT.luks"
NAME="agent-stacks-$CLIENT"
DEV="/dev/mapper/$NAME"
MOUNT="$OWNER_HOME/tenants/$CLIENT"
UIDGID="$(id -u "$OWNER"):$(id -g "$OWNER")"

read_key() { KEY="$(cat)"; [ "${#KEY}" -ge 24 ] || { echo "The key must be at least 24 characters."; exit 1; }; }
is_mounted() { [ "$(findmnt -rn -o SOURCE --mountpoint "$MOUNT" 2>/dev/null)" = "$DEV" ]; }

# Mount the open image on the owner's ~/tenants/<client>, through file descriptor 9.
mount_image() {
  is_mounted && return 0
  exec 9<"$MOUNT"
  [ "$(readlink "/proc/$$/fd/9")" = "$MOUNT" ] || { echo "$MOUNT is a link. Nothing was mounted."; exit 1; }
  [ "$(stat -c %u "/proc/$$/fd/9/")" = "$(id -u "$OWNER")" ] || { echo "$OWNER does not own $MOUNT. Nothing was mounted."; exit 1; }
  # --no-canonicalize passes the descriptor's path to the kernel unchanged.
  mount --no-canonicalize -o nodev,nosuid "$DEV" /proc/self/fd/9
  exec 9<&-
}

case "$CMD" in
  create)
    SIZE="${3:?size, such as 200g}"
    [[ "$SIZE" =~ ^[0-9]+[gGmM]$ ]] || { echo "Size \"$SIZE\" must be a number and g or m, such as 200g."; exit 1; }
    [ ! -e "$IMAGE" ] || { echo "$IMAGE already exists."; exit 1; }
    read_key
    install -d -m 755 -o root /var/lib/agent-stacks
    install -d -m 711 -o root "$IMAGES"
    install -m 600 -o root /dev/null "$IMAGE"
    # A sparse file: the image grows as the stack grows, up to the size given.
    truncate -s "$(printf '%s' "$SIZE" | tr 'gm' 'GM')" "$IMAGE"
    printf '%s' "$KEY" | cryptsetup luksFormat --type luks2 --batch-mode --key-file=- "$IMAGE"
    printf '%s' "$KEY" | cryptsetup open --type luks2 --key-file=- "$IMAGE" "$NAME"
    unset KEY
    mkfs.ext4 -q -L "$CLIENT" -E "root_owner=$UIDGID" "$DEV"
    mount_image
    ;;
  open)
    [ -f "$IMAGE" ] || { echo "No disk image for client $CLIENT. Create the image first."; exit 1; }
    if [ ! -e "$DEV" ]; then
      read_key
      printf '%s' "$KEY" | cryptsetup open --type luks2 --key-file=- "$IMAGE" "$NAME"
      unset KEY
    fi
    mount_image
    ;;
  close)
    if is_mounted; then umount "$DEV"; fi
    if [ -e "$DEV" ]; then cryptsetup close "$NAME"; fi
    ;;
  destroy)
    if is_mounted; then umount "$DEV"; fi
    if [ -e "$DEV" ]; then cryptsetup close "$NAME"; fi
    # Erasing the key slots first makes the data unreadable, even where the file's old blocks remain on the disk.
    if [ -f "$IMAGE" ]; then cryptsetup erase --batch-mode "$IMAGE" && rm -f "$IMAGE"; fi
    ;;
  *) echo "Unknown command $CMD."; exit 1 ;;
esac
