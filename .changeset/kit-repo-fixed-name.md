---
"@recursica/knowledge": patch
---

CircleChat host kit: GitHub's checks of a kit commit ask one fixed repo, `borderux/recursica-knowledge`.

- **The repo's name is one constant,** `KIT_REPO` in `circlechat/cluster/kit-repo.mjs`. The follow step and the root-owned helper step both use the constant. Neither step reads the repo's name from the kit checkout's `origin`, which the owner can change.
- **An `origin` that names another repo stops both steps.** The checkout moves to no new commit, and no helper is replaced. The cluster's channel gets one alert, shared by both steps. The alert never shows the `origin` address, which can hold a token.
- **A GitHub address must start with GitHub's own host.** An address such as `https://acme.com/github.com/<owner>/<repo>` names no GitHub repo.

On a fork of the kit, rerun `install-secrets-helper.sh` and `setup-pc.sh` by hand after each kit change, as `circlechat/INSTALL.md` describes.
