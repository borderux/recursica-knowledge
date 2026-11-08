# Starts WSL at boot, before anyone signs in, and keeps the distro running. Without this, WSL starts
# only when someone signs in, so after an unattended restart the cluster's services in WSL stay down.
# Run once on the Windows computer, in an Administrator PowerShell, as the account that owns the
# WSL distro:
#   powershell -ExecutionPolicy Bypass -File \\wsl.localhost\<distro>\home\<you>\recursica-knowledge\circlechat\cluster\windows\install-wsl-boot.ps1
#
# 1. The task AgentClusterWSL: starts at boot, as the distro's owner, with logon type S4U ("Do not
#    store password"), so Windows stores no password. The task runs keep-wsl.ps1, which holds the
#    distro open and starts the distro again whenever the distro stops. Task Scheduler restarts the
#    task, too, if the task itself ends.
# 2. The idle settings in the owner's .wslconfig, so WSL never shuts down when idle:
#    [wsl2] vmIdleTimeout=-1 and [general] instanceIdleTimeout=-1. Both need WSL 2.5.8 or later.
#    vmIdleTimeout works on Windows 11 only. WSL reads .wslconfig when WSL starts, so the settings
#    take effect at the next WSL restart. The script never stops WSL.
# 3. The old task Start-WSL-K3s-Ollama goes, but only once AgentClusterWSL runs and holds the
#    distro open.
# 4. With -RustDeskServer, on the computer that runs the cluster's RustDesk server in WSL:
#    [experimental] hostAddressLoopback=true in the same .wslconfig, so the computer's own RustDesk
#    client reaches the server by ID. The setting needs mirrored networking, WSL 2.5.8 or later and
#    Windows 11 version 22H2 or later; on any other computer, the script stops before any change.
#    The setting takes effect at the next WSL restart, like the idle settings.
#
# -Distro <name>: the distro to keep running. By default, the distro this script runs from.
# -DryRun: prints what the script would do, and reads the current state on Windows. Nothing changes.
#   The CI check (circlechat/ci/check-windows-scripts.ps1) runs the script this way.
param([string]$Distro = "", [switch]$RustDeskServer, [switch]$DryRun)
$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "wsl-boot-lib.ps1")
$onWindows = $env:OS -eq "Windows_NT"
$env:WSL_UTF8 = "1"
$owner = if ($onWindows) { "$env:USERDOMAIN\$env:USERNAME" } else { "(the account that runs the script)" }
if (-not $Distro) { $Distro = Get-DistroFromPath $PSScriptRoot }

# The current state, read only.
$wslVersion = $null; $distros = @(); $oldTask = $null; $task = $null
$wslconfig = if ($onWindows) { Join-Path $env:USERPROFILE ".wslconfig" } else { "" }
$configText = ""
if ($onWindows) {
  $wslVersion = Get-WslVersion ((& wsl.exe --version 2>$null) -join "`n")
  $distros = @((& wsl.exe -l -q 2>$null) | ForEach-Object { ($_ -replace "`0", "").Trim() } | Where-Object { $_ })
  $oldTask = Get-ScheduledTask -TaskName $OldWslTaskName -ErrorAction SilentlyContinue
  $task = Get-ScheduledTask -TaskName $WslTaskName -ErrorAction SilentlyContinue
  if (Test-Path $wslconfig) { $configText = [System.IO.File]::ReadAllText($wslconfig) }
}
$idleOk = Test-IdleSettingsSupported $wslVersion
$windowsBuild = if ($onWindows) { [Environment]::OSVersion.Version.Build } else { 0 }
# Off Windows, as in CI, the dry run shows the settings as if WSL had the settings.
$newConfig = Get-WslconfigTarget $configText ($idleOk -or -not $onWindows) $RustDeskServer.IsPresent
$loopbackProblems = if ($RustDeskServer -and $onWindows) { Get-HostLoopbackProblems $wslVersion $windowsBuild $configText } else { @() }

if ($DryRun) {
  Write-Host "switch RustDeskServer=$($RustDeskServer.IsPresent)"
  Write-Host "Distro: $(if ($Distro) { $Distro } else { 'unknown. Pass -Distro <name>.' })"
  Write-Host "Owner: $owner"
  if ($onWindows) {
    Write-Host "WSL version: $(if ($wslVersion) { $wslVersion } else { 'unknown' })"
    Write-Host "Distros of this account: $($distros -join ', ')"
  }
  Write-Host "Task: $WslTaskName, at boot, as the owner, logon type S4U (no stored password), run level Limited"
  Write-Host "  powershell.exe $(Get-KeeperArguments $Distro)"
  Write-Host "  no time limit; Task Scheduler restarts the task every minute if the task ends"
  if ($onWindows) { Write-Host "  now: $(if ($task) { "registered, $($task.State)" } else { 'not registered' })" }
  if ($onWindows -and -not $idleOk) {
    Write-Host "Idle settings: none. They need WSL $MinIdleSettingsVersion or later. Update WSL with wsl --update."
  }
  if ($RustDeskServer) {
    Write-Host "hostAddressLoopback: $(if ($loopbackProblems.Count) { 'the script would stop before any change:' } else { 'true, for the RustDesk server' })"
    $loopbackProblems | ForEach-Object { Write-Host "  $_" }
  }
  if ($newConfig -eq $configText) {
    Write-Host ".wslconfig: already holds each setting."
  } else {
    Write-Host ".wslconfig ($(if ($wslconfig) { $wslconfig } else { '%USERPROFILE%\.wslconfig' })) after the change, in effect at the next WSL restart:"
    $newConfig.TrimEnd() -split "\r?\n" | ForEach-Object { Write-Host "  $_" }
  }
  Write-Host "Old task ${OldWslTaskName}: $(if (-not $onWindows) { 'removed once AgentClusterWSL runs' } elseif ($oldTask) { 'present; removed once AgentClusterWSL runs' } else { 'not present' })"
  Write-Host "Dry run: nothing changed."
  exit 0
}

# The checks before any change.
if (-not $onWindows) { throw "Run this script on Windows." }
$admin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $admin) { throw "Run this script in an Administrator PowerShell. Windows registers a task with no stored password only from one." }
if (-not $Distro) { throw "No distro: the script does not run from a WSL path. Pass -Distro <name>." }
# A distro belongs to the account that registered the distro, and wsl.exe here lists this account's
# distros.
if ($distros -notcontains $Distro) { throw "$owner has no WSL distro named $Distro. Run the script as the distro's owner, or pass -Distro with one of: $($distros -join ', ')." }
if ($loopbackProblems.Count) { throw "Nothing changed. $($loopbackProblems -join ' ')" }

# 1. The keeper script, in a folder only administrators change. The task runs the script as the
#    owner, so the owner may read the script, and no account but an administrator may change the
#    script.
#    The owner may change only the logs folder.
New-Item -ItemType Directory -Force -Path "$WslBootDir\logs" | Out-Null
icacls $WslBootDir /inheritance:r /grant:r "*S-1-5-18:(OI)(CI)F" "*S-1-5-32-544:(OI)(CI)F" "${owner}:(OI)(CI)RX" | Out-Null
icacls "$WslBootDir\logs" /grant "${owner}:(OI)(CI)M" | Out-Null
Copy-Item -Force (Join-Path $PSScriptRoot "keep-wsl.ps1") (Join-Path $WslBootDir "keep-wsl.ps1")

# 2. The task. S4U runs the task as the owner with no stored password, whether or not anyone is
#    signed in. The keeper runs for as long as the computer runs, so the task has no time limit.
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument (Get-KeeperArguments $Distro)
$trigger = New-ScheduledTaskTrigger -AtStartup
$principal = New-ScheduledTaskPrincipal -UserId $owner -LogonType S4U -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable `
  -ExecutionTimeLimit ([TimeSpan]::Zero) -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) -MultipleInstances IgnoreNew
Register-ScheduledTask -TaskName $WslTaskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force | Out-Null
Write-Host "Registered ${WslTaskName}: at boot, as $owner, with no stored password."

# 3. Start the task now. WSL is already running, so the keeper joins the running distro, and
#    nothing restarts. The task runs once the keeper's wsl.exe holds the distro open.
Start-ScheduledTask -TaskName $WslTaskName
$keeper = $null
$deadline = (Get-Date).AddSeconds(60)
do {
  Start-Sleep -Seconds 3
  $state = (Get-ScheduledTask -TaskName $WslTaskName).State
  $keeper = Get-CimInstance Win32_Process -Filter "Name = 'wsl.exe'" | Where-Object { $_.CommandLine -match [regex]::Escape("-d $Distro --exec /bin/sleep infinity") }
} while ((-not $keeper -or $state -ne "Running") -and (Get-Date) -lt $deadline)
if (-not $keeper -or $state -ne "Running") {
  throw "$WslTaskName is $state, and holds no wsl.exe open. The old task $OldWslTaskName stays. See $WslBootDir\logs\wsl-keeper.log."
}
Write-Host "$WslTaskName runs, and holds $Distro open."

# 4. The old task goes, now that the new task runs.
if ($oldTask) {
  Unregister-ScheduledTask -TaskName $OldWslTaskName -Confirm:$false
  Write-Host "Removed the old task $OldWslTaskName."
}

# 5. .wslconfig: the idle settings, and on the RustDesk server's computer hostAddressLoopback. A
#    backup of .wslconfig stays next to the file, once.
if (-not $idleOk) {
  Write-Host "No idle settings: they need WSL $MinIdleSettingsVersion or later, and this computer has $wslVersion. Update WSL with wsl --update, then run this script again."
}
if ($newConfig -eq $configText) {
  Write-Host ".wslconfig already holds each setting."
} else {
  if ((Test-Path $wslconfig) -and -not (Test-Path "$wslconfig.agentcluster-backup")) { Copy-Item $wslconfig "$wslconfig.agentcluster-backup" }
  [System.IO.File]::WriteAllText($wslconfig, $newConfig)
  $written = @()
  if ($idleOk) { $written += "vmIdleTimeout=-1", "instanceIdleTimeout=-1" }
  if ($RustDeskServer) { $written += "hostAddressLoopback=true" }
  Write-Host "Wrote $($written -join ', ') to $wslconfig. The settings take effect at the next WSL restart; this script does not restart WSL."
}
