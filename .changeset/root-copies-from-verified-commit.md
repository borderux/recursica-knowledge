---
"@recursica/knowledge": patch
---

CircleChat host kit: the hourly update job copies each root-owned helper from the kit's verified commit. Root never copies the checkout's files.

- **Root reads each helper's source with `git show <commit>:<path>`.** The helpers are `agent-stacks-apply` and `agent-stacks-disk`. The owner can edit the checkout's files, so root never copies one. The owner can edit git's own folder too. So root checks the commit, each folder and the file against the ids in the commit.
- **GitHub must show the commit as verified and on main** before root replaces a helper. A commit GitHub doesn't verify replaces no helper, and the cluster's channel gets one alert.
- **The new helper keeps the old helper's path, owner, group and mode,** and replaces the old helper in one rename. The cluster's channel gets one line for each helper the job replaced.
- **A helper that matches the commit needs nothing,** and GitHub isn't asked.

The job no longer reruns `install-secrets-helper.sh` as root. A new computer still runs `install-secrets-helper.sh` and `setup-pc.sh` once by hand.
