# The CI check of the kit's Windows scripts, in each .ps1 file under circlechat/:
#
#   1. Each script parses with no error.
#   2. param() comes before any statement. Below a statement, PowerShell reads param as a command,
#      and never sets a switch. The parser gives no error for a param() in the wrong place, so the
#      check looks for a command named param.
#   3. A script with a -DryRun switch runs once with -DryRun alone, and once with each other switch.
#      In a dry run, the script prints "switch <Name>=True" or "switch <Name>=False" for each
#      switch, and changes nothing. Each run must show the given switch as True, and every other
#      switch as False.
#
# Before the files, the check runs steps 1 and 2 on two sample scripts, one right and one wrong, so
# a broken check fails too.
#
#   pwsh -NoProfile -File circlechat/ci/check-windows-scripts.ps1
$ErrorActionPreference = "Stop"
$root = (Get-Item (Join-Path $PSScriptRoot "..")).FullName
$shell = (Get-Process -Id $PID).Path

# The problems in one script's text: parse errors, and a param() below a statement.
function Get-ScriptProblems([string]$text) {
  $tokens = $null; $errors = $null
  $ast = [System.Management.Automation.Language.Parser]::ParseInput($text, [ref]$tokens, [ref]$errors)
  $problems = @($errors | ForEach-Object { "line $($_.Extent.StartLineNumber): $($_.Message)" })
  $misplaced = $ast.FindAll({ param($n) $n -is [System.Management.Automation.Language.CommandAst] -and $n.GetCommandName() -eq "param" }, $true)
  foreach ($c in $misplaced) {
    $problems += "line $($c.Extent.StartLineNumber): param() sits below a statement, so PowerShell reads param as a command. Move param() to the top, before any statement."
  }
  return , $problems
}

# The check's own two scripts.
$right = Get-ScriptProblems "# A comment first is fine.`nparam([switch]`$On)`nif (`$On) { 'on' }"
$wrong = Get-ScriptProblems "if (`$On) { 'on' }`nparam([switch]`$On)"
if ($right.Count -ne 0 -or $wrong.Count -ne 1) {
  Write-Host "The check itself is broken: a right script gave $($right.Count) problem(s), and a wrong script gave $($wrong.Count)."
  exit 1
}

$failed = 0
$scripts = @(Get-ChildItem -Path $root -Recurse -Filter *.ps1 | Where-Object { $_.FullName -notmatch '[\\/]node_modules[\\/]' } | Sort-Object FullName)
foreach ($f in $scripts) {
  $name = $f.FullName.Substring($root.Length).TrimStart('\', '/')
  $problems = Get-ScriptProblems ([System.IO.File]::ReadAllText($f.FullName))
  if ($problems.Count) {
    $failed++
    Write-Host "FAIL: $name"
    $problems | ForEach-Object { Write-Host "  $_" }
    continue
  }
  Write-Host "pass: $name parses, and param() comes first"

  # The dry runs, for a script with a -DryRun switch.
  $tokens = $null; $errors = $null
  $ast = [System.Management.Automation.Language.Parser]::ParseFile($f.FullName, [ref]$tokens, [ref]$errors)
  $switches = @($ast.ParamBlock.Parameters | Where-Object { $_.StaticType -eq [switch] } | ForEach-Object { $_.Name.VariablePath.UserPath })
  if ($switches -notcontains "DryRun") { continue }
  $others = @($switches | Where-Object { $_ -ne "DryRun" })
  foreach ($given in @("") + $others) {
    $runArgs = @("-NoProfile", "-NonInteractive", "-File", $f.FullName, "-DryRun")
    if ($given) { $runArgs += "-$given" }
    $out = (& $shell @runArgs 2>&1 | Out-String)
    $code = $LASTEXITCODE
    $bad = @()
    if ($code -ne 0) { $bad += "exit code $code" }
    foreach ($s in $others) {
      $want = if ($s -eq $given) { "True" } else { "False" }
      if ($out -notmatch "(?m)^switch $s=$want\r?$") { $bad += "switch $s should read $want" }
    }
    $label = if ($given) { "-DryRun -$given" } else { "-DryRun" }
    if ($bad.Count) {
      $failed++
      Write-Host "FAIL: $name $label`: $($bad -join '; ')"
      Write-Host ($out.TrimEnd() -replace '(?m)^', '    ')
    } else { Write-Host "pass: $name $label" }
  }
}
if ($scripts.Count -eq 0) { Write-Host "No Windows script found under $root."; exit 1 }
if ($failed) { Write-Host "$failed problem(s) in the Windows scripts."; exit 1 }
Write-Host "Every Windows script passes."
