#!/usr/bin/env bash
# Colima's LaunchDaemon on a Mac (setup-host.sh, kit/lib.sh mac_services). Runs one Colima VM as the
# owner, and stops the VM cleanly when launchd stops the service.
#
#   colima-service.sh <profile>
#
# colima start -f keeps running after the VM stops, so the service never waits on colima start -f alone:
#   - launchd stops the service with SIGTERM, such as when the kit boots the service out before a
#     restart. The service runs colima stop, then ends colima start -f and exits.
#   - The VM stops another way, such as colima stop by hand. The service checks the VM every
#     COLIMA_SERVICE_POLL seconds (15 by default). Once the VM has run and then stops, the service
#     ends colima start -f and exits, and launchd starts the service again.
# colima start -f gets COLIMA_SERVICE_GRACE seconds (10 by default) to end after SIGTERM, then
# SIGKILL. The VM has stopped by then.
set -u
PROFILE="${1:-default}"
POLL="${COLIMA_SERVICE_POLL:-15}"
GRACE="${COLIMA_SERVICE_GRACE:-10}"
NAP=""
# The service runs the VM. A VM started another way, such as by hand, stops first.
colima status --profile "$PROFILE" >/dev/null 2>&1 && colima stop --profile "$PROFILE"
colima start -f --profile "$PROFILE" &
START=$!
end_start() {
  local i
  kill "$START" 2>/dev/null
  for ((i = 0; i < GRACE * 10; i++)); do kill -0 "$START" 2>/dev/null || break; sleep 0.1; done
  kill -KILL "$START" 2>/dev/null
  wait "$START" 2>/dev/null
  [ -z "$NAP" ] || kill "$NAP" 2>/dev/null
}
stop_vm() {
  colima stop --profile "$PROFILE"
  end_start
  exit 0
}
trap stop_vm TERM INT
ran=false
while kill -0 "$START" 2>/dev/null; do
  if colima status --profile "$PROFILE" >/dev/null 2>&1; then ran=true
  elif [ "$ran" = true ]; then
    echo "Colima's VM $PROFILE stopped. The service ends, and launchd starts the VM again."
    end_start
    exit 1
  fi
  # wait, unlike a plain sleep, lets SIGTERM run stop_vm at once.
  sleep "$POLL" & NAP=$!
  wait "$NAP"
  NAP=""
done
# colima start -f ended on its own, such as on a failed start. launchd starts the service again.
wait "$START"
