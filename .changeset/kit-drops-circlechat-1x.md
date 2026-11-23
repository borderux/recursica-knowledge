---
"@recursica/knowledge": minor
---

CircleChat host kit: CircleChat 1.x is gone from the kit. The kit no longer installs, starts, updates, backs up or checks CircleChat 1.x, its agents or its Slack notifier. The kit keeps the model gateway, the job runners and the port-job path, Kev, the app preview, the GitHub token service, the RecursicaChat 2.0 server's scripts, the cluster's services and the update job.

Removed:

- `setup-agent.sh`, `sync-skills.sh`, `check-agent.sh` and the agent check's own account (`kit/agent-check.mjs`, `kit/check-account.mjs`).
- The Slack notifier (`notify/`) and the cloud-model requests in Slack (`cluster/cloud-requests.mjs`, the Approve and Deny buttons).
- The cluster agent's Stop and Resume buttons and the one-time consents of 1.x's agents' filter.
- 1.x's backup and test restore (`backup/`), the release watcher and the storage move (`kit/carry-storage.sh`).
- The Hermes helpers for 1.x's agent homes, and the router's read of 1.x's database.

A site.json that still sets `site.circlechat`, `site.check_account`, `cloud_approvers`, `notify.slack`, `notify.events` or `notify.people` still loads. The config check warns for each one.

New names: the stack's folder is `~/recursica-stack`, the agents' workspace is `~/recursica-workspace`, and the gateway's Docker network is `gateway-models`. A client stack's folder is `~/tenants/<name>/stack`. A computer keeps 1.x's names until a person runs `circlechat/migrate-off-1x.sh`. Until then every script and job uses the old names.

`setup-host.sh` has a new held step: the removal of 1.x's jobs. The hold on network steps now also covers steps that can interrupt running work. The image refresh runs `setup-host.sh --upgrade` with `KIT_HOLD_NETWORK=1`.
