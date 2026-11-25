---
"@recursica/knowledge": patch
---

CircleChat host kit: two fixes to the token rotation in `circlechat/deploy/rotate-tokens.sh`.

- **The kev-engine check reads the engine at the address the engine listens on.** The secrets helper took 127.0.0.1, but an engine with `--host` set to the computer's Tailscale address listens there only. The check then failed with "does not answer". The helper now reads the `--host` in the kev-engine service's command in site.json. With no `--host`, or with 0.0.0.0, the helper uses 127.0.0.1.
- **The one-day token needs only Actions and Environments.** `gh workflow run` read the repo's default branch, which needs Contents read. The command now starts each run on `main`.

Each computer gets the new helper from the hourly update.
