---
"@recursica/knowledge": minor
---

CircleChat host kit: a new site.json setting, `updates.follow`, picks how the kit checkout moves on each computer. `"releases"` is the default and keeps the current rule: only an approved kit release installs. With `"main"`, the hourly update job, `cluster-updater`, moves the kit checkout on every computer to each new commit on main. Every computer follows main, the control computer and each helper. Before, a helper's kit checkout never moved, because a helper hosts no stack.

Each hour, on a computer whose kit follows main, the update job takes six steps (`cluster/follow-main.mjs`):

1. The job fetches `origin/main` into the kit checkout, as the owner.
2. GitHub must show each new commit as verified. One commit that GitHub doesn't verify stops the update, and the cluster's Slack channel gets one alert for the commit.
3. The update waits until RecursicaChat 2.0 is quiet, the rule of kit #257. A helper runs no server, so a helper never waits.
4. The kit checkout fast-forwards to the new commit.
5. The job runs each setup the change touches again: `setup-host.sh` on the control computer, and `setup-node.sh` and `install-cluster.sh` on each computer. The job never runs `rc-deploy`.
6. The cluster's channel gets one line: the computer, the old and new commit, and the result.

A setup runs again only when the owner has password-free sudo, because each setup calls sudo. Without password-free sudo, the line names each command to run by hand. On the control computer, `setup-host.sh --upgrade` still runs with root's own steps.

A failed setup posts the last lines of the setup's output. Text that looks like a key or a token is hidden. The kit checkout stays at the new commit for a person to look at. The next update waits for a newer commit on main, and runs the failed setup again.

A kit that follows main installs no release. The control computer posts no new release, and "Upgrade now" installs nothing. `updates.follow` belongs in the cluster's own site.json only. The config check refuses the setting in a client or demo stack's site.json.
