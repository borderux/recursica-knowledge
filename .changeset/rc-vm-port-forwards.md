---
"@recursica/knowledge": patch
---

RecursicaChat 2.0 server kit: the server's Colima VM forwards a port to the Mac only on `127.0.0.1`, and never a port below 1024. `recursicachat/install.sh` installs `recursicachat/lima-override.yaml` as the VM's Lima `override.yaml`, written by the server's account, never by root. Lima reads the file at each start of the VM.

Before, the VM's DNS server, dnsmasq, opened port 53 on loopback in the VM. The Mac then listened on port 53 on every address. On macOS only root can listen on `127.0.0.1` below port 1024. Lima listens on every address instead, and closes each connection that doesn't come from the Mac itself. A port the VM opens on every address went to every address of the Mac too, by Colima's own rule.
