---
"@recursica/knowledge": minor
---

CircleChat host kit: one isolated stack per client. Each client stack has its own CircleChat, Slack channel, keys, gateway and job runner, in its own Docker VM. The config check refuses a client stack that could share one of these parts.

Secrets can live in GitHub: one environment per stack in the private repo of stacks, a `deploy-secrets` workflow, and a root-owned helper on each computer that writes each secret to the file that reads the secret. `setup-host.sh --secrets-only` recreates only the gateway and the Slack notifier after a secret changes.
