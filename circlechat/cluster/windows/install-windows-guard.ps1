# Run once on the Beast, in an Administrator PowerShell:
#   powershell -ExecutionPolicy Bypass -File \\wsl$\Ubuntu\home\<you>\circlechat-workspace\recursica-knowledge\circlechat\cluster\windows\install-windows-guard.ps1
#
# 1. BitLocker on drive C: with TPM unlock, so the Beast still restarts on its own. Shows the
#    recovery password once: save it in the password manager.
# 2. Windows Firewall: refuse every incoming connection except Tailscale (remote access with
#    RustDesk runs over Tailscale), the decoys, and WSL services reached over Tailscale.
# 3. Windows Update: quality updates wait 7 days, no new Windows version, install at 4 a.m.
# 4. A task running as SYSTEM every minute applies the guard's requests from WSL.
$ErrorActionPreference = "Stop"
$base = "C:\ProgramData\AgentCluster"
New-Item -ItemType Directory -Force -Path "$base\requests" | Out-Null
Copy-Item -Force (Join-Path $PSScriptRoot "guard-windows.ps1") "$base\guard-windows.ps1"
# WSL writes requests as the signed-in user.
icacls "$base\requests" /grant "$($env:USERNAME):(OI)(CI)M" | Out-Null

# 1. BitLocker
$v = Get-BitLockerVolume -MountPoint "C:"
if ($v.ProtectionStatus -ne "On") {
  Enable-BitLocker -MountPoint "C:" -TpmProtector -UsedSpaceOnly -EncryptionMethod XtsAes256 | Out-Null
  $rp = Add-BitLockerKeyProtector -MountPoint "C:" -RecoveryPasswordProtector
  Write-Host "BitLocker recovery password for C: (save it in the password manager now):"
  Write-Host ($rp.KeyProtector | Where-Object KeyProtectorType -eq RecoveryPassword).RecoveryPassword
} else { Write-Host "BitLocker is already on for C:." }
Get-BitLockerVolume | Where-Object { $_.MountPoint -ne "C:" -and $_.VolumeType -eq "Data" -and $_.ProtectionStatus -ne "On" } |
  ForEach-Object { Write-Host "Drive $($_.MountPoint) is not encrypted. Turn on BitLocker for it with auto-unlock." }

# 2. Firewall
Set-NetFirewallProfile -All -DefaultInboundAction Block -DefaultOutboundAction Allow -NotifyOnListen False -LogBlocked True
$keep = 'tailscale|AgentGuard'
$disabled = Get-NetFirewallRule -Direction Inbound -Action Allow -Enabled True | Where-Object {
  $app = ($_ | Get-NetFirewallApplicationFilter).Program
  -not (($_.DisplayName -match $keep) -or ($app -match $keep))
}
$disabled | Select-Object -ExpandProperty Name | Out-File -Append "$base\disabled-rules.txt"
$disabled | Disable-NetFirewallRule
New-NetFirewallRule -DisplayName "AgentGuard: Tailscale peers" -Direction Inbound -RemoteAddress 100.64.0.0/10 -Action Allow -ErrorAction SilentlyContinue | Out-Null
New-NetFirewallRule -DisplayName "AgentGuard: decoys" -Direction Inbound -Protocol TCP -LocalPort 2222,2121,8088 -Action Allow -ErrorAction SilentlyContinue | Out-Null
# WSL in mirrored networking mode sits behind the Hyper-V firewall.
$wsl = '{40E0AC32-46A5-438A-A0B2-2B479E8F2E90}'
Set-NetFirewallHyperVVMSetting -Name $wsl -DefaultInboundAction Block -DefaultOutboundAction Allow
New-NetFirewallHyperVRule -Name "AgentGuard-Tailscale" -DisplayName "AgentGuard: Tailscale peers to WSL" -Direction Inbound -VMCreatorId $wsl -RemoteAddresses 100.64.0.0/10 -Action Allow -ErrorAction SilentlyContinue | Out-Null
New-NetFirewallHyperVRule -Name "AgentGuard-Decoys" -DisplayName "AgentGuard: decoys in WSL" -Direction Inbound -VMCreatorId $wsl -Protocol TCP -LocalPorts 2222,2121,8088 -Action Allow -ErrorAction SilentlyContinue | Out-Null

# 3. Windows Update
$wu = "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate"
$au = "$wu\AU"
New-Item -Force -Path $au | Out-Null
$ver = (Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion").DisplayVersion
Set-ItemProperty $wu DeferQualityUpdates 1 -Type DWord
Set-ItemProperty $wu DeferQualityUpdatesPeriodInDays 7 -Type DWord
Set-ItemProperty $wu TargetReleaseVersion 1 -Type DWord
Set-ItemProperty $wu ProductVersion "Windows 11" -Type String
Set-ItemProperty $wu TargetReleaseVersionInfo $ver -Type String
Set-ItemProperty $au AUOptions 4 -Type DWord
Set-ItemProperty $au ScheduledInstallDay 0 -Type DWord
Set-ItemProperty $au ScheduledInstallTime 4 -Type DWord
Set-ItemProperty $au NoAutoRebootWithLoggedOnUsers 0 -Type DWord

# 4. The guard task
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -NonInteractive -ExecutionPolicy Bypass -File `"$base\guard-windows.ps1`""
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 1)
Register-ScheduledTask -TaskName "AgentClusterGuard" -Action $action -Trigger $trigger -User "SYSTEM" -RunLevel Highest -Force | Out-Null
Write-Host "Done. Windows stays on version $ver, takes quality updates after 7 days at 4 a.m., and refuses incoming connections except Tailscale and the decoys."
