---
"@recursica/knowledge": patch
---

Kit: the stack's own Colima VM, the one the gateway's containers run in, forwards a port to the Mac only on `127.0.0.1`, and never a port below 1024. `kit/lima-override.sh` installs `kit/lima-override.yaml`, the same rules as the RecursicaChat 2.0 server's VM, as the VM's Lima `override.yaml`, written by the owner, never by root. `setup-host.sh` runs it before it installs Colima's daemon. Lima reads the file at each start of the VM, and the script never restarts the VM.

Before, a port a container published with no address, such as `docker run -p 8080:80`, went to every address of the Mac by Colima's own rule. The gateway's ports, published on `127.0.0.1` in the VM, are unchanged.
