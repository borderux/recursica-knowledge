---
"@recursica/knowledge": patch
---

CircleChat host kit: a helper computer no longer gets the Slack app's token or the approvers' TOTP secrets. The secrets deploy wrote every cluster secret to `/etc/agent-cluster.env` on each computer of the cluster's own stack. With an approver's TOTP secret, root on a helper could make valid approval codes.

- **Every computer** gets `SLACK_BOT_TOKEN`, `SLACK_CHANNEL_ID` and `CLUSTER_TOKEN`. The cluster agent, the hourly update job and the RustDesk backup read the three secrets on each computer.
- **Only the control computer** gets `SLACK_APP_TOKEN`, `APPROVERS` and each `TOTP_SECRET_<NAME>`. Only the cluster's Slack app reads the secrets, and only the control computer runs the Slack app.
- **A deploy to a helper removes each control-only line** from the helper's `/etc/agent-cluster.env`. The deploy's log names each removed line.

**Upgrade:**

1. Wait for the hourly update job on each computer. The job installs the new secrets helper, `/usr/local/bin/agent-stacks-apply`, once the kit has the change.
2. Run the "Deploy secrets" workflow for the cluster's own stack on each helper, with "restart" on. Check the log for a line such as `TOTP_SECRET_<NAME> removed from /etc/agent-cluster.env`. The restart makes the cluster agent drop the removed secrets.
3. Give each approver a new TOTP secret, because each helper held the old one. Run `node circlechat/cluster/enroll.mjs <name>` for each approver, and update the approver's `TOTP_SECRET_<NAME>` in the GitHub environment.
4. Make a new app-level token in the Slack app's settings, and update `SLACK_APP_TOKEN` in the GitHub environment.
5. Run the "Deploy secrets" workflow for the cluster's own stack on the control computer, with "restart" on.
