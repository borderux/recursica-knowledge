#!/usr/bin/env bash
# Shared helpers for the kit. Sourced, never run. Works on Linux (GNU) and macOS (BSD).

OS="$(uname -s)"   # Linux | Darwin
# load_env_file: reads the rendered app.env, porter.env and tenant.env without running a value.
# shellcheck source=circlechat/kit/env-file.sh
. "$(dirname "${BASH_SOURCE[0]}")/env-file.sh"
# stack_dir and workspace_dir: the stack's folders, new names first (kit/stack-paths.sh).
# shellcheck source=circlechat/kit/stack-paths.sh
. "$(dirname "${BASH_SOURCE[0]}")/stack-paths.sh"

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

# network-step begin: the hold on network steps
# A held step can cut remote access or interrupt running work. Steps that can cut remote access
# change the firewall rules, pf.conf, nftables or Tailscale's settings. Steps that can interrupt
# running work move the stack's files or Docker networks, or remove the stack's jobs. The markers
# keep the name "network step" for both kinds. Each held step in a setup sits between a
# "network-step begin" line and a
# "network-step end" line, and starts with network_held. With KIT_HOLD_NETWORK=1, network_held
# skips the step and prints one line. The update job sets KIT_HOLD_NETWORK=1 for each setup it runs
# (cluster/follow-main.mjs). A person who runs a setup by hand leaves KIT_HOLD_NETWORK unset, and
# every step runs. Network code, such as the job installer below, runs in a network step but sits
# outside the steps, between "network-code begin" and "network-code end" lines. The update job
# counts an edit there as a network change for install-cluster.sh.
#   network_held <what the step changes>   true when the step waits for a person
network_held() {
  [ "${KIT_HOLD_NETWORK:-}" = 1 ] || return 1
  echo "Held for a person, with KIT_HOLD_NETWORK=1: $1."
}
# The last line of a setup's run with no hold. Records the kit commit the setup's network steps ran
# from, in ~/.recursica-kit/network-applied/<setup>. The update job reads the file, and clears the
# network change that waited for a person once the commit holds the change.
#   network_applied <setup name, such as install-cluster.sh>
network_applied() {
  local dir="${NETWORK_APPLIED_DIR:-$HOME/.recursica-kit/network-applied}" commit
  [ "${KIT_HOLD_NETWORK:-}" = 1 ] && return 0
  commit="$(git -C "$(dirname "${BASH_SOURCE[0]}")" rev-parse HEAD 2>/dev/null || true)"
  [[ "$commit" =~ ^[0-9a-f]{40}$ ]] || return 0
  mkdir -p "$dir" && printf '%s\n' "$commit" > "$dir/$1"
}
# network-step end

# Read one value from site.json: site_get '.repos.app'
site_get() { node -e '
  const s = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
  const v = process.argv[2].split(".").filter(Boolean).reduce((o, k) => (o == null ? o : o[k]), s);
  if (v !== undefined && v !== null) process.stdout.write(typeof v === "object" ? JSON.stringify(v) : String(v));
' "$SITE" "$1"; }

# network-code begin: the job installer, which writes the firewall's start-up job
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
# network-code end

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

# network-code begin: the job installer, which writes the firewall's start-up job
# Writes a unit file only when the file's text changes. Returns 0 after a write, 1 for no change,
# and 2 after a write that changed only the Description line. A new description needs a systemd
# reload, never a restart, so a kit that renames its units leaves each service running.
#   write_unit <file> <text>
write_unit() {
  local old
  old="$(cat "$1" 2>/dev/null)" || old=""
  [ "$old" = "$2" ] && return 1
  printf '%s\n' "$2" | sudo tee "$1" >/dev/null
  if [ -n "$old" ] && [ "$(grep -v '^Description=' <<<"$old")" = "$(grep -v '^Description=' <<<"$2")" ]; then return 2; fi
  return 0
}

# A fingerprint of the files a service reads at the start. A missing file counts as empty. sudo
# reads each file, since a secrets file can belong to root.
#   settings_fingerprint <file>...
settings_fingerprint() {
  local f
  for f in "$@"; do printf '%s\0' "$f"; sudo cat "$f" 2>/dev/null || true; printf '\0'; done \
    | { sha256sum 2>/dev/null || shasum -a 256; } | cut -c1-16
}

# Install a long-running service or a scheduled job, the native way for this OS.
#   install_unit NAME "COMMAND" [WORKDIR] [USER] [SCHEDULE]
# SCHEDULE empty = keep running (restart on failure, start at boot); "boot" = run once at each
# start-up; "hourly" = every hour; or a fixed time as a systemd calendar line: "*-*-* 02:00" every
# day, "Sun *-*-* 03:00" every Sunday, "*-*-01 03:30" on the first of each month. A fixed time also
# works on macOS, where launchd gets the same day and time.
# A rerun rewrites a unit only when the unit changes. A running service with a changed unit
# restarts, so the new command and settings take effect. A service with no change keeps running.
# UNIT_SETTINGS names the files a service reads at the start, such as a secrets file or the kit's
# package.json. A change to one of the files counts as a change to the unit. The unit holds only
# a fingerprint of the files, never the files' contents.
# On macOS, UNIT_EXIT_TIMEOUT sets the seconds launchd waits for the service to stop, 20 by default.
# On macOS, launchd gives a job no HOME. A root job gets HOME=/var/root, root's home folder, so a
# program that keeps a cache in the home folder, such as restic in the backup, finds one.
install_unit() {
  local name="$1" cmd="$2" dir="${3:-$HOME}" user="${4:-$(id -un)}" sched="${5:-}" stamp=""
  [ -n "${UNIT_SETTINGS:-}" ] && stamp="settings $(settings_fingerprint $UNIT_SETTINGS)"
  if [ "$OS" = Linux ]; then
    # SYSTEMD_UNIT_DIR is for the tests.
    local units="${SYSTEMD_UNIT_DIR:-/etc/systemd/system}" changed="" relabel=""
    local unit="$units/$name.service" timer="$units/$name.timer"
    if [ "$sched" = boot ]; then
      write_unit "$unit" "$(cat <<UNIT
[Unit]
Description=$name (agent cluster kit)
After=network-online.target docker.service
Wants=network-online.target
${stamp:+# $stamp
}
[Service]
Type=oneshot
RemainAfterExit=yes
User=$user
WorkingDirectory=$dir
ExecStart=/bin/bash -lc '$cmd'

[Install]
WantedBy=multi-user.target
UNIT
)" && changed=1 || { [ $? != 2 ] || relabel=1; }
      if [ -n "$changed$relabel" ]; then sudo systemctl daemon-reload; fi
      sudo systemctl enable --quiet "$name.service"
    elif [ -z "$sched" ]; then
      write_unit "$unit" "$(cat <<UNIT
[Unit]
Description=$name (agent cluster kit)
After=network-online.target docker.service
Wants=network-online.target
${stamp:+# $stamp
}
[Service]
User=$user
WorkingDirectory=$dir
ExecStart=/bin/bash -lc '$cmd'
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
UNIT
)" && changed=1 || { [ $? != 2 ] || relabel=1; }
      if [ -n "$changed" ]; then
        sudo systemctl daemon-reload
        sudo systemctl enable --quiet "$name.service"
        # restart starts a stopped service too.
        sudo systemctl restart "$name.service"
        echo "$name changed: restarted"; return 0
      fi
      # A new description alone needs a reload, and the service keeps running.
      if [ -n "$relabel" ]; then sudo systemctl daemon-reload; fi
      sudo systemctl enable --quiet --now "$name.service"
      echo "$name is running and unchanged${relabel:+, with a new description}"; return 0
    else
      write_unit "$unit" "$(cat <<UNIT
[Unit]
Description=$name (agent cluster kit)
${stamp:+# $stamp
}
[Service]
Type=oneshot
User=$user
WorkingDirectory=$dir
ExecStart=/bin/bash -lc '$cmd'
UNIT
)" && changed=1 || { [ $? != 2 ] || relabel=1; }
      write_unit "$timer" "$(cat <<UNIT
[Unit]
Description=$name schedule

[Timer]
OnCalendar=$sched
Persistent=true

[Install]
WantedBy=timers.target
UNIT
)" && changed=1 || { [ $? != 2 ] || relabel=1; }
      if [ -n "$changed$relabel" ]; then sudo systemctl daemon-reload; fi
      sudo systemctl enable --quiet --now "$name.timer"
    fi
    [ -n "$changed" ] || { echo "$name is unchanged"; return 0; }
  elif [ "$OS" = Darwin ]; then
    # LAUNCHD_DIR is for the tests.
    local label="io.recursica.$name" plist="${LAUNCHD_DIR:-/Library/LaunchDaemons}/io.recursica.$name.plist" timing
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
${stamp:+  <!-- $stamp -->
}  <key>Label</key><string>$label</string>
  <key>UserName</key><string>$user</string>
  <key>WorkingDirectory</key><string>$dir</string>
  <key>ProgramArguments</key><array><string>/bin/bash</string><string>-lc</string><string>$xcmd</string></array>
  $timing
  <key>StandardOutPath</key><string>${UNIT_LOG_DIR:-/tmp}/$name.log</string>
  <key>StandardErrorPath</key><string>${UNIT_LOG_DIR:-/tmp}/$name.log</string>
</dict></plist>
PLIST
)"
    if [ "$(sudo cat "$plist" 2>/dev/null)" = "$body" ] && sudo launchctl print "system/$label" >/dev/null 2>&1; then
      echo "$name is running and unchanged"; return 0
    fi
    printf '%s\n' "$body" | sudo tee "$plist" >/dev/null
    # bootout stops a loaded service, and bootstrap starts the service with the new plist.
    if sudo launchctl bootout system "$plist" 2>/dev/null; then
      sudo launchctl bootstrap system "$plist"
      echo "$name changed: restarted"; return 0
    fi
    sudo launchctl bootstrap system "$plist"
  else
    echo "install_unit: unsupported OS $OS. Set up '$name' by hand: $cmd" >&2
    return 1
  fi
  echo "installed $name${sched:+ ($sched)}"
}
# network-code end

# The label of each LaunchDaemon outside the kit whose program runs <command>, such as local.colima
# for colima. A daemon the kit installs has a label that starts with io.recursica.
#   foreign_daemons <command>
foreign_daemons() {
  local f
  for f in "${LAUNCH_DAEMONS_DIR:-/Library/LaunchDaemons}"/*.plist; do
    [ -f "$f" ] || continue
    case "${f##*/}" in io.recursica.*) continue ;; esac
    { plutil -extract Program raw -o - "$f" 2>/dev/null; plutil -extract ProgramArguments json -o - "$f" 2>/dev/null; } \
      | grep -w -- "$1" >/dev/null && plutil -extract Label raw -o - "$f" 2>/dev/null
  done
  return 0
}

# The Colima profile of the VM that runs this Mac's Docker. Prints nothing when Docker runs
# elsewhere, such as in OrbStack, or when the Mac has no Colima VM.
#   - The Docker context is colima, for the profile default, or colima-<profile>.
#   - A stopped VM has no Docker context, and Docker answers on no other context. The profile is
#     the folder ~/.colima/<profile> that holds colima.yaml. With two or more such folders, the
#     profile is the one the kit's Colima service already runs. Otherwise the profile is unknown,
#     and the function says so on stderr and returns 1.
#   colima_profile
colima_profile() {
  local ctx dir="${COLIMA_HOME:-$HOME/.colima}" d found=() kept
  ctx="$(docker context show 2>/dev/null || true)"
  case "$ctx" in
    colima) echo default; return 0 ;;
    colima-*) echo "${ctx#colima-}"; return 0 ;;
  esac
  docker info >/dev/null 2>&1 && return 0
  for d in "$dir"/*/colima.yaml; do
    [ -f "$d" ] || continue
    d="${d%/colima.yaml}"; d="${d##*/}"
    case "$d" in _*) continue ;; esac
    found+=("$d")
  done
  [ ${#found[@]} -gt 0 ] || return 0
  [ ${#found[@]} -eq 1 ] && { echo "${found[0]}"; return 0; }
  kept="$(sed -n 's/.*colima-service\.sh \([^<[:space:]]*\).*/\1/p' "${LAUNCH_DAEMONS_DIR:-/Library/LaunchDaemons}/io.recursica.colima.plist" 2>/dev/null | head -1)"
  for d in "${found[@]}"; do [ "$d" = "$kept" ] && { echo "$d"; return 0; }; done
  echo "Colima has the profiles ${found[*]} in $dir, every VM is stopped, and no Docker context names a profile. Start the stack's VM with colima start --profile <profile>, then run setup-host.sh again." >&2
  return 1
}

# True once the kit's Colima service runs its own colima start. The service first stops a VM that
# runs outside the service, such as a VM started by hand, and that VM answers until it stops
# (kit/colima-service.sh). The service's process is launchd's pid for io.recursica.colima.
#   colima_service_started
colima_service_started() {
  local pid
  pid="$(launchctl print system/io.recursica.colima 2>/dev/null | awk '$1 == "pid" && $2 == "=" { print $3; exit }')"
  [ -n "$pid" ] || return 1
  ps -A -o ppid=,command= | awk -v p="$pid" '$1 == p && $2 ~ /(^|\/)colima$/ && $3 == "start" { f = 1 } END { exit !f }'
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
  local profile="$1" port="$2" bin kit i ctx
  shift 2
  kit="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  if [ -n "$profile" ]; then
    bin="$(command -v colima)" || { echo "Colima is not installed. Install Colima with: brew install colima"; return 1; }
    if brew services list 2>/dev/null | awk '$1 == "colima" && $2 != "none" { f = 1 } END { exit !f }'; then
      colima stop --profile "$profile" || true
      brew services stop colima
    fi
    # colima stop can take a minute, and launchd's default wait is 20 seconds.
    UNIT_EXIT_TIMEOUT=150 install_unit colima "HOME=$HOME PATH=$(dirname "$bin"):/usr/bin:/bin:/usr/sbin:/sbin exec $kit/colima-service.sh $profile" "$HOME" "$(id -un)"
    # The wait is for the service's own VM. A VM that runs outside the service answers until the
    # service stops that VM, so Docker answering alone proves nothing. colima start activates the
    # VM's Docker context, colima or colima-<profile>, which the rest of the setup uses.
    ctx=colima; [ "$profile" = default ] || ctx="colima-$profile"
    for i in $(seq 90); do
      colima_service_started && docker --context "$ctx" info >/dev/null 2>&1 && break
      [ "$i" = 90 ] && { echo "Colima's VM $profile did not start. Read /tmp/colima.log."; return 1; }
      sleep 2
    done
  fi
  if [ -n "$port" ]; then
    bin="$(command -v ollama)" || { echo "site.json gives this computer an Ollama server, and Ollama is not installed. Install Ollama with: brew install ollama"; return 1; }
    if brew services list 2>/dev/null | awk '$1 == "ollama" && $2 != "none" { f = 1 } END { exit !f }'; then brew services stop ollama; fi
    install_unit ollama "HOME=$HOME OLLAMA_HOST=127.0.0.1:$port${*:+ $*} exec $bin serve" "$HOME" "$(id -un)"
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

# network-code begin: the job installer, which writes the firewall's start-up job
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
# network-code end

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

