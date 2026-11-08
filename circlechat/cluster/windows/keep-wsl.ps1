# Keeps one WSL distro running. The task AgentClusterWSL runs this script at boot, as the account
# that owns the distro, before anyone signs in (install-wsl-boot.ps1 copies the script to
# C:\ProgramData\AgentCluster\wsl).
#
# The script holds a "sleep infinity" open in the distro, which starts the distro and keeps the
# distro running. When the distro stops, the sleep ends, and the script starts the distro again:
# after 10 seconds, and after up to 5 minutes when the distro keeps stopping within a minute. Each
# start and stop goes to logs\wsl-keeper.log next to the script.
param([Parameter(Mandatory = $true)][string]$Distro)
$log = Join-Path $PSScriptRoot "logs\wsl-keeper.log"
# wsl.exe writes UTF-16 unless WSL_UTF8 is set.
$env:WSL_UTF8 = "1"
function Write-KeeperLog([string]$Line) {
  try {
    if ((Test-Path $log) -and (Get-Item $log).Length -gt 1MB) { Move-Item -Force $log "$log.1" }
    Add-Content -Path $log -Value "$(Get-Date -Format o) $Line"
  } catch { }
}
$quickStops = 0
while ($true) {
  $started = Get-Date
  Write-KeeperLog "starting $Distro"
  & wsl.exe -d $Distro --exec /bin/sleep infinity
  $code = $LASTEXITCODE
  $seconds = [int]((Get-Date) - $started).TotalSeconds
  Write-KeeperLog "$Distro stopped after $seconds s, exit code $code"
  if ($seconds -lt 60) { $quickStops++ } else { $quickStops = 0 }
  Start-Sleep -Seconds ([Math]::Min(300, 10 * [Math]::Pow(2, [Math]::Min($quickStops, 5))))
}
