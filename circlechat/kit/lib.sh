#!/usr/bin/env bash
# Shared helpers for the CircleChat kit. Sourced, never run. Works on Linux (GNU) and macOS (BSD).

OS="$(uname -s)"   # Linux | Darwin

# In-place sed that works with both GNU sed and BSD sed (macOS).
sedi() { if sed --version >/dev/null 2>&1; then sed -i "$@"; else sed -i '' "$@"; fi; }
sudo_sedi() { if sed --version >/dev/null 2>&1; then sudo sed -i "$@"; else sudo sed -i '' "$@"; fi; }

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

# Install a long-running service or a scheduled job, the native way for this OS.
#   install_unit NAME "COMMAND" [WORKDIR] [USER] [SCHEDULE]
# SCHEDULE empty = keep running (restart on failure, start at boot); "boot" = run once at each
# start-up; "hourly" = every hour; or a fixed time as a systemd calendar line: "*-*-* 02:00" every
# day, "Sun *-*-* 03:00" every Sunday, "*-*-01 03:30" on the first of each month. A fixed time also
# works on macOS, where launchd gets the same day and time.
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
    sudo tee "$plist" >/dev/null <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>$label</string>
  <key>UserName</key><string>$user</string>
  <key>WorkingDirectory</key><string>$dir</string>
  <key>ProgramArguments</key><array><string>/bin/bash</string><string>-lc</string><string>$xcmd</string></array>
  $timing
  <key>StandardOutPath</key><string>/tmp/$name.log</string>
  <key>StandardErrorPath</key><string>/tmp/$name.log</string>
</dict></plist>
PLIST
    sudo launchctl bootout system "$plist" 2>/dev/null || true
    sudo launchctl bootstrap system "$plist"
  else
    echo "install_unit: unsupported OS $OS. Set up '$name' by hand: $cmd" >&2
    return 1
  fi
  echo "installed $name${sched:+ ($sched)}"
}
