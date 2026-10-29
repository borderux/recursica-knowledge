#!/usr/bin/env bash
# Colima's LaunchDaemon on a Mac (setup-host.sh, kit/lib.sh mac_services). Runs one Colima VM as the
# owner, and stops the VM cleanly when launchd stops the service.
#
#   colima-service.sh <profile>
#
# launchd stops the service with SIGTERM, such as when the kit boots the service out before a
# restart. The service then runs colima stop, and ends colima start -f after the VM stops:
# colima start -f keeps running after the VM stops, and the service would never exit.
set -u
PROFILE="${1:-default}"
# The service runs the VM. A VM started another way, such as by hand, stops first.
colima status --profile "$PROFILE" >/dev/null 2>&1 && colima stop --profile "$PROFILE"
colima start -f --profile "$PROFILE" &
START=$!
stop_vm() {
  colima stop --profile "$PROFILE"
  kill "$START" 2>/dev/null
  wait "$START" 2>/dev/null
  exit 0
}
trap stop_vm TERM INT
# A VM that stops on its own ends the service, and launchd starts the service again.
wait "$START"
