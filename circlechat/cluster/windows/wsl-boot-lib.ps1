# The parts of install-wsl-boot.ps1 that change nothing, so wsl-boot.test.ps1 can test those parts
# on any computer with PowerShell. install-wsl-boot.ps1 and the test dot-source this file.

# The task, the old task that the task replaces, and the folder of the keeper script and the log.
$WslTaskName = "AgentClusterWSL"
$OldWslTaskName = "Start-WSL-K3s-Ollama"
$WslBootDir = "C:\ProgramData\AgentCluster\wsl"
# The first WSL release whose source has both idle settings below: 2.5.8, the first open-source
# release. The source has no older history, so the kit asks for 2.5.8 or later.
$MinIdleSettingsVersion = [version]"2.5.8"
# Each idle setting, with -1 for "never shut down when idle" (WSL's source: a negative timeout arms
# no shutdown timer).
#   [wsl2] vmIdleTimeout: the WSL VM. Windows 11 only, in Microsoft's docs.
#   [general] instanceIdleTimeout: each distro inside the VM.
$IdleSettings = @(
  @{ Section = "wsl2"; Key = "vmIdleTimeout"; Value = "-1" },
  @{ Section = "general"; Key = "instanceIdleTimeout"; Value = "-1" }
)

# The distro this script runs from, read from a path such as
# \\wsl.localhost\Ubuntu-24.04\home\<user>\... or \\wsl$\Ubuntu-24.04\... Empty for any other path.
function Get-DistroFromPath([string]$Path) {
  if ($Path -match '^\\\\(wsl\.localhost|wsl\$)\\([^\\]+)(\\|$)') { return $Matches[2] }
  return ""
}

# The WSL version from the first line of "wsl.exe --version", in any display language: the first
# number with three or four parts. $null when the text holds no version.
function Get-WslVersion([string]$Text) {
  if ($Text -match '(\d+\.\d+\.\d+)(\.\d+)?') { return [version]$Matches[1] }
  return $null
}

function Test-IdleSettingsSupported($Version) {
  return ($null -ne $Version) -and ($Version -ge $MinIdleSettingsVersion)
}

# One key in an INI file's text, such as .wslconfig: replaced where the section has the key,
# added at the end of the section where the section lacks the key, and added with a new section
# where the file lacks the section. Every other line stays unchanged. Names compare in any case.
function Set-IniValue([string]$Text, [string]$Section, [string]$Key, [string]$Value) {
  $lines = [System.Collections.Generic.List[string]]::new()
  if ($Text) { foreach ($l in ($Text -split "\r?\n")) { $lines.Add($l) } }
  while ($lines.Count -and $lines[$lines.Count - 1] -eq "") { $lines.RemoveAt($lines.Count - 1) }
  $start = -1; $end = $lines.Count
  for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match '^\s*\[([^\]]+)\]\s*$') {
      if ($start -ge 0) { $end = $i; break }
      if ($Matches[1].Trim() -ieq $Section) { $start = $i }
    }
  }
  $entry = "$Key=$Value"
  if ($start -lt 0) {
    if ($lines.Count) { $lines.Add("") }
    $lines.Add("[$Section]"); $lines.Add($entry)
  } else {
    $found = $false
    for ($i = $start + 1; $i -lt $end; $i++) {
      if ($lines[$i] -match '^\s*([^=;#\s]+)\s*=' -and $Matches[1] -ieq $Key) { $lines[$i] = $entry; $found = $true; break }
    }
    if (-not $found) {
      # After the section's last setting, before any blank lines that close the section.
      $at = $end
      while ($at -gt $start + 1 -and $lines[$at - 1].Trim() -eq "") { $at-- }
      $lines.Insert($at, $entry)
    }
  }
  return (($lines -join "`r`n") + "`r`n")
}

# .wslconfig's text with both idle settings.
function Get-WslconfigWithIdleSettings([string]$Text) {
  foreach ($s in $IdleSettings) { $Text = Set-IniValue $Text $s.Section $s.Key $s.Value }
  return $Text
}

# The keeper's command line, for the task.
function Get-KeeperArguments([string]$Distro) {
  return "-NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$WslBootDir\keep-wsl.ps1`" -Distro `"$Distro`""
}
