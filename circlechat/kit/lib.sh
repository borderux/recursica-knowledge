#!/usr/bin/env bash
# Shared helpers for the CircleChat kit. Sourced, never run. Works on Linux (GNU) and macOS (BSD).

OS="$(uname -s)"   # Linux | Darwin

# In-place sed that works with both GNU sed and BSD sed (macOS).
sedi() { if sed --version >/dev/null 2>&1; then sed -i "$@"; else sed -i '' "$@"; fi; }
sudo_sedi() { if sed --version >/dev/null 2>&1; then sudo sed -i "$@"; else sudo sed -i '' "$@"; fi; }

# Give the files a container mounts to the stack's owner, on a Mac only. Docker on a Mac runs in a
# VM, such as Colima's, and the VM reads the Mac's files as the owner, never as root. A file that
# root owns with mode 600 cannot be mounted there. On Linux, Docker runs as root, and root keeps the
# files. The modes stay the same. -h changes a symlink itself, never the file the symlink names.
# A script that runs as root, such as backup.sh, sets DOCKER_OWNER to the stack's owner. chown is
# called by its full path, because macOS keeps chown in /usr/sbin and a job's PATH can leave
# /usr/sbin out. The tests set CHOWN to a stand-in.
own_for_docker() { [ "$OS" = Darwin ] || return 0; sudo "${CHOWN:-/usr/sbin/chown}" -h -R "${DOCKER_OWNER:-$(id -un)}" "$@"; }

# Stop unless the kit checkout is one root may run: outside the agents' workspace, and changed by
# the owner only (kit/check-kit.sh). Every script that runs as root, or installs a command that root
# runs, calls this first.
#   require_kit <kit folder> [<owner account>] [<owner home folder>]
require_kit() { bash "$(dirname "${BASH_SOURCE[0]}")/check-kit.sh" "$@" || exit 1; }

# Read one value from site.json: site_get '.repos.app'
site_get() { node -e '
  const s = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
  const v = process.argv[2].split(".").filter(Boolean).reduce((o, k) => (o == null ? o : o[k]), s);
  if (v !== undefined && v !== null) process.stdout.write(typeof v === "object" ? JSON.stringify(v) : String(v));
' "$SITE" "$1"; }

# Turn a systemd calendar line ("Sun *-*-* 03:00", "*-*-01 03:30", "*-*-* 02:00") into launchd's
# StartCalendarInterval. Only the weekday, the day of the month, the hour and the minute are read.
launchd_calendar() {
  local line="$1" wd="" day="" hm keys=""
  case "$line" in Mon\ *) wd=1 ;; Tue\ *) wd=2 ;; Wed\ *) wd=3 ;; Thu\ *) wd=4 ;; Fri\ *) wd=5 ;; Sat\ *) wd=6 ;; Sun\ *) wd=0 ;; esac
  line="${line#* }"; [ -z "$wd" ] && line="$1"
  local date="${line%% *}"; hm="${line#* }"
  day="${date##*-}"; [ "$day" = "*" ] && day=""
  local hour="${hm%%:*}" min="${hm#*:}"; min="${min%%:*}"
  [[ "$hour" =~ ^[0-9]{1,2}$ && "$min" =~ ^[0-9]{1,2}$ ]] || { echo "launchd_calendar: cannot read \"$1\"" >&2; return 1; }
  [ -n "$wd" ] && keys="$keys<key>Weekday</key><integer>$wd</integer>"
  [ -n "$day" ] && keys="$keys<key>Day</key><integer>$((10#$day))</integer>"
  printf '<key>StartCalendarInterval</key><dict>%s<key>Hour</key><integer>%d</integer><key>Minute</key><integer>%d</integer></dict>' "$keys" "$((10#$hour))" "$((10#$min))"
}

# A stack's limits make a large computer act like a smaller one (site.json, nodes[].limits). The
# stack's Docker VM must be no bigger than the limits, or the stack runs faster than the smaller
# computer would. Needs DOCKER_CONTEXT, the stack's VM; returns 1 with a message when too big.
#   check_vm_limits <cpus or empty> <memory GB or empty>
check_vm_limits() {
  local cpus="$1" gb="$2" have ncpu mem
  [ -n "${DOCKER_CONTEXT:-}" ] && { [ -n "$cpus" ] || [ -n "$gb" ]; } || return 0
  have="$(docker info --format '{{.NCPU}} {{.MemTotal}}' 2>/dev/null)" || return 0
  read -r ncpu mem <<<"$have"
  [ -n "$ncpu" ] && [ -n "$mem" ] || return 0
  if [ -n "$cpus" ] && [ "$ncpu" -gt "$cpus" ]; then
    echo "The stack's Docker VM ($DOCKER_CONTEXT) has $ncpu cores, and limits.cpus is $cpus. Recreate the VM with $cpus cores: disk-image.sh vm <stack> $cpus <memory GiB> <disk GiB>."; return 1
  fi
  if [ -n "$gb" ] && [ "$mem" -gt $((gb * 1073741824)) ]; then
    echo "The stack's Docker VM ($DOCKER_CONTEXT) has $((mem / 1073741824)) GiB of memory, and limits.memory_gb is $gb. Recreate the VM with $gb GiB or less."; return 1
  fi
}

# Install a long-running service or a scheduled job, the native way for this OS.
#   install_unit NAME "COMMAND" [WORKDIR] [USER] [SCHEDULE]
# SCHEDULE empty = keep running (restart on failure, start at boot); "boot" = run once at each
# start-up; "hourly" = every hour; or a fixed time as a systemd calendar line: "*-*-* 02:00" every
# day, "Sun *-*-* 03:00" every Sunday, "*-*-01 03:30" on the first of each month. A fixed time also
# works on macOS, where launchd gets the same day and time.
# On macOS, UNIT_EXIT_TIMEOUT sets the seconds launchd waits for the service to stop, 20 by default.
# UNIT_KEEP=1 leaves a loaded service running when the service's plist has not changed.
install_unit() {
  local name="$1" cmd="$2" dir="${3:-$HOME}" user="${4:-$(id -un)}" sched="${5:-}"
  if [ "$OS" = Linux ]; then
    if [ "$sched" = boot ]; then
      sudo tee "/etc/systemd/system/$name.service" >/dev/null <<UNIT
[Unit]
Description=$name (circlechat kit)
After=network-online.target docker.service
Wants=network-online.target

[Service]
Type=oneshot
RemainAfterExit=yes
User=$user
WorkingDirectory=$dir
ExecStart=/bin/bash -lc '$cmd'

[Install]
WantedBy=multi-user.target
UNIT
      sudo systemctl daemon-reload && sudo systemctl enable "$name.service"
    elif [ -z "$sched" ]; then
      sudo tee "/etc/systemd/system/$name.service" >/dev/null <<UNIT
[Unit]
Description=$name (circlechat kit)
After=network-online.target docker.service
Wants=network-online.target

[Service]
User=$user
WorkingDirectory=$dir
ExecStart=/bin/bash -lc '$cmd'
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
UNIT
      sudo systemctl daemon-reload && sudo systemctl enable --now "$name.service"
    else
      sudo tee "/etc/systemd/system/$name.service" >/dev/null <<UNIT
[Unit]
Description=$name (circlechat kit)

[Service]
Type=oneshot
User=$user
WorkingDirectory=$dir
ExecStart=/bin/bash -lc '$cmd'
UNIT
      sudo tee "/etc/systemd/system/$name.timer" >/dev/null <<UNIT
[Unit]
Description=$name schedule

[Timer]
OnCalendar=$sched
Persistent=true

[Install]
WantedBy=timers.target
UNIT
      sudo systemctl daemon-reload && sudo systemctl enable --now "$name.timer"
    fi
  elif [ "$OS" = Darwin ]; then
    local label="io.recursica.$name" plist="/Library/LaunchDaemons/io.recursica.$name.plist" timing
    local xcmd; xcmd="$(printf '%s' "$cmd" | sed -e 's/&/\&amp;/g' -e 's/</\&lt;/g' -e 's/>/\&gt;/g')"   # plist is XML
    if [ "$sched" = boot ]; then
      timing="<key>RunAtLoad</key><true/>"
    elif [ "$sched" != hourly ] && [ -n "$sched" ]; then
      timing="$(launchd_calendar "$sched")" || return 1
    elif [ -z "$sched" ]; then
      timing="<key>RunAtLoad</key><true/><key>KeepAlive</key><true/>"
    else
      timing="<key>RunAtLoad</key><true/><key>StartInterval</key><integer>3600</integer>"
    fi
    [ -n "${UNIT_EXIT_TIMEOUT:-}" ] && timing="$timing<key>ExitTimeOut</key><integer>$UNIT_EXIT_TIMEOUT</integer>"
    local body; body="$(cat <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>$label</string>
  <key>UserName</key><string>$user</string>
  <key>WorkingDirectory</key><string>$dir</string>
  <key>ProgramArguments</key><array><string>/bin/bash</string><string>-lc</string><string>$xcmd</string></array>
  $timing
  <key>StandardOutPath</key><string>${UNIT_LOG_DIR:-/tmp}/$name.log</string>
  <key>StandardErrorPath</key><string>${UNIT_LOG_DIR:-/tmp}/$name.log</string>
</dict></plist>
PLIST
)"
    if [ -n "${UNIT_KEEP:-}" ] && [ "$(sudo cat "$plist" 2>/dev/null)" = "$body" ] && sudo launchctl print "system/$label" >/dev/null 2>&1; then
      echo "$name is running and unchanged"; return 0
    fi
    printf '%s\n' "$body" | sudo tee "$plist" >/dev/null
    sudo launchctl bootout system "$plist" 2>/dev/null || true
    sudo launchctl bootstrap system "$plist"
  else
    echo "install_unit: unsupported OS $OS. Set up '$name' by hand: $cmd" >&2
    return 1
  fi
  echo "installed $name${sched:+ ($sched)}"
}

# On a Mac, Colima and Ollama run as LaunchDaemons that run as the owner, never as Homebrew's
# LaunchAgents (brew services). A LaunchAgent starts only when the owner logs in. A LaunchDaemon
# starts at each start-up, and the kit stops the daemon before each restart (cluster/colima.mjs).
#   mac_services <Colima profile, or empty for none> <Ollama port, or empty for none>
mac_services() {
  [ "$OS" = Darwin ] || return 0
  local profile="$1" port="$2" bin kit i
  kit="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  if [ -n "$profile" ]; then
    bin="$(command -v colima)" || { echo "Colima is not installed. Install Colima with: brew install colima"; return 1; }
    if brew services list 2>/dev/null | awk '$1 == "colima" && $2 != "none" { f = 1 } END { exit !f }'; then
      colima stop --profile "$profile" || true
      brew services stop colima
    fi
    # colima stop can take a minute, and launchd's default wait is 20 seconds.
    UNIT_EXIT_TIMEOUT=150 UNIT_KEEP=1 install_unit colima "HOME=$HOME PATH=$(dirname "$bin"):/usr/bin:/bin:/usr/sbin:/sbin exec $kit/colima-service.sh $profile" "$HOME" "$(id -un)"
    for i in $(seq 90); do docker info >/dev/null 2>&1 && break; [ "$i" = 90 ] && { echo "Colima's VM $profile did not start. Read /tmp/colima.log."; return 1; }; sleep 2; done
  fi
  if [ -n "$port" ]; then
    bin="$(command -v ollama)" || { echo "site.json gives this computer an Ollama server, and Ollama is not installed. Install Ollama with: brew install ollama"; return 1; }
    if brew services list 2>/dev/null | awk '$1 == "ollama" && $2 != "none" { f = 1 } END { exit !f }'; then brew services stop ollama; fi
    UNIT_KEEP=1 install_unit ollama "HOME=$HOME OLLAMA_HOST=127.0.0.1:$port exec $bin serve" "$HOME" "$(id -un)"
  fi
}

# Remove a service or scheduled job that install_unit installed. Safe when the unit does not exist.
uninstall_unit() {
  local name="$1"
  # A unit that was never installed needs no sudo, and no password.
  if [ "$OS" = Linux ] && [ ! -e "/etc/systemd/system/$name.service" ] && [ ! -e "/etc/systemd/system/$name.timer" ]; then return 0; fi
  if [ "$OS" = Darwin ] && [ ! -e "/Library/LaunchDaemons/io.recursica.$name.plist" ]; then return 0; fi
  if [ "$OS" = Linux ]; then
    sudo systemctl disable --now "$name.service" "$name.timer" >/dev/null 2>&1 || true
    sudo rm -f "/etc/systemd/system/$name.service" "/etc/systemd/system/$name.timer"
    sudo systemctl daemon-reload
  elif [ "$OS" = Darwin ]; then
    local plist="/Library/LaunchDaemons/io.recursica.$name.plist"
    sudo launchctl bootout system "$plist" >/dev/null 2>&1 || true
    sudo rm -f "$plist"
  fi
  echo "removed $name"
}

# Point one agent's Hermes home at the stack's gateway, with the agent's own gateway key, and clear
# every cloud key out of the home (gateway/hermes-access.mjs). Reads $KIT_OUT and $CC_DIR. The agent
# asks for its first route in site.json. With "env", the home's .env also gets the gateway's address
# and the agent's gateway key.
#   gateway_access <handle> <hermes home> [env]
gateway_access() {
  local handle="$1" home="$2" kit route url
  kit="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
  route="$(node -e 'const g = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")); const a = g.agents?.[process.argv[2]] ?? g.fallback; process.stdout.write(a?.routes?.[0] ?? "")' "$KIT_OUT/gateway.json" "$handle")"
  [ -n "$route" ] || { echo "$handle: site.json has no route, so $handle has no model to ask for. Add a route."; return 1; }
  if grep -q '^EGRESS=on' "$KIT_OUT/tenant.env"; then url=http://cc-gateway:4000/v1
  else url="http://localhost:$(sed -n 's/^GATEWAY_PORT=//p' "$KIT_OUT/tenant.env")/v1"; fi
  sudo "$(command -v node)" "$kit/gateway/hermes-access.mjs" "$home" "$handle" "$CC_DIR/gateway-state" "$url" "$route" ${3:+"$3"}
  # The router reads the new key's record in the state folder, and the agent reads its .env.
  own_for_docker "$CC_DIR/gateway-state"
  if [ -n "${3:-}" ]; then own_for_docker "$home/.env"; fi
}

# Pin an image tag to the exact version (digest) in the stack's images.lock. The first use records
# the version pulled then. The weekly image refresh (cluster/images.mjs) moves a pin to a newer
# version only after the newer version has been out for 7 days.
pin_image() {
  local tag="$1" lock="${IMAGES_LOCK:-$CC_DIR/images.lock}" ref
  [ -f "$lock" ] || echo '{}' > "$lock"
  ref="$(node -e 'const l = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")); process.stdout.write(l[process.argv[2]]?.ref ?? "")' "$lock" "$tag")"
  if [ -z "$ref" ]; then
    docker pull -q "$tag" >/dev/null
    ref="$(docker image inspect -f '{{index .RepoDigests 0}}' "$tag")"
    node -e 'const fs = require("fs"); const [f, t, r] = process.argv.slice(1); const l = JSON.parse(fs.readFileSync(f, "utf8")); l[t] = { ref: r, since: new Date().toISOString() }; fs.writeFileSync(f, JSON.stringify(l, null, 2) + "\n")' "$lock" "$tag" "$ref"
  fi
  printf '%s' "$ref"
}

