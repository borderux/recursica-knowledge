#!/usr/bin/env bash
# One encrypted disk image per client stack, on a Mac. The image holds the client's whole stack:
# ~/tenants/<client> (CircleChat, agent homes, workspace, job folder, secrets files, logs) and the
# client's Docker VM. The image's key lives in the client's GitHub environment as STACK_DISK_KEY,
# and in the password manager, never on this computer.
#
#   disk-image.sh create <client> <size, such as 200g>   key on stdin; run once, as the owner
#   disk-image.sh unlock <client>                        key on stdin; opens the image, starts the VM
#   disk-image.sh lock <client>                          stops the VM, closes the image
#   disk-image.sh status <client>                        prints locked or unlocked
#
# The secrets helper runs unlock and lock for the "Unlock stack" workflow, as the owner.
set -euo pipefail
[ "$(uname -s)" = Darwin ] || { echo "Encrypted client disk images need a Mac. Client stacks run on the Studio."; exit 1; }
CMD="${1:?create|unlock|lock|status}"; CLIENT="${2:?client name}"
[[ "$CLIENT" =~ ^[a-z0-9][a-z0-9-]*$ ]] || { echo "Client name \"$CLIENT\" must be a slug."; exit 1; }
IMAGES="$HOME/tenant-images"
IMAGE="$IMAGES/$CLIENT.sparsebundle"
MOUNT="$HOME/tenants/$CLIENT"
PROFILE="$CLIENT"
# Colima keeps each profile's VM in Lima's folder. The VM folder for this client is a link into
# the image, so the VM's disk is encrypted with the rest of the stack.
LIMA_VM="$HOME/.colima/_lima/colima-$PROFILE"

mounted() { mount | grep -q " on $MOUNT (apfs"; }

case "$CMD" in
  create)
    SIZE="${3:?size, such as 200g}"
    [ ! -e "$IMAGE" ] || { echo "$IMAGE already exists."; exit 1; }
    mkdir -p "$IMAGES" "$MOUNT"
    chmod 700 "$IMAGES"
    KEY="$(cat)"; [ "${#KEY}" -ge 24 ] || { echo "The key must be at least 24 characters."; exit 1; }
    printf '%s' "$KEY" | hdiutil create -size "$SIZE" -type SPARSEBUNDLE -fs APFS -volname "$CLIENT" \
      -encryption AES-256 -stdinpass "$IMAGE" >/dev/null
    printf '%s' "$KEY" | hdiutil attach -stdinpass -nobrowse -owners on -mountpoint "$MOUNT" "$IMAGE" >/dev/null
    unset KEY
    mkdir -p "$MOUNT/vm" "$MOUNT/logs" "$MOUNT/jobs"
    mkdir -p "$(dirname "$LIMA_VM")"
    [ -e "$LIMA_VM" ] && { echo "$LIMA_VM already exists: create the image before the client's Docker VM."; exit 1; }
    ln -s "$MOUNT/vm" "$LIMA_VM"
    echo "Created and opened $IMAGE at $MOUNT. Create the client's Docker VM next: colima start --profile $PROFILE."
    ;;
  unlock)
    if ! mounted; then
      KEY="$(cat)"
      printf '%s' "$KEY" | hdiutil attach -stdinpass -nobrowse -owners on -mountpoint "$MOUNT" "$IMAGE" >/dev/null
      unset KEY
    fi
    # Docker restarts every stack container with a restart policy when the VM starts.
    colima start --profile "$PROFILE" >/dev/null
    echo "Unlocked stack $CLIENT: image open, Docker VM started."
    ;;
  lock)
    colima stop --profile "$PROFILE" >/dev/null 2>&1 || true
    mounted && hdiutil detach "$MOUNT" >/dev/null
    echo "Locked stack $CLIENT: Docker VM stopped, image closed."
    ;;
  status)
    mounted && echo unlocked || echo locked
    ;;
  *) echo "Unknown command $CMD."; exit 1 ;;
esac
