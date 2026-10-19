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

# Install a long-running service or a scheduled job, the native way for this OS.
#   install_unit NAME "COMMAND" [WORKDIR] [USER] [SCHEDULE]
# SCHEDULE empty = keep running (restart on failure, start at boot); "boot" = run once at each
# start-up; "hourly" = every hour.
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
