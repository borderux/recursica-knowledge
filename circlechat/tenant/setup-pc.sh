#!/usr/bin/env bash
# Prepare a Linux computer, or Windows with WSL, for client stacks. Run once per computer, as the
# account that owns the stacks, and again after the kit changes. Asks for the account's password.
#
#   ./circlechat/tenant/setup-pc.sh [<account>]
#
# Installs what each client stack needs on a PC, the same isolation a Mac gets:
#   - QEMU, Lima and Colima: each client stack runs in a separate Docker VM, a Colima profile.
#   - cryptsetup: each client stack sits on a LUKS image file with the client's own key.
#   - /usr/local/bin/agent-stacks-disk: the root half of disk-image.sh. The Unlock stack workflow
#     reaches the command as root, through the secrets helper.
# Then adds the owner to the kvm group, so the Docker VMs run with hardware virtualization.
#
# With <account>, such as gh-runner, <account> may also run agent-stacks-disk through sudo with no
# password, and nothing else. Without <account>, no account gets a rule. The owner never gets one:
# the owner's sudo asks for the owner's password.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
OWNER="$(id -un)"
[ "$(uname -s)" = Linux ] || { echo "setup-pc.sh is for Linux and WSL. A Mac needs only Colima: brew install colima."; exit 1; }
[ "$OWNER" != root ] || { echo "Run this as the account that owns the stacks, not as root."; exit 1; }
ACCOUNT="${1:-}"
# Root runs agent-stacks-disk, a copy of this kit's disk-helper.sh. The kit must sit outside the
# agents' workspace.
bash "$HERE/../kit/check-kit.sh" "$HERE/../.." "$OWNER" "$HOME" || exit 1
if [ -n "$ACCOUNT" ]; then
  [ "$ACCOUNT" != "$OWNER" ] && [ "$ACCOUNT" != root ] || { echo "Give the rule to a separate account, not to $ACCOUNT."; exit 1; }
  id "$ACCOUNT" >/dev/null 2>&1 || { echo "No account named $ACCOUNT. Create the account first."; exit 1; }
fi
LIMA_VERSION=2.2.1
LIMA_SHA256=b391ac7fcac2b2a5a1628107756463188ded4d18d3104a40a66a8bb6fec01bcb
COLIMA_VERSION=0.10.3
COLIMA_SHA256=54ea35f4847815d0a1445dbc2bc3dd6469518a38a9e960449e96b044d248d00d

WSL=false; grep -qi microsoft /proc/sys/kernel/osrelease 2>/dev/null && WSL=true
if [ ! -e /dev/kvm ]; then
  echo "This computer has no /dev/kvm, so a Docker VM cannot use hardware virtualization."
  if [ "$WSL" = true ]; then
    echo "Turn on nested virtualization for WSL. Add this line under [wsl2] in %UserProfile%\\.wslconfig:"
    echo "  nestedVirtualization=true"
    echo "Then run wsl --shutdown in PowerShell, reopen Ubuntu and rerun this script."
    echo "Nested virtualization needs Windows 11 and an Intel or AMD processor with virtualization turned on."
  else
    echo "Turn on virtualization (VT-x or AMD-V) in the computer's firmware settings, then rerun this script."
  fi
  exit 1
fi

sudo apt-get update -qq
sudo apt-get install -y -qq qemu-system-x86 qemu-utils cryptsetup-bin e2fsprogs >/dev/null

# Lima and Colima, pinned, from each project's GitHub releases. Ubuntu packages neither.
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
curl -fsSL -o "$TMP/lima.tgz" "https://github.com/lima-vm/lima/releases/download/v$LIMA_VERSION/lima-$LIMA_VERSION-Linux-x86_64.tar.gz"
curl -fsSL -o "$TMP/colima" "https://github.com/abiosoft/colima/releases/download/v$COLIMA_VERSION/colima-Linux-x86_64"
echo "$LIMA_SHA256  $TMP/lima.tgz" | sha256sum -c --quiet
echo "$COLIMA_SHA256  $TMP/colima" | sha256sum -c --quiet
sudo tar -xzf "$TMP/lima.tgz" -C /usr/local
sudo install -m 755 -o root "$TMP/colima" /usr/local/bin/colima

sudo usermod -aG kvm "$OWNER"
sudo modprobe dm_crypt
echo dm_crypt | sudo tee /etc/modules-load.d/agent-stacks.conf >/dev/null

sudo install -m 755 -o root "$HERE/disk-helper.sh" /usr/local/bin/agent-stacks-disk
printf 'OWNER=%q\nOWNER_HOME=%q\n' "$OWNER" "$HOME" | sudo tee /etc/agent-stacks-disk.conf >/dev/null
sudo chmod 644 /etc/agent-stacks-disk.conf
if [ -n "$ACCOUNT" ]; then
  # Checked before the rule goes into /etc/sudoers.d, where a broken file stops sudo for everyone.
  RULE="$TMP/agent-stacks-disk"
  printf '%s ALL=(root) NOPASSWD: /usr/local/bin/agent-stacks-disk\n' "$ACCOUNT" > "$RULE"
  sudo visudo -cf "$RULE" >/dev/null
  sudo install -m 440 -o root -g root "$RULE" /etc/sudoers.d/agent-stacks-disk
fi

echo "Installed: $(qemu-system-x86_64 --version | head -1), $(cryptsetup --version), lima $LIMA_VERSION, colima $COLIMA_VERSION."
if [ -n "$ACCOUNT" ]; then echo "Installed /usr/local/bin/agent-stacks-disk. $ACCOUNT can run it through sudo with no password, and nothing else."
else echo "Installed /usr/local/bin/agent-stacks-disk. No account runs it without a password."; fi
if id -nG | grep -qw kvm; then echo "Ready for client stacks."
elif [ "$WSL" = true ]; then echo "Run wsl --shutdown in PowerShell and reopen Ubuntu, so $OWNER joins the kvm group."
else echo "Sign out and back in, so $OWNER joins the kvm group."; fi
