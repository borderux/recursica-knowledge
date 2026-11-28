---
"@recursica/knowledge": patch
---

A new gateway key whose check gets a 401 is checked again before it is revoked. On a Mac the gateway reads its key file through Colima's shared folder, which can show it the old file for a moment after the sync or `rc-service.sh` writes a new key, so a key written a moment ago could fail its check and be revoked though it was fine a second later. `kit/rc-gateway-key.mjs` now asks the gateway again after waits of 1, 2, 3 and 4 seconds when the answer is a 401, and revokes the key only when all five tries get a 401. Any other failed check (no route, the wrong routes, a gateway that doesn't answer) still revokes the key at once.
