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
# On macOS, launchd gives a job no HOME. A root job gets HOME=/var/root, root's home folder, so a
# program that keeps a cache in the home folder, such as restic in the backup, finds one.
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
    [ "$user" = root ] && timing="$timing<key>EnvironmentVariables</key><dict><key>HOME</key><string>/var/root</string></dict>"
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

# The label of each LaunchDaemon outside the kit whose program runs <command>, such as local.colima
# for colima. A daemon the kit installs has a label that starts with io.recursica.
#   foreign_daemons <command>
foreign_daemons() {
  local f
  for f in "${LAUNCH_DAEMONS_DIR:-/Library/LaunchDaemons}"/*.plist; do
    [ -f "$f" ] || continue
    case "${f##*/}" in io.recursica.*) continue ;; esac
    { plutil -extract Program raw -o - "$f" 2>/dev/null; plutil -extract ProgramArguments json -o - "$f" 2>/dev/null; } \
      | grep -qw -- "$1" && plutil -extract Label raw -o - "$f" 2>/dev/null
  done
  return 0
}

# Before the kit installs its own Colima or Ollama service: a LaunchDaemon outside the kit that
# already runs Colima or Ollama stops the setup, with the commands that retire the daemon. Two
# services would fight over one VM, or over one port. Run the check before the setup changes anything.
#   mac_services_check <Colima profile, or empty for none> <Ollama port, or empty for none>
mac_services_check() {
  [ "$OS" = Darwin ] || return 0
  local found=() cmd label
  for cmd in ${1:+colima} ${2:+ollama}; do
    while IFS= read -r label; do [ -n "$label" ] && found+=("$cmd $label"); done < <(foreign_daemons "$cmd")
  done
  [ ${#found[@]} -gt 0 ] || return 0
  echo "A LaunchDaemon outside the kit already runs Colima or Ollama on this Mac. The kit runs both as its own"
  echo "LaunchDaemons, io.recursica.colima and io.recursica.ollama, and two services would fight over one"
  echo "VM or one port. setup-host.sh changed nothing. Move each daemon's settings to site.json, such as the"
  echo "Ollama server's context_length, parallel and keep_alive. Then retire each daemon, and run"
  echo "setup-host.sh again:"
  for label in "${found[@]}"; do
    echo "  ${label%% *}: sudo launchctl bootout system/${label#* } && sudo rm ${LAUNCH_DAEMONS_DIR:-/Library/LaunchDaemons}/${label#* }.plist"
  done
  echo "See circlechat/README.md, \"Colima and Ollama on a Mac\"."
  return 1
}

# On a Mac, Colima and Ollama run as LaunchDaemons that run as the owner, never as Homebrew's
# LaunchAgents (brew services). A LaunchAgent starts only when the owner logs in. A LaunchDaemon
# starts at each start-up, and the kit stops the daemon before each restart (cluster/colima.mjs).
# Ollama listens on 127.0.0.1 only, with the settings from site.json (kit/render.mjs ollamaService).
#   mac_services <Colima profile, or empty for none> <Ollama port, or empty for none> [NAME=value ...]
mac_services() {
  [ "$OS" = Darwin ] || return 0
  local profile="$1" port="$2" bin kit i
  shift 2
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
    UNIT_KEEP=1 install_unit ollama "HOME=$HOME OLLAMA_HOST=127.0.0.1:$port${*:+ $*} exec $bin serve" "$HOME" "$(id -un)"
  fi
}

# The outgoing filter's image, built once for each version of circlechat/egress. The tag carries a
# hash of the folder's files, so setup-host.sh and setup-node.sh use the same image, and a second
# build never moves the tag away from a running filter. Prints the tag.
egress_image() {
  local dir tag
  dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/../egress" && pwd)"
  tag="recursica/egress:$(node -e '
    const fs = require("fs"), path = require("path"), h = require("crypto").createHash("sha256");
    for (const f of fs.readdirSync(process.argv[1]).sort()) h.update(f + "\0").update(fs.readFileSync(path.join(process.argv[1], f))).update("\0");
    process.stdout.write(h.digest("hex").slice(0, 12));
  ' "$dir")"
  docker image inspect "$tag" >/dev/null 2>&1 || docker build -q -t "$tag" "$dir" >/dev/null || return 1
  printf '%s' "$tag"
}

# Recreate each of the kit's filter containers (cc-egress*, cc-jobs-egress*) that runs an image other
# than <tag>, with the container's restart policy, hosts, mounts, networks and network aliases.
# setup-host.sh starts cc-egress and setup-node.sh starts cc-jobs-egress, and either script may
# build a new image: the other script's container then moves to the new image too.
#   refresh_egress <tag>
refresh_egress() {
  local tag="$1" id c kind a b line net
  local args connects aliases
  id="$(docker image inspect -f '{{.Id}}' "$tag")" || return 1
  for c in $(docker ps -a --format '{{.Names}}' | grep -E '^cc-(jobs-)?egress(-[a-z0-9-]+)?$' || true); do
    [ "$(docker inspect -f '{{.Image}}' "$c")" = "$id" ] && continue
    args=(); connects=()
    while IFS=$'\t' read -r kind a b; do
      case "$kind" in run) args+=("$a") ;; connect) connects+=("$a"$'\t'"$b") ;; esac
    done < <(docker inspect "$c" | node -e '
      const [c] = JSON.parse(require("fs").readFileSync(0, "utf8"));
      const name = c.Name.replace(/^\//, ""), h = c.HostConfig, out = [];
      const run = (...a) => a.forEach((x) => out.push(`run\t${x}`));
      run("--name", name, "--restart", h.RestartPolicy?.Name || "no");
      for (const x of h.ExtraHosts ?? []) run("--add-host", x);
      for (const x of h.Binds ?? []) run("-v", x);
      const nets = Object.entries(c.NetworkSettings?.Networks ?? {});
      const aliases = (n) => (n.Aliases ?? []).filter((a) => a !== name && !c.Id.startsWith(a));
      nets.forEach(([net, n], i) => {
        if (i === 0) { run("--network", net); for (const a of aliases(n)) run("--network-alias", a); }
        else out.push(`connect\t${net}\t${aliases(n).join(",")}`);
      });
      console.log(out.join("\n"));
    ')
    docker rm -f "$c" >/dev/null
    docker run -d "${args[@]}" "$tag" >/dev/null
    for line in ${connects[@]+"${connects[@]}"}; do
      net="${line%%$'\t'*}"; aliases=()
      IFS=, read -ra b <<<"${line#*$'\t'}"
      for a in ${b[@]+"${b[@]}"}; do aliases+=(--alias "$a"); done
      docker network connect ${aliases[@]+"${aliases[@]}"} "$net" "$c"
    done
    echo "Recreated $c with the new filter image $tag."
  done
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

