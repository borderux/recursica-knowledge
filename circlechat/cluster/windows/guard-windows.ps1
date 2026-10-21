# Runs every minute as SYSTEM. Applies the guard's requests from WSL: block or unblock an address,
# and turn the lockdown rules on or off. Each request is a JSON file in requests\.
$base = "C:\ProgramData\AgentCluster"
$wsl = '{40E0AC32-46A5-438A-A0B2-2B479E8F2E90}'
function Log($m) { Add-Content "$base\guard.log" "$(Get-Date -Format o) $m" }
Get-ChildItem "$base\requests\*.json" -ErrorAction SilentlyContinue | Sort-Object Name | ForEach-Object {
  try { $r = Get-Content $_.FullName -Raw | ConvertFrom-Json } catch { Remove-Item $_.FullName; return }
  switch ($r.action) {
    "block" {
      if ($r.ip -match '^[0-9a-fA-F:.]+$') {
        New-NetFirewallRule -DisplayName "AgentGuard block $($r.ip)" -Direction Inbound -RemoteAddress $r.ip -Action Block -ErrorAction SilentlyContinue | Out-Null
        New-NetFirewallHyperVRule -Name "AgentGuard-block-$($r.ip -replace '[:.]','_')" -DisplayName "AgentGuard block $($r.ip)" -Direction Inbound -VMCreatorId $wsl -RemoteAddresses $r.ip -Action Block -ErrorAction SilentlyContinue | Out-Null
        Log "blocked $($r.ip)"
      }
    }
    "unblock" {
      Remove-NetFirewallRule -DisplayName "AgentGuard block $($r.ip)" -ErrorAction SilentlyContinue
      Remove-NetFirewallHyperVRule -Name "AgentGuard-block-$($r.ip -replace '[:.]','_')" -ErrorAction SilentlyContinue
      Log "unblocked $($r.ip)"
    }
    "lockdown-on" {
      # Outgoing: only Tailscale, HTTPS on port 443 and name lookups.
      New-NetFirewallRule -DisplayName "AgentGuard lockdown: Tailscale" -Direction Outbound -Program "C:\Program Files\Tailscale\tailscaled.exe" -Action Allow -ErrorAction SilentlyContinue | Out-Null
      New-NetFirewallRule -DisplayName "AgentGuard lockdown: HTTPS" -Direction Outbound -Protocol TCP -RemotePort 443 -Action Allow -ErrorAction SilentlyContinue | Out-Null
      New-NetFirewallRule -DisplayName "AgentGuard lockdown: DNS" -Direction Outbound -Protocol UDP -RemotePort 53 -Action Allow -ErrorAction SilentlyContinue | Out-Null
      New-NetFirewallRule -DisplayName "AgentGuard lockdown: Tailscale peers" -Direction Outbound -RemoteAddress 100.64.0.0/10 -Action Allow -ErrorAction SilentlyContinue | Out-Null
      Set-NetFirewallProfile -All -DefaultOutboundAction Block
      Set-NetFirewallHyperVVMSetting -Name $wsl -DefaultOutboundAction Block
      New-NetFirewallHyperVRule -Name "AgentGuard-lockdown-https" -DisplayName "AgentGuard lockdown: WSL HTTPS" -Direction Outbound -VMCreatorId $wsl -Protocol TCP -RemotePorts 443 -Action Allow -ErrorAction SilentlyContinue | Out-Null
      New-NetFirewallHyperVRule -Name "AgentGuard-lockdown-tailscale" -DisplayName "AgentGuard lockdown: WSL Tailscale peers" -Direction Outbound -VMCreatorId $wsl -RemoteAddresses 100.64.0.0/10 -Action Allow -ErrorAction SilentlyContinue | Out-Null
      Log "lockdown on"
    }
    "lockdown-off" {
      Set-NetFirewallProfile -All -DefaultOutboundAction Allow
      Set-NetFirewallHyperVVMSetting -Name $wsl -DefaultOutboundAction Allow
      Get-NetFirewallRule -DisplayName "AgentGuard lockdown:*" -ErrorAction SilentlyContinue | Remove-NetFirewallRule
      Remove-NetFirewallHyperVRule -Name "AgentGuard-lockdown-*" -ErrorAction SilentlyContinue
      Log "lockdown off"
    }
  }
  Remove-Item $_.FullName
}
