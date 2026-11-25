---
"@recursica/knowledge": patch
---

CircleChat host kit: GitHub's checks of a kit commit ask the kit's repo in root's own file, `/etc/agent-cluster.conf`.

- **`install-cluster.sh` writes `KIT_REPO` as root,** from `repos.knowledge` in site.json, or `borderux/recursica-knowledge` without `repos.knowledge`. A fork on GitHub gets the fork's repo, so the fork's computers follow the fork. A fork off GitHub gets an empty setting.
- **The update job reads `KIT_REPO` only from root's file.** The owner can change the kit checkout's `origin` and site.json, so the job reads neither. The job refuses a file that root doesn't own, or that the group or other accounts can change. A file from before the setting gives `borderux/recursica-knowledge` until `install-cluster.sh` runs again.
- **An `origin` that names another repo stops the follow step and the root-owned helper step.** The same stop holds for a setting off GitHub and for a refused file. The checkout moves to no new commit, and no helper is replaced. The cluster's channel gets one alert, shared by both steps. The alert never shows the `origin` address, which can hold a token.
- **A GitHub address must start with GitHub's own host.** An address such as `https://acme.com/github.com/<owner>/<repo>` names no GitHub repo.

Rerun `install-cluster.sh` on each computer to write the setting. On a fork off GitHub, rerun `install-secrets-helper.sh` and `setup-pc.sh` by hand after each kit change.
