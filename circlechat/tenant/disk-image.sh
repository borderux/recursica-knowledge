#!/usr/bin/env bash
# One encrypted disk image per client stack, on a Mac, on Linux or in WSL. The image holds the
# client's whole stack: ~/tenants/<client> (CircleChat, agent homes, workspace, job folder, secrets
# files, logs) and the client's Docker VM. The image's key lives in the client's GitHub environment
# as STACK_DISK_KEY, and in the password manager, never on this computer.
#
#   disk-image.sh create <client> <size, such as 200g>   key on stdin; run once, as the owner
#   disk-image.sh vm <client> <CPUs> <memory GiB> <disk GiB>   creates the client's Docker VM; run once
#   disk-image.sh unlock <client>                        key on stdin; opens the image, starts the VM
#   disk-image.sh lock <client>                          stops the VM, closes the image
#   disk-image.sh status <client>                        prints locked or unlocked
#   disk-image.sh destroy <client>                       offboard.sh remove runs this
#   disk-image.sh stop-vm <client>                       the secrets helper runs this before closing
#
# A Mac uses an encrypted APFS sparse bundle in ~/tenant-images. Linux and WSL use a LUKS image
# file in /var/lib/agent-stacks/images, opened by agent-stacks-disk (setup-pc.sh installs it).
# On Linux and WSL, sudo asks for the owner's password to open or close the image. The secrets
# helper runs unlock and lock for the "Unlock stack" workflow: on a Mac as the owner, and on Linux
# and WSL as root for the image and as the owner for the VM.
set -euo pipefail
OS="$(uname -s)"
HELPER="${AGENT_STACKS_DISK:-/usr/local/bin/agent-stacks-disk}"
case "$OS" in
  Darwin) ;;
  Linux) command -v colima >/dev/null && [ -x "$HELPER" ] \
           || { echo "Run ./circlechat/tenant/setup-pc.sh first: client stacks on Linux need Colima and agent-stacks-disk."; exit 1; } ;;
  *) echo "Encrypted client disk images need a Mac, Linux or WSL."; exit 1 ;;
esac
CMD="${1:?create|vm|unlock|lock|status|destroy|stop-vm}"; CLIENT="${2:?client name}"
[[ "$CLIENT" =~ ^[a-z0-9][a-z0-9-]*$ ]] || { echo "Client name \"$CLIENT\" must be a slug."; exit 1; }
MOUNT="$HOME/tenants/$CLIENT"
PROFILE="$CLIENT"
# The client's Colima folder sits inside the image: the VM's config, its boot disk, and the disk
# that holds the containers, images and volumes. Every colima command for the client needs
# COLIMA_HOME, such as: COLIMA_HOME=~/tenants/<client>/colima colima status --profile <client>
export COLIMA_HOME="$MOUNT/colima"
# Lima refuses a VM whose ssh socket path is 108 characters or longer.
SOCKET="$COLIMA_HOME/_lima/colima-$PROFILE/ssh.sock.1234567890123456"

if [ "$OS" = Darwin ]; then
  IMAGE="$HOME/tenant-images/$CLIENT.sparsebundle"
  mounted() { mount | grep -q " on $MOUNT (apfs"; }
  image_exists() { [ -e "$IMAGE" ]; }
  image_create() {
    mkdir -p "$HOME/tenant-images" "$MOUNT"; chmod 700 "$HOME/tenant-images"
    printf '%s' "$KEY" | hdiutil create -size "$1" -type SPARSEBUNDLE -fs APFS -volname "$CLIENT" \
      -encryption AES-256 -stdinpass "$IMAGE" >/dev/null
    image_open
  }
  image_open() { printf '%s' "$KEY" | hdiutil attach -stdinpass -nobrowse -owners on -mountpoint "$MOUNT" "$IMAGE" >/dev/null; }
  image_close() { if mounted; then hdiutil detach "$MOUNT" >/dev/null; fi; }
  image_destroy() { image_close; rm -rf "$IMAGE"; }
else
  IMAGE="/var/lib/agent-stacks/images/$CLIENT.luks"
  disk() { if [ "$(id -u)" = 0 ]; then "$HELPER" "$@"; else sudo "$HELPER" "$@"; fi; }
  mounted() { [ "$(findmnt -rn -o SOURCE --mountpoint "$MOUNT" 2>/dev/null)" = "/dev/mapper/agent-stacks-$CLIENT" ]; }
  image_exists() { [ -e "$IMAGE" ]; }
  image_create() { mkdir -p "$MOUNT"; printf '%s' "$KEY" | disk create "$CLIENT" "$1"; }
  image_open() { mkdir -p "$MOUNT"; printf '%s' "$KEY" | disk open "$CLIENT"; }
  image_close() { disk close "$CLIENT" </dev/null; }
  image_destroy() { disk destroy "$CLIENT" </dev/null; }
fi

# The VM may mount only the stack's own folder. Colima mounts the whole home folder when a profile
# lists no mounts, and the home folder holds every other open stack.
check_mounts() {
  local conf="$COLIMA_HOME/$PROFILE/colima.yaml" locations
  [ -f "$conf" ] || return 0
  locations="$(sed -n 's/^ *- *location: *//p' "$conf" | tr -d "\"'")"
  if [ -z "$locations" ] || printf '%s\n' "$locations" | grep -vqx -e "$MOUNT"; then
    echo "The Docker VM of $CLIENT mounts more than $MOUNT. Set mounts in $conf to $MOUNT only."
    exit 1
  fi
}

case "$CMD" in
  create)
    SIZE="${3:?size, such as 200g}"
    ! image_exists || { echo "$IMAGE already exists."; exit 1; }
    [ "${#SOCKET}" -lt 108 ] || { echo "The client name $CLIENT is too long for Colima's socket path. Use a shorter name."; exit 1; }
    KEY="$(cat)"; [ "${#KEY}" -ge 24 ] || { echo "The key must be at least 24 characters."; exit 1; }
    image_create "$SIZE"
    unset KEY
    mkdir -p "$COLIMA_HOME" "$MOUNT/logs" "$MOUNT/jobs"
    echo "Created and opened $IMAGE at $MOUNT. Create the client's Docker VM next:"
    echo "  disk-image.sh vm $CLIENT <CPUs> <memory GiB> <disk GiB>"
    ;;
  vm)
    CPUS="${3:?CPUs}"; MEMORY="${4:?memory in GiB}"; DISK="${5:?disk in GiB}"
    mounted || { echo "Unlock stack $CLIENT first."; exit 1; }
    [ ! -e "$COLIMA_HOME/$PROFILE" ] || { echo "Stack $CLIENT has a Docker VM already."; exit 1; }
    # --activate=false keeps the current Docker context. Docker commands for another stack never reach
    # this VM by accident. --ssh-config=false keeps the client's name out of ~/.ssh/config.
    colima start --profile "$PROFILE" --activate=false --ssh-config=false --cpus "$CPUS" --memory "$MEMORY" --disk "$DISK" --mount "$MOUNT:w" </dev/null
    check_mounts
    echo "Created the Docker VM of $CLIENT. Docker context: colima-$PROFILE."
    ;;
  unlock)
    if ! mounted; then
      KEY="$(cat)"
      image_open
      unset KEY
    fi
    # A VM made before the VM moved into the image sits in Colima's own folder. Starting a new,
    # empty VM in the image would hide the stack's containers.
    [ -d "$COLIMA_HOME/$PROFILE" ] || { echo "The disk image of $CLIENT holds no Docker VM. Create the VM with: disk-image.sh vm $CLIENT"; exit 1; }
    check_mounts
    # Docker restarts every stack container with a restart policy when the VM starts.
    colima start --profile "$PROFILE" --activate=false --ssh-config=false >/dev/null
    echo "Unlocked stack $CLIENT: image open, Docker VM started."
    ;;
  lock)
    if mounted; then colima stop --profile "$PROFILE" >/dev/null 2>&1 || true; fi
    image_close
    echo "Locked stack $CLIENT: Docker VM stopped, image closed."
    ;;
  stop-vm)
    if mounted; then colima stop --profile "$PROFILE" >/dev/null 2>&1 || true; fi
    ;;
  status)
    mounted && echo unlocked || echo locked
    ;;
  destroy)
    if mounted; then colima delete --profile "$PROFILE" --force >/dev/null 2>&1 || true; fi
    image_destroy
    docker context rm -f "colima-$PROFILE" >/dev/null 2>&1 || true
    echo "Destroyed the disk image and the Docker VM of $CLIENT."
    ;;
  *) echo "Unknown command $CMD."; exit 1 ;;
esac
