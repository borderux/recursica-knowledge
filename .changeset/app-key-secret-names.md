---
"@recursica/knowledge": patch
---

CircleChat host kit: each GitHub App's private key is the secret `APP_KEY_<AGENT>`, such as `APP_KEY_ALAN`. GitHub refuses a secret name that starts with `GITHUB_`. The deploy workflow, the secrets helper and `circlechat/github/manifest.mjs` use the new name. Copy `circlechat/deploy/deploy-secrets.yml` to the private repo again.
