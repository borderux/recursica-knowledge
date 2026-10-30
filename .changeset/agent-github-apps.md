---
"@recursica/knowledge": minor
---

CircleChat host kit: each agent that pushes to GitHub has a GitHub App of the agent's own. The app replaces a personal access token. The agents are Alan, Betty and Porter, and later Otto.

- **`github_apps` in site.json.** Each agent's entry holds the app ID, the installation ID, the slug, the repos and the permissions. Each app has Contents and Pull requests, and Alan's app adds Issues.
- **The private key stays with root.** Each app's key is the GitHub environment secret `GITHUB_APP_KEY_<AGENT>`. The secrets helper writes the key to a root-owned file outside the stack's folder. No agent, container, `.env` file or backup holds the key.
- **A token service on the control computer.** The service makes an installation token for each agent, for the agent's repos and permissions. Each token lasts at most one hour. The service makes a new token when the token has 15 minutes left.
- **The agent gets only the token.** The token goes to the agent's `.env` as `<AGENT>_GITHUB_TOKEN`. A port job asks the service for a token over Tailscale, with the job's task key. The job's token covers only the job's repo.
- **Commits use the app's bot identity,** `<app-slug>[bot]`, with the bot's noreply email address.
- **A manifest for each app.** `node circlechat/github/manifest.mjs` prints each agent's manifest and the steps to create the app.
- **The key check finds private keys.** The check fails when a private key is in CircleChat's database, an agent's home or a backup.

A stack with no `github_apps` block keeps working, with no push access.

### Upgrading

1. Create each agent's app, as "GitHub access for agents" in `circlechat/README.md` describes. Save each app's private key as `GITHUB_APP_KEY_<AGENT>`.
2. Add the `github_apps` block to site.json.
3. Copy `circlechat/deploy/deploy-secrets.yml` to the private repo again. The new workflow passes each app's key.
4. Deploy the secrets, then rerun `setup-host.sh` and `setup-node.sh`. Rerun `setup-agent.sh` for each agent.
5. Delete `ALAN_GITHUB_PAT`, `BETTY_GITHUB_PAT` and `PORTER_GITHUB_PAT` from each GitHub environment, and revoke each token on GitHub.
