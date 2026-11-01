---
"@recursica/knowledge": patch
---

CircleChat host kit: the nightly backup saves CircleChat's stored files (uploads, task deliverables and long replies saved as files). CircleChat keeps them on disk at `STORAGE_DIR`, not in MinIO, so no backup held them. `backup.sh` now saves the stack's `storage` volume as `storage.tgz`, and logs a skip and writes `storage.none` when the stack runs a CircleChat without the volume. The restore test checks `storage.tgz`, or `storage.none` in its place. A new step, `kit/carry-storage.sh`, copies `/app/storage` out of the old api and worker containers onto the new volume once, before `setup-host.sh`, the upgrade job or the weekly image refresh recreates them. It merges the two, keeps the newer file for a name in both, and does nothing when compose names no `storage` volume, when no old container is left, or when the volume already holds files.
