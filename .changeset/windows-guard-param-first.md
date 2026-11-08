---
"@recursica/knowledge": patch
---

CircleChat kit: the Windows guard sets the RustDesk switches again. Kit PR #210 put the RustDesk rules above `param()` in `install-windows-guard.ps1`. PowerShell then read `param` as a command, and never set `-RustDeskServer` or `-BlockRustDeskDirect`. A run with either switch added no RustDesk block rule.

- **`param()` comes first,** before any statement. The RustDesk rules sit in step 2 again, after the Hyper-V firewall's settings, so the rules have WSL's ID.
- **`-DryRun`** prints each switch's value and the rules the switches add, then stops. Nothing changes.
- **A CI check of each Windows script,** `circlechat/ci/check-windows-scripts.ps1`. Each script must parse, with `param()` before any statement. A script with `-DryRun` runs once with each switch, and each run must show only that switch as on.

### Upgrading

On each Windows computer with a RustDesk switch, run `install-windows-guard.ps1` again with the same switches, in an Administrator PowerShell.
