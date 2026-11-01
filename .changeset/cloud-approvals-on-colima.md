---
"@recursica/knowledge": patch
---

CircleChat host kit: the cloud-model requests' secret files work on a Mac with Colima. Since the last release, the setup made `cloud-approvals/` readable by root only. Docker in Colima reads the Mac's files as the owner, so Docker could not mount the approval token. CircleChat's api then did not start.

- **The owner and mode of the stack's other secret files.** On a Mac, the owner owns `cloud-approvals/` (700) and both files (600), as with the gateway's state folder and `model-keys.env`. On Linux, root keeps both files, in a folder the owner can only pass through (711).
- **Both files exist before `docker compose` runs,** in every mode. The secrets helper and the upgrade job make the folder and both files as root, before the owner's Docker steps. Neither writes through a link.
- **A check of each mount before `docker compose`.** `setup-host.sh` reads each bind mount from `docker compose config`. On a Mac, the owner must be able to read each mount in the owner's home. On Linux, each mount must exist. A mount that fails stops the setup before any container changes, so CircleChat keeps running.
- **The cluster agent reads the service token only from a plain file,** never through a link.

### Upgrading

On a Mac with Colima, run `setup-host.sh` once in a terminal. The setup gives the owner the folder and both files. Then add `cloud_approvers` back to site.json, if the list came out.
