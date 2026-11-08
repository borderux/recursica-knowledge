# Tests wsl-boot-lib.ps1, the parts of install-wsl-boot.ps1 that change nothing, and the dry run.
# Runs on any computer with PowerShell 5.1 or later:
#   pwsh -NoProfile -File circlechat/cluster/windows/wsl-boot.test.ps1
$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "wsl-boot-lib.ps1")
$script:failed = 0
function Check([string]$Name, [bool]$Ok, [string]$Detail = "") {
  if ($Ok) { Write-Host "pass: $Name" } else { $script:failed++; Write-Host "FAIL: $Name $Detail" }
}
$nl = "`r`n"

Check "the distro comes from a \\wsl.localhost path" ((Get-DistroFromPath '\\wsl.localhost\Ubuntu-24.04\home\owner\kit\circlechat\cluster\windows') -eq "Ubuntu-24.04")
Check "the distro comes from a \\wsl$ path" ((Get-DistroFromPath '\\wsl$\Debian\home\owner') -eq "Debian")
Check "a path outside WSL gives no distro" ((Get-DistroFromPath 'C:\Users\owner\kit') -eq "" -and (Get-DistroFromPath '/home/owner/kit') -eq "")

Check "the WSL version comes from wsl --version, in English" ((Get-WslVersion "WSL version: 2.5.10.0`nKernel version: 6.6.87.2-1") -eq [version]"2.5.10")
Check "the WSL version comes from wsl --version, in another language" ((Get-WslVersion "Version von WSL: 2.6.1.0") -eq [version]"2.6.1")
Check "text with no version gives none" ($null -eq (Get-WslVersion "wsl: unknown option"))
Check "the idle settings need WSL 2.5.8 or later" ((Test-IdleSettingsSupported ([version]"2.5.8")) -and (Test-IdleSettingsSupported ([version]"2.5.10")) -and -not (Test-IdleSettingsSupported ([version]"2.4.13")) -and -not (Test-IdleSettingsSupported $null))

# .wslconfig: each other line stays, a key in the section is replaced, and a missing section is added.
$before = "[wsl2]${nl}networkingMode=mirrored${nl}firewall=true${nl}memory=48GB${nl}"
$after = Get-WslconfigWithIdleSettings $before
Check "the idle settings join an existing [wsl2], and add [general]" ($after -eq "[wsl2]${nl}networkingMode=mirrored${nl}firewall=true${nl}memory=48GB${nl}vmIdleTimeout=-1${nl}${nl}[general]${nl}instanceIdleTimeout=-1${nl}") $after
Check "a second run changes nothing" ((Get-WslconfigWithIdleSettings $after) -eq $after)
$old = "[general]${nl}InstanceIdleTimeout = 15000${nl}${nl}[wsl2]${nl}VMIdleTimeout=60000${nl}memory=8GB${nl}"
$fixed = Get-WslconfigWithIdleSettings $old
Check "an existing value is replaced, in any case, and the order stays" ($fixed -eq "[general]${nl}instanceIdleTimeout=-1${nl}${nl}[wsl2]${nl}vmIdleTimeout=-1${nl}memory=8GB${nl}") $fixed
Check "an empty file gets both sections" ((Get-WslconfigWithIdleSettings "") -eq "[wsl2]${nl}vmIdleTimeout=-1${nl}${nl}[general]${nl}instanceIdleTimeout=-1${nl}")
$commented = "[wsl2]${nl}# vmIdleTimeout=1000${nl}memory=8GB${nl}"
Check "a commented-out key stays a comment" ((Set-IniValue $commented "wsl2" "vmIdleTimeout" "-1") -eq "[wsl2]${nl}# vmIdleTimeout=1000${nl}memory=8GB${nl}vmIdleTimeout=-1${nl}")
Check "a key in another section is not touched" ((Set-IniValue "[other]${nl}vmIdleTimeout=5${nl}" "wsl2" "vmIdleTimeout" "-1") -eq "[other]${nl}vmIdleTimeout=5${nl}${nl}[wsl2]${nl}vmIdleTimeout=-1${nl}")

$keeper = Get-KeeperArguments "Ubuntu-24.04"
Check "the task runs the keeper from the administrators' folder, for the distro" ($keeper -match [regex]::Escape('-File "C:\ProgramData\AgentCluster\wsl\keep-wsl.ps1" -Distro "Ubuntu-24.04"'))

# The dry run: changes nothing, and says what would change, on any computer.
$shell = (Get-Process -Id $PID).Path
$out = (& $shell -NoProfile -NonInteractive -File (Join-Path $PSScriptRoot "install-wsl-boot.ps1") -Distro "Ubuntu-24.04" -DryRun 2>&1 | Out-String)
Check "the dry run exits 0" ($LASTEXITCODE -eq 0) $out
foreach ($want in @("Distro: Ubuntu-24.04", "Task: AgentClusterWSL, at boot, as the owner, logon type S4U (no stored password)", "removed once AgentClusterWSL runs", "Dry run: nothing changed.")) {
  Check "the dry run says: $want" ($out -match [regex]::Escape($want)) $out
}

if ($script:failed) { Write-Host "$($script:failed) test(s) failed."; exit 1 }
Write-Host "Every test passes."
