---
"@recursica/knowledge": patch
---

CircleChat kit: the RustDesk server's own computer is reachable by ID. Take a Windows computer that runs the server in WSL. The computer's own RustDesk client reaches the server at the computer's Tailscale address. In mirrored networking, WSL holds the same address and kept each reply. A connection to the client by ID then failed with "Failed to connect via rendezvous server".

- **`install-wsl-boot.ps1 -RustDeskServer`** also writes `[experimental] hostAddressLoopback=true` to the owner's `.wslconfig`. WSL then sends that traffic through Windows and back. Ports 21115 to 21117 stay on the Tailscale address only, and the three firewalls stay unchanged.
- **The script stops before any change on a computer that misses a requirement.** The setting needs mirrored networking, Windows 11 version 22H2 or later, and WSL 2.5.8 or later. Microsoft's docs name the first two. WSL's source has the setting from 2.5.8, the first open-source release.
- **The setting takes effect at the next WSL restart.** The script never restarts WSL.
- **`-DryRun -RustDeskServer`** shows the new `.wslconfig`, or the reason the script would stop.

### Upgrading

On the RustDesk server's computer, run `install-wsl-boot.ps1 -RustDeskServer -DryRun`, then `install-wsl-boot.ps1 -RustDeskServer`, in an Administrator PowerShell. Restart WSL at a planned time.
