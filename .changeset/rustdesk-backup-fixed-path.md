---
"@recursica/knowledge": patch
---

CircleChat kit: the RustDesk server's nightly backup now removes old snapshots. Before, each run backed up from a new temp folder. restic groups snapshots by computer and path, so each run started a new group. The keep policy of 7 daily, 4 weekly and 6 monthly snapshots applies inside each group, so the policy never removed a snapshot.

- **One fixed path.** Each run backs up `/var/lib/rustdesk-backup/rustdesk.tgz`, so every run joins one group and builds on the snapshot before. The run deletes the file afterward, because the file holds the server's key.
- **The keep policy covers the older snapshots.** `restic forget` groups snapshots by computer and tag. The first run after the update also applies the policy to the snapshots from before the fixed path. The run removes each extra snapshot.
- **The restore steps.** The check after each backup looks for the archive at the fixed path. In a restore folder, the archive sits at `var/lib/rustdesk-backup/rustdesk.tgz`.

A new test runs the backup twice with the real restic. The test checks three results:

- The second snapshot builds on the first.
- The keep policy removes old snapshots from before and after the fix.
- A restore gives back the server's key.
