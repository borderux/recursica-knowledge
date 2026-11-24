---
"@recursica/knowledge": patch
---

Cluster security services: OpenCanary's fake SSH login keeps the fake server's host keys in `/var/lib/opencanary`. Only root reads the folder, mode 700, and each key is mode 600. Before, the keys were in OpenCanary's default folder, `/var/tmp`, mode 644. Every account could read the private keys there, and every account can write to that folder.

- `install-cluster.sh` sets `ssh.key_path` in OpenCanary's settings, and starts OpenCanary with umask 077, so a key OpenCanary makes is mode 600.
- `cluster/canary-keys.sh` moves the keys an earlier install left in `/var/tmp`, so the decoy keeps the decoy's fingerprint. Only a plain file of root moves, never a link.
