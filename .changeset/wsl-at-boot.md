---
"@recursica/knowledge": minor
---

CircleChat kit: WSL starts at boot on a Windows computer, before anyone signs in, and keeps running. Before, WSL started only at sign-in, so after an unattended restart the cluster's services in WSL stayed down.

- **`install-wsl-boot.ps1`** registers the task `AgentClusterWSL`. The task starts at boot as the distro's owner, with logon type S4U, so Windows stores no password. The task runs `keep-wsl.ps1`, which holds the distro open and starts the distro again whenever the distro stops.
- **The idle settings,** in the owner's `.wslconfig`: `[wsl2] vmIdleTimeout=-1` and `[general] instanceIdleTimeout=-1`. Both need WSL 2.5.8 or later, and `vmIdleTimeout` needs Windows 11. The settings take effect at the next WSL restart. The script never stops WSL.
- **The old task `Start-WSL-K3s-Ollama` goes,** but only after `AgentClusterWSL` runs and holds the distro open.
- **`-DryRun`** prints the task, the change to `.wslconfig` and the old task's removal, and changes nothing.
- **`setup-host.sh`** names the script on WSL, in place of a task that ran as SYSTEM. SYSTEM can't start a distro that belongs to another account.

### Upgrading

On each Windows computer, run `install-wsl-boot.ps1 -DryRun`, then `install-wsl-boot.ps1`, in an Administrator PowerShell, as the distro's owner.
